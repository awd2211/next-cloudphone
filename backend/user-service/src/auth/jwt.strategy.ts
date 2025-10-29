import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private cacheService: CacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'dev-secret-key-change-in-production',
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

    // 3. 验证用户是否存在
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      tenantId: user.tenantId,
    };
  }
}
