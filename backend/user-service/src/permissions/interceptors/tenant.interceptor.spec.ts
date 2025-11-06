import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, Logger, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import {
  TenantInterceptor,
  SKIP_TENANT_ISOLATION_KEY,
  TENANT_FIELD_KEY,
  AUTO_SET_TENANT_KEY,
} from './tenant.interceptor';
import { TenantIsolationService } from '../tenant-isolation.service';

describe('TenantInterceptor', () => {
  let interceptor: TenantInterceptor;
  let reflector: Reflector;
  let tenantIsolation: jest.Mocked<TenantIsolationService>;

  // Mock services
  const mockTenantIsolation = {
    setDataTenant: jest.fn(),
    setDataArrayTenant: jest.fn(),
    validateDataTenant: jest.fn(),
    validateDataArrayTenant: jest.fn(),
    checkCrossTenantAccess: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantInterceptor,
        Reflector,
        {
          provide: TenantIsolationService,
          useValue: mockTenantIsolation,
        },
      ],
    }).compile();

    // Suppress logger output during tests
    Logger.prototype.log = jest.fn();
    Logger.prototype.error = jest.fn();
    Logger.prototype.warn = jest.fn();
    Logger.prototype.debug = jest.fn();

    interceptor = module.get<TenantInterceptor>(TenantInterceptor);
    reflector = module.get<Reflector>(Reflector);
    tenantIsolation = module.get(TenantIsolationService);
  });

  /**
   * Helper function to create mock ExecutionContext
   */
  function createMockContext(
    user: any | null,
    metadata: Record<string, any> = {},
    requestData: any = {}
  ): ExecutionContext {
    const mockRequest = {
      user: user !== null ? user : undefined,
      body: requestData.body,
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

  /**
   * Helper function to create mock CallHandler
   */
  function createMockCallHandler(result: any): CallHandler {
    return {
      handle: jest.fn(() => of(result)),
    } as any;
  }

  describe('@SkipTenantIsolation', () => {
    it('should skip tenant isolation when skipTenantIsolation is true', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [SKIP_TENANT_ISOLATION_KEY]: true },
        { body: { tenantId: 'other-tenant' } }
      );
      const next = createMockCallHandler({ success: true });

      interceptor.intercept(context, next).then((observable) => {
        observable.subscribe(() => {
          expect(tenantIsolation.validateDataTenant).not.toHaveBeenCalled();
          done();
        });
      });
    });

    it('should continue isolation when skipTenantIsolation is false', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [SKIP_TENANT_ISOLATION_KEY]: false },
        { body: { tenantId: 'tenant-1' } }
      );
      const next = createMockCallHandler({ success: true });

      mockTenantIsolation.validateDataTenant.mockResolvedValue(undefined);

      interceptor.intercept(context, next).then((observable) => {
        observable.subscribe(() => {
          expect(tenantIsolation.validateDataTenant).toHaveBeenCalled();
          done();
        });
      });
    });
  });

  describe('User Authentication', () => {
    it('should skip isolation when user is undefined', (done) => {
      const context = createMockContext(null, {}, { body: { tenantId: 'tenant-1' } });
      const next = createMockCallHandler({ success: true });

      interceptor.intercept(context, next).then((observable) => {
        observable.subscribe(() => {
          expect(tenantIsolation.validateDataTenant).not.toHaveBeenCalled();
          done();
        });
      });
    });

    it('should skip isolation when user.id is missing', (done) => {
      const context = createMockContext(
        { username: 'testuser' },
        {},
        { body: { tenantId: 'tenant-1' } }
      );
      const next = createMockCallHandler({ success: true });

      interceptor.intercept(context, next).then((observable) => {
        observable.subscribe(() => {
          expect(tenantIsolation.validateDataTenant).not.toHaveBeenCalled();
          done();
        });
      });
    });
  });

  describe('@AutoSetTenant - Single Object', () => {
    it('should auto-set tenantId for single object when autoSetTenant is true', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [AUTO_SET_TENANT_KEY]: true },
        { body: { name: 'Test' } }
      );
      const modifiedBody = { name: 'Test', tenantId: 'tenant-1' };
      const next = createMockCallHandler({ id: '1' });

      mockTenantIsolation.setDataTenant.mockResolvedValue(modifiedBody);

      interceptor.intercept(context, next).then((observable) => {
        expect(tenantIsolation.setDataTenant).toHaveBeenCalledWith(
          'user-123',
          { name: 'Test' },
          'tenantId'
        );
        observable.subscribe(() => {
          done();
        });
      });
    });

    it('should use custom tenant field name', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [AUTO_SET_TENANT_KEY]: true, [TENANT_FIELD_KEY]: 'orgId' },
        { body: { name: 'Test' } }
      );
      const modifiedBody = { name: 'Test', orgId: 'org-1' };
      const next = createMockCallHandler({ id: '1' });

      mockTenantIsolation.setDataTenant.mockResolvedValue(modifiedBody);

      interceptor.intercept(context, next).then(() => {
        expect(tenantIsolation.setDataTenant).toHaveBeenCalledWith(
          'user-123',
          { name: 'Test' },
          'orgId'
        );
        done();
      });
    });

    it('should throw error when auto-set fails', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { [AUTO_SET_TENANT_KEY]: true },
        { body: { name: 'Test' } }
      );
      const next = createMockCallHandler({ id: '1' });

      mockTenantIsolation.setDataTenant.mockRejectedValue(new Error('Service error'));

      await expect(interceptor.intercept(context, next)).rejects.toThrow('Service error');
    });
  });

  describe('@AutoSetTenant - Array', () => {
    it('should auto-set tenantId for array when autoSetTenant is true', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [AUTO_SET_TENANT_KEY]: true },
        { body: [{ name: 'Test1' }, { name: 'Test2' }] }
      );
      const modifiedBody = [
        { name: 'Test1', tenantId: 'tenant-1' },
        { name: 'Test2', tenantId: 'tenant-1' },
      ];
      const next = createMockCallHandler({ success: true });

      mockTenantIsolation.setDataArrayTenant.mockResolvedValue(modifiedBody);

      interceptor.intercept(context, next).then(() => {
        expect(tenantIsolation.setDataArrayTenant).toHaveBeenCalledWith(
          'user-123',
          [{ name: 'Test1' }, { name: 'Test2' }],
          'tenantId'
        );
        done();
      });
    });
  });

  describe('Tenant Validation - Request Body', () => {
    it('should validate tenantId for single object', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        {},
        { body: { name: 'Test', tenantId: 'tenant-1' } }
      );
      const next = createMockCallHandler({ id: '1' });

      mockTenantIsolation.validateDataTenant.mockResolvedValue(undefined);

      interceptor.intercept(context, next).then((observable) => {
        expect(tenantIsolation.validateDataTenant).toHaveBeenCalledWith(
          'user-123',
          { name: 'Test', tenantId: 'tenant-1' },
          'tenantId'
        );
        observable.subscribe(() => {
          done();
        });
      });
    });

    it('should validate tenantId for array', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        {},
        { body: [{ tenantId: 'tenant-1' }, { tenantId: 'tenant-1' }] }
      );
      const next = createMockCallHandler({ success: true });

      mockTenantIsolation.validateDataArrayTenant.mockResolvedValue(undefined);

      interceptor.intercept(context, next).then((observable) => {
        expect(tenantIsolation.validateDataArrayTenant).toHaveBeenCalled();
        observable.subscribe(() => {
          done();
        });
      });
    });

    it('should throw error when validation fails', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        {},
        { body: { tenantId: 'other-tenant' } }
      );
      const next = createMockCallHandler({ id: '1' });

      mockTenantIsolation.validateDataTenant.mockRejectedValue(
        new ForbiddenException('Cross-tenant access denied')
      );

      await expect(interceptor.intercept(context, next)).rejects.toThrow(
        'Cross-tenant access denied'
      );
    });

    it('should skip validation when body is not an object', (done) => {
      const context = createMockContext({ id: 'user-123' }, {}, { body: 'string data' });
      const next = createMockCallHandler({ success: true });

      interceptor.intercept(context, next).then((observable) => {
        observable.subscribe(() => {
          expect(tenantIsolation.validateDataTenant).not.toHaveBeenCalled();
          done();
        });
      });
    });
  });

  describe('Query Parameter Validation', () => {
    it('should check cross-tenant access for query parameter', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        {},
        { query: { tenantId: 'other-tenant' } }
      );
      const next = createMockCallHandler({ data: [] });

      mockTenantIsolation.checkCrossTenantAccess.mockResolvedValue(true);

      interceptor.intercept(context, next).then((observable) => {
        expect(tenantIsolation.checkCrossTenantAccess).toHaveBeenCalledWith(
          'user-123',
          'other-tenant'
        );
        observable.subscribe(() => {
          done();
        });
      });
    });

    it('should throw ForbiddenException when cross-tenant access is denied', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        {},
        { query: { tenantId: 'other-tenant' } }
      );
      const next = createMockCallHandler({ data: [] });

      mockTenantIsolation.checkCrossTenantAccess.mockResolvedValue(false);

      await expect(interceptor.intercept(context, next)).rejects.toThrow('不允许跨租户访问');
    });

    it('should use custom tenant field for query validation', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { [TENANT_FIELD_KEY]: 'orgId' },
        { query: { orgId: 'other-org' } }
      );
      const next = createMockCallHandler({ data: [] });

      mockTenantIsolation.checkCrossTenantAccess.mockResolvedValue(false);

      await expect(interceptor.intercept(context, next)).rejects.toThrow();
    });
  });

  describe('Path Parameter Validation', () => {
    it('should check cross-tenant access for path parameter', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        {},
        { params: { tenantId: 'other-tenant' } }
      );
      const next = createMockCallHandler({ data: {} });

      mockTenantIsolation.checkCrossTenantAccess.mockResolvedValue(true);

      interceptor.intercept(context, next).then((observable) => {
        expect(tenantIsolation.checkCrossTenantAccess).toHaveBeenCalledWith(
          'user-123',
          'other-tenant'
        );
        observable.subscribe(() => {
          done();
        });
      });
    });

    it('should throw ForbiddenException when path parameter access is denied', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        {},
        { params: { tenantId: 'other-tenant' } }
      );
      const next = createMockCallHandler({ data: {} });

      mockTenantIsolation.checkCrossTenantAccess.mockResolvedValue(false);

      await expect(interceptor.intercept(context, next)).rejects.toThrow('不允许跨租户访问');
    });
  });

  describe('Response Data Validation - Single Object', () => {
    it('should validate response object tenant', (done) => {
      const context = createMockContext({ id: 'user-123' }, {});
      const responseData = { id: '1', tenantId: 'tenant-1' };
      const next = createMockCallHandler(responseData);

      mockTenantIsolation.validateDataTenant.mockResolvedValue(undefined);

      interceptor.intercept(context, next).then((observable) => {
        observable.subscribe(() => {
          // Allow async validation to complete
          setTimeout(() => {
            expect(tenantIsolation.validateDataTenant).toHaveBeenCalledWith(
              'user-123',
              responseData,
              'tenantId'
            );
            done();
          }, 10);
        });
      });
    });

    it('should not validate response when data is null', (done) => {
      const context = createMockContext({ id: 'user-123' }, {});
      const next = createMockCallHandler(null);

      interceptor.intercept(context, next).then((observable) => {
        observable.subscribe(() => {
          expect(tenantIsolation.validateDataTenant).not.toHaveBeenCalled();
          done();
        });
      });
    });

    it('should not validate response when object has no tenantId', (done) => {
      const context = createMockContext({ id: 'user-123' }, {});
      const responseData = { id: '1', name: 'Test' };
      const next = createMockCallHandler(responseData);

      interceptor.intercept(context, next).then((observable) => {
        observable.subscribe(() => {
          setTimeout(() => {
            expect(tenantIsolation.validateDataTenant).not.toHaveBeenCalled();
            done();
          }, 10);
        });
      });
    });
  });

  describe('Response Data Validation - Array', () => {
    it('should validate response array tenant', (done) => {
      const context = createMockContext({ id: 'user-123' }, {});
      const responseData = [
        { id: '1', tenantId: 'tenant-1' },
        { id: '2', tenantId: 'tenant-1' },
      ];
      const next = createMockCallHandler(responseData);

      mockTenantIsolation.validateDataArrayTenant.mockResolvedValue(undefined);

      interceptor.intercept(context, next).then((observable) => {
        observable.subscribe(() => {
          setTimeout(() => {
            expect(tenantIsolation.validateDataArrayTenant).toHaveBeenCalledWith(
              'user-123',
              responseData,
              'tenantId'
            );
            done();
          }, 10);
        });
      });
    });

    it('should validate empty array', (done) => {
      const context = createMockContext({ id: 'user-123' }, {});
      const responseData: any[] = [];
      const next = createMockCallHandler(responseData);

      mockTenantIsolation.validateDataArrayTenant.mockResolvedValue(undefined);

      interceptor.intercept(context, next).then((observable) => {
        observable.subscribe(() => {
          setTimeout(() => {
            expect(tenantIsolation.validateDataArrayTenant).toHaveBeenCalled();
            done();
          }, 10);
        });
      });
    });
  });

  describe('Response Data Validation - Paginated', () => {
    it('should validate paginated data with "data" field', (done) => {
      const context = createMockContext({ id: 'user-123' }, {});
      const responseData = {
        data: [
          { id: '1', tenantId: 'tenant-1' },
          { id: '2', tenantId: 'tenant-1' },
        ],
        total: 2,
      };
      const next = createMockCallHandler(responseData);

      mockTenantIsolation.validateDataArrayTenant.mockResolvedValue(undefined);

      interceptor.intercept(context, next).then((observable) => {
        observable.subscribe(() => {
          setTimeout(() => {
            expect(tenantIsolation.validateDataArrayTenant).toHaveBeenCalledWith(
              'user-123',
              responseData.data,
              'tenantId'
            );
            done();
          }, 10);
        });
      });
    });

    it('should validate paginated data with "items" field', (done) => {
      const context = createMockContext({ id: 'user-123' }, {});
      const responseData = {
        items: [{ id: '1', tenantId: 'tenant-1' }],
        total: 1,
      };
      const next = createMockCallHandler(responseData);

      mockTenantIsolation.validateDataArrayTenant.mockResolvedValue(undefined);

      interceptor.intercept(context, next).then((observable) => {
        observable.subscribe(() => {
          setTimeout(() => {
            expect(tenantIsolation.validateDataArrayTenant).toHaveBeenCalledWith(
              'user-123',
              responseData.items,
              'tenantId'
            );
            done();
          }, 10);
        });
      });
    });

    it('should validate paginated data with "list" field', (done) => {
      const context = createMockContext({ id: 'user-123' }, {});
      const responseData = {
        list: [{ id: '1', tenantId: 'tenant-1' }],
        pageSize: 10,
      };
      const next = createMockCallHandler(responseData);

      mockTenantIsolation.validateDataArrayTenant.mockResolvedValue(undefined);

      interceptor.intercept(context, next).then((observable) => {
        observable.subscribe(() => {
          setTimeout(() => {
            expect(tenantIsolation.validateDataArrayTenant).toHaveBeenCalledWith(
              'user-123',
              responseData.list,
              'tenantId'
            );
            done();
          }, 10);
        });
      });
    });
  });

  describe('Response Validation Error Handling', () => {
    it('should log warning but not throw when response validation fails', (done) => {
      const context = createMockContext({ id: 'user-123' }, {});
      const responseData = { id: '1', tenantId: 'other-tenant' };
      const next = createMockCallHandler(responseData);

      mockTenantIsolation.validateDataTenant.mockRejectedValue(
        new ForbiddenException('Invalid tenant')
      );

      interceptor.intercept(context, next).then((observable) => {
        observable.subscribe(() => {
          setTimeout(() => {
            expect(Logger.prototype.error).toHaveBeenCalledWith(
              expect.stringContaining('响应数据租户验证失败'),
              expect.any(String)
            );
            expect(Logger.prototype.warn).toHaveBeenCalledWith(
              expect.stringContaining('检测到潜在的跨租户数据泄露')
            );
            done();
          }, 10);
        });
      });
    });
  });
});
