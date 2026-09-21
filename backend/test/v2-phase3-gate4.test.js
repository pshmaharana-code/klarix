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
const { createAndEnqueueJob, cancelJob, dispatchOutboxBatch } = await import('../jobs/jobService.js');
const cryptoLib = await import('../lib/crypto.js');
await import('../worker.js'); // Triggers worker setup

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
  await prisma.brandMember.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.user.deleteMany();
}

test('Gate 4 E2E Corrections', async (t) => {
  try {
    await cleanDb();

    const ownerUserId = 'user-e2e';
    await prisma.user.create({ data: { id: ownerUserId, email: 'e2e@example.com', password: 'hash' } });

    const brandId = 'brand-e2e-test';
    await prisma.brand.create({ data: { id: brandId, ownerUserId, name: 'E2E Brand' } });

    // 1. Setup Credential
    const encryptedToken = cryptoLib.encrypt('mock_access_token_one');
    const cred = await prisma.oAuthCredential.create({
      data: { encryptedToken, expiresAt: new Date(Date.now() + 86400000) }
    });

    // Helper to process queue
    const originalCb = workerCallback;
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

    // 2. Deep descendant progress test
    const syncJob1 = await createAndEnqueueJob({
      brandId,
      type: 'SYNC_ACCOUNT',
      idempotencyKey: 'sync-1',
      input: { credentialId: cred.id }
    });

    let interceptedMetrics = false;
    let rootStateDuringMetrics = null;
    let rootProgressDuringMetrics = 0;

    await processJobsWithCb(async (job) => {
      const dbJob = await prisma.job.findUnique({ where: { id: job.data.jobId } });
      if (dbJob && dbJob.type === 'FETCH_METRICS' && !interceptedMetrics) {
        interceptedMetrics = true;
        const rootJob = await prisma.job.findUnique({ where: { id: syncJob1.id } });
        rootStateDuringMetrics = rootJob.state;
        rootProgressDuringMetrics = rootJob.progressPercent;
      }
      return originalCb(job);
    });

    assert.equal(interceptedMetrics, true, 'FETCH_METRICS should have been executed');
    assert.equal(rootStateDuringMetrics, 'PROCESSING', 'Root must remain PROCESSING while FETCH_METRICS is active');
    assert.ok(rootProgressDuringMetrics < 100, 'Root progress must not be 100% while descendants are active');

    const rootJobAfter1 = await prisma.job.findUnique({ where: { id: syncJob1.id } });
    assert.equal(rootJobAfter1.state, 'COMPLETED', 'Root must become COMPLETED after all descendants finish');
    assert.equal(rootJobAfter1.progressPercent, 100, 'Root progress must reach 100% after all descendants finish');

    // Token retention test (CRITICAL)
    const credAfter1 = await prisma.oAuthCredential.findUnique({ where: { id: cred.id } });
    assert.ok(credAfter1, 'OAuthCredential must NOT be deleted after sync');
    assert.equal(credAfter1.encryptedToken, encryptedToken, 'OAuth credential token must remain unchanged');

    // Verify token safety (no token in input, output, or logs)
    const logs = await prisma.jobLog.findMany();
    const leakedLogs = logs.filter(l => JSON.stringify(l).includes('mock_access_token_one'));
    assert.equal(leakedLogs.length, 0, 'Plaintext token leaked in logs');

    const allJobs = await prisma.job.findMany();
    const leakedInputs = allJobs.filter(j => JSON.stringify(j.input).includes('mock_access_token_one'));
    assert.equal(leakedInputs.length, 0, 'Plaintext token leaked in job inputs');

    // 3. Test multiple sync executions
    const contentsAfter1 = await prisma.content.findMany({ where: { brandId } });
    const snapshotsAfter1 = await prisma.contentMetricSnapshot.findMany();
    const mediaAfter1 = await prisma.contentMedia.findMany();

    const syncJob2 = await createAndEnqueueJob({
      brandId,
      type: 'SYNC_ACCOUNT',
      idempotencyKey: 'sync-2',
      input: { credentialId: cred.id }
    });

    await processJobsWithCb(originalCb);

    const contentsAfter2 = await prisma.content.findMany({ where: { brandId } });
    assert.equal(contentsAfter2.length, contentsAfter1.length, 'No duplicate content rows should be created');

    const mediaAfter2 = await prisma.contentMedia.findMany();
    assert.equal(mediaAfter2.length, mediaAfter1.length, 'No duplicate media rows should be created');

    const snapshotsAfter2 = await prisma.contentMetricSnapshot.findMany();
    assert.equal(snapshotsAfter2.length, snapshotsAfter1.length * 2, 'Second sync must create a second set of snapshots');

    // Verify snapshots have the correct syncJobId idempotency key logic
    const sync2MetricsIds = (await prisma.job.findMany({ where: { parentJobId: syncJob2.id } })).map(j => j.id);
    const fetchJobs = await prisma.job.findMany({ where: { type: 'FETCH_METRICS', parentJobId: { in: sync2MetricsIds } } });
    assert.ok(fetchJobs.length > 0);
    assert.ok(fetchJobs[0].idempotencyKey.endsWith(`:${syncJob2.id}`), 'Metric idempotency key must contain syncJobId');

    // 4. Test cancellation
    const syncJob3 = await createAndEnqueueJob({
      brandId,
      type: 'SYNC_ACCOUNT',
      idempotencyKey: 'sync-3',
      input: { credentialId: cred.id }
    });

    await dispatchOutboxBatch(100);
    // Find the SYNC_ACCOUNT job in queue and run it manually
    const sync3QueueJobIndex = queuedJobs.findIndex(q => q.data.jobId === syncJob3.id);
    const [sync3QueueJob] = queuedJobs.splice(sync3QueueJobIndex, 1);
    
    await originalCb({ id: 'bull-cancel', data: sync3QueueJob.data, attemptsMade: 0, opts: {} });
    await dispatchOutboxBatch(100);

    // This spawned IMPORT_CONTENT jobs. Cancel one of them!
    const imports = await prisma.job.findMany({ where: { parentJobId: syncJob3.id, state: 'QUEUED' } });
    const importToCancel = imports[0];
    
    const cancelledJob = await cancelJob(brandId, importToCancel.id);
    assert.equal(cancelledJob.state, 'CANCELLED', 'Job must successfully transition to CANCELLED');

    // Remove cancelled job from queuedJobs so the mock worker doesn't throw
    const cancelQIndex = queuedJobs.findIndex(q => q.data.jobId === importToCancel.id);
    if (cancelQIndex >= 0) queuedJobs.splice(cancelQIndex, 1);
    
    // Process the rest normally
    await processJobsWithCb(originalCb);

    const rootJob3 = await prisma.job.findUnique({ where: { id: syncJob3.id } });
    assert.equal(rootJob3.state, 'PARTIAL', 'Root must become PARTIAL if a required descendant is cancelled');
    // For partial states, progress should still be 100% per syncProgressService design for terminal states
    assert.equal(rootJob3.progressPercent, 100, 'Root progress must reach 100% when terminal, even if PARTIAL');

  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
});
