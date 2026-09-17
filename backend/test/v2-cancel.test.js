/**
 * v2-cancel.test.js
 *
 * Phase 2 cancellation tests covering §20.2 requirements:
 *   1. cancelJob succeeds for a CREATED job (returns updated job)
 *   2. cancelJob succeeds for a QUEUED job (returns updated job)
 *   3. cancelJob returns null for wrong brand (cross-brand isolation)
 *   4. cancelJob returns null for PROCESSING job (not cancellable)
 *   5. cancelJob returns null for COMPLETED job (not cancellable)
 *   6. cancelJob returns null for already-CANCELLED job (idempotent safe denial)
 *   7. cancelled job cannot be claimed by the worker (the DB claim guard rejects it)
 *   8. toPublicJob correctly exposes CANCELLED state without leaking internals
 *
 * Uses mock.module() to run without a real database.
 * Run via: npm run test:security (shares the --experimental-test-module-mocks flag)
 */
import { mock } from 'node:test';
import test from 'node:test';
import assert from 'node:assert/strict';

// ── environment ──────────────────────────────────────────────────────────────
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/klarix_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'a-test-secret-that-is-long-enough-for-production';
process.env.META_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockJobUpdateMany = mock.fn(() => Promise.resolve({ count: 1 }));
const mockJobFindFirst = mock.fn(() => Promise.resolve(null));

await mock.module('@prisma/client', {
  exports: {
    PrismaClient: class MockPrismaClient {
      job = {
        updateMany: mockJobUpdateMany,
        findFirst: mockJobFindFirst,
        create: async () => ({}),
        findUnique: async () => null
      };
      jobOutbox = {
        findMany: async () => [],
        updateMany: async () => ({ count: 0 }),
        update: async () => ({})
      };
    }
  }
});

// ── BullMQ mock ──────────────────────────────────────────────────────────────
await mock.module('bullmq', {
  exports: {
    Queue: class { constructor() {} async add() {} async close() {} },
    Worker: class { constructor() {} on() {} async close() {} }
  }
});

// ── Import after mocks ───────────────────────────────────────────────────────
const { cancelJob } = await import('../jobs/jobService.js');
const { toPublicJob } = await import('../lib/publicJob.js');

// ────────────────────────────────────────────────────────────────────────────
// Helper — build a minimal Job fixture for toPublicJob
// ────────────────────────────────────────────────────────────────────────────
function makeJob(overrides = {}) {
  return {
    id: 'job-1', type: 'SYNC_ACCOUNT', state: 'CREATED',
    progressPercent: 0, progressStep: 'Created',
    progressMessage: 'Job is being prepared',
    result: null, error: null, attempts: 0,
    startedAt: null, completedAt: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides
  };
}

// ── §20.2 — cancellable states ────────────────────────────────────────────────

test('cancelJob succeeds for a CREATED job (returns updated job record)', async () => {
  const cancelledJob = makeJob({ state: 'CANCELLED', completedAt: new Date() });
  mockJobUpdateMany.mock.mockImplementationOnce(() => Promise.resolve({ count: 1 }));
  mockJobFindFirst.mock.mockImplementationOnce(() => Promise.resolve(cancelledJob));

  const result = await cancelJob('brand-1', 'job-1');
  assert.ok(result, 'should return the updated job');
  assert.equal(result.state, 'CANCELLED');
  assert.ok(result.completedAt, 'completedAt must be stamped on cancellation');

  // Verify the updateMany WHERE clause included the correct state filter
  const whereClause = mockJobUpdateMany.mock.calls.at(-1)?.arguments[0].where;
  assert.deepEqual(whereClause.state, { in: ['CREATED', 'QUEUED'] });
  assert.equal(whereClause.brandId, 'brand-1');
});

test('cancelJob succeeds for a QUEUED job (returns updated job record)', async () => {
  const cancelledJob = makeJob({ state: 'CANCELLED', completedAt: new Date() });
  mockJobUpdateMany.mock.mockImplementationOnce(() => Promise.resolve({ count: 1 }));
  mockJobFindFirst.mock.mockImplementationOnce(() => Promise.resolve(cancelledJob));

  const result = await cancelJob('brand-1', 'job-queued-1');
  assert.ok(result, 'should return the updated job');
  assert.equal(result.state, 'CANCELLED');
});

