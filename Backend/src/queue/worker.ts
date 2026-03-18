import 'dotenv/config';
import { Worker } from 'bullmq';
import Redis from 'ioredis';

// This Redis instance handles your custom `clicks:code` counter.
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const clickWorker = new Worker(
    'clicks',
    async job => {
        const { code } = job.data;

        // increment counter in Redis
        await redisClient.incr(`clicks:${code}`);
    },
    { connection: redisClient as any }
);

clickWorker.on('completed', job => {
    console.log(`Job ${job.id} completed`);
});

clickWorker.on('failed', (job, err) => {
    console.error(`Job failed:`, err);
});