// backend/services/strategyService.js
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { callAgent } from './openRouterClient.js';

const prisma = new PrismaClient();

const strategySchema = z.object({
    objective: z.string(),
    target_audience: z.string(),
    positioning: z.string(),
    pillars: z.array(z.object({
        name: z.string(),
        description: z.string(),
        rationale: z.string()
    })),
    recommended_formats: z.array(z.object({
        format: z.string(),
        description: z.string()
    })),
    do_list: z.array(z.string()),
    stop_list: z.array(z.string()),
    experiments: z.array(z.object({
        hypothesis: z.string(),
        method: z.string()
    })),
    success_metrics: z.array(z.string())
});

const STRATEGY_SYSTEM_PROMPT = `You are an elite Head of Strategy for a top-tier digital agency.
Your objective is to read a brand's core profile and their validated "Brand Memory" (internal intelligence and performance facts), and generate a highly actionable, data-driven content strategy.

CRITICAL RULES:
1. Base all recommendations STRICTLY on the provided Brand Memory and Profile. Do not hallucinate generic marketing advice.
2. The 'stop_list' must directly address any negative learnings or failures from the Brand Memory.
3. The strategy must be ruthless, specific, and actionable.

Return ONLY valid JSON conforming to this schema, with no preamble:
{
  "objective": "Clear 30-day goal",
  "target_audience": "Specific audience description",
  "positioning": "How the brand is positioned in the market",
  "pillars": [{ "name": "...", "description": "...", "rationale": "..." }],
  "recommended_formats": [{ "format": "...", "description": "..." }],
  "do_list": ["...", "..."],
  "stop_list": ["...", "..."],
  "experiments": [{ "hypothesis": "...", "method": "..." }],
  "success_metrics": ["...", "..."]
}`;

export async function generateStrategy(brandId) {
    console.log(`[StrategyService] Initiating Strategy Generation for Brand: ${brandId}`);

    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    const memories = await prisma.brandMemoryEntry.findMany({ where: { brandId, status: 'ACTIVE' } });

    // Fetch recent performance to establish a baseline
    const latestMetrics = await prisma.contentDerivedMetric.findMany({
        where: { content: { brandId } },
        orderBy: { calculatedAt: 'desc' },
        take: 10
    });

    const avgInteractionRate = latestMetrics.length > 0
        ? latestMetrics.reduce((sum, m) => sum + (m.interactionRate || 0), 0) / latestMetrics.length
        : 0;

    const aiPayload = {
        brand_profile: {
            positioning: brand.positioning || "Not specified",
            audience: brand.audience || "Not specified",
            goals: brand.goals || "Not specified",
            voice: brand.voiceStyleInputs || "Not specified"
        },
        active_memory: memories.map(m => ({
            domain: m.domain,
            statement: m.statement
        })),
        current_performance_baseline: {
            average_interaction_rate_last_10_posts: avgInteractionRate
        }
    };

    console.log(`[StrategyService] Sending context and ${memories.length} memory entries to Gemini...`);

    const result = await callAgent(STRATEGY_SYSTEM_PROMPT, JSON.stringify(aiPayload));
    const parsedData = strategySchema.parse(result.data);

    // Determine the next version number
    const existingStrategy = await prisma.strategy.findFirst({
        where: { brandId },
        orderBy: { version: 'desc' }
    });
    const nextVersion = existingStrategy ? existingStrategy.version + 1 : 1;

    // Supersede old strategy versions
    await prisma.strategy.updateMany({
        where: { brandId, status: 'ACTIVE' },
        data: { status: 'SUPERSEDED' }
    });

    // Save new strategy blueprint
    const dbStrategy = await prisma.strategy.create({
        data: {
            brandId,
            version: nextVersion,
            status: 'ACTIVE',
            objective: parsedData.objective,
            targetAudience: parsedData.target_audience,
            positioning: parsedData.positioning,
            pillars: parsedData.pillars,
            recommendedFormats: parsedData.recommended_formats,
            doList: parsedData.do_list,
            stopList: parsedData.stop_list,
            experiments: parsedData.experiments,
            successMetrics: parsedData.success_metrics,
            sourceSnapshot: {
                memoryIds: memories.map(m => m.id),
                baselineInteractionRate: avgInteractionRate
            }
        }
    });

    console.log(`[StrategyService] Strategy Generation Complete. Version ${nextVersion} saved.`);

    return {
        status: 'COMPLETED',
        strategyId: dbStrategy.id,
        version: nextVersion
    };
}