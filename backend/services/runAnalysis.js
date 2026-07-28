import { runVisualAnalyst } from './agentVisualAnalyst.js'
import { runStrategist } from './agentStrategist.js'
import { runScriptwriter } from './agentScriptwriter.js'

/**
 * Executes the complete 3-Agent Klarix Intelligence Pipeline sequentially
 */
// FIX 1: Added mediaFilePayload to the main function arguments
export async function executeThreeAgentPipeline({ mediaInfo, transcript, analytics, brandContext, mediaFilePayload }) {
  console.log('[Pipeline] Step 1: Initializing Agent 1 (Visual Analyst)...')

  // FIX 2: Passed mediaFilePayload to Agent 1 so it can actually process the video/image
  const diagnosis = await runVisualAnalyst({ mediaInfo, transcript, analytics, brandContext, mediaFilePayload })
  console.log('[Pipeline] Agent 1 completed diagnosis successfully.')

  console.log('[Pipeline] Step 2: Initializing Agent 2 (Strategist)...')
  const strategy = await runStrategist({ diagnosis, brandContext })
  console.log('[Pipeline] Agent 2 generated strategic direction successfully.')

  console.log('[Pipeline] Step 3: Initializing Agent 3 (Scriptwriter)...')

  // FIX 3: Passed 'diagnosis' instead of 'transcript' so Agent 3 can read the extracted words
  const scriptOutput = await runScriptwriter({ strategy, diagnosis, brandContext })
  console.log('[Pipeline] Agent 3 composed viral replacement script successfully.')

  // FIX 4: Dynamically map the AI outputs instead of using hardcoded fallback strings
  const formattedTranscript = diagnosis.extracted_transcript || transcript || "No audio transcript detected."

  const whatWorked = Array.isArray(diagnosis.what_worked)
    ? diagnosis.what_worked
    : [diagnosis.hook_strength, diagnosis.visual_quality, diagnosis.content_type_fit].filter(Boolean)

  const whatFailed = Array.isArray(diagnosis.what_failed)
    ? diagnosis.what_failed
    : [diagnosis.retention_drop_reason, diagnosis.cta_strength, strategy.primary_bottleneck].filter(Boolean)

  const nextPostStrategy = {
    title: `${strategy.next_content_type || 'Short-Form Reel'} — ${strategy.next_content_angle || 'Transformation Angle'}`,
    advice: `${strategy.priority_fix || 'Open directly with the primary result.'}\n\n• Hook Direction: ${strategy.hook_direction}\n• Production Guidance: ${strategy.format_recommendation}\n• Trend Insight (2026): ${strategy.trend_insight}\n• Predicted Impact: ${strategy.estimated_impact}`
  }

  const script = {
    hook: scriptOutput.hook,
    body: scriptOutput.body,
    cta: scriptOutput.cta,
    bRoll: scriptOutput.b_roll_suggestions || [],
    textOverlays: scriptOutput.text_overlays || []
  }

  return {
    success: true,
    transcript: formattedTranscript,
    whatWorked,
    whatFailed,
    nextPostStrategy,
    script,
    raw: { diagnosis, strategy, scriptOutput }
  }
}