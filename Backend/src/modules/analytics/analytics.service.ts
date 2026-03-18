import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class AnalyticsService {
    constructor(
        private prisma: PrismaService,
        private redis: RedisService,
    ) { }

    async getStats(code: string) {
        const url = await this.prisma.url.findUnique({
            where: { shortCode: code },
        });

        if (!url) throw new NotFoundException('URL not found');

        // get unflushed clicks from Redis
        const redisClicks = await this.redis.get(`clicks:${code}`);
        const pendingClicks = parseInt(redisClicks || '0');

        return {
            shortCode: code,
            originalUrl: url.originalUrl,
            totalClicks: url.clicks + pendingClicks,
            dbClicks: url.clicks,
            pendingClicks,
            createdAt: url.createdAt,
            expiresAt: url.expiresAt,
        };
    }
}