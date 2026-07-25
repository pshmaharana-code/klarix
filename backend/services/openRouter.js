import dotenv from 'dotenv'
dotenv.config()

/**
 * Sends a structured prompt to OpenRouter API with robust JSON extraction and fallbacks
 */
export async function generateAiJson({ systemPrompt, userMessage, model = "google/gemini-2.5-flash", fallbackModel = "meta-llama/llama-3.3-70b-instruct" }) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not defined in backend/.env")
  }

  const payload = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    temperature: 0.7,
    response_format: { type: "json_object" }
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://klarix.ai",
        "X-Title": "Klarix V1 AI Analyser"
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errText = await response.text()
      console.warn(`[OpenRouter] Primary model ${model} failed (${response.status}): ${errText}. Attempting fallback model ${fallbackModel}...`)
      return await executeFallback({ apiKey, systemPrompt, userMessage, model: fallbackModel })
    }

    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content || "{}"
    return extractJson(rawContent)
  } catch (error) {
    console.error(`[OpenRouter] Execution error with ${model}:`, error)
    return await executeFallback({ apiKey, systemPrompt, userMessage, model: fallbackModel })
  }
}

async function executeFallback({ apiKey, systemPrompt, userMessage, model }) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://klarix.ai",
        "X-Title": "Klarix V1 AI Analyser"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`Fallback API error: ${response.statusText}`)
    }
    const data = await response.json()
    return extractJson(data.choices?.[0]?.message?.content || "{}")
  } catch (err) {
    console.error(`[OpenRouter] Fallback model ${model} also failed:`, err)
    return null
  }
}

function extractJson(content) {
  try {
    // Strip markdown fences if AI wrapped it in ```json ... ```
    let cleaned = content.trim()
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/, "")
    }
    return JSON.parse(cleaned)
  } catch (e) {
    console.error("[OpenRouter] Failed to parse JSON from AI response:", content)
    return null
  }
}
