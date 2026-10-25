// backend/services/openRouterClient.js
import { Buffer } from 'buffer';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files';
const PRIMARY_MODEL = 'gemini-3.5-flash-lite'; // Using Native Google directly

/**
 * Helper to detect MIME type from Buffer (Images & Video)
 */
function detectMimeType(buffer) {
    if (!buffer || buffer.length < 12) return null;
    const hex = buffer.toString('hex', 0, 8).toUpperCase();
    if (hex.startsWith('FFD8FF')) return 'image/jpeg';
    if (hex.startsWith('89504E470D0A1A0A')) return 'image/png';
    if (hex.startsWith('47494638')) return 'image/gif';
    const riff = buffer.toString('utf8', 0, 4);
    const webp = buffer.toString('utf8', 8, 12);
    if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';

    // MP4 signature check (ftyp at byte 4)
    const ftyp = buffer.toString('utf8', 4, 8);
    if (ftyp === 'ftyp') return 'video/mp4';

    return null; // Fallback
}

/**
 * Uploads a heavy video to Gemini's File API and polls until ACTIVE
 */
async function uploadAndPollVideo(buffer, mimeType, geminiKey) {
    console.log(`[AI Provider] Uploading video to Gemini File API (${mimeType}, ${(buffer.length / 1024 / 1024).toFixed(2)} MB)...`);

    // 1. Upload the raw binary
    const uploadRes = await fetch(`${GEMINI_UPLOAD_URL}?uploadType=media&key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': mimeType },
        body: buffer
    });

    if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(`Failed to upload video to Gemini: ${err.error?.message || uploadRes.status}`);
    }

    const uploadData = await uploadRes.json();
    const fileUri = uploadData.file.uri;
    const fileName = uploadData.file.name;
    let fileState = uploadData.file.state;

    console.log(`[AI Provider] Video uploaded. File: ${fileName}. State: ${fileState}. Polling for processing...`);

    // 2. Poll until ACTIVE (Max 2 minutes / 40 attempts)
    let attempts = 0;
    while (fileState === 'PROCESSING' && attempts < 40) {
        await new Promise(r => setTimeout(r, 3000)); // wait 3 seconds
        const checkRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${geminiKey}`);
        if (checkRes.ok) {
            const checkData = await checkRes.json();
            fileState = checkData.state;
        }
        attempts++;
    }

    if (fileState === 'FAILED') throw new Error(`Gemini Video Processing Failed for ${fileName}`);
    if (fileState === 'PROCESSING') throw new Error(`Gemini Video Processing Timed Out after 2 minutes for ${fileName}`);

    console.log(`[AI Provider] Video processing complete. State: ${fileState}. Ready for analysis.`);
    return fileUri;
}

/**
 * The V2 Agent Caller
 * Strictly returns { data: parsedJSON, model: string }
 */
export async function callAgent(systemPrompt, userMessage) {
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
        throw new Error("CRITICAL: GEMINI_API_KEY is missing from backend/.env");
    }

    const parts = [];

    // 1. Handle V2 Array Payloads (Text + Meta CDN URLs)
    if (Array.isArray(userMessage)) {
        for (const item of userMessage) {
            if (item.type === 'image_url' && item.image_url?.url) {
                try {
                    const res = await fetch(item.image_url.url);
                    if (!res.ok) throw new Error(`Failed to fetch media from Meta CDN: ${res.status}`);

                    const arrayBuffer = await res.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    // Determine MIME type (use HTTP header as fallback, then standard fallback)
                    const headerMime = res.headers.get('content-type');
                    const detectedMime = detectMimeType(buffer);
                    const mimeType = detectedMime || (headerMime && headerMime !== 'application/octet-stream' ? headerMime : 'image/jpeg');

                    if (mimeType.startsWith('video/')) {
                        // V2 FIX: Use Google's File API for Videos to prevent Base64 bloat timeouts
                        const fileUri = await uploadAndPollVideo(buffer, mimeType, geminiKey);
                        parts.push({
                            file_data: { mime_type: mimeType, file_uri: fileUri }
                        });
                    } else {
                        // Keep images as fast Base64 inline_data
                        const b64Data = buffer.toString('base64');
                        parts.push({
                            inline_data: { mime_type: mimeType, data: b64Data }
                        });
                    }
                } catch (e) {
                    console.error(`[AI Provider] Failed to process media URL: ${item.image_url.url}`, e);
                    parts.push({ text: `[Media missing, expired, or failed to process: ${item.image_url.url}]` });
                }
            } else if (item.type === 'text') {
                parts.push({ text: item.text });
            }
        }
    } else {
        parts.push({ text: userMessage });
    }

    const payload = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: parts }],
        generationConfig: {
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'
        }
    };

    // 3. Execute Request with a 4-minute Timeout (Extended for Video Processing)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240000); // 240 seconds

    try {
        const response = await fetch(
            `${GEMINI_BASE_URL}/${PRIMARY_MODEL}:generateContent?key=${geminiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Gemini API Error (${response.status}): ${errorData.error?.message || 'Unknown Error'}`);
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleaned = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

        return {
            data: JSON.parse(cleaned),
            model: PRIMARY_MODEL
        };

    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            console.error(`[AI Provider] V2 Analysis Failed: Gemini API Timeout (Hanging Request)`);
            const timeoutErr = new Error('Gemini API request timed out after 240 seconds.');
            timeoutErr.retryable = true;
            timeoutErr.retryAfter = 15;
            throw timeoutErr;
        }

        console.error(`[AI Provider] V2 Analysis Failed:`, error.message);

        if (error.message.includes('503') || error.message.includes('fetch') || error.message.includes('429') || error.message.includes('Timeout')) {
            error.retryable = true;
            error.retryAfter = 30;
        }

        throw error;
    }
}