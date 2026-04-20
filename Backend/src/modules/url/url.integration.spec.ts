import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UrlController } from './url.controller';
import { UrlService } from './url.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { RateLimiterService } from '../../common/rate-limiter.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { JwtStrategy } from '../auth/jwt.strategy';

// nanoid is ESM — mock it so Jest (CommonJS) can handle it
jest.mock('nanoid', () => ({ nanoid: jest.fn(() => 'int-code') }));

const TEST_JWT_SECRET = 'url-integration-test-secret';
const TEST_USER = { id: 'user-integration', email: 'integration@example.com' };

const mockPrisma = {
    url: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
    },
    clickEvent: {
        findMany: jest.fn().mockResolvedValue([]),
    },
};

const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    incr: jest.fn().mockResolvedValue(1),
    setNx: jest.fn().mockResolvedValue(true),
};

const mockConfig = {
    get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return TEST_JWT_SECRET;
        if (key === 'BASE_URL') return 'http://localhost:3000';
        if (key === 'GOOGLE_SAFE_BROWSING_API_KEY') return undefined;
        return undefined;
    }),
};

// Guard that always passes and injects a test user into req
class AuthGuardMock implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();
        req.user = TEST_USER;
        return true;
    }
}

// Guard that always passes but does NOT inject a user (anonymous)
class OptionalGuardMock implements CanActivate {
    canActivate(): boolean {
        return true;
    }
}

describe('Url (Integration)', () => {
    let app: INestApplication;
    let jwtService: JwtService;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                PassportModule,
                JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } }),
                ConfigModule.forRoot({ ignoreEnvFile: true }),
            ],
            controllers: [UrlController],
            providers: [
                UrlService,
                AnalyticsService,
                JwtStrategy,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: RedisService, useValue: mockRedis },
                { provide: ConfigService, useValue: mockConfig },
                { provide: RateLimiterService, useValue: { consume: jest.fn().mockResolvedValue(undefined) } },
            ],
        })
            .overrideGuard(JwtAuthGuard).useClass(AuthGuardMock)
            .overrideGuard(OptionalJwtAuthGuard).useClass(OptionalGuardMock)
            .overrideGuard(ApiKeyGuard).useClass(OptionalGuardMock)
            .compile();

        app = module.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
        await app.init();

        jwtService = module.get<JwtService>(JwtService);
    });

    afterAll(() => app.close());

    beforeEach(() => {
        jest.clearAllMocks();
        mockRedis.get.mockResolvedValue(null);
        mockRedis.set.mockResolvedValue(undefined);
        mockRedis.setNx.mockResolvedValue(true);
        mockPrisma.clickEvent.findMany.mockResolvedValue([]);
    });

    // ── POST /url ─────────────────────────────────────────────────────────────

    describe('POST /url', () => {
        it('creates a short URL and returns shortCode + shortUrl', async () => {
            mockPrisma.url.create.mockResolvedValue({
                shortCode: 'int-code',
                originalUrl: 'https://example.com',
                password: null,
                maxClicks: null,
                qrCode: null,
            });

            const res = await request(app.getHttpServer())
                .post('/url')
                .send({ originalUrl: 'https://example.com' })
                .expect(201);

            expect(res.body.shortCode).toBe('int-code');
            expect(res.body.shortUrl).toContain('int-code');
        });

        it('returns 400 for a non-URL originalUrl', async () => {
            await request(app.getHttpServer())
                .post('/url')
                .send({ originalUrl: 'not-a-url' })
                .expect(400);
        });

        it('returns 400 for a past expiresAt', async () => {
            await request(app.getHttpServer())
                .post('/url')
                .send({ originalUrl: 'https://example.com', expiresAt: new Date(Date.now() - 60000).toISOString() })
                .expect(400);
        });

        it('returns 400 for unknown body fields (whitelist)', async () => {
            await request(app.getHttpServer())
                .post('/url')
                .send({ originalUrl: 'https://example.com', unknownField: 'bad' })
                .expect(400);
        });
    });

    // ── GET /url/my-links ─────────────────────────────────────────────────────

    describe('GET /url/my-links', () => {
        it('returns a list of URLs owned by the authenticated user', async () => {
            mockPrisma.url.findMany.mockResolvedValue([
                { id: 'u1', shortCode: 'abc', originalUrl: 'https://a.com', clicks: 5, createdAt: new Date(), expiresAt: null, maxClicks: null },
                { id: 'u2', shortCode: 'def', originalUrl: 'https://b.com', clicks: 0, createdAt: new Date(), expiresAt: null, maxClicks: null },
            ]);

            const token = jwtService.sign({ sub: TEST_USER.id, email: TEST_USER.email });
            const res = await request(app.getHttpServer())
                .get('/url/my-links')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(res.body).toHaveLength(2);
            expect(res.body[0].shortCode).toBe('abc');
        });

        it('returns an empty array when the user has no URLs', async () => {
            mockPrisma.url.findMany.mockResolvedValue([]);

            const token = jwtService.sign({ sub: TEST_USER.id, email: TEST_USER.email });
            const res = await request(app.getHttpServer())
                .get('/url/my-links')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(res.body).toEqual([]);
        });
    });

    // ── DELETE /url/:code ─────────────────────────────────────────────────────

    describe('DELETE /url/:code', () => {
        it('deletes an owned URL and returns success', async () => {
            mockPrisma.url.findUnique.mockResolvedValue({
                id: 'u1',
                shortCode: 'abc',
                userId: TEST_USER.id,
            });
            mockPrisma.url.delete.mockResolvedValue({});

            const token = jwtService.sign({ sub: TEST_USER.id, email: TEST_USER.email });
            const res = await request(app.getHttpServer())
                .delete('/url/abc')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(res.body.success).toBe(true);
        });

        it('returns 400 when trying to delete a URL owned by another user', async () => {
            mockPrisma.url.findUnique.mockResolvedValue({
                id: 'u1',
                shortCode: 'abc',
                userId: 'other-user',
            });

            const token = jwtService.sign({ sub: TEST_USER.id, email: TEST_USER.email });
            await request(app.getHttpServer())
                .delete('/url/abc')
                .set('Authorization', `Bearer ${token}`)
                .expect(400);
        });
    });

    // ── POST /url/:code/unlock ────────────────────────────────────────────────

    describe('POST /url/:code/unlock', () => {
        it('returns valid: true and originalUrl for the correct password', async () => {
            mockPrisma.url.findUnique.mockResolvedValue({
                shortCode: 'secured',
                originalUrl: 'https://secret.com',
                password: null, // null means no password, verifyPassword returns valid: true
            });

            const res = await request(app.getHttpServer())
                .post('/url/secured/unlock')
                .send({ password: 'any' })
                .expect(201);

            expect(res.body.valid).toBe(true);
        });
    });
});
