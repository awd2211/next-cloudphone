import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  let dashboardService: any;

  const mockDashboardService = {
    getUsageForecast: jest.fn(),
    getCostWarning: jest.fn(),
    getWarningConfig: jest.fn(),
    updateWarningConfig: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: mockDashboardService,
        },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    dashboardService = module.get(DashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsageForecast', () => {
    it('should return usage forecast with default parameters', async () => {
      const userId = 'user-123';
      const mockForecast = {
        userId: 'user-123',
        forecastPeriod: 7,
        historicalPeriod: 30,
        predictions: [
          { date: '2025-01-07', estimatedCost: 12.5, confidence: 0.85 },
          { date: '2025-01-08', estimatedCost: 13.2, confidence: 0.82 },
        ],
        totalEstimatedCost: 87.5,
        averageDailyCost: 12.5,
      };

      dashboardService.getUsageForecast.mockResolvedValue(mockForecast);

      const result: any = await controller.getUsageForecast(userId, 7, 30);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockForecast);
      expect(result.message).toBe('使用量预测获取成功');
      expect(dashboardService.getUsageForecast).toHaveBeenCalledWith(userId, 7, 30);
    });

    it('should return forecast with custom forecast days', async () => {
      const userId = 'user-456';
      const mockForecast = {
        userId: 'user-456',
        forecastPeriod: 14,
        historicalPeriod: 30,
        predictions: [
          { date: '2025-01-07', estimatedCost: 15.0, confidence: 0.90 },
        ],
        totalEstimatedCost: 210.0,
        averageDailyCost: 15.0,
      };

      dashboardService.getUsageForecast.mockResolvedValue(mockForecast);

      const result: any = await controller.getUsageForecast(userId, 14, 30);

      expect(result.success).toBe(true);
      expect(result.data.forecastPeriod).toBe(14);
      expect(dashboardService.getUsageForecast).toHaveBeenCalledWith(userId, 14, 30);
    });

    it('should return forecast with custom historical days', async () => {
      const userId = 'user-789';
      const mockForecast = {
        userId: 'user-789',
        forecastPeriod: 7,
        historicalPeriod: 60,
        predictions: [
          { date: '2025-01-07', estimatedCost: 10.5, confidence: 0.92 },
        ],
        totalEstimatedCost: 73.5,
        averageDailyCost: 10.5,
      };

      dashboardService.getUsageForecast.mockResolvedValue(mockForecast);

      const result: any = await controller.getUsageForecast(userId, 7, 60);

      expect(result.success).toBe(true);
      expect(result.data.historicalPeriod).toBe(60);
      expect(dashboardService.getUsageForecast).toHaveBeenCalledWith(userId, 7, 60);
    });

    it('should handle forecast with high confidence', async () => {
      const userId = 'user-abc';
      const mockForecast = {
        userId: 'user-abc',
        forecastPeriod: 7,
        historicalPeriod: 90,
        predictions: [
          { date: '2025-01-07', estimatedCost: 20.0, confidence: 0.95 },
          { date: '2025-01-08', estimatedCost: 21.0, confidence: 0.94 },
        ],
        totalEstimatedCost: 147.0,
        averageDailyCost: 21.0,
      };

      dashboardService.getUsageForecast.mockResolvedValue(mockForecast);

      const result: any = await controller.getUsageForecast(userId, 7, 90);

      expect(result.success).toBe(true);
      expect(result.data.predictions[0].confidence).toBeGreaterThan(0.9);
    });

    it('should handle long-term forecast (30 days)', async () => {
      const userId = 'user-def';
      const mockForecast = {
        userId: 'user-def',
        forecastPeriod: 30,
        historicalPeriod: 60,
        predictions: Array.from({ length: 30 }, (_, i) => ({
          date: `2025-01-${7 + i}`,
          estimatedCost: 15.0 + i * 0.5,
          confidence: 0.85 - i * 0.01,
        })),
        totalEstimatedCost: 675.0,
        averageDailyCost: 22.5,
      };

      dashboardService.getUsageForecast.mockResolvedValue(mockForecast);

      const result: any = await controller.getUsageForecast(userId, 30, 60);

      expect(result.success).toBe(true);
      expect(result.data.predictions).toHaveLength(30);
      expect(result.data.forecastPeriod).toBe(30);
    });
  });

  describe('getCostWarning', () => {
    it('should return cost warning when balance is sufficient', async () => {
      const userId = 'user-123';
      const mockConfig = {
        dailyBudget: 100,
        monthlyBudget: 3000,
        lowBalanceThreshold: 50,
        criticalBalanceThreshold: 20,
      };

      const mockWarning = {
        userId: 'user-123',
        warningLevel: 'safe',
        currentBalance: 500,
        estimatedDaysRemaining: 15,
        message: '余额充足',
        suggestions: [],
      };

      dashboardService.getWarningConfig.mockResolvedValue(mockConfig);
      dashboardService.getCostWarning.mockResolvedValue(mockWarning);

      const result: any = await controller.getCostWarning(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockWarning);
      expect(result.data.warningLevel).toBe('safe');
      expect(result.message).toBe('成本预警获取成功');
      expect(dashboardService.getWarningConfig).toHaveBeenCalledWith(userId);
      expect(dashboardService.getCostWarning).toHaveBeenCalledWith(userId, mockConfig);
    });

    it('should return low balance warning', async () => {
      const userId = 'user-456';
      const mockConfig = {
        dailyBudget: 100,
        monthlyBudget: 3000,
        lowBalanceThreshold: 50,
        criticalBalanceThreshold: 20,
      };

      const mockWarning = {
        userId: 'user-456',
        warningLevel: 'low',
        currentBalance: 45,
        estimatedDaysRemaining: 3,
        message: '余额偏低，请及时充值',
        suggestions: ['考虑充值', '检查不必要的资源'],
      };

      dashboardService.getWarningConfig.mockResolvedValue(mockConfig);
      dashboardService.getCostWarning.mockResolvedValue(mockWarning);

      const result: any = await controller.getCostWarning(userId);

      expect(result.success).toBe(true);
      expect(result.data.warningLevel).toBe('low');
      expect(result.data.currentBalance).toBe(45);
      expect(result.data.suggestions).toHaveLength(2);
    });

    it('should return critical balance warning', async () => {
      const userId = 'user-789';
      const mockConfig = {
        dailyBudget: 100,
        monthlyBudget: 3000,
        lowBalanceThreshold: 50,
        criticalBalanceThreshold: 20,
      };

      const mockWarning = {
        userId: 'user-789',
        warningLevel: 'critical',
        currentBalance: 15,
        estimatedDaysRemaining: 1,
        message: '余额严重不足，服务即将停止',
        suggestions: ['立即充值', '停止非必要服务', '联系客服'],
      };

      dashboardService.getWarningConfig.mockResolvedValue(mockConfig);
      dashboardService.getCostWarning.mockResolvedValue(mockWarning);

      const result: any = await controller.getCostWarning(userId);

      expect(result.success).toBe(true);
      expect(result.data.warningLevel).toBe('critical');
      expect(result.data.currentBalance).toBe(15);
      expect(result.data.estimatedDaysRemaining).toBe(1);
    });

    it('should return warning when approaching daily budget', async () => {
      const userId = 'user-abc';
      const mockConfig = {
        dailyBudget: 100,
        monthlyBudget: 3000,
        lowBalanceThreshold: 50,
        criticalBalanceThreshold: 20,
      };

      const mockWarning = {
        userId: 'user-abc',
        warningLevel: 'budget_warning',
        currentBalance: 200,
        estimatedDaysRemaining: 10,
        dailySpending: 95,
        message: '今日支出接近预算限制',
        suggestions: ['检查资源使用', '考虑调整预算'],
      };

      dashboardService.getWarningConfig.mockResolvedValue(mockConfig);
      dashboardService.getCostWarning.mockResolvedValue(mockWarning);

      const result: any = await controller.getCostWarning(userId);

      expect(result.success).toBe(true);
      expect(result.data.warningLevel).toBe('budget_warning');
      expect(result.data.dailySpending).toBe(95);
    });

    it('should return warning when exceeding monthly budget', async () => {
      const userId = 'user-def';
      const mockConfig = {
        dailyBudget: 100,
        monthlyBudget: 3000,
        lowBalanceThreshold: 50,
        criticalBalanceThreshold: 20,
      };

      const mockWarning = {
        userId: 'user-def',
        warningLevel: 'budget_exceeded',
        currentBalance: 500,
        estimatedDaysRemaining: 15,
        monthlySpending: 3200,
        message: '本月支出已超出预算',
        suggestions: ['审查资源使用', '优化成本', '增加预算'],
      };

      dashboardService.getWarningConfig.mockResolvedValue(mockConfig);
      dashboardService.getCostWarning.mockResolvedValue(mockWarning);

      const result: any = await controller.getCostWarning(userId);

      expect(result.success).toBe(true);
      expect(result.data.warningLevel).toBe('budget_exceeded');
      expect(result.data.monthlySpending).toBeGreaterThan(3000);
    });
  });

  describe('getWarningConfig', () => {
    it('should return warning configuration', async () => {
      const userId = 'user-123';
      const mockConfig = {
        userId: 'user-123',
        dailyBudget: 100,
        monthlyBudget: 3000,
        lowBalanceThreshold: 50,
        criticalBalanceThreshold: 20,
        enableEmailNotification: true,
        enableSmsNotification: false,
      };

      dashboardService.getWarningConfig.mockResolvedValue(mockConfig);

      const result: any = await controller.getWarningConfig(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
      expect(result.data.userId).toBe('user-123');
      expect(result.message).toBe('预警配置获取成功');
      expect(dashboardService.getWarningConfig).toHaveBeenCalledWith(userId);
    });

    it('should return config with email notifications enabled', async () => {
      const userId = 'user-456';
      const mockConfig = {
        userId: 'user-456',
        dailyBudget: 150,
        monthlyBudget: 4500,
        lowBalanceThreshold: 100,
        criticalBalanceThreshold: 30,
        enableEmailNotification: true,
        enableSmsNotification: true,
      };

      dashboardService.getWarningConfig.mockResolvedValue(mockConfig);

      const result: any = await controller.getWarningConfig(userId);

      expect(result.success).toBe(true);
      expect(result.data.enableEmailNotification).toBe(true);
      expect(result.data.enableSmsNotification).toBe(true);
    });

    it('should return config with custom budget thresholds', async () => {
      const userId = 'user-789';
      const mockConfig = {
        userId: 'user-789',
        dailyBudget: 500,
        monthlyBudget: 15000,
        lowBalanceThreshold: 500,
        criticalBalanceThreshold: 100,
        enableEmailNotification: true,
        enableSmsNotification: false,
      };

      dashboardService.getWarningConfig.mockResolvedValue(mockConfig);

      const result: any = await controller.getWarningConfig(userId);

      expect(result.success).toBe(true);
      expect(result.data.dailyBudget).toBe(500);
      expect(result.data.monthlyBudget).toBe(15000);
      expect(result.data.lowBalanceThreshold).toBe(500);
    });
  });

  describe('updateWarningConfig', () => {
    it('should update warning configuration', async () => {
      const userId = 'user-123';
      const updateData = {
        dailyBudget: 120,
        monthlyBudget: 3600,
      };

      const mockUpdatedConfig = {
        userId: 'user-123',
        dailyBudget: 120,
        monthlyBudget: 3600,
        lowBalanceThreshold: 50,
        criticalBalanceThreshold: 20,
        enableEmailNotification: true,
        enableSmsNotification: false,
      };

      dashboardService.updateWarningConfig.mockResolvedValue(mockUpdatedConfig);

      const result: any = await controller.updateWarningConfig(userId, updateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedConfig);
      expect(result.data.dailyBudget).toBe(120);
      expect(result.data.monthlyBudget).toBe(3600);
      expect(result.message).toBe('预警配置更新成功');
      expect(dashboardService.updateWarningConfig).toHaveBeenCalledWith(userId, updateData);
    });

    it('should update notification settings', async () => {
      const userId = 'user-456';
      const updateData = {
        enableEmailNotification: false,
        enableSmsNotification: true,
      };

      const mockUpdatedConfig = {
        userId: 'user-456',
        dailyBudget: 100,
        monthlyBudget: 3000,
        lowBalanceThreshold: 50,
        criticalBalanceThreshold: 20,
        enableEmailNotification: false,
        enableSmsNotification: true,
      };

      dashboardService.updateWarningConfig.mockResolvedValue(mockUpdatedConfig);

      const result: any = await controller.updateWarningConfig(userId, updateData);

      expect(result.success).toBe(true);
      expect(result.data.enableEmailNotification).toBe(false);
      expect(result.data.enableSmsNotification).toBe(true);
    });

    it('should update balance thresholds', async () => {
      const userId = 'user-789';
      const updateData = {
        lowBalanceThreshold: 100,
        criticalBalanceThreshold: 30,
      };

      const mockUpdatedConfig = {
        userId: 'user-789',
        dailyBudget: 100,
        monthlyBudget: 3000,
        lowBalanceThreshold: 100,
        criticalBalanceThreshold: 30,
        enableEmailNotification: true,
        enableSmsNotification: false,
      };

      dashboardService.updateWarningConfig.mockResolvedValue(mockUpdatedConfig);

      const result: any = await controller.updateWarningConfig(userId, updateData);

      expect(result.success).toBe(true);
      expect(result.data.lowBalanceThreshold).toBe(100);
      expect(result.data.criticalBalanceThreshold).toBe(30);
    });

    it('should update all config fields', async () => {
      const userId = 'user-abc';
      const updateData = {
        dailyBudget: 200,
        monthlyBudget: 6000,
        lowBalanceThreshold: 150,
        criticalBalanceThreshold: 50,
        enableEmailNotification: true,
        enableSmsNotification: true,
      };

      const mockUpdatedConfig = {
        userId: 'user-abc',
        ...updateData,
      };

      dashboardService.updateWarningConfig.mockResolvedValue(mockUpdatedConfig);

      const result: any = await controller.updateWarningConfig(userId, updateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedConfig);
      expect(result.data.dailyBudget).toBe(200);
      expect(result.data.monthlyBudget).toBe(6000);
      expect(result.data.enableEmailNotification).toBe(true);
      expect(result.data.enableSmsNotification).toBe(true);
    });

    it('should handle partial config update', async () => {
      const userId = 'user-def';
      const updateData = {
        dailyBudget: 150,
      };

      const mockUpdatedConfig = {
        userId: 'user-def',
        dailyBudget: 150,
        monthlyBudget: 3000,
        lowBalanceThreshold: 50,
        criticalBalanceThreshold: 20,
        enableEmailNotification: true,
        enableSmsNotification: false,
      };

      dashboardService.updateWarningConfig.mockResolvedValue(mockUpdatedConfig);

      const result: any = await controller.updateWarningConfig(userId, updateData);

      expect(result.success).toBe(true);
      expect(result.data.dailyBudget).toBe(150);
      expect(dashboardService.updateWarningConfig).toHaveBeenCalledWith(userId, updateData);
    });
  });
});
