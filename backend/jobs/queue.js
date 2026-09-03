import { Queue } from 'bullmq';
import { loadConfig } from '../lib/config.js';

const REDIS_URL = loadConfig().redisUrl;

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
