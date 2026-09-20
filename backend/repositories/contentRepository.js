/**
 * contentRepository.js
 *
 * Data-access layer for Phase 3 Content, ContentMedia, and
 * ContentMetricSnapshot models.  All methods work through Prisma and contain
 * no HTTP or business-workflow logic.
 *
 * Security notes
 * ──────────────
 * • sourceUrl fields are provider CDN URLs only — no OAuth tokens or
 *   Authorization headers are stored here.
 * • brandId / socialAccountId ownership is surfaced explicitly so that
 *   the API layer can perform requireBrandAccess without trusting
 *   caller-supplied brand identifiers.
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// upsertContent
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Idempotently persist a single piece of content from a social account.
 *
 * The uniqueness key is `(socialAccountId, externalContentId)`.
 * On conflict the mutable metadata fields (caption, transcript, permalink,
 * publishedAt, rawPayload) are updated, but ownership fields (brandId,
 * socialAccountId) are NEVER reassigned.
 *
 * @throws {{ code: 'CONTENT_OWNERSHIP_CONFLICT' }} if the existing Content row
 *   belongs to a different brand than the caller expects.  The caller must
 *   never silently reassign content between brands.
 *
 * @param {object} params
 * @param {string}  params.brandId
 * @param {string}  params.socialAccountId
 * @param {string}  params.externalContentId  Provider-assigned media ID
 * @param {string}  params.type               ContentType enum value
 * @param {string}  [params.caption]
 * @param {string}  [params.transcript]
 * @param {string}  [params.permalink]
 * @param {Date}    [params.publishedAt]
 * @param {object}  [params.rawPayload]       Raw provider JSON — traceability only
 * @param {string}  [params.analysisStatus]   Defaults to NOT_STARTED
 * @returns {Promise<import('@prisma/client').Content>}
 */
