// openRouterClient.js — BACKEND NODE.JS OPTIMIZED SINGLE-UPLOAD VERSION

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const GEMINI_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files'

const GEMINI_PRIMARY_MODEL = 'gemini-3.8-flash'
const GEMINI_FALLBACK_MODEL = 'gemini-3.6-flash'

// In-memory cache to store active Google File URIs (b64 string -> fileUri)
const videoUploadCache = new Map()

/**
 * Converts Base64 string to Node.js Blob
 */
function base64ToBlob(base64, mimeType) {
  const buffer = Buffer.from(base64, 'base64')
  return new Blob([buffer], { type: mimeType })
}

function detectMimeType(buffer) {
  if (!buffer || buffer.length < 12) return null;
  const hex = buffer.toString('hex', 0, 8).toUpperCase();
  if (hex.startsWith('FFD8FF')) return 'image/jpeg';
  if (hex.startsWith('89504E470D0A1A0A')) return 'image/png';
  if (hex.startsWith('47494638')) return 'image/gif';
  
  const riff = buffer.toString('utf8', 0, 4);
  const webp = buffer.toString('utf8', 8, 12);
  if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';
  
  const ftyp = buffer.toString('utf8', 4, 8);
  if (ftyp === 'ftyp') return 'video/mp4';
  
  return null;
}

export async function callAgent(systemPrompt, userMessage, useVision = false, useFallback = false) {
  const isTest = process.env.NODE_ENV === 'test' || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('klarix_test'));
  if (isTest) {
    if (systemPrompt.includes('visual analyst')) return { extracted_visual_text: [], format_classification: "talking head" };
    if (systemPrompt.includes('content analyst')) return { themes: ["mocked theme"] };
    if (systemPrompt.includes('performance analyst')) return { performance_factors: ["mocked factor"] };
    return {};
  }

  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY

  if (!geminiKey) {
    throw new Error("No GEMINI_API_KEY found in process.env. Add it to your backend/.env file.")
  }

  const model = useFallback ? GEMINI_FALLBACK_MODEL : GEMINI_PRIMARY_MODEL
  console.log(`[Klarix Backend] Calling ${model}...`)

  const parts = []

  if (Array.isArray(userMessage)) {
    let slideIndex = 1
    for (const item of userMessage) {
      if (item.type === 'image_url' && item.image_url?.url) {
        let mimeType;
        let b64Data;
        const urlStr = item.image_url.url;

        if (urlStr.startsWith('data:')) {
          const [meta, dataStr] = urlStr.split(';base64,');
          mimeType = meta ? meta.replace('data:', '') : '';
          b64Data = dataStr;
        } else if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
          try {
            const res = await fetch(urlStr);
            if (!res.ok) throw new Error(`Failed to fetch media from URL: ${res.status}`);
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            let headerMime = res.headers.get('content-type') || '';
            headerMime = headerMime.split(';')[0].trim();
            
            const detectedMime = detectMimeType(buffer);
            mimeType = detectedMime || headerMime;
            
            if (!mimeType || mimeType === 'application/octet-stream') {
              throw new Error('Could not determine a valid MIME type from downloaded media.');
            }
            b64Data = buffer.toString('base64');
          } catch (e) {
             throw new Error(`Media fetch failed: ${e.message} ${e.cause ? e.cause.message : ''}`);
          }
        } else {
          throw new Error('Unsupported image_url format.');
        }

        if (!mimeType || mimeType.length > 255) {
          throw new Error(`Invalid MIME type derived: ${mimeType}`);
        }

        const isVideo = mimeType.startsWith('video/')

        if (isVideo) {
          let fileUri = videoUploadCache.get(b64Data)

          if (!fileUri) {
            console.log('[Klarix Backend] New video detected. Uploading to Gemini File API (Once)...')
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

              console.log('[Klarix Backend] Video uploaded. Waiting for Google processing...')
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

              videoUploadCache.set(b64Data, fileUri)
              console.log('[Klarix Backend] Video ready & cached for reuse.')
            } catch (err) {
              console.error('[Klarix Backend] File API Error:', err)
              throw new Error('Could not process video via Google File API: ' + err.message)
            }
          } else {
            console.log('[Klarix Backend] Reusing existing cached video File URI (0s upload time).')
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
      maxOutputTokens: 4096,
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
      console.warn(`[Klarix Backend] ${model} failed: ${msg}`)

      if (!useFallback) {
        console.log(`[Klarix Backend] Retrying with fallback model ${GEMINI_FALLBACK_MODEL}...`)
        return await callAgent(systemPrompt, userMessage, useVision, true)
      }
      
      const finalError = new Error(`Both Gemini models failed. Last error: ${msg}`);
      if (response.status === 503 || response.status === 429 || response.status >= 500) {
        finalError.retryable = true;
      }
      throw finalError;
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
      console.warn(`[Klarix Backend] Primary failed, trying fallback: ${error.message}`)
      return await callAgent(systemPrompt, userMessage, useVision, true)
    }
    // Network errors (fetch failed) are retryable
    if (error.cause && error.cause.code === 'ECONNREFUSED') error.retryable = true;
    if (error.message.includes('fetch')) error.retryable = true;
    throw error
  }
}
