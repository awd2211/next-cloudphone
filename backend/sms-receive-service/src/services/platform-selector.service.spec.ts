import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PlatformSelectorService } from './platform-selector.service';
import { ProviderConfig } from '../entities/provider-config.entity';
import { SmsActivateAdapter } from '../providers/sms-activate.adapter';
import { FiveSimAdapter } from '../providers/5sim.adapter';
import { BlacklistManagerService } from './blacklist-manager.service';
import { ABTestManagerService } from './ab-test-manager.service';

describe('PlatformSelectorService', () => {
  let service: PlatformSelectorService;
  let providerConfigRepo: Repository<ProviderConfig>;
  let smsActivateAdapter: SmsActivateAdapter;
  let fiveSimAdapter: FiveSimAdapter;
  let configService: ConfigService;
  let blacklistManager: BlacklistManagerService;
  let abTestManager: ABTestManagerService;

  // Mock provider adapters
  const mockSmsActivateAdapter = {
    healthCheck: jest.fn(),
  };

  const mockFiveSimAdapter = {
    healthCheck: jest.fn(),
  };

  // Mock repository
  const mockProviderConfigRepo = {
    find: jest.fn(),
    update: jest.fn(),
  };

  // Mock ConfigService
  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        ENABLE_SMART_ROUTING: 'true',
        DEFAULT_PROVIDER: 'sms-activate',
      };
      return config[key] !== undefined ? config[key] : defaultValue;
    }),
  };

  // Mock BlacklistManagerService
  const mockBlacklistManager = {
    isBlacklisted: jest.fn(),
    handleConsecutiveFailures: jest.fn(),
    removeFromBlacklist: jest.fn(),
  };

  // Mock ABTestManagerService
  const mockABTestManager = {
    hasActiveTest: jest.fn(),
    selectProviderForTest: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformSelectorService,
        {
          provide: getRepositoryToken(ProviderConfig),
          useValue: mockProviderConfigRepo,
        },
        {
          provide: SmsActivateAdapter,
          useValue: mockSmsActivateAdapter,
        },
        {
          provide: FiveSimAdapter,
          useValue: mockFiveSimAdapter,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: BlacklistManagerService,
          useValue: mockBlacklistManager,
        },
        {
          provide: ABTestManagerService,
          useValue: mockABTestManager,
        },
      ],
    }).compile();

    service = module.get<PlatformSelectorService>(PlatformSelectorService);
    providerConfigRepo = module.get<Repository<ProviderConfig>>(getRepositoryToken(ProviderConfig));
    smsActivateAdapter = module.get<SmsActivateAdapter>(SmsActivateAdapter);
    fiveSimAdapter = module.get<FiveSimAdapter>(FiveSimAdapter);
    configService = module.get<ConfigService>(ConfigService);
    blacklistManager = module.get<BlacklistManagerService>(BlacklistManagerService);
    abTestManager = module.get<ABTestManagerService>(ABTestManagerService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize providers map', () => {
      const stats = service.getProviderStats();
      expect(stats.length).toBeGreaterThan(0);
    });

    it('should initialize performance stats for all providers', () => {
      const stats = service.getProviderStats();

      stats.forEach(stat => {
        expect(stat).toHaveProperty('providerName');
        expect(stat).toHaveProperty('totalRequests');
        expect(stat).toHaveProperty('successCount');
        expect(stat).toHaveProperty('failureCount');
        expect(stat).toHaveProperty('successRate');
        expect(stat.successRate).toBe(100); // Initial success rate
        expect(stat.isHealthy).toBe(true); // Initial health status
      });
    });
  });

  describe('selectBestPlatform - A/B Testing', () => {
    it('should use A/B test provider when active test exists', async () => {
      const mockProviderConfig: Partial<ProviderConfig> = {
        provider: 'sms-activate',
        enabled: true,
        priority: 1,
      };

      mockABTestManager.hasActiveTest.mockResolvedValue(true);
      mockABTestManager.selectProviderForTest.mockResolvedValue('sms-activate');
      mockBlacklistManager.isBlacklisted.mockResolvedValue(false);
      mockProviderConfigRepo.find.mockResolvedValue([mockProviderConfig]);

      const result = await service.selectBestPlatform('telegram', 'RU');

      expect(result.providerName).toBe('sms-activate');
      expect(result.reason).toContain('A/B test');
      expect(result.score).toBe(100);
      expect(mockABTestManager.hasActiveTest).toHaveBeenCalled();
      expect(mockABTestManager.selectProviderForTest).toHaveBeenCalled();
    });

    it('should fallback to normal selection if A/B test provider is blacklisted', async () => {
      const mockProviderConfigs: Partial<ProviderConfig>[] = [
        { provider: 'sms-activate', enabled: true, priority: 1 },
        { provider: '5sim', enabled: true, priority: 2 },
      ];

      mockABTestManager.hasActiveTest.mockResolvedValue(true);
      mockABTestManager.selectProviderForTest.mockResolvedValue('sms-activate');
      // Use implementation to return different values based on provider name
      mockBlacklistManager.isBlacklisted.mockImplementation(async (provider: string) => {
        return provider === 'sms-activate'; // Only sms-activate is blacklisted
      });
      mockProviderConfigRepo.find.mockResolvedValue(mockProviderConfigs);

      const result = await service.selectBestPlatform('telegram', 'RU');

      expect(result.providerName).toBe('5sim');
      expect(mockBlacklistManager.isBlacklisted).toHaveBeenCalled();
    });

    it('should skip A/B test when no active test', async () => {
      const mockProviderConfig: Partial<ProviderConfig> = {
        provider: '5sim',
        enabled: true,
        priority: 1,
      };

      mockABTestManager.hasActiveTest.mockResolvedValue(false);
      mockBlacklistManager.isBlacklisted.mockResolvedValue(false);
      mockProviderConfigRepo.find.mockResolvedValue([mockProviderConfig]);

      await service.selectBestPlatform('telegram', 'RU');

      expect(mockABTestManager.selectProviderForTest).not.toHaveBeenCalled();
    });
  });

  describe('selectBestPlatform - Blacklist Filtering', () => {
    it('should filter out blacklisted providers', async () => {
      const mockProviderConfigs: Partial<ProviderConfig>[] = [
        { provider: 'sms-activate', enabled: true, priority: 1 },
        { provider: '5sim', enabled: true, priority: 2 },
      ];

      mockABTestManager.hasActiveTest.mockResolvedValue(false);
      mockBlacklistManager.isBlacklisted
        .mockResolvedValueOnce(true) // sms-activate is blacklisted
        .mockResolvedValueOnce(false); // 5sim is not blacklisted
      mockProviderConfigRepo.find.mockResolvedValue(mockProviderConfigs);

      const result = await service.selectBestPlatform('telegram', 'RU');

      expect(result.providerName).toBe('5sim');
    });

    it('should use emergency fallback when all providers are blacklisted', async () => {
      const mockProviderConfigs: Partial<ProviderConfig>[] = [
        { provider: 'sms-activate', enabled: true, priority: 1 },
        { provider: '5sim', enabled: true, priority: 2 },
      ];

      mockABTestManager.hasActiveTest.mockResolvedValue(false);
      mockBlacklistManager.isBlacklisted.mockResolvedValue(true); // All blacklisted
      mockProviderConfigRepo.find.mockResolvedValue(mockProviderConfigs);

      const result = await service.selectBestPlatform('telegram', 'RU');

      // Service uses emergency fallback instead of throwing error (high availability design)
      expect(result.providerName).toBe('sms-activate'); // DEFAULT_PROVIDER
      expect(result.reason).toBe('Emergency fallback');
      expect(result.fallbackLevel).toBe(99);
    });
  });

  describe('selectBestPlatform - Health Filtering', () => {
    it('should filter out unhealthy providers', async () => {
      const mockProviderConfigs: Partial<ProviderConfig>[] = [
        { provider: 'sms-activate', enabled: true, priority: 1 },
        { provider: '5sim', enabled: true, priority: 2 },
      ];

      mockABTestManager.hasActiveTest.mockResolvedValue(false);
      mockBlacklistManager.isBlacklisted.mockResolvedValue(false);
      mockProviderConfigRepo.find.mockResolvedValue(mockProviderConfigs);

      // Mark sms-activate as unhealthy
      await service.recordFailure('sms-activate', new Error('Test failure 1'));
      await service.recordFailure('sms-activate', new Error('Test failure 2'));
      await service.recordFailure('sms-activate', new Error('Test failure 3'));

      const result = await service.selectBestPlatform('telegram', 'RU');

      expect(result.providerName).toBe('5sim');
    });

    it('should use fallback when all providers are unhealthy', async () => {
      const mockProviderConfigs: Partial<ProviderConfig>[] = [
        { provider: 'sms-activate', enabled: true, priority: 1 },
        { provider: '5sim', enabled: true, priority: 2 },
      ];

      mockABTestManager.hasActiveTest.mockResolvedValue(false);
      mockBlacklistManager.isBlacklisted.mockResolvedValue(false);
      mockProviderConfigRepo.find.mockResolvedValue(mockProviderConfigs);

      // Mark all as unhealthy
      await service.recordFailure('sms-activate', new Error('Failure 1'));
      await service.recordFailure('sms-activate', new Error('Failure 2'));
      await service.recordFailure('sms-activate', new Error('Failure 3'));
      await service.recordFailure('5sim', new Error('Failure 1'));
      await service.recordFailure('5sim', new Error('Failure 2'));
      await service.recordFailure('5sim', new Error('Failure 3'));

      const result = await service.selectBestPlatform('telegram', 'RU');

      expect(result.reason).toContain('unhealthy');
      expect(result.fallbackLevel).toBeGreaterThan(0);
    });
  });

  describe('selectBestPlatform - Smart Routing', () => {
    it('should use smart routing when enabled', async () => {
      const mockProviderConfigs: Partial<ProviderConfig>[] = [
        {
          provider: 'sms-activate',
          enabled: true,
          priority: 1,
          costWeight: 0.4,
          speedWeight: 0.3,
          successRateWeight: 0.3,
        },
        {
          provider: '5sim',
          enabled: true,
          priority: 2,
          costWeight: 0.4,
          speedWeight: 0.3,
          successRateWeight: 0.3,
        },
      ];

      mockABTestManager.hasActiveTest.mockResolvedValue(false);
      mockBlacklistManager.isBlacklisted.mockResolvedValue(false);
      mockProviderConfigRepo.find.mockResolvedValue(mockProviderConfigs);

      // Make 5sim better by recording good stats
      await service.recordSuccess('5sim', 2000, 0.08); // Fast and cheap
      await service.recordSuccess('sms-activate', 5000, 0.15); // Slower and expensive

      const result = await service.selectBestPlatform('telegram', 'RU');

      expect(result.score).toBeGreaterThan(0);
      expect(result.reason).toContain('score');
    });

    it('should use default priority when smart routing disabled', async () => {
      mockConfigService.get = jest.fn((key: string) => {
        if (key === 'ENABLE_SMART_ROUTING') return 'false';
        if (key === 'DEFAULT_PROVIDER') return 'sms-activate';
        return undefined;
      });

      const mockProviderConfigs: Partial<ProviderConfig>[] = [
        { provider: 'sms-activate', enabled: true, priority: 1 },
        { provider: '5sim', enabled: true, priority: 2 },
      ];

      mockABTestManager.hasActiveTest.mockResolvedValue(false);
      mockBlacklistManager.isBlacklisted.mockResolvedValue(false);
      mockProviderConfigRepo.find.mockResolvedValue(mockProviderConfigs);

      const result = await service.selectBestPlatform('telegram', 'RU');

      expect(result.providerName).toBe('sms-activate'); // Uses priority 1
      expect(result.reason).toContain('priority');
    });
  });

  describe('selectBestPlatform - Error Handling', () => {
    it('should use emergency fallback when no enabled providers found', async () => {
      mockABTestManager.hasActiveTest.mockResolvedValue(false);
      mockProviderConfigRepo.find.mockResolvedValue([]);

      const result = await service.selectBestPlatform('telegram', 'RU');

      // Service uses emergency fallback instead of throwing error (high availability design)
      expect(result.providerName).toBe('sms-activate'); // DEFAULT_PROVIDER
      expect(result.reason).toBe('Emergency fallback');
      expect(result.fallbackLevel).toBe(99);
    });

    it('should use emergency fallback on selection error', async () => {
      mockABTestManager.hasActiveTest.mockRejectedValue(new Error('Database error'));

      const result = await service.selectBestPlatform('telegram', 'RU');

      expect(result.providerName).toBe('sms-activate'); // DEFAULT_PROVIDER
      expect(result.reason).toBe('Emergency fallback');
      expect(result.fallbackLevel).toBe(99);
    });

    it('should use configured default provider in emergency', async () => {
      mockConfigService.get = jest.fn((key: string) => {
        if (key === 'DEFAULT_PROVIDER') return '5sim';
        return undefined;
      });

      mockABTestManager.hasActiveTest.mockRejectedValue(new Error('Critical error'));

      const result = await service.selectBestPlatform('telegram', 'RU');

      expect(result.providerName).toBe('5sim');
    });
  });

  describe('recordSuccess', () => {
    it('should update success statistics', async () => {
      await service.recordSuccess('sms-activate', 2500, 0.12);

      const stats = service.getProviderStat('sms-activate');

      expect(stats).toBeDefined();
      expect(stats!.successCount).toBe(1);
      expect(stats!.totalRequests).toBe(1);
      expect(stats!.successRate).toBe(100);
      expect(stats!.averageResponseTime).toBe(2500);
      expect(stats!.averageCost).toBe(0.12);
      expect(stats!.consecutiveFailures).toBe(0);
      expect(stats!.isHealthy).toBe(true);
    });

    it('should calculate moving average for response time', async () => {
      await service.recordSuccess('sms-activate', 2000, 0.10);
      await service.recordSuccess('sms-activate', 4000, 0.15);

      const stats = service.getProviderStat('sms-activate');

      expect(stats!.averageResponseTime).toBe(3000); // (2000 + 4000) / 2
    });

    it('should calculate moving average for cost', async () => {
      await service.recordSuccess('5sim', 2000, 0.08);
      await service.recordSuccess('5sim', 3000, 0.12);

      const stats = service.getProviderStat('5sim');

      expect(stats!.averageCost).toBe(0.10); // (0.08 + 0.12) / 2
    });

    it('should reset consecutive failures on success', async () => {
      // First fail twice
      await service.recordFailure('sms-activate', new Error('Fail 1'));
      await service.recordFailure('sms-activate', new Error('Fail 2'));

      let stats = service.getProviderStat('sms-activate');
      expect(stats!.consecutiveFailures).toBe(2);

      // Then succeed
      await service.recordSuccess('sms-activate', 2000, 0.10);

      stats = service.getProviderStat('sms-activate');
      expect(stats!.consecutiveFailures).toBe(0);
      expect(stats!.isHealthy).toBe(true);
    });

    it('should update database asynchronously', async () => {
      await service.recordSuccess('sms-activate', 2000, 0.10);

      // Wait a bit for async update
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockProviderConfigRepo.update).toHaveBeenCalled();
    });
  });

  describe('recordFailure', () => {
    it('should update failure statistics', async () => {
      await service.recordFailure('sms-activate', new Error('Test failure'));

      const stats = service.getProviderStat('sms-activate');

      expect(stats).toBeDefined();
      expect(stats!.failureCount).toBe(1);
      expect(stats!.totalRequests).toBe(1);
      expect(stats!.successRate).toBe(0);
      expect(stats!.consecutiveFailures).toBe(1);
      expect(stats!.lastFailureTime).toBeDefined();
    });

    it('should mark provider unhealthy after 3 consecutive failures', async () => {
      await service.recordFailure('sms-activate', new Error('Fail 1'));
      await service.recordFailure('sms-activate', new Error('Fail 2'));

      let stats = service.getProviderStat('sms-activate');
      expect(stats!.isHealthy).toBe(true);

      await service.recordFailure('sms-activate', new Error('Fail 3'));

      stats = service.getProviderStat('sms-activate');
      expect(stats!.isHealthy).toBe(false);
      expect(stats!.consecutiveFailures).toBe(3);
    });

    it('should trigger blacklist check on consecutive failures', async () => {
      await service.recordFailure('sms-activate', new Error('Failure'));

      expect(mockBlacklistManager.handleConsecutiveFailures).toHaveBeenCalledWith(
        'sms-activate',
        1,
        'Failure'
      );
    });

    it('should calculate success rate correctly with mixed results', async () => {
      await service.recordSuccess('5sim', 2000, 0.10);
      await service.recordSuccess('5sim', 2500, 0.12);
      await service.recordFailure('5sim', new Error('Fail'));
      await service.recordSuccess('5sim', 3000, 0.11);

      const stats = service.getProviderStat('5sim');

      expect(stats!.totalRequests).toBe(4);
      expect(stats!.successCount).toBe(3);
      expect(stats!.failureCount).toBe(1);
      expect(stats!.successRate).toBe(75); // 3/4 = 75%
    });
  });

  describe('Score Calculation', () => {
    it('should calculate cost score correctly', () => {
      const calculateCostScore = (service as any).calculateCostScore.bind(service);

      // Cheap provider (low cost = high score)
      expect(calculateCostScore(0.05)).toBeCloseTo(100, 0);

      // Expensive provider (high cost = low score)
      expect(calculateCostScore(0.20)).toBeCloseTo(0, 0);

      // Medium cost
      expect(calculateCostScore(0.125)).toBeCloseTo(50, 0);

      // No data
      expect(calculateCostScore(0)).toBe(50);
    });

    it('should calculate speed score correctly', () => {
      const calculateSpeedScore = (service as any).calculateSpeedScore.bind(service);

      // Very fast (low time = high score)
      expect(calculateSpeedScore(1000)).toBeCloseTo(100, 0);

      // Very slow (high time = low score)
      expect(calculateSpeedScore(60000)).toBeCloseTo(0, 0);

      // Medium speed
      expect(calculateSpeedScore(30500)).toBeCloseTo(50, 0);

      // No data
      expect(calculateSpeedScore(0)).toBe(50);
    });

    it('should handle edge cases in cost scoring', () => {
      const calculateCostScore = (service as any).calculateCostScore.bind(service);

      // Below minimum
      expect(calculateCostScore(0.01)).toBeGreaterThanOrEqual(100);

      // Above maximum
      expect(calculateCostScore(0.50)).toBeCloseTo(0, 0);
    });

    it('should handle edge cases in speed scoring', () => {
      const calculateSpeedScore = (service as any).calculateSpeedScore.bind(service);

      // Very fast (below minimum)
      expect(calculateSpeedScore(500)).toBeGreaterThanOrEqual(100);

      // Very slow (above maximum)
      expect(calculateSpeedScore(120000)).toBeCloseTo(0, 0);
    });
  });

  describe('getProviderStats', () => {
    it('should return all provider statistics', () => {
      const stats = service.getProviderStats();

      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);

      stats.forEach(stat => {
        expect(stat).toHaveProperty('providerName');
        expect(stat).toHaveProperty('totalRequests');
        expect(stat).toHaveProperty('successRate');
      });
    });

    it('should reflect updated statistics', async () => {
      await service.recordSuccess('sms-activate', 2000, 0.10);
      await service.recordFailure('5sim', new Error('Test'));

      const stats = service.getProviderStats();

      const smsActivateStats = stats.find(s => s.providerName === 'sms-activate');
      const fiveSimStats = stats.find(s => s.providerName === '5sim');

      expect(smsActivateStats!.successCount).toBe(1);
      expect(fiveSimStats!.failureCount).toBe(1);
    });
  });

  describe('getProviderStat', () => {
    it('should return specific provider statistics', () => {
      const stat = service.getProviderStat('sms-activate');

      expect(stat).toBeDefined();
      expect(stat!.providerName).toBe('sms-activate');
    });

    it('should return undefined for unknown provider', () => {
      const stat = service.getProviderStat('unknown-provider');

      expect(stat).toBeUndefined();
    });
  });

  describe('resetProviderHealth', () => {
    it('should reset provider health status', async () => {
      // Mark as unhealthy
      await service.recordFailure('sms-activate', new Error('Fail 1'));
      await service.recordFailure('sms-activate', new Error('Fail 2'));
      await service.recordFailure('sms-activate', new Error('Fail 3'));

      let stats = service.getProviderStat('sms-activate');
      expect(stats!.isHealthy).toBe(false);

      // Reset health
      await service.resetProviderHealth('sms-activate');

      stats = service.getProviderStat('sms-activate');
      expect(stats!.isHealthy).toBe(true);
      expect(stats!.consecutiveFailures).toBe(0);
    });

    it('should update database on health reset', async () => {
      await service.resetProviderHealth('sms-activate');

      expect(mockProviderConfigRepo.update).toHaveBeenCalledWith(
        { provider: 'sms-activate' },
        { healthStatus: 'healthy' }
      );
    });

    it('should handle resetting unknown provider gracefully', async () => {
      await expect(
        service.resetProviderHealth('unknown-provider')
      ).resolves.not.toThrow();
    });
  });

  describe('performHealthChecks', () => {
    it('should check health of all providers', async () => {
      mockSmsActivateAdapter.healthCheck.mockResolvedValue(true);
      mockFiveSimAdapter.healthCheck.mockResolvedValue(true);

      const results = await service.performHealthChecks();

      expect(results.size).toBeGreaterThan(0);
      expect(mockSmsActivateAdapter.healthCheck).toHaveBeenCalled();
      expect(mockFiveSimAdapter.healthCheck).toHaveBeenCalled();
    });

    it('should update provider stats based on health check results', async () => {
      mockSmsActivateAdapter.healthCheck.mockResolvedValue(true);
      mockFiveSimAdapter.healthCheck.mockResolvedValue(false);

      await service.performHealthChecks();

      const smsActivateStats = service.getProviderStat('sms-activate');
      const fiveSimStats = service.getProviderStat('5sim');

      expect(smsActivateStats!.isHealthy).toBe(true);
      expect(fiveSimStats!.isHealthy).toBe(false);
    });

    it('should remove from blacklist when provider recovers', async () => {
      // Mark as unhealthy
      await service.recordFailure('sms-activate', new Error('Fail 1'));
      await service.recordFailure('sms-activate', new Error('Fail 2'));
      await service.recordFailure('sms-activate', new Error('Fail 3'));

      // Health check passes
      mockSmsActivateAdapter.healthCheck.mockResolvedValue(true);

      await service.performHealthChecks();

      expect(mockBlacklistManager.removeFromBlacklist).toHaveBeenCalledWith(
        'sms-activate',
        'Recovered from health check'
      );
    });

    it('should reset consecutive failures on successful health check', async () => {
      // Mark as unhealthy
      await service.recordFailure('sms-activate', new Error('Fail 1'));
      await service.recordFailure('sms-activate', new Error('Fail 2'));
      await service.recordFailure('sms-activate', new Error('Fail 3'));

      let stats = service.getProviderStat('sms-activate');
      expect(stats!.consecutiveFailures).toBe(3);

      // Health check passes
      mockSmsActivateAdapter.healthCheck.mockResolvedValue(true);

      await service.performHealthChecks();

      stats = service.getProviderStat('sms-activate');
      expect(stats!.consecutiveFailures).toBe(0);
    });

    it('should handle health check errors gracefully', async () => {
      mockSmsActivateAdapter.healthCheck.mockRejectedValue(new Error('Network error'));

      const results = await service.performHealthChecks();

      expect(results.get('sms-activate')).toBe(false);
    });
  });

  describe('attemptRecovery', () => {
    it('should attempt to recover unhealthy providers', async () => {
      // Mark as unhealthy
      await service.recordFailure('sms-activate', new Error('Fail 1'));
      await service.recordFailure('sms-activate', new Error('Fail 2'));
      await service.recordFailure('sms-activate', new Error('Fail 3'));

      // Health check passes
      mockSmsActivateAdapter.healthCheck.mockResolvedValue(true);

      await service.attemptRecovery();

      const stats = service.getProviderStat('sms-activate');
      expect(stats!.isHealthy).toBe(true);
      expect(stats!.consecutiveFailures).toBe(0);
    });

    it('should remove from blacklist on successful recovery', async () => {
      // Mark as unhealthy
      await service.recordFailure('sms-activate', new Error('Fail 1'));
      await service.recordFailure('sms-activate', new Error('Fail 2'));
      await service.recordFailure('sms-activate', new Error('Fail 3'));

      // Health check passes
      mockSmsActivateAdapter.healthCheck.mockResolvedValue(true);

      await service.attemptRecovery();

      expect(mockBlacklistManager.removeFromBlacklist).toHaveBeenCalledWith(
        'sms-activate',
        'Auto-recovery successful'
      );
    });

    it('should skip recovery if no unhealthy providers', async () => {
      mockSmsActivateAdapter.healthCheck.mockResolvedValue(true);

      await service.attemptRecovery();

      // Should not call health check if all healthy
      expect(mockSmsActivateAdapter.healthCheck).not.toHaveBeenCalled();
    });

    it('should handle recovery failures gracefully', async () => {
      // Mark as unhealthy
      await service.recordFailure('sms-activate', new Error('Fail 1'));
      await service.recordFailure('sms-activate', new Error('Fail 2'));
      await service.recordFailure('sms-activate', new Error('Fail 3'));

      // Health check still fails
      mockSmsActivateAdapter.healthCheck.mockRejectedValue(new Error('Still unhealthy'));

      await expect(service.attemptRecovery()).resolves.not.toThrow();

      const stats = service.getProviderStat('sms-activate');
      expect(stats!.isHealthy).toBe(false); // Should remain unhealthy
    });

    it('should attempt recovery for multiple unhealthy providers', async () => {
      // Mark both as unhealthy
      await service.recordFailure('sms-activate', new Error('Fail 1'));
      await service.recordFailure('sms-activate', new Error('Fail 2'));
      await service.recordFailure('sms-activate', new Error('Fail 3'));
      await service.recordFailure('5sim', new Error('Fail 1'));
      await service.recordFailure('5sim', new Error('Fail 2'));
      await service.recordFailure('5sim', new Error('Fail 3'));

      // Both recover
      mockSmsActivateAdapter.healthCheck.mockResolvedValue(true);
      mockFiveSimAdapter.healthCheck.mockResolvedValue(true);

      await service.attemptRecovery();

      const smsActivateStats = service.getProviderStat('sms-activate');
      const fiveSimStats = service.getProviderStat('5sim');

      expect(smsActivateStats!.isHealthy).toBe(true);
      expect(fiveSimStats!.isHealthy).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle recording stats for unknown provider', async () => {
      await expect(
        service.recordSuccess('unknown-provider', 2000, 0.10)
      ).resolves.not.toThrow();

      await expect(
        service.recordFailure('unknown-provider', new Error('Test'))
      ).resolves.not.toThrow();
    });

    it('should handle very large response times', async () => {
      await service.recordSuccess('sms-activate', 999999, 0.10);

      const stats = service.getProviderStat('sms-activate');
      expect(stats!.averageResponseTime).toBe(999999);
    });

    it('should handle very high costs', async () => {
      await service.recordSuccess('sms-activate', 2000, 99.99);

      const stats = service.getProviderStat('sms-activate');
      expect(stats!.averageCost).toBe(99.99);
    });

    it('should handle zero response time', async () => {
      await service.recordSuccess('sms-activate', 0, 0.10);

      const stats = service.getProviderStat('sms-activate');
      expect(stats!.averageResponseTime).toBe(0);
    });

    it('should handle database update failures gracefully', async () => {
      mockProviderConfigRepo.update.mockRejectedValue(new Error('DB error'));

      await expect(
        service.recordSuccess('sms-activate', 2000, 0.10)
      ).resolves.not.toThrow();
    });
  });
});
