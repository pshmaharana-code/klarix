// backend/services/patternService.js
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { callAgent } from './openRouterClient.js';

const prisma = new PrismaClient();

// -----------------------------------------------------------------------------
// The AI Output Schema
// -----------------------------------------------------------------------------
const patternSchema = z.object({
  patterns: z.array(z.object({
    category: z.enum(['CONTENT_STRATEGY', 'PERFORMANCE']), // <--- NEW
    title: z.string(),
    observation: z.string(),
    psychological_driver: z.string(),
    actionable_rule: z.string(),
    supporting_content_ids: z.array(z.string())
  }))
});

// -----------------------------------------------------------------------------
// The Executive Macro-Strategist Prompt
// -----------------------------------------------------------------------------
const PATTERN_SYSTEM_PROMPT = `You are an elite, cut-throat Head of Growth and Content Strategist.
Your job is to analyze a cohort of social media posts, cross-reference their visual/content frameworks against their performance metrics, and extract high-leverage macro-patterns.
You will be provided with an array of "Top Performers" and "Bottom Performers".

Look for the invisible levers:
- Do "text-on-screen" formats only work when the narrative is "Problem-Agitate-Solve"?
- Do cinematic visuals mask weak hooks, leading to high reach but low retention?
- What exact psychological triggers consistently separate the top performers from the bottom performers?

CRITICAL RULE: Never use raw database IDs (e.g., "3d080687") in your title, observation, or actionable_rule text. When referring to a specific post, use the provided "post_snippet" (e.g., "The post starting with 'I QUIT WAITING'").

Write with ruthless, executive-level precision. No generic advice. Give me hard, actionable algorithmic and behavioral rules based STRICTLY on the data provided.

Return ONLY valid JSON conforming to this schema, with no preamble:
Return ONLY valid JSON conforming to this schema, with no preamble:
{
  "patterns": [
    {
      "category": "Must be exactly 'CONTENT_STRATEGY' or 'PERFORMANCE'",
      "title": "Punchy 3-5 word name for the strategy",
      "observation": "1-2 sentences identifying the exact correlation in the data.",
      "psychological_driver": "1 sentence explaining WHY this manipulates viewer attention.",
      "actionable_rule": "The strict operational rule the creator must follow.",
      "supporting_content_ids": ["array of exact Content IDs that prove this pattern"]
    }
  ]
}`;

