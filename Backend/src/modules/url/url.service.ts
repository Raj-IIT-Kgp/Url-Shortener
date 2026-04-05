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

@Injectable()
export class UrlService {
    private readonly logger = new Logger(UrlService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) {}

    async createShortUrl(dto: CreateUrlDto) {
        const { originalUrl, customAlias, expiresAt } = dto;

        if (expiresAt && new Date(expiresAt) <= new Date()) {
            throw new BadRequestException('expiresAt must be a future date');
        }

        const MAX_RETRIES = 5;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            const shortCode = customAlias || nanoid(6);

            try {
                const url = await this.prisma.url.create({
                    data: {
                        shortCode,
                        originalUrl,
                        expiresAt: expiresAt ? new Date(expiresAt) : null,
                    },
                });

                const baseUrl = this.config.get<string>('BASE_URL', 'http://localhost:3000');
                this.logger.log(`Created short URL: ${shortCode} → ${originalUrl}`);
                return {
                    shortCode: url.shortCode,
                    shortUrl: `${baseUrl}/${url.shortCode}`,
                };
            } catch (error) {
                if (error?.code === 'P2002') {
                    if (customAlias) {
                        throw new BadRequestException('Alias already taken');
                    }
                    // Random code collision — retry with a new code
                    this.logger.warn(`nanoid collision on attempt ${attempt + 1}, retrying`);
                    continue;
                }
                throw error;
            }
        }

        throw new InternalServerErrorException('Failed to generate a unique short code. Please try again.');
    }
}
