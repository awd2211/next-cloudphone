import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { HealthController } from './health.controller';
import { CircuitBreakerService } from './common/services/circuit-breaker.service';
import { DatabaseMonitorService } from './common/services/database-monitor.service';
import { PartitionManagerService } from './common/services/partition-manager.service';
import { GracefulShutdownService } from './common/services/graceful-shutdown.service';
import { HealthCheckService } from './common/services/health-check.service';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';

describe('HealthController', () => {
  let controller: HealthController;
  let dataSource: any;
  let circuitBreakerService: any;
  let databaseMonitorService: any;
  let partitionManagerService: any;
  let gracefulShutdownService: any;
  let healthCheckService: any;

  const mockDataSource = {
    query: jest.fn(),
  };

  const mockCircuitBreakerService = {
    getAllBreakerStatus: jest.fn(),
  };

  const mockDatabaseMonitorService = {
    getConnectionPoolMetrics: jest.fn(),
    getStats: jest.fn(),
    getSlowQueries: jest.fn(),
  };

  const mockPartitionManagerService = {
    checkPartitionHealth: jest.fn(),
    getPartitionSummary: jest.fn(),
    getPartitionStats: jest.fn(),
  };

  const mockGracefulShutdownService = {
    isShutdownInProgress: jest.fn(),
  };

  const mockHealthCheckService = {
    check: jest.fn(),
    liveness: jest.fn(),
    readiness: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
        {
          provide: CircuitBreakerService,
          useValue: mockCircuitBreakerService,
        },
        {
          provide: DatabaseMonitorService,
          useValue: mockDatabaseMonitorService,
        },
        {
          provide: PartitionManagerService,
          useValue: mockPartitionManagerService,
        },
        {
          provide: GracefulShutdownService,
          useValue: mockGracefulShutdownService,
        },
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    dataSource = module.get(getDataSourceToken());
    circuitBreakerService = module.get(CircuitBreakerService);
    databaseMonitorService = module.get(DatabaseMonitorService);
    partitionManagerService = module.get(PartitionManagerService);
    gracefulShutdownService = module.get(GracefulShutdownService);
    healthCheckService = module.get(HealthCheckService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have all services injected', () => {
      expect(dataSource).toBeDefined();
      expect(circuitBreakerService).toBeDefined();
      expect(databaseMonitorService).toBeDefined();
      expect(partitionManagerService).toBeDefined();
      expect(gracefulShutdownService).toBeDefined();
      expect(healthCheckService).toBeDefined();
    });
  });

  describe('check', () => {
    beforeEach(() => {
      mockDataSource.query.mockResolvedValue([{ '1': 1 }]);
      mockDatabaseMonitorService.getConnectionPoolMetrics.mockResolvedValue({
        total: 10,
        active: 2,
        idle: 8,
        waiting: 0,
        usage: {
          percentage: 20,
          isHigh: false,
          isCritical: false,
        },
      });
      mockCircuitBreakerService.getAllBreakerStatus.mockReturnValue([
        {
          name: 'test-breaker',
          state: 'CLOSED',
          stats: {
            fires: 100,
            successes: 98,
            failures: 2,
            timeouts: 0,
            rejects: 0,
            fallbacks: 0,
          },
        },
      ]);
      mockGracefulShutdownService.isShutdownInProgress.mockReturnValue(false);
    });

    it('should return healthy status when all dependencies are ok', async () => {
      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('user-service');
      expect(result.version).toBe('1.0.0');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.dependencies.database?.status).toBe('healthy');
    });

    it('should return degraded status when database is unhealthy', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection failed'));

      const result = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.database?.status).toBe('unhealthy');
      expect(result.dependencies.database?.message).toBe('Connection failed');
    });

    it('should return degraded status when circuit breakers are failed', async () => {
      mockCircuitBreakerService.getAllBreakerStatus.mockReturnValue([
        {
          name: 'failed-breaker',
          state: 'OPEN',
          stats: {
            fires: 100,
            successes: 50,
            failures: 50,
            timeouts: 10,
            rejects: 5,
            fallbacks: 15,
          },
        },
      ]);

      const result = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.circuitBreakers?.failed).toBe(1);
    });

    it('should return degraded status when connection pool is critical', async () => {
      mockDatabaseMonitorService.getConnectionPoolMetrics.mockResolvedValue({
        total: 10,
        active: 10,
        idle: 0,
        waiting: 5,
        usage: {
          percentage: 100,
          isHigh: true,
          isCritical: true,
        },
      });

      const result = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.database?.connectionPool.usage.isCritical).toBe(true);
    });

    it('should return shutting_down status during graceful shutdown', async () => {
      mockGracefulShutdownService.isShutdownInProgress.mockReturnValue(true);

      const result = await controller.check();

      expect(result.status).toBe('shutting_down');
      expect(result.service).toBe('user-service');
    });

    it('should include database response time', async () => {
      const result = await controller.check();

      expect(result.dependencies.database?.responseTime).toBeDefined();
      expect(typeof result.dependencies.database?.responseTime).toBe('number');
    });

    it('should include circuit breaker details', async () => {
      const result = await controller.check();

      expect(result.circuitBreakers).toBeDefined();
      expect(result.circuitBreakers?.total).toBe(1);
      expect(result.circuitBreakers?.healthy).toBe(1);
      expect(result.circuitBreakers?.degraded).toBe(0);
      expect(result.circuitBreakers?.failed).toBe(0);
      expect(result.circuitBreakers?.details).toHaveLength(1);
    });

    it('should include system information', async () => {
      const result = await controller.check();

      expect(result.system).toBeDefined();
      expect(result.system.hostname).toBeDefined();
      expect(result.system.platform).toBeDefined();
      expect(result.system.memory).toBeDefined();
      expect(result.system.memory.total).toBeGreaterThan(0);
      expect(result.system.cpu).toBeDefined();
      expect(result.system.cpu.cores).toBeGreaterThan(0);
    });

    it('should include environment information', async () => {
      const result = await controller.check();

      expect(result.environment).toBeDefined();
      expect(['development', 'production', 'test']).toContain(result.environment);
    });

    it('should categorize circuit breakers by state', async () => {
      mockCircuitBreakerService.getAllBreakerStatus.mockReturnValue([
        { name: 'breaker-1', state: 'CLOSED', stats: {} },
        { name: 'breaker-2', state: 'OPEN', stats: {} },
        { name: 'breaker-3', state: 'HALF_OPEN', stats: {} },
      ]);

      const result = await controller.check();

      expect(result.circuitBreakers?.total).toBe(3);
      expect(result.circuitBreakers?.healthy).toBe(1);
      expect(result.circuitBreakers?.degraded).toBe(1);
      expect(result.circuitBreakers?.failed).toBe(1);
    });
  });

  describe('detailedCheck', () => {
    it('should return detailed health check from service', async () => {
      const mockDetailedHealth = {
        status: 'ok',
        checks: {
          database: { status: 'healthy' },
          redis: { status: 'healthy' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(mockDetailedHealth);

      const result = await controller.detailedCheck();

      expect(result).toEqual(mockDetailedHealth);
      expect(mockHealthCheckService.check).toHaveBeenCalled();
    });

    it('should delegate to HealthCheckService', async () => {
      await controller.detailedCheck();

      expect(mockHealthCheckService.check).toHaveBeenCalledTimes(1);
    });
  });

  describe('liveness', () => {
    it('should return ok status from liveness probe', async () => {
      const mockLivenessResult = {
        status: 'ok',
        timestamp: new Date().toISOString(),
      };

      mockHealthCheckService.liveness.mockResolvedValue(mockLivenessResult);

      const result = await controller.liveness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(mockHealthCheckService.liveness).toHaveBeenCalled();
    });

    it('should return error status when service is down', async () => {
      const mockLivenessResult = {
        status: 'error',
        message: 'Service unavailable',
      };

      mockHealthCheckService.liveness.mockResolvedValue(mockLivenessResult);

      const result = await controller.liveness();

      expect(result.status).toBe('error');
      expect(result.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(result.message).toBe('Service unavailable');
    });

    it('should not include statusCode when status is ok', async () => {
      const mockLivenessResult = {
        status: 'ok',
        timestamp: new Date().toISOString(),
      };

      mockHealthCheckService.liveness.mockResolvedValue(mockLivenessResult);

      const result = await controller.liveness();

      expect((result as any).statusCode).toBeUndefined();
    });
  });

  describe('readiness', () => {
    it('should return ok status from readiness probe', async () => {
      const mockReadinessResult = {
        status: 'ok',
        timestamp: new Date().toISOString(),
      };

      mockHealthCheckService.readiness.mockResolvedValue(mockReadinessResult);

      const result = await controller.readiness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(mockHealthCheckService.readiness).toHaveBeenCalled();
    });

    it('should return error status when dependencies are unhealthy', async () => {
      const mockReadinessResult = {
        status: 'error',
        message: 'Database connection failed',
      };

      mockHealthCheckService.readiness.mockResolvedValue(mockReadinessResult);

      const result = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(result.message).toBe('Database connection failed');
    });

    it('should differentiate between liveness and readiness', async () => {
      mockHealthCheckService.liveness.mockResolvedValue({ status: 'ok' });
      mockHealthCheckService.readiness.mockResolvedValue({ status: 'error' });

      const livenessResult = await controller.liveness();
      const readinessResult = await controller.readiness();

      expect(livenessResult.status).toBe('ok');
      expect(readinessResult.status).toBe('error');
    });
  });

  describe('poolStatus', () => {
    it('should return connection pool metrics', async () => {
      const mockMetrics = {
        total: 10,
        active: 3,
        idle: 7,
        waiting: 0,
        usage: { percentage: 30, isHigh: false, isCritical: false },
      };

      const mockStats = {
        totalQueries: 1000,
        slowQueries: 5,
        avgQueryTime: 25,
      };

      const mockSlowQueries = [
        { query: 'SELECT * FROM users', duration: 500 },
        { query: 'SELECT * FROM events', duration: 450 },
      ];

      mockDatabaseMonitorService.getConnectionPoolMetrics.mockResolvedValue(mockMetrics);
      mockDatabaseMonitorService.getStats.mockReturnValue(mockStats);
      mockDatabaseMonitorService.getSlowQueries.mockReturnValue(mockSlowQueries);

      const result = await controller.poolStatus();

      expect(result.connectionPool).toEqual(mockMetrics);
      expect(result.statistics).toEqual(mockStats);
      expect(result.slowQueries).toEqual(mockSlowQueries);
      expect(mockDatabaseMonitorService.getSlowQueries).toHaveBeenCalledWith(10);
    });

    it('should include connection pool usage information', async () => {
      mockDatabaseMonitorService.getConnectionPoolMetrics.mockResolvedValue({
        total: 20,
        active: 15,
        idle: 5,
        usage: { percentage: 75, isHigh: true, isCritical: false },
      });
      mockDatabaseMonitorService.getStats.mockReturnValue({});
      mockDatabaseMonitorService.getSlowQueries.mockReturnValue([]);

      const result = await controller.poolStatus();

      expect(result.connectionPool.usage.isHigh).toBe(true);
      expect(result.connectionPool.usage.percentage).toBe(75);
    });
  });

  describe('circuitBreakersStatus', () => {
    it('should return all circuit breaker statuses', async () => {
      const mockBreakers = [
        {
          name: 'user-api',
          state: 'CLOSED',
          stats: { fires: 100, successes: 95, failures: 5 },
        },
        {
          name: 'notification-api',
          state: 'OPEN',
          stats: { fires: 50, successes: 20, failures: 30 },
        },
      ];

      mockCircuitBreakerService.getAllBreakerStatus.mockReturnValue(mockBreakers);

      const result = await controller.circuitBreakersStatus();

      expect(result.breakers).toEqual(mockBreakers);
      expect(result.breakers).toHaveLength(2);
      expect(mockCircuitBreakerService.getAllBreakerStatus).toHaveBeenCalled();
    });

    it('should return empty array when no circuit breakers', async () => {
      mockCircuitBreakerService.getAllBreakerStatus.mockReturnValue([]);

      const result = await controller.circuitBreakersStatus();

      expect(result.breakers).toEqual([]);
      expect(result.breakers).toHaveLength(0);
    });
  });

  describe('partitionsHealth', () => {
    it('should return partition health information', async () => {
      const mockHealth = {
        healthy: true,
        issues: [],
        stats: { totalPartitions: 12, activePartitions: 12 },
      };

      const mockSummary = {
        totalPartitions: 12,
        oldestPartition: '2024-01',
        newestPartition: '2025-01',
      };

      const mockStats = [
        { partition: '2024-12', rows: 1000, size: '10 MB' },
        { partition: '2025-01', rows: 500, size: '5 MB' },
      ];

      mockPartitionManagerService.checkPartitionHealth.mockResolvedValue(mockHealth);
      mockPartitionManagerService.getPartitionSummary.mockResolvedValue(mockSummary);
      mockPartitionManagerService.getPartitionStats.mockResolvedValue(mockStats);

      const result = await controller.partitionsHealth();

      expect(result.health.healthy).toBe(true);
      expect(result.health.issues).toEqual([]);
      expect(result.summary).toEqual(mockSummary);
      expect(result.partitions).toEqual(mockStats);
    });

    it('should report partition issues when unhealthy', async () => {
      const mockHealth = {
        healthy: false,
        issues: ['Partition 2023-12 is too old', 'Missing partition for 2025-02'],
        stats: { totalPartitions: 10, activePartitions: 8 },
      };

      mockPartitionManagerService.checkPartitionHealth.mockResolvedValue(mockHealth);
      mockPartitionManagerService.getPartitionSummary.mockResolvedValue({});
      mockPartitionManagerService.getPartitionStats.mockResolvedValue([]);

      const result = await controller.partitionsHealth();

      expect(result.health.healthy).toBe(false);
      expect(result.health.issues).toHaveLength(2);
      expect(result.health.issues).toContain('Partition 2023-12 is too old');
    });

    it('should call all partition manager methods', async () => {
      mockPartitionManagerService.checkPartitionHealth.mockResolvedValue({
        healthy: true,
        issues: [],
        stats: {},
      });
      mockPartitionManagerService.getPartitionSummary.mockResolvedValue({});
      mockPartitionManagerService.getPartitionStats.mockResolvedValue([]);

      await controller.partitionsHealth();

      expect(mockPartitionManagerService.checkPartitionHealth).toHaveBeenCalledTimes(1);
      expect(mockPartitionManagerService.getPartitionSummary).toHaveBeenCalledTimes(1);
      expect(mockPartitionManagerService.getPartitionStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('K8s Probes Integration', () => {
    it('should have separate endpoints for liveness and readiness', async () => {
      mockHealthCheckService.liveness.mockResolvedValue({ status: 'ok' });
      mockHealthCheckService.readiness.mockResolvedValue({ status: 'error' });

      const liveness = await controller.liveness();
      const readiness = await controller.readiness();

      expect(liveness.status).toBe('ok');
      expect(readiness.status).toBe('error');
      expect(mockHealthCheckService.liveness).toHaveBeenCalled();
      expect(mockHealthCheckService.readiness).toHaveBeenCalled();
    });

    it('should allow liveness to succeed while readiness fails', async () => {
      mockHealthCheckService.liveness.mockResolvedValue({ status: 'ok' });
      mockHealthCheckService.readiness.mockResolvedValue({
        status: 'error',
        message: 'Database connection failed',
      });

      const liveness = await controller.liveness();
      const readiness = await controller.readiness();

      expect(liveness.status).toBe('ok');
      expect(readiness.status).toBe('error');
      expect((readiness as any).statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });
});
