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
 * 特点：
 * - 价格实惠 ($1.75/GB)
 * - 支持住宅和数据中心代理
 * - 会话保持时间：10-30分钟
 * - 支持国家和城市级别定位
 */
@Injectable()
export class IPRoyalAdapter extends BaseProxyAdapter {
  private readonly API_VERSION = 'v1';
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
      this.logger.warn('Failed to connect to IPRoyal API during initialization');
    }
  }

  /**
   * 测试 IPRoyal API 连接
   */
  async testConnection(): Promise<boolean> {
    try {
      this.ensureInitialized();

      // IPRoyal 没有专门的健康检查端点，我们尝试获取账户信息
      const response = await this.httpClient.get('/account/balance');

      if (response.status === 200) {
        this.logger.log('IPRoyal API connection successful');
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`IPRoyal connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取代理列表
   */
  async getProxyList(options?: GetProxyOptions): Promise<ProxyInfo[]> {
    this.ensureInitialized();

    try {
      const startTime = Date.now();

      // 构建请求参数
      const params: any = {
        format: 'json',
        rotation: options?.session === 'sticky' ? 'session' : 'rotating',
        limit: options?.limit || 100,
      };

      if (options?.country) {
        params.country = options.country;
      }

      if (options?.city) {
        params.city = options.city;
      }

      if (options?.protocol) {
        params.protocol = options.protocol;
      }

      // 调用 IPRoyal API
      const response = await this.httpClient.post('/generate-proxy-list', params);
      const apiResponse = this.handleAPIResponse(response, startTime);

      if (!apiResponse.success || !apiResponse.data) {
        this.logger.error('Failed to get proxy list from IPRoyal');
        return [];
      }

      // 转换为标准 ProxyInfo 格式
      const proxies = Array.isArray(apiResponse.data)
        ? apiResponse.data
        : (apiResponse.data as any)?.proxies || [];

      const proxyInfoList = proxies.map((item: any) =>
        this.mapToProxyInfo(item)
      );

      // 缓存代理信息
      proxyInfoList.forEach((proxy) => {
        this.proxyCache.set(proxy.id, proxy);
      });

      this.logger.log(`Retrieved ${proxyInfoList.length} proxies from IPRoyal`);

      return proxyInfoList;
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
        params.start_date = startDate.toISOString().split('T')[0];
      }

      if (endDate) {
        params.end_date = endDate.toISOString().split('T')[0];
      }

      const response = await this.httpClient.get('/usage/stats', { params });

      if (response.status !== 200 || !response.data) {
        throw new Error('Failed to get usage stats from IPRoyal');
      }

      const data = response.data;

      return {
        totalRequests: data.total_requests || 0,
        successfulRequests: data.successful_requests || 0,
        failedRequests: data.failed_requests || 0,
        successRate: data.success_rate || 0,
        totalBandwidthMB: data.total_bandwidth_mb || 0,
        totalCost: data.total_cost || 0,
        averageLatency: data.average_latency || 0,
        avgCostPerRequest: data.avg_cost_per_request || 0,
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
      const response = await this.httpClient.get('/locations');

      if (response.status !== 200 || !response.data) {
        throw new Error('Failed to get regions from IPRoyal');
      }

      const regions: Region[] = [];
      const data = response.data.countries || response.data;

      for (const countryData of data) {
        regions.push({
          country: countryData.code,
          countryName: countryData.name,
          cities: countryData.cities || [],
          availableProxies: countryData.proxy_count || 0,
          costPerGB: this.config.costPerGB,
        });
      }

      this.logger.log(`Retrieved ${regions.length} regions from IPRoyal`);

      return regions;
    } catch (error) {
      this.logger.error(`Failed to get regions: ${error.message}`);

      // 返回常见国家作为后备
      return this.getDefaultRegions();
    }
  }

  /**
   * 将 IPRoyal API 响应映射为标准 ProxyInfo
   */
  private mapToProxyInfo(raw: any): ProxyInfo {
    const proxyId = `iproyal-${raw.ip || raw.host}:${raw.port}`;

    return {
      id: proxyId,
      host: raw.ip || raw.host,
      port: raw.port,
      username: this.config.username,
      password: this.config.password,
      protocol: (raw.protocol || 'http') as 'http' | 'https' | 'socks5',
      provider: 'iproyal',
      location: {
        country: raw.country || raw.country_code || 'US',
        city: raw.city,
        state: raw.state,
      },
      quality: raw.quality || 80, // IPRoyal 默认质量较高
      latency: raw.latency || 0,
      inUse: false,
      failureCount: 0,
      costPerGB: this.config.costPerGB,
      sessionId: raw.session_id,
      metadata: {
        isp: raw.isp,
        asn: raw.asn,
        connection_type: raw.connection_type,
      },
      createdAt: new Date(),
      expiresAt: raw.expires_at ? new Date(raw.expires_at) : undefined,
    };
  }

  /**
   * 获取默认地区列表（作为后备）
   */
  private getDefaultRegions(): Region[] {
    const commonCountries = [
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
    ];

    return commonCountries.map((country) => ({
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
