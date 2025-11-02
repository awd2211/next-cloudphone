import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

/**
 * 健康检查服务
 * 定期检查外部依赖的健康状态
 */
@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  private healthStatus = {
    database: { healthy: false, lastCheck: null as Date | null, error: null as string | null },
    redis: { healthy: false, lastCheck: null as Date | null, error: null as string | null },
    rabbitmq: { healthy: false, lastCheck: null as Date | null, error: null as string | null },
    overall: 'unknown' as 'healthy' | 'degraded' | 'unhealthy' | 'unknown',
  };

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRedis()
    private readonly redis: Redis,
    @Optional() private readonly amqpConnection?: AmqpConnection,
  ) {}

  /**
   * 定时健康检查 - 每分钟执行一次
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async performHealthCheck() {
    this.logger.debug('Performing scheduled health check');

    await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkRabbitMQ(),
    ]);

    this.updateOverallHealth();

    const status = this.getHealthStatus();
    if (status.overall === 'unhealthy') {
      this.logger.error('System health check FAILED', JSON.stringify(status, null, 2));
    } else if (status.overall === 'degraded') {
      this.logger.warn('System health check DEGRADED', JSON.stringify(status, null, 2));
    } else {
      this.logger.debug('System health check passed');
    }
  }

  /**
   * 检查数据库连接
   */
  private async checkDatabase(): Promise<void> {
    try {
      await this.dataSource.query('SELECT 1');
      this.healthStatus.database = {
        healthy: true,
        lastCheck: new Date(),
        error: null,
      };
    } catch (error) {
      this.logger.error('Database health check failed', error.stack);
      this.healthStatus.database = {
        healthy: false,
        lastCheck: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * 检查 Redis 连接
   */
  private async checkRedis(): Promise<void> {
    try {
      await this.redis.ping();
      this.healthStatus.redis = {
        healthy: true,
        lastCheck: new Date(),
        error: null,
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error.stack);
      this.healthStatus.redis = {
        healthy: false,
        lastCheck: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * 检查 RabbitMQ 连接
   */
  private async checkRabbitMQ(): Promise<void> {
    try {
      // Check if amqpConnection is available
      if (!this.amqpConnection) {
        throw new Error('AmqpConnection not available');
      }

      // Check if connection is established
      const channel = this.amqpConnection.channel;
      if (channel) {
        this.healthStatus.rabbitmq = {
          healthy: true,
          lastCheck: new Date(),
          error: null,
        };
      } else {
        throw new Error('RabbitMQ channel not available');
      }
    } catch (error) {
      this.logger.error('RabbitMQ health check failed', error.stack);
      this.healthStatus.rabbitmq = {
        healthy: false,
        lastCheck: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * 更新总体健康状态
   */
  private updateOverallHealth(): void {
    const checks = [
      this.healthStatus.database,
      this.healthStatus.redis,
      this.healthStatus.rabbitmq,
    ];

    const healthyCount = checks.filter((c) => c.healthy).length;

    if (healthyCount === checks.length) {
      this.healthStatus.overall = 'healthy';
    } else if (healthyCount === 0) {
      this.healthStatus.overall = 'unhealthy';
    } else {
      this.healthStatus.overall = 'degraded';
    }
  }

  /**
   * 获取当前健康状态
   */
  getHealthStatus() {
    return {
      ...this.healthStatus,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取详细健康报告
   */
  async getDetailedHealth() {
    // Perform immediate checks
    await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkRabbitMQ(),
    ]);

    this.updateOverallHealth();

    return this.getHealthStatus();
  }

  /**
   * 检查系统是否健康
   */
  isHealthy(): boolean {
    return this.healthStatus.overall === 'healthy';
  }
}
