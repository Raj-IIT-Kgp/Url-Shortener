import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { nanoid } from 'nanoid';
import { CreateUrlDto } from './create-url.dto';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcryptjs';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class UrlService {
    private readonly logger = new Logger(UrlService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        private readonly redis: RedisService,
    ) {}

    private async checkSpam(url: string): Promise<void> {
        const apiKey = this.config.get<string>('GOOGLE_SAFE_BROWSING_API_KEY');
        if (!apiKey) return; // Skip if no key is configured

        try {
            const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
            const payload = {
                client: { clientId: 'url-shortener', clientVersion: '1.0.0' },
                threatInfo: {
                    threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
                    platformTypes: ['ANY_PLATFORM'],
                    threatEntryTypes: ['URL'],
                    threatEntries: [{ url }]
                }
            };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                this.logger.warn(`Safe Browsing API failed: ${res.statusText}`);
                return;
            }

            const data = await res.json();
            if (data.matches && data.matches.length > 0) {
                this.logger.warn(`Spam / Malicious URL blocked: ${url}`);
                throw new BadRequestException('Malicious or spam URL detected. Request blocked.');
            }
        } catch (err) {
            if (err instanceof BadRequestException) throw err;
            this.logger.error('Failed to communicate with Safe Browsing API', err);
        }
    }

    async createShortUrl(dto: CreateUrlDto & { userId?: string }, idempotencyKey?: string) {
        const { originalUrl, customAlias, expiresAt, maxClicks, password, userId, webhookUrl } = dto;

        if (idempotencyKey) {
            const cachedResult = await this.redis.get(`idemp:${idempotencyKey}`);
            if (cachedResult) {
                this.logger.debug(`Idempotency key matched, returning cached response for ${idempotencyKey}`);
                return JSON.parse(cachedResult);
            }
        }

        if (expiresAt && new Date(expiresAt) <= new Date()) {
            throw new BadRequestException('expiresAt must be a future date');
        }

        // Spam Detection!
        await this.checkSpam(originalUrl);

        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        const MAX_RETRIES = 5;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            const shortCode = customAlias || nanoid(6);
            const baseUrl = this.config.get<string>('BASE_URL', 'http://localhost:3000');
            const shortUrl = `${baseUrl}/${shortCode}`;

            // Generate QR code as data URI
            let qrCode: string | null = null;
            try {
                qrCode = await QRCode.toDataURL(shortUrl, {
                    width: 256,
                    margin: 2,
                    color: { dark: '#6366f1', light: '#0a0a0f' },
                });
            } catch (err) {
                this.logger.warn('QR code generation failed', err);
            }

            const lockKey = `url-lock:${shortCode}`;
            const lockAcquired = await this.redis.setNx(lockKey, 'LOCK', 5);
            
            if (!lockAcquired) {
                if (customAlias) {
                    throw new BadRequestException('This alias is currently being created by another process.');
                }
                this.logger.warn(`Lock failed for nanoid on attempt ${attempt + 1}, retrying`);
                continue;
            }

            try {
                const url = await this.prisma.url.create({
                    data: {
                        shortCode,
                        originalUrl,
                        expiresAt: expiresAt ? new Date(expiresAt) : null,
                        maxClicks: maxClicks ?? null,
                        password: hashedPassword,
                        qrCode,
                        userId: userId ?? null,
                        webhookUrl: webhookUrl ?? null,
                    },
                });

                this.logger.log(`Created short URL: ${shortCode} → ${originalUrl}`);
                const resultObj = {
                    shortCode: url.shortCode,
                    shortUrl,
                    qrCode: url.qrCode,
                    hasPassword: !!url.password,
                    maxClicks: url.maxClicks,
                };
                
                if (idempotencyKey) {
                    await this.redis.set(`idemp:${idempotencyKey}`, JSON.stringify(resultObj), 86400); // 24h caching
                }

                return resultObj;
            } catch (error) {
                if (error?.code === 'P2002') {
                    if (customAlias) {
                        throw new BadRequestException('Alias already taken');
                    }
                    this.logger.warn(`nanoid collision on attempt ${attempt + 1}, retrying`);
                    continue;
                }
                throw error;
            } finally {
                await this.redis.del(lockKey);
            }
        }

        throw new InternalServerErrorException('Failed to generate a unique short code. Please try again.');
    }

    async verifyPassword(code: string, password: string): Promise<{ valid: boolean; originalUrl?: string }> {
        const url = await this.prisma.url.findUnique({ where: { shortCode: code } });
        if (!url) return { valid: false };
        if (!url.password) return { valid: true, originalUrl: url.originalUrl };

        const valid = await bcrypt.compare(password, url.password);
        return { valid, originalUrl: valid ? url.originalUrl : undefined };
    }

    async getUrlsByUser(userId: string) {
        return this.prisma.url.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async deleteUrl(code: string, userId: string) {
        const url = await this.prisma.url.findUnique({ where: { shortCode: code } });
        if (!url) throw new BadRequestException('URL not found');
        if (url.userId !== userId) throw new BadRequestException('Unauthorized to delete this URL');

        await this.prisma.url.delete({ where: { shortCode: code } });
        return { success: true };
    }
}
