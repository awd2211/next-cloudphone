import { Logger } from '@nestjs/common';

/**
 * Retry Configuration Interface
 *
 * 重试配置接口
 */
export interface RetryOptions {
  /**
   * 最大重试次数（默认 3）
   */
  maxAttempts?: number;

  /**
   * 基础延迟时间（毫秒，默认 1000ms）
   */
  baseDelayMs?: number;

  /**
   * 最大延迟时间（毫秒，默认 30000ms）
   */
  maxDelayMs?: number;

  /**
   * 指数基数（默认 2）
   * - 2: 1s, 2s, 4s, 8s, 16s...
   * - 3: 1s, 3s, 9s, 27s...
   */
  exponentialBase?: number;

  /**
   * 抖动因子（0-1，默认 0.1）
   * 添加随机性以避免"惊群效应"
   */
  jitterFactor?: number;

  /**
   * 可重试的错误类型（默认所有错误）
   * 只有这些类型的错误才会触发重试
   */
  retryableErrors?: Array<new (...args: any[]) => Error>;

  /**
   * 重试回调函数
   * 在每次重试前调用，可用于日志、监控等
   */
  onRetry?: (error: Error, attempt: number, delay: number) => void;

  /**
   * 是否在失败时抛出原始错误（默认 true）
   */
  throwOriginalError?: boolean;
}

/**
 * Calculate Exponential Backoff Delay with Jitter
 *
 * 计算指数退避延迟时间（带抖动）
 *
 * 算法:
 * 1. 指数延迟 = baseDelay * (exponentialBase ^ (attempt - 1))
 * 2. 限制最大延迟 = min(exponentialDelay, maxDelay)
 * 3. 添加抖动 = cappedDelay ± (cappedDelay * jitterFactor * random)
 *
 * @param attempt 当前重试次数
 * @param baseDelayMs 基础延迟
 * @param maxDelayMs 最大延迟
 * @param exponentialBase 指数基数
 * @param jitterFactor 抖动因子
 * @returns 计算后的延迟时间（毫秒）
 */
function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  exponentialBase: number,
  jitterFactor: number,
): number {
  // 计算指数延迟: baseDelay * (exponentialBase ^ (attempt - 1))
  const exponentialDelay = baseDelayMs * Math.pow(exponentialBase, attempt - 1);

  // 限制最大延迟
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // 添加随机抖动 (±jitterFactor)
  // 范围: cappedDelay * (1 - jitterFactor) ~ cappedDelay * (1 + jitterFactor)
  const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1);

  return Math.round(cappedDelay + jitter);
}

/**
 * Check if Error is Retryable
 *
 * 检查错误是否可重试
 *
 * @param error 错误对象
 * @param retryableErrors 可重试的错误类型列表
 * @returns 是否可重试
 */
function isRetryableError(
  error: Error,
  retryableErrors?: Array<new (...args: any[]) => Error>,
): boolean {
  if (!retryableErrors || retryableErrors.length === 0) {
    // 如果未指定可重试错误，默认所有错误都可重试
    return true;
  }

  // 检查错误是否属于可重试类型
  return retryableErrors.some((ErrorType) => error instanceof ErrorType);
}

/**
 * Delay Execution
 *
 * 延迟执行（Promise 版本）
 *
 * @param ms 延迟毫秒数
 * @returns Promise
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry Decorator
 *
 * 为方法添加自动重试（指数退避）功能
 *
 * 特性:
 * - 指数退避算法（避免立即重试造成的资源浪费）
 * - 抖动机制（避免多个请求同时重试造成"惊群效应"）
 * - 可重试错误过滤（只重试临时性错误）
 * - 重试回调（用于日志、监控）
 *
 * 使用场景:
 * - 外部 API 调用（网络波动）
 * - 数据库连接（临时不可用）
 * - 文件系统操作（资源竞争）
 * - 消息队列发布（临时故障）
 *
 * @param options 重试配置
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * class PaymentService {
 *   @Retry({
 *     maxAttempts: 5,
 *     baseDelayMs: 1000,
 *     retryableErrors: [NetworkError, TimeoutError],
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry attempt ${attempt}, waiting ${delay}ms`);
 *     }
 *   })
 *   async callPaymentAPI() {
 *     // 可能失败的操作
 *   }
 * }
 * ```
 */
export function Retry(options: RetryOptions = {}): MethodDecorator {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    exponentialBase = 2,
    jitterFactor = 0.1,
    retryableErrors,
    onRetry,
    throwOriginalError = true,
  } = options;

  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);
    const logger = new Logger(`${target.constructor.name}.${methodName}`);

    descriptor.value = async function (...args: any[]) {
      let lastError: Error;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // 尝试执行原方法
          const result = await originalMethod.apply(this, args);

          // 如果不是第一次尝试，记录成功日志
          if (attempt > 1) {
            logger.log(`Retry succeeded on attempt ${attempt}/${maxAttempts}`);
          }

          return result;
        } catch (error) {
          lastError = error;

          // 检查是否为可重试的错误
          if (!isRetryableError(error, retryableErrors)) {
            logger.error(
              `Non-retryable error on attempt ${attempt}/${maxAttempts}: ${error.message}`,
            );
            throw error;
          }

          // 如果是最后一次尝试，直接抛出错误
          if (attempt === maxAttempts) {
            logger.error(
              `Max retry attempts (${maxAttempts}) reached. Last error: ${error.message}`,
            );

            if (throwOriginalError) {
              throw error;
            } else {
              throw new Error(
                `Failed after ${maxAttempts} attempts. Last error: ${error.message}`,
              );
            }
          }

          // 计算延迟时间
          const delayMs = calculateBackoffDelay(
            attempt,
            baseDelayMs,
            maxDelayMs,
            exponentialBase,
            jitterFactor,
          );

          logger.warn(
            `Attempt ${attempt}/${maxAttempts} failed: ${error.message}. Retrying in ${delayMs}ms...`,
          );

          // 执行重试回调
          if (onRetry) {
            try {
              onRetry(error, attempt, delayMs);
            } catch (callbackError) {
              logger.error(
                `Retry callback failed: ${callbackError.message}`,
                callbackError.stack,
              );
            }
          }

          // 等待后重试
          await delay(delayMs);
        }
      }

      // 理论上不会到达这里，但为了类型安全
      throw lastError!;
    };

    return descriptor;
  };
}

/**
 * Retry With Backoff (Utility Function)
 *
 * 通用重试工具函数（用于不使用装饰器的场景）
 *
 * 适用场景:
 * - 工具函数中使用（无法使用装饰器）
 * - 动态重试逻辑
 * - 一次性操作
 *
 * @param fn 要执行的异步函数
 * @param options 重试配置
 * @returns Promise<T>
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => await fetchDataFromAPI(),
 *   {
 *     maxAttempts: 5,
 *     baseDelayMs: 1000,
 *     retryableErrors: [NetworkError],
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    exponentialBase = 2,
    jitterFactor = 0.1,
    retryableErrors,
    onRetry,
    throwOriginalError = true,
  } = options;

  const logger = new Logger('retryWithBackoff');
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();

      if (attempt > 1) {
        logger.log(`Retry succeeded on attempt ${attempt}/${maxAttempts}`);
      }

      return result;
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error, retryableErrors)) {
        logger.error(`Non-retryable error: ${error.message}`);
        throw error;
      }

      if (attempt === maxAttempts) {
        logger.error(
          `Max retry attempts (${maxAttempts}) reached. Last error: ${error.message}`,
        );

        if (throwOriginalError) {
          throw error;
        } else {
          throw new Error(
            `Failed after ${maxAttempts} attempts. Last error: ${error.message}`,
          );
        }
      }

      const delayMs = calculateBackoffDelay(
        attempt,
        baseDelayMs,
        maxDelayMs,
        exponentialBase,
        jitterFactor,
      );

      logger.warn(
        `Attempt ${attempt}/${maxAttempts} failed: ${error.message}. Retrying in ${delayMs}ms...`,
      );

      if (onRetry) {
        try {
          onRetry(error, attempt, delayMs);
        } catch (callbackError) {
          logger.error(
            `Retry callback failed: ${callbackError.message}`,
            callbackError.stack,
          );
        }
      }

      await delay(delayMs);
    }
  }

  throw lastError!;
}

/**
 * Pre-defined Retryable Error Types
 *
 * 预定义的可重试错误类型
 */

/**
 * Network Error - 网络错误
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Timeout Error - 超时错误
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Temporary Error - 临时错误
 */
export class TemporaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemporaryError';
  }
}

/**
 * Docker Error - Docker 操作错误
 */
export class DockerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DockerError';
  }
}

/**
 * ADB Error - ADB 操作错误
 */
export class AdbError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdbError';
  }
}

/**
 * Database Error - 数据库临时错误
 */
export class DatabaseTemporaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseTemporaryError';
  }
}

/**
 * Service Unavailable Error - 服务不可用错误
 */
export class ServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Rate Limit Error - 频率限制错误
 */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}
