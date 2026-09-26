import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import * as cryptoLib from '../lib/crypto.js';
// We don't import worker.js directly to avoid double processing, but we rely on it running.
// Wait, we need to mock openRouterClient for the test, so it's better to test the service or
// mock the external call and run the worker locally in the test if needed.

// Actually, I'll just write a quick test for postAnalysisOrchestrator to ensure it runs correctly when mocked.
import { analyzePost } from '../services/postAnalysisOrchestrator.js';
import * as openRouterClient from '../services/openRouterClient.js';
import { mock } from 'node:test';

describe('Phase 4: Post Analysis Orchestration', () => {
  let mockImpl;
  
  before(() => {
    mock.method(openRouterClient, 'callAgent', async (prompt) => {
      return mockImpl(prompt);
    });
  });

  after(() => {
    mock.restoreAll();
  });

  it('orchestrator runs all 3 analysts and produces a combined result', async () => {
    mockImpl = async (prompt) => {
      if (prompt.includes('visual analyst')) {
        return {
          extracted_visual_text: ["SALE NOW"],
          visual_quality: "Bright and clear.",
          hook_strength: "Strong opening.",
          format_classification: "talking head"
        };
      } else if (prompt.includes('content analyst')) {
        return {
          themes: ["marketing"],
          narrative_structure: "Problem-solution",
          cta_type: "Link in bio",
          audience_signals: ["entrepreneurs"]
        };
      } else if (prompt.includes('performance analyst')) {
        return {
          metric_interpretation: "Good reach.",
          performance_factors: ["High engagement early on"],
          retention_estimate: "High"
        };
      }
      throw new Error('Unknown prompt');
    };

    const brandContext = "Test Brand";
    const content = { id: 'c1', type: 'REEL', caption: 'Hello world' };
    const metrics = { reach: 1000, likes: 50 };
    const mediaPayload = 'http://example.com/thumb.jpg';

    const result = await analyzePost(brandContext, content, metrics, mediaPayload);

    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.confidence, 1.0);
    assert.ok(result.visualFindings);
    assert.ok(result.contentFindings);
    assert.ok(result.perfFindings);
    assert.equal(result.visualFindings.format_classification, 'talking head');
    assert.equal(result.contentFindings.themes[0], 'marketing');
    assert.equal(result.perfFindings.performance_factors[0], 'High engagement early on');
  });

  it('orchestrator handles partial failure gracefully', async () => {
    mockImpl = async (prompt) => {
      if (prompt.includes('visual analyst')) {
        throw new Error('Timeout');
      }
      return { fake_result: true };
    };

    const result = await analyzePost("Test Brand", {}, {}, null);

    assert.equal(result.status, 'PARTIAL');
    // 2 out of 3 succeed
    assert.equal(result.confidence, 2/3);
    assert.equal(result.visualFindings, null);
    assert.ok(result.contentFindings);
    assert.ok(result.perfFindings);
  });
});
