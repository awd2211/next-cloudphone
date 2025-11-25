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
 * IPRoyal 代理供应商适配器
 *
 * 官方文档: https://docs.iproyal.com/proxies/residential/proxy
 *
 * 特点：
 * - 价格实惠 ($1.75/GB)
 * - 支持住宅和数据中心代理
 * - 会话保持时间: 1秒到7天可配置
 * - 支持 region/country/state/city/isp 多级定位
 *
 * 代理端点:
 * - 主机: geo.iproyal.com
 * - 端口: 12321
 *
 * 认证格式 (网关模式):
 * - 用户名: 账户用户名
 * - 密码: password_country-xx_state-xx_city-xx_session-xxxxxxxx_lifetime-10m
 *
 * 密码参数:
 * - _region-: 大区 (africa, europe, northamerica, asiapacific, etc.)
 * - _country-: ISO-3166 国家代码 (us, gb, de)，支持多选用逗号分隔
 * - _state-: 州名 (仅限美国，如 iowa, california)
 * - _city-: 城市名 (如 berlin, tokyo)
 * - _isp-: ISP 名称
 * - _session-: 会话ID (必须8位字母数字)
 * - _lifetime-: 会话时长 (1s-7d，如 10m, 2h, 1d)
 * - _forcerandom-1: 强制随机轮换
 */
@Injectable()
export class IPRoyalAdapter extends BaseProxyAdapter {
  private proxyCache: Map<string, ProxyInfo> = new Map();

  constructor() {
    super('IPRoyal');
  }

  /**
   * 初始化 IPRoyal 适配器
   */
  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);

    // 测试连接
    const connected = await this.testConnection();
    if (!connected) {
      this.logger.warn('Failed to connect to IPRoyal during initialization');
    }
  }

  /**
   * 测试 IPRoyal 连接
   * IPRoyal 使用网关模式，通过实际代理请求测试
   */
  async testConnection(): Promise<boolean> {
    try {
      this.ensureInitialized();
      // 网关模式无需API测试，在 getProxyList 中实际使用时验证
      this.logger.log('IPRoyal adapter initialized (gateway mode)');
      return true;
    } catch (error) {
      this.logger.error(`IPRoyal initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取代理列表
   *
   * IPRoyal 使用网关模式：
   * - 端点: geo.iproyal.com:12321
   * - 通过密码参数控制地理位置和会话
   *
   * 密码格式:
   * {password}_country-{cc}_state-{state}_city-{city}_session-{8chars}_lifetime-{duration}
   */
  async getProxyList(options?: GetProxyOptions): Promise<ProxyInfo[]> {
    this.ensureInitialized();

    try {
      // IPRoyal 网关端点
      const proxyHost = 'geo.iproyal.com';
      const proxyPort = 12321;

      // 从配置读取默认参数
      const cfg = this.config as any;
      const defaultRegion = cfg.defaultRegion || cfg.extra?.defaultRegion;
      const defaultCountry = cfg.defaultCountry || cfg.extra?.defaultCountry;
      const defaultState = cfg.defaultState || cfg.extra?.defaultState;
      const defaultCity = cfg.defaultCity || cfg.extra?.defaultCity;
      const defaultIsp = cfg.defaultIsp || cfg.extra?.defaultIsp;
      const defaultSessionMode = cfg.sessionMode || cfg.extra?.sessionMode;
      const defaultLifetime = cfg.sessionLifetime || cfg.extra?.sessionLifetime || '10m';

      // 基础密码
      let password = this.config.password || '';

      // 获取实际使用的参数 (options 优先，其次配置默认值)
      const region = (options as any)?.region || defaultRegion;
      const country = options?.country || defaultCountry;
      const state = options?.state || defaultState;
      const city = options?.city || defaultCity;
      const isp = (options as any)?.isp || defaultIsp;
      const sessionMode = options?.session || defaultSessionMode;
      const lifetime = (options as any)?.lifetime || defaultLifetime;

      // 添加大区参数
      if (region) {
        password += `_region-${region.toLowerCase()}`;
      }

      // 添加国家参数 (支持多选: us,gb,de)
      if (country) {
        password += `_country-${country.toLowerCase()}`;
      }

      // 添加州参数 (仅限美国)
      if (state && country?.toLowerCase() === 'us') {
        const stateSlug = state.toLowerCase().replace(/\s+/g, '');
        password += `_state-${stateSlug}`;
      }

      // 添加城市参数 (需要先指定国家)
      if (city && country) {
        const citySlug = city.toLowerCase().replace(/\s+/g, '');
        password += `_city-${citySlug}`;
      }

      // 添加 ISP 参数 (需要先指定城市)
      if (isp && city) {
        const ispSlug = isp.toLowerCase().replace(/\s+/g, '');
        password += `_isp-${ispSlug}`;
      }

      // 生成代理列表
      const limit = options?.limit || 100;
      const proxies: ProxyInfo[] = [];

      for (let i = 0; i < limit; i++) {
        let proxyPassword = password;

        // 添加会话参数 (粘性会话)
        if (sessionMode === 'sticky') {
          // IPRoyal 要求 session ID 必须是 8 位字母数字
          const sessId = this.generateSessionId();
          proxyPassword += `_session-${sessId}`;
          // 添加会话时长
          proxyPassword += `_lifetime-${lifetime}`;
        } else if (sessionMode === 'rotating') {
          // 强制随机轮换
          proxyPassword += '_forcerandom-1';
        }

        const proxyId = `iproyal-${Date.now()}-${i}`;

        const proxy: ProxyInfo = {
          id: proxyId,
          host: proxyHost,
          port: proxyPort,
          username: this.config.username,
          password: proxyPassword,
          protocol: (options?.protocol || 'http') as 'http' | 'https' | 'socks5',
          provider: 'iproyal',
          location: {
            country: country?.toUpperCase() || 'ANY',
            state: state,
            city: city,
          },
          quality: 85, // IPRoyal 质量较高
          latency: 0,
          inUse: false,
          failureCount: 0,
          costPerGB: this.config.costPerGB,
          metadata: {
            gateway: true,
            region: region,
            isp: isp,
            sessionMode: sessionMode,
            lifetime: sessionMode === 'sticky' ? lifetime : undefined,
          },
          createdAt: new Date(),
        };

        proxies.push(proxy);
        this.proxyCache.set(proxy.id, proxy);
      }

      this.logger.log(`Generated ${proxies.length} IPRoyal proxy configurations`);

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
   * 注意: IPRoyal API 需要账户验证或消费超过 $200
   */
  async getUsageStats(startDate?: Date, endDate?: Date): Promise<ProxyUsageStats> {
    this.ensureInitialized();

    // IPRoyal 网关模式不提供直接的统计 API
    // 返回空统计，实际统计需要在控制台查看
    this.logger.warn('IPRoyal usage stats require dashboard access');

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
    // IPRoyal 网关模式不提供地区 API，返回默认列表
    return this.getDefaultRegions();
  }

  /**
   * 生成会话ID
   * 注意: IPRoyal 要求 session ID 必须是精确 8 位字母数字
   */
  private generateSessionId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 获取默认地区列表
   */
  private getDefaultRegions(): Region[] {
    const regions = [
      // 大区
      { code: 'europe', name: 'Europe (Region)' },
      { code: 'northamerica', name: 'North America (Region)' },
      { code: 'asiapacific', name: 'Asia Pacific (Region)' },
      { code: 'southlatinamerica', name: 'South/Latin America (Region)' },
      { code: 'middleeast', name: 'Middle East (Region)' },
      { code: 'africa', name: 'Africa (Region)' },
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
