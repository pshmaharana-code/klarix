import express from 'express';
const router = express.Router({ mergeParams: true });
import { requireBrandAccess } from '../../middleware/brandContext.js';
import { createAndEnqueueJob } from '../../jobs/jobService.js';
import * as metaAdapter from '../../integrations/metaAdapter.js';

// GET /api/v2/brands/:brandId/social-accounts/instagram/auth-url
router.get('/social-accounts/instagram/auth-url', requireBrandAccess, (req, res) => {
  const { brandId } = req.params;
  const url = metaAdapter.generateAuthUrl(brandId);
  res.json({ success: true, data: { url } });
});

// POST /api/v2/brands/:brandId/sync
// Receives the OAuth code and kicks off the background job to exchange it and sync the account
router.post('/sync', requireBrandAccess, async (req, res) => {
  const { brandId } = req.params;
  const { idempotencyKey, code } = req.body;

  if (!idempotencyKey) {
    return res.status(400).json({ success: false, error: 'idempotencyKey is required' });
  }
  if (!code) {
    return res.status(400).json({ success: false, error: 'OAuth code is required' });
  }

  try {
    const job = await createAndEnqueueJob({
      brandId,
      type: 'SYNC_ACCOUNT',
      idempotencyKey,
      input: { code }
    });

    res.status(202).json({
      success: true,
      data: { job }
    });
  } catch (error) {
    if (error.message === 'QUEUE_UNAVAILABLE') {
      return res.status(503).json({ success: false, error: 'Queue service unavailable. Please try again later.' });
    }
    console.error('[Sync Route] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
