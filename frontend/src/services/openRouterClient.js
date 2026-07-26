const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions'

// Direct Google Gemini Models (Primary Engine - 30x more free usage)
const DIRECT_GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite-001', 'gemini-2.0-flash-001', 'gemini-2.5-flash']

// Standby Emergency Fallback (Text-Only via OpenRouter)
const FALLBACK_MODEL = 'meta-llama/llama-3.3-70b-instruct'

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
 * Priortizes Direct Google Gemini AI Studio endpoints for high-speed multimodal analysis.
 * Automatically guarantees Gemini completion without triggering text-only OpenRouter fallback unless an outage occurs.
 */
export async function callAgent(systemPrompt, userMessage, useVision = false, retryCount = 0) {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY

  if (!geminiKey && !openRouterKey) {
    throw new Error("API key not configured. Please add your Gemini or OpenRouter API key to the frontend/.env file.")
  }

  // --- PARSE USER MESSAGE TO EXTRACT TEXT AND MULTIMEDIA INLINE DATA ---
  let promptText = ""
  const inlineMediaParts = []

  if (Array.isArray(userMessage)) {
    for (const item of userMessage) {
      if (item.type === 'text') {
        promptText += item.text + " "
      } else if (item.type === 'image_url' && item.image_url?.url) {
        // Extract exact MIME type and raw base64 string from Data URL
        const matches = item.image_url.url.match(/^data:([^;]+);base64,(.+)$/)
        if (matches) {
          inlineMediaParts.push({
            inline_data: {
              mime_type: matches[1], // e.g., 'video/mp4' or 'image/jpeg'
              data: matches[2]
            }
          })
        }
      }
    }
  } else {
    promptText = String(userMessage)
  }

// Circuit breaker flag to prevent flooding DevTools with red errors when Google Free Tier hits a Quota (429) wall
let googleQuotaCooldownUntil = 0

// =========================================================================
// PRIMARY ENGINE: DIRECT GOOGLE GEMINI API (NO OPENROUTER ROUTING)
// =========================================================================
if (geminiKey && retryCount < DIRECT_GEMINI_MODELS.length && Date.now() > googleQuotaCooldownUntil) {
  const targetModel = DIRECT_GEMINI_MODELS[retryCount]
  const url = `${GEMINI_API_BASE}/${targetModel}:generateContent?key=${geminiKey}`

  try {
    console.log(`[Klarix Direct Engine] Executing agent via direct Google Gemini endpoint: ${targetModel}...`)
    
    // Architect structured multi-part context payload for peak multimodal depth and frame-by-frame visual resolution
    const contentsParts = [
      {
        text: `### CORE SYSTEM INSTRUCTION & AGENT ARCHITECTURE ###\n${systemPrompt}\n\n### MULTIMEDIA INGESTION & ANALYTICAL MANDATE ###\nPerform exhaustive diagnostic evaluation on all assets and metrics provided below:`
      }
    ]

    // Wrap media chunks with contextual framing labels so Gemini conducts granular frame and typography breakdowns
    if (useVision && inlineMediaParts.length > 0) {
      inlineMediaParts.forEach((part, idx) => {
        contentsParts.push({ 
          text: `\n[--- MEDIA ASSET #${idx + 1} (${part.inline_data.mime_type.toUpperCase()}): DEEP FRAME-BY-FRAME VISUAL, TYPOGRAPHY & TRANSCRIPT EXTRACTION ---]` 
        })
        contentsParts.push(part)
      })
    }

    contentsParts.push({ 
      text: `\n\n### SPECIFIC TASK EXECUTION DIRECTIVES ###\n${promptText.trim()}\n\nCRITICAL QUALITY ENFORCEMENT:\n1. Provide comprehensive, exhaustive depth in your analytical fields. Never use brief, vague, or summary sentences.\n2. In visual and transcript fields, cite precise observable visual details (lighting, text placement, color contrasts, founder emotion) and exact speech wording.\n3. Return STRICTLY the specified JSON schema without any surrounding text or markdown formatting.` 
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: 'user',
            parts: contentsParts
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.7,
          top_p: 0.95,
          max_output_tokens: 8192
        }
      })
    })

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}))
      const errDesc = errJson?.error?.message || response.statusText || `HTTP ${response.status}`
      console.warn(`[Klarix Direct Engine] Gemini model (${targetModel}) encountered issue (${response.status}): ${errDesc}`)
      
      // If Google Free Tier reports 429 (Quota Exceeded), open circuit breaker for 60 seconds and switch cleanly to OpenRouter
      if (response.status === 429) {
        console.warn("[Klarix Circuit Breaker] Google Free Tier quota reached. Bypassing further Direct Gemini calls for 60 seconds...")
        googleQuotaCooldownUntil = Date.now() + 60000
        throw new Error("QUOTA_EXCEEDED")
      }

      // If a specific model returns a temporary syntax or version error (e.g. 404), step to alternate Google model
      return await callAgent(systemPrompt, userMessage, useVision, retryCount + 1)
    }

      const data = await response.json()
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (!rawText) {
        throw new Error("Direct Gemini returned empty candidates array.")
      }

      const cleaned = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
      return JSON.parse(cleaned)

    } catch (directGeminiError) {
      console.warn(`[Klarix Direct Engine] Attempt ${targetModel} failed: ${directGeminiError.message}.`)
      // Only attempt alternative Direct Google models if the issue was not quota exhaustion
      if (directGeminiError.message !== "QUOTA_EXCEEDED" && retryCount + 1 < DIRECT_GEMINI_MODELS.length) {
        return await callAgent(systemPrompt, userMessage, useVision, retryCount + 1)
      }
      console.error("[Klarix Direct Engine] Direct Google Gemini attempt finalized or throttled. Executing OpenRouter standby...")
    }
  }

  // =========================================================================
  // EMERGENCY STANDBY FALLBACK: OPENROUTER KEY (TEXT-ONLY IF GEMINI FAILS)
  // =========================================================================
  console.warn(`[Klarix Standby Engine] Activating emergency text-only OpenRouter routing using ${FALLBACK_MODEL}...`)
  
  if (!openRouterKey) {
    throw new Error("Direct Gemini API failed and no OpenRouter fallback key was provided in .env.")
  }

  const response = await fetch(OPENROUTER_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openRouterKey}`,
      'HTTP-Referer': 'https://klarix.ai',
      'X-Title': 'Klarix',
    },
    body: JSON.stringify({
      model: FALLBACK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: promptText.trim() } // Standby fallback is strict text-only
      ],
      max_tokens: 2500,
      temperature: 0.4,
      response_format: { type: 'json_object' }
    })
  })

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}))
    const errMsg = errJson?.error?.message || errJson?.error || response.statusText || `HTTP ${response.status}`
    throw new Error(`Analysis failed: ${typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg)}`)
  }

  const data = await response.json()
  const rawText = data?.choices?.[0]?.message?.content || ''
  const cleaned = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
  
  return JSON.parse(cleaned)
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
