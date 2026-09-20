import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ACTIVE_STATES = new Set(['CREATED', 'QUEUED', 'PROCESSING', 'RETRY_PENDING']);
const FAILED_STATES = new Set(['FAILED', 'CANCELLED', 'PARTIAL']);

/**
 * Recalculate and update the progress and state of a root SYNC_ACCOUNT job
 * based on its descendants.
 * 
 * @param {string} rootJobId 
 */
export async function updateSyncProgress(rootJobId) {
  // Use a transaction to ensure monotonic progress updates and consistent state
  return await prisma.$transaction(async (tx) => {
    const rootJob = await tx.job.findUnique({ where: { id: rootJobId } });
    if (!rootJob) throw new Error('Root job not found');

    const imports = await tx.job.findMany({ where: { parentJobId: rootJobId } });
    const importIds = imports.map(i => i.id);
    
    let metrics = [];
    if (importIds.length > 0) {
      metrics = await tx.job.findMany({ where: { parentJobId: { in: importIds } } });
    }

    const allDescendants = [...imports, ...metrics];

    // Determine state
    let hasActive = false;
    let hasFailed = false;

    for (const desc of allDescendants) {
      if (ACTIVE_STATES.has(desc.state)) hasActive = true;
      if (FAILED_STATES.has(desc.state)) hasFailed = true;
    }

    let newState = rootJob.state;
    // Only transition root state if it's currently PROCESSING
    // Or if we need to mark it terminal
    if (hasActive) {
      newState = 'PROCESSING';
    } else if (allDescendants.length > 0 || rootJob.totalCount === 0) {
      // All descendants are terminal.
      if (hasFailed) {
        newState = 'PARTIAL';
      } else {
        newState = 'COMPLETED';
      }
    }

    // Determine processedCount
    // An IMPORT_CONTENT is processed if it is terminal AND all its FETCH_METRICS children are terminal
    let processedCount = 0;
    for (const imp of imports) {
      const isImportTerminal = !ACTIVE_STATES.has(imp.state);
      const childMetrics = metrics.filter(m => m.parentJobId === imp.id);
      const areMetricsTerminal = childMetrics.every(m => !ACTIVE_STATES.has(m.state));
      
      if (isImportTerminal && areMetricsTerminal) {
        processedCount++;
      }
    }

    // Calculate progressPercent
    let newProgressPercent = rootJob.progressPercent;
    const totalCount = rootJob.totalCount;

    if (totalCount > 0) {
      newProgressPercent = Math.round((processedCount / totalCount) * 100);
    } else if (newState === 'COMPLETED' || newState === 'PARTIAL') {
      newProgressPercent = 100;
    }

    // Progress monotonicity: never decrease
    newProgressPercent = Math.max(rootJob.progressPercent, newProgressPercent);
    
    // Cap at 99% if not terminal, to prevent showing 100% while active.
    if (newState === 'PROCESSING' && newProgressPercent === 100) {
      newProgressPercent = 99;
    }

    // Determine completedAt
    let completedAt = rootJob.completedAt;
    if ((newState === 'COMPLETED' || newState === 'PARTIAL') && !completedAt) {
      completedAt = new Date();
    } else if (newState === 'PROCESSING') {
      completedAt = null;
    }

    // Update root job
    const updatedJob = await tx.job.update({
      where: { id: rootJobId },
      data: {
        state: newState,
        processedCount,
        progressPercent: newProgressPercent,
        completedAt,
        updatedAt: new Date()
      }
    });

    return updatedJob;
  });
}
