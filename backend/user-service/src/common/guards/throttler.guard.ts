import { Injectable } from '@nestjs/common';
import { ThrottlerGuard as NestThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';

/**
 * 自定义限流守卫
 *
 * 功能：
 * - 基于 IP 地址限流
 * - 可选：基于用户 ID 限流
 * - 白名单IP支持
 */
@Injectable()
export class CustomThrottlerGuard extends NestThrottlerGuard {
  /**
   * IP 白名单
   * 这些 IP 不受限流限制
   */
  private readonly ipWhitelist = [
    '127.0.0.1',
    '::1',
    'localhost',
    // 添加您的受信任 IP
  ];

  /**
   * 获取追踪标识（IP 或用户 ID）
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // 优先使用用户 ID（如果已认证）
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }

    // 否则使用 IP 地址
    return this.getClientIp(req);
  }

  /**
   * 获取客户端真实 IP
   * 支持代理和负载均衡器
   */
  private getClientIp(req: Record<string, any>): string {
    return (
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  /**
   * 在限流检查前执行
   * 检查 IP 是否在白名单中
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const clientIp = this.getClientIp(request);

    // 白名单 IP 跳过限流
    if (this.ipWhitelist.includes(clientIp)) {
      return true;
    }

    // 执行限流检查
    return super.canActivate(context);
  }
}
