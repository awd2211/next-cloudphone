import { Test, TestingModule } from '@nestjs/testing';
import { ProxyProviderRankingController } from './proxy-provider-ranking.controller';
import { ProxyProviderRankingService } from '../services/proxy-provider-ranking.service';
import { CompareProvidersDto, ApiResponse as ProxyApiResponse } from '../dto';

describe('ProxyProviderRankingController', () => {
  let controller: ProxyProviderRankingController;
  let providerRankingService: any;

  const mockProviderRankingService = {
    getProviderRankings: jest.fn(),
    getProviderDetails: jest.fn(),
    compareProviders: jest.fn(),
    calculateProviderScore: jest.fn(),
    updateAllProviderScores: jest.fn(),
  };

  const mockProviderScore = {
    provider: 'provider-1',
    totalScore: 85,
    successRateScore: 88,
    latencyScore: 90,
    costScore: 85,
    stabilityScore: 82,
    availabilityScore: 95,
    totalProxies: 100,
    activeProxies: 95,
    avgSuccessRate: 92.5,
    avgLatency: 120,
    avgCostPerGB: 0.65,
    lastCalculated: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyProviderRankingController],
      providers: [
        {
          provide: ProxyProviderRankingService,
          useValue: mockProviderRankingService,
        },
      ],
    }).compile();

    controller = module.get<ProxyProviderRankingController>(
      ProxyProviderRankingController,
    );
    providerRankingService = module.get(ProxyProviderRankingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProviderRankings', () => {
    it('should return provider rankings without limit', async () => {
      const mockScores = [
        { ...mockProviderScore, provider: 'provider-1', totalScore: 95 },
        { ...mockProviderScore, provider: 'provider-2', totalScore: 88 },
        { ...mockProviderScore, provider: 'provider-3', totalScore: 82 },
      ];

      mockProviderRankingService.getProviderRankings.mockResolvedValue(mockScores);

      const result = await controller.getProviderRankings();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data[0].ranking).toBe(1);
      expect(result.data[0].provider.provider).toBe('provider-1');
      expect(result.data[1].ranking).toBe(2);
      expect(result.data[2].ranking).toBe(3);
      expect(providerRankingService.getProviderRankings).toHaveBeenCalledWith(undefined);
    });

    it('should return provider rankings with limit', async () => {
      const mockScores = [
        { ...mockProviderScore, provider: 'provider-1', totalScore: 95 },
        { ...mockProviderScore, provider: 'provider-2', totalScore: 88 },
      ];

      mockProviderRankingService.getProviderRankings.mockResolvedValue(mockScores);

      const result = await controller.getProviderRankings(5);

      expect(result.data).toHaveLength(2);
      expect(providerRankingService.getProviderRankings).toHaveBeenCalledWith(5);
    });

    it('should assign correct ranking numbers', async () => {
      const mockScores = Array(10)
        .fill(null)
        .map((_, i) => ({
          ...mockProviderScore,
          provider: `provider-${i}`,
          totalScore: 100 - i * 5,
        }));

      mockProviderRankingService.getProviderRankings.mockResolvedValue(mockScores);

      const result = await controller.getProviderRankings();

      expect(result.data).toHaveLength(10);
      expect(result.data[0].ranking).toBe(1);
      expect(result.data[4].ranking).toBe(5);
      expect(result.data[9].ranking).toBe(10);
    });

    it('should handle empty provider list', async () => {
      mockProviderRankingService.getProviderRankings.mockResolvedValue([]);

      const result = await controller.getProviderRankings();

      expect(result.data).toHaveLength(0);
    });

    it('should parse limit parameter as integer', async () => {
      mockProviderRankingService.getProviderRankings.mockResolvedValue([]);

      await controller.getProviderRankings(10);

      expect(providerRankingService.getProviderRankings).toHaveBeenCalledWith(10);
    });
  });

  describe('getProviderDetails', () => {
    it('should return provider details', async () => {
      const provider = 'provider-1';
      const mockDetails = {
        score: mockProviderScore,
        history: [
          {
            score: 83,
            totalProxies: 100,
            activeProxies: 95,
            avgSuccessRate: 91,
            avgLatency: 125,
            avgCostPerGB: 0.7,
            recordedAt: new Date('2025-01-05'),
          },
          {
            score: 85,
            totalProxies: 100,
            activeProxies: 95,
            avgSuccessRate: 92.5,
            avgLatency: 120,
            avgCostPerGB: 0.65,
            recordedAt: new Date('2025-01-06'),
          },
        ],
        trend: 'improving',
        ranking: 2,
      };

      mockProviderRankingService.getProviderDetails.mockResolvedValue(mockDetails);

      const result = await controller.getProviderDetails(provider);

      expect(result.success).toBe(true);
      expect(result.data.score).toBeDefined();
      expect(result.data.history).toHaveLength(2);
      expect(result.data.trend).toBe('improving');
      expect(result.data.ranking).toBe(2);
      expect(providerRankingService.getProviderDetails).toHaveBeenCalledWith(provider);
    });

    it('should return details for different providers', async () => {
      const providers = ['provider-1', 'provider-2', 'provider-3'];

      for (const provider of providers) {
        const mockDetails = {
          score: { ...mockProviderScore, provider },
          history: [],
          trend: 'stable',
          ranking: 1,
        };

        mockProviderRankingService.getProviderDetails.mockResolvedValue(mockDetails);

        const result = await controller.getProviderDetails(provider);

        expect(result.data.score.provider).toBe(provider);
        expect(providerRankingService.getProviderDetails).toHaveBeenCalledWith(provider);
      }
    });

    it('should include trend information', async () => {
      const mockDetails = {
        score: mockProviderScore,
        history: [],
        trend: 'improving',
        ranking: 1,
      };

      mockProviderRankingService.getProviderDetails.mockResolvedValue(mockDetails);

      const result = await controller.getProviderDetails('provider-1');

      expect(result.data.trend).toBe('improving');
    });
  });

  describe('compareProviders', () => {
    it('should compare multiple providers', async () => {
      const dto: CompareProvidersDto = {
        providers: ['provider-1', 'provider-2', 'provider-3'],
      };

      const mockComparison = {
        comparison: [
          {
            provider: 'provider-1',
            score: { ...mockProviderScore, provider: 'provider-1', totalScore: 95 },
            ranking: 1,
          },
          {
            provider: 'provider-2',
            score: { ...mockProviderScore, provider: 'provider-2', totalScore: 88 },
            ranking: 2,
          },
          {
            provider: 'provider-3',
            score: { ...mockProviderScore, provider: 'provider-3', totalScore: 82 },
            ranking: 3,
          },
        ],
        winner: {
          overall: 'provider-1',
          bestSuccessRate: 'provider-2',
          bestLatency: 'provider-1',
          bestCost: 'provider-3',
        },
      };

      mockProviderRankingService.compareProviders.mockResolvedValue(mockComparison);

      const result = await controller.compareProviders(dto);

      expect(result.success).toBe(true);
      expect(result.data.comparison).toHaveLength(3);
      expect(result.data.winner.overall).toBe('provider-1');
      expect(result.data.winner.bestCost).toBe('provider-3');
      expect(providerRankingService.compareProviders).toHaveBeenCalledWith(dto.providers);
    });

    it('should compare two providers', async () => {
      const dto: CompareProvidersDto = {
        providers: ['provider-1', 'provider-2'],
      };

      const mockComparison = {
        comparison: [
          {
            provider: 'provider-1',
            score: { ...mockProviderScore, totalScore: 95 },
            ranking: 1,
          },
          {
            provider: 'provider-2',
            score: { ...mockProviderScore, totalScore: 88 },
            ranking: 2,
          },
        ],
        winner: {
          overall: 'provider-1',
          bestSuccessRate: 'provider-1',
          bestLatency: 'provider-1',
          bestCost: 'provider-2',
        },
      };

      mockProviderRankingService.compareProviders.mockResolvedValue(mockComparison);

      const result = await controller.compareProviders(dto);

      expect(result.data.comparison).toHaveLength(2);
      expect(result.data.winner.overall).toBe('provider-1');
    });

    it('should include winner information', async () => {
      const dto: CompareProvidersDto = {
        providers: ['provider-1', 'provider-2'],
      };

      const mockComparison = {
        comparison: [],
        winner: {
          overall: 'provider-1',
          bestSuccessRate: 'provider-1',
          bestLatency: 'provider-2',
          bestCost: 'provider-2',
        },
      };

      mockProviderRankingService.compareProviders.mockResolvedValue(mockComparison);

      const result = await controller.compareProviders(dto);

      expect(result.data.winner.overall).toBe('provider-1');
      expect(result.data.winner.bestLatency).toBe('provider-2');
      expect(result.data.winner.bestCost).toBe('provider-2');
    });
  });

  describe('calculateProviderScore', () => {
    it('should calculate score for a provider', async () => {
      const provider = 'provider-1';
      const mockScore = {
        ...mockProviderScore,
        provider: 'provider-1',
        totalScore: 87,
        calculatedAt: new Date('2025-01-06T00:00:00.000Z'),
      };

      mockProviderRankingService.calculateProviderScore.mockResolvedValue(mockScore);

      const result = await controller.calculateProviderScore(provider);

      expect(result.success).toBe(true);
      expect(result.data.provider).toBe('provider-1');
      expect(result.data.totalScore).toBe(87);
      expect(result.message).toBe('Score calculated');
      expect(providerRankingService.calculateProviderScore).toHaveBeenCalledWith(
        provider,
      );
    });

    it('should calculate scores for different providers', async () => {
      const providers = ['provider-1', 'provider-2', 'provider-3'];

      for (const provider of providers) {
        const mockScore = {
          ...mockProviderScore,
          provider,
          totalScore: 80 + Math.floor(Math.random() * 20),
        };

        mockProviderRankingService.calculateProviderScore.mockResolvedValue(mockScore);

        const result = await controller.calculateProviderScore(provider);

        expect(result.data.provider).toBe(provider);
        expect(providerRankingService.calculateProviderScore).toHaveBeenCalledWith(
          provider,
        );
      }
    });

    it('should return score with all components', async () => {
      const mockScore = {
        ...mockProviderScore,
        successRateScore: 90,
        latencyScore: 92,
        costScore: 88,
        stabilityScore: 85,
        availabilityScore: 95,
        totalScore: 87.67,
      };

      mockProviderRankingService.calculateProviderScore.mockResolvedValue(mockScore);

      const result = await controller.calculateProviderScore('provider-1');

      expect(result.data.successRateScore).toBe(90);
      expect(result.data.latencyScore).toBe(92);
      expect(result.data.costScore).toBe(88);
      expect(result.data.stabilityScore).toBe(85);
      expect(result.data.availabilityScore).toBe(95);
      expect(result.data.totalScore).toBe(87.67);
    });
  });

  describe('updateAllProviderScores', () => {
    it('should update all provider scores', async () => {
      mockProviderRankingService.updateAllProviderScores.mockResolvedValue(undefined);

      const result = await controller.updateAllProviderScores();

      expect(result.success).toBe(true);
      expect(result.data.updated).toBe(1);
      expect(result.data.duration).toBeDefined();
      expect(typeof result.data.duration).toBe('number');
      expect(providerRankingService.updateAllProviderScores).toHaveBeenCalled();
    });

    it('should measure execution duration', async () => {
      mockProviderRankingService.updateAllProviderScores.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const result = await controller.updateAllProviderScores();

      expect(result.data.duration).toBeGreaterThanOrEqual(100);
    });

    it('should handle quick updates', async () => {
      mockProviderRankingService.updateAllProviderScores.mockResolvedValue(undefined);

      const result = await controller.updateAllProviderScores();

      expect(result.data.duration).toBeGreaterThanOrEqual(0);
      expect(result.data.updated).toBe(1);
    });
  });

  describe('getProviderStatistics', () => {
    it('should return comprehensive provider statistics', async () => {
      const mockScores = [
        { ...mockProviderScore, provider: 'provider-1', totalScore: 95, totalProxies: 150 },
        { ...mockProviderScore, provider: 'provider-2', totalScore: 85, totalProxies: 100 },
        { ...mockProviderScore, provider: 'provider-3', totalScore: 75, totalProxies: 80 },
        { ...mockProviderScore, provider: 'provider-4', totalScore: 65, totalProxies: 70 },
      ];

      mockProviderRankingService.getProviderRankings.mockResolvedValue(mockScores);

      const result = await controller.getProviderStatistics();

      expect(result.success).toBe(true);
      expect(result.data.totalProviders).toBe(4);
      expect(result.data.avgTotalScore).toBe(80);
      expect(result.data.highestScore).toBe(95);
      expect(result.data.lowestScore).toBe(65);
      expect(result.data.scoreDistribution).toBeDefined();
      expect(result.data.marketShare).toBeDefined();
    });

    it('should calculate score distribution correctly', async () => {
      const mockScores = [
        { ...mockProviderScore, totalScore: 95, totalProxies: 100 }, // excellent
        { ...mockProviderScore, totalScore: 85, totalProxies: 100 }, // good
        { ...mockProviderScore, totalScore: 75, totalProxies: 100 }, // fair
        { ...mockProviderScore, totalScore: 65, totalProxies: 100 }, // poor
      ];

      mockProviderRankingService.getProviderRankings.mockResolvedValue(mockScores);

      const result = await controller.getProviderStatistics();

      expect(result.data.scoreDistribution.excellent).toBe(1);
      expect(result.data.scoreDistribution.good).toBe(1);
      expect(result.data.scoreDistribution.fair).toBe(1);
      expect(result.data.scoreDistribution.poor).toBe(1);
    });

    it('should calculate market share correctly', async () => {
      const mockScores = [
        { ...mockProviderScore, provider: 'provider-1', totalScore: 90, totalProxies: 400 },
        { ...mockProviderScore, provider: 'provider-2', totalScore: 85, totalProxies: 300 },
        { ...mockProviderScore, provider: 'provider-3', totalScore: 80, totalProxies: 200 },
        { ...mockProviderScore, provider: 'provider-4', totalScore: 75, totalProxies: 100 },
      ];

      mockProviderRankingService.getProviderRankings.mockResolvedValue(mockScores);

      const result = await controller.getProviderStatistics();

      expect(result.data.marketShare['provider-1']).toBe(40);
      expect(result.data.marketShare['provider-2']).toBe(30);
      expect(result.data.marketShare['provider-3']).toBe(20);
      expect(result.data.marketShare['provider-4']).toBe(10);
    });

    it('should handle single provider statistics', async () => {
      const mockScores = [
        { ...mockProviderScore, provider: 'provider-1', totalScore: 88, totalProxies: 100 },
      ];

      mockProviderRankingService.getProviderRankings.mockResolvedValue(mockScores);

      const result = await controller.getProviderStatistics();

      expect(result.data.totalProviders).toBe(1);
      expect(result.data.avgTotalScore).toBe(88);
      expect(result.data.highestScore).toBe(88);
      expect(result.data.lowestScore).toBe(88);
      expect(result.data.marketShare['provider-1']).toBe(100);
    });

    it('should handle providers with same total score', async () => {
      const mockScores = [
        { ...mockProviderScore, provider: 'provider-1', totalScore: 85, totalProxies: 100 },
        { ...mockProviderScore, provider: 'provider-2', totalScore: 85, totalProxies: 100 },
        { ...mockProviderScore, provider: 'provider-3', totalScore: 85, totalProxies: 100 },
      ];

      mockProviderRankingService.getProviderRankings.mockResolvedValue(mockScores);

      const result = await controller.getProviderStatistics();

      expect(result.data.totalProviders).toBe(3);
      expect(result.data.avgTotalScore).toBe(85);
      expect(result.data.highestScore).toBe(85);
      expect(result.data.lowestScore).toBe(85);
    });
  });

  describe('Response Format', () => {
    it('should return ProxyApiResponse format for all endpoints', async () => {
      mockProviderRankingService.getProviderRankings.mockResolvedValue([mockProviderScore]);
      mockProviderRankingService.getProviderDetails.mockResolvedValue({ provider: 'test' });
      mockProviderRankingService.compareProviders.mockResolvedValue({ providers: [] });
      mockProviderRankingService.calculateProviderScore.mockResolvedValue(mockProviderScore);
      mockProviderRankingService.updateAllProviderScores.mockResolvedValue(undefined);

      const rankingsResult = await controller.getProviderRankings();
      const detailsResult = await controller.getProviderDetails('provider-1');
      const compareResult = await controller.compareProviders({ providers: [] });
      const calculateResult = await controller.calculateProviderScore('provider-1');
      const updateResult = await controller.updateAllProviderScores();
      const statsResult = await controller.getProviderStatistics();

      expect(rankingsResult.success).toBe(true);
      expect(detailsResult.success).toBe(true);
      expect(compareResult.success).toBe(true);
      expect(calculateResult.success).toBe(true);
      expect(updateResult.success).toBe(true);
      expect(statsResult.success).toBe(true);
    });

    it('should include data property in all responses', async () => {
      mockProviderRankingService.getProviderRankings.mockResolvedValue([]);
      mockProviderRankingService.getProviderDetails.mockResolvedValue({});
      mockProviderRankingService.compareProviders.mockResolvedValue({});
      mockProviderRankingService.calculateProviderScore.mockResolvedValue({});
      mockProviderRankingService.updateAllProviderScores.mockResolvedValue(undefined);

      const rankingsResult = await controller.getProviderRankings();
      const detailsResult = await controller.getProviderDetails('provider-1');
      const compareResult = await controller.compareProviders({ providers: [] });
      const calculateResult = await controller.calculateProviderScore('provider-1');
      const updateResult = await controller.updateAllProviderScores();
      const statsResult = await controller.getProviderStatistics();

      expect(rankingsResult.data).toBeDefined();
      expect(detailsResult.data).toBeDefined();
      expect(compareResult.data).toBeDefined();
      expect(calculateResult.data).toBeDefined();
      expect(updateResult.data).toBeDefined();
      expect(statsResult.data).toBeDefined();
    });

    it('should include message in calculation endpoint', async () => {
      mockProviderRankingService.calculateProviderScore.mockResolvedValue(mockProviderScore);

      const result = await controller.calculateProviderScore('provider-1');

      expect(result.message).toBe('Score calculated');
    });
  });
});
