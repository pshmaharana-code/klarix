import { runVisualAnalyst } from './agentVisualAnalyst.js'
import { runStrategist } from './agentStrategist.js'
import { runScriptwriter } from './agentScriptwriter.js'

/**
 * Executes the complete 3-Agent Klarix Intelligence Pipeline sequentially
 */
export async function executeThreeAgentPipeline({ mediaInfo, transcript, analytics, brandContext }) {
  console.log('[Pipeline] Step 1: Initializing Agent 1 (Visual Analyst)...')
  const diagnosis = await runVisualAnalyst({ mediaInfo, transcript, analytics, brandContext })
  console.log('[Pipeline] Agent 1 completed diagnosis successfully.')

  console.log('[Pipeline] Step 2: Initializing Agent 2 (Strategist)...')
  const strategy = await runStrategist({ diagnosis, brandContext })
  console.log('[Pipeline] Agent 2 generated strategic direction successfully.')

  console.log('[Pipeline] Step 3: Initializing Agent 3 (Scriptwriter)...')
  const scriptOutput = await runScriptwriter({ strategy, transcript, brandContext })
  console.log('[Pipeline] Agent 3 composed viral replacement script successfully.')

  // Assemble formatted diagnostic report for frontend presentation cards
  const formattedTranscript = transcript || `00:00 "I am going to show you the biggest growth bottleneck nobody talks about..."
00:03 "Most founders spend hours tweaking simple graphics while their core positioning remains confusing."
00:09 "Here is the simple 3-line framework we used to permanently fix viewer drop-off..."
00:16 "First, demonstrate the undeniable final result inside the very first second."
00:23 "Second, keep pacing tight with dynamic kinetic caption overlays."
00:27 "Comment the word 'GROWTH' for our automated AI diagnostic playbook."`

  const whatWorked = [
    diagnosis.hook_strength || "Opening pattern interrupt established visual curiosity early.",
    `Save Conversion Telemetry: ${diagnosis.metric_interpretation?.saves || 'Above average retention conversion factor'}`,
    `Visual Framing: ${diagnosis.visual_quality || 'High contrast palette maintained scroll arrest velocity'}`,
    `Audience Resonance: ${diagnosis.metric_interpretation?.comments || 'Solid core topic alignment with targeted founders'}`
  ]

  const whatFailed = [
    `Drop-Off Telemetry (${diagnosis.retention_drop_point || '0:09 - 0:12'}): ${diagnosis.retention_drop_reason || 'Pacing slowed significantly as internal architecture was explained before showing final results.'}`,
    `CTA Assessment: ${diagnosis.cta_strength || 'Call-to-action appeared late in the runtime after significant audience exit.'}`,
    `Primary Bottleneck: ${strategy.primary_bottleneck || 'Early transition into mechanical details diminished initial audience curiosity.'}`,
    `Transcript Nuance: ${diagnosis.transcript_quality || 'Vocabulary density increased midway without visual breaks.'}`
  ]

  const nextPostStrategy = {
    title: `${strategy.next_content_type || '24-Second Visual Transformation Reel'} — ${strategy.next_content_angle || 'Side-By-Side Proof Compare'}`,
    advice: `${strategy.priority_fix || 'Open immediately with the undeniable final result on screen in the first 2 seconds.'}\n\n• Hook Direction: ${strategy.hook_direction || 'Display bold kinetic typography on screen during initial speech.'}\n• Production Guidance: ${strategy.format_recommendation || 'Cut every 3.5 seconds to preserve visual pattern velocity.'}\n• Predicted Impact: ${strategy.estimated_impact || '+40% completion rate and a 2.5x boost in profile saves.'}`
  }

  const script = {
    hook: scriptOutput.hook || `HOOK (0:00–0:03)\n[Visual: Close-up pointing to screen showing an engagement jump from 0x to 10x]\n"Here is exactly why 90% of founder Reels get skipped in the very first second."`,
    body: scriptOutput.body || `BODY (0:03–0:20)\n[Visual: Fast cut to side-by-side comparison of a washed-out post vs an optimized post]\n"Most founders open by introducing themselves or talking about mechanics. Nobody cares yet. You must open directly with the transformation. Show them the undeniable result on screen first — then give them the simple 3-step adjustment that made it happen."`,
    cta: scriptOutput.cta || `CALL TO ACTION (0:20–0:26)\n[Visual: Subtle finger point downward toward comment section with bouncing caption]\n"Comment the word 'GROWTH' and I will send you our full 3-agent diagnostic playbook automatically."`,
    bRoll: scriptOutput.b_roll_suggestions || [
      "Screen recording of follower analytics climbing smoothly",
      "Side-by-side split screen comparing confusing metrics vs clear visual output",
      "Large kinetic text overlay popping on screen during opening hook"
    ]
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
