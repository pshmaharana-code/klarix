import { mock } from 'node:test';
import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

global.setInterval = () => {};

process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/klarix_test?schema=public';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'a-test-secret-that-is-long-enough-for-production';
process.env.META_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Mock BullMQ
const queuedJobs = [];
let workerCallback = null;

await mock.module('bullmq', {
  exports: {
    Queue: class {
      constructor(name) {}
      async add(name, data, opts) {
        queuedJobs.push({ name, data, opts });
      }
      async close() {}
    },
    Worker: class {
      constructor(name, cb) {
        workerCallback = cb;
      }
      on() {}
      async close() {}
    }
  }
});

const prisma = new PrismaClient();
const { createAndEnqueueJob, dispatchOutboxBatch } = await import('../jobs/jobService.js');
const { getJobWithChildren } = await import('../jobs/jobService.js'); // Actually wait, getJobWithChildren is there
const cryptoLib = await import('../lib/crypto.js');
await import('../worker.js'); // Triggers worker setup

// Process all jobs currently in outbox/queue
async function processAllJobs() {
  let processedAny = true;
  while (processedAny) {
    processedAny = false;
    await dispatchOutboxBatch(100);
    while (queuedJobs.length > 0) {
      const qj = queuedJobs.shift();
      const mockBullJob = {
        id: `bull-${Date.now()}`,
        data: qj.data,
        attemptsMade: 0,
        opts: { attempts: 3 }
      };
      await workerCallback(mockBullJob);
      processedAny = true;
    }
  }
}

// Clean database
async function cleanDb() {
  await prisma.jobLog.deleteMany();
  await prisma.jobOutbox.deleteMany();
  await prisma.job.deleteMany();
  await prisma.contentMetricSnapshot.deleteMany();
  await prisma.contentMedia.deleteMany();
  await prisma.content.deleteMany();
  await prisma.socialAccount.deleteMany();
  await prisma.oAuthCredential.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.user.deleteMany();
}

test('Gate 4 E2E Content Ingestion', async (t) => {
  try {
    await cleanDb();

  const ownerUserId = 'user-e2e';
  await prisma.user.create({
    data: { id: ownerUserId, email: 'e2e@example.com', password: 'hash' }
  });

  const brandId = 'brand-e2e-test';
  await prisma.brand.create({
    data: { id: brandId, ownerUserId, name: 'E2E Brand' }
  });

  // 1. Setup Credential
  const encryptedToken = cryptoLib.encrypt('mock_access_token_one');
  const cred = await prisma.oAuthCredential.create({
    data: {
      encryptedToken,
      expiresAt: new Date(Date.now() + 86400000)
    }
  });

  // 2. Enqueue SYNC_ACCOUNT
  const syncJob = await createAndEnqueueJob({
    brandId,
    type: 'SYNC_ACCOUNT',
    idempotencyKey: 'sync-1',
    input: { credentialId: cred.id }
  });

  // 3. Process all (SYNC_ACCOUNT -> IMPORT_CONTENT -> FETCH_METRICS)
  await processAllJobs();

  // 4. Verify Root Progress
  const rootJob = await prisma.job.findUnique({ where: { id: syncJob.id } });
  assert.equal(rootJob.state, 'COMPLETED');
  assert.equal(rootJob.progressPercent, 100);
  assert.equal(rootJob.totalCount > 0, true);
  assert.equal(rootJob.processedCount, rootJob.totalCount);

  // 5. Verify Content and Media
  const contents = await prisma.content.findMany({ where: { brandId } });
  assert.equal(contents.length, rootJob.totalCount);
  
  const medias = await prisma.contentMedia.findMany();
  assert.ok(medias.length > 0);

  // 6. Verify Metric Snapshots
  const snapshots = await prisma.contentMetricSnapshot.findMany();
  // some might not have metrics (e.g. image has no plays), but we expect snapshots to exist
  assert.equal(snapshots.length, contents.length);
  const totalSnapshots = snapshots.length;

  // 7. Idempotency Test
  // Create another credential (since it's deleted after use)
  const cred2 = await prisma.oAuthCredential.create({
    data: { encryptedToken, expiresAt: new Date(Date.now() + 86400000) }
  });
  
  const syncJob2 = await createAndEnqueueJob({
    brandId,
    type: 'SYNC_ACCOUNT',
    idempotencyKey: 'sync-2',
    input: { credentialId: cred2.id }
  });

  await processAllJobs();

  const rootJob2 = await prisma.job.findUnique({ where: { id: syncJob2.id } });
  assert.equal(rootJob2.state, 'COMPLETED');

  // Verify counts didn't duplicate
  const contentsAfter = await prisma.content.findMany({ where: { brandId } });
  assert.equal(contentsAfter.length, contents.length); // no duplicates

  const snapshotsAfter = await prisma.contentMetricSnapshot.findMany();
  assert.equal(snapshotsAfter.length, totalSnapshots); // no new snapshots because IMPORT_CONTENT is idempotent across syncs

  // 8. Partial failure Test
  // Create a credential
  const cred3 = await prisma.oAuthCredential.create({
    data: { encryptedToken, expiresAt: new Date(Date.now() + 86400000) }
  });

  const syncJob3 = await createAndEnqueueJob({
    brandId,
    type: 'SYNC_ACCOUNT',
    idempotencyKey: 'sync-3',
    input: { credentialId: cred3.id }
  });
  
  // To simulate partial failure, we intercept the worker callback for one specific IMPORT_CONTENT
  let intercepted = false;
  const originalCb = workerCallback;
  workerCallback = async (job) => {
    if (!intercepted && job.data.input.item && job.data.input.item.id) {
      intercepted = true;
      // Fail this IMPORT_CONTENT intentionally
      throw new Error('Simulated failure');
    }
    return originalCb(job);
  };
  
  // A failing job will retry, but for the test let's say opts.attempts = 1
  await dispatchOutboxBatch(100);
  while (queuedJobs.length > 0) {
    const qj = queuedJobs.shift();
    const mockBullJob = {
      id: `bull-${Date.now()}`,
      data: qj.data,
      attemptsMade: 0,
      opts: { attempts: 1 } // ensure no retries for fast test
    };
    try {
      await workerCallback(mockBullJob);
    } catch (e) {
      // expected for intercepted
    }
  }
  // Process the rest normally
  workerCallback = originalCb;
  await processAllJobs();

  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
});
