/**
 * v2-phase4-carousel.test.js
 *
 * Uses the same single-test-wrapper + process.exit pattern as gate4,
 * since the worker holds Redis connections open.
 *
 * Verifies:
 * 1. Carousel: all slides persisted
 * 2. Carousel: slide order preserved
 * 3. Carousel: correct contentId on each media row
 * 4. Carousel: re-import is idempotent (no duplicates)
 * 5. Carousel: missing child mediaUrl skipped without crash
 * 6. Image:   root mediaUrl persisted correctly
 * 7. Reel:    actual video sourceUrl persisted (not thumbnailUrl)
 */

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

// ─── Mock BullMQ ──────────────────────────────────────────────────────────────

const queuedJobs = [];
let workerCallback = null;

await mock.module('bullmq', {
  exports: {
    Queue: class {
      constructor(name) {}
      async add(name, data, opts) { queuedJobs.push({ name, data, opts }); }
      async close() {}
    },
    Worker: class {
      constructor(name, cb) { workerCallback = cb; }
      on() {}
      async close() {}
    }
  }
});

// ─── Mock analyzePost (uses namedExports per existing pattern) ────────────────

mock.module('../services/postAnalysisOrchestrator.js', {
  namedExports: {
    analyzePost: async () => ({
      version: '1.0',
      status: 'COMPLETED',
      visualFindings: { format_classification: 'mocked' },
      contentFindings: { themes: ['mocked'] },
      perfFindings: { metric_interpretation: 'mocked' },
      confidence: 1.0,
      providerMeta: { model: 'mocked' }
    })
  }
});

const prisma = new PrismaClient();
const { createAndEnqueueJob, dispatchOutboxBatch } = await import('../jobs/jobService.js');
const cryptoLib = await import('../lib/crypto.js');

await import('../worker.js'); // registers workerCallback

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function cleanDb() {
  await prisma.jobLog.deleteMany();
  await prisma.jobOutbox.deleteMany();
  await prisma.contentAnalysis.deleteMany();
  await prisma.contentMetricSnapshot.deleteMany();
  await prisma.contentMedia.deleteMany();
  await prisma.job.deleteMany();
  await prisma.content.deleteMany();
  await prisma.socialAccount.deleteMany();
  await prisma.oAuthCredential.deleteMany();
  await prisma.brandMember.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.user.deleteMany();
}

// Drain the entire job queue using the registered worker callback
const processAllJobs = async () => {
  const cb = workerCallback;
  let processed = true;
  while (processed) {
    processed = false;
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
      processed = true;
    }
  }
};

// Enqueue a single IMPORT_CONTENT job for an item and drain
let importCounter = 0;
const importItem = async (socialAccountId, brandId, item) => {
  importCounter++;
  await createAndEnqueueJob({
    brandId,
    type: 'IMPORT_CONTENT',
    idempotencyKey: `import:${socialAccountId}:${item.externalContentId}:run${importCounter}`,
    input: { socialAccountId, externalContentId: item.externalContentId, item }
  });
  await processAllJobs();
};

// ─── Single test wrapper ───────────────────────────────────────────────────────

