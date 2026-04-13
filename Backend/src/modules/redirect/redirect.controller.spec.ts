import { Test, TestingModule } from '@nestjs/testing';
import { RedirectController } from './redirect.controller';
import { RedirectService } from './redirect.service';
import { RateLimiterService } from '../../common/rate-limiter.service';
import { KafkaProducerService } from '../../kafka/kafka.producer.service';

describe('RedirectController', () => {
  let controller: RedirectController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RedirectController],
      providers: [
        { provide: RedirectService, useValue: {} },
        { provide: RateLimiterService, useValue: {} },
        { provide: KafkaProducerService, useValue: {} },
      ],
    }).compile();

    controller = module.get<RedirectController>(RedirectController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
