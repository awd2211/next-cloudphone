import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';
import { ProxyService } from './proxy/proxy.service';
import { ConsulService } from '@cloudphone/shared';

describe('HealthController', () => {
  let controller: HealthController;
  let _proxyService: ProxyService;
  let _consulService: ConsulService;
  let _configService: ConfigService;

  const mockProxyService = {
    checkServicesHealth: jest.fn(),
  };

  const mockConsulService = {
    getAllServices: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: ProxyService,
          useValue: mockProxyService,
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

    controller = module.get<HealthController>(HealthController);
    _proxyService = module.get<ProxyService>(ProxyService);
    _consulService = module.get<ConsulService>(ConsulService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return basic health status', () => {
      const result = controller.check();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('api-gateway');
      expect(result.version).toBe('1.0.0');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.system).toBeDefined();
      expect(result.system.hostname).toBeDefined();
      expect(result.system.platform).toBeDefined();
      expect(result.system.memory).toBeDefined();
      expect(result.system.cpu).toBeDefined();
    });

    it('should include system information', () => {
      const result = controller.check();

      expect(result.system.memory.total).toBeGreaterThan(0);
      expect(result.system.memory.free).toBeGreaterThanOrEqual(0);
      expect(result.system.memory.used).toBeGreaterThanOrEqual(0);
      expect(result.system.memory.usagePercent).toBeGreaterThanOrEqual(0);
      expect(result.system.cpu.cores).toBeGreaterThan(0);
    });
  });

  describe('detailedCheck', () => {
    it('should return detailed health status with all services healthy', async () => {
      mockConfigService.get.mockReturnValue('false');
      mockConsulService.getAllServices.mockResolvedValue({});
      mockProxyService.checkServicesHealth.mockResolvedValue({
        users: { status: 'healthy', name: 'User Service' },
        devices: { status: 'healthy', name: 'Device Service' },
      });

      const result = await controller.detailedCheck();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.dependencies).toBeDefined();
      expect(result.dependencies.consul).toBeDefined();
      expect(result.dependencies.backendServices).toBeDefined();
      expect(result.healthChecks).toBeDefined();
      expect(result.healthChecks.total).toBeGreaterThan(0);
    });

    it('should handle Consul being disabled', async () => {
      mockConfigService.get.mockReturnValue('false');
      mockProxyService.checkServicesHealth.mockResolvedValue({
        users: { status: 'healthy', name: 'User Service' },
      });

      const result = await controller.detailedCheck();

      expect(result.dependencies.consul).toBeDefined();
      expect(result.dependencies.consul?.status).toBe('healthy');
      expect(result.dependencies.consul?.message).toContain('disabled');
    });

    it('should handle Consul connection failure', async () => {
      mockConfigService.get.mockReturnValue('true');
      mockConsulService.getAllServices.mockRejectedValue(new Error('Connection refused'));
      mockProxyService.checkServicesHealth.mockResolvedValue({});

      const result = await controller.detailedCheck();

      expect(result.dependencies.consul).toBeDefined();
      expect(result.dependencies.consul?.status).toBe('unhealthy');
      expect(result.dependencies.consul?.message).toBeDefined();
    });

    it('should report degraded status when some services are unhealthy', async () => {
      mockConfigService.get.mockReturnValue('false');
      mockProxyService.checkServicesHealth.mockResolvedValue({
        users: { status: 'healthy', name: 'User Service' },
        devices: { status: 'unhealthy', name: 'Device Service', error: 'Connection timeout' },
        billing: { status: 'healthy', name: 'Billing Service' },
      });

      const result = await controller.detailedCheck();

      expect(result.status).toBe('degraded'); // 3/4 checks passed (75%) -> degraded
      expect(result.healthChecks.passed).toBeGreaterThan(0);
      expect(result.healthChecks.failed).toBeGreaterThan(0);
    });

    it('should report unhealthy status when most services are down', async () => {
      mockConfigService.get.mockReturnValue('true');
      mockConsulService.getAllServices.mockRejectedValue(new Error('Consul down'));
      mockProxyService.checkServicesHealth.mockResolvedValue({
        users: { status: 'unhealthy', name: 'User Service', error: 'Down' },
        devices: { status: 'unhealthy', name: 'Device Service', error: 'Down' },
      });

      const result = await controller.detailedCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.healthChecks.failed).toBeGreaterThan(result.healthChecks.passed);
    });
  });
});
