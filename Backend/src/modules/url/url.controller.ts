import { Controller, Post, Body, Req, Get, Param } from '@nestjs/common';
import { UrlService } from './url.service';
import { CreateUrlDto } from './create-url.dto';
import { RateLimiterService } from '../../common/rate-limiter.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Controller('url')
export class UrlController {
    constructor(
        private urlService: UrlService,
        private rateLimiter: RateLimiterService,
        private analyticsService: AnalyticsService,
    ) { }

    @Post()
    async create(@Body() dto: CreateUrlDto, @Req() req) {
        await this.rateLimiter.consume(req.ip);
        return this.urlService.createShortUrl(dto);
    }

    @Get(':code/stats')
    async stats(@Param('code') code: string) {
        return this.analyticsService.getStats(code);
    }
}