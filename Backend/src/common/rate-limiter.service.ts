import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

@Injectable()
export class RateLimiterService {
    private limiter: RateLimiterRedis;

    constructor() {
        const redis = new Redis({
            host: 'localhost',
            port: 6379,
        });

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
            throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
        }
    }
}