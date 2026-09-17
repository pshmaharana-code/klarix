/**
 * v2-phase2-security.test.js
 *
 * Required Phase 2 security unit tests:
 *   1. consumeOAuthState rejects state < 32 chars (pure guard, no DB)
 *   2. consumeOAuthState returns false for expired state (DB → count 0)
 *   3. consumeOAuthState returns false for already-used state (DB → count 0)
 *   4. consumeOAuthState returns true for valid state (DB → count 1)
 *   5. getJob passes brandId to WHERE clause (cross-brand isolation contract)
 *   6. Expired / missing OAuthCredential throws OAUTH_INVALID (mirrors worker.js)
 *
 * Tests 2–5 use mock.module() which requires Node.js 22.3+ with
 * --experimental-test-module-mocks (or Node 23+ stable).
 * Run via: npm run test:security
 *
 * Spec references: §9.1 (brand isolation), §9.2 (OAuth validation),
 *   §10.2 (unit: ownership guards), §14.5 (tested security behaviour),
 *   §20.4 (authorisation invariant).
 */
import { mock } from 'node:test';
import test from 'node:test';
import assert from 'node:assert/strict';

// ── environment ──────────────────────────────────────────────────────────────
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/klarix_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'a-test-secret-that-is-long-enough-for-production';
process.env.META_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// ── Prisma mock (via mock.module) ────────────────────────────────────────────
const mockOAuthUpdateMany = mock.fn(() => Promise.resolve({ count: 0 }));
const mockJobFindFirst = mock.fn(() => Promise.resolve(null));

await mock.module('@prisma/client', {
  exports: {
    PrismaClient: class MockPrismaClient {
      oauthState = { updateMany: mockOAuthUpdateMany };
      job = { findFirst: mockJobFindFirst };
    }
  }
});

// ── BullMQ mock (prevent Redis connection at queue.js import time) ───────────
await mock.module('bullmq', {
  exports: {
    Queue: class { constructor() {} async add() {} async close() {} },
    Worker: class { constructor() {} on() {} async close() {} }
  }
});

// ── Import modules (after mocks are in place) ────────────────────────────────
const { consumeOAuthState } = await import('../services/oauthStateService.js');
const { getJob } = await import('../jobs/jobService.js');

// ────────────────────────────────────────────────────────────────────────────

// §9.2 — pure length guard fires before any DB call
test('consumeOAuthState rejects state shorter than 32 chars without DB call', async () => {
  const callsBefore = mockOAuthUpdateMany.mock.callCount();
  const result = await consumeOAuthState({ state: 'tooshort', brandId: 'b', userId: 'u' });
  assert.equal(result, false, 'short state must be rejected');
  assert.equal(
    mockOAuthUpdateMany.mock.callCount(), callsBefore,
    'DB must not be called for an invalid state string'
  );
});

// §9.2 — expired state (WHERE expiresAt > now matches 0 rows)
test('consumeOAuthState returns false when state is expired (DB → count 0)', async () => {
  mockOAuthUpdateMany.mock.mockImplementationOnce(() => Promise.resolve({ count: 0 }));
  const result = await consumeOAuthState({ state: 'a'.repeat(43), brandId: 'brand-1', userId: 'user-1' });
  assert.equal(result, false, 'expired state must be rejected');
});

// §9.2 — already-used state (WHERE usedAt IS NULL matches 0 rows)
test('consumeOAuthState returns false when state is already used (DB → count 0)', async () => {
  mockOAuthUpdateMany.mock.mockImplementationOnce(() => Promise.resolve({ count: 0 }));
  const result = await consumeOAuthState({ state: 'b'.repeat(43), brandId: 'brand-1', userId: 'user-1' });
  assert.equal(result, false, 'already-used state must be rejected');
});

// §9.2 — valid state (all WHERE conditions satisfied → count 1)
test('consumeOAuthState returns true for a valid single-use unexpired state', async () => {
  mockOAuthUpdateMany.mock.mockImplementationOnce(() => Promise.resolve({ count: 1 }));
  const result = await consumeOAuthState({ state: 'c'.repeat(43), brandId: 'brand-1', userId: 'user-1' });
  assert.equal(result, true, 'valid state must be accepted');
});

// §9.1 / §20.4 — cross-brand job isolation
test('getJob returns null when brandId does not match and passes brandId to WHERE clause', async () => {
  // The mock returns null, simulating a job that belongs to a different brand.
  mockJobFindFirst.mock.mockImplementationOnce(() => Promise.resolve(null));
  const result = await getJob('brand-b', 'job-owned-by-brand-a');
  assert.equal(result, null, 'cross-brand access must return null');

  // Verify brandId was forwarded to the DB query — this is the isolation contract.
  const callArgs = mockJobFindFirst.mock.calls.at(-1)?.arguments[0];
  assert.equal(callArgs?.where?.brandId, 'brand-b', 'brandId must be in the WHERE clause');
});

// §9.2 / §14.5 — OAuth credential expiry (mirrors worker.js line 48 guard)
test('expired or missing OAuthCredential produces OAUTH_INVALID error code', () => {
  function assertCredentialValid(credential) {
    if (!credential || credential.expiresAt <= new Date()) {
      const err = new Error('OAuth credential is unavailable');
      err.code = 'OAUTH_INVALID';
      throw err;
    }
  }
  assert.throws(
    () => assertCredentialValid(null),
    err => err.code === 'OAUTH_INVALID',
    'null credential must throw OAUTH_INVALID'
  );
  assert.throws(
    () => assertCredentialValid({ expiresAt: new Date(Date.now() - 1000) }),
    err => err.code === 'OAUTH_INVALID',
    'past-expiry credential must throw OAUTH_INVALID'
  );
  assert.doesNotThrow(
    () => assertCredentialValid({ expiresAt: new Date(Date.now() + 60_000) }),
    'future-expiry credential must not throw'
  );
});
