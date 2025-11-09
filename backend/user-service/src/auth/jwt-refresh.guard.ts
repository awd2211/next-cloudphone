import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Refresh Token Guard
 *
 * 用于保护 /auth/refresh 端点
 * 使用 jwt-refresh 策略（允许过期的 token）
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
