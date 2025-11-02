import { Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import {
  IProxyProvider,
  ProviderConfig,
  ProxyInfo,
  GetProxyOptions,
  ProxyUsageStats,
  HealthCheckResult,
  Region,
  ProviderAPIResponse,
} from '../../common/interfaces';

/**
 * 代理供应商基础适配器
 * 提供通用的验证、健康检查和HTTP客户端功能
 */
export abstract class BaseProxyAdapter implements IProxyProvider {
  protected readonly logger: Logger;
  protected config: ProviderConfig;
  protected httpClient: AxiosInstance;
  protected initialized = false;

  constructor(protected readonly name: string) {
    this.logger = new Logger(`${name}Adapter`);
  }

  /**
   * 初始化供应商适配器
   */
  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;

    // 创建HTTP客户端
    this.httpClient = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CloudPhone-ProxyService/1.0',
      },
    });

    // 添加请求拦截器（用于添加认证）
    this.httpClient.interceptors.request.use(
      (axiosConfig) => {
        return this.addAuthentication(axiosConfig);
      },
      (error) => {
        this.logger.error(`Request interceptor error: ${error.message}`);
        return Promise.reject(error);
      },
    );

    // 添加响应拦截器（用于错误处理和日志）
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug(
          `API request successful: ${response.config.method?.toUpperCase()} ${response.config.url}`,
        );
        return response;
      },
      (error) => {
        this.logger.error(
          `API request failed: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.message}`,
        );
        return Promise.reject(error);
      },
    );

    this.initialized = true;
    this.logger.log(`${this.name} adapter initialized successfully`);
  }

  /**
   * 获取供应商名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 验证代理是否可用
   * 通用验证逻辑：通过代理访问测试URL
   */
  async validateProxy(proxy: ProxyInfo): Promise<boolean> {
    try {
      const testUrl = 'https://api.ipify.org?format=json';
      const proxyConfig: AxiosRequestConfig = {
        proxy: {
          host: proxy.host,
          port: proxy.port,
          auth:
            proxy.username && proxy.password
              ? {
                  username: proxy.username,
                  password: proxy.password,
                }
              : undefined,
        },
        timeout: 10000,
      };

      const startTime = Date.now();
      const response = await axios.get(testUrl, proxyConfig);
      const latency = Date.now() - startTime;

      if (response.status === 200 && response.data.ip) {
        this.logger.debug(
          `Proxy ${proxy.id} validated successfully. IP: ${response.data.ip}, Latency: ${latency}ms`,
        );
        return true;
      }

      return false;
    } catch (error) {
      this.logger.warn(
        `Proxy ${proxy.id} validation failed: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * 检查代理健康状态
   */
  async checkHealth(proxy: ProxyInfo): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const testUrl = 'https://api.ipify.org?format=json';
      const proxyConfig: AxiosRequestConfig = {
        proxy: {
          host: proxy.host,
          port: proxy.port,
          auth:
            proxy.username && proxy.password
              ? {
                  username: proxy.username,
                  password: proxy.password,
                }
              : undefined,
        },
        timeout: 10000,
      };

      const response = await axios.get(testUrl, proxyConfig);
      const responseTime = Date.now() - startTime;

      return {
        proxyId: proxy.id,
        healthy: response.status === 200,
        responseTime,
        checkedAt: new Date(),
        statusCode: response.status,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        proxyId: proxy.id,
        healthy: false,
        responseTime,
        checkedAt: new Date(),
        error: error.message,
        statusCode: error.response?.status,
      };
    }
  }

  /**
   * 测试供应商API连接
   */
  async testConnection(): Promise<boolean> {
    try {
      // 子类应该覆盖此方法以测试特定供应商的API
      this.logger.warn(
        `${this.name} adapter does not implement testConnection, using default`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 估算成本
   */
  async estimateCost(bandwidthMB: number): Promise<number> {
    const costPerGB = this.config.costPerGB || 0;
    const bandwidthGB = bandwidthMB / 1024;
    return bandwidthGB * costPerGB;
  }

  /**
   * 释放代理（默认不需要操作）
   */
  async releaseProxy(proxyId: string): Promise<void> {
    this.logger.debug(`Releasing proxy ${proxyId} (no-op for ${this.name})`);
  }

  /**
   * 添加认证信息到请求
   * 子类可以覆盖此方法以实现特定的认证方式
   */
  protected addAuthentication(
    config: InternalAxiosRequestConfig,
  ): InternalAxiosRequestConfig {
    if (this.config.apiKey) {
      // API Key认证
      config.headers.set('Authorization', `Bearer ${this.config.apiKey}`);
    } else if (this.config.username && this.config.password) {
      // Basic认证
      config.auth = {
        username: this.config.username,
        password: this.config.password,
      };
    } else if (this.config.token) {
      // Token认证
      config.headers.set('Authorization', `Token ${this.config.token}`);
    }

    return config;
  }

  /**
   * 处理API响应
   */
  protected handleAPIResponse<T>(
    response: any,
    startTime: number,
  ): ProviderAPIResponse<T> {
    const responseTime = Date.now() - startTime;

    return {
      success: true,
      data: response.data,
      responseTime,
      remainingQuota: response.headers['x-ratelimit-remaining']
        ? parseInt(response.headers['x-ratelimit-remaining'])
        : undefined,
      rateLimit: response.headers['x-ratelimit-limit']
        ? {
            limit: parseInt(response.headers['x-ratelimit-limit']),
            remaining: parseInt(response.headers['x-ratelimit-remaining']),
            reset: new Date(
              parseInt(response.headers['x-ratelimit-reset']) * 1000,
            ),
          }
        : undefined,
    };
  }

  /**
   * 处理API错误
   */
  protected handleAPIError(error: any, startTime: number): ProviderAPIResponse {
    const responseTime = Date.now() - startTime;

    return {
      success: false,
      error: error.message,
      errorCode: error.response?.data?.error_code || error.code,
      responseTime,
    };
  }

  /**
   * 确保适配器已初始化
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`${this.name} adapter not initialized`);
    }
  }

  // 抽象方法 - 子类必须实现

  /**
   * 获取代理列表
   * 每个供应商的实现不同
   */
  abstract getProxyList(options?: GetProxyOptions): Promise<ProxyInfo[]>;

  /**
   * 获取使用统计
   * 每个供应商的实现不同
   */
  abstract getUsageStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<ProxyUsageStats>;

  /**
   * 刷新代理池
   * 每个供应商的实现不同
   */
  abstract refreshPool(minSize?: number): Promise<number>;

  /**
   * 获取可用地区列表
   * 每个供应商的实现不同
   */
  abstract getAvailableRegions(): Promise<Region[]>;
}
