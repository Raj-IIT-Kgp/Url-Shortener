import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService {
    private readonly logger = new Logger(RedisService.name);

    constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async set(key: string, value: string, ttlSeconds = 3600): Promise<void> {
        await this.client.set(key, value, 'EX', ttlSeconds);
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    async incr(key: string): Promise<number> {
        return this.client.incr(key);
    }

    async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
        const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
        return result === 'OK';
    }
}
