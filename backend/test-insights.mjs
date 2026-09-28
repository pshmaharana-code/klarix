import { PrismaClient } from '@prisma/client';
import * as cryptoLib from './lib/crypto.js';
import * as metaAdapter from './integrations/metaAdapter.js';

const p = new PrismaClient();

async function run() {
  const account = await p.socialAccount.findUnique({ where: { id: '9afc6d27-ee1b-4f25-acbd-4a1a472888f6' } });
  const token = cryptoLib.decrypt(account.encryptedToken);
  
  const res = await metaAdapter.fetchAccountInsights(token, account.externalAccountId, {
    metric: 'reach',
    period: 'day',
    breakdown: 'media_product_type'
  });
  
  console.dir(res, { depth: null });
}

run().finally(() => p.$disconnect());
