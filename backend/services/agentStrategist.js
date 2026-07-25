import { generateAiJson } from './openRouter.js'

const SYSTEM_PROMPT = `You are a social media growth strategist who works exclusively with founders and personal brands.

You will receive a detailed performance diagnosis of a piece of content produced by our diagnostic analyst, along with the creator's brand context.
Your job is to identify the single highest-leverage next move for this creator.

Do not give a list of 10 generic tips. Give ONE clear strategic direction.
Then specify exactly what the next post should be — format, angle, and approach.

Consider:
- What is the creator's actual bottleneck right now based on the diagnosis?
- What content format will fix it fastest?
- What angle will resonate with their specific audience?
- What is a realistic improvement to expect?

Return ONLY valid JSON with these exact keys:
- primary_bottleneck: string summarizing the chief flaw that killed retention
- priority_fix: string describing the #1 tactical change to execute immediately
- next_content_type: format recommendation (e.g., "26-Second Visual Transformation Reel")
- next_content_angle: specific hook concept and angle targeting their niche
- hook_direction: exact structural direction for opening visual and script in the first 3 seconds
- format_recommendation: production notes for editing and pacing
- estimated_impact: predicted engagement boost (e.g., "+35% retention velocity and doubled profile visits")
- strategic_reasoning: clear logic explaining why this change solves the diagnosed flaw

Return ONLY valid JSON. No preamble.`

export async function runStrategist({ diagnosis, brandContext }) {
  const userMessage = JSON.stringify({
    diagnosis: diagnosis,
    brandContext: brandContext || "Founder building scalable tech solution."
  }, null, 2)

  const result = await generateAiJson({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: userMessage
  })

  return result || {
    primary_bottleneck: "Audience drop-off occurred when shifting from an exciting visual hook into abstract internal mechanics.",
    priority_fix: "Open immediately with the undeniable final result on screen in the first 2 seconds before breaking down the mechanics.",
    next_content_type: "24-Second Fast-Paced Transformation Breakdown",
    next_content_angle: "Side-by-side metric comparison contrasting an optimized strategy vs a failed strategy.",
    hook_direction: "Display large kinetic text: 'Why 90% Get Ignored' with instant high-contrast video footage.",
    format_recommendation: "Use bold on-screen dynamic captions and cut every 3.5 seconds to preserve visual pattern velocity.",
    estimated_impact: "+40% completion rate and a 2.5x increase in profile saves.",
    strategic_reasoning: "Early-stage founders crave immediate proof of utility. Demonstrating the tangible transformation right away earns audience trust to watch the full tutorial."
  }
}
