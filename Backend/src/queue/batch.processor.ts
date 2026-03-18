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
            await prisma.url.update({
                where: { shortCode: code },
                data: {
                    clicks: { increment: count },
                },
            });

            // reset counter
            await redis.del(key);
        }
    }

    console.log('Batch processed');
}

// run every 10 seconds
setInterval(processBatch, 10000);