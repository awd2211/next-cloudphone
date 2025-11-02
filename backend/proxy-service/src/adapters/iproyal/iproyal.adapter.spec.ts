import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { IPRoyalAdapter } from './iproyal.adapter';
import {
  ProviderConfig,
  ProxyInfo,
  GetProxyOptions,
} from '../../common/interfaces';

describe('IPRoyalAdapter', () => {
  let adapter: IPRoyalAdapter;
  let axiosMock: MockAdapter;
  let mockConfig: ProviderConfig;

  beforeEach(() => {
    adapter = new IPRoyalAdapter();
    axiosMock = new MockAdapter(axios);

    mockConfig = {
      name: 'IPRoyal',
      apiUrl: 'https://api.iproyal.com',
      apiKey: 'test-api-key',
      username: 'test-user',
      password: 'test-password',
      timeout: 30000,
      maxRetries: 3,
      costPerGB: 1.75,
      enabled: true,
      priority: 1,
    };
  });

  afterEach(() => {
    axiosMock.restore();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('应该成功创建 IPRoyalAdapter 实例', () => {
      expect(adapter).toBeDefined();
      expect(adapter.getName()).toBe('IPRoyal');
    });
  });

  describe('initialize - 初始化', () => {
    it('应该成功初始化适配器', async () => {
      // Mock testConnection 调用
      axiosMock
        .onGet('https://api.iproyal.com/account/balance')
        .reply(200, { balance: 100 });

      await adapter.initialize(mockConfig);

      expect(adapter['initialized']).toBe(true);
      expect(adapter['config']).toEqual(mockConfig);
    });

    it('连接失败时应该记录警告但不抛出错误', async () => {
      // Mock testConnection 失败
      axiosMock
        .onGet('https://api.iproyal.com/account/balance')
        .networkError();

      const loggerWarnSpy = jest.spyOn(adapter['logger'], 'warn');

      await adapter.initialize(mockConfig);

      expect(adapter['initialized']).toBe(true);
      expect(loggerWarnSpy).toHaveBeenCalled();
    });
  });

  describe('testConnection - 测试连接', () => {
    beforeEach(async () => {
      // 初始化但不调用 testConnection（避免重复）
      axiosMock.onGet('https://api.iproyal.com/account/balance').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该成功测试连接', async () => {
      axiosMock
        .onGet('https://api.iproyal.com/account/balance')
        .reply(200, { balance: 100 });

      const result = await adapter.testConnection();

      expect(result).toBe(true);
    });

    it('应该返回 false 当 API 返回非 200 状态', async () => {
      axiosMock
        .onGet('https://api.iproyal.com/account/balance')
        .reply(500);

      const result = await adapter.testConnection();

      expect(result).toBe(false);
    });

    it('应该返回 false 当网络错误', async () => {
      axiosMock
        .onGet('https://api.iproyal.com/account/balance')
        .networkError();

      const result = await adapter.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getProxyList - 获取代理列表', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.iproyal.com/account/balance').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该成功获取代理列表', async () => {
      const mockApiResponse = [
        {
          ip: '1.2.3.4',
          port: 8080,
          country_code: 'US',
          city: 'New York',
          protocol: 'http',
          quality: 95,
          latency: 100,
        },
        {
          ip: '5.6.7.8',
          port: 8081,
          country_code: 'GB',
          city: 'London',
          protocol: 'https',
          quality: 90,
          latency: 120,
        },
      ];

      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply(200, mockApiResponse);

      const options: GetProxyOptions = {
        country: 'US',
        limit: 100,
      };

      const proxies = await adapter.getProxyList(options);

      expect(proxies).toHaveLength(2);
      expect(proxies[0].host).toBe('1.2.3.4');
      expect(proxies[0].port).toBe(8080);
      expect(proxies[0].location.country).toBe('US');
      expect(proxies[0].provider).toBe('iproyal');
      expect(proxies[0].username).toBe('test-user');
      expect(proxies[0].password).toBe('test-password');
    });

    it('应该处理嵌套的 proxies 数组响应格式', async () => {
      const mockApiResponse = {
        success: true,
        proxies: [
          {
            ip: '1.2.3.4',
            port: 8080,
            country_code: 'US',
          },
        ],
      };

      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply(200, mockApiResponse);

      const proxies = await adapter.getProxyList();

      expect(proxies).toHaveLength(1);
      expect(proxies[0].host).toBe('1.2.3.4');
    });

    it('应该正确传递会话类型参数', async () => {
      let capturedParams: any;

      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply((config) => {
          capturedParams = JSON.parse(config.data);
          return [200, []];
        });

      // Sticky session
      await adapter.getProxyList({ session: 'sticky' });
      expect(capturedParams.rotation).toBe('session');

      // Rotating session
      await adapter.getProxyList({ session: 'rotating' });
      expect(capturedParams.rotation).toBe('rotating');

      // Default (no session)
      await adapter.getProxyList();
      expect(capturedParams.rotation).toBe('rotating');
    });

    it('应该正确传递位置参数', async () => {
      let capturedParams: any;

      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply((config) => {
          capturedParams = JSON.parse(config.data);
          return [200, []];
        });

      await adapter.getProxyList({
        country: 'US',
        city: 'New York',
        protocol: 'https',
      });

      expect(capturedParams.country).toBe('US');
      expect(capturedParams.city).toBe('New York');
      expect(capturedParams.protocol).toBe('https');
    });

    it('应该缓存获取的代理', async () => {
      const mockApiResponse = [
        {
          ip: '1.2.3.4',
          port: 8080,
          country_code: 'US',
        },
      ];

      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply(200, mockApiResponse);

      const proxies = await adapter.getProxyList();

      // 验证缓存
      const cached = adapter.getCachedProxy(proxies[0].id);
      expect(cached).toBeDefined();
      expect(cached?.host).toBe('1.2.3.4');
    });

    it('应该返回空数组当 API 响应成功但无数据', async () => {
      // API 返回 200 但 data 为 null/undefined
      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply(200, null);

      const proxies = await adapter.getProxyList();

      expect(proxies).toEqual([]);
    });

    it('应该抛出错误当网络失败', async () => {
      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .networkError();

      await expect(adapter.getProxyList()).rejects.toThrow();
    });

    it('应该使用默认 limit 值', async () => {
      let capturedParams: any;

      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply((config) => {
          capturedParams = JSON.parse(config.data);
          return [200, []];
        });

      await adapter.getProxyList();

      expect(capturedParams.limit).toBe(100);
    });
  });

  describe('refreshPool - 刷新代理池', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.iproyal.com/account/balance').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
      adapter.clearCache(); // 清空缓存
    });

    it('应该成功刷新代理池', async () => {
      const mockApiResponse = [
        {
          ip: '1.2.3.4',
          port: 8080,
          country_code: 'US',
        },
        {
          ip: '5.6.7.8',
          port: 8081,
          country_code: 'GB',
        },
      ];

      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply(200, mockApiResponse);

      const added = await adapter.refreshPool(10);

      expect(added).toBe(2);
    });

    it('当池大小满足要求时不应该刷新', async () => {
      // 先添加一些代理到缓存
      const mockApiResponse = Array(50)
        .fill(null)
        .map((_, i) => ({
          ip: `1.2.3.${i}`,
          port: 8080 + i,
          country_code: 'US',
        }));

      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply(200, mockApiResponse);

      await adapter.getProxyList({ limit: 50 });

      // 重置 mock
      axiosMock.reset();
      axiosMock.onPost().reply(200, []);

      // 尝试刷新，但池已经足够大
      const added = await adapter.refreshPool(30);

      expect(added).toBe(0);
    });

    it('应该只请求需要的数量', async () => {
      let capturedParams: any;

      // 先添加 50 个代理
      const initialProxies = Array(50)
        .fill(null)
        .map((_, i) => ({
          ip: `1.2.3.${i}`,
          port: 8080 + i,
          country_code: 'US',
        }));

      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .replyOnce(200, initialProxies)
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply((config) => {
          capturedParams = JSON.parse(config.data);
          return [200, []];
        });

      await adapter.getProxyList({ limit: 50 });

      // 刷新到 80 个，应该只请求 30 个
      await adapter.refreshPool(80);

      expect(capturedParams.limit).toBe(30);
    });

    it('应该抛出错误当刷新失败', async () => {
      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .networkError();

      await expect(adapter.refreshPool(10)).rejects.toThrow();
    });
  });

  describe('getUsageStats - 获取使用统计', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.iproyal.com/account/balance').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该成功获取使用统计', async () => {
      const mockStatsResponse = {
        total_requests: 1000,
        successful_requests: 950,
        failed_requests: 50,
        success_rate: 0.95,
        total_bandwidth_mb: 5000,
        total_cost: 8.75,
        average_latency: 120,
        avg_cost_per_request: 0.00875,
      };

      axiosMock
        .onGet('https://api.iproyal.com/usage/stats')
        .reply(200, mockStatsResponse);

      const stats = await adapter.getUsageStats();

      expect(stats.totalRequests).toBe(1000);
      expect(stats.successfulRequests).toBe(950);
      expect(stats.failedRequests).toBe(50);
      expect(stats.successRate).toBe(0.95);
      expect(stats.totalBandwidthMB).toBe(5000);
      expect(stats.totalCost).toBe(8.75);
      expect(stats.averageLatency).toBe(120);
      expect(stats.avgCostPerGB).toBe(1.75); // 从 config
    });

    it('应该正确格式化日期参数', async () => {
      let capturedParams: any;

      axiosMock.onGet('https://api.iproyal.com/usage/stats').reply((config) => {
        capturedParams = config.params;
        return [200, {}];
      });

      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');

      await adapter.getUsageStats(startDate, endDate);

      expect(capturedParams.start_date).toBe('2024-01-01');
      expect(capturedParams.end_date).toBe('2024-01-31');
    });

    it('应该返回空统计当 API 失败', async () => {
      axiosMock
        .onGet('https://api.iproyal.com/usage/stats')
        .networkError();

      const stats = await adapter.getUsageStats();

      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('应该处理部分缺失的字段', async () => {
      const partialResponse = {
        total_requests: 500,
        // 其他字段缺失
      };

      axiosMock
        .onGet('https://api.iproyal.com/usage/stats')
        .reply(200, partialResponse);

      const stats = await adapter.getUsageStats();

      expect(stats.totalRequests).toBe(500);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
    });

    it('应该返回空统计当响应状态非 200', async () => {
      axiosMock
        .onGet('https://api.iproyal.com/usage/stats')
        .reply(500);

      const stats = await adapter.getUsageStats();

      expect(stats.totalRequests).toBe(0);
    });
  });

  describe('getAvailableRegions - 获取可用地区', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.iproyal.com/account/balance').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该成功获取地区列表', async () => {
      const mockRegionsResponse = {
        countries: [
          {
            code: 'US',
            name: 'United States',
            cities: ['New York', 'Los Angeles'],
            proxy_count: 1000,
          },
          {
            code: 'GB',
            name: 'United Kingdom',
            cities: ['London', 'Manchester'],
            proxy_count: 500,
          },
        ],
      };

      axiosMock
        .onGet('https://api.iproyal.com/locations')
        .reply(200, mockRegionsResponse);

      const regions = await adapter.getAvailableRegions();

      expect(regions).toHaveLength(2);
      expect(regions[0].country).toBe('US');
      expect(regions[0].countryName).toBe('United States');
      expect(regions[0].cities).toContain('New York');
      expect(regions[0].availableProxies).toBe(1000);
      expect(regions[0].costPerGB).toBe(1.75);
    });

    it('应该处理扁平化的响应格式', async () => {
      const mockRegionsResponse = [
        {
          code: 'US',
          name: 'United States',
          proxy_count: 1000,
        },
      ];

      axiosMock
        .onGet('https://api.iproyal.com/locations')
        .reply(200, mockRegionsResponse);

      const regions = await adapter.getAvailableRegions();

      expect(regions).toHaveLength(1);
      expect(regions[0].country).toBe('US');
    });

    it('应该返回默认地区列表当 API 失败', async () => {
      axiosMock
        .onGet('https://api.iproyal.com/locations')
        .networkError();

      const regions = await adapter.getAvailableRegions();

      // 应该返回 10 个默认国家
      expect(regions).toHaveLength(10);
      expect(regions.some((r) => r.country === 'US')).toBe(true);
      expect(regions.some((r) => r.country === 'GB')).toBe(true);
      expect(regions.some((r) => r.country === 'JP')).toBe(true);
    });

    it('应该返回默认地区列表当响应为空', async () => {
      axiosMock
        .onGet('https://api.iproyal.com/locations')
        .reply(200, null);

      const regions = await adapter.getAvailableRegions();

      expect(regions).toHaveLength(10);
    });
  });

  describe('getCachedProxy - 获取缓存代理', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.iproyal.com/account/balance').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
      adapter.clearCache();
    });

    it('应该返回缓存的代理', async () => {
      const mockApiResponse = [
        {
          ip: '1.2.3.4',
          port: 8080,
          country_code: 'US',
        },
      ];

      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply(200, mockApiResponse);

      const proxies = await adapter.getProxyList();
      const proxyId = proxies[0].id;

      const cached = adapter.getCachedProxy(proxyId);

      expect(cached).toBeDefined();
      expect(cached?.host).toBe('1.2.3.4');
      expect(cached?.port).toBe(8080);
    });

    it('应该返回 undefined 当代理不在缓存中', () => {
      const cached = adapter.getCachedProxy('non-existent-id');

      expect(cached).toBeUndefined();
    });
  });

  describe('clearCache - 清除缓存', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.iproyal.com/account/balance').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该成功清除缓存', async () => {
      // 先添加一些代理
      const mockApiResponse = [
        {
          ip: '1.2.3.4',
          port: 8080,
          country_code: 'US',
        },
      ];

      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply(200, mockApiResponse);

      const proxies = await adapter.getProxyList();
      const proxyId = proxies[0].id;

      // 验证缓存存在
      expect(adapter.getCachedProxy(proxyId)).toBeDefined();

      // 清除缓存
      adapter.clearCache();

      // 验证缓存已清空
      expect(adapter.getCachedProxy(proxyId)).toBeUndefined();
    });
  });

  describe('mapToProxyInfo - 映射代理信息 (间接测试)', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.iproyal.com/account/balance').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该正确映射完整的代理信息', async () => {
      const mockApiResponse = [
        {
          ip: '1.2.3.4',
          port: 8080,
          country_code: 'US',
          city: 'New York',
          state: 'NY',
          protocol: 'https',
          quality: 95,
          latency: 100,
          session_id: 'test-session',
          isp: 'Test ISP',
          asn: 'AS12345',
          connection_type: 'residential',
          expires_at: '2024-12-31T23:59:59Z',
        },
      ];

      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply(200, mockApiResponse);

      const proxies = await adapter.getProxyList();
      const proxy = proxies[0];

      expect(proxy.id).toBe('iproyal-1.2.3.4:8080');
      expect(proxy.host).toBe('1.2.3.4');
      expect(proxy.port).toBe(8080);
      expect(proxy.protocol).toBe('https');
      expect(proxy.provider).toBe('iproyal');
      expect(proxy.location.country).toBe('US');
      expect(proxy.location.city).toBe('New York');
      expect(proxy.location.state).toBe('NY');
      expect(proxy.quality).toBe(95);
      expect(proxy.latency).toBe(100);
      expect(proxy.sessionId).toBe('test-session');
      expect(proxy.metadata?.isp).toBe('Test ISP');
      expect(proxy.metadata?.asn).toBe('AS12345');
      expect(proxy.metadata?.connection_type).toBe('residential');
      expect(proxy.expiresAt).toBeDefined();
    });

    it('应该使用默认值处理缺失字段', async () => {
      const mockApiResponse = [
        {
          ip: '1.2.3.4',
          port: 8080,
          // 其他字段缺失
        },
      ];

      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply(200, mockApiResponse);

      const proxies = await adapter.getProxyList();
      const proxy = proxies[0];

      expect(proxy.protocol).toBe('http'); // 默认
      expect(proxy.quality).toBe(80); // 默认
      expect(proxy.latency).toBe(0); // 默认
      expect(proxy.location.country).toBe('US'); // 默认
      expect(proxy.inUse).toBe(false);
      expect(proxy.failureCount).toBe(0);
    });

    it('应该支持使用 host 字段代替 ip 字段', async () => {
      const mockApiResponse = [
        {
          host: 'proxy.example.com', // 使用 host 而不是 ip
          port: 8080,
          country: 'GB', // 使用 country 而不是 country_code
        },
      ];

      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply(200, mockApiResponse);

      const proxies = await adapter.getProxyList();
      const proxy = proxies[0];

      expect(proxy.host).toBe('proxy.example.com');
      expect(proxy.location.country).toBe('GB');
    });
  });

  describe('ensureInitialized - 确保初始化 (间接测试)', () => {
    it('未初始化时调用方法应该抛出错误', async () => {
      const uninitializedAdapter = new IPRoyalAdapter();

      await expect(uninitializedAdapter.getProxyList()).rejects.toThrow(
        'IPRoyal adapter not initialized',
      );
    });
  });

  describe('性能测试', () => {
    beforeEach(async () => {
      axiosMock.onGet('https://api.iproyal.com/account/balance').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('getProxyList 应该在合理时间内完成', async () => {
      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply(200, [
          {
            ip: '1.2.3.4',
            port: 8080,
            country_code: 'US',
          },
        ]);

      const start = Date.now();
      await adapter.getProxyList();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000);
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
      axiosMock.onGet('https://api.iproyal.com/account/balance').reply(200);
      await adapter.initialize(mockConfig);
      axiosMock.reset();
    });

    it('应该处理超时错误', async () => {
      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .timeout();

      await expect(adapter.getProxyList()).rejects.toThrow();
    });

    it('应该优雅地处理无效的响应格式', async () => {
      // 返回非预期格式的数据（字符串而不是数组或对象）
      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply(200, 'invalid json');

      const proxies = await adapter.getProxyList();

      // 应该返回空数组而不是抛出错误
      expect(proxies).toEqual([]);
    });

    it('应该处理空数组响应', async () => {
      axiosMock
        .onPost('https://api.iproyal.com/generate-proxy-list')
        .reply(200, []);

      const proxies = await adapter.getProxyList();

      expect(proxies).toEqual([]);
    });
  });
});
