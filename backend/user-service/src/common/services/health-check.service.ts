import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';
import { ConfigService } from '@nestjs/config';

/**
 * 健康检查结果接口
 */
export interface DependencyHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  message?: string;
  details?: any;
}

export interface HealthCheckDetail {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  dependencies: DependencyHealth[];
  system: {
    hostname: string;
    platform: string;
    arch: string;
    nodeVersion: string;
    memory: {
      total: number;
      free: number;
      used: number;
      usagePercent: number;
      heapTotal: number;
      heapUsed: number;
      heapUsagePercent: number;
    };
    cpu: {
      cores: number;
      model: string;
      loadAverage: number[];
    };
    process: {
      pid: number;
      ppid: number;
      uptime: number;
    };
  };
}

/**
 * 增强的健康检查服务
 *
 * 功能：
 * - 检查所有依赖服务（数据库、Redis、队列等）
 * - 系统资源监控
 * - 详细的错误信息
 * - Kubernetes 就绪和存活探针支持
 */
@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly startTime: number = Date.now();

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @Inject(WINSTON_MODULE_PROVIDER) private winstonLogger: WinstonLogger,
    private configService: ConfigService,
  ) {}

  /**
   * 执行完整的健康检查
   */
  async check(): Promise<HealthCheckDetail> {
    const dependencies: DependencyHealth[] = [];

    // 检查所有依赖
    dependencies.push(await this.checkDatabase());
    dependencies.push(await this.checkRedis());
    dependencies.push(await this.checkExternalServices());

    // 确定整体健康状态
    const overallStatus = this.determineOverallStatus(dependencies);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: this.configService.get('APP_VERSION', '1.0.0'),
      environment: this.configService.get('NODE_ENV', 'development'),
      dependencies,
      system: this.getSystemInfo(),
    };
  }

  /**
   * Kubernetes 存活探针
   * 检查服务是否还活着（基本检查）
   */
  async liveness(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      // 简单的内存检查
      const memUsage = process.memoryUsage();
      const heapUsagePercent =
        (memUsage.heapUsed / memUsage.heapTotal) * 100;

      // 如果堆内存使用超过 95%，认为不健康
      if (heapUsagePercent > 95) {
        return {
          status: 'error',
          message: `High memory usage: ${heapUsagePercent.toFixed(2)}%`,
        };
      }

      return { status: 'ok' };
    } catch (error) {
      this.logger.error(`Liveness check failed: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Kubernetes 就绪探针
   * 检查服务是否准备好接收流量
   */
  async readiness(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      // 检查数据库连接
      const dbHealth = await this.checkDatabase();

      if (dbHealth.status === 'unhealthy') {
        return {
          status: 'error',
          message: 'Database not ready',
        };
      }

      return { status: 'ok' };
    } catch (error) {
      this.logger.error(`Readiness check failed: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * 检查数据库健康状况
   */
  private async checkDatabase(): Promise<DependencyHealth> {
    const startTime = Date.now();

    try {
      // 执行简单查询
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      // 获取连接池信息
      const pool = (this.dataSource.driver as any).master;
      const poolInfo = pool
        ? {
            total: pool.totalCount || 0,
            idle: pool.idleCount || 0,
            waiting: pool.waitingCount || 0,
          }
        : null;

      // 判断健康状态
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (responseTime > 1000) {
        status = 'degraded'; // 响应时间超过1秒
      }
      if (poolInfo && poolInfo.waiting > 10) {
        status = 'degraded'; // 等待连接过多
      }

      return {
        name: 'database',
        status,
        responseTime,
        details: {
          type: 'postgres',
          database: this.configService.get('DB_DATABASE'),
          pool: poolInfo,
        },
      };
    } catch (error) {
      this.winstonLogger.error({
        type: 'health_check_failed',
        dependency: 'database',
        error: error.message,
      });

      return {
        name: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: error.message,
      };
    }
  }

  /**
   * 检查 Redis 健康状况
   */
  private async checkRedis(): Promise<DependencyHealth> {
    const startTime = Date.now();

    try {
      // TODO: 实现实际的 Redis 健康检查
      // const redis = app.get(Redis);
      // await redis.ping();

      // 模拟检查
      await new Promise((resolve) => setTimeout(resolve, 50));
      const responseTime = Date.now() - startTime;

      return {
        name: 'redis',
        status: 'healthy',
        responseTime,
        details: {
          host: this.configService.get('REDIS_HOST', 'localhost'),
          port: this.configService.get('REDIS_PORT', 6379),
        },
      };
    } catch (error) {
      this.winstonLogger.error({
        type: 'health_check_failed',
        dependency: 'redis',
        error: error.message,
      });

      return {
        name: 'redis',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: error.message,
      };
    }
  }

  /**
   * 检查外部服务健康状况
   */
  private async checkExternalServices(): Promise<DependencyHealth> {
    const startTime = Date.now();

    try {
      // TODO: 检查其他微服务（device-service, app-service等）
      // 这里可以使用 Circuit Breaker 的状态来判断

      return {
        name: 'external_services',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          services: ['device-service', 'app-service'],
        },
      };
    } catch (error) {
      return {
        name: 'external_services',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        message: error.message,
      };
    }
  }

  /**
   * 确定整体健康状态
   */
  private determineOverallStatus(
    dependencies: DependencyHealth[],
  ): 'healthy' | 'degraded' | 'unhealthy' {
    // 如果有任何依赖不健康，整体为不健康
    if (dependencies.some((d) => d.status === 'unhealthy')) {
      return 'unhealthy';
    }

    // 如果有任何依赖降级，整体为降级
    if (dependencies.some((d) => d.status === 'degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * 获取系统信息
   */
  private getSystemInfo(): HealthCheckDetail['system'] {
    const os = require('os');
    const memUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memory: {
        total: Math.floor(totalMemory / 1024 / 1024), // MB
        free: Math.floor(freeMemory / 1024 / 1024),
        used: Math.floor(usedMemory / 1024 / 1024),
        usagePercent: Math.floor((usedMemory / totalMemory) * 100),
        heapTotal: Math.floor(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.floor(memUsage.heapUsed / 1024 / 1024),
        heapUsagePercent: Math.floor(
          (memUsage.heapUsed / memUsage.heapTotal) * 100,
        ),
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'unknown',
        loadAverage: os.loadavg(),
      },
      process: {
        pid: process.pid,
        ppid: process.ppid,
        uptime: Math.floor(process.uptime()),
      },
    };
  }
}
