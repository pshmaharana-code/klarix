import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireBrandAccess } from '../../middleware/brandContext.js';

const prisma = new PrismaClient();
const brandMemoryRouter = express.Router({ mergeParams: true });

// GET /api/v2/brands/:brandId/memory
// Fetch all active strategic rules for the brand
brandMemoryRouter.get('/', requireBrandAccess, async (req, res) => {
    try {
        const memories = await prisma.brandMemoryEntry.findMany({
            where: {
                brandId: req.brand.id,
                status: 'ACTIVE'
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({ success: true, data: { memories } });
    } catch (error) {
        console.error('[Memory Route] Get error:', error);
        return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Error retrieving brand memory' });
    }
});

// DELETE /api/v2/brands/:brandId/memory/:memoryId
// Revoke a specific memory
brandMemoryRouter.delete('/:memoryId', requireBrandAccess, async (req, res) => {
    try {
        const { memoryId } = req.params;

        // Verify the memory exists and belongs to this brand
        const existing = await prisma.brandMemoryEntry.findUnique({
            where: { id: memoryId }
        });

        if (!existing || existing.brandId !== req.brand.id) {
            return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Memory not found' });
        }

        // Hard delete the memory to remove it from future strategy generation
        await prisma.brandMemoryEntry.delete({
            where: { id: memoryId }
        });

        return res.status(200).json({ success: true, message: 'Memory revoked successfully' });
    } catch (error) {
        console.error('[Memory Route] Delete error:', error);
        return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Error deleting memory' });
    }
});

export { brandMemoryRouter };