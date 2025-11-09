import { Test, TestingModule } from '@nestjs/testing';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

describe('StatsController', () => {
  let controller: StatsController;
  let statsService: any;

  const mockStatsService = {
    getDashboardStats: jest.fn(),
    getOnlineDevicesCount: jest.fn(),
    getDeviceStatusDistribution: jest.fn(),
    getTodayNewUsersCount: jest.fn(),
    getUserActivityStats: jest.fn(),
    getUserGrowthStats: jest.fn(),
    getTodayRevenue: jest.fn(),
    getMonthRevenue: jest.fn(),
    getRevenueTrend: jest.fn(),
    getPlanDistributionStats: jest.fn(),
    getOverview: jest.fn(),
    getPerformance: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [
        {
          provide: StatsService,
          useValue: mockStatsService,
        },
      ],
    }).compile();

    controller = module.get<StatsController>(StatsController);
    statsService = module.get(StatsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      const mockStats = {
        totalUsers: 1000,
        activeUsers: 750,
        totalDevices: 500,
        activeDevices: 350,
        todayRevenue: 1500.00,
        monthRevenue: 45000.00,
      };

      statsService.getDashboardStats.mockResolvedValue(mockStats);

      const result: any = await controller.getDashboardStats();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(result.data.totalUsers).toBe(1000);
      expect(result.data.monthRevenue).toBe(45000.00);
      expect(statsService.getDashboardStats).toHaveBeenCalled();
    });

    it('should return complete dashboard data', async () => {
      const mockStats = {
        users: {
          total: 1000,
          active: 750,
          todayNew: 25,
        },
        devices: {
          total: 500,
          online: 350,
          offline: 150,
        },
        revenue: {
          today: 1500,
          month: 45000,
          year: 500000,
        },
      };

      statsService.getDashboardStats.mockResolvedValue(mockStats);

      const result: any = await controller.getDashboardStats();

      expect(result.data.users).toBeDefined();
      expect(result.data.devices).toBeDefined();
      expect(result.data.revenue).toBeDefined();
    });
  });

  describe('getOnlineDevices', () => {
    it('should return online devices count', async () => {
      statsService.getOnlineDevicesCount.mockResolvedValue(350);

      const result: any = await controller.getOnlineDevices();

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(350);
      expect(statsService.getOnlineDevicesCount).toHaveBeenCalled();
    });

    it('should return zero when no devices online', async () => {
      statsService.getOnlineDevicesCount.mockResolvedValue(0);

      const result: any = await controller.getOnlineDevices();

      expect(result.data.count).toBe(0);
    });

    it('should return large count correctly', async () => {
      statsService.getOnlineDevicesCount.mockResolvedValue(10000);

      const result: any = await controller.getOnlineDevices();

      expect(result.data.count).toBe(10000);
    });
  });

  describe('getDeviceDistribution', () => {
    it('should return device status distribution', async () => {
      const mockDistribution = {
        running: 250,
        stopped: 100,
        error: 50,
        maintenance: 25,
      };

      statsService.getDeviceStatusDistribution.mockResolvedValue(mockDistribution);

      const result: any = await controller.getDeviceDistribution();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDistribution);
      expect(result.data.running).toBe(250);
      expect(result.data.stopped).toBe(100);
      expect(statsService.getDeviceStatusDistribution).toHaveBeenCalled();
    });

    it('should return distribution with percentages', async () => {
      const mockDistribution = {
        running: 250,
        stopped: 100,
        error: 50,
        total: 400,
        percentages: {
          running: 62.5,
          stopped: 25.0,
          error: 12.5,
        },
      };

      statsService.getDeviceStatusDistribution.mockResolvedValue(mockDistribution);

      const result: any = await controller.getDeviceDistribution();

      expect(result.data.percentages).toBeDefined();
      expect(result.data.percentages.running).toBe(62.5);
    });
  });

  describe('getTodayNewUsers', () => {
    it('should return today new users count', async () => {
      statsService.getTodayNewUsersCount.mockResolvedValue(25);

      const result: any = await controller.getTodayNewUsers();

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(25);
      expect(statsService.getTodayNewUsersCount).toHaveBeenCalled();
    });

    it('should return zero for no new users', async () => {
      statsService.getTodayNewUsersCount.mockResolvedValue(0);

      const result: any = await controller.getTodayNewUsers();

      expect(result.data.count).toBe(0);
    });
  });

  describe('getUserActivity', () => {
    it('should return user activity for default 7 days', async () => {
      const mockActivity = [
        { date: '2025-01-01', activeUsers: 100, logins: 250 },
        { date: '2025-01-02', activeUsers: 120, logins: 300 },
        { date: '2025-01-03', activeUsers: 110, logins: 270 },
      ];

      statsService.getUserActivityStats.mockResolvedValue(mockActivity);

      const result: any = await controller.getUserActivity();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockActivity);
      expect(result.data).toHaveLength(3);
      expect(statsService.getUserActivityStats).toHaveBeenCalledWith(7);
    });

    it('should return user activity for custom days', async () => {
      const mockActivity = [
        { date: '2025-01-01', activeUsers: 100 },
        { date: '2025-01-02', activeUsers: 120 },
      ];

      statsService.getUserActivityStats.mockResolvedValue(mockActivity);

      const result: any = await controller.getUserActivity(14);

      expect(result.data).toEqual(mockActivity);
      expect(statsService.getUserActivityStats).toHaveBeenCalledWith(14);
    });

    it('should handle empty activity data', async () => {
      statsService.getUserActivityStats.mockResolvedValue([]);

      const result: any = await controller.getUserActivity();

      expect(result.data).toEqual([]);
    });
  });

  describe('getUserGrowth', () => {
    it('should return user growth for default 30 days', async () => {
      const mockGrowth = {
        totalUsers: 1000,
        newUsers: 150,
        growthRate: 15.0,
        dailyGrowth: [
          { date: '2025-01-01', newUsers: 5, total: 995 },
          { date: '2025-01-02', newUsers: 8, total: 1003 },
        ],
      };

      statsService.getUserGrowthStats.mockResolvedValue(mockGrowth);

      const result: any = await controller.getUserGrowth();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockGrowth);
      expect(result.data.growthRate).toBe(15.0);
      expect(statsService.getUserGrowthStats).toHaveBeenCalledWith(30);
    });

    it('should return user growth for custom period', async () => {
      const mockGrowth = {
        totalUsers: 1000,
        newUsers: 250,
        growthRate: 25.0,
      };

      statsService.getUserGrowthStats.mockResolvedValue(mockGrowth);

      const result: any = await controller.getUserGrowth(90);

      expect(result.data.newUsers).toBe(250);
      expect(statsService.getUserGrowthStats).toHaveBeenCalledWith(90);
    });
  });

  describe('getTodayRevenue', () => {
    it('should return today revenue', async () => {
      statsService.getTodayRevenue.mockResolvedValue(1500.50);

      const result: any = await controller.getTodayRevenue();

      expect(result.success).toBe(true);
      expect(result.data.revenue).toBe(1500.50);
      expect(statsService.getTodayRevenue).toHaveBeenCalled();
    });

    it('should return zero revenue for today', async () => {
      statsService.getTodayRevenue.mockResolvedValue(0);

      const result: any = await controller.getTodayRevenue();

      expect(result.data.revenue).toBe(0);
    });

    it('should handle large revenue amounts', async () => {
      statsService.getTodayRevenue.mockResolvedValue(100000.00);

      const result: any = await controller.getTodayRevenue();

      expect(result.data.revenue).toBe(100000.00);
    });
  });

  describe('getMonthRevenue', () => {
    it('should return month revenue', async () => {
      statsService.getMonthRevenue.mockResolvedValue(45000.75);

      const result: any = await controller.getMonthRevenue();

      expect(result.success).toBe(true);
      expect(result.data.revenue).toBe(45000.75);
      expect(statsService.getMonthRevenue).toHaveBeenCalled();
    });

    it('should return zero for no revenue', async () => {
      statsService.getMonthRevenue.mockResolvedValue(0);

      const result: any = await controller.getMonthRevenue();

      expect(result.data.revenue).toBe(0);
    });
  });

  describe('getRevenueTrend', () => {
    it('should return revenue trend for default 30 days', async () => {
      const mockTrend = [
        { date: '2025-01-01', revenue: 1500, orders: 50 },
        { date: '2025-01-02', revenue: 1800, orders: 60 },
        { date: '2025-01-03', revenue: 1600, orders: 55 },
      ];

      statsService.getRevenueTrend.mockResolvedValue(mockTrend);

      const result: any = await controller.getRevenueTrend();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTrend);
      expect(result.data).toHaveLength(3);
      expect(statsService.getRevenueTrend).toHaveBeenCalledWith(30);
    });

    it('should return revenue trend for custom days', async () => {
      const mockTrend = [
        { date: '2025-01-01', revenue: 1500 },
      ];

      statsService.getRevenueTrend.mockResolvedValue(mockTrend);

      const result: any = await controller.getRevenueTrend(7);

      expect(result.data).toHaveLength(1);
      expect(statsService.getRevenueTrend).toHaveBeenCalledWith(7);
    });

    it('should handle empty trend data', async () => {
      statsService.getRevenueTrend.mockResolvedValue([]);

      const result: any = await controller.getRevenueTrend();

      expect(result.data).toEqual([]);
    });

    it('should return trend with growth metrics', async () => {
      const mockTrend = {
        data: [
          { date: '2025-01-01', revenue: 1500 },
          { date: '2025-01-02', revenue: 1800 },
        ],
        totalRevenue: 3300,
        avgDaily: 1650,
        growthRate: 20.0,
      };

      statsService.getRevenueTrend.mockResolvedValue(mockTrend);

      const result: any = await controller.getRevenueTrend();

      expect(result.data.totalRevenue).toBe(3300);
      expect(result.data.avgDaily).toBe(1650);
      expect(result.data.growthRate).toBe(20.0);
    });
  });

  describe('getPlanDistribution', () => {
    it('should return plan distribution statistics', async () => {
      const mockDistribution = [
        {
          planName: 'Basic',
          userCount: 500,
          revenue: 5000,
          percentage: 50.0,
        },
        {
          planName: 'Pro',
          userCount: 300,
          revenue: 9000,
          percentage: 30.0,
        },
        {
          planName: 'Enterprise',
          userCount: 200,
          revenue: 20000,
          percentage: 20.0,
        },
      ];

      statsService.getPlanDistributionStats.mockResolvedValue(mockDistribution);

      const result: any = await controller.getPlanDistribution();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDistribution);
      expect(result.data).toHaveLength(3);
      expect(result.data[0].planName).toBe('Basic');
      expect(statsService.getPlanDistributionStats).toHaveBeenCalled();
    });

    it('should return distribution with total metrics', async () => {
      const mockDistribution = {
        plans: [
          { planName: 'Basic', userCount: 500, revenue: 5000 },
          { planName: 'Pro', userCount: 300, revenue: 9000 },
        ],
        totalUsers: 800,
        totalRevenue: 14000,
      };

      statsService.getPlanDistributionStats.mockResolvedValue(mockDistribution);

      const result: any = await controller.getPlanDistribution();

      expect(result.data.totalUsers).toBe(800);
      expect(result.data.totalRevenue).toBe(14000);
    });
  });

  describe('getOverview', () => {
    it('should return comprehensive overview statistics', async () => {
      const mockOverview = {
        users: {
          total: 1000,
          active: 750,
          inactive: 250,
        },
        devices: {
          total: 500,
          online: 350,
          offline: 150,
        },
        orders: {
          total: 5000,
          completed: 4500,
          pending: 500,
        },
        revenue: {
          today: 1500,
          month: 45000,
          year: 500000,
        },
        apps: {
          total: 200,
          popular: 50,
        },
      };

      statsService.getOverview.mockResolvedValue(mockOverview);

      const result: any = await controller.getOverview();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOverview);
      expect(result.message).toBe('统计概览获取成功');
      expect(result.data.users.total).toBe(1000);
      expect(result.data.devices.online).toBe(350);
      expect(result.data.revenue.year).toBe(500000);
      expect(statsService.getOverview).toHaveBeenCalled();
    });

    it('should return overview with growth indicators', async () => {
      const mockOverview = {
        users: { total: 1000, growth: 15.5 },
        devices: { total: 500, growth: 10.0 },
        revenue: { month: 45000, growth: 20.0 },
      };

      statsService.getOverview.mockResolvedValue(mockOverview);

      const result: any = await controller.getOverview();

      expect(result.data.users.growth).toBe(15.5);
      expect(result.data.revenue.growth).toBe(20.0);
    });
  });

  describe('getPerformance', () => {
    it('should return performance statistics', async () => {
      const mockPerformance = {
        services: {
          'user-service': { status: 'healthy', responseTime: 50 },
          'device-service': { status: 'healthy', responseTime: 80 },
          'billing-service': { status: 'healthy', responseTime: 60 },
        },
        system: {
          cpuUsage: 45.5,
          memoryUsage: 60.2,
          diskUsage: 30.0,
        },
      };

      statsService.getPerformance.mockResolvedValue(mockPerformance);

      const result: any = await controller.getPerformance();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPerformance);
      expect(result.message).toBe('性能统计获取成功');
      expect(result.data.services['user-service'].status).toBe('healthy');
      expect(result.data.system.cpuUsage).toBe(45.5);
      expect(statsService.getPerformance).toHaveBeenCalled();
    });

    it('should return performance with degraded services', async () => {
      const mockPerformance = {
        services: {
          'user-service': { status: 'healthy', responseTime: 50 },
          'device-service': { status: 'degraded', responseTime: 250 },
        },
        overallStatus: 'degraded',
      };

      statsService.getPerformance.mockResolvedValue(mockPerformance);

      const result: any = await controller.getPerformance();

      expect(result.data.services['device-service'].status).toBe('degraded');
      expect(result.data.overallStatus).toBe('degraded');
    });

    it('should return performance with detailed metrics', async () => {
      const mockPerformance = {
        services: {
          'user-service': {
            status: 'healthy',
            responseTime: 50,
            requestsPerSecond: 100,
            errorRate: 0.1,
          },
        },
        database: {
          connectionPool: { active: 10, idle: 40, total: 50 },
          queryTime: 20,
        },
        cache: {
          hitRate: 95.5,
          missRate: 4.5,
        },
      };

      statsService.getPerformance.mockResolvedValue(mockPerformance);

      const result: any = await controller.getPerformance();

      expect(result.data.database).toBeDefined();
      expect(result.data.cache.hitRate).toBe(95.5);
    });
  });
});
