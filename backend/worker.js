import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { connection } from './jobs/queue.js';
import { dispatchOutboxBatch, createAndEnqueueJob } from './jobs/jobService.js';
import { updateSyncProgress } from './jobs/syncProgressService.js';
import * as contentRepository from './repositories/contentRepository.js';
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
      
      let newImports = 0;
      for (const item of items) {
        const child = await createAndEnqueueJob({
          brandId,
          type: 'IMPORT_CONTENT',
          parentJobId: jobId,
          idempotencyKey: `import:${existingAccount.id}:${item.externalContentId}`,
          input: { socialAccountId: existingAccount.id, externalContentId: item.externalContentId, item }
        });
        if (child.parentJobId === jobId) newImports++;
      }

      await prisma.job.update({ 
        where: { id: jobId }, 
        data: { 
          totalCount: newImports,
          result: { username: profile.username },
          logs: { create: { event: 'SYNC_DISCOVERED', level: 'INFO', context: { count: items.length, newImports } } }
        } 
      });

      await prisma.oAuthCredential.delete({ where: { id: credential.id } });
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

      await contentRepository.upsertMedia({
        contentId: content.id,
        mediaType: item.type,
        sourceUrl: item.mediaUrl || item.permalink || ''
      });

      // Create exactly one FETCH_METRICS child
      const rootJobId = dbJob.parentJobId;
      const metricsChild = await createAndEnqueueJob({
        brandId,
        type: 'FETCH_METRICS',
        parentJobId: dbJob.id,
        idempotencyKey: `metrics:${content.id}:${rootJobId}`,
        input: { contentId: content.id, socialAccountId, externalContentId, item }
      });

      const newMetrics = metricsChild.parentJobId === dbJob.id ? 1 : 0;
      await prisma.job.update({ 
        where: { id: jobId }, 
        data: { 
          totalCount: newMetrics,
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
      
      const metrics = await metaAdapter.fetchMediaInsights(accessToken, externalContentId, item.media_type);
      
      await contentRepository.createMetricSnapshot({
        contentId,
        observedAt: new Date(),
        reach: metrics.reach,
        impressions: metrics.impressions,
        plays: metrics.plays,
        likes: metrics.likes,
        comments: metrics.comments,
        saves: metrics.saves,
        shares: metrics.shares
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
      
    } else {
      throw new Error(`Unknown job type: ${dbJob.type}`);
    }
  } catch (error) {
    console.error(`[Worker] Job ${jobId} failed:`, error.message);
    // 4. Mark FAILED
    const willRetry = job.attemptsMade + 1 < (job.opts.attempts || 1);
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
