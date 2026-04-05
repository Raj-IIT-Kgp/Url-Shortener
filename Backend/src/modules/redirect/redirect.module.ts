import { Module } from '@nestjs/common';
import { RedirectService } from './redirect.service';
import { RedirectController } from './redirect.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { RateLimiterService } from '../../common/rate-limiter.service';
import { QueueService } from '../../queue/queue.service';

@Module({
    providers: [RedirectService, PrismaService, RateLimiterService, QueueService],
    controllers: [RedirectController],
})
export class RedirectModule {}
