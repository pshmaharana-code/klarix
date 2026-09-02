import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { jobsQueue } from './queue.js';

async function createAndEnqueueJob({ brandId, type, idempotencyKey, input = {} }) {
  // 1. Try to create the job in Postgres.
  // This will throw if the @@unique([brandId, idempotencyKey]) constraint is violated.
  let job;
  try {
    job = await prisma.job.create({
      data: {
        brandId,
        type,
        idempotencyKey,
        state: 'CREATED',
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
        }
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

  // 2. Try to enqueue in BullMQ
  try {
    await jobsQueue.add(
      type,
      { jobId: job.id, brandId, input },
      { jobId: job.id } // Use the Postgres UUID as the BullMQ jobId to guarantee 1:1 mapping
    );
    
    // 3. Update state to QUEUED
    return await prisma.job.update({
      where: { id: job.id },
      data: {
        state: 'QUEUED',
        progressStep: 'Queued',
        progressMessage: 'Waiting for worker',
        logs: {
          create: {
            event: 'JOB_QUEUED',
            level: 'INFO'
          }
        }
      }
    });
  } catch (queueError) {
    console.error('[JobService] Failed to enqueue job to Redis:', queueError);
    // Try to mark job as FAILED
    try {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          state: 'FAILED',
          progressStep: 'Failed to enqueue',
          error: { message: 'QUEUE_UNAVAILABLE', details: queueError.message },
          logs: {
            create: {
              event: 'ENQUEUE_FAILED',
              level: 'ERROR',
              context: { error: queueError.message }
            }
          }
        }
      });
    } catch (dbError) {
      console.error('[JobService] Critical: Failed to mark job as FAILED after queue error', dbError);
    }
    throw new Error('QUEUE_UNAVAILABLE');
  }
}

async function getJob(brandId, jobId) {
  return await prisma.job.findFirst({
    where: { id: jobId, brandId }
  });
}

export {
  createAndEnqueueJob,
  getJob
};
