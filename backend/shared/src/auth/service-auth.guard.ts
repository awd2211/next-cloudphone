import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

/**
 * Service-to-Service 认证守卫
 *
 * 功能：
 * - 验证服务间调用的 JWT Token
 * - Token 包含服务身份信息（service name, issuer, etc.）
 * - 防止未授权的服务调用
 *
 * 使用方法：
 * ```typescript
 * @Controller('internal')
 * @UseGuards(ServiceAuthGuard)
 * export class InternalController {
 *   @Get('quotas/user/:userId')
 *   async getUserQuota(@Param('userId') userId: string) {
 *     // 只有持有有效服务 Token 的调用者才能访问
 *   }
 * }
 * ```
 */
@Injectable()
export class ServiceAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Service token is required');
    }

    try {
      const decoded = this.verifyToken(token);

      // 将服务身份信息附加到请求上
      request.service = {
        name: decoded.service,
        issuer: decoded.iss,
        audience: decoded.aud,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException(`Invalid service token: ${error.message}`);
    }
  }

  /**
   * 从请求头提取 Token
   */
  private extractToken(request: any): string | null {
    const authHeader = request.headers['x-service-token'] || request.headers['authorization'];

    if (!authHeader) {
      return null;
    }

    // 支持 "Bearer <token>" 格式
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return authHeader;
  }

  /**
   * 验证 Token
   */
  private verifyToken(token: string): any {
    const secret = this.configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    return jwt.verify(token, secret, {
      issuer: 'cloudphone-platform',
      audience: 'internal-services',
    });
  }
}

/**
 * Service Token Payload Interface
 */
export interface ServiceTokenPayload {
  service: string;        // 服务名称 (e.g., 'device-service')
  iss: string;           // 发行者 (issuer)
  aud: string;           // 受众 (audience)
  iat: number;           // 签发时间 (issued at)
  exp: number;           // 过期时间 (expiration)
}
