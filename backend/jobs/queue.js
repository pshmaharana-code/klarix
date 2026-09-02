import { Queue } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = {
  url: REDIS_URL,
};

// Create the main jobs queue
const jobsQueue = new Queue('klarix-jobs', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: false,
    removeOnFail: false,
  }
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  await jobsQueue.close();
});

export {
  jobsQueue,
  connection
};
