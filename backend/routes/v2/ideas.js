import express from 'express';
import { createAndEnqueueJob } from '../../jobs/jobService.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

// GET /api/v2/ideas/:ideaId/scripts
// Fetches all scripts generated for a specific idea
router.get('/:ideaId/scripts', async (req, res) => {
    try {
        const { ideaId } = req.params;

        const scripts = await prisma.script.findMany({
            where: { contentIdeaId: ideaId },
            orderBy: { version: 'desc' } // Gets the newest regenerated version first
        });

        res.status(200).json({ data: { scripts } });
    } catch (error) {
        console.error('[API] Error fetching scripts:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
});

// POST /api/v2/ideas/:ideaId/scripts/generate
router.post('/:ideaId/scripts/generate', async (req, res) => {
    try {
        const { ideaId } = req.params;
        const { instruction } = req.body;

        const idea = await prisma.contentIdea.findUnique({ where: { id: ideaId } });
        if (!idea) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Content Idea not found' } });
        }

        const job = await createAndEnqueueJob({
            brandId: idea.brandId,
            type: 'GENERATE_SCRIPT',
            parentJobId: null,
            idempotencyKey: `script:${ideaId}:${Date.now()}`,
            input: { contentIdeaId: ideaId, instruction }
        });

        res.status(202).json({
            data: { job: { id: job.id, type: job.type, state: job.state } }
        });
    } catch (error) {
        console.error('[API] Error generating script:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
});

export default router;