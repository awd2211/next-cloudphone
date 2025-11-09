import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

/**
 * Mock JWT Strategy for E2E Testing
 * 在 E2E 测试中绕过真实的 JWT 验证
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: 'test-secret-key-for-e2e-testing',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  exports: [JwtModule, PassportModule],
})
export class AuthMockModule {}

/**
 * 生成测试用的 JWT Token
 */
export function generateTestToken(userId: string = 'test-user-id', permissions: string[] = []): string {
  const jwt = require('jsonwebtoken');
  const payload = {
    sub: userId,
    userId: userId,
    username: 'test-user',
    permissions: permissions.length > 0 ? permissions : [
      // 默认给所有权限,简化测试
      'notification.create',
      'notification.read',
      'notification.update',
      'notification.delete',
      'notification.broadcast',
      'notification.unread-count',
      'template.create',
      'template.read',
      'template.update',
      'template.delete',
      'preference.create',
      'preference.read',
      'preference.update',
      'preference.delete',
      'sms.send',
      'sms.read',
    ],
  };

  return jwt.sign(payload, 'test-secret-key-for-e2e-testing', { expiresIn: '1h' });
}

/**
 * Mock Guards for E2E Testing
 * 创建允许所有请求通过的 Guards
 */
export const mockJwtAuthGuard = {
  canActivate: (context: any) => {
    const request = context.switchToHttp().getRequest();
    // 模拟认证用户
    request.user = {
      userId: 'test-user-id',
      username: 'test-user',
      permissions: [
        'notification.create',
        'notification.read',
        'notification.update',
        'notification.delete',
        'notification.broadcast',
        'notification.unread-count',
        'template.create',
        'template.read',
        'template.update',
        'template.delete',
        'preference.create',
        'preference.read',
        'preference.update',
        'preference.delete',
        'sms.send',
        'sms.read',
      ],
    };
    return true;
  },
};

export const mockPermissionsGuard = {
  canActivate: () => true, // 允许所有权限
};

export const mockRolesGuard = {
  canActivate: () => true, // 允许所有角色
};
