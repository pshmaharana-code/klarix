import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { connection } from './jobs/queue.js';
import { dispatchOutboxBatch, createAndEnqueueJob } from './jobs/jobService.js';
import { updateSyncProgress } from './jobs/syncProgressService.js';
import * as contentRepository from './repositories/contentRepository.js';
import { analyzePost } from './services/postAnalysisOrchestrator.js';
import * as metaAdapter from './integrations/metaAdapter.js';
import * as cryptoLib from './lib/crypto.js';
import { loadConfig, redactRedisUrl } from './lib/config.js';

const prisma = new PrismaClient();

console.log('👷 Klarix V2 Worker starting...');
console.log('🔌 Connecting to Redis:', redactRedisUrl(loadConfig().redisUrl));

const worker = new Worker('klarix-sync', async job => {
  const { jobId, brandId, input } = job.data;

  console.log(`[Worker] Received job ${job.id} for brand ${brandId}`);

  // Atomically claim only a queueable job. This is the database backstop for
  // BullMQ's at-least-once delivery semantics and multiple worker processes.
  const claim = await prisma.job.updateMany({
    where: { id: jobId, state: { in: ['QUEUED', 'RETRY_PENDING'] } },
    data: {
      state: 'PROCESSING',
      attempts: { increment: 1 },
      startedAt: new Date(),
      progressPercent: 10,
      progressStep: 'Connecting',
      progressMessage: 'Connecting to Meta...'
    }
  });
  if (claim.count !== 1) {
    console.log(`[Worker] Job ${jobId} was already claimed or completed. Skipping.`);
    return { skipped: true, reason: 'Already completed' };
  }
  const dbJob = await prisma.job.findUnique({ where: { id: jobId } });
  if (!dbJob) throw new Error('Job not found in database');
  await prisma.jobLog.create({ data: { jobId, event: 'PROCESSING_START', level: 'INFO' } });

  try {
    if (dbJob.type === 'SYNC_ACCOUNT') {
      // OAuth codes are exchanged by the authenticated callback route. The worker
      // receives only an opaque credential reference.
      await updateProgress(jobId, 30, 'Authenticating', 'Authenticating with Instagram...');
      const credential = await prisma.oAuthCredential.findUnique({
        where: { id: input?.credentialId }
      });
      if (!credential || credential.expiresAt <= new Date()) {
        const credentialError = new Error('OAuth credential is unavailable');
        credentialError.code = 'OAUTH_INVALID';
        throw credentialError;
      }
      const accessToken = cryptoLib.decrypt(credential.encryptedToken);
      if (!accessToken) {
        const credentialError = new Error('OAuth credential cannot be decrypted');
        credentialError.code = 'OAUTH_INVALID';
        throw credentialError;
      }
      const expiresIn = Math.max(0, Math.floor((credential.expiresAt.getTime() - Date.now()) / 1000));

      // Step B: Fetch Profile
      await updateProgress(jobId, 60, 'Fetching profile', 'Retrieving account details...');
      const profile = await metaAdapter.fetchProfile(accessToken);

      // Step C: Encrypt Token
      await updateProgress(jobId, 80, 'Securing data', 'Encrypting credentials...');
      const encryptedToken = cryptoLib.encrypt(accessToken);
      const expiryDate = new Date(Date.now() + expiresIn * 1000);

      // Step D: Upsert Social Account
      await updateProgress(jobId, 90, 'Saving', 'Persisting account link...');
      
      const accountKey = {
        platform_externalAccountId: {
          platform: profile.platform,
          externalAccountId: profile.externalAccountId
        }
      };
      let existingAccount = await prisma.socialAccount.findUnique({ where: accountKey });
      if (existingAccount && existingAccount.brandId !== brandId) {
        const ownershipError = new Error('Social account belongs to another brand');
        ownershipError.code = 'SOCIAL_ACCOUNT_OWNERSHIP_CONFLICT';
        throw ownershipError;
      }

      const accountData = {
        username: profile.username,
        accountType: profile.accountType,
        profileMetadata: { followersCount: profile.followersCount, profilePictureUrl: profile.profilePictureUrl },
        connectionStatus: 'CONNECTED',
        encryptedToken,
        expiry: expiryDate,
        lastSync: new Date()
      };
      
      if (existingAccount) {
        existingAccount = await prisma.socialAccount.update({ where: { id: existingAccount.id }, data: accountData });
      } else {
        try {
          existingAccount = await prisma.socialAccount.create({
            data: {
              brandId,
              platform: profile.platform,
              externalAccountId: profile.externalAccountId,
              ...accountData
            }
          });
        } catch (error) {
          if (error.code !== 'P2002') throw error;
          existingAccount = await prisma.socialAccount.findUnique({ where: accountKey });
          if (!existingAccount || existingAccount.brandId !== brandId) {
            const ownershipError = new Error('Social account belongs to another brand');
            ownershipError.code = 'SOCIAL_ACCOUNT_OWNERSHIP_CONFLICT';
            throw ownershipError;
          }
          existingAccount = await prisma.socialAccount.update({ where: { id: existingAccount.id }, data: accountData });
        }
      }

      // Step E: Fetch Media and Enqueue IMPORT_CONTENT
      await updateProgress(jobId, 95, 'Fetching media', 'Retrieving recent content...');
      const mediaResponse = await metaAdapter.fetchUserMedia(accessToken, existingAccount.externalAccountId);
      const items = mediaResponse.items || [];
      
      let newChildJobs = 0;
      for (const item of items) {
        const child = await createAndEnqueueJob({
          brandId,
          type: 'IMPORT_CONTENT',
          parentJobId: jobId,
          idempotencyKey: `import:${existingAccount.id}:${item.externalContentId}:${jobId}`,
          input: { socialAccountId: existingAccount.id, externalContentId: item.externalContentId, item }
        });
        if (child.parentJobId === jobId) newChildJobs++;
      }

      // Step F: Fetch Account Metrics Enqueue (Phase 4A)
      await updateProgress(jobId, 97, 'Enqueuing account metrics', 'Scheduling account-level metric sync...');
      const metricsJob = await createAndEnqueueJob({
        brandId,
        type: 'FETCH_ACCOUNT_METRICS',
        parentJobId: jobId,
        idempotencyKey: `account_metrics:${existingAccount.id}:${jobId}`,
        input: { socialAccountId: existingAccount.id, externalAccountId: existingAccount.externalAccountId, since: input?.since, until: input?.until }
      });
      if (metricsJob.parentJobId === jobId) newChildJobs++;

      await prisma.job.update({ 
        where: { id: jobId }, 
        data: { 
          totalCount: newChildJobs,
          result: { username: profile.username },
          logs: { create: { event: 'SYNC_DISCOVERED', level: 'INFO', context: { count: items.length, newChildJobs } } }
        } 
      });

      await prisma.brand.update({
        where: { id: brandId },
        data: { onboardingStatus: 'COMPLETED' }
      });

      await updateSyncProgress(jobId);
      return { success: true, username: profile.username, itemsCount: items.length };
      
    } else if (dbJob.type === 'IMPORT_CONTENT') {
      const { socialAccountId, externalContentId, item } = input;
      
      const content = await contentRepository.upsertContent({
        brandId,
        socialAccountId,
        externalContentId,
        type: item.type,
        publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
        permalink: item.permalink || null,
        caption: item.caption || null
      });

      if (item.type === 'CAROUSEL' && Array.isArray(item.children) && item.children.length > 0) {
        // Validate children before modifying database
        const validChildren = item.children.filter(child => child && child.mediaUrl);
        
        if (validChildren.length === 0) {
          console.warn(`[IMPORT_CONTENT] Carousel ${content.id} has no valid children with mediaUrl. Keeping existing media rows.`);
        } else {
          if (validChildren.length < item.children.length) {
            console.warn(`[IMPORT_CONTENT] Carousel ${content.id} contains some missing mediaUrls. Only persisting ${validChildren.length} valid slides.`);
          }
          await contentRepository.replaceCarouselMedia({
            contentId: content.id,
            validChildren
          });
        }
      } else {
        // Single-image, Reel, or fallback: persist root media item as before.
        await contentRepository.upsertMedia({
          contentId: content.id,
          mediaType: item.type,
          sourceUrl: item.mediaUrl || item.permalink || '',
          thumbnailUrl: item.thumbnailUrl || null
        });
      }

      // Create exactly one FETCH_METRICS child
      const rootJobId = dbJob.parentJobId;
      const metricsChild = await createAndEnqueueJob({
        brandId,
        type: 'FETCH_METRICS',
        parentJobId: dbJob.id,
        idempotencyKey: `metrics:${content.id}:${rootJobId}`,
        input: { contentId: content.id, socialAccountId, externalContentId, item }
      });
      let newChildrenCount = metricsChild.parentJobId === dbJob.id ? 1 : 0;

      // Phase 4: Create ANALYZE_CONTENT child
      let analyzeChild = await prisma.job.findFirst({
        where: {
          type: 'ANALYZE_CONTENT',
          brandId,
          idempotencyKey: { startsWith: `analyze:${content.id}:1.0` }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!analyzeChild) {
        analyzeChild = await createAndEnqueueJob({
          brandId,
          type: 'ANALYZE_CONTENT',
          parentJobId: dbJob.id,
          idempotencyKey: `analyze:${content.id}:1.0`,
          input: { contentId: content.id }
        });
      }
      if (analyzeChild.parentJobId === dbJob.id) newChildrenCount++;

      await prisma.job.update({ 
        where: { id: jobId }, 
        data: { 
          totalCount: newChildrenCount,
          state: 'COMPLETED',
          progressPercent: 100,
          progressStep: 'Complete',
          completedAt: new Date()
        } 
      });

      if (rootJobId) await updateSyncProgress(rootJobId);
      return { success: true, contentId: content.id };
      
    } else if (dbJob.type === 'FETCH_METRICS') {
      const { contentId, socialAccountId, externalContentId, item } = input;
      
      const account = await prisma.socialAccount.findUnique({ where: { id: socialAccountId } });
      if (!account || account.brandId !== brandId) throw new Error('SocialAccount not found or ownership mismatch');
      
      const accessToken = cryptoLib.decrypt(account.encryptedToken);
      if (!accessToken) throw new Error('Cannot decrypt access token');
      
      const metrics = await metaAdapter.fetchMediaInsights(accessToken, externalContentId, item.type);
      
      await contentRepository.createMetricSnapshot({
        contentId,
        observedAt: new Date(),
        reach: metrics.reach,
        impressions: metrics.impressions,
        plays: metrics.plays,
        likes: metrics.likes,
        comments: metrics.comments,
        saves: metrics.saves,
        shares: metrics.shares,
        totalInteractions: metrics.totalInteractions,
        igReelsAvgWatchTime: metrics.igReelsAvgWatchTime,
        igReelsVideoViewTotalTime: metrics.igReelsVideoViewTotalTime,
        reelsSkipRate: metrics.reelsSkipRate
      });

      await prisma.job.update({
        where: { id: jobId },
        data: {
          state: 'COMPLETED',
          progressPercent: 100,
          progressStep: 'Complete',
          completedAt: new Date()
        }
      });
      
      const parentJob = await prisma.job.findUnique({ where: { id: dbJob.parentJobId } });
      if (parentJob && parentJob.parentJobId) {
        await updateSyncProgress(parentJob.parentJobId);
      }
      return { success: true };
      
    } else if (dbJob.type === 'FETCH_ACCOUNT_METRICS') {
      const { socialAccountId, externalAccountId, since, until } = input;
      
      const account = await prisma.socialAccount.findUnique({ where: { id: socialAccountId } });
      if (!account || account.brandId !== brandId) throw new Error('SocialAccount not found or ownership mismatch');
      
      const accessToken = cryptoLib.decrypt(account.encryptedToken);
      if (!accessToken) throw new Error('Cannot decrypt access token');

      const configuredMetrics = [
        { metric: 'reach', period: 'day', breakdown: null },
        { metric: 'reach', period: 'day', breakdown: 'media_product_type' },
        { metric: 'total_interactions', period: 'day', breakdown: null },
        { metric: 'likes', period: 'day', breakdown: null },
        { metric: 'comments', period: 'day', breakdown: null },
        { metric: 'shares', period: 'day', breakdown: null },
        { metric: 'saves', period: 'day', breakdown: null }
      ];

      let partialFailure = false;
      let processedAny = false;

      for (const config of configuredMetrics) {
        try {
          const res = await metaAdapter.fetchAccountInsights(accessToken, externalAccountId, {
            metric: config.metric,
            period: config.period,
            breakdown: config.breakdown,
            since,
            until
          });

          if (res.isSupported && Array.isArray(res.data)) {
            for (const item of res.data) {
              const breakdownDef = config.breakdown || 'none';
              
              // Prevent duplication bug: if we requested a breakdown but Meta 
              // returned empty breakdowns (e.g., due to privacy thresholds), skip it.
              if (config.breakdown && (!item.breakdowns || item.breakdowns.length === 0)) {
                continue;
              }

              for (const val of item.values) {
                if (val.endTime) {
                  await contentRepository.upsertSocialAccountMetricSnapshot({
                    socialAccountId,
                    metricName: item.metricName,
                    period: item.period,
                    endTime: new Date(val.endTime),
                    breakdownDefinition: breakdownDef,
                    value: val.value,
                    breakdowns: item.breakdowns,
                    rawPayload: item.rawPayload
                  });
                  processedAny = true;
                }
              }
            }
          }
        } catch (err) {
          // Log individual failure but don't fail the entire job
          console.error(`[Worker] Failed fetching account metric ${config.metric} / ${config.period}:`, err.message);
          partialFailure = true;
          await prisma.jobLog.create({
            data: {
              jobId,
              event: 'METRIC_FETCH_FAILED',
              level: 'ERROR',
              context: { metric: config.metric, code: err.code || 'API_ERROR' }
            }
          });
        }
      }

      await prisma.job.update({
        where: { id: jobId },
        data: {
          state: partialFailure ? 'PARTIAL' : 'COMPLETED',
          progressPercent: 100,
          progressStep: 'Complete',
          completedAt: new Date(),
          result: { partialFailure, processedAny }
        }
      });
      
      const parentJob = await prisma.job.findUnique({ where: { id: dbJob.parentJobId } });
      if (parentJob) {
        await updateSyncProgress(dbJob.parentJobId);
      }
      return { success: true, partialFailure };
      
    } else if (dbJob.type === 'ANALYZE_CONTENT') {
      const { contentId } = input;
      
      const content = await prisma.content.findUnique({
        where: { id: contentId },
        include: { 
          media: { orderBy: { createdAt: 'asc' } },
          metricSnapshots: { orderBy: { observedAt: 'desc' }, take: 1 } 
        }
      });
      if (!content || content.brandId !== brandId) {
        throw new Error('Content not found or ownership mismatch');
      }

      await prisma.content.update({
        where: { id: contentId },
        data: { analysisStatus: 'PROCESSING' }
      });

      const brand = await prisma.brand.findUnique({ where: { id: brandId } });
      const metrics = content.metricSnapshots.length > 0 ? content.metricSnapshots[0] : null;
      // Pass the entire sequence of media source URLs for carousels and videos
      const mediaPayload = content.media.map(m => m.sourceUrl).filter(Boolean);

      const analysisResult = await analyzePost(brand, content, metrics, mediaPayload);

      await prisma.contentAnalysis.upsert({
        where: {
          contentId_version: { contentId, version: analysisResult.version }
        },
        create: {
          contentId,
          version: analysisResult.version,
          status: analysisResult.status,
          visualFindings: analysisResult.visualFindings,
          contentFindings: analysisResult.contentFindings,
          perfFindings: analysisResult.perfFindings,
          confidence: analysisResult.confidence,
          providerMeta: analysisResult.providerMeta,
          completedAt: new Date()
        },
        update: {
          status: analysisResult.status,
          visualFindings: analysisResult.visualFindings,
          contentFindings: analysisResult.contentFindings,
          perfFindings: analysisResult.perfFindings,
          confidence: analysisResult.confidence,
          providerMeta: analysisResult.providerMeta,
          completedAt: new Date()
        }
      });

      await prisma.content.update({
        where: { id: contentId },
        data: { analysisStatus: analysisResult.status }
      });

      await prisma.job.update({
        where: { id: jobId },
        data: {
          state: analysisResult.status === 'COMPLETED' ? 'COMPLETED' : 'PARTIAL',
          progressPercent: 100,
          progressStep: 'Complete',
          completedAt: new Date(),
          result: { version: analysisResult.version, status: analysisResult.status }
        }
      });
      
      const parentJob = await prisma.job.findUnique({ where: { id: dbJob.parentJobId } });
      if (parentJob && parentJob.parentJobId) {
        await updateSyncProgress(parentJob.parentJobId);
      }
      return { success: true, status: analysisResult.status };
      
    } else {
      throw new Error(`Unknown job type: ${dbJob.type}`);
    }
  } catch (error) {
    console.error(`[Worker] Job ${jobId} failed:`, error.message);
    // 4. Mark FAILED
    const willRetry = job.attemptsMade + 1 < (job.opts.attempts || 1);

    if (dbJob.type === 'ANALYZE_CONTENT' && !willRetry) {
      const { contentId } = input;
      if (contentId) {
        await prisma.content.update({
          where: { id: contentId },
          data: { analysisStatus: 'FAILED' }
        }).catch(e => console.error('Failed to update content to FAILED:', e.message));
        
        await prisma.contentAnalysis.create({
          data: {
            contentId,
            version: '1.0',
            status: 'FAILED',
            confidence: 0,
            providerMeta: { error: error.message }
          }
        }).catch(e => console.error('Failed to create FAILED analysis record:', e.message));
      }
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        state: willRetry ? 'RETRY_PENDING' : 'FAILED',
        completedAt: willRetry ? null : new Date(),
        error: { code: error.code || 'PROCESSING_FAILED' },
        progressStep: willRetry ? 'Retry pending' : 'Failed',
        progressMessage: willRetry ? 'Retrying connection shortly' : 'Connection could not be completed',
        logs: { create: { event: 'PROCESSING_FAILED', level: 'ERROR', context: { code: error.code || 'PROCESSING_FAILED' } } }
      }
    });
    throw error; // Let BullMQ know it failed for retry mechanics
  }
}, { connection });

worker.on('failed', (job, err) => {
  console.log(`[Worker] BullMQ Job ${job?.id} failed with ${err.name}`);
});

worker.on('error', error => console.error('[Worker] Redis/queue error:', error.name));
const outboxInterval = setInterval(() => dispatchOutboxBatch().catch(error => console.error('[Outbox] Dispatch error:', error.name)), 5_000);
dispatchOutboxBatch().catch(error => console.error('[Outbox] Initial dispatch error:', error.name));

async function shutdown() {
  clearInterval(outboxInterval);
  await worker.close();
  await prisma.$disconnect();
}
process.once('SIGTERM', () => shutdown().finally(() => process.exit(0)));
process.once('SIGINT', () => shutdown().finally(() => process.exit(0)));

async function updateProgress(jobId, percent, step, message) {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      progressPercent: percent,
      progressStep: step,
      progressMessage: message,
      logs: { create: { event: 'PROGRESS', level: 'INFO', context: { step, message } } }
    }
  });
}
