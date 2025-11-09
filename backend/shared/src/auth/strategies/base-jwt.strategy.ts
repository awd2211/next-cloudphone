import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtConfigFactory } from '../../config/jwt.config';
import { JwtPayload, ValidatedUser } from '../interfaces/jwt-payload.interface';

/**
 * 基础 JWT 认证策略
 *
 * 所有微服务的 JWT Strategy 都应该继承此基类
 * 提供统一的 JWT 验证和用户信息提取逻辑
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class JwtStrategy extends BaseJwtStrategy {
 *   constructor(configService: ConfigService) {
 *     super(configService);
 *   }
 * }
 * ```
 *
 * 特性:
 * - ✅ 统一的 JWT 配置 (使用 JwtConfigFactory)
 * - ✅ 自动提取所有关键字段 (包括 isSuperAdmin)
 * - ✅ 标准化的用户对象格式
 * - ✅ issuer 和 audience 验证
 * - ✅ 详细的错误处理
 */
@Injectable()
export abstract class BaseJwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
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

  /**
   * 验证 JWT Payload 并提取用户信息
   *
   * @param payload - JWT 解码后的 payload
   * @returns 验证后的用户对象
   * @throws UnauthorizedException - 如果 payload 无效
   */
  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    // 验证必需字段
    if (!payload.sub) {
      throw new UnauthorizedException('无效的 Token: 缺少用户标识符');
    }

    if (!payload.username) {
      throw new UnauthorizedException('无效的 Token: 缺少用户名');
    }

    // 返回标准化的用户对象
    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      isSuperAdmin: payload.isSuperAdmin || false,  // ✅ 确保传递超级管理员标识
    };
  }

  /**
   * 可选的自定义验证逻辑
   *
   * 子类可以重写此方法以添加额外的验证逻辑
   * 例如: 检查用户是否被禁用、验证租户状态等
   */
  protected async additionalValidation?(user: ValidatedUser): Promise<void>;
}
