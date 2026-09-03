import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { connection } from './jobs/queue.js';
import { dispatchOutboxBatch } from './jobs/jobService.js';
import * as metaAdapter from './integrations/metaAdapter.js';
import * as cryptoLib from './lib/crypto.js';
import { loadConfig, redactRedisUrl } from './lib/config.js';

const prisma = new PrismaClient();

console.log('👷 Klarix V2 Worker starting...');
console.log('🔌 Connecting to Redis:', redactRedisUrl(loadConfig().redisUrl));

const worker = new Worker('klarix-jobs', async job => {
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
      const credential = await prisma.oauthCredential.findUnique({
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
      const existingAccount = await prisma.socialAccount.findUnique({ where: accountKey });
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
        await prisma.socialAccount.update({ where: { id: existingAccount.id }, data: accountData });
      } else {
        try {
          await prisma.socialAccount.create({
            data: {
          brandId,
          platform: profile.platform,
          externalAccountId: profile.externalAccountId,
              ...accountData
            }
          });
        } catch (error) {
          if (error.code !== 'P2002') throw error;
          const winner = await prisma.socialAccount.findUnique({ where: accountKey });
          if (!winner || winner.brandId !== brandId) {
            const ownershipError = new Error('Social account belongs to another brand');
            ownershipError.code = 'SOCIAL_ACCOUNT_OWNERSHIP_CONFLICT';
            throw ownershipError;
          }
          await prisma.socialAccount.update({ where: { id: winner.id }, data: accountData });
        }
      }

      // 3. Mark COMPLETED
      await prisma.job.update({
        where: { id: jobId },
        data: {
          state: 'COMPLETED',
          progressPercent: 100,
          progressStep: 'Complete',
          progressMessage: 'Instagram account connected successfully',
          completedAt: new Date(),
          result: { username: profile.username },
          logs: { create: { event: 'PROCESSING_COMPLETE', level: 'INFO', context: { username: profile.username } } }
        }
      });
      await prisma.oauthCredential.delete({ where: { id: credential.id } });
      return { success: true, username: profile.username };
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
