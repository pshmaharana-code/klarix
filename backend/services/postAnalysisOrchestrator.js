import { callAgent } from './openRouterClient.js';

const CURRENT_YEAR = new Date().getFullYear();

// -----------------------------------------------------------------------------
// V2 Visual Analyst
// -----------------------------------------------------------------------------
const VISUAL_SYSTEM_PROMPT = `You are a visual analyst for social media content.
Your responsibility is strictly to analyse observable creative properties.
Return ONLY valid JSON conforming to this schema, with no preamble:
{
  "extracted_visual_text": ["array of text strings visibly on screen"],
  "visual_quality": "1-2 sentences on lighting, framing, text overlays",
  "hook_strength": "1-2 sentences on the first 3 seconds visually",
  "format_classification": "e.g., 'talking head', 'vlog', 'text-on-screen'"
}
Do not hallucinate text or describe audio.`;

export async function runVisualAnalyst(brandContext, content, mediaPayload) {
  const userMessage = [
    ...(mediaPayload ? [{ type: 'image_url', image_url: { url: mediaPayload } }] : []),
    {
      type: 'text',
      text: JSON.stringify({
        brandContext,
        contentType: content.type,
        caption: content.caption
      })
    }
  ];
  return callAgent(VISUAL_SYSTEM_PROMPT, userMessage, true);
}

// -----------------------------------------------------------------------------
// V2 Content Analyst
// -----------------------------------------------------------------------------
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
  return callAgent(CONTENT_SYSTEM_PROMPT, userMessage, true);
}

// -----------------------------------------------------------------------------
// V2 Performance Analyst
// -----------------------------------------------------------------------------
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
  return callAgent(PERFORMANCE_SYSTEM_PROMPT, userMessage, true);
}

// -----------------------------------------------------------------------------
// Orchestrator
// -----------------------------------------------------------------------------
export async function analyzePost(brandContext, content, metrics, mediaPayload) {
  console.log(`[Orchestrator] Starting analysis for content ${content?.id}`);
  
  // Run all 3 agents in parallel (or sequential if preferred, parallel is faster)
  const [visualFindings, contentFindings, perfFindings] = await Promise.all([
    runVisualAnalyst(brandContext, content, mediaPayload).catch(e => ({ _error: e.message })),
    runContentAnalyst(brandContext, content).catch(e => ({ _error: e.message })),
    runPerformanceAnalyst(brandContext, content, metrics).catch(e => ({ _error: e.message }))
  ]);

  // If all failed, throw
  if (visualFindings._error && contentFindings._error && perfFindings._error) {
    throw new Error('All analysis agents failed');
  }

  // Calculate confidence based on partial failures
  let successes = 0;
  if (!visualFindings._error) successes++;
  if (!contentFindings._error) successes++;
  if (!perfFindings._error) successes++;
  
  const confidence = successes / 3.0;
  const status = successes === 3 ? 'COMPLETED' : 'PARTIAL';

  return {
    version: "1.0",
    status,
    visualFindings: visualFindings._error ? null : visualFindings,
    contentFindings: contentFindings._error ? null : contentFindings,
    perfFindings: perfFindings._error ? null : perfFindings,
    confidence,
    providerMeta: {
      model: "gemini-flash-1.5",
      successes,
      timestamp: new Date().toISOString()
    }
  };
}
