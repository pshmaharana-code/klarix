import { Queue } from 'bullmq';
import { loadConfig } from '../lib/config.js';

const REDIS_URL = loadConfig().redisUrl;

const connection = {
  url: REDIS_URL,
};

// Create the main jobs queue
const jobsQueue = new Queue('klarix-sync', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 30000, // 30s, 60s, 120s to respect 5 RPM limits over time
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
