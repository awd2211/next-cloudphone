import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { catchError, map, Observable } from 'rxjs';

export interface ServiceRoute {
  name: string;
  url: string;
  healthCheck: string;
  timeout?: number;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly services: Map<string, ServiceRoute>;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // 初始化微服务路由配置
    this.services = new Map([
      [
        'users',
        {
          name: 'User Service',
          url: this.configService.get('USER_SERVICE_URL') || 'http://localhost:30001',
          healthCheck: '/health',
          timeout: 10000,
        },
      ],
      [
        'devices',
        {
          name: 'Device Service',
          url: this.configService.get('DEVICE_SERVICE_URL') || 'http://localhost:30002',
          healthCheck: '/health',
          timeout: 10000,
        },
      ],
      [
        'apps',
        {
          name: 'App Service',
          url: this.configService.get('APP_SERVICE_URL') || 'http://localhost:30003',
          healthCheck: '/health',
          timeout: 30000, // APK 上传可能需要更长时间
        },
      ],
      [
        'scheduler',
        {
          name: 'Scheduler Service',
          url: this.configService.get('SCHEDULER_SERVICE_URL') || 'http://localhost:30004',
          healthCheck: '/health',
          timeout: 10000,
        },
      ],
      [
        'billing',
        {
          name: 'Billing Service',
          url: this.configService.get('BILLING_SERVICE_URL') || 'http://localhost:30005',
          healthCheck: '/api/health',
          timeout: 10000,
        },
      ],
      [
        'notifications',
        {
          name: 'Notification Service',
          url: this.configService.get('NOTIFICATION_SERVICE_URL') || 'http://localhost:30006',
          healthCheck: '/health',
          timeout: 10000,
        },
      ],
      [
        'media',
        {
          name: 'Media Service',
          url: this.configService.get('MEDIA_SERVICE_URL') || 'http://localhost:30007',
          healthCheck: '/health',
          timeout: 5000,
        },
      ],
    ]);
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
    const service = this.services.get(serviceName);

    if (!service) {
      throw new HttpException(
        `服务 ${serviceName} 不存在`,
        HttpStatus.NOT_FOUND,
      );
    }

    const url = `${service.url}${path}`;
    const config: AxiosRequestConfig = {
      method: method as any,
      url,
      headers: this.sanitizeHeaders(headers),
      timeout: service.timeout || 10000,
    };

    // 添加请求参数
    if (params) {
      config.params = params;
    }

    // 根据请求方法添加数据
    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      config.data = data;
    }

    this.logger.debug(`Proxying ${method} ${url}`);

    return this.httpService.request(config).pipe(
      map((response) => response.data),
      catchError((error: AxiosError) => {
        this.logger.error(
          `Error proxying to ${service.name}: ${error.message}`,
          error.stack,
        );

        // 提取错误信息
        const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const message =
          (error.response?.data as any)?.message ||
          error.message ||
          '服务请求失败';

        throw new HttpException(
          {
            statusCode: status,
            message,
            service: service.name,
            timestamp: new Date().toISOString(),
          },
          status,
        );
      }),
    );
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
          status: 'healthy',
          url: service.url,
          responseTime: `${responseTime}ms`,
        };
      } catch (error) {
        healthResults[key] = {
          name: service.name,
          status: 'unhealthy',
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
   * 清理请求头，移除不应该转发的头
   */
  private sanitizeHeaders(headers: any): any {
    if (!headers) return {};

    const sanitized = { ...headers };

    // 移除不应该转发的请求头
    const excludeHeaders = [
      'host',
      'connection',
      'content-length',
      'transfer-encoding',
    ];

    for (const header of excludeHeaders) {
      delete sanitized[header];
      delete sanitized[header.toLowerCase()];
    }

    return sanitized;
  }
}
