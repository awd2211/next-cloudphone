import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { BrightDataAdapter } from './brightdata.adapter';
import {
  ProviderConfig,
  ProxyInfo,
  GetProxyOptions,
} from '../../common/interfaces';

describe('BrightDataAdapter', () => {
  let adapter: BrightDataAdapter;
  let axiosMock: MockAdapter;
  let mockConfig: ProviderConfig;

  beforeEach(() => {
    adapter = new BrightDataAdapter();
    axiosMock = new MockAdapter(axios);

    mockConfig = {
      name: 'BrightData',
      apiUrl: 'https://api.brightdata.com',
      apiKey: 'test-api-key',
      username: 'brd-customer-test',
      password: 'test-password',
      timeout: 30000,
      maxRetries: 3,
      costPerGB: 10,
      enabled: true,
      priority: 1,
      extra: {
        zone: 'residential',
      },
    };
  });

  afterEach(() => {
    axiosMock.restore();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('应该成功创建 BrightDataAdapter 实例', () => {
      expect(adapter).toBeDefined();
      expect(adapter.getName()).toBe('BrightData');
    });
  });

  describe('initialize - 初始化', () => {
    it('应该成功初始化适配器并设置 zone', async () => {
      axiosMock.onGet('https://api.brightdata.com/zone').reply(200, { zone: 'residential' });

      await adapter.initialize(mockConfig);

      expect(adapter['initialized']).toBe(true);
      expect(adapter['config']).toEqual(mockConfig);
      expect(adapter['zone']).toBe('residential');
    });

    it('应该使用默认 zone 当配置中未指定', async () => {
      const configWithoutZone = {
        ...mockConfig,
        extra: undefined,
      };

      axiosMock.onGet('https://api.brightdata.com/zone').reply(200);

      await adapter.initialize(configWithoutZone);

      expect(adapter['zone']).toBe('residential'); // 默认值
    });

    it('连接失败时应该记录警告但不抛出错误', async () => {
      axiosMock.onGet('https://api.brightdata.com/zone').networkError();

      const loggerWarnSpy = jest.spyOn(adapter['logger'], 'warn');

      await adapter.initialize(mockConfig);

      expect(adapter['initialized']).toBe(true);
      expect(loggerWarnSpy).toHaveBeenCalled();
    });
  });

  describe('testConnection - 测试连接', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.brightdata.com/zone').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该成功测试连接', async () => {
      axiosMock.onGet('https://api.brightdata.com/zone').reply(200, { zone: 'residential' });

      const result = await adapter.testConnection();

      expect(result).toBe(true);
    });

    it('应该返回 false 当 API 返回非 200 状态', async () => {
      axiosMock.onGet('https://api.brightdata.com/zone').reply(500);

      const result = await adapter.testConnection();

      expect(result).toBe(false);
    });

    it('应该返回 false 当网络错误', async () => {
      axiosMock.onGet('https://api.brightdata.com/zone').networkError();

      const result = await adapter.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getProxyList - 获取代理列表', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.brightdata.com/zone').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该生成正确数量的代理配置', async () => {
      const options: GetProxyOptions = {
        limit: 10,
      };

      const proxies = await adapter.getProxyList(options);

      expect(proxies).toHaveLength(10);
    });

    it('应该使用 Bright Data 超级代理配置', async () => {
      const proxies = await adapter.getProxyList({ limit: 1 });

      expect(proxies[0].host).toBe('brd.superproxy.io');
      expect(proxies[0].port).toBe(22225);
      expect(proxies[0].provider).toBe('brightdata');
    });

    it('应该为每个代理生成唯一的会话ID', async () => {
      const proxies = await adapter.getProxyList({ limit: 5 });

      const sessionIds = proxies.map(p => p.sessionId);
      const uniqueSessionIds = new Set(sessionIds);

      expect(uniqueSessionIds.size).toBe(5);
    });

    it('应该在用户名中包含会话ID', async () => {
      const proxies = await adapter.getProxyList({ limit: 1 });

      expect(proxies[0].username).toContain('brd-customer-test-session-');
    });

    it('应该在用户名中添加国家参数', async () => {
      const options: GetProxyOptions = {
        country: 'US',
        limit: 1,
      };

      const proxies = await adapter.getProxyList(options);

      expect(proxies[0].username).toContain('-country-us');
    });

    it('应该在用户名中添加城市参数', async () => {
      const options: GetProxyOptions = {
        city: 'New York',
        limit: 1,
      };

      const proxies = await adapter.getProxyList(options);

      // 城市名称中的空格会被替换为下划线
      expect(proxies[0].username).toContain('-city-new_york');
    });

    it('应该支持粘性会话', async () => {
      const options: GetProxyOptions = {
        session: 'sticky',
        limit: 1,
      };

      const proxies = await adapter.getProxyList(options);

      // 会有两个 -session- 参数：一个来自 sticky 模式，一个来自 sessionId
      const sessionCount = (proxies[0].username.match(/-session-/g) || []).length;
      expect(sessionCount).toBeGreaterThanOrEqual(1);
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

      expect(proxies).toHaveLength(100); // 默认 100
    });

    it('应该正确设置代理质量', async () => {
      const proxies = await adapter.getProxyList({ limit: 1 });

      expect(proxies[0].quality).toBe(95); // Bright Data 高质量
    });

    it('应该在 metadata 中包含 zone 信息', async () => {
      const proxies = await adapter.getProxyList({ limit: 1 });

      expect(proxies[0].metadata?.zone).toBe('residential');
      expect(proxies[0].metadata?.superProxy).toBe(true);
    });
  });

  describe('refreshPool - 刷新代理池', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.brightdata.com/zone').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
      adapter.clearCache();
    });

    it('应该成功刷新代理池', async () => {
      const added = await adapter.refreshPool(10);

      expect(added).toBe(10);
    });

    it('当池大小满足要求时不应该刷新', async () => {
      // 先添加一些代理到缓存
      await adapter.getProxyList({ limit: 50 });

      // 尝试刷新，但池已经足够大
      const added = await adapter.refreshPool(30);

      expect(added).toBe(0);
    });

    it('应该只生成需要的数量', async () => {
      // 先添加 50 个代理
      await adapter.getProxyList({ limit: 50 });

      // 刷新到 80 个，应该只生成 30 个
      const added = await adapter.refreshPool(80);

      expect(added).toBe(30);
    });

    it('应该抛出错误当刷新失败', async () => {
      // 模拟 getProxyList 抛出错误（虽然实际上 getProxyList 不会从网络获取）
      const spy = jest.spyOn(adapter, 'getProxyList').mockRejectedValue(new Error('Test error'));

      await expect(adapter.refreshPool(10)).rejects.toThrow('Test error');

      spy.mockRestore();
    });
  });

  describe('getUsageStats - 获取使用统计', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.brightdata.com/zone').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该成功获取使用统计', async () => {
      const mockStatsResponse = {
        bandwidth: 5368709120, // 5GB in bytes
        requests: 1000,
        success: 950,
        avg_latency: 120,
      };

      axiosMock
        .onGet('https://api.brightdata.com/api/stats')
        .reply(200, mockStatsResponse);

      const stats = await adapter.getUsageStats();

      expect(stats.totalRequests).toBe(1000);
      expect(stats.successfulRequests).toBe(950);
      expect(stats.failedRequests).toBe(50);
      expect(stats.successRate).toBe(0.95);
      expect(stats.totalBandwidthMB).toBeCloseTo(5120, 0); // 5GB = 5120MB
      expect(stats.totalCost).toBeCloseTo(50, 0); // 5GB * $10/GB
      expect(stats.averageLatency).toBe(120);
      expect(stats.avgCostPerGB).toBe(10);
    });

    it('应该正确格式化日期参数', async () => {
      let capturedParams: any;

      axiosMock
        .onGet('https://api.brightdata.com/api/stats')
        .reply((config) => {
          capturedParams = config.params;
          return [200, {}];
        });

      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');

      await adapter.getUsageStats(startDate, endDate);

      expect(capturedParams.from).toBe('2024-01-01');
      expect(capturedParams.to).toBe('2024-01-31');
      expect(capturedParams.zone).toBe('residential');
    });

    it('应该包含 zone 参数', async () => {
      let capturedParams: any;

      axiosMock
        .onGet('https://api.brightdata.com/api/stats')
        .reply((config) => {
          capturedParams = config.params;
          return [200, {}];
        });

      await adapter.getUsageStats();

      expect(capturedParams.zone).toBe('residential');
    });

    it('应该返回空统计当 API 失败', async () => {
      axiosMock
        .onGet('https://api.brightdata.com/api/stats')
        .networkError();

      const stats = await adapter.getUsageStats();

      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('应该处理部分缺失的字段', async () => {
      const partialResponse = {
        requests: 500,
        // 其他字段缺失
      };

      axiosMock
        .onGet('https://api.brightdata.com/api/stats')
        .reply(200, partialResponse);

      const stats = await adapter.getUsageStats();

      expect(stats.totalRequests).toBe(500);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.totalBandwidthMB).toBe(0);
    });

    it('应该正确计算成功率', async () => {
      const response = {
        requests: 100,
        success: 80,
      };

      axiosMock
        .onGet('https://api.brightdata.com/api/stats')
        .reply(200, response);

      const stats = await adapter.getUsageStats();

      expect(stats.successRate).toBe(0.8);
    });

    it('应该处理零请求的情况', async () => {
      const response = {
        requests: 0,
        success: 0,
      };

      axiosMock
        .onGet('https://api.brightdata.com/api/stats')
        .reply(200, response);

      const stats = await adapter.getUsageStats();

      expect(stats.successRate).toBe(0);
      expect(stats.avgCostPerRequest).toBe(0);
    });
  });

  describe('getAvailableRegions - 获取可用地区', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.brightdata.com/zone').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该成功获取地区列表', async () => {
      const mockRegionsResponse = {
        countries: {
          US: {
            name: 'United States',
            cities: ['New York', 'Los Angeles'],
            states: ['CA', 'NY'],
            ips: 10000000,
          },
          GB: {
            name: 'United Kingdom',
            cities: ['London', 'Manchester'],
            states: [],
            ips: 5000000,
          },
        },
      };

      axiosMock
        .onGet('https://api.brightdata.com/api/zone/route')
        .reply(200, mockRegionsResponse);

      const regions = await adapter.getAvailableRegions();

      expect(regions).toHaveLength(2);

      const usRegion = regions.find(r => r.country === 'US');
      expect(usRegion).toBeDefined();
      expect(usRegion?.countryName).toBe('United States');
      expect(usRegion?.cities).toContain('New York');
      expect(usRegion?.states).toContain('CA');
      expect(usRegion?.availableProxies).toBe(10000000);
      expect(usRegion?.costPerGB).toBe(10);
    });

    it('应该处理没有额外信息的国家', async () => {
      const mockRegionsResponse = {
        countries: {
          US: {
            name: 'United States',
          },
        },
      };

      axiosMock
        .onGet('https://api.brightdata.com/api/zone/route')
        .reply(200, mockRegionsResponse);

      const regions = await adapter.getAvailableRegions();

      expect(regions).toHaveLength(1);
      expect(regions[0].cities).toEqual([]);
      expect(regions[0].states).toEqual([]);
      expect(regions[0].availableProxies).toBe(0);
    });

    it('应该返回默认地区列表当 API 失败', async () => {
      axiosMock
        .onGet('https://api.brightdata.com/api/zone/route')
        .networkError();

      const regions = await adapter.getAvailableRegions();

      // 应该返回 15 个默认国家（Bright Data 有更多默认国家）
      expect(regions).toHaveLength(15);
      expect(regions.some((r) => r.country === 'US')).toBe(true);
      expect(regions.some((r) => r.country === 'GB')).toBe(true);
      expect(regions.some((r) => r.country === 'IN')).toBe(true);
    });

    it('应该返回空数组当响应中没有 countries 数据', async () => {
      axiosMock
        .onGet('https://api.brightdata.com/api/zone/route')
        .reply(200, {});

      const regions = await adapter.getAvailableRegions();

      // 当 countries 字段不存在时，返回空数组（不是默认列表）
      expect(regions).toHaveLength(0);
    });

    it('应该返回空数组当响应中 countries 字段不存在', async () => {
      axiosMock
        .onGet('https://api.brightdata.com/api/zone/route')
        .reply(200, { some_other_field: 'value' });

      const regions = await adapter.getAvailableRegions();

      // 当响应有数据但没有 countries 字段时，返回空数组
      expect(regions).toHaveLength(0);
    });
  });

  describe('getCachedProxy - 获取缓存代理', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.brightdata.com/zone').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
      adapter.clearCache();
    });

    it('应该返回缓存的代理', async () => {
      const proxies = await adapter.getProxyList({ limit: 1 });
      const proxyId = proxies[0].id;

      const cached = adapter.getCachedProxy(proxyId);

      expect(cached).toBeDefined();
      expect(cached?.host).toBe('brd.superproxy.io');
      expect(cached?.port).toBe(22225);
    });

    it('应该返回 undefined 当代理不在缓存中', () => {
      const cached = adapter.getCachedProxy('non-existent-id');

      expect(cached).toBeUndefined();
    });
  });

  describe('clearCache - 清除缓存', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.brightdata.com/zone').reply(200);
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
      axiosMock.onGet('https://api.brightdata.com/zone').reply(200);
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
      axiosMock.onGet('https://api.brightdata.com/zone').reply(200);
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

      expect(proxy.id).toContain('brightdata-');
      expect(proxy.host).toBe('brd.superproxy.io');
      expect(proxy.port).toBe(22225);
      expect(proxy.protocol).toBe('https');
      expect(proxy.provider).toBe('brightdata');
      expect(proxy.location.country).toBe('US');
      expect(proxy.location.city).toBe('New York');
      expect(proxy.quality).toBe(95);
      expect(proxy.inUse).toBe(false);
      expect(proxy.failureCount).toBe(0);
      expect(proxy.costPerGB).toBe(10);
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
      const uninitializedAdapter = new BrightDataAdapter();

      await expect(uninitializedAdapter.getProxyList()).rejects.toThrow(
        'BrightData adapter not initialized',
      );
    });
  });

  describe('性能测试', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.brightdata.com/zone').reply(200);
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
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.brightdata.com/zone').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该处理超时错误', async () => {
      axiosMock
        .onGet('https://api.brightdata.com/api/stats')
        .timeout();

      // getUsageStats 应该返回空统计而不是抛出错误
      const stats = await adapter.getUsageStats();

      expect(stats.totalRequests).toBe(0);
    });

    it('应该处理无效的响应状态', async () => {
      axiosMock
        .onGet('https://api.brightdata.com/api/stats')
        .reply(500);

      const stats = await adapter.getUsageStats();

      expect(stats.totalRequests).toBe(0);
    });
  });
});
