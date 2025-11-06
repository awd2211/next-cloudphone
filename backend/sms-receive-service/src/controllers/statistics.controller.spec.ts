import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { StatisticsController } from './statistics.controller';
import { PlatformSelectorService } from '../services/platform-selector.service';
import { VirtualNumber, SmsMessage, ProviderConfig } from '../entities';

describe('StatisticsController', () => {
  let controller: StatisticsController;
  let numberRepo: jest.Mocked<Repository<VirtualNumber>>;
  let messageRepo: jest.Mocked<Repository<SmsMessage>>;
  let providerConfigRepo: jest.Mocked<Repository<ProviderConfig>>;
  let platformSelector: jest.Mocked<PlatformSelectorService>;

  const mockNumberRepo = {
    find: jest.fn(),
    count: jest.fn(),
  };

  const mockMessageRepo = {
    find: jest.fn(),
  };

  const mockProviderConfigRepo = {
    find: jest.fn(),
  };

  const mockPlatformSelector = {
    getProviderStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [
        {
          provide: getRepositoryToken(VirtualNumber),
          useValue: mockNumberRepo,
        },
        {
          provide: getRepositoryToken(SmsMessage),
          useValue: mockMessageRepo,
        },
        {
          provide: getRepositoryToken(ProviderConfig),
          useValue: mockProviderConfigRepo,
        },
        {
          provide: PlatformSelectorService,
          useValue: mockPlatformSelector,
        },
      ],
    }).compile();

    controller = module.get<StatisticsController>(StatisticsController);
    numberRepo = module.get(getRepositoryToken(VirtualNumber));
    messageRepo = module.get(getRepositoryToken(SmsMessage));
    providerConfigRepo = module.get(getRepositoryToken(ProviderConfig));
    platformSelector = module.get(PlatformSelectorService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET / - getStatistics', () => {
    it('should return statistics for default time range (last 24 hours)', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const mockNumbers: Partial<VirtualNumber>[] = [
        {
          id: 'num-1',
          phoneNumber: '+79991111111',
          provider: 'sms-activate',
          serviceCode: 'telegram',
          status: 'received',
          cost: 15.5,
          createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
          smsReceivedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000 + 30000),
        },
        {
          id: 'num-2',
          phoneNumber: '+79992222222',
          provider: '5sim',
          serviceCode: 'whatsapp',
          status: 'received',
          cost: 12.0,
          createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
          smsReceivedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000 + 45000),
        },
        {
          id: 'num-3',
          phoneNumber: '+79993333333',
          provider: 'sms-activate',
          serviceCode: 'telegram',
          status: 'failed',
          cost: 15.5,
          createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          smsReceivedAt: undefined,
        },
      ];

      mockNumberRepo.find.mockResolvedValueOnce(mockNumbers as any);

      const mockProviderConfigs: Partial<ProviderConfig>[] = [
        {
          provider: 'sms-activate',
          healthStatus: 'healthy',
          enabled: true,
        },
        {
          provider: '5sim',
          healthStatus: 'healthy',
          enabled: true,
        },
      ];

      mockProviderConfigRepo.find.mockResolvedValueOnce(mockProviderConfigs as any);

      const mockPlatformStats = [
        {
          providerName: 'sms-activate',
          totalRequests: 100,
          successCount: 85,
          failureCount: 15,
          successRate: 85.0,
          averageResponseTime: 35000,
          averageCost: 15.2,
          isHealthy: true,
          consecutiveFailures: 0,
          lastFailureTime: null,
        },
        {
          providerName: '5sim',
          totalRequests: 50,
          successCount: 45,
          failureCount: 5,
          successRate: 90.0,
          averageResponseTime: 42000,
          averageCost: 12.5,
          isHealthy: true,
          consecutiveFailures: 0,
          lastFailureTime: null,
        },
      ];

      mockPlatformSelector.getProviderStats.mockReturnValueOnce(mockPlatformStats as any);

      const result = await controller.getStatistics();

      expect(result.overview.totalRequests).toBe(3);
      expect(result.overview.successfulRequests).toBe(2);
      expect(result.overview.failedRequests).toBe(1);
      expect(result.overview.successRate).toBeCloseTo(66.67, 0);
      expect(result.overview.totalCost).toBeCloseTo(43.0, 1);

      expect(result.providerStats).toHaveLength(2);
      const smsActivateStats = result.providerStats.find((p) => p.provider === 'sms-activate');
      expect(smsActivateStats?.requests).toBe(2);
      expect(smsActivateStats?.successes).toBe(1);
      expect(smsActivateStats?.failures).toBe(1);

      expect(result.serviceStats).toHaveLength(2);
      const telegramStats = result.serviceStats.find((s) => s.service === 'telegram');
      expect(telegramStats?.requests).toBe(2);
    });

    it('should return statistics for custom date range', async () => {
      const startDate = '2025-01-01T00:00:00Z';
      const endDate = '2025-01-31T23:59:59Z';

      const mockNumbers: Partial<VirtualNumber>[] = [
        {
          id: 'num-1',
          phoneNumber: '+79991111111',
          provider: 'sms-activate',
          serviceCode: 'telegram',
          status: 'received',
          cost: 20.0,
          createdAt: new Date('2025-01-15T10:00:00Z'),
          smsReceivedAt: new Date('2025-01-15T10:01:00Z'),
        },
      ];

      mockNumberRepo.find.mockResolvedValueOnce(mockNumbers as any);
      mockProviderConfigRepo.find.mockResolvedValueOnce([]);
      mockPlatformSelector.getProviderStats.mockReturnValueOnce([]);

      const result = await controller.getStatistics(startDate, endDate);

      expect(result.timeRange.start).toEqual(new Date(startDate));
      expect(result.timeRange.end).toEqual(new Date(endDate));
      expect(result.overview.totalRequests).toBe(1);
    });

    it('should calculate correct success rate', async () => {
      const mockNumbers: Partial<VirtualNumber>[] = [
        {
          id: 'num-1',
          status: 'received',
          cost: 10.0,
          provider: 'sms-activate',
          serviceCode: 'telegram',
          createdAt: new Date(),
        },
        {
          id: 'num-2',
          status: 'received',
          cost: 10.0,
          provider: 'sms-activate',
          serviceCode: 'telegram',
          createdAt: new Date(),
        },
        {
          id: 'num-3',
          status: 'received',
          cost: 10.0,
          provider: 'sms-activate',
          serviceCode: 'telegram',
          createdAt: new Date(),
        },
        {
          id: 'num-4',
          status: 'failed',
          cost: 10.0,
          provider: 'sms-activate',
          serviceCode: 'telegram',
          createdAt: new Date(),
        },
      ];

      mockNumberRepo.find.mockResolvedValueOnce(mockNumbers as any);
      mockProviderConfigRepo.find.mockResolvedValueOnce([]);
      mockPlatformSelector.getProviderStats.mockReturnValueOnce([]);

      const result = await controller.getStatistics();

      expect(result.overview.totalRequests).toBe(4);
      expect(result.overview.successfulRequests).toBe(3);
      expect(result.overview.failedRequests).toBe(1);
      expect(result.overview.successRate).toBe(75.0);
    });

    it('should handle zero requests gracefully', async () => {
      mockNumberRepo.find.mockResolvedValueOnce([]);
      mockProviderConfigRepo.find.mockResolvedValueOnce([]);
      mockPlatformSelector.getProviderStats.mockReturnValueOnce([]);

      const result = await controller.getStatistics();

      expect(result.overview.totalRequests).toBe(0);
      expect(result.overview.successfulRequests).toBe(0);
      expect(result.overview.failedRequests).toBe(0);
      expect(result.overview.successRate).toBe(0);
      expect(result.overview.averageCost).toBe(0);
      expect(result.overview.totalCost).toBe(0);
      expect(result.providerStats).toEqual([]);
      expect(result.serviceStats).toEqual([]);
    });

    it('should calculate average response time correctly', async () => {
      const baseTime = new Date('2025-01-01T10:00:00Z');

      const mockNumbers: Partial<VirtualNumber>[] = [
        {
          id: 'num-1',
          provider: 'sms-activate',
          serviceCode: 'telegram',
          status: 'received',
          cost: 10.0,
          createdAt: baseTime,
          smsReceivedAt: new Date(baseTime.getTime() + 30000), // 30 seconds
        },
        {
          id: 'num-2',
          provider: 'sms-activate',
          serviceCode: 'telegram',
          status: 'received',
          cost: 10.0,
          createdAt: baseTime,
          smsReceivedAt: new Date(baseTime.getTime() + 60000), // 60 seconds
        },
      ];

      mockNumberRepo.find.mockResolvedValueOnce(mockNumbers as any);
      mockProviderConfigRepo.find.mockResolvedValueOnce([]);
      mockPlatformSelector.getProviderStats.mockReturnValueOnce([]);

      const result = await controller.getStatistics();

      const providerStats = result.providerStats.find((p) => p.provider === 'sms-activate');
      expect(providerStats?.averageResponseTime).toBe(45.0); // (30 + 60) / 2
    });

    it('should aggregate statistics by provider', async () => {
      const mockNumbers: Partial<VirtualNumber>[] = [
        {
          id: 'num-1',
          provider: 'sms-activate',
          serviceCode: 'telegram',
          status: 'received',
          cost: 15.5,
          createdAt: new Date(),
        },
        {
          id: 'num-2',
          provider: 'sms-activate',
          serviceCode: 'whatsapp',
          status: 'received',
          cost: 15.5,
          createdAt: new Date(),
        },
        {
          id: 'num-3',
          provider: '5sim',
          serviceCode: 'telegram',
          status: 'received',
          cost: 12.0,
          createdAt: new Date(),
        },
        {
          id: 'num-4',
          provider: 'sms-activate',
          serviceCode: 'telegram',
          status: 'failed',
          cost: 15.5,
          createdAt: new Date(),
        },
      ];

      mockNumberRepo.find.mockResolvedValueOnce(mockNumbers as any);
      mockProviderConfigRepo.find.mockResolvedValueOnce([]);
      mockPlatformSelector.getProviderStats.mockReturnValueOnce([]);

      const result = await controller.getStatistics();

      expect(result.providerStats).toHaveLength(2);

      const smsActivate = result.providerStats.find((p) => p.provider === 'sms-activate');
      expect(smsActivate?.requests).toBe(3);
      expect(smsActivate?.successes).toBe(2);
      expect(smsActivate?.failures).toBe(1);
      expect(smsActivate?.totalCost).toBeCloseTo(46.5, 1);

      const fiveSim = result.providerStats.find((p) => p.provider === '5sim');
      expect(fiveSim?.requests).toBe(1);
      expect(fiveSim?.successes).toBe(1);
      expect(fiveSim?.failures).toBe(0);
    });

    it('should aggregate statistics by service', async () => {
      const mockNumbers: Partial<VirtualNumber>[] = [
        {
          id: 'num-1',
          provider: 'sms-activate',
          serviceCode: 'telegram',
          status: 'received',
          cost: 15.0,
          createdAt: new Date(),
        },
        {
          id: 'num-2',
          provider: 'sms-activate',
          serviceCode: 'telegram',
          status: 'received',
          cost: 15.0,
          createdAt: new Date(),
        },
        {
          id: 'num-3',
          provider: '5sim',
          serviceCode: 'whatsapp',
          status: 'received',
          cost: 12.0,
          createdAt: new Date(),
        },
      ];

      mockNumberRepo.find.mockResolvedValueOnce(mockNumbers as any);
      mockProviderConfigRepo.find.mockResolvedValueOnce([]);
      mockPlatformSelector.getProviderStats.mockReturnValueOnce([]);

      const result = await controller.getStatistics();

      expect(result.serviceStats).toHaveLength(2);

      const telegram = result.serviceStats.find((s) => s.service === 'telegram');
      expect(telegram?.requests).toBe(2);
      expect(telegram?.averageCost).toBe(15.0);

      const whatsapp = result.serviceStats.find((s) => s.service === 'whatsapp');
      expect(whatsapp?.requests).toBe(1);
      expect(whatsapp?.averageCost).toBe(12.0);
    });

    it('should include health status from provider configs', async () => {
      const mockNumbers: Partial<VirtualNumber>[] = [
        {
          id: 'num-1',
          provider: 'sms-activate',
          serviceCode: 'telegram',
          status: 'received',
          cost: 15.0,
          createdAt: new Date(),
        },
      ];

      mockNumberRepo.find.mockResolvedValueOnce(mockNumbers as any);

      const mockConfigs: Partial<ProviderConfig>[] = [
        {
          provider: 'sms-activate',
          healthStatus: 'degraded',
          enabled: true,
        },
      ];

      mockProviderConfigRepo.find.mockResolvedValueOnce(mockConfigs as any);

      const mockPlatformStats = [
        {
          providerName: 'sms-activate',
          isHealthy: false,
        },
      ];

      mockPlatformSelector.getProviderStats.mockReturnValueOnce(mockPlatformStats as any);

      const result = await controller.getStatistics();

      const providerStats = result.providerStats.find((p) => p.provider === 'sms-activate');
      expect(providerStats?.healthStatus).toBe('degraded');
    });
  });

  describe('GET /realtime - getRealtimeMonitor', () => {
    it('should return realtime monitoring data', async () => {
      const now = new Date();

      const mockActiveNumbers: Partial<VirtualNumber>[] = [
        {
          id: 'num-1',
          provider: 'sms-activate',
          status: 'active',
          createdAt: now,
        },
        {
          id: 'num-2',
          provider: 'sms-activate',
          status: 'active',
          createdAt: now,
        },
        {
          id: 'num-3',
          provider: '5sim',
          status: 'active',
          createdAt: now,
        },
      ];

      mockNumberRepo.find
        .mockResolvedValueOnce(mockActiveNumbers as any) // Active numbers
        .mockResolvedValueOnce([
          // All active/waiting/received
          ...mockActiveNumbers,
          { id: 'num-4', provider: '5sim', status: 'waiting_sms' },
          { id: 'num-5', provider: 'sms-activate', status: 'received' },
        ] as any)
        .mockResolvedValueOnce([
          // Last 5 minutes
          { id: 'num-6', status: 'received', createdAt: new Date(now.getTime() - 2 * 60 * 1000) },
          { id: 'num-7', status: 'failed', createdAt: new Date(now.getTime() - 3 * 60 * 1000) },
        ] as any)
        .mockResolvedValueOnce([
          // Last 15 minutes
          { id: 'num-8', status: 'received', createdAt: new Date(now.getTime() - 10 * 60 * 1000) },
          { id: 'num-9', status: 'received', createdAt: new Date(now.getTime() - 12 * 60 * 1000) },
        ] as any)
        .mockResolvedValueOnce([
          // Last hour
          {
            id: 'num-10',
            status: 'received',
            createdAt: new Date(now.getTime() - 45 * 60 * 1000),
          },
          { id: 'num-11', status: 'failed', createdAt: new Date(now.getTime() - 50 * 60 * 1000) },
        ] as any);

      const mockPlatformStats = [
        {
          providerName: 'sms-activate',
          isHealthy: true,
          successRate: 85.5,
          averageResponseTime: 35000,
          consecutiveFailures: 0,
        },
        {
          providerName: '5sim',
          isHealthy: true,
          successRate: 90.0,
          averageResponseTime: 42000,
          consecutiveFailures: 0,
        },
      ];

      mockPlatformSelector.getProviderStats.mockReturnValueOnce(mockPlatformStats as any);

      const result = await controller.getRealtimeMonitor();

      expect(result.timestamp).toBeInstanceOf(Date);

      expect(result.activeNumbers.total).toBe(3);
      expect(result.activeNumbers.byProvider['sms-activate']).toBe(3); // 2 active + 1 received
      expect(result.activeNumbers.byProvider['5sim']).toBe(2); // 1 active + 1 waiting_sms
      expect(result.activeNumbers.byStatus['active']).toBe(3);
      expect(result.activeNumbers.byStatus['waiting_sms']).toBe(1);
      expect(result.activeNumbers.byStatus['received']).toBe(1);

      expect(result.recentActivity.last5Minutes.requests).toBe(2);
      expect(result.recentActivity.last5Minutes.successes).toBe(1);
      expect(result.recentActivity.last5Minutes.failures).toBe(1);

      expect(result.providerHealth['sms-activate'].status).toBe('healthy');
      expect(result.providerHealth['sms-activate'].successRate).toBe(85.5);
      expect(result.providerHealth['sms-activate'].avgResponseTime).toBe(35.0); // Converted to seconds
    });

    it('should handle no active numbers', async () => {
      mockNumberRepo.find
        .mockResolvedValueOnce([]) // Active numbers
        .mockResolvedValueOnce([]) // All statuses
        .mockResolvedValueOnce([]) // Last 5 min
        .mockResolvedValueOnce([]) // Last 15 min
        .mockResolvedValueOnce([]); // Last hour

      mockPlatformSelector.getProviderStats.mockReturnValueOnce([]);

      const result = await controller.getRealtimeMonitor();

      expect(result.activeNumbers.total).toBe(0);
      expect(result.activeNumbers.byProvider).toEqual({});
      expect(result.activeNumbers.byStatus).toEqual({});
      expect(result.recentActivity.last5Minutes.requests).toBe(0);
    });

    it('should convert response times to seconds', async () => {
      mockNumberRepo.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const mockPlatformStats = [
        {
          providerName: 'sms-activate',
          isHealthy: true,
          successRate: 85.5,
          averageResponseTime: 45000, // 45000ms = 45s
          consecutiveFailures: 0,
        },
      ];

      mockPlatformSelector.getProviderStats.mockReturnValueOnce(mockPlatformStats as any);

      const result = await controller.getRealtimeMonitor();

      expect(result.providerHealth['sms-activate'].avgResponseTime).toBe(45.0);
    });

    it('should aggregate numbers by multiple statuses', async () => {
      const now = new Date();

      mockNumberRepo.find
        .mockResolvedValueOnce([
          { id: 'num-1', status: 'active' },
          { id: 'num-2', status: 'active' },
        ] as any)
        .mockResolvedValueOnce([
          { id: 'num-1', status: 'active', provider: 'sms-activate' },
          { id: 'num-2', status: 'active', provider: 'sms-activate' },
          { id: 'num-3', status: 'waiting_sms', provider: '5sim' },
          { id: 'num-4', status: 'waiting_sms', provider: '5sim' },
          { id: 'num-5', status: 'received', provider: 'sms-activate' },
        ] as any)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockPlatformSelector.getProviderStats.mockReturnValueOnce([]);

      const result = await controller.getRealtimeMonitor();

      expect(result.activeNumbers.byStatus['active']).toBe(2);
      expect(result.activeNumbers.byStatus['waiting_sms']).toBe(2);
      expect(result.activeNumbers.byStatus['received']).toBe(1);
    });

    it('should identify unhealthy providers', async () => {
      mockNumberRepo.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const mockPlatformStats = [
        {
          providerName: 'bad-provider',
          isHealthy: false,
          successRate: 25.0,
          averageResponseTime: 120000,
          consecutiveFailures: 5,
        },
      ];

      mockPlatformSelector.getProviderStats.mockReturnValueOnce(mockPlatformStats as any);

      const result = await controller.getRealtimeMonitor();

      expect(result.providerHealth['bad-provider'].status).toBe('unhealthy');
      expect(result.providerHealth['bad-provider'].consecutiveFailures).toBe(5);
    });
  });

  describe('GET /providers/comparison - getProviderComparison', () => {
    it('should return provider comparison data', async () => {
      const mockPlatformStats = [
        {
          providerName: 'sms-activate',
          totalRequests: 1000,
          successCount: 850,
          failureCount: 150,
          successRate: 85.0,
          averageResponseTime: 35000,
          averageCost: 15.5,
          isHealthy: true,
          consecutiveFailures: 0,
          lastFailureTime: null,
        },
        {
          providerName: '5sim',
          totalRequests: 500,
          successCount: 450,
          failureCount: 50,
          successRate: 90.0,
          averageResponseTime: 42000,
          averageCost: 12.0,
          isHealthy: true,
          consecutiveFailures: 0,
          lastFailureTime: null,
        },
      ];

      mockPlatformSelector.getProviderStats.mockReturnValueOnce(mockPlatformStats as any);

      const mockConfigs: Partial<ProviderConfig>[] = [
        {
          provider: 'sms-activate',
          enabled: true,
          priority: 1,
          costWeight: 0.3,
          speedWeight: 0.3,
          successRateWeight: 0.4,
        },
        {
          provider: '5sim',
          enabled: true,
          priority: 2,
          costWeight: 0.25,
          speedWeight: 0.35,
          successRateWeight: 0.4,
        },
      ];

      mockProviderConfigRepo.find.mockResolvedValueOnce(mockConfigs as any);

      const result = await controller.getProviderComparison();

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.providers).toHaveLength(2);

      // Should be sorted by priority
      expect(result.providers[0].provider).toBe('sms-activate');
      expect(result.providers[0].priority).toBe(1);
      expect(result.providers[0].totalRequests).toBe(1000);
      expect(result.providers[0].averageResponseTime).toBe(35.0); // Converted to seconds

      expect(result.providers[1].provider).toBe('5sim');
      expect(result.providers[1].priority).toBe(2);

      expect(result.recommendation).toBeDefined();
    });

    it('should include configured weights', async () => {
      const mockPlatformStats = [
        {
          providerName: 'sms-activate',
          totalRequests: 100,
          successCount: 85,
          failureCount: 15,
          successRate: 85.0,
          averageResponseTime: 35000,
          averageCost: 15.0,
          isHealthy: true,
          consecutiveFailures: 0,
          lastFailureTime: null,
        },
      ];

      mockPlatformSelector.getProviderStats.mockReturnValueOnce(mockPlatformStats as any);

      const mockConfigs: Partial<ProviderConfig>[] = [
        {
          provider: 'sms-activate',
          enabled: true,
          priority: 1,
          costWeight: 0.35,
          speedWeight: 0.25,
          successRateWeight: 0.4,
        },
      ];

      mockProviderConfigRepo.find.mockResolvedValueOnce(mockConfigs as any);

      const result = await controller.getProviderComparison();

      expect(result.providers[0].configuredWeights).toEqual({
        cost: 0.35,
        speed: 0.25,
        successRate: 0.4,
      });
    });

    it('should handle providers with no config', async () => {
      const mockPlatformStats = [
        {
          providerName: 'new-provider',
          totalRequests: 10,
          successCount: 8,
          failureCount: 2,
          successRate: 80.0,
          averageResponseTime: 50000,
          averageCost: 10.0,
          isHealthy: true,
          consecutiveFailures: 0,
          lastFailureTime: null,
        },
      ];

      mockPlatformSelector.getProviderStats.mockReturnValueOnce(mockPlatformStats as any);
      mockProviderConfigRepo.find.mockResolvedValueOnce([]);

      const result = await controller.getProviderComparison();

      expect(result.providers).toHaveLength(1);
      expect(result.providers[0].enabled).toBe(false);
      expect(result.providers[0].priority).toBe(0);
      expect(result.providers[0].configuredWeights).toEqual({
        cost: 0,
        speed: 0,
        successRate: 0,
      });
    });

    it('should sort providers by priority', async () => {
      const mockPlatformStats = [
        { providerName: 'provider-c', isHealthy: true } as any,
        { providerName: 'provider-a', isHealthy: true } as any,
        { providerName: 'provider-b', isHealthy: true } as any,
      ];

      mockPlatformSelector.getProviderStats.mockReturnValueOnce(mockPlatformStats);

      const mockConfigs: Partial<ProviderConfig>[] = [
        { provider: 'provider-c', priority: 3 },
        { provider: 'provider-a', priority: 1 },
        { provider: 'provider-b', priority: 2 },
      ];

      mockProviderConfigRepo.find.mockResolvedValueOnce(mockConfigs as any);

      const result = await controller.getProviderComparison();

      expect(result.providers[0].provider).toBe('provider-a'); // Priority 1
      expect(result.providers[1].provider).toBe('provider-b'); // Priority 2
      expect(result.providers[2].provider).toBe('provider-c'); // Priority 3
    });

    describe('generateProviderRecommendation', () => {
      it('should recommend single best provider', async () => {
        const mockPlatformStats = [
          {
            providerName: 'best-provider',
            totalRequests: 100,
            successCount: 95,
            failureCount: 5,
            successRate: 95.0,
            averageResponseTime: 25000,
            averageCost: 10.0,
            isHealthy: true,
            consecutiveFailures: 0,
            lastFailureTime: null,
          },
          {
            providerName: 'okay-provider',
            totalRequests: 100,
            successCount: 80,
            failureCount: 20,
            successRate: 80.0,
            averageResponseTime: 45000,
            averageCost: 15.0,
            isHealthy: true,
            consecutiveFailures: 0,
            lastFailureTime: null,
          },
        ];

        mockPlatformSelector.getProviderStats.mockReturnValueOnce(mockPlatformStats as any);

        const mockConfigs: Partial<ProviderConfig>[] = [
          { provider: 'best-provider', enabled: true, priority: 1 },
          { provider: 'okay-provider', enabled: true, priority: 2 },
        ];

        mockProviderConfigRepo.find.mockResolvedValueOnce(mockConfigs as any);

        const result = await controller.getProviderComparison();

        expect(result.recommendation).toContain('best-provider');
        expect(result.recommendation).toContain('所有指标上表现最佳');
      });

      it('should list different best providers for each metric', async () => {
        const mockPlatformStats = [
          {
            providerName: 'fast-provider',
            totalRequests: 100,
            successCount: 80,
            failureCount: 20,
            successRate: 80.0,
            averageResponseTime: 20000, // Fastest
            averageCost: 20.0,
            isHealthy: true,
            consecutiveFailures: 0,
            lastFailureTime: null,
          },
          {
            providerName: 'cheap-provider',
            totalRequests: 100,
            successCount: 85,
            failureCount: 15,
            successRate: 85.0,
            averageResponseTime: 40000,
            averageCost: 8.0, // Cheapest
            isHealthy: true,
            consecutiveFailures: 0,
            lastFailureTime: null,
          },
          {
            providerName: 'reliable-provider',
            totalRequests: 100,
            successCount: 95,
            failureCount: 5,
            successRate: 95.0, // Most reliable
            averageResponseTime: 35000,
            averageCost: 15.0,
            isHealthy: true,
            consecutiveFailures: 0,
            lastFailureTime: null,
          },
        ];

        mockPlatformSelector.getProviderStats.mockReturnValueOnce(mockPlatformStats as any);

        const mockConfigs: Partial<ProviderConfig>[] = mockPlatformStats.map((stat, i) => ({
          provider: stat.providerName,
          enabled: true,
          priority: i + 1,
        }));

        mockProviderConfigRepo.find.mockResolvedValueOnce(mockConfigs as any);

        const result = await controller.getProviderComparison();

        expect(result.recommendation).toContain('reliable-provider');
        expect(result.recommendation).toContain('95%'); // Success rate
        expect(result.recommendation).toContain('cheap-provider');
        expect(result.recommendation).toContain('$8'); // Cost
        expect(result.recommendation).toContain('fast-provider');
        expect(result.recommendation).toContain('20s'); // Response time
      });

      it('should warn when no healthy providers available', async () => {
        const mockPlatformStats = [
          {
            providerName: 'unhealthy-provider',
            totalRequests: 100,
            successCount: 20,
            failureCount: 80,
            successRate: 20.0,
            averageResponseTime: 100000,
            averageCost: 15.0,
            isHealthy: false,
            consecutiveFailures: 5,
            lastFailureTime: new Date(),
          },
        ];

        mockPlatformSelector.getProviderStats.mockReturnValueOnce(mockPlatformStats as any);

        const mockConfigs: Partial<ProviderConfig>[] = [
          { provider: 'unhealthy-provider', enabled: false, priority: 1 },
        ];

        mockProviderConfigRepo.find.mockResolvedValueOnce(mockConfigs as any);

        const result = await controller.getProviderComparison();

        expect(result.recommendation).toContain('警告');
        expect(result.recommendation).toContain('没有健康的平台可用');
      });

      it('should handle disabled providers in recommendation', async () => {
        const mockPlatformStats = [
          {
            providerName: 'disabled-but-good',
            totalRequests: 100,
            successCount: 95,
            failureCount: 5,
            successRate: 95.0,
            averageResponseTime: 25000,
            averageCost: 10.0,
            isHealthy: true,
            consecutiveFailures: 0,
            lastFailureTime: null,
          },
        ];

        mockPlatformSelector.getProviderStats.mockReturnValueOnce(mockPlatformStats as any);

        const mockConfigs: Partial<ProviderConfig>[] = [
          { provider: 'disabled-but-good', enabled: false, priority: 1 },
        ];

        mockProviderConfigRepo.find.mockResolvedValueOnce(mockConfigs as any);

        const result = await controller.getProviderComparison();

        // Should warn about no healthy providers (since disabled providers are excluded)
        expect(result.recommendation).toContain('警告');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large date ranges', async () => {
      const startDate = '2020-01-01T00:00:00Z';
      const endDate = '2025-12-31T23:59:59Z';

      mockNumberRepo.find.mockResolvedValueOnce([]);
      mockProviderConfigRepo.find.mockResolvedValueOnce([]);
      mockPlatformSelector.getProviderStats.mockReturnValueOnce([]);

      const result = await controller.getStatistics(startDate, endDate);

      expect(result.timeRange.start).toEqual(new Date(startDate));
      expect(result.timeRange.end).toEqual(new Date(endDate));
    });

    it('should handle invalid date formats gracefully', async () => {
      // Invalid dates will throw RangeError from toISOString(), which is expected behavior
      // Don't set up mocks since the error is thrown before repository is called
      await expect(
        controller.getStatistics('invalid-date', '2025-01-01T00:00:00Z'),
      ).rejects.toThrow(RangeError);
    });

    it('should round percentages to 2 decimal places', async () => {
      const now = new Date();
      const mockNumbers: Partial<VirtualNumber>[] = [
        { id: '1', status: 'received', cost: 10.0, provider: 'test', serviceCode: 'test', createdAt: now, phoneNumber: '+1' },
        { id: '2', status: 'received', cost: 10.0, provider: 'test', serviceCode: 'test', createdAt: now, phoneNumber: '+2' },
        { id: '3', status: 'received', cost: 10.0, provider: 'test', serviceCode: 'test', createdAt: now, phoneNumber: '+3' },
        { id: '4', status: 'received', cost: 10.0, provider: 'test', serviceCode: 'test', createdAt: now, phoneNumber: '+4' },
        { id: '5', status: 'received', cost: 10.0, provider: 'test', serviceCode: 'test', createdAt: now, phoneNumber: '+5' },
        { id: '6', status: 'received', cost: 10.0, provider: 'test', serviceCode: 'test', createdAt: now, phoneNumber: '+6' },
        { id: '7', status: 'received', cost: 10.0, provider: 'test', serviceCode: 'test', createdAt: now, phoneNumber: '+7' },
        { id: '8', status: 'failed', cost: 10.0, provider: 'test', serviceCode: 'test', createdAt: now, phoneNumber: '+8' },
        { id: '9', status: 'failed', cost: 10.0, provider: 'test', serviceCode: 'test', createdAt: now, phoneNumber: '+9' },
        { id: '10', status: 'failed', cost: 10.0, provider: 'test', serviceCode: 'test', createdAt: now, phoneNumber: '+10' },
      ];

      // Use mockResolvedValueOnce (not mockResolvedValue) to match other tests in this file
      mockNumberRepo.find.mockResolvedValueOnce(mockNumbers as any);
      mockProviderConfigRepo.find.mockResolvedValueOnce([]);
      mockPlatformSelector.getProviderStats.mockReturnValueOnce([]);

      const result = await controller.getStatistics();

      // Debug: Check if find was called and what it returned
      expect(mockNumberRepo.find).toHaveBeenCalled();

      // 7/10 = 70.00%
      expect(result.overview.totalRequests).toBe(10);
      expect(result.overview.successfulRequests).toBe(7);
      expect(result.overview.successRate).toBe(70.0);
    });

    it('should handle concurrent realtime requests', async () => {
      mockNumberRepo.find
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([]);

      mockPlatformSelector.getProviderStats.mockReturnValue([]);

      const promises = Array.from({ length: 5 }, () => controller.getRealtimeMonitor());

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should handle providers with zero cost', async () => {
      const mockNumbers: Partial<VirtualNumber>[] = [
        {
          id: 'num-1',
          provider: 'free-provider',
          serviceCode: 'test',
          status: 'received',
          cost: 0.0,
          createdAt: new Date(),
        },
      ];

      mockNumberRepo.find.mockResolvedValueOnce(mockNumbers as any);
      mockProviderConfigRepo.find.mockResolvedValueOnce([]);
      mockPlatformSelector.getProviderStats.mockReturnValueOnce([]);

      const result = await controller.getStatistics();

      expect(result.overview.totalCost).toBe(0);
      expect(result.overview.averageCost).toBe(0);
    });

    it('should handle numbers with missing smsReceivedAt', async () => {
      const mockNumbers: Partial<VirtualNumber>[] = [
        {
          id: 'num-1',
          provider: 'test',
          serviceCode: 'telegram',
          status: 'received',
          cost: 10.0,
          createdAt: new Date(),
          smsReceivedAt: undefined, // Missing
        },
      ];

      mockNumberRepo.find.mockResolvedValueOnce(mockNumbers as any);
      mockProviderConfigRepo.find.mockResolvedValueOnce([]);
      mockPlatformSelector.getProviderStats.mockReturnValueOnce([]);

      const result = await controller.getStatistics();

      // Should not crash, average response time should be 0
      const providerStats = result.providerStats.find((p) => p.provider === 'test');
      expect(providerStats?.averageResponseTime).toBe(0);
    });
  });
});
