import { test, suite, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/klarix_test?schema=public';
process.env.JWT_SECRET = 'a-test-secret-that-is-long-enough-for-production';
process.env.META_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const { PrismaClient } = await import('@prisma/client');
const brandsRouter = (await import('../routes/v2/brands.js')).default;
const { requireBrandAccess } = await import('../middleware/brandContext.js');

const app = express();
app.use(express.json());
app.use(cookieParser());

const { loadConfig } = await import('../lib/config.js');

// We do not mock requireAuth here because it's imported and used inside brandsRouter.
// We must instead pass a valid signed JWT in the Cookie header.

app.use('/api/v2/brands', brandsRouter);

const prisma = new PrismaClient();
let server;
let baseUrl;

async function cleanDb() {
  await prisma.socialAccountMetricSnapshot.deleteMany();
  await prisma.socialAccount.deleteMany();
  await prisma.brandMember.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.user.deleteMany();
}

suite('Phase 4A: Account Metrics API', () => {
  let ownerId;
  let otherUserId;
  let ownerToken;
  let otherToken;
  let brandId;
  let otherBrandId;
  let accountId;
  let otherAccountId;

  before(async () => {
    await cleanDb();
    
    server = app.listen(0);
    const { port } = server.address();
    baseUrl = `http://localhost:${port}/api/v2/brands`;

    ownerId = 'api-owner-1';
    otherUserId = 'api-other-1';

    ownerToken = jwt.sign({ userId: ownerId, email: 'owner@api.com' }, loadConfig().jwtSecret, { expiresIn: '1h' });
    otherToken = jwt.sign({ userId: otherUserId, email: 'other@api.com' }, loadConfig().jwtSecret, { expiresIn: '1h' });

    await prisma.user.createMany({
      data: [
        { id: ownerId, email: 'owner@api.com', password: 'hash' },
        { id: otherUserId, email: 'other@api.com', password: 'hash' }
      ]
    });

    brandId = 'brand-api-1';
    otherBrandId = 'brand-api-2';

    await prisma.brand.createMany({
      data: [
        { id: brandId, ownerUserId: ownerId, name: 'API Brand' },
        { id: otherBrandId, ownerUserId: otherUserId, name: 'Other Brand' }
      ]
    });

    accountId = 'account-api-1';
    otherAccountId = 'account-api-2';

    await prisma.socialAccount.createMany({
      data: [
        { id: accountId, brandId, platform: 'INSTAGRAM', externalAccountId: 'ext-1', username: 'user1', connectionStatus: 'CONNECTED', encryptedToken: 'mock' },
        { id: otherAccountId, brandId: otherBrandId, platform: 'INSTAGRAM', externalAccountId: 'ext-2', username: 'user2', connectionStatus: 'CONNECTED', encryptedToken: 'mock' }
      ]
    });

    // Create snapshots for API Brand
    await prisma.socialAccountMetricSnapshot.createMany({
      data: [
        { socialAccountId: accountId, metricName: 'reach', period: 'day', endTime: new Date('2026-09-24T00:00:00Z'), value: 1000 },
        { socialAccountId: accountId, metricName: 'likes', period: 'day', endTime: new Date('2026-09-24T00:00:00Z'), value: 50 },
        { socialAccountId: accountId, metricName: 'comments', period: 'day', endTime: new Date('2026-09-24T00:00:00Z'), value: 10 },
        { socialAccountId: accountId, metricName: 'saves', period: 'day', endTime: new Date('2026-09-24T00:00:00Z'), value: 5 },
        { socialAccountId: accountId, metricName: 'shares', period: 'day', endTime: new Date('2026-09-24T00:00:00Z'), value: 5 },
        // A breakdown row
        { socialAccountId: accountId, metricName: 'reach', period: 'day', endTime: new Date('2026-09-24T00:00:00Z'), breakdownDefinition: 'media_product_type', value: 1000, breakdowns: [{dimension_keys: ['REEL'], results: [{value: 1000}]}] },
        // A different date
        { socialAccountId: accountId, metricName: 'reach', period: 'day', endTime: new Date('2026-09-25T00:00:00Z'), value: 2000 },
      ]
    });

    // Create snapshots for Other Brand (which the owner should not see!)
    await prisma.socialAccountMetricSnapshot.create({
      data: { socialAccountId: otherAccountId, metricName: 'reach', period: 'day', endTime: new Date('2026-09-24T00:00:00Z'), value: 9999 }
    });
  });

  after(async () => {
    server.close();
    await cleanDb();
    await prisma.$disconnect();
  });

  test('authenticated authorized user can retrieve their brand\'s account metrics and calculate interactionRate', async () => {
    const res = await fetch(`${baseUrl}/${brandId}/account-metrics`, {
      headers: { 'Cookie': `token=${ownerToken}` }
    });
    const { success, data } = await res.json();
    assert.equal(success, true);
    
    const reachDay1 = data.find(d => d.metricName === 'reach' && d.endTime === '2026-09-24T00:00:00.000Z' && d.breakdownDefinition === 'none');
    assert.ok(reachDay1);
    assert.equal(reachDay1.value, 1000);

    const interactionRateDay1 = data.find(d => d.metricName === 'interactionRate' && d.endTime === '2026-09-24T00:00:00.000Z' && d.breakdownDefinition === 'none');
    assert.ok(interactionRateDay1);
    // likes(50)+comments(10)+saves(5)+shares(5) = 70. 70 / 1000 = 0.07
    assert.equal(interactionRateDay1.value, 0.07);

    // Ensure cross-date summation didn't occur
    const reachDay2 = data.find(d => d.metricName === 'reach' && d.endTime === '2026-09-25T00:00:00.000Z' && d.breakdownDefinition === 'none');
    assert.ok(reachDay2);
    assert.equal(reachDay2.value, 2000);
  });

  test('unauthorized user cannot retrieve another brand\'s metrics', async () => {
    const res = await fetch(`${baseUrl}/${otherBrandId}/account-metrics`, {
      headers: { 'Cookie': `token=${ownerToken}` }
    });
    // requireBrandAccess will reject this
    assert.equal(res.status, 403);
  });

  test('metric filter works and retrieves derived metric securely', async () => {
    const res = await fetch(`${baseUrl}/${brandId}/account-metrics?metric=interactionRate`, {
      headers: { 'Cookie': `token=${ownerToken}` }
    });
    const { success, data } = await res.json();
    assert.equal(success, true);
    assert.ok(data.length > 0);
    assert.ok(data.every(d => d.metricName === 'interactionRate'));
  });

  test('period filter works', async () => {
    const res = await fetch(`${baseUrl}/${brandId}/account-metrics?period=day`, {
      headers: { 'Cookie': `token=${ownerToken}` }
    });
    const { success, data } = await res.json();
    assert.equal(success, true);
    assert.ok(data.every(d => d.period === 'day'));
  });
  
  test('breakdown filter works', async () => {
    const res = await fetch(`${baseUrl}/${brandId}/account-metrics?breakdown=media_product_type`, {
      headers: { 'Cookie': `token=${ownerToken}` }
    });
    const { success, data } = await res.json();
    assert.equal(success, true);
    assert.ok(data.every(d => d.breakdownDefinition === 'media_product_type'));
  });

  test('since/until filter works using endTime', async () => {
    const res = await fetch(`${baseUrl}/${brandId}/account-metrics?since=2026-09-25T00:00:00Z`, {
      headers: { 'Cookie': `token=${ownerToken}` }
    });
    const { success, data } = await res.json();
    assert.equal(success, true);
    assert.ok(data.every(d => new Date(d.endTime) >= new Date('2026-09-25T00:00:00Z')));
  });

  test('empty result returns normal empty list without crashing', async () => {
    const res = await fetch(`${baseUrl}/${brandId}/account-metrics?metric=unknown`, {
      headers: { 'Cookie': `token=${ownerToken}` }
    });
    const { success, data } = await res.json();
    assert.equal(success, true);
    assert.deepEqual(data, []);
  });

  test('credentials/tokens are never present in response', async () => {
    const res = await fetch(`${baseUrl}/${brandId}/account-metrics`, {
      headers: { 'Cookie': `token=${ownerToken}` }
    });
    const text = await res.text();
    assert.equal(text.includes('encryptedToken'), false);
    assert.equal(text.includes('credentialId'), false);
    assert.equal(text.includes('accessToken'), false);
  });
});
