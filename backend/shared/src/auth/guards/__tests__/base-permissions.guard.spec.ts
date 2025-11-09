import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BasePermissionsGuard } from '../base-permissions.guard';
import { PermissionOperator } from '../../decorators/permissions.decorator';

/**
 * 测试用的 Permissions Guard 实现
 */
class TestPermissionsGuard extends BasePermissionsGuard {
  constructor(reflector: Reflector) {
    super(reflector);
  }
}

describe('BasePermissionsGuard', () => {
  let guard: TestPermissionsGuard;
  let reflector: Reflector;
  let mockContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    // 创建 Reflector mock
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new TestPermissionsGuard(reflector);

    // 创建 mock request
    mockRequest = {
      user: null,
    };

    // 创建 mock ExecutionContext
    mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as any;
  });

  describe('公开端点处理', () => {
    it('应该允许访问标记为 @Public() 的端点', () => {
      // Arrange
      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(true) // IS_PUBLIC_KEY
        .mockReturnValueOnce(null); // PERMISSIONS_KEY

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('无权限要求的端点', () => {
    it('应该允许访问没有权限要求的端点', () => {
      // Arrange
      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(null); // PERMISSIONS_KEY (无权限要求)

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('应该允许访问权限数组为空的端点', () => {
      // Arrange
      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce({ permissions: [], operator: PermissionOperator.AND });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('超级管理员权限', () => {
    it('应该允许超级管理员访问所有端点', () => {
      // Arrange
      mockRequest.user = {
        id: 'admin-001',
        username: 'superadmin',
        isSuperAdmin: true,
        permissions: [],
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce({
          permissions: ['device:delete', 'user:delete'],
          operator: PermissionOperator.AND,
        });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('应该允许超级管理员即使没有任何权限列表', () => {
      // Arrange
      mockRequest.user = {
        id: 'admin-002',
        username: 'rootadmin',
        isSuperAdmin: true,
        // 没有 permissions 字段
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['sensitive:action'],
          operator: PermissionOperator.AND,
        });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('AND 操作符权限检查', () => {
    it('应该在用户拥有所有必需权限时允许访问', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-001',
        username: 'testuser',
        isSuperAdmin: false,
        permissions: ['device:read', 'device:write', 'device:delete'],
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['device:read', 'device:write'],
          operator: PermissionOperator.AND,
        });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('应该在用户缺少任一必需权限时拒绝访问', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-002',
        username: 'limiteduser',
        isSuperAdmin: false,
        permissions: ['device:read'],
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['device:read', 'device:write'],
          operator: PermissionOperator.AND,
        });

      // Act & Assert
      try {
        guard.canActivate(mockContext);
        fail('应该抛出 ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('需要所有权限: device:read, device:write');
      }
    });
  });

  describe('OR 操作符权限检查', () => {
    it('应该在用户拥有任一必需权限时允许访问', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-003',
        username: 'partialuser',
        isSuperAdmin: false,
        permissions: ['device:write'],
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['device:read', 'device:write'],
          operator: PermissionOperator.OR,
        });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('应该在用户拥有多个权限时允许访问', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-004',
        username: 'multiuser',
        isSuperAdmin: false,
        permissions: ['device:read', 'device:write', 'device:delete'],
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['device:read', 'device:write'],
          operator: PermissionOperator.OR,
        });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('应该在用户没有任何必需权限时拒绝访问', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-005',
        username: 'nouser',
        isSuperAdmin: false,
        permissions: ['app:read'],
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['device:read', 'device:write'],
          operator: PermissionOperator.OR,
        });

      // Act & Assert
      try {
        guard.canActivate(mockContext);
        fail('应该抛出 ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('需要任一权限: device:read, device:write');
      }
    });
  });

  describe('权限格式标准化', () => {
    it('应该支持冒号格式的权限 (device:read)', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-006',
        username: 'colonuser',
        isSuperAdmin: false,
        permissions: ['device:read'],
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['device:read'],
          operator: PermissionOperator.AND,
        });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('应该支持点号格式的权限 (device.read)', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-007',
        username: 'dotuser',
        isSuperAdmin: false,
        permissions: ['device.read'],
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['device:read'], // 要求用冒号
          operator: PermissionOperator.AND,
        });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true); // 应该自动标准化并匹配
    });

    it('应该同时支持冒号和点号混合格式', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-008',
        username: 'mixeduser',
        isSuperAdmin: false,
        permissions: ['device.read', 'user:write'],
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['device:read', 'user.write'], // 混合格式要求
          operator: PermissionOperator.AND,
        });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('从角色中提取权限', () => {
    it('应该从角色的权限数组中提取权限 (字符串格式)', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-009',
        username: 'roleuser',
        isSuperAdmin: false,
        roles: [
          {
            name: 'admin',
            permissions: ['device:read', 'device:write'],
          },
        ],
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['device:read'],
          operator: PermissionOperator.AND,
        });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('应该从角色的权限数组中提取权限 (对象格式)', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-010',
        username: 'objectroleuser',
        isSuperAdmin: false,
        roles: [
          {
            name: 'viewer',
            permissions: [
              { resource: 'device', action: 'read' },
              { resource: 'user', action: 'read' },
            ],
          },
        ],
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['device:read'],
          operator: PermissionOperator.AND,
        });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('应该合并多个角色的权限', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-011',
        username: 'multiroleuser',
        isSuperAdmin: false,
        roles: [
          { name: 'role1', permissions: ['device:read'] },
          { name: 'role2', permissions: ['device:write'] },
          { name: 'role3', permissions: ['device:delete'] },
        ],
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['device:read', 'device:write', 'device:delete'],
          operator: PermissionOperator.AND,
        });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('应该去重合并的权限', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-012',
        username: 'dupuser',
        isSuperAdmin: false,
        roles: [
          { name: 'role1', permissions: ['device:read', 'device:write'] },
          { name: 'role2', permissions: ['device:read', 'user:read'] },
        ],
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['device:read'],
          operator: PermissionOperator.AND,
        });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('未认证用户处理', () => {
    it('应该在用户未认证时抛出异常', () => {
      // Arrange
      mockRequest.user = null; // 未认证

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['device:read'],
          operator: PermissionOperator.AND,
        });

      // Act & Assert
      try {
        guard.canActivate(mockContext);
        fail('应该抛出 ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('用户未认证');
      }
    });

    it('应该在 user 对象为 undefined 时抛出异常', () => {
      // Arrange
      mockRequest.user = undefined;

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['device:read'],
          operator: PermissionOperator.AND,
        });

      // Act & Assert
      try {
        guard.canActivate(mockContext);
        fail('应该抛出 ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('用户未认证');
      }
    });
  });

  describe('边界情况', () => {
    it('应该处理空权限数组的用户', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-013',
        username: 'emptyuser',
        isSuperAdmin: false,
        permissions: [],
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['device:read'],
          operator: PermissionOperator.AND,
        });

      // Act & Assert
      try {
        guard.canActivate(mockContext);
        fail('应该抛出 ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('应该处理没有 permissions 字段的用户', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-014',
        username: 'nopermsuser',
        isSuperAdmin: false,
        // 没有 permissions 和 roles 字段
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['device:read'],
          operator: PermissionOperator.AND,
        });

      // Act & Assert
      try {
        guard.canActivate(mockContext);
        fail('应该抛出 ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('应该处理大量权限检查', () => {
      // Arrange
      const manyPermissions = Array.from({ length: 100 }, (_, i) => `resource${i}:read`);
      mockRequest.user = {
        id: 'user-015',
        username: 'poweruser',
        isSuperAdmin: false,
        permissions: manyPermissions,
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['resource50:read'],
          operator: PermissionOperator.AND,
        });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('应该处理默认 AND 操作符 (operator 为 undefined)', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-016',
        username: 'defaultuser',
        isSuperAdmin: false,
        permissions: ['device:read', 'device:write'],
      };

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          permissions: ['device:read', 'device:write'],
          // operator 未定义,应该默认为 AND
        });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });
  });
});
