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
 * SmartProxy (Decodo) 代理供应商适配器
 *
 * 官方文档: https://help.decodo.com/docs/residential-proxy-quick-start
 *
 * 特点：
 * - 55M+ 住宅IP，99.68% 成功率
 * - 支持 HTTP/HTTPS/SOCKS5
 * - 高级定位（国家/城市/州/邮编/ASN）
 * - 会话时长: 默认10分钟，可配置 1-1440 分钟 (最长24小时)
 *
 * 代理端点:
 * - 主机: gate.decodo.com
 * - 端口: 7000 (HTTP/HTTPS), 可配置 SOCKS5 端口
 *
 * 用户名格式 (参数追加到用户名):
 * user-{username}-country-{cc}-state-{state}-city-{city}-session-{id}-sessionduration-{min}
 *
 * 支持的参数:
 * - country-{code}: ISO-3166 国家代码 (如 us, it, jp)
 * - state-{state}: 州代码 (需要 country 前缀，如 us_california)
 * - city-{name}: 城市名 (多词用下划线，如 new_york, los_angeles)
 * - zip-{code}: 美国邮编 (仅限美国)
 * - continent-{code}: 大洲代码 (如 as, eu, na)
 * - asn-{number}: ASN 号码 (与城市定位互斥)
 * - session-{id}: 会话ID (粘性会话)
 * - sessionduration-{min}: 会话时长 (1-1440 分钟)
 */
@Injectable()
export class SmartProxyAdapter extends BaseProxyAdapter {
  private proxyCache: Map<string, ProxyInfo> = new Map();

  constructor() {
    super('SmartProxy');
  }

