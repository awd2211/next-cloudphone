import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(IpFilterMiddleware.name);
  use(req: Request, res: Response, next: NextFunction) {
    const clientIp = this.getClientIp(req);

    // 检查 IP 是否在黑名单中
    if (this.isBlacklisted(clientIp)) {
      this.logger.warn(`Blocked request from blacklisted IP: ${clientIp}`);

      throw new HttpException(
        {
          success: false,
          code: HttpStatus.FORBIDDEN,
          message: 'Access denied',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.FORBIDDEN
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
   * 检查 IP 是否在黑名单中（支持 CIDR 格式）
   */
  private isBlacklisted(ip: string): boolean {
    for (const entry of ipBlacklist) {
      // 检查是否是 CIDR 格式
      if (entry.includes('/')) {
        if (this.isInCidrRange(ip, entry)) {
          return true;
        }
      } else {
        // 精确匹配
        if (ip === entry) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 检查 IP 是否在 CIDR 范围内
   * 支持 IPv4 CIDR 格式，例如：192.168.1.0/24
   */
  private isInCidrRange(ip: string, cidr: string): boolean {
    try {
      const [range, bits] = cidr.split('/');
      const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);

      const ipNum = this.ipToNumber(ip);
      const rangeNum = this.ipToNumber(range);

      return (ipNum & mask) === (rangeNum & mask);
    } catch (error) {
      this.logger.error(`Invalid CIDR format: ${cidr}`, error);
      return false;
    }
  }

  /**
   * 将 IPv4 地址转换为数字
   */
  private ipToNumber(ip: string): number {
    const parts = ip.split('.').map((part) => parseInt(part, 10));
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }
}
