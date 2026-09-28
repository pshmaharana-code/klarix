import { z } from 'zod';
import { callAgent } from './openRouterClient.js';

const CURRENT_YEAR = new Date().getFullYear();

// -----------------------------------------------------------------------------
// V2 Visual Analyst
// -----------------------------------------------------------------------------
const visualSchema = z.object({
  extracted_visual_text: z.array(z.string()).default([]),
  visual_quality: z.string().optional(),
  hook_strength: z.string().optional(),
  format_classification: z.string().optional()
});

const VISUAL_SYSTEM_PROMPT = `You are a visual analyst for social media content.
Your responsibility is strictly to analyse observable creative properties. 
If analyzing a carousel or video, synthesize the analysis across the entire sequence (e.g. across all slides or the entire video timeline), ensuring important slide/frame-specific details are combined coherently.
Return ONLY valid JSON conforming to this schema, with no preamble:
{
  "extracted_visual_text": ["array of text strings visibly on screen across the sequence"],
  "visual_quality": "1-2 sentences on lighting, framing, text overlays, cuts and pacing",
  "hook_strength": "1-2 sentences on the visual hook strength of the first 3 seconds or first slide",
  "format_classification": "e.g., 'talking head', 'vlog', 'text-on-screen', 'product shot'"
}
Do not hallucinate text or describe audio.`;

export async function runVisualAnalyst(brandContext, content, mediaPayload) {
  let mediaParts = [];
  if (Array.isArray(mediaPayload)) {
    mediaParts = mediaPayload.map(url => ({ type: 'image_url', image_url: { url } }));
  } else if (mediaPayload) {
    mediaParts = [{ type: 'image_url', image_url: { url: mediaPayload } }];
  }

  if (mediaParts.length === 0) {
    const err = new Error('No valid media provided for visual analysis');
    err.retryable = false;
    throw err;
  }

  const userMessage = [
    ...mediaParts,
    {
      type: 'text',
      text: JSON.stringify({
        brandContext,
        contentType: content.type,
        caption: content.caption
      })
    }
  ];
  const result = await callAgent(VISUAL_SYSTEM_PROMPT, userMessage, true);
  return { ...visualSchema.parse(result.data), _model: result.model };
}

// -----------------------------------------------------------------------------
// V2 Content Analyst
// -----------------------------------------------------------------------------
const contentSchema = z.object({
  themes: z.array(z.string()).default([]),
  narrative_structure: z.string().optional(),
  cta_type: z.string().optional(),
  audience_signals: z.array(z.string()).default([])
});

const CONTENT_SYSTEM_PROMPT = `You are a content analyst for social media.
Your responsibility is to classify what the content says and how it communicates.
Return ONLY valid JSON conforming to this schema, with no preamble:
{
  "themes": ["array of 1-3 core topics discussed"],
  "narrative_structure": "1-2 sentences describing the storytelling or logical flow",
  "cta_type": "The call to action, if any",
  "audience_signals": ["array of signals indicating who this is for"]
}`;

export async function runContentAnalyst(brandContext, content) {
  const userMessage = [
    {
      type: 'text',
      text: JSON.stringify({
        brandContext,
        caption: content.caption || "",
        transcript: content.transcript || ""
      })
    }
  ];
  const result = await callAgent(CONTENT_SYSTEM_PROMPT, userMessage, true);
  return { ...contentSchema.parse(result.data), _model: result.model };
}

// -----------------------------------------------------------------------------
// V2 Performance Analyst
// -----------------------------------------------------------------------------
const performanceSchema = z.object({
  metric_interpretation: z.string().optional(),
  performance_factors: z.array(z.string()).default([]),
  retention_estimate: z.string().optional()
});

const PERFORMANCE_SYSTEM_PROMPT = `You are a performance analyst.
The current year is ${CURRENT_YEAR}.
Your responsibility is to interpret performance metrics without claiming causality beyond evidence.
Return ONLY valid JSON conforming to this schema, with no preamble:
{
  "metric_interpretation": "1-2 sentences interpreting the raw metrics in context of the brand",
  "performance_factors": ["array of 1-3 factual observations about what drove the numbers"],
  "retention_estimate": "estimated viewer retention based on plays vs interactions"
}`;

export async function runPerformanceAnalyst(brandContext, content, metrics) {
  const userMessage = [
    {
      type: 'text',
      text: JSON.stringify({
        brandContext,
        metrics: metrics || {}
      })
    }
  ];
  const result = await callAgent(PERFORMANCE_SYSTEM_PROMPT, userMessage, true);
  return { ...performanceSchema.parse(result.data), _model: result.model };
}

// -----------------------------------------------------------------------------
// Orchestrator
// -----------------------------------------------------------------------------
export async function analyzePost(brandContext, content, metrics, mediaPayload) {
  console.log(`[Orchestrator] Starting analysis for content ${content?.id}`);
  
  // Run all 3 agents in parallel (or sequential if preferred, parallel is faster)
  const runAndCatch = async (agentPromise) => {
    try {
      return await agentPromise;
    } catch (e) {
      if (e.retryable) throw e;
      return { _error: e.message, _retryable: !!e.retryable };
    }
  };

  // Run all 3 agents in parallel
  const [visualFindings, contentFindings, perfFindings] = await Promise.all([
    runAndCatch(runVisualAnalyst(brandContext, content, mediaPayload)),
    runAndCatch(runContentAnalyst(brandContext, content)),
    runAndCatch(runPerformanceAnalyst(brandContext, content, metrics))
  ]);

  // If all failed, throw
  if (visualFindings._error && contentFindings._error && perfFindings._error) {
    const err = new Error(`All agents failed. V: ${visualFindings._error}, C: ${contentFindings._error}, P: ${perfFindings._error}`);
    err.retryable = visualFindings._retryable || contentFindings._retryable || perfFindings._retryable;
    throw err;
  }

  // Calculate confidence based on partial failures
  let successes = 0;
  if (!visualFindings._error) successes++;
  if (!contentFindings._error) successes++;
  if (!perfFindings._error) successes++;
  
  const confidence = successes / 3.0;
  const status = successes === 3 ? 'COMPLETED' : 'PARTIAL';

  const models = [
    visualFindings._model,
    contentFindings._model,
    perfFindings._model
  ].filter(Boolean);
  const primaryModelUsed = models.length > 0 ? models[0] : "unknown";

  return {
    version: "1.0",
    status,
    visualFindings: visualFindings._error ? { error: visualFindings._error } : visualFindings,
    contentFindings: contentFindings._error ? { error: contentFindings._error } : contentFindings,
    perfFindings: perfFindings._error ? { error: perfFindings._error } : perfFindings,
    confidence,
    providerMeta: {
      model: primaryModelUsed,
      models,
      successes,
      timestamp: new Date().toISOString(),
      metricsObservedAt: metrics?.observedAt ? new Date(metrics.observedAt).toISOString() : null
    }
  };
}
