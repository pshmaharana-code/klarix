process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/klarix_test?schema=public';
process.env.JWT_SECRET = 'a-test-secret-that-is-long-enough-for-production';
process.env.META_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

import { test, suite, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { Queue } from 'bullmq';

const { PrismaClient } = await import('@prisma/client');
const connectionsRouter = (await import('../routes/v2/connections.js')).default;
const { loadConfig } = await import('../lib/config.js');
const cryptoLib = await import('../lib/crypto.js');
const { requireBrandAccess } = await import('../middleware/brandContext.js');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: req.headers['x-user-id'] };
  next();
});

app.use('/api/v2/brands/:brandId', requireBrandAccess, connectionsRouter);

const prisma = new PrismaClient();
const config = loadConfig();
let queue;
let server;
let baseUrl;

suite('Manual Sync API', () => {
  let user1, user2;
  let brand1, brand2;
  let account1, account2;

  before(async () => {
    try {
      await prisma.jobLog.deleteMany();
      await prisma.job.deleteMany();
      await prisma.oAuthCredential.deleteMany();
      await prisma.contentMetricSnapshot.deleteMany();
      await prisma.contentMedia.deleteMany();
      await prisma.content.deleteMany();
      await prisma.socialAccount.deleteMany();
      await prisma.brandMember.deleteMany();
      await prisma.brand.deleteMany();
      await prisma.user.deleteMany();

      queue = new Queue('klarix-sync', {
        connection: {
          host: new URL(config.redisUrl).hostname,
          port: Number(new URL(config.redisUrl).port || 6379)
        }
      });

      user1 = await prisma.user.create({ data: { email: 'u1@test.com', password: 'hash' } });
      user2 = await prisma.user.create({ data: { email: 'u2@test.com', password: 'hash' } });

      brand1 = await prisma.brand.create({ data: { name: 'Brand 1', onboardingStatus: 'COMPLETED', owner: { connect: { id: user1.id } } } });
      brand2 = await prisma.brand.create({ data: { name: 'Brand 2', onboardingStatus: 'COMPLETED', owner: { connect: { id: user2.id } } } });

      await prisma.brandMember.create({ data: { userId: user1.id, brandId: brand1.id, role: 'OWNER' } });
      await prisma.brandMember.create({ data: { userId: user2.id, brandId: brand2.id, role: 'OWNER' } });

      account1 = await prisma.socialAccount.create({
        data: {
          brandId: brand1.id,
          platform: 'INSTAGRAM',
          externalAccountId: 'ext_a1',
          username: 'acc1',
          encryptedToken: cryptoLib.encrypt('fake-token-1')
        }
      });

      account2 = await prisma.socialAccount.create({
        data: {
          brandId: brand2.id,
          platform: 'INSTAGRAM',
          externalAccountId: 'ext_a2',
          username: 'acc2',
          encryptedToken: cryptoLib.encrypt('fake-token-2')
        }
      });

      await new Promise(resolve => {
        server = app.listen(0, () => {
          baseUrl = `http://localhost:${server.address().port}`;
          resolve();
        });
      });
    } catch (err) {
      console.error('ERROR IN BEFORE HOOK:', err);
      throw err;
    }
  });

  after(async () => {
    server.close();
    await queue.close();
    await prisma.$disconnect();
  });

  test('Valid manual sync request enqueues job (A & C)', async () => {
    try {
      const res = await fetch(`${baseUrl}/api/v2/brands/${brand1.id}/social-accounts/${account1.id}/sync`, {
        method: 'POST',
        headers: { 'x-user-id': user1.id, 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: 'sync-1' })
      });
      
      assert.strictEqual(res.status, 202);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.data.job.id);
      assert.strictEqual(body.data.job.type, 'SYNC_ACCOUNT');

      const dbJob = await prisma.job.findUnique({ where: { id: body.data.job.id } });
      assert.ok(dbJob);
      assert.strictEqual(dbJob.brandId, brand1.id);
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  test('Cannot sync a brand you do not have access to (B)', async () => {
    const res = await fetch(`${baseUrl}/api/v2/brands/${brand2.id}/social-accounts/${account2.id}/sync`, {
      method: 'POST',
      headers: { 'x-user-id': user1.id, 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotencyKey: 'sync-2' })
    });
    
    assert.strictEqual(res.status, 403);
  });

  test('Cannot sync a social account that belongs to another brand', async () => {
    const res = await fetch(`${baseUrl}/api/v2/brands/${brand1.id}/social-accounts/${account2.id}/sync`, {
      method: 'POST',
      headers: { 'x-user-id': user1.id, 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotencyKey: 'sync-3' })
    });
    
    assert.strictEqual(res.status, 404);
  });

  test('Duplicate protection (D)', async () => {
    const res1 = await fetch(`${baseUrl}/api/v2/brands/${brand1.id}/social-accounts/${account1.id}/sync`, {
      method: 'POST',
      headers: { 'x-user-id': user1.id, 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotencyKey: 'sync-dup' })
    });
    
    assert.strictEqual(res1.status, 202);
    const body1 = await res1.json();

    const res2 = await fetch(`${baseUrl}/api/v2/brands/${brand1.id}/social-accounts/${account1.id}/sync`, {
      method: 'POST',
      headers: { 'x-user-id': user1.id, 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotencyKey: 'sync-dup' })
    });
    
    assert.strictEqual(res2.status, 202);
    const body2 = await res2.json();
    assert.strictEqual(body1.data.job.id, body2.data.job.id);
  });
});
