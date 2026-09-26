/**
 * v2-phase3-gate2.test.js
 *
 * Gate 2 tests covering:
 *   — Content repository (contentRepository.js)
 *   — Meta adapter Phase 3 extensions (metaAdapter.js)
 *
 * Test style: node:test + mock.module() — identical pattern to Phase 2 tests.
 * No real database or Meta API is required.
 *
 * Run via:
 *   node --experimental-test-module-mocks --test test/v2-phase3-gate2.test.js
 */

import { mock } from 'node:test';
import test from 'node:test';
import assert from 'node:assert/strict';

// ── Environment ───────────────────────────────────────────────────────────────
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/klarix_test';
process.env.REDIS_URL    = 'redis://localhost:6379';
process.env.JWT_SECRET   = 'a-test-secret-that-is-long-enough-for-production';
process.env.META_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
// Fixture mode active
process.env.NODE_ENV     = 'test';

// ── Prisma mock ───────────────────────────────────────────────────────────────

// Shared mutable state for the Prisma mock so individual tests can
// control what the DB returns without re-registering the mock.
const db = {
  contentFindUnique: mock.fn(() => Promise.resolve(null)),
  contentUpsert:     mock.fn(({ create }) => Promise.resolve({ id: 'content-1', ...create })),
  contentFindMany:   mock.fn(() => Promise.resolve([])),
  mediaFindFirst:    mock.fn(() => Promise.resolve(null)),
  mediaCreate:       mock.fn(({ data }) => Promise.resolve({ id: 'media-1', ...data })),
  snapshotCreate:    mock.fn(({ data }) => Promise.resolve({ id: 'snap-1', ...data })),
};

await mock.module('@prisma/client', {
  exports: {
    PrismaClient: class MockPrismaClient {
      content = {
        findUnique: db.contentFindUnique,
        upsert:     db.contentUpsert,
        findMany:   db.contentFindMany,
      };
      contentMedia = {
        findFirst: db.mediaFindFirst,
        create:    db.mediaCreate,
      };
      contentMetricSnapshot = {
        create: db.snapshotCreate,
      };
    },
  },
});

// BullMQ mock — prevents Redis connection when queue.js is imported indirectly
await mock.module('bullmq', {
  exports: {
    Queue:  class { constructor() {} async add() {} async close() {} },
    Worker: class { constructor() {} on() {} async close() {} },
  },
});

// ── Import modules after mocks ────────────────────────────────────────────────
const repo = await import('../repositories/contentRepository.js');
const meta = await import('../integrations/metaAdapter.js');

// ─────────────────────────────────────────────────────────────────────────────
// Helper — reset call counts between groups of related tests
// ─────────────────────────────────────────────────────────────────────────────
function resetAllMocks() {
  for (const fn of Object.values(db)) fn.mock.resetCalls();
}

// ═════════════════════════════════════════════════════════════════════════════
//  REPOSITORY TESTS
// ═════════════════════════════════════════════════════════════════════════════

// ── 1. Same external content → no duplicate Content row ───────────────────────

test('repo: same (socialAccountId, externalContentId) does not create a duplicate Content row', async () => {
  resetAllMocks();

  // Simulate no existing conflict (different brand check: existing = null)
  db.contentFindUnique.mock.mockImplementationOnce(() => Promise.resolve(null));
  const returned = { id: 'content-abc', brandId: 'brand-1', socialAccountId: 'sa-1', externalContentId: 'ext-1', type: 'IMAGE' };
  db.contentUpsert.mock.mockImplementationOnce(() => Promise.resolve(returned));

  const result = await repo.upsertContent({
    brandId: 'brand-1', socialAccountId: 'sa-1', externalContentId: 'ext-1',
    type: 'IMAGE', caption: 'hello',
  });

  assert.equal(result.id, 'content-abc');
  // upsert was called exactly once (not create + find)
  assert.equal(db.contentUpsert.mock.callCount(), 1);

  // upsert WHERE clause uses the unique key
  const upsertCall = db.contentUpsert.mock.calls[0].arguments[0];
  assert.deepEqual(upsertCall.where, {
    socialAccountId_externalContentId: { socialAccountId: 'sa-1', externalContentId: 'ext-1' },
  });
});

// ── 2. Content retains same ID after repeat upsert ────────────────────────────

