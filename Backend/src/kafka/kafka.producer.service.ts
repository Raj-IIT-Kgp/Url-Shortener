import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

export interface ClickEventPayload {
    code: string;
    ip: string;
    userAgent: string;
}

@Injectable()
export class KafkaProducerService implements OnModuleInit {
    private readonly logger = new Logger(KafkaProducerService.name);

    constructor(@Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka) {}

    async onModuleInit() {
        try {
            await this.kafkaClient.connect();
            this.logger.log('Kafka producer connected');
        } catch (err) {
            this.logger.warn(`Kafka producer failed to connect on init (will retry on next emit): ${err.message}`);
        }
    }

    async publishClickEvent(code: string, ip = '', userAgent = ''): Promise<void> {
        try {
            const payload: ClickEventPayload = { code, ip, userAgent };
            this.kafkaClient.emit('click-events', payload);
            this.logger.debug(`Published click event for code: ${code}`);
        } catch (err) {
            this.logger.error(`Failed to publish click event for ${code}`, err);
        }
    }

    async publishToDLQ(payload: any, error: string): Promise<void> {
        try {
            this.kafkaClient.emit('click-events-dlq', { ...payload, error, timestamp: new Date().toISOString() });
            this.logger.warn(`Published event to DLQ due to: ${error}`);
        } catch (err) {
            this.logger.error(`Failed to publish to DLQ`, err);
        }
    }
}
