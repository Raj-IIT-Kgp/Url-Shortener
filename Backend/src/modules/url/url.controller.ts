import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Param,
  UseGuards,
  Delete,
  Headers,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UrlService } from './url.service';
import { CreateUrlDto } from './create-url.dto';
import { RateLimiterService } from '../../common/rate-limiter.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { IsString, Length } from 'class-validator';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { KafkaProducerService } from '../../kafka/kafka.producer.service';
import type {
  AuthenticatedRequest,
  OptionalAuthRequest,
} from '../auth/authenticated-request';

class VerifyPasswordDto {
  @IsString()
  @Length(1, 100)
  password!: string;
}

@ApiTags('urls')
@Controller('url')
export class UrlController {
  constructor(
    private readonly urlService: UrlService,
    private readonly rateLimiter: RateLimiterService,
    private readonly analyticsService: AnalyticsService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard, ApiKeyGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a short URL (optional Auth)' })
  async create(
    @Body() dto: CreateUrlDto,
    @Req() req: OptionalAuthRequest,
    @Headers('Idempotency-Key') idempotencyKey?: string,
  ) {
    await this.rateLimiter.consume(req.ip ?? '');
    return this.urlService.createShortUrl(
      { ...dto, userId: req.user?.id },
      idempotencyKey,
    );
  }

  @Get('my-links')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all URLs created by the authenticated user' })
  async getMyUrls(@Req() req: AuthenticatedRequest) {
    return this.urlService.getUrlsByUser(req.user.id);
  }

  @Delete(':code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a short URL (must own it)' })
  async deleteUrl(
    @Param('code') code: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.urlService.deleteUrl(code, req.user.id);
  }

  @Post(':code/unlock')
  @ApiOperation({
    summary: 'Verify password for a password-protected short URL',
  })
  async unlock(
    @Param('code') code: string,
    @Body() body: VerifyPasswordDto,
    @Req() req: OptionalAuthRequest,
  ) {
    // Rate-limited to slow down password brute-forcing
    await this.rateLimiter.consume(req.ip ?? '');
    const result = await this.urlService.verifyPassword(code, body.password);

    // A successful unlock is a click — count it so analytics and maxClicks apply
    if (result.valid) {
      this.kafkaProducer.publishClickEvent(
        code,
        req.ip ?? '',
        req.headers['user-agent'] ?? '',
      );
    }
    return result;
  }

  @Get(':code/stats')
  @ApiOperation({ summary: 'Get click analytics for a short URL' })
  async stats(@Param('code') code: string) {
    return this.analyticsService.getStats(code);
  }
}
