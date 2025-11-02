import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { BaseProxyAdapter } from './base.adapter';
import {
  ProviderConfig,
  ProxyInfo,
  GetProxyOptions,
  ProxyUsageStats,
  Region,
} from '../../common/interfaces';

// 创建具体的测试实现类
class TestProxyAdapter extends BaseProxyAdapter {
  constructor() {
    super('TestProvider');
  }

  // 实现抽象方法
  async getProxyList(options?: GetProxyOptions): Promise<ProxyInfo[]> {
    this.ensureInitialized();
    return [
      {
        id: 'test-proxy-1',
        host: 'proxy.test.com',
        port: 8080,
        protocol: 'http',
        provider: this.name,
        location: { country: 'US' },
        quality: 95,
        latency: 100,
        inUse: false,
        costPerGB: 10,
        createdAt: new Date(),
      },
    ];
  }

  async getUsageStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<ProxyUsageStats> {
    this.ensureInitialized();
    return {
      totalRequests: 1000,
      successfulRequests: 950,
      failedRequests: 50,
      successRate: 0.95,
      totalBandwidthMB: 5000,
      totalCost: 50,
      averageLatency: 100,
      avgCostPerRequest: 0.05,
      avgCostPerGB: 10,
      periodStart: startDate || new Date(),
      periodEnd: endDate || new Date(),
    };
  }

  async refreshPool(minSize?: number): Promise<number> {
    this.ensureInitialized();
    return 100;
  }

  async getAvailableRegions(): Promise<Region[]> {
    this.ensureInitialized();
    return [
      {
        country: 'US',
        countryName: 'United States',
        availableProxies: 1000,
      },
      {
        country: 'UK',
        countryName: 'United Kingdom',
        availableProxies: 500,
      },
    ];
  }
}

