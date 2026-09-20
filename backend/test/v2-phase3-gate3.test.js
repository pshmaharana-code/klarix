import { mock } from 'node:test';
import test from 'node:test';
import assert from 'node:assert/strict';

global.setInterval = () => {};

// Environment for test
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/klarix_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'a-test-secret-that-is-long-enough-for-production';
process.env.META_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Prisma Mock
let jobsInDb = [];
let outboxInDb = [];

await mock.module('@prisma/client', {
  exports: {
    PrismaClient: class MockPrismaClient {
      job = {
        findUnique: mock.fn(async ({ where }) => jobsInDb.find(j => j.id === where.id)),
        findFirst: mock.fn(async ({ where, include }) => {
          let j = jobsInDb.find(j => j.id === where.id && j.brandId === where.brandId);
          if (j && include && include.children) {
            j = { ...j, children: jobsInDb.filter(c => c.parentJobId === j.id) };
            if (include.children.include && include.children.include.children) {
              j.children = j.children.map(c => ({ ...c, children: jobsInDb.filter(gc => gc.parentJobId === c.id) }));
            }
          }
          return j;
        }),
        create: mock.fn(async ({ data }) => {
          const j = { id: `job-${Date.now()}-${Math.random()}`, ...data };
          jobsInDb.push(j);
          return j;
        }),
        findMany: mock.fn(async ({ where }) => {
          if (where.parentJobId) {
            if (where.parentJobId.in) {
              return jobsInDb.filter(j => where.parentJobId.in.includes(j.parentJobId));
            }
            return jobsInDb.filter(j => j.parentJobId === where.parentJobId);
          }
          return [];
        }),
        update: mock.fn(async ({ where, data }) => {
          const idx = jobsInDb.findIndex(j => j.id === where.id);
          if (idx >= 0) {
            jobsInDb[idx] = { ...jobsInDb[idx], ...data };
            return jobsInDb[idx];
          }
          throw new Error('Not found');
        })
      };
      jobOutbox = {
        findMany: mock.fn(async () => outboxInDb),
        updateMany: mock.fn(async () => ({ count: 1 })),
        update: mock.fn(async () => ({}))
      };
      $transaction = mock.fn(async (cb) => {
        return await cb(this);
      });
    }
  }
});

// Mock BullMQ Queue and Worker to inspect queue names
let addedJobs = [];
let queueNames = [];
let workerQueueName = null;

await mock.module('bullmq', {
  exports: {
    Queue: class {
      constructor(name) {
        queueNames.push(name);
        this.name = name;
      }
      async add(name, data, opts) {
        addedJobs.push({ queue: this.name, name, data, opts });
      }
      async close() {}
    },
    Worker: class {
      constructor(name) {
        workerQueueName = name;
      }
      on() {}
      async close() {}
    }
  }
});

// Import services after mocks
const { createAndEnqueueJob, getJobWithChildren, dispatchOutboxBatch } = await import('../jobs/jobService.js');
const { toPublicJob } = await import('../lib/publicJob.js');
const { updateSyncProgress } = await import('../jobs/syncProgressService.js');
// Worker import to trigger worker instantiation
await import('../worker.js');
// Also read files to search for klarix-jobs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');

// Helper to reset DB
function resetDb() {
  jobsInDb = [];
  outboxInDb = [];
  addedJobs = [];
}

// Parent ownership tests
test('1. Brand A cannot create a child under Brand B parent', async () => {
  resetDb();
  jobsInDb.push({ id: 'parent-b', brandId: 'brand-b', type: 'SYNC_ACCOUNT' });
  await assert.rejects(
    () => createAndEnqueueJob({ brandId: 'brand-a', type: 'IMPORT_CONTENT', parentJobId: 'parent-b' }),
    err => err.code === 'INVALID_PARENT'
  );
});

test('2. Brand A cannot retrieve Brand B parent', async () => {
  resetDb();
  jobsInDb.push({ id: 'parent-b', brandId: 'brand-b', type: 'SYNC_ACCOUNT' });
  const result = await getJobWithChildren('brand-a', 'parent-b');
  assert.equal(result, null);
});

test('3. Brand A cannot retrieve Brand B children', async () => {
  resetDb();
  jobsInDb.push({ id: 'child-b', brandId: 'brand-b', type: 'IMPORT_CONTENT' });
  const result = await getJobWithChildren('brand-a', 'child-b');
  assert.equal(result, null);
});

