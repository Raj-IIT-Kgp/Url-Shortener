import { Module } from '@nestjs/common';
import { UrlService } from './url.service';
import { UrlController } from './url.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { RateLimiterService } from '../../common/rate-limiter.service';
import { AnalyticsModule } from '../analytics/analytics.module';

import { RedisModule } from '../../redis/redis.module';

@Module({
    imports: [AnalyticsModule, RedisModule],
    providers: [UrlService, PrismaService, RateLimiterService],
    controllers: [UrlController],
})
export class UrlModule {}
