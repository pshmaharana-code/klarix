import { z } from 'zod';
import { callAgent } from './openRouterClient.js';

const CURRENT_YEAR = new Date().getFullYear();

// -----------------------------------------------------------------------------
// V2 Visual Analyst (The Creative Director)
// -----------------------------------------------------------------------------
const visualSchema = z.object({
  extracted_visual_text: z.array(z.string()).default([]),
  visual_quality: z.string().optional(),
  hook_strength: z.string().optional(),
  format_classification: z.string().optional()
});

const VISUAL_SYSTEM_PROMPT = `You are an elite creative director and visual strategist for high-leverage personal brands.
Your job is to deconstruct visual psychology, pattern interrupts, and aesthetic leverage.
Write with ruthless, executive-level precision. Zero fluff. Zero generic praise. Be direct and analytical.
If analyzing a carousel or video, synthesize the analysis across the entire sequence.
Return ONLY valid JSON conforming to this schema, with no preamble:
{
  "extracted_visual_text": ["array of exact text strings visibly on screen"],
  "visual_quality": "1-2 punchy sentences evaluating aesthetic positioning, lighting, typographic hierarchy, and perceived authority.",
  "hook_strength": "1-2 sentences deconstructing the first 3 seconds or slide. Identify the visual anchor. Does it stop the scroll? Why?",
  "format_classification": "e.g., 'Direct-to-camera authority vlog', 'Cinematic B-roll with kinetic typography', 'High-contrast text carousel'"
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
  const result = await callAgent(VISUAL_SYSTEM_PROMPT, userMessage);
  return { ...visualSchema.parse(result.data), _model: result.model };
}

// -----------------------------------------------------------------------------
// V2 Content Analyst (The Behavioral Copywriter)
// -----------------------------------------------------------------------------
const contentSchema = z.object({
  themes: z.array(z.string()).default([]),
  narrative_structure: z.string().optional(),
  cta_type: z.string().optional(),
  audience_signals: z.array(z.string()).default([])
});

const CONTENT_SYSTEM_PROMPT = `You are a master behavioral copywriter and brand strategist.
Your job is to classify psychological leverage, narrative tension, and status signaling.
Write with cut-throat, analytical precision. Identify the exact frameworks being used.
Return ONLY valid JSON conforming to this schema, with no preamble:
{
  "themes": ["array of 1-3 core psychological or business pillars"],
  "narrative_structure": "1-2 sentences deconstructing the framework (e.g., Problem-Agitate-Solve, Hero's Journey, Curiosity Gap, Status Play) and pacing.",
  "cta_type": "Classify the CTA (e.g., 'Implicit status flex', 'Explicit lead capture', 'Value-driven engagement bait', or 'Missing/Weak')",
  "audience_signals": ["array of signals indicating exactly who this attracts and who it alienates"]
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
  const result = await callAgent(CONTENT_SYSTEM_PROMPT, userMessage);
  return { ...contentSchema.parse(result.data), _model: result.model };
}

// -----------------------------------------------------------------------------
// V2 Performance Analyst (The Growth Hacker)
// -----------------------------------------------------------------------------
const performanceSchema = z.object({
  metric_interpretation: z.string().optional(),
  performance_factors: z.array(z.string()).default([]),
  retention_estimate: z.string().optional()
});

const PERFORMANCE_SYSTEM_PROMPT = `You are a cut-throat growth strategist and data analyst. 
The current year is ${CURRENT_YEAR}.
Your job is to diagnose bottlenecks in the attention funnel and interpret metrics as behavioral data.
Deliver sharp, executive-level insights. Do not just read the numbers back—diagnose the mechanism of action.
Return ONLY valid JSON conforming to this schema, with no preamble:
{
  "metric_interpretation": "1-2 punchy sentences synthesizing the funnel. Is there a discrepancy between reach and interaction? Why?",
  "performance_factors": ["array of 1-3 factual observations about conversion bottlenecks or viral drivers"],
  "retention_estimate": "Infer viewer drop-off or engagement depth based strictly on the ratio of plays to interactions/watch time."
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
  const result = await callAgent(PERFORMANCE_SYSTEM_PROMPT, userMessage);
  return { ...performanceSchema.parse(result.data), _model: result.model };
}

// -----------------------------------------------------------------------------
// Orchestrator
// -----------------------------------------------------------------------------
export async function analyzePost(brandContext, content, metrics, mediaPayload) {
  console.log(`[Orchestrator] Starting analysis for content ${content?.id}`);

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
    version: "1.1", // Bumped version to differentiate the new prompt logic in the DB
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