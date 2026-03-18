import { Module } from '@nestjs/common';
import { RedirectService } from './redirect.service';
import { RedirectController } from './redirect.controller';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { RateLimiterService } from '../../common/rate-limiter.service';
import { QueueService } from '../../queue/queue.service';

@Module({
  imports: [AnalyticsModule],
  providers: [RedirectService, PrismaService, RedisService, RateLimiterService, QueueService],
  controllers: [RedirectController]
})
export class RedirectModule { }
