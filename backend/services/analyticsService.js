/**
 * Phase 4A: Deterministic Analytics Service
 * Pure calculations with no side-effects, DB access, or external calls.
 */

/**
 * Safely calculates a rate between a numerator and denominator.
 * @param {number|null|undefined} numerator 
 * @param {number|null|undefined} denominator 
 * @returns {number|null}
 */
export function calculateRate(numerator, denominator) {
  if (numerator == null || denominator == null) return null;
  if (typeof numerator !== 'number' || typeof denominator !== 'number') return null;
  if (denominator === 0) return null;
  
  const rate = numerator / denominator;
  
  if (Number.isNaN(rate) || !Number.isFinite(rate)) return null;
  
  return rate;
}

/**
 * Calculates the Klarix-derived interaction rate using specific components.
 * Requires all four component metrics plus reach.
 */
export function calculateInteractionRate(likes, comments, saves, shares, reach) {
  if (
    likes == null || 
    comments == null || 
    saves == null || 
    shares == null || 
    reach == null
  ) {
    return null;
  }
  
  const totalInteractions = likes + comments + saves + shares;
  return calculateRate(totalInteractions, reach);
}

/**
 * Calculates a complete set of deterministic rates for content or account snapshots.
 * @param {Object} metrics - Map of raw metric values
 * @param {number|null} metrics.likes
 * @param {number|null} metrics.comments
 * @param {number|null} metrics.saves
 * @param {number|null} metrics.shares
 * @param {number|null} metrics.reach
 * @param {number|null} metrics.views
 * @returns {Object} Calculated deterministic rates
 */
export function calculateDerivedMetrics(metrics = {}) {
  const { likes, comments, saves, shares, reach, views } = metrics;
  
  return {
    likeRate: calculateRate(likes, reach),
    commentRate: calculateRate(comments, reach),
    saveRate: calculateRate(saves, reach),
    shareRate: calculateRate(shares, reach),
    viewToReachRatio: calculateRate(views, reach),
    interactionRate: calculateInteractionRate(likes, comments, saves, shares, reach)
  };
}
