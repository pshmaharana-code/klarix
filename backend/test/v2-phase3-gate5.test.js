import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/klarix_test?schema=public';
process.env.JWT_SECRET = 'a-test-secret-that-is-long-enough-for-production';
process.env.META_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const { PrismaClient } = await import('@prisma/client');
const { brandContentRouter, globalContentRouter } = await import('../routes/v2/content.js');
const { requireBrandAccess } = await import('../middleware/brandContext.js');
const { upsertContent } = await import('../repositories/contentRepository.js');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId) {
    req.user = { id: userId };
  }
  next();
});

app.use('/api/v2/brands/:brandId/content', requireBrandAccess, brandContentRouter);
app.use('/api/v2/content', globalContentRouter);

let server;
let baseUrl;

async function cleanDb() {
  await prisma.contentMetricSnapshot.deleteMany();
  await prisma.contentMedia.deleteMany();
  await prisma.content.deleteMany();
  await prisma.socialAccount.deleteMany();
  await prisma.brandMember.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.user.deleteMany();
}

before(async () => {
  await new Promise(resolve => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();
});

test('Gate 5: Content API', async (t) => {
  try {
  await cleanDb();

  // Create Users
  const user1 = await prisma.user.create({ data: { id: 'u1', email: 'u1@test', password: 'pwd' } });
  const user2 = await prisma.user.create({ data: { id: 'u2', email: 'u2@test', password: 'pwd' } });

  // Create Brands
  const brand1 = await prisma.brand.create({ data: { id: 'b1', ownerUserId: user1.id, name: 'Brand 1' } });
  const brand2 = await prisma.brand.create({ data: { id: 'b2', ownerUserId: user2.id, name: 'Brand 2' } });

  // Create Social Account
  const account1 = await prisma.socialAccount.create({
    data: { id: 'a1', brandId: brand1.id, platform: 'INSTAGRAM', externalAccountId: 'ig1', username: 'testuser' }
  });

  // Create Content
  const c1 = await upsertContent({
    brandId: brand1.id,
    socialAccountId: account1.id,
    externalContentId: 'ext1',
    type: 'REEL',
    caption: 'Test Reel',
    publishedAt: new Date('2026-01-01T10:00:00Z'),
    rawPayload: { secret: 'do-not-leak' }
  });

  const c2 = await upsertContent({
    brandId: brand1.id,
    socialAccountId: account1.id,
    externalContentId: 'ext2',
    type: 'IMAGE',
    publishedAt: new Date('2026-01-02T10:00:00Z'),
    rawPayload: { secret: 'do-not-leak2' }
  });

  // Add media and metrics
  const media = await prisma.contentMedia.create({
    data: { contentId: c1.id, mediaType: 'VIDEO', sourceUrl: 'http://video.url', thumbnailUrl: 'http://thumb.jpg' }
  });

  const snap1 = await prisma.contentMetricSnapshot.create({
    data: { contentId: c1.id, observedAt: new Date('2026-01-05T10:00:00Z'), plays: 100, rawPayload: { metric_secret: 'x' } }
  });
  const snap2 = await prisma.contentMetricSnapshot.create({
    data: { contentId: c1.id, observedAt: new Date('2026-01-06T10:00:00Z'), plays: 200, rawPayload: { metric_secret: 'y' } }
  });

  await t.test('Catalogue - authenticated user can retrieve their brand content', async () => {
    const res = await fetch(`${baseUrl}/api/v2/brands/${brand1.id}/content`, {
      headers: { 'x-user-id': user1.id }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.length, 2);
    // Order should be publishedAt DESC
    assert.equal(body.data[0].id, c2.id); // newer
    assert.equal(body.data[1].id, c1.id); // older
    
    // Check media field
    assert.ok(body.data[1].media);
    assert.equal(body.data[1].media[0].thumbnailUrl, 'http://thumb.jpg');
    
    // Security checks
    assert.equal('rawPayload' in body.data[0], false, 'Do not leak raw payload');
  });

  await t.test('Catalogue - another brand cannot be accessed', async () => {
    const res = await fetch(`${baseUrl}/api/v2/brands/${brand1.id}/content`, {
      headers: { 'x-user-id': user2.id } // user2 tries to access brand1
    });
    assert.equal(res.status, 403);
  });

  await t.test('Catalogue - pagination limit and cursor', async () => {
    // limit=1
    const res = await fetch(`${baseUrl}/api/v2/brands/${brand1.id}/content?limit=1`, {
      headers: { 'x-user-id': user1.id }
    });
    const body = await res.json();
    assert.equal(body.data.length, 1);
    assert.equal(body.pagination.hasMore, true);
    assert.ok(body.pagination.nextCursor);
    
    // Next page
    const nextCursorQuery = new URLSearchParams({
      limit: '1',
      afterId: body.pagination.nextCursor.afterId,
      afterPublishedAt: body.pagination.nextCursor.afterPublishedAt
    });
    const res2 = await fetch(`${baseUrl}/api/v2/brands/${brand1.id}/content?${nextCursorQuery}`, {
      headers: { 'x-user-id': user1.id }
    });
    const body2 = await res2.json();
    assert.equal(body2.data.length, 1);
    assert.equal(body2.data[0].id, c1.id);
    assert.equal(body2.pagination.hasMore, false);
  });

  await t.test('Catalogue - type filter', async () => {
    const res = await fetch(`${baseUrl}/api/v2/brands/${brand1.id}/content?type=REEL`, {
      headers: { 'x-user-id': user1.id }
    });
    const body = await res.json();
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].id, c1.id);
  });

  await t.test('Detail - retrieve content with media and ordered snapshots', async () => {
    const res = await fetch(`${baseUrl}/api/v2/content/${c1.id}`, {
      headers: { 'x-user-id': user1.id }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.id, c1.id);
    assert.equal(body.data.media[0].sourceUrl, 'http://video.url');
    assert.equal(body.data.metricSnapshots.length, 2);
    // Snapshots ordered DESC
    assert.equal(body.data.metricSnapshots[0].id, snap2.id);
    assert.equal(body.data.metricSnapshots[1].id, snap1.id);
    
    // Security check
    assert.equal('rawPayload' in body.data, false);
    assert.equal('rawPayload' in body.data.metricSnapshots[0], false);
  });

  await t.test('Detail - unauthorized user gets 404 (do not leak existence)', async () => {
    const res = await fetch(`${baseUrl}/api/v2/content/${c1.id}`, {
      headers: { 'x-user-id': user2.id }
    });
    assert.equal(res.status, 404);
  });

  await t.test('Detail - unauthenticated gets 401', async () => {
    const res = await fetch(`${baseUrl}/api/v2/content/${c1.id}`);
    assert.equal(res.status, 401);
  });

  await t.test('Empty state - valid brand with no content', async () => {
    const res = await fetch(`${baseUrl}/api/v2/brands/${brand2.id}/content`, {
      headers: { 'x-user-id': user2.id }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.length, 0);
    assert.equal(body.pagination.hasMore, false);
  });
  } catch (err) {
    console.error('TEST CAUGHT ERROR:', err.stack || err);
    throw err;
  }
});
