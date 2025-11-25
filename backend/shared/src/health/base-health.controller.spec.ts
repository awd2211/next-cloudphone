import { BaseHealthController, DependencyChecker, DependencyHealth } from './base-health.controller';

// Concrete implementation for testing
class TestHealthController extends BaseHealthController {
  constructor() {
    super('test-service', '1.0.0');
  }

  protected getServiceDetails(): Record<string, any> {
    return {
      description: 'Test Service',
      capabilities: ['feature1', 'feature2'],
    };
  }

  protected getMetadata(): Record<string, any> {
    return {
      region: 'us-east-1',
      environment: 'test',
    };
  }
}

describe('BaseHealthController', () => {
  let controller: TestHealthController;

  beforeEach(() => {
    controller = new TestHealthController();
  });

  describe('check', () => {
    it('should return ok status when no checkers registered', async () => {
      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('test-service');
      expect(result.version).toBe('1.0.0');
      expect(result.dependencies).toEqual({});
    });

    it('should return ok when all dependencies healthy', async () => {
      const healthyChecker: DependencyChecker = {
        name: 'database',
        critical: true,
        check: async () => ({ status: 'healthy', responseTime: 10 }),
      };
      controller['registerChecker'](healthyChecker);

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.dependencies.database.status).toBe('healthy');
    });

    it('should return degraded when non-critical dependency is unhealthy', async () => {
      const criticalHealthy: DependencyChecker = {
        name: 'database',
        critical: true,
        check: async () => ({ status: 'healthy' }),
      };
      const nonCriticalUnhealthy: DependencyChecker = {
        name: 'cache',
        critical: false,
        check: async () => ({ status: 'unhealthy', message: 'Cache down' }),
      };
      controller['registerChecker'](criticalHealthy);
      controller['registerChecker'](nonCriticalUnhealthy);

      const result = await controller.check();

      expect(result.status).toBe('degraded');
    });

    it('should return unhealthy when critical dependency is unhealthy', async () => {
      const criticalUnhealthy: DependencyChecker = {
        name: 'database',
        critical: true,
        check: async () => ({ status: 'unhealthy', message: 'Connection refused' }),
      };
      controller['registerChecker'](criticalUnhealthy);

      const result = await controller.check();

      expect(result.status).toBe('unhealthy');
    });

    it('should return shutting_down when marked', async () => {
      controller.markShuttingDown();

      const result = await controller.check();

      expect(result.status).toBe('shutting_down');
    });

    it('should handle checker exceptions', async () => {
      const throwingChecker: DependencyChecker = {
        name: 'flaky-service',
        critical: false,
        check: async () => {
          throw new Error('Connection timeout');
        },
      };
      controller['registerChecker'](throwingChecker);

      const result = await controller.check();

      expect(result.dependencies['flaky-service'].status).toBe('unhealthy');
      expect(result.dependencies['flaky-service'].message).toBe('Connection timeout');
    });

    it('should include system info', async () => {
      const result = await controller.check();

      expect(result.system).toBeDefined();
      expect(result.system.hostname).toBeDefined();
      expect(result.system.platform).toBeDefined();
      expect(result.system.nodeVersion).toBeDefined();
      expect(result.system.memory).toBeDefined();
      expect(result.system.cpu).toBeDefined();
    });

    it('should include metadata from subclass', async () => {
      const result = await controller.check();

      expect(result.metadata).toEqual({
        region: 'us-east-1',
        environment: 'test',
      });
    });
  });

  describe('liveness', () => {
    it('should return ok for liveness probe', async () => {
      const result = await controller.liveness();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('test-service');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return shutting_down when marked', async () => {
      controller.markShuttingDown();

      const result = await controller.liveness();

      expect(result.status).toBe('shutting_down');
    });
  });

  describe('readiness', () => {
    it('should return ok when all critical dependencies healthy', async () => {
      const criticalChecker: DependencyChecker = {
        name: 'database',
        critical: true,
        check: async () => ({ status: 'healthy' }),
      };
      controller['registerChecker'](criticalChecker);

      const result = await controller.readiness();

      expect(result.status).toBe('ok');
    });

    it('should return error when critical dependency unhealthy', async () => {
      const criticalChecker: DependencyChecker = {
        name: 'database',
        critical: true,
        check: async () => ({ status: 'unhealthy' }),
      };
      controller['registerChecker'](criticalChecker);

      const result = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.message).toBe('Critical dependencies unhealthy');
    });

    it('should return error when shutting down', async () => {
      controller.markShuttingDown();

      const result = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.message).toBe('Service is shutting down');
    });

    it('should ignore non-critical dependencies', async () => {
      const nonCriticalUnhealthy: DependencyChecker = {
        name: 'cache',
        critical: false,
        check: async () => ({ status: 'unhealthy' }),
      };
      controller['registerChecker'](nonCriticalUnhealthy);

      const result = await controller.readiness();

      // No critical dependencies, so should be ok
      expect(result.status).toBe('ok');
    });
  });

  describe('detailedCheck', () => {
    it('should include service details and checker info', async () => {
      const checker: DependencyChecker = {
        name: 'test-dep',
        critical: true,
        check: async () => ({ status: 'healthy' }),
      };
      controller['registerChecker'](checker);

      const result = await controller.detailedCheck();

      expect(result.details).toEqual({
        description: 'Test Service',
        capabilities: ['feature1', 'feature2'],
      });
      expect(result.checkers).toContainEqual({
        name: 'test-dep',
        critical: true,
      });
    });
  });

  describe('helper methods', () => {
    describe('checkDatabase', () => {
      it('should return healthy for fast database', async () => {
        const mockDataSource = {
          query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
          isInitialized: true,
        };

        const result = await controller['checkDatabase'](mockDataSource);

        expect(result.status).toBe('healthy');
        expect(result.responseTime).toBeDefined();
      });

      it('should return unhealthy for uninitialized database', async () => {
        const mockDataSource = {
          query: jest.fn(),
          isInitialized: false,
        };

        const result = await controller['checkDatabase'](mockDataSource);

        expect(result.status).toBe('unhealthy');
        expect(result.message).toBe('Database not initialized');
      });

      it('should return unhealthy on query error', async () => {
        const mockDataSource = {
          query: jest.fn().mockRejectedValue(new Error('Connection refused')),
          isInitialized: true,
        };

        const result = await controller['checkDatabase'](mockDataSource);

        expect(result.status).toBe('unhealthy');
        expect(result.message).toContain('Database error');
      });
    });

    describe('checkRedis', () => {
      it('should return healthy for successful ping', async () => {
        const mockRedis = {
          ping: jest.fn().mockResolvedValue('PONG'),
        };

        const result = await controller['checkRedis'](mockRedis);

        expect(result.status).toBe('healthy');
      });

      it('should return unhealthy for failed ping', async () => {
        const mockRedis = {
          ping: jest.fn().mockResolvedValue('ERROR'),
        };

        const result = await controller['checkRedis'](mockRedis);

        expect(result.status).toBe('unhealthy');
        expect(result.message).toBe('Redis PING failed');
      });

      it('should return unhealthy on error', async () => {
        const mockRedis = {
          ping: jest.fn().mockRejectedValue(new Error('Redis unavailable')),
        };

        const result = await controller['checkRedis'](mockRedis);

        expect(result.status).toBe('unhealthy');
        expect(result.message).toContain('Redis error');
      });
    });

    describe('checkRabbitMQ', () => {
      it('should return healthy when connected', async () => {
        const mockConnection = {
          isConnected: jest.fn().mockReturnValue(true),
        };

        const result = await controller['checkRabbitMQ'](mockConnection);

        expect(result.status).toBe('healthy');
      });

      it('should return unhealthy when disconnected', async () => {
        const mockConnection = {
          isConnected: jest.fn().mockReturnValue(false),
        };

        const result = await controller['checkRabbitMQ'](mockConnection);

        expect(result.status).toBe('unhealthy');
      });
    });
  });

  describe('uptime', () => {
    it('should return positive uptime', async () => {
      // Wait a small amount to ensure uptime > 0
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await controller.check();

      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
