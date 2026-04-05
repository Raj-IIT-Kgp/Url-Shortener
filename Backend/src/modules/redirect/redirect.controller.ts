import { Controller, Get, Param, Res, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RedirectService } from './redirect.service';
import type { Response } from 'express';
import { RateLimiterService } from '../../common/rate-limiter.service';
import { QueueService } from '../../queue/queue.service';

@ApiTags('redirect')
@Controller()
export class RedirectController {
    constructor(
        private readonly redirectService: RedirectService,
        private readonly rateLimiter: RateLimiterService,
        private readonly queueService: QueueService,
    ) {}

    @Get(':code')
    @ApiOperation({ summary: 'Redirect to original URL by short code' })
    async redirect(@Param('code') code: string, @Req() req, @Res() res: Response) {
        await this.rateLimiter.consume(req.ip);
        const url = await this.redirectService.getOriginalUrl(code);
        this.queueService.addClickJob(code);
        return res.redirect(url);
    }
}
