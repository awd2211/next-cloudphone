import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpClientService } from '../http/http-client.service';
import {
  ProxyInfo,
  ProxySession,
  PoolStats,
  ProxyUsageStats,
  AcquireProxyOptions,
  ProxyOperationResult,
  ProxyCriteria,
} from './proxy.interfaces';
import {
  PROXY_CLIENT_CONFIG,
  ProxyClientConfig,
  DEFAULT_ACQUIRE_TIMEOUT,
} from './proxy.constants';

/**
 * 代理客户端服务
 *
 * 用于其他微服务调用 proxy-service 的 HTTP API 来获取和释放代理
 *
 * 使用示例:
 * ```typescript
 * // 1. 导入模块
 * @Module({
 *   imports: [
 *     ProxyClientModule.register({
 *       serviceUrl: 'http://proxy-service:30007',
 *       enabled: true,
 *     }),
 *   ],
 * })
 *
 * // 2. 注入使用
 * constructor(private proxyClient: ProxyClientService) {}
 *
 * async makeRequest() {
 *   // 获取代理
 *   const session = await this.proxyClient.acquireProxy({
 *     criteria: { country: 'US', minQuality: 80 }
 *   });
 *
 *   try {
 *     // 使用代理发送请求
 *     const response = await axios.get('https://api.example.com', {
 *       proxy: {
 *         host: session.proxy.host,
 *         port: session.proxy.port,
 *         auth: {
 *           username: session.proxy.username,
 *           password: session.proxy.password,
 *         },
 *       },
 *     });
 *
 *     // 报告成功
 *     await this.proxyClient.reportSuccess(session.sessionId, 10); // 10MB
 *   } catch (error) {
 *     // 报告失败
 *     await this.proxyClient.reportFailure(session.sessionId, error);
 *   } finally {
 *     // 释放代理
 *     await this.proxyClient.releaseProxy(session.sessionId);
 *   }
 * }
 * ```
 */
@Injectable()
export class ProxyClientService {
  private readonly logger = new Logger(ProxyClientService.name);

  constructor(
    @Inject(PROXY_CLIENT_CONFIG) private config: ProxyClientConfig,
    private httpClient: HttpClientService
  ) {
    this.logger.log(
      `ProxyClientService initialized. Service URL: ${config.serviceUrl}, Enabled: ${config.enabled}`
    );

    if (!config.enabled) {
      this.logger.warn('Proxy client is disabled. All proxy operations will be no-op.');
    }
  }

