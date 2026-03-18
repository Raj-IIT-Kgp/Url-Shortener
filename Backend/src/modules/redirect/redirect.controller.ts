import { Controller, Get, Param, Res, Req } from '@nestjs/common';
import { RedirectService } from './redirect.service';
import type { Response } from 'express';
import { RateLimiterService } from '../../common/rate-limiter.service';
import { QueueService } from '../../queue/queue.service';

@Controller()
export class RedirectController {
    constructor(
        private redirectService: RedirectService,
        private rateLimiter: RateLimiterService,
        private queueService: QueueService,
    ) { }

    @Get(':code')
    async redirect(@Param('code') code: string, @Req() req, @Res() res: Response) {
        await this.rateLimiter.consume(req.ip);

        const url = await this.redirectService.getOriginalUrl(code);

        this.queueService.addClickJob(code);

        return res.redirect(url);
    }
}