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
  THROTTLE_KEY,
  ThrottleOptions,
} from "../decorators/throttle.decorator";

@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly logger = new Logger(ThrottleGuard.name);
  private readonly redis: any = null; // TODO: Inject actual Redis instance

  constructor(
    private readonly reflector: Reflector,
    // @InjectRedis() private readonly redis: Redis,
  ) {
    // TODO: Inject Redis instance when @liaoliaots/nestjs-redis is installed
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 获取节流配置
    const throttleOptions = this.reflector.get<ThrottleOptions>(
      THROTTLE_KEY,
      context.getHandler(),
    );

    // 如果没有配置节流，直接通过
    if (!throttleOptions) {
      return true;
    }

    // TODO: Temporarily bypass throttling until Redis is properly configured
    if (!this.redis) {
      this.logger.warn('Throttling bypassed - Redis not configured');
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // 构建节流键
    const key = this.buildThrottleKey(request, throttleOptions);

    try {
      // 检查是否存在节流键
      const exists = await this.redis.exists(key);

      if (exists) {
        // 获取剩余时间
        const ttl = await this.redis.pttl(key);
        const remainingSeconds = Math.ceil(ttl / 1000);

        this.logger.warn(
          `Throttle triggered for key: ${key}, retry after ${remainingSeconds}s`,
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message:
              throttleOptions.message ||
              `Please wait ${remainingSeconds} seconds before trying again.`,
            error: "Too Many Requests",
            retryAfter: remainingSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // 设置节流键
      await this.redis.set(
        key,
        Date.now().toString(),
        "PX",
        throttleOptions.ttl,
      );

      return true;
    } catch (error) {
      // 如果是节流异常，继续抛出
      if (error instanceof HttpException) {
        throw error;
      }

      // Redis错误时记录日志但允许请求通过（降级策略）
      this.logger.error(
        `Throttle check failed for key: ${key}`,
        error.stack,
      );
      return true;
    }
  }

  /**
   * 构建节流键
   */
  private buildThrottleKey(
    request: Request,
    options: ThrottleOptions,
  ): string {
    const prefix = "throttle";

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

    // 获取请求方法
    const method = request.method;

    return `${prefix}:${method}:${route}:${identifier}`;
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
