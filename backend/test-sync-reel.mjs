import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const p = new PrismaClient();
const r = new IORedis('redis://localhost:6379');
const q = new Queue('klarix-sync', { connection: r });

async function run() {
  const brandId = 'd34701bf-5f35-43d8-bfbd-2fbc5a6f50cf';
  
  console.log(`Triggering SYNC_ACCOUNT for brand ${brandId}...`);
  // Just use brandId, no credentialId, let it discover all
  const job = await q.add('SYNC_ACCOUNT', { brandId }, { jobId: `manual-sync-${Date.now()}` });
  console.log(`Job enqueued: ${job.id}`);
  
  while (true) {
    const state = await job.getState();
    if (state === 'completed' || state === 'failed') {
      console.log(`Sync job finished with state: ${state}`);
      break;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Wait a little for child jobs to complete
  await new Promise(r => setTimeout(r, 5000));
  
  const reel = await p.content.findUnique({ where: { id: 'fd77c4f1-f187-48e0-bb7c-0130ddf65815' }, include: { media: true } });
  console.log('Reel media:');
  console.log(reel.media[0]);
}

run().finally(() => { p.$disconnect(); r.disconnect(); });
