import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ipBlacklist } from '../config/throttler.config';

/**
 * IP 过滤中间件
 *
 * 功能：
 * - 阻止黑名单 IP 访问
 * - 记录被阻止的访问尝试
 * - 支持 CIDR 格式（可选扩展）
 */
@Injectable()
export class IpFilterMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const clientIp = this.getClientIp(req);

    // 检查 IP 是否在黑名单中
    if (this.isBlacklisted(clientIp)) {
      console.warn(`🚫 Blocked request from blacklisted IP: ${clientIp}`);

      throw new HttpException(
        {
          success: false,
          code: HttpStatus.FORBIDDEN,
          message: 'Access denied',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.FORBIDDEN,
      );
    }

    next();
  }

  /**
   * 获取客户端真实 IP
   */
  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * 检查 IP 是否在黑名单中
   */
  private isBlacklisted(ip: string): boolean {
    return ipBlacklist.includes(ip);
  }

  /**
   * TODO: 扩展功能 - 支持 CIDR 格式
   * 例如：192.168.1.0/24
   */
  private isInCidrRange(ip: string, cidr: string): boolean {
    // 实现 CIDR 匹配逻辑
    // 可以使用 ipaddr.js 或 ip-range-check 库
    return false;
  }
}
