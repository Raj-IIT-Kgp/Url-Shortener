import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
    private client: Redis;

    constructor() {
        this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    }

    async get(key: string) {
        return this.client.get(key);
    }

    async set(key: string, value: string) {
        return this.client.set(key, value, 'EX', 3600); // cache 1 hour
    }
}