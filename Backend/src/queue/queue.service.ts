import { Injectable } from '@nestjs/common';
import { ConnectionOptions, Queue } from 'bullmq';
import Redis from 'ioredis';

@Injectable()
export class QueueService {
  private queue: Queue;

  constructor() {
    const connection = new Redis(
      process.env.REDIS_URL || 'redis://localhost:6379',
      {
        maxRetriesPerRequest: null,
      },
    );
    // bullmq bundles its own ioredis copy, so the instance types don't line up exactly
    this.queue = new Queue('clicks', {
      connection: connection as unknown as ConnectionOptions,
    });
  }

  async addClickJob(code: string) {
    await this.queue.add('increment-click', { code });
  }
}
