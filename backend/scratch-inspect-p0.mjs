import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const p = new PrismaClient();
const r = new IORedis('redis://localhost:6379');
const q = new Queue('klarix-sync', { connection: r });

async function run() {
  const brandId = 'd34701bf-5f35-43d8-bfbd-2fbc5a6f50cf';
  const socialAccountId = '7c2b3ab6-b25f-4632-a50d-bc0ef37d1cf4'; // Using test account
  
  // Cleanup duplicates for REEL so we can see it clearly
  const reelRows = await p.contentMedia.findMany({ where: { contentId: 'fd77c4f1-f187-48e0-bb7c-0130ddf65815' }, orderBy: { createdAt: 'asc' } });
  if (reelRows.length > 1) {
    console.log(`Cleaning up ${reelRows.length - 1} duplicate Reel rows...`);
    const toDelete = reelRows.slice(1).map(r => r.id);
    await p.contentMedia.deleteMany({ where: { id: { in: toDelete } } });
  }

  console.log(`Triggering SYNC_ACCOUNT for brand ${brandId}...`);
  const job = await q.add('SYNC_ACCOUNT', {
    brandId,
    socialAccountId
  }, {
    jobId: `manual-sync-${Date.now()}`
  });
  console.log(`Job enqueued: ${job.id}`);
  
  while (true) {
    const state = await job.getState();
    if (state === 'completed' || state === 'failed') {
      console.log(`Sync job finished with state: ${state}`);
      break;
    }
    await new Promise(res => setTimeout(res, 2000));
  }

  // Wait extra time for the IMPORT_CONTENT sub-jobs to finish
  await new Promise(res => setTimeout(res, 5000));

  const items = await p.content.findMany({
    where: { brandId },
    include: {
      media: { orderBy: { createdAt: 'asc' } },
      analyses: { orderBy: { createdAt: 'desc' }, take: 1 },
      metricSnapshots: { orderBy: { observedAt: 'desc' }, take: 1 }
    }
  });

  const targetTypes = ['REEL', 'CAROUSEL'];
  for (const c of items) {
    if (!targetTypes.includes(c.type)) continue;
    console.log(`\n=== Content: ${c.type} (${c.id}) ===`);
    console.log(`Media Count: ${c.media.length}`);
    c.media.forEach((m, idx) => {
      console.log(`  Media [${idx}]: type=${m.mediaType}, src=${!!m.sourceUrl}, thumb=${!!m.thumbnailUrl}, dur=${m.durationSeconds}`);
    });
    const a = c.analyses[0];
    if (a) {
      console.log(`Analysis: status=${a.status}, visual=${!!a.visualFindings}, perf=${!!a.perfFindings}`);
      if (a.perfFindings) {
        console.log(`  Perf snippet: ${JSON.stringify(a.perfFindings).substring(0, 80)}...`);
      }
    } else {
      console.log('Analysis: NONE');
    }
    const m = c.metricSnapshots[0];
    if (m) {
      console.log(`Metrics: reach=${m.reach}, plays=${m.plays}, observedAt=${m.observedAt}`);
    }
  }
}

run().catch(console.error).finally(() => { p.$disconnect(); r.quit(); });
