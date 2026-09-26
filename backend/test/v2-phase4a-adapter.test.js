import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as meta from '../integrations/metaAdapter.js';

// Setup environment for fixture mode
process.env.NODE_ENV = 'test';

describe('Phase 4A: Account Insights Adapter', () => {
  it('returns normal successful response with values and end_time extracted', async () => {
    const res = await meta.fetchAccountInsights('mock_access_token', 'user_1', {
      metric: 'reach',
      period: 'day'
    });
    
    assert.equal(res.isSupported, true);
    assert.equal(res.data.length, 1);
    const item = res.data[0];
    assert.equal(item.metricName, 'reach');
    assert.equal(item.period, 'day');
    assert.equal(item.values.length, 1);
    assert.equal(item.values[0].value, 100);
    assert.equal(item.values[0].endTime, '2026-09-24T07:00:00+0000');
    assert.ok(item.rawPayload.id);
  });

  it('returns empty successful response correctly', async () => {
    const res = await meta.fetchAccountInsights('mock_access_token', 'user_1', {
      metric: 'views', // Mock returns empty data for 'views'
      period: 'day'
    });
    
    assert.equal(res.isSupported, true);
    assert.equal(res.data.length, 0, 'data array should be empty for views');
  });

  it('preserves breakdown responses with dimension_values', async () => {
    const res = await meta.fetchAccountInsights('mock_access_token', 'user_1', {
      metric: 'reach',
      period: 'day',
      breakdown: 'media_product_type'
    });
    
    const item = res.data[0];
    assert.equal(item.breakdowns.length, 1);
    assert.deepEqual(item.breakdowns[0].dimension_keys, ['media_product_type']);
    assert.equal(item.breakdowns[0].results.length, 2);
    // First result: REELS
    assert.deepStrictEqual(item.breakdowns[0].results[0].dimension_values, ['REELS']);
    assert.equal(item.breakdowns[0].results[0].value, 60);
    assert.equal(item.breakdowns[0].results[0].endTime, '2026-09-24T07:00:00+0000');
    // Second result: POST
    assert.deepStrictEqual(item.breakdowns[0].results[1].dimension_values, ['POST']);
    assert.equal(item.breakdowns[0].results[1].value, 40);
  });

  it('supports explicit since/until parameters', async () => {
    const res = await meta.fetchAccountInsights('mock_access_token', 'user_1', {
      metric: 'reach',
      period: 'day',
      since: 1600000000,
      until: 1600086400
    });
    assert.equal(res.isSupported, true);
    assert.equal(res.data.length, 1);
  });

  it('throws Graph API error for lifetime reach and does not expose token', async () => {
    const token = 'mock_secret_token_123';
    try {
      await meta.fetchAccountInsights(token, 'user_1', {
        metric: 'reach',
        period: 'lifetime'
      });
      assert.fail('Should have thrown an error');
    } catch (err) {
      assert.equal(err.code, 'OAuthException');
      assert.equal(err.graphErrorCode, 1);
      assert.ok(!err.message.includes(token), 'Error message must not leak token');
    }
  });
});
