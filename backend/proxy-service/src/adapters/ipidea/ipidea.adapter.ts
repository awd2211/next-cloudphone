import { Injectable } from '@nestjs/common';
import { InternalAxiosRequestConfig } from 'axios';
import { BaseProxyAdapter } from '../base/base.adapter';
import {
  ProxyInfo,
  GetProxyOptions,
  ProxyUsageStats,
  Region,
  ProviderConfig,
} from '../../common/interfaces';

/**
 * IPIDEA 代理供应商适配器
 *
 * 特点：
 * - 全球 9000万+ 住宅 IP
 * - 支持动态住宅、静态住宅、数据中心、移动代理
 * - 支持 HTTP/HTTPS/SOCKS5 协议
 * - 覆盖 220+ 国家和地区
 * - 支持城市级别定位
 *
 * API 文档: https://www.ipidea.net/ucenter/ipidea-api.html
 */
@Injectable()
export class IPIDEAAdapter extends BaseProxyAdapter {
  private proxyCache: Map<string, ProxyInfo> = new Map();

  // IPIDEA 代理网关地址
  // 注意：实际网关地址是用户特定的，格式如: e255c08e04856698.lqz.na.ipidea.online
  // 这里使用通用网关，用户可通过配置覆盖
  private readonly PROXY_GATEWAY = {
    http: 'proxy.ipidea.io',
    socks5: 'socks.ipidea.io',
  };

  // 默认端口
  private readonly DEFAULT_PORTS = {
    http: 2336,    // 新版端口
    socks5: 2336,
    legacy: 2333,  // 旧版端口
  };

  constructor() {
    super('IPIDEA');
  }

