import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpException, HttpStatus } from '@nestjs/common';
import { RedirectController } from './redirect.controller';
import { RedirectService } from './redirect.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { RateLimiterService } from '../../common/rate-limiter.service';
import { KafkaProducerService } from '../../kafka/kafka.producer.service';

const mockPrisma = {
    url: { findUnique: jest.fn() },
};

const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
};

const mockKafka = {
    publishClickEvent: jest.fn().mockResolvedValue(undefined),
};

const mockRateLimiter = {
    consume: jest.fn().mockResolvedValue(undefined),
};

describe('Redirect (Integration)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [RedirectController],
            providers: [
                RedirectService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: RedisService, useValue: mockRedis },
                { provide: KafkaProducerService, useValue: mockKafka },
                { provide: RateLimiterService, useValue: mockRateLimiter },
            ],
        }).compile();

        app = module.createNestApplication();
        await app.init();
    });

    afterAll(() => app.close());

    beforeEach(() => {
        jest.clearAllMocks();
        mockRedis.get.mockResolvedValue(null);
        mockRedis.set.mockResolvedValue(undefined);
        mockRateLimiter.consume.mockResolvedValue(undefined);
        mockKafka.publishClickEvent.mockResolvedValue(undefined);
    });

    // ── Successful redirect ───────────────────────────────────────────────────

    describe('GET /:code (redirect)', () => {
        it('redirects to the original URL with a 302', async () => {
            mockPrisma.url.findUnique.mockResolvedValue({
                originalUrl: 'https://example.com',
                expiresAt: null,
                password: null,
                maxClicks: null,
                clicks: 0,
            });
            mockRedis.get.mockResolvedValueOnce(null).mockResolvedValueOnce('https://example.com');

            const res = await request(app.getHttpServer())
                .get('/abc123')
                .redirects(0)
                .expect(302);

            expect(res.headers.location).toBe('https://example.com');
        });

        it('publishes a click event to Kafka on redirect', async () => {
            mockPrisma.url.findUnique.mockResolvedValue({
                originalUrl: 'https://example.com',
                expiresAt: null,
                password: null,
                maxClicks: null,
                clicks: 0,
            });

            await request(app.getHttpServer()).get('/abc123').redirects(0);

            expect(mockKafka.publishClickEvent).toHaveBeenCalledWith('abc123', expect.any(String), expect.any(String));
        });

        it('returns 200 JSON with requiresPassword: true for password-protected URLs', async () => {
            mockPrisma.url.findUnique.mockResolvedValue({
                originalUrl: 'https://secret.com',
                expiresAt: null,
                password: 'hashed-password',
                maxClicks: null,
                clicks: 0,
            });

            const res = await request(app.getHttpServer())
                .get('/secured')
                .redirects(0)
                .expect(200);

            expect(res.body.requiresPassword).toBe(true);
            expect(res.body.shortCode).toBe('secured');
            expect(mockKafka.publishClickEvent).not.toHaveBeenCalled();
        });

        it('returns 404 for an unknown short code', async () => {
            mockPrisma.url.findUnique.mockResolvedValue(null);

            await request(app.getHttpServer())
                .get('/notfound')
                .redirects(0)
                .expect(404);
        });

        it('returns 410 Gone for an expired URL', async () => {
            mockPrisma.url.findUnique.mockResolvedValue({
                originalUrl: 'https://old.com',
                expiresAt: new Date(Date.now() - 1000),
                password: null,
                maxClicks: null,
                clicks: 0,
            });

            await request(app.getHttpServer())
                .get('/expired')
                .redirects(0)
                .expect(410);

            expect(mockKafka.publishClickEvent).not.toHaveBeenCalled();
        });

        it('returns 404 for reserved paths (health, auth, url, api)', async () => {
            for (const path of ['health', 'auth', 'url', 'api']) {
                await request(app.getHttpServer())
                    .get(`/${path}`)
                    .redirects(0)
                    .expect(404);
            }
        });

        it('returns 429 when rate limit is exceeded', async () => {
            mockRateLimiter.consume.mockRejectedValue(new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS));

            await request(app.getHttpServer())
                .get('/abc123')
                .redirects(0)
                .expect(429);
        });
    });
});
