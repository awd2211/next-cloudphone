import { Reflector } from '@nestjs/core';
import {
  RequirePermissions,
  RequireAllPermissions,
  AllowCrossTenant,
  RequireSuperAdmin,
  SkipPermission,
  PublicApi,
  AdminOnly,
  SuperAdminOnly,
} from './function-permission.decorators';
import {
  PERMISSIONS_KEY,
  REQUIRE_ALL_PERMISSIONS_KEY,
  ALLOW_CROSS_TENANT_KEY,
  REQUIRE_SUPER_ADMIN_KEY,
  SKIP_PERMISSION_KEY,
} from '../guards/enhanced-permissions.guard';

describe('Function Permission Decorators', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('@RequirePermissions', () => {
    it('should set permissions metadata with single permission', () => {
      // Arrange
      class TestController {
        @RequirePermissions('user:create')
        testMethod() {}
      }

      // Act
      const metadata = reflector.get(PERMISSIONS_KEY, TestController.prototype.testMethod);

      // Assert
      expect(metadata).toEqual(['user:create']);
    });

    it('should set permissions metadata with multiple permissions', () => {
      // Arrange
      class TestController {
        @RequirePermissions('user:create', 'user:update', 'user:delete')
        testMethod() {}
      }

      // Act
      const metadata = reflector.get(PERMISSIONS_KEY, TestController.prototype.testMethod);

      // Assert
      expect(metadata).toEqual(['user:create', 'user:update', 'user:delete']);
    });

    it('should handle empty permissions array', () => {
      // Arrange
      class TestController {
        @RequirePermissions()
        testMethod() {}
      }

      // Act
      const metadata = reflector.get(PERMISSIONS_KEY, TestController.prototype.testMethod);

      // Assert
      expect(metadata).toEqual([]);
    });

    it('should work with different permission patterns', () => {
      // Arrange
      class TestController {
        @RequirePermissions('system:user:list', 'device:*', 'admin:*:*')
        testMethod() {}
      }

      // Act
      const metadata = reflector.get(PERMISSIONS_KEY, TestController.prototype.testMethod);

      // Assert
      expect(metadata).toContain('system:user:list');
      expect(metadata).toContain('device:*');
      expect(metadata).toContain('admin:*:*');
    });
  });

  describe('@RequireAllPermissions', () => {
    it('should set require all permissions metadata to true', () => {
      // Arrange
      class TestController {
        @RequireAllPermissions()
        testMethod() {}
      }

      // Act
      const metadata = reflector.get(
        REQUIRE_ALL_PERMISSIONS_KEY,
        TestController.prototype.testMethod
      );

      // Assert
      expect(metadata).toBe(true);
    });

    it('should work in combination with RequirePermissions', () => {
      // Arrange
      class TestController {
        @RequirePermissions('user:create', 'user:update')
        @RequireAllPermissions()
        testMethod() {}
      }

      // Act
      const permissions = reflector.get(PERMISSIONS_KEY, TestController.prototype.testMethod);
      const requireAll = reflector.get(
        REQUIRE_ALL_PERMISSIONS_KEY,
        TestController.prototype.testMethod
      );

      // Assert
      expect(permissions).toEqual(['user:create', 'user:update']);
      expect(requireAll).toBe(true);
    });
  });

  describe('@AllowCrossTenant', () => {
    it('should set allow cross tenant metadata to true', () => {
      // Arrange
      class TestController {
        @AllowCrossTenant()
        testMethod() {}
      }

      // Act
      const metadata = reflector.get(ALLOW_CROSS_TENANT_KEY, TestController.prototype.testMethod);

      // Assert
      expect(metadata).toBe(true);
    });

    it('should work with permission decorators', () => {
      // Arrange
      class TestController {
        @RequirePermissions('admin:view')
        @AllowCrossTenant()
        testMethod() {}
      }

      // Act
      const permissions = reflector.get(PERMISSIONS_KEY, TestController.prototype.testMethod);
      const allowCrossTenant = reflector.get(
        ALLOW_CROSS_TENANT_KEY,
        TestController.prototype.testMethod
      );

      // Assert
      expect(permissions).toEqual(['admin:view']);
      expect(allowCrossTenant).toBe(true);
    });
  });

  describe('@RequireSuperAdmin', () => {
    it('should set require super admin metadata to true', () => {
      // Arrange
      class TestController {
        @RequireSuperAdmin()
        testMethod() {}
      }

      // Act
      const metadata = reflector.get(REQUIRE_SUPER_ADMIN_KEY, TestController.prototype.testMethod);

      // Assert
      expect(metadata).toBe(true);
    });
  });

  describe('@SkipPermission', () => {
    it('should set skip permission metadata to true', () => {
      // Arrange
      class TestController {
        @SkipPermission()
        testMethod() {}
      }

      // Act
      const metadata = reflector.get(SKIP_PERMISSION_KEY, TestController.prototype.testMethod);

      // Assert
      expect(metadata).toBe(true);
    });
  });

  describe('Convenience Decorators', () => {
    describe('@PublicApi', () => {
      it('should skip permission check', () => {
        // Arrange
        class TestController {
          @PublicApi()
          testMethod() {}
        }

        // Act
        const metadata = reflector.get(SKIP_PERMISSION_KEY, TestController.prototype.testMethod);

        // Assert
        expect(metadata).toBe(true);
      });
    });

    describe('@AdminOnly', () => {
      it('should require admin:access permission', () => {
        // Arrange
        class TestController {
          @AdminOnly()
          testMethod() {}
        }

        // Act
        const metadata = reflector.get(PERMISSIONS_KEY, TestController.prototype.testMethod);

        // Assert
        expect(metadata).toEqual(['admin:access']);
      });
    });

    describe('@SuperAdminOnly', () => {
      it('should require super admin', () => {
        // Arrange
        class TestController {
          @SuperAdminOnly()
          testMethod() {}
        }

        // Act
        const metadata = reflector.get(
          REQUIRE_SUPER_ADMIN_KEY,
          TestController.prototype.testMethod
        );

        // Assert
        expect(metadata).toBe(true);
      });
    });
  });

  describe('Complex Permission Scenarios', () => {
    it('should handle multiple permission decorators', () => {
      // Arrange
      class TestController {
        @RequirePermissions('user:create', 'user:update')
        @RequireAllPermissions()
        @AllowCrossTenant()
        testMethod() {}
      }

      // Act
      const permissions = reflector.get(PERMISSIONS_KEY, TestController.prototype.testMethod);
      const requireAll = reflector.get(
        REQUIRE_ALL_PERMISSIONS_KEY,
        TestController.prototype.testMethod
      );
      const allowCrossTenant = reflector.get(
        ALLOW_CROSS_TENANT_KEY,
        TestController.prototype.testMethod
      );

      // Assert
      expect(permissions).toEqual(['user:create', 'user:update']);
      expect(requireAll).toBe(true);
      expect(allowCrossTenant).toBe(true);
    });

    it('should handle super admin with other decorators', () => {
      // Arrange
      class TestController {
        @RequireSuperAdmin()
        @AllowCrossTenant()
        testMethod() {}
      }

      // Act
      const requireSuperAdmin = reflector.get(
        REQUIRE_SUPER_ADMIN_KEY,
        TestController.prototype.testMethod
      );
      const allowCrossTenant = reflector.get(
        ALLOW_CROSS_TENANT_KEY,
        TestController.prototype.testMethod
      );

      // Assert
      expect(requireSuperAdmin).toBe(true);
      expect(allowCrossTenant).toBe(true);
    });
  });

  describe('Metadata Isolation', () => {
    it('should not share metadata between different methods', () => {
      // Arrange
      class TestController {
        @RequirePermissions('user:create')
        method1() {}

        @RequirePermissions('device:create')
        method2() {}

        @PublicApi()
        method3() {}
      }

      // Act
      const method1Permissions = reflector.get(PERMISSIONS_KEY, TestController.prototype.method1);
      const method2Permissions = reflector.get(PERMISSIONS_KEY, TestController.prototype.method2);
      const method3Skip = reflector.get(SKIP_PERMISSION_KEY, TestController.prototype.method3);

      // Assert
      expect(method1Permissions).toEqual(['user:create']);
      expect(method2Permissions).toEqual(['device:create']);
      expect(method3Skip).toBe(true);
    });
  });
});
