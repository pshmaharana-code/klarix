// openRouterClient.js — FIXED VERSION
// Uses correct Gemini model names + concise output mandate

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

// CORRECT model names that actually exist on v1beta endpoint
const GEMINI_PRIMARY_MODEL   = 'gemini-2.5-flash-preview-05-20'  // latest stable with vision
const GEMINI_FALLBACK_MODEL  = 'gemini-2.0-flash'                 // proven stable, vision capable

/**
 * Converts File to Base64
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Core AI Agent Execution Engine — Direct Gemini only, no OpenRouter needed
 */
export async function callAgent(systemPrompt, userMessage, useVision = false, useFallback = false) {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY

  if (!geminiKey) {
    throw new Error("No VITE_GEMINI_API_KEY found. Add it to your .env file.")
  }

  const model = useFallback ? GEMINI_FALLBACK_MODEL : GEMINI_PRIMARY_MODEL
  console.log(`[Klarix] Calling ${model}...`)

  // Build parts array
  const parts = []

  if (Array.isArray(userMessage)) {
    let slideIndex = 1
    for (const item of userMessage) {
      if (item.type === 'image_url' && item.image_url?.url) {
        const [meta, b64Data] = item.image_url.url.split(';base64,')
        const mimeType = meta ? meta.replace('data:', '') : 'image/jpeg'
        const isVideo  = mimeType.startsWith('video/')
        parts.push({ text: isVideo ? `[Video Reel — analyse frame by frame and extract transcript]` : `[Carousel Slide #${slideIndex++}]` })
        parts.push({ inline_data: { mime_type: mimeType, data: b64Data } })
      } else if (item.type === 'text') {
        parts.push({ text: item.text })
      }
    }
  } else {
    parts.push({ text: userMessage })
  }

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [{
      role: 'user',
      parts: parts
    }],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.4,
      responseMimeType: 'application/json'
    }
  }

  try {
    const response = await fetch(
      `${GEMINI_BASE_URL}/${model}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const msg = err?.error?.message || `HTTP ${response.status}`
      console.warn(`[Klarix] ${model} failed: ${msg}`)

      // Try fallback model once
      if (!useFallback) {
        console.log(`[Klarix] Retrying with fallback model ${GEMINI_FALLBACK_MODEL}...`)
        return await callAgent(systemPrompt, userMessage, useVision, true)
      }
      throw new Error(`Both Gemini models failed. Last error: ${msg}`)
    }

    const data    = await response.json()
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!rawText) throw new Error("Gemini returned empty response.")

    // Strip markdown fences if present
    const cleaned = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()

    try {
      return JSON.parse(cleaned)
    } catch {
      // Extract JSON object from response if parsing fails
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (match) return JSON.parse(match[0])
      throw new Error("Could not parse JSON from Gemini response.")
    }

  } catch (error) {
    if (!useFallback) {
      console.warn(`[Klarix] Primary failed, trying fallback: ${error.message}`)
      return await callAgent(systemPrompt, userMessage, useVision, true)
    }
    throw error
  }
}

// --- AGENT SYSTEM PROMPTS ---
// NOTE: DEPTH comes from the analysis quality, not from long paragraphs.
// LENGTH RULES are enforced here so every agent respects them.

export const AGENT_1_PROMPT = `You are a senior social media performance analyst specialising in short-form video psychology and content analytics.

You will receive the actual video or image content, analytics numbers, and brand context.

YOUR JOB IS ONLY TO DIAGNOSE. No strategic advice yet.

Return a JSON object with EXACTLY these keys:
- hook_strength: string — 1 sentence max. What happens in first 3 seconds and whether it works.
- retention_drop_point: string — timestamp only. e.g. "0:09–0:12"
- retention_drop_reason: string — 1 sentence. Why viewers left at that exact point.
- visual_quality: string — 1 sentence. Key visual strength or weakness only.
- transcript_quality: string — 1 sentence. Core speech clarity or issue.
- cta_strength: string — 1 sentence. CTA timing and effectiveness.
- metric_interpretation: object with keys views, watch_time, saves, shares, comments — each exactly 1 sentence interpreting that metric for THIS content specifically.
- content_type_fit: string — 1 sentence. Is this format right for this message?
- what_worked: array of exactly 3 strings — each string is 1 sentence under 20 words. Specific findings only.
- what_failed: array of exactly 3 strings — each string is 1 sentence under 20 words. Include the timestamp or metric reference.
- overall_diagnosis: string — exactly 2 sentences. Core problem + core opportunity. Nothing else.

CRITICAL LENGTH RULE: Every field is 1–2 sentences maximum. No paragraphs. No padding.
The quality comes from precision and specificity, not length.

Return ONLY valid JSON. No preamble. No markdown fences.`

export const AGENT_2_PROMPT = `You are a social media growth strategist working exclusively with founders and personal brands.

You will receive a performance diagnosis and brand context.

YOUR JOB: ONE clear strategic direction. Not a list of tips.

Return a JSON object with EXACTLY these keys:
- primary_bottleneck: string — 1 sentence under 15 words.
- priority_fix: string — 1 sentence under 20 words. Specific and actionable.
- next_content_type: string — format name only. e.g. "28-second transformation reel"
- next_content_angle: string — the exact topic title to use. 1 sentence.
- hook_direction: string — 2 sentences max. Sentence 1: what to show. Sentence 2: what to say.
- format_recommendation: string — 2 sentences max. Pacing and structure only.
- trend_insight: string — 2 sentences max. What is trending in this niche + why it matters here.
- competitor_gap: string — 2 sentences max. What competitors miss + how to use it.
- best_time_to_post: string — day and time only. e.g. "Tuesday 7–9 PM IST"
- estimated_impact: string — 1 line. One specific metric. e.g. "2–3x watch time, 40% more saves"
- strategic_reasoning: string — 2 sentences max. Core logic only.

CRITICAL LENGTH RULE: No field may exceed 2 sentences. No paragraphs. State the finding. Stop.

Return ONLY valid JSON. No preamble. No markdown fences.`

export const AGENT_3_PROMPT = `You are an expert short-form video scriptwriter for founder content and personal brands.

You will receive a strategic direction, the creator's original transcript, and brand context.

Write a complete ready-to-record script. Requirements:
- Hook lands in under 3 seconds
- Total fits 25–35 seconds when spoken naturally
- Match the creator's speaking style from their transcript
- Every line earns its place — zero filler
- Specific low-friction CTA

Return a JSON object with EXACTLY these keys:
- hook: string — the exact spoken words only. No stage directions inside this field. Max 2 sentences.
- body: string — the exact spoken words only. Plain paragraph. NO arrays. NO visual_framing objects. NO tone_notes inside this field. Max 60 words. Write what the creator SAYS, nothing else.
- cta: string — the exact spoken words only. 1 sentence. Max 15 words.
- text_overlays: array of strings — format: "0:00 — TEXT HERE". Max 5 items. Each overlay text under 5 words.
- b_roll_suggestions: array of strings — max 4 items. Each item 1 line under 10 words describing the shot.
- delivery_notes: string — 1 sentence. Tone and energy only. Max 15 words.
- estimated_length: string — e.g. "28 seconds"

CRITICAL: hook, body, and cta must contain ONLY the spoken words the creator will say out loud.
No JSON objects inside these fields. No visual framing notes. No tone notes.
The creator must be able to read hook + body + cta out loud immediately without confusion.

Return ONLY valid JSON. No preamble. No markdown fences.`