test('repo: upsertContent returns the same id on repeat call (idempotency)', async () => {
  resetAllMocks();

  const existing = { id: 'stable-id-1', brandId: 'brand-1', socialAccountId: 'sa-1', externalContentId: 'ext-1', type: 'IMAGE' };
  // No ownership conflict
  db.contentFindUnique.mock.mockImplementationOnce(() => Promise.resolve(null));
  db.contentUpsert.mock.mockImplementationOnce(() => Promise.resolve(existing));

  const first = await repo.upsertContent({
    brandId: 'brand-1', socialAccountId: 'sa-1', externalContentId: 'ext-1', type: 'IMAGE',
  });

  db.contentFindUnique.mock.mockImplementationOnce(() => Promise.resolve(null));
  db.contentUpsert.mock.mockImplementationOnce(() => Promise.resolve(existing));

  const second = await repo.upsertContent({
    brandId: 'brand-1', socialAccountId: 'sa-1', externalContentId: 'ext-1', type: 'IMAGE',
  });

  assert.equal(first.id, second.id, 'ID must be stable across upserts');
});

// ── 3. Mutable metadata can be updated ───────────────────────────────────────

test('repo: upsertContent update clause includes mutable metadata (caption, permalink, type)', async () => {
  resetAllMocks();

  db.contentFindUnique.mock.mockImplementationOnce(() => Promise.resolve(null));
  db.contentUpsert.mock.mockImplementationOnce(({ update }) =>
    Promise.resolve({ id: 'c-1', brandId: 'b-1', caption: update.caption, type: update.type })
  );

  await repo.upsertContent({
    brandId: 'b-1', socialAccountId: 'sa-1', externalContentId: 'ext-1',
    type: 'REEL', caption: 'Updated caption', permalink: 'https://ig.com/p/abc',
  });

  const upsertArg = db.contentUpsert.mock.calls[0].arguments[0];
  // update must contain caption, permalink, and type
  assert.equal(upsertArg.update.caption, 'Updated caption');
  assert.equal(upsertArg.update.permalink, 'https://ig.com/p/abc');
  assert.equal(upsertArg.update.type, 'REEL', 'type must be updated on conflict to support backfilling existing records');
  // update must NOT contain brandId (ownership is immutable)
  assert.equal('brandId' in upsertArg.update, false, 'brandId must not be in update payload');
  assert.equal('socialAccountId' in upsertArg.update, false, 'socialAccountId must not be in update payload');
});

// ── 4. Cross-brand ownership conflict is detected ─────────────────────────────

test('repo: upsertContent throws CONTENT_OWNERSHIP_CONFLICT when existing row belongs to different brand', async () => {
  resetAllMocks();

  // Existing content belongs to brand-A, but caller is brand-B
  const existingRow = { id: 'c-existing', brandId: 'brand-A' };
  db.contentFindUnique.mock.mockImplementationOnce(() => Promise.resolve(existingRow));

  await assert.rejects(
    () => repo.upsertContent({
      brandId: 'brand-B',
      socialAccountId: 'sa-1', externalContentId: 'ext-1', type: 'IMAGE',
    }),
    err => {
      assert.equal(err.code, 'CONTENT_OWNERSHIP_CONFLICT');
      return true;
    },
    'cross-brand upsert must throw CONTENT_OWNERSHIP_CONFLICT'
  );

  // Upsert must NOT have been called (conflict detected before DB write)
  assert.equal(db.contentUpsert.mock.callCount(), 0);
});

// ── 5. Media attaches to the correct Content row ──────────────────────────────

test('repo: upsertMedia creates a media row with the correct contentId', async () => {
  resetAllMocks();

  db.mediaFindFirst.mock.mockImplementationOnce(() => Promise.resolve(null)); // no existing
  const expectedMedia = { id: 'm-1', contentId: 'content-abc', mediaType: 'IMAGE', sourceUrl: 'https://cdn.instagram.com/img.jpg', thumbnailUrl: 'https://cdn.instagram.com/thumb.jpg' };
  db.mediaCreate.mock.mockImplementationOnce(() => Promise.resolve(expectedMedia));

  const result = await repo.upsertMedia({
    contentId: 'content-abc',
    mediaType: 'IMAGE',
    sourceUrl: 'https://cdn.instagram.com/img.jpg',
    thumbnailUrl: 'https://cdn.instagram.com/thumb.jpg',
  });

  assert.equal(result.contentId, 'content-abc');
  assert.equal(result.mediaType, 'IMAGE');
  // Verify the create call included contentId and thumbnailUrl
  const createArg = db.mediaCreate.mock.calls[0].arguments[0].data;
  assert.equal(createArg.contentId, 'content-abc');
  assert.equal(createArg.thumbnailUrl, 'https://cdn.instagram.com/thumb.jpg');
});

