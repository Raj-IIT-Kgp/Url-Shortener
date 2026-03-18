import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RedirectService {
    constructor(
        private prisma: PrismaService,
        private redis: RedisService,
    ) { }

    async getOriginalUrl(code: string) {
        // 1. cache check
        const cached = await this.redis.get(code);
        if (cached) return cached;

        // 2. DB lookup
        const url = await this.prisma.url.findUnique({
            where: { shortCode: code },
        });

        if (!url) throw new NotFoundException('URL not found');

        if (url.expiresAt && url.expiresAt < new Date()) {
            throw new GoneException('Link expired');
        }

        // 3. cache result
        await this.redis.set(code, url.originalUrl);

        return url.originalUrl;
    }
}