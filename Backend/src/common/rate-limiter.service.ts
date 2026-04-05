import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

@Injectable()
export class RateLimiterService {
    private readonly logger = new Logger(RateLimiterService.name);
    private limiter: RateLimiterRedis;

    constructor(@Inject(REDIS_CLIENT) redis: Redis) {
        this.limiter = new RateLimiterRedis({
            storeClient: redis,
            keyPrefix: 'rate_limit',
            points: 10, // 10 requests
            duration: 60, // per 60 seconds
        });
    }

    async consume(ip: string) {
        try {
            await this.limiter.consume(ip);
        } catch {
            this.logger.warn(`Rate limit exceeded for IP: ${ip}`);
            throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
        }
    }
}
