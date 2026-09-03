import express from 'express';
const router = express.Router({ mergeParams: true });
import { requireBrandAccess } from '../../middleware/brandContext.js';
import { createAndEnqueueJob } from '../../jobs/jobService.js';
import * as metaAdapter from '../../integrations/metaAdapter.js';
import * as cryptoLib from '../../lib/crypto.js';
import { createOAuthState, consumeOAuthState } from '../../services/oauthStateService.js';
import { PrismaClient } from '@prisma/client';
import { toPublicJob } from '../../lib/publicJob.js';

const prisma = new PrismaClient();

// GET /api/v2/brands/:brandId/social-accounts/instagram/auth-url
router.get('/social-accounts/instagram/auth-url', requireBrandAccess, async (req, res, next) => {
  const { brandId } = req.params;
  try {
    const state = await createOAuthState({ brandId, userId: req.user.id });
    const url = metaAdapter.generateAuthUrl(state);
    res.json({ success: true, data: { url } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v2/brands/:brandId/sync
// Receives the OAuth code and kicks off the background job to exchange it and sync the account
router.post('/sync', requireBrandAccess, async (req, res) => {
  const { brandId } = req.params;
  const { idempotencyKey, code, state } = req.body;

  if (!idempotencyKey) {
    return res.status(400).json({ success: false, error: 'idempotencyKey is required' });
  }
  if (!code) {
    return res.status(400).json({ success: false, error: 'OAuth code is required' });
  }
  if (!await consumeOAuthState({ state, brandId, userId: req.user.id })) {
    return res.status(400).json({ success: false, error: 'OAUTH_STATE_INVALID' });
  }

  try {
    // Exchange immediately after state validation: the authorization code is never
    // written to the durable job or returned by an API.
    const { accessToken, expiresIn } = await metaAdapter.exchangeCodeForToken(code);
    const credential = await prisma.oauthCredential.create({
      data: {
        encryptedToken: cryptoLib.encrypt(accessToken),
        expiresAt: new Date(Date.now() + Math.min(expiresIn, 15 * 60) * 1000)
      }
    });
    const job = await createAndEnqueueJob({
      brandId,
      type: 'SYNC_ACCOUNT',
      idempotencyKey,
      input: { credentialId: credential.id }
    });

    res.status(202).json({
      success: true,
      data: { job: toPublicJob(job) }
    });
  } catch (error) {
    if (error.message === 'QUEUE_UNAVAILABLE') {
      return res.status(503).json({ success: false, error: 'Queue service unavailable. Please try again later.' });
    }
    console.error('[Sync Route] Error:', error.name);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