// DTO tests
test('4. Parent public DTO contains safe child summaries', async () => {
  resetDb();
  jobsInDb.push({ id: 'root', brandId: 'brand-a', type: 'SYNC_ACCOUNT', progressPercent: 10 });
  jobsInDb.push({ id: 'child1', brandId: 'brand-a', type: 'IMPORT_CONTENT', parentJobId: 'root', progressPercent: 20 });
  const job = await getJobWithChildren('brand-a', 'root');
  const dto = toPublicJob(job);
  assert.equal(dto.children.length, 1);
  assert.equal(dto.children[0].id, 'child1');
  assert.equal(dto.children[0].progressPercent, 20);
});

test('5. Nested children contain no input', async () => {
  resetDb();
  jobsInDb.push({ id: 'root', brandId: 'brand-a', type: 'SYNC_ACCOUNT' });
  jobsInDb.push({ id: 'child1', brandId: 'brand-a', type: 'IMPORT_CONTENT', parentJobId: 'root', input: { sensitive: 'data' } });
  const job = await getJobWithChildren('brand-a', 'root');
  const dto = toPublicJob(job);
  assert.equal(dto.children[0].input, undefined);
});

test('6. Nested children contain no idempotencyKey', async () => {
  resetDb();
  jobsInDb.push({ id: 'root', brandId: 'brand-a', type: 'SYNC_ACCOUNT' });
  jobsInDb.push({ id: 'child1', brandId: 'brand-a', type: 'IMPORT_CONTENT', parentJobId: 'root', idempotencyKey: 'secret' });
  const job = await getJobWithChildren('brand-a', 'root');
  const dto = toPublicJob(job);
  assert.equal(dto.children[0].idempotencyKey, undefined);
});

test('7. Nested children contain no credentials', async () => {
  resetDb();
  jobsInDb.push({ id: 'root', brandId: 'brand-a', type: 'SYNC_ACCOUNT' });
  jobsInDb.push({ id: 'child1', brandId: 'brand-a', type: 'IMPORT_CONTENT', parentJobId: 'root', input: { credentialId: 'c1' } });
  const job = await getJobWithChildren('brand-a', 'root');
  const dto = toPublicJob(job);
  assert.equal(dto.children[0].input, undefined);
  assert.equal(JSON.stringify(dto.children[0]).includes('credential'), false);
});

test('8. Nested children contain no raw internal errors', async () => {
  resetDb();
  jobsInDb.push({ id: 'root', brandId: 'brand-a', type: 'SYNC_ACCOUNT' });
  jobsInDb.push({ id: 'child1', brandId: 'brand-a', type: 'IMPORT_CONTENT', parentJobId: 'root', state: 'FAILED', error: { message: 'db timeout', code: 'P2024' } });
  const job = await getJobWithChildren('brand-a', 'root');
  const dto = toPublicJob(job);
  assert.equal(dto.children[0].error.code, 'PROCESSING_FAILED');
  assert.equal(dto.children[0].error.message, undefined);
});

// Hierarchy tests
test('9. Valid SYNC_ACCOUNT -> IMPORT_CONTENT accepted', async () => {
  resetDb();
  jobsInDb.push({ id: 'root', brandId: 'b', type: 'SYNC_ACCOUNT' });
  const job = await createAndEnqueueJob({ brandId: 'b', type: 'IMPORT_CONTENT', parentJobId: 'root' });
  assert.equal(job.parentJobId, 'root');
});

test('10. Valid IMPORT_CONTENT -> FETCH_METRICS accepted', async () => {
  resetDb();
  jobsInDb.push({ id: 'parent', brandId: 'b', type: 'IMPORT_CONTENT' });
  const job = await createAndEnqueueJob({ brandId: 'b', type: 'FETCH_METRICS', parentJobId: 'parent' });
  assert.equal(job.parentJobId, 'parent');
});

test('11. Invalid job-type parent relationship rejected', async () => {
  resetDb();
  jobsInDb.push({ id: 'root', brandId: 'b', type: 'SYNC_ACCOUNT' });
  await assert.rejects(
    () => createAndEnqueueJob({ brandId: 'b', type: 'FETCH_METRICS', parentJobId: 'root' }),
    err => err.code === 'INVALID_HIERARCHY'
  );
});

// Progress tests
test('12. Active grandchild keeps root PROCESSING', async () => {
  resetDb();
  jobsInDb.push({ id: 'root', brandId: 'b', type: 'SYNC_ACCOUNT', state: 'PROCESSING', progressPercent: 10, totalCount: 1 });
  jobsInDb.push({ id: 'child1', parentJobId: 'root', brandId: 'b', type: 'IMPORT_CONTENT', state: 'COMPLETED' });
  jobsInDb.push({ id: 'gc1', parentJobId: 'child1', brandId: 'b', type: 'FETCH_METRICS', state: 'PROCESSING' });
  const updated = await updateSyncProgress('root');
  assert.equal(updated.state, 'PROCESSING');
  assert.equal(updated.progressPercent, 10); // Capped at previous value since 0/1 complete
});

