import express from 'express';
const router = express.Router({ mergeParams: true });
import { requireBrandAccess } from '../../middleware/brandContext.js';
import { getJob, cancelJob } from '../../jobs/jobService.js';
import { toPublicJob } from '../../lib/publicJob.js';

// GET /api/v2/brands/:brandId/jobs/:jobId
router.get('/:jobId', requireBrandAccess, async (req, res) => {
  const { brandId, jobId } = req.params;

  try {
    const job = await getJob(brandId, jobId);
    
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({
      success: true,
      data: { job: toPublicJob(job) }
    });
  } catch (error) {
    console.error('[Jobs Route] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/v2/brands/:brandId/jobs/:jobId/cancel  (§20.2)
// Only cancels jobs in CREATED or QUEUED state; returns 409 otherwise.
// The conditional updateMany in cancelJob atomically races the worker's
// QUEUED → PROCESSING claim so there is no window for double-processing.
router.post('/:jobId/cancel', requireBrandAccess, async (req, res) => {
  const { brandId, jobId } = req.params;
  try {
    const job = await cancelJob(brandId, jobId);
    if (!job) {
      // Job doesn't exist, belongs to another brand, or is not in a
      // cancellable state (PROCESSING / COMPLETED / FAILED / CANCELLED).
      return res.status(409).json({ success: false, error: 'CONFLICT', message: 'Job cannot be cancelled in its current state' });
    }
    res.json({ success: true, data: { job: toPublicJob(job) } });
  } catch (error) {
    console.error('[Jobs Route] Cancel error:', error.name);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

export default router;
