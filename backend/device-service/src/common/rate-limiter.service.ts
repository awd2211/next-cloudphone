import { Injectable, Logger } from '@nestjs/common';

/**
 * Token Bucket 速率限制器
 *
 * 基于 Token Bucket 算法实现的速率限制
 * - 每个 bucket 以固定速率补充 tokens
 * - 每次请求消耗 1 个 token
 * - 如果没有可用 tokens，请求将被延迟
 *
 * 使用场景：
 * - 云厂商 API 调用限流
 * - 外部服务调用控制
 * - 防止突发流量
 */
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);

  // 存储每个 key 的 bucket 状态
  private buckets: Map<string, TokenBucket> = new Map();

  /**
   * 获取或创建 Token Bucket
   */
  private getBucket(key: string, options: RateLimitOptions): TokenBucket {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = new TokenBucket(options);
      this.buckets.set(key, bucket);
    }

    return bucket;
  }

  /**
   * 尝试消耗一个 token
   *
   * @param key 限流键（如：aliyun-api, huawei-api）
   * @param options 限流配置
   * @returns 是否成功消耗 token
   */
  async tryConsume(key: string, options: RateLimitOptions): Promise<boolean> {
    const bucket = this.getBucket(key, options);
    return bucket.tryConsume();
  }

  /**
   * 等待直到可以消耗 token（阻塞式）
   *
   * @param key 限流键
   * @param options 限流配置
   * @param timeoutMs 超时时间（毫秒），默认 30000
   * @returns 等待时间（毫秒）
   */
  async waitForToken(
    key: string,
    options: RateLimitOptions,
    timeoutMs: number = 30000
  ): Promise<number> {
    const bucket = this.getBucket(key, options);
    const startTime = Date.now();
    const waitTime = bucket.getWaitTime();

    if (waitTime === 0) {
      bucket.tryConsume();
      return 0;
    }

    if (waitTime > timeoutMs) {
      throw new Error(`Rate limit exceeded: need to wait ${waitTime}ms, timeout is ${timeoutMs}ms`);
    }

    this.logger.debug(`Rate limit for ${key}: waiting ${waitTime}ms for token...`);

    await this.delay(waitTime);
    bucket.tryConsume();

    const actualWait = Date.now() - startTime;
    return actualWait;
  }

  /**
   * 获取当前可用 tokens 数量
   */
  getAvailableTokens(key: string, options: RateLimitOptions): number {
    const bucket = this.getBucket(key, options);
    return bucket.getAvailableTokens();
  }

  /**
   * 重置 bucket（清空并重新填充）
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * 清空所有 buckets
   */
  resetAll(): void {
    this.buckets.clear();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Rate Limit 配置
 */
export interface RateLimitOptions {
  /** Bucket 容量（最大 tokens） */
  capacity: number;

  /** Token 补充速率（tokens/秒） */
  refillRate: number;

  /** 初始 tokens 数量，默认为 capacity */
  initialTokens?: number;
}

/**
 * Token Bucket 实现
 */
class TokenBucket {
  private tokens: number;
  private lastRefillTime: number;
  private readonly capacity: number;
  private readonly refillRate: number;
  private readonly refillInterval: number; // 每个 token 的补充间隔（毫秒）

  constructor(options: RateLimitOptions) {
    this.capacity = options.capacity;
    this.refillRate = options.refillRate;
    this.tokens = options.initialTokens ?? options.capacity;
    this.lastRefillTime = Date.now();
    this.refillInterval = 1000 / this.refillRate; // ms per token
  }

  /**
   * 补充 tokens
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;

    // 计算应该补充的 tokens 数量
    const tokensToAdd = Math.floor(elapsed / this.refillInterval);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefillTime = now;
    }
  }

  /**
   * 尝试消耗一个 token
   */
  tryConsume(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * 获取当前可用 tokens 数量
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * 获取需要等待的时间（毫秒）
   */
  getWaitTime(): number {
    this.refill();

    if (this.tokens >= 1) {
      return 0;
    }

    // 需要等待 1 个 token 的时间
    return this.refillInterval;
  }
}