test('13. All descendants completed -> root COMPLETED', async () => {
  resetDb();
  jobsInDb.push({ id: 'root', brandId: 'b', type: 'SYNC_ACCOUNT', state: 'PROCESSING', progressPercent: 10, totalCount: 1 });
  jobsInDb.push({ id: 'child1', parentJobId: 'root', brandId: 'b', type: 'IMPORT_CONTENT', state: 'COMPLETED' });
  jobsInDb.push({ id: 'gc1', parentJobId: 'child1', brandId: 'b', type: 'FETCH_METRICS', state: 'COMPLETED' });
  const updated = await updateSyncProgress('root');
  assert.equal(updated.state, 'COMPLETED');
  assert.equal(updated.progressPercent, 100);
});

test('14. All descendants terminal with a failure -> root PARTIAL', async () => {
  resetDb();
  jobsInDb.push({ id: 'root', brandId: 'b', type: 'SYNC_ACCOUNT', state: 'PROCESSING', progressPercent: 10, totalCount: 2 });
  jobsInDb.push({ id: 'c1', parentJobId: 'root', brandId: 'b', type: 'IMPORT_CONTENT', state: 'COMPLETED' });
  jobsInDb.push({ id: 'gc1', parentJobId: 'c1', brandId: 'b', type: 'FETCH_METRICS', state: 'COMPLETED' });
  jobsInDb.push({ id: 'c2', parentJobId: 'root', brandId: 'b', type: 'IMPORT_CONTENT', state: 'COMPLETED' });
  jobsInDb.push({ id: 'gc2', parentJobId: 'c2', brandId: 'b', type: 'FETCH_METRICS', state: 'FAILED' });
  const updated = await updateSyncProgress('root');
  assert.equal(updated.state, 'PARTIAL');
  assert.equal(updated.progressPercent, 100); // Terminal -> 100%
  assert.equal(updated.processedCount, 2); // Both are terminal, so both are 'processed'
});

test('15. Zero total does not divide by zero', async () => {
  resetDb();
  jobsInDb.push({ id: 'root', brandId: 'b', type: 'SYNC_ACCOUNT', state: 'PROCESSING', progressPercent: 10, totalCount: 0 });
  const updated = await updateSyncProgress('root');
  assert.equal(updated.progressPercent, 100);
  assert.equal(updated.state, 'COMPLETED');
});

test('16. Progress cannot regress', async () => {
  resetDb();
  jobsInDb.push({ id: 'root', brandId: 'b', type: 'SYNC_ACCOUNT', state: 'PROCESSING', progressPercent: 60, totalCount: 10 });
  jobsInDb.push({ id: 'c1', parentJobId: 'root', brandId: 'b', type: 'IMPORT_CONTENT', state: 'COMPLETED' });
  // only 1 out of 10 done = 10%. But existing progress is 60%. Should not regress.
  const updated = await updateSyncProgress('root');
  assert.equal(updated.progressPercent, 60);
});

// Queue tests
test('17. Queue producer uses klarix-sync', async () => {
  assert.ok(queueNames.includes('klarix-sync'));
});

test('18. Worker uses klarix-sync', async () => {
  assert.equal(workerQueueName, 'klarix-sync');
});

test('19. Outbox dispatch uses klarix-sync', async () => {
  resetDb();
  jobsInDb.push({ id: 'j1', brandId: 'b', type: 'SYNC_ACCOUNT', state: 'CREATED' });
  outboxInDb.push({ id: 'o1', jobId: 'j1', deliveredAt: null });
  await dispatchOutboxBatch(1);
  assert.equal(addedJobs.length, 1);
  assert.equal(addedJobs[0].queue, 'klarix-sync');
});

test('20. No runtime reference to klarix-jobs remains', async () => {
  function searchDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f === 'node_modules' || f.startsWith('.') || f === 'generated' || f === 'test_reel_ingestion.js' || f === 'package-lock.json') continue;
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        searchDir(fullPath);
      } else if (f.endsWith('.js') || f.endsWith('.json') || f.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        // ignore this test file itself, since we have 'klarix-jobs' as a string in the test title
        if (f !== 'v2-phase3-gate3.test.js') {
          assert.equal(content.includes('klarix-jobs'), false, `Found klarix-jobs in ${f}`);
        }
      }
    }
  }
  searchDir(backendDir);
});
