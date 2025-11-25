import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import { BaseProxyAdapter } from '../base/base.adapter';
import {
  ProxyInfo,
  GetProxyOptions,
  ProxyUsageStats,
  Region,
  ProviderConfig,
} from '../../common/interfaces';

/**
 * Kookeey 代理供应商适配器
 *
 * 特点：
 * - 家宽代理（Residential Proxy）
 * - 支持多国家/地区定位
 * - HMAC-SHA1 签名认证
 * - 支持动态IP和粘性会话
 *
 * API 文档: https://www.kookeey.net/apidoc
 */
@Injectable()
export class KookeeyAdapter extends BaseProxyAdapter {
  private proxyCache: Map<string, ProxyInfo> = new Map();

  // API 认证 (可选)
  private accessId: string;
  private token: string;

  // 代理直连认证 (推荐)
  private accountId: string;
  private username: string;
  private password: string;
  private gateway: string;
  private proxyPort: number;

  // 默认配置
  private readonly DEFAULT_PORT = 18705;
  private readonly DEFAULT_PROXY_HOST = 'gate-hk.kkoip.com';

  constructor() {
    super('Kookeey');
  }

  /**
   * 初始化 Kookeey 适配器
   *
   * 支持两种认证模式：
   * 1. 代理直连认证 (推荐): accountId + username + password + gateway
   * 2. API 签名认证 (可选): accessId + token
   */
  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);

    // 从 config.extra 中提取 Kookeey 特定配置
    const kookeeyConfig = config.extra as any;

    // 代理直连认证配置 (优先使用)
    this.accountId = kookeeyConfig?.accountId;
    this.username = kookeeyConfig?.username;
    this.password = kookeeyConfig?.password;
    this.gateway = kookeeyConfig?.gateway || this.DEFAULT_PROXY_HOST;
    this.proxyPort = kookeeyConfig?.port || this.DEFAULT_PORT;

    // API 签名认证配置 (可选)
    this.accessId = kookeeyConfig?.accessId || config.apiKey;
    this.token = kookeeyConfig?.token;

    // 检查是否有代理直连认证配置
    const hasDirectAuth = this.accountId && this.username && this.password;
    // 检查是否有 API 认证配置
    const hasApiAuth = this.accessId && this.token;

    if (!hasDirectAuth && !hasApiAuth) {
      throw new Error('Kookeey requires either (accountId + username + password) for direct proxy auth, or (accessId + token) for API auth');
    }

    // 如果有 API 认证配置，测试连接
    if (hasApiAuth) {
      const connected = await this.testConnection();
      if (!connected) {
        this.logger.warn('Failed to connect to Kookeey API during initialization');
      }
    } else {
      this.logger.log('Kookeey initialized with direct proxy authentication (no API access)');
    }
  }

  /**
   * 生成 HMAC-SHA1 签名
   *
   * 签名方法：
   * 1. 将请求参数按照 URL 参数顺序连接（不包括 accessid, signature, ts）
   * 2. 使用 token 计算 HMAC-SHA1
   * 3. Base64 编码
   *
   * @param params - 请求参数（不包括 accessid, signature, ts）
   * @returns Base64 编码的签名
   */
  private generateSignature(params: Record<string, any>): string {
    // 将参数按 key 排序并连接为字符串
    const sortedKeys = Object.keys(params).sort();
    const paramString = sortedKeys
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    // 使用 token 计算 HMAC-SHA1
    const hmac = createHmac('sha1', this.token);
    hmac.update(paramString);

    // Base64 编码
    return hmac.digest('base64');
  }

  /**
   * 构建带签名的 API 请求 URL
   *
   * @param endpoint - API 端点
   * @param params - 请求参数
   * @returns 完整的请求 URL
   */
  private buildRequestUrl(endpoint: string, params: Record<string, any> = {}): string {
    const ts = Math.floor(Date.now() / 1000);

    // 生成签名（不包括 accessid, signature, ts）
    const signature = this.generateSignature(params);

    // 构建完整参数
    const allParams = {
      accessid: this.accessId,
      signature,
      ts,
      ...params,
    };

    // 构建 URL
    const queryString = Object.keys(allParams)
      .map((key) => `${key}=${encodeURIComponent(allParams[key])}`)
      .join('&');

    return `${this.config.apiUrl}${endpoint}?${queryString}`;
  }

  /**
   * 测试 Kookeey 连接
   * - 直连模式：测试代理连接是否可用
   * - API 模式：使用 /stock 接口测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      this.ensureInitialized();

      // 如果是直连模式，测试代理连接
      if (this.accountId && this.username && this.password && !this.token) {
        return this.testDirectConnection();
      }

      // API 模式：使用库存查询接口测试连接
      const url = this.buildRequestUrl('/stock', { g: 1 });
      const response = await this.httpClient.get(url);

      if (response.status === 200 && response.data.success) {
        this.logger.log('Kookeey API connection successful');
        return true;
      }

      this.logger.warn(`Kookeey API returned unsuccessful response: ${response.data.msg}`);
      return false;
    } catch (error) {
      this.logger.error(`Kookeey connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 测试直连代理连接
   * 通过代理访问一个测试 URL 来验证连接
   */
  private async testDirectConnection(): Promise<boolean> {
    try {
      const testUrl = 'http://httpbin.org/ip';
      const proxyUsername = this.buildProxyUsername({ country: 'US', sessionDuration: 1 });

      this.logger.debug(`Testing direct connection via proxy: ${this.gateway}:${this.proxyPort}`);

      // 使用 axios 通过代理请求
      const response = await this.httpClient.get(testUrl, {
        proxy: {
          host: this.gateway,
          port: this.proxyPort,
          auth: {
            username: proxyUsername,
            password: this.password,
          },
        },
        timeout: 10000,
      });

      if (response.status === 200 && response.data.origin) {
        this.logger.log(`Kookeey direct proxy connection successful. Exit IP: ${response.data.origin}`);
        return true;
      }

      this.logger.warn('Kookeey direct proxy test returned unexpected response');
      return false;
    } catch (error) {
      this.logger.error(`Kookeey direct connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 生成代理认证用户名
   * 格式: {accountId}-{username}:{password}-{country}-{sessionId}-{duration}
   *
   * @param options - 代理选项
   * @returns 认证用户名字符串
   */
  private buildProxyUsername(options?: GetProxyOptions): string {
    // 基础认证: accountId-username
    let authUser = `${this.accountId}-${this.username}`;

    // 可选参数
    const country = options?.country?.toUpperCase() || 'US';
    const sessionId = Math.random().toString(36).substring(2, 10);
    const duration = options?.sessionDuration ? `${options.sessionDuration}m` : '5m';

    // 完整格式: accountId-username:password-country-sessionId-duration
    // 注意: 实际用户名部分不包含密码，密码单独传递
    // 返回格式: accountId-username-country-sessionId-duration
    return `${authUser}-${country}-${sessionId}-${duration}`;
  }

  /**
   * 获取代理列表
   * 支持两种模式：
   * 1. 直连认证模式：使用配置的 gateway/accountId/username/password 构建代理
   * 2. API 模式：通过 Kookeey API 获取代理 IP
   *
   * @param options - 获取代理选项
   * @returns 代理信息列表
   */
  async getProxyList(options?: GetProxyOptions): Promise<ProxyInfo[]> {
    this.ensureInitialized();

    // 如果有直连认证配置，使用直连模式
    if (this.accountId && this.username && this.password) {
      return this.getProxyListDirect(options);
    }

    // 否则使用 API 模式
    return this.getProxyListFromApi(options);
  }

  /**
   * 直连认证模式获取代理
   * 直接使用配置的认证信息构建代理
   */
  private async getProxyListDirect(options?: GetProxyOptions): Promise<ProxyInfo[]> {
    const limit = options?.limit || 10;
    const proxies: ProxyInfo[] = [];

    for (let i = 0; i < limit; i++) {
      const proxyUsername = this.buildProxyUsername(options);
      const proxyInfo: ProxyInfo = {
        id: `kookeey-direct-${Date.now()}-${i}`,
        host: this.gateway,
        port: this.proxyPort,
        username: proxyUsername,
        password: this.password,
        protocol: 'http',
        provider: 'kookeey',
        location: {
          country: options?.country?.toUpperCase() || 'US',
          city: options?.city,
        },
        quality: 90, // 直连模式默认高质量
        latency: 100, // 预估延迟
        inUse: false,
        costPerGB: this.config.costPerGB,
        createdAt: new Date(),
        expiresAt: options?.sessionDuration
          ? new Date(Date.now() + options.sessionDuration * 60 * 1000)
          : new Date(Date.now() + 5 * 60 * 1000), // 默认 5 分钟
      };

      this.proxyCache.set(proxyInfo.id, proxyInfo);
      proxies.push(proxyInfo);
    }

    this.logger.log(`Generated ${proxies.length} direct proxies from Kookeey`);
    return proxies;
  }

  /**
   * API 模式获取代理
   * 通过 Kookeey API 提取代理 IP
   */
  private async getProxyListFromApi(options?: GetProxyOptions): Promise<ProxyInfo[]> {
    try {
      const limit = options?.limit || 10;
      const groupId = 1; // 默认分组ID (Kookeey specific, could be added to metadata)

      // 构建提取参数
      const params: Record<string, any> = {
        g: groupId,
        num: limit,
        format: 'json',
      };

      // 添加地理位置参数
      if (options?.country) {
        params.country = options.country.toLowerCase();
      }
      if (options?.state) {
        params.state = options.state;
      }
      if (options?.city) {
        params.city = options.city;
      }
      if (options?.sessionDuration) {
        params.duration = options.sessionDuration;
      }

      // 支持通过 metadata 传递 groupId
      const metadata = (options as any)?.metadata;
      if (metadata?.groupId) {
        params.g = metadata.groupId;
      }

      const url = this.buildRequestUrl('/extract', params);
      const response = await this.httpClient.get(url);

      if (!response.data.success) {
        this.logger.error(`Failed to extract proxies: ${response.data.msg}`);
        return [];
      }

      // 解析代理列表
      const proxyData = Array.isArray(response.data.data)
        ? response.data.data
        : [response.data.data];

      const proxies: ProxyInfo[] = proxyData.map((item: any, index: number) => {
        const proxyInfo: ProxyInfo = {
          id: `kookeey-${groupId}-${Date.now()}-${index}`,
          host: item.host || item.ip || this.DEFAULT_PROXY_HOST,
          port: item.port || this.DEFAULT_PORT,
          username: item.username,
          password: item.password,
          protocol: item.protocol || 'http',
          provider: 'kookeey',
          location: {
            country: options?.country?.toUpperCase(),
            city: options?.city,
          },
          quality: item.quality || 80, // 默认质量分数
          latency: item.latency || 200, // 默认延迟(ms)
          inUse: false, // 初始状态未使用
          costPerGB: this.config.costPerGB, // 使用配置的成本
          createdAt: new Date(),
          expiresAt: options?.sessionDuration
            ? new Date(Date.now() + options.sessionDuration * 60 * 1000)
            : undefined,
        };

        this.proxyCache.set(proxyInfo.id, proxyInfo);
        return proxyInfo;
      });

      this.logger.log(`Retrieved ${proxies.length} proxies from Kookeey API`);
      return proxies;
    } catch (error) {
      this.logger.error(`Failed to get proxy list from API: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取单个代理
   *
   * @param options - 获取代理选项
   * @returns 代理信息
   */
  async getProxy(options?: GetProxyOptions): Promise<ProxyInfo> {
    const proxies = await this.getProxyList({ ...options, limit: 1 });
    if (proxies.length === 0) {
      throw new Error('No proxy available from Kookeey');
    }
    return proxies[0];
  }

  /**
   * 获取库存信息
   *
   * @param groupId - 分组ID
   * @returns 库存数量
   */
  async getStock(groupId: number): Promise<number> {
    this.ensureInitialized();

    try {
      const url = this.buildRequestUrl('/stock', { g: groupId });
      const response = await this.httpClient.get(url);

      if (!response.data.success) {
        this.logger.error(`Failed to get stock: ${response.data.msg}`);
        return 0;
      }

      return response.data.data?.stock || 0;
    } catch (error) {
      this.logger.error(`Failed to get stock: ${error.message}`);
      return 0;
    }
  }

  /**
   * 获取账户余额
   *
   * @returns 余额信息
   */
  async getBalance(): Promise<{ balance: number; currency?: string }> {
    this.ensureInitialized();

    try {
      const url = this.buildRequestUrl('/balance');
      const response = await this.httpClient.get(url);

      if (!response.data.success) {
        this.logger.error(`Failed to get balance: ${response.data.msg}`);
        return { balance: 0 };
      }

      return {
        balance: response.data.data?.balance || 0,
        currency: response.data.data?.currency || 'USD',
      };
    } catch (error) {
      this.logger.error(`Failed to get balance: ${error.message}`);
      return { balance: 0 };
    }
  }

  /**
   * 获取订单列表
   *
   * @param page - 页码
   * @param limit - 每页数量
   * @returns 订单列表
   */
  async getOrders(page: number = 1, limit: number = 10): Promise<any[]> {
    this.ensureInitialized();

    try {
      const url = this.buildRequestUrl('/orders', { page, limit });
      const response = await this.httpClient.get(url);

      if (!response.data.success) {
        this.logger.error(`Failed to get orders: ${response.data.msg}`);
        return [];
      }

      return response.data.data?.list || [];
    } catch (error) {
      this.logger.error(`Failed to get orders: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取使用统计
   *
   * @param startDate - 开始日期
   * @param endDate - 结束日期
   * @returns 使用统计
   */
  async getUsageStats(startDate?: Date, endDate?: Date): Promise<ProxyUsageStats> {
    this.ensureInitialized();

    try {
      const params: Record<string, any> = {};

      if (startDate) {
        params.start = Math.floor(startDate.getTime() / 1000);
      }
      if (endDate) {
        params.end = Math.floor(endDate.getTime() / 1000);
      }

      const url = this.buildRequestUrl('/usage', params);
      const response = await this.httpClient.get(url);

      if (!response.data.success) {
        this.logger.warn(`Failed to get usage stats: ${response.data.msg}`);
        // 返回默认值
        return {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalBandwidthMB: 0,
          successRate: 0,
          averageLatency: 0,
          totalCost: 0,
          avgCostPerRequest: 0,
          avgCostPerGB: this.config.costPerGB || 0,
          periodStart: startDate || new Date(),
          periodEnd: endDate || new Date(),
        };
      }

      const data = response.data.data || {};
      const totalBandwidthMB = data.totalBandwidthMB || 0;
      const totalRequests = data.totalRequests || 0;
      const totalCost = (totalBandwidthMB / 1024) * (this.config.costPerGB || 0);

      return {
        totalRequests,
        successfulRequests: data.successfulRequests || 0,
        failedRequests: data.failedRequests || 0,
        totalBandwidthMB,
        successRate: data.successRate || 0,
        averageLatency: data.averageLatency || 0,
        totalCost,
        avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
        avgCostPerGB: this.config.costPerGB || 0,
        periodStart: startDate || new Date(),
        periodEnd: endDate || new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get usage stats: ${error.message}`);
      // 返回默认值
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalBandwidthMB: 0,
        successRate: 0,
        averageLatency: 0,
        totalCost: 0,
        avgCostPerRequest: 0,
        avgCostPerGB: this.config.costPerGB || 0,
        periodStart: startDate || new Date(),
        periodEnd: endDate || new Date(),
      };
    }
  }

  /**
   * 获取可用地区列表
   *
   * @returns 地区列表
   */
  async getAvailableRegions(): Promise<Region[]> {
    this.ensureInitialized();

    try {
      const url = this.buildRequestUrl('/regions');
      const response = await this.httpClient.get(url);

      if (!response.data.success) {
        this.logger.warn(`Failed to get regions: ${response.data.msg}`);
        return [];
      }

      const regionsData = response.data.data?.regions || [];

      return regionsData.map((region: any) => ({
        country: region.country || region.code,
        countryName: region.name || region.countryName,
        cities: region.cities || [],
        availableProxies: region.stock || region.availableProxies || 0,
        costPerGB: this.config.costPerGB,
      }));
    } catch (error) {
      this.logger.warn(`Failed to get regions: ${error.message}`);
      return [];
    }
  }

  /**
   * 刷新代理池
   * 从 Kookeey 获取新的代理并更新缓存
   *
   * @param minSize - 最小池大小
   * @returns 新增代理数量
   */
  async refreshPool(minSize: number = 10): Promise<number> {
    this.logger.log(`Refreshing proxy pool (minSize: ${minSize})`);

    try {
      const currentSize = this.proxyCache.size;
      const needed = Math.max(0, minSize - currentSize);

      if (needed === 0) {
        this.logger.debug('Proxy pool is sufficient, no refresh needed');
        return 0;
      }

      // 获取新代理
      const newProxies = await this.getProxyList({ limit: needed });

      this.logger.log(`Added ${newProxies.length} proxies to pool`);
      return newProxies.length;
    } catch (error) {
      this.logger.error(`Failed to refresh pool: ${error.message}`);
      return 0;
    }
  }

  /**
   * 释放代理
   *
   * @param proxyId - 代理ID
   */
  async releaseProxy(proxyId: string): Promise<void> {
    this.proxyCache.delete(proxyId);
    this.logger.debug(`Released proxy ${proxyId} from cache`);
  }

  /**
   * 获取剩余流量（如果支持）
   *
   * @returns 剩余流量（MB）
   */
  async getRemainingFlow(): Promise<number> {
    try {
      const url = this.buildRequestUrl('/flow/remaining');
      const response = await this.httpClient.get(url);

      if (!response.data.success) {
        this.logger.warn(`Failed to get remaining flow: ${response.data.msg}`);
        return 0;
      }

      return response.data.data?.remainingMB || 0;
    } catch (error) {
      this.logger.warn(`Failed to get remaining flow: ${error.message}`);
      return 0;
    }
  }
}
