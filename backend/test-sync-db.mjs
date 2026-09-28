import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const p = new PrismaClient();
const r = new IORedis('redis://localhost:6379');
const q = new Queue('klarix-sync', { connection: r });

async function run() {
  const brandId = 'd34701bf-5f35-43d8-bfbd-2fbc5a6f50cf';
  
  // Create a temporary credential for the worker using the stored token
  const account = await p.socialAccount.findUnique({ where: { id: '9afc6d27-ee1b-4f25-acbd-4a1a472888f6' } });
  const credential = await p.oAuthCredential.create({
    data: {
      encryptedToken: account.encryptedToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    }
  });

  // Create DB job
  const jobId = `manual-sync-${Date.now()}`;
  const dbJob = await p.job.create({
    data: {
      id: jobId,
      brandId,
      type: 'SYNC_ACCOUNT',
      state: 'QUEUED',
      idempotencyKey: jobId,
      input: { credentialId: credential.id }
    }
  });
  
  console.log(`Triggering SYNC_ACCOUNT DB Job ${jobId}...`);
  const job = await q.add('SYNC_ACCOUNT', { brandId, credentialId: credential.id }, { jobId });
  
  while (true) {
    const state = await job.getState();
    if (state === 'completed' || state === 'failed') {
      console.log(`Sync job finished with state: ${state}`);
      break;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Wait a little for child jobs to complete
  await new Promise(r => setTimeout(r, 8000));
  
  const reel = await p.content.findUnique({ where: { id: 'fd77c4f1-f187-48e0-bb7c-0130ddf65815' }, include: { media: true } });
  console.log('Reel media:');
  console.log(reel.media[0]);
}

run().finally(() => { p.$disconnect(); r.disconnect(); });
