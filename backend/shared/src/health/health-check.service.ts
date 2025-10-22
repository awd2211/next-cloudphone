import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  service: string;
  environment: string;
  checks: {
    database?: ComponentHealth;
    redis?: ComponentHealth;
    memory?: ComponentHealth;
    cpu?: ComponentHealth;
    disk?: ComponentHealth;
  };
  metadata?: Record<string, any>;
}

export interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
}

/**
 * 健康检查服务
 * 提供详细的系统健康状态信息
 */
@Injectable()
export class HealthCheckService {
  private readonly startTime: number;

  constructor(private readonly configService: ConfigService) {
    this.startTime = Date.now();
  }

  /**
   * 执行完整健康检查
   */
  async check(
    serviceName: string,
    dataSource?: DataSource,
    redisClient?: Redis,
  ): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};

    // 数据库健康检查
    if (dataSource) {
      checks.database = await this.checkDatabase(dataSource);
    }

    // Redis 健康检查
    if (redisClient) {
      checks.redis = await this.checkRedis(redisClient);
    }

    // 系统资源检查
    checks.memory = this.checkMemory();
    checks.cpu = this.checkCPU();

    // 计算整体状态
    const overallStatus = this.calculateOverallStatus(checks);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: this.configService.get('APP_VERSION', '1.0.0'),
      service: serviceName,
      environment: this.configService.get('NODE_ENV', 'development'),
      checks,
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  }

  /**
   * 数据库健康检查
   */
  private async checkDatabase(dataSource: DataSource): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      if (!dataSource.isInitialized) {
        return {
          status: 'down',
          message: '数据库未初始化',
        };
      }

      // 执行简单查询测试连接
      await dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 100 ? 'up' : 'degraded',
        responseTime,
        message: responseTime < 100 ? '数据库连接正常' : '数据库响应较慢',
        details: {
          driver: dataSource.options.type,
          database: (dataSource.options as any).database,
        },
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        message: `数据库连接失败: ${error.message}`,
      };
    }
  }

  /**
   * Redis 健康检查
   */
  private async checkRedis(redis: Redis): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      await redis.ping();
      const responseTime = Date.now() - startTime;

      // 获取 Redis 信息
      const info = await redis.info('server');
      const version = info.match(/redis_version:([^\r\n]+)/)?.[1];

      return {
        status: responseTime < 50 ? 'up' : 'degraded',
        responseTime,
        message: responseTime < 50 ? 'Redis 连接正常' : 'Redis 响应较慢',
        details: {
          version,
        },
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        message: `Redis 连接失败: ${error.message}`,
      };
    }
  }

  /**
   * 内存使用检查
   */
  private checkMemory(): ComponentHealth {
    const usage = process.memoryUsage();
    const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const percentage = Math.round((usedMB / totalMB) * 100);

    return {
      status: percentage < 80 ? 'up' : percentage < 90 ? 'degraded' : 'down',
      message: `内存使用 ${percentage}%`,
      details: {
        heapUsed: `${usedMB}MB`,
        heapTotal: `${totalMB}MB`,
        percentage: `${percentage}%`,
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      },
    };
  }

  /**
   * CPU 使用检查
   */
  private checkCPU(): ComponentHealth {
    const usage = process.cpuUsage();
    const totalUsage = (usage.user + usage.system) / 1000000; // 转换为秒

    return {
      status: 'up',
      message: 'CPU 正常',
      details: {
        user: `${(usage.user / 1000000).toFixed(2)}s`,
        system: `${(usage.system / 1000000).toFixed(2)}s`,
        total: `${totalUsage.toFixed(2)}s`,
      },
    };
  }

  /**
   * 计算整体健康状态
   */
  private calculateOverallStatus(
    checks: HealthCheckResult['checks'],
  ): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses = Object.values(checks).map((check) => check.status);

    if (statuses.some((s) => s === 'down')) {
      return 'unhealthy';
    }

    if (statuses.some((s) => s === 'degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }
}

