// backend/services/scriptService.js
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { callAgent } from './openRouterClient.js';

const prisma = new PrismaClient();

const scriptSchema = z.object({
    hook: z.string(),
    opening: z.string(),
    body: z.string(),
    transitions: z.array(z.string()),
    cta: z.string(),
    visual_direction: z.string(),
    estimated_duration_seconds: z.number().int().min(5).max(180),
    voice_check: z.object({
        passed: z.boolean(),
        explanation: z.string()
    })
});

const SCRIPT_SYSTEM_PROMPT = `You are an elite, highly-paid Scriptwriter and Creative Director.
Your job is to take a specific 'Content Idea' and draft a production-ready script that perfectly aligns with the brand's 'Strategy' and 'Voice'.

CRITICAL RULES:
1. The script must directly expand on the provided 'hook' and 'format' from the Content Idea.
2. Write for spoken delivery (short sentences, punchy pacing) unless the format is explicitly text-only.
3. Include clear visual direction for the creator.
4. Perform a 'voice_check' to ensure the script does not violate the strategy's 'stop_list' or the brand's native voice.

Return ONLY valid JSON conforming to this schema, with no preamble:
{
  "hook": "The first 3 seconds to grab attention",
  "opening": "The setup or context",
  "body": "The core value delivery",
  "transitions": ["visual or audio shifts"],
  "cta": "The call to action",
  "visual_direction": "Camera angles, text-on-screen, B-roll suggestions",
  "estimated_duration_seconds": 45,
  "voice_check": { "passed": true, "explanation": "Why this matches the brand constraints" }
}`;

export async function generateScript(brandId, contentIdeaId) {
    console.log(`[ScriptService] Initiating Script Generation for Idea: ${contentIdeaId}`);

    const idea = await prisma.contentIdea.findUnique({
        where: { id: contentIdeaId },
        include: { brand: true }
    });

    if (!idea) throw new Error('Content Idea not found');

    const strategy = await prisma.strategy.findUnique({
        where: { id: idea.strategyId }
    });

    const aiPayload = {
        brand_voice: idea.brand.voiceStyleInputs || "Authentic, raw, value-driven",
        strategy_context: {
            positioning: strategy?.positioning || "",
            do_list: strategy?.doList || [],
            stop_list: strategy?.stopList || []
        },
        content_idea: {
            title: idea.title,
            hook: idea.hook,
            format: idea.format,
            pillar: idea.pillar,
            rationale: idea.rationale
        }
    };

    console.log(`[ScriptService] Sending idea and strategy context to Gemini...`);

    const result = await callAgent(SCRIPT_SYSTEM_PROMPT, JSON.stringify(aiPayload));
    const parsedData = scriptSchema.parse(result.data);

    const dbScript = await prisma.script.create({
        data: {
            contentIdeaId,
            version: 1,
            hook: parsedData.hook,
            opening: parsedData.opening,
            body: parsedData.body,
            transitions: parsedData.transitions,
            cta: parsedData.cta,
            visualDirection: parsedData.visual_direction,
            estimatedDurationSeconds: parsedData.estimated_duration_seconds,
            voiceCheck: parsedData.voice_check
        }
    });

    console.log(`[ScriptService] Script Generation Complete. Script ID: ${dbScript.id}`);

    return {
        status: 'COMPLETED',
        scriptId: dbScript.id
    };
}