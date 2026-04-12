import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RedisService } from '../redis/redis.service';
import { GeoService } from '../geo/geo.service';
import { PrismaService } from '../prisma/prisma.service';
import { KafkaProducerService, ClickEventPayload } from './kafka.producer.service';
import { UAParser } from 'ua-parser-js';

@Controller()
export class KafkaConsumerService {
    private readonly logger = new Logger(KafkaConsumerService.name);

    constructor(
        private readonly redis: RedisService,
        private readonly geo: GeoService,
        private readonly prisma: PrismaService,
        private readonly kafkaProducer: KafkaProducerService,
    ) {}

    @EventPattern('click-events')
    async handleClickEvent(@Payload() message: { value: ClickEventPayload } | ClickEventPayload) {
        const payload: ClickEventPayload =
            'value' in message && message.value ? (message as { value: ClickEventPayload }).value : (message as ClickEventPayload);

        const { code, ip, userAgent } = payload;

        if (!code) {
            this.logger.warn('Received click event with no code');
            return;
        }

        try {
            // 1. Increment Redis counter
            await this.redis.incr(`clicks:${code}`);

            // 2. Enrich with UA + Geo
            const parser = new UAParser(userAgent || '');
            const device = parser.getDevice().type ?? 'desktop';
            const browser = parser.getBrowser().name ?? null;
            const os = parser.getOS().name ?? null;
            const geoData = ip ? await this.geo.lookup(ip) : { country: null, city: null };

            // 3. Find URL record
            const url = await this.prisma.url.findUnique({
                where: { shortCode: code },
                select: { id: true, webhookUrl: true },
            });

            if (!url) {
                throw new Error(`URL record not found for code: ${code}`);
            }

            // 4. Save ClickEvent
            await this.prisma.clickEvent.create({
                data: {
                    urlId: url.id,
                    country: geoData.country,
                    city: geoData.city,
                    device,
                    browser,
                    os,
                },
            });

            // 5. Trigger Webhook if configured
            if (url.webhookUrl) {
                this.triggerWebhook(url.webhookUrl, {
                    code,
                    ip,
                    device,
                    browser,
                    os,
                    country: geoData.country,
                    city: geoData.city,
                    timestamp: new Date().toISOString(),
                });
            }

            this.logger.debug(`Processed click event for ${code}`);
        } catch (err) {
            this.logger.error(`Failed to process click event for ${code}: ${err.message}`);
            await this.kafkaProducer.publishToDLQ(payload, err.message);
        }
    }

    private async triggerWebhook(url: string, payload: any) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                this.logger.warn(`Webhook failed for ${url}: ${res.statusText}`);
            } else {
                this.logger.debug(`Webhook triggered successfully for ${url}`);
            }
        } catch (err) {
            this.logger.error(`Error triggering webhook for ${url}`, err);
        }
    }
}