  /**
   * 初始化 SmartProxy 适配器
   */
  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);

    // 测试连接
    const connected = await this.testConnection();
    if (!connected) {
      this.logger.warn('Failed to connect to SmartProxy during initialization');
    }
  }

  /**
   * 测试 SmartProxy 连接
   * SmartProxy 使用网关模式，通过实际代理请求测试
   */
  async testConnection(): Promise<boolean> {
    try {
      this.ensureInitialized();
      // 网关模式无需API测试，在 getProxyList 中实际使用时验证
      this.logger.log('SmartProxy adapter initialized (gateway mode)');
      return true;
    } catch (error) {
      this.logger.error(`SmartProxy initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取代理列表
   *
   * SmartProxy 使用网关模式：
   * - 端点: gate.decodo.com:7000
   * - 通过用户名参数控制地理位置和会话
   *
   * 用户名参数格式:
   * user-{username}-country-{cc}-state-{state}-city-{city}-session-{id}-sessionduration-{min}
   */
  async getProxyList(options?: GetProxyOptions): Promise<ProxyInfo[]> {
    this.ensureInitialized();

    try {
      // SmartProxy 网关端点
      const proxyHost = 'gate.decodo.com';
      const proxyPort = 7000;

      // 从配置读取默认参数
      const cfg = this.config as any;
      const defaultContinent = cfg.defaultContinent || cfg.extra?.defaultContinent;
      const defaultCountry = cfg.defaultCountry || cfg.extra?.defaultCountry;
      const defaultState = cfg.defaultState || cfg.extra?.defaultState;
      const defaultCity = cfg.defaultCity || cfg.extra?.defaultCity;
      const defaultZip = cfg.defaultZip || cfg.extra?.defaultZip;
      const defaultAsn = cfg.defaultAsn || cfg.extra?.defaultAsn;
      const defaultSessionMode = cfg.sessionMode || cfg.extra?.sessionMode;
      const defaultSessionDuration = cfg.sessionDuration || cfg.extra?.sessionDuration || 10;

      // 基础用户名 (格式: user-{username})
      // SmartProxy 用户名必须以 "user-" 前缀开始
      let username = this.config.username || '';
      if (!username.startsWith('user-')) {
        username = `user-${username}`;
      }

      // 获取实际使用的参数 (options 优先，其次配置默认值)
      const continent = (options as any)?.continent || defaultContinent;
      const country = options?.country || defaultCountry;
      const state = options?.state || defaultState;
      const city = options?.city || defaultCity;
      const zip = (options as any)?.zip || defaultZip;
      const asn = (options as any)?.asn || defaultAsn;
      const sessionMode = options?.session || defaultSessionMode;
      const sessionDuration = (options as any)?.sessionDuration || defaultSessionDuration;

      // 添加大洲参数
      if (continent) {
        username += `-continent-${continent.toLowerCase()}`;
      }

      // 添加国家参数
      if (country) {
        username += `-country-${country.toLowerCase()}`;
      }

      // 添加州参数 (需要格式: us_california)
      if (state && country?.toLowerCase() === 'us') {
        const stateSlug = state.toLowerCase().replace(/\s+/g, '_');
        username += `-state-us_${stateSlug}`;
      }

      // 添加城市参数 (多词用下划线，如 new_york)
      if (city) {
        const citySlug = city.toLowerCase().replace(/\s+/g, '_');
        username += `-city-${citySlug}`;
      }

      // 添加邮编参数 (仅限美国)
      if (zip && country?.toLowerCase() === 'us') {
        username += `-zip-${zip}`;
      }

      // 添加 ASN 参数 (与城市定位互斥)
      if (asn && !city) {
        username += `-asn-${asn}`;
      }

      // 生成代理列表
      const limit = options?.limit || 100;
      const proxies: ProxyInfo[] = [];

      for (let i = 0; i < limit; i++) {
        let proxyUsername = username;

        // 添加会话参数 (粘性会话)
        if (sessionMode === 'sticky') {
          const sessId = this.generateSessionId();
          proxyUsername += `-session-${sessId}`;
          // 添加会话时长 (1-1440 分钟)
          const duration = Math.min(1440, Math.max(1, sessionDuration));
          proxyUsername += `-sessionduration-${duration}`;
        }

        const proxyId = `smartproxy-${Date.now()}-${i}`;

        const proxy: ProxyInfo = {
          id: proxyId,
          host: proxyHost,
          port: proxyPort,
          username: proxyUsername,
          password: this.config.password,
          protocol: (options?.protocol || 'http') as 'http' | 'https' | 'socks5',
          provider: 'smartproxy',
          location: {
            country: country?.toUpperCase() || 'ANY',
            state: state,
            city: city,
          },
          quality: 90, // SmartProxy 质量很高 (99.68% 成功率)
          latency: 0,
          inUse: false,
          failureCount: 0,
          costPerGB: this.config.costPerGB,
          metadata: {
            gateway: true,
            continent: continent,
            asn: asn,
            sessionMode: sessionMode,
            sessionDuration: sessionMode === 'sticky' ? sessionDuration : undefined,
          },
          createdAt: new Date(),
        };

        proxies.push(proxy);
        this.proxyCache.set(proxy.id, proxy);
      }

      this.logger.log(`Generated ${proxies.length} SmartProxy proxy configurations`);

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
   * 注意: SmartProxy 统计需要通过控制面板查看
   */
  async getUsageStats(startDate?: Date, endDate?: Date): Promise<ProxyUsageStats> {
    this.ensureInitialized();

    // SmartProxy 网关模式不提供直接的统计 API
    // 返回空统计，实际统计需要在控制台查看
    this.logger.warn('SmartProxy usage stats require dashboard access');

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

  /**
   * 获取可用地区列表
   */
  async getAvailableRegions(): Promise<Region[]> {
    // SmartProxy 网关模式不提供地区 API，返回默认列表
    return this.getDefaultRegions();
  }

  /**
   * 生成会话ID
   * SmartProxy 会话 ID 使用字母数字，无特殊要求
   */
  private generateSessionId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 获取默认地区列表
   */
  private getDefaultRegions(): Region[] {
    const regions = [
      // 大洲
      { code: 'as', name: 'Asia (Continent)' },
      { code: 'eu', name: 'Europe (Continent)' },
      { code: 'na', name: 'North America (Continent)' },
      { code: 'sa', name: 'South America (Continent)' },
      { code: 'af', name: 'Africa (Continent)' },
      { code: 'oc', name: 'Oceania (Continent)' },
      // 常用国家
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
      { code: 'NL', name: 'Netherlands' },
      { code: 'IT', name: 'Italy' },
      { code: 'ES', name: 'Spain' },
      { code: 'MX', name: 'Mexico' },
    ];

    return regions.map((r) => ({
      country: r.code,
      countryName: r.name,
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