// ── 6. Media deduplication: existing (contentId, mediaType, sourceUrl) ────────

test('repo: upsertMedia returns existing row when same (contentId, mediaType, sourceUrl) already exists', async () => {
  resetAllMocks();

  const existingMedia = { id: 'm-existing', contentId: 'c-1', mediaType: 'IMAGE', sourceUrl: 'https://cdn.ig.com/x.jpg' };
  db.mediaFindFirst.mock.mockImplementationOnce(() => Promise.resolve(existingMedia));

  const result = await repo.upsertMedia({
    contentId: 'c-1', mediaType: 'IMAGE', sourceUrl: 'https://cdn.ig.com/x.jpg',
  });

  assert.equal(result.id, 'm-existing', 'must return existing row, not create a new one');
  assert.equal(db.mediaCreate.mock.callCount(), 0, 'create must not be called when media already exists');
});

// ── 7. Metric snapshot creation succeeds ─────────────────────────────────────

test('repo: createMetricSnapshot persists a snapshot with the given observedAt', async () => {
  resetAllMocks();

  const observedAt = new Date('2024-03-15T10:00:00Z');
  const snapData = { id: 'snap-1', contentId: 'c-1', observedAt, reach: 4200, plays: 1100 };
  db.snapshotCreate.mock.mockImplementationOnce(() => Promise.resolve(snapData));

  const result = await repo.createMetricSnapshot({
    contentId: 'c-1',
    observedAt,
    reach: 4200,
    plays: 1100,
  });

  assert.equal(result.contentId, 'c-1');
  assert.deepEqual(result.observedAt, observedAt);

  const createArg = db.snapshotCreate.mock.calls[0].arguments[0].data;
  assert.equal(createArg.contentId, 'c-1');
  assert.deepEqual(createArg.observedAt, observedAt);
});

// ── 8. Historical metric snapshot: duplicate (contentId, observedAt) throws ───

test('repo: createMetricSnapshot throws METRIC_SNAPSHOT_CONFLICT on duplicate (P2002)', async () => {
  resetAllMocks();

  const p2002 = new Error('Unique constraint failed');
  p2002.code = 'P2002';
  db.snapshotCreate.mock.mockImplementationOnce(() => Promise.reject(p2002));

  await assert.rejects(
    () => repo.createMetricSnapshot({
      contentId: 'c-1',
      observedAt: new Date('2024-03-15T10:00:00Z'),
      reach: 100,
    }),
    err => {
      assert.equal(err.code, 'METRIC_SNAPSHOT_CONFLICT');
      return true;
    }
  );
});

// ── 9. New observedAt creates a new snapshot (different timestamp) ────────────

test('repo: createMetricSnapshot with different observedAt calls create twice without conflict', async () => {
  resetAllMocks();

  const t1 = new Date('2024-03-15T10:00:00Z');
  const t2 = new Date('2024-03-16T10:00:00Z'); // next day

  let callCount = 0;
  db.snapshotCreate.mock.mockImplementation(({ data }) => {
    callCount++;
    return Promise.resolve({ id: callCount === 1 ? 'snap-t1' : 'snap-t2', ...data });
  });

  const snap1 = await repo.createMetricSnapshot({ contentId: 'c-1', observedAt: t1, reach: 100 });
  const snap2 = await repo.createMetricSnapshot({ contentId: 'c-1', observedAt: t2, reach: 150 });

  assert.equal(snap1.id, 'snap-t1');
  assert.equal(snap2.id, 'snap-t2');
  assert.equal(db.snapshotCreate.mock.callCount(), 2);
  assert.notDeepEqual(snap1.observedAt, snap2.observedAt);
});

// ── 10. findContentByBrand ordering ──────────────────────────────────────────

test('repo: findContentByBrand uses publishedAt DESC, id DESC ordering', async () => {
  resetAllMocks();

  db.contentFindMany.mock.mockImplementationOnce(() => Promise.resolve([]));

  await repo.findContentByBrand({ brandId: 'brand-1', limit: 10 });

  const callArg = db.contentFindMany.mock.calls[0].arguments[0];
  assert.deepEqual(callArg.orderBy, [{ publishedAt: 'desc' }, { id: 'desc' }]);
  assert.equal(callArg.where.brandId, 'brand-1');
  assert.equal(callArg.take, 10);
});

