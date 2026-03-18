import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { nanoid } from 'nanoid';

@Injectable()
export class UrlService {
    constructor(private prisma: PrismaService) { }

    async createShortUrl(dto) {
        const { originalUrl, customAlias, expiresAt } = dto;

        const shortCode = customAlias || nanoid(6);

        // check if alias already exists
        const existing = await this.prisma.url.findUnique({
            where: { shortCode },
        });

        if (existing) {
            throw new BadRequestException('Alias already taken');
        }

        const url = await this.prisma.url.create({
            data: {
                shortCode,
                originalUrl,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
        });

        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        return {
            shortCode: url.shortCode,
            shortUrl: `${baseUrl}/${url.shortCode}`,
        };
    }
}