import express from 'express';
import { createAndEnqueueJob } from '../../jobs/jobService.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

// GET /api/v2/brands/:brandId/strategy
// Fetches the latest generated strategy for the brand
router.get('/', async (req, res) => {
    try {
        const { brandId } = req.params;

        const strategy = await prisma.strategy.findFirst({
            where: { brandId },
            orderBy: { version: 'desc' } // Always get the most recent version
        });

        if (!strategy) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No strategy found' } });
        }

        res.status(200).json({ data: { strategy } });
    } catch (error) {
        console.error('[API] Error fetching strategy:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
});

// GET /api/v2/brands/:brandId/strategy/:strategyId/ideas
// Fetches all content ideas linked to a specific strategy
router.get('/:strategyId/ideas', async (req, res) => {
    try {
        const { brandId, strategyId } = req.params;

        const ideas = await prisma.contentIdea.findMany({
            where: { brandId, strategyId },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ data: { ideas } });
    } catch (error) {
        console.error('[API] Error fetching ideas:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
});

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
            data: { job: { id: job.id, type: job.type, state: job.state, progress: { percent: job.progressPercent } } }
        });
    } catch (error) {
        console.error('[API] Error generating strategy:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
});

// POST /api/v2/brands/:brandId/strategy/ideas/generate
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