import { Test, TestingModule } from '@nestjs/testing';
import { ProxyIntelligenceController } from './proxy-intelligence.controller';
import { ProxyIntelligenceService } from '../services/proxy-intelligence.service';
import { ProxyQualityService } from '../services/proxy-quality.service';
import { ProxyFailoverService } from '../services/proxy-failover.service';

describe('ProxyIntelligenceController', () => {
  let controller: ProxyIntelligenceController;
  let intelligenceService: any;
  let qualityService: any;
  let failoverService: any;

  const mockIntelligenceService = {
    recommendProxy: jest.fn(),
    recommendBatch: jest.fn(),
    getWebsiteMapping: jest.fn(),
    getDeviceAffinity: jest.fn(),
  };

  const mockQualityService = {
    getQualityScore: jest.fn(),
    getQualityScoreBatch: jest.fn(),
    getQualityDistribution: jest.fn(),
    calculateAllQualityScores: jest.fn(),
  };

  const mockFailoverService = {
    configureFailover: jest.fn(),
    getFailoverConfig: jest.fn(),
    executeFailover: jest.fn(),
    getFailoverHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyIntelligenceController],
      providers: [
        {
          provide: ProxyIntelligenceService,
          useValue: mockIntelligenceService,
        },
        {
          provide: ProxyQualityService,
          useValue: mockQualityService,
        },
        {
          provide: ProxyFailoverService,
          useValue: mockFailoverService,
        },
      ],
    }).compile();

    controller = module.get<ProxyIntelligenceController>(
      ProxyIntelligenceController,
    );
    intelligenceService = module.get(ProxyIntelligenceService);
    qualityService = module.get(ProxyQualityService);
    failoverService = module.get(ProxyFailoverService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recommendProxy', () => {
    it('should recommend a proxy', async () => {
      const dto: any = {
        userId: 'user-123',
        deviceId: 'device-456',
        targetUrl: 'https://example.com',
      };

      const mockRecommendation: any = {
        proxyId: 'proxy-789',
        score: 95,
        reason: 'Best match for target URL',
      };

      intelligenceService.recommendProxy.mockResolvedValue(mockRecommendation);

      const result: any = await controller.recommendProxy(dto);

      expect(result.success).toBe(true);
      expect(result.data.proxyId).toBe('proxy-789');
      expect(result.data.score).toBe(95);
      expect(intelligenceService.recommendProxy).toHaveBeenCalledWith(dto);
    });
  });

  describe('recommendBatch', () => {
    it('should recommend proxies for multiple devices', async () => {
      const dto = {
        devices: [
          { userId: 'user-1', deviceId: 'device-1' } as any,
          { userId: 'user-2', deviceId: 'device-2' } as any,
        ],
      };

      const mockRecommendations = [
        { proxyId: 'proxy-1', score: 90 },
        { proxyId: 'proxy-2', score: 85 },
      ];

      intelligenceService.recommendBatch.mockResolvedValue(
        mockRecommendations,
      );

      const result = await controller.recommendBatch(dto);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(intelligenceService.recommendBatch).toHaveBeenCalledWith(
        dto.devices,
      );
    });

    it('should handle empty device list', async () => {
      const dto = { devices: [] };

      intelligenceService.recommendBatch.mockResolvedValue([]);

      const result = await controller.recommendBatch(dto);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getQualityScore', () => {
    it('should return quality score for a proxy', async () => {
      const mockScore: any = {
        proxyId: 'proxy-123',
        score: 88,
        grade: 'A',
        metrics: {
          successRate: 0.95,
          avgLatency: 120,
          reliability: 0.90,
        },
      };

      qualityService.getQualityScore.mockResolvedValue(mockScore);

      const result: any = await controller.getQualityScore('proxy-123');

      expect(result.success).toBe(true);
      expect(result.data.proxyId).toBe('proxy-123');
      expect(result.data.score).toBe(88);
      expect(result.data.grade).toBe('A');
      expect(qualityService.getQualityScore).toHaveBeenCalledWith('proxy-123');
    });
  });

  describe('getQualityScoreBatch', () => {
    it('should return quality scores for multiple proxies', async () => {
      const dto = { proxyIds: ['proxy-1', 'proxy-2', 'proxy-3'] };

      const mockScores = [
        { proxyId: 'proxy-1', score: 90, grade: 'A' },
        { proxyId: 'proxy-2', score: 75, grade: 'B' },
        { proxyId: 'proxy-3', score: 60, grade: 'C' },
      ];

      qualityService.getQualityScoreBatch.mockResolvedValue(mockScores);

      const result = await controller.getQualityScoreBatch(dto);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(qualityService.getQualityScoreBatch).toHaveBeenCalledWith(
        dto.proxyIds,
      );
    });
  });

  describe('getQualityDistribution', () => {
    it('should return quality distribution statistics', async () => {
      const mockDistribution = {
        distribution: {
          S: 10,
          A: 25,
          B: 30,
          C: 20,
          D: 5,
        },
        avgScore: 75,
        healthy: 65,
        degraded: 20,
        unhealthy: 5,
      };

      qualityService.getQualityDistribution.mockResolvedValue(
        mockDistribution,
      );

      const result = await controller.getQualityDistribution();

      expect(result.success).toBe(true);
      expect(result.data.distribution.A).toBe(25);
      expect(result.data.avgScore).toBe(75);
      expect(result.data.healthy).toBe(65);
      expect(qualityService.getQualityDistribution).toHaveBeenCalled();
    });
  });

  describe('triggerQualityCalculation', () => {
    it('should trigger quality score calculation', async () => {
      qualityService.calculateAllQualityScores.mockResolvedValue(100);

      const result = await controller.triggerQualityCalculation();

      expect(result.success).toBe(true);
      expect(result.data.calculated).toBe(100);
      expect(result.data.duration).toBeGreaterThanOrEqual(0);
      expect(qualityService.calculateAllQualityScores).toHaveBeenCalled();
    });

    it('should handle zero proxies calculated', async () => {
      qualityService.calculateAllQualityScores.mockResolvedValue(0);

      const result = await controller.triggerQualityCalculation();

      expect(result.success).toBe(true);
      expect(result.data.calculated).toBe(0);
    });
  });

  describe('configureFailover', () => {
    it('should configure failover strategy', async () => {
      const dto: any = {
        enabled: true,
        maxRetries: 3,
        timeoutMs: 5000,
      };

      failoverService.configureFailover.mockResolvedValue(undefined);

      const result = await controller.configureFailover(dto);

      expect(result.success).toBe(true);
      expect(result.data.configured).toBe(true);
      expect(failoverService.configureFailover).toHaveBeenCalledWith(dto);
    });
  });

  describe('getFailoverConfig', () => {
    it('should return failover configuration for user', async () => {
      const mockConfig = {
        enabled: true,
        maxRetries: 3,
        timeoutMs: 5000,
        strategy: 'round-robin',
      };

      failoverService.getFailoverConfig.mockResolvedValue(mockConfig);

      const result = await controller.getFailoverConfig('user-123');

      expect(result.success).toBe(true);
      expect(result.data.enabled).toBe(true);
      expect(result.data.maxRetries).toBe(3);
      expect(failoverService.getFailoverConfig).toHaveBeenCalledWith(
        'user-123',
        undefined,
      );
    });

    it('should return failover configuration for device', async () => {
      const mockConfig = {
        enabled: false,
        maxRetries: 5,
      };

      failoverService.getFailoverConfig.mockResolvedValue(mockConfig);

      const result = await controller.getFailoverConfig(
        undefined,
        'device-456',
      );

      expect(result.success).toBe(true);
      expect(failoverService.getFailoverConfig).toHaveBeenCalledWith(
        undefined,
        'device-456',
      );
    });
  });

  describe('triggerFailover', () => {
    it('should manually trigger failover for a session', async () => {
      const mockResult = {
        switched: true,
        oldProxyId: 'proxy-old',
        newProxyId: 'proxy-new',
        duration: 250,
      };

      failoverService.executeFailover.mockResolvedValue(mockResult);

      const result = await controller.triggerFailover('session-123', {
        reason: 'Manual trigger',
      });

      expect(result.success).toBe(true);
      expect(result.data.switched).toBe(true);
      expect(result.data.oldProxyId).toBe('proxy-old');
      expect(result.data.newProxyId).toBe('proxy-new');
      expect(result.data.duration).toBe(250);
      expect(failoverService.executeFailover).toHaveBeenCalledWith(
        'session-123',
        'Manual trigger',
      );
    });

    it('should trigger failover without reason', async () => {
      const mockResult = {
        switched: true,
        oldProxyId: 'proxy-1',
        newProxyId: 'proxy-2',
        duration: 150,
      };

      failoverService.executeFailover.mockResolvedValue(mockResult);

      const result = await controller.triggerFailover('session-456');

      expect(result.success).toBe(true);
      expect(failoverService.executeFailover).toHaveBeenCalledWith(
        'session-456',
        undefined,
      );
    });
  });

  describe('getFailoverHistory', () => {
    it('should return failover history with default limit', async () => {
      const mockHistory = [
        { sessionId: 'session-1', oldProxy: 'proxy-1', newProxy: 'proxy-2' },
        { sessionId: 'session-2', oldProxy: 'proxy-3', newProxy: 'proxy-4' },
      ];

      failoverService.getFailoverHistory.mockResolvedValue(mockHistory);

      const result = await controller.getFailoverHistory();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(failoverService.getFailoverHistory).toHaveBeenCalledWith({
        sessionId: undefined,
        deviceId: undefined,
        limit: 50,
      });
    });

    it('should return failover history with custom limit', async () => {
      const mockHistory = [{ sessionId: 'session-1' }];

      failoverService.getFailoverHistory.mockResolvedValue(mockHistory);

      const result = await controller.getFailoverHistory(
        undefined,
        undefined,
        10,
      );

      expect(result.success).toBe(true);
      expect(failoverService.getFailoverHistory).toHaveBeenCalledWith({
        sessionId: undefined,
        deviceId: undefined,
        limit: 10,
      });
    });

    it('should filter by sessionId', async () => {
      const mockHistory = [
        { sessionId: 'session-123', oldProxy: 'proxy-1' },
      ];

      failoverService.getFailoverHistory.mockResolvedValue(mockHistory);

      const result = await controller.getFailoverHistory('session-123');

      expect(result.success).toBe(true);
      expect(failoverService.getFailoverHistory).toHaveBeenCalledWith({
        sessionId: 'session-123',
        deviceId: undefined,
        limit: 50,
      });
    });
  });

  describe('getWebsiteMapping', () => {
    it('should return best proxies for a domain', async () => {
      const mockMapping = {
        domain: 'example.com',
        bestProxies: [
          { proxyId: 'proxy-1', successRate: 0.98 },
          { proxyId: 'proxy-2', successRate: 0.95 },
        ],
        successRate: 0.96,
        avgLatency: 120,
      };

      intelligenceService.getWebsiteMapping.mockResolvedValue(mockMapping);

      const result = await controller.getWebsiteMapping('example.com');

      expect(result.success).toBe(true);
      expect(result.data.domain).toBe('example.com');
      expect(result.data.bestProxies).toHaveLength(2);
      expect(result.data.successRate).toBe(0.96);
      expect(intelligenceService.getWebsiteMapping).toHaveBeenCalledWith(
        'example.com',
      );
    });
  });

  describe('getDeviceAffinity', () => {
    it('should return device proxy affinity', async () => {
      const mockAffinity = {
        deviceId: 'device-123',
        preferredProxies: [
          { proxyId: 'proxy-1', usageCount: 150 },
          { proxyId: 'proxy-2', usageCount: 100 },
        ],
        totalUsage: 250,
        avgSuccessRate: 0.94,
      };

      intelligenceService.getDeviceAffinity.mockResolvedValue(mockAffinity);

      const result = await controller.getDeviceAffinity('device-123');

      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe('device-123');
      expect(result.data.preferredProxies).toHaveLength(2);
      expect(result.data.totalUsage).toBe(250);
      expect(intelligenceService.getDeviceAffinity).toHaveBeenCalledWith(
        'device-123',
      );
    });
  });
});
