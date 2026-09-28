import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

// Copy cryptoLib decrypt
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
function decrypt(text) {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const p = new PrismaClient();

async function run() {
  const account = await p.socialAccount.findUnique({ where: { id: '7c2b3ab6-b25f-4632-a50d-bc0ef37d1cf4' } });
  const token = decrypt(account.encryptedToken);
  
  const url = `https://graph.facebook.com/v21.0/${account.externalAccountId}/insights?metric=reach&period=day&breakdown=media_product_type&access_token=${token}`;
  console.log('Fetching:', url.replace(token, '<TOKEN>'));
  
  const res = await fetch(url);
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

run().finally(() => p.$disconnect());
