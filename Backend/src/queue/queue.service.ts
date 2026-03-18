import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
    private queue: Queue;

    constructor() {
        this.queue = new Queue('clicks', {
            connection: {
                host: 'localhost',
                port: 6379,
            }
        });
    }

    async addClickJob(code: string) {
        await this.queue.add('increment-click', { code });
    }
}