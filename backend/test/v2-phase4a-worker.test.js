import { mock } from 'node:test';
import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

global.setInterval = () => {};

process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/klarix_test?schema=public';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'a-test-secret-that-is-long-enough-for-production';
process.env.META_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

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
const cryptoLib = await import('../lib/crypto.js');
await import('../worker.js'); // Triggers worker setup

async function cleanDb() {
  await prisma.jobLog.deleteMany();
  await prisma.jobOutbox.deleteMany();
  await prisma.job.deleteMany();
  await prisma.socialAccountMetricSnapshot.deleteMany();
  await prisma.contentMetricSnapshot.deleteMany();
  await prisma.contentMedia.deleteMany();
  await prisma.content.deleteMany();
  await prisma.socialAccount.deleteMany();
  await prisma.oAuthCredential.deleteMany();
  await prisma.brandMember.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.user.deleteMany();
}

test('Phase 4A: Worker FETCH_ACCOUNT_METRICS E2E', async (t) => {
  try {
    await cleanDb();

    const ownerUserId = 'user-e2e';
    await prisma.user.create({ data: { id: ownerUserId, email: 'e2e@example.com', password: 'hash' } });

    const brandId = 'brand-e2e-test';
    await prisma.brand.create({ data: { id: brandId, ownerUserId, name: 'E2E Brand' } });

    const encryptedToken = cryptoLib.encrypt('mock_access_token_one');
    const cred = await prisma.oAuthCredential.create({
      data: { encryptedToken, expiresAt: new Date(Date.now() + 86400000) }
    });

    const processJobsWithCb = async (cb) => {
      let processedAny = true;
      while (processedAny) {
        processedAny = false;
        await dispatchOutboxBatch(100);
        while (queuedJobs.length > 0) {
          const qj = queuedJobs.shift();
          const mockBullJob = {
            id: `bull-${Date.now()}-${Math.random()}`,
            data: qj.data,
            attemptsMade: 0,
            opts: { attempts: 1 }
          };
          await cb(mockBullJob);
          processedAny = true;
        }
      }
    };

    // 1. Initial Sync
    const syncJob1 = await createAndEnqueueJob({
      brandId,
      type: 'SYNC_ACCOUNT',
      idempotencyKey: 'sync-1',
      input: { credentialId: cred.id }
    });

    await processJobsWithCb(workerCallback);

    const rootJobAfter1 = await prisma.job.findUnique({ where: { id: syncJob1.id } });
    assert.equal(rootJobAfter1.state, 'COMPLETED');
    assert.equal(rootJobAfter1.progressPercent, 100);

    // Verify correct orchestration/dispatch of child jobs
    const childJobs = await prisma.job.findMany({ where: { parentJobId: syncJob1.id } });
    const importJobs = childJobs.filter(j => j.type === 'IMPORT_CONTENT');
    const metricJobs = childJobs.filter(j => j.type === 'FETCH_ACCOUNT_METRICS');
    
    assert.ok(importJobs.length > 0, 'SYNC_ACCOUNT should dispatch IMPORT_CONTENT');
    assert.ok(metricJobs.length === 1, 'SYNC_ACCOUNT should dispatch exactly one FETCH_ACCOUNT_METRICS');
    
    assert.equal(rootJobAfter1.totalCount, childJobs.length, 'totalCount on root job must match number of dispatched children');

    const snapshots = await prisma.socialAccountMetricSnapshot.findMany();
    assert.ok(snapshots.length > 0, 'Should have persisted account metric snapshots');

    // reach/day non-breakdown
    const reachDay = snapshots.find(s => s.metricName === 'reach' && s.period === 'day' && s.breakdownDefinition === 'none');
    assert.ok(reachDay, 'reach/day should be persisted');
    assert.equal(reachDay.value, 100);
    assert.equal(reachDay.endTime.toISOString(), '2026-09-24T07:00:00.000Z');

    // reach/day breakdown — verify dimension_values survive normalisation
    const reachBreakdown = snapshots.find(s => s.breakdownDefinition === 'media_product_type');
    assert.ok(reachBreakdown, 'breakdown row should be persisted');
    assert.equal(reachBreakdown.breakdowns[0].dimension_keys[0], 'media_product_type');
    assert.equal(reachBreakdown.breakdowns[0].results.length, 2, 'fixture provides two breakdown results');
    assert.deepStrictEqual(reachBreakdown.breakdowns[0].results[0].dimension_values, ['REELS']);
    assert.deepStrictEqual(reachBreakdown.breakdowns[0].results[1].dimension_values, ['POST']);

    // Verify token safety (no token in input, output, or logs)
    const logs = await prisma.jobLog.findMany();
    const leakedLogs = logs.filter(l => JSON.stringify(l).includes('mock_access_token_one'));
    assert.equal(leakedLogs.length, 0, 'Plaintext token leaked in logs');

    const allJobs = await prisma.job.findMany();
    const leakedInputs = allJobs.filter(j => JSON.stringify(j.input).includes('mock_access_token_one'));
    assert.equal(leakedInputs.length, 0, 'Plaintext token leaked in job inputs');

    // 2. Second Sync (Idempotency)
    const syncJob2 = await createAndEnqueueJob({
      brandId,
      type: 'SYNC_ACCOUNT',
      idempotencyKey: 'sync-2',
      input: { credentialId: cred.id }
    });

    await processJobsWithCb(workerCallback);

    const snapshots2 = await prisma.socialAccountMetricSnapshot.findMany();
    assert.equal(snapshots2.length, snapshots.length, 'Idempotency: no duplicate snapshots should be created for the same observed period');

  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
});