  /**
   * 初始化 IPIDEA 适配器
   */
  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);

    // 测试连接
    const connected = await this.testConnection();
    if (!connected) {
      this.logger.warn('Failed to connect to IPIDEA API during initialization');
    }
  }

  /**
   * 覆盖认证方法 - IPIDEA 使用 appkey 参数
   */
  protected addAuthentication(
    config: InternalAxiosRequestConfig,
  ): InternalAxiosRequestConfig {
    // IPIDEA 使用 POST body 中的 appkey 参数
    if (this.config.apiKey) {
      if (!config.data) {
        config.data = {};
      }
      if (typeof config.data === 'object') {
        config.data.appkey = this.config.apiKey;
      }
    }
    return config;
  }

  /**
   * 测试 IPIDEA API 连接
   */
  async testConnection(): Promise<boolean> {
    try {
      this.ensureInitialized();

      // 使用获取剩余流量接口测试连接
      const response = await this.httpClient.post('/api/open/flow_left', {
        appkey: this.config.apiKey,
      });

      if (response.status === 200 && response.data.ret === 0) {
        this.logger.log('IPIDEA API connection successful');
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`IPIDEA connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取代理列表
   * IPIDEA 使用隧道代理模式，通过网关地址 + 认证账户访问
   */
  async getProxyList(options?: GetProxyOptions): Promise<ProxyInfo[]> {
    this.ensureInitialized();

    try {
      const startTime = Date.now();
      const limit = options?.limit || 100;
      const proxies: ProxyInfo[] = [];

      // 获取认证账户列表
      const accountsResponse = await this.httpClient.post('/api/open/proxy_account_list', {
        appkey: this.config.apiKey,
        page: 1,
        limit: 100,
      });

      if (accountsResponse.data.ret !== 0) {
        this.logger.error('Failed to get proxy accounts from IPIDEA');
        // 如果没有认证账户，使用主账户创建代理
        return this.generateTunnelProxies(options, limit);
      }

      const accounts = accountsResponse.data.ret_data?.list || [];

      // 为每个认证账户生成代理信息
      for (const account of accounts) {
        if (proxies.length >= limit) break;

        const proxy = this.createProxyFromAccount(account, options);
        proxies.push(proxy);
        this.proxyCache.set(proxy.id, proxy);
      }

      // 如果账户不够，使用主账户补充
      if (proxies.length < limit) {
        const tunnelProxies = await this.generateTunnelProxies(
          options,
          limit - proxies.length,
        );
        proxies.push(...tunnelProxies);
      }

      this.logger.log(`Retrieved ${proxies.length} proxies from IPIDEA`);

      return proxies;
    } catch (error) {
      this.logger.error(`Failed to get proxy list: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成隧道代理列表
   *
   * IPIDEA 用户名参数格式:
   * - zone-custom: 代理池标识（必需）
   * - region-{country}: 国家/地区
   * - st-{state}: 州/省
   * - city-{city}: 城市
   * - session-{id}: 固定出口IP
   * - sessTime-{minutes}: IP时效（最长120分钟）
   * - asn-{asn}: 指定ISP运营商
   *
   * 示例: account-zone-custom-region-us-city-newyork:password
   */
  private async generateTunnelProxies(
    options?: GetProxyOptions,
    count = 100,
  ): Promise<ProxyInfo[]> {
    const proxies: ProxyInfo[] = [];
    const protocol = options?.protocol || 'http';

    // ✅ 修复: 支持从配置根级别或 extra 中读取 gateway 和 port
    // 优先使用根级别配置（与前端示例一致），其次是 extra，最后是默认值
    const configGateway = (this.config as any).gateway || this.config.extra?.gateway;
    const configPort = (this.config as any).port || this.config.extra?.port;

    const gateway = configGateway ||
      (protocol === 'socks5' ? this.PROXY_GATEWAY.socks5 : this.PROXY_GATEWAY.http);
    const port = configPort || this.DEFAULT_PORTS.http;

    for (let i = 0; i < count; i++) {
      // 构建用户名，包含定位和会话参数
      // 基础格式: {account}-zone-custom
      let username = this.config.username || '';

      // 如果用户名不包含 zone-custom，添加它
      if (!username.includes('-zone-custom')) {
        username += '-zone-custom';
      }

      // 添加国家/地区参数 (region-{country})
      if (options?.country) {
        username += `-region-${options.country.toLowerCase()}`;
      }

      // 添加州/省参数 (st-{state})
      if (options?.state) {
        username += `-st-${options.state.toLowerCase().replace(/\s+/g, '')}`;
      }

      // 添加城市参数 (city-{city})
      if (options?.city) {
        username += `-city-${options.city.toLowerCase().replace(/\s+/g, '')}`;
      }

      // 添加会话参数（粘性会话）
      if (options?.session === 'sticky') {
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        username += `-session-${sessionId}`;

        // 添加会话时长（默认30分钟，最长120分钟）
        const sessTime = Math.min(options?.sessionDuration || 30, 120);
        username += `-sessTime-${sessTime}`;
      }

      // 添加 ASN/ISP 参数
      if (options?.asn) {
        username += `-asn-${options.asn}`;
      }

      const proxyId = `ipidea-tunnel-${i}-${Date.now()}`;

      const proxy: ProxyInfo = {
        id: proxyId,
        host: gateway,
        port: port,
        username: username,
        password: this.config.password || '',
        protocol: protocol as 'http' | 'https' | 'socks5',
        provider: 'ipidea',
        location: {
          country: options?.country || 'ANY',
          city: options?.city,
        },
        quality: 85, // IPIDEA 默认质量
        latency: 0,
        inUse: false,
        failureCount: 0,
        costPerGB: this.config.costPerGB,
        metadata: {
          type: 'tunnel',
          gateway: gateway,
        },
        createdAt: new Date(),
      };

      proxies.push(proxy);
      this.proxyCache.set(proxyId, proxy);
    }

    return proxies;
  }

  /**
   * 从认证账户创建代理信息
   */
  private createProxyFromAccount(account: any, options?: GetProxyOptions): ProxyInfo {
    const protocol = options?.protocol || 'http';

    // ✅ 修复: 支持从配置根级别或 extra 中读取 gateway 和 port
    const configGateway = (this.config as any).gateway || this.config.extra?.gateway;
    const configPort = (this.config as any).port || this.config.extra?.port;

    const gateway = configGateway ||
      (protocol === 'socks5' ? this.PROXY_GATEWAY.socks5 : this.PROXY_GATEWAY.http);
    const port = configPort ||
      (protocol === 'socks5' ? this.DEFAULT_PORTS.socks5 : this.DEFAULT_PORTS.http);

    const proxyId = `ipidea-${account.account || account.id}`;

    return {
      id: proxyId,
      host: gateway,
      port: port,
      username: account.account || account.username,
      password: account.password,
      protocol: protocol as 'http' | 'https' | 'socks5',
      provider: 'ipidea',
      location: {
        country: account.region || options?.country || 'ANY',
        city: options?.city,
      },
      quality: 85,
      latency: 0,
      inUse: false,
      failureCount: 0,
      costPerGB: this.config.costPerGB,
      metadata: {
        accountId: account.id,
        flowLimit: account.flow_limit,
        flowUsed: account.flow_used,
      },
      createdAt: new Date(),
    };
  }

  /**
   * 刷新代理池
   */
  async refreshPool(minSize = 100): Promise<number> {
    this.ensureInitialized();

    try {
      const currentSize = this.proxyCache.size;

      if (currentSize >= minSize) {
        this.logger.debug(
          `Proxy pool size (${currentSize}) meets minimum requirement (${minSize})`,
        );
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
      // 获取剩余流量
      const flowResponse = await this.httpClient.post('/api/open/flow_left', {
        appkey: this.config.apiKey,
      });

      // 获取流量使用记录
      const params: any = {
        appkey: this.config.apiKey,
      };

      if (startDate) {
        params.start_time = Math.floor(startDate.getTime() / 1000);
      }
      if (endDate) {
        params.end_time = Math.floor(endDate.getTime() / 1000);
      }

      const usageResponse = await this.httpClient.post('/api/open/flow_use_record', params);

      const flowLeft = flowResponse.data.ret_data?.flow_left || 0; // MB
      const usageData = usageResponse.data.ret_data || {};

      // 计算统计数据
      const totalBandwidthMB = usageData.total_flow || 0;
      const totalCost = (totalBandwidthMB / 1024) * this.config.costPerGB;

      // 记录剩余流量信息
      this.logger.debug(`IPIDEA remaining flow: ${flowLeft} MB (${(flowLeft / 1024).toFixed(2)} GB)`);

      return {
        totalRequests: usageData.total_requests || 0,
        successfulRequests: usageData.successful_requests || 0,
        failedRequests: usageData.failed_requests || 0,
        successRate: usageData.success_rate || 0,
        totalBandwidthMB: totalBandwidthMB,
        totalCost: totalCost,
        averageLatency: usageData.average_latency || 0,
        avgCostPerRequest: usageData.avg_cost_per_request || 0,
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

    // IPIDEA 支持的主要地区（API 中没有专门的地区列表接口）
    // 这里返回常见的支持地区
    const supportedRegions: Region[] = [
      { country: 'US', countryName: 'United States', costPerGB: this.config.costPerGB },
      { country: 'GB', countryName: 'United Kingdom', costPerGB: this.config.costPerGB },
      { country: 'DE', countryName: 'Germany', costPerGB: this.config.costPerGB },
      { country: 'FR', countryName: 'France', costPerGB: this.config.costPerGB },
      { country: 'CA', countryName: 'Canada', costPerGB: this.config.costPerGB },
      { country: 'AU', countryName: 'Australia', costPerGB: this.config.costPerGB },
      { country: 'JP', countryName: 'Japan', costPerGB: this.config.costPerGB },
      { country: 'KR', countryName: 'South Korea', costPerGB: this.config.costPerGB },
      { country: 'SG', countryName: 'Singapore', costPerGB: this.config.costPerGB },
      { country: 'HK', countryName: 'Hong Kong', costPerGB: this.config.costPerGB },
      { country: 'TW', countryName: 'Taiwan', costPerGB: this.config.costPerGB },
      { country: 'BR', countryName: 'Brazil', costPerGB: this.config.costPerGB },
      { country: 'IN', countryName: 'India', costPerGB: this.config.costPerGB },
      { country: 'RU', countryName: 'Russia', costPerGB: this.config.costPerGB },
      { country: 'MX', countryName: 'Mexico', costPerGB: this.config.costPerGB },
      { country: 'IT', countryName: 'Italy', costPerGB: this.config.costPerGB },
      { country: 'ES', countryName: 'Spain', costPerGB: this.config.costPerGB },
      { country: 'NL', countryName: 'Netherlands', costPerGB: this.config.costPerGB },
      { country: 'PL', countryName: 'Poland', costPerGB: this.config.costPerGB },
      { country: 'TH', countryName: 'Thailand', costPerGB: this.config.costPerGB },
      { country: 'VN', countryName: 'Vietnam', costPerGB: this.config.costPerGB },
      { country: 'PH', countryName: 'Philippines', costPerGB: this.config.costPerGB },
      { country: 'ID', countryName: 'Indonesia', costPerGB: this.config.costPerGB },
      { country: 'MY', countryName: 'Malaysia', costPerGB: this.config.costPerGB },
    ];

    this.logger.log(`Retrieved ${supportedRegions.length} regions for IPIDEA`);

    return supportedRegions;
  }

  /**
   * 添加 IP 白名单
   */
  async addWhitelistIP(ip: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const response = await this.httpClient.post('/api/open/white_add', {
        appkey: this.config.apiKey,
        ip: ip,
      });

      if (response.data.ret === 0) {
        this.logger.log(`Added IP ${ip} to IPIDEA whitelist`);
        return true;
      }

      this.logger.warn(`Failed to add IP to whitelist: ${response.data.msg}`);
      return false;
    } catch (error) {
      this.logger.error(`Failed to add whitelist IP: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取白名单列表
   */
  async getWhitelistIPs(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const response = await this.httpClient.post('/api/open/white_list', {
        appkey: this.config.apiKey,
      });

      if (response.data.ret === 0) {
        return response.data.ret_data?.list || [];
      }

      return [];
    } catch (error) {
      this.logger.error(`Failed to get whitelist IPs: ${error.message}`);
      return [];
    }
  }

  /**
   * 删除白名单 IP
   */
  async removeWhitelistIP(ip: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const response = await this.httpClient.post('/api/open/white_del', {
        appkey: this.config.apiKey,
        ip: ip,
      });

      if (response.data.ret === 0) {
        this.logger.log(`Removed IP ${ip} from IPIDEA whitelist`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to remove whitelist IP: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取剩余流量 (MB)
   */
  async getRemainingFlow(): Promise<number> {
    this.ensureInitialized();

    try {
      const response = await this.httpClient.post('/api/open/flow_left', {
        appkey: this.config.apiKey,
      });

      if (response.data.ret === 0) {
        return response.data.ret_data?.flow_left || 0;
      }

      return 0;
    } catch (error) {
      this.logger.error(`Failed to get remaining flow: ${error.message}`);
      return 0;
    }
  }

  /**
   * 设置流量预警
   */
  async setFlowWarning(thresholdMB: number): Promise<boolean> {
    this.ensureInitialized();

    try {
      const response = await this.httpClient.post('/api/open/flow_warning_set', {
        appkey: this.config.apiKey,
        flow_warning: thresholdMB,
      });

      if (response.data.ret === 0) {
        this.logger.log(`Set flow warning threshold to ${thresholdMB} MB`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to set flow warning: ${error.message}`);
      return false;
    }
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
