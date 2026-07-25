import { generateAiJson } from './openRouter.js'

const SYSTEM_PROMPT = `You are an expert short-form video scriptwriter specialising in founder content and personal brand videos.

You will receive:
1. A strategic direction from our growth strategist (what to create and why)
2. The original transcript (to understand the creator's natural speaking voice and tone)
3. Brand context (audience, tone, goals)

Your job is to write a complete, high-converting, ready-to-record script that fixes every diagnosed flaw and executes the strategist's exact playbook.

Requirements:
- Hook must land within the first 3 seconds
- Total script must fit 25–35 seconds when spoken naturally
- Match the creator's natural speaking style and authentic cadence from the reference transcript
- Every line must earn its place — zero fluff or generic filler
- CTA must be specific, action-oriented, and low-friction (e.g., commenting a keyword)
- Include crisp B-roll suggestions and text overlay recommendations

Return ONLY valid JSON with these exact keys:
- hook: string (formatted as "HOOK (0:00–0:03)\n[Visual: ...]\n\"Script line...\"")
- body: string (formatted as "BODY (0:03–0:22)\n[Visual: ...]\n\"Script body...\"")
- cta: string (formatted as "CALL TO ACTION (0:22–0:28)\n[Visual: ...]\n\"CTA line...\"")
- text_overlays: array of 3 impactful short strings to display as kinetic captions
- b_roll_suggestions: array of 3 concrete B-roll overlay ideas for editing
- delivery_notes: brief note on voice projection, cadence, and eye contact
- estimated_length: string (e.g., "27 seconds")

Return ONLY valid JSON. No preamble.`

export async function runScriptwriter({ strategy, transcript, brandContext }) {
  const userMessage = JSON.stringify({
    strategy: strategy,
    referenceTranscript: transcript || "No spoken transcript provided; use punchy, confident, authoritative founder speaking style.",
    brandContext: brandContext || "Founder building high-leverage digital solution."
  }, null, 2)

  const result = await generateAiJson({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: userMessage
  })

  return result || {
    hook: `HOOK (0:00–0:03)\n[Visual: Close-up pointing to screen showing an engagement jump from 0x to 10x]\n"Here is exactly why 90% of founder Reels get skipped in the very first second."`,
    body: `BODY (0:03–0:20)\n[Visual: Fast cut to side-by-side comparison of a washed-out post vs an optimized high-contrast post]\n"Most founders open by introducing themselves or talking about internal architecture. Nobody cares yet. You must open directly with the transformation. Show them the undeniable result on screen first — then give them the simple 3-step adjustment that made it happen."`,
    cta: `CALL TO ACTION (0:20–0:26)\n[Visual: Subtle finger point downward toward comment section with bouncing caption]\n"Comment the word 'GROWTH' and I will send you our full 3-agent diagnostic playbook automatically."`,
    text_overlays: [
      "90% OF FOUNDERS GET IGNORED",
      "OPEN WITH THE TRANSFORMATION",
      "COMMENT 'GROWTH' FOR SYSTEM"
    ],
    b_roll_suggestions: [
      "Screen recording of follower growth graph climbing smoothly",
      "Side-by-side split screen comparing confusing metrics vs clear visual output",
      "Large kinetic text overlay popping on screen during the opening hook"
    ],
    delivery_notes: "Speak with sharp, upbeat authority. Maintain unbroken lens eye contact during the opening 3-second hook.",
    estimated_length: "26 seconds"
  }
}
