import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtConfigFactory } from '@cloudphone/shared';

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  tenantId?: string;
  roles?: string[];
  permissions?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    // 🔒 使用 shared 模块的安全 JWT 配置
    const jwtConfig = JwtConfigFactory.getPassportJwtConfig(configService);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secretOrKey,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('无效的 Token');
    }

    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };
  }
}
