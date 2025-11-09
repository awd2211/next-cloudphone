import { Test, TestingModule } from '@nestjs/testing';
import { MeteringController } from './metering.controller';
import { MeteringService } from './metering.service';

describe('MeteringController', () => {
  let controller: MeteringController;
  let service: any;

  const mockMeteringService = {
    getUserUsageStats: jest.fn(),
    getDeviceUsageStats: jest.fn(),
    getTenantUsageStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeteringController],
      providers: [
        {
          provide: MeteringService,
          useValue: mockMeteringService,
        },
      ],
    }).compile();

    controller = module.get<MeteringController>(MeteringController);
    service = module.get(MeteringService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserUsageStats', () => {
    it('should return user usage statistics', async () => {
      const userId = 'user-123';
      const mockStats = {
        totalDevices: 5,
        totalUsageHours: 120,
        totalCost: 240.50,
        usageByDevice: [],
      };

      service.getUserUsageStats.mockResolvedValue(mockStats);

      const result = await controller.getUserUsageStats(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(service.getUserUsageStats).toHaveBeenCalledWith(userId, undefined, undefined);
    });

    it('should return user usage statistics with date range', async () => {
      const userId = 'user-123';
      const startDate = '2025-01-01T00:00:00Z';
      const endDate = '2025-01-31T23:59:59Z';
      const mockStats = {
        totalDevices: 3,
        totalUsageHours: 80,
        totalCost: 160.00,
      };

      service.getUserUsageStats.mockResolvedValue(mockStats);

      const result = await controller.getUserUsageStats(userId, startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(service.getUserUsageStats).toHaveBeenCalledWith(
        userId,
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('should handle partial date range (only start date)', async () => {
      const userId = 'user-123';
      const startDate = '2025-01-01T00:00:00Z';

      service.getUserUsageStats.mockResolvedValue({});

      await controller.getUserUsageStats(userId, startDate);

      expect(service.getUserUsageStats).toHaveBeenCalledWith(
        userId,
        expect.any(Date),
        undefined
      );
    });

    it('should handle partial date range (only end date)', async () => {
      const userId = 'user-123';
      const endDate = '2025-01-31T23:59:59Z';

      service.getUserUsageStats.mockResolvedValue({});

      await controller.getUserUsageStats(userId, undefined, endDate);

      expect(service.getUserUsageStats).toHaveBeenCalledWith(
        userId,
        undefined,
        expect.any(Date)
      );
    });
  });

  describe('getDeviceUsageStats', () => {
    it('should return device usage statistics', async () => {
      const deviceId = 'device-456';
      const mockStats = {
        deviceId: 'device-456',
        totalUsageHours: 24,
        totalCost: 48.00,
        usageByDay: [],
      };

      service.getDeviceUsageStats.mockResolvedValue(mockStats);

      const result = await controller.getDeviceUsageStats(deviceId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(service.getDeviceUsageStats).toHaveBeenCalledWith(deviceId, undefined, undefined);
    });

    it('should return device usage statistics with date range', async () => {
      const deviceId = 'device-456';
      const startDate = '2025-01-01T00:00:00Z';
      const endDate = '2025-01-07T23:59:59Z';
      const mockStats = {
        deviceId: 'device-456',
        totalUsageHours: 168,
        totalCost: 336.00,
      };

      service.getDeviceUsageStats.mockResolvedValue(mockStats);

      const result = await controller.getDeviceUsageStats(deviceId, startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(service.getDeviceUsageStats).toHaveBeenCalledWith(
        deviceId,
        expect.any(Date),
        expect.any(Date)
      );
    });
  });

  describe('getTenantUsageStats', () => {
    it('should return tenant usage statistics', async () => {
      const tenantId = 'tenant-789';
      const mockStats = {
        tenantId: 'tenant-789',
        totalUsers: 10,
        totalDevices: 50,
        totalUsageHours: 1200,
        totalCost: 2400.00,
        usageByUser: [],
      };

      service.getTenantUsageStats.mockResolvedValue(mockStats);

      const result = await controller.getTenantUsageStats(tenantId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(service.getTenantUsageStats).toHaveBeenCalledWith(tenantId, undefined, undefined);
    });

    it('should return tenant usage statistics with date range', async () => {
      const tenantId = 'tenant-789';
      const startDate = '2025-01-01T00:00:00Z';
      const endDate = '2025-01-31T23:59:59Z';
      const mockStats = {
        tenantId: 'tenant-789',
        totalUsers: 10,
        totalDevices: 50,
        totalUsageHours: 1200,
        totalCost: 2400.00,
      };

      service.getTenantUsageStats.mockResolvedValue(mockStats);

      const result = await controller.getTenantUsageStats(tenantId, startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(service.getTenantUsageStats).toHaveBeenCalledWith(
        tenantId,
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('should handle empty tenant statistics', async () => {
      const tenantId = 'tenant-empty';
      const mockStats = {
        tenantId: 'tenant-empty',
        totalUsers: 0,
        totalDevices: 0,
        totalUsageHours: 0,
        totalCost: 0,
      };

      service.getTenantUsageStats.mockResolvedValue(mockStats);

      const result = await controller.getTenantUsageStats(tenantId);

      expect(result.success).toBe(true);
      expect(result.data.totalUsers).toBe(0);
      expect(result.data.totalDevices).toBe(0);
    });
  });

  describe('date parsing', () => {
    it('should correctly parse ISO 8601 date strings', async () => {
      const userId = 'user-123';
      const startDate = '2025-01-15T10:30:00.000Z';
      const endDate = '2025-01-20T18:45:00.000Z';

      service.getUserUsageStats.mockResolvedValue({});

      await controller.getUserUsageStats(userId, startDate, endDate);

      const callArgs = service.getUserUsageStats.mock.calls[0];
      expect(callArgs[1]).toBeInstanceOf(Date);
      expect(callArgs[2]).toBeInstanceOf(Date);
      expect(callArgs[1].toISOString()).toBe(startDate);
      expect(callArgs[2].toISOString()).toBe(endDate);
    });
  });
});
