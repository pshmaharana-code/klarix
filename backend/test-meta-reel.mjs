import { PrismaClient } from '@prisma/client';
import * as cryptoLib from './lib/crypto.js';
import * as metaAdapter from './integrations/metaAdapter.js';

const p = new PrismaClient();

async function run() {
  const account = await p.socialAccount.findUnique({ where: { id: '9afc6d27-ee1b-4f25-acbd-4a1a472888f6' } });
  const token = cryptoLib.decrypt(account.encryptedToken);
  
  // Fetch media detail for the Reel
  // We need its externalContentId
  const content = await p.content.findUnique({ where: { id: 'fd77c4f1-f187-48e0-bb7c-0130ddf65815' } });
  console.log('Reel externalContentId:', content.externalContentId);
  
  const detail = await metaAdapter.fetchMediaDetail(token, content.externalContentId);
  console.log('Meta API detail:');
  console.log('thumbnailUrl:', detail.thumbnailUrl);
  
  // Check if it's the exact same as DB
  const media = await p.contentMedia.findFirst({ where: { contentId: content.id } });
  console.log('DB thumbnailUrl:  ', media.thumbnailUrl);
  console.log('Match?', detail.thumbnailUrl === media.thumbnailUrl);
}

run().finally(() => p.$disconnect());
