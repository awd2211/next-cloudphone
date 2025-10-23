import { Controller, Get, HttpStatus, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import * as os from "os";
import { ProxyService } from "./proxy/proxy.service";
import { ConsulService } from "@cloudphone/shared";

interface HealthCheckResult {
  status: "ok" | "degraded" | "unhealthy";
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  environment: string;
  system: {
    hostname: string;
    platform: string;
    memory: {
      total: number;
      free: number;
      used: number;
      usagePercent: number;
    };
    cpu: {
      cores: number;
      model: string;
    };
  };
}

interface DetailedHealthCheckResult extends HealthCheckResult {
  dependencies: {
    consul?: {
      status: "healthy" | "unhealthy";
      message?: string;
    };
    backendServices: Record<string, any>;
  };
  healthChecks: {
    passed: number;
    failed: number;
    total: number;
  };
}

@ApiTags("health")
@Controller("health")
export class HealthController {
  private readonly startTime: number = Date.now();
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly proxyService: ProxyService,
    private readonly consulService: ConsulService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Simple health check" })
  @ApiResponse({ status: 200, description: "Service is healthy" })
  check(): HealthCheckResult {
    return {
      status: "ok",
      service: "api-gateway",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || "development",
      system: this.getSystemInfo(),
    };
  }

  @Get("detailed")
  @ApiOperation({ summary: "Detailed health check with dependency status" })
  @ApiResponse({
    status: 200,
    description: "Detailed health information",
  })
  async detailedCheck(): Promise<DetailedHealthCheckResult> {
    const baseHealth = this.check();

    // 检查 Consul
    const consulHealth = await this.checkConsul();

    // 检查所有后端服务
    const servicesHealth =
      await this.proxyService.checkServicesHealth();

    // 计算健康检查统计
    const healthChecks = this.calculateHealthStats(
      consulHealth,
      servicesHealth,
    );

    // 确定整体状态
    const overallStatus = this.determineOverallStatus(healthChecks);

    return {
      ...baseHealth,
      status: overallStatus,
      dependencies: {
        consul: consulHealth,
        backendServices: servicesHealth,
      },
      healthChecks,
    };
  }

  /**
   * 检查 Consul 连接
   */
  private async checkConsul(): Promise<{
    status: "healthy" | "unhealthy";
    message?: string;
  }> {
    try {
      const useConsul =
        this.configService.get("USE_CONSUL", "false") === "true";

      if (!useConsul) {
        return {
          status: "healthy",
          message: "Consul is disabled",
        };
      }

      // 尝试获取所有服务列表来验证 Consul 连接
      await this.consulService.getAllServices();

      return {
        status: "healthy",
        message: "Consul is reachable",
      };
    } catch (error) {
      this.logger.error(
        `Consul health check failed: ${error.message}`,
        error.stack,
      );
      return {
        status: "unhealthy",
        message: error.message,
      };
    }
  }

  /**
   * 计算健康检查统计
   */
  private calculateHealthStats(
    consulHealth: any,
    servicesHealth: Record<string, any>,
  ): {
    passed: number;
    failed: number;
    total: number;
  } {
    let passed = 0;
    let failed = 0;
    let total = 0;

    // Consul 检查
    if (consulHealth.status === "healthy") {
      passed++;
    } else if (consulHealth.status === "unhealthy") {
      failed++;
    }
    total++;

    // 后端服务检查
    for (const service of Object.values(servicesHealth)) {
      if (service.status === "healthy") {
        passed++;
      } else {
        failed++;
      }
      total++;
    }

    return { passed, failed, total };
  }

  /**
   * 确定整体健康状态
   */
  private determineOverallStatus(healthChecks: {
    passed: number;
    failed: number;
    total: number;
  }): "ok" | "degraded" | "unhealthy" {
    const passRate = healthChecks.passed / healthChecks.total;

    if (passRate === 1) {
      return "ok";
    } else if (passRate >= 0.5) {
      return "degraded";
    } else {
      return "unhealthy";
    }
  }

  private getSystemInfo(): HealthCheckResult["system"] {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      memory: {
        total: Math.floor(totalMemory / 1024 / 1024), // MB
        free: Math.floor(freeMemory / 1024 / 1024), // MB
        used: Math.floor(usedMemory / 1024 / 1024), // MB
        usagePercent: Math.floor((usedMemory / totalMemory) * 100),
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || "unknown",
      },
    };
  }

  /**
   * Kubernetes liveness probe
   * Indicates if the service is alive and should not be restarted
   */
  @Get("liveness")
  @ApiOperation({ summary: "Kubernetes liveness probe" })
  @ApiResponse({ status: 200, description: "Service is alive" })
  liveness() {
    // Basic liveness check - service is running
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Kubernetes readiness probe
   * Indicates if the service is ready to accept traffic
   */
  @Get("readiness")
  @ApiOperation({ summary: "Kubernetes readiness probe" })
  @ApiResponse({ status: 200, description: "Service is ready" })
  @ApiResponse({ status: 503, description: "Service is not ready" })
  async readiness() {
    try {
      // Check critical dependencies for readiness
      const consulHealth = await this.checkConsul();
      const servicesHealth =
        await this.proxyService.checkServicesHealth();

      // Count healthy services
      const healthyServices = Object.values(servicesHealth).filter(
        (s: any) => s.status === "healthy"
      ).length;
      const totalServices = Object.keys(servicesHealth).length;

      // Service is ready if at least 50% of backend services are healthy
      const isReady = healthyServices >= totalServices * 0.5;

      if (!isReady) {
        return {
          status: "error",
          message: "Service not ready - insufficient healthy backend services",
          consul: consulHealth.status,
          backendServices: {
            healthy: healthyServices,
            total: totalServices,
            healthRate: `${Math.floor((healthyServices / totalServices) * 100)}%`,
          },
        };
      }

      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        consul: consulHealth.status,
        backendServices: {
          healthy: healthyServices,
          total: totalServices,
        },
      };
    } catch (error) {
      this.logger.error(`Readiness check failed: ${error.message}`);
      return {
        status: "error",
        message: error.message,
      };
    }
  }
}
