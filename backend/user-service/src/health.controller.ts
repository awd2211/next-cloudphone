import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as os from 'os';
import { PublicThrottle } from './common/decorators/throttler.decorator';
import { CircuitBreakerService } from './common/services/circuit-breaker.service';
import { DatabaseMonitorService } from './common/services/database-monitor.service';
import { GracefulShutdownService } from './common/services/graceful-shutdown.service';
import { HealthCheckService } from './common/services/health-check.service';
import { ConnectionPoolMetrics } from './common/config/database.config';

interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'shutting_down';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  environment: string;
  dependencies: {
    database?: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      message?: string;
      connectionPool?: ConnectionPoolMetrics;
    };
  };
  circuitBreakers?: {
    total: number;
    healthy: number;
    degraded: number;
    failed: number;
    details: Array<{
      name: string;
      state: string;
      stats: any;
    }>;
  };
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

@Controller('health')
export class HealthController {
  private readonly startTime: number = Date.now();

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private circuitBreakerService: CircuitBreakerService,
    private databaseMonitorService: DatabaseMonitorService,
    private gracefulShutdownService: GracefulShutdownService,
    private healthCheckService: HealthCheckService,
  ) {}

  @Get()
  @PublicThrottle() // 健康检查接口使用宽松限流（500次/分钟）
  async check(): Promise<HealthCheckResult> {
    const dependencies: HealthCheckResult['dependencies'] = {};

    // Check database connection and pool status
    const dbCheck = await this.checkDatabase();
    const poolMetrics = await this.databaseMonitorService.getConnectionPoolMetrics();
    dependencies.database = {
      ...dbCheck,
      connectionPool: poolMetrics,
    };

    // Get circuit breaker status
    const circuitBreakerStatuses = this.circuitBreakerService.getAllBreakerStatus();
    const circuitBreakers = {
      total: circuitBreakerStatuses.length,
      healthy: circuitBreakerStatuses.filter((s) => s.state === 'CLOSED').length,
      degraded: circuitBreakerStatuses.filter((s) => s.state === 'HALF_OPEN').length,
      failed: circuitBreakerStatuses.filter((s) => s.state === 'OPEN').length,
      details: circuitBreakerStatuses.map((s) => ({
        name: s.name,
        state: s.state,
        stats: {
          fires: s.stats.fires,
          successes: s.stats.successes,
          failures: s.stats.failures,
          timeouts: s.stats.timeouts,
          rejects: s.stats.rejects,
          fallbacks: s.stats.fallbacks,
        },
      })),
    };

    // Check if shutting down
    if (this.gracefulShutdownService.isShutdownInProgress()) {
      return {
        status: 'shutting_down',
        service: 'user-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        environment: process.env.NODE_ENV || 'development',
        dependencies,
        circuitBreakers,
        system: this.getSystemInfo(),
      };
    }

    // Determine overall status
    let overallStatus: 'ok' | 'degraded' = 'ok';
    if (
      dbCheck.status === 'unhealthy' ||
      circuitBreakers.failed > 0 ||
      poolMetrics.usage.isCritical
    ) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      service: 'user-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || 'development',
      dependencies,
      circuitBreakers,
      system: this.getSystemInfo(),
    };
  }

  private async checkDatabase(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
    message?: string;
  }> {
    try {
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
      };
    }
  }

  private getSystemInfo(): HealthCheckResult['system'] {
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
        model: os.cpus()[0]?.model || 'unknown',
      },
    };
  }

  /**
   * 详细健康检查
   * 包含所有依赖项的详细信息
   */
  @Get('detailed')
  @PublicThrottle()
  async detailedCheck() {
    return this.healthCheckService.check();
  }

  /**
   * Kubernetes 存活探针
   * 用于判断容器是否需要重启
   */
  @Get('liveness')
  @HttpCode(HttpStatus.OK)
  @PublicThrottle()
  async liveness() {
    const result = await this.healthCheckService.liveness();

    if (result.status === 'error') {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        ...result,
      };
    }

    return result;
  }

  /**
   * Kubernetes 就绪探针
   * 用于判断容器是否可以接收流量
   */
  @Get('readiness')
  @HttpCode(HttpStatus.OK)
  @PublicThrottle()
  async readiness() {
    const result = await this.healthCheckService.readiness();

    if (result.status === 'error') {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        ...result,
      };
    }

    return result;
  }

  /**
   * 数据库连接池状态
   */
  @Get('pool')
  @PublicThrottle()
  async poolStatus() {
    const metrics = await this.databaseMonitorService.getConnectionPoolMetrics();
    const stats = this.databaseMonitorService.getStats();
    const slowQueries = this.databaseMonitorService.getSlowQueries(10);

    return {
      connectionPool: metrics,
      statistics: stats,
      slowQueries,
    };
  }

  /**
   * 熔断器状态
   */
  @Get('circuit-breakers')
  @PublicThrottle()
  async circuitBreakersStatus() {
    return {
      breakers: this.circuitBreakerService.getAllBreakerStatus(),
    };
  }
}
