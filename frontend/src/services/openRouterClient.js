// Direct Google AI Studio API Endpoint Base
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions'

// Primary & Direct Fallback Models (Free high-limit execution via Google AI Studio Key)
const GEMINI_PRIMARY_MODEL = 'gemini-2.5-flash'
const GEMINI_FALLBACK_MODEL = 'gemini-2.0-flash'
const OPENROUTER_STANDBY_MODEL = 'meta-llama/llama-3.3-70b-instruct'

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
 * Core AI Agent Execution Engine
 * Evaluates visual streams and analytics using Direct Google Gemini with OpenRouter-grade structural packaging.
 */
export async function callAgent(systemPrompt, userMessage, useVision = false, fallbackStage = 0) {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY

  if (!geminiKey && !openRouterKey) {
    throw new Error("No API keys configured! Add VITE_GEMINI_API_KEY to your frontend/.env file.")
  }

  // Stage 0: Direct Google gemini-2.5-flash
  // Stage 1: Direct Google gemini-2.0-flash
  // Stage 2: OpenRouter Standby (Llama 3.3 text fallback)
  const currentModel = fallbackStage === 0 ? GEMINI_PRIMARY_MODEL : (fallbackStage === 1 ? GEMINI_FALLBACK_MODEL : OPENROUTER_STANDBY_MODEL)

  if (fallbackStage === 0 || fallbackStage === 1) {
    if (!geminiKey) {
      console.warn(`[Klarix Engine] No VITE_GEMINI_API_KEY found, jumping to OpenRouter standby...`)
      return await callAgent(systemPrompt, userMessage, useVision, 2)
    }

    console.log(`[Klarix Engine] Executing agent directly via Google AI Studio (${currentModel}) with high-fidelity structural formatting...`)

    try {
      // Structure native Gemini parts with OpenRouter-grade labeling for maximum diagnostic depth
      const parts = []
      
      if (Array.isArray(userMessage)) {
        let slideIndex = 1
        for (const item of userMessage) {
          if (item.type === 'image_url' && item.image_url?.url) {
            const [meta, b64Data] = item.image_url.url.split(';base64,')
            const mimeType = meta ? meta.replace('data:', '') : 'image/jpeg'
            const isVideo = mimeType.startsWith('video/')
            
            // Inject structural media framing so Gemini evaluates video frames and Carousel slide progressions accurately
            parts.push({
              text: isVideo ? `[ATTACHMENT: Video Reel Audio & Visual Stream]` : `[ATTACHMENT: Carousel Slide / Frame #${slideIndex++}]`
            })
            parts.push({
              inline_data: {
                mime_type: mimeType,
                data: b64Data
              }
            })
          } else if (item.type === 'text') {
            parts.push({
              text: `\n--- DETAILED TASK & ANALYTICS INSTRUCTIONS ---\n${item.text}\n\nCRITICAL DEPTH MANDATE: Provide an exhaustive, rigorous, high-fidelity analysis. Do not abbreviate or shorten any findings. Provide complete spoken transcripts, explicit frame timestamps, granular layout critiques, and detailed strategic direction.`
            })
          }
        }
      } else {
        parts.push({
          text: `${userMessage}\n\nCRITICAL DEPTH MANDATE: Provide an exhaustive, rigorous, high-fidelity analysis. Do not abbreviate or shorten any findings. Provide complete spoken transcripts, explicit frame timestamps, granular layout critiques, and detailed strategic direction.`
        })
      }

      const payload = {
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: 'user',
            parts: parts
          }
        ],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.5,
          responseMimeType: 'application/json'
        }
      }

      const response = await fetch(`${GEMINI_BASE_URL}/${currentModel}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        const errDesc = errJson?.error?.message || errJson?.error || response.statusText || `HTTP ${response.status}`
        throw new Error(`Google AI Studio API error (${response.status}): ${typeof errDesc === 'string' ? errDesc : JSON.stringify(errDesc)}`)
      }

      const data = await response.json()
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (!rawText) {
        throw new Error("Direct Gemini returned empty content response.")
      }

      const cleaned = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
      try {
        return JSON.parse(cleaned)
      } catch (jsonParseError) {
        console.warn("[Klarix Engine] Direct Gemini JSON parse hiccup, extracting matching braces...", jsonParseError)
        const match = cleaned.match(/\{[\s\S]*\}/)
        if (match) {
          return JSON.parse(match[0])
        }
        throw jsonParseError
      }
    } catch (error) {
      console.warn(`[Klarix Engine] Direct Gemini (${currentModel}) execution hiccup: ${error.message}. Shifting cleanly to fallback Stage ${fallbackStage + 1}...`)
      return await callAgent(systemPrompt, userMessage, useVision, fallbackStage + 1)
    }
  }

  // Stage 2: Final Emergency Standby via OpenRouter Gateway
  if (!openRouterKey) {
    throw new Error("All Direct Gemini API executions hit limitations, and no VITE_OPENROUTER_API_KEY is configured for emergency standby.")
  }

  console.log(`[Klarix Engine] Executing emergency standby via OpenRouter Gateway (${OPENROUTER_STANDBY_MODEL})...`)

  let formattedContent = userMessage
  if (Array.isArray(userMessage)) {
    formattedContent = userMessage
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join(' ')
  }

  try {
    const response = await fetch(OPENROUTER_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'https://klarix.ai',
        'X-Title': 'Klarix',
      },
      body: JSON.stringify({
        model: OPENROUTER_STANDBY_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: formattedContent }
        ],
        max_tokens: 1350,
        temperature: 0.5,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}))
      const errDesc = errJson?.error?.message || errJson?.error || response.statusText || `HTTP ${response.status}`
      throw new Error(`OpenRouter Standby error (${response.status}): ${typeof errDesc === 'string' ? errDesc : JSON.stringify(errDesc)}`)
    }

    const data = await response.json()
    const rawText = data?.choices?.[0]?.message?.content || ''
    const cleaned = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : JSON.parse(cleaned)
  } catch (error) {
    console.error(`[Klarix Engine] Complete engine failure across all stages:`, error)
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
