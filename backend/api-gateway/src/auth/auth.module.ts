import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * API Gateway 认证模块（重构后）
 *
 * 职责：
 * - ✅ JWT Token 验证（无状态）
 * - ✅ 提供 JwtAuthGuard 给代理使用
 *
 * 不负责：
 * - ❌ 登录逻辑（已迁移到 User Service）
 * - ❌ 数据库连接（完全无状态）
 * - ❌ 用户管理（User Service 职责）
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'dev-secret-key-change-in-production',
        signOptions: { expiresIn: '7d' },
      }),
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard],
  exports: [JwtModule, PassportModule, JwtStrategy, JwtAuthGuard, HttpModule],
})
export class AuthModule {}
