import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * 限流配置
 */
export interface RateLimitOptions {
  /**
   * 时间窗口（秒）
   */
  ttl: number;

  /**
   * 时间窗口内的最大请求数
   */
  limit: number;

  /**
   * 限流键前缀（用于区分不同的端点）
   */
  keyPrefix?: string;

  /**
   * 是否基于用户ID限流（默认：true）
   * false则基于IP地址
   */
  perUser?: boolean;

  /**
   * 自定义错误消息
   */
  message?: string;
}

/**
 * 限流装饰器
 *
 * @example
 * // 每个用户每分钟最多10次请求
 * @RateLimit({ ttl: 60, limit: 10 })
 * @Get('data')
 * async getData() { ... }
 *
 * @example
 * // 每个IP每小时最多100次请求
 * @RateLimit({ ttl: 3600, limit: 100, perUser: false })
 * @Post('submit')
 * async submit() { ... }
 */
export const RateLimit = (options: RateLimitOptions): MethodDecorator => {
  return SetMetadata(RATE_LIMIT_KEY, options);
};

/**
 * 预定义的限流策略
 */
export class RateLimitPresets {
  /**
   * 严格限流：每分钟5次
   */
  static STRICT = { ttl: 60, limit: 5 };

  /**
   * 标准限流：每分钟20次
   */
  static STANDARD = { ttl: 60, limit: 20 };

  /**
   * 宽松限流：每分钟60次
   */
  static RELAXED = { ttl: 60, limit: 60 };

  /**
   * 批量操作限流：每小时10次
   */
  static BATCH_OPERATION = { ttl: 3600, limit: 10 };

  /**
   * 查询限流：每分钟100次
   */
  static QUERY = { ttl: 60, limit: 100 };

  /**
   * 写操作限流：每分钟30次
   */
  static WRITE = { ttl: 60, limit: 30 };
}
