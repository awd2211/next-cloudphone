import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry, timeout, tap } from 'rxjs/operators';
import * as CircuitBreaker from 'opossum';

export interface HttpClientOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  circuitBreaker?: boolean;
}

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  /**
   * GET 请求
   */
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    options?: HttpClientOptions,
  ): Promise<T> {
    this.logger.debug(`GET ${url}`);

    const observable = this.httpService.get<T>(url, config).pipe(
      timeout(options?.timeout || 5000),
      retry({
        count: options?.retries || 3,
        delay: (error, retryCount) => {
          const delay = options?.retryDelay || 1000;
          this.logger.warn(`Retry ${retryCount} for GET ${url} after ${delay}ms`);
          return timer(delay * retryCount);
        },
      }),
      tap(() => this.logger.debug(`GET ${url} succeeded`)),
      catchError((error) => {
        this.logger.error(`GET ${url} failed: ${error.message}`);
        return throwError(() => error);
      }),
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
    options?: HttpClientOptions,
  ): Promise<T> {
    this.logger.debug(`POST ${url}`);

    const observable = this.httpService.post<T>(url, data, config).pipe(
      timeout(options?.timeout || 10000),
      retry({
        count: options?.retries || 3,
        delay: (error, retryCount) => {
          // 只重试 5xx 错误
          if (error.response && error.response.status < 500) {
            throw error;
          }
          const delay = options?.retryDelay || 1000;
          this.logger.warn(`Retry ${retryCount} for POST ${url} after ${delay}ms`);
          return timer(delay * retryCount);
        },
      }),
      tap(() => this.logger.debug(`POST ${url} succeeded`)),
      catchError((error) => {
        this.logger.error(`POST ${url} failed: ${error.message}`);
        return throwError(() => error);
      }),
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
    options?: HttpClientOptions,
  ): Promise<T> {
    this.logger.debug(`PUT ${url}`);

    const observable = this.httpService.put<T>(url, data, config).pipe(
      timeout(options?.timeout || 10000),
      retry({
        count: options?.retries || 3,
        delay: (error, retryCount) => {
          if (error.response && error.response.status < 500) {
            throw error;
          }
          const delay = options?.retryDelay || 1000;
          return timer(delay * retryCount);
        },
      }),
      tap(() => this.logger.debug(`PUT ${url} succeeded`)),
      catchError((error) => {
        this.logger.error(`PUT ${url} failed: ${error.message}`);
        return throwError(() => error);
      }),
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
    options?: HttpClientOptions,
  ): Promise<T> {
    this.logger.debug(`DELETE ${url}`);

    const observable = this.httpService.delete<T>(url, config).pipe(
      timeout(options?.timeout || 5000),
      retry({
        count: options?.retries || 3,
        delay: (error, retryCount) => {
          if (error.response && error.response.status < 500) {
            throw error;
          }
          const delay = options?.retryDelay || 1000;
          return timer(delay * retryCount);
        },
      }),
      tap(() => this.logger.debug(`DELETE ${url} succeeded`)),
      catchError((error) => {
        this.logger.error(`DELETE ${url} failed: ${error.message}`);
        return throwError(() => error);
      }),
    );

    try {
      const response = await this.toPromise(observable);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 带熔断器的请求
   */
  async requestWithCircuitBreaker<T = any>(
    serviceKey: string,
    requestFn: () => Promise<T>,
    breakerOptions?: CircuitBreaker.Options,
  ): Promise<T> {
    let breaker = this.circuitBreakers.get(serviceKey);

    if (!breaker) {
      const options: CircuitBreaker.Options = {
        timeout: 3000, // 超时时间
        errorThresholdPercentage: 50, // 错误率阈值
        resetTimeout: 30000, // 重置时间
        ...breakerOptions,
      };

      breaker = new CircuitBreaker(requestFn, options);

      // 监听熔断器事件
      breaker.on('open', () => {
        this.logger.warn(`Circuit breaker OPEN for ${serviceKey}`);
      });

      breaker.on('halfOpen', () => {
        this.logger.log(`Circuit breaker HALF-OPEN for ${serviceKey}`);
      });

      breaker.on('close', () => {
        this.logger.log(`Circuit breaker CLOSED for ${serviceKey}`);
      });

      breaker.on('fallback', () => {
        this.logger.warn(`Circuit breaker FALLBACK for ${serviceKey}`);
      });

      this.circuitBreakers.set(serviceKey, breaker);
    }

    try {
      return await breaker.fire();
    } catch (error) {
      this.logger.error(`Circuit breaker error for ${serviceKey}:`, error);
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
