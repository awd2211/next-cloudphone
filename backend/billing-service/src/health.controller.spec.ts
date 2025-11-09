import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';

describe('HealthController', () => {
  let controller: HealthController;
  let dataSource: any;

  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('check', () => {
    it('should return healthy status when database is healthy', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result: any = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('billing-service');
      expect(result.version).toBe('1.0.0');
      expect(result.dependencies.database?.status).toBe('healthy');
      expect(result.dependencies.database?.responseTime).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return degraded status when database is unhealthy', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection refused'));

      const result: any = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.database?.status).toBe('unhealthy');
      expect(result.dependencies.database?.message).toBe('Connection refused');
    });

    it('should include system information', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result: any = await controller.check();

      expect(result.system).toBeDefined();
      expect(result.system.hostname).toBeDefined();
      expect(result.system.platform).toBeDefined();
      expect(result.system.memory).toBeDefined();
      expect(result.system.memory.total).toBeGreaterThan(0);
      expect(result.system.memory.free).toBeGreaterThanOrEqual(0);
      expect(result.system.memory.used).toBeGreaterThanOrEqual(0);
      expect(result.system.memory.usagePercent).toBeGreaterThanOrEqual(0);
      expect(result.system.cpu).toBeDefined();
      expect(result.system.cpu.cores).toBeGreaterThan(0);
    });

    it('should include current environment', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result: any = await controller.check();

      expect(result.environment).toBeDefined();
      expect(['development', 'production', 'test']).toContain(
        result.environment || 'development',
      );
    });

    it('should measure database response time', async () => {
      mockDataSource.query.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve([{ '?column?': 1 }]), 10);
        });
      });

      const result: any = await controller.check();

      expect(result.dependencies.database?.status).toBe('healthy');
      expect(result.dependencies.database?.responseTime).toBeGreaterThanOrEqual(10);
    });

    it('should have increasing uptime', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result1: any = await controller.check();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result2: any = await controller.check();

      expect(result2.uptime).toBeGreaterThanOrEqual(result1.uptime);
    });
  });

  describe('detailed', () => {
    it('should return detailed health information', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result: any = await controller.detailed();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('billing-service');
      expect(result.details).toBeDefined();
      expect(result.details.description).toBe(
        'Billing Service - Payment and Subscription Management',
      );
      expect(result.details.capabilities).toBeDefined();
      expect(result.details.capabilities).toBeInstanceOf(Array);
    });

    it('should include all service capabilities', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result: any = await controller.detailed();

      const capabilities = result.details.capabilities;

      expect(capabilities).toContain('User balance management');
      expect(capabilities).toContain('Payment processing (Alipay, WeChat Pay, PayPal)');
      expect(capabilities).toContain('Subscription plan management');
      expect(capabilities).toContain('Usage metering and billing');
      expect(capabilities).toContain('Invoice generation');
      expect(capabilities).toContain('Transaction history tracking');
      expect(capabilities).toContain('Automated recurring billing');
      expect(capabilities.length).toBe(7);
    });

    it('should return degraded status with details when database unhealthy', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection timeout'));

      const result: any = await controller.detailed();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.database?.status).toBe('unhealthy');
      expect(result.details).toBeDefined();
      expect(result.details.capabilities).toHaveLength(7);
    });

    it('should include all basic health check fields', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result: any = await controller.detailed();

      expect(result.status).toBeDefined();
      expect(result.service).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.environment).toBeDefined();
      expect(result.dependencies).toBeDefined();
      expect(result.system).toBeDefined();
    });
  });

  describe('liveness', () => {
    it('should return ok status', async () => {
      const result: any = await controller.liveness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return timestamp in ISO format', async () => {
      const result: any = await controller.liveness();

      const timestamp = new Date(result.timestamp);
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });

    it('should track uptime correctly', async () => {
      const result1: any = await controller.liveness();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result2: any = await controller.liveness();

      expect(result2.uptime).toBeGreaterThanOrEqual(result1.uptime);
    });

    it('should always return ok regardless of dependencies', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Database down'));

      const result: any = await controller.liveness();

      expect(result.status).toBe('ok');
    });

    it('should have minimal response fields', async () => {
      const result: any = await controller.liveness();

      const keys = Object.keys(result);
      expect(keys).toContain('status');
      expect(keys).toContain('timestamp');
      expect(keys).toContain('uptime');
      expect(keys.length).toBe(3);
    });
  });

  describe('readiness', () => {
    it('should return ok status when database is healthy', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result: any = await controller.readiness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.dependencies).toBeDefined();
      expect(result.dependencies.database).toBe('healthy');
    });

    it('should return error status when database is unhealthy', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection failed'));

      const result: any = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.message).toBe('Service not ready - critical dependencies unhealthy');
      expect(result.dependencies.database).toBe('unhealthy');
    });

    it('should check database connection', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      await controller.readiness();

      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should handle database timeout', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Query timeout'));

      const result: any = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.dependencies.database).toBe('unhealthy');
    });

    it('should include timestamp when ready', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result: any = await controller.readiness();

      expect(result.timestamp).toBeDefined();
      const timestamp = new Date(result.timestamp);
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });

    it('should not include timestamp when not ready', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection error'));

      const result: any = await controller.readiness();

      expect(result.timestamp).toBeUndefined();
    });

    it('should handle database connection pool exhaustion', async () => {
      mockDataSource.query.mockRejectedValue(
        new Error('Connection pool exhausted'),
      );

      const result: any = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.message).toContain('critical dependencies unhealthy');
    });

    it('should return different status for liveness vs readiness', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Database offline'));

      const livenessResult: any = await controller.liveness();
      const readinessResult: any = await controller.readiness();

      expect(livenessResult.status).toBe('ok');
      expect(readinessResult.status).toBe('error');
    });
  });
});
