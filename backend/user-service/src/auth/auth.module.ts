import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Quota } from '../entities/quota.entity';
import { SocialAccount } from '../entities/social-account.entity';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CaptchaService } from './services/captcha.service';
import { TwoFactorService } from './two-factor.service';
import { SocialAuthService } from './services/social-auth.service';
import { UserRegistrationSaga } from './registration.saga';
import { CacheModule } from '../cache/cache.module';
import { MetricsModule } from '../metrics/metrics.module';
import { createJwtConfig, SagaModule } from '@cloudphone/shared';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // 🔒 使用 shared 模块的安全 JWT 配置
        return createJwtConfig(configService);
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, Role, Quota, SocialAccount]),
    CacheModule, // 导入 CacheModule 用于 Token 黑名单
    SagaModule, // ✅ Saga Pattern for distributed transactions
    MetricsModule, // ✅ 业务指标模块
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    CaptchaService,
    TwoFactorService,
    SocialAuthService, // ✅ 社交登录服务
    UserRegistrationSaga, // ✅ 用户注册 Saga
    JwtStrategy,
    RolesGuard,
    PermissionsGuard,
  ],
  exports: [AuthService, SocialAuthService, JwtModule, JwtStrategy, PassportModule, RolesGuard, PermissionsGuard],
})
export class AuthModule {}
