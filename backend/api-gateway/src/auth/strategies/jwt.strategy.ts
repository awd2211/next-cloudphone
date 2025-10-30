import { Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { JwtConfigFactory } from "@cloudphone/shared";

/**
 * JWT 验证策略
 *
 * 改造后：
 * - ✅ 从 Token 中提取用户信息（无需查询数据库）
 * - ✅ 完全无状态
 * - ✅ 高性能
 * - ✅ 使用安全的 JWT 配置
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private configService: ConfigService) {
    // 🔒 使用 shared 模块的安全 JWT 配置
    const jwtConfig = JwtConfigFactory.getPassportJwtConfig(configService);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtConfig.secretOrKey,
      ignoreExpiration: false,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });

    this.logger.log(`JwtStrategy initialized (stateless mode, secure JWT config)`);
  }

  async validate(payload: any) {
    // 直接从 Token 中提取用户信息，不查询数据库
    // Token 由 User Service 生成，包含所有必要信息

    this.logger.debug(`JWT validate: ${payload.username}`);

    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      tenantId: payload.tenantId,
      isSuperAdmin: payload.isSuperAdmin || false,
    };
  }
}
