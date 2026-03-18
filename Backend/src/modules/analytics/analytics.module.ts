import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Module({
  providers: [AnalyticsService, PrismaService, RedisService],
  exports: [AnalyticsService]
})
export class AnalyticsModule { }
