import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcryptjs';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';

const TEST_JWT_SECRET = 'integration-test-secret';

const mockPrisma = {
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
};

const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
};

const mockConfig = {
    get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return TEST_JWT_SECRET;
        return undefined;
    }),
};

describe('Auth (Integration)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                PassportModule,
                JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '15m' } }),
            ],
            controllers: [AuthController],
            providers: [
                AuthService,
                JwtStrategy,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: RedisService, useValue: mockRedis },
                { provide: ConfigService, useValue: mockConfig },
            ],
        }).compile();

        app = module.createNestApplication();
        app.use(cookieParser());
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
        await app.init();
    });

    afterAll(() => app.close());

    beforeEach(() => {
        jest.clearAllMocks();
        mockRedis.get.mockResolvedValue(null);
        mockRedis.set.mockResolvedValue(undefined);
        mockRedis.del.mockResolvedValue(undefined);
        mockRedis.incr.mockResolvedValue(1);
        mockRedis.expire.mockResolvedValue(undefined);
    });

    // ── Register ─────────────────────────────────────────────────────────────

    describe('POST /auth/register', () => {
        it('returns access_token in body and sets refresh_token as httpOnly cookie', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            mockPrisma.user.create.mockResolvedValue({
                id: 'user-1',
                email: 'new@example.com',
                password: 'hashed',
            });

            const res = await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email: 'new@example.com', password: 'password123' })
                .expect(201);

            expect(res.body.access_token).toBeDefined();
            expect(res.body.refresh_token).toBeUndefined(); // NOT in body
            expect(res.headers['set-cookie']).toBeDefined();
            expect(res.headers['set-cookie'][0]).toMatch(/refresh_token=/);
            expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/);
        });

        it('returns 409 when email is already registered', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'taken@example.com' });

            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email: 'taken@example.com', password: 'password123' })
                .expect(409);
        });

        it('returns 400 for an invalid email address', async () => {
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email: 'not-an-email', password: 'password123' })
                .expect(400);
        });

        it('returns 400 for a password shorter than 6 characters', async () => {
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email: 'user@example.com', password: 'abc' })
                .expect(400);
        });
    });

    // ── Login ─────────────────────────────────────────────────────────────────

    describe('POST /auth/login', () => {
        it('returns access_token and sets httpOnly cookie for valid credentials', async () => {
            const hashed = await bcrypt.hash('correct-password', 10);
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 'user-1',
                email: 'user@example.com',
                password: hashed,
                apiKey: null,
            });

            const res = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'user@example.com', password: 'correct-password' })
                .expect(200);

            expect(res.body.access_token).toBeDefined();
            expect(res.body.refresh_token).toBeUndefined();
            expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/);
        });

        it('returns 401 for a wrong password', async () => {
            const hashed = await bcrypt.hash('correct', 10);
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 'user-1',
                email: 'user@example.com',
                password: hashed,
                apiKey: null,
            });

            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'user@example.com', password: 'wrong' })
                .expect(401);
        });

        it('returns 401 for an unknown email', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);

            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'ghost@example.com', password: 'password123' })
                .expect(401);
        });

        it('returns 429 after 5 failed login attempts (brute-force lockout)', async () => {
            // Simulate account already locked in Redis
            mockRedis.get.mockImplementation((key: string) => {
                if (key === 'login_locked:locked@example.com') return Promise.resolve('1');
                return Promise.resolve(null);
            });

            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'locked@example.com', password: 'any' })
                .expect(429);
        });
    });

    // ── Refresh ───────────────────────────────────────────────────────────────

    describe('POST /auth/refresh', () => {
        it('issues new tokens and rotates the refresh cookie', async () => {
            const storedPayload = JSON.stringify({ userId: 'user-1', familyId: 'family-abc' });
            mockRedis.get.mockImplementation((key: string) => {
                if (key.startsWith('refresh:')) return Promise.resolve(storedPayload);
                return Promise.resolve(null); // family not revoked
            });
            mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });

            const res = await request(app.getHttpServer())
                .post('/auth/refresh')
                .set('Cookie', 'refresh_token=valid-token')
                .expect(200);

            expect(res.body.access_token).toBeDefined();
            expect(res.body.refresh_token).toBeUndefined();
            // Old token deleted (rotation)
            expect(mockRedis.del).toHaveBeenCalledWith('refresh:valid-token');
            // New cookie set
            expect(res.headers['set-cookie'][0]).toMatch(/refresh_token=/);
        });

        it('returns 401 for an expired or unknown refresh token', async () => {
            mockRedis.get.mockResolvedValue(null);

            await request(app.getHttpServer())
                .post('/auth/refresh')
                .set('Cookie', 'refresh_token=stale-token')
                .expect(401);
        });

        it('returns 401 and blocks session when a revoked family token is replayed', async () => {
            const storedPayload = JSON.stringify({ userId: 'user-1', familyId: 'compromised-family' });
            mockRedis.get.mockImplementation((key: string) => {
                if (key.startsWith('refresh:')) return Promise.resolve(storedPayload);
                if (key.startsWith('revoked_family:')) return Promise.resolve('1'); // family is revoked
                return Promise.resolve(null);
            });

            await request(app.getHttpServer())
                .post('/auth/refresh')
                .set('Cookie', 'refresh_token=stolen-token')
                .expect(401);
        });
    });

    // ── Logout ────────────────────────────────────────────────────────────────

    describe('POST /auth/logout', () => {
        it('clears the cookie, revokes the family, and returns success', async () => {
            const storedPayload = JSON.stringify({ userId: 'user-1', familyId: 'family-abc' });
            mockRedis.get.mockResolvedValue(storedPayload);

            const res = await request(app.getHttpServer())
                .post('/auth/logout')
                .set('Cookie', 'refresh_token=active-token')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(mockRedis.del).toHaveBeenCalledWith('refresh:active-token');
            // Family revoked so sibling tokens also become invalid
            expect(mockRedis.set).toHaveBeenCalledWith(
                'revoked_family:family-abc',
                '1',
                expect.any(Number),
            );
            // Cookie cleared
            expect(res.headers['set-cookie'][0]).toMatch(/refresh_token=;/);
        });

        it('returns success even with no cookie (idempotent)', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/logout')
                .expect(200);

            expect(res.body.success).toBe(true);
        });
    });
});
