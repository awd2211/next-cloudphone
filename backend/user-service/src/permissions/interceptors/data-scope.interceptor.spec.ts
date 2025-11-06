import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import {
  DataScopeInterceptor,
  DATA_SCOPE_RESOURCE_KEY,
  SKIP_DATA_SCOPE_KEY,
} from './data-scope.interceptor';
import { DataScopeService } from '../data-scope.service';

describe('DataScopeInterceptor', () => {
  let interceptor: DataScopeInterceptor;
  let reflector: Reflector;
  let dataScopeService: jest.Mocked<DataScopeService>;

  // Mock services
  const mockDataScopeService = {
    getDataScopeFilter: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataScopeInterceptor,
        Reflector,
        {
          provide: DataScopeService,
          useValue: mockDataScopeService,
        },
      ],
    }).compile();

    // Suppress logger output during tests
    Logger.prototype.log = jest.fn();
    Logger.prototype.error = jest.fn();
    Logger.prototype.warn = jest.fn();
    Logger.prototype.debug = jest.fn();

    interceptor = module.get<DataScopeInterceptor>(DataScopeInterceptor);
    reflector = module.get<Reflector>(Reflector);
    dataScopeService = module.get(DataScopeService);
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
      body: requestData.body || {},
      params: requestData.params || {},
      query: requestData.query || {},
      // dataScopeFilter and dataScopeResource will be set by interceptor
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
  function createMockCallHandler(result: any = {}): CallHandler {
    return {
      handle: jest.fn(() => of(result)),
    } as any;
  }

  describe('@SkipDataScope', () => {
    it('should skip data scope filtering when skipDataScope is true', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { [SKIP_DATA_SCOPE_KEY]: true, [DATA_SCOPE_RESOURCE_KEY]: 'device' }
      );
      const next = createMockCallHandler();

      const result = await interceptor.intercept(context, next);

      // Should not call data scope service
      expect(dataScopeService.getDataScopeFilter).not.toHaveBeenCalled();

      // Should continue with request
      result.subscribe((data) => {
        expect(data).toEqual({});
      });
    });

    it('should continue filtering when skipDataScope is false', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { [SKIP_DATA_SCOPE_KEY]: false, [DATA_SCOPE_RESOURCE_KEY]: 'device' }
      );
      const next = createMockCallHandler();

      mockDataScopeService.getDataScopeFilter.mockResolvedValue({
        tenantId: 'tenant-1',
      });

      await interceptor.intercept(context, next);

      // Should call data scope service
      expect(dataScopeService.getDataScopeFilter).toHaveBeenCalledWith('user-123', 'device');
    });
  });

  describe('@DataScopeResource', () => {
    it('should not apply filter when resource type is not configured', async () => {
      const context = createMockContext({ id: 'user-123' }, {});
      const next = createMockCallHandler();

      const result = await interceptor.intercept(context, next);

      // Should not call data scope service
      expect(dataScopeService.getDataScopeFilter).not.toHaveBeenCalled();

      // Should continue with request
      result.subscribe((data) => {
        expect(data).toEqual({});
      });
    });

    it('should apply filter when resource type is configured', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { [DATA_SCOPE_RESOURCE_KEY]: 'device' }
      );
      const next = createMockCallHandler();

      mockDataScopeService.getDataScopeFilter.mockResolvedValue({
        status: 'active',
      });

      await interceptor.intercept(context, next);

      // Should call data scope service with correct resource type
      expect(dataScopeService.getDataScopeFilter).toHaveBeenCalledWith('user-123', 'device');
    });

    it('should handle different resource types', async () => {
      const resourceTypes = ['user', 'device', 'order', 'report'];

      for (const resourceType of resourceTypes) {
        jest.clearAllMocks();

        const context = createMockContext(
          { id: 'user-123' },
          { [DATA_SCOPE_RESOURCE_KEY]: resourceType }
        );
        const next = createMockCallHandler();

        mockDataScopeService.getDataScopeFilter.mockResolvedValue({});

        await interceptor.intercept(context, next);

        expect(dataScopeService.getDataScopeFilter).toHaveBeenCalledWith('user-123', resourceType);
      }
    });
  });

  describe('User Authentication', () => {
    it('should skip filtering when user is undefined', async () => {
      const context = createMockContext(null, { [DATA_SCOPE_RESOURCE_KEY]: 'device' });
      const next = createMockCallHandler();

      const result = await interceptor.intercept(context, next);

      // Should not call data scope service
      expect(dataScopeService.getDataScopeFilter).not.toHaveBeenCalled();

      // Should continue with request
      result.subscribe((data) => {
        expect(data).toEqual({});
      });
    });

    it('should skip filtering when user.id is missing', async () => {
      const context = createMockContext(
        { username: 'testuser' },
        { [DATA_SCOPE_RESOURCE_KEY]: 'device' }
      );
      const next = createMockCallHandler();

      const result = await interceptor.intercept(context, next);

      // Should not call data scope service
      expect(dataScopeService.getDataScopeFilter).not.toHaveBeenCalled();

      // Should continue with request
      result.subscribe((data) => {
        expect(data).toEqual({});
      });
    });

    it('should apply filtering when user has valid id', async () => {
      const context = createMockContext(
        { id: 'user-123', username: 'testuser' },
        { [DATA_SCOPE_RESOURCE_KEY]: 'device' }
      );
      const next = createMockCallHandler();

      mockDataScopeService.getDataScopeFilter.mockResolvedValue({
        tenantId: 'tenant-1',
      });

      await interceptor.intercept(context, next);

      // Should call data scope service
      expect(dataScopeService.getDataScopeFilter).toHaveBeenCalledWith('user-123', 'device');
    });
  });

  describe('Filter Application', () => {
    it('should attach filter to request object', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { [DATA_SCOPE_RESOURCE_KEY]: 'device' }
      );
      const next = createMockCallHandler();

      const expectedFilter = {
        tenantId: 'tenant-1',
        status: 'active',
      };

      mockDataScopeService.getDataScopeFilter.mockResolvedValue(expectedFilter);

      await interceptor.intercept(context, next);

      const request = context.switchToHttp().getRequest();
      expect(request.dataScopeFilter).toEqual(expectedFilter);
    });

    it('should attach resource type to request object', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { [DATA_SCOPE_RESOURCE_KEY]: 'device' }
      );
      const next = createMockCallHandler();

      mockDataScopeService.getDataScopeFilter.mockResolvedValue({});

      await interceptor.intercept(context, next);

      const request = context.switchToHttp().getRequest();
      expect(request.dataScopeResource).toBe('device');
    });

    it('should handle empty filter object', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { [DATA_SCOPE_RESOURCE_KEY]: 'device' }
      );
      const next = createMockCallHandler();

      mockDataScopeService.getDataScopeFilter.mockResolvedValue({});

      await interceptor.intercept(context, next);

      const request = context.switchToHttp().getRequest();
      expect(request.dataScopeFilter).toEqual({});
      expect(request.dataScopeResource).toBe('device');
    });

    it('should handle complex filter objects', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { [DATA_SCOPE_RESOURCE_KEY]: 'device' }
      );
      const next = createMockCallHandler();

      const complexFilter = {
        $and: [
          { tenantId: 'tenant-1' },
          { status: { $in: ['active', 'pending'] } },
          { createdAt: { $gte: new Date('2024-01-01') } },
        ],
      };

      mockDataScopeService.getDataScopeFilter.mockResolvedValue(complexFilter);

      await interceptor.intercept(context, next);

      const request = context.switchToHttp().getRequest();
      expect(request.dataScopeFilter).toEqual(complexFilter);
    });
  });

  describe('Error Handling', () => {
    it('should not throw error when service fails', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { [DATA_SCOPE_RESOURCE_KEY]: 'device' }
      );
      const next = createMockCallHandler();

      mockDataScopeService.getDataScopeFilter.mockRejectedValue(new Error('Database error'));

      // Should not throw error
      const result = await interceptor.intercept(context, next);

      // Should continue with request
      result.subscribe((data) => {
        expect(data).toEqual({});
      });

      // Should log error
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('应用数据范围过滤失败'),
        expect.any(String)
      );
    });

    it('should not attach filter when service fails', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { [DATA_SCOPE_RESOURCE_KEY]: 'device' }
      );
      const next = createMockCallHandler();

      mockDataScopeService.getDataScopeFilter.mockRejectedValue(new Error('Service unavailable'));

      await interceptor.intercept(context, next);

      const request = context.switchToHttp().getRequest();
      expect(request.dataScopeFilter).toBeUndefined();
      expect(request.dataScopeResource).toBeUndefined();
    });

    it('should handle null filter gracefully', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { [DATA_SCOPE_RESOURCE_KEY]: 'device' }
      );
      const next = createMockCallHandler();

      mockDataScopeService.getDataScopeFilter.mockResolvedValue(null as any);

      await interceptor.intercept(context, next);

      const request = context.switchToHttp().getRequest();
      expect(request.dataScopeFilter).toBeNull();
      expect(request.dataScopeResource).toBe('device');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle tenant-scoped filter', async () => {
      const context = createMockContext(
        { id: 'user-123', tenantId: 'tenant-1' },
        { [DATA_SCOPE_RESOURCE_KEY]: 'device' }
      );
      const next = createMockCallHandler();

      mockDataScopeService.getDataScopeFilter.mockResolvedValue({
        tenantId: 'tenant-1',
      });

      await interceptor.intercept(context, next);

      expect(dataScopeService.getDataScopeFilter).toHaveBeenCalledWith('user-123', 'device');

      const request = context.switchToHttp().getRequest();
      expect(request.dataScopeFilter).toEqual({ tenantId: 'tenant-1' });
    });

    it('should handle self-only scope filter', async () => {
      const context = createMockContext({ id: 'user-123' }, { [DATA_SCOPE_RESOURCE_KEY]: 'user' });
      const next = createMockCallHandler();

      mockDataScopeService.getDataScopeFilter.mockResolvedValue({
        id: 'user-123',
      });

      await interceptor.intercept(context, next);

      const request = context.switchToHttp().getRequest();
      expect(request.dataScopeFilter).toEqual({ id: 'user-123' });
    });

    it('should handle department-scoped filter', async () => {
      const context = createMockContext(
        { id: 'user-123', departmentId: 'dept-1' },
        { [DATA_SCOPE_RESOURCE_KEY]: 'report' }
      );
      const next = createMockCallHandler();

      mockDataScopeService.getDataScopeFilter.mockResolvedValue({
        departmentId: 'dept-1',
      });

      await interceptor.intercept(context, next);

      const request = context.switchToHttp().getRequest();
      expect(request.dataScopeFilter).toEqual({ departmentId: 'dept-1' });
    });

    it('should handle multiple sequential requests', async () => {
      // Test 1: device resource
      const context1 = createMockContext({ id: 'user-1' }, { [DATA_SCOPE_RESOURCE_KEY]: 'device' });
      mockDataScopeService.getDataScopeFilter.mockResolvedValue({ tenantId: 'tenant-1' });
      await interceptor.intercept(context1, createMockCallHandler());
      expect(dataScopeService.getDataScopeFilter).toHaveBeenCalledWith('user-1', 'device');

      jest.clearAllMocks();

      // Test 2: user resource
      const context2 = createMockContext({ id: 'user-2' }, { [DATA_SCOPE_RESOURCE_KEY]: 'user' });
      mockDataScopeService.getDataScopeFilter.mockResolvedValue({ id: 'user-2' });
      await interceptor.intercept(context2, createMockCallHandler());
      expect(dataScopeService.getDataScopeFilter).toHaveBeenCalledWith('user-2', 'user');

      jest.clearAllMocks();

      // Test 3: report resource
      const context3 = createMockContext({ id: 'user-3' }, { [DATA_SCOPE_RESOURCE_KEY]: 'report' });
      mockDataScopeService.getDataScopeFilter.mockResolvedValue({ departmentId: 'dept-1' });
      await interceptor.intercept(context3, createMockCallHandler());
      expect(dataScopeService.getDataScopeFilter).toHaveBeenCalledWith('user-3', 'report');
    });
  });

  describe('Logging', () => {
    it('should log debug message when filter is applied', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { [DATA_SCOPE_RESOURCE_KEY]: 'device' }
      );
      const next = createMockCallHandler();

      mockDataScopeService.getDataScopeFilter.mockResolvedValue({
        tenantId: 'tenant-1',
      });

      await interceptor.intercept(context, next);

      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        expect.stringContaining('已为用户 user-123 应用 device 的数据范围过滤')
      );
    });

    it('should log error when filter application fails', async () => {
      const context = createMockContext(
        { id: 'user-123' },
        { [DATA_SCOPE_RESOURCE_KEY]: 'device' }
      );
      const next = createMockCallHandler();

      const error = new Error('Database connection failed');
      mockDataScopeService.getDataScopeFilter.mockRejectedValue(error);

      await interceptor.intercept(context, next);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('应用数据范围过滤失败: Database connection failed'),
        expect.any(String)
      );
    });
  });
});
