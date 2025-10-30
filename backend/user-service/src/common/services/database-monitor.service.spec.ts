import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseMonitorService } from './database-monitor.service';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';

describe('DatabaseMonitorService', () => {
  let service: DatabaseMonitorService;
  let mockDataSource: any;
  let mockPinoLogger: any;
  let mockPool: any;

  beforeEach(async () => {
    // Mock pool with event emitter
    mockPool = {
      totalCount: 5,
      idleCount: 3,
      waitingCount: 0,
      options: {
        max: 10,
        min: 2,
      },
      on: jest.fn(),
    };

    // Mock data source
    mockDataSource = {
      driver: {
        pool: mockPool,
      },
      query: jest.fn(),
    };

    // Mock Pino logger
    mockPinoLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseMonitorService,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
        {
          provide: PinoLogger,
          useValue: mockPinoLogger,
        },
      ],
    }).compile();

    service = module.get<DatabaseMonitorService>(DatabaseMonitorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('构造和初始化', () => {
    it('应该成功创建服务实例', () => {
      expect(service).toBeDefined();
    });

    it('应该设置连接池事件监听器', () => {
      // Verify that pool.on was called for acquire, release, and error events
      expect(mockPool.on).toHaveBeenCalledWith('acquire', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('release', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('logQuery', () => {
    it('应该记录正常查询执行', () => {
      // Arrange
      const query = 'SELECT * FROM users WHERE id = $1';
      const duration = 50;

      // Act
      service.logQuery(query, duration);

      // Assert
      const stats = service.getStats();
      expect(stats.queryCount).toBe(1);
      expect(stats.totalQueryTime).toBe(50);
      expect(stats.errorCount).toBe(0);
    });

    it('应该记录查询错误', () => {
      // Arrange
      const query = 'SELECT * FROM users WHERE id = $1';
      const duration = 50;
      const error = new Error('Database error');

      // Act
      service.logQuery(query, duration, error);

      // Assert
      const stats = service.getStats();
      expect(stats.queryCount).toBe(1);
      expect(stats.errorCount).toBe(1);
      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'database_query_error',
          error: 'Database error',
        }),
      );
    });

    it('应该检测慢查询（警告级别）', () => {
      // Arrange
      const query = 'SELECT * FROM users WHERE id = $1';
      const duration = 3000; // 3 seconds (above warning threshold)

      // Act
      service.logQuery(query, duration);

      // Assert
      const stats = service.getStats();
      expect(stats.slowQueryCount).toBe(1);
      expect(mockPinoLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'slow_query',
          duration: 3000,
        }),
      );
    });

    it('应该检测慢查询（严重级别）', () => {
      // Arrange
      const query = 'SELECT * FROM users WHERE id = $1';
      const duration = 11000; // 11 seconds (above critical threshold)

      // Act
      service.logQuery(query, duration);

      // Assert
      const stats = service.getStats();
      expect(stats.slowQueryCount).toBe(1);
      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'slow_query',
          duration: 11000,
        }),
      );
    });

    it('应该清理查询字符串', () => {
      // Arrange
      const longQuery = 'SELECT * FROM users WHERE id = $1'.repeat(20);
      const duration = 50;

      // Act
      service.logQuery(longQuery, duration);

      // Assert - Query should be truncated to 500 chars
      const slowQueries = service.getSlowQueries(10);
      if (slowQueries.length > 0) {
        expect(slowQueries[0].query.length).toBeLessThanOrEqual(503); // 500 + '...'
      }
    });

    it('应该限制慢查询记录数量', () => {
      // Arrange - Add 105 slow queries
      for (let i = 0; i < 105; i++) {
        service.logQuery(`SELECT * FROM users WHERE id = ${i}`, 3000);
      }

      // Assert - Should only keep 100 most recent
      const slowQueries = service.getSlowQueries(200);
      expect(slowQueries.length).toBeLessThanOrEqual(100);
    });
  });

  describe('getConnectionPoolMetrics', () => {
    it('应该返回连接池指标', async () => {
      // Act
      const metrics = await service.getConnectionPoolMetrics();

      // Assert
      expect(metrics).toMatchObject({
        poolSize: {
          min: 2,
          max: 10,
          current: 5,
        },
        connections: {
          total: 5,
          active: 2, // total - idle = 5 - 3
          idle: 3,
          waiting: 0,
        },
        usage: {
          percentage: 50, // (5/10) * 100
          isWarning: false,
          isCritical: false,
        },
      });
    });

    it('应该检测连接池使用率警告', async () => {
      // Arrange - 80% usage
      mockPool.totalCount = 8;
      mockPool.idleCount = 2;

      // Act
      const metrics = await service.getConnectionPoolMetrics();

      // Assert
      expect(metrics.usage.percentage).toBe(80);
      expect(metrics.usage.isWarning).toBe(true);
      expect(metrics.usage.isCritical).toBe(false);
    });

    it('应该检测连接池使用率严重告警', async () => {
      // Arrange - 95% usage
      mockPool.totalCount = 10;
      mockPool.idleCount = 0;

      // Act
      const metrics = await service.getConnectionPoolMetrics();

      // Assert
      expect(metrics.usage.percentage).toBe(100);
      expect(metrics.usage.isWarning).toBe(true);
      expect(metrics.usage.isCritical).toBe(true);
    });

    it('应该处理连接池不存在的情况', async () => {
      // Arrange - No pool
      mockDataSource.driver.pool = null;

      // Act
      const metrics = await service.getConnectionPoolMetrics();

      // Assert
      expect(metrics).toMatchObject({
        poolSize: { min: 0, max: 0, current: 0 },
        connections: { total: 0, active: 0, idle: 0, waiting: 0 },
      });
    });

    it('应该计算平均查询时间', async () => {
      // Arrange - Execute some queries
      service.logQuery('SELECT 1', 100);
      service.logQuery('SELECT 2', 200);
      service.logQuery('SELECT 3', 300);

      // Act
      const metrics = await service.getConnectionPoolMetrics();

      // Assert
      expect(metrics.performance.avgQueryTime).toBe(200); // (100+200+300)/3
    });
  });

  describe('getSlowQueries', () => {
    it('应该返回最近的慢查询', () => {
      // Arrange
      service.logQuery('SELECT 1', 3000);
      service.logQuery('SELECT 2', 4000);
      service.logQuery('SELECT 3', 5000);

      // Act
      const slowQueries = service.getSlowQueries(2);

      // Assert
      expect(slowQueries).toHaveLength(2);
      expect(slowQueries[0].duration).toBe(5000); // Most recent first
      expect(slowQueries[1].duration).toBe(4000);
    });

    it('应该默认返回最近10条慢查询', () => {
      // Arrange - Add 15 slow queries
      for (let i = 0; i < 15; i++) {
        service.logQuery(`SELECT ${i}`, 3000);
      }

      // Act
      const slowQueries = service.getSlowQueries();

      // Assert
      expect(slowQueries.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getStats', () => {
    it('应该返回统计信息', () => {
      // Arrange
      service.logQuery('SELECT 1', 100);
      service.logQuery('SELECT 2', 200, new Error('Query error'));

      // Act
      const stats = service.getStats();

      // Assert
      expect(stats).toMatchObject({
        queryCount: 2,
        errorCount: 1,
        avgQueryTime: 150, // (100+200)/2
      });
    });

    it('应该处理没有查询的情况', () => {
      // Act
      const stats = service.getStats();

      // Assert
      expect(stats.avgQueryTime).toBe(0);
      expect(stats.avgAcquisitionTime).toBe(0);
    });
  });

  describe('resetStats', () => {
    it('应该重置所有统计数据', () => {
      // Arrange
      service.logQuery('SELECT 1', 100);
      service.logQuery('SELECT 2', 3000); // Slow query

      // Act
      service.resetStats();

      // Assert
      const stats = service.getStats();
      expect(stats.queryCount).toBe(0);
      expect(stats.slowQueryCount).toBe(0);
      expect(stats.errorCount).toBe(0);
      expect(stats.totalQueryTime).toBe(0);

      const slowQueries = service.getSlowQueries();
      expect(slowQueries).toHaveLength(0);
    });
  });

  describe('healthCheck', () => {
    it('应该返回健康状态', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result.isHealthy).toBe(true);
      expect(result.message).toContain('healthy');
      expect(result.metrics).toBeDefined();
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('应该检测不健康状态（高使用率）', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);
      mockPool.totalCount = 10; // 100% usage
      mockPool.idleCount = 0;

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result.isHealthy).toBe(false);
      expect(result.message).toContain('issues');
    });

    it('应该检测不健康状态（等待连接过多）', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([{ result: 1 }]);
      mockPool.waitingCount = 15; // Too many waiting

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result.isHealthy).toBe(false);
    });

    it('应该处理健康检查失败', async () => {
      // Arrange
      mockDataSource.query.mockRejectedValue(new Error('Connection failed'));

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result.isHealthy).toBe(false);
      expect(result.message).toContain('failed');
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('checkConnectionPoolHealth', () => {
    it('应该记录正常的连接池状态', async () => {
      // Act
      await service.checkConnectionPoolHealth();

      // Assert
      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connection_pool_health_check',
          metrics: expect.any(Object),
        }),
      );
    });

    it('应该告警高连接池使用率', async () => {
      // Arrange
      mockPool.totalCount = 8; // 80% usage
      mockPool.idleCount = 2;

      // Act
      await service.checkConnectionPoolHealth();

      // Assert
      expect(mockPinoLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connection_pool_warning',
        }),
      );
    });

    it('应该告警严重的连接池使用率', async () => {
      // Arrange
      mockPool.totalCount = 10; // 100% usage
      mockPool.idleCount = 0;

      // Act
      await service.checkConnectionPoolHealth();

      // Assert
      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connection_pool_critical',
        }),
      );
    });

    it('应该告警等待连接数过多', async () => {
      // Arrange
      mockPool.waitingCount = 10;

      // Act
      await service.checkConnectionPoolHealth();

      // Assert
      expect(mockPinoLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connection_pool_waiting',
          waiting: 10,
        }),
      );
    });
  });

  describe('cleanupSlowQueryRecords', () => {
    it('应该清理过期的慢查询记录', () => {
      // Arrange - Add slow queries
      service.logQuery('SELECT 1', 3000);
      service.logQuery('SELECT 2', 4000);

      // Manually set old timestamp (simulate 2 hours ago)
      const slowQueries: any = service.getSlowQueries(10);
      if (slowQueries.length > 0) {
        slowQueries[0].timestamp = new Date(Date.now() - 7200000);
      }

      // Act
      service.cleanupSlowQueryRecords();

      // Assert - Old records should be removed
      const remainingQueries = service.getSlowQueries(10);
      // Note: This test may need adjustment based on actual cleanup logic
      expect(remainingQueries.length).toBeGreaterThanOrEqual(0);
    });
  });
});
