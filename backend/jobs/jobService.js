import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { jobsQueue } from './queue.js';

async function createAndEnqueueJob({ brandId, type, idempotencyKey, input = {}, parentJobId = null }) {
  if (parentJobId) {
    const parent = await prisma.job.findUnique({ where: { id: parentJobId } });
    if (!parent || parent.brandId !== brandId) {
      const err = new Error('Parent job not found or belongs to a different brand');
      err.code = 'INVALID_PARENT';
      throw err;
    }
    if (type === 'IMPORT_CONTENT' && parent.type !== 'SYNC_ACCOUNT') {
      const err = new Error('IMPORT_CONTENT must be a child of SYNC_ACCOUNT');
      err.code = 'INVALID_HIERARCHY';
      throw err;
    }
    if (type === 'FETCH_METRICS' && parent.type !== 'IMPORT_CONTENT') {
      const err = new Error('FETCH_METRICS must be a child of IMPORT_CONTENT');
      err.code = 'INVALID_HIERARCHY';
      throw err;
    }
  }

  // The job and its outbox message are committed atomically. Redis publication is
  // deliberately asynchronous so an outage cannot lose an accepted job.
  let job;
  try {
    job = await prisma.job.create({
      data: {
        brandId,
        type,
        idempotencyKey,
        parentJobId,
        state: 'CREATED',
        input,
        progressPercent: 0,
        progressStep: 'Created',
        progressMessage: 'Job is being prepared',
        logs: {
          create: {
            event: 'JOB_CREATED',
            level: 'INFO',
            context: { idempotencyKey, parentJobId }
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
      // Promote CREATED → QUEUED before BullMQ delivery so clients can
      // distinguish "accepted but not yet queued" from "in the queue".
      // The worker's claim guard requires QUEUED or RETRY_PENDING, so
      // this transition must happen before queue.add().
      if (job.state === 'CREATED') {
        await prisma.job.update({ where: { id: job.id }, data: { state: 'QUEUED' } });
      }
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

async function getJobWithChildren(brandId, jobId) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, brandId },
    include: {
      children: {
        include: {
          children: true
        }
      }
    }
  });
  if (!job) return null;
  return job;
}

// Atomically cancel a job that is still waiting (CREATED or QUEUED).
// Returns the updated job record on success, or null if the job could
// not be cancelled (wrong state, wrong brand, or doesn't exist).
// The WHERE clause races the worker's QUEUED → PROCESSING claim: only
// one of them can win the conditional update.
async function cancelJob(brandId, jobId) {
  const cancelled = await prisma.job.updateMany({
    where: {
      id: jobId,
      brandId,                               // brand isolation enforced in DB
      state: { in: ['CREATED', 'QUEUED'] }   // only safe-to-cancel states
    },
    data: {
      state: 'CANCELLED',
      completedAt: new Date(),
      progressStep: 'Cancelled',
      progressMessage: 'Job was cancelled before processing began'
    }
  });
  if (cancelled.count !== 1) return null; // state was wrong, or brand mismatch
  return await prisma.job.findFirst({ where: { id: jobId, brandId } });
}

export {
  createAndEnqueueJob,
  getJob,
  getJobWithChildren,
  cancelJob,
  dispatchOutboxBatch
};
