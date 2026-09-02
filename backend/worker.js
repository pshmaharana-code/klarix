import dotenv from 'dotenv';
dotenv.config();
import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { connection } from './jobs/queue.js';
import * as metaAdapter from './integrations/metaAdapter.js';
import * as cryptoLib from './lib/crypto.js';

const prisma = new PrismaClient();

console.log('👷 Klarix V2 Worker starting...');
console.log('🔌 Connecting to Redis:', process.env.REDIS_URL || 'redis://localhost:6379');

const worker = new Worker('klarix-jobs', async job => {
  const { jobId, brandId, input } = job.data;
  const { code } = input;

  console.log(`[Worker] Received job ${job.id} for brand ${brandId}`);

  // 1. Verify Job State in Postgres (At-least-once delivery protection)
  const dbJob = await prisma.job.findUnique({ where: { id: jobId } });
  if (!dbJob) throw new Error('Job not found in database');
  
  if (dbJob.state === 'COMPLETED') {
    console.log(`[Worker] Job ${jobId} already COMPLETED in Postgres. Skipping.`);
    return { skipped: true, reason: 'Already completed' };
  }

  // 2. Mark PROCESSING
  await prisma.job.update({
    where: { id: jobId },
    data: {
      state: 'PROCESSING',
      startedAt: new Date(),
      progressPercent: 10,
      progressStep: 'Connecting',
      progressMessage: 'Connecting to Meta...',
      logs: { create: { event: 'PROCESSING_START', level: 'INFO' } }
    }
  });

  try {
    if (dbJob.type === 'SYNC_ACCOUNT') {
      // Step A: Exchange Code
      await updateProgress(jobId, 30, 'Exchanging token', 'Authenticating with Instagram...');
      const { accessToken, expiresIn } = await metaAdapter.exchangeCodeForToken(code);

      // Step B: Fetch Profile
      await updateProgress(jobId, 60, 'Fetching profile', 'Retrieving account details...');
      const profile = await metaAdapter.fetchProfile(accessToken);

      // Step C: Encrypt Token
      await updateProgress(jobId, 80, 'Securing data', 'Encrypting credentials...');
      const encryptedToken = cryptoLib.encrypt(accessToken);
      const expiryDate = new Date(Date.now() + expiresIn * 1000);

      // Step D: Upsert Social Account
      await updateProgress(jobId, 90, 'Saving', 'Persisting account link...');
      
      await prisma.socialAccount.upsert({
        where: {
          platform_externalAccountId: {
            platform: profile.platform,
            externalAccountId: profile.externalAccountId
          }
        },
        create: {
          brandId,
          platform: profile.platform,
          externalAccountId: profile.externalAccountId,
          username: profile.username,
          accountType: profile.accountType,
          profileMetadata: { followersCount: profile.followersCount, profilePictureUrl: profile.profilePictureUrl },
          connectionStatus: 'CONNECTED',
          encryptedToken,
          expiry: expiryDate,
          lastSync: new Date()
        },
        update: {
          // Re-link to this brand if it was reassigned? No, in a real app we'd verify ownership.
          // The @@unique([platform, externalAccountId]) ensures the account is strictly mapped.
          brandId, 
          username: profile.username,
          accountType: profile.accountType,
          profileMetadata: { followersCount: profile.followersCount, profilePictureUrl: profile.profilePictureUrl },
          connectionStatus: 'CONNECTED',
          encryptedToken,
          expiry: expiryDate,
          lastSync: new Date()
        }
      });

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
      return { success: true, username: profile.username };
    } else {
      throw new Error(`Unknown job type: ${dbJob.type}`);
    }
  } catch (error) {
    console.error(`[Worker] Job ${jobId} failed:`, error.message);
    // 4. Mark FAILED
    await prisma.job.update({
      where: { id: jobId },
      data: {
        state: 'FAILED',
        completedAt: new Date(),
        error: { message: error.message },
        progressStep: 'Failed',
        progressMessage: 'Encountered an error during processing',
        logs: { create: { event: 'PROCESSING_FAILED', level: 'ERROR', context: { error: error.message } } }
      }
    });
    throw error; // Let BullMQ know it failed for retry mechanics
  }
}, { connection });

worker.on('failed', (job, err) => {
  console.log(`[Worker] BullMQ Job ${job.id} failed with ${err.message}`);
});

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
