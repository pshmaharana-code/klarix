// backend/services/openRouterClient.js
import { Buffer } from 'buffer';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const PRIMARY_MODEL = 'gemini-3.5-flash-lite'; // Using Native Google directly

/**
 * Helper to detect MIME type from Buffer
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
    return 'application/octet-stream'; // Fallback
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
                    // V2 FIX: Fetch the Meta CDN image server-side and convert to base64 inline_data
                    const res = await fetch(item.image_url.url);
                    if (!res.ok) throw new Error(`Failed to fetch media from Meta CDN: ${res.status}`);

                    const arrayBuffer = await res.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const mimeType = detectMimeType(buffer) || 'image/jpeg';
                    const b64Data = buffer.toString('base64');

                    parts.push({
                        inline_data: { mime_type: mimeType, data: b64Data }
                    });
                } catch (e) {
                    console.error(`[AI Provider] Failed to process media URL: ${item.image_url.url}`, e);
                    // Push a text fallback so the agent doesn't completely fail
                    parts.push({ text: `[Media missing or expired: ${item.image_url.url}]` });
                }
            } else if (item.type === 'text') {
                parts.push({ text: item.text });
            }
        }
    } else {
        // Standard text payload
        parts.push({ text: userMessage });
    }

    // 2. Build the Gemini Native Payload
    const payload = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: parts }],
        generationConfig: {
            maxOutputTokens: 4096,
            responseMimeType: 'application/json' // Force structured output
        }
    };

    // 3. Execute Request
    try {
        const response = await fetch(
            `${GEMINI_BASE_URL}/${PRIMARY_MODEL}:generateContent?key=${geminiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Gemini API Error (${response.status}): ${errorData.error?.message || 'Unknown Error'}`);
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleaned = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

        // 4. Return the strict V2 Contract
        return {
            data: JSON.parse(cleaned),
            model: PRIMARY_MODEL
        };

    } catch (error) {
        console.error(`[AI Provider] V2 Analysis Failed:`, error.message);

        // V2 FIX: Flag 503 and network errors as retryable so BullMQ tries again later
        if (error.message.includes('503') || error.message.includes('fetch') || error.message.includes('429')) {
            error.retryable = true;
            // Add an artificial 30-second delay before the queue tries again
            error.retryAfter = 30;
        }

        throw error;
    }
}