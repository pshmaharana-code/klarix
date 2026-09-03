import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const STATE_TTL_MS = 10 * 60 * 1000;

export async function createOAuthState({ brandId, userId }) {
  const id = crypto.randomBytes(32).toString('base64url');
  await prisma.oauthState.create({
    data: { id, brandId, userId, expiresAt: new Date(Date.now() + STATE_TTL_MS) }
  });
  return id;
}

export async function consumeOAuthState({ state, brandId, userId }) {
  if (typeof state !== 'string' || state.length < 32) return false;

  const claim = await prisma.oauthState.updateMany({
    where: {
      id: state,
      brandId,
      userId,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    data: { usedAt: new Date() }
  });
  return claim.count === 1;
}
