import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TREND_THRESHOLD = 0.05;

const isFiniteNumber = value => Number.isFinite(value);

const average = values => {
  const validValues = values.filter(isFiniteNumber);
  return validValues.length > 0
    ? validValues.reduce((sum, value) => sum + value, 0) / validValues.length
    : null;
};

/**
 * Return the empirical percentile rank for a value in a dataset.
 * Values at or below the subject are included, which makes the result stable
 * for ties and gives a single-value dataset a meaningful P100 result.
 */
export function calculatePercentile(value, values) {
  if (!isFiniteNumber(value)) return null;

  const validValues = values.filter(isFiniteNumber);
  if (validValues.length === 0) return null;

  const atOrBelow = validValues.filter(candidate => candidate <= value).length;
  return Math.round((atOrBelow / validValues.length) * 100);
}

/**
 * Compare the first and second chronological halves of a series.
 * A zero first-half baseline cannot produce a meaningful relative percentage,
 * so it is returned as null unless both halves are zero (stable).
 */
export function calculateInteractionComparison(series) {
  const rates = series
    .map(item => item?.interactionRate)
    .filter(isFiniteNumber);

  if (rates.length < 2) {
    return { interactionRateTrend: null, growth: null };
  }

  const splitAt = Math.max(1, Math.floor(rates.length / 2));
  const firstHalf = rates.slice(0, splitAt);
  const secondHalf = rates.slice(splitAt);

  if (secondHalf.length === 0) {
    return { interactionRateTrend: null, growth: null };
  }

  const firstHalfAverage = average(firstHalf);
  const secondHalfAverage = average(secondHalf);

  if (firstHalfAverage === 0) {
    return secondHalfAverage === 0
      ? { interactionRateTrend: 0, growth: 'STABLE' }
      : { interactionRateTrend: null, growth: 'INSUFFICIENT_DATA' };
  }

  const interactionRateTrend = (secondHalfAverage - firstHalfAverage) / firstHalfAverage;
  const growth = interactionRateTrend > TREND_THRESHOLD
    ? 'POSITIVE'
    : interactionRateTrend < -TREND_THRESHOLD
      ? 'NEGATIVE'
      : 'STABLE';

  return { interactionRateTrend, growth };
}

export const calculateBaselineComparison = (value, datasetAverage) => {
  if (!isFiniteNumber(value) || !isFiniteNumber(datasetAverage)) return null;

  const interactionRateDelta = value - datasetAverage;
  const epsilon = 1e-12;
  const performance = interactionRateDelta > epsilon
    ? 'ABOVE'
    : interactionRateDelta < -epsilon
      ? 'BELOW'
      : 'AT_BASELINE';

  return {
    interactionRateDelta,
    baselineInteractionRate: datasetAverage,
    performance
  };
};

/**
 * Retrieves content-level analytics overview for a brand.
 *
 * @param {string} brandId
 * @param {object} filters
 * @param {string} [filters.from]
 * @param {string} [filters.to]
 * @param {string} [filters.contentType]
 */
export async function getAnalyticsOverview(brandId, filters = {}) {
  const { from, to, contentType } = filters;

  const whereClause = {
    content: { brandId }
  };

  if (contentType) {
    whereClause.content.type = contentType;
  }

  if (from || to) {
    whereClause.content.publishedAt = {};
    if (from) whereClause.content.publishedAt.gte = new Date(from);
    if (to) whereClause.content.publishedAt.lte = new Date(to);
  }

  const metrics = await prisma.contentDerivedMetric.findMany({
    where: whereClause,
    include: {
      content: {
        select: {
          id: true,
          publishedAt: true,
          type: true
        }
      },
      sourceSnapshot: {
        select: {
          reach: true,
          impressions: true,
          plays: true
        }
      }
    },
    orderBy: {
      content: { publishedAt: 'asc' }
    }
  });

  const interactionRates = metrics.map(metric => metric.interactionRate).filter(isFiniteNumber);
  const averages = {
    interactionRate: average(interactionRates),
    likeRate: average(metrics.map(metric => metric.likeRate)),
    commentRate: average(metrics.map(metric => metric.commentRate)),
    saveRate: average(metrics.map(metric => metric.saveRate)),
    shareRate: average(metrics.map(metric => metric.shareRate)),
    viewToReachRatio: average(metrics.map(metric => metric.viewToReachRatio)),
    reach: average(metrics.map(metric => metric.sourceSnapshot?.reach)),
    impressions: average(metrics.map(metric => metric.sourceSnapshot?.impressions)),
    plays: average(metrics.map(metric => metric.sourceSnapshot?.plays))
  };

  const series = metrics.map(metric => {
    const snapshot = metric.sourceSnapshot;
    const percentileComparison = metric.percentileComparison || (
      metric.interactionRate == null
        ? null
        : { interactionRate: calculatePercentile(metric.interactionRate, interactionRates) }
    );
    const baselineComparison = metric.baselineComparison || calculateBaselineComparison(
      metric.interactionRate,
      averages.interactionRate
    );

    return {
      date: metric.content.publishedAt,
      contentId: metric.content.id,
      type: metric.content.type,
      calculationVersion: metric.calculationVersion,
      likeRate: metric.likeRate,
      commentRate: metric.commentRate,
      saveRate: metric.saveRate,
      shareRate: metric.shareRate,
      interactionRate: metric.interactionRate,
      viewToReachRatio: metric.viewToReachRatio,
      reach: snapshot?.reach ?? null,
      impressions: snapshot?.impressions ?? null,
      plays: snapshot?.plays ?? null,
      percentileComparison,
      baselineComparison
    };
  });

  const latestMetric = [...metrics].sort((a, b) => (
    new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime()
  ))[0];

  const overview = {
    totalContent: metrics.length,
    avgReach: averages.reach,
    avgImpressions: averages.impressions,
    avgPlays: averages.plays,
    avgInteractionRate: averages.interactionRate,
    avgLikeRate: averages.likeRate,
    avgCommentRate: averages.commentRate,
    avgSaveRate: averages.saveRate,
    avgShareRate: averages.shareRate,
    avgViewToReachRatio: averages.viewToReachRatio,
    calculationVersion: latestMetric?.calculationVersion || '1.0'
  };

  return {
    overview,
    series,
    comparisons: calculateInteractionComparison(series)
  };
}
