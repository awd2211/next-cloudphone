import { Test, TestingModule } from '@nestjs/testing';
import { ProxyCostMonitoringController } from './proxy-cost-monitoring.controller';
import { ProxyCostMonitoringService } from '../services/proxy-cost-monitoring.service';

describe('ProxyCostMonitoringController', () => {
  let controller: ProxyCostMonitoringController;
  let service: any;

  const mockCostMonitoringService = {
    recordCost: jest.fn(),
    configureBudget: jest.fn(),
    getCostStatistics: jest.fn(),
    getCostOptimizationRecommendations: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyCostMonitoringController],
      providers: [
        {
          provide: ProxyCostMonitoringService,
          useValue: mockCostMonitoringService,
        },
      ],
    }).compile();

    controller = module.get<ProxyCostMonitoringController>(
      ProxyCostMonitoringController,
    );
    service = module.get(ProxyCostMonitoringService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordCost', () => {
    it('should record cost successfully', async () => {
      const dto: any = {
        userId: 'user-123',
        deviceId: 'device-456',
        amount: 5.50,
        currency: 'USD',
      };

      service.recordCost.mockResolvedValue(undefined);

      const result = await controller.recordCost(dto);

      expect(result.success).toBe(true);
      expect(result.data.recorded).toBe(true);
      expect(result.message).toBe('Cost recorded');
      expect(service.recordCost).toHaveBeenCalledWith(dto);
    });

    it('should handle cost recording errors', async () => {
      const dto: any = {
        userId: 'user-123',
        amount: 5.50,
      };

      service.recordCost.mockRejectedValue(new Error('Recording failed'));

      await expect(controller.recordCost(dto)).rejects.toThrow('Recording failed');
    });
  });

  describe('configureBudget', () => {
    it('should configure budget successfully', async () => {
      const dto: any = {
        userId: 'user-123',
        budgetAmount: 100.00,
        budgetType: 'monthly',
        alertThreshold: 80,
      };

      const mockBudget = {
        id: 'budget-123',
        userId: 'user-123',
        budgetAmount: 100.00,
        spentAmount: 45.00,
        budgetType: 'monthly',
        alertThreshold: 80,
        createdAt: new Date(),
      };

      service.configureBudget.mockResolvedValue(mockBudget);

      const result = await controller.configureBudget(dto);

      expect(result.success).toBe(true);
      expect(result.data.budgetAmount).toBe(100.00);
      expect(result.data.spentAmount).toBe(45.00);
      expect(result.data.usagePercentage).toBe(45);
      expect(result.message).toBe('Budget configured');
      expect(service.configureBudget).toHaveBeenCalledWith(dto);
    });

    it('should calculate usage percentage correctly', async () => {
      const dto: any = {
        userId: 'user-123',
        budgetAmount: 200.00,
      };

      const mockBudget = {
        id: 'budget-456',
        userId: 'user-123',
        budgetAmount: 200.00,
        spentAmount: 150.00,
        budgetType: 'weekly',
      };

      service.configureBudget.mockResolvedValue(mockBudget);

      const result = await controller.configureBudget(dto);

      expect(result.data.usagePercentage).toBe(75);
    });
  });

  describe('getCostStatistics', () => {
    it('should return cost statistics', async () => {
      const dto: any = {
        userId: 'user-123',
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-01-31T23:59:59.000Z',
        groupBy: 'day',
      };

      const mockStats = {
        totalCost: 250.50,
        totalRequests: 1000,
        averageCostPerRequest: 0.25,
        timeline: [
          { date: '2025-01-01', cost: 10.00 },
          { date: '2025-01-02', cost: 12.50 },
        ],
      };

      service.getCostStatistics.mockResolvedValue(mockStats);

      const result = await controller.getCostStatistics(dto);

      expect(result.success).toBe(true);
      expect(result.data.totalCost).toBe(250.50);
      expect(result.data.timeline).toHaveLength(2);
      expect(service.getCostStatistics).toHaveBeenCalledWith({
        userId: 'user-123',
        deviceId: undefined,
        startDate: new Date('2025-01-01T00:00:00.000Z'),
        endDate: new Date('2025-01-31T23:59:59.000Z'),
        groupBy: 'day',
      });
    });

    it('should handle device-specific statistics', async () => {
      const dto: any = {
        userId: 'user-123',
        deviceId: 'device-456',
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-01-31T23:59:59.000Z',
        groupBy: 'hour',
      };

      const mockStats = {
        totalCost: 50.00,
        totalRequests: 200,
      };

      service.getCostStatistics.mockResolvedValue(mockStats);

      const result = await controller.getCostStatistics(dto);

      expect(result.success).toBe(true);
      expect(service.getCostStatistics).toHaveBeenCalledWith({
        userId: 'user-123',
        deviceId: 'device-456',
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        groupBy: 'hour',
      });
    });
  });

  describe('getUserBudgets', () => {
    it('should return user budgets', async () => {
      const result = await controller.getUserBudgets('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return user budgets with budget type filter', async () => {
      const result = await controller.getUserBudgets('user-123', 'monthly');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getCostAlerts', () => {
    it('should return cost alerts', async () => {
      const result = await controller.getCostAlerts('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return cost alerts with acknowledged filter', async () => {
      const result = await controller.getCostAlerts('user-123', true);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('acknowledgeCostAlert', () => {
    it('should acknowledge cost alert', async () => {
      const result = await controller.acknowledgeCostAlert('alert-123');

      expect(result.success).toBe(true);
      expect(result.data.acknowledged).toBe(true);
      expect(result.message).toBe('Alert acknowledged');
    });
  });

  describe('getCostOptimization', () => {
    it('should return cost optimization recommendations', async () => {
      const mockRecommendations = {
        totalPotentialSavings: 50.00,
        recommendations: [
          {
            type: 'provider_switch',
            description: 'Switch to cheaper provider',
            estimatedSavings: 30.00,
          },
          {
            type: 'usage_optimization',
            description: 'Reduce peak hour usage',
            estimatedSavings: 20.00,
          },
        ],
      };

      service.getCostOptimizationRecommendations.mockResolvedValue(
        mockRecommendations,
      );

      const result = await controller.getCostOptimization('user-123');

      expect(result.success).toBe(true);
      expect(result.data.totalPotentialSavings).toBe(50.00);
      expect(result.data.recommendations).toHaveLength(2);
      expect(service.getCostOptimizationRecommendations).toHaveBeenCalledWith(
        'user-123',
      );
    });

    it('should handle empty recommendations', async () => {
      const mockRecommendations = {
        totalPotentialSavings: 0,
        recommendations: [],
      };

      service.getCostOptimizationRecommendations.mockResolvedValue(
        mockRecommendations,
      );

      const result = await controller.getCostOptimization('user-123');

      expect(result.success).toBe(true);
      expect(result.data.totalPotentialSavings).toBe(0);
      expect(result.data.recommendations).toHaveLength(0);
    });
  });

  describe('getCostDashboard', () => {
    it('should return cost dashboard data', async () => {
      const mockMonthStats = {
        totalCost: 150.00,
        totalRequests: 500,
        timeline: [
          { date: '2025-01-01', cost: 5.00 },
          { date: '2025-01-02', cost: 6.00 },
        ],
      };

      const mockTodayStats = {
        totalCost: 8.50,
        totalRequests: 25,
      };

      service.getCostStatistics
        .mockResolvedValueOnce(mockMonthStats)
        .mockResolvedValueOnce(mockTodayStats);

      const result = await controller.getCostDashboard('user-123');

      expect(result.success).toBe(true);
      expect(result.data.currentMonthCost).toBe(150.00);
      expect(result.data.todayCost).toBe(8.50);
      expect(result.data.budgets).toEqual([]);
      expect(result.data.recentAlerts).toEqual([]);
      expect(result.data.topExpensiveProxies).toEqual([]);
      expect(result.data.costTrend).toHaveLength(2);

      expect(service.getCostStatistics).toHaveBeenCalledTimes(2);
    });

    it('should handle empty dashboard data', async () => {
      const emptyStats = {
        totalCost: 0,
        totalRequests: 0,
        timeline: [],
      };

      service.getCostStatistics
        .mockResolvedValueOnce(emptyStats)
        .mockResolvedValueOnce(emptyStats);

      const result = await controller.getCostDashboard('user-123');

      expect(result.success).toBe(true);
      expect(result.data.currentMonthCost).toBe(0);
      expect(result.data.todayCost).toBe(0);
      expect(result.data.costTrend).toEqual([]);
    });
  });
});
