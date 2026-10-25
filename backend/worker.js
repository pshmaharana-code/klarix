import pkg from 'bullmq';
const { Worker, DelayedError = class DelayedError extends Error { }, UnrecoverableError = class UnrecoverableError extends Error { } } = pkg;
import { PrismaClient } from '@prisma/client';
import { connection } from './jobs/queue.js';
import { dispatchOutboxBatch, createAndEnqueueJob } from './jobs/jobService.js';
import { updateSyncProgress } from './jobs/syncProgressService.js';
import * as contentRepository from './repositories/contentRepository.js';
import { analyzePost } from './services/postAnalysisOrchestrator.js';
import * as metaAdapter from './integrations/metaAdapter.js';
import * as cryptoLib from './lib/crypto.js';
import { loadConfig, redactRedisUrl } from './lib/config.js';
import { calculateDerivedMetrics } from './services/analyticsService.js';
import { discoverPatterns } from './services/patternService.js';
import { updateMemory } from './services/memoryService.js';
import { generateStrategy } from './services/strategyService.js';

const prisma = new PrismaClient();

console.log('👷 Klarix V2 Worker starting...');
console.log('🔌 Connecting to Redis:', redactRedisUrl(loadConfig().redisUrl));

export async function processJob(job, token) {
  const { jobId, brandId, input } = job.data;
  const workerToken = token || job.token;

  console.log(`\n========================================`);
  console.log(`[Worker] 1. Received job ${job.id} for brand ${brandId}`);
  console.log(`[Worker] 2. Job Database ID is ${jobId}`);

  console.log(`[Worker] 3. Claiming job in PostgreSQL...`);

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

  console.log(`[Worker] 4. Claim result: ${claim.count} row(s) updated.`);

  if (claim.count !== 1) {
    console.log(`[Worker] 4b. Job already claimed or completed. Skipping.`);
    return { skipped: true, reason: 'Already completed' };
  }

  console.log(`[Worker] 5. Fetching full job details from database...`);
  const dbJob = await prisma.job.findUnique({ where: { id: jobId } });
  if (!dbJob) throw new Error('Job not found in database');

  console.log(`[Worker] 6. Job Type is: [${dbJob.type}]. Starting execution...`);
  await prisma.jobLog.create({ data: { jobId, event: 'PROCESSING_START', level: 'INFO' } });

  try {
    if (dbJob.type === 'SYNC_ACCOUNT') {
      await updateProgress(jobId, 30, 'Authenticating', 'Authenticating with Instagram...');
      const credential = await prisma.oAuthCredential.findUnique({ where: { id: input?.credentialId } });
      if (!credential || credential.expiresAt <= new Date()) {
        const err = new Error('OAuth credential is unavailable'); err.code = 'OAUTH_INVALID'; throw err;
      }
      const accessToken = cryptoLib.decrypt(credential.encryptedToken);
      const profile = await metaAdapter.fetchProfile(accessToken);
      const encryptedToken = cryptoLib.encrypt(accessToken);

      const accountData = {
        username: profile.username, accountType: profile.accountType,
        profileMetadata: { followersCount: profile.followersCount, profilePictureUrl: profile.profilePictureUrl },
        connectionStatus: 'CONNECTED', encryptedToken, expiry: new Date(Date.now() + Math.max(0, Math.floor((credential.expiresAt.getTime() - Date.now()) / 1000)) * 1000), lastSync: new Date()
      };

      let existingAccount = await prisma.socialAccount.findUnique({ where: { platform_externalAccountId: { platform: profile.platform, externalAccountId: profile.externalAccountId } } });
      if (existingAccount) {
        existingAccount = await prisma.socialAccount.update({ where: { id: existingAccount.id }, data: accountData });
      } else {
        existingAccount = await prisma.socialAccount.create({ data: { brandId, platform: profile.platform, externalAccountId: profile.externalAccountId, ...accountData } });
      }

      const mediaResponse = await metaAdapter.fetchUserMedia(accessToken, existingAccount.externalAccountId);
      let newChildJobs = 0;
      for (const item of (mediaResponse.items || [])) {
        const child = await createAndEnqueueJob({
          brandId, type: 'IMPORT_CONTENT', parentJobId: jobId,
          idempotencyKey: `import:${existingAccount.id}:${item.externalContentId}:${jobId}`,
          input: { socialAccountId: existingAccount.id, externalContentId: item.externalContentId, item }
        });
        if (child.parentJobId === jobId) newChildJobs++;
      }

      await prisma.job.update({ where: { id: jobId }, data: { totalCount: newChildJobs, result: { username: profile.username }, logs: { create: { event: 'SYNC_DISCOVERED', level: 'INFO', context: { count: (mediaResponse.items || []).length, newChildJobs } } } } });
      await prisma.brand.update({ where: { id: brandId }, data: { onboardingStatus: 'COMPLETED' } });
      await updateSyncProgress(jobId);
      return { success: true, username: profile.username, itemsCount: (mediaResponse.items || []).length };

    } else if (dbJob.type === 'IMPORT_CONTENT') {
      const { socialAccountId, externalContentId, item } = input;
      const content = await contentRepository.upsertContent({
        brandId, socialAccountId, externalContentId, type: item.type,
        publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
        permalink: item.permalink || null, caption: item.caption || null
      });

      if (item.type === 'CAROUSEL' && Array.isArray(item.children) && item.children.length > 0) {
        await contentRepository.replaceCarouselMedia({ contentId: content.id, validChildren: item.children.filter(child => child && child.mediaUrl) });
      } else {
        await contentRepository.upsertMedia({ contentId: content.id, mediaType: item.type, sourceUrl: item.mediaUrl || item.permalink || '', thumbnailUrl: item.thumbnailUrl || null });
      }

      const observationDate = new Date().toISOString().split('T')[0];
      const metricsChild = await createAndEnqueueJob({
        brandId, type: 'FETCH_METRICS', parentJobId: dbJob.id,
        idempotencyKey: `metrics:${content.id}:${observationDate}:${dbJob.id}`,
        input: { contentId: content.id, socialAccountId, externalContentId, item, observationDate }
      });

      await prisma.job.update({ where: { id: jobId }, data: { totalCount: metricsChild.parentJobId === dbJob.id ? 1 : 0, state: 'COMPLETED', progressPercent: 100, progressStep: 'Complete', completedAt: new Date() } });
      if (dbJob.parentJobId) await updateSyncProgress(dbJob.parentJobId);
      return { success: true, contentId: content.id };

    } else if (dbJob.type === 'FETCH_METRICS') {
      const { contentId, socialAccountId, externalContentId, item, observationDate } = input;
      const account = await prisma.socialAccount.findUnique({ where: { id: socialAccountId } });
      const accessToken = cryptoLib.decrypt(account.encryptedToken);
      const metrics = await metaAdapter.fetchMediaInsights(accessToken, externalContentId, item.type);

      const observedAt = observationDate ? new Date(observationDate) : new Date();
      if (observationDate) observedAt.setUTCHours(0, 0, 0, 0);

      let snapshot;
      try {
        snapshot = await contentRepository.createMetricSnapshot({
          contentId, observedAt, reach: metrics.reach, impressions: metrics.impressions, plays: metrics.plays,
          likes: metrics.likes, comments: metrics.comments, saves: metrics.saves, shares: metrics.shares,
          totalInteractions: metrics.totalInteractions, igReelsAvgWatchTime: metrics.igReelsAvgWatchTime,
          igReelsVideoViewTotalTime: metrics.igReelsVideoViewTotalTime, reelsSkipRate: metrics.reelsSkipRate, rawPayload: metrics.rawPayload || metrics
        });
      } catch (err) {
        if (err.code === 'METRIC_SNAPSHOT_CONFLICT') {
          snapshot = await prisma.contentMetricSnapshot.findFirst({ where: { contentId, observedAt } });
          if (!snapshot) throw err;
        } else throw err;
      }

      const derivedRates = calculateDerivedMetrics({ likes: snapshot.likes, comments: snapshot.comments, saves: snapshot.saves, shares: snapshot.shares, reach: snapshot.reach, views: snapshot.plays });

      await contentRepository.upsertContentDerivedMetric({
        contentId, calculationVersion: '1.1', sourceSnapshotId: snapshot.id,
        likeRate: derivedRates.likeRate, commentRate: derivedRates.commentRate, saveRate: derivedRates.saveRate, shareRate: derivedRates.shareRate, interactionRate: derivedRates.interactionRate, viewToReachRatio: derivedRates.viewToReachRatio
      });

      const existingContent = await prisma.content.findUnique({ where: { id: contentId }, select: { analysisStatus: true } });
      if (existingContent?.analysisStatus !== 'COMPLETED') {
        await createAndEnqueueJob({
          brandId, type: 'ANALYZE_CONTENT', parentJobId: dbJob.parentJobId,
          idempotencyKey: `analyze:${contentId}:1.1`,
          input: { contentId }
        });
      } else {
        console.log(`[Worker] Skipping AI Analysis for ${contentId} (Already COMPLETED)`);
      }

      await prisma.job.update({ where: { id: jobId }, data: { state: 'COMPLETED', progressPercent: 100, progressStep: 'Complete', completedAt: new Date() } });
      if (dbJob.parentJobId) {
        const parentJob = await prisma.job.findUnique({ where: { id: dbJob.parentJobId } });
        if (parentJob?.parentJobId) await updateSyncProgress(parentJob.parentJobId);
      }
      return { success: true };

    } else if (dbJob.type === 'FETCH_ACCOUNT_METRICS') {
      const { socialAccountId, externalAccountId, since, until } = input;
      const account = await prisma.socialAccount.findUnique({ where: { id: socialAccountId } });
      const accessToken = cryptoLib.decrypt(account.encryptedToken);

      const configuredMetrics = [{ metric: 'reach', period: 'day', breakdown: null }, { metric: 'reach', period: 'day', breakdown: 'media_product_type' }, { metric: 'total_interactions', period: 'day', breakdown: null }, { metric: 'likes', period: 'day', breakdown: null }, { metric: 'comments', period: 'day', breakdown: null }, { metric: 'shares', period: 'day', breakdown: null }, { metric: 'saves', period: 'day', breakdown: null }];
      let partialFailure = false; let processedAny = false;

      for (const config of configuredMetrics) {
        try {
          const res = await metaAdapter.fetchAccountInsights(accessToken, externalAccountId, { metric: config.metric, period: config.period, breakdown: config.breakdown, since, until });
          if (res.isSupported && Array.isArray(res.data)) {
            for (const item of res.data) {
              const breakdownDef = config.breakdown || 'none';
              if (config.breakdown && (!item.breakdowns || item.breakdowns.length === 0)) continue;
              for (const val of item.values) {
                if (val.endTime) {
                  await contentRepository.upsertSocialAccountMetricSnapshot({ socialAccountId, metricName: item.metricName, period: item.period, endTime: new Date(val.endTime), breakdownDefinition: breakdownDef, value: val.value, breakdowns: item.breakdowns, rawPayload: item.rawPayload });
                  processedAny = true;
                }
              }
            }
          }
        } catch (err) { partialFailure = true; }
      }

      await prisma.job.update({ where: { id: jobId }, data: { state: partialFailure ? 'PARTIAL' : 'COMPLETED', progressPercent: 100, progressStep: 'Complete', completedAt: new Date(), result: { partialFailure, processedAny } } });
      if (dbJob.parentJobId) await updateSyncProgress(dbJob.parentJobId);
      return { success: true, partialFailure };

    } else if (dbJob.type === 'DISCOVER_PATTERNS') {
      console.log(`[Worker] 7. Entering DISCOVER_PATTERNS block...`);
      await updateProgress(jobId, 35, 'Discovering patterns', 'Comparing qualified content cohorts...');

      console.log(`[Worker] 8. Executing discoverPatterns() in patternService.js...`);
      const discovery = await discoverPatterns(brandId, { force: Boolean(input?.force) });

      console.log(`[Worker] 9. Pattern discovery finished! Result:`, discovery);
      await prisma.job.update({
        where: { id: jobId },
        data: {
          state: 'COMPLETED', progressPercent: 100, progressStep: 'Complete', completedAt: new Date(),
          result: { status: discovery.status, sampleSize: discovery.sampleSize, evidenceCount: discovery.evidenceCount || 0, patternId: discovery.patternId || null, limitations: discovery.limitations }
        }
      });

      // Enqueue UPDATE_MEMORY immediately after DISCOVER_PATTERNS completes
      await createAndEnqueueJob({
        brandId,
        type: 'UPDATE_MEMORY',
        parentJobId: dbJob.parentJobId || dbJob.id,
        idempotencyKey: `memory:${brandId}:${Date.now()}`,
        input: {}
      });

      return { success: true, ...discovery };

    } else if (dbJob.type === 'UPDATE_MEMORY') {
      console.log(`[Worker] Entering UPDATE_MEMORY block...`);
      await updateProgress(jobId, 50, 'Updating Memory', 'Synthesizing brand profile and active patterns...');

      const memoryResult = await updateMemory(brandId);

      await prisma.job.update({
        where: { id: jobId },
        data: {
          state: 'COMPLETED', progressPercent: 100, progressStep: 'Complete', completedAt: new Date(),
          result: { entriesCreated: memoryResult.entriesCreated }
        }
      });

      // Auto-trigger Strategy Generation now that memory is updated
      await createAndEnqueueJob({
        brandId,
        type: 'GENERATE_STRATEGY',
        parentJobId: dbJob.parentJobId || dbJob.id,
        idempotencyKey: `strategy:${brandId}:${Date.now()}`,
        input: {}
      });

      return { success: true, ...memoryResult };

    } else if (dbJob.type === 'GENERATE_STRATEGY') {
      console.log(`[Worker] Entering GENERATE_STRATEGY block...`);
      await updateProgress(jobId, 75, 'Generating Strategy', 'Drafting new operating blueprint based on updated memory...');

      const strategyResult = await generateStrategy(brandId);

      await prisma.job.update({
        where: { id: jobId },
        data: {
          state: 'COMPLETED', progressPercent: 100, progressStep: 'Complete', completedAt: new Date(),
          result: { strategyId: strategyResult.strategyId, version: strategyResult.version }
        }
      });

      return { success: true, ...strategyResult };

    } else if (dbJob.type === 'ANALYZE_CONTENT') {
      const { contentId } = input;
      const content = await prisma.content.findUnique({ where: { id: contentId }, include: { media: { orderBy: { createdAt: 'asc' } }, metricSnapshots: { orderBy: { observedAt: 'desc' }, take: 1 } } });
      await prisma.content.update({ where: { id: contentId }, data: { analysisStatus: 'PROCESSING' } });
      const brand = await prisma.brand.findUnique({ where: { id: brandId } });
      const metrics = content.metricSnapshots.length > 0 ? content.metricSnapshots[0] : null;
      const mediaPayload = content.media.map(m => m.sourceUrl).filter(Boolean);

      const analysisResult = await analyzePost(brand, content, metrics, mediaPayload);

      await prisma.contentAnalysis.upsert({
        where: { contentId_version: { contentId, version: analysisResult.version } },
        create: { contentId, version: analysisResult.version, status: analysisResult.status, visualFindings: analysisResult.visualFindings, contentFindings: analysisResult.contentFindings, perfFindings: analysisResult.perfFindings, confidence: analysisResult.confidence, providerMeta: analysisResult.providerMeta, completedAt: new Date() },
        update: { status: analysisResult.status, visualFindings: analysisResult.visualFindings, contentFindings: analysisResult.contentFindings, perfFindings: analysisResult.perfFindings, confidence: analysisResult.confidence, providerMeta: analysisResult.providerMeta, completedAt: new Date() }
      });

      await prisma.content.update({ where: { id: contentId }, data: { analysisStatus: analysisResult.status } });
      await prisma.job.update({ where: { id: jobId }, data: { state: analysisResult.status === 'COMPLETED' ? 'COMPLETED' : 'PARTIAL', progressPercent: 100, progressStep: 'Complete', completedAt: new Date(), result: { version: analysisResult.version, status: analysisResult.status } } });

      const parentJob = await prisma.job.findUnique({ where: { id: dbJob.parentJobId } });
      if (parentJob && parentJob.parentJobId) await updateSyncProgress(parentJob.parentJobId);
      return { success: true, status: analysisResult.status };

    } else {
      throw new Error(`Unknown job type: ${dbJob.type}`);
    }
  } catch (error) {
    console.error(`[Worker] Job ${jobId} failed:`, error.message);
    const maxAttempts = job.opts?.attempts || 3;
    const currentAttempt = Math.max(job.attemptsMade + 1, dbJob?.attempts || 1);
    const willRetry = currentAttempt < maxAttempts && (error.retryable !== false);

    if (dbJob?.type === 'ANALYZE_CONTENT' && !willRetry) {
      if (input?.contentId) await prisma.content.update({ where: { id: input.contentId }, data: { analysisStatus: 'FAILED' } }).catch(() => { });
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        state: willRetry ? 'RETRY_PENDING' : 'FAILED',
        completedAt: willRetry ? null : new Date(),
        error: { code: error.code || 'PROCESSING_FAILED', details: error.message },
        progressStep: willRetry ? `Retry pending` : 'Failed',
        progressMessage: willRetry ? 'Temporary error, retrying shortly...' : 'Failed permanently.',
        logs: { create: { event: 'PROCESSING_FAILED', level: 'ERROR', context: { code: error.code || 'PROCESSING_FAILED', msg: error.message } } }
      }
    });

    if (dbJob?.parentJobId) {
      const parentJob = await prisma.job.findUnique({ where: { id: dbJob.parentJobId } });
      if (parentJob) await updateSyncProgress(parentJob.parentJobId ? parentJob.parentJobId : dbJob.parentJobId).catch(() => { });
    }

    const retryAfterSec = parseFloat(error.retryAfter) || (willRetry ? 15 : 0);
    if (willRetry && retryAfterSec > 0) {
      console.log(`[Worker] Delaying retry for ${retryAfterSec}s...`);
      await job.moveToDelayed(Date.now() + Math.ceil(retryAfterSec * 1000), workerToken);
      throw new DelayedError();
    }
    if (!willRetry) throw new UnrecoverableError(error.message);
    throw error;
  }
}

export const worker = new Worker('klarix-sync', processJob, { connection });
worker.on('failed', (job, err) => console.log(`[Worker] BullMQ Job ${job?.id} failed with ${err.name}`));
worker.on('error', error => console.error('[Worker] Redis/queue error:', error.name));
const outboxInterval = setInterval(() => dispatchOutboxBatch().catch(() => { }), 5_000);
dispatchOutboxBatch().catch(() => { });

async function shutdown() {
  clearInterval(outboxInterval);
  await worker.close();
  await prisma.$disconnect();
}
process.once('SIGTERM', () => shutdown().finally(() => process.exit(0)));
process.once('SIGINT', () => shutdown().finally(() => process.exit(0)));

async function updateProgress(jobId, percent, step, message) {
  await prisma.job.update({ where: { id: jobId }, data: { progressPercent: percent, progressStep: step, progressMessage: message, logs: { create: { event: 'PROGRESS', level: 'INFO', context: { step, message } } } } });
}