import { Test, TestingModule } from '@nestjs/testing';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';
import { Request, Response } from 'express';
import { of } from 'rxjs';

describe('ProxyController', () => {
  let controller: ProxyController;
  let proxyService: any;

  const mockProxyService = {
    getCircuitBreakerStats: jest.fn(),
    clearServiceUrlCache: jest.fn(),
    checkServicesHealth: jest.fn(),
    proxyRequest: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyController],
      providers: [
        {
          provide: ProxyService,
          useValue: mockProxyService,
        },
      ],
    }).compile();

    controller = module.get<ProxyController>(ProxyController);
    proxyService = module.get(ProxyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCircuitBreakerStats', () => {
    it('should return circuit breaker statistics', async () => {
      const mockStats = {
        'user-service': {
          state: 'CLOSED',
          failures: 0,
          successRate: 100,
        },
        'device-service': {
          state: 'CLOSED',
          failures: 0,
          successRate: 100,
        },
      };

      proxyService.getCircuitBreakerStats.mockReturnValue(mockStats);

      const result: any = await controller.getCircuitBreakerStats();

      expect(result.circuitBreakers).toEqual(mockStats);
      expect(result.timestamp).toBeDefined();
      expect(proxyService.getCircuitBreakerStats).toHaveBeenCalled();
    });

    it('should handle open circuit breakers', async () => {
      const mockStats = {
        'user-service': {
          state: 'OPEN',
          failures: 10,
          successRate: 45,
        },
      };

      proxyService.getCircuitBreakerStats.mockReturnValue(mockStats);

      const result: any = await controller.getCircuitBreakerStats();

      expect(result.circuitBreakers['user-service'].state).toBe('OPEN');
      expect(result.circuitBreakers['user-service'].failures).toBe(10);
    });

    it('should handle half-open circuit breakers', async () => {
      const mockStats = {
        'billing-service': {
          state: 'HALF_OPEN',
          failures: 5,
          successRate: 70,
        },
      };

      proxyService.getCircuitBreakerStats.mockReturnValue(mockStats);

      const result: any = await controller.getCircuitBreakerStats();

      expect(result.circuitBreakers['billing-service'].state).toBe('HALF_OPEN');
    });
  });

  describe('clearServiceCache', () => {
    it('should clear cache for specific service', async () => {
      const mockReq: any = {
        query: {
          service: 'user-service',
        },
      };

      const result = await controller.clearServiceCache(mockReq);

      expect(result.success).toBe(true);
      expect(result.message).toContain('user-service');
      expect(result.timestamp).toBeDefined();
      expect(proxyService.clearServiceUrlCache).toHaveBeenCalledWith('user-service');
    });

    it('should clear all service caches when no service specified', async () => {
      const mockReq: any = {
        query: {},
      };

      const result = await controller.clearServiceCache(mockReq);

      expect(result.success).toBe(true);
      expect(result.message).toContain('all service URL caches');
      expect(proxyService.clearServiceUrlCache).toHaveBeenCalledWith(undefined);
    });

    it('should handle cache clear with empty service name', async () => {
      const mockReq: any = {
        query: {
          service: '',
        },
      };

      const result = await controller.clearServiceCache(mockReq);

      expect(result.success).toBe(true);
      expect(proxyService.clearServiceUrlCache).toHaveBeenCalledWith('');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all services are healthy', async () => {
      const mockServicesHealth = {
        'user-service': { status: 'healthy', responseTime: 50 },
        'device-service': { status: 'healthy', responseTime: 80 },
        'billing-service': { status: 'healthy', responseTime: 60 },
      };

      proxyService.checkServicesHealth.mockResolvedValue(mockServicesHealth);

      const result: any = await controller.healthCheck();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('api-gateway');
      expect(result.version).toBe('1.0.0');
      expect(result.timestamp).toBeDefined();
      expect(result.environment).toBeDefined();
      expect(result.system).toBeDefined();
      expect(result.system.hostname).toBeDefined();
      expect(result.system.memory).toBeDefined();
      expect(result.system.cpu).toBeDefined();
      expect(result.services).toEqual(mockServicesHealth);
      expect(proxyService.checkServicesHealth).toHaveBeenCalled();
    });

    it('should return degraded status when any service is unhealthy', async () => {
      const mockServicesHealth = {
        'user-service': { status: 'healthy', responseTime: 50 },
        'device-service': { status: 'unhealthy', error: 'Connection timeout' },
        'billing-service': { status: 'healthy', responseTime: 60 },
      };

      proxyService.checkServicesHealth.mockResolvedValue(mockServicesHealth);

      const result: any = await controller.healthCheck();

      expect(result.status).toBe('degraded');
      expect(result.services['device-service'].status).toBe('unhealthy');
    });

    it('should include system information', async () => {
      proxyService.checkServicesHealth.mockResolvedValue({});

      const result: any = await controller.healthCheck();

      expect(result.system.memory.total).toBeGreaterThan(0);
      expect(result.system.memory.free).toBeGreaterThanOrEqual(0);
      expect(result.system.memory.used).toBeGreaterThanOrEqual(0);
      expect(result.system.memory.usagePercent).toBeGreaterThanOrEqual(0);
      expect(result.system.cpu.cores).toBeGreaterThan(0);
      expect(result.system.cpu.model).toBeDefined();
    });

    it('should handle all services unhealthy', async () => {
      const mockServicesHealth = {
        'user-service': { status: 'unhealthy', error: 'Service down' },
        'device-service': { status: 'unhealthy', error: 'Service down' },
      };

      proxyService.checkServicesHealth.mockResolvedValue(mockServicesHealth);

      const result: any = await controller.healthCheck();

      expect(result.status).toBe('degraded');
    });
  });

  describe('proxy methods', () => {
    let mockReq: any;
    let mockRes: any;

    beforeEach(() => {
      mockReq = {
        url: '/users/profile',
        method: 'GET',
        headers: {},
        query: {},
        body: {},
        user: {
          id: 'user-123',
          username: 'testuser',
          tenantId: 'tenant-456',
          roles: ['user'],
        },
        requestId: 'req-789',
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
    });

    it('should proxy auth request', async () => {
      const mockResponse = { success: true, data: { token: 'jwt-token' } };
      proxyService.proxyRequest.mockReturnValue(of(mockResponse));

      await controller.proxyAuth(mockReq, mockRes);

      expect(proxyService.proxyRequest).toHaveBeenCalledWith(
        'users',
        expect.any(String),
        'GET',
        {},
        expect.any(Object),
        {}
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResponse);
    });

    it('should proxy users request', async () => {
      const mockResponse = { data: { id: 'user-123', username: 'testuser' } };
      proxyService.proxyRequest.mockReturnValue(of(mockResponse));

      await controller.proxyUsers(mockReq, mockRes);

      expect(proxyService.proxyRequest).toHaveBeenCalledWith(
        'users',
        expect.any(String),
        'GET',
        {},
        expect.any(Object),
        {}
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResponse);
    });

    it('should proxy devices request', async () => {
      mockReq.url = '/devices/list';
      const mockResponse = { data: [{ id: 'device-1' }] };
      proxyService.proxyRequest.mockReturnValue(of(mockResponse));

      await controller.proxyDevices(mockReq, mockRes);

      expect(proxyService.proxyRequest).toHaveBeenCalledWith(
        'devices',
        expect.any(String),
        'GET',
        {},
        expect.any(Object),
        {}
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResponse);
    });

    it('should proxy notifications request', async () => {
      mockReq.url = '/notifications/unread';
      const mockResponse = { data: { count: 5 } };
      proxyService.proxyRequest.mockReturnValue(of(mockResponse));

      await controller.proxyNotifications(mockReq, mockRes);

      expect(proxyService.proxyRequest).toHaveBeenCalledWith(
        'notifications',
        expect.any(String),
        'GET',
        {},
        expect.any(Object),
        {}
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResponse);
    });

    it('should proxy billing request', async () => {
      mockReq.url = '/billing/invoices';
      const mockResponse = { data: [] };
      proxyService.proxyRequest.mockReturnValue(of(mockResponse));

      await controller.proxyBilling(mockReq, mockRes);

      expect(proxyService.proxyRequest).toHaveBeenCalledWith(
        'billing',
        expect.any(String),
        'GET',
        {},
        expect.any(Object),
        {}
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResponse);
    });

    it('should proxy apps request', async () => {
      mockReq.url = '/apps/marketplace';
      const mockResponse = { data: [] };
      proxyService.proxyRequest.mockReturnValue(of(mockResponse));

      await controller.proxyApps(mockReq, mockRes);

      expect(proxyService.proxyRequest).toHaveBeenCalledWith(
        'apps',
        expect.any(String),
        'GET',
        {},
        expect.any(Object),
        {}
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResponse);
    });

    it('should handle POST request with body', async () => {
      mockReq.method = 'POST';
      mockReq.body = { name: 'New Device', templateId: 'template-1' };
      mockReq.url = '/devices/create';
      const mockResponse = { success: true, data: { id: 'device-new' } };
      proxyService.proxyRequest.mockReturnValue(of(mockResponse));

      await controller.proxyDevices(mockReq, mockRes);

      expect(proxyService.proxyRequest).toHaveBeenCalledWith(
        'devices',
        expect.any(String),
        'POST',
        mockReq.body,
        expect.any(Object),
        {}
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResponse);
    });

    it('should handle request with query parameters', async () => {
      mockReq.url = '/users/list?page=1&limit=10';
      mockReq.query = { page: '1', limit: '10' };
      const mockResponse = { data: [], pagination: { page: 1, limit: 10 } };
      proxyService.proxyRequest.mockReturnValue(of(mockResponse));

      await controller.proxyUsers(mockReq, mockRes);

      expect(proxyService.proxyRequest).toHaveBeenCalledWith(
        'users',
        expect.any(String),
        'GET',
        {},
        expect.any(Object),
        mockReq.query
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResponse);
    });

    it('should proxy SMS service request', async () => {
      mockReq.url = '/sms/numbers';
      const mockResponse = { data: [] };
      proxyService.proxyRequest.mockReturnValue(of(mockResponse));

      await controller.proxySms(mockReq, mockRes);

      expect(proxyService.proxyRequest).toHaveBeenCalledWith(
        'sms-receive-service',
        expect.any(String),
        'GET',
        {},
        expect.any(Object),
        {}
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResponse);
    });

    it('should proxy lifecycle request', async () => {
      mockReq.url = '/lifecycle/cleanup';
      const mockResponse = { success: true };
      proxyService.proxyRequest.mockReturnValue(of(mockResponse));

      await controller.proxyLifecycle(mockReq, mockRes);

      expect(proxyService.proxyRequest).toHaveBeenCalledWith(
        'devices',
        expect.any(String),
        'GET',
        {},
        expect.any(Object),
        {}
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResponse);
    });
  });
});
