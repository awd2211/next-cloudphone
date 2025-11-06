import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NumberPoolManagerService } from './number-pool-manager.service';
import { NumberPool } from '../entities/number-pool.entity';
import { PlatformSelectorService } from './platform-selector.service';
import { MetricsService } from '../health/metrics.service';

describe('NumberPoolManagerService', () => {
  let service: NumberPoolManagerService;
  let numberPoolRepo: Repository<NumberPool>;
  let platformSelector: PlatformSelectorService;
  let configService: ConfigService;
  let metricsService: MetricsService;

  // Mock repository
  const mockNumberPoolRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  };

  // Mock PlatformSelectorService
  const mockPlatformSelector = {
    selectBestPlatform: jest.fn(),
  };

  // Mock ConfigService
  const mockConfigService = {
    get: jest.fn(),
  };

  // Mock MetricsService
  const mockMetricsService = {
    recordNumberPoolReused: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NumberPoolManagerService,
        {
          provide: getRepositoryToken(NumberPool),
          useValue: mockNumberPoolRepo,
        },
        {
          provide: PlatformSelectorService,
          useValue: mockPlatformSelector,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    service = module.get<NumberPoolManagerService>(NumberPoolManagerService);
    numberPoolRepo = module.get<Repository<NumberPool>>(getRepositoryToken(NumberPool));
    platformSelector = module.get<PlatformSelectorService>(PlatformSelectorService);
    configService = module.get<ConfigService>(ConfigService);
    metricsService = module.get<MetricsService>(MetricsService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have correct default configuration', () => {
      expect((service as any).MIN_POOL_SIZE).toBe(5);
      expect((service as any).TARGET_POOL_SIZE).toBe(10);
      expect((service as any).MAX_POOL_SIZE).toBe(20);
      expect((service as any).NUMBER_COOLDOWN_HOURS).toBe(24);
      expect((service as any).NUMBER_LIFETIME_MINUTES).toBe(20);
    });
  });

  describe('acquireNumber - Preheated Numbers Priority', () => {
    it('should acquire preheated number first', async () => {
      const mockPreheatedNumber: Partial<NumberPool> = {
        id: 'pool-preheat',
        phoneNumber: '+79991234567',
        provider: 'sms-activate',
        serviceCode: 'tg',
        countryCode: 'RU',
        status: 'available',
        preheated: true,
        preheatedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Expires in 10 minutes
        priority: 10,
        reservedCount: 0,
        usedCount: 0,
      };

      mockNumberPoolRepo.findOne.mockResolvedValueOnce(mockPreheatedNumber);
      mockNumberPoolRepo.save.mockResolvedValueOnce({
        ...mockPreheatedNumber,
        status: 'reserved',
      });

      const result = await service.acquireNumber('tg', 'RU', 'device-123');

      expect(result).toBeDefined();
      expect(result!.status).toBe('reserved');
      expect(mockNumberPoolRepo.findOne).toHaveBeenCalledWith({
        where: {
          serviceCode: 'tg',
          countryCode: 'RU',
          status: 'available',
          preheated: true,
          expiresAt: expect.any(Object), // MoreThan(now)
        },
        order: { priority: 'DESC', preheatedAt: 'ASC' },
      });
      expect(mockMetricsService.recordNumberPoolReused).toHaveBeenCalled();
    });

    it('should fallback to regular number if no preheated available', async () => {
      const mockRegularNumber: Partial<NumberPool> = {
        id: 'pool-regular',
        phoneNumber: '+79997654321',
        provider: 'sms-activate',
        serviceCode: 'tg',
        countryCode: 'RU',
        status: 'available',
        preheated: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        priority: 5,
      };

      mockNumberPoolRepo.findOne
        .mockResolvedValueOnce(null) // No preheated
        .mockResolvedValueOnce(mockRegularNumber); // Regular available
      mockNumberPoolRepo.save.mockResolvedValueOnce({
        ...mockRegularNumber,
        status: 'reserved',
      });

      const result = await service.acquireNumber('tg', 'RU', 'device-456');

      expect(result).toBeDefined();
      expect(result!.phoneNumber).toBe('+79997654321');
      expect(mockNumberPoolRepo.findOne).toHaveBeenCalledTimes(2);
    });

    it('should return null when no numbers available', async () => {
      mockNumberPoolRepo.findOne.mockResolvedValue(null); // Both queries return null

      const result = await service.acquireNumber('tg', 'RU', 'device-789');

      expect(result).toBeNull();
      expect(mockNumberPoolRepo.findOne).toHaveBeenCalledTimes(2);
    });

    it('should skip expired preheated numbers', async () => {
      const expiredPreheatedNumber: Partial<NumberPool> = {
        id: 'pool-expired',
        status: 'available',
        preheated: true,
        expiresAt: new Date(Date.now() - 5 * 60 * 1000), // Expired 5 minutes ago
      };

      // Query with MoreThan(now) should not find expired numbers
      mockNumberPoolRepo.findOne.mockResolvedValue(null);

      const result = await service.acquireNumber('tg', 'RU');

      expect(result).toBeNull();
    });
  });

  describe('acquireNumber - Reservation', () => {
    it('should increment reservedCount when reserving', async () => {
      const mockNumber: Partial<NumberPool> = {
        id: 'pool-123',
        phoneNumber: '+79991234567',
        status: 'available',
        preheated: true,
        reservedCount: 2,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };

      mockNumberPoolRepo.findOne.mockResolvedValueOnce(mockNumber);
      mockNumberPoolRepo.save.mockResolvedValueOnce({
        ...mockNumber,
        status: 'reserved',
        reservedCount: 3,
      });

      const result = await service.acquireNumber('tg', 'RU', 'device-123');

      expect(result!.reservedCount).toBe(3);
    });

    it('should set reservedByDevice when deviceId provided', async () => {
      const mockNumber: Partial<NumberPool> = {
        id: 'pool-123',
        status: 'available',
        preheated: true,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };

      mockNumberPoolRepo.findOne.mockResolvedValueOnce(mockNumber);
      mockNumberPoolRepo.save.mockImplementationOnce((entity) => Promise.resolve(entity));

      const result = await service.acquireNumber('tg', 'RU', 'device-999');

      expect(mockNumberPoolRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          reservedByDevice: 'device-999',
          status: 'reserved',
        })
      );
    });

    it('should set reservedAt timestamp', async () => {
      const mockNumber: Partial<NumberPool> = {
        id: 'pool-123',
        status: 'available',
        preheated: true,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };

      mockNumberPoolRepo.findOne.mockResolvedValueOnce(mockNumber);
      mockNumberPoolRepo.save.mockImplementationOnce((entity) => Promise.resolve(entity));

      const before = new Date();
      await service.acquireNumber('tg', 'RU', 'device-123');
      const after = new Date();

      expect(mockNumberPoolRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          reservedAt: expect.any(Date),
        })
      );

      const savedCall = mockNumberPoolRepo.save.mock.calls[0][0];
      expect(savedCall.reservedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(savedCall.reservedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('markNumberUsed', () => {
    it('should mark number as used', async () => {
      const mockNumber: Partial<NumberPool> = {
        id: 'pool-123',
        phoneNumber: '+79991234567',
        status: 'reserved',
        usedCount: 0,
      };

      mockNumberPoolRepo.findOne.mockResolvedValueOnce(mockNumber);
      mockNumberPoolRepo.save.mockImplementationOnce((entity) => Promise.resolve(entity));

      await service.markNumberUsed('pool-123', true);

      expect(mockNumberPoolRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'used',
          usedCount: 1,
        })
      );
    });

    it('should set cooldown period for successful usage', async () => {
      const mockNumber: Partial<NumberPool> = {
        id: 'pool-123',
        phoneNumber: '+79991234567',
        status: 'reserved',
        usedCount: 0,
      };

      mockNumberPoolRepo.findOne.mockResolvedValueOnce(mockNumber);
      mockNumberPoolRepo.save.mockImplementationOnce((entity) => Promise.resolve(entity));

      const before = new Date();
      before.setHours(before.getHours() + 24);

      await service.markNumberUsed('pool-123', true);

      const savedCall = mockNumberPoolRepo.save.mock.calls[0][0];
      const expectedCooldownEnd = new Date();
      expectedCooldownEnd.setHours(expectedCooldownEnd.getHours() + 24);

      // Check expiresAt is approximately 24 hours from now
      expect(savedCall.expiresAt.getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
      expect(savedCall.expiresAt.getTime()).toBeLessThan(Date.now() + 25 * 60 * 60 * 1000);
    });

    it('should not set cooldown for failed usage', async () => {
      const mockNumber: Partial<NumberPool> = {
        id: 'pool-123',
        status: 'reserved',
        usedCount: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };

      const originalExpiry = mockNumber.expiresAt;

      mockNumberPoolRepo.findOne.mockResolvedValueOnce(mockNumber);
      mockNumberPoolRepo.save.mockImplementationOnce((entity) => Promise.resolve(entity));

      await service.markNumberUsed('pool-123', false);

      const savedCall = mockNumberPoolRepo.save.mock.calls[0][0];
      expect(savedCall.expiresAt).toBe(originalExpiry); // Should not change
    });

    it('should not set cooldown after 3rd use', async () => {
      const mockNumber: Partial<NumberPool> = {
        id: 'pool-123',
        status: 'reserved',
        usedCount: 2, // This will be 3rd use
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };

      const originalExpiry = mockNumber.expiresAt;

      mockNumberPoolRepo.findOne.mockResolvedValueOnce(mockNumber);
      mockNumberPoolRepo.save.mockImplementationOnce((entity) => Promise.resolve(entity));

      await service.markNumberUsed('pool-123', true);

      const savedCall = mockNumberPoolRepo.save.mock.calls[0][0];
      expect(savedCall.usedCount).toBe(3);
      expect(savedCall.expiresAt).toBe(originalExpiry); // Should not extend
    });

    it('should handle non-existent number gracefully', async () => {
      mockNumberPoolRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.markNumberUsed('nonexistent', true)).resolves.not.toThrow();
      expect(mockNumberPoolRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('releaseNumber', () => {
    it('should release reserved number back to available', async () => {
      const mockNumber: Partial<NumberPool> = {
        id: 'pool-123',
        phoneNumber: '+79991234567',
        status: 'reserved',
        reservedByDevice: 'device-123',
        reservedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Not expired
      };

      mockNumberPoolRepo.findOne.mockResolvedValueOnce(mockNumber);
      mockNumberPoolRepo.save.mockImplementationOnce((entity) => Promise.resolve(entity));

      await service.releaseNumber('pool-123');

      expect(mockNumberPoolRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'available',
          reservedByDevice: null,
          reservedAt: null,
        })
      );
    });

    it('should mark expired reserved number as expired instead of available', async () => {
      const mockNumber: Partial<NumberPool> = {
        id: 'pool-123',
        status: 'reserved',
        expiresAt: new Date(Date.now() - 5 * 60 * 1000), // Expired 5 minutes ago
      };

      mockNumberPoolRepo.findOne.mockResolvedValueOnce(mockNumber);
      mockNumberPoolRepo.save.mockImplementationOnce((entity) => Promise.resolve(entity));

      await service.releaseNumber('pool-123');

      expect(mockNumberPoolRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'expired',
        })
      );
    });

    it('should handle non-existent number gracefully', async () => {
      mockNumberPoolRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.releaseNumber('nonexistent')).resolves.not.toThrow();
      expect(mockNumberPoolRepo.save).not.toHaveBeenCalled();
    });

    it('should warn if number is not in reserved state', async () => {
      const mockNumber: Partial<NumberPool> = {
        id: 'pool-123',
        status: 'available', // Not reserved
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };

      mockNumberPoolRepo.findOne.mockResolvedValueOnce(mockNumber);

      await service.releaseNumber('pool-123');

      expect(mockNumberPoolRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('preheatNumbers', () => {
    it('should preheat specified number of numbers', async () => {
      const mockSelection = {
        providerName: 'sms-activate',
        provider: {},
        score: 95,
        reason: 'Best provider',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockNumberPoolRepo.create.mockImplementation((entity) => entity);
      mockNumberPoolRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const count = await service.preheatNumbers('tg', 'RU', 3);

      expect(count).toBe(3);
      expect(mockPlatformSelector.selectBestPlatform).toHaveBeenCalledTimes(3);
      expect(mockNumberPoolRepo.save).toHaveBeenCalledTimes(3);
    });

    it('should mark preheated numbers with correct flags', async () => {
      const mockSelection = {
        providerName: 'sms-activate',
        provider: {},
        score: 95,
        reason: 'Best provider',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockNumberPoolRepo.create.mockImplementation((entity) => entity);
      mockNumberPoolRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.preheatNumbers('tg', 'RU', 1);

      expect(mockNumberPoolRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          preheated: true,
          preheatedAt: expect.any(Date),
          priority: 10,
          status: 'available',
        })
      );
    });

    it('should set expiration time correctly', async () => {
      const mockSelection = {
        providerName: 'sms-activate',
        provider: {},
        score: 95,
        reason: 'Best provider',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockNumberPoolRepo.create.mockImplementation((entity) => entity);
      mockNumberPoolRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const before = new Date(Date.now() + 20 * 60 * 1000);
      await service.preheatNumbers('tg', 'RU', 1);
      const after = new Date(Date.now() + 20 * 60 * 1000);

      const createCall = mockNumberPoolRepo.create.mock.calls[0][0];
      expect(createCall.expiresAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(createCall.expiresAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    it('should handle partial failures during preheating', async () => {
      mockPlatformSelector.selectBestPlatform
        .mockResolvedValueOnce({
          providerName: 'sms-activate',
          provider: {},
          score: 95,
          reason: 'Best',
          fallbackLevel: 0,
        })
        .mockRejectedValueOnce(new Error('Platform error'))
        .mockResolvedValueOnce({
          providerName: 'sms-activate',
          provider: {},
          score: 95,
          reason: 'Best',
          fallbackLevel: 0,
        });

      mockNumberPoolRepo.create.mockImplementation((entity) => entity);
      mockNumberPoolRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const count = await service.preheatNumbers('tg', 'RU', 3);

      expect(count).toBe(2); // Only 2 succeeded
      expect(mockNumberPoolRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should use different providers if available', async () => {
      mockPlatformSelector.selectBestPlatform
        .mockResolvedValueOnce({
          providerName: 'sms-activate',
          provider: {},
          score: 95,
          reason: 'Best',
          fallbackLevel: 0,
        })
        .mockResolvedValueOnce({
          providerName: '5sim',
          provider: {},
          score: 90,
          reason: 'Second best',
          fallbackLevel: 0,
        });

      mockNumberPoolRepo.create.mockImplementation((entity) => entity);
      mockNumberPoolRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.preheatNumbers('tg', 'RU', 2);

      expect(mockNumberPoolRepo.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ provider: 'sms-activate' })
      );
      expect(mockNumberPoolRepo.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ provider: '5sim' })
      );
    });
  });

  describe('getPoolStatistics', () => {
    it('should return statistics for all numbers', async () => {
      mockNumberPoolRepo.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30) // available
        .mockResolvedValueOnce(20) // reserved
        .mockResolvedValueOnce(50) // used
        .mockResolvedValueOnce(15); // preheated

      const stats = await service.getPoolStatistics();

      expect(stats).toEqual({
        total: 100,
        available: 30,
        reserved: 20,
        used: 50,
        preheated: 15,
        utilizationRate: 70, // (20+50)/100 * 100
        preheatedRate: 50, // 15/30 * 100
      });
    });

    it('should filter by serviceCode', async () => {
      mockNumberPoolRepo.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(10);

      await service.getPoolStatistics('tg');

      expect(mockNumberPoolRepo.count).toHaveBeenCalledWith({
        where: { serviceCode: 'tg' },
      });
    });

    it('should filter by countryCode', async () => {
      mockNumberPoolRepo.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(10);

      await service.getPoolStatistics(undefined, 'RU');

      expect(mockNumberPoolRepo.count).toHaveBeenCalledWith({
        where: { countryCode: 'RU' },
      });
    });

    it('should filter by both serviceCode and countryCode', async () => {
      mockNumberPoolRepo.count
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8);

      await service.getPoolStatistics('tg', 'RU');

      expect(mockNumberPoolRepo.count).toHaveBeenCalledWith({
        where: { serviceCode: 'tg', countryCode: 'RU' },
      });
    });

    it('should handle zero division for utilization rate', async () => {
      mockNumberPoolRepo.count
        .mockResolvedValueOnce(0) // total = 0
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const stats = await service.getPoolStatistics();

      expect(stats.utilizationRate).toBe(0);
    });

    it('should handle zero division for preheated rate', async () => {
      mockNumberPoolRepo.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0) // available = 0
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);

      const stats = await service.getPoolStatistics();

      expect(stats.preheatedRate).toBe(0);
    });
  });

  describe('autoReplenishPool - Cron Job', () => {
    it('should replenish pool when below minimum', async () => {
      mockNumberPoolRepo.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(3) // available = 3 < MIN_POOL_SIZE (5)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);

      const mockSelection = {
        providerName: 'sms-activate',
        provider: {},
        score: 95,
        reason: 'Best',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockNumberPoolRepo.create.mockImplementation((entity) => entity);
      mockNumberPoolRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.autoReplenishPool();

      // Should add 7 numbers (TARGET_POOL_SIZE 10 - available 3)
      expect(mockPlatformSelector.selectBestPlatform).toHaveBeenCalled();
      expect(mockNumberPoolRepo.save).toHaveBeenCalled();
    });

    it('should not replenish when pool is sufficient', async () => {
      mockNumberPoolRepo.count
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(10) // available = 10 >= MIN_POOL_SIZE (5)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(5);

      await service.autoReplenishPool();

      expect(mockPlatformSelector.selectBestPlatform).not.toHaveBeenCalled();
    });

    it('should handle multiple service/country combinations', async () => {
      // Each combo called 5 times (total, available, reserved, used, preheated)
      mockNumberPoolRepo.count
        // First combo - needs replenish
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(1)
        // Second combo - sufficient
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(4)
        // Third combo - needs replenish
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(1);

      const mockSelection = {
        providerName: 'sms-activate',
        provider: {},
        score: 95,
        reason: 'Best',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockNumberPoolRepo.create.mockImplementation((entity) => entity);
      mockNumberPoolRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.autoReplenishPool();

      // Should replenish for first and third combo
      expect(mockPlatformSelector.selectBestPlatform.mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle errors during replenishment gracefully', async () => {
      mockNumberPoolRepo.count.mockRejectedValue(new Error('Database error'));

      await expect(service.autoReplenishPool()).resolves.not.toThrow();
    });
  });

  describe('cleanupExpiredNumbers - Cron Job', () => {
    it('should mark expired available numbers as expired', async () => {
      const expiredNumbers: Partial<NumberPool>[] = [
        { id: 'pool-1', status: 'available', expiresAt: new Date(Date.now() - 60000) },
        { id: 'pool-2', status: 'available', expiresAt: new Date(Date.now() - 120000) },
      ];

      mockNumberPoolRepo.find.mockResolvedValueOnce(expiredNumbers);
      mockNumberPoolRepo.save.mockImplementation((entities) => Promise.resolve(entities));
      mockNumberPoolRepo.delete.mockResolvedValue({ affected: 0, raw: {} });

      await service.cleanupExpiredNumbers();

      expect(mockNumberPoolRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ status: 'expired' }),
          expect.objectContaining({ status: 'expired' }),
        ])
      );
    });

    it('should delete very old expired numbers', async () => {
      // Need to have some expired numbers to trigger the delete logic
      const expiredNumbers: Partial<NumberPool>[] = [
        {
          id: 'pool-1',
          status: 'available',
          expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        },
      ];

      mockNumberPoolRepo.find.mockResolvedValueOnce(expiredNumbers as any);
      mockNumberPoolRepo.save.mockResolvedValue([]);
      mockNumberPoolRepo.delete.mockResolvedValue({ affected: 3, raw: {} });

      await service.cleanupExpiredNumbers();

      // The delete should be called after marking numbers as expired
      expect(mockNumberPoolRepo.delete).toHaveBeenCalledWith({
        status: 'expired',
        expiresAt: expect.any(Object), // LessThan(7 days ago)
      });
    });

    it('should not delete if no expired numbers', async () => {
      mockNumberPoolRepo.find.mockResolvedValueOnce([]);

      await service.cleanupExpiredNumbers();

      expect(mockNumberPoolRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('processCooldownNumbers - Cron Job', () => {
    it('should reactivate cooled-down numbers', async () => {
      const cooledDownNumbers: Partial<NumberPool>[] = [
        {
          id: 'pool-1',
          status: 'used',
          expiresAt: new Date(Date.now() - 60000), // Cooldown ended
          reservedByDevice: 'device-123',
          preheated: true,
          priority: 10,
        },
        {
          id: 'pool-2',
          status: 'used',
          expiresAt: new Date(Date.now() - 120000),
          reservedByDevice: 'device-456',
          preheated: true,
          priority: 10,
        },
      ];

      mockNumberPoolRepo.find.mockResolvedValueOnce(cooledDownNumbers);
      mockNumberPoolRepo.save.mockImplementation((entities) => Promise.resolve(entities));

      await service.processCooldownNumbers();

      expect(mockNumberPoolRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'available',
            reservedByDevice: null,
            reservedAt: null,
            preheated: false, // No longer preheated
            priority: 5, // Lower priority
          }),
        ])
      );
    });

    it('should extend expiration time for reactivated numbers', async () => {
      const cooledDownNumbers: Partial<NumberPool>[] = [
        {
          id: 'pool-1',
          status: 'used',
          expiresAt: new Date(Date.now() - 60000),
        },
      ];

      mockNumberPoolRepo.find.mockResolvedValueOnce(cooledDownNumbers);
      mockNumberPoolRepo.save.mockImplementation((entities) => Promise.resolve(entities));

      const before = new Date(Date.now() + 20 * 60 * 1000);
      await service.processCooldownNumbers();
      const after = new Date(Date.now() + 20 * 60 * 1000);

      const savedCall = mockNumberPoolRepo.save.mock.calls[0][0][0];
      expect(savedCall.expiresAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(savedCall.expiresAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    it('should not process if no cooled-down numbers', async () => {
      mockNumberPoolRepo.find.mockResolvedValueOnce([]);

      await service.processCooldownNumbers();

      expect(mockNumberPoolRepo.save).not.toHaveBeenCalled();
    });

    it('should process multiple numbers in batch', async () => {
      const cooledDownNumbers = Array.from({ length: 10 }, (_, i) => ({
        id: `pool-${i}`,
        status: 'used',
        expiresAt: new Date(Date.now() - 60000),
      }));

      mockNumberPoolRepo.find.mockResolvedValueOnce(cooledDownNumbers);
      mockNumberPoolRepo.save.mockImplementation((entities) => Promise.resolve(entities));

      await service.processCooldownNumbers();

      expect(mockNumberPoolRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining(
          Array.from({ length: 10 }, () =>
            expect.objectContaining({ status: 'available' })
          )
        )
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent acquisitions gracefully', async () => {
      const mockNumber: Partial<NumberPool> = {
        id: 'pool-123',
        status: 'available',
        preheated: true,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };

      mockNumberPoolRepo.findOne.mockResolvedValue(mockNumber);
      mockNumberPoolRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const results = await Promise.all([
        service.acquireNumber('tg', 'RU', 'device-1'),
        service.acquireNumber('tg', 'RU', 'device-2'),
      ]);

      // Both should get a number (in practice, database constraints would prevent this)
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
    });

    it('should handle very large pool sizes', async () => {
      mockNumberPoolRepo.count
        .mockResolvedValueOnce(10000)
        .mockResolvedValueOnce(5000)
        .mockResolvedValueOnce(2000)
        .mockResolvedValueOnce(3000)
        .mockResolvedValueOnce(2500);

      const stats = await service.getPoolStatistics();

      expect(stats.total).toBe(10000);
      expect(stats.utilizationRate).toBe(50);
    });

    it('should handle numbers with no expiration', async () => {
      const mockNumber: Partial<NumberPool> = {
        id: 'pool-123',
        status: 'reserved',
        expiresAt: null as any,
      };

      mockNumberPoolRepo.findOne.mockResolvedValueOnce(mockNumber);
      mockNumberPoolRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.releaseNumber('pool-123');

      // Should handle null expiresAt gracefully
      expect(mockNumberPoolRepo.save).toHaveBeenCalled();
    });
  });
});
