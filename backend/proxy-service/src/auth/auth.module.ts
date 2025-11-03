import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

/**
 * 认证模块
 *
 * 提供 JWT 认证功能
 * 配置 Passport 和 JWT 模块
 */
@Module({
  imports: [
    // 注册 Passport 模块，使用 JWT 作为默认策略
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // 异步配置 JWT 模块，从环境变量读取配置
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') || '7d',
          issuer: 'cloudphone-platform',
          audience: 'cloudphone-users',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [JwtStrategy],
  exports: [PassportModule, JwtModule],
})
export class AuthModule {}
