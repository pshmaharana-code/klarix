// openRouterClient.js — OPTIMIZED SINGLE-UPLOAD VERSION

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const GEMINI_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files'

const GEMINI_PRIMARY_MODEL = 'gemini-3.6-flash'
const GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite'

// In-memory cache to store active Google File URIs (b64 string -> fileUri)
const videoUploadCache = new Map()

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64)
  const byteArrays = []
  for (let i = 0; i < byteCharacters.length; i += 512) {
    const slice = byteCharacters.slice(i, i + 512)
    const byteNumbers = new Array(slice.length)
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }
    byteArrays.push(new Uint8Array(byteNumbers))
  }
  return new Blob(byteArrays, { type: mimeType })
}

export async function callAgent(systemPrompt, userMessage, useVision = false, useFallback = false) {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY

  if (!geminiKey) {
    throw new Error("No VITE_GEMINI_API_KEY found. Add it to your .env file.")
  }

  const model = useFallback ? GEMINI_FALLBACK_MODEL : GEMINI_PRIMARY_MODEL
  console.log(`[Klarix] Calling ${model}...`)

  const parts = []

  if (Array.isArray(userMessage)) {
    let slideIndex = 1
    for (const item of userMessage) {
      if (item.type === 'image_url' && item.image_url?.url) {
        const [meta, b64Data] = item.image_url.url.split(';base64,')
        const mimeType = meta ? meta.replace('data:', '') : 'image/jpeg'
        const isVideo = mimeType.startsWith('video/')

        if (isVideo) {
          let fileUri = videoUploadCache.get(b64Data)

          if (!fileUri) {
            console.log('[Klarix] New video detected. Uploading to Gemini File API (Once)...')
            try {
              const blob = base64ToBlob(b64Data, mimeType)

              const uploadRes = await fetch(`${GEMINI_UPLOAD_URL}?key=${geminiKey}`, {
                method: 'POST',
                headers: {
                  'X-Goog-Upload-Protocol': 'raw',
                  'X-Goog-Upload-Command': 'start, upload',
                  'X-Goog-Upload-Header-Content-Length': blob.size.toString(),
                  'X-Goog-Upload-Header-Content-Type': mimeType,
                  'Content-Type': mimeType
                },
                body: blob
              })

              if (!uploadRes.ok) throw new Error('Video upload request failed.')

              const uploadData = await uploadRes.json()
              fileUri = uploadData.file.uri
              const fileName = uploadData.file.name

              console.log('[Klarix] Video uploaded. Waiting for Google processing...')
              let isReady = false
              while (!isReady) {
                await new Promise(r => setTimeout(r, 2000))
                const checkRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${geminiKey}`)
                const checkData = await checkRes.json()

                if (checkData.state === 'ACTIVE') {
                  isReady = true
                } else if (checkData.state === 'FAILED') {
                  throw new Error('Gemini video processing failed.')
                }
              }

              // Cache file URI for subsequent agent calls / retries
              videoUploadCache.set(b64Data, fileUri)
              console.log('[Klarix] Video ready & cached for reuse.')
            } catch (err) {
              console.error('[Klarix] File API Error:', err)
              throw new Error('Could not process video via Google File API: ' + err.message)
            }
          } else {
            console.log('[Klarix] Reusing existing cached video File URI (0s upload time).')
          }

          parts.push({ text: '[Video Reel — analyse frame by frame and extract transcript]' })
          parts.push({ file_data: { mime_type: mimeType, file_uri: fileUri } })
        } else {
          parts.push({ text: `[Carousel Slide #${slideIndex++}]` })
          parts.push({ inline_data: { mime_type: mimeType, data: b64Data } })
        }
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
      maxOutputTokens: 4096, // Increased to prevent JSON truncation
      temperature: 0.2,      // Lower temperature for cleaner JSON compliance
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

      if (!useFallback) {
        console.log(`[Klarix] Retrying with fallback model ${GEMINI_FALLBACK_MODEL}...`)
        return await callAgent(systemPrompt, userMessage, useVision, true)
      }
      throw new Error(`Both Gemini models failed. Last error: ${msg}`)
    }

    const data = await response.json()
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!rawText) throw new Error("Gemini returned empty response.")

    const cleaned = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()

    try {
      return JSON.parse(cleaned)
    } catch {
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
