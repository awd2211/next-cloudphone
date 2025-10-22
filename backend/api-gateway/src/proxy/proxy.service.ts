import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { AxiosError, AxiosRequestConfig } from "axios";
import { catchError, map, Observable } from "rxjs";
import { ConsulService } from "@cloudphone/shared";

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

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly services: Map<string, ServiceRoute>;
  private readonly serviceConfigs: Map<string, ServiceConfig>;
  private readonly useConsul: boolean;

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
  }

  /**
   * 获取服务的 URL（支持 Consul 动态发现）
   */
  private async getServiceUrl(serviceName: string): Promise<string> {
    if (this.useConsul) {
      const serviceConfig = this.serviceConfigs.get(serviceName);
      if (serviceConfig) {
        try {
          // 从 Consul 获取服务地址
          const url = await this.consulService.getService(
            serviceConfig.consulName,
          );
          this.logger.debug(`Resolved ${serviceName} from Consul: ${url}`);
          return url;
        } catch (error) {
          this.logger.warn(
            `Failed to get ${serviceName} from Consul: ${error.message}, using fallback`,
          );
        }
      }
    }

    // Fallback 到静态配置
    const service = this.services.get(serviceName);
    return service?.url || "";
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
      method: method as any,
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

    try {
      const response = await this.httpService.axiosRef.request(config);
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
