import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { loadConfig } from './lib/config.js';

async function run() {
  const prisma = new PrismaClient();
  try {
    const config = loadConfig();
    const queue = new Queue('klarix-sync', {
      connection: {
        host: new URL(config.redisUrl).hostname,
        port: Number(new URL(config.redisUrl).port || 6379)
      }
    });

    const account = await prisma.socialAccount.findFirst();
    if (!account) {
      console.log('No social account found');
      return;
    }

    const credential = await prisma.oAuthCredential.findFirst({
      where: { brandId: account.brandId }
    });
    
    if (!credential) {
      console.log('No credential found');
      return;
    }

    const jobDetails = {
      type: 'SYNC_ACCOUNT',
      brandId: account.brandId,
      state: 'QUEUED',
      progressStep: 'Queued',
      progressMessage: 'Waiting to start...',
      input: { credentialId: credential.id } 
    };

    // Looking at jobService.js or worker.js, we should create a job row
    const dbJob = await prisma.job.create({
      data: jobDetails
    });

    await queue.add('sync', {
      jobId: dbJob.id,
      brandId: account.brandId,
      input: { credentialId: credential.id }
    }, {
      jobId: dbJob.id
    });

    console.log(`Successfully enqueued SYNC_ACCOUNT job: ${dbJob.id}`);
    
    // Give it a few seconds to run
    console.log('Waiting for worker to process...');
    await new Promise(r => setTimeout(r, 10000));
    
    console.log('Done.');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
