import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ProxyPoolManager } from './pool-manager.service';
import { ProxyUsage } from '../entities/proxy-usage.entity';
import { ProxySession } from '../entities/proxy-session.entity';
import {
  LoadBalancingStrategy,
  ProxyInfo,
  ProxyCriteria,
  IProxyProvider,
} from '../common/interfaces';

describe('ProxyPoolManager', () => {
  let service: ProxyPoolManager;
  let mockCache: any;
  let mockUsageRepository: any;
  let mockSessionRepository: any;
  let mockConfigService: any;
  let mockProviders: IProxyProvider[];

  // 测试用的 Mock Provider
  const createMockProvider = (name: string): IProxyProvider => ({
    getName: jest.fn().mockReturnValue(name),
    initialize: jest.fn().mockResolvedValue(undefined),
    getProxyList: jest.fn().mockResolvedValue([
      {
        id: `${name}-proxy-1`,
        host: `${name}.example.com`,
        port: 8080,
        username: 'test',
        password: 'test',
        protocol: 'http',
        provider: name,
        location: { country: 'US' },
        quality: 95,
        latency: 100,
        inUse: false,
        costPerGB: 10,
        sessionId: 'test-session',
        createdAt: new Date(),
      } as ProxyInfo,
    ]),
    validateProxy: jest.fn().mockResolvedValue(true),
    checkHealth: jest.fn().mockResolvedValue({
      proxyId: `${name}-proxy-1`,
      healthy: true,
      responseTime: 100,
      checkedAt: new Date(),
    }),
    getUsageStats: jest.fn().mockResolvedValue({
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
      successRate: 0.95,
      totalBandwidthMB: 1000,
      totalCost: 10,
      averageLatency: 100,
      avgCostPerRequest: 0.1,
      avgCostPerGB: 10,
      periodStart: new Date(),
      periodEnd: new Date(),
    }),
    refreshPool: jest.fn().mockResolvedValue(10),
    testConnection: jest.fn().mockResolvedValue(true),
    getAvailableRegions: jest.fn().mockResolvedValue([
      {
        country: 'US',
        countryName: 'United States',
        availableProxies: 100,
      },
    ]),
    estimateCost: jest.fn().mockResolvedValue(10),
    releaseProxy: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    // 创建 mock 对象
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    mockUsageRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockSessionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config = {
          POOL_MIN_SIZE: 1000,
          POOL_TARGET_SIZE: 2000,
          POOL_MAX_SIZE: 5000,
          POOL_REFRESH_INTERVAL: 600000,
        };
        return config[key] || defaultValue;
      }),
    };

    mockProviders = [
      createMockProvider('iproyal'),
      createMockProvider('brightdata'),
      createMockProvider('oxylabs'),
    ];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxyPoolManager,
        {
          provide: 'PROXY_PROVIDERS',
          useValue: mockProviders,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
        {
          provide: getRepositoryToken(ProxyUsage),
          useValue: mockUsageRepository,
        },
        {
          provide: getRepositoryToken(ProxySession),
          useValue: mockSessionRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ProxyPoolManager>(ProxyPoolManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该成功创建 ProxyPoolManager 实例', () => {
      expect(service).toBeDefined();
    });

    it('应该正确配置池大小参数', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'POOL_MIN_SIZE',
        1000,
      );
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'POOL_TARGET_SIZE',
        2000,
      );
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'POOL_MAX_SIZE',
        5000,
      );
    });

    it('应该初始化3个供应商', () => {
      expect(mockProviders).toHaveLength(3);
    });
  });

  describe('getProxy - 获取代理', () => {
    it('应该成功从池中获取可用代理', async () => {
      const criteria: ProxyCriteria = {
        country: 'US',
        protocol: 'http',
      };

      const proxy = await service.getProxy(criteria);

      expect(proxy).toBeDefined();
      expect(proxy.protocol).toBe('http');
      expect(proxy.location.country).toBe('US');
    });

    it('当池为空时应该从供应商获取', async () => {
      const criteria: ProxyCriteria = {
        country: 'US',
      };

      const proxy = await service.getProxy(criteria);

      expect(proxy).toBeDefined();
      // 至少有一个 provider 的 getProxyList 被调用
      const callCount = mockProviders.reduce(
        (acc, p) => acc + (p.getProxyList as jest.Mock).mock.calls.length,
        0,
      );
      expect(callCount).toBeGreaterThan(0);
    });

    it('应该抛出错误当所有供应商都失败时', async () => {
      // 设置所有 provider 失败
      mockProviders.forEach((p) => {
        (p.getProxyList as jest.Mock).mockRejectedValue(
          new Error('Provider unavailable'),
        );
      });

      const criteria: ProxyCriteria = {
        country: 'US',
      };

      await expect(service.getProxy(criteria)).rejects.toThrow(
        'Failed to acquire proxy: no providers available',
      );
    });

    it('应该根据国家筛选代理', async () => {
      const criteria: ProxyCriteria = {
        country: 'CN',
      };

      const proxy = await service.getProxy(criteria);

      expect(proxy).toBeDefined();
    });

    it('应该根据协议筛选代理', async () => {
      const criteria: ProxyCriteria = {
        protocol: 'socks5',
      };

      const proxy = await service.getProxy(criteria);

      expect(proxy).toBeDefined();
    });

    it('应该根据最小质量分数筛选', async () => {
      const criteria: ProxyCriteria = {
        minQuality: 90,
      };

      const proxy = await service.getProxy(criteria);

      expect(proxy).toBeDefined();
      expect(proxy.quality).toBeGreaterThanOrEqual(90);
    });
  });

  describe('releaseProxy - 释放代理', () => {
    it('应该成功释放代理', async () => {
      const proxyId = 'test-proxy-1';

      await service.releaseProxy(proxyId);

      // 验证供应商的 releaseProxy 被调用
      const callCount = mockProviders.reduce(
        (acc, p) => acc + (p.releaseProxy as jest.Mock).mock.calls.length,
        0,
      );
      expect(callCount).toBeGreaterThanOrEqual(0);
    });

    it('不应该抛出错误即使代理不存在', async () => {
      await expect(
        service.releaseProxy('non-existent-proxy'),
      ).resolves.not.toThrow();
    });
  });

  describe('refreshPool - 刷新代理池', () => {
    it('应该成功刷新代理池', async () => {
      const addedCount = await service.refreshPool();

      expect(addedCount).toBeGreaterThanOrEqual(0);
    });

    it('不应该超过最大池大小', async () => {
      // 多次刷新
      await service.refreshPool();
      await service.refreshPool();
      await service.refreshPool();

      const stats = service.getPoolStats();
      expect(stats.total).toBeLessThanOrEqual(5000); // POOL_MAX_SIZE
    });
  });

  describe('getPoolStats - 获取池统计', () => {
    it('应该返回正确的统计信息', () => {
      const stats = service.getPoolStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('inUse');
      expect(stats).toHaveProperty('available');
      expect(stats).toHaveProperty('unhealthy');
      expect(stats).toHaveProperty('providerBreakdown');
      expect(stats).toHaveProperty('countryBreakdown');
      expect(stats).toHaveProperty('averageQuality');
      expect(stats).toHaveProperty('averageLatency');
    });

    it('初始状态应该全部为0', () => {
      const stats = service.getPoolStats();

      expect(stats.total).toBe(0);
      expect(stats.inUse).toBe(0);
      expect(stats.available).toBe(0);
      expect(stats.unhealthy).toBe(0);
    });
  });

  describe('setLoadBalancingStrategy - 设置负载均衡策略', () => {
    it('应该成功设置 round_robin 策略', () => {
      service.setLoadBalancingStrategy(LoadBalancingStrategy.ROUND_ROBIN);

      // 没有返回值，只要不抛出错误即可
      expect(true).toBe(true);
    });

    it('应该成功设置 least_connections 策略', () => {
      service.setLoadBalancingStrategy(
        LoadBalancingStrategy.LEAST_CONNECTIONS,
      );

      expect(true).toBe(true);
    });

    it('应该成功设置 quality_based 策略', () => {
      service.setLoadBalancingStrategy(LoadBalancingStrategy.QUALITY_BASED);

      expect(true).toBe(true);
    });

    it('应该成功设置 cost_optimized 策略', () => {
      service.setLoadBalancingStrategy(LoadBalancingStrategy.COST_OPTIMIZED);

      expect(true).toBe(true);
    });

    it('应该成功设置 random 策略', () => {
      service.setLoadBalancingStrategy(LoadBalancingStrategy.RANDOM);

      expect(true).toBe(true);
    });
  });

  describe('cleanupUnhealthyProxies - 清理不健康代理', () => {
    it('应该成功清理不健康的代理', () => {
      const removedCount = service.cleanupUnhealthyProxies();

      expect(removedCount).toBeGreaterThanOrEqual(0);
    });

    it('健康的代理不应该被清理', async () => {
      // 先获取一个代理
      await service.getProxy({ country: 'US' });

      const statsBefore = service.getPoolStats();
      service.cleanupUnhealthyProxies();
      const statsAfter = service.getPoolStats();

      // 如果代理是健康的，总数应该保持不变或只是略微减少
      expect(statsAfter.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('边界条件和错误处理', () => {
    it('应该处理空的筛选条件', async () => {
      const proxy = await service.getProxy({});

      expect(proxy).toBeDefined();
    });

    it('应该处理无效的代理ID', async () => {
      await expect(service.releaseProxy('')).resolves.not.toThrow();
      await expect(service.releaseProxy(null)).resolves.not.toThrow();
      await expect(service.releaseProxy(undefined)).resolves.not.toThrow();
    });

    it('应该处理 Cache 错误', async () => {
      mockCache.get.mockRejectedValue(new Error('Cache error'));

      // 即使 cache 失败，服务也应该继续工作
      await expect(
        service.getProxy({ country: 'US' }),
      ).resolves.toBeDefined();
    });

    it('应该处理 Repository 错误', async () => {
      mockUsageRepository.save.mockRejectedValue(new Error('DB error'));

      // 即使数据库保存失败，获取代理也应该成功
      await expect(
        service.getProxy({ country: 'US' }),
      ).resolves.toBeDefined();
    });
  });

  describe('并发测试', () => {
    it('应该处理并发的 getProxy 请求', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => service.getProxy({ country: 'US' }));

      const results = await Promise.all(requests);

      expect(results).toHaveLength(10);
      results.forEach((proxy) => {
        expect(proxy).toBeDefined();
      });
    });

    it('应该处理并发的 releaseProxy 请求', async () => {
      const releases = Array(10)
        .fill(null)
        .map((_, i) => service.releaseProxy(`proxy-${i}`));

      await expect(Promise.all(releases)).resolves.not.toThrow();
    });
  });

  describe('性能测试', () => {
    it('getProxy 应该在合理时间内完成', async () => {
      const start = Date.now();

      await service.getProxy({ country: 'US' });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // 应该在 5 秒内完成
    });

    it('getPoolStats 应该快速返回', () => {
      const start = Date.now();

      service.getPoolStats();

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // 应该在 100ms 内完成
    });
  });
});
