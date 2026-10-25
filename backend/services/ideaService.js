// backend/services/ideaService.js
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { callAgent } from './openRouterClient.js';

const prisma = new PrismaClient();

const ideaSchema = z.object({
    ideas: z.array(z.object({
        title: z.string(),
        hook: z.string(),
        pillar: z.string(),
        format: z.string(),
        rationale: z.string(),
        source_refs: z.array(z.string())
    }))
});

const IDEA_SYSTEM_PROMPT = `You are an elite Content Ideation Engine.
Your objective is to read a brand's validated Strategy and their active Brand Memory, and generate 3 highly specific, platform-ready content ideas.

CRITICAL RULES:
1. Every idea MUST strictly align with the Strategy's 'pillars' and 'recommended_formats'.
2. You must completely avoid any formats or concepts listed in the 'stop_list'.
3. Every idea must include an exact 'rationale' explaining why it was chosen based on the strategy.
4. You must populate 'source_refs' with the exact IDs of the strategic pillars or memory entries that triggered the idea. Do not invent IDs.

Return ONLY valid JSON conforming to this schema, with no preamble:
{
  "ideas": [
    {
      "title": "Internal working title",
      "hook": "The exact opening line or visual hook",
      "pillar": "Exact name of the strategic pillar this supports",
      "format": "Exact format from the recommended_formats list",
      "rationale": "Why this works mathematically and psychologically",
      "source_refs": ["id-string-1", "id-string-2"]
    }
  ]
}`;

export async function generateContentIdeas(brandId, strategyId) {
    console.log(`[IdeaService] Initiating Idea Generation for Strategy: ${strategyId}`);

    const strategy = await prisma.strategy.findUnique({
        where: { id: strategyId }
    });

    if (!strategy) {
        throw new Error('Strategy not found');
    }

    // Pass active memory along so the AI knows the exact source strings/IDs
    const memories = await prisma.brandMemoryEntry.findMany({
        where: { brandId, status: 'ACTIVE' },
        select: { id: true, domain: true, statement: true }
    });

    const aiPayload = {
        strategy: {
            objective: strategy.objective,
            target_audience: strategy.targetAudience,
            positioning: strategy.positioning,
            pillars: strategy.pillars,
            recommended_formats: strategy.recommendedFormats,
            do_list: strategy.doList,
            stop_list: strategy.stopList
        },
        active_memory: memories
    };

    console.log(`[IdeaService] Sending strategy and context to Gemini...`);

    const result = await callAgent(IDEA_SYSTEM_PROMPT, JSON.stringify(aiPayload));
    const parsedData = ideaSchema.parse(result.data);

    const createdIdeaIds = [];

    for (const idea of parsedData.ideas) {
        const dbIdea = await prisma.contentIdea.create({
            data: {
                brandId,
                strategyId,
                title: idea.title,
                hook: idea.hook,
                pillar: idea.pillar,
                format: idea.format,
                rationale: idea.rationale,
                sourceRefs: idea.source_refs,
                status: 'DRAFT'
            }
        });
        createdIdeaIds.push(dbIdea.id);
    }

    console.log(`[IdeaService] Idea Generation Complete. Generated ${createdIdeaIds.length} ideas.`);

    return {
        status: 'COMPLETED',
        ideaCount: createdIdeaIds.length,
        ideaIds: createdIdeaIds
    };
}