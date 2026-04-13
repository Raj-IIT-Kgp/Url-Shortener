// nanoid is ESM — mock it so Jest (CommonJS) can handle it
jest.mock('nanoid', () => ({ nanoid: jest.fn(() => 'mockcode') }));

import { Test, TestingModule } from '@nestjs/testing';
import { UrlController } from './url.controller';
import { UrlService } from './url.service';
import { RateLimiterService } from '../../common/rate-limiter.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UrlController', () => {
  let controller: UrlController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrlController],
      providers: [
        { provide: UrlService, useValue: {} },
        { provide: RateLimiterService, useValue: {} },
        { provide: AnalyticsService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<UrlController>(UrlController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
