import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CacheService } from '../cache/cache.service';
import { JwtConfigFactory } from '@cloudphone/shared';
import { PermissionCacheService } from '../permissions/permission-cache.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private cacheService: CacheService,
    private permissionCacheService: PermissionCacheService, // ✅ 注入权限缓存服务
  ) {
    // 🔒 使用 shared 模块的安全 JWT 配置
    const jwtConfig = JwtConfigFactory.getPassportJwtConfig(configService);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secretOrKey,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      passReqToCallback: true, // 允许在 validate 方法中访问 request 对象
    });
  }

  async validate(req: any, payload: any) {
    // 1. 提取 Token
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (!token) {
      throw new UnauthorizedException('Token 不存在');
    }

    // 2. 检查 Token 是否在黑名单中
    const blacklistKey = `blacklist:token:${token}`;
    const isBlacklisted = await this.cacheService.exists(blacklistKey);

    if (isBlacklisted) {
      throw new UnauthorizedException('Token 已失效，请重新登录');
    }

    // ✅ 3. 使用权限缓存服务获取用户权限（自动使用 Redis 双层缓存）
    const cachedPermissions = await this.permissionCacheService.getUserPermissions(payload.sub);

    if (!cachedPermissions) {
      throw new UnauthorizedException('用户不存在');
    }

    // ✅ 4. 返回用户信息和权限（从缓存中获取，无需查询数据库）
    return {
      id: cachedPermissions.userId,
      userId: cachedPermissions.userId,
      username: payload.username,
      email: payload.email,
      roles: cachedPermissions.roles, // 角色ID数组
      permissions: cachedPermissions.permissions.map(p => p.name), // 权限名称数组
      tenantId: cachedPermissions.tenantId,
      isSuperAdmin: cachedPermissions.isSuperAdmin,
    };
  }
}
