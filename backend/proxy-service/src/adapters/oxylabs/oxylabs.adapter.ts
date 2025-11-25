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
 * Oxylabs 代理供应商适配器
 *
 * 特点：
 * - 企业级质量 ($10-15/GB)
 * - 1亿+ 住宅IP
 * - 支持全球195个国家
 * - 99.95% 成功率
 * - 支持数据中心和住宅代理
 * - 会话保持时间：10-30分钟
 * - 24/7技术支持
 */
@Injectable()
export class OxylabsAdapter extends BaseProxyAdapter {
  private proxyType: 'residential' | 'datacenter' = 'residential';
  private proxyCache: Map<string, ProxyInfo> = new Map();

  constructor() {
    super('Oxylabs');
  }

  /**
   * 初始化 Oxylabs 适配器
   */
  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);

    // 从配置中获取代理类型
    this.proxyType = config.extra?.proxyType || 'residential';

    // 测试连接
    const connected = await this.testConnection();
    if (!connected) {
      this.logger.warn('Failed to connect to Oxylabs API during initialization');
    }
  }

  /**
   * 测试 Oxylabs API 连接
   */
  async testConnection(): Promise<boolean> {
    try {
      this.ensureInitialized();

      // 测试获取账户信息
      const response = await this.httpClient.get('/v1/user');

      if (response.status === 200) {
        this.logger.log('Oxylabs API connection successful');
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Oxylabs connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取代理列表
   *
   * Oxylabs 使用网关模式：
   * - 住宅代理：pr.oxylabs.io:7777
   * - 数据中心代理：dc.oxylabs.io:8001
   * - 通过用户名参数控制地理位置和会话
   *
   * 用户名参数格式：
   * customer-{username}-cc-{country}-st-{state}-city-{city}-sessid-{id}-sesstime-{minutes}
   *
   * 参数说明：
   * - cc: 国家代码 (ISO 3166-1 alpha-2，如 US, DE, JP)
   * - st: 州/省 (格式: us_california, us_illinois)
   * - city: 城市 (格式: los_angeles, new_york)
   * - sessid: 会话ID (字母数字字符串，保持同一IP)
   * - sesstime: 会话时长 (1-1440分钟，默认10分钟)
   */
  async getProxyList(options?: GetProxyOptions): Promise<ProxyInfo[]> {
    this.ensureInitialized();

    try {
      // 根据代理类型选择主机和端口
      const host = this.proxyType === 'residential'
        ? 'pr.oxylabs.io'
        : 'dc.oxylabs.io';
      const port = this.proxyType === 'residential' ? 7777 : 8001;

      // 从配置读取默认参数
      const cfg = this.config as any;
      const defaultCountry = cfg.defaultCountry || cfg.extra?.defaultCountry;
      const defaultState = cfg.defaultState || cfg.extra?.defaultState;
      const defaultCity = cfg.defaultCity || cfg.extra?.defaultCity;
      const defaultSessionMode = cfg.sessionMode || cfg.extra?.sessionMode;
      const defaultSessionDuration = cfg.sessionDuration || cfg.extra?.sessionDuration || 10;

      // 构建用户名参数
      let username = `customer-${this.config.username}`;

      // 获取实际使用的参数（options 优先，其次配置默认值）
      const country = options?.country || defaultCountry;
      const state = options?.state || defaultState;
      const city = options?.city || defaultCity;
      const sessionMode = options?.session || defaultSessionMode;
      const sessionDuration = options?.sessionDuration || defaultSessionDuration;

      // 添加州参数 (st-us_california 格式)
      // 注意：州参数和国家参数是互斥的，州已包含国家信息
      if (state) {
        const stateSlug = state.toLowerCase().replace(/\s+/g, '_');
        username += `-st-${stateSlug}`;
      } else if (country) {
        // 添加国家参数 (cc-US 格式)
        username += `-cc-${country.toUpperCase()}`;
      }

      // 添加城市参数（仅住宅代理支持）
      if (city && this.proxyType === 'residential') {
        const citySlug = city.toLowerCase().replace(/\s+/g, '_');
        username += `-city-${citySlug}`;
      }

      // 生成代理列表
      const limit = options?.limit || 100;
      const proxies: ProxyInfo[] = [];

      for (let i = 0; i < limit; i++) {
        let proxyUsername = username;

        // 添加会话参数（粘性会话）
        if (sessionMode === 'sticky') {
          const sessId = this.generateSessionId();
          proxyUsername += `-sessid-${sessId}`;
          // 会话时长限制在 1-1440 分钟
          const sessTime = Math.min(Math.max(sessionDuration, 1), 1440);
          proxyUsername += `-sesstime-${sessTime}`;
        }

        const proxyId = `oxylabs-${Date.now()}-${i}`;

        const proxy: ProxyInfo = {
          id: proxyId,
          host,
          port,
          username: proxyUsername,
          password: this.config.password,
          protocol: (options?.protocol || 'http') as 'http' | 'https' | 'socks5',
          provider: 'oxylabs',
          location: {
            country: country?.toUpperCase() || 'ANY',
            state: state,
            city: city,
          },
          quality: 92, // Oxylabs 质量很高
          latency: 0,
          inUse: false,
          failureCount: 0,
          costPerGB: this.config.costPerGB,
          metadata: {
            proxyType: this.proxyType,
            gateway: true,
            sessionMode: sessionMode,
          },
          createdAt: new Date(),
        };

        proxies.push(proxy);
        this.proxyCache.set(proxy.id, proxy);
      }

      this.logger.log(`Generated ${proxies.length} Oxylabs proxy configurations`);

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
      const params: any = {};

      if (startDate) {
        params.date_from = startDate.toISOString().split('T')[0];
      }

      if (endDate) {
        params.date_to = endDate.toISOString().split('T')[0];
      }

      const response = await this.httpClient.get('/v1/traffic', { params });

      if (response.status !== 200 || !response.data) {
        throw new Error('Failed to get usage stats from Oxylabs');
      }

      const data = response.data;

      // Oxylabs 返回的统计格式
      const totalBandwidthGB = (data.traffic || 0) / (1024 * 1024 * 1024); // 字节转GB
      const totalBandwidthMB = totalBandwidthGB * 1024;
      const totalRequests = data.queries || 0;
      const successfulRequests = data.successful || 0;
      const failedRequests = totalRequests - successfulRequests;

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
        totalBandwidthMB,
        totalCost: totalBandwidthGB * this.config.costPerGB,
        averageLatency: data.avg_response_time || 0,
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
      const response = await this.httpClient.get('/v1/locations');

      if (response.status !== 200 || !response.data) {
        throw new Error('Failed to get regions from Oxylabs');
      }

      const regions: Region[] = [];
      const data = response.data.countries || response.data;

      if (Array.isArray(data)) {
        for (const country of data) {
          regions.push({
            country: country.code,
            countryName: country.name,
            cities: country.cities || [],
            availableProxies: country.ip_count || 0,
            costPerGB: this.config.costPerGB,
          });
        }
      }

      this.logger.log(`Retrieved ${regions.length} regions from Oxylabs`);

      return regions;
    } catch (error) {
      this.logger.error(`Failed to get regions: ${error.message}`);

      // 返回默认地区作为后备
      return this.getDefaultRegions();
    }
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
      { code: 'SE', name: 'Sweden' },
      { code: 'PL', name: 'Poland' },
      { code: 'BE', name: 'Belgium' },
      { code: 'CH', name: 'Switzerland' },
      { code: 'AT', name: 'Austria' },
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

  /**
   * 切换代理类型
   */
  switchProxyType(type: 'residential' | 'datacenter'): void {
    this.proxyType = type;
    this.logger.log(`Switched proxy type to: ${type}`);
    this.clearCache(); // 清除缓存以使用新类型
  }

  /**
   * 获取当前代理类型
   */
  getProxyType(): 'residential' | 'datacenter' {
    return this.proxyType;
  }
}
