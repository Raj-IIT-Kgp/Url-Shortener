import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UrlModule } from './modules/url/url.module';
import { RedirectModule } from './modules/redirect/redirect.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';
import { RateLimiterService } from './common/rate-limiter.service';

@Module({
  imports: [UrlModule, RedirectModule, AnalyticsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService, RedisService, RateLimiterService],
  exports: [PrismaService, RedisService],
})
export class AppModule { }
