import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { requireBrandAccess } from '../../middleware/brandContext.js';
import * as accountMetricsService from '../../services/accountMetricsService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all brands for the current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      where: {
        OR: [
          { ownerUserId: req.user.id },
          { members: { some: { userId: req.user.id } } }
        ]
      },
      include: {
        socialAccounts: {
          select: { id: true, platform: true, username: true, connectionStatus: true, lastSync: true }
        }
      }
    });
    res.status(200).json({ success: true, data: { brands } });
  } catch (error) {
    console.error('[Klarix API] Fetch Brands Error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Could not fetch brands' });
  }
});

// Create a new brand
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, positioning, audience, goals, voiceStyleInputs } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Brand name is required' });
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        ownerUserId: req.user.id,
        positioning,
        audience,
        goals,
        voiceStyleInputs
      }
    });

    res.status(201).json({ success: true, data: { brand } });
  } catch (error) {
    console.error('[Klarix API] Create Brand Error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Could not create brand' });
  }
});

// Get specific brand detail (uses requireBrandAccess middleware)
router.get('/:brandId', requireAuth, requireBrandAccess, async (req, res) => {
  try {
    const brand = await prisma.brand.findUnique({
      where: { id: req.brand.id },
      include: {
        socialAccounts: {
          select: { id: true, platform: true, username: true, connectionStatus: true, lastSync: true }
        }
      }
    });
    res.status(200).json({ success: true, data: { brand } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Could not fetch brand details' });
  }
});

// Get account-level metrics for a brand
router.get('/:brandId/account-metrics', requireAuth, requireBrandAccess, async (req, res) => {
  try {
    const { metric, period, breakdown, since, until } = req.query;

    const data = await accountMetricsService.getAccountMetrics(req.brand.id, {
      metric,
      period,
      breakdown,
      since: since ? new Date(since) : undefined,
      until: until ? new Date(until) : undefined
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Klarix API] Account Metrics Error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Could not fetch account metrics' });
  }
});

export default router;
