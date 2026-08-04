import { callAgent } from './openRouterClient.js'

const CURRENT_YEAR = new Date().getFullYear()

const SYSTEM_PROMPT = `You are a senior social media performance analyst with deep expertise in short-form video psychology and content analytics.

TEMPORAL CONTEXT: The current year is ${CURRENT_YEAR}. All metric evaluations and content benchmarks MUST reflect current ${CURRENT_YEAR} algorithms.

You will receive:
1. Media file information and extracted content context
2. A transcript (extracted from the video or post content)
3. Analytics numbers (views, watch time, saves, shares, likes, comments, etc.)
4. Brand context (who the creator is and their audience)

Your job is ONLY to analyse and diagnose. Do not give advice yet.

Analyse the following and return structured JSON:
- extracted_transcript: string — complete verbatim transcript of spoken audio extracted directly from the video.
- extracted_visual_text: array of strings — all text overlays, captions, or written text visible.
- hook_strength: what happens in the first 3 seconds visually and verbally
- retention_drop_point: estimated timestamp or section where viewers exited (e.g., "0:09 - 0:12")
- retention_drop_reason: why viewers likely dropped based on pacing, content shifts, or structural complexity
- visual_quality: lighting, framing, text overlays, and production notes
- transcript_quality: clarity, pacing, vocabulary, CTA strength
- cta_strength: analysis of the call-to-action friction and placement
- metric_interpretation: object interpreting views, watch_time, saves, shares, and comments specifically for THIS content
- content_type_fit: is this format right for the message being delivered
- what_worked: array of exactly 3 strings — each string is 1 sentence under 20 words. Specific structural and visual findings only.
- what_failed: array of exactly 3 strings — each string is 1 sentence under 20 words. Focus strictly on pacing drop-offs, hook delays, or structural CTA friction. Do not invent or reference placeholder view numbers if numeric metrics are not explicitly supplied.
- overall_diagnosis: 3-4 sentence summary of what happened visually and structurally.

CRITICAL LENGTH RULE: Keep diagnostic fields to 1–2 sentences maximum. No paragraphs.
Return ONLY valid JSON. No preamble.`

export async function runVisualAnalyst({ mediaInfo, transcript, analytics, brandContext, mediaFilePayload }) {
  const userMessage = [
    ...(mediaFilePayload ? [{ type: 'image_url', image_url: { url: mediaFilePayload } }] : []),
    {
      type: 'text',
      text: JSON.stringify({
        mediaInfo: mediaInfo || "Short-form video asset uploaded by creator",
        analytics: analytics || {},
        brandContext: brandContext || "Early-stage entrepreneur or personal brand aiming to scale influence."
      }, null, 2)
    }
  ]

  const result = await callAgent(SYSTEM_PROMPT, userMessage, true)
  return result
}