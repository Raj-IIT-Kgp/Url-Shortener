import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

const mockPrisma = {
    url: {
        findUnique: jest.fn(),
    },
    clickEvent: {
        findMany: jest.fn().mockResolvedValue([]),
    },
};

const mockRedis = {
    get: jest.fn(),
};

describe('AnalyticsService', () => {
    let service: AnalyticsService;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticsService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: RedisService, useValue: mockRedis },
            ],
        }).compile();

        service = module.get<AnalyticsService>(AnalyticsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('returns stats with combined DB + pending click count', async () => {
        const createdAt = new Date();
        mockPrisma.url.findUnique.mockResolvedValue({
            id: 'url-1',
            shortCode: 'abc',
            originalUrl: 'https://example.com',
            clicks: 10,
            createdAt,
            expiresAt: null,
            clickEvents: [],
        });
        mockRedis.get.mockResolvedValue('5');

        const stats = await service.getStats('abc');

        expect(stats.totalClicks).toBe(15);
        expect(stats.dbClicks).toBe(10);
        expect(stats.pendingClicks).toBe(5);
        expect(stats.shortCode).toBe('abc');
        expect(stats.originalUrl).toBe('https://example.com');
    });

    it('handles no pending clicks (Redis returns null)', async () => {
        mockPrisma.url.findUnique.mockResolvedValue({
            id: 'url-1',
            shortCode: 'abc',
            originalUrl: 'https://example.com',
            clicks: 7,
            createdAt: new Date(),
            expiresAt: null,
            clickEvents: [],
        });
        mockRedis.get.mockResolvedValue(null);

        const stats = await service.getStats('abc');

        expect(stats.pendingClicks).toBe(0);
        expect(stats.totalClicks).toBe(7);
    });

    it('checks redis for clicks:code key', async () => {
        mockPrisma.url.findUnique.mockResolvedValue({
            id: 'url-1',
            shortCode: 'abc',
            originalUrl: 'https://example.com',
            clicks: 0,
            createdAt: new Date(),
            expiresAt: null,
            clickEvents: [],
        });
        mockRedis.get.mockResolvedValue('0');

        await service.getStats('abc');

        expect(mockRedis.get).toHaveBeenCalledWith('clicks:abc');
    });

    it('throws NotFoundException when URL does not exist', async () => {
        mockPrisma.url.findUnique.mockResolvedValue(null);

        await expect(service.getStats('notfound')).rejects.toThrow(NotFoundException);
    });

    it('returns clicksPerDay with 30 entries', async () => {
        mockPrisma.url.findUnique.mockResolvedValue({
            id: 'url-1',
            shortCode: 'abc',
            originalUrl: 'https://example.com',
            clicks: 0,
            createdAt: new Date(),
            expiresAt: null,
            clickEvents: [],
        });
        mockRedis.get.mockResolvedValue(null);
        const today = new Date().toISOString().slice(0, 10);
        mockPrisma.clickEvent.findMany.mockResolvedValue([
            { createdAt: new Date() },
            { createdAt: new Date() },
        ]);

        const stats = await service.getStats('abc');

        expect(stats.clicksPerDay).toHaveLength(30);
        const todayEntry = stats.clicksPerDay.find((d) => d.date === today);
        expect(todayEntry?.count).toBe(2);
    });
});
