import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../entities/user.entity';
import { CacheService } from '../cache/cache.service';
import { JwtConfigFactory } from '@cloudphone/shared';
import { PermissionCacheService } from '../permissions/permission-cache.service';

/**
 * JWT Refresh Token 策略
 *
 * 与普通 JWT 策略的区别：
 * - ignoreExpiration: true - 允许过期的 token（只验证签名）
 * - 用于 /auth/refresh 端点
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private cacheService: CacheService,
    private permissionCacheService: PermissionCacheService, // ✅ 注入权限缓存服务
  ) {
    // 使用 shared 模块的安全 JWT 配置
    const jwtConfig = JwtConfigFactory.getPassportJwtConfig(configService);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true, // ✅ 关键修改：允许过期的 token
      secretOrKey: jwtConfig.secretOrKey,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    // 1. 提取 Token
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (!token) {
      throw new UnauthorizedException('Token 不存在');
    }

    // 2. 检查 Token 是否在黑名单中（即使过期也不允许使用被撤销的 token）
    const blacklistKey = `blacklist:token:${token}`;
    const isBlacklisted = await this.cacheService.exists(blacklistKey);

    if (isBlacklisted) {
      throw new UnauthorizedException('Token 已失效，请重新登录');
    }

    // ✅ 3. 检查用户状态（轻量级查询，只查询用户基本信息）
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, status: UserStatus.ACTIVE },
      select: ['id', 'username', 'email', 'tenantId', 'status'],
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    // ✅ 4. 使用权限缓存服务获取权限（自动使用 Redis 双层缓存）
    const cachedPermissions = await this.permissionCacheService.getUserPermissions(payload.sub);

    if (!cachedPermissions) {
      throw new UnauthorizedException('无法获取用户权限');
    }

    // ✅ 5. 返回用户信息和权限
    return {
      id: user.id,
      userId: user.id,
      username: user.username,
      email: user.email,
      roles: cachedPermissions.roles,
      permissions: cachedPermissions.permissions.map(p => p.name),
      tenantId: user.tenantId,
      isSuperAdmin: cachedPermissions.isSuperAdmin,
    };
  }
}
