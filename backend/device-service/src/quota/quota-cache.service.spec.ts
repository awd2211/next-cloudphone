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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaCacheService,
        {
          provide: QuotaClientService,
          useValue: mockQuotaClient,
        },
        {
          provide: 'default_IORedisModuleConnectionToken',
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
    const mockQuotaResponse: QuotaResponse = {
      userId: 'user-1',
      maxDevices: 10,
      maxCpuCores: 32,
      maxMemoryGB: 64,
      maxStorageGB: 500,
      currentDevices: 5,
      currentCpuCores: 16,
      currentMemoryGB: 32,
      currentStorageGB: 250,
      status: QuotaStatus.NORMAL,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('应该从Redis缓存返回配额（缓存命中）', async () => {
      // Mock: Redis缓存命中
      mockRedis.get.mockResolvedValue(JSON.stringify(mockQuotaResponse));

      const result = await service.getQuotaWithCache('user-1');

      expect(result).toEqual(mockQuotaResponse);
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
      expect(result.maxDevices).toBeGreaterThan(0);
      expect(result.status).toBe(QuotaStatus.NORMAL);
    });

    it('应该处理Redis异常（直接调用user-service）', async () => {
      // Mock: Redis异常
      mockRedis.get.mockRejectedValue(new Error('Redis connection error'));
      mockQuotaClient.getUserQuota.mockResolvedValue(mockQuotaResponse);

      const result = await service.getQuotaWithCache('user-1');

      expect(result).toEqual(mockQuotaResponse);
      expect(mockQuotaClient.getUserQuota).toHaveBeenCalled();
    });
  });

  describe('缓存TTL', () => {
    it('应该使用正确的TTL写入缓存', async () => {
      const mockQuota: QuotaResponse = {
        userId: 'user-1',
        maxDevices: 10,
        currentDevices: 5,
        status: QuotaStatus.NORMAL,
      } as QuotaResponse;

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
      const cachedQuota = { userId: 'user-1', maxDevices: 10 } as QuotaResponse;
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
      mockQuotaClient.getUserQuota.mockResolvedValue({ userId: 'user-1' } as QuotaResponse);

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
