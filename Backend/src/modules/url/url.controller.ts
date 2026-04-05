import { Controller, Post, Body, Req, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UrlService } from './url.service';
import { CreateUrlDto } from './create-url.dto';
import { RateLimiterService } from '../../common/rate-limiter.service';
import { AnalyticsService } from '../analytics/analytics.service';

@ApiTags('urls')
@Controller('url')
export class UrlController {
    constructor(
        private readonly urlService: UrlService,
        private readonly rateLimiter: RateLimiterService,
        private readonly analyticsService: AnalyticsService,
    ) {}

    @Post()
    @ApiOperation({ summary: 'Create a short URL' })
    async create(@Body() dto: CreateUrlDto, @Req() req) {
        await this.rateLimiter.consume(req.ip);
        return this.urlService.createShortUrl(dto);
    }

    @Get(':code/stats')
    @ApiOperation({ summary: 'Get click analytics for a short URL' })
    async stats(@Param('code') code: string) {
        return this.analyticsService.getStats(code);
    }
}
