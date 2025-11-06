import { Reflector } from '@nestjs/core';
import {
  DataScopeResource,
  SkipDataScope,
  FieldFilterResource,
  SkipFieldFilter,
  FullDataControl,
  ViewDataControl,
  CreateDataControl,
  UpdateDataControl,
  ExportDataControl,
} from './data-scope.decorators';
import {
  DATA_SCOPE_RESOURCE_KEY,
  SKIP_DATA_SCOPE_KEY,
} from '../interceptors/data-scope.interceptor';
import {
  FIELD_FILTER_RESOURCE_KEY,
  FIELD_FILTER_OPERATION_KEY,
  SKIP_FIELD_FILTER_KEY,
} from '../interceptors/field-filter.interceptor';
import { OperationType } from '../../entities/field-permission.entity';

describe('Data Scope Decorators', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('@DataScopeResource', () => {
    it('should set data scope resource metadata', () => {
      // Arrange
      class TestController {
        @DataScopeResource('device')
        testMethod() {}
      }

      // Act
      const metadata = reflector.get(DATA_SCOPE_RESOURCE_KEY, TestController.prototype.testMethod);

      // Assert
      expect(metadata).toBe('device');
    });

    it('should work with different resource types', () => {
      // Arrange
      class TestController {
        @DataScopeResource('user')
        getUserMethod() {}

        @DataScopeResource('order')
        getOrderMethod() {}
      }

      // Act
      const userMetadata = reflector.get(
        DATA_SCOPE_RESOURCE_KEY,
        TestController.prototype.getUserMethod
      );
      const orderMetadata = reflector.get(
        DATA_SCOPE_RESOURCE_KEY,
        TestController.prototype.getOrderMethod
      );

      // Assert
      expect(userMetadata).toBe('user');
      expect(orderMetadata).toBe('order');
    });
  });

  describe('@SkipDataScope', () => {
    it('should set skip data scope metadata to true', () => {
      // Arrange
      class TestController {
        @SkipDataScope()
        testMethod() {}
      }

      // Act
      const metadata = reflector.get(SKIP_DATA_SCOPE_KEY, TestController.prototype.testMethod);

      // Assert
      expect(metadata).toBe(true);
    });
  });

  describe('@FieldFilterResource', () => {
    it('should set field filter resource and operation metadata', () => {
      // Arrange
      class TestController {
        @FieldFilterResource('user', OperationType.VIEW)
        testMethod() {}
      }

      // Act
      const resourceMetadata = reflector.get(
        FIELD_FILTER_RESOURCE_KEY,
        TestController.prototype.testMethod
      );
      const operationMetadata = reflector.get(
        FIELD_FILTER_OPERATION_KEY,
        TestController.prototype.testMethod
      );

      // Assert
      expect(resourceMetadata).toBe('user');
      expect(operationMetadata).toBe(OperationType.VIEW);
    });

    it('should use VIEW as default operation', () => {
      // Arrange
      class TestController {
        @FieldFilterResource('user')
        testMethod() {}
      }

      // Act
      const operationMetadata = reflector.get(
        FIELD_FILTER_OPERATION_KEY,
        TestController.prototype.testMethod
      );

      // Assert
      expect(operationMetadata).toBe(OperationType.VIEW);
    });

    it('should work with different operation types', () => {
      // Arrange
      class TestController {
        @FieldFilterResource('user', OperationType.CREATE)
        createMethod() {}

        @FieldFilterResource('user', OperationType.UPDATE)
        updateMethod() {}

        @FieldFilterResource('user', OperationType.EXPORT)
        exportMethod() {}
      }

      // Act
      const createOp = reflector.get(
        FIELD_FILTER_OPERATION_KEY,
        TestController.prototype.createMethod
      );
      const updateOp = reflector.get(
        FIELD_FILTER_OPERATION_KEY,
        TestController.prototype.updateMethod
      );
      const exportOp = reflector.get(
        FIELD_FILTER_OPERATION_KEY,
        TestController.prototype.exportMethod
      );

      // Assert
      expect(createOp).toBe(OperationType.CREATE);
      expect(updateOp).toBe(OperationType.UPDATE);
      expect(exportOp).toBe(OperationType.EXPORT);
    });
  });

  describe('@SkipFieldFilter', () => {
    it('should set skip field filter metadata to true', () => {
      // Arrange
      class TestController {
        @SkipFieldFilter()
        testMethod() {}
      }

      // Act
      const metadata = reflector.get(SKIP_FIELD_FILTER_KEY, TestController.prototype.testMethod);

      // Assert
      expect(metadata).toBe(true);
    });
  });

  describe('@FullDataControl', () => {
    it('should set both data scope and field filter metadata', () => {
      // Arrange
      class TestController {
        @FullDataControl('user', OperationType.UPDATE)
        testMethod() {}
      }

      // Act
      const dataScopeResource = reflector.get(
        DATA_SCOPE_RESOURCE_KEY,
        TestController.prototype.testMethod
      );
      const fieldFilterResource = reflector.get(
        FIELD_FILTER_RESOURCE_KEY,
        TestController.prototype.testMethod
      );
      const fieldFilterOperation = reflector.get(
        FIELD_FILTER_OPERATION_KEY,
        TestController.prototype.testMethod
      );

      // Assert
      expect(dataScopeResource).toBe('user');
      expect(fieldFilterResource).toBe('user');
      expect(fieldFilterOperation).toBe(OperationType.UPDATE);
    });

    it('should use VIEW as default operation', () => {
      // Arrange
      class TestController {
        @FullDataControl('device')
        testMethod() {}
      }

      // Act
      const operation = reflector.get(
        FIELD_FILTER_OPERATION_KEY,
        TestController.prototype.testMethod
      );

      // Assert
      expect(operation).toBe(OperationType.VIEW);
    });
  });

  describe('Convenience Decorators', () => {
    describe('@ViewDataControl', () => {
      it('should apply full data control with VIEW operation', () => {
        // Arrange
        class TestController {
          @ViewDataControl('user')
          testMethod() {}
        }

        // Act
        const dataScopeResource = reflector.get(
          DATA_SCOPE_RESOURCE_KEY,
          TestController.prototype.testMethod
        );
        const fieldFilterOperation = reflector.get(
          FIELD_FILTER_OPERATION_KEY,
          TestController.prototype.testMethod
        );

        // Assert
        expect(dataScopeResource).toBe('user');
        expect(fieldFilterOperation).toBe(OperationType.VIEW);
      });
    });

    describe('@CreateDataControl', () => {
      it('should apply full data control with CREATE operation', () => {
        // Arrange
        class TestController {
          @CreateDataControl('user')
          testMethod() {}
        }

        // Act
        const operation = reflector.get(
          FIELD_FILTER_OPERATION_KEY,
          TestController.prototype.testMethod
        );

        // Assert
        expect(operation).toBe(OperationType.CREATE);
      });
    });

    describe('@UpdateDataControl', () => {
      it('should apply full data control with UPDATE operation', () => {
        // Arrange
        class TestController {
          @UpdateDataControl('user')
          testMethod() {}
        }

        // Act
        const operation = reflector.get(
          FIELD_FILTER_OPERATION_KEY,
          TestController.prototype.testMethod
        );

        // Assert
        expect(operation).toBe(OperationType.UPDATE);
      });
    });

    describe('@ExportDataControl', () => {
      it('should apply full data control with EXPORT operation', () => {
        // Arrange
        class TestController {
          @ExportDataControl('user')
          testMethod() {}
        }

        // Act
        const operation = reflector.get(
          FIELD_FILTER_OPERATION_KEY,
          TestController.prototype.testMethod
        );

        // Assert
        expect(operation).toBe(OperationType.EXPORT);
      });
    });
  });

  describe('Multiple Decorators', () => {
    it('should allow combining multiple decorators', () => {
      // Arrange
      class TestController {
        @DataScopeResource('user')
        @FieldFilterResource('user', OperationType.CREATE)
        testMethod() {}
      }

      // Act
      const dataScopeResource = reflector.get(
        DATA_SCOPE_RESOURCE_KEY,
        TestController.prototype.testMethod
      );
      const fieldFilterResource = reflector.get(
        FIELD_FILTER_RESOURCE_KEY,
        TestController.prototype.testMethod
      );
      const fieldFilterOperation = reflector.get(
        FIELD_FILTER_OPERATION_KEY,
        TestController.prototype.testMethod
      );

      // Assert
      expect(dataScopeResource).toBe('user');
      expect(fieldFilterResource).toBe('user');
      expect(fieldFilterOperation).toBe(OperationType.CREATE);
    });

    it('should allow skipping both data scope and field filter', () => {
      // Arrange
      class TestController {
        @SkipDataScope()
        @SkipFieldFilter()
        testMethod() {}
      }

      // Act
      const skipDataScope = reflector.get(SKIP_DATA_SCOPE_KEY, TestController.prototype.testMethod);
      const skipFieldFilter = reflector.get(
        SKIP_FIELD_FILTER_KEY,
        TestController.prototype.testMethod
      );

      // Assert
      expect(skipDataScope).toBe(true);
      expect(skipFieldFilter).toBe(true);
    });
  });
});
