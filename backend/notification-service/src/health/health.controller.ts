import { Controller, Get, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as os from 'os';

interface DependencyStatus {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  message?: string;
  version?: string;
}

interface HealthCheckResult {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  environment: string;
  dependencies: {
    database?: DependencyStatus;
    redis?: DependencyStatus;
    rabbitmq?: DependencyStatus;
    smtp?: DependencyStatus;
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

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime: number = Date.now();

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get()
  @ApiOperation({ summary: '健康检查', description: '检查服务是否正常运行，包括依赖项状态和系统信息' })
  @ApiResponse({ status: 200, description: '服务正常' })
  async check(): Promise<HealthCheckResult> {
    const dependencies: HealthCheckResult['dependencies'] = {};

    // Check all critical dependencies in parallel
    const [dbCheck, redisCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    dependencies.database = dbCheck;
    dependencies.redis = redisCheck;

    // Determine overall status
    const hasUnhealthyDependency =
      dbCheck.status === 'unhealthy' ||
      redisCheck.status === 'unhealthy';

    const overallStatus = hasUnhealthyDependency ? 'degraded' : 'ok';

    return {
      status: overallStatus,
      service: 'notification-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || 'development',
      dependencies,
      system: this.getSystemInfo(),
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
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

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      const start = Date.now();

      // Simple Redis connectivity test - try to get any value
      // This works with all cache-manager versions
      await this.cacheManager.get('_health_check_ping');

      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message || 'Redis connection failed',
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
   * Detailed health check with all dependencies
   */
  @Get('detailed')
  @ApiOperation({ summary: '详细健康检查' })
  async detailedCheck() {
    const basicCheck = await this.check();

    return {
      ...basicCheck,
      details: {
        description: 'Notification Service - Multi-channel Notification Management',
        capabilities: [
          'WebSocket real-time notifications',
          'Email notifications with templates',
          'SMS support (placeholder)',
          'RabbitMQ event consumers',
          'Template management system',
          'Dead Letter Exchange handling',
        ],
      },
    };
  }

  /**
   * Kubernetes liveness probe
   * Indicates if the service is alive and should not be restarted
   */
  @Get('liveness')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kubernetes 存活探针' })
  async liveness() {
    // Basic liveness check - service is running
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Kubernetes readiness probe
   * Indicates if the service is ready to accept traffic
   */
  @Get('readiness')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kubernetes 就绪探针' })
  async readiness() {
    try {
      // Check critical dependencies for readiness
      const [dbCheck, redisCheck] = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
      ]);

      // Service is ready only if all critical dependencies are healthy
      const isReady =
        dbCheck.status === 'healthy' &&
        redisCheck.status === 'healthy';

      if (!isReady) {
        return {
          status: 'error',
          message: 'Service not ready - critical dependencies unhealthy',
          dependencies: {
            database: dbCheck.status,
            redis: redisCheck.status,
          },
        };
      }

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        dependencies: {
          database: 'healthy',
          redis: 'healthy',
        },
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  }
}
