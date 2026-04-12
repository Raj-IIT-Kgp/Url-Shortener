import { GoneException, Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

export interface RedirectResult {
    requiresPassword: boolean;
    originalUrl?: string;
}

@Injectable()
export class RedirectService {
    private readonly logger = new Logger(RedirectService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) {}

    async getOriginalUrl(code: string): Promise<RedirectResult> {
        // 1. Load URL record from DB (always needed for password/maxClicks checks)
        const url = await this.prisma.url.findUnique({ where: { shortCode: code } });

        if (!url) throw new NotFoundException('URL not found');

        if (url.expiresAt && url.expiresAt < new Date()) {
            throw new GoneException('Link has expired');
        }

        // 2. Password-protected — caller must use verifyPassword endpoint
        if (url.password) {
            return { requiresPassword: true };
        }

        // 3. Max-clicks check (DB value + pending Redis buffer)
        if (url.maxClicks !== null && url.maxClicks !== undefined) {
            const pending = parseInt((await this.redis.get(`clicks:${code}`)) || '0');
            if (url.clicks + pending >= url.maxClicks) {
                throw new GoneException('This link has reached its maximum click limit');
            }
        }

        // 4. Redis cache for non-protected URLs
        const cached = await this.redis.get(code);
        if (cached) return { requiresPassword: false, originalUrl: cached };

        let ttl = 3600;
        if (url.expiresAt) {
            const secondsUntilExpiry = Math.floor((url.expiresAt.getTime() - Date.now()) / 1000);
            ttl = Math.min(ttl, secondsUntilExpiry);
        }

        await this.redis.set(code, url.originalUrl, ttl);

        return { requiresPassword: false, originalUrl: url.originalUrl };
    }
}
