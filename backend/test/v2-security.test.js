import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/klarix_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'a-test-secret-that-is-long-enough-for-production';
process.env.META_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const { encrypt, decrypt } = await import('../lib/crypto.js');
const { toPublicJob } = await import('../lib/publicJob.js');
const metaAdapter = await import('../integrations/metaAdapter.js');

test('public job DTO excludes OAuth input and internal error detail', () => {
  const result = toPublicJob({
    id: 'job-1', type: 'SYNC_ACCOUNT', state: 'FAILED', progressPercent: 10,
    input: { code: 'oauth-code' }, idempotencyKey: 'secret', error: { message: 'redis password', code: 'QUEUE_UNAVAILABLE' }
  });
  assert.deepEqual(result.error, { code: 'QUEUE_UNAVAILABLE' });
  assert.equal('input' in result, false);
  assert.equal('idempotencyKey' in result, false);
});

test('AES-256-GCM ciphertext is versioned and authenticated', () => {
  const ciphertext = encrypt('access-token');
  assert.match(ciphertext, /^v1\./);
  assert.equal(decrypt(ciphertext), 'access-token');
  assert.equal(decrypt(`${ciphertext}corrupt`), null);
});

test('mock Meta profile represents distinct accounts', async () => {
  const first = await metaAdapter.fetchProfile('mock_access_token_one');
  const second = await metaAdapter.fetchProfile('mock_access_token_two');
  assert.notEqual(first.externalAccountId, second.externalAccountId);
});
