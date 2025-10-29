import { Logger } from "@nestjs/common";
import { RateLimitOptions } from "./rate-limiter.service";

/**
 * RateLimit 装饰器配置
 */
export interface RateLimitDecoratorOptions extends RateLimitOptions {
  /** 限流键名，用于区分不同的限流器 */
  key: string;

  /** 超时时间（毫秒），默认 30000 */
  timeoutMs?: number;

  /** 是否阻塞等待（true）还是立即失败（false），默认 true */
  blocking?: boolean;
}

// 全局 rate limiter 实例（简化版，避免依赖注入复杂性）
class GlobalRateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();

  getBucket(key: string, options: RateLimitOptions): TokenBucket {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = new TokenBucket(options);
      this.buckets.set(key, bucket);
    }

    return bucket;
  }

  async waitForToken(
    key: string,
    options: RateLimitOptions,
    timeoutMs: number,
  ): Promise<number> {
    const bucket = this.getBucket(key, options);
    const startTime = Date.now();
    const waitTime = bucket.getWaitTime();

    if (waitTime === 0) {
      bucket.tryConsume();
      return 0;
    }

    if (waitTime > timeoutMs) {
      throw new Error(
        `Rate limit exceeded: need to wait ${waitTime}ms, timeout is ${timeoutMs}ms`,
      );
    }

    await delay(waitTime);
    bucket.tryConsume();

    return Date.now() - startTime;
  }

  tryConsume(key: string, options: RateLimitOptions): boolean {
    const bucket = this.getBucket(key, options);
    return bucket.tryConsume();
  }
}

const globalRateLimiter = new GlobalRateLimiter();

/**
 * RateLimit 装饰器：为方法添加速率限制
 *
 * @param options 速率限制配置
 *
 * @example
 * ```typescript
 * class AliyunClient {
 *   @RateLimit({
 *     key: 'aliyun-api',
 *     capacity: 10,
 *     refillRate: 2, // 2 tokens/秒
 *   })
 *   async describeInstance(id: string) {
 *     // API 调用
 *   }
 * }
 * ```
 */
export function RateLimit(options: RateLimitDecoratorOptions) {
  const {
    key,
    capacity,
    refillRate,
    initialTokens,
    timeoutMs = 30000,
    blocking = true,
  } = options;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const logger = new Logger(`${target.constructor.name}.${propertyKey}`);

    descriptor.value = async function (...args: any[]) {
      const rateLimitOptions: RateLimitOptions = {
        capacity,
        refillRate,
        initialTokens,
      };

      if (blocking) {
        // 阻塞模式：等待直到有可用 token
        try {
          const waitTime = await globalRateLimiter.waitForToken(
            key,
            rateLimitOptions,
            timeoutMs,
          );

          if (waitTime > 0) {
            logger.debug(
              `Rate limit: waited ${waitTime}ms for token (key: ${key})`,
            );
          }

          return await originalMethod.apply(this, args);
        } catch (error) {
          logger.error(
            `Rate limit error (key: ${key}): ${error.message}`,
          );
          throw error;
        }
      } else {
        // 非阻塞模式：立即尝试消耗 token，失败则抛出错误
        const consumed = globalRateLimiter.tryConsume(key, rateLimitOptions);

        if (!consumed) {
          const error = new Error(
            `Rate limit exceeded for ${key}: no available tokens`,
          );
          logger.warn(error.message);
          throw error;
        }

        return await originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * Token Bucket 实现（内部使用）
 */
class TokenBucket {
  private tokens: number;
  private lastRefillTime: number;
  private readonly capacity: number;
  private readonly refillRate: number;
  private readonly refillInterval: number;

  constructor(options: RateLimitOptions) {
    this.capacity = options.capacity;
    this.refillRate = options.refillRate;
    this.tokens = options.initialTokens ?? options.capacity;
    this.lastRefillTime = Date.now();
    this.refillInterval = 1000 / this.refillRate;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const tokensToAdd = Math.floor(elapsed / this.refillInterval);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefillTime = now;
    }
  }

  tryConsume(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  getWaitTime(): number {
    this.refill();

    if (this.tokens >= 1) {
      return 0;
    }

    return this.refillInterval;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 云厂商 API 错误类型
 */
export class CloudProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly code: string,
    message: string,
  ) {
    super(`[${provider}] ${code}: ${message}`);
    this.name = "CloudProviderError";
  }
}

/**
 * API 限流错误
 */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}
