import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { ConsulService } from '@cloudphone/shared';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';

describe('ProxyService', () => {
  let service: ProxyService;
  let httpService: HttpService;
  let consulService: ConsulService;
  let configService: ConfigService;

  const mockHttpService = {
    axiosRef: {
      request: jest.fn(),
      get: jest.fn(),
    },
  };

  const mockConsulService = {
    getService: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'USE_CONSUL') return 'false';
      if (key === 'USER_SERVICE_URL') return 'http://localhost:30001';
      if (key === 'DEVICE_SERVICE_URL') return 'http://localhost:30002';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxyService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConsulService,
          useValue: mockConsulService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ProxyService>(ProxyService);
    httpService = module.get<HttpService>(HttpService);
    consulService = module.get<ConsulService>(ConsulService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('proxyRequest', () => {
    it('should proxy GET request successfully', (done) => {
      const mockResponse: AxiosResponse = {
        data: { message: 'Success' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.axiosRef.request.mockResolvedValue(mockResponse);

      service.proxyRequest('users', '/api/users', 'GET').subscribe({
        next: (result) => {
          expect(result).toEqual({ message: 'Success' });
          expect(mockHttpService.axiosRef.request).toHaveBeenCalledWith(
            expect.objectContaining({
              method: 'GET',
              url: 'http://localhost:30001/api/users',
            })
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should proxy POST request with data', (done) => {
      const mockResponse: AxiosResponse = {
        data: { id: 1, name: 'Test User' },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      };

      mockHttpService.axiosRef.request.mockResolvedValue(mockResponse);

      const postData = { name: 'Test User', email: 'test@example.com' };

      service.proxyRequest('users', '/api/users', 'POST', postData).subscribe({
        next: (result) => {
          expect(result).toEqual({ id: 1, name: 'Test User' });
          expect(mockHttpService.axiosRef.request).toHaveBeenCalledWith(
            expect.objectContaining({
              method: 'POST',
              data: postData,
            })
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should handle service not found error', (done) => {
      service.proxyRequest('nonexistent', '/api/test', 'GET').subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error) => {
          expect(error).toBeInstanceOf(HttpException);
          expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
          done();
        },
      });
    });

    it('should handle service unavailable error', (done) => {
      const axiosError: Partial<AxiosError> = {
        message: 'Connection refused',
        response: {
          status: 503,
          data: { message: 'Service unavailable' },
        } as any,
      };

      mockHttpService.axiosRef.request.mockRejectedValue(axiosError);

      service.proxyRequest('users', '/api/users', 'GET').subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error) => {
          expect(error).toBeInstanceOf(HttpException);
          expect(error.getStatus()).toBe(503);
          done();
        },
      });
    });
  });

  describe('checkServicesHealth', () => {
    it('should check all services and return health status', async () => {
      mockHttpService.axiosRef.get
        .mockResolvedValueOnce({ status: 200 }) // user-service
        .mockResolvedValueOnce({ status: 200 }) // device-service
        .mockRejectedValueOnce(new Error('Connection refused')); // app-service

      const result = await service.checkServicesHealth();

      expect(result).toBeDefined();
      expect(result.users).toBeDefined();
      expect(result.users.status).toBe('healthy');
      expect(result.devices).toBeDefined();
      expect(result.devices.status).toBe('healthy');
      expect(result.apps).toBeDefined();
      expect(result.apps.status).toBe('unhealthy');
    });

    it('should include response time for healthy services', async () => {
      mockHttpService.axiosRef.get.mockResolvedValue({ status: 200 });

      const result = await service.checkServicesHealth();

      expect(result.users.responseTime).toBeDefined();
      expect(result.users.responseTime).toMatch(/\d+ms/);
    });
  });

  describe('getServiceConfig', () => {
    it('should return service configuration', () => {
      const config = service.getServiceConfig('users');

      expect(config).toBeDefined();
      expect(config?.name).toBe('User Service');
      expect(config?.url).toBe('http://localhost:30001');
      expect(config?.healthCheck).toBe('/health');
    });

    it('should return undefined for non-existent service', () => {
      const config = service.getServiceConfig('nonexistent');

      expect(config).toBeUndefined();
    });
  });

  describe('getAllServices', () => {
    it('should return all service configurations', () => {
      const services = service.getAllServices();

      expect(services).toBeInstanceOf(Map);
      expect(services.size).toBeGreaterThan(0);
      expect(services.has('users')).toBe(true);
      expect(services.has('devices')).toBe(true);
      expect(services.has('billing')).toBe(true);
    });
  });
});
