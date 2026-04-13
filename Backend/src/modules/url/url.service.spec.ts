import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UrlService } from './url.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

// nanoid is ESM — mock it so Jest (CommonJS) can handle it
jest.mock('nanoid', () => ({ nanoid: jest.fn(() => 'mockcode') }));

const mockPrisma = {
    url: {
        create: jest.fn(),
    },
};

const mockConfig = {
    get: jest.fn().mockImplementation((key: string) => {
        if (key === 'GOOGLE_SAFE_BROWSING_API_KEY') return undefined;
        return 'http://localhost:3000';
    }),
};

const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    setNx: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(undefined),
};

describe('UrlService', () => {
    let service: UrlService;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setNx.mockResolvedValue(true);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UrlService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: ConfigService, useValue: mockConfig },
                { provide: RedisService, useValue: mockRedis },
            ],
        }).compile();

        service = module.get<UrlService>(UrlService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('creates a short URL successfully', async () => {
        mockPrisma.url.create.mockResolvedValue({
            shortCode: 'mockcode',
            originalUrl: 'https://example.com',
            password: null,
            maxClicks: null,
            qrCode: null,
        });

        const result = await service.createShortUrl({ originalUrl: 'https://example.com' });

        expect(result.shortCode).toBe('mockcode');
        expect(result.shortUrl).toBe('http://localhost:3000/mockcode');
        expect(mockPrisma.url.create).toHaveBeenCalledTimes(1);
    });

    it('uses custom alias when provided', async () => {
        mockPrisma.url.create.mockResolvedValue({
            shortCode: 'my-link',
            originalUrl: 'https://example.com',
            password: null,
            maxClicks: null,
            qrCode: null,
        });

        const result = await service.createShortUrl({
            originalUrl: 'https://example.com',
            customAlias: 'my-link',
        });

        expect(result.shortCode).toBe('my-link');
        const createCall = mockPrisma.url.create.mock.calls[0][0];
        expect(createCall.data.shortCode).toBe('my-link');
    });

    it('throws BadRequestException when custom alias is already taken', async () => {
        mockPrisma.url.create.mockRejectedValue({ code: 'P2002' });

        await expect(
            service.createShortUrl({ originalUrl: 'https://example.com', customAlias: 'taken' }),
        ).rejects.toThrow(BadRequestException);

        expect(mockPrisma.url.create).toHaveBeenCalledTimes(1);
    });

    it('retries on random code collision and succeeds', async () => {
        mockPrisma.url.create
            .mockRejectedValueOnce({ code: 'P2002' })
            .mockRejectedValueOnce({ code: 'P2002' })
            .mockResolvedValue({ shortCode: 'newcode', originalUrl: 'https://example.com', password: null, maxClicks: null, qrCode: null });

        const result = await service.createShortUrl({ originalUrl: 'https://example.com' });

        expect(result.shortCode).toBe('newcode');
        expect(mockPrisma.url.create).toHaveBeenCalledTimes(3);
    });

    it('throws InternalServerErrorException after 5 collision retries', async () => {
        mockPrisma.url.create.mockRejectedValue({ code: 'P2002' });

        await expect(
            service.createShortUrl({ originalUrl: 'https://example.com' }),
        ).rejects.toThrow(InternalServerErrorException);

        expect(mockPrisma.url.create).toHaveBeenCalledTimes(5);
    });

    it('throws BadRequestException for past expiresAt', async () => {
        const pastDate = new Date(Date.now() - 60_000).toISOString();

        await expect(
            service.createShortUrl({ originalUrl: 'https://example.com', expiresAt: pastDate }),
        ).rejects.toThrow(BadRequestException);

        expect(mockPrisma.url.create).not.toHaveBeenCalled();
    });

    it('stores expiresAt as a Date object in DB', async () => {
        const futureDate = new Date(Date.now() + 86_400_000).toISOString();
        mockPrisma.url.create.mockResolvedValue({
            shortCode: 'abc123',
            originalUrl: 'https://example.com',
            password: null,
            maxClicks: null,
            qrCode: null,
        });

        await service.createShortUrl({ originalUrl: 'https://example.com', expiresAt: futureDate });

        const createCall = mockPrisma.url.create.mock.calls[0][0];
        expect(createCall.data.expiresAt).toBeInstanceOf(Date);
    });

    it('propagates unexpected DB errors', async () => {
        const dbError = new Error('Connection timeout');
        mockPrisma.url.create.mockRejectedValue(dbError);

        await expect(
            service.createShortUrl({ originalUrl: 'https://example.com' }),
        ).rejects.toThrow('Connection timeout');
    });
});
