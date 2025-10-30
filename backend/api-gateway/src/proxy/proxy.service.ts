import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { catchError, map, Observable } from "rxjs";
import { ConsulService } from "@cloudphone/shared";
import CircuitBreaker = require("opossum");

export interface ServiceRoute {
  name: string;
  url: string;
  healthCheck: string;
  timeout?: number;
}

export interface ServiceConfig {
  name: string;
  consulName: string; // Consul 中注册的服务名
  healthCheck: string;
  timeout?: number;
}

interface ServiceUrlCache {
  url: string;
  timestamp: number;
  ttl: number; // 缓存过期时间 (毫秒)
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly services: Map<string, ServiceRoute>;
  private readonly serviceConfigs: Map<string, ServiceConfig>;
  private readonly useConsul: boolean;
  private readonly circuitBreakers: Map<string, CircuitBreaker>;
  private readonly serviceUrlCache: Map<string, ServiceUrlCache>;
  private readonly SERVICE_CACHE_TTL = 60000; // 60 秒缓存

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly consulService: ConsulService,
  ) {
    this.useConsul = this.configService.get("USE_CONSUL", "false") === "true";

    // 服务配置（用于 Consul 服务发现）
    this.serviceConfigs = new Map([
      [
        "users",
        {
          name: "User Service",
          consulName: "user-service",
          healthCheck: "/health",
          timeout: 10000,
        },
      ],
      [
        "devices",
        {
          name: "Device Service",
          consulName: "device-service",
          healthCheck: "/health",
          timeout: 10000,
        },
      ],
      [
        "apps",
        {
          name: "App Service",
          consulName: "app-service",
          healthCheck: "/health",
          timeout: 30000,
        },
      ],
      [
        "scheduler",
        {
          name: "Scheduler Service",
          consulName: "scheduler-service",
          healthCheck: "/health",
          timeout: 10000,
        },
      ],
      [
        "billing",
        {
          name: "Billing Service",
          consulName: "billing-service",
          healthCheck: "/health",
          timeout: 10000,
        },
      ],
      [
        "notifications",
        {
          name: "Notification Service",
          consulName: "notification-service",
          healthCheck: "/health",
          timeout: 10000,
        },
      ],
      [
        "media",
        {
          name: "Media Service",
          consulName: "media-service",
          healthCheck: "/health",
          timeout: 5000,
        },
      ],
    ]);

    // 初始化微服务路由配置（静态配置，作为 fallback）
    this.services = new Map([
      [
        "users",
        {
          name: "User Service",
          url:
            this.configService.get("USER_SERVICE_URL") ||
            "http://localhost:30001",
          healthCheck: "/health",
          timeout: 10000,
        },
      ],
      [
        "devices",
        {
          name: "Device Service",
          url:
            this.configService.get("DEVICE_SERVICE_URL") ||
            "http://localhost:30002",
          healthCheck: "/health",
          timeout: 10000,
        },
      ],
      [
        "apps",
        {
          name: "App Service",
          url:
            this.configService.get("APP_SERVICE_URL") ||
            "http://localhost:30003",
          healthCheck: "/health",
          timeout: 30000,
        },
      ],
      [
        "scheduler",
        {
          name: "Scheduler Service",
          url:
            this.configService.get("SCHEDULER_SERVICE_URL") ||
            "http://localhost:30004",
          healthCheck: "/health",
          timeout: 10000,
        },
      ],
      [
        "billing",
        {
          name: "Billing Service",
          url:
            this.configService.get("BILLING_SERVICE_URL") ||
            "http://localhost:30005",
          healthCheck: "/health",
          timeout: 10000,
        },
      ],
      [
        "notifications",
        {
          name: "Notification Service",
          url:
            this.configService.get("NOTIFICATION_SERVICE_URL") ||
            "http://localhost:30006",
          healthCheck: "/health",
          timeout: 10000,
        },
      ],
      [
        "media",
        {
          name: "Media Service",
          url:
            this.configService.get("MEDIA_SERVICE_URL") ||
            "http://localhost:30007",
          healthCheck: "/health",
          timeout: 5000,
        },
      ],
    ]);

    // 初始化熔断器
    this.circuitBreakers = new Map();
    this.initializeCircuitBreakers();

    // 初始化服务URL缓存
    this.serviceUrlCache = new Map();
  }

  /**
   * 初始化每个服务的熔断器
   */
  private initializeCircuitBreakers(): void {
    // 为每个服务创建独立的熔断器
    for (const [serviceName, config] of this.serviceConfigs.entries()) {
      const options: CircuitBreaker.Options = {
        timeout: config.timeout || 10000, // 请求超时时间
        errorThresholdPercentage: 50, // 错误率阈值 50%
        resetTimeout: 30000, // 熔断器半开状态重试时间 30s
        rollingCountTimeout: 10000, // 滑动窗口时间 10s
        rollingCountBuckets: 10, // 滑动窗口桶数
        volumeThreshold: 10, // 最小请求数量阈值
        capacity: 100, // 信号量容量（并发请求数）
      };

      // 创建熔断器，包装 HTTP 请求函数
      const breaker = new CircuitBreaker(
        async (config: AxiosRequestConfig) => {
          return await this.httpService.axiosRef.request(config);
        },
        options,
      );

      // 监听熔断器事件
      breaker.on('open', () => {
        this.logger.error(`🔴 Circuit breaker OPENED for ${serviceName}`);
      });

      breaker.on('halfOpen', () => {
        this.logger.warn(`🟡 Circuit breaker HALF-OPEN for ${serviceName}`);
      });

      breaker.on('close', () => {
        this.logger.log(`🟢 Circuit breaker CLOSED for ${serviceName}`);
      });

      breaker.on('fallback', (result: any) => {
        this.logger.warn(`⚠️ Circuit breaker FALLBACK triggered for ${serviceName}`);
      });

      this.circuitBreakers.set(serviceName, breaker);
    }

    this.logger.log(`✅ Initialized ${this.circuitBreakers.size} circuit breakers`);
  }

  /**
   * 获取服务的 URL（支持 Consul 动态发现 + 缓存）
   */
  private async getServiceUrl(serviceName: string): Promise<string> {
    // 1. 检查缓存
    const cached = this.serviceUrlCache.get(serviceName);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      this.logger.debug(`Using cached URL for ${serviceName}: ${cached.url}`);
      return cached.url;
    }

    // 2. 优先从 Consul 获取（如果启用）
    if (this.useConsul) {
      const serviceConfig = this.serviceConfigs.get(serviceName);
      if (serviceConfig) {
        try {
          const url = await this.consulService.getService(
            serviceConfig.consulName,
          );
          this.logger.debug(`Resolved ${serviceName} from Consul: ${url}`);

          // 缓存 Consul 解析的地址
          this.serviceUrlCache.set(serviceName, {
            url,
            timestamp: Date.now(),
            ttl: this.SERVICE_CACHE_TTL,
          });

          return url;
        } catch (error) {
          this.logger.warn(
            `Failed to get ${serviceName} from Consul: ${error.message}`,
          );
          // Consul 失败时，清除缓存，强制使用 fallback
          this.serviceUrlCache.delete(serviceName);
        }
      }
    }

    // 3. Fallback 到静态配置（环境变量）
    const service = this.services.get(serviceName);
    const fallbackUrl = service?.url || "";

    if (fallbackUrl) {
      this.logger.debug(`Using fallback URL for ${serviceName}: ${fallbackUrl}`);
      // 缓存静态配置（较短的 TTL）
      this.serviceUrlCache.set(serviceName, {
        url: fallbackUrl,
        timestamp: Date.now(),
        ttl: 30000, // 静态配置缓存 30 秒
      });
    }

    return fallbackUrl;
  }

  /**
   * 清除服务 URL 缓存
   */
  clearServiceUrlCache(serviceName?: string): void {
    if (serviceName) {
      this.serviceUrlCache.delete(serviceName);
      this.logger.log(`Cleared URL cache for ${serviceName}`);
    } else {
      this.serviceUrlCache.clear();
      this.logger.log(`Cleared all service URL caches`);
    }
  }

  /**
   * 代理请求到指定的微服务
   */
  proxyRequest(
    serviceName: string,
    path: string,
    method: string,
    data?: any,
    headers?: any,
    params?: any,
  ): Observable<any> {
    return new Observable((subscriber) => {
      this.proxyRequestAsync(serviceName, path, method, data, headers, params)
        .then((result) => {
          subscriber.next(result);
          subscriber.complete();
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }

  /**
   * 异步代理请求（支持 Consul 服务发现）
   */
  private async proxyRequestAsync(
    serviceName: string,
    path: string,
    method: string,
    data?: any,
    headers?: any,
    params?: any,
  ): Promise<any> {
    // 获取服务配置
    const service = this.services.get(serviceName);
    const serviceConfig = this.serviceConfigs.get(serviceName);

    if (!service && !serviceConfig) {
      throw new HttpException(
        `服务 ${serviceName} 不存在`,
        HttpStatus.NOT_FOUND,
      );
    }

    // 获取服务 URL（从 Consul 或静态配置）
    const serviceUrl = await this.getServiceUrl(serviceName);

    if (!serviceUrl) {
      throw new HttpException(
        `无法获取服务 ${serviceName} 的地址`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const url = `${serviceUrl}${path}`;
    const timeout = serviceConfig?.timeout || service?.timeout || 10000;

    const config: AxiosRequestConfig = {
      method: method.toUpperCase() as AxiosRequestConfig['method'],
      url,
      headers: this.sanitizeHeaders(headers),
      timeout,
    };

    // 添加请求参数
    if (params) {
      config.params = params;
    }

    // 根据请求方法添加数据
    if (data && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
      config.data = data;
    }

    this.logger.log(`📤 Proxying ${method} ${url}`);
    this.logger.log(`📋 Config: ${JSON.stringify({url: config.url, params: config.params, method: config.method})}`);

    // 根据请求方法决定是否重试
    const isIdempotent = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'].includes(method.toUpperCase());
    const maxRetries = isIdempotent ? 3 : 0; // 非幂等操作（POST, PATCH）不自动重试

    try {
      const response = await this.executeWithRetry(config, maxRetries, serviceName);
      this.logger.log(`✅ Response from ${serviceName}: status=${response.status}, data keys=${Object.keys(response.data || {})}`);
      return response.data;
    } catch (error: any) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Error proxying to ${serviceName}: ${axiosError.message}`,
        axiosError.stack,
      );

      // 提取错误信息
      const status =
        axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        (axiosError.response?.data as any)?.message ||
        axiosError.message ||
        "服务请求失败";

      throw new HttpException(
        {
          statusCode: status,
          message,
          service: serviceConfig?.name || service?.name || serviceName,
          timestamp: new Date().toISOString(),
        },
        status,
      );
    }
  }

  /**
   * 执行带重试和熔断器保护的HTTP请求
   */
  private async executeWithRetry(
    config: AxiosRequestConfig,
    maxRetries: number,
    serviceName: string,
    attempt = 0,
  ): Promise<AxiosResponse> {
    try {
      // 获取该服务的熔断器
      const breaker = this.circuitBreakers.get(serviceName);

      if (breaker) {
        // 使用熔断器执行请求
        return (await breaker.fire(config)) as AxiosResponse;
      } else {
        // 如果没有熔断器（fallback），直接执行
        this.logger.warn(`No circuit breaker found for ${serviceName}, executing directly`);
        return await this.httpService.axiosRef.request(config);
      }
    } catch (error: any) {
      const axiosError = error as AxiosError;

      // 判断是否应该重试
      const shouldRetry =
        attempt < maxRetries &&
        this.isRetryableError(axiosError);

      if (shouldRetry) {
        const delay = Math.pow(2, attempt) * 500; // 指数退避: 500ms, 1s, 2s
        this.logger.warn(
          `Retry ${attempt + 1}/${maxRetries} for ${serviceName} after ${delay}ms (error: ${axiosError.message})`,
        );

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(config, maxRetries, serviceName, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(error: AxiosError): boolean {
    // 网络错误（没有响应）
    if (!error.response) {
      return true;
    }

    // 5xx 服务器错误
    if (error.response.status >= 500) {
      return true;
    }

    // 429 速率限制（短暂延迟后可能恢复）
    if (error.response.status === 429) {
      return true;
    }

    // 408 请求超时
    if (error.response.status === 408) {
      return true;
    }

    // 其他错误不重试（4xx 客户端错误）
    return false;
  }

  /**
   * 检查所有微服务的健康状态
   */
  async checkServicesHealth(): Promise<Record<string, any>> {
    const healthResults: Record<string, any> = {};

    for (const [key, service] of this.services.entries()) {
      try {
        const startTime = Date.now();
        await this.httpService.axiosRef.get(
          `${service.url}${service.healthCheck}`,
          { timeout: 5000 },
        );
        const responseTime = Date.now() - startTime;

        healthResults[key] = {
          name: service.name,
          status: "healthy",
          url: service.url,
          responseTime: `${responseTime}ms`,
        };
      } catch (error) {
        healthResults[key] = {
          name: service.name,
          status: "unhealthy",
          url: service.url,
          error: error.message,
        };
      }
    }

    return healthResults;
  }

  /**
   * 获取服务配置
   */
  getServiceConfig(serviceName: string): ServiceRoute | undefined {
    return this.services.get(serviceName);
  }

  /**
   * 获取所有服务配置
   */
  getAllServices(): Map<string, ServiceRoute> {
    return this.services;
  }

  /**
   * 获取熔断器状态（用于监控）
   */
  getCircuitBreakerStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [serviceName, breaker] of this.circuitBreakers.entries()) {
      const breakerStats = breaker.stats;
      stats[serviceName] = {
        state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
        stats: {
          fires: breakerStats.fires,
          successes: breakerStats.successes,
          failures: breakerStats.failures,
          rejects: breakerStats.rejects,
          timeouts: breakerStats.timeouts,
          cacheHits: breakerStats.cacheHits,
          cacheMisses: breakerStats.cacheMisses,
          semaphoreRejections: breakerStats.semaphoreRejections,
          percentiles: breakerStats.percentiles,
        },
        enabled: breaker.enabled,
        volumeThreshold: breaker.volumeThreshold,
      };
    }

    return stats;
  }

  /**
   * 清理请求头，移除不应该转发的头
   */
  private sanitizeHeaders(headers: any): any {
    if (!headers) return {};

    const sanitized = { ...headers };

    // 移除不应该转发的请求头
    const excludeHeaders = [
      "host",
      "connection",
      "content-length",
      "transfer-encoding",
    ];

    for (const header of excludeHeaders) {
      delete sanitized[header];
      delete sanitized[header.toLowerCase()];
    }

    return sanitized;
  }
}
