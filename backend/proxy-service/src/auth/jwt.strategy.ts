import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JWT 认证策略
 *
 * 负责验证和解析 JWT token
 * 解析后的用户信息会被设置到 request.user
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * JWT payload 验证
   *
   * @param payload - JWT 解码后的 payload
   * @returns 用户信息对象，将被设置到 request.user
   */
  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [], // 权限列表 - PermissionsGuard 需要
      tenantId: payload.tenantId,
    };
  }
}
