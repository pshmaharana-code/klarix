import * as contentRepository from '../repositories/contentRepository.js';
import { calculateDerivedMetrics } from './analyticsService.js';

/**
 * Retrieves account-level metrics for a brand, computing deterministic derived metrics on the fly.
 * 
 * @param {string} brandId 
 * @param {object} filters 
 * @param {string} [filters.metric] 
 * @param {string} [filters.period] 
 * @param {string} [filters.breakdown] 
 * @param {Date} [filters.since] 
 * @param {Date} [filters.until] 
 */
export async function getAccountMetrics(brandId, filters = {}) {
  const { metric, period, breakdown, since, until } = filters;

  // 1. Fetch raw snapshots from repository
  const snapshots = await contentRepository.findAccountMetricSnapshots({
    brandId,
    period,
    breakdown,
    since,
    until
  });

  // 2. Map to base observations DTO
  const baseObservations = snapshots.map(s => ({
    metricName: s.metricName,
    period: s.period,
    endTime: s.endTime,
    breakdownDefinition: s.breakdownDefinition,
    value: s.value,
    breakdowns: s.breakdowns
  }));

  // 3. Group snapshots by (endTime, period, breakdownDefinition) to calculate derived metrics
  const groups = new Map();
  for (const obs of baseObservations) {
    const key = `${obs.endTime.toISOString()}|${obs.period}|${obs.breakdownDefinition}`;
    if (!groups.has(key)) {
      groups.set(key, { 
        endTime: obs.endTime, 
        period: obs.period, 
        breakdownDefinition: obs.breakdownDefinition, 
        metrics: {} 
      });
    }
    groups.get(key).metrics[obs.metricName] = obs.value;
  }

  // 4. Compute derived observations
  const derivedObservations = [];
  for (const g of groups.values()) {
    const derived = calculateDerivedMetrics(g.metrics);
    for (const [dMetric, dVal] of Object.entries(derived)) {
      if (dVal !== null && dVal !== undefined) {
        derivedObservations.push({
          metricName: dMetric,
          period: g.period,
          endTime: g.endTime,
          breakdownDefinition: g.breakdownDefinition,
          value: dVal
        });
      }
    }
  }

  // 5. Combine and apply metric filter
  let allObservations = [...baseObservations, ...derivedObservations];
  if (metric) {
    allObservations = allObservations.filter(o => o.metricName === metric);
  }

  return allObservations;
}
