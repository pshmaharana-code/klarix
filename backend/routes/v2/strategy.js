import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireBrandAccess } from '../../middleware/brandContext.js';
import { createAndEnqueueJob } from '../../jobs/jobService.js';

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

// GET /api/v2/brands/:brandId/strategy
router.get('/', requireBrandAccess, async (req, res) => {
    try {
        const brandId = req.brand.id;

        const strategy = await prisma.strategy.findFirst({
            where: { brandId },
            orderBy: { version: 'desc' }
        });

        if (!strategy) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'No strategy found' }
            });
        }

        res.status(200).json({ success: true, data: { strategy } });
    } catch (error) {
        console.error('[API] Error fetching strategy:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch strategy' }
        });
    }
});

// GET /api/v2/brands/:brandId/strategy/:strategyId/ideas
router.get('/:strategyId/ideas', requireBrandAccess, async (req, res) => {
    try {
        const brandId = req.brand.id;
        const { strategyId } = req.params;

        // Verify the strategy belongs to this brand
        const strategy = await prisma.strategy.findFirst({
            where: { id: strategyId, brandId }
        });

        if (!strategy) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Strategy not found for this brand' }
            });
        }

        const ideas = await prisma.contentIdea.findMany({
            where: { brandId, strategyId: strategy.id },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ success: true, data: { ideas } });
    } catch (error) {
        console.error('[API] Error fetching ideas:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch strategy ideas' }
        });
    }
});

// POST /api/v2/brands/:brandId/strategy/generate
router.post('/generate', requireBrandAccess, async (req, res) => {
    try {
        const brandId = req.brand.id;

        const job = await createAndEnqueueJob({
            brandId,
            type: 'GENERATE_STRATEGY',
            parentJobId: null,
            idempotencyKey: `strategy:${brandId}:${Date.now()}`,
            input: {}
        });

        res.status(202).json({
            success: true,
            data: { job: { id: job.id, type: job.type, state: job.state, progress: { percent: job.progressPercent } } }
        });
    } catch (error) {
        console.error('[API] Error generating strategy:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to enqueue strategy generation' }
        });
    }
});

// POST /api/v2/brands/:brandId/strategy/ideas/generate
router.post('/ideas/generate', requireBrandAccess, async (req, res) => {
    try {
        const brandId = req.brand.id;
        const { strategyId, count } = req.body;

        if (!strategyId) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'strategyId is required' }
            });
        }

        // Prevent cross-brand strategy injection: verify strategyId belongs to this brand
        const strategy = await prisma.strategy.findFirst({
            where: { id: strategyId, brandId }
        });

        if (!strategy) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Strategy not found for this brand' }
            });
        }

        const safeCount = Math.min(Math.max(parseInt(count, 10) || 3, 1), 10);

        const job = await createAndEnqueueJob({
            brandId,
            type: 'GENERATE_CONTENT_IDEAS',
            parentJobId: null,
            idempotencyKey: `ideas:${strategy.id}:${Date.now()}`,
            input: { strategyId: strategy.id, count: safeCount }
        });

        res.status(202).json({
            success: true,
            data: { job: { id: job.id, type: job.type, state: job.state } }
        });
    } catch (error) {
        console.error('[API] Error generating ideas:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to enqueue idea generation' }
        });
    }
});

export default router;