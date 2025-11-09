import { Test, TestingModule } from '@nestjs/testing';
import { ProxyController } from './proxy.controller';
import { ProxyService } from '../services/proxy.service';

describe('ProxyController', () => {
  let controller: ProxyController;
  let service: any;

  const mockProxyService = {
    acquireProxy: jest.fn(),
    listProxies: jest.fn(),
    assignSpecificProxy: jest.fn(),
    releaseProxy: jest.fn(),
    reportSuccess: jest.fn(),
    reportFailure: jest.fn(),
    getPoolStats: jest.fn(),
    healthCheck: jest.fn(),
    setLoadBalancingStrategy: jest.fn(),
    forceRefreshPool: jest.fn(),
    getActiveProxiesCount: jest.fn().mockReturnValue(75),
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
    service = module.get(ProxyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('acquireProxy', () => {
    it('should successfully acquire a proxy', async () => {
      const dto: any = {
        userId: 'user-123',
        deviceId: 'device-456',
      };

      const mockResponse = {
        success: true,
        data: { proxyId: 'proxy-789', host: '192.168.1.1' },
        timestamp: Date.now(),
      };

      service.acquireProxy.mockResolvedValue(mockResponse);

      const result = await controller.acquireProxy(dto);

      expect(result.success).toBe(true);
      expect(service.acquireProxy).toHaveBeenCalledWith(dto);
    });

    it('should handle acquisition failure', async () => {
      const dto: any = { userId: 'user-123' };

      const mockResponse = {
        success: false,
        message: 'No available proxies',
        timestamp: Date.now(),
      };

      service.acquireProxy.mockResolvedValue(mockResponse);

      const result = await controller.acquireProxy(dto);

      expect(result.success).toBe(false);
    });
  });

  describe('listProxies', () => {
    it('should return list of proxies', async () => {
      const query: any = {};

      const mockResponse = {
        success: true,
        data: [{ proxyId: 'proxy-1' }],
        timestamp: Date.now(),
      };

      service.listProxies.mockResolvedValue(mockResponse);

      const result = await controller.listProxies(query);

      expect(result.success).toBe(true);
      // Controller calls service.listProxies(criteria, availableOnly, limit, offset)
      expect(service.listProxies).toHaveBeenCalledWith(undefined, false, undefined, 0);
    });
  });

  describe('assignProxy', () => {
    it('should assign a specific proxy', async () => {
      const dto: any = { proxyId: 'proxy-123' };

      const mockResponse = {
        success: true,
        data: { proxyId: 'proxy-123' },
        timestamp: Date.now(),
      };

      service.assignSpecificProxy.mockResolvedValue(mockResponse);

      const result = await controller.assignProxy(dto);

      expect(result.success).toBe(true);
      expect(service.assignSpecificProxy).toHaveBeenCalledWith(dto.proxyId, true);
    });
  });

  describe('releaseProxy', () => {
    it('should successfully release a proxy', async () => {
      const proxyId = 'proxy-123';

      const mockResponse = {
        success: true,
        data: { released: true },
        timestamp: Date.now(),
      };

      service.releaseProxy.mockResolvedValue(mockResponse);

      const result = await controller.releaseProxy(proxyId);

      expect(result.success).toBe(true);
      expect(service.releaseProxy).toHaveBeenCalledWith(proxyId);
    });
  });

  describe('reportSuccess', () => {
    it('should report successful proxy usage', async () => {
      const proxyId = 'proxy-123';
      const dto: any = {};

      const mockResponse = {
        success: true,
        data: { recorded: true },
        timestamp: Date.now(),
      };

      service.reportSuccess.mockResolvedValue(mockResponse);

      const result = await controller.reportSuccess(proxyId, dto);

      expect(result.success).toBe(true);
      expect(service.reportSuccess).toHaveBeenCalledWith(proxyId, dto);
    });
  });

  describe('reportFailure', () => {
    it('should report proxy failure', async () => {
      const proxyId = 'proxy-123';
      const dto: any = {};

      const mockResponse = {
        success: true,
        data: { recorded: true },
        timestamp: Date.now(),
      };

      service.reportFailure.mockResolvedValue(mockResponse);

      const result = await controller.reportFailure(proxyId, dto);

      expect(result.success).toBe(true);
      expect(service.reportFailure).toHaveBeenCalledWith(proxyId, dto);
    });
  });

  describe('getPoolStats', () => {
    it('should return proxy pool statistics', async () => {
      const mockResponse = {
        success: true,
        data: { total: 100, active: 80 },
        timestamp: Date.now(),
      };

      service.getPoolStats.mockResolvedValue(mockResponse);

      const result = await controller.getPoolStats();

      expect(result.success).toBe(true);
      expect(service.getPoolStats).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const mockResponse = {
        status: 'ok' as const,
        service: 'proxy-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: 86400,
      };

      service.healthCheck.mockResolvedValue(mockResponse);

      const result = await controller.healthCheck();

      expect(result.status).toBe('ok');
      expect(service.healthCheck).toHaveBeenCalled();
    });
  });

  describe('setStrategy', () => {
    it('should set load balancing strategy', async () => {
      const strategy: any = 'round-robin';

      const mockResponse = {
        success: true,
        data: { strategy: 'round-robin' },
        timestamp: Date.now(),
      };

      service.setLoadBalancingStrategy.mockResolvedValue(mockResponse);

      const result = await controller.setStrategy(strategy);

      expect(result.success).toBe(true);
      expect(service.setLoadBalancingStrategy).toHaveBeenCalledWith(strategy);
    });
  });

  describe('forceRefresh', () => {
    it('should refresh proxy pool', async () => {
      const mockResponse = {
        success: true,
        data: { added: 20 },
        timestamp: Date.now(),
      };

      service.forceRefreshPool.mockResolvedValue(mockResponse);

      const result = await controller.forceRefresh();

      expect(result.success).toBe(true);
      expect(result.data.added).toBe(20);
      expect(service.forceRefreshPool).toHaveBeenCalled();
    });
  });

  describe('getActiveCount', () => {
    it('should return active proxy count', async () => {
      service.getActiveProxiesCount.mockReturnValue(75);

      const result = await controller.getActiveCount();

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(75);
      expect(service.getActiveProxiesCount).toHaveBeenCalled();
    });
  });
});
