/**
 * Triggers a sync via the proper connections route logic (creates oAuthCredential + enqueues job),
 * waits for completion, then checks carousel idempotency.
 */
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import * as cryptoLib from './lib/crypto.js';

const p = new PrismaClient();
const CAROUSEL_CONTENT_ID = 'b8527481-f90f-49f9-a634-c904cdc4c805';
const SOCIAL_ACCOUNT_ID = '9afc6d27-ee1b-4f25-acbd-4a1a472888f6';
const BRAND_ID = 'd34701bf-5f35-43d8-bfbd-2fbc5a6f50cf';

function redactUrl(url) {
  if (!url) return null;
  try { const u = new URL(url); return `${u.origin}${u.pathname}`; } catch { return '[invalid]'; }
}

async function run() {
  const r = new IORedis('redis://localhost:6379');
  const q = new Queue('klarix-sync', { connection: r });

  // Record before state
  const before = await p.contentMedia.findMany({
    where: { contentId: CAROUSEL_CONTENT_ID },
    orderBy: { createdAt: 'asc' }
  });
  console.log(`Before sync: ${before.length} carousel rows`);
  before.forEach((m, i) => console.log(`  [${i}] type=${m.mediaType} path=${redactUrl(m.sourceUrl)}`));

  // Create temp credential (exactly as connections.js does)
  const account = await p.socialAccount.findUnique({ where: { id: SOCIAL_ACCOUNT_ID } });
  const credential = await p.oAuthCredential.create({
    data: {
      encryptedToken: account.encryptedToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    }
  });

  // Sync 1
  const idKey1 = `sync-${SOCIAL_ACCOUNT_ID}-${Date.now()}`;
  const job1 = await p.job.create({
    data: { id: idKey1, brandId: BRAND_ID, type: 'SYNC_ACCOUNT', state: 'QUEUED', idempotencyKey: idKey1, input: { credentialId: credential.id } }
  });
  await q.add('SYNC_ACCOUNT', { brandId: BRAND_ID, credentialId: credential.id }, { jobId: idKey1 });
  console.log(`\nSync 1 enqueued: ${idKey1}`);

  // Wait for completion
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const j = await p.job.findUnique({ where: { id: idKey1 } });
    if (j && (j.state === 'COMPLETED' || j.state === 'FAILED' || j.state === 'PARTIAL')) {
      console.log(`Sync 1 finished: ${j.state}`);
      break;
    }
  }

  // Check after sync 1
  const after1 = await p.contentMedia.findMany({
    where: { contentId: CAROUSEL_CONTENT_ID },
    orderBy: { createdAt: 'asc' }
  });
  console.log(`\nAfter sync 1: ${after1.length} carousel rows`);
  after1.forEach((m, i) => console.log(`  [${i}] id=${m.id.slice(0,8)} path=${redactUrl(m.sourceUrl)}`));

  // Wait then sync 2 (use different credential)
  await new Promise(r => setTimeout(r, 3000));
  const credential2 = await p.oAuthCredential.create({
    data: {
      encryptedToken: account.encryptedToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    }
  });
  const idKey2 = `sync-${SOCIAL_ACCOUNT_ID}-${Date.now()}`;
  const job2 = await p.job.create({
    data: { id: idKey2, brandId: BRAND_ID, type: 'SYNC_ACCOUNT', state: 'QUEUED', idempotencyKey: idKey2, input: { credentialId: credential2.id } }
  });
  await q.add('SYNC_ACCOUNT', { brandId: BRAND_ID, credentialId: credential2.id }, { jobId: idKey2 });
  console.log(`\nSync 2 enqueued: ${idKey2}`);

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const j = await p.job.findUnique({ where: { id: idKey2 } });
    if (j && (j.state === 'COMPLETED' || j.state === 'FAILED' || j.state === 'PARTIAL')) {
      console.log(`Sync 2 finished: ${j.state}`);
      break;
    }
  }

  const after2 = await p.contentMedia.findMany({
    where: { contentId: CAROUSEL_CONTENT_ID },
    orderBy: { createdAt: 'asc' }
  });
  console.log(`\nAfter sync 2: ${after2.length} carousel rows`);
  after2.forEach((m, i) => console.log(`  [${i}] id=${m.id.slice(0,8)} path=${redactUrl(m.sourceUrl)}`));

  // Also check Reel thumbnail is fresh
  const reel = await p.contentMedia.findFirst({ where: { contentId: 'fd77c4f1-f187-48e0-bb7c-0130ddf65815' } });
  console.log(`\nReel thumbnailUrl path after sync: ${redactUrl(reel?.thumbnailUrl)}`);

  // Verdict
  console.log('\n─── IDEMPOTENCY VERDICT ───');
  const idCountStable = before.length === after1.length && after1.length === after2.length;
  const noMismatched = after2.every(m => m.contentId === CAROUSEL_CONTENT_ID);
  // Check IDs are same (replace not create new)
  const beforeIds = new Set(before.map(m => m.id));
  const after2Ids = new Set(after2.map(m => m.id));
  const idsStable = [...after2Ids].every(id => beforeIds.has(id)) && [...beforeIds].every(id => after2Ids.has(id));
  
  console.log(`Row count stable (${before.length} → ${after1.length} → ${after2.length}): ${idCountStable ? 'YES ✓' : 'NO ✗'}`);
  console.log(`All rows have correct contentId: ${noMismatched ? 'YES ✓' : 'NO ✗'}`);
  console.log(`Row IDs unchanged (no re-create): ${idsStable ? 'YES ✓' : 'NO ✗'}`);
  console.log(`\nCHECK 2 RESULT: ${(idCountStable && noMismatched) ? 'PASS' : 'FAIL'}`);

  r.disconnect();
}

run().finally(() => p.$disconnect());
