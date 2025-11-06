import { Reflector } from '@nestjs/core';
import {
  SkipTenantIsolation,
  TenantField,
  AutoSetTenant,
  AuditPermission,
  SkipAudit,
  AuditCreate,
  AuditUpdate,
  AuditDelete,
  AuditExport,
  AuditGrant,
  AuditRevoke,
} from './tenant-audit.decorators';
import {
  SKIP_TENANT_ISOLATION_KEY,
  TENANT_FIELD_KEY,
  AUTO_SET_TENANT_KEY,
} from '../interceptors/tenant.interceptor';
import {
  AUDIT_PERMISSION_KEY,
  SKIP_AUDIT_KEY,
  AUDIT_RESOURCE_KEY,
  AUDIT_ACTION_KEY,
} from '../interceptors/audit-permission.interceptor';

describe('Tenant & Audit Decorators', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('Tenant Isolation Decorators', () => {
    describe('@SkipTenantIsolation', () => {
      it('should set skip tenant isolation metadata to true', () => {
        // Arrange
        class TestController {
          @SkipTenantIsolation()
          testMethod() {}
        }

        // Act
        const metadata = reflector.get(
          SKIP_TENANT_ISOLATION_KEY,
          TestController.prototype.testMethod
        );

        // Assert
        expect(metadata).toBe(true);
      });
    });

    describe('@TenantField', () => {
      it('should set custom tenant field name', () => {
        // Arrange
        class TestController {
          @TenantField('organizationId')
          testMethod() {}
        }

        // Act
        const metadata = reflector.get(TENANT_FIELD_KEY, TestController.prototype.testMethod);

        // Assert
        expect(metadata).toBe('organizationId');
      });

      it('should work with different field names', () => {
        // Arrange
        class TestController {
          @TenantField('companyId')
          method1() {}

          @TenantField('accountId')
          method2() {}
        }

        // Act
        const field1 = reflector.get(TENANT_FIELD_KEY, TestController.prototype.method1);
        const field2 = reflector.get(TENANT_FIELD_KEY, TestController.prototype.method2);

        // Assert
        expect(field1).toBe('companyId');
        expect(field2).toBe('accountId');
      });
    });

    describe('@AutoSetTenant', () => {
      it('should set auto set tenant metadata to true', () => {
        // Arrange
        class TestController {
          @AutoSetTenant()
          testMethod() {}
        }

        // Act
        const metadata = reflector.get(AUTO_SET_TENANT_KEY, TestController.prototype.testMethod);

        // Assert
        expect(metadata).toBe(true);
      });

      it('should work with TenantField decorator', () => {
        // Arrange
        class TestController {
          @AutoSetTenant()
          @TenantField('organizationId')
          testMethod() {}
        }

        // Act
        const autoSet = reflector.get(AUTO_SET_TENANT_KEY, TestController.prototype.testMethod);
        const field = reflector.get(TENANT_FIELD_KEY, TestController.prototype.testMethod);

        // Assert
        expect(autoSet).toBe(true);
        expect(field).toBe('organizationId');
      });
    });
  });

  describe('Audit Decorators', () => {
    describe('@AuditPermission', () => {
      it('should enable audit with no config', () => {
        // Arrange
        class TestController {
          @AuditPermission()
          testMethod() {}
        }

        // Act
        const auditEnabled = reflector.get(
          AUDIT_PERMISSION_KEY,
          TestController.prototype.testMethod
        );

        // Assert
        expect(auditEnabled).toBe(true);
      });

      it('should set resource metadata when provided', () => {
        // Arrange
        class TestController {
          @AuditPermission({ resource: 'user' })
          testMethod() {}
        }

        // Act
        const auditEnabled = reflector.get(
          AUDIT_PERMISSION_KEY,
          TestController.prototype.testMethod
        );
        const resource = reflector.get(AUDIT_RESOURCE_KEY, TestController.prototype.testMethod);

        // Assert
        expect(auditEnabled).toBe(true);
        expect(resource).toBe('user');
      });

      it('should set action metadata when provided', () => {
        // Arrange
        class TestController {
          @AuditPermission({ action: 'delete' })
          testMethod() {}
        }

        // Act
        const auditEnabled = reflector.get(
          AUDIT_PERMISSION_KEY,
          TestController.prototype.testMethod
        );
        const action = reflector.get(AUDIT_ACTION_KEY, TestController.prototype.testMethod);

        // Assert
        expect(auditEnabled).toBe(true);
        expect(action).toBe('delete');
      });

      it('should set both resource and action metadata', () => {
        // Arrange
        class TestController {
          @AuditPermission({ resource: 'user', action: 'delete' })
          testMethod() {}
        }

        // Act
        const auditEnabled = reflector.get(
          AUDIT_PERMISSION_KEY,
          TestController.prototype.testMethod
        );
        const resource = reflector.get(AUDIT_RESOURCE_KEY, TestController.prototype.testMethod);
        const action = reflector.get(AUDIT_ACTION_KEY, TestController.prototype.testMethod);

        // Assert
        expect(auditEnabled).toBe(true);
        expect(resource).toBe('user');
        expect(action).toBe('delete');
      });
    });

    describe('@SkipAudit', () => {
      it('should set skip audit metadata to true', () => {
        // Arrange
        class TestController {
          @SkipAudit()
          testMethod() {}
        }

        // Act
        const metadata = reflector.get(SKIP_AUDIT_KEY, TestController.prototype.testMethod);

        // Assert
        expect(metadata).toBe(true);
      });
    });
  });

  describe('Audit Convenience Decorators', () => {
    describe('@AuditCreate', () => {
      it('should set audit for create action', () => {
        // Arrange
        class TestController {
          @AuditCreate('user')
          testMethod() {}
        }

        // Act
        const auditEnabled = reflector.get(
          AUDIT_PERMISSION_KEY,
          TestController.prototype.testMethod
        );
        const resource = reflector.get(AUDIT_RESOURCE_KEY, TestController.prototype.testMethod);
        const action = reflector.get(AUDIT_ACTION_KEY, TestController.prototype.testMethod);

        // Assert
        expect(auditEnabled).toBe(true);
        expect(resource).toBe('user');
        expect(action).toBe('create');
      });
    });

    describe('@AuditUpdate', () => {
      it('should set audit for update action', () => {
        // Arrange
        class TestController {
          @AuditUpdate('user')
          testMethod() {}
        }

        // Act
        const resource = reflector.get(AUDIT_RESOURCE_KEY, TestController.prototype.testMethod);
        const action = reflector.get(AUDIT_ACTION_KEY, TestController.prototype.testMethod);

        // Assert
        expect(resource).toBe('user');
        expect(action).toBe('update');
      });
    });

    describe('@AuditDelete', () => {
      it('should set audit for delete action', () => {
        // Arrange
        class TestController {
          @AuditDelete('user')
          testMethod() {}
        }

        // Act
        const resource = reflector.get(AUDIT_RESOURCE_KEY, TestController.prototype.testMethod);
        const action = reflector.get(AUDIT_ACTION_KEY, TestController.prototype.testMethod);

        // Assert
        expect(resource).toBe('user');
        expect(action).toBe('delete');
      });
    });

    describe('@AuditExport', () => {
      it('should set audit for export action', () => {
        // Arrange
        class TestController {
          @AuditExport('user')
          testMethod() {}
        }

        // Act
        const resource = reflector.get(AUDIT_RESOURCE_KEY, TestController.prototype.testMethod);
        const action = reflector.get(AUDIT_ACTION_KEY, TestController.prototype.testMethod);

        // Assert
        expect(resource).toBe('user');
        expect(action).toBe('export');
      });
    });

    describe('@AuditGrant', () => {
      it('should set audit for grant action', () => {
        // Arrange
        class TestController {
          @AuditGrant('permission')
          testMethod() {}
        }

        // Act
        const resource = reflector.get(AUDIT_RESOURCE_KEY, TestController.prototype.testMethod);
        const action = reflector.get(AUDIT_ACTION_KEY, TestController.prototype.testMethod);

        // Assert
        expect(resource).toBe('permission');
        expect(action).toBe('grant');
      });
    });

    describe('@AuditRevoke', () => {
      it('should set audit for revoke action', () => {
        // Arrange
        class TestController {
          @AuditRevoke('permission')
          testMethod() {}
        }

        // Act
        const resource = reflector.get(AUDIT_RESOURCE_KEY, TestController.prototype.testMethod);
        const action = reflector.get(AUDIT_ACTION_KEY, TestController.prototype.testMethod);

        // Assert
        expect(resource).toBe('permission');
        expect(action).toBe('revoke');
      });
    });
  });

  describe('Combined Scenarios', () => {
    it('should handle both tenant and audit decorators', () => {
      // Arrange
      class TestController {
        @AutoSetTenant()
        @AuditCreate('device')
        testMethod() {}
      }

      // Act
      const autoSetTenant = reflector.get(AUTO_SET_TENANT_KEY, TestController.prototype.testMethod);
      const auditEnabled = reflector.get(AUDIT_PERMISSION_KEY, TestController.prototype.testMethod);
      const resource = reflector.get(AUDIT_RESOURCE_KEY, TestController.prototype.testMethod);
      const action = reflector.get(AUDIT_ACTION_KEY, TestController.prototype.testMethod);

      // Assert
      expect(autoSetTenant).toBe(true);
      expect(auditEnabled).toBe(true);
      expect(resource).toBe('device');
      expect(action).toBe('create');
    });

    it('should handle custom tenant field with audit', () => {
      // Arrange
      class TestController {
        @TenantField('organizationId')
        @AuditUpdate('resource')
        testMethod() {}
      }

      // Act
      const tenantField = reflector.get(TENANT_FIELD_KEY, TestController.prototype.testMethod);
      const resource = reflector.get(AUDIT_RESOURCE_KEY, TestController.prototype.testMethod);
      const action = reflector.get(AUDIT_ACTION_KEY, TestController.prototype.testMethod);

      // Assert
      expect(tenantField).toBe('organizationId');
      expect(resource).toBe('resource');
      expect(action).toBe('update');
    });

    it('should allow skipping both tenant isolation and audit', () => {
      // Arrange
      class TestController {
        @SkipTenantIsolation()
        @SkipAudit()
        testMethod() {}
      }

      // Act
      const skipTenant = reflector.get(
        SKIP_TENANT_ISOLATION_KEY,
        TestController.prototype.testMethod
      );
      const skipAudit = reflector.get(SKIP_AUDIT_KEY, TestController.prototype.testMethod);

      // Assert
      expect(skipTenant).toBe(true);
      expect(skipAudit).toBe(true);
    });
  });

  describe('Different Resources and Actions', () => {
    it('should handle different resources correctly', () => {
      // Arrange
      class TestController {
        @AuditCreate('user')
        createUser() {}

        @AuditUpdate('device')
        updateDevice() {}

        @AuditDelete('order')
        deleteOrder() {}
      }

      // Act
      const userResource = reflector.get(AUDIT_RESOURCE_KEY, TestController.prototype.createUser);
      const deviceResource = reflector.get(
        AUDIT_RESOURCE_KEY,
        TestController.prototype.updateDevice
      );
      const orderResource = reflector.get(AUDIT_RESOURCE_KEY, TestController.prototype.deleteOrder);

      // Assert
      expect(userResource).toBe('user');
      expect(deviceResource).toBe('device');
      expect(orderResource).toBe('order');
    });

    it('should handle all audit action types', () => {
      // Arrange
      class TestController {
        @AuditCreate('res')
        create() {}

        @AuditUpdate('res')
        update() {}

        @AuditDelete('res')
        delete() {}

        @AuditExport('res')
        export() {}

        @AuditGrant('res')
        grant() {}

        @AuditRevoke('res')
        revoke() {}
      }

      // Act
      const createAction = reflector.get(AUDIT_ACTION_KEY, TestController.prototype.create);
      const updateAction = reflector.get(AUDIT_ACTION_KEY, TestController.prototype.update);
      const deleteAction = reflector.get(AUDIT_ACTION_KEY, TestController.prototype.delete);
      const exportAction = reflector.get(AUDIT_ACTION_KEY, TestController.prototype.export);
      const grantAction = reflector.get(AUDIT_ACTION_KEY, TestController.prototype.grant);
      const revokeAction = reflector.get(AUDIT_ACTION_KEY, TestController.prototype.revoke);

      // Assert
      expect(createAction).toBe('create');
      expect(updateAction).toBe('update');
      expect(deleteAction).toBe('delete');
      expect(exportAction).toBe('export');
      expect(grantAction).toBe('grant');
      expect(revokeAction).toBe('revoke');
    });
  });
});
