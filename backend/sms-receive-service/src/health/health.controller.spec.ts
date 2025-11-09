import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService } from './health-check.service';
import { MetricsService } from './metrics.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: any;
  let metricsService: any;

  const mockHealthCheckService = {
    getDetailedHealth: jest.fn(),
    isHealthy: jest.fn(),
  };

  const mockMetricsService = {
    getMetrics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    metricsService = module.get(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have healthCheckService injected', () => {
      expect(healthCheckService).toBeDefined();
      expect(healthCheckService).toBe(mockHealthCheckService);
    });

    it('should have metricsService injected', () => {
      expect(metricsService).toBeDefined();
      expect(metricsService).toBe(mockMetricsService);
    });
  });

  describe('health', () => {
    it('should return basic health status', () => {
      const result = controller.health();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('string');
    });

    it('should return ISO timestamp', () => {
      const result = controller.health();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('detailedHealth', () => {
    it('should return detailed health from service', async () => {
      const mockDetailedHealth = {
        overall: 'healthy',
        database: {
          healthy: true,
          lastCheck: '2025-01-06T10:00:00Z',
          error: null,
        },
        redis: {
          healthy: true,
          lastCheck: '2025-01-06T10:00:00Z',
          error: null,
        },
        rabbitmq: {
          healthy: true,
          lastCheck: '2025-01-06T10:00:00Z',
          error: null,
        },
        timestamp: '2025-01-06T10:00:00Z',
      };

      mockHealthCheckService.getDetailedHealth.mockResolvedValue(mockDetailedHealth);

      const result = await controller.detailedHealth();

      expect(result).toEqual(mockDetailedHealth);
      expect(result.overall).toBe('healthy');
      expect(mockHealthCheckService.getDetailedHealth).toHaveBeenCalled();
    });

    it('should return degraded status when some dependencies fail', async () => {
      const mockDetailedHealth = {
        overall: 'degraded',
        database: {
          healthy: true,
          lastCheck: '2025-01-06T10:00:00Z',
          error: null,
        },
        redis: {
          healthy: false,
          lastCheck: '2025-01-06T10:00:00Z',
          error: 'Connection refused',
        },
        rabbitmq: {
          healthy: true,
          lastCheck: '2025-01-06T10:00:00Z',
          error: null,
        },
        timestamp: '2025-01-06T10:00:00Z',
      };

      mockHealthCheckService.getDetailedHealth.mockResolvedValue(mockDetailedHealth);

      const result = await controller.detailedHealth();

      expect(result.overall).toBe('degraded');
      expect(result.redis.healthy).toBe(false);
      expect(result.redis.error).toBeDefined();
    });

    it('should return unhealthy status when critical dependencies fail', async () => {
      const mockDetailedHealth = {
        overall: 'unhealthy',
        database: {
          healthy: false,
          lastCheck: '2025-01-06T10:00:00Z',
          error: 'Database connection failed',
        },
        redis: {
          healthy: false,
          lastCheck: '2025-01-06T10:00:00Z',
          error: 'Redis connection failed',
        },
        rabbitmq: {
          healthy: true,
          lastCheck: '2025-01-06T10:00:00Z',
          error: null,
        },
        timestamp: '2025-01-06T10:00:00Z',
      };

      mockHealthCheckService.getDetailedHealth.mockResolvedValue(mockDetailedHealth);

      const result = await controller.detailedHealth();

      expect(result.overall).toBe('unhealthy');
      expect(result.database.healthy).toBe(false);
      expect(result.redis.healthy).toBe(false);
    });

    it('should include error messages for failed dependencies', async () => {
      const mockDetailedHealth = {
        overall: 'degraded',
        database: {
          healthy: true,
          lastCheck: '2025-01-06T10:00:00Z',
          error: null,
        },
        redis: {
          healthy: false,
          lastCheck: '2025-01-06T10:00:00Z',
          error: 'ECONNREFUSED',
        },
        rabbitmq: {
          healthy: true,
          lastCheck: '2025-01-06T10:00:00Z',
          error: null,
        },
        timestamp: '2025-01-06T10:00:00Z',
      };

      mockHealthCheckService.getDetailedHealth.mockResolvedValue(mockDetailedHealth);

      const result = await controller.detailedHealth();

      expect(result.redis.error).toBe('ECONNREFUSED');
      expect(result.database.error).toBeNull();
    });
  });

  describe('metrics', () => {
    it('should return Prometheus metrics', async () => {
      const mockMetrics = `# HELP sms_number_requests_total Total number of virtual number requests
# TYPE sms_number_requests_total counter
sms_number_requests_total{provider="sms-activate",service="telegram",status="success"} 42

# HELP sms_active_numbers Current number of active virtual numbers
# TYPE sms_active_numbers gauge
sms_active_numbers{provider="sms-activate",status="active"} 5`;

      mockMetricsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.metrics();

      expect(result).toBe(mockMetrics);
      expect(result).toContain('# HELP');
      expect(result).toContain('# TYPE');
      expect(mockMetricsService.getMetrics).toHaveBeenCalled();
    });

    it('should return metrics with correct format', async () => {
      const mockMetrics = `# HELP test_metric Test metric
# TYPE test_metric counter
test_metric 123`;

      mockMetricsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.metrics();

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^# HELP/);
    });
  });

  describe('liveness', () => {
    it('should return alive status', () => {
      const result = controller.liveness();

      expect(result).toHaveProperty('status', 'alive');
      expect(result).toHaveProperty('timestamp');
    });

    it('should always return alive (never fails)', () => {
      const result1 = controller.liveness();
      const result2 = controller.liveness();

      expect(result1.status).toBe('alive');
      expect(result2.status).toBe('alive');
    });

    it('should return ISO timestamp', () => {
      const result = controller.liveness();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('readiness', () => {
    it('should return ready status when service is healthy', () => {
      mockHealthCheckService.isHealthy.mockReturnValue(true);

      const result = controller.readiness();

      expect(result).toHaveProperty('status', 'ready');
      expect(result).toHaveProperty('timestamp');
      expect(mockHealthCheckService.isHealthy).toHaveBeenCalled();
    });

    it('should return not_ready status when service is unhealthy', () => {
      mockHealthCheckService.isHealthy.mockReturnValue(false);

      const result = controller.readiness();

      expect(result).toHaveProperty('status', 'not_ready');
      expect(result).toHaveProperty('timestamp');
      expect(mockHealthCheckService.isHealthy).toHaveBeenCalled();
    });

    it('should call healthCheckService.isHealthy()', () => {
      mockHealthCheckService.isHealthy.mockReturnValue(true);

      controller.readiness();

      expect(mockHealthCheckService.isHealthy).toHaveBeenCalledTimes(1);
    });

    it('should return different status based on health state', () => {
      mockHealthCheckService.isHealthy.mockReturnValue(true);
      const result1 = controller.readiness();

      mockHealthCheckService.isHealthy.mockReturnValue(false);
      const result2 = controller.readiness();

      expect(result1.status).toBe('ready');
      expect(result2.status).toBe('not_ready');
    });
  });

  describe('K8s Probes Integration', () => {
    it('should have separate endpoints for liveness and readiness', () => {
      mockHealthCheckService.isHealthy.mockReturnValue(false);

      const livenessResult = controller.liveness();
      const readinessResult = controller.readiness();

      expect(livenessResult.status).toBe('alive');
      expect(readinessResult.status).toBe('not_ready');
    });

    it('should allow liveness to succeed while readiness fails', () => {
      mockHealthCheckService.isHealthy.mockReturnValue(false);

      const liveness = controller.liveness();
      const readiness = controller.readiness();

      expect(liveness.status).toBe('alive');
      expect(readiness.status).toBe('not_ready');
    });
  });
});
