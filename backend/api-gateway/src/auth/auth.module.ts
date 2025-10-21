import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { CaptchaService } from './services/captcha.service';
import { TwoFactorService } from './services/two-factor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'cloudphone-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, CaptchaService, TwoFactorService, JwtStrategy, RolesGuard, PermissionsGuard],
  exports: [JwtStrategy, PassportModule, RolesGuard, PermissionsGuard, AuthService, CaptchaService, TwoFactorService],
})
export class AuthModule {}
