import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

describe('HealthController', () => {
  let controller: HealthController;
  let mockDataSource: any;
  let mockRedis: any;

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn(),
    };

    mockRedis = {
      ping: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: mockRedis,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('check', () => {
    it('should return healthy status when all dependencies are healthy', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockRedis.ping.mockResolvedValue('PONG');

      const result: any = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('notification-service');
      expect(result.version).toBe('1.0.0');
      expect(result.dependencies.database.status).toBe('healthy');
      expect(result.dependencies.redis.status).toBe('healthy');
    });

    it('should return degraded status when database is unhealthy', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Database connection failed'));
      mockRedis.ping.mockResolvedValue('PONG');

      const result: any = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.database.status).toBe('unhealthy');
      expect(result.dependencies.database.message).toBe('Database connection failed');
      expect(result.dependencies.redis.status).toBe('healthy');
    });

    it('should return degraded status when redis is unhealthy', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'));

      const result: any = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.database.status).toBe('healthy');
      expect(result.dependencies.redis.status).toBe('unhealthy');
      expect(result.dependencies.redis.message).toBe('Redis connection failed');
    });

    it('should include system information', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockRedis.ping.mockResolvedValue('PONG');

      const result: any = await controller.check();

      expect(result.system).toBeDefined();
      expect(result.system.hostname).toBeDefined();
      expect(result.system.platform).toBeDefined();
      expect(result.system.memory).toBeDefined();
      expect(result.system.memory.total).toBeGreaterThan(0);
      expect(result.system.cpu).toBeDefined();
      expect(result.system.cpu.cores).toBeGreaterThan(0);
    });

    it('should include environment information', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockRedis.ping.mockResolvedValue('PONG');

      const result: any = await controller.check();

      expect(result.environment).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include response time for healthy dependencies', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockRedis.ping.mockResolvedValue('PONG');

      const result: any = await controller.check();

      expect(result.dependencies.database.responseTime).toBeDefined();
      expect(result.dependencies.database.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.dependencies.redis.responseTime).toBeDefined();
      expect(result.dependencies.redis.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('detailedCheck', () => {
    it('should return detailed health information', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockRedis.ping.mockResolvedValue('PONG');

      const result: any = await controller.detailedCheck();

      expect(result.status).toBe('ok');
      expect(result.details).toBeDefined();
      expect(result.details.description).toContain('Notification Service');
      expect(result.details.capabilities).toBeInstanceOf(Array);
    });

    it('should include all service capabilities', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockRedis.ping.mockResolvedValue('PONG');

      const result: any = await controller.detailedCheck();

      expect(result.details.capabilities).toHaveLength(6);
      expect(result.details.capabilities).toContain('WebSocket real-time notifications');
      expect(result.details.capabilities).toContain('Email notifications with templates');
      expect(result.details.capabilities).toContain('Template management system');
    });

    it('should include all basic health check fields', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockRedis.ping.mockResolvedValue('PONG');

      const result: any = await controller.detailedCheck();

      expect(result.service).toBe('notification-service');
      expect(result.version).toBe('1.0.0');
      expect(result.dependencies).toBeDefined();
      expect(result.system).toBeDefined();
    });

    it('should show degraded status in detailed check when dependencies unhealthy', async () => {
      mockDataSource.query.mockRejectedValue(new Error('DB error'));
      mockRedis.ping.mockResolvedValue('PONG');

      const result: any = await controller.detailedCheck();

      expect(result.status).toBe('degraded');
      expect(result.details).toBeDefined();
    });
  });

  describe('liveness', () => {
    it('should return ok status for liveness probe', async () => {
      const result: any = await controller.liveness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });

    it('should return timestamp in ISO format', async () => {
      const result: any = await controller.liveness();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should track service uptime', async () => {
      const result: any = await controller.liveness();

      expect(result.uptime).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should always return ok regardless of dependencies', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Database offline'));
      mockRedis.ping.mockRejectedValue(new Error('Redis offline'));

      const result: any = await controller.liveness();

      expect(result.status).toBe('ok');
    });

    it('should return only minimal fields for liveness', async () => {
      const result: any = await controller.liveness();

      expect(Object.keys(result)).toHaveLength(3);
      expect(result.status).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
    });
  });

  describe('readiness', () => {
    it('should return ok status when all critical dependencies are healthy', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockRedis.ping.mockResolvedValue('PONG');

      const result: any = await controller.readiness();

      expect(result.status).toBe('ok');
      expect(result.dependencies.database).toBe('healthy');
      expect(result.dependencies.redis).toBe('healthy');
    });

    it('should return error status when database is unhealthy', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Database connection failed'));
      mockRedis.ping.mockResolvedValue('PONG');

      const result: any = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.message).toContain('not ready');
      expect(result.dependencies.database).toBe('unhealthy');
    });

    it('should return error status when redis is unhealthy', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'));

      const result: any = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.dependencies.redis).toBe('unhealthy');
    });

    it('should include timestamp when ready', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockRedis.ping.mockResolvedValue('PONG');

      const result: any = await controller.readiness();

      expect(result.timestamp).toBeDefined();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle timeout errors gracefully', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection timeout'));
      mockRedis.ping.mockResolvedValue('PONG');

      const result: any = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.message).toBeDefined();
    });

    it('should handle connection pool exhaustion', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection pool exhausted'));
      mockRedis.ping.mockResolvedValue('PONG');

      const result: any = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.dependencies.database).toBe('unhealthy');
    });

    it('should return different status from liveness when dependencies fail', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Database offline'));
      mockRedis.ping.mockRejectedValue(new Error('Redis offline'));

      const livenessResult: any = await controller.liveness();
      const readinessResult: any = await controller.readiness();

      expect(livenessResult.status).toBe('ok');
      expect(readinessResult.status).toBe('error');
    });

    it('should handle Redis PING returning non-PONG', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockRedis.ping.mockResolvedValue('ERROR');

      const result: any = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.dependencies.redis).toBe('unhealthy');
    });
  });
});
