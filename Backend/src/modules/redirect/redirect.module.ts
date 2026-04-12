import { Module } from '@nestjs/common';
import { RedirectService } from './redirect.service';
import { RedirectController } from './redirect.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { RateLimiterService } from '../../common/rate-limiter.service';
import { KafkaModule } from '../../kafka/kafka.module';

@Module({
    imports: [KafkaModule],
    providers: [RedirectService, PrismaService, RateLimiterService],
    controllers: [RedirectController],
})
export class RedirectModule {}
