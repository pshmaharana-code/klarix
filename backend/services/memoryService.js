// backend/services/memoryService.js
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { callAgent } from './openRouterClient.js';

const prisma = new PrismaClient();

const memorySchema = z.object({
    entries: z.array(z.object({
        domain: z.enum(['AUDIENCE', 'VOICE', 'PILLAR', 'PREFERENCE', 'LEARNING']),
        statement: z.string(),
        confidence: z.number().min(0).max(100),
        provenance_type: z.enum(['USER_INPUT', 'PATTERN', 'STRATEGY']),
        evidence_summary: z.string()
    }))
});

const MEMORY_SYSTEM_PROMPT = `You are an elite Brand Strategist and Data Synthesizer.
Your job is to read a brand's core onboarding profile alongside newly discovered performance patterns, and synthesize them into distinct, immutable facts (Brand Memory).

Categorize each memory into one of these domains:
- AUDIENCE: Who they are speaking to and what triggers them.
- VOICE: The tone and aesthetic they use.
- PILLAR: The core topics they cover.
- LEARNING: Hard algorithmic or creative lessons derived from patterns.

CRITICAL RULE: Do not invent information. Every statement must be strictly backed by the provided brand data or active patterns.

Return ONLY valid JSON conforming to this schema, with no preamble:
{
  "entries": [
    {
      "domain": "AUDIENCE",
      "statement": "Clear, concise fact about the brand.",
      "confidence": 95,
      "provenance_type": "PATTERN",
      "evidence_summary": "Brief explanation of where this came from."
    }
  ]
}`;

export async function updateMemory(brandId) {
    console.log(`[MemoryService] Initiating Memory Update for Brand: ${brandId}`);

    const brand = await prisma.brand.findUnique({
        where: { id: brandId }
    });

    const activePatterns = await prisma.pattern.findMany({
        where: { brandId, status: 'ACTIVE' }
    });

    const aiPayload = {
        brand_profile: {
            positioning: brand.positioning || "Not specified",
            audience: brand.audience || "Not specified",
            goals: brand.goals || "Not specified",
            voice: brand.voiceStyleInputs || "Not specified"
        },
        active_patterns: activePatterns.map(p => ({
            title: p.title,
            claim: p.claim,
            action: p.recommendedAction
        }))
    };

    console.log(`[MemoryService] Sending context and ${activePatterns.length} patterns to Gemini...`);

    const result = await callAgent(MEMORY_SYSTEM_PROMPT, JSON.stringify(aiPayload));
    const parsedData = memorySchema.parse(result.data);

    let newEntriesCount = 0;

    if (parsedData.entries && parsedData.entries.length > 0) {
        // Supersede old active memories to prevent conflicting logic
        await prisma.brandMemoryEntry.updateMany({
            where: { brandId, status: 'ACTIVE' },
            data: { status: 'SUPERSEDED', validTo: new Date() }
        });

        for (const entry of parsedData.entries) {
            await prisma.brandMemoryEntry.create({
                data: {
                    brandId,
                    domain: entry.domain,
                    statement: entry.statement,
                    confidence: entry.confidence,
                    status: 'ACTIVE',
                    provenance: { type: entry.provenance_type, summary: entry.evidence_summary }
                }
            });
            newEntriesCount++;
        }
    }

    console.log(`[MemoryService] Memory Update Complete. Created ${newEntriesCount} new entries.`);

    return {
        status: 'COMPLETED',
        entriesCreated: newEntriesCount
    };
}