import { Logger } from "@nestjs/common";

/**
 * 重试配置接口
 */
export interface RetryOptions {
  maxAttempts?: number; // 最大重试次数，默认 3
  baseDelayMs?: number; // 基础延迟（毫秒），默认 1000
  maxDelayMs?: number; // 最大延迟（毫秒），默认 30000
  exponentialBase?: number; // 指数基数，默认 2
  jitterFactor?: number; // 抖动因子（0-1），默认 0.1
  retryableErrors?: Array<new (...args: any[]) => Error>; // 可重试的错误类型
  onRetry?: (error: Error, attempt: number, delay: number) => void; // 重试回调
}

/**
 * 计算指数退避延迟时间（带抖动）
 */
function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  exponentialBase: number,
  jitterFactor: number,
): number {
  // 计算指数延迟: baseDelay * (exponentialBase ^ attempt)
  const exponentialDelay = baseDelayMs * Math.pow(exponentialBase, attempt - 1);

  // 限制最大延迟
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // 添加随机抖动 (±jitterFactor)
  const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1);

  return Math.round(cappedDelay + jitter);
}

/**
 * 检查错误是否可重试
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
 * 延迟执行
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry 装饰器：为方法添加自动重试（指数退避）功能
 *
 * @param options 重试配置
 *
 * @example
 * ```typescript
 * class MyService {
 *   @Retry({ maxAttempts: 3, baseDelayMs: 1000 })
 *   async callExternalAPI() {
 *     // 可能失败的操作
 *   }
 * }
 * ```
 */
export function Retry(options: RetryOptions = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    exponentialBase = 2,
    jitterFactor = 0.1,
    retryableErrors,
    onRetry,
  } = options;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const logger = new Logger(`${target.constructor.name}.${propertyKey}`);

    descriptor.value = async function (...args: any[]) {
      let lastError: Error = new Error('Retry failed');

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // 尝试执行原方法
          return await originalMethod.apply(this, args);
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
            throw error;
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
              logger.error(`Retry callback failed: ${callbackError.message}`);
            }
          }

          // 等待后重试
          await delay(delayMs);
        }
      }

      throw lastError;
    };

    return descriptor;
  };
}

/**
 * 通用重试工具函数（用于不使用装饰器的场景）
 *
 * @param fn 要执行的函数
 * @param options 重试配置
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => await fetchData(),
 *   { maxAttempts: 3, baseDelayMs: 1000 }
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
  } = options;

  const logger = new Logger("retryWithBackoff");
  let lastError: Error = new Error('Retry failed');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
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
        throw error;
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
          logger.error(`Retry callback failed: ${callbackError.message}`);
        }
      }

      await delay(delayMs);
    }
  }

  throw lastError;
}

/**
 * 预定义的可重试错误类型
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export class TemporaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemporaryError";
  }
}

export class DockerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DockerError";
  }
}

export class AdbError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdbError";
  }
}
