import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
// TODO: Install @liaoliaots/nestjs-redis or use alternative Redis injection
// import { InjectRedis } from "@liaoliaots/nestjs-redis";
import Redis from "ioredis";
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from "../decorators/rate-limit.decorator";

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly redis: any = null; // TODO: Inject actual Redis instance

  constructor(
    private readonly reflector: Reflector,
    // @InjectRedis() private readonly redis: Redis,
  ) {
    // TODO: Inject Redis instance when @liaoliaots/nestjs-redis is installed
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 获取限流配置
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    // 如果没有配置限流，直接通过
    if (!rateLimitOptions) {
      return true;
    }

    // TODO: Temporarily bypass rate limiting until Redis is properly configured
    if (!this.redis) {
      this.logger.warn('Rate limiting bypassed - Redis not configured');
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // 构建限流键
    const key = this.buildRateLimitKey(request, rateLimitOptions);

    try {
      // 使用Redis的INCR和EXPIRE实现滑动窗口限流
      const current = await this.redis.incr(key);

      // 第一次访问，设置过期时间
      if (current === 1) {
        await this.redis.expire(key, rateLimitOptions.ttl);
      }

      // 检查是否超过限制
      if (current > rateLimitOptions.limit) {
        // 获取剩余时间
        const ttl = await this.redis.ttl(key);

        this.logger.warn(
          `Rate limit exceeded for key: ${key}, count: ${current}/${rateLimitOptions.limit}`,
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message:
              rateLimitOptions.message ||
              `Too many requests. Please try again in ${ttl} seconds.`,
            error: "Too Many Requests",
            retryAfter: ttl,
            limit: rateLimitOptions.limit,
            remaining: 0,
            reset: Date.now() + ttl * 1000,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // 设置响应头
      const response = context.switchToHttp().getResponse();
      const ttl = await this.redis.ttl(key);
      response.setHeader("X-RateLimit-Limit", rateLimitOptions.limit);
      response.setHeader(
        "X-RateLimit-Remaining",
        Math.max(0, rateLimitOptions.limit - current),
      );
      response.setHeader("X-RateLimit-Reset", Date.now() + ttl * 1000);

      return true;
    } catch (error) {
      // 如果是限流异常，继续抛出
      if (error instanceof HttpException) {
        throw error;
      }

      // Redis错误时记录日志但允许请求通过（降级策略）
      this.logger.error(
        `Rate limit check failed for key: ${key}`,
        error.stack,
      );
      return true;
    }
  }

  /**
   * 构建限流键
   */
  private buildRateLimitKey(
    request: Request,
    options: RateLimitOptions,
  ): string {
    const prefix = options.keyPrefix || "rate_limit";

    // 获取标识符（用户ID或IP）
    let identifier: string;

    if (options.perUser !== false) {
      // 基于用户ID
      const user = (request as any).user;
      identifier = user?.userId || user?.id || this.getIpAddress(request);
    } else {
      // 基于IP地址
      identifier = this.getIpAddress(request);
    }

    // 获取路由路径
    const route = request.route?.path || request.path;

    return `${prefix}:${route}:${identifier}`;
  }

  /**
   * 获取客户端IP地址
   */
  private getIpAddress(request: Request): string {
    // 考虑代理情况
    const forwarded = request.headers["x-forwarded-for"];
    if (forwarded) {
      const ips = (forwarded as string).split(",");
      return ips[0].trim();
    }

    const realIp = request.headers["x-real-ip"];
    if (realIp) {
      return realIp as string;
    }

    return request.ip || request.socket.remoteAddress || "unknown";
  }
}
