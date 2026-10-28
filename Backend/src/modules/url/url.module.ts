import { Module } from '@nestjs/common';
import { UrlService } from './url.service';
import { UrlController } from './url.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { RateLimiterService } from '../../common/rate-limiter.service';
import { AnalyticsModule } from '../analytics/analytics.module';

import { RedisModule } from '../../redis/redis.module';
import { KafkaModule } from '../../kafka/kafka.module';

@Module({
  imports: [AnalyticsModule, RedisModule, KafkaModule],
  providers: [UrlService, PrismaService, RateLimiterService],
  controllers: [UrlController],
})
export class UrlModule {}
