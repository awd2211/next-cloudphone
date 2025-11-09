import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';
import { DockerService } from './docker/docker.service';
import { AdbService } from './adb/adb.service';
import { HttpClientService } from '@cloudphone/shared';

describe('HealthController', () => {
  let controller: HealthController;
  let dataSource: any;
  let dockerService: any;
  let adbService: any;
  let httpClientService: any;

  const mockDataSource = {
    query: jest.fn(),
  };

  const mockDockerClient = {
    ping: jest.fn(),
    version: jest.fn(),
  };

  const mockDockerService = {
    docker: mockDockerClient,
  };

  const mockAdbClient = {
    version: jest.fn(),
  };

  const mockAdbService = {
    client: mockAdbClient,
  };

  const mockHttpClientService = {
    getAllMetrics: jest.fn(),
    getAllCircuitBreakerStatus: jest.fn(),
    getHealthStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: DockerService,
          useValue: mockDockerService,
        },
        {
          provide: AdbService,
          useValue: mockAdbService,
        },
        {
          provide: HttpClientService,
          useValue: mockHttpClientService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    dataSource = module.get(DataSource);
    dockerService = module.get(DockerService);
    adbService = module.get(AdbService);
    httpClientService = module.get(HttpClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('check', () => {
    it('should return healthy status when all dependencies are healthy', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockDockerClient.ping.mockResolvedValue(true);
      mockDockerClient.version.mockResolvedValue({ Version: '20.10.0' });
      mockAdbClient.version.mockResolvedValue(41);

      const result: any = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('device-service');
      expect(result.version).toBe('1.0.0');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.environment).toBeDefined();
      expect(result.dependencies.database?.status).toBe('healthy');
      expect(result.dependencies.docker?.status).toBe('healthy');
      expect(result.dependencies.adb?.status).toBe('healthy');
      expect(result.system).toBeDefined();
      expect(result.system.hostname).toBeDefined();
      expect(result.system.memory.total).toBeGreaterThan(0);
      expect(result.system.cpu.cores).toBeGreaterThan(0);
    });

    it('should return degraded status when database is unhealthy', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection refused'));
      mockDockerClient.ping.mockResolvedValue(true);
      mockDockerClient.version.mockResolvedValue({ Version: '20.10.0' });
      mockAdbClient.version.mockResolvedValue(41);

      const result: any = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.database?.status).toBe('unhealthy');
      expect(result.dependencies.database?.message).toBe('Connection refused');
      expect(result.dependencies.docker?.status).toBe('healthy');
      expect(result.dependencies.adb?.status).toBe('healthy');
    });

    it('should return degraded status when docker is unhealthy', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockDockerClient.ping.mockRejectedValue(new Error('Docker daemon not running'));
      mockAdbClient.version.mockResolvedValue(41);

      const result: any = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.database?.status).toBe('healthy');
      expect(result.dependencies.docker?.status).toBe('unhealthy');
      expect(result.dependencies.docker?.message).toContain('Docker daemon not running');
      expect(result.dependencies.adb?.status).toBe('healthy');
    });

    it('should return degraded status when adb is unhealthy', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockDockerClient.ping.mockResolvedValue(true);
      mockDockerClient.version.mockResolvedValue({ Version: '20.10.0' });
      mockAdbClient.version.mockRejectedValue(new Error('ADB server not running'));

      const result: any = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.database?.status).toBe('healthy');
      expect(result.dependencies.docker?.status).toBe('healthy');
      expect(result.dependencies.adb?.status).toBe('unhealthy');
      expect(result.dependencies.adb?.message).toContain('ADB server not running');
    });

    it('should return degraded status when all dependencies are unhealthy', async () => {
      mockDataSource.query.mockRejectedValue(new Error('DB error'));
      mockDockerClient.ping.mockRejectedValue(new Error('Docker error'));
      mockAdbClient.version.mockRejectedValue(new Error('ADB error'));

      const result: any = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.database?.status).toBe('unhealthy');
      expect(result.dependencies.docker?.status).toBe('unhealthy');
      expect(result.dependencies.adb?.status).toBe('unhealthy');
    });

    it('should include response time for healthy dependencies', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockDockerClient.ping.mockResolvedValue(true);
      mockDockerClient.version.mockResolvedValue({ Version: '20.10.0' });
      mockAdbClient.version.mockResolvedValue(41);

      const result: any = await controller.check();

      expect(result.dependencies.database?.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.dependencies.docker?.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.dependencies.adb?.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle docker client not initialized', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      const originalDocker = mockDockerService.docker;
      mockDockerService.docker = null;
      mockAdbClient.version.mockResolvedValue(41);

      const result: any = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.docker?.status).toBe('unhealthy');
      expect(result.dependencies.docker?.message).toBe('Docker client not initialized');

      // Restore
      mockDockerService.docker = originalDocker;
    });

    it('should handle adb client not initialized', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockDockerClient.ping.mockResolvedValue(true);
      mockDockerClient.version.mockResolvedValue({ Version: '20.10.0' });
      const originalAdb = mockAdbService.client;
      mockAdbService.client = null;

      const result: any = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.adb?.status).toBe('unhealthy');
      expect(result.dependencies.adb?.message).toBe('ADB client not initialized');

      // Restore
      mockAdbService.client = originalAdb;
    });

    it('should include docker version when available', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockDockerClient.ping.mockResolvedValue(true);
      mockDockerClient.version.mockResolvedValue({ Version: '24.0.5' });
      mockAdbClient.version.mockResolvedValue(41);

      const result: any = await controller.check();

      expect(result.dependencies.docker?.version).toBe('24.0.5');
    });

    it('should include adb version when available', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockDockerClient.ping.mockResolvedValue(true);
      mockDockerClient.version.mockResolvedValue({ Version: '20.10.0' });
      mockAdbClient.version.mockResolvedValue(42);

      const result: any = await controller.check();

      expect(result.dependencies.adb?.version).toBe('42');
    });
  });

  describe('detailedCheck', () => {
    it('should return detailed health check with capabilities', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockDockerClient.ping.mockResolvedValue(true);
      mockDockerClient.version.mockResolvedValue({ Version: '20.10.0' });
      mockAdbClient.version.mockResolvedValue(41);

      const result: any = await controller.detailedCheck();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('device-service');
      expect(result.details).toBeDefined();
      expect(result.details.description).toContain('Device Service');
      expect(result.details.capabilities).toBeInstanceOf(Array);
      expect(result.details.capabilities.length).toBeGreaterThan(0);
      expect(result.details.capabilities).toContain('Docker container lifecycle management');
      expect(result.details.capabilities).toContain('ADB integration for Android control');
    });

    it('should include all basic health check info in detailed check', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockDockerClient.ping.mockResolvedValue(true);
      mockDockerClient.version.mockResolvedValue({ Version: '20.10.0' });
      mockAdbClient.version.mockResolvedValue(41);

      const result: any = await controller.detailedCheck();

      expect(result.version).toBe('1.0.0');
      expect(result.dependencies).toBeDefined();
      expect(result.system).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should show degraded status in detailed check when dependencies unhealthy', async () => {
      mockDataSource.query.mockRejectedValue(new Error('DB down'));
      mockDockerClient.ping.mockResolvedValue(true);
      mockDockerClient.version.mockResolvedValue({ Version: '20.10.0' });
      mockAdbClient.version.mockResolvedValue(41);

      const result: any = await controller.detailedCheck();

      expect(result.status).toBe('degraded');
      expect(result.details).toBeDefined();
    });
  });

  describe('liveness', () => {
    it('should return ok status for liveness probe', async () => {
      const result = await controller.liveness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return valid ISO timestamp', async () => {
      const result = await controller.liveness();

      const timestamp = new Date(result.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });

    it('should always succeed regardless of dependencies', async () => {
      // Even if dependencies fail, liveness should still pass
      mockDataSource.query.mockRejectedValue(new Error('DB down'));
      mockDockerClient.ping.mockRejectedValue(new Error('Docker down'));
      mockAdbClient.version.mockRejectedValue(new Error('ADB down'));

      const result = await controller.liveness();

      expect(result.status).toBe('ok');
    });

    it('should track uptime correctly', async () => {
      const result1 = await controller.liveness();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const result2 = await controller.liveness();

      expect(result2.uptime).toBeGreaterThanOrEqual(result1.uptime);
    });
  });

  describe('readiness', () => {
    it('should return ok when all critical dependencies are healthy', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockDockerClient.ping.mockResolvedValue(true);
      mockDockerClient.version.mockResolvedValue({ Version: '20.10.0' });
      mockAdbClient.version.mockResolvedValue(41);

      const result: any = await controller.readiness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.dependencies.database).toBe('healthy');
      expect(result.dependencies.docker).toBe('healthy');
      expect(result.dependencies.adb).toBe('healthy');
    });

    it('should return error when database is unhealthy', async () => {
      mockDataSource.query.mockRejectedValue(new Error('DB connection failed'));
      mockDockerClient.ping.mockResolvedValue(true);
      mockDockerClient.version.mockResolvedValue({ Version: '20.10.0' });
      mockAdbClient.version.mockResolvedValue(41);

      const result: any = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.message).toContain('Service not ready');
      expect(result.dependencies.database).toBe('unhealthy');
    });

    it('should return error when docker is unhealthy', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockDockerClient.ping.mockRejectedValue(new Error('Docker error'));
      mockAdbClient.version.mockResolvedValue(41);

      const result: any = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.message).toContain('Service not ready');
      expect(result.dependencies.docker).toBe('unhealthy');
    });

    it('should return error when adb is unhealthy', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockDockerClient.ping.mockResolvedValue(true);
      mockDockerClient.version.mockResolvedValue({ Version: '20.10.0' });
      mockAdbClient.version.mockRejectedValue(new Error('ADB error'));

      const result: any = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.message).toContain('Service not ready');
      expect(result.dependencies.adb).toBe('unhealthy');
    });

    it('should return error when all dependencies are unhealthy', async () => {
      mockDataSource.query.mockRejectedValue(new Error('DB error'));
      mockDockerClient.ping.mockRejectedValue(new Error('Docker error'));
      mockAdbClient.version.mockRejectedValue(new Error('ADB error'));

      const result: any = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.dependencies.database).toBe('unhealthy');
      expect(result.dependencies.docker).toBe('unhealthy');
      expect(result.dependencies.adb).toBe('unhealthy');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockDataSource.query.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result: any = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.message).toBeDefined();
    });
  });

  describe('getHttpMetrics', () => {
    it('should return http metrics with summary', async () => {
      const mockMetrics = {
        'user-service': {
          totalRequests: 100,
          successRequests: 95,
          failedRequests: 5,
          avgDuration: 50,
        },
        'billing-service': {
          totalRequests: 50,
          successRequests: 48,
          failedRequests: 2,
          avgDuration: 80,
        },
      };

      const mockCircuitBreakers = {
        'user-service': { state: 'CLOSED', failures: 0 },
        'billing-service': { state: 'CLOSED', failures: 0 },
      };

      mockHttpClientService.getAllMetrics.mockReturnValue(mockMetrics);
      mockHttpClientService.getAllCircuitBreakerStatus.mockReturnValue(mockCircuitBreakers);

      const result: any = await controller.getHttpMetrics();

      expect(result.timestamp).toBeDefined();
      expect(result.metrics).toEqual(mockMetrics);
      expect(result.circuitBreakers).toEqual(mockCircuitBreakers);
      expect(result.summary).toBeDefined();
      expect(result.summary.totalServices).toBe(2);
      expect(result.summary.totalRequests).toBe(150);
      expect(result.summary.totalSuccess).toBe(143);
      expect(result.summary.totalFailed).toBe(7);
      expect(result.summary.overallSuccessRate).toBe('95.33%');
      expect(result.summary.avgResponseTime).toBe(65);
    });

    it('should handle empty metrics', async () => {
      mockHttpClientService.getAllMetrics.mockReturnValue({});
      mockHttpClientService.getAllCircuitBreakerStatus.mockReturnValue({});

      const result: any = await controller.getHttpMetrics();

      expect(result.metrics).toEqual({});
      expect(result.circuitBreakers).toEqual({});
      expect(result.summary.totalServices).toBe(0);
      expect(result.summary.totalRequests).toBe(0);
      expect(result.summary.overallSuccessRate).toBe('N/A');
    });

    it('should calculate correct average response time', async () => {
      const mockMetrics = {
        'service-1': {
          totalRequests: 10,
          successRequests: 10,
          failedRequests: 0,
          avgDuration: 100,
        },
        'service-2': {
          totalRequests: 20,
          successRequests: 20,
          failedRequests: 0,
          avgDuration: 200,
        },
      };

      mockHttpClientService.getAllMetrics.mockReturnValue(mockMetrics);
      mockHttpClientService.getAllCircuitBreakerStatus.mockReturnValue({});

      const result: any = await controller.getHttpMetrics();

      expect(result.summary.avgResponseTime).toBe(150); // (100 + 200) / 2
    });

    it('should handle metrics with zero requests', async () => {
      const mockMetrics = {
        'service-1': {
          totalRequests: 0,
          successRequests: 0,
          failedRequests: 0,
          avgDuration: 0,
        },
      };

      mockHttpClientService.getAllMetrics.mockReturnValue(mockMetrics);
      mockHttpClientService.getAllCircuitBreakerStatus.mockReturnValue({});

      const result: any = await controller.getHttpMetrics();

      expect(result.summary.overallSuccessRate).toBe('N/A');
    });
  });

  describe('getHttpHealth', () => {
    it('should return http health status', async () => {
      const mockHealthStatus = {
        status: 'healthy',
        services: {
          'user-service': {
            healthy: true,
            successRate: 98.5,
            circuitBreakerState: 'CLOSED',
          },
          'billing-service': {
            healthy: true,
            successRate: 96.0,
            circuitBreakerState: 'CLOSED',
          },
        },
      };

      mockHttpClientService.getHealthStatus.mockReturnValue(mockHealthStatus);

      const result = await controller.getHttpHealth();

      expect(result).toEqual(mockHealthStatus);
      expect(result.status).toBe('healthy');
      expect(result.services['user-service'].healthy).toBe(true);
      expect(httpClientService.getHealthStatus).toHaveBeenCalled();
    });

    it('should return unhealthy status when services have issues', async () => {
      const mockHealthStatus = {
        status: 'unhealthy',
        services: {
          'user-service': {
            healthy: false,
            successRate: 45.0,
            circuitBreakerState: 'OPEN',
          },
        },
      };

      mockHttpClientService.getHealthStatus.mockReturnValue(mockHealthStatus);

      const result = await controller.getHttpHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.services['user-service'].healthy).toBe(false);
      expect(result.services['user-service'].circuitBreakerState).toBe('OPEN');
    });

    it('should handle degraded http health status', async () => {
      const mockHealthStatus = {
        status: 'degraded',
        services: {
          'user-service': {
            healthy: true,
            successRate: 85.0,
            circuitBreakerState: 'CLOSED',
          },
          'billing-service': {
            healthy: false,
            successRate: 60.0,
            circuitBreakerState: 'HALF_OPEN',
          },
        },
      };

      mockHttpClientService.getHealthStatus.mockReturnValue(mockHealthStatus);

      const result = await controller.getHttpHealth();

      expect(result.status).toBe('degraded');
      expect(result.services['billing-service'].circuitBreakerState).toBe('HALF_OPEN');
    });
  });
});
