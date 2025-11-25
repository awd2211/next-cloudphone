import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  tenantId: string;
  roles: string[];
  isSuperAdmin?: boolean;
  iat?: number;
  exp?: number;
}

/**
 * 认证用户信息（由 JwtStrategy.validate() 返回）
 */
export interface AuthUser {
  sub: string;        // 用户 ID (兼容旧代码)
  userId: string;     // 用户 ID
  username: string;
  email: string;
  tenantId: string;
  roles: string[];
  isSuperAdmin: boolean;
  agentId?: string;   // 客服 ID（如果用户是客服）
}

/**
 * 认证请求类型（扩展 Express Request）
 */
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secretOrKey = configService.get<string>('JWT_SECRET');
    if (!secretOrKey) {
      throw new Error('JWT_SECRET must be defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      sub: payload.sub,           // 兼容旧代码
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      tenantId: payload.tenantId || 'default',
      roles: payload.roles || [],
      isSuperAdmin: payload.isSuperAdmin || false,
    };
  }
}
