import express from 'express';
import { requireBrandAccess } from '../../middleware/brandContext.js';
import * as contentRepository from '../../repositories/contentRepository.js';
import { PrismaClient } from '@prisma/client';

const brandContentRouter = express.Router({ mergeParams: true });
const globalContentRouter = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

function sanitizeMedia(media) {
  if (!media) return media;
  if (Array.isArray(media)) return media.map(sanitizeMedia);
  const { id, type, sourceUrl, thumbnailUrl, width, height, durationMs, createdAt } = media;
  return { id, type, sourceUrl, thumbnailUrl, width, height, durationMs, createdAt };
}

function sanitizeMetricSnapshot(snap) {
  if (!snap) return snap;
  if (Array.isArray(snap)) return snap.map(sanitizeMetricSnapshot);
  const { id, observedAt, reach, impressions, plays, likes, comments, saves, shares, totalInteractions, igReelsAvgWatchTime, igReelsVideoViewTotalTime, reelsSkipRate } = snap;
  return { id, observedAt, reach, impressions, plays, likes, comments, saves, shares, totalInteractions, igReelsAvgWatchTime, igReelsVideoViewTotalTime, reelsSkipRate };
}

function sanitizeAnalysis(analysis) {
  if (!analysis) return analysis;
  if (Array.isArray(analysis)) return analysis.map(sanitizeAnalysis);
  const { id, version, status, visualFindings, contentFindings, perfFindings, confidence, providerMeta, completedAt, createdAt } = analysis;
  return { id, version, status, visualFindings, contentFindings, perfFindings, confidence, providerMeta, completedAt, createdAt };
}

function sanitizeContent(c) {
  return {
    id: c.id,
    type: c.type,
    caption: c.caption,
    transcript: c.transcript,
    permalink: c.permalink,
    publishedAt: c.publishedAt,
    analysisStatus: c.analysisStatus,
    media: sanitizeMedia(c.media),
    metricSnapshots: sanitizeMetricSnapshot(c.metricSnapshots),
    analyses: sanitizeAnalysis(c.analyses)
  };
}

// GET /api/v2/brands/:brandId/content
brandContentRouter.get('/', requireBrandAccess, async (req, res) => {
  try {
    const brandId = req.brand.id;
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit <= 0 || limit > 100) limit = 20;

    const afterId = req.query.afterId || null;
    let afterPublishedAt = undefined;
    if (req.query.afterPublishedAt !== undefined) {
      afterPublishedAt = req.query.afterPublishedAt === 'null' ? null : new Date(req.query.afterPublishedAt);
    }
    
    const type = req.query.type || null;
    const analysisStatus = req.query.analysisStatus || null;
    
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    // Fetch limit + 1 to know if there's a next page
    const items = await contentRepository.findContentByBrand({
      brandId,
      limit: limit + 1,
      afterId,
      afterPublishedAt,
      type,
      analysisStatus,
      from,
      to
    });

    const hasMore = items.length > limit;
    const results = hasMore ? items.slice(0, limit) : items;

    let nextCursor = null;
    if (hasMore) {
      const lastItem = results[results.length - 1];
      nextCursor = {
        afterId: lastItem.id,
        afterPublishedAt: lastItem.publishedAt ? lastItem.publishedAt.toISOString() : 'null'
      };
    }

    return res.json({
      success: true,
      data: results.map(sanitizeContent),
      pagination: {
        hasMore,
        nextCursor
      }
    });
  } catch (error) {
    console.error('[Klarix API] Content catalogue error:', error);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Error retrieving content' });
  }
});

// GET /api/v2/content/:contentId
globalContentRouter.get('/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Must be authenticated' });
    }

    const content = await contentRepository.findContentById(contentId);
    if (!content) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Content not found' });
    }
    
    const brand = await prisma.brand.findFirst({
      where: {
        id: content.brandId,
        OR: [
          { ownerUserId: req.user.id },
          { members: { some: { userId: req.user.id } } }
        ]
      }
    });

    if (!brand) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Content not found' });
    }

    const result = {
      ...sanitizeContent(content),
      brandId: content.brandId,
      socialAccountId: content.socialAccountId
    };

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Klarix API] Content detail error:', error);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Error retrieving content detail' });
  }
});

import { createAndEnqueueJob } from '../../jobs/jobService.js';

// POST /api/v2/content/:contentId/analyze
globalContentRouter.post('/:contentId/analyze', async (req, res) => {
  try {
    const { contentId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Must be authenticated' });
    }

    const content = await contentRepository.findContentById(contentId);
    if (!content) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Content not found' });
    }
    
    const brand = await prisma.brand.findFirst({
      where: {
        id: content.brandId,
        OR: [
          { ownerUserId: req.user.id },
          { members: { some: { userId: req.user.id } } }
        ]
      }
    });

    if (!brand) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Content not found' });
    }

    // Check for an active job to prevent concurrent duplicates
    const activeJob = await prisma.job.findFirst({
      where: {
        type: 'ANALYZE_CONTENT',
        brandId: brand.id,
        state: { in: ['CREATED', 'QUEUED', 'PROCESSING', 'RETRY_PENDING'] },
        idempotencyKey: { startsWith: `analyze:${content.id}:1.0` }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (activeJob) {
      return res.json({ success: true, data: { jobId: activeJob.id, status: activeJob.state } });
    }

    const job = await createAndEnqueueJob({
      brandId: brand.id,
      type: 'ANALYZE_CONTENT',
      parentJobId: null, // manual invocation has no parent
      idempotencyKey: `analyze:${content.id}:1.0:${Date.now()}`,
      input: { contentId: content.id }
    });

    return res.json({ success: true, data: { jobId: job.id, status: job.state } });
  } catch (error) {
    console.error('[Klarix API] Enqueue analysis error:', error);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Error enqueuing analysis' });
  }
});

export { brandContentRouter, globalContentRouter };
