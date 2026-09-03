import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { jobsQueue } from './queue.js';

async function createAndEnqueueJob({ brandId, type, idempotencyKey, input = {} }) {
  // The job and its outbox message are committed atomically. Redis publication is
  // deliberately asynchronous so an outage cannot lose an accepted job.
  let job;
  try {
    job = await prisma.job.create({
      data: {
        brandId,
        type,
        idempotencyKey,
        state: 'QUEUED',
        input,
        progressPercent: 0,
        progressStep: 'Created',
        progressMessage: 'Job is being prepared',
        logs: {
          create: {
            event: 'JOB_CREATED',
            level: 'INFO',
            context: { idempotencyKey }
          }
        },
        outbox: { create: {} }
      }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      // Uniqueness violation -> Job already exists. Return it safely.
      return await prisma.job.findUnique({
        where: { brandId_idempotencyKey: { brandId, idempotencyKey } }
      });
    }
    throw error;
  }

  return job;
}

async function dispatchOutboxBatch(limit = 25) {
  const entries = await prisma.jobOutbox.findMany({
    where: { deliveredAt: null, OR: [{ claimedAt: null }, { claimedAt: { lt: new Date(Date.now() - 60_000) } }] },
    take: limit,
    orderBy: { createdAt: 'asc' }
  });
  for (const entry of entries) {
    const claimed = await prisma.jobOutbox.updateMany({
      where: { id: entry.id, deliveredAt: null, OR: [{ claimedAt: null }, { claimedAt: { lt: new Date(Date.now() - 60_000) } }] },
      data: { claimedAt: new Date(), attempts: { increment: 1 } }
    });
    if (claimed.count !== 1) continue;
    try {
      const job = await prisma.job.findUnique({ where: { id: entry.jobId } });
      if (!job) continue;
      await jobsQueue.add(job.type, { jobId: job.id, brandId: job.brandId, input: job.input }, { jobId: job.id });
      await prisma.jobOutbox.update({ where: { id: entry.id }, data: { deliveredAt: new Date(), claimedAt: null, lastError: null } });
    } catch {
      await prisma.jobOutbox.update({ where: { id: entry.id }, data: { claimedAt: null, lastError: 'QUEUE_UNAVAILABLE' } });
    }
  }
}

async function getJob(brandId, jobId) {
  return await prisma.job.findFirst({
    where: { id: jobId, brandId }
  });
}

export {
  createAndEnqueueJob,
  getJob,
  dispatchOutboxBatch
};
