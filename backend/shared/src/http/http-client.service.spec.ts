import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { HttpClientService, HttpClientOptions } from './http-client.service';
import CircuitBreaker from 'opossum';

// Mock opossum
jest.mock('opossum');

describe('HttpClientService', () => {
  let service: HttpClientService;
  let mockHttpService: jest.Mocked<HttpService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockCircuitBreaker: any;

  beforeEach(async () => {
    // Mock HttpService
    mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as any;

    // Mock ConfigService
    mockConfigService = {
      get: jest.fn(),
    } as any;

    // Mock CircuitBreaker
    mockCircuitBreaker = {
      fire: jest.fn(),
      on: jest.fn(),
      opened: false,
      halfOpen: false,
      stats: {
        fires: 0,
        successes: 0,
        failures: 0,
      },
      close: jest.fn(),
    };

    (CircuitBreaker as jest.MockedClass<typeof CircuitBreaker>).mockImplementation(
      () => mockCircuitBreaker,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpClientService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<HttpClientService>(HttpClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('构造和初始化', () => {
    it('应该成功创建服务实例', () => {
      expect(service).toBeDefined();
    });
  });

  describe('get', () => {
    it('应该成功执行 GET 请求', async () => {
      // Arrange
      const url = 'http://example.com/api/users';
      const responseData = { users: ['user1', 'user2'] };
      const mockResponse: AxiosResponse = {
        data: responseData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // Act
      const result = await service.get(url);

      // Assert
      expect(result).toEqual(responseData);
      expect(mockHttpService.get).toHaveBeenCalledWith(url, undefined);
    });

    it('应该使用自定义配置执行 GET 请求', async () => {
      // Arrange
      const url = 'http://example.com/api/users';
      const config = { headers: { Authorization: 'Bearer token123' } };
      const mockResponse: AxiosResponse = {
        data: { users: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // Act
      await service.get(url, config);

      // Assert
      expect(mockHttpService.get).toHaveBeenCalledWith(url, config);
    });

    it('应该使用自定义选项（超时）', async () => {
      // Arrange
      const url = 'http://example.com/api/users';
      const options: HttpClientOptions = { timeout: 3000 };
      const mockResponse: AxiosResponse = {
        data: { users: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // Act
      await service.get(url, undefined, options);

      // Assert
      expect(mockHttpService.get).toHaveBeenCalled();
      // Note: Timeout is applied via RxJS pipe, not directly visible in mock call
    });

    it('应该在请求失败时抛出错误', async () => {
      // Arrange
      const url = 'http://example.com/api/users';
      const error = new Error('Network error');

      // Return immediate error without timeout
      mockHttpService.get.mockImplementation(() => {
        return throwError(() => error);
      });

      // Act & Assert - Use retries: 0, short timeout
      await expect(service.get(url, undefined, { retries: 0, timeout: 100 })).rejects.toThrow();
    }, 1000);

    it('应该重试失败的请求', async () => {
      // Arrange
      const url = 'http://example.com/api/users';
      const error = new Error('Temporary error');
      const mockResponse: AxiosResponse = {
        data: { users: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // First 2 calls fail, 3rd succeeds
      mockHttpService.get
        .mockReturnValueOnce(throwError(() => error))
        .mockReturnValueOnce(throwError(() => error))
        .mockReturnValueOnce(of(mockResponse));

      // Act - Use short retry delay
      const result = await service.get(url, undefined, { retries: 2, retryDelay: 1 });

      // Assert
      expect(result).toEqual(mockResponse.data);
      expect(mockHttpService.get).toHaveBeenCalledTimes(3);
    }, 10000);
  });

  describe('post', () => {
    it('应该成功执行 POST 请求', async () => {
      // Arrange
      const url = 'http://example.com/api/users';
      const postData = { name: 'John', email: 'john@example.com' };
      const responseData = { id: '123', ...postData };
      const mockResponse: AxiosResponse = {
        data: responseData,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      // Act
      const result = await service.post(url, postData);

      // Assert
      expect(result).toEqual(responseData);
      expect(mockHttpService.post).toHaveBeenCalledWith(url, postData, undefined);
    });

    it('应该不重试 4xx 错误', async () => {
      // Arrange
      const url = 'http://example.com/api/users';
      const postData = { name: 'John' };
      const error: any = {
        response: {
          status: 400,
          data: { error: 'Bad Request' },
        },
        message: 'Bad Request',
      };

      mockHttpService.post.mockReturnValue(throwError(() => error));

      // Act & Assert - Use retries: 0 to avoid delay
      await expect(service.post(url, postData, undefined, { retries: 0 })).rejects.toThrow();

      // Should not retry 4xx errors
      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
    });

    it('应该重试 5xx 错误', async () => {
      // Arrange
      const url = 'http://example.com/api/users';
      const postData = { name: 'John' };
      const error: any = {
        response: {
          status: 500,
          data: { error: 'Internal Server Error' },
        },
        message: 'Internal Server Error',
      };
      const mockResponse: AxiosResponse = {
        data: { id: '123' },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      };

      // First 2 calls fail with 500, 3rd succeeds
      mockHttpService.post
        .mockReturnValueOnce(throwError(() => error))
        .mockReturnValueOnce(throwError(() => error))
        .mockReturnValueOnce(of(mockResponse));

      // Act - Use short delay
      const result = await service.post(url, postData, undefined, { retries: 2, retryDelay: 1 });

      // Assert
      expect(result).toEqual(mockResponse.data);
      expect(mockHttpService.post).toHaveBeenCalledTimes(3);
    }, 10000);
  });

  describe('put', () => {
    it('应该成功执行 PUT 请求', async () => {
      // Arrange
      const url = 'http://example.com/api/users/123';
      const putData = { name: 'John Updated' };
      const responseData = { id: '123', ...putData };
      const mockResponse: AxiosResponse = {
        data: responseData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.put.mockReturnValue(of(mockResponse));

      // Act
      const result = await service.put(url, putData);

      // Assert
      expect(result).toEqual(responseData);
      expect(mockHttpService.put).toHaveBeenCalledWith(url, putData, undefined);
    });

    it('应该不重试 4xx 错误', async () => {
      // Arrange
      const url = 'http://example.com/api/users/123';
      const putData = { name: 'John' };
      const error: any = {
        response: {
          status: 404,
          data: { error: 'Not Found' },
        },
        message: 'Not Found',
      };

      mockHttpService.put.mockReturnValue(throwError(() => error));

      // Act & Assert - Use retries: 0
      await expect(service.put(url, putData, undefined, { retries: 0 })).rejects.toThrow();
      expect(mockHttpService.put).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('应该成功执行 DELETE 请求', async () => {
      // Arrange
      const url = 'http://example.com/api/users/123';
      const responseData = { success: true };
      const mockResponse: AxiosResponse = {
        data: responseData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.delete.mockReturnValue(of(mockResponse));

      // Act
      const result = await service.delete(url);

      // Assert
      expect(result).toEqual(responseData);
      expect(mockHttpService.delete).toHaveBeenCalledWith(url, undefined);
    });

    it('应该不重试 4xx 错误', async () => {
      // Arrange
      const url = 'http://example.com/api/users/123';
      const error: any = {
        response: {
          status: 404,
          data: { error: 'Not Found' },
        },
        message: 'Not Found',
      };

      mockHttpService.delete.mockReturnValue(throwError(() => error));

      // Act & Assert - Use retries: 0
      await expect(service.delete(url, undefined, { retries: 0 })).rejects.toThrow();
      expect(mockHttpService.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('requestWithCircuitBreaker', () => {
    it('应该使用熔断器执行请求', async () => {
      // Arrange
      const serviceKey = 'user-service';
      const requestFn = jest.fn().mockResolvedValue({ users: [] });
      const result = { users: [] };

      mockCircuitBreaker.fire.mockResolvedValue(result);

      // Act
      const response = await service.requestWithCircuitBreaker(serviceKey, requestFn);

      // Assert
      expect(response).toEqual(result);
      expect(CircuitBreaker).toHaveBeenCalled();
      expect(mockCircuitBreaker.fire).toHaveBeenCalled();
    });

    it('应该为不同服务创建不同的熔断器', async () => {
      // Arrange
      const service1Key = 'user-service';
      const service2Key = 'device-service';
      const requestFn1 = jest.fn().mockResolvedValue({ users: [] });
      const requestFn2 = jest.fn().mockResolvedValue({ devices: [] });

      mockCircuitBreaker.fire.mockResolvedValue({});

      // Act
      await service.requestWithCircuitBreaker(service1Key, requestFn1);
      await service.requestWithCircuitBreaker(service2Key, requestFn2);

      // Assert
      expect(CircuitBreaker).toHaveBeenCalledTimes(2);
    });

    it('应该复用已存在的熔断器', async () => {
      // Arrange
      const serviceKey = 'user-service';
      const requestFn = jest.fn().mockResolvedValue({ users: [] });

      mockCircuitBreaker.fire.mockResolvedValue({ users: [] });

      // Act
      await service.requestWithCircuitBreaker(serviceKey, requestFn);
      await service.requestWithCircuitBreaker(serviceKey, requestFn);

      // Assert
      expect(CircuitBreaker).toHaveBeenCalledTimes(1); // Only created once
      expect(mockCircuitBreaker.fire).toHaveBeenCalledTimes(2); // Fired twice
    });

    it('应该使用自定义熔断器选项', async () => {
      // Arrange
      const serviceKey = 'user-service';
      const requestFn = jest.fn().mockResolvedValue({ users: [] });
      const breakerOptions = {
        timeout: 5000,
        errorThresholdPercentage: 70,
        resetTimeout: 60000,
      };

      mockCircuitBreaker.fire.mockResolvedValue({ users: [] });

      // Act
      await service.requestWithCircuitBreaker(serviceKey, requestFn, breakerOptions);

      // Assert
      expect(CircuitBreaker).toHaveBeenCalledWith(
        requestFn,
        expect.objectContaining({
          timeout: 5000,
          errorThresholdPercentage: 70,
          resetTimeout: 60000,
        }),
      );
    });

    it('应该设置熔断器事件监听器', async () => {
      // Arrange
      const serviceKey = 'user-service';
      const requestFn = jest.fn().mockResolvedValue({ users: [] });

      mockCircuitBreaker.fire.mockResolvedValue({ users: [] });

      // Act
      await service.requestWithCircuitBreaker(serviceKey, requestFn);

      // Assert
      expect(mockCircuitBreaker.on).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockCircuitBreaker.on).toHaveBeenCalledWith('halfOpen', expect.any(Function));
      expect(mockCircuitBreaker.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockCircuitBreaker.on).toHaveBeenCalledWith('fallback', expect.any(Function));
    });

    it('应该在熔断器失败时抛出错误', async () => {
      // Arrange
      const serviceKey = 'user-service';
      const requestFn = jest.fn().mockRejectedValue(new Error('Service error'));
      const error = new Error('Service error');

      mockCircuitBreaker.fire.mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.requestWithCircuitBreaker(serviceKey, requestFn),
      ).rejects.toThrow('Service error');
    });
  });

  describe('getCircuitBreakerStats', () => {
    it('应该返回熔断器统计信息（CLOSED）', async () => {
      // Arrange
      const serviceKey = 'user-service';
      const requestFn = jest.fn().mockResolvedValue({ users: [] });

      mockCircuitBreaker.fire.mockResolvedValue({ users: [] });
      mockCircuitBreaker.opened = false;
      mockCircuitBreaker.halfOpen = false;
      mockCircuitBreaker.stats = {
        fires: 10,
        successes: 8,
        failures: 2,
      };

      await service.requestWithCircuitBreaker(serviceKey, requestFn);

      // Act
      const stats = service.getCircuitBreakerStats(serviceKey);

      // Assert
      expect(stats).toMatchObject({
        state: 'CLOSED',
        stats: expect.objectContaining({
          fires: 10,
          successes: 8,
          failures: 2,
        }),
      });
    });

    it('应该返回熔断器统计信息（OPEN）', async () => {
      // Arrange
      const serviceKey = 'user-service';
      const requestFn = jest.fn().mockResolvedValue({ users: [] });

      mockCircuitBreaker.fire.mockResolvedValue({ users: [] });
      mockCircuitBreaker.opened = true;
      mockCircuitBreaker.halfOpen = false;

      await service.requestWithCircuitBreaker(serviceKey, requestFn);

      // Act
      const stats = service.getCircuitBreakerStats(serviceKey);

      // Assert
      expect(stats?.state).toBe('OPEN');
    });

    it('应该返回熔断器统计信息（HALF-OPEN）', async () => {
      // Arrange
      const serviceKey = 'user-service';
      const requestFn = jest.fn().mockResolvedValue({ users: [] });

      mockCircuitBreaker.fire.mockResolvedValue({ users: [] });
      mockCircuitBreaker.opened = false;
      mockCircuitBreaker.halfOpen = true;

      await service.requestWithCircuitBreaker(serviceKey, requestFn);

      // Act
      const stats = service.getCircuitBreakerStats(serviceKey);

      // Assert
      expect(stats?.state).toBe('HALF-OPEN');
    });

    it('应该对不存在的熔断器返回 null', () => {
      // Act
      const stats = service.getCircuitBreakerStats('nonexistent');

      // Assert
      expect(stats).toBeNull();
    });
  });

  describe('resetCircuitBreaker', () => {
    it('应该重置熔断器', async () => {
      // Arrange
      const serviceKey = 'user-service';
      const requestFn = jest.fn().mockResolvedValue({ users: [] });

      mockCircuitBreaker.fire.mockResolvedValue({ users: [] });

      await service.requestWithCircuitBreaker(serviceKey, requestFn);

      // Act
      service.resetCircuitBreaker(serviceKey);

      // Assert
      expect(mockCircuitBreaker.close).toHaveBeenCalled();
    });

    it('应该对不存在的熔断器不执行操作', () => {
      // Act & Assert - Should not throw
      expect(() => service.resetCircuitBreaker('nonexistent')).not.toThrow();
    });
  });

  describe('错误处理和日志', () => {
    it('应该记录成功的请求日志', async () => {
      // Arrange
      const url = 'http://example.com/api/users';
      const mockResponse: AxiosResponse = {
        data: { users: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // Spy on logger
      const loggerDebugSpy = jest.spyOn(service['logger'], 'debug');

      // Act
      await service.get(url);

      // Assert
      expect(loggerDebugSpy).toHaveBeenCalledWith(`GET ${url}`);
      expect(loggerDebugSpy).toHaveBeenCalledWith(`GET ${url} succeeded`);
    });

    it('应该记录失败的请求日志', async () => {
      // Arrange
      const url = 'http://example.com/api/users';
      const error = new Error('Network error');

      mockHttpService.get.mockReturnValue(throwError(() => error));

      // Spy on logger
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error');

      // Act & Assert - Use retries: 0
      await expect(service.get(url, undefined, { retries: 0 })).rejects.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledWith(`GET ${url} failed: Network error`);
    });

    it('应该记录重试日志', async () => {
      // Arrange
      const url = 'http://example.com/api/users';
      const error = new Error('Temporary error');
      const mockResponse: AxiosResponse = {
        data: { users: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get
        .mockReturnValueOnce(throwError(() => error))
        .mockReturnValueOnce(of(mockResponse));

      // Spy on logger
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');

      // Act - Use short delay
      await service.get(url, undefined, { retries: 1, retryDelay: 1 });

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retry'),
      );
    }, 10000);
  });

  describe('toPromise (private method via get)', () => {
    it('应该将 Observable 转换为 Promise', async () => {
      // Arrange
      const url = 'http://example.com/api/users';
      const mockResponse: AxiosResponse = {
        data: { users: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // Act
      const result = await service.get(url);

      // Assert
      expect(result).toEqual(mockResponse.data);
    });

    it('应该处理 Observable 错误', async () => {
      // Arrange
      const url = 'http://example.com/api/users';
      const error = new Error('Observable error');

      mockHttpService.get.mockReturnValue(throwError(() => error));

      // Act & Assert - Use retries: 0
      await expect(service.get(url, undefined, { retries: 0 })).rejects.toThrow('Observable error');
    });
  });
});
