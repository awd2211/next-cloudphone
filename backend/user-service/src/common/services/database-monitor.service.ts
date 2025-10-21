import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';
import {
  connectionPoolHealthConfig,
  ConnectionPoolMetrics,
} from '../config/database.config';

/**
 * 数据库连接池监控服务
 *
 * 功能：
 * - 实时监控连接池状态
 * - 检测连接池泄漏
 * - 慢查询检测和统计
 * - 连接健康检查
 * - 自动告警
 */
@Injectable()
export class DatabaseMonitorService {
  private readonly logger = new Logger(DatabaseMonitorService.name);

  // 统计数据
  private stats = {
    queryCount: 0,
    slowQueryCount: 0,
    errorCount: 0,
    connectionErrorCount: 0,
    timeoutErrorCount: 0,
    totalQueryTime: 0,
    totalAcquisitionTime: 0,
    acquisitionCount: 0,
  };

  // 活跃连接追踪
  private activeConnections: Map<
    string,
    {
      startTime: number;
      query?: string;
      stackTrace?: string;
    }
  > = new Map();

  // 慢查询记录
  private slowQueries: Array<{
    query: string;
    duration: number;
    timestamp: Date;
    stackTrace?: string;
  }> = [];

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @Inject(WINSTON_MODULE_PROVIDER) private winstonLogger: WinstonLogger,
  ) {
    this.setupQueryLogging();
  }

  /**
   * 设置查询日志监听
   */
  private setupQueryLogging(): void {
    // 监听查询开始
    this.dataSource.driver['pool']?.on?.('acquire', (client: any) => {
      const connectionId = this.getConnectionId(client);
      const now = Date.now();

      this.activeConnections.set(connectionId, {
        startTime: now,
        stackTrace: this.captureStackTrace(),
      });

      this.acquisitionCount++;
    });

    // 监听查询结束
    this.dataSource.driver['pool']?.on?.('release', (client: any) => {
      const connectionId = this.getConnectionId(client);
      const connectionInfo = this.activeConnections.get(connectionId);

      if (connectionInfo) {
        const acquisitionTime = Date.now() - connectionInfo.startTime;
        this.stats.totalAcquisitionTime += acquisitionTime;
        this.activeConnections.delete(connectionId);

        // 检查连接获取时间
        if (
          acquisitionTime >
          connectionPoolHealthConfig.CONNECTION_ACQUISITION_CRITICAL_THRESHOLD
        ) {
          this.winstonLogger.error({
            type: 'slow_connection_acquisition',
            acquisitionTime,
            threshold:
              connectionPoolHealthConfig.CONNECTION_ACQUISITION_CRITICAL_THRESHOLD,
            message: `⚠️ 连接获取耗时过长: ${acquisitionTime}ms`,
          });
        }
      }
    });

    // 监听连接错误
    this.dataSource.driver['pool']?.on?.('error', (err: Error, client: any) => {
      this.stats.connectionErrorCount++;

      this.winstonLogger.error({
        type: 'database_connection_error',
        error: err.message,
        stack: err.stack,
        message: '❌ 数据库连接错误',
      });
    });
  }

  /**
   * 记录查询执行
   */
  logQuery(query: string, duration: number, error?: Error): void {
    this.stats.queryCount++;
    this.stats.totalQueryTime += duration;

    if (error) {
      this.stats.errorCount++;

      this.winstonLogger.error({
        type: 'database_query_error',
        query: this.sanitizeQuery(query),
        duration,
        error: error.message,
        stack: error.stack,
      });

      return;
    }

    // 慢查询检测
    if (duration > connectionPoolHealthConfig.SLOW_QUERY_WARNING_THRESHOLD) {
      this.stats.slowQueryCount++;

      const slowQueryRecord = {
        query: this.sanitizeQuery(query),
        duration,
        timestamp: new Date(),
        stackTrace: this.captureStackTrace(),
      };

      this.slowQueries.push(slowQueryRecord);

      // 只保留最近 100 条慢查询
      if (this.slowQueries.length > 100) {
        this.slowQueries.shift();
      }

      const level =
        duration > connectionPoolHealthConfig.SLOW_QUERY_CRITICAL_THRESHOLD
          ? 'error'
          : 'warn';

      this.winstonLogger[level]({
        type: 'slow_query',
        query: slowQueryRecord.query,
        duration,
        threshold: connectionPoolHealthConfig.SLOW_QUERY_WARNING_THRESHOLD,
        message: `🐌 慢查询检测: ${duration}ms`,
      });
    }
  }

  /**
   * 获取连接池指标
   */
  async getConnectionPoolMetrics(): Promise<ConnectionPoolMetrics> {
    const pool = this.dataSource.driver['pool'];

    if (!pool) {
      return this.getEmptyMetrics();
    }

    // 从 pg 连接池获取统计信息
    const totalConnections = pool.totalCount || 0;
    const idleConnections = pool.idleCount || 0;
    const waitingConnections = pool.waitingCount || 0;
    const activeConnections = totalConnections - idleConnections;

    const poolMax = pool.options?.max || 10;
    const poolMin = pool.options?.min || 2;

    // 计算使用率
    const usagePercentage = (totalConnections / poolMax) * 100;
    const isWarning =
      usagePercentage >=
      connectionPoolHealthConfig.POOL_USAGE_WARNING_THRESHOLD * 100;
    const isCritical =
      usagePercentage >=
      connectionPoolHealthConfig.POOL_USAGE_CRITICAL_THRESHOLD * 100;

    // 计算平均值
    const avgAcquisitionTime =
      this.stats.acquisitionCount > 0
        ? this.stats.totalAcquisitionTime / this.stats.acquisitionCount
        : 0;

    const avgQueryTime =
      this.stats.queryCount > 0
        ? this.stats.totalQueryTime / this.stats.queryCount
        : 0;

    return {
      poolSize: {
        min: poolMin,
        max: poolMax,
        current: totalConnections,
      },
      connections: {
        total: totalConnections,
        active: activeConnections,
        idle: idleConnections,
        waiting: waitingConnections,
      },
      usage: {
        percentage: Math.round(usagePercentage),
        isWarning,
        isCritical,
      },
      performance: {
        avgAcquisitionTime: Math.round(avgAcquisitionTime),
        avgQueryTime: Math.round(avgQueryTime),
        slowQueries: this.stats.slowQueryCount,
      },
      errors: {
        connectionErrors: this.stats.connectionErrorCount,
        queryErrors: this.stats.errorCount,
        timeoutErrors: this.stats.timeoutErrorCount,
      },
    };
  }

  /**
   * 获取慢查询列表
   */
  getSlowQueries(limit: number = 10): typeof this.slowQueries {
    return this.slowQueries.slice(-limit).reverse();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      avgQueryTime:
        this.stats.queryCount > 0
          ? Math.round(this.stats.totalQueryTime / this.stats.queryCount)
          : 0,
      avgAcquisitionTime:
        this.stats.acquisitionCount > 0
          ? Math.round(this.stats.totalAcquisitionTime / this.stats.acquisitionCount)
          : 0,
    };
  }

  /**
   * 重置统计数据
   */
  resetStats(): void {
    this.stats = {
      queryCount: 0,
      slowQueryCount: 0,
      errorCount: 0,
      connectionErrorCount: 0,
      timeoutErrorCount: 0,
      totalQueryTime: 0,
      totalAcquisitionTime: 0,
      acquisitionCount: 0,
    };

    this.slowQueries = [];

    this.logger.log('📊 统计数据已重置');
  }

  /**
   * 定时监控连接池健康状况（每分钟）
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkConnectionPoolHealth(): Promise<void> {
    const metrics = await this.getConnectionPoolMetrics();

    // 记录连接池状态
    this.winstonLogger.info({
      type: 'connection_pool_health_check',
      metrics,
    });

    // 检查告警条件
    if (metrics.usage.isCritical) {
      this.winstonLogger.error({
        type: 'connection_pool_critical',
        usage: metrics.usage.percentage,
        threshold: connectionPoolHealthConfig.POOL_USAGE_CRITICAL_THRESHOLD * 100,
        message: `🚨 连接池使用率严重告警: ${metrics.usage.percentage}%`,
      });
    } else if (metrics.usage.isWarning) {
      this.winstonLogger.warn({
        type: 'connection_pool_warning',
        usage: metrics.usage.percentage,
        threshold: connectionPoolHealthConfig.POOL_USAGE_WARNING_THRESHOLD * 100,
        message: `⚠️ 连接池使用率告警: ${metrics.usage.percentage}%`,
      });
    }

    // 检查等待连接数
    if (metrics.connections.waiting > 5) {
      this.winstonLogger.warn({
        type: 'connection_pool_waiting',
        waiting: metrics.connections.waiting,
        message: `⚠️ 等待连接数过多: ${metrics.connections.waiting}`,
      });
    }

    // 检查活跃连接泄漏
    await this.checkConnectionLeaks();
  }

  /**
   * 检测连接泄漏
   */
  private async checkConnectionLeaks(): Promise<void> {
    const now = Date.now();
    const leakedConnections: string[] = [];

    for (const [connectionId, info] of this.activeConnections.entries()) {
      const activeTime = now - info.startTime;

      // 如果连接活跃时间超过阈值，可能存在泄漏
      if (
        activeTime >
        connectionPoolHealthConfig.ACTIVE_CONNECTION_CRITICAL_THRESHOLD
      ) {
        leakedConnections.push(connectionId);

        this.winstonLogger.error({
          type: 'connection_leak_detected',
          connectionId,
          activeTime,
          query: info.query,
          stackTrace: info.stackTrace,
          message: `🚨 检测到可能的连接泄漏: ${activeTime}ms`,
        });
      }
    }

    if (leakedConnections.length > 0) {
      this.logger.error(
        `检测到 ${leakedConnections.length} 个可能泄漏的连接`,
      );
    }
  }

  /**
   * 定时清理过期的慢查询记录（每小时）
   */
  @Cron(CronExpression.EVERY_HOUR)
  cleanupSlowQueryRecords(): void {
    const oneHourAgo = new Date(Date.now() - 3600000);

    this.slowQueries = this.slowQueries.filter(
      (record) => record.timestamp > oneHourAgo,
    );

    this.logger.debug(`清理过期慢查询记录，剩余 ${this.slowQueries.length} 条`);
  }

  /**
   * 执行连接健康检查
   */
  async healthCheck(): Promise<{
    isHealthy: boolean;
    message?: string;
    metrics: ConnectionPoolMetrics;
  }> {
    try {
      // 执行简单查询测试连接
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      const duration = Date.now() - start;

      const metrics = await this.getConnectionPoolMetrics();

      // 判断健康状态
      const isHealthy =
        !metrics.usage.isCritical &&
        metrics.connections.waiting < 10 &&
        duration < 1000;

      return {
        isHealthy,
        message: isHealthy ? 'Database connection pool is healthy' : 'Database connection pool has issues',
        metrics,
      };
    } catch (error) {
      this.logger.error(`数据库健康检查失败: ${error.message}`);

      return {
        isHealthy: false,
        message: `Database health check failed: ${error.message}`,
        metrics: this.getEmptyMetrics(),
      };
    }
  }

  /**
   * 获取空指标（用于错误情况）
   */
  private getEmptyMetrics(): ConnectionPoolMetrics {
    return {
      poolSize: { min: 0, max: 0, current: 0 },
      connections: { total: 0, active: 0, idle: 0, waiting: 0 },
      usage: { percentage: 0, isWarning: false, isCritical: false },
      performance: { avgAcquisitionTime: 0, avgQueryTime: 0, slowQueries: 0 },
      errors: { connectionErrors: 0, queryErrors: 0, timeoutErrors: 0 },
    };
  }

  /**
   * 获取连接 ID
   */
  private getConnectionId(client: any): string {
    return client?.processID?.toString() || Math.random().toString(36);
  }

  /**
   * 捕获堆栈跟踪
   */
  private captureStackTrace(): string {
    const stack = new Error().stack || '';
    return stack.split('\n').slice(3, 8).join('\n'); // 获取调用者堆栈
  }

  /**
   * 清理查询字符串（移除敏感信息）
   */
  private sanitizeQuery(query: string): string {
    // 移除换行符和多余空格
    let sanitized = query.replace(/\s+/g, ' ').trim();

    // 截断过长的查询
    if (sanitized.length > 500) {
      sanitized = sanitized.substring(0, 500) + '...';
    }

    return sanitized;
  }

  private get acquisitionCount(): number {
    return this.stats.acquisitionCount;
  }

  private set acquisitionCount(value: number) {
    this.stats.acquisitionCount = value;
  }
}
