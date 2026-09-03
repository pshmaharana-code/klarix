import express from 'express';
const router = express.Router({ mergeParams: true });
import { requireBrandAccess } from '../../middleware/brandContext.js';
import { getJob } from '../../jobs/jobService.js';
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

export default router;
