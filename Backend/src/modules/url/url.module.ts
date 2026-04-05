import { Module } from '@nestjs/common';
import { UrlService } from './url.service';
import { UrlController } from './url.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { RateLimiterService } from '../../common/rate-limiter.service';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
    imports: [AnalyticsModule],
    providers: [UrlService, PrismaService, RateLimiterService],
    controllers: [UrlController],
})
export class UrlModule {}
