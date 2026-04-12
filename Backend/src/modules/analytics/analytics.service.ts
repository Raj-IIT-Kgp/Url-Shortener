import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class AnalyticsService {
    constructor(
        private prisma: PrismaService,
        private redis: RedisService,
    ) {}

    async getStats(code: string) {
        const url = await this.prisma.url.findUnique({
            where: { shortCode: code },
            include: {
                clickEvents: {
                    orderBy: { createdAt: 'desc' },
                    take: 500,
                },
            },
        });

        if (!url) throw new NotFoundException('URL not found');

        // Pending (un-flushed) clicks in Redis
        const redisClicks = await this.redis.get(`clicks:${code}`);
        const pendingClicks = parseInt(redisClicks || '0');

        // Aggregate breakdowns from ClickEvents
        const browserCounts: Record<string, number> = {};
        const deviceCounts: Record<string, number> = {};
        const countryCounts: Record<string, number> = {};

        for (const ev of url.clickEvents) {
            const b = ev.browser || 'Unknown';
            const d = ev.device || 'desktop';
            const c = ev.country || 'Unknown';
            browserCounts[b] = (browserCounts[b] || 0) + 1;
            deviceCounts[d] = (deviceCounts[d] || 0) + 1;
            countryCounts[c] = (countryCounts[c] || 0) + 1;
        }

        const toTopList = (counts: Record<string, number>) =>
            Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([label, count]) => ({ label, count }));

        return {
            shortCode: code,
            originalUrl: url.originalUrl,
            totalClicks: url.clicks + pendingClicks,
            dbClicks: url.clicks,
            pendingClicks,
            createdAt: url.createdAt,
            expiresAt: url.expiresAt,
            maxClicks: url.maxClicks,
            hasPassword: !!url.password,
            qrCode: url.qrCode,
            browsers: toTopList(browserCounts),
            devices: toTopList(deviceCounts),
            countries: toTopList(countryCounts),
        };
    }
}