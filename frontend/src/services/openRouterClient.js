const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions'

// 1. Primary Model: routed through OpenRouter for native multimodal visual reasoning & structured message precision
const PRIMARY_MODEL   = 'google/gemini-2.5-flash'

// 2. Automated Fallback Model: seamlessly catches temporary throttles without interrupting the user experience
const FALLBACK_MODEL  = 'meta-llama/llama-3.3-70b-instruct'

/**
 * Converts File to Base64 (stripping the data:...;base64, prefix)
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Core AI Agent Execution Engine via OpenRouter Gateway
 * Structures system instructions and multimodal array blocks according to OpenRouter's exact message specification.
 */
export async function callAgent(systemPrompt, userMessage, useVision = false, useFallback = false) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error("OpenRouter API key not configured. Add VITE_OPENROUTER_API_KEY to your frontend/.env file.")
  }

  const model = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL

  // Format message content appropriately for vision vs text fallback models
  let formattedContent = userMessage
  if (useFallback && Array.isArray(userMessage)) {
    // If falling back to Llama text reasoning model, strip Base64 image arrays and preserve analytical instruction text
    formattedContent = userMessage
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join(' ')
  }

  console.log(`[Klarix Engine] Executing agent via OpenRouter Gateway (${model})...`)

  try {
    const response = await fetch(OPENROUTER_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://klarix.ai',
        'X-Title': 'Klarix',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: formattedContent }
        ],
        max_tokens: 4000,
        temperature: 0.5,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}))
      const errDesc = errJson?.error?.message || errJson?.error || response.statusText || `HTTP ${response.status}`
      throw new Error(`OpenRouter API rejected request (${response.status}): ${typeof errDesc === 'string' ? errDesc : JSON.stringify(errDesc)}`)
    }

    const data = await response.json()
    const rawText = data?.choices?.[0]?.message?.content || ''
    if (!rawText) {
      throw new Error("OpenRouter returned empty content response.")
    }

    const cleaned = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)

  } catch (error) {
    if (!useFallback) {
      console.warn(`[Klarix Engine] Primary model (${PRIMARY_MODEL}) failed: ${error.message}. Switching seamlessly to automated Llama 3.3 fallback...`)
      return await callAgent(systemPrompt, userMessage, useVision, true)
    }
    console.error(`[Klarix Engine] Both primary and fallback OpenRouter executions failed:`, error)
    throw error
  }
}

// --- AGENT SYSTEM PROMPTS ---

export const AGENT_1_PROMPT = `You are a senior social media performance analyst specialising in short-form video and visual content for founders and personal brands.

You will receive:
- The actual content (video or image) — analyse it thoroughly
- Analytics numbers (views, watch time, saves, shares, comments, etc.)
- Brand context (who the creator is and their audience)
- Content type (reel, carousel, or static post) and platform

YOUR JOB IS ONLY TO DIAGNOSE. Do not give strategic advice yet.

Analyse the content and return a JSON object with EXACTLY these keys:
hook_strength, retention_drop_point, retention_drop_reason, visual_quality, transcript_quality, cta_strength, metric_interpretation (object with keys: views, watch_time, saves, shares, comments), content_type_fit, what_worked (array of 3-4 strings), what_failed (array of 3-4 strings), overall_diagnosis (string).

CRITICAL DEPTH INSTRUCTION: Perform a granular frame-by-frame and slide-by-slide visual breakdown. Explicitly describe observable visual minutiae (camera angle, lighting, graphic typography contrast, founder expressions, pacing). Provide an exact transcription of all audible speech or on-screen text in transcript_quality. Never use brief sentences or superficial summaries; elaborate with rigorous technical depth.

Return ONLY a valid JSON object. No preamble. No explanation. No markdown fences.`

export const AGENT_2_PROMPT = `You are a social media growth strategist who works exclusively with founders and personal brands. You have access to current platform trends.

You will receive:
- A performance diagnosis from the analyst (JSON)
- Brand context
- Current trending content research in the creator's niche

YOUR JOB: Identify the single highest-leverage next move. ONE direction, not a list.

Return a JSON object with EXACTLY these keys:
primary_bottleneck, priority_fix, next_content_type (reel/carousel/static), next_content_angle, hook_direction, format_recommendation, trend_insight, competitor_gap, best_time_to_post, estimated_impact, strategic_reasoning.

CRITICAL STRATEGIC DEPTH INSTRUCTION: Support your deductions with deep psychological and platform algorithm reasoning. Elaborate extensively on competitor blind spots and specific layout formatting so the creator clearly grasps the actionable advantage. Avoid brief bullet points or high-level generalizations.

Return ONLY a valid JSON object. No preamble. No markdown fences.`

export const AGENT_3_PROMPT = `You are an expert short-form video scriptwriter for founder content and personal brands.

You will receive:
- A strategic direction from the strategist (JSON)
- The creator's original transcript (to match their voice and speaking style)
- Brand context

Write a complete ready-to-record script that:
1. Has a hook that lands in under 3 seconds
2. Fits 25-35 seconds when spoken at natural pace
3. Matches the creator's exact speaking style from their transcript
4. Fixes every weakness the analyst identified
5. Has a specific, low-friction CTA (not "like and subscribe")

Return a JSON object with EXACTLY these keys:
hook, body, cta, text_overlays (array of strings with timestamps), b_roll_suggestions (array of 3-4 strings), delivery_notes, estimated_length.

CRITICAL SCRIPTBUILDING INSTRUCTION: Construct a comprehensive, ready-to-record script. Write out every single word of spoken dialogue in full, accompanied by exact visual framing cues, typographic text overlay timestamps, and expressive tone notes. Never shorten, abbreviate, or outline the script. Match the creator's genuine spoken rhythm.

Return ONLY a valid JSON object. No preamble. No markdown fences.`