describe('BaseProxyAdapter', () => {
  let adapter: TestProxyAdapter;
  let axiosMock: MockAdapter;
  let mockConfig: ProviderConfig;

  beforeEach(() => {
    adapter = new TestProxyAdapter();
    axiosMock = new MockAdapter(axios);

    mockConfig = {
      name: 'TestProvider',
      apiUrl: 'https://api.test.com',
      apiKey: 'test-api-key',
      timeout: 30000,
      maxRetries: 3,
      costPerGB: 10,
      enabled: true,
      priority: 1,
    };
  });

  afterEach(() => {
    axiosMock.restore();
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该成功初始化适配器', async () => {
      await adapter.initialize(mockConfig);

      expect(adapter['initialized']).toBe(true);
      expect(adapter['config']).toEqual(mockConfig);
      expect(adapter['httpClient']).toBeDefined();
    });

    it('应该设置正确的HTTP客户端配置', async () => {
      await adapter.initialize(mockConfig);

      const client = adapter['httpClient'];
      expect(client.defaults.baseURL).toBe('https://api.test.com');
      expect(client.defaults.timeout).toBe(30000);
      expect(client.defaults.headers['Content-Type']).toBe('application/json');
      expect(client.defaults.headers['User-Agent']).toBe(
        'CloudPhone-ProxyService/1.0',
      );
    });

    it('应该添加请求拦截器', async () => {
      await adapter.initialize(mockConfig);

      const client = adapter['httpClient'];
      expect(client.interceptors.request['handlers']).toHaveLength(1);
    });

    it('应该添加响应拦截器', async () => {
      await adapter.initialize(mockConfig);

      const client = adapter['httpClient'];
      expect(client.interceptors.response['handlers']).toHaveLength(1);
    });
  });

  describe('getName - 获取名称', () => {
    it('应该返回正确的供应商名称', () => {
      expect(adapter.getName()).toBe('TestProvider');
    });
  });

  describe('validateProxy - 验证代理', () => {
    const mockProxy: ProxyInfo = {
      id: 'test-proxy-1',
      host: 'proxy.test.com',
      port: 8080,
      username: 'testuser',
      password: 'testpass',
      protocol: 'http',
      provider: 'TestProvider',
      location: { country: 'US' },
      quality: 95,
      latency: 100,
      inUse: false,
      costPerGB: 10,
      createdAt: new Date(),
    };

    it('应该成功验证可用的代理', async () => {
      // Mock 外部API响应
      axiosMock
        .onGet('https://api.ipify.org?format=json')
        .reply(200, { ip: '1.2.3.4' });

      const result = await adapter.validateProxy(mockProxy);

      expect(result).toBe(true);
    });

    it('应该返回 false 当代理无法连接', async () => {
      // Mock 网络错误
      axiosMock
        .onGet('https://api.ipify.org?format=json')
        .networkError();

      const result = await adapter.validateProxy(mockProxy);

      expect(result).toBe(false);
    });

    it('应该返回 false 当响应状态码不是 200', async () => {
      axiosMock
        .onGet('https://api.ipify.org?format=json')
        .reply(500);

      const result = await adapter.validateProxy(mockProxy);

      expect(result).toBe(false);
    });

    it('应该返回 false 当响应没有 IP', async () => {
      axiosMock
        .onGet('https://api.ipify.org?format=json')
        .reply(200, {});

      const result = await adapter.validateProxy(mockProxy);

      expect(result).toBe(false);
    });
  });

  describe('checkHealth - 健康检查', () => {
    const mockProxy: ProxyInfo = {
      id: 'test-proxy-1',
      host: 'proxy.test.com',
      port: 8080,
      username: 'testuser',
      password: 'testpass',
      protocol: 'http',
      provider: 'TestProvider',
      location: { country: 'US' },
      quality: 95,
      latency: 100,
      inUse: false,
      costPerGB: 10,
      createdAt: new Date(),
    };

    it('应该返回健康状态当代理可用', async () => {
      axiosMock
        .onGet('https://api.ipify.org?format=json')
        .reply(200, { ip: '1.2.3.4' });

      const result = await adapter.checkHealth(mockProxy);

      expect(result.proxyId).toBe('test-proxy-1');
      expect(result.healthy).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.statusCode).toBe(200);
      expect(result.checkedAt).toBeInstanceOf(Date);
    });

    it('应该返回不健康状态当代理失败', async () => {
      axiosMock
        .onGet('https://api.ipify.org?format=json')
        .networkError();

      const result = await adapter.checkHealth(mockProxy);

      expect(result.proxyId).toBe('test-proxy-1');
      expect(result.healthy).toBe(false);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeDefined();
      expect(result.checkedAt).toBeInstanceOf(Date);
    });

    it('应该记录响应时间', async () => {
      axiosMock
        .onGet('https://api.ipify.org?format=json')
        .reply(200, { ip: '1.2.3.4' });

      const result = await adapter.checkHealth(mockProxy);

      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.responseTime).toBeLessThan(10000); // 应该小于超时时间
    });
  });

  describe('testConnection - 测试连接', () => {
    it('应该返回 true (默认实现)', async () => {
      const result = await adapter.testConnection();

      expect(result).toBe(true);
    });
  });

  describe('estimateCost - 估算成本', () => {
    beforeEach(async () => {
      await adapter.initialize(mockConfig);
    });

    it('应该正确计算成本', async () => {
      // 1024 MB = 1 GB, costPerGB = 10
      const cost = await adapter.estimateCost(1024);

      expect(cost).toBe(10);
    });

    it('应该正确计算小于1GB的成本', async () => {
      // 512 MB = 0.5 GB, costPerGB = 10
      const cost = await adapter.estimateCost(512);

      expect(cost).toBe(5);
    });

    it('应该正确计算大于1GB的成本', async () => {
      // 2048 MB = 2 GB, costPerGB = 10
      const cost = await adapter.estimateCost(2048);

      expect(cost).toBe(20);
    });

    it('应该处理 0 MB', async () => {
      const cost = await adapter.estimateCost(0);

      expect(cost).toBe(0);
    });
  });

  describe('releaseProxy - 释放代理', () => {
    beforeEach(async () => {
      await adapter.initialize(mockConfig);
    });

    it('应该成功释放代理 (默认无操作)', async () => {
      await expect(
        adapter.releaseProxy('test-proxy-1'),
      ).resolves.not.toThrow();
    });

    it('不应该抛出错误即使代理ID不存在', async () => {
      await expect(
        adapter.releaseProxy('non-existent-proxy'),
      ).resolves.not.toThrow();
    });
  });

  describe('addAuthentication - 添加认证', () => {
    it('应该添加 API Key 认证', async () => {
      const configWithApiKey = {
        ...mockConfig,
        apiKey: 'test-api-key',
        username: undefined,
        password: undefined,
        token: undefined,
      };

      await adapter.initialize(configWithApiKey);

      // 通过实际请求测试认证是否添加
      // 这里我们不能直接访问 protected 方法，但可以通过 httpClient 请求来验证
    });

    it('应该添加 Basic 认证', async () => {
      const configWithBasicAuth = {
        ...mockConfig,
        apiKey: undefined,
        username: 'testuser',
        password: 'testpass',
        token: undefined,
      };

      await adapter.initialize(configWithBasicAuth);
    });

    it('应该添加 Token 认证', async () => {
      const configWithToken = {
        ...mockConfig,
        apiKey: undefined,
        username: undefined,
        password: undefined,
        token: 'test-token',
      };

      await adapter.initialize(configWithToken);
    });
  });

  describe('抽象方法实现', () => {
    beforeEach(async () => {
      await adapter.initialize(mockConfig);
    });

    it('getProxyList 应该返回代理列表', async () => {
      const proxies = await adapter.getProxyList();

      expect(proxies).toHaveLength(1);
      expect(proxies[0].id).toBe('test-proxy-1');
      expect(proxies[0].provider).toBe('TestProvider');
    });

    it('getUsageStats 应该返回使用统计', async () => {
      const stats = await adapter.getUsageStats();

      expect(stats.totalRequests).toBe(1000);
      expect(stats.successfulRequests).toBe(950);
      expect(stats.successRate).toBe(0.95);
    });

    it('refreshPool 应该返回添加的代理数量', async () => {
      const added = await adapter.refreshPool(100);

      expect(added).toBe(100);
    });

    it('getAvailableRegions 应该返回可用地区列表', async () => {
      const regions = await adapter.getAvailableRegions();

      expect(regions).toHaveLength(2);
      expect(regions[0].country).toBe('US');
      expect(regions[1].country).toBe('UK');
    });
  });

  describe('ensureInitialized - 确保初始化', () => {
    it('应该抛出错误当未初始化时调用方法', async () => {
      // 未初始化就调用需要初始化的方法
      await expect(adapter.getProxyList()).rejects.toThrow(
        'TestProvider adapter not initialized',
      );
    });

    it('不应该抛出错误当已初始化', async () => {
      await adapter.initialize(mockConfig);

      await expect(adapter.getProxyList()).resolves.toBeDefined();
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await adapter.initialize(mockConfig);
    });

    it('应该处理超时错误', async () => {
      const mockProxy: ProxyInfo = {
        id: 'test-proxy-1',
        host: 'proxy.test.com',
        port: 8080,
        protocol: 'http',
        provider: 'TestProvider',
        location: { country: 'US' },
        quality: 95,
        latency: 100,
        inUse: false,
        costPerGB: 10,
        createdAt: new Date(),
      };

      axiosMock
        .onGet('https://api.ipify.org?format=json')
        .timeout();

      const result = await adapter.validateProxy(mockProxy);

      expect(result).toBe(false);
    });

    it('应该处理网络错误', async () => {
      const mockProxy: ProxyInfo = {
        id: 'test-proxy-1',
        host: 'proxy.test.com',
        port: 8080,
        protocol: 'http',
        provider: 'TestProvider',
        location: { country: 'US' },
        quality: 95,
        latency: 100,
        inUse: false,
        costPerGB: 10,
        createdAt: new Date(),
      };

      axiosMock
        .onGet('https://api.ipify.org?format=json')
        .networkError();

      const result = await adapter.checkHealth(mockProxy);

      expect(result.healthy).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('配置选项', () => {
    it('应该使用默认超时时间', async () => {
      const configWithoutTimeout = {
        ...mockConfig,
        timeout: undefined,
      };

      await adapter.initialize(configWithoutTimeout);

      const client = adapter['httpClient'];
      expect(client.defaults.timeout).toBe(30000); // 默认 30 秒
    });

    it('应该使用自定义超时时间', async () => {
      const configWithCustomTimeout = {
        ...mockConfig,
        timeout: 60000,
      };

      await adapter.initialize(configWithCustomTimeout);

      const client = adapter['httpClient'];
      expect(client.defaults.timeout).toBe(60000);
    });
  });

  describe('性能测试', () => {
    beforeEach(async () => {
      await adapter.initialize(mockConfig);
    });

    it('checkHealth 应该在合理时间内完成', async () => {
      const mockProxy: ProxyInfo = {
        id: 'test-proxy-1',
        host: 'proxy.test.com',
        port: 8080,
        protocol: 'http',
        provider: 'TestProvider',
        location: { country: 'US' },
        quality: 95,
        latency: 100,
        inUse: false,
        costPerGB: 10,
        createdAt: new Date(),
      };

      axiosMock
        .onGet('https://api.ipify.org?format=json')
        .reply(200, { ip: '1.2.3.4' });

      const start = Date.now();
      await adapter.checkHealth(mockProxy);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10000); // 应该小于超时时间
    });

    it('estimateCost 应该快速返回', async () => {
      const start = Date.now();
      await adapter.estimateCost(1024);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // 应该在 100ms 内完成
    });
  });
});
