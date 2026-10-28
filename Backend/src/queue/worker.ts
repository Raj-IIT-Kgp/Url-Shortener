import 'dotenv/config';
import { ConnectionOptions, Job, Worker } from 'bullmq';
import Redis from 'ioredis';

// This Redis instance handles your custom `clicks:code` counter.
const redisClient = new Redis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
  },
);

redisClient.on('error', (err) => console.error('Redis (worker) error:', err));

export const clickWorker = new Worker(
  'clicks',
  async (job: Job<{ code: string }>) => {
    const { code } = job.data;

    // increment counter in Redis
    await redisClient.incr(`clicks:${code}`);
  },
  // bullmq bundles its own ioredis copy, so the instance types don't line up exactly
  { connection: redisClient as unknown as ConnectionOptions },
);

clickWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

clickWorker.on('failed', (job, err) => {
  console.error(`Job failed:`, err);
});
