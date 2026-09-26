import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as analyticsService from '../services/analyticsService.js';

describe('Analytics Service - calculateRate', () => {
  it('returns null if numerator is null', () => {
    assert.strictEqual(analyticsService.calculateRate(null, 100), null);
  });
  it('returns null if denominator is null', () => {
    assert.strictEqual(analyticsService.calculateRate(10, null), null);
  });
  it('returns null if denominator is 0', () => {
    assert.strictEqual(analyticsService.calculateRate(10, 0), null);
  });
  it('handles zero numerator correctly', () => {
    assert.strictEqual(analyticsService.calculateRate(0, 100), 0);
  });
  it('calculates valid positive rate', () => {
    assert.strictEqual(analyticsService.calculateRate(5, 100), 0.05);
  });
});

describe('Analytics Service - calculateInteractionRate', () => {
  it('calculates correct rate when all components exist', () => {
    assert.strictEqual(analyticsService.calculateInteractionRate(10, 5, 3, 2, 100), 0.2);
  });
  it('returns null if any interaction component is missing', () => {
    assert.strictEqual(analyticsService.calculateInteractionRate(null, 5, 3, 2, 100), null);
    assert.strictEqual(analyticsService.calculateInteractionRate(10, undefined, 3, 2, 100), null);
    assert.strictEqual(analyticsService.calculateInteractionRate(10, 5, null, 2, 100), null);
    assert.strictEqual(analyticsService.calculateInteractionRate(10, 5, 3, undefined, 100), null);
  });
  it('returns null if reach is missing or zero', () => {
    assert.strictEqual(analyticsService.calculateInteractionRate(10, 5, 3, 2, null), null);
    assert.strictEqual(analyticsService.calculateInteractionRate(10, 5, 3, 2, 0), null);
  });
  it('handles zero interaction components correctly', () => {
    assert.strictEqual(analyticsService.calculateInteractionRate(0, 0, 0, 0, 100), 0);
  });
});

describe('Analytics Service - calculateDerivedMetrics', () => {
  it('calculates all metrics with complete data', () => {
    const raw = {
      likes: 10,
      comments: 5,
      saves: 3,
      shares: 2,
      reach: 200,
      views: 250
    };
    const result = analyticsService.calculateDerivedMetrics(raw);
    assert.strictEqual(result.likeRate, 0.05);
    assert.strictEqual(result.commentRate, 0.025);
    assert.strictEqual(result.saveRate, 0.015);
    assert.strictEqual(result.shareRate, 0.01);
    assert.strictEqual(result.viewToReachRatio, 1.25);
    assert.strictEqual(result.interactionRate, 0.1);
  });
  
  it('returns null for specific rates when components are missing', () => {
    const raw = {
      likes: 10,
      reach: 100
      // comments, saves, shares, views missing
    };
    const result = analyticsService.calculateDerivedMetrics(raw);
    assert.strictEqual(result.likeRate, 0.1);
    assert.strictEqual(result.commentRate, null);
    assert.strictEqual(result.saveRate, null);
    assert.strictEqual(result.shareRate, null);
    assert.strictEqual(result.viewToReachRatio, null);
    assert.strictEqual(result.interactionRate, null);
  });
  
  it('returns null for everything if reach is zero', () => {
    const raw = {
      likes: 10,
      comments: 5,
      saves: 3,
      shares: 2,
      reach: 0,
      views: 100
    };
    const result = analyticsService.calculateDerivedMetrics(raw);
    assert.strictEqual(result.likeRate, null);
    assert.strictEqual(result.commentRate, null);
    assert.strictEqual(result.saveRate, null);
    assert.strictEqual(result.shareRate, null);
    assert.strictEqual(result.viewToReachRatio, null);
    assert.strictEqual(result.interactionRate, null);
  });
});
