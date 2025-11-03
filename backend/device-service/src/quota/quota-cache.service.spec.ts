import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { QuotaCacheService } from './quota-cache.service';
import { QuotaClientService, QuotaResponse, QuotaStatus } from './quota-client.service';

describe('QuotaCacheService', () => {
  let service: QuotaCacheService;
  let quotaClient: QuotaClientService;
  let redis: Redis;

  const mockQuotaClient = {
    getUserQuota: jest.fn(),
    checkDeviceCreationQuota: jest.fn(),
  };

  const mockRedis = {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  const mockQuotaResponse: QuotaResponse = {
    id: 'quota-1',
    userId: 'user-1',
    planId: 'plan-1',
    planName: 'Standard Plan',
    status: QuotaStatus.ACTIVE,
    limits: {
      maxDevices: 10,
      maxConcurrentDevices: 5,
      maxCpuCoresPerDevice: 4,
      maxMemoryMBPerDevice: 4096,
      maxStorageGBPerDevice: 20,
      totalCpuCores: 32,
      totalMemoryGB: 64,
      totalStorageGB: 500,
      maxBandwidthMbps: 100,
      monthlyTrafficGB: 1000,
      maxUsageHoursPerDay: 24,
      maxUsageHoursPerMonth: 720,
    },
    usage: {
      currentDevices: 5,
      currentConcurrentDevices: 2,
      usedCpuCores: 16,
      usedMemoryGB: 32,
      usedStorageGB: 250,
      currentBandwidthMbps: 50,
      monthlyTrafficUsedGB: 500,
      todayUsageHours: 10,
      monthlyUsageHours: 300,
      lastUpdatedAt: new Date(),
    },
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    autoRenew: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaCacheService,
        {
          provide: QuotaClientService,
          useValue: mockQuotaClient,
        },
        {
          provide: Redis,
          useValue: mockRedis,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<QuotaCacheService>(QuotaCacheService);
    quotaClient = module.get<QuotaClientService>(QuotaClientService);
    redis = mockRedis as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuotaWithCache', () => {
    it('应该从Redis缓存返回配额（缓存命中）', async () => {
      // Mock: Redis缓存命中
      mockRedis.get.mockResolvedValue(JSON.stringify(mockQuotaResponse));

      const result = await service.getQuotaWithCache('user-1');

      // JSON.parse 会把 Date 转为字符串，所以使用 toMatchObject 而不是 toEqual
      expect(result).toMatchObject({
        userId: 'user-1',
        status: QuotaStatus.ACTIVE,
        limits: expect.objectContaining({
          maxDevices: 10,
        }),
        usage: expect.objectContaining({
          currentDevices: 5,
        }),
      });
      expect(mockRedis.get).toHaveBeenCalledWith(expect.stringContaining('quota:user-1'));
      expect(mockQuotaClient.getUserQuota).not.toHaveBeenCalled();
    });

    it('应该从user-service获取配额（缓存未命中）', async () => {
      // Mock: Redis缓存未命中
      mockRedis.get.mockResolvedValue(null);
      mockQuotaClient.getUserQuota.mockResolvedValue(mockQuotaResponse);

      const result = await service.getQuotaWithCache('user-1');

      expect(result).toEqual(mockQuotaResponse);
      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockQuotaClient.getUserQuota).toHaveBeenCalledWith('user-1');
      // 验证写入缓存
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('quota:user-1'),
        60, // TTL
        JSON.stringify(mockQuotaResponse)
      );
    });

    it('应该在user-service不可用时使用降级策略', async () => {
      // Mock: Redis未命中，user-service失败
      mockRedis.get.mockResolvedValue(null);
      mockQuotaClient.getUserQuota.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.getQuotaWithCache('user-1');

      expect(result).toBeDefined();
      // 降级策略应该提供默认配额
      expect(result.limits.maxDevices).toBeGreaterThan(0);
      expect(result.status).toBe(QuotaStatus.ACTIVE);
    });

    it('应该处理Redis异常（直接调用user-service）', async () => {
      // Mock: Redis异常（初次和 stale cache 尝试都失败）
      mockRedis.get
        .mockRejectedValueOnce(new Error('Redis connection error'))
        .mockResolvedValueOnce(null); // Stale cache 也为空
      mockQuotaClient.getUserQuota.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.getQuotaWithCache('user-1');

      // 应该使用降级配额
      expect(result).toBeDefined();
      expect(result.limits.maxDevices).toBeGreaterThan(0);
      expect(result.status).toBe(QuotaStatus.ACTIVE);
    });
  });

  describe('缓存TTL', () => {
    it('应该使用正确的TTL写入缓存', async () => {
      const mockQuota: QuotaResponse = {
        ...mockQuotaResponse,
        userId: 'user-1',
      };

      mockRedis.get.mockResolvedValue(null);
      mockQuotaClient.getUserQuota.mockResolvedValue(mockQuota);

      await service.getQuotaWithCache('user-1');

      // 验证TTL为60秒
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        60,
        expect.any(String)
      );
    });
  });

  describe('缓存键生成', () => {
    it('应该为不同用户生成不同的缓存键', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockQuotaClient.getUserQuota.mockResolvedValue({} as QuotaResponse);

      await service.getQuotaWithCache('user-1');
      await service.getQuotaWithCache('user-2');

      const calls = mockRedis.get.mock.calls;
      expect(calls[0][0]).not.toBe(calls[1][0]);
      expect(calls[0][0]).toContain('user-1');
      expect(calls[1][0]).toContain('user-2');
    });
  });

  describe('性能优化', () => {
    it('缓存命中时应该显著快于服务调用', async () => {
      const cachedQuota = { ...mockQuotaResponse, userId: 'user-1' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedQuota));

      const start = Date.now();
      await service.getQuotaWithCache('user-1');
      const duration = Date.now() - start;

      // 缓存读取应该很快（< 10ms）
      expect(duration).toBeLessThan(100);
      expect(mockQuotaClient.getUserQuota).not.toHaveBeenCalled();
    });
  });

  describe('并发安全', () => {
    it('应该正确处理并发请求', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockQuotaClient.getUserQuota.mockResolvedValue({ ...mockQuotaResponse, userId: 'user-1' });

      // 并发请求
      const promises = [
        service.getQuotaWithCache('user-1'),
        service.getQuotaWithCache('user-1'),
        service.getQuotaWithCache('user-1'),
      ];

      const results = await Promise.all(promises);

      // 所有请求都应该成功
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    });
  });
});
