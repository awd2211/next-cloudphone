import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CaptchaService } from './services/captcha.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'dev-secret-key-change-in-production',
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User]),
    CacheModule, // 导入 CacheModule 用于 Token 黑名单
  ],
  controllers: [AuthController],
  providers: [AuthService, CaptchaService, JwtStrategy, RolesGuard, PermissionsGuard],
  exports: [AuthService, JwtModule, JwtStrategy, PassportModule, RolesGuard, PermissionsGuard],
})
export class AuthModule {}
