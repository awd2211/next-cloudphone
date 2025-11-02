import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { OxylabsAdapter } from './oxylabs.adapter';
import {
  ProviderConfig,
  ProxyInfo,
  GetProxyOptions,
} from '../../common/interfaces';

describe('OxylabsAdapter', () => {
  let adapter: OxylabsAdapter;
  let axiosMock: MockAdapter;
  let mockConfig: ProviderConfig;

  beforeEach(() => {
    adapter = new OxylabsAdapter();
    axiosMock = new MockAdapter(axios);

    mockConfig = {
      name: 'Oxylabs',
      apiUrl: 'https://api.oxylabs.io',
      apiKey: 'test-api-key',
      username: 'testuser',
      password: 'test-password',
      timeout: 30000,
      maxRetries: 3,
      costPerGB: 12,
      enabled: true,
      priority: 1,
      extra: {
        proxyType: 'residential',
      },
    };
  });

  afterEach(() => {
    axiosMock.restore();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('应该成功创建 OxylabsAdapter 实例', () => {
      expect(adapter).toBeDefined();
      expect(adapter.getName()).toBe('Oxylabs');
    });

    it('应该默认使用住宅代理类型', () => {
      expect(adapter.getProxyType()).toBe('residential');
    });
  });

  describe('initialize - 初始化', () => {
    it('应该成功初始化适配器并设置 proxyType', async () => {
      axiosMock.onGet('https://api.oxylabs.io/v1/user').reply(200, { user: 'testuser' });

      await adapter.initialize(mockConfig);

      expect(adapter['initialized']).toBe(true);
      expect(adapter['config']).toEqual(mockConfig);
      expect(adapter.getProxyType()).toBe('residential');
    });

    it('应该使用默认 proxyType 当配置中未指定', async () => {
      const configWithoutType = {
        ...mockConfig,
        extra: undefined,
      };

      axiosMock.onGet('https://api.oxylabs.io/v1/user').reply(200);

      await adapter.initialize(configWithoutType);

      expect(adapter.getProxyType()).toBe('residential'); // 默认值
    });

    it('应该支持数据中心代理类型', async () => {
      const datacenterConfig = {
        ...mockConfig,
        extra: { proxyType: 'datacenter' },
      };

      axiosMock.onGet('https://api.oxylabs.io/v1/user').reply(200);

      await adapter.initialize(datacenterConfig);

      expect(adapter.getProxyType()).toBe('datacenter');
    });

    it('连接失败时应该记录警告但不抛出错误', async () => {
      axiosMock.onGet('https://api.oxylabs.io/v1/user').networkError();

      const loggerWarnSpy = jest.spyOn(adapter['logger'], 'warn');

      await adapter.initialize(mockConfig);

      expect(adapter['initialized']).toBe(true);
      expect(loggerWarnSpy).toHaveBeenCalled();
    });
  });

  describe('testConnection - 测试连接', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.oxylabs.io/v1/user').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该成功测试连接', async () => {
      axiosMock.onGet('https://api.oxylabs.io/v1/user').reply(200, { user: 'testuser' });

      const result = await adapter.testConnection();

      expect(result).toBe(true);
    });

    it('应该返回 false 当 API 返回非 200 状态', async () => {
      axiosMock.onGet('https://api.oxylabs.io/v1/user').reply(500);

      const result = await adapter.testConnection();

      expect(result).toBe(false);
    });

    it('应该返回 false 当网络错误', async () => {
      axiosMock.onGet('https://api.oxylabs.io/v1/user').networkError();

      const result = await adapter.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getProxyList - 获取代理列表', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.oxylabs.io/v1/user').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    describe('住宅代理模式', () => {
      it('应该使用住宅代理主机和端口', async () => {
        const proxies = await adapter.getProxyList({ limit: 1 });

        expect(proxies[0].host).toBe('pr.oxylabs.io');
        expect(proxies[0].port).toBe(7777);
      });

      it('应该支持城市参数', async () => {
        const options: GetProxyOptions = {
          city: 'New York',
          limit: 1,
        };

        const proxies = await adapter.getProxyList(options);

        expect(proxies[0].username).toContain('-city-new_york');
      });
    });

    describe('数据中心代理模式', () => {
      beforeEach(() => {
        adapter.switchProxyType('datacenter');
      });

      it('应该使用数据中心代理主机和端口', async () => {
        const proxies = await adapter.getProxyList({ limit: 1 });

        expect(proxies[0].host).toBe('dc.oxylabs.io');
        expect(proxies[0].port).toBe(8001);
      });

      it('不应该添加城市参数', async () => {
        const options: GetProxyOptions = {
          city: 'New York',
          limit: 1,
        };

        const proxies = await adapter.getProxyList(options);

        // 数据中心代理不支持城市参数
        expect(proxies[0].username).not.toContain('-city-');
      });
    });

    it('应该生成正确数量的代理配置', async () => {
      const proxies = await adapter.getProxyList({ limit: 10 });

      expect(proxies).toHaveLength(10);
    });

    it('应该为每个代理生成唯一的会话ID', async () => {
      const proxies = await adapter.getProxyList({ limit: 5 });

      const sessionIds = proxies.map(p => p.sessionId);
      const uniqueSessionIds = new Set(sessionIds);

      expect(uniqueSessionIds.size).toBe(5);
    });

    it('应该在用户名中使用 customer 前缀', async () => {
      const proxies = await adapter.getProxyList({ limit: 1 });

      expect(proxies[0].username).toContain('customer-testuser');
    });

    it('应该在用户名中添加国家参数', async () => {
      const options: GetProxyOptions = {
        country: 'US',
        limit: 1,
      };

      const proxies = await adapter.getProxyList(options);

      expect(proxies[0].username).toContain('-cc-us');
    });

    it('应该支持粘性会话', async () => {
      const options: GetProxyOptions = {
        session: 'sticky',
        limit: 1,
      };

      const proxies = await adapter.getProxyList(options);

      // 应该包含会话时间参数
      expect(proxies[0].username).toContain('-sesstime-10');
    });

    it('应该缓存生成的代理', async () => {
      const proxies = await adapter.getProxyList({ limit: 3 });

      const cached1 = adapter.getCachedProxy(proxies[0].id);
      const cached2 = adapter.getCachedProxy(proxies[1].id);
      const cached3 = adapter.getCachedProxy(proxies[2].id);

      expect(cached1).toBeDefined();
      expect(cached2).toBeDefined();
      expect(cached3).toBeDefined();
    });

    it('应该使用默认 limit 值', async () => {
      const proxies = await adapter.getProxyList();

      expect(proxies).toHaveLength(100);
    });

    it('应该正确设置代理质量', async () => {
      const proxies = await adapter.getProxyList({ limit: 1 });

      expect(proxies[0].quality).toBe(92); // Oxylabs 高质量
    });

    it('应该在 metadata 中包含 proxyType 信息', async () => {
      const proxies = await adapter.getProxyList({ limit: 1 });

      expect(proxies[0].metadata?.proxyType).toBe('residential');
      expect(proxies[0].metadata?.gateway).toBe(true);
    });
  });

  describe('refreshPool - 刷新代理池', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.oxylabs.io/v1/user').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
      adapter.clearCache();
    });

    it('应该成功刷新代理池', async () => {
      const added = await adapter.refreshPool(10);

      expect(added).toBe(10);
    });

    it('当池大小满足要求时不应该刷新', async () => {
      await adapter.getProxyList({ limit: 50 });

      const added = await adapter.refreshPool(30);

      expect(added).toBe(0);
    });

    it('应该只生成需要的数量', async () => {
      await adapter.getProxyList({ limit: 50 });

      const added = await adapter.refreshPool(80);

      expect(added).toBe(30);
    });

    it('应该抛出错误当刷新失败', async () => {
      const spy = jest.spyOn(adapter, 'getProxyList').mockRejectedValue(new Error('Test error'));

      await expect(adapter.refreshPool(10)).rejects.toThrow('Test error');

      spy.mockRestore();
    });
  });

  describe('getUsageStats - 获取使用统计', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.oxylabs.io/v1/user').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该成功获取使用统计', async () => {
      const mockStatsResponse = {
        traffic: 6442450944, // 6GB in bytes
        queries: 1000,
        successful: 950,
        avg_response_time: 150,
      };

      axiosMock
        .onGet('https://api.oxylabs.io/v1/traffic')
        .reply(200, mockStatsResponse);

      const stats = await adapter.getUsageStats();

      expect(stats.totalRequests).toBe(1000);
      expect(stats.successfulRequests).toBe(950);
      expect(stats.failedRequests).toBe(50);
      expect(stats.successRate).toBe(0.95);
      expect(stats.totalBandwidthMB).toBeCloseTo(6144, 0); // 6GB = 6144MB
      expect(stats.totalCost).toBeCloseTo(72, 0); // 6GB * $12/GB
      expect(stats.averageLatency).toBe(150);
      expect(stats.avgCostPerGB).toBe(12);
    });

    it('应该正确格式化日期参数', async () => {
      let capturedParams: any;

      axiosMock
        .onGet('https://api.oxylabs.io/v1/traffic')
        .reply((config) => {
          capturedParams = config.params;
          return [200, {}];
        });

      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');

      await adapter.getUsageStats(startDate, endDate);

      expect(capturedParams.date_from).toBe('2024-01-01');
      expect(capturedParams.date_to).toBe('2024-01-31');
    });

    it('应该返回空统计当 API 失败', async () => {
      axiosMock
        .onGet('https://api.oxylabs.io/v1/traffic')
        .networkError();

      const stats = await adapter.getUsageStats();

      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('应该处理部分缺失的字段', async () => {
      const partialResponse = {
        queries: 500,
        // 其他字段缺失
      };

      axiosMock
        .onGet('https://api.oxylabs.io/v1/traffic')
        .reply(200, partialResponse);

      const stats = await adapter.getUsageStats();

      expect(stats.totalRequests).toBe(500);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.totalBandwidthMB).toBe(0);
    });

    it('应该正确计算成功率', async () => {
      const response = {
        queries: 100,
        successful: 85,
      };

      axiosMock
        .onGet('https://api.oxylabs.io/v1/traffic')
        .reply(200, response);

      const stats = await adapter.getUsageStats();

      expect(stats.successRate).toBe(0.85);
    });

    it('应该处理零请求的情况', async () => {
      const response = {
        queries: 0,
        successful: 0,
      };

      axiosMock
        .onGet('https://api.oxylabs.io/v1/traffic')
        .reply(200, response);

      const stats = await adapter.getUsageStats();

      expect(stats.successRate).toBe(0);
      expect(stats.avgCostPerRequest).toBe(0);
    });
  });

  describe('getAvailableRegions - 获取可用地区', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.oxylabs.io/v1/user').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该成功获取地区列表（数组格式）', async () => {
      const mockRegionsResponse = [
        {
          code: 'US',
          name: 'United States',
          cities: ['New York', 'Los Angeles'],
          ip_count: 15000000,
        },
        {
          code: 'GB',
          name: 'United Kingdom',
          cities: ['London', 'Manchester'],
          ip_count: 8000000,
        },
      ];

      axiosMock
        .onGet('https://api.oxylabs.io/v1/locations')
        .reply(200, mockRegionsResponse);

      const regions = await adapter.getAvailableRegions();

      expect(regions).toHaveLength(2);

      const usRegion = regions[0];
      expect(usRegion.country).toBe('US');
      expect(usRegion.countryName).toBe('United States');
      expect(usRegion.cities).toContain('New York');
      expect(usRegion.availableProxies).toBe(15000000);
      expect(usRegion.costPerGB).toBe(12);
    });

    it('应该成功获取地区列表（countries 字段格式）', async () => {
      const mockRegionsResponse = {
        countries: [
          {
            code: 'US',
            name: 'United States',
            ip_count: 10000000,
          },
        ],
      };

      axiosMock
        .onGet('https://api.oxylabs.io/v1/locations')
        .reply(200, mockRegionsResponse);

      const regions = await adapter.getAvailableRegions();

      expect(regions).toHaveLength(1);
      expect(regions[0].country).toBe('US');
    });

    it('应该处理没有额外信息的国家', async () => {
      const mockRegionsResponse = [
        {
          code: 'US',
          name: 'United States',
        },
      ];

      axiosMock
        .onGet('https://api.oxylabs.io/v1/locations')
        .reply(200, mockRegionsResponse);

      const regions = await adapter.getAvailableRegions();

      expect(regions).toHaveLength(1);
      expect(regions[0].cities).toEqual([]);
      expect(regions[0].availableProxies).toBe(0);
    });

    it('应该返回默认地区列表当 API 失败', async () => {
      axiosMock
        .onGet('https://api.oxylabs.io/v1/locations')
        .networkError();

      const regions = await adapter.getAvailableRegions();

      // 应该返回 20 个默认国家（Oxylabs 有最多默认国家）
      expect(regions).toHaveLength(20);
      expect(regions.some((r) => r.country === 'US')).toBe(true);
      expect(regions.some((r) => r.country === 'GB')).toBe(true);
      expect(regions.some((r) => r.country === 'SE')).toBe(true);
      expect(regions.some((r) => r.country === 'CH')).toBe(true);
    });

    it('应该返回空数组当响应不是预期格式', async () => {
      axiosMock
        .onGet('https://api.oxylabs.io/v1/locations')
        .reply(200, { some_other_field: 'value' });

      const regions = await adapter.getAvailableRegions();

      // 当响应数据不是数组且没有 countries 字段时，返回空数组
      expect(regions).toHaveLength(0);
    });
  });

  describe('switchProxyType - 切换代理类型', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.oxylabs.io/v1/user').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该成功切换到数据中心代理', () => {
      expect(adapter.getProxyType()).toBe('residential');

      adapter.switchProxyType('datacenter');

      expect(adapter.getProxyType()).toBe('datacenter');
    });

    it('应该成功切换到住宅代理', () => {
      adapter.switchProxyType('datacenter');
      expect(adapter.getProxyType()).toBe('datacenter');

      adapter.switchProxyType('residential');

      expect(adapter.getProxyType()).toBe('residential');
    });

    it('切换代理类型时应该清除缓存', async () => {
      // 添加一些代理到缓存
      const proxies = await adapter.getProxyList({ limit: 3 });
      const proxyId = proxies[0].id;

      // 验证缓存存在
      expect(adapter.getCachedProxy(proxyId)).toBeDefined();

      // 切换代理类型
      adapter.switchProxyType('datacenter');

      // 缓存应该被清除
      expect(adapter.getCachedProxy(proxyId)).toBeUndefined();
    });

    it('切换后生成的代理应该使用新类型的配置', async () => {
      // 初始是住宅代理
      let proxies = await adapter.getProxyList({ limit: 1 });
      expect(proxies[0].host).toBe('pr.oxylabs.io');
      expect(proxies[0].port).toBe(7777);

      // 切换到数据中心
      adapter.switchProxyType('datacenter');
      proxies = await adapter.getProxyList({ limit: 1 });
      expect(proxies[0].host).toBe('dc.oxylabs.io');
      expect(proxies[0].port).toBe(8001);
    });
  });

  describe('getProxyType - 获取代理类型', () => {
    it('应该返回当前代理类型', () => {
      expect(adapter.getProxyType()).toBe('residential');

      adapter.switchProxyType('datacenter');
      expect(adapter.getProxyType()).toBe('datacenter');
    });
  });

  describe('getCachedProxy - 获取缓存代理', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.oxylabs.io/v1/user').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
      adapter.clearCache();
    });

    it('应该返回缓存的代理', async () => {
      const proxies = await adapter.getProxyList({ limit: 1 });
      const proxyId = proxies[0].id;

      const cached = adapter.getCachedProxy(proxyId);

      expect(cached).toBeDefined();
      expect(cached?.host).toBe('pr.oxylabs.io');
      expect(cached?.port).toBe(7777);
    });

    it('应该返回 undefined 当代理不在缓存中', () => {
      const cached = adapter.getCachedProxy('non-existent-id');

      expect(cached).toBeUndefined();
    });
  });

  describe('clearCache - 清除缓存', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.oxylabs.io/v1/user').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该成功清除缓存', async () => {
      const proxies = await adapter.getProxyList({ limit: 3 });
      const proxyIds = proxies.map(p => p.id);

      // 验证缓存存在
      expect(adapter.getCachedProxy(proxyIds[0])).toBeDefined();

      // 清除缓存
      adapter.clearCache();

      // 验证缓存已清空
      expect(adapter.getCachedProxy(proxyIds[0])).toBeUndefined();
      expect(adapter.getCachedProxy(proxyIds[1])).toBeUndefined();
      expect(adapter.getCachedProxy(proxyIds[2])).toBeUndefined();
    });
  });

  describe('generateSessionId - 生成会话ID (间接测试)', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.oxylabs.io/v1/user').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该生成唯一的会话ID', async () => {
      const proxies = await adapter.getProxyList({ limit: 100 });

      const sessionIds = proxies.map(p => p.sessionId);
      const uniqueIds = new Set(sessionIds);

      expect(uniqueIds.size).toBe(100);
    });

    it('会话ID应该包含时间戳和随机字符串', async () => {
      const proxies = await adapter.getProxyList({ limit: 1 });
      const sessionId = proxies[0].sessionId!;

      // 格式: timestamp-random
      expect(sessionId).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('createProxyInfo - 创建代理信息 (间接测试)', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.oxylabs.io/v1/user').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该正确创建代理信息对象', async () => {
      const options: GetProxyOptions = {
        country: 'US',
        city: 'New York',
        protocol: 'https',
        limit: 1,
      };

      const proxies = await adapter.getProxyList(options);
      const proxy = proxies[0];

      expect(proxy.id).toContain('oxylabs-');
      expect(proxy.host).toBe('pr.oxylabs.io');
      expect(proxy.port).toBe(7777);
      expect(proxy.protocol).toBe('https');
      expect(proxy.provider).toBe('oxylabs');
      expect(proxy.location.country).toBe('US');
      expect(proxy.location.city).toBe('New York');
      expect(proxy.quality).toBe(92);
      expect(proxy.inUse).toBe(false);
      expect(proxy.failureCount).toBe(0);
      expect(proxy.costPerGB).toBe(12);
      expect(proxy.sessionId).toBeDefined();
      expect(proxy.createdAt).toBeInstanceOf(Date);
    });

    it('应该使用默认值处理缺失的选项', async () => {
      const proxies = await adapter.getProxyList({ limit: 1 });
      const proxy = proxies[0];

      expect(proxy.protocol).toBe('http'); // 默认
      expect(proxy.location.country).toBe('US'); // 默认
      expect(proxy.location.city).toBeUndefined();
    });
  });

  describe('ensureInitialized - 确保初始化 (间接测试)', () => {
    it('未初始化时调用方法应该抛出错误', async () => {
      const uninitializedAdapter = new OxylabsAdapter();

      await expect(uninitializedAdapter.getProxyList()).rejects.toThrow(
        'Oxylabs adapter not initialized',
      );
    });
  });

  describe('性能测试', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.oxylabs.io/v1/user').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('getProxyList 应该快速生成代理配置', async () => {
      const start = Date.now();
      await adapter.getProxyList({ limit: 100 });
      const duration = Date.now() - start;

      // 本地生成应该非常快
      expect(duration).toBeLessThan(1000);
    });

    it('getCachedProxy 应该快速返回', () => {
      const start = Date.now();
      adapter.getCachedProxy('test-id');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('switchProxyType 应该快速切换', () => {
      const start = Date.now();
      adapter.switchProxyType('datacenter');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10);
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.oxylabs.io/v1/user').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该处理超时错误', async () => {
      axiosMock
        .onGet('https://api.oxylabs.io/v1/traffic')
        .timeout();

      // getUsageStats 应该返回空统计而不是抛出错误
      const stats = await adapter.getUsageStats();

      expect(stats.totalRequests).toBe(0);
    });

    it('应该处理无效的响应状态', async () => {
      axiosMock
        .onGet('https://api.oxylabs.io/v1/traffic')
        .reply(500);

      const stats = await adapter.getUsageStats();

      expect(stats.totalRequests).toBe(0);
    });
  });
});
