import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EnhancedPermissionsGuard } from './enhanced-permissions.guard';
import { PermissionCheckerService } from '../permission-checker.service';
import { TenantIsolationService } from '../tenant-isolation.service';

describe('EnhancedPermissionsGuard', () => {
  let guard: EnhancedPermissionsGuard;
  let reflector: Reflector;
  let permissionChecker: jest.Mocked<PermissionCheckerService>;
  let tenantIsolation: jest.Mocked<TenantIsolationService>;

  // Mock services
  const mockPermissionChecker = {
    hasAnyPermission: jest.fn(),
    hasAllPermissions: jest.fn(),
  };

  const mockTenantIsolation = {
    isSuperAdmin: jest.fn(),
    checkCrossTenantAccess: jest.fn(),
    getUserTenantId: jest.fn(),
  };

  beforeEach(async () => {
    // Reset all mocks before creating module
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnhancedPermissionsGuard,
        Reflector,
        {
          provide: PermissionCheckerService,
          useValue: mockPermissionChecker,
        },
        {
          provide: TenantIsolationService,
          useValue: mockTenantIsolation,
        },
      ],
    }).compile();

    guard = module.get<EnhancedPermissionsGuard>(EnhancedPermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
    permissionChecker = module.get(PermissionCheckerService);
    tenantIsolation = module.get(TenantIsolationService);
  });

  /**
   * Helper function to create mock ExecutionContext
   * Note: Pass null explicitly for missing user, not undefined (which triggers default)
   */
  function createMockContext(
    user: any | null,
    metadata: Record<string, any> = {},
    requestData: any = {}
  ): ExecutionContext {
    // If user is explicitly null, don't set it; if undefined, use default
    const mockRequest = {
      user: user !== null ? user : undefined,
      body: requestData.body || {},
      params: requestData.params || {},
      query: requestData.query || {},
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    // Setup reflector to return metadata
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
      return metadata[key];
    });

    return mockContext;
  }

  describe('@SkipPermission', () => {
    it('should allow access when skipPermission is true', async () => {
      const context = createMockContext({ id: 'user-123' }, { skipPermission: true });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(permissionChecker.hasAnyPermission).not.toHaveBeenCalled();
      expect(permissionChecker.hasAllPermissions).not.toHaveBeenCalled();
    });

    it('should continue checking when skipPermission is false', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { skipPermission: false, permissions: ['user:read'] }
      );

      mockPermissionChecker.hasAnyPermission.mockResolvedValue(true);
      mockTenantIsolation.getUserTenantId.mockResolvedValue('tenant-1');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(permissionChecker.hasAnyPermission).toHaveBeenCalled();
    });
  });

  describe('User Authentication', () => {
    it('should throw ForbiddenException when user is undefined', async () => {
      const context = createMockContext(null, {});

      // Test only once to avoid spy issues
      await expect(guard.canActivate(context)).rejects.toThrow('未认证');
    });

    it('should throw ForbiddenException when user.id is missing', async () => {
      const context = createMockContext({ username: 'test' }, {});

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('未认证');
    });

    it('should proceed when user has valid id', async () => {
      const context = createMockContext({ id: 'user-123' }, { permissions: ['user:read'] });

      mockPermissionChecker.hasAnyPermission.mockResolvedValue(true);
      mockTenantIsolation.getUserTenantId.mockResolvedValue('tenant-1');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('@RequireSuperAdmin', () => {
    it('should allow access when user is super admin', async () => {
      const context = createMockContext({ id: 'super-admin-123' }, { requireSuperAdmin: true });

      mockTenantIsolation.isSuperAdmin.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(tenantIsolation.isSuperAdmin).toHaveBeenCalledWith('super-admin-123');
      // Super admin bypasses permission checks
      expect(permissionChecker.hasAnyPermission).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not super admin', async () => {
      const context = createMockContext({ id: 'regular-user-123' }, { requireSuperAdmin: true });

      mockTenantIsolation.isSuperAdmin.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('需要超级管理员权限');
    });
  });

  describe('Permission Checking', () => {
    it('should allow access when no permissions are required', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { permissions: [] } // Empty array
      );

      mockTenantIsolation.getUserTenantId.mockResolvedValue('tenant-1');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(permissionChecker.hasAnyPermission).not.toHaveBeenCalled();
    });

    it('should allow access when permissions is undefined', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        {} // No permissions key
      );

      mockTenantIsolation.getUserTenantId.mockResolvedValue('tenant-1');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(permissionChecker.hasAnyPermission).not.toHaveBeenCalled();
    });

    it('should check hasAnyPermission by default', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { permissions: ['user:read', 'user:write'] }
      );

      mockPermissionChecker.hasAnyPermission.mockResolvedValue(true);
      mockTenantIsolation.getUserTenantId.mockResolvedValue('tenant-1');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(permissionChecker.hasAnyPermission).toHaveBeenCalledWith('user-123', [
        'user:read',
        'user:write',
      ]);
      expect(permissionChecker.hasAllPermissions).not.toHaveBeenCalled();
    });

    it('should check hasAllPermissions when requireAll is true', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        {
          permissions: ['user:read', 'user:write'],
          requireAllPermissions: true,
        }
      );

      mockPermissionChecker.hasAllPermissions.mockResolvedValue(true);
      mockTenantIsolation.getUserTenantId.mockResolvedValue('tenant-1');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(permissionChecker.hasAllPermissions).toHaveBeenCalledWith('user-123', [
        'user:read',
        'user:write',
      ]);
      expect(permissionChecker.hasAnyPermission).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user lacks any required permission', async () => {
      const context = createMockContext({ id: 'user-123' }, { permissions: ['admin:delete'] });

      mockPermissionChecker.hasAnyPermission.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('权限不足');
    });

    it('should throw ForbiddenException when user lacks all required permissions', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        {
          permissions: ['user:read', 'user:write', 'user:delete'],
          requireAllPermissions: true,
        }
      );

      mockPermissionChecker.hasAllPermissions.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('权限不足');
    });
  });

  describe('Cross-Tenant Access', () => {
    it('should allow access when allowCrossTenant is true', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        {
          permissions: ['user:read'],
          allowCrossTenant: true,
        },
        {
          body: { tenantId: 'other-tenant' },
        }
      );

      mockPermissionChecker.hasAnyPermission.mockResolvedValue(true);
      mockTenantIsolation.getUserTenantId.mockResolvedValue('tenant-1');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // Should not check cross-tenant access
      expect(tenantIsolation.checkCrossTenantAccess).not.toHaveBeenCalled();
    });

    it('should check cross-tenant access when tenantId in body', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { permissions: ['user:read'] },
        {
          body: { tenantId: 'target-tenant' },
        }
      );

      mockPermissionChecker.hasAnyPermission.mockResolvedValue(true);
      mockTenantIsolation.checkCrossTenantAccess.mockResolvedValue(true);
      mockTenantIsolation.getUserTenantId.mockResolvedValue('tenant-1');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(tenantIsolation.checkCrossTenantAccess).toHaveBeenCalledWith(
        'user-123',
        'target-tenant'
      );
    });

    it('should check cross-tenant access when tenantId in params', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { permissions: ['user:read'] },
        {
          params: { tenantId: 'target-tenant' },
        }
      );

      mockPermissionChecker.hasAnyPermission.mockResolvedValue(true);
      mockTenantIsolation.checkCrossTenantAccess.mockResolvedValue(true);
      mockTenantIsolation.getUserTenantId.mockResolvedValue('tenant-1');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(tenantIsolation.checkCrossTenantAccess).toHaveBeenCalledWith(
        'user-123',
        'target-tenant'
      );
    });

    it('should check cross-tenant access when tenantId in query', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { permissions: ['user:read'] },
        {
          query: { tenantId: 'target-tenant' },
        }
      );

      mockPermissionChecker.hasAnyPermission.mockResolvedValue(true);
      mockTenantIsolation.checkCrossTenantAccess.mockResolvedValue(true);
      mockTenantIsolation.getUserTenantId.mockResolvedValue('tenant-1');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(tenantIsolation.checkCrossTenantAccess).toHaveBeenCalledWith(
        'user-123',
        'target-tenant'
      );
    });

    it('should prioritize body.tenantId over params and query', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { permissions: ['user:read'] },
        {
          body: { tenantId: 'body-tenant' },
          params: { tenantId: 'params-tenant' },
          query: { tenantId: 'query-tenant' },
        }
      );

      mockPermissionChecker.hasAnyPermission.mockResolvedValue(true);
      mockTenantIsolation.checkCrossTenantAccess.mockResolvedValue(true);
      mockTenantIsolation.getUserTenantId.mockResolvedValue('tenant-1');

      await guard.canActivate(context);

      expect(tenantIsolation.checkCrossTenantAccess).toHaveBeenCalledWith(
        'user-123',
        'body-tenant'
      );
    });

    it('should throw ForbiddenException when cross-tenant access is denied', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { permissions: ['user:read'] },
        {
          body: { tenantId: 'other-tenant' },
        }
      );

      mockPermissionChecker.hasAnyPermission.mockResolvedValue(true);
      mockTenantIsolation.checkCrossTenantAccess.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('不允许跨租户访问');
    });

    it('should skip cross-tenant check when no tenantId in request', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { permissions: ['user:read'] },
        {} // No tenantId anywhere
      );

      mockPermissionChecker.hasAnyPermission.mockResolvedValue(true);
      mockTenantIsolation.getUserTenantId.mockResolvedValue('tenant-1');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(tenantIsolation.checkCrossTenantAccess).not.toHaveBeenCalled();
    });
  });

  describe('UserTenantId Attachment', () => {
    it('should attach userTenantId to request', async () => {
      const mockRequest = {
        user: { id: 'user-123' },
        body: {},
        params: {},
        query: {},
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
        if (key === 'permissions') return ['user:read'];
        return undefined;
      });

      mockPermissionChecker.hasAnyPermission.mockResolvedValue(true);
      mockTenantIsolation.getUserTenantId.mockResolvedValue('user-tenant-123');

      await guard.canActivate(context);

      expect(mockRequest).toHaveProperty('userTenantId', 'user-tenant-123');
      expect(tenantIsolation.getUserTenantId).toHaveBeenCalledWith('user-123');
    });

    it('should handle null userTenantId', async () => {
      const mockRequest = {
        user: { id: 'user-123' },
        body: {},
        params: {},
        query: {},
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
        if (key === 'permissions') return ['user:read'];
        return undefined;
      });

      mockPermissionChecker.hasAnyPermission.mockResolvedValue(true);
      mockTenantIsolation.getUserTenantId.mockResolvedValue(null);

      await guard.canActivate(context);

      expect(mockRequest).toHaveProperty('userTenantId', null);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle super admin with cross-tenant request', async () => {
      const context = createMockContext(
        { id: 'super-admin-123' },
        { requireSuperAdmin: true },
        {
          body: { tenantId: 'other-tenant' },
        }
      );

      mockTenantIsolation.isSuperAdmin.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // Super admin bypasses permission and cross-tenant checks
      expect(tenantIsolation.checkCrossTenantAccess).not.toHaveBeenCalled();
      expect(permissionChecker.hasAnyPermission).not.toHaveBeenCalled();
    });

    it('should handle multiple permissions with requireAll and cross-tenant', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        {
          permissions: ['user:read', 'user:write', 'user:delete'],
          requireAllPermissions: true,
        },
        {
          body: { tenantId: 'target-tenant' },
        }
      );

      mockPermissionChecker.hasAllPermissions.mockResolvedValue(true);
      mockTenantIsolation.checkCrossTenantAccess.mockResolvedValue(true);
      mockTenantIsolation.getUserTenantId.mockResolvedValue('tenant-1');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(permissionChecker.hasAllPermissions).toHaveBeenCalledWith('user-123', [
        'user:read',
        'user:write',
        'user:delete',
      ]);
      expect(tenantIsolation.checkCrossTenantAccess).toHaveBeenCalledWith(
        'user-123',
        'target-tenant'
      );
    });

    it('should fail on first check: missing user', async () => {
      const context = createMockContext(null, {
        permissions: ['user:read'],
        requireSuperAdmin: true,
      });

      // Only test once to avoid spy issues
      const result = guard.canActivate(context);
      await expect(result).rejects.toThrow('未认证');

      // Should not call any service methods
      expect(tenantIsolation.isSuperAdmin).not.toHaveBeenCalled();
      expect(permissionChecker.hasAnyPermission).not.toHaveBeenCalled();
    });

    it('should fail on second check: not super admin', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        {
          requireSuperAdmin: true,
          permissions: ['user:read'],
        }
      );

      mockTenantIsolation.isSuperAdmin.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow('需要超级管理员权限');

      // Should not check permissions
      expect(permissionChecker.hasAnyPermission).not.toHaveBeenCalled();
    });

    it('should fail on third check: insufficient permissions', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        {
          permissions: ['admin:manage'],
        },
        {
          body: { tenantId: 'other-tenant' },
        }
      );

      mockPermissionChecker.hasAnyPermission.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow('权限不足');

      // Should not check cross-tenant access
      expect(tenantIsolation.checkCrossTenantAccess).not.toHaveBeenCalled();
    });

    it('should fail on fourth check: cross-tenant denied', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        {
          permissions: ['user:read'],
        },
        {
          body: { tenantId: 'other-tenant' },
        }
      );

      mockPermissionChecker.hasAnyPermission.mockResolvedValue(true);
      mockTenantIsolation.checkCrossTenantAccess.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow('不允许跨租户访问');

      // getUserTenantId should not be called
      expect(tenantIsolation.getUserTenantId).not.toHaveBeenCalled();
    });
  });
});
