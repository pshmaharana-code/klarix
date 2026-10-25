import express from 'express';
import { createAndEnqueueJob } from '../../jobs/jobService.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

// POST /api/v2/brands/:brandId/strategy/generate
router.post('/generate', async (req, res) => {
    try {
        const { brandId } = req.params;

        const job = await createAndEnqueueJob({
            brandId,
            type: 'GENERATE_STRATEGY',
            parentJobId: null,
            idempotencyKey: `strategy:${brandId}:${Date.now()}`,
            input: {}
        });

        res.status(202).json({
            data: {
                job: { id: job.id, type: job.type, state: job.state, progress: { percent: job.progressPercent } }
            }
        });
    } catch (error) {
        console.error('[API] Error generating strategy:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
});

// POST /api/v2/brands/:brandId/ideas/generate
router.post('/ideas/generate', async (req, res) => {
    try {
        const { brandId } = req.params;
        const { strategyId, count } = req.body;

        if (!strategyId) {
            return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'strategyId is required' } });
        }

        const job = await createAndEnqueueJob({
            brandId,
            type: 'GENERATE_CONTENT_IDEAS',
            parentJobId: null,
            idempotencyKey: `ideas:${strategyId}:${Date.now()}`,
            input: { strategyId, count: count || 3 }
        });

        res.status(202).json({
            data: { job: { id: job.id, type: job.type, state: job.state } }
        });
    } catch (error) {
        console.error('[API] Error generating ideas:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
});

export default router;