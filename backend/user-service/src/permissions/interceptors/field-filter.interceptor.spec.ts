import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import {
  FieldFilterInterceptor,
  FIELD_FILTER_RESOURCE_KEY,
  FIELD_FILTER_OPERATION_KEY,
  SKIP_FIELD_FILTER_KEY,
} from './field-filter.interceptor';
import { FieldFilterService } from '../field-filter.service';
import { OperationType } from '../../entities/field-permission.entity';

describe('FieldFilterInterceptor', () => {
  let interceptor: FieldFilterInterceptor;
  let reflector: Reflector;
  let fieldFilterService: jest.Mocked<FieldFilterService>;

  // Mock services
  const mockFieldFilterService = {
    filterFields: jest.fn(),
    filterFieldsArray: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FieldFilterInterceptor,
        Reflector,
        {
          provide: FieldFilterService,
          useValue: mockFieldFilterService,
        },
      ],
    }).compile();

    // Suppress logger output during tests
    Logger.prototype.log = jest.fn();
    Logger.prototype.error = jest.fn();
    Logger.prototype.warn = jest.fn();
    Logger.prototype.debug = jest.fn();

    interceptor = module.get<FieldFilterInterceptor>(FieldFilterInterceptor);
    reflector = module.get<Reflector>(Reflector);
    fieldFilterService = module.get(FieldFilterService);
  });

  /**
   * Helper function to create mock ExecutionContext
   */
  function createMockContext(
    user: any | null,
    metadata: Record<string, any> = {}
  ): ExecutionContext {
    const mockRequest = {
      user: user !== null ? user : undefined,
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

  describe('@SkipFieldFilter', () => {
    it('should skip field filtering when skipFieldFilter is true', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        {
          [SKIP_FIELD_FILTER_KEY]: true,
          [FIELD_FILTER_RESOURCE_KEY]: 'user',
        }
      );
      const responseData = { id: '1', password: 'secret' };
      const next = createMockCallHandler(responseData);

      interceptor.intercept(context, next).subscribe((data) => {
        // Should not filter
        expect(data).toEqual(responseData);
        expect(fieldFilterService.filterFields).not.toHaveBeenCalled();
        done();
      });
    });

    it('should continue filtering when skipFieldFilter is false', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        {
          [SKIP_FIELD_FILTER_KEY]: false,
          [FIELD_FILTER_RESOURCE_KEY]: 'user',
        }
      );
      const responseData = { id: '1', name: 'John', password: 'secret' };
      const filteredData = { id: '1', name: 'John' };
      const next = createMockCallHandler(responseData);

      mockFieldFilterService.filterFields.mockResolvedValue(filteredData);

      interceptor.intercept(context, next).subscribe(async (data) => {
        const result = await data;
        expect(fieldFilterService.filterFields).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('@FieldFilterResource', () => {
    it('should not apply filter when resource type is not configured', (done) => {
      const context = createMockContext({ id: 'user-123' }, {});
      const responseData = { id: '1', password: 'secret' };
      const next = createMockCallHandler(responseData);

      interceptor.intercept(context, next).subscribe((data) => {
        expect(data).toEqual(responseData);
        expect(fieldFilterService.filterFields).not.toHaveBeenCalled();
        done();
      });
    });

    it('should apply filter when resource type is configured', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const responseData = { id: '1', password: 'secret' };
      const filteredData = { id: '1' };
      const next = createMockCallHandler(responseData);

      mockFieldFilterService.filterFields.mockResolvedValue(filteredData);

      interceptor.intercept(context, next).subscribe(async (data) => {
        const result = await data;
        expect(result).toEqual(filteredData);
        done();
      });
    });
  });

  describe('@FieldFilterOperation', () => {
    it('should use VIEW operation by default', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const responseData = { id: '1' };
      const next = createMockCallHandler(responseData);

      mockFieldFilterService.filterFields.mockResolvedValue(responseData);

      interceptor.intercept(context, next).subscribe(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(fieldFilterService.filterFields).toHaveBeenCalledWith(
          'user-123',
          'user',
          responseData,
          OperationType.VIEW
        );
        done();
      });
    });

    it('should use specified operation type', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        {
          [FIELD_FILTER_RESOURCE_KEY]: 'user',
          [FIELD_FILTER_OPERATION_KEY]: OperationType.CREATE,
        }
      );
      const responseData = { id: '1' };
      const next = createMockCallHandler(responseData);

      mockFieldFilterService.filterFields.mockResolvedValue(responseData);

      interceptor.intercept(context, next).subscribe(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(fieldFilterService.filterFields).toHaveBeenCalledWith(
          'user-123',
          'user',
          responseData,
          OperationType.CREATE
        );
        done();
      });
    });

    it('should handle different operation types', (done) => {
      const operations = [
        OperationType.VIEW,
        OperationType.CREATE,
        OperationType.UPDATE,
        OperationType.DELETE,
      ];

      let completed = 0;

      operations.forEach((op) => {
        const context = createMockContext(
          { id: 'user-123' },
          {
            [FIELD_FILTER_RESOURCE_KEY]: 'user',
            [FIELD_FILTER_OPERATION_KEY]: op,
          }
        );
        const next = createMockCallHandler({ id: '1' });
        mockFieldFilterService.filterFields.mockResolvedValue({ id: '1' });

        interceptor.intercept(context, next).subscribe(() => {
          completed++;
          if (completed === operations.length) {
            done();
          }
        });
      });
    });
  });

  describe('User Authentication', () => {
    it('should skip filtering when user is undefined', (done) => {
      const context = createMockContext(null, { [FIELD_FILTER_RESOURCE_KEY]: 'user' });
      const responseData = { id: '1', password: 'secret' };
      const next = createMockCallHandler(responseData);

      interceptor.intercept(context, next).subscribe((data) => {
        expect(data).toEqual(responseData);
        expect(fieldFilterService.filterFields).not.toHaveBeenCalled();
        done();
      });
    });

    it('should skip filtering when user.id is missing', (done) => {
      const context = createMockContext(
        { username: 'testuser' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const responseData = { id: '1', password: 'secret' };
      const next = createMockCallHandler(responseData);

      interceptor.intercept(context, next).subscribe((data) => {
        expect(data).toEqual(responseData);
        expect(fieldFilterService.filterFields).not.toHaveBeenCalled();
        done();
      });
    });

    it('should apply filtering when user has valid id', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const responseData = { id: '1' };
      const next = createMockCallHandler(responseData);

      mockFieldFilterService.filterFields.mockResolvedValue(responseData);

      interceptor.intercept(context, next).subscribe(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(fieldFilterService.filterFields).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('Single Object Response', () => {
    it('should filter single object response', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const responseData = { id: '1', name: 'John', password: 'secret', ssn: '123-45-6789' };
      const filteredData = { id: '1', name: 'John' };
      const next = createMockCallHandler(responseData);

      mockFieldFilterService.filterFields.mockResolvedValue(filteredData);

      interceptor.intercept(context, next).subscribe(async (data) => {
        const result = await data;
        expect(result).toEqual(filteredData);
        expect(fieldFilterService.filterFields).toHaveBeenCalledWith(
          'user-123',
          'user',
          responseData,
          OperationType.VIEW
        );
        done();
      });
    });

    it('should handle null response', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const next = createMockCallHandler(null);

      interceptor.intercept(context, next).subscribe(async (data) => {
        const result = await data;
        expect(result).toBeNull();
        expect(fieldFilterService.filterFields).not.toHaveBeenCalled();
        done();
      });
    });

    it('should handle undefined response', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const next = createMockCallHandler(undefined);

      interceptor.intercept(context, next).subscribe(async (data) => {
        const result = await data;
        expect(result).toBeUndefined();
        expect(fieldFilterService.filterFields).not.toHaveBeenCalled();
        done();
      });
    });
  });

  describe('Array Response', () => {
    it('should filter array response', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const responseData = [
        { id: '1', name: 'John', password: 'secret1' },
        { id: '2', name: 'Jane', password: 'secret2' },
      ];
      const filteredData = [
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ];
      const next = createMockCallHandler(responseData);

      mockFieldFilterService.filterFieldsArray.mockResolvedValue(filteredData);

      interceptor.intercept(context, next).subscribe(async (data) => {
        const result = await data;
        expect(result).toEqual(filteredData);
        expect(fieldFilterService.filterFieldsArray).toHaveBeenCalledWith(
          'user-123',
          'user',
          responseData,
          OperationType.VIEW
        );
        done();
      });
    });

    it('should handle empty array', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const responseData: any[] = [];
      const next = createMockCallHandler(responseData);

      mockFieldFilterService.filterFieldsArray.mockResolvedValue([]);

      interceptor.intercept(context, next).subscribe(async (data) => {
        const result = await data;
        expect(result).toEqual([]);
        expect(fieldFilterService.filterFieldsArray).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('Paginated Response', () => {
    it('should filter paginated data with "data" field', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const responseData = {
        data: [
          { id: '1', name: 'John', password: 'secret1' },
          { id: '2', name: 'Jane', password: 'secret2' },
        ],
        total: 2,
        page: 1,
        pageSize: 10,
      };
      const filteredArray = [
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ];
      const next = createMockCallHandler(responseData);

      mockFieldFilterService.filterFieldsArray.mockResolvedValue(filteredArray);

      interceptor.intercept(context, next).subscribe(async (data) => {
        const result = await data;
        expect(result.data).toEqual(filteredArray);
        expect(result.total).toBe(2);
        expect(fieldFilterService.filterFieldsArray).toHaveBeenCalledWith(
          'user-123',
          'user',
          responseData.data,
          OperationType.VIEW
        );
        done();
      });
    });

    it('should filter paginated data with "items" field', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const responseData = {
        items: [{ id: '1', password: 'secret' }],
        total: 1,
      };
      const filteredArray = [{ id: '1' }];
      const next = createMockCallHandler(responseData);

      mockFieldFilterService.filterFieldsArray.mockResolvedValue(filteredArray);

      interceptor.intercept(context, next).subscribe(async (data) => {
        const result = await data;
        expect(result.items).toEqual(filteredArray);
        done();
      });
    });

    it('should filter paginated data with "list" field', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const responseData = {
        list: [{ id: '1', password: 'secret' }],
        pageSize: 10,
      };
      const filteredArray = [{ id: '1' }];
      const next = createMockCallHandler(responseData);

      mockFieldFilterService.filterFieldsArray.mockResolvedValue(filteredArray);

      interceptor.intercept(context, next).subscribe(async (data) => {
        const result = await data;
        expect(result.list).toEqual(filteredArray);
        done();
      });
    });

    it('should preserve pagination metadata', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const responseData = {
        data: [{ id: '1' }],
        total: 100,
        page: 2,
        pageSize: 20,
        hasNext: true,
        hasPrev: true,
      };
      const filteredArray = [{ id: '1' }];
      const next = createMockCallHandler(responseData);

      mockFieldFilterService.filterFieldsArray.mockResolvedValue(filteredArray);

      interceptor.intercept(context, next).subscribe(async (data) => {
        const result = await data;
        expect(result.total).toBe(100);
        expect(result.page).toBe(2);
        expect(result.pageSize).toBe(20);
        expect(result.hasNext).toBe(true);
        expect(result.hasPrev).toBe(true);
        done();
      });
    });
  });

  describe('Primitive Response', () => {
    it('should not filter string response', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const responseData = 'success';
      const next = createMockCallHandler(responseData);

      interceptor.intercept(context, next).subscribe(async (data) => {
        const result = await data;
        expect(result).toBe('success');
        expect(fieldFilterService.filterFields).not.toHaveBeenCalled();
        done();
      });
    });

    it('should not filter number response', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const responseData = 42;
      const next = createMockCallHandler(responseData);

      interceptor.intercept(context, next).subscribe(async (data) => {
        const result = await data;
        expect(result).toBe(42);
        expect(fieldFilterService.filterFields).not.toHaveBeenCalled();
        done();
      });
    });

    it('should not filter boolean response', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const responseData = true;
      const next = createMockCallHandler(responseData);

      interceptor.intercept(context, next).subscribe(async (data) => {
        const result = await data;
        expect(result).toBe(true);
        expect(fieldFilterService.filterFields).not.toHaveBeenCalled();
        done();
      });
    });
  });

  describe('Error Handling', () => {
    it('should return original data when filtering fails', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const responseData = { id: '1', password: 'secret' };
      const next = createMockCallHandler(responseData);

      mockFieldFilterService.filterFields.mockRejectedValue(new Error('Service error'));

      interceptor.intercept(context, next).subscribe(async (data) => {
        const result = await data;
        // Should return original data on error
        expect(result).toEqual(responseData);
        expect(Logger.prototype.error).toHaveBeenCalledWith(
          expect.stringContaining('过滤响应字段失败'),
          expect.any(String)
        );
        done();
      });
    });

    it('should handle array filtering errors gracefully', (done) => {
      const context = createMockContext(
        { id: 'user-123' },
        { [FIELD_FILTER_RESOURCE_KEY]: 'user' }
      );
      const responseData = [{ id: '1', password: 'secret' }];
      const next = createMockCallHandler(responseData);

      mockFieldFilterService.filterFieldsArray.mockRejectedValue(new Error('Array filter error'));

      interceptor.intercept(context, next).subscribe(async (data) => {
        const result = await data;
        expect(result).toEqual(responseData);
        done();
      });
    });
  });
});