export async function upsertContent({
  brandId,
  socialAccountId,
  externalContentId,
  type,
  caption,
  transcript,
  permalink,
  publishedAt,
  rawPayload,
  analysisStatus = 'NOT_STARTED',
}) {
  // Check for cross-brand ownership conflict before upserting.
  // This guards against an attacker that controls one brand attempting to
  // absorb content that legitimately belongs to another brand's account.
  const existing = await prisma.content.findUnique({
    where: { socialAccountId_externalContentId: { socialAccountId, externalContentId } },
    select: { id: true, brandId: true },
  });

  if (existing && existing.brandId !== brandId) {
    const err = new Error('Content belongs to a different brand');
    err.code = 'CONTENT_OWNERSHIP_CONFLICT';
    throw err;
  }

  // Mutable metadata to update on conflict.  Ownership fields are excluded.
  const updateData = {
    caption,
    transcript,
    permalink,
    publishedAt,
    rawPayload,
  };

  // createData includes all fields (ownership is set once at creation time).
  const createData = {
    brandId,
    socialAccountId,
    externalContentId,
    type,
    analysisStatus,
    ...updateData,
  };

  return prisma.content.upsert({
    where: { socialAccountId_externalContentId: { socialAccountId, externalContentId } },
    create: createData,
    update: updateData,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// upsertMedia
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attach a media asset to a Content row.
 *
 * The Phase 3 schema has no explicit `externalMediaId` column on
 * `ContentMedia` (Gate 2 finding: this field can be added in a future
 * migration if finer-grained idempotency is needed).  The current
 * idempotency strategy uses `(contentId, mediaType, sourceUrl)` as the
 * deterministic identity:
 *
 *   • For a given content item, a specific media type with the same
 *     provider CDN URL is treated as the same asset.
 *   • If `sourceUrl` is null, the record is always inserted (not safe for
 *     idempotency, but this case should not occur in normal Meta ingestion).
 *
 * SECURITY: sourceUrl must be a CDN URL only — no OAuth credentials,
 * access tokens, or Authorization headers may be present.
 *
 * @param {object} params
 * @param {string}  params.contentId     FK → contents.id
 * @param {string}  params.mediaType     e.g. 'IMAGE', 'VIDEO'
 * @param {string}  [params.sourceUrl]   Provider CDN URL (no credentials)
 * @param {string}  [params.objectKey]   Future S3 key (null in Phase 3)
 * @param {string}  [params.sha256]
 * @param {number}  [params.width]
 * @param {number}  [params.height]
 * @param {number}  [params.durationSeconds]
 * @returns {Promise<import('@prisma/client').ContentMedia>}
 */
export async function upsertMedia({
  contentId,
  mediaType,
  sourceUrl = null,
  objectKey = null,
  sha256 = null,
  width = null,
  height = null,
  durationSeconds = null,
}) {
  // Repository-level idempotency: if we already have a media row with this
  // exact (contentId, mediaType, sourceUrl) combination, return it rather
  // than inserting a duplicate.  This is safe for Meta ingestion because
  // CDN URLs are stable per media asset within a content item.
  //
  // Note: if sourceUrl is null we always insert.  This should not occur
  // during normal Meta ingestion; if it does, the duplicate row will be
  // visible in the database for investigation.
  if (sourceUrl) {
    const existing = await prisma.contentMedia.findFirst({
      where: { contentId, mediaType, sourceUrl },
    });
    if (existing) return existing;
  }

  return prisma.contentMedia.create({
    data: {
      contentId,
      mediaType,
      sourceUrl,
      objectKey,
      sha256,
      width,
      height,
      durationSeconds,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// createMetricSnapshot
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record an immutable metric observation for a content item.
 *
 * The database uniqueness constraint `@@unique([contentId, observedAt])`
 * prevents overwriting an existing snapshot.  On conflict (i.e. the same
 * FETCH_METRICS job is retried with the same observedAt) a
 * { code: 'METRIC_SNAPSHOT_CONFLICT' } error is thrown.  The caller
 * (the processor, in a later gate) is responsible for handling retries
 * idempotently using the `metrics:<contentId>:<syncJobId>` key to
 * derive a stable `observedAt`.
 *
 * A later sync run produces a NEW observedAt so a fresh snapshot is always
 * created, even for the same content on the same calendar day.
 *
 * @param {object} params
 * @param {string}  params.contentId
 * @param {Date}    params.observedAt
 * @param {number}  [params.reach]
 * @param {number}  [params.impressions]
 * @param {number}  [params.plays]
 * @param {number}  [params.likes]
 * @param {number}  [params.comments]
 * @param {number}  [params.saves]
 * @param {number}  [params.shares]
 * @param {object}  [params.rawPayload]
 * @returns {Promise<import('@prisma/client').ContentMetricSnapshot>}
 * @throws {{ code: 'METRIC_SNAPSHOT_CONFLICT' }} on duplicate (contentId, observedAt)
 */
export async function createMetricSnapshot({
  contentId,
  observedAt,
  reach = null,
  impressions = null,
  plays = null,
  likes = null,
  comments = null,
  saves = null,
  shares = null,
  rawPayload = null,
}) {
  try {
    return await prisma.contentMetricSnapshot.create({
      data: {
        contentId,
        observedAt,
        reach,
        impressions,
        plays,
        likes,
        comments,
        saves,
        shares,
        rawPayload,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const conflictErr = new Error('Metric snapshot already exists for this content at the given observedAt');
      conflictErr.code = 'METRIC_SNAPSHOT_CONFLICT';
      throw conflictErr;
    }
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// findContentByBrand
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Query the content catalogue for a brand.
 *
 * Ordering: `publishedAt DESC, id DESC` — deterministic cursor-compatible.
 * Null `publishedAt` rows sort LAST (treated as oldest).
 *
 * Does NOT perform authorization — the caller (route/middleware) is
 * responsible for verifying that the authenticated user may access `brandId`.
 *
 * @param {object} params
 * @param {string}  params.brandId                    Required — ownership boundary
 * @param {number}  [params.limit=20]
 * @param {string}  [params.afterId]                  Cursor: last seen content ID
 * @param {Date}    [params.afterPublishedAt]          Cursor: last seen publishedAt
 * @param {string}  [params.type]                      ContentType filter
 * @param {string}  [params.analysisStatus]            AnalysisStatus filter
 * @param {Date}    [params.from]                      Date range start (inclusive)
 * @param {Date}    [params.to]                        Date range end (inclusive)
 * @returns {Promise<import('@prisma/client').Content[]>}
 */
export async function findContentByBrand({
  brandId,
  limit = 20,
  afterId = null,
  afterPublishedAt = null,
  type = null,
  analysisStatus = null,
  from = null,
  to = null,
}) {
  // Build the WHERE clause
  const where = { brandId };

  if (type) where.type = type;
  if (analysisStatus) where.analysisStatus = analysisStatus;

  if (from || to) {
    where.publishedAt = {};
    if (from) where.publishedAt.gte = from;
    if (to) where.publishedAt.lte = to;
  }

  // Cursor: rows strictly after (afterPublishedAt, afterId) in DESC order.
  // This covers both non-null publishedAt and the null-last ordering.
  if (afterId && afterPublishedAt !== undefined) {
    where.OR = [
      // Same publishedAt, lower id (id DESC)
      { publishedAt: afterPublishedAt, id: { lt: afterId } },
      // Earlier publishedAt (null counts as less than any date in this ordering)
      ...(afterPublishedAt !== null
        ? [{ publishedAt: { lt: afterPublishedAt } }]
        : [{ publishedAt: null }]
      ),
    ];
  }

  return prisma.content.findMany({
    where,
    orderBy: [
      // Null publishedAt rows come last — Prisma defaults nulls to last in DESC
      { publishedAt: 'desc' },
      { id: 'desc' },
    ],
    take: limit,
    include: {
      media: true,
      metricSnapshots: {
        orderBy: { observedAt: 'desc' },
        take: 1, // latest snapshot only for catalogue view
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// findContentById
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve a single content record with all associated data.
 *
 * Returns null if not found.  Does NOT perform authorization — the API
 * layer must use content.brandId to call requireBrandAccess.
 *
 * The returned object exposes:
 *   content.brandId          → for route-level requireBrandAccess
 *   content.socialAccountId  → for ownership traceability
 *   content.media[]          → all media assets
 *   content.metricSnapshots[] → all historical snapshots, newest first
 *
 * @param {string} contentId
 * @returns {Promise<import('@prisma/client').Content | null>}
 */
export async function findContentById(contentId) {
  return prisma.content.findUnique({
    where: { id: contentId },
    include: {
      media: {
        orderBy: { createdAt: 'asc' },
      },
      metricSnapshots: {
        orderBy: { observedAt: 'desc' },
      },
    },
  });
}
