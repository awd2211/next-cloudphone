import { Module, DynamicModule, Global } from '@nestjs/common';
import { ProxyClientService } from './proxy-client.service';
import {
  PROXY_CLIENT_CONFIG,
  ProxyClientConfig,
  DEFAULT_PROXY_SERVICE_URL,
} from './proxy.constants';
import { HttpClientModule } from '../http/http-client.module';

/**
 * 代理客户端模块
 *
 * 提供 ProxyClientService 用于其他微服务调用 proxy-service
 *
 * 使用示例:
 *
 * ```typescript
 * // app.module.ts
 * @Module({
 *   imports: [
 *     ProxyClientModule.register({
 *       serviceUrl: process.env.PROXY_SERVICE_URL || 'http://localhost:30007',
 *       enabled: process.env.PROXY_ENABLED === 'true',
 *       timeout: 10000,
 *       maxRetries: 2,
 *       circuitBreaker: true,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 *
 * // 在服务中使用
 * @Injectable()
 * export class MyService {
 *   constructor(private proxyClient: ProxyClientService) {}
 *
 *   async makeRequest() {
 *     const session = await this.proxyClient.acquireProxy({
 *       criteria: { country: 'US', minQuality: 80 }
 *     });
 *
 *     try {
 *       // 使用代理
 *       const result = await this.httpClient.get('https://api.example.com', {
 *         proxy: {
 *           host: session.proxy.host,
 *           port: session.proxy.port,
 *         },
 *       });
 *
 *       await this.proxyClient.reportSuccess(session.sessionId, 10);
 *       return result;
 *     } catch (error) {
 *       await this.proxyClient.reportFailure(session.sessionId, error);
 *       throw error;
 *     } finally {
 *       await this.proxyClient.releaseProxy(session.sessionId);
 *     }
 *   }
 *
 *   // 或使用便捷方法
 *   async makeRequestWithProxy() {
 *     return await this.proxyClient.withProxy(
 *       async (proxy) => {
 *         return await this.httpClient.get('https://api.example.com', {
 *           proxy: {
 *             host: proxy.host,
 *             port: proxy.port,
 *           },
 *         });
 *       },
 *       { criteria: { country: 'US' } }
 *     );
 *   }
 * }
 * ```
 */
@Global()
@Module({})
export class ProxyClientModule {
  /**
   * 同步注册代理客户端模块
   *
   * @param config - 代理客户端配置
   * @returns 动态模块
   */
  static register(config: Partial<ProxyClientConfig> = {}): DynamicModule {
    const fullConfig: ProxyClientConfig = {
      serviceUrl: config.serviceUrl || DEFAULT_PROXY_SERVICE_URL,
      enabled: config.enabled !== false, // 默认启用
      timeout: config.timeout || 10000,
      maxRetries: config.maxRetries !== undefined ? config.maxRetries : 2,
      circuitBreaker:
        config.circuitBreaker !== undefined ? config.circuitBreaker : true,
    };

    return {
      module: ProxyClientModule,
      imports: [HttpClientModule],
      providers: [
        {
          provide: PROXY_CLIENT_CONFIG,
          useValue: fullConfig,
        },
        ProxyClientService,
      ],
      exports: [ProxyClientService],
    };
  }

  /**
   * 异步注册代理客户端模块
   *
   * 从 ConfigService 读取配置
   *
   * @returns 动态模块
   */
  static registerAsync(): DynamicModule {
    return {
      module: ProxyClientModule,
      imports: [HttpClientModule],
      providers: [
        {
          provide: PROXY_CLIENT_CONFIG,
          useFactory: () => {
            // 从环境变量读取配置
            const serviceUrl =
              process.env.PROXY_SERVICE_URL || DEFAULT_PROXY_SERVICE_URL;
            const enabled = process.env.PROXY_ENABLED === 'true';
            const timeout = parseInt(process.env.PROXY_TIMEOUT || '10000', 10);
            const maxRetries = parseInt(
              process.env.PROXY_MAX_RETRIES || '2',
              10
            );
            const circuitBreaker =
              process.env.PROXY_CIRCUIT_BREAKER !== 'false';

            const config: ProxyClientConfig = {
              serviceUrl,
              enabled,
              timeout,
              maxRetries,
              circuitBreaker,
            };

            return config;
          },
        },
        ProxyClientService,
      ],
      exports: [ProxyClientService],
    };
  }

  /**
   * 从 ConfigService 异步注册（需要注入 ConfigService）
   *
   * @returns 动态模块
   */
  static registerAsyncWithConfig(): DynamicModule {
    return {
      module: ProxyClientModule,
      imports: [HttpClientModule],
      providers: [
        {
          provide: PROXY_CLIENT_CONFIG,
          useFactory: (configService: any) => {
            const config: ProxyClientConfig = {
              serviceUrl:
                configService.get('PROXY_SERVICE_URL') ||
                DEFAULT_PROXY_SERVICE_URL,
              enabled: configService.get('PROXY_ENABLED', 'false') === 'true',
              timeout: parseInt(
                configService.get('PROXY_TIMEOUT', '10000'),
                10
              ),
              maxRetries: parseInt(
                configService.get('PROXY_MAX_RETRIES', '2'),
                10
              ),
              circuitBreaker:
                configService.get('PROXY_CIRCUIT_BREAKER', 'true') === 'true',
            };

            return config;
          },
          inject: ['ConfigService'], // 注入 ConfigService
        },
        ProxyClientService,
      ],
      exports: [ProxyClientService],
    };
  }
}