  /**
   * 获取代理
   *
   * @param options - 获取选项
   * @returns 代理会话信息
   */
  async acquireProxy(
    options?: AcquireProxyOptions
  ): Promise<ProxySession> {
    if (!this.config.enabled) {
      throw new Error('Proxy client is disabled');
    }

    try {
      const timeout = options?.timeout || DEFAULT_ACQUIRE_TIMEOUT;

      this.logger.debug(
        `Acquiring proxy with criteria: ${JSON.stringify(options?.criteria || {})}`
      );

      const response = await this.httpClient.post<ProxySession>(
        `${this.config.serviceUrl}/proxy/acquire`,
        {
          criteria: options?.criteria,
          validate: options?.validate !== false, // 默认验证
        },
        {}, // empty AxiosRequestConfig
        {
          timeout,
          retries: this.config.maxRetries || 2,
          circuitBreaker: this.config.circuitBreaker !== false,
        }
      );

      this.logger.log(
        `Proxy acquired: ${response.sessionId} (${response.proxy.host}:${response.proxy.port})`
      );

      return response;
    } catch (error) {
      this.logger.error(`Failed to acquire proxy: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 释放代理
   *
   * @param sessionId - 会话ID
   */
  async releaseProxy(sessionId: string): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      this.logger.debug(`Releasing proxy session: ${sessionId}`);

      await this.httpClient.post(
        `${this.config.serviceUrl}/proxy/release`,
        { sessionId },
        {}, // empty AxiosRequestConfig
        {
          timeout: 5000,
          retries: 1,
          circuitBreaker: this.config.circuitBreaker !== false,
        }
      );

      this.logger.log(`Proxy released: ${sessionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to release proxy ${sessionId}: ${error.message}`,
        error.stack
      );
      // 不抛出异常，避免影响主流程
    }
  }

  /**
   * 报告代理使用成功
   *
   * @param sessionId - 会话ID
   * @param bandwidthMB - 使用的带宽 (MB)
   */
  async reportSuccess(
    sessionId: string,
    bandwidthMB: number
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      this.logger.debug(
        `Reporting success for session ${sessionId}, bandwidth: ${bandwidthMB}MB`
      );

      await this.httpClient.post(
        `${this.config.serviceUrl}/proxy/report-success`,
        { sessionId, bandwidthMB },
        {}, // empty AxiosRequestConfig
        {
          timeout: 3000,
          retries: 1,
          circuitBreaker: false, // 报告不使用熔断器
        }
      );

      this.logger.debug(`Success reported for session: ${sessionId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to report success for ${sessionId}: ${error.message}`
      );
      // 不抛出异常
    }
  }

  /**
   * 报告代理使用失败
   *
   * @param sessionId - 会话ID
   * @param error - 错误信息
   * @param bandwidthMB - 使用的带宽 (MB, 可选)
   */
  async reportFailure(
    sessionId: string,
    error: Error,
    bandwidthMB?: number
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      this.logger.debug(
        `Reporting failure for session ${sessionId}: ${error.message}`
      );

      await this.httpClient.post(
        `${this.config.serviceUrl}/proxy/report-failure`,
        {
          sessionId,
          error: error.message,
          errorCode: (error as any).code,
          bandwidthMB,
        },
        {}, // empty AxiosRequestConfig
        {
          timeout: 3000,
          retries: 1,
          circuitBreaker: false,
        }
      );

      this.logger.debug(`Failure reported for session: ${sessionId}`);
    } catch (err) {
      this.logger.warn(
        `Failed to report failure for ${sessionId}: ${err.message}`
      );
      // 不抛出异常
    }
  }

  /**
   * 获取代理池统计信息
   *
   * @returns 池统计信息
   */
  async getPoolStats(): Promise<PoolStats> {
    if (!this.config.enabled) {
      throw new Error('Proxy client is disabled');
    }

    try {
      const response = await this.httpClient.get<PoolStats>(
        `${this.config.serviceUrl}/proxy/pool/stats`,
        {}, // empty AxiosRequestConfig
        {
          timeout: 5000,
          retries: 1,
          circuitBreaker: this.config.circuitBreaker !== false,
        }
      );

      return response;
    } catch (error) {
      this.logger.error(`Failed to get pool stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取代理使用统计
   *
   * @param startDate - 开始日期 (可选)
   * @param endDate - 结束日期 (可选)
   * @returns 使用统计信息
   */
  async getUsageStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<ProxyUsageStats> {
    if (!this.config.enabled) {
      throw new Error('Proxy client is disabled');
    }

    try {
      const params: any = {};
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      const response = await this.httpClient.get<ProxyUsageStats>(
        `${this.config.serviceUrl}/proxy/usage/stats`,
        {
          params,
        }, // AxiosRequestConfig with params
        {
          timeout: 5000,
          retries: 1,
          circuitBreaker: this.config.circuitBreaker !== false,
        }
      );

      return response;
    } catch (error) {
      this.logger.error(`Failed to get usage stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 检查代理健康状态
   *
   * @param proxyId - 代理ID
   * @returns 健康检查结果
   */
  async checkProxyHealth(proxyId: string): Promise<{
    healthy: boolean;
    latencyMs: number;
    error?: string;
  }> {
    if (!this.config.enabled) {
      throw new Error('Proxy client is disabled');
    }

    try {
      this.logger.debug(`Checking health for proxy: ${proxyId}`);

      const response = await this.httpClient.get<{
        healthy: boolean;
        latencyMs: number;
        error?: string;
      }>(
        `${this.config.serviceUrl}/proxy/health/${proxyId}`,
        {}, // empty AxiosRequestConfig
        {
          timeout: 10000, // 健康检查超时 10 秒
          retries: 1,
          circuitBreaker: false, // 健康检查不使用熔断器
        }
      );

      this.logger.debug(
        `Health check result for ${proxyId}: healthy=${response.healthy}, latency=${response.latencyMs}ms`
      );

      return response;
    } catch (error) {
      this.logger.warn(
        `Health check failed for proxy ${proxyId}: ${error.message}`
      );

      // 健康检查失败，返回不健康状态
      return {
        healthy: false,
        latencyMs: 0,
        error: error.message,
      };
    }
  }

  /**
   * 检查代理客户端是否启用
   *
   * @returns 是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * 使用代理执行HTTP请求 (辅助方法)
   *
   * 自动获取代理、执行请求、报告结果、释放代理的完整流程
   *
   * @param fn - 请求函数，接收代理信息作为参数
   * @param options - 获取代理的选项
   * @returns 请求结果
   */
  async withProxy<T>(
    fn: (proxy: ProxyInfo) => Promise<T>,
    options?: AcquireProxyOptions
  ): Promise<T> {
    if (!this.config.enabled) {
      throw new Error('Proxy client is disabled');
    }

    let session: ProxySession | null = null;

    try {
      // 1. 获取代理
      session = await this.acquireProxy(options);

      // 2. 执行请求
      const result = await fn(session.proxy);

      // 3. 报告成功 (假设使用了1MB带宽)
      await this.reportSuccess(session.sessionId, 1);

      return result;
    } catch (error) {
      // 报告失败
      if (session) {
        await this.reportFailure(session.sessionId, error, 0);
      }
      throw error;
    } finally {
      // 4. 释放代理
      if (session) {
        await this.releaseProxy(session.sessionId);
      }
    }
  }
}