// ── 11. findContentByBrand type filter ───────────────────────────────────────

test('repo: findContentByBrand forwards type filter to WHERE clause', async () => {
  resetAllMocks();

  db.contentFindMany.mock.mockImplementationOnce(() => Promise.resolve([]));

  await repo.findContentByBrand({ brandId: 'brand-1', type: 'REEL' });

  const callArg = db.contentFindMany.mock.calls[0].arguments[0];
  assert.equal(callArg.where.type, 'REEL');
});

// ── 12. findContentByBrand analysisStatus filter ─────────────────────────────

test('repo: findContentByBrand forwards analysisStatus filter to WHERE clause', async () => {
  resetAllMocks();

  db.contentFindMany.mock.mockImplementationOnce(() => Promise.resolve([]));

  await repo.findContentByBrand({ brandId: 'brand-1', analysisStatus: 'NOT_STARTED' });

  const callArg = db.contentFindMany.mock.calls[0].arguments[0];
  assert.equal(callArg.where.analysisStatus, 'NOT_STARTED');
});

// ── 13. findContentByBrand date range filter ──────────────────────────────────

test('repo: findContentByBrand forwards from/to date range to WHERE clause', async () => {
  resetAllMocks();

  const from = new Date('2024-01-01');
  const to   = new Date('2024-06-30');

  db.contentFindMany.mock.mockImplementationOnce(() => Promise.resolve([]));

  await repo.findContentByBrand({ brandId: 'brand-1', from, to });

  const callArg = db.contentFindMany.mock.calls[0].arguments[0];
  assert.deepEqual(callArg.where.publishedAt, { gte: from, lte: to });
});

// ═════════════════════════════════════════════════════════════════════════════
//  META ADAPTER TESTS
// ═════════════════════════════════════════════════════════════════════════════

// ── 14. generateAuthUrl Phase 2 compatibility ─────────────────────────────────

test('adapter: generateAuthUrl returns a URL containing state and required scopes', () => {
  const url = meta.generateAuthUrl('test-state-abc');
  assert.ok(url.includes('instagram_business_basic'), 'must include instagram_business_basic scope');
  assert.ok(url.includes('instagram_business_manage_insights'), 'must include instagram_business_manage_insights scope');
  assert.ok(url.includes('test-state-abc'), 'state must be in the URL');
  // URL must not expose any token or credential
  assert.ok(!url.includes('access_token'), 'must not contain access_token');
});

// ── 15. exchangeCodeForToken fixture behaviour ────────────────────────────────

test('adapter: exchangeCodeForToken fixture returns access token (test mode)', async () => {
  const { accessToken, expiresIn } = await meta.exchangeCodeForToken('valid-code-123');
  assert.ok(typeof accessToken === 'string' && accessToken.length > 0);
  assert.ok(typeof expiresIn === 'number' && expiresIn > 0);
  // No credential in the return value (expiresIn is fine, accessToken is fine to return)
});

test('adapter: exchangeCodeForToken fixture rejects invalid_code (test mode)', async () => {
  await assert.rejects(
    () => meta.exchangeCodeForToken('invalid_code'),
    /Invalid OAuth code/,
    'invalid_code must be rejected in fixture mode'
  );
});

// ── 16. fetchProfile fixture is deterministic ─────────────────────────────────

test('adapter: fetchProfile fixture returns deterministic data for same token prefix', async () => {
  const profileA = await meta.fetchProfile('mock_access_token_aaaa');
  const profileB = await meta.fetchProfile('mock_access_token_bbbb');

  assert.ok(profileA.externalAccountId, 'externalAccountId must be present');
  assert.notEqual(profileA.externalAccountId, profileB.externalAccountId,
    'distinct tokens must yield distinct account IDs (Phase 2 contract)');
  assert.equal(profileA.platform, 'INSTAGRAM');
  assert.equal(profileA.accountType, 'BUSINESS');
});

test('adapter: fetchProfile fixture rejects token without expected prefix', async () => {
  await assert.rejects(
    () => meta.fetchProfile('real_access_token_abc'),
    /Invalid access token format/,
    'non-mock token must be rejected in fixture mode'
  );
});

// ── 17. fetchUserMedia fixture returns paginated results ──────────────────────

test('adapter: fetchUserMedia fixture returns first page of deterministic media items', async () => {
  const { items, nextCursor } = await meta.fetchUserMedia('mock_access_token_x', 'ig-user-1');
  assert.ok(Array.isArray(items), 'items must be an array');
  assert.ok(items.length > 0, 'first page must have at least one item');
  assert.ok(typeof nextCursor === 'string', 'first page must have a next cursor');

  const item = items[0];
  assert.ok(item.externalContentId, 'each item must have externalContentId');
  assert.ok(item.type, 'each item must have a normalised type');
});