// -----------------------------------------------------------------------------
// Pattern Discovery Engine
// -----------------------------------------------------------------------------
export async function discoverPatterns(brandId, { force = false } = {}) {
  console.log(`[PatternService] Initiating Pattern Discovery for Brand: ${brandId}`);

  // 1. Fetch the analyzed cohort
  const contents = await prisma.content.findMany({
    where: {
      brandId,
      analysisStatus: 'COMPLETED'
    },
    select: {
      id: true,
      type: true,
      caption: true,
      analyses: {
        orderBy: { version: 'desc' },
        take: 1
      },
      derivedMetrics: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: { publishedAt: 'desc' },
    take: 50 // Limit to last 50 for context window safety
  });

  const validCohort = contents.filter(c => c.analyses?.length > 0 && c.derivedMetrics?.length > 0);

  // We need at least a few posts to find a "pattern"
  if (validCohort.length < 2 && !force) {
    console.log(`[PatternService] Insufficient sample size (${validCohort.length}). Skipping.`);
    return { status: 'SKIPPED', sampleSize: validCohort.length, limitations: 'Requires more analyzed posts.' };
  }

  // 2. Format and Segment the Data
  const formattedData = validCohort.map(c => {
    const analysis = c.analyses[0];
    const metrics = c.derivedMetrics[0];

    // Create a human-readable snippet from the caption (first 30 chars)
    const cleanCaption = c.caption ? c.caption.replace(/\n/g, ' ').substring(0, 30).trim() : 'Video';

    return {
      id: c.id,
      post_snippet: `"${cleanCaption}..."`, // Tells the AI how to refer to this post
      format: analysis.visualFindings?.format_classification || 'unknown',
      visual_hook: analysis.visualFindings?.hook_strength || '',
      themes: analysis.contentFindings?.themes || [],
      narrative: analysis.contentFindings?.narrative_structure || '',
      interactionRate: metrics.interactionRate || 0,
      viewToReachRatio: metrics.viewToReachRatio || 0,
    };
  }).sort((a, b) => b.interactionRate - a.interactionRate);

  // Split into Top and Bottom performing cohorts
  const sliceIndex = Math.max(1, Math.floor(formattedData.length * 0.5));
  const topPerformers = formattedData.slice(0, sliceIndex);
  const bottomPerformers = formattedData.slice(-sliceIndex);

  const aiPayload = {
    total_analyzed: formattedData.length,
    top_performers: topPerformers,
    bottom_performers: bottomPerformers
  };

  // 3. Execute the AI Analyst
  console.log(`[PatternService] Sending ${formattedData.length} posts to Gemini for macro-analysis...`);
  const userMessage = JSON.stringify(aiPayload);

  let result;
  try {
    result = await callAgent(PATTERN_SYSTEM_PROMPT, userMessage);
  } catch (error) {
    console.error('[PatternService] AI Execution failed:', error.message);
    throw error;
  }

  const parsedData = patternSchema.parse(result.data);
  let totalEvidenceCount = 0;
  let savedPatternId = null;

  // 4. Persist to Database mapped to exact Prisma schema
  // 4. Persist to Database mapped to exact Prisma schema
  if (parsedData.patterns && parsedData.patterns.length > 0) {
    for (const pattern of parsedData.patterns) {
      const dbPattern = await prisma.pattern.create({
        data: {
          brandId,
          category: pattern.category, // <--- AI now decides the category!
          title: pattern.title,
          claim: `${pattern.observation} ${pattern.psychological_driver}`,
          recommendedAction: pattern.actionable_rule,
          confidence: 85.0,
          status: 'ACTIVE'
        }
      });

      savedPatternId = dbPattern.id; // Stores the last one created for the return log

      const validIds = pattern.supporting_content_ids.filter(id => validCohort.some(c => c.id === id));

      if (validIds.length > 0) {
        await prisma.patternEvidence.createMany({
          data: validIds.map(contentId => ({
            patternId: dbPattern.id,
            contentId: contentId,
            summary: `Identified by AI as supporting evidence for pattern: ${pattern.title}`
          }))
        });
        totalEvidenceCount += validIds.length;
      }
    }
  }

  console.log(`[PatternService] Discovery Complete. Generated Pattern ID: ${savedPatternId}`);

  return {
    status: 'COMPLETED',
    sampleSize: validCohort.length,
    evidenceCount: totalEvidenceCount,
    patternId: savedPatternId,
    limitations: null
  };
}

// -----------------------------------------------------------------------------
// API Route Data Fetchers
// -----------------------------------------------------------------------------

export async function getPatternCatalogueVersion(brandId) {
  // The true version of the catalogue is defined by when the metrics last changed.
  const latestMetric = await prisma.contentDerivedMetric.findFirst({
    where: { content: { brandId } },
    orderBy: { calculatedAt: 'desc' }
  });

  // If no new metrics have been calculated, this timestamp stays identical,
  // generating a locked idempotency key that blocks duplicate AI runs.
  return latestMetric ? latestMetric.calculatedAt.getTime().toString() : 'v1';
}

export async function getPatternDiscoverySummary(brandId) {
  const count = await prisma.content.count({
    where: { brandId, analysisStatus: 'COMPLETED' }
  });

  // We temporarily lower this threshold to 2 so you can test it on your current data
  if (count < 2) {
    return { status: 'INSUFFICIENT_DATA', analyzedCount: count };
  }
  return { status: 'READY', analyzedCount: count };
}

export async function listPatterns(brandId, { status = 'ACTIVE', category, limit = 20 }) {
  const where = { brandId, status };
  if (category) where.category = category;

  return prisma.pattern.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' }
  });
}

export async function getPatternDetail(patternId, userId) {
  const pattern = await prisma.pattern.findUnique({
    where: { id: patternId },
    include: {
      evidence: {
        include: {
          content: {
            include: {
              media: true
            }
          },
          metricSnapshot: true
        }
      }
    }
  });
  return pattern;
}