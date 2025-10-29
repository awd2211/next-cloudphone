import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * 高级限流中间件
 * 支持多种限流策略：IP 限流、用户限流、端点限流
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private redis: Redis;
  private readonly enabled: boolean;
  private readonly defaultLimit: number;
  private readonly defaultWindow: number;

  // 不同端点的限流配置
  private readonly endpointLimits: Map<string, { limit: number; window: number }> = new Map([
    // 认证端点 - 严格限流
    ['/auth/login', { limit: 5, window: 60 }],           // 5次/分钟
    ['/auth/register', { limit: 3, window: 60 }],        // 3次/分钟
    ['/auth/forgot-password', { limit: 3, window: 300 }], // 3次/5分钟

    // 设备操作 - 中等限流
    ['/devices', { limit: 100, window: 60 }],            // 100次/分钟
    ['/devices/:id', { limit: 200, window: 60 }],        // 200次/分钟

    // ADB 操作 - 宽松限流
    ['/devices/:id/shell', { limit: 50, window: 60 }],   // 50次/分钟
    ['/devices/:id/screenshot', { limit: 20, window: 60 }], // 20次/分钟

    // 文件上传 - 严格限流
    ['/apps/upload', { limit: 10, window: 60 }],         // 10次/分钟

    // 支付操作 - 非常严格
    ['/billing/pay', { limit: 5, window: 300 }],         // 5次/5分钟
  ]);

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('RATE_LIMIT_ENABLED', true);
    this.defaultLimit = this.configService.get<number>('RATE_LIMIT_DEFAULT', 100);
    this.defaultWindow = this.configService.get<number>('RATE_LIMIT_WINDOW', 60);

    // 初始化 Redis 连接
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      keyPrefix: 'ratelimit:',
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('Redis rate limit connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 50, 2000);
      },
    });

    this.redis.on('error', (err) => {
      console.error('Redis rate limit error:', err);
    });
  }

  async use(req: Request, res: Response, next: NextFunction) {
    if (!this.enabled) {
      return next();
    }

    try {
      // 获取限流键
      const keys = this.getRateLimitKeys(req);

      // 获取限流配置
      const config = this.getRateLimitConfig(req);

      // 检查所有限流键
      for (const key of keys) {
        const allowed = await this.checkRateLimit(key, config.limit, config.window);

        if (!allowed) {
          const retryAfter = await this.getRetryAfter(key);

          res.setHeader('X-RateLimit-Limit', config.limit.toString());
          res.setHeader('X-RateLimit-Remaining', '0');
          res.setHeader('X-RateLimit-Reset', retryAfter.toString());
          res.setHeader('Retry-After', retryAfter.toString());

          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: `太多请求，请在 ${retryAfter} 秒后重试`,
              error: 'Too Many Requests',
              retryAfter,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      // 设置速率限制头
      const remaining = await this.getRemaining(keys[0], config.limit);
      res.setHeader('X-RateLimit-Limit', config.limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // Redis 错误不应阻止请求
      console.error('Rate limit middleware error:', error);
      next();
    }
  }

  /**
   * 获取限流键
   * 返回多个键以实现多级限流
   */
  private getRateLimitKeys(req: Request): string[] {
    const keys: string[] = [];
    const ip = this.getClientIP(req);
    const path = this.normalizePath(req.path);

    // IP 级别限流
    keys.push(`ip:${ip}:${path}`);

    // 用户级别限流（如果已认证）
    const userId = (req as any).user?.id;
    if (userId) {
      keys.push(`user:${userId}:${path}`);
    }

    // 全局端点限流
    keys.push(`endpoint:${path}`);

    return keys;
  }

  /**
   * 获取客户端 IP
   */
  private getClientIP(req: Request): string {
    // 检查代理头
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }

    const realIP = req.headers['x-real-ip'];
    if (realIP) {
      return realIP as string;
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * 标准化路径（处理路径参数）
   */
  private normalizePath(path: string): string {
    // 移除查询字符串
    path = path.split('?')[0];

    // 替换 UUID/ID 为占位符
    path = path.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id');
    path = path.replace(/\/\d+/g, '/:id');

    return path;
  }

  /**
   * 获取限流配置
   */
  private getRateLimitConfig(req: Request): { limit: number; window: number } {
    const path = this.normalizePath(req.path);

    // 检查是否有特定端点配置
    for (const [pattern, config] of this.endpointLimits) {
      if (this.matchPath(path, pattern)) {
        return config;
      }
    }

    // 返回默认配置
    return {
      limit: this.defaultLimit,
      window: this.defaultWindow,
    };
  }

  /**
   * 路径匹配
   */
  private matchPath(path: string, pattern: string): boolean {
    const pathParts = path.split('/').filter(Boolean);
    const patternParts = pattern.split('/').filter(Boolean);

    if (pathParts.length !== patternParts.length) {
      return false;
    }

    return patternParts.every((part, i) => {
      if (part.startsWith(':')) {
        return true; // 参数匹配任何值
      }
      return part === pathParts[i];
    });
  }

  /**
   * 检查限流（滑动窗口算法）
   */
  private async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // 使用 Redis 事务执行滑动窗口限流
    const pipeline = this.redis.pipeline();

    // 移除窗口外的记录
    pipeline.zremrangebyscore(key, 0, windowStart);

    // 添加当前请求
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // 计数窗口内的请求
    pipeline.zcard(key);

    // 设置过期时间
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();

    // 获取计数结果
    const count = results?.[2]?.[1] as number;

    return count <= limit;
  }

  /**
   * 获取剩余请求次数
   */
  private async getRemaining(key: string, limit: number): Promise<number> {
    const count = await this.redis.zcard(key);
    return Math.max(0, limit - count);
  }

  /**
   * 获取重试时间（秒）
   */
  private async getRetryAfter(key: string): Promise<number> {
    const ttl = await this.redis.ttl(key);
    return ttl > 0 ? ttl : 60;
  }

  /**
   * 清理（在应用关闭时调用）
   */
  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

/**
 * IP 黑名单中间件
 */
@Injectable()
export class IPBlacklistMiddleware implements NestMiddleware {
  private redis: Redis;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('IP_BLACKLIST_ENABLED', true);

    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      keyPrefix: 'blacklist:',
    });
  }

  async use(req: Request, res: Response, next: NextFunction) {
    if (!this.enabled) {
      return next();
    }

    try {
      const ip = this.getClientIP(req);
      const isBlacklisted = await this.redis.sismember('ips', ip);

      if (isBlacklisted) {
        throw new HttpException(
          {
            statusCode: HttpStatus.FORBIDDEN,
            message: 'IP 地址已被封禁',
            error: 'IP Blacklisted',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // Redis 错误不应阻止请求
      console.error('IP blacklist middleware error:', error);
      next();
    }
  }

  private getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }

    const realIP = req.headers['x-real-ip'];
    if (realIP) {
      return realIP as string;
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * 添加 IP 到黑名单
   */
  async addToBlacklist(ip: string, ttl?: number): Promise<void> {
    await this.redis.sadd('ips', ip);
    if (ttl) {
      await this.redis.expire(`ip:${ip}`, ttl);
    }
  }

  /**
   * 从黑名单移除 IP
   */
  async removeFromBlacklist(ip: string): Promise<void> {
    await this.redis.srem('ips', ip);
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

/**
 * 自动封禁中间件
 * 监控失败请求，自动封禁恶意 IP
 */
@Injectable()
export class AutoBanMiddleware implements NestMiddleware {
  private redis: Redis;
  private readonly enabled: boolean;
  private readonly maxFailures: number;
  private readonly banDuration: number;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('AUTO_BAN_ENABLED', true);
    this.maxFailures = this.configService.get<number>('AUTO_BAN_MAX_FAILURES', 10);
    this.banDuration = this.configService.get<number>('AUTO_BAN_DURATION', 3600); // 1小时

    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      keyPrefix: 'autoban:',
    });
  }

  async use(req: Request, res: Response, next: NextFunction) {
    if (!this.enabled) {
      return next();
    }

    const ip = this.getClientIP(req);

    // 拦截响应以记录失败
    const originalSend = res.send;
    res.send = function (data: any) {
      // 记录 4xx 和 5xx 错误
      if (res.statusCode >= 400) {
        (async () => {
          try {
            await this.recordFailure(ip);
          } catch (err) {
            console.error('Auto-ban record failure error:', err);
          }
        })();
      }

      return originalSend.call(this, data);
    }.bind(this);

    next();
  }

  private getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }
    return req.ip || 'unknown';
  }

  /**
   * 记录失败请求
   */
  private async recordFailure(ip: string): Promise<void> {
    const key = `failures:${ip}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 300); // 5分钟窗口

    if (count >= this.maxFailures) {
      // 自动封禁
      await this.redis.sadd('banned', ip);
      await this.redis.expire(`banned:${ip}`, this.banDuration);

      console.warn(`IP ${ip} auto-banned for ${this.banDuration} seconds (${count} failures)`);
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