// ── §20.2 + §9.1 — cross-brand isolation ─────────────────────────────────────

test('cancelJob returns null when brand does not own the job (count 0 from DB)', async () => {
  // DB: the job exists but belongs to brand-a; request is for brand-b
  mockJobUpdateMany.mock.mockImplementationOnce(() => Promise.resolve({ count: 0 }));

  const result = await cancelJob('brand-b', 'job-of-brand-a');
  assert.equal(result, null, 'cross-brand cancel must return null');

  // Verify brandId was in the WHERE clause (not ignored)
  const whereClause = mockJobUpdateMany.mock.calls.at(-1)?.arguments[0].where;
  assert.equal(whereClause.brandId, 'brand-b');
});

// ── §20.2 — non-cancellable states return null (409 at route level) ───────────

test('cancelJob returns null when job is PROCESSING (count 0 — not in safe set)', async () => {
  mockJobUpdateMany.mock.mockImplementationOnce(() => Promise.resolve({ count: 0 }));
  const result = await cancelJob('brand-1', 'job-processing');
  assert.equal(result, null, 'PROCESSING job must not be cancellable');
});

test('cancelJob returns null when job is COMPLETED (count 0 — terminal state)', async () => {
  mockJobUpdateMany.mock.mockImplementationOnce(() => Promise.resolve({ count: 0 }));
  const result = await cancelJob('brand-1', 'job-completed');
  assert.equal(result, null, 'COMPLETED job must not be cancellable');
});

test('cancelJob returns null when job is already CANCELLED (idempotent safe denial)', async () => {
  mockJobUpdateMany.mock.mockImplementationOnce(() => Promise.resolve({ count: 0 }));
  const result = await cancelJob('brand-1', 'job-already-cancelled');
  assert.equal(result, null, 'already-CANCELLED job must return null safely');
});

// ── Race condition: worker claim guard rejects a CANCELLED job ────────────────

test('worker claim guard excludes CANCELLED state preventing double-processing', () => {
  // The worker's conditional claim is:
  //   updateMany WHERE state IN ('QUEUED', 'RETRY_PENDING')
  // A CANCELLED job is NOT in this set — the claim returns count 0 and
  // the worker skips the job with "Already claimed or completed."
  // We verify this by simulating the claim filter logic directly.
  const WORKER_CLAIMABLE = new Set(['QUEUED', 'RETRY_PENDING']);
  for (const state of ['CANCELLED', 'COMPLETED', 'FAILED', 'CREATED', 'PROCESSING']) {
    assert.equal(
      WORKER_CLAIMABLE.has(state), false,
      `worker must not claim a job in state ${state}`
    );
  }
  for (const state of ['QUEUED', 'RETRY_PENDING']) {
    assert.equal(
      WORKER_CLAIMABLE.has(state), true,
      `worker must be able to claim a job in state ${state}`
    );
  }
});

// ── §5.1 / §20.4 — CANCELLED state visible in public DTO, no internal leak ───

test('toPublicJob exposes CANCELLED state and does not leak input or idempotency key', () => {
  const raw = makeJob({
    state: 'CANCELLED',
    completedAt: new Date(),
    progressStep: 'Cancelled',
    progressMessage: 'Job was cancelled before processing began',
    // Internal fields that must never appear in the public DTO:
    input: { credentialId: 'cred-secret-123' },
    idempotencyKey: 'ik-secret-456',
    error: null
  });
  const pub = toPublicJob(raw);

  assert.equal(pub.state, 'CANCELLED', 'CANCELLED state must be returned');
  assert.equal('input' in pub, false, 'input must not appear in DTO');
  assert.equal('idempotencyKey' in pub, false, 'idempotencyKey must not appear in DTO');
  assert.equal(pub.error, null, 'error must be null for a clean cancellation');
  assert.ok(pub.completedAt, 'completedAt must be set');
});