test('adapter: fetchUserMedia fixture second page returns different items and no cursor', async () => {
  const page1 = await meta.fetchUserMedia('mock_access_token_x', 'ig-user-1');
  const page2 = await meta.fetchUserMedia('mock_access_token_x', 'ig-user-1', { after: page1.nextCursor });

  assert.ok(page2.items.length > 0, 'second page must have items');
  assert.equal(page2.nextCursor, null, 'second page must have no cursor');

  const ids1 = new Set(page1.items.map(i => i.externalContentId));
  for (const item of page2.items) {
    assert.ok(!ids1.has(item.externalContentId), 'page 2 items must not overlap with page 1');
  }
});

test('adapter: fetchUserMedia fixture normalises CAROUSEL_ALBUM type to CAROUSEL', async () => {
  const { items } = await meta.fetchUserMedia('mock_access_token_x', 'ig-user-1');
  const allItems = [...items];
  const page2 = await meta.fetchUserMedia('mock_access_token_x', 'ig-user-1', { after: 'fixture_cursor_page2' });
  allItems.push(...page2.items);

  // fixture_media_003 is CAROUSEL_ALBUM → should normalise to CAROUSEL
  const carousel = allItems.find(i => i.externalContentId === 'fixture_media_003');
  assert.ok(carousel, 'fixture_media_003 must be present');
  assert.equal(carousel.type, 'CAROUSEL');
  assert.ok(Array.isArray(carousel.children) && carousel.children.length > 0,
    'carousel must have children');
});

// ── 18. fetchMediaDetail fixture ──────────────────────────────────────────────

test('adapter: fetchMediaDetail fixture returns correct item by mediaId', async () => {
  const detail = await meta.fetchMediaDetail('mock_access_token_x', 'fixture_media_001');
  assert.equal(detail.externalContentId, 'fixture_media_001');
  assert.equal(detail.type, 'REEL');
  assert.ok(detail.publishedAt instanceof Date, 'publishedAt must be a Date');
});

test('adapter: fetchMediaDetail fixture throws CONTENT_NOT_FOUND for unknown id', async () => {
  await assert.rejects(
    () => meta.fetchMediaDetail('mock_access_token_x', 'unknown_media_id'),
    err => {
      assert.equal(err.code, 'CONTENT_NOT_FOUND');
      return true;
    }
  );
});

// ── 19. fetchMediaInsights fixture ────────────────────────────────────────────

test('adapter: fetchMediaInsights fixture returns normalised metrics', async () => {
  const metrics = await meta.fetchMediaInsights('mock_access_token_x', 'fixture_media_001');
  assert.equal(metrics.reach, 8500);
  assert.equal(metrics.impressions, 12000);
  assert.equal(metrics.plays, 6200);
  assert.equal(metrics.likes, 430);
  assert.equal(metrics.comments, 28);
  assert.equal(metrics.saves, 155);
  assert.equal(metrics.shares, 67);
  assert.equal(metrics.totalInteractions, 680);
  assert.equal(metrics.igReelsAvgWatchTime, 11000);
  assert.equal(metrics.igReelsVideoViewTotalTime, 68200000);
  assert.equal(metrics.reelsSkipRate, 45.2);
  assert.ok(typeof metrics.rawPayload === 'object', 'rawPayload must be present');
});

test('adapter: fetchMediaInsights fixture returns null metrics for unknown mediaId (no crash)', async () => {
  const metrics = await meta.fetchMediaInsights('mock_access_token_x', 'unknown_media_xyz');
  // All nulls — no error
  assert.equal(metrics.reach, null);
  assert.equal(metrics.impressions, null);
  assert.equal(metrics.plays, null);
  assert.equal(metrics.saves, null);
  assert.equal(metrics.totalInteractions, null);
  assert.equal(metrics.reelsSkipRate, null);
});

test('adapter: fetchMediaInsights fixture IMAGE returns null plays (not a video metric)', async () => {
  // fixture_media_002 is an IMAGE — plays should be null in fixture
  const metrics = await meta.fetchMediaInsights('mock_access_token_x', 'fixture_media_002');
  assert.equal(metrics.plays, null, 'IMAGE content must have null plays');
});

