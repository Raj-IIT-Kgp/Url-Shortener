import { GoneException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RedirectService {
    private readonly logger = new Logger(RedirectService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) {}

    async getOriginalUrl(code: string): Promise<string> {
        // 1. Cache check
        const cached = await this.redis.get(code);
        if (cached) return cached;

        // 2. DB lookup
        const url = await this.prisma.url.findUnique({ where: { shortCode: code } });

        if (!url) throw new NotFoundException('URL not found');

        if (url.expiresAt && url.expiresAt < new Date()) {
            throw new GoneException('Link has expired');
        }

        // 3. Cache with TTL that respects expiry so cache never serves a stale expired URL
        let ttl = 3600;
        if (url.expiresAt) {
            const secondsUntilExpiry = Math.floor((url.expiresAt.getTime() - Date.now()) / 1000);
            ttl = Math.min(ttl, secondsUntilExpiry);
        }

        await this.redis.set(code, url.originalUrl, ttl);

        return url.originalUrl;
    }
}
