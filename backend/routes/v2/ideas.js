import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { createAndEnqueueJob } from '../../jobs/jobService.js';

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

const ALLOWED_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED', 'PUBLISHED', 'DISCARDED'];

// Helper: Verify that the logged-in user owns or is a member of the idea's brand
async function getAuthorizedIdea(ideaId, userId) {
    if (!ideaId || !userId) return null;

    return prisma.contentIdea.findFirst({
        where: {
            id: ideaId,
            brand: {
                OR: [
                    { ownerUserId: userId },
                    { members: { some: { userId } } }
                ]
            }
        }
    });
}

// DELETE /api/v2/ideas/:ideaId
router.delete('/:ideaId', requireAuth, async (req, res) => {
    try {
        const { ideaId } = req.params;

        const idea = await getAuthorizedIdea(ideaId, req.user.id);
        if (!idea) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Content Idea not found' }
            });
        }

        await prisma.contentIdea.delete({
            where: { id: idea.id }
        });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[API] Error deleting idea:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to delete content idea' }
        });
    }
});

// PATCH /api/v2/ideas/:ideaId/status
router.patch('/:ideaId/status', requireAuth, async (req, res) => {
    try {
        const { ideaId } = req.params;
        const { status } = req.body;

        if (!status || !ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid status value' }
            });
        }

        const idea = await getAuthorizedIdea(ideaId, req.user.id);
        if (!idea) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Content Idea not found' }
            });
        }

        const updatedIdea = await prisma.contentIdea.update({
            where: { id: idea.id },
            data: { status }
        });

        res.status(200).json({ success: true, data: { idea: updatedIdea } });
    } catch (error) {
        console.error('[API] Error updating idea status:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to update idea status' }
        });
    }
});

// GET /api/v2/ideas/:ideaId/scripts
router.get('/:ideaId/scripts', requireAuth, async (req, res) => {
    try {
        const { ideaId } = req.params;

        const idea = await getAuthorizedIdea(ideaId, req.user.id);
        if (!idea) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Content Idea not found' }
            });
        }

        const scripts = await prisma.script.findMany({
            where: { contentIdeaId: idea.id },
            orderBy: { version: 'desc' }
        });

        res.status(200).json({ success: true, data: { scripts } });
    } catch (error) {
        console.error('[API] Error fetching scripts:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch scripts' }
        });
    }
});

// POST /api/v2/ideas/:ideaId/scripts/generate
router.post('/:ideaId/scripts/generate', requireAuth, async (req, res) => {
    try {
        const { ideaId } = req.params;
        const { instruction } = req.body;

        const idea = await getAuthorizedIdea(ideaId, req.user.id);
        if (!idea) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Content Idea not found' }
            });
        }

        const job = await createAndEnqueueJob({
            brandId: idea.brandId,
            type: 'GENERATE_SCRIPT',
            parentJobId: null,
            idempotencyKey: `script:${idea.id}:${Date.now()}`,
            input: { contentIdeaId: idea.id, instruction }
        });

        res.status(202).json({
            success: true,
            data: { job: { id: job.id, type: job.type, state: job.state } }
        });
    } catch (error) {
        console.error('[API] Error generating script:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to enqueue script generation' }
        });
    }
});

export default router;