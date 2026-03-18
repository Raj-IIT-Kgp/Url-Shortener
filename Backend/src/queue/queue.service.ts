import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

@Injectable()
export class QueueService {
    private queue: Queue;

    constructor() {
        const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: null
        });
        this.queue = new Queue('clicks', { connection: connection as any });
    }

    async addClickJob(code: string) {
        await this.queue.add('increment-click', { code });
    }
}