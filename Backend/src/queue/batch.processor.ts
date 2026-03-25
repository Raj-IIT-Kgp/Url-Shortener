import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function processBatch() {
    const keys = await redis.keys('clicks:*');

    for (const key of keys) {
        const code = key.split(':')[1];

        const count = parseInt(await redis.get(key) || '0');

        if (count > 0) {
            try {
                const result = await prisma.url.updateMany({
                    where: { shortCode: code },
                    data: {
                        clicks: { increment: count },
                    },
                });

                if (result.count === 0) {
                    console.warn(`No record found for shortCode: ${code}. Invalid click key removed.`);
                }
            } catch (error) {
                console.error(`Failed to sync clicks for ${code}:`, error);
                // We keep the key in Redis if it's a transient database error
                continue;
            }

            // reset counter only after a successful attempt or if record is definitively missing
            await redis.del(key);
        }
    }

    console.log('Batch processed');
}

// run every 10 seconds
setInterval(processBatch, 10000);