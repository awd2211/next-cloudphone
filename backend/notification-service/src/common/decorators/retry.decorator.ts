import { Logger } from '@nestjs/common';

/**
 * 重试配置选项
 */
export interface RetryOptions {
  /**
   * 最大重试次数
   * @default 3
   */
  maxAttempts?: number;

  /**
   * 基础延迟时间（毫秒）
   * @default 1000
   */
  baseDelayMs?: number;

  /**
   * 使用指数退避策略
   * @default true
   */
  exponentialBackoff?: boolean;

  /**
   * 最大延迟时间（毫秒）
   * @default 10000
   */
  maxDelayMs?: number;

  /**
   * 可重试的错误类型（错误名称数组）
   * 如果为空，则重试所有错误
   */
  retryableErrors?: string[];

  /**
   * 自定义日志记录器名称
   */
  loggerName?: string;
}

/**
 * 重试装饰器
 *
 * 为异步方法添加自动重试机制，支持指数退避
 *
 * @example
 * ```typescript
 * @Retry({ maxAttempts: 5, baseDelayMs: 2000 })
 * async sendNotification(userId: string) {
 *   // 发送通知逻辑
 * }
 * ```
 */
export function Retry(options: RetryOptions = {}): MethodDecorator {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    exponentialBackoff = true,
    maxDelayMs = 10000,
    retryableErrors = [],
    loggerName,
  } = options;

  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);
    const logger = new Logger(loggerName || target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      let lastError: Error | undefined;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // 执行原方法
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;

          // 检查是否为可重试错误
          if (
            retryableErrors.length > 0 &&
            !retryableErrors.includes(error.name)
          ) {
            logger.error(
              `${methodName}: 不可重试错误 ${error.name}, 不进行重试`,
              error.stack
            );
            throw error;
          }

          // 如果已是最后一次尝试，不再重试
          if (attempt === maxAttempts) {
            logger.error(
              `${methodName}: 重试 ${attempt}/${maxAttempts} 次后仍失败`,
              error.stack
            );
            throw error;
          }

          // 计算延迟时间
          let delayMs = baseDelayMs;
          if (exponentialBackoff) {
            delayMs = Math.min(
              baseDelayMs * Math.pow(2, attempt - 1),
              maxDelayMs
            );
          }

          logger.warn(
            `${methodName}: 第 ${attempt}/${maxAttempts} 次尝试失败 (${error.message}), ${delayMs}ms 后重试...`
          );

          // 等待后重试
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      // 理论上不应该到这里，但为了类型安全
      throw lastError || new Error('重试失败，但未捕获到具体错误');
    };

    return descriptor;
  };
}

/**
 * 计算延迟时间（带抖动）
 *
 * @param baseDelayMs 基础延迟
 * @param attempt 当前尝试次数
 * @param maxDelayMs 最大延迟
 * @returns 计算后的延迟时间
 */
export function calculateDelayWithJitter(
  baseDelayMs: number,
  attempt: number,
  maxDelayMs: number
): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% 抖动
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}
