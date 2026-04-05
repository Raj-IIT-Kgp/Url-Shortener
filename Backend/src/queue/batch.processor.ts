import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('error', (err) => console.error('Redis (batch) error:', err));

async function scanClickKeys(): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
        const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', 'clicks:*', 'COUNT', 100);
        cursor = nextCursor;
        keys.push(...batch);
    } while (cursor !== '0');
    return keys;
}

async function processBatch() {
    try {
        const keys = await scanClickKeys();

        for (const key of keys) {
            const code = key.split(':')[1];
            const count = parseInt((await redis.get(key)) || '0');

            if (count > 0) {
                try {
                    const result = await prisma.url.updateMany({
                        where: { shortCode: code },
                        data: { clicks: { increment: count } },
                    });

                    if (result.count === 0) {
                        console.warn(`No record found for shortCode: ${code}. Removing stale key.`);
                    }
                } catch (error) {
                    console.error(`Failed to sync clicks for ${code}:`, error);
                    // Keep key in Redis on transient DB errors — will retry next interval
                    continue;
                }

                await redis.del(key);
            }
        }

        console.log(`Batch processed ${keys.length} key(s)`);
    } catch (err) {
        console.error('Batch processor error:', err);
    }
}

// Run every 10 seconds
setInterval(processBatch, 10000);
