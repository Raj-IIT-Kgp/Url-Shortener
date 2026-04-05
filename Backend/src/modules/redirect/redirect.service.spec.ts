import { Test, TestingModule } from '@nestjs/testing';
import { GoneException, NotFoundException } from '@nestjs/common';
import { RedirectService } from './redirect.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

const mockPrisma = {
    url: {
        findUnique: jest.fn(),
    },
};

const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
};

describe('RedirectService', () => {
    let service: RedirectService;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RedirectService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: RedisService, useValue: mockRedis },
            ],
        }).compile();

        service = module.get<RedirectService>(RedirectService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('returns cached URL on cache hit without hitting DB', async () => {
        mockRedis.get.mockResolvedValue('https://example.com');

        const result = await service.getOriginalUrl('abc');

        expect(result).toBe('https://example.com');
        expect(mockPrisma.url.findUnique).not.toHaveBeenCalled();
    });

    it('fetches from DB on cache miss and caches the result', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockPrisma.url.findUnique.mockResolvedValue({
            originalUrl: 'https://example.com',
            expiresAt: null,
        });
        mockRedis.set.mockResolvedValue(undefined);

        const result = await service.getOriginalUrl('abc');

        expect(result).toBe('https://example.com');
        expect(mockRedis.set).toHaveBeenCalledWith('abc', 'https://example.com', 3600);
    });

    it('caches with reduced TTL for URLs with future expiry', async () => {
        mockRedis.get.mockResolvedValue(null);
        const expiresAt = new Date(Date.now() + 60_000); // 60 seconds from now
        mockPrisma.url.findUnique.mockResolvedValue({
            originalUrl: 'https://example.com',
            expiresAt,
        });
        mockRedis.set.mockResolvedValue(undefined);

        await service.getOriginalUrl('abc');

        const [, , ttl] = mockRedis.set.mock.calls[0];
        expect(ttl).toBeLessThanOrEqual(60);
        expect(ttl).toBeGreaterThan(55); // allow a few seconds of test execution time
    });

    it('throws NotFoundException when URL does not exist', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockPrisma.url.findUnique.mockResolvedValue(null);

        await expect(service.getOriginalUrl('notfound')).rejects.toThrow(NotFoundException);
    });

    it('throws GoneException for expired URL', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockPrisma.url.findUnique.mockResolvedValue({
            originalUrl: 'https://example.com',
            expiresAt: new Date(Date.now() - 1000), // 1 second ago
        });

        await expect(service.getOriginalUrl('expired')).rejects.toThrow(GoneException);
        expect(mockRedis.set).not.toHaveBeenCalled();
    });
});
