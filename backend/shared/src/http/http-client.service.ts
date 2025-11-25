import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry, timeout, tap } from 'rxjs/operators';
import CircuitBreaker from 'opossum';

// 扩展 Axios 配置类型以支持自定义属性
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _startTime?: number;
}

export interface HttpClientOptions {
  timeout?: number; // 超时时间（毫秒），默认：GET/DELETE=5000, POST/PUT=10000
  retries?: number; // 重试次数，默认：3
  retryDelay?: number; // 基础重试延迟（毫秒），默认：1000
  exponentialBackoff?: boolean; // 是否使用指数退避，默认：true
  maxRetryDelay?: number; // 最大重试延迟（毫秒），默认：30000
  retryableStatuses?: number[]; // 可重试的HTTP状态码，默认：[500, 502, 503, 504, 429]
  circuitBreaker?: boolean; // 是否启用断路器，默认：false
  fallbackValue?: any; // 降级返回值
  serviceName?: string; // 服务名称（用于metrics）
}

/**
 * HTTP请求统计数据
 */
export interface RequestMetrics {
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  lastRequestTime: Date;
}

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);
  private circuitBreakers: Map<string, CircuitBreaker<any, any>> = new Map();

  // ✅ 新增：请求统计
  private metrics: Map<string, RequestMetrics> = new Map();

  // ✅ 新增：请求拦截器配置标志
  private interceptorsConfigured = false;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService
  ) {
    this.configureInterceptors();
  }

  /**
   * 配置Axios拦截器（用于统计和日志）
   */
  private configureInterceptors(): void {
    if (this.interceptorsConfigured) return;

    const axiosInstance = this.httpService.axiosRef;

    // ✅ 连接池配置
    axiosInstance.defaults.httpAgent = require('http').Agent({
      keepAlive: true,
      maxSockets: 100, // 最大并发连接数
      maxFreeSockets: 10, // 空闲连接池大小
      timeout: 60000, // 连接超时
      keepAliveMsecs: 1000,
    });

    axiosInstance.defaults.httpsAgent = require('https').Agent({
      keepAlive: true,
      maxSockets: 100,
      maxFreeSockets: 10,
      timeout: 60000,
      keepAliveMsecs: 1000,
    });

    // ✅ 请求拦截器：记录开始时间
    axiosInstance.interceptors.request.use(
      (config: ExtendedAxiosRequestConfig) => {
        config._startTime = Date.now();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // ✅ 响应拦截器：记录统计数据
    axiosInstance.interceptors.response.use(
      (response) => {
        this.recordMetrics(response.config, true);
        return response;
      },
      (error) => {
        this.recordMetrics(error.config, false);
        return Promise.reject(error);
      }
    );

    this.interceptorsConfigured = true;
    this.logger.log('✅ HTTP Client interceptors and connection pool configured');
  }

  /**
   * 记录请求统计数据
   */
  private recordMetrics(config: ExtendedAxiosRequestConfig | undefined, success: boolean): void {
    if (!config || !config.url) return;

    const serviceName = this.extractServiceName(config.url);
    const duration = config._startTime ? Date.now() - config._startTime : 0;

    let metrics = this.metrics.get(serviceName);

    if (!metrics) {
      metrics = {
        totalRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        lastRequestTime: new Date(),
      };
      this.metrics.set(serviceName, metrics);
    }

    metrics.totalRequests++;
    if (success) {
      metrics.successRequests++;
    } else {
      metrics.failedRequests++;
    }

    metrics.totalDuration += duration;
    metrics.avgDuration = metrics.totalDuration / metrics.totalRequests;
    metrics.minDuration = Math.min(metrics.minDuration, duration);
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);
    metrics.lastRequestTime = new Date();
  }

  /**
   * 从URL提取服务名称
   */
  private extractServiceName(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // 提取服务名（例如: user-service, device-service）
      if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        const pathParts = urlObj.pathname.split('/');
        return pathParts[1] || 'unknown';
      }

      return hostname.split('.')[0] || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * ✅ 新增：判断错误是否可重试
   */
  private isRetryableError(error: any, options?: HttpClientOptions): boolean {
    // 默认可重试的状态码
    const defaultRetryableStatuses = [500, 502, 503, 504, 429];
    const retryableStatuses = options?.retryableStatuses || defaultRetryableStatuses;

    // 1. 如果是HTTP响应错误，检查状态码
    if (error.response) {
      return retryableStatuses.includes(error.response.status);
    }

    // 2. 如果是网络错误（无响应），可重试
    if (error.code) {
      const retryableErrorCodes = [
        'ECONNRESET',   // 连接重置
        'ETIMEDOUT',    // 连接超时
        'ECONNREFUSED', // 连接被拒绝
        'ENETUNREACH',  // 网络不可达
        'ENOTFOUND',    // DNS查询失败
        'EAI_AGAIN',    // DNS临时失败
      ];
      return retryableErrorCodes.includes(error.code);
    }

    // 3. 如果是超时错误（RxJS timeout operator）
    if (error.name === 'TimeoutError') {
      return true;
    }

    // 默认不重试
    return false;
  }

  /**
   * ✅ 新增：计算重试延迟（支持指数退避和jitter）
   */
  private calculateRetryDelay(retryCount: number, options?: HttpClientOptions): number {
    const baseDelay = options?.retryDelay || 1000;
    const useExponentialBackoff = options?.exponentialBackoff !== false; // 默认启用
    const maxDelay = options?.maxRetryDelay || 30000;

    let delay: number;

    if (useExponentialBackoff) {
      // 指数退避：baseDelay * 2^(retryCount - 1)
      delay = baseDelay * Math.pow(2, retryCount - 1);
    } else {
      // 线性退避：baseDelay * retryCount
      delay = baseDelay * retryCount;
    }

    // 限制最大延迟
    delay = Math.min(delay, maxDelay);

    // 添加随机抖动（±25%），避免"惊群效应"
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    delay = Math.max(0, delay + jitter);

    return Math.floor(delay);
  }

  /**
   * GET 请求
   */
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    options?: HttpClientOptions
  ): Promise<T> {
    this.logger.debug(`GET ${url}`);

    const observable = this.httpService.get<T>(url, config).pipe(
      timeout(options?.timeout || 5000),
      retry({
        count: options?.retries || 3,
        delay: (error, retryCount) => {
          // ✅ 使用智能重试判断
          if (!this.isRetryableError(error, options)) {
            this.logger.warn(`Non-retryable error for GET ${url}, aborting retry`);
            throw error; // 不可重试的错误，直接抛出
          }

          // ✅ 使用指数退避计算延迟
          const delay = this.calculateRetryDelay(retryCount, options);
          this.logger.warn(
            `Retry ${retryCount}/${options?.retries || 3} for GET ${url} after ${delay}ms (error: ${error.message})`
          );
          return timer(delay);
        },
      }),
      tap(() => this.logger.debug(`GET ${url} succeeded`)),
      catchError((error) => {
        this.logger.error(`GET ${url} failed after retries: ${error.message}`);
        return throwError(() => error);
      })
    );

    try {
      const response = await this.toPromise(observable);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * POST 请求
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    options?: HttpClientOptions
  ): Promise<T> {
    this.logger.debug(`POST ${url}`);

    const observable = this.httpService.post<T>(url, data, config).pipe(
      timeout(options?.timeout || 10000),
      retry({
        count: options?.retries || 3,
        delay: (error, retryCount) => {
          // ✅ 使用智能重试判断（POST默认只重试5xx和网络错误）
          if (!this.isRetryableError(error, options)) {
            this.logger.warn(`Non-retryable error for POST ${url}, aborting retry`);
            throw error;
          }

          // ✅ 使用指数退避计算延迟
          const delay = this.calculateRetryDelay(retryCount, options);
          this.logger.warn(
            `Retry ${retryCount}/${options?.retries || 3} for POST ${url} after ${delay}ms (error: ${error.message})`
          );
          return timer(delay);
        },
      }),
      tap(() => this.logger.debug(`POST ${url} succeeded`)),
      catchError((error) => {
        this.logger.error(`POST ${url} failed after retries: ${error.message}`);
        return throwError(() => error);
      })
    );

    try {
      const response = await this.toPromise(observable);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * PUT 请求
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    options?: HttpClientOptions
  ): Promise<T> {
    this.logger.debug(`PUT ${url}`);

    const observable = this.httpService.put<T>(url, data, config).pipe(
      timeout(options?.timeout || 10000),
      retry({
        count: options?.retries || 3,
        delay: (error, retryCount) => {
          // ✅ 使用智能重试判断
          if (!this.isRetryableError(error, options)) {
            this.logger.warn(`Non-retryable error for PUT ${url}, aborting retry`);
            throw error;
          }

          // ✅ 使用指数退避计算延迟
          const delay = this.calculateRetryDelay(retryCount, options);
          this.logger.warn(
            `Retry ${retryCount}/${options?.retries || 3} for PUT ${url} after ${delay}ms (error: ${error.message})`
          );
          return timer(delay);
        },
      }),
      tap(() => this.logger.debug(`PUT ${url} succeeded`)),
      catchError((error) => {
        this.logger.error(`PUT ${url} failed after retries: ${error.message}`);
        return throwError(() => error);
      })
    );

    try {
      const response = await this.toPromise(observable);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * PATCH 请求
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    options?: HttpClientOptions
  ): Promise<T> {
    this.logger.debug(`PATCH ${url}`);

    const observable = this.httpService.patch<T>(url, data, config).pipe(
      timeout(options?.timeout || 10000),
      retry({
        count: options?.retries || 3,
        delay: (error, retryCount) => {
          // ✅ 使用智能重试判断
          if (!this.isRetryableError(error, options)) {
            this.logger.warn(`Non-retryable error for PATCH ${url}, aborting retry`);
            throw error;
          }

          // ✅ 使用指数退避计算延迟
          const delay = this.calculateRetryDelay(retryCount, options);
          this.logger.warn(
            `Retry ${retryCount}/${options?.retries || 3} for PATCH ${url} after ${delay}ms (error: ${error.message})`
          );
          return timer(delay);
        },
      }),
      tap(() => this.logger.debug(`PATCH ${url} succeeded`)),
      catchError((error) => {
        this.logger.error(`PATCH ${url} failed after retries: ${error.message}`);
        return throwError(() => error);
      })
    );

    try {
      const response = await this.toPromise(observable);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * DELETE 请求
   */
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    options?: HttpClientOptions
  ): Promise<T> {
    this.logger.debug(`DELETE ${url}`);

    const observable = this.httpService.delete<T>(url, config).pipe(
      timeout(options?.timeout || 5000),
      retry({
        count: options?.retries || 3,
        delay: (error, retryCount) => {
          // ✅ 使用智能重试判断
          if (!this.isRetryableError(error, options)) {
            this.logger.warn(`Non-retryable error for DELETE ${url}, aborting retry`);
            throw error;
          }

          // ✅ 使用指数退避计算延迟
          const delay = this.calculateRetryDelay(retryCount, options);
          this.logger.warn(
            `Retry ${retryCount}/${options?.retries || 3} for DELETE ${url} after ${delay}ms (error: ${error.message})`
          );
          return timer(delay);
        },
      }),
      tap(() => this.logger.debug(`DELETE ${url} succeeded`)),
      catchError((error) => {
        this.logger.error(`DELETE ${url} failed after retries: ${error.message}`);
        return throwError(() => error);
      })
    );

    try {
      const response = await this.toPromise(observable);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * ✅ 改进：获取或创建断路器实例
   */
  private getOrCreateCircuitBreaker<T>(
    serviceKey: string,
    breakerOptions?: Partial<CircuitBreaker.Options>
  ): CircuitBreaker<any[], T> {
    let breaker = this.circuitBreakers.get(serviceKey);

    if (!breaker) {
      // ✅ 更合理的默认配置
      const options: CircuitBreaker.Options = {
        timeout: 10000, // 单次请求超时（比HTTP timeout略长）
        errorThresholdPercentage: 50, // 错误率阈值50%
        resetTimeout: 30000, // 半开状态重置时间30秒
        rollingCountTimeout: 10000, // 滚动窗口10秒
        rollingCountBuckets: 10, // 滚动窗口分桶数
        volumeThreshold: 10, // 最小请求量阈值（少于此数量不开启断路器）
        ...breakerOptions,
      };

      // ✅ 创建通用断路器（接受函数作为参数）
      breaker = new CircuitBreaker(async (...args: any[]) => args[0](), options);

      // ✅ 监听断路器事件（增强日志）
      breaker.on('open', () => {
        this.logger.error(`🔴 Circuit breaker OPEN for ${serviceKey} - Service is degraded`);
      });

      breaker.on('halfOpen', () => {
        this.logger.warn(`🟡 Circuit breaker HALF-OPEN for ${serviceKey} - Testing recovery`);
      });

      breaker.on('close', () => {
        this.logger.log(`🟢 Circuit breaker CLOSED for ${serviceKey} - Service recovered`);
      });

      breaker.on('fallback', (result) => {
        this.logger.warn(`⚠️  Circuit breaker FALLBACK activated for ${serviceKey}`);
      });

      breaker.on('failure', (error) => {
        this.logger.debug(`Circuit breaker recorded failure for ${serviceKey}: ${error.message}`);
      });

      breaker.on('success', () => {
        this.logger.debug(`Circuit breaker recorded success for ${serviceKey}`);
      });

      this.circuitBreakers.set(serviceKey, breaker);
      this.logger.log(`Circuit breaker created for ${serviceKey}`);
    }

    return breaker;
  }

  /**
   * ✅ 改进：带断路器和降级的通用请求包装
   */
  async requestWithCircuitBreaker<T = any>(
    serviceKey: string,
    requestFn: () => Promise<T>,
    options?: {
      breakerOptions?: Partial<CircuitBreaker.Options>;
      fallbackValue?: T;
      fallbackFn?: () => Promise<T>;
    }
  ): Promise<T> {
    const breaker = this.getOrCreateCircuitBreaker<T>(serviceKey, options?.breakerOptions);

    // ✅ 设置降级策略
    if (options?.fallbackValue !== undefined) {
      breaker.fallback(() => options.fallbackValue);
    } else if (options?.fallbackFn) {
      breaker.fallback(options.fallbackFn);
    }

    try {
      return await breaker.fire(requestFn);
    } catch (error) {
      this.logger.error(`Circuit breaker execution failed for ${serviceKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取熔断器统计信息
   */
  getCircuitBreakerStats(serviceKey: string): any {
    const breaker = this.circuitBreakers.get(serviceKey);
    if (!breaker) {
      return null;
    }

    return {
      state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF-OPEN' : 'CLOSED',
      stats: breaker.stats,
    };
  }

  /**
   * 重置熔断器
   */
  resetCircuitBreaker(serviceKey: string): void {
    const breaker = this.circuitBreakers.get(serviceKey);
    if (breaker) {
      breaker.close();
      this.logger.log(`Circuit breaker reset for ${serviceKey}`);
    }
  }

  /**
   * ✅ 新增：获取所有服务的请求统计
   */
  getAllMetrics(): Record<string, RequestMetrics> {
    const result: Record<string, RequestMetrics> = {};

    this.metrics.forEach((metrics, serviceName) => {
      result[serviceName] = { ...metrics };
    });

    return result;
  }

  /**
   * ✅ 新增：获取特定服务的请求统计
   */
  getServiceMetrics(serviceName: string): RequestMetrics | null {
    return this.metrics.get(serviceName) || null;
  }

  /**
   * ✅ 新增：获取所有断路器状态
   */
  getAllCircuitBreakerStatus(): Record<string, any> {
    const result: Record<string, any> = {};

    this.circuitBreakers.forEach((breaker, serviceKey) => {
      result[serviceKey] = {
        state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF-OPEN' : 'CLOSED',
        stats: breaker.stats,
      };
    });

    return result;
  }

  /**
   * ✅ 新增：健康检查 - 检查所有服务的通信状态
   */
  getHealthStatus(): {
    healthy: boolean;
    services: Record<
      string,
      {
        healthy: boolean;
        metrics: RequestMetrics | null;
        circuitBreaker: any;
      }
    >;
  } {
    const services: Record<string, any> = {};
    let overallHealthy = true;

    // 合并所有服务名称（来自metrics和断路器）
    const allServiceNames = new Set([
      ...Array.from(this.metrics.keys()),
      ...Array.from(this.circuitBreakers.keys()),
    ]);

    allServiceNames.forEach((serviceName) => {
      const metrics = this.metrics.get(serviceName);
      const breaker = this.circuitBreakers.get(serviceName);

      const isHealthy =
        (!breaker || !breaker.opened) && // 断路器未打开
        (!metrics || metrics.successRequests / metrics.totalRequests > 0.5); // 成功率 > 50%

      if (!isHealthy) {
        overallHealthy = false;
      }

      services[serviceName] = {
        healthy: isHealthy,
        metrics: metrics || null,
        circuitBreaker: breaker
          ? {
              state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF-OPEN' : 'CLOSED',
              stats: breaker.stats,
            }
          : null,
      };
    });

    return {
      healthy: overallHealthy,
      services,
    };
  }

  /**
   * ✅ 新增：重置所有统计数据
   */
  resetAllMetrics(): void {
    this.metrics.clear();
    this.logger.log('All metrics reset');
  }

  /**
   * ✅ 新增：带断路器的GET请求
   * 使用场景：对外部服务的关键查询接口，需要断路保护
   */
  async getWithCircuitBreaker<T = any>(
    serviceName: string,
    url: string,
    config?: AxiosRequestConfig,
    options?: Omit<HttpClientOptions, 'circuitBreaker'>
  ): Promise<T> {
    return this.requestWithCircuitBreaker(
      serviceName,
      () => this.get<T>(url, config, options),
      {
        fallbackValue: options?.fallbackValue,
      }
    );
  }

  /**
   * ✅ 新增：带断路器的POST请求
   * 使用场景：对外部服务的关键写入操作，需要断路保护和降级
   */
  async postWithCircuitBreaker<T = any>(
    serviceName: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    options?: Omit<HttpClientOptions, 'circuitBreaker'>
  ): Promise<T> {
    return this.requestWithCircuitBreaker(
      serviceName,
      () => this.post<T>(url, data, config, options),
      {
        fallbackValue: options?.fallbackValue,
      }
    );
  }

  /**
   * ✅ 新增：带断路器的PUT请求
   */
  async putWithCircuitBreaker<T = any>(
    serviceName: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    options?: Omit<HttpClientOptions, 'circuitBreaker'>
  ): Promise<T> {
    return this.requestWithCircuitBreaker(
      serviceName,
      () => this.put<T>(url, data, config, options),
      {
        fallbackValue: options?.fallbackValue,
      }
    );
  }

  /**
   * ✅ 新增：带断路器的DELETE请求
   */
  async deleteWithCircuitBreaker<T = any>(
    serviceName: string,
    url: string,
    config?: AxiosRequestConfig,
    options?: Omit<HttpClientOptions, 'circuitBreaker'>
  ): Promise<T> {
    return this.requestWithCircuitBreaker(
      serviceName,
      () => this.delete<T>(url, config, options),
      {
        fallbackValue: options?.fallbackValue,
      }
    );
  }

  /**
   * ✅ 新增：带断路器的PATCH请求
   */
  async patchWithCircuitBreaker<T = any>(
    serviceName: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    options?: Omit<HttpClientOptions, 'circuitBreaker'>
  ): Promise<T> {
    return this.requestWithCircuitBreaker(
      serviceName,
      () => this.patch<T>(url, data, config, options),
      {
        fallbackValue: options?.fallbackValue,
      }
    );
  }

  /**
   * Observable 转 Promise
   */
  private async toPromise<T>(observable: Observable<AxiosResponse<T>>): Promise<AxiosResponse<T>> {
    return new Promise((resolve, reject) => {
      observable.subscribe({
        next: (response) => resolve(response),
        error: (error) => reject(error),
      });
    });
  }
}
