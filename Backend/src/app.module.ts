import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UrlModule } from './modules/url/url.module';
import { RedirectModule } from './modules/redirect/redirect.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PrismaService } from './prisma/prisma.service';
import { RedisModule } from './redis/redis.module';
import { RateLimiterService } from './common/rate-limiter.service';
import { QueueService } from './queue/queue.service';
import { HealthModule } from './health/health.module';
import { envValidationSchema } from './config/env.validation';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
        RedisModule,
        UrlModule,
        RedirectModule,
        AnalyticsModule,
        HealthModule,
    ],
    controllers: [AppController],
    providers: [AppService, PrismaService, RateLimiterService, QueueService],
})
export class AppModule {}
