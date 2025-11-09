import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseJwtStrategy } from '../base-jwt.strategy';
import { JwtPayload, ValidatedUser } from '../../interfaces/jwt-payload.interface';

/**
 * 测试用的 JWT Strategy 实现
 */
class TestJwtStrategy extends BaseJwtStrategy {
  constructor(configService: ConfigService) {
    super(configService);
  }
}

describe('BaseJwtStrategy', () => {
  let strategy: TestJwtStrategy;
  let configService: ConfigService;

  beforeEach(() => {
    // 创建 ConfigService mock
    // 使用符合安全要求的测试密钥:
    // - 长度 >= 32
    // - 包含大小写字母、数字、特殊字符
    // - 不包含常见弱密钥关键词
    configService = {
      get: jest.fn((key: string) => {
        const config = {
          JWT_SECRET: 'T3stS3cr3t!K3y@F0rUn1tT3st1ng#W1thC0mpl3x1ty$',
          JWT_EXPIRES_IN: '7d',
          NODE_ENV: 'test',
        };
        return config[key];
      }),
    } as any;

    strategy = new TestJwtStrategy(configService);
  });

  describe('validate', () => {
    it('应该成功验证有效的 JWT payload', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        tenantId: 'tenant-1',
        roles: ['admin'],
        permissions: ['user:read', 'user:write'],
        isSuperAdmin: false,
      };

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(result).toEqual({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        tenantId: 'tenant-1',
        roles: ['admin'],
        permissions: ['user:read', 'user:write'],
        isSuperAdmin: false,
      });
    });

    it('应该正确处理超级管理员标识', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'admin-001',
        username: 'superadmin',
        email: 'admin@example.com',
        roles: ['super_admin'],
        permissions: ['*:*'],
        isSuperAdmin: true,
      };

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(result.isSuperAdmin).toBe(true);
      expect(result.id).toBe('admin-001');
      expect(result.username).toBe('superadmin');
    });

    it('应该为缺少的可选字段设置默认值', async () => {
      // Arrange - 只包含必需字段
      const payload: JwtPayload = {
        sub: 'user-456',
        username: 'minimaluser',
      };

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(result).toEqual({
        id: 'user-456',
        username: 'minimaluser',
        email: undefined,
        tenantId: undefined,
        roles: [],
        permissions: [],
        isSuperAdmin: false,
      });
    });

    it('应该在缺少 sub 字段时抛出异常', async () => {
      // Arrange
      const payload = {
        username: 'testuser',
        email: 'test@example.com',
      } as any;

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        '无效的 Token: 缺少用户标识符'
      );
    });

    it('应该在缺少 username 字段时抛出异常', async () => {
      // Arrange
      const payload = {
        sub: 'user-789',
        email: 'test@example.com',
      } as any;

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        '无效的 Token: 缺少用户名'
      );
    });

    it('应该正确处理空的角色和权限数组', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'user-empty',
        username: 'emptyuser',
        roles: [],
        permissions: [],
      };

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(result.roles).toEqual([]);
      expect(result.permissions).toEqual([]);
      expect(result.isSuperAdmin).toBe(false);
    });

    it('应该正确处理 null 值的可选字段', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'user-null',
        username: 'nulluser',
        email: null as any,
        tenantId: null as any,
        roles: null as any,
        permissions: null as any,
      };

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(result.email).toBeNull();
      expect(result.tenantId).toBeNull();
      expect(result.roles).toEqual([]);
      expect(result.permissions).toEqual([]);
    });

    it('应该保留 payload 中的所有权限', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'user-perms',
        username: 'permuser',
        permissions: [
          'user:read',
          'user:write',
          'device:read',
          'device:write',
          'device:delete',
        ],
      };

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(result.permissions).toHaveLength(5);
      expect(result.permissions).toContain('user:read');
      expect(result.permissions).toContain('device:delete');
    });
  });

  describe('构造函数配置', () => {
    it('应该从 ConfigService 读取 JWT 配置', () => {
      // Assert
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
    });
  });

  describe('边界情况', () => {
    it('应该处理特殊字符的用户名', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'user-special',
        username: 'user+test@domain',
        email: 'user+test@domain.com',
      };

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(result.username).toBe('user+test@domain');
      expect(result.email).toBe('user+test@domain.com');
    });

    it('应该处理非常长的权限数组', async () => {
      // Arrange
      const longPermissionsList = Array.from({ length: 100 }, (_, i) => `resource${i}:action${i}`);
      const payload: JwtPayload = {
        sub: 'user-many-perms',
        username: 'poweruser',
        permissions: longPermissionsList,
      };

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(result.permissions).toHaveLength(100);
    });

    it('应该处理 UUID 格式的用户 ID', async () => {
      // Arrange
      const uuidUserId = 'adff5704-873b-4014-8413-d42ff84f9f79';
      const payload: JwtPayload = {
        sub: uuidUserId,
        username: 'uuiduser',
      };

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(result.id).toBe(uuidUserId);
    });
  });
});
