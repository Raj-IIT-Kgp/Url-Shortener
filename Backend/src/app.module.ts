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
import { HealthModule } from './health/health.module';
import { envValidationSchema } from './config/env.validation';
import { KafkaModule } from './kafka/kafka.module';
import { GeoModule } from './geo/geo.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
        HealthModule,
        PrometheusModule.register({ path: '/metrics' }),
        RedisModule,
        KafkaModule,
        GeoModule,
        UrlModule,
        AnalyticsModule,
        AuthModule,
        RedirectModule,
    ],
    controllers: [AppController],
    providers: [AppService, PrismaService, RateLimiterService],
})
export class AppModule {}
