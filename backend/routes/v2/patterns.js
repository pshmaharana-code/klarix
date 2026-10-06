import express from 'express';
import { z } from 'zod';
import { requireBrandAccess } from '../../middleware/brandContext.js';
import { createAndEnqueueJob } from '../../jobs/jobService.js';
import { toPublicJob } from '../../lib/publicJob.js';
import {
  getPatternCatalogueVersion,
  getPatternDiscoverySummary,
  getPatternDetail,
  listPatterns
} from '../../services/patternService.js';

const brandPatternsRouter = express.Router({ mergeParams: true });
const patternDetailRouter = express.Router({ mergeParams: true });

const listQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'SUPERSEDED']).default('ACTIVE'),
  category: z.string().trim().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

const discoverBodySchema = z.object({
  force: z.boolean().default(false)
});

// GET /api/v2/brands/:brandId/patterns
brandPatternsRouter.get('/', requireBrandAccess, async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      details: parsed.error.flatten()
    });
  }

  try {
    const items = await listPatterns(req.brand.id, parsed.data);
    return res.json({ success: true, data: { items } });
  } catch (error) {
    console.error('[Patterns Route] List error:', error.name);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Error retrieving patterns' });
  }
});

// POST /api/v2/brands/:brandId/patterns/discover
brandPatternsRouter.post('/discover', requireBrandAccess, async (req, res) => {
  const parsed = discoverBodySchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      details: parsed.error.flatten()
    });
  }

  const idempotencyHeader = req.get('Idempotency-Key');
  if (!idempotencyHeader || idempotencyHeader.length > 200) {
    return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Idempotency-Key header is required' });
  }

  try {
    const summary = await getPatternDiscoverySummary(req.brand.id);
    if (summary.status === 'INSUFFICIENT_DATA') {
      return res.status(422).json({
        success: false,
        error: 'INSUFFICIENT_DATA',
        message: 'Pattern discovery needs at least 10 analysed content items with derived interaction metrics.',
        data: summary
      });
    }

    const catalogueVersion = await getPatternCatalogueVersion(req.brand.id);
    const job = await createAndEnqueueJob({
      brandId: req.brand.id,
      type: 'DISCOVER_PATTERNS',
      idempotencyKey: `patterns:${req.brand.id}:${catalogueVersion}`,
      input: {
        force: parsed.data.force,
        catalogueVersion,
        requestIdempotencyKey: idempotencyHeader
      }
    });

    return res.status(202).json({ success: true, data: { job: toPublicJob(job) } });
  } catch (error) {
    console.error('[Patterns Route] Discovery error:', error.name);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Error starting pattern discovery' });
  }
});

// GET /api/v2/patterns/:patternId
patternDetailRouter.get('/:patternId', async (req, res) => {
  try {
    const result = await getPatternDetail(req.params.patternId, req.user.id);
    if (!result || result.evidence.length < 1) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Pattern not found' });
    }

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Patterns Route] Detail error:', error.name);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Error retrieving pattern' });
  }
});

export { brandPatternsRouter, patternDetailRouter };
