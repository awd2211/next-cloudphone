import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService } from '@cloudphone/shared';

/**
 * 重试统计信息
 */
export interface RetryStatistics {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  averageAttempts: number;
  lastRetryAt: Date | null;
  recentRetries: Array<{
    operation: string;
    attempts: number;
    success: boolean;
    error?: string;
    timestamp: Date;
  }>;
}

/**
 * 重试策略类型
 */
export enum RetryStrategy {
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  FIXED_DELAY = 'fixed_delay',
  FIBONACCI_BACKOFF = 'fibonacci_backoff',
}

/**
 * 重试上下文
 */
export interface RetryContext {
  operation: string;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, any>;
}

/**
 * 重试服务：管理重试策略和统计
 */
@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);
  private statistics: Map<string, RetryStatistics> = new Map();
  private readonly MAX_RECENT_RETRIES = 100;

  constructor(
    private configService: ConfigService,
    private eventBusService: EventBusService,
  ) {
    this.logger.log('RetryService initialized');
  }

  /**
   * 执行带重试的操作
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: RetryContext,
    options?: {
      maxAttempts?: number;
      baseDelayMs?: number;
      strategy?: RetryStrategy;
    },
  ): Promise<T> {
    const maxAttempts = options?.maxAttempts || 3;
    const baseDelayMs = options?.baseDelayMs || 1000;
    const strategy = options?.strategy || RetryStrategy.EXPONENTIAL_BACKOFF;

    let lastError: Error;
    let attempts = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      attempts = attempt;

      try {
        const result = await operation();

        // 成功执行
        this.recordRetry(context.operation, attempts, true);

        if (attempts > 1) {
          this.logger.log(
            `Operation '${context.operation}' succeeded after ${attempts} attempts`,
          );

          // 发布重试成功事件
          this.eventBusService.publish('cloudphone.events', 'retry.success', {
            operation: context.operation,
            attempts,
            entityId: context.entityId,
            entityType: context.entityType,
            timestamp: new Date(),
          });
        }

        return result;
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts) {
          // 最后一次尝试失败
          this.recordRetry(context.operation, attempts, false, error.message);

          this.logger.error(
            `Operation '${context.operation}' failed after ${maxAttempts} attempts: ${error.message}`,
          );

          // 发布重试失败事件
          this.eventBusService.publish('cloudphone.events', 'retry.failed', {
            operation: context.operation,
            attempts: maxAttempts,
            error: error.message,
            entityId: context.entityId,
            entityType: context.entityType,
            timestamp: new Date(),
          });

          throw error;
        }

        // 计算延迟
        const delayMs = this.calculateDelay(attempt, baseDelayMs, strategy);

        this.logger.warn(
          `Attempt ${attempt}/${maxAttempts} for '${context.operation}' failed: ${error.message}. Retrying in ${delayMs}ms...`,
        );

        // 发布重试中事件
        this.eventBusService.publish('cloudphone.events', 'retry.attempt', {
          operation: context.operation,
          attempt,
          maxAttempts,
          delayMs,
          error: error.message,
          entityId: context.entityId,
          entityType: context.entityType,
          timestamp: new Date(),
        });

        await this.delay(delayMs);
      }
    }

    throw lastError;
  }

  /**
   * 计算延迟时间（根据不同策略）
   */
  private calculateDelay(
    attempt: number,
    baseDelayMs: number,
    strategy: RetryStrategy,
  ): number {
    let delay: number;

    switch (strategy) {
      case RetryStrategy.EXPONENTIAL_BACKOFF:
        delay = baseDelayMs * Math.pow(2, attempt - 1);
        break;

      case RetryStrategy.LINEAR_BACKOFF:
        delay = baseDelayMs * attempt;
        break;

      case RetryStrategy.FIXED_DELAY:
        delay = baseDelayMs;
        break;

      case RetryStrategy.FIBONACCI_BACKOFF:
        delay = baseDelayMs * this.fibonacci(attempt);
        break;

      default:
        delay = baseDelayMs * Math.pow(2, attempt - 1);
    }

    // 添加随机抖动 (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    delay = Math.round(delay + jitter);

    // 限制最大延迟为 30 秒
    return Math.min(delay, 30000);
  }

  /**
   * 斐波那契数列
   */
  private fibonacci(n: number): number {
    if (n <= 1) return 1;
    if (n === 2) return 2;

    let prev = 1;
    let curr = 2;

    for (let i = 3; i <= n; i++) {
      const next = prev + curr;
      prev = curr;
      curr = next;
    }

    return curr;
  }

  /**
   * 记录重试统计
   */
  private recordRetry(
    operation: string,
    attempts: number,
    success: boolean,
    error?: string,
  ): void {
    let stats = this.statistics.get(operation);

    if (!stats) {
      stats = {
        totalAttempts: 0,
        successfulRetries: 0,
        failedRetries: 0,
        averageAttempts: 0,
        lastRetryAt: null,
        recentRetries: [],
      };
      this.statistics.set(operation, stats);
    }

    stats.totalAttempts += attempts;
    if (success) {
      stats.successfulRetries++;
    } else {
      stats.failedRetries++;
    }

    stats.averageAttempts =
      stats.totalAttempts / (stats.successfulRetries + stats.failedRetries);
    stats.lastRetryAt = new Date();

    // 记录最近的重试
    stats.recentRetries.unshift({
      operation,
      attempts,
      success,
      error,
      timestamp: new Date(),
    });

    // 限制最近重试记录数量
    if (stats.recentRetries.length > this.MAX_RECENT_RETRIES) {
      stats.recentRetries = stats.recentRetries.slice(0, this.MAX_RECENT_RETRIES);
    }

    this.statistics.set(operation, stats);
  }

  /**
   * 获取操作的重试统计
   */
  getStatistics(operation?: string): Map<string, RetryStatistics> | RetryStatistics {
    if (operation) {
      return this.statistics.get(operation) || this.createEmptyStatistics();
    }
    return this.statistics;
  }

  /**
   * 重置统计信息
   */
  resetStatistics(operation?: string): void {
    if (operation) {
      this.statistics.delete(operation);
      this.logger.log(`Reset statistics for operation: ${operation}`);
    } else {
      this.statistics.clear();
      this.logger.log('Reset all retry statistics');
    }
  }

  /**
   * 获取统计摘要
   */
  getStatisticsSummary(): {
    totalOperations: number;
    totalAttempts: number;
    totalSuccessful: number;
    totalFailed: number;
    overallAverageAttempts: number;
    topFailedOperations: Array<{ operation: string; failedCount: number }>;
  } {
    let totalAttempts = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;

    const failedOperations: Array<{ operation: string; failedCount: number }> = [];

    for (const [operation, stats] of this.statistics.entries()) {
      totalAttempts += stats.totalAttempts;
      totalSuccessful += stats.successfulRetries;
      totalFailed += stats.failedRetries;

      if (stats.failedRetries > 0) {
        failedOperations.push({
          operation,
          failedCount: stats.failedRetries,
        });
      }
    }

    // 按失败次数降序排序
    failedOperations.sort((a, b) => b.failedCount - a.failedCount);

    return {
      totalOperations: this.statistics.size,
      totalAttempts,
      totalSuccessful,
      totalFailed,
      overallAverageAttempts:
        totalSuccessful + totalFailed > 0
          ? totalAttempts / (totalSuccessful + totalFailed)
          : 0,
      topFailedOperations: failedOperations.slice(0, 10),
    };
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 创建空统计对象
   */
  private createEmptyStatistics(): RetryStatistics {
    return {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageAttempts: 0,
      lastRetryAt: null,
      recentRetries: [],
    };
  }
}
