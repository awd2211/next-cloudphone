import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { ProxyPoolManager } from '../../pool/pool-manager.service';
import {
  ProxyInfo,
  PoolStats,
  LoadBalancingStrategy,
} from '../../common/interfaces';
import {
  AcquireProxyDto,
  ReportSuccessDto,
  ReportFailureDto,
} from '../dto';

describe('ProxyService', () => {
  let service: ProxyService;
  let mockPoolManager: jest.Mocked<ProxyPoolManager>;
  let mockConfigService: jest.Mocked<ConfigService>;

  // 测试用的 Mock 数据
  const mockProxyInfo: ProxyInfo = {
    id: 'test-proxy-1',
    host: 'proxy.example.com',
    port: 8080,
    username: 'testuser',
    password: 'testpass',
    protocol: 'http',
    provider: 'testprovider',
    location: {
      country: 'US',
      city: 'New York',
    },
    quality: 95,
    latency: 100,
    inUse: false,
    costPerGB: 10,
    sessionId: 'session-123',
    createdAt: new Date(),
  };

  const mockPoolStats: PoolStats = {
    total: 2000,
    inUse: 500,
    available: 1500,
    unhealthy: 0,
    providerBreakdown: {
      testprovider: 2000,
    },
    countryBreakdown: {
      US: 2000,
    },
    averageQuality: 95,
    averageLatency: 100,
    lastRefresh: new Date(),
  };

  beforeEach(async () => {
    // 创建 mock 对象
    mockPoolManager = {
      getProxy: jest.fn().mockResolvedValue(mockProxyInfo),
      releaseProxy: jest.fn().mockResolvedValue(undefined),
      reportProxySuccess: jest.fn().mockResolvedValue(undefined),
      markProxyFailed: jest.fn().mockResolvedValue(undefined),
      getPoolStats: jest.fn().mockReturnValue(mockPoolStats),
      setLoadBalancingStrategy: jest.fn(),
      refreshPool: jest.fn().mockResolvedValue(100),
      cleanupUnhealthyProxies: jest.fn().mockReturnValue(10),
    } as any;

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config = {
          POOL_MIN_SIZE: 1000,
          POOL_TARGET_SIZE: 2000,
          POOL_MAX_SIZE: 5000,
        };
        return config[key] || defaultValue;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxyService,
        {
          provide: ProxyPoolManager,
          useValue: mockPoolManager,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ProxyService>(ProxyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该成功创建 ProxyService 实例', () => {
      expect(service).toBeDefined();
    });
  });

  describe('acquireProxy - 获取代理', () => {
    it('应该成功获取代理', async () => {
      const dto: AcquireProxyDto = {
        country: 'US',
        protocol: 'http',
      };

      const result = await service.acquireProxy(dto);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe('test-proxy-1');
      expect(result.data.host).toBe('proxy.example.com');
      expect(mockPoolManager.getProxy).toHaveBeenCalledWith(
        expect.objectContaining({
          country: 'US',
          protocol: 'http',
        }),
      );
    });

    it('应该将获取的代理添加到活跃列表', async () => {
      const dto: AcquireProxyDto = {
        country: 'US',
      };

      await service.acquireProxy(dto);

      expect(service.getActiveProxiesCount()).toBe(1);
    });

    it('应该处理获取代理失败的情况', async () => {
      mockPoolManager.getProxy.mockRejectedValueOnce(
        new Error('No available proxy'),
      );

      const dto: AcquireProxyDto = {
        country: 'US',
      };

      const result = await service.acquireProxy(dto);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No available proxy');
    });

    it('应该正确转换 DTO 参数', async () => {
      const dto: AcquireProxyDto = {
        country: 'CN',
        city: 'Beijing',
        state: 'Beijing',
        protocol: 'socks5',
        minQuality: 90,
        maxLatency: 200,
        sessionSticky: true,
        provider: 'brightdata',
        maxCostPerGB: 15,
      };

      await service.acquireProxy(dto);

      expect(mockPoolManager.getProxy).toHaveBeenCalledWith({
        country: 'CN',
        city: 'Beijing',
        state: 'Beijing',
        protocol: 'socks5',
        minQuality: 90,
        maxLatency: 200,
        sessionSticky: true,
        provider: 'brightdata',
        maxCostPerGB: 15,
      });
    });
  });

  describe('releaseProxy - 释放代理', () => {
    it('应该成功释放代理', async () => {
      // 先获取一个代理
      await service.acquireProxy({ country: 'US' });

      const result = await service.releaseProxy('test-proxy-1');

      expect(result.success).toBe(true);
      expect(result.data.released).toBe(true);
      expect(mockPoolManager.releaseProxy).toHaveBeenCalledWith('test-proxy-1');
    });

    it('应该从活跃列表移除代理', async () => {
      // 先获取一个代理
      await service.acquireProxy({ country: 'US' });
      expect(service.getActiveProxiesCount()).toBe(1);

      await service.releaseProxy('test-proxy-1');

      expect(service.getActiveProxiesCount()).toBe(0);
    });

    it('应该处理释放不存在的代理', async () => {
      mockPoolManager.releaseProxy.mockRejectedValueOnce(
        new Error('Proxy not found'),
      );

      const result = await service.releaseProxy('non-existent-proxy');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Proxy not found');
    });
  });

  describe('reportSuccess - 报告成功', () => {
    it('应该成功报告代理使用成功', async () => {
      const dto: ReportSuccessDto = {
        bandwidthMB: 100,
      };

      const result = await service.reportSuccess('test-proxy-1', dto);

      expect(result.success).toBe(true);
      expect(result.data.recorded).toBe(true);
      expect(mockPoolManager.reportProxySuccess).toHaveBeenCalledWith(
        'test-proxy-1',
        100,
      );
    });

    it('应该处理报告失败的情况', async () => {
      mockPoolManager.reportProxySuccess.mockRejectedValueOnce(
        new Error('Report failed'),
      );

      const dto: ReportSuccessDto = {
        bandwidthMB: 100,
      };

      const result = await service.reportSuccess('test-proxy-1', dto);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Report failed');
    });
  });

  describe('reportFailure - 报告失败', () => {
    it('应该成功报告代理使用失败', async () => {
      // 先获取一个代理
      await service.acquireProxy({ country: 'US' });

      const dto: ReportFailureDto = {
        message: 'Connection timeout',
        code: 'TIMEOUT',
        bandwidthMB: 10,
      };

      const result = await service.reportFailure('test-proxy-1', dto);

      expect(result.success).toBe(true);
      expect(result.data.recorded).toBe(true);
      expect(mockPoolManager.markProxyFailed).toHaveBeenCalledWith(
        'test-proxy-1',
        expect.any(Error),
        10,
      );
    });

    it('应该从活跃列表移除失败的代理', async () => {
      // 先获取一个代理
      await service.acquireProxy({ country: 'US' });
      expect(service.getActiveProxiesCount()).toBe(1);

      const dto: ReportFailureDto = {
        message: 'Proxy failed',
      };

      await service.reportFailure('test-proxy-1', dto);

      expect(service.getActiveProxiesCount()).toBe(0);
    });

    it('应该正确设置错误代码', async () => {
      const dto: ReportFailureDto = {
        message: 'Connection refused',
        code: 'ECONNREFUSED',
      };

      await service.reportFailure('test-proxy-1', dto);

      const errorArg = mockPoolManager.markProxyFailed.mock.calls[0][1];
      expect((errorArg as any).code).toBe('ECONNREFUSED');
    });
  });

  describe('getPoolStats - 获取池统计', () => {
    it('应该成功获取池统计信息', async () => {
      const result = await service.getPoolStats();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.total).toBe(2000);
      expect(result.data.inUse).toBe(500);
      expect(result.data.available).toBe(1500);
      expect(mockPoolManager.getPoolStats).toHaveBeenCalled();
    });

    it('应该处理获取统计失败的情况', async () => {
      mockPoolManager.getPoolStats.mockImplementationOnce(() => {
        throw new Error('Stats unavailable');
      });

      const result = await service.getPoolStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stats unavailable');
    });
  });

  describe('healthCheck - 健康检查', () => {
    it('状态应该为 ok 当代理池充足', async () => {
      mockPoolManager.getPoolStats.mockReturnValue({
        ...mockPoolStats,
        total: 1500,
        available: 1000,
      });

      const result = await service.healthCheck();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('proxy-service');
      expect(result.version).toBe('1.0.0');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('状态应该为 degraded 当可用代理少于最小要求的50%', async () => {
      mockPoolManager.getPoolStats.mockReturnValue({
        ...mockPoolStats,
        available: 400, // 少于 1000 * 0.5
      });

      const result = await service.healthCheck();

      expect(result.status).toBe('degraded');
    });

    it('状态应该为 down 当没有可用代理', async () => {
      mockPoolManager.getPoolStats.mockReturnValue({
        ...mockPoolStats,
        available: 0,
      });

      const result = await service.healthCheck();

      expect(result.status).toBe('down');
    });

    it('应该返回正确的池详情', async () => {
      const result = await service.healthCheck();

      expect(result.details.pool).toBeDefined();
      expect(result.details.pool.currentSize).toBe(2000);
      expect(result.details.pool.targetSize).toBe(2000);
      expect(result.details.pool.sizeOk).toBe(true);
    });

    it('应该计算健康比率', async () => {
      mockPoolManager.getPoolStats.mockReturnValue({
        ...mockPoolStats,
        total: 1000,
        unhealthy: 100,
      });

      const result = await service.healthCheck();

      expect(result.details.pool.healthyRatio).toBe(0.9); // (1000 - 100) / 1000
    });
  });

  describe('setLoadBalancingStrategy - 设置负载均衡策略', () => {
    it('应该成功设置 round_robin 策略', async () => {
      const result = await service.setLoadBalancingStrategy(
        LoadBalancingStrategy.ROUND_ROBIN,
      );

      expect(result.success).toBe(true);
      expect(result.data.strategy).toBe('round_robin');
      expect(mockPoolManager.setLoadBalancingStrategy).toHaveBeenCalledWith(
        LoadBalancingStrategy.ROUND_ROBIN,
      );
    });

    it('应该处理设置策略失败的情况', async () => {
      mockPoolManager.setLoadBalancingStrategy.mockImplementationOnce(() => {
        throw new Error('Invalid strategy');
      });

      const result = await service.setLoadBalancingStrategy(
        LoadBalancingStrategy.QUALITY_BASED,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid strategy');
    });
  });

  describe('forceRefreshPool - 强制刷新池', () => {
    it('应该成功强制刷新代理池', async () => {
      const result = await service.forceRefreshPool();

      expect(result.success).toBe(true);
      expect(result.data.added).toBe(100);
      expect(mockPoolManager.refreshPool).toHaveBeenCalled();
    });

    it('应该处理刷新失败的情况', async () => {
      mockPoolManager.refreshPool.mockRejectedValueOnce(
        new Error('Refresh failed'),
      );

      const result = await service.forceRefreshPool();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Refresh failed');
    });
  });

  describe('getProxyById - 获取代理详情', () => {
    it('应该成功获取活跃代理详情', async () => {
      // 先获取一个代理
      await service.acquireProxy({ country: 'US' });

      const result = await service.getProxyById('test-proxy-1');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('test-proxy-1');
    });

    it('应该抛出 NotFoundException 当代理不存在', async () => {
      const result = await service.getProxyById('non-existent-proxy');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Proxy not found');
    });
  });

  describe('getActiveProxiesCount - 获取活跃代理数量', () => {
    it('初始状态应该为 0', () => {
      expect(service.getActiveProxiesCount()).toBe(0);
    });

    it('获取代理后应该增加计数', async () => {
      await service.acquireProxy({ country: 'US' });

      expect(service.getActiveProxiesCount()).toBe(1);
    });

    it('释放代理后应该减少计数', async () => {
      await service.acquireProxy({ country: 'US' });
      await service.releaseProxy('test-proxy-1');

      expect(service.getActiveProxiesCount()).toBe(0);
    });

    it('报告失败后应该减少计数', async () => {
      await service.acquireProxy({ country: 'US' });
      await service.reportFailure('test-proxy-1', { message: 'Failed' });

      expect(service.getActiveProxiesCount()).toBe(0);
    });
  });

  describe('定时任务 - schedulePoolRefresh', () => {
    it('应该成功执行定时刷新', async () => {
      await service.schedulePoolRefresh();

      expect(mockPoolManager.refreshPool).toHaveBeenCalled();
    });

    it('应该捕获并记录刷新错误', async () => {
      mockPoolManager.refreshPool.mockRejectedValueOnce(
        new Error('Refresh error'),
      );

      // 不应该抛出错误
      await expect(service.schedulePoolRefresh()).resolves.not.toThrow();
    });
  });

  describe('定时任务 - scheduleCleanup', () => {
    it('应该成功执行定时清理', async () => {
      await service.scheduleCleanup();

      expect(mockPoolManager.cleanupUnhealthyProxies).toHaveBeenCalled();
    });

    it('清理后如果池大小不足应该触发刷新', async () => {
      mockPoolManager.getPoolStats.mockReturnValue({
        ...mockPoolStats,
        total: 500, // 少于 POOL_MIN_SIZE (1000)
      });

      await service.scheduleCleanup();

      expect(mockPoolManager.refreshPool).toHaveBeenCalled();
    });

    it('清理后如果池大小充足不应该触发刷新', async () => {
      mockPoolManager.getPoolStats.mockReturnValue({
        ...mockPoolStats,
        total: 1500, // 大于 POOL_MIN_SIZE (1000)
      });

      await service.scheduleCleanup();

      expect(mockPoolManager.refreshPool).not.toHaveBeenCalled();
    });

    it('应该捕获并记录清理错误', async () => {
      mockPoolManager.cleanupUnhealthyProxies.mockImplementationOnce(() => {
        throw new Error('Cleanup error');
      });

      await expect(service.scheduleCleanup()).resolves.not.toThrow();
    });
  });

  describe('定时任务 - scheduleActiveProxiesCleanup', () => {
    it('应该清理超过1小时的活跃代理', async () => {
      // 添加一个旧的代理
      const oldProxy = {
        ...mockProxyInfo,
        id: 'old-proxy',
        createdAt: new Date(Date.now() - 3700000), // 超过1小时
      };

      mockPoolManager.getProxy.mockResolvedValueOnce(oldProxy);
      await service.acquireProxy({ country: 'US' });

      expect(service.getActiveProxiesCount()).toBe(1);

      await service.scheduleActiveProxiesCleanup();

      expect(service.getActiveProxiesCount()).toBe(0);
    });

    it('不应该清理新的活跃代理', async () => {
      await service.acquireProxy({ country: 'US' });

      expect(service.getActiveProxiesCount()).toBe(1);

      await service.scheduleActiveProxiesCleanup();

      expect(service.getActiveProxiesCount()).toBe(1);
    });

    it('应该捕获并记录清理错误', async () => {
      // 不应该抛出错误
      await expect(
        service.scheduleActiveProxiesCleanup(),
      ).resolves.not.toThrow();
    });
  });

  describe('并发测试', () => {
    it('应该处理并发的 acquireProxy 请求', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => service.acquireProxy({ country: 'US' }));

      const results = await Promise.all(requests);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it('应该处理并发的 releaseProxy 请求', async () => {
      // 先获取多个代理
      for (let i = 0; i < 5; i++) {
        mockPoolManager.getProxy.mockResolvedValueOnce({
          ...mockProxyInfo,
          id: `proxy-${i}`,
        });
        await service.acquireProxy({ country: 'US' });
      }

      const releases = Array(5)
        .fill(null)
        .map((_, i) => service.releaseProxy(`proxy-${i}`));

      const results = await Promise.all(releases);

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('性能测试', () => {
    it('acquireProxy 应该在合理时间内完成', async () => {
      const start = Date.now();

      await service.acquireProxy({ country: 'US' });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // 应该在 1 秒内完成
    });

    it('getPoolStats 应该快速返回', async () => {
      const start = Date.now();

      await service.getPoolStats();

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // 应该在 100ms 内完成
    });

    it('healthCheck 应该快速返回', async () => {
      const start = Date.now();

      await service.healthCheck();

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // 应该在 100ms 内完成
    });
  });
});
