import { Test, TestingModule } from '@nestjs/testing';
import { ProxyAdminController } from './proxy-admin.controller';
import { ProxyStatsService } from './proxy-stats.service';
import { ProxyHealthService } from './proxy-health.service';
import { ProxyCleanupService } from './proxy-cleanup.service';

describe('ProxyAdminController', () => {
  let controller: ProxyAdminController;
  let proxyStats: any;
  let proxyHealth: any;
  let proxyCleanup: any;

  const mockProxyStatsService = {
    getProxyUsageOverview: jest.fn(),
    getProxyPerformanceStats: jest.fn(),
    getProxyUsageDetails: jest.fn(),
    getDeviceProxyHistory: jest.fn(),
    getUserProxySummary: jest.fn(),
  };

  const mockProxyHealthService = {
    getUnhealthyProxies: jest.fn(),
    triggerBatchHealthCheck: jest.fn(),
  };

  const mockProxyCleanupService = {
    getOrphanStatistics: jest.fn(),
    triggerOrphanDetection: jest.fn(),
    triggerFullCleanup: jest.fn(),
    forceCleanupProxy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyAdminController],
      providers: [
        {
          provide: ProxyStatsService,
          useValue: mockProxyStatsService,
        },
        {
          provide: ProxyHealthService,
          useValue: mockProxyHealthService,
        },
        {
          provide: ProxyCleanupService,
          useValue: mockProxyCleanupService,
        },
      ],
    }).compile();

    controller = module.get<ProxyAdminController>(ProxyAdminController);
    proxyStats = module.get(ProxyStatsService);
    proxyHealth = module.get(ProxyHealthService);
    proxyCleanup = module.get(ProxyCleanupService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProxyStats', () => {
    it('should return proxy statistics with default 7 days', async () => {
      const mockOverview = {
        totalProxies: 100,
        activeProxies: 85,
        totalRequests: 5000,
        avgResponseTime: 250,
      };

      const mockOrphanStats = {
        orphanProxiesCount: 5,
        lastCleanupAt: new Date('2025-01-06T00:00:00.000Z'),
      };

      mockProxyStatsService.getProxyUsageOverview.mockResolvedValue(mockOverview);
      mockProxyCleanupService.getOrphanStatistics.mockResolvedValue(mockOrphanStats);

      const result = await controller.getProxyStats();

      expect(result.overview).toEqual(mockOverview);
      expect(result.orphanStats).toEqual(mockOrphanStats);
      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(proxyStats.getProxyUsageOverview).toHaveBeenCalledWith(7);
    });

    it('should return proxy statistics with custom days parameter', async () => {
      const mockOverview = { totalProxies: 50 };
      const mockOrphanStats = { orphanProxiesCount: 2 };

      mockProxyStatsService.getProxyUsageOverview.mockResolvedValue(mockOverview);
      mockProxyCleanupService.getOrphanStatistics.mockResolvedValue(mockOrphanStats);

      const result = await controller.getProxyStats('30');

      expect(proxyStats.getProxyUsageOverview).toHaveBeenCalledWith(30);
      expect(result.overview).toEqual(mockOverview);
    });

    it('should handle stats for different time periods', async () => {
      const periods = ['1', '7', '30', '90'];

      for (const days of periods) {
        mockProxyStatsService.getProxyUsageOverview.mockResolvedValue({});
        mockProxyCleanupService.getOrphanStatistics.mockResolvedValue({});

        await controller.getProxyStats(days);

        expect(proxyStats.getProxyUsageOverview).toHaveBeenCalledWith(parseInt(days, 10));
      }
    });
  });

  describe('getUnhealthyProxies', () => {
    it('should return list of unhealthy proxies', async () => {
      const mockUnhealthyProxies = [
        {
          proxyId: 'proxy-1',
          issue: 'connection_timeout',
          lastCheckAt: new Date('2025-01-06T00:00:00.000Z'),
        },
        {
          proxyId: 'proxy-2',
          issue: 'high_error_rate',
          lastCheckAt: new Date('2025-01-06T01:00:00.000Z'),
        },
      ];

      mockProxyHealthService.getUnhealthyProxies.mockResolvedValue(mockUnhealthyProxies);

      const result = await controller.getUnhealthyProxies();

      expect(result.count).toBe(2);
      expect(result.proxies).toEqual(mockUnhealthyProxies);
      expect(result.retrievedAt).toBeInstanceOf(Date);
      expect(proxyHealth.getUnhealthyProxies).toHaveBeenCalled();
    });

    it('should handle empty unhealthy proxies list', async () => {
      mockProxyHealthService.getUnhealthyProxies.mockResolvedValue([]);

      const result = await controller.getUnhealthyProxies();

      expect(result.count).toBe(0);
      expect(result.proxies).toHaveLength(0);
    });

    it('should return proxies with different issues', async () => {
      const mockProxies = [
        { proxyId: 'proxy-1', issue: 'connection_timeout' },
        { proxyId: 'proxy-2', issue: 'authentication_failed' },
        { proxyId: 'proxy-3', issue: 'banned_ip' },
      ];

      mockProxyHealthService.getUnhealthyProxies.mockResolvedValue(mockProxies);

      const result = await controller.getUnhealthyProxies();

      expect(result.count).toBe(3);
      expect(result.proxies[0].issue).toBe('connection_timeout');
      expect(result.proxies[1].issue).toBe('authentication_failed');
      expect(result.proxies[2].issue).toBe('banned_ip');
    });
  });

  describe('triggerHealthCheck', () => {
    it('should trigger batch health check and return result', async () => {
      const mockResult = {
        totalChecked: 100,
        healthyCount: 90,
        unhealthyCount: 10,
        duration: 5000,
      };

      mockProxyHealthService.triggerBatchHealthCheck.mockResolvedValue(mockResult);

      const result = await controller.triggerHealthCheck();

      expect(result.message).toBe('Batch health check completed');
      expect(result.result).toEqual(mockResult);
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(proxyHealth.triggerBatchHealthCheck).toHaveBeenCalled();
    });

    it('should handle health check with all healthy proxies', async () => {
      const mockResult = {
        totalChecked: 50,
        healthyCount: 50,
        unhealthyCount: 0,
      };

      mockProxyHealthService.triggerBatchHealthCheck.mockResolvedValue(mockResult);

      const result = await controller.triggerHealthCheck();

      expect(result.result.unhealthyCount).toBe(0);
    });
  });

  describe('detectOrphans', () => {
    it('should detect orphan proxies', async () => {
      const mockDetectionResult = {
        orphansDetected: 8,
        orphanProxies: [
          { proxyId: 'proxy-orphan-1', unusedSince: new Date() },
          { proxyId: 'proxy-orphan-2', unusedSince: new Date() },
        ],
      };

      mockProxyCleanupService.triggerOrphanDetection.mockResolvedValue(mockDetectionResult);

      const result = await controller.detectOrphans();

      expect(result.message).toBe('Orphan detection completed');
      expect(result.orphansDetected).toBe(8);
      expect(result.orphanProxies).toHaveLength(2);
      expect(result.detectedAt).toBeInstanceOf(Date);
      expect(proxyCleanup.triggerOrphanDetection).toHaveBeenCalled();
    });

    it('should handle no orphans detected', async () => {
      const mockDetectionResult = {
        orphansDetected: 0,
        orphanProxies: [],
      };

      mockProxyCleanupService.triggerOrphanDetection.mockResolvedValue(mockDetectionResult);

      const result = await controller.detectOrphans();

      expect(result.orphansDetected).toBe(0);
      expect(result.orphanProxies).toHaveLength(0);
    });
  });

  describe('triggerCleanup', () => {
    it('should trigger full cleanup and return result', async () => {
      const mockCleanupResult = {
        cleanedCount: 5,
        failedCount: 0,
        cleanedProxies: ['proxy-1', 'proxy-2', 'proxy-3', 'proxy-4', 'proxy-5'],
      };

      mockProxyCleanupService.triggerFullCleanup.mockResolvedValue(mockCleanupResult);

      const result = await controller.triggerCleanup();

      expect(result.message).toBe('Orphan cleanup completed');
      expect(result.cleanedCount).toBe(5);
      expect(result.failedCount).toBe(0);
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(proxyCleanup.triggerFullCleanup).toHaveBeenCalled();
    });

    it('should handle cleanup with some failures', async () => {
      const mockCleanupResult = {
        cleanedCount: 3,
        failedCount: 2,
        cleanedProxies: ['proxy-1', 'proxy-2', 'proxy-3'],
        failedProxies: ['proxy-4', 'proxy-5'],
      };

      mockProxyCleanupService.triggerFullCleanup.mockResolvedValue(mockCleanupResult);

      const result = await controller.triggerCleanup();

      expect(result.cleanedCount).toBe(3);
      expect(result.failedCount).toBe(2);
    });

    it('should handle cleanup with no proxies to clean', async () => {
      const mockCleanupResult = {
        cleanedCount: 0,
        failedCount: 0,
        cleanedProxies: [],
      };

      mockProxyCleanupService.triggerFullCleanup.mockResolvedValue(mockCleanupResult);

      const result = await controller.triggerCleanup();

      expect(result.cleanedCount).toBe(0);
    });
  });

  describe('forceReleaseProxy', () => {
    it('should force release a specific proxy', async () => {
      const proxyId = 'proxy-123';

      mockProxyCleanupService.forceCleanupProxy.mockResolvedValue(undefined);

      const result = await controller.forceReleaseProxy(proxyId);

      expect(result.message).toBe(`Proxy ${proxyId} force released successfully`);
      expect(result.proxyId).toBe(proxyId);
      expect(result.releasedAt).toBeInstanceOf(Date);
      expect(proxyCleanup.forceCleanupProxy).toHaveBeenCalledWith(proxyId);
    });

    it('should handle force release for multiple proxies', async () => {
      const proxyIds = ['proxy-1', 'proxy-2', 'proxy-3'];

      for (const proxyId of proxyIds) {
        await controller.forceReleaseProxy(proxyId);
        expect(proxyCleanup.forceCleanupProxy).toHaveBeenCalledWith(proxyId);
      }

      expect(proxyCleanup.forceCleanupProxy).toHaveBeenCalledTimes(3);
    });
  });

  describe('getProxyPerformance', () => {
    it('should return proxy performance statistics', async () => {
      const mockPerformance = {
        byCountry: {
          US: { avgLatency: 50, successRate: 0.95 },
          UK: { avgLatency: 60, successRate: 0.93 },
          CN: { avgLatency: 100, successRate: 0.88 },
        },
        byType: {
          http: { avgLatency: 55, successRate: 0.94 },
          https: { avgLatency: 65, successRate: 0.92 },
          socks5: { avgLatency: 70, successRate: 0.90 },
        },
      };

      mockProxyStatsService.getProxyPerformanceStats.mockResolvedValue(mockPerformance);

      const result = await controller.getProxyPerformance();

      expect(result.performance).toEqual(mockPerformance);
      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(proxyStats.getProxyPerformanceStats).toHaveBeenCalled();
    });

    it('should handle performance stats with multiple countries', async () => {
      const mockPerformance = {
        byCountry: {
          US: { avgLatency: 50 },
          UK: { avgLatency: 60 },
          DE: { avgLatency: 55 },
          JP: { avgLatency: 120 },
        },
      };

      mockProxyStatsService.getProxyPerformanceStats.mockResolvedValue(mockPerformance);

      const result = await controller.getProxyPerformance();

      expect(Object.keys(result.performance.byCountry).length).toBe(4);
    });
  });

  describe('getProxyDetails', () => {
    it('should return details for an existing proxy', async () => {
      const proxyId = 'proxy-123';
      const mockDetails = {
        proxyId: 'proxy-123',
        country: 'US',
        type: 'https',
        totalRequests: 500,
        successfulRequests: 475,
        failedRequests: 25,
        avgResponseTime: 150,
        lastUsedAt: new Date('2025-01-06T00:00:00.000Z'),
      };

      mockProxyStatsService.getProxyUsageDetails.mockResolvedValue(mockDetails);

      const result = await controller.getProxyDetails(proxyId);

      expect(result.proxyId).toBe(proxyId);
      expect(result.totalRequests).toBe(500);
      expect(result.retrievedAt).toBeInstanceOf(Date);
      expect(proxyStats.getProxyUsageDetails).toHaveBeenCalledWith(proxyId);
    });

    it('should handle proxy not found', async () => {
      const proxyId = 'proxy-nonexistent';

      mockProxyStatsService.getProxyUsageDetails.mockResolvedValue(null);

      const result = await controller.getProxyDetails(proxyId);

      expect(result.message).toBe('Proxy not found or never used');
      expect(result.proxyId).toBe(proxyId);
    });

    it('should return details for different proxy types', async () => {
      const proxyTypes = ['http', 'https', 'socks5'];

      for (const type of proxyTypes) {
        const mockDetails = {
          proxyId: `proxy-${type}`,
          type,
          totalRequests: 100,
        };

        mockProxyStatsService.getProxyUsageDetails.mockResolvedValue(mockDetails);

        const result = await controller.getProxyDetails(`proxy-${type}`);

        expect(result.type).toBe(type);
      }
    });
  });

  describe('getDeviceProxyHistory', () => {
    it('should return device proxy history with default limit', async () => {
      const deviceId = 'device-123';
      const mockHistory = [
        {
          proxyId: 'proxy-1',
          usedAt: new Date('2025-01-06T00:00:00.000Z'),
          duration: 3600,
        },
        {
          proxyId: 'proxy-2',
          usedAt: new Date('2025-01-06T01:00:00.000Z'),
          duration: 1800,
        },
      ];

      mockProxyStatsService.getDeviceProxyHistory.mockResolvedValue(mockHistory);

      const result = await controller.getDeviceProxyHistory(deviceId);

      expect(result.deviceId).toBe(deviceId);
      expect(result.historyCount).toBe(2);
      expect(result.history).toEqual(mockHistory);
      expect(result.retrievedAt).toBeInstanceOf(Date);
      expect(proxyStats.getDeviceProxyHistory).toHaveBeenCalledWith(deviceId, 10);
    });

    it('should return device proxy history with custom limit', async () => {
      const deviceId = 'device-456';
      const mockHistory = Array(50).fill({ proxyId: 'proxy-1' });

      mockProxyStatsService.getDeviceProxyHistory.mockResolvedValue(mockHistory);

      const result = await controller.getDeviceProxyHistory(deviceId, '50');

      expect(result.historyCount).toBe(50);
      expect(proxyStats.getDeviceProxyHistory).toHaveBeenCalledWith(deviceId, 50);
    });

    it('should handle device with no proxy history', async () => {
      const deviceId = 'device-new';

      mockProxyStatsService.getDeviceProxyHistory.mockResolvedValue([]);

      const result = await controller.getDeviceProxyHistory(deviceId);

      expect(result.historyCount).toBe(0);
      expect(result.history).toHaveLength(0);
    });
  });

  describe('getUserProxySummary', () => {
    it('should return user proxy usage summary', async () => {
      const userId = 'user-123';
      const mockSummary = {
        totalDevices: 5,
        totalProxiesUsed: 20,
        totalRequests: 10000,
        mostUsedProxy: 'proxy-us-1',
        avgSessionDuration: 1800,
      };

      mockProxyStatsService.getUserProxySummary.mockResolvedValue(mockSummary);

      const result = await controller.getUserProxySummary(userId);

      expect(result.userId).toBe(userId);
      expect(result.totalDevices).toBe(5);
      expect(result.totalProxiesUsed).toBe(20);
      expect(result.retrievedAt).toBeInstanceOf(Date);
      expect(proxyStats.getUserProxySummary).toHaveBeenCalledWith(userId);
    });

    it('should handle user with no proxy usage', async () => {
      const userId = 'user-new';
      const mockSummary = {
        totalDevices: 0,
        totalProxiesUsed: 0,
        totalRequests: 0,
      };

      mockProxyStatsService.getUserProxySummary.mockResolvedValue(mockSummary);

      const result = await controller.getUserProxySummary(userId);

      expect(result.totalDevices).toBe(0);
      expect(result.totalProxiesUsed).toBe(0);
    });

    it('should return summary for different users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];

      for (const userId of userIds) {
        const mockSummary = {
          totalDevices: Math.floor(Math.random() * 10),
          totalProxiesUsed: Math.floor(Math.random() * 50),
        };

        mockProxyStatsService.getUserProxySummary.mockResolvedValue(mockSummary);

        const result = await controller.getUserProxySummary(userId);

        expect(result.userId).toBe(userId);
        expect(proxyStats.getUserProxySummary).toHaveBeenCalledWith(userId);
      }
    });
  });

  describe('Response Format', () => {
    it('should include timestamp in all responses', async () => {
      mockProxyStatsService.getProxyUsageOverview.mockResolvedValue({});
      mockProxyCleanupService.getOrphanStatistics.mockResolvedValue({});
      mockProxyHealthService.getUnhealthyProxies.mockResolvedValue([]);
      mockProxyHealthService.triggerBatchHealthCheck.mockResolvedValue({});
      mockProxyCleanupService.triggerOrphanDetection.mockResolvedValue({});

      const statsResult = await controller.getProxyStats();
      const unhealthyResult = await controller.getUnhealthyProxies();
      const healthCheckResult = await controller.triggerHealthCheck();
      const orphansResult = await controller.detectOrphans();

      expect(statsResult.generatedAt).toBeInstanceOf(Date);
      expect(unhealthyResult.retrievedAt).toBeInstanceOf(Date);
      expect(healthCheckResult.completedAt).toBeInstanceOf(Date);
      expect(orphansResult.detectedAt).toBeInstanceOf(Date);
    });

    it('should return message property for action endpoints', async () => {
      mockProxyHealthService.triggerBatchHealthCheck.mockResolvedValue({});
      mockProxyCleanupService.triggerOrphanDetection.mockResolvedValue({});
      mockProxyCleanupService.triggerFullCleanup.mockResolvedValue({});
      mockProxyCleanupService.forceCleanupProxy.mockResolvedValue(undefined);

      const healthCheckResult = await controller.triggerHealthCheck();
      const orphansResult = await controller.detectOrphans();
      const cleanupResult = await controller.triggerCleanup();
      const releaseResult = await controller.forceReleaseProxy('proxy-1');

      expect(healthCheckResult.message).toBeDefined();
      expect(orphansResult.message).toBeDefined();
      expect(cleanupResult.message).toBeDefined();
      expect(releaseResult.message).toBeDefined();
    });

    it('should handle concurrent requests properly', async () => {
      mockProxyStatsService.getProxyUsageOverview.mockResolvedValue({});
      mockProxyCleanupService.getOrphanStatistics.mockResolvedValue({});
      mockProxyHealthService.getUnhealthyProxies.mockResolvedValue([]);
      mockProxyStatsService.getProxyPerformanceStats.mockResolvedValue({});

      const promises = [
        controller.getProxyStats(),
        controller.getUnhealthyProxies(),
        controller.getProxyPerformance(),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results[0].generatedAt).toBeInstanceOf(Date);
      expect(results[1].retrievedAt).toBeInstanceOf(Date);
      expect(results[2].generatedAt).toBeInstanceOf(Date);
    });
  });
});
