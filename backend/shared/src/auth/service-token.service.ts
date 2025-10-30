import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { ServiceTokenPayload } from './service-auth.guard';

/**
 * Service Token 生成服务
 *
 * 功能：
 * - 为服务生成 JWT Token
 * - Token 用于服务间认证
 * - 支持 Token 缓存和刷新
 *
 * 使用方法：
 * ```typescript
 * // 在 HTTP Client 中使用
 * const token = await this.serviceTokenService.generateToken('device-service');
 *
 * await this.httpClient.get(url, {
 *   headers: {
 *     'X-Service-Token': token,
 *   },
 * });
 * ```
 */
@Injectable()
export class ServiceTokenService {
  private tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();

  constructor(private configService: ConfigService) {}

  /**
   * 生成服务 Token
   *
   * @param serviceName 服务名称
   * @param expiresIn Token 有效期（秒），默认 1 小时
   * @returns JWT Token
   */
  async generateToken(serviceName: string, expiresIn: number = 3600): Promise<string> {
    // 检查缓存
    const cached = this.tokenCache.get(serviceName);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const now = Math.floor(Date.now() / 1000);

    const payload: ServiceTokenPayload = {
      service: serviceName,
      iss: 'cloudphone-platform',
      aud: 'internal-services',
      iat: now,
      exp: now + expiresIn,
    };

    const token = jwt.sign(payload, secret, {
      algorithm: 'HS256',
    });

    // 缓存 Token（提前 5 分钟过期以避免边界情况）
    this.tokenCache.set(serviceName, {
      token,
      expiresAt: (now + expiresIn - 300) * 1000, // 提前 5 分钟
    });

    return token;
  }

  /**
   * 清除 Token 缓存
   */
  clearCache(serviceName?: string): void {
    if (serviceName) {
      this.tokenCache.delete(serviceName);
    } else {
      this.tokenCache.clear();
    }
  }

  /**
   * 获取 Token 过期时间
   */
  getTokenExpiration(serviceName: string): Date | null {
    const cached = this.tokenCache.get(serviceName);
    if (!cached) {
      return null;
    }

    return new Date(cached.expiresAt);
  }
}