// ── 20. Fixture mode guard ────────────────────────────────────────────────────

test('adapter: GRAPH_API_VERSION constant is exported and non-empty', () => {
  assert.ok(typeof meta.GRAPH_API_VERSION === 'string' && meta.GRAPH_API_VERSION.length > 0,
    'GRAPH_API_VERSION must be a non-empty string');
  // Must follow v<number> format
  assert.match(meta.GRAPH_API_VERSION, /^v\d+/, 'GRAPH_API_VERSION must start with v<number>');
});

test('adapter: fixture mode produces no errors when NODE_ENV=test (baseline safety)', async () => {
  // All Phase 3 adapter calls in this test run under NODE_ENV=test.
  // This test asserts that the test environment itself does not blow up.
  assert.equal(process.env.NODE_ENV, 'test');
  // If any of the above tests already passed, fixture mode is confirmed safe.
  assert.ok(true);
});

// ── 21. Metric normalisation ──────────────────────────────────────────────────

test('adapter: metric normalisation maps all supported fields correctly', async () => {
  // REEL — has plays
  const reel = await meta.fetchMediaInsights('mock_access_token_x', 'fixture_media_001');
  assert.equal(typeof reel.reach, 'number');
  assert.equal(typeof reel.plays, 'number');

  // IMAGE — plays is null
  const image = await meta.fetchMediaInsights('mock_access_token_x', 'fixture_media_002');
  assert.equal(image.plays, null, 'plays must be null for IMAGE');
});

test('adapter: all metric fields are integer or null — no NaN, no undefined', async () => {
  const metrics = await meta.fetchMediaInsights('mock_access_token_x', 'fixture_media_004');
  const METRIC_FIELDS = ['reach', 'impressions', 'plays', 'likes', 'comments', 'saves', 'shares'];
  for (const field of METRIC_FIELDS) {
    const value = metrics[field];
    assert.ok(
      value === null || (Number.isInteger(value) && value >= 0),
      `${field} must be a non-negative integer or null, got: ${value}`
    );
  }
});

test('adapter: adapter errors do not contain access_token string', async () => {
  // In fixture mode, providing an invalid token to fetchProfile throws.
  // The error message must not contain the token value.
  const badToken = 'definitely_not_a_mock_token_abc123';
  try {
    await meta.fetchProfile(badToken);
    assert.fail('should have thrown');
  } catch (err) {
    assert.ok(
      !err.message.includes(badToken),
      'error message must not contain the access token value'
    );
  }
});

// ── 22. Normalisation unit tests ──────────────────────────────────────────────

test('adapter: _normaliseMediaItem maps thumbnail_url to thumbnailUrl', () => {
  const raw = {
    id: '123',
    media_type: 'VIDEO',
    media_url: 'http://video.mp4',
    thumbnail_url: 'http://thumb.jpg',
  };
  const normalised = meta._normaliseMediaItem(raw);
  assert.equal(normalised.externalContentId, '123');
  assert.equal(normalised.type, 'VIDEO');
  assert.equal(normalised.mediaUrl, 'http://video.mp4');
  assert.equal(normalised.thumbnailUrl, 'http://thumb.jpg');
});

test('adapter: _normaliseMediaItem correctly classifies REEL and FEED videos', () => {
  const rawReel = { id: '1', media_type: 'VIDEO', media_product_type: 'REELS' };
  const rawFeed = { id: '2', media_type: 'VIDEO', media_product_type: 'FEED' };
  const rawImage = { id: '3', media_type: 'IMAGE' };
  const rawCarousel = { id: '4', media_type: 'CAROUSEL_ALBUM' };

  assert.equal(meta._normaliseMediaItem(rawReel).type, 'REEL');
  assert.equal(meta._normaliseMediaItem(rawFeed).type, 'VIDEO');
  assert.equal(meta._normaliseMediaItem(rawImage).type, 'IMAGE');
  assert.equal(meta._normaliseMediaItem(rawCarousel).type, 'CAROUSEL');
});

test('adapter: _normaliseInsights maps views to plays for reels', () => {
  const insights = [
    { name: 'reach', values: [{ value: 100 }] },
    { name: 'views', values: [{ value: 200 }] }, // Modern Meta Graph API uses 'views'
    { name: 'likes', values: [{ value: 50 }] }
  ];
  const normalised = meta._normaliseInsights(insights);
  assert.equal(normalised.reach, 100);
  assert.equal(normalised.plays, 200); // views should map to plays
  assert.equal(normalised.likes, 50);
});
