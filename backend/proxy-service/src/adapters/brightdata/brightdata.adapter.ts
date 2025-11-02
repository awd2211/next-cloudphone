import { Injectable } from '@nestjs/common';
import { BaseProxyAdapter } from '../base/base.adapter';
import {
  ProxyInfo,
  GetProxyOptions,
  ProxyUsageStats,
  Region,
  ProviderConfig,
} from '../../common/interfaces';

/**
 * Bright Data (原 Luminati) 代理供应商适配器
 *
 * 特点：
 * - 企业级质量 ($3-15/GB)
 * - 7200万+ 住宅IP
 * - 支持全球195个国家
 * - 99.99% 正常运行时间
 * - 高级定位（国家/城市/州/ASN/运营商）
 * - 会话保持时间：1-60分钟可配置
 */
@Injectable()
export class BrightDataAdapter extends BaseProxyAdapter {
  private zone: string; // Bright Data 的 zone 概念
  private proxyCache: Map<string, ProxyInfo> = new Map();

  constructor() {
    super('BrightData');
  }

  /**
   * 初始化 Bright Data 适配器
   */
  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);

    // 从配置中获取 zone
    this.zone = config.extra?.zone || 'residential';

    // 测试连接
    const connected = await this.testConnection();
    if (!connected) {
      this.logger.warn('Failed to connect to Bright Data API during initialization');
    }
  }

  /**
   * 测试 Bright Data API 连接
   */
  async testConnection(): Promise<boolean> {
    try {
      this.ensureInitialized();

      // 测试获取 zone 配置
      const response = await this.httpClient.get('/zone');

      if (response.status === 200) {
        this.logger.log('Bright Data API connection successful');
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Bright Data connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取代理列表
   *
   * Bright Data 使用不同的模式：
   * - 超级代理模式：通过单个主机+端口访问，通过用户名控制参数
   * - Zone模式：配置zone后获取IP池
   */
  async getProxyList(options?: GetProxyOptions): Promise<ProxyInfo[]> {
    this.ensureInitialized();

    try {
      const startTime = Date.now();

      // Bright Data 的超级代理配置
      const superProxyHost = 'brd.superproxy.io';
      const superProxyPort = 22225;

      // 构建用户名参数（Bright Data 通过用户名控制代理行为）
      let username = this.config.username || '';

      // 添加会话保持
      if (options?.session === 'sticky') {
        username += `-session-${this.generateSessionId()}`;
      }

      // 添加国家参数
      if (options?.country) {
        username += `-country-${options.country.toLowerCase()}`;
      }

      // 添加城市参数
      if (options?.city) {
        username += `-city-${options.city.toLowerCase().replace(/\s+/g, '_')}`;
      }

      // 生成代理列表
      const limit = options?.limit || 100;
      const proxies: ProxyInfo[] = [];

      // Bright Data 使用超级代理模式，每个请求可以使用不同的会话
      for (let i = 0; i < limit; i++) {
        const sessionId = this.generateSessionId();
        const proxyInfo = this.createProxyInfo(
          superProxyHost,
          superProxyPort,
          username,
          sessionId,
          options,
        );
        proxies.push(proxyInfo);
        this.proxyCache.set(proxyInfo.id, proxyInfo);
      }

      this.logger.log(`Generated ${proxies.length} Bright Data proxy configurations`);

      return proxies;
    } catch (error) {
      this.logger.error(`Failed to get proxy list: ${error.message}`);
      throw error;
    }
  }

  /**
   * 刷新代理池
   */
  async refreshPool(minSize = 100): Promise<number> {
    this.ensureInitialized();

    try {
      const currentSize = this.proxyCache.size;

      if (currentSize >= minSize) {
        this.logger.debug(`Proxy pool size (${currentSize}) meets minimum requirement (${minSize})`);
        return 0;
      }

      const needed = minSize - currentSize;
      const proxies = await this.getProxyList({ limit: needed });

      this.logger.log(`Refreshed proxy pool with ${proxies.length} new proxies`);

      return proxies.length;
    } catch (error) {
      this.logger.error(`Failed to refresh proxy pool: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取使用统计
   */
  async getUsageStats(startDate?: Date, endDate?: Date): Promise<ProxyUsageStats> {
    this.ensureInitialized();

    try {
      const params: any = {
        zone: this.zone,
      };

      if (startDate) {
        params.from = startDate.toISOString().split('T')[0];
      }

      if (endDate) {
        params.to = endDate.toISOString().split('T')[0];
      }

      const response = await this.httpClient.get('/api/stats', { params });

      if (response.status !== 200 || !response.data) {
        throw new Error('Failed to get usage stats from Bright Data');
      }

      const data = response.data;

      // Bright Data 返回的统计格式
      const totalBandwidthGB = (data.bandwidth || 0) / (1024 * 1024 * 1024); // 字节转GB
      const totalBandwidthMB = totalBandwidthGB * 1024;
      const totalRequests = data.requests || 0;
      const successfulRequests = data.success || 0;
      const failedRequests = totalRequests - successfulRequests;

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
        totalBandwidthMB,
        totalCost: totalBandwidthGB * this.config.costPerGB,
        averageLatency: data.avg_latency || 0,
        avgCostPerRequest: totalRequests > 0
          ? (totalBandwidthGB * this.config.costPerGB) / totalRequests
          : 0,
        avgCostPerGB: this.config.costPerGB,
        periodStart: startDate || new Date(),
        periodEnd: endDate || new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get usage stats: ${error.message}`);

      // 返回空统计
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 0,
        totalBandwidthMB: 0,
        totalCost: 0,
        averageLatency: 0,
        avgCostPerRequest: 0,
        avgCostPerGB: this.config.costPerGB,
        periodStart: startDate || new Date(),
        periodEnd: endDate || new Date(),
      };
    }
  }

  /**
   * 获取可用地区列表
   */
  async getAvailableRegions(): Promise<Region[]> {
    this.ensureInitialized();

    try {
      const response = await this.httpClient.get('/api/zone/route');

      if (response.status !== 200 || !response.data) {
        throw new Error('Failed to get regions from Bright Data');
      }

      const regions: Region[] = [];
      const data = response.data;

      // Bright Data 返回国家列表
      if (data.countries) {
        for (const [countryCode, countryData] of Object.entries(data.countries as any)) {
          regions.push({
            country: countryCode,
            countryName: (countryData as any).name || countryCode,
            cities: (countryData as any).cities || [],
            states: (countryData as any).states || [],
            availableProxies: (countryData as any).ips || 0,
            costPerGB: this.config.costPerGB,
          });
        }
      }

      this.logger.log(`Retrieved ${regions.length} regions from Bright Data`);

      return regions;
    } catch (error) {
      this.logger.error(`Failed to get regions: ${error.message}`);

      // 返回默认地区作为后备
      return this.getDefaultRegions();
    }
  }

  /**
   * 创建代理信息对象
   */
  private createProxyInfo(
    host: string,
    port: number,
    baseUsername: string,
    sessionId: string,
    options?: GetProxyOptions,
  ): ProxyInfo {
    const proxyId = `brightdata-${sessionId}`;

    // 构建完整的用户名（包含会话ID）
    const username = `${baseUsername}-session-${sessionId}`;

    return {
      id: proxyId,
      host,
      port,
      username,
      password: this.config.password,
      protocol: (options?.protocol || 'http') as 'http' | 'https' | 'socks5',
      provider: 'brightdata',
      location: {
        country: options?.country || 'US',
        city: options?.city,
      },
      quality: 95, // Bright Data 质量很高
      latency: 0,
      inUse: false,
      failureCount: 0,
      costPerGB: this.config.costPerGB,
      sessionId,
      metadata: {
        zone: this.zone,
        superProxy: true,
      },
      createdAt: new Date(),
    };
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * 获取默认地区列表
   */
  private getDefaultRegions(): Region[] {
    const popularCountries = [
      { code: 'US', name: 'United States' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'DE', name: 'Germany' },
      { code: 'FR', name: 'France' },
      { code: 'CA', name: 'Canada' },
      { code: 'AU', name: 'Australia' },
      { code: 'JP', name: 'Japan' },
      { code: 'KR', name: 'South Korea' },
      { code: 'SG', name: 'Singapore' },
      { code: 'BR', name: 'Brazil' },
      { code: 'IN', name: 'India' },
      { code: 'MX', name: 'Mexico' },
      { code: 'IT', name: 'Italy' },
      { code: 'ES', name: 'Spain' },
      { code: 'NL', name: 'Netherlands' },
    ];

    return popularCountries.map((country) => ({
      country: country.code,
      countryName: country.name,
      costPerGB: this.config.costPerGB,
    }));
  }

  /**
   * 获取缓存的代理
   */
  getCachedProxy(proxyId: string): ProxyInfo | undefined {
    return this.proxyCache.get(proxyId);
  }

  /**
   * 清除代理缓存
   */
  clearCache(): void {
    this.proxyCache.clear();
    this.logger.log('Proxy cache cleared');
  }
}
