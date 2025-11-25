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
 * 官方文档: https://docs.brightdata.com/proxy-networks/config-options
 *
 * 特点：
 * - 企业级质量 ($3-15/GB)
 * - 7200万+ 住宅IP
 * - 支持全球195个国家
 * - 99.99% 正常运行时间
 * - 高级定位（国家/城市/州/邮编/ASN）
 * - 会话保持: 7分钟空闲超时自动释放
 *
 * 代理端点:
 * - 主机: brd.superproxy.io
 * - 端口: 33335
 *
 * 用户名格式:
 * brd-customer-[CUSTOMER_ID]-zone-[ZONE]-country-xx-state-xx-city-xx-session-xxx
 *
 * 支持的参数:
 * - country: ISO-3166 国家代码 (如 us, cn, jp)
 * - state: 州代码 (需要 country-us，如 california)
 * - city: 城市名 (无空格，如 los_angeles)
 * - zip: 美国邮编 (仅限美国)
 * - asn: ASN 号码
 * - session: 会话ID (仅字母数字，同一session保持同一IP)
 */
@Injectable()
export class BrightDataAdapter extends BaseProxyAdapter {
  private zone: string;
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
   * Bright Data 使用超级代理网关模式：
   * - 端点: brd.superproxy.io:33335
   * - 通过用户名参数控制代理行为和地理位置
   *
   * 用户名参数格式:
   * brd-customer-{id}-zone-{zone}-country-{cc}-state-{state}-city-{city}-session-{id}
   */
  async getProxyList(options?: GetProxyOptions): Promise<ProxyInfo[]> {
    this.ensureInitialized();

    try {
      // Bright Data 超级代理端点 (官方文档: 33335)
      const superProxyHost = 'brd.superproxy.io';
      const superProxyPort = 33335;

      // 从配置读取默认参数
      const cfg = this.config as any;
      const defaultCountry = cfg.defaultCountry || cfg.extra?.defaultCountry;
      const defaultState = cfg.defaultState || cfg.extra?.defaultState;
      const defaultCity = cfg.defaultCity || cfg.extra?.defaultCity;
      const defaultZip = cfg.defaultZip || cfg.extra?.defaultZip;
      const defaultAsn = cfg.defaultAsn || cfg.extra?.defaultAsn;
      const defaultSessionMode = cfg.sessionMode || cfg.extra?.sessionMode;

      // 基础用户名 (应该已经包含 brd-customer-xxx-zone-xxx 格式)
      let username = this.config.username || '';

      // 获取实际使用的参数 (options 优先，其次配置默认值)
      const country = options?.country || defaultCountry;
      const state = options?.state || defaultState;
      const city = options?.city || defaultCity;
      const zip = (options as any)?.zip || defaultZip;
      const asn = (options as any)?.asn || defaultAsn;
      const sessionMode = options?.session || defaultSessionMode;

      // 添加国家参数 (必须在 state/city/zip 之前)
      if (country) {
        username += `-country-${country.toLowerCase()}`;
      }

      // 添加州参数 (仅限美国，需要 country-us)
      if (state && country?.toLowerCase() === 'us') {
        const stateSlug = state.toLowerCase().replace(/\s+/g, '_');
        username += `-state-${stateSlug}`;
      }

      // 添加城市参数
      if (city) {
        const citySlug = city.toLowerCase().replace(/\s+/g, '_');
        username += `-city-${citySlug}`;
      }

      // 添加邮编参数 (仅限美国)
      if (zip && country?.toLowerCase() === 'us') {
        username += `-zip-${zip}`;
      }

      // 添加 ASN 参数 (仅限住宅代理)
      if (asn) {
        username += `-asn-${asn}`;
      }

      // 生成代理列表
      const limit = options?.limit || 100;
      const proxies: ProxyInfo[] = [];

      for (let i = 0; i < limit; i++) {
        let proxyUsername = username;

        // 添加会话参数 (粘性会话)
        // 注意: BrightData session ID 只能包含字母数字，不能有特殊字符
        if (sessionMode === 'sticky') {
          const sessId = this.generateSessionId();
          proxyUsername += `-session-${sessId}`;
        }

        const proxyId = `brightdata-${Date.now()}-${i}`;

        const proxy: ProxyInfo = {
          id: proxyId,
          host: superProxyHost,
          port: superProxyPort,
          username: proxyUsername,
          password: this.config.password,
          protocol: (options?.protocol || 'http') as 'http' | 'https' | 'socks5',
          provider: 'brightdata',
          location: {
            country: country?.toUpperCase() || 'ANY',
            state: state,
            city: city,
          },
          quality: 95, // Bright Data 质量很高
          latency: 0,
          inUse: false,
          failureCount: 0,
          costPerGB: this.config.costPerGB,
          metadata: {
            zone: this.zone,
            superProxy: true,
            sessionMode: sessionMode,
          },
          createdAt: new Date(),
        };

        proxies.push(proxy);
        this.proxyCache.set(proxy.id, proxy);
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
   * 生成会话ID
   * 注意: BrightData 要求 session ID 只能包含字母数字，不能有特殊字符如 - 或 *
   */
  private generateSessionId(): string {
    // 使用字母数字组合，不包含特殊字符
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}${random}`;
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
