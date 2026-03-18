import { Worker } from 'bullmq';
import Redis from 'ioredis';

// This Redis instance handles your custom `clicks:code` counter.
const redisClient = new Redis({
    host: 'localhost',
    port: 6379,
});

export const clickWorker = new Worker(
    'clicks',
    async job => {
        const { code } = job.data;

        // increment counter in Redis
        await redisClient.incr(`clicks:${code}`);
    },
    {
        // This inline connection ensures BullMQ won't throw any TypeScript red lines!
        connection: {
            host: 'localhost',
            port: 6379,
        }
    },
);

clickWorker.on('completed', job => {
    console.log(`Job ${job.id} completed`);
});

clickWorker.on('failed', (job, err) => {
    console.error(`Job failed:`, err);
});