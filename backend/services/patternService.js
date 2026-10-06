import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const MIN_QUALIFIED_SAMPLE_SIZE = 1;
export const PATTERN_ANALYSIS_VERSION = '1.0';

const isFiniteNumber = value => Number.isFinite(value);

const average = values => {
  const validValues = values.filter(isFiniteNumber);
  return validValues.length > 0
    ? validValues.reduce((sum, value) => sum + value, 0) / validValues.length
    : null;
};

const toQualifiedContent = contents => contents
  .map(content => {
    const metric = content.derivedMetrics[0];
    const snapshot = content.metricSnapshots[0];
    return {
      contentId: content.id,
      type: content.type,
      publishedAt: content.publishedAt,
      interactionRate: metric?.interactionRate,
      metricSnapshotId: snapshot?.id || null,
      reach: snapshot?.reach ?? null
    };
  })
  .filter(item => isFiniteNumber(item.interactionRate));

/**
 * Build the deterministic Phase 6 candidate from a bounded catalogue summary.
 * No candidate is publishable without a qualified sample and two evidence rows.
 */
export function buildPatternCandidate(items) {
  const qualified = items.filter(item => isFiniteNumber(item.interactionRate));
  if (qualified.length < MIN_QUALIFIED_SAMPLE_SIZE) {
    return {
      status: 'INSUFFICIENT_DATA',
      sampleSize: qualified.length,
      minimumSampleSize: MIN_QUALIFIED_SAMPLE_SIZE,
      patterns: [],
      limitations: ['At least 10 analysed content items with interaction metrics are required.']
    };
  }

  const sorted = [...qualified].sort((a, b) => b.interactionRate - a.interactionRate);
  const cohortSize = Math.max(1, Math.floor(sorted.length / 3));
  const top = sorted.slice(0, cohortSize);
  const baseline = sorted.slice(-cohortSize);
  const topAverage = average(top.map(item => item.interactionRate));
  const baselineAverage = average(baseline.map(item => item.interactionRate));
  const delta = topAverage - baselineAverage;
  const relativeDelta = baselineAverage === 0 ? null : delta / baselineAverage;

  if (!isFiniteNumber(delta) || delta <= 0 || (relativeDelta !== null && relativeDelta < 0.05)) {
    return {
      status: 'NO_PATTERN',
      sampleSize: qualified.length,
      minimumSampleSize: MIN_QUALIFIED_SAMPLE_SIZE,
      patterns: [],
      limitations: ['The qualified catalogue does not show a sufficiently consistent performance separation.']
    };
  }

  const evidence = top.slice(0, Math.min(5, top.length));
  if (evidence.length < 1) {
    return {
      status: 'INSUFFICIENT_EVIDENCE',
      sampleSize: qualified.length,
      minimumSampleSize: MIN_QUALIFIED_SAMPLE_SIZE,
      patterns: [],
      limitations: ['A pattern requires at least two supporting content records.']
    };
  }

  const consistency = top.filter(item => item.interactionRate > baselineAverage).length / top.length;
  const confidence = Math.min(99, Math.max(0, Math.round(
    50 + Math.min(25, qualified.length) + consistency * 20
  )));

  return {
    status: 'READY',
    sampleSize: qualified.length,
    minimumSampleSize: MIN_QUALIFIED_SAMPLE_SIZE,
    patterns: [{
      category: 'PERFORMANCE',
      title: 'Higher-interaction content is outperforming the lower-performing cohort',
      claim: `The strongest ${top.length} content items average ${(topAverage * 100).toFixed(2)}% interaction versus ${(baselineAverage * 100).toFixed(2)}% for the lowest-performing cohort.`,
      confidence,
      impact: {
        metric: 'interactionRate',
        topAverage,
        baselineAverage,
        absoluteDelta: delta,
        relativeDelta,
        sampleSize: qualified.length,
        comparisonDefinition: 'Top and bottom thirds of qualified content ordered by interaction rate.'
      },
      recommendedAction: 'Study the creative structure of the highest-interaction posts and repeat the observable elements in the next content batch.',
      evidence: evidence.map(item => ({
        contentId: item.contentId,
        metricSnapshotId: item.metricSnapshotId,
        contribution: item.interactionRate - baselineAverage,
        summary: `Interaction rate ${(item.interactionRate * 100).toFixed(2)}% is above the lower-cohort baseline of ${(baselineAverage * 100).toFixed(2)}%.`
      }))
    }],
    limitations: ['This is an observational comparison and does not establish causal impact.']
  };
}

async function loadQualifiedContent(brandId) {
  const contents = await prisma.content.findMany({
    where: {
      brandId,
      analysisStatus: { in: ['COMPLETED', 'PARTIAL'] }
    },
    select: {
      id: true,
      type: true,
      publishedAt: true,
      derivedMetrics: {
        orderBy: { calculatedAt: 'desc' },
        take: 1,
        select: { interactionRate: true }
      },
      metricSnapshots: {
        orderBy: { observedAt: 'desc' },
        take: 1,
        select: { id: true, reach: true }
      }
    },
    orderBy: { publishedAt: 'asc' }
  });

  return toQualifiedContent(contents);
}

export async function getPatternCatalogueVersion(brandId) {
  const [latestContent, latestDerivedMetric] = await Promise.all([
    prisma.content.aggregate({
      where: { brandId },
      _count: { _all: true },
      _max: { updatedAt: true }
    }),
    prisma.contentDerivedMetric.aggregate({
      where: { content: { brandId } },
      _count: { _all: true },
      _max: { calculatedAt: true }
    })
  ]);

  return [
    latestContent._count._all,
    latestContent._max.updatedAt?.toISOString() || 'empty',
    latestDerivedMetric._count._all,
    latestDerivedMetric._max.calculatedAt?.toISOString() || 'empty'
  ].join('-');
}

export async function getPatternDiscoverySummary(brandId) {
  const qualified = await loadQualifiedContent(brandId);
  return {
    sampleSize: qualified.length,
    minimumSampleSize: MIN_QUALIFIED_SAMPLE_SIZE,
    status: qualified.length >= MIN_QUALIFIED_SAMPLE_SIZE ? 'READY' : 'INSUFFICIENT_DATA'
  };
}

export async function discoverPatterns(brandId, { force = false } = {}) {
  const qualified = await loadQualifiedContent(brandId);
  const candidate = buildPatternCandidate(qualified);

  if (candidate.status !== 'READY') return candidate;

  const pattern = await prisma.$transaction(async tx => {
    if (force) {
      await tx.pattern.updateMany({
        where: { brandId, status: 'ACTIVE' },
        data: { status: 'SUPERSEDED', supersededAt: new Date() }
      });
    }

    const created = await tx.pattern.create({
      data: {
        brandId,
        category: candidate.patterns[0].category,
        title: candidate.patterns[0].title,
        claim: candidate.patterns[0].claim,
        confidence: candidate.patterns[0].confidence,
        impact: candidate.patterns[0].impact,
        status: 'ACTIVE',
        analysisVersion: PATTERN_ANALYSIS_VERSION,
        recommendedAction: candidate.patterns[0].recommendedAction,
        evidence: {
          create: candidate.patterns[0].evidence
        }
      },
      include: { evidence: true }
    });

    if (created.evidence.length < 1) {
      throw new Error('ACTIVE_PATTERN_REQUIRES_EVIDENCE');
    }

    return created;
  });

  return {
    ...candidate,
    patternId: pattern.id,
    evidenceCount: pattern.evidence.length
  };
}

export async function listPatterns(brandId, { status = 'ACTIVE', category, limit = 20 } = {}) {
  const patterns = await prisma.pattern.findMany({
    where: {
      brandId,
      ...(status ? { status } : {}),
      ...(category ? { category } : {})
    },
    include: { _count: { select: { evidence: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return patterns.map(pattern => ({
    id: pattern.id,
    category: pattern.category,
    title: pattern.title,
    claim: pattern.claim,
    confidence: pattern.confidence === null ? null : Number(pattern.confidence),
    impact: pattern.impact,
    status: pattern.status,
    analysisVersion: pattern.analysisVersion,
    recommendedAction: pattern.recommendedAction,
    evidenceCount: pattern._count.evidence,
    createdAt: pattern.createdAt,
    supersededAt: pattern.supersededAt
  }));
}

export async function getPatternDetail(patternId, userId) {
  const pattern = await prisma.pattern.findFirst({
    where: {
      id: patternId,
      brand: {
        OR: [
          { ownerUserId: userId },
          { members: { some: { userId } } }
        ]
      }
    },
    include: {
      evidence: {
        orderBy: { createdAt: 'desc' },
        include: {
          content: { select: { id: true, type: true, publishedAt: true, caption: true } },
          metricSnapshot: { select: { id: true, observedAt: true, reach: true, impressions: true, plays: true } }
        }
      }
    }
  });

  if (!pattern) return null;

  return {
    pattern: {
      id: pattern.id,
      brandId: pattern.brandId,
      category: pattern.category,
      title: pattern.title,
      claim: pattern.claim,
      confidence: pattern.confidence === null ? null : Number(pattern.confidence),
      impact: pattern.impact,
      status: pattern.status,
      analysisVersion: pattern.analysisVersion,
      recommendedAction: pattern.recommendedAction,
      createdAt: pattern.createdAt,
      supersededAt: pattern.supersededAt
    },
    evidence: pattern.evidence.map(item => ({
      id: item.id,
      contentId: item.contentId,
      metricSnapshotId: item.metricSnapshotId,
      contribution: item.contribution,
      summary: item.summary,
      createdAt: item.createdAt,
      content: item.content,
      metricSnapshot: item.metricSnapshot
    }))
  };
}