test('Phase 4 — Carousel children persistence', async (t) => {
  try {
    await cleanDb();

    // Setup user + brand
    await prisma.user.create({ data: { id: 'user-carousel', email: 'carousel@test.com', password: 'hash' } });
    const brandId = 'brand-carousel';
    await prisma.brand.create({ data: { id: brandId, ownerUserId: 'user-carousel', name: 'Carousel Brand' } });

    // SocialAccount (no credentialId / scopes / expiresAt in schema)
    const encryptedToken = cryptoLib.encrypt('mock_carousel_token');
    const socialAccount = await prisma.socialAccount.create({
      data: {
        id: 'sa-carousel',
        brandId,
        platform: 'INSTAGRAM',
        externalAccountId: 'ig-carousel-1',
        username: 'carousel_test',
        encryptedToken,
        expiry: new Date(Date.now() + 86400000),
        connectionStatus: 'CONNECTED'
      }
    });
    const socialAccountId = socialAccount.id;

    // ── 1. All 3 slides are persisted ─────────────────────────────────────────
    await t.test('carousel: all 3 slides persisted as separate ContentMedia rows', async () => {
      const item = {
        externalContentId: 'ext-c1',
        type: 'CAROUSEL',
        caption: 'Test carousel',
        permalink: 'https://www.instagram.com/p/c1',
        publishedAt: new Date('2026-01-01'),
        mediaUrl: null,
        thumbnailUrl: null,
        children: [
          { externalMediaId: 'c1-s1', mediaType: 'IMAGE', mediaUrl: 'https://cdn.ig.com/s1.jpg' },
          { externalMediaId: 'c1-s2', mediaType: 'IMAGE', mediaUrl: 'https://cdn.ig.com/s2.jpg' },
          { externalMediaId: 'c1-s3', mediaType: 'IMAGE', mediaUrl: 'https://cdn.ig.com/s3.jpg' },
        ]
      };
      await importItem(socialAccountId, brandId, item);

      const content = await prisma.content.findFirst({
        where: { brandId, externalContentId: 'ext-c1' },
        include: { media: { orderBy: { createdAt: 'asc' } } }
      });
      assert.ok(content, 'Content row must exist');
      assert.equal(content.type, 'CAROUSEL');
      assert.equal(content.media.length, 3, 'All 3 slides must be persisted');
    });

    // ── 2. Slide order is preserved ───────────────────────────────────────────
    await t.test('carousel: slide source URLs are in correct insertion order', async () => {
      const content = await prisma.content.findFirst({
        where: { brandId, externalContentId: 'ext-c1' },
        include: { media: { orderBy: { createdAt: 'asc' } } }
      });
      const urls = content.media.map(m => m.sourceUrl);
      assert.deepEqual(urls, [
        'https://cdn.ig.com/s1.jpg',
        'https://cdn.ig.com/s2.jpg',
        'https://cdn.ig.com/s3.jpg',
      ]);
    });

    // ── 3. Each media row has the correct contentId ───────────────────────────
    await t.test('carousel: every media row has the correct contentId', async () => {
      const content = await prisma.content.findFirst({
        where: { brandId, externalContentId: 'ext-c1' },
        include: { media: true }
      });
      for (const m of content.media) {
        assert.equal(m.contentId, content.id);
      }
    });

    // ── 4. Re-importing with changed CDN URLs replaces rows without duplicating ──
    await t.test('carousel: re-importing with changed signed URLs is idempotent', async () => {
      const sameItem = {
        externalContentId: 'ext-c1',
        type: 'CAROUSEL',
        caption: 'Test carousel',
        permalink: 'https://www.instagram.com/p/c1',
        publishedAt: new Date('2026-01-01'),
        mediaUrl: null,
        thumbnailUrl: null,
        children: [
          { externalMediaId: 'c1-s1', mediaType: 'IMAGE', mediaUrl: 'https://cdn.ig.com/s1.jpg?token=new1' },
          { externalMediaId: 'c1-s2', mediaType: 'IMAGE', mediaUrl: 'https://cdn.ig.com/s2.jpg?token=new2' },
          { externalMediaId: 'c1-s3', mediaType: 'IMAGE', mediaUrl: 'https://cdn.ig.com/s3.jpg?token=new3' },
        ]
      };
      await importItem(socialAccountId, brandId, sameItem);

      const content = await prisma.content.findFirst({
        where: { brandId, externalContentId: 'ext-c1' },
        include: { media: { orderBy: { createdAt: 'asc' } } }
      });
      assert.equal(content.media.length, 3, 'Still exactly 3 slides after re-import with changed URLs');
      const urls = content.media.map(m => m.sourceUrl);
      assert.deepEqual(urls, [
        'https://cdn.ig.com/s1.jpg?token=new1',
        'https://cdn.ig.com/s2.jpg?token=new2',
        'https://cdn.ig.com/s3.jpg?token=new3',
      ]);
    });

    // ── 4b. Re-importing with completely invalid children preserves existing ──
    await t.test('carousel: totally invalid children payload preserves existing media', async () => {
      const invalidItem = {
        externalContentId: 'ext-c1',
        type: 'CAROUSEL',
        caption: 'Test carousel',
        permalink: 'https://www.instagram.com/p/c1',
        publishedAt: new Date('2026-01-01'),
        mediaUrl: null,
        thumbnailUrl: null,
        children: [
          { externalMediaId: 'c1-s1', mediaType: 'IMAGE', mediaUrl: null },
          { externalMediaId: 'c1-s2', mediaType: 'IMAGE', mediaUrl: null },
        ]
      };
      await importItem(socialAccountId, brandId, invalidItem);

      const content = await prisma.content.findFirst({
        where: { brandId, externalContentId: 'ext-c1' },
        include: { media: { orderBy: { createdAt: 'asc' } } }
      });
      assert.equal(content.media.length, 3, 'Original 3 slides must remain intact');
      const urls = content.media.map(m => m.sourceUrl);
      assert.deepEqual(urls, [
        'https://cdn.ig.com/s1.jpg?token=new1',
        'https://cdn.ig.com/s2.jpg?token=new2',
        'https://cdn.ig.com/s3.jpg?token=new3',
      ]);
    });

    // ── 5. Missing child mediaUrl skipped without crash ───────────────────────
    await t.test('carousel: missing child mediaUrl is skipped without crashing', async () => {
      const itemWithMissing = {
        externalContentId: 'ext-c2-missing',
        type: 'CAROUSEL',
        caption: 'Missing slide',
        permalink: 'https://www.instagram.com/p/c2',
        publishedAt: new Date('2026-01-02'),
        mediaUrl: null,
        thumbnailUrl: null,
        children: [
          { externalMediaId: 'm-s1', mediaType: 'IMAGE', mediaUrl: 'https://cdn.ig.com/a.jpg' },
          { externalMediaId: 'm-s2', mediaType: 'IMAGE', mediaUrl: null }, // missing
          { externalMediaId: 'm-s3', mediaType: 'IMAGE', mediaUrl: 'https://cdn.ig.com/c.jpg' },
        ]
      };
      await importItem(socialAccountId, brandId, itemWithMissing);

      const content = await prisma.content.findFirst({
        where: { brandId, externalContentId: 'ext-c2-missing' },
        include: { media: true }
      });
      assert.ok(content, 'Content must be created even with a missing slide');
      assert.equal(content.media.length, 2, 'Only the 2 valid slides must be persisted');
      const urls = content.media.map(m => m.sourceUrl);
      assert.ok(urls.includes('https://cdn.ig.com/a.jpg'));
      assert.ok(urls.includes('https://cdn.ig.com/c.jpg'));
    });

    // ── 6. Single image import is unaffected ──────────────────────────────────
    await t.test('image: root mediaUrl is persisted correctly', async () => {
      const item = {
        externalContentId: 'ext-img-1',
        type: 'IMAGE',
        caption: 'Photo',
        permalink: 'https://www.instagram.com/p/img1',
        publishedAt: new Date('2026-01-03'),
        mediaUrl: 'https://cdn.ig.com/photo.jpg',
        thumbnailUrl: null,
        children: []
      };
      await importItem(socialAccountId, brandId, item);

      const content = await prisma.content.findFirst({
        where: { brandId, externalContentId: 'ext-img-1' },
        include: { media: true }
      });
      assert.equal(content.type, 'IMAGE');
      assert.equal(content.media.length, 1);
      assert.equal(content.media[0].sourceUrl, 'https://cdn.ig.com/photo.jpg');
    });

    // ── 7. Reel import uses actual video sourceUrl ────────────────────────────
    await t.test('reel: actual video sourceUrl is persisted, not thumbnailUrl', async () => {
      const item = {
        externalContentId: 'ext-reel-1',
        type: 'REEL',
        caption: 'Reel',
        permalink: 'https://www.instagram.com/reels/r1',
        publishedAt: new Date('2026-01-04'),
        mediaUrl: 'https://cdn.ig.com/reel.mp4',
        thumbnailUrl: 'https://cdn.ig.com/reel_thumb.jpg',
        children: []
      };
      await importItem(socialAccountId, brandId, item);

      const content = await prisma.content.findFirst({
        where: { brandId, externalContentId: 'ext-reel-1' },
        include: { media: true }
      });
      assert.equal(content.type, 'REEL');
      assert.equal(content.media.length, 1);
      assert.equal(content.media[0].sourceUrl, 'https://cdn.ig.com/reel.mp4',
        'sourceUrl must be the actual .mp4 video URL');
      assert.equal(content.media[0].thumbnailUrl, 'https://cdn.ig.com/reel_thumb.jpg');
    });

  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  } finally {
    await cleanDb();
    await prisma.$disconnect();
    process.exit(0);
  }
});
