import { Controller, Get, Param, Res, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RedirectService } from './redirect.service';
import type { Response, Request } from 'express';
import { RateLimiterService } from '../../common/rate-limiter.service';
import { KafkaProducerService } from '../../kafka/kafka.producer.service';

@ApiTags('redirect')
@Controller()
export class RedirectController {
    constructor(
        private readonly redirectService: RedirectService,
        private readonly rateLimiter: RateLimiterService,
        private readonly kafkaProducer: KafkaProducerService,
    ) {}

    @Get(':code')
    @ApiOperation({ summary: 'Redirect to original URL by short code' })
    async redirect(@Param('code') code: string, @Req() req: Request, @Res() res: Response) {
        await this.rateLimiter.consume(req.ip ?? '');

        const result = await this.redirectService.getOriginalUrl(code);

        if (result.requiresPassword) {
            // Return JSON so frontend can redirect to unlock page
            return res.status(HttpStatus.OK).json({ requiresPassword: true, shortCode: code });
        }

        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
        const userAgent = req.headers['user-agent'] || '';

        void this.kafkaProducer.publishClickEvent(code, ip, userAgent);

        return res.redirect(result.originalUrl!);
    }
}
