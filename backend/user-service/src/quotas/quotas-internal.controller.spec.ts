import { Test, TestingModule } from '@nestjs/testing';
import { QuotasInternalController } from './quotas-internal.controller';
import { QuotasService } from './quotas.service';
import { ServiceAuthGuard } from '@cloudphone/shared';

describe('QuotasInternalController', () => {
  let controller: QuotasInternalController;
  let quotasService: any;

  const mockQuotasService = {
    getUserQuota: jest.fn(),
    checkQuota: jest.fn(),
    deductQuota: jest.fn(),
    restoreQuota: jest.fn(),
    getUsageStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotasInternalController],
      providers: [
        {
          provide: QuotasService,
          useValue: mockQuotasService,
        },
      ],
    })
      .overrideGuard(ServiceAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<QuotasInternalController>(QuotasInternalController);
    quotasService = module.get(QuotasService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have quotasService injected', () => {
      expect(quotasService).toBeDefined();
      expect(quotasService).toBe(mockQuotasService);
    });
  });

  describe('getUserQuota', () => {
    it('should return user quota', async () => {
      const userId = 'user-123';
      const mockQuota = {
        id: 1,
        userId,
        maxDevices: 10,
        usedDevices: 3,
        maxCPUCores: 20,
        usedCPUCores: 6,
        maxMemoryGB: 40,
        usedMemoryGB: 12,
      };

      mockQuotasService.getUserQuota.mockResolvedValue(mockQuota);

      const result = await controller.getUserQuota(userId);

      expect(result).toEqual(mockQuota);
      expect(mockQuotasService.getUserQuota).toHaveBeenCalledWith(userId);
    });

    it('should return quota for different users', async () => {
      const mockQuota = {
        userId: 'user-456',
        maxDevices: 5,
        usedDevices: 2,
      };

      mockQuotasService.getUserQuota.mockResolvedValue(mockQuota);

      const result = await controller.getUserQuota('user-456');

      expect(result.userId).toBe('user-456');
      expect(result.maxDevices).toBe(5);
    });
  });

  describe('checkQuota', () => {
    it('should check quota and return allowed', async () => {
      const request = {
        userId: 'user-123',
        quotaType: 'devices',
        requestedAmount: 2,
      };

      const mockResponse = {
        allowed: true,
        remaining: 5,
        message: 'Quota check passed',
      };

      mockQuotasService.checkQuota.mockResolvedValue(mockResponse);

      const result = await controller.checkQuota(request);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
      expect(mockQuotasService.checkQuota).toHaveBeenCalledWith(request);
    });

    it('should check quota and return denied', async () => {
      const request = {
        userId: 'user-456',
        quotaType: 'devices',
        requestedAmount: 10,
      };

      const mockResponse = {
        allowed: false,
        remaining: 0,
        message: 'Quota exceeded',
      };

      mockQuotasService.checkQuota.mockResolvedValue(mockResponse);

      const result = await controller.checkQuota(request);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle different quota types', async () => {
      const quotaTypes = ['devices', 'cpu', 'memory', 'storage'];

      for (const quotaType of quotaTypes) {
        mockQuotasService.checkQuota.mockResolvedValue({ allowed: true });

        await controller.checkQuota({
          userId: 'user-123',
          quotaType,
          requestedAmount: 1,
        });
      }

      expect(mockQuotasService.checkQuota).toHaveBeenCalledTimes(4);
    });
  });

  describe('deductQuota', () => {
    it('should deduct quota successfully', async () => {
      const request = {
        userId: 'user-123',
        deviceCount: 1,
        cpuCores: 2,
        memoryGB: 4,
        storageGB: 10,
      };

      const mockResponse = {
        success: true,
        message: 'Quota deducted',
        remaining: { devices: 4, cpu: 8, memory: 16 },
      };

      mockQuotasService.deductQuota.mockResolvedValue(mockResponse);

      const result = await controller.deductQuota(request);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Quota deducted');
      expect(mockQuotasService.deductQuota).toHaveBeenCalledWith(request);
    });

    it('should deduct multiple resources', async () => {
      const request = {
        userId: 'user-789',
        deviceCount: 2,
        cpuCores: 4,
        memoryGB: 8,
        storageGB: 20,
      };

      mockQuotasService.deductQuota.mockResolvedValue({ success: true });

      await controller.deductQuota(request);

      expect(mockQuotasService.deductQuota).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceCount: 2,
          cpuCores: 4,
          memoryGB: 8,
          storageGB: 20,
        })
      );
    });

    it('should handle single resource deduction', async () => {
      const request = {
        userId: 'user-456',
        deviceCount: 1,
      };

      mockQuotasService.deductQuota.mockResolvedValue({ success: true });

      await controller.deductQuota(request);

      expect(mockQuotasService.deductQuota).toHaveBeenCalledWith(request);
    });
  });

  describe('restoreQuota', () => {
    it('should restore quota successfully', async () => {
      const request = {
        userId: 'user-123',
        deviceCount: 1,
        cpuCores: 2,
        memoryGB: 4,
        storageGB: 10,
      };

      const mockResponse = {
        success: true,
        message: 'Quota restored',
        current: { devices: 5, cpu: 10, memory: 20 },
      };

      mockQuotasService.restoreQuota.mockResolvedValue(mockResponse);

      const result = await controller.restoreQuota(request);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Quota restored');
      expect(mockQuotasService.restoreQuota).toHaveBeenCalledWith(request);
    });

    it('should restore multiple resources', async () => {
      const request = {
        userId: 'user-789',
        deviceCount: 3,
        cpuCores: 6,
        memoryGB: 12,
        storageGB: 30,
      };

      mockQuotasService.restoreQuota.mockResolvedValue({ success: true });

      await controller.restoreQuota(request);

      expect(mockQuotasService.restoreQuota).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceCount: 3,
          cpuCores: 6,
        })
      );
    });
  });

  describe('reportDeviceUsage', () => {
    it('should report device creation (increment)', async () => {
      const userId = 'user-123';
      const usageReport = {
        deviceId: 'device-456',
        cpuCores: 2,
        memoryGB: 4,
        storageGB: 10,
        operation: 'increment' as const,
      };

      mockQuotasService.deductQuota.mockResolvedValue({ success: true });

      await controller.reportDeviceUsage(userId, usageReport);

      expect(mockQuotasService.deductQuota).toHaveBeenCalledWith({
        userId,
        deviceCount: 1,
        cpuCores: 2,
        memoryGB: 4,
        storageGB: 10,
      });
      expect(mockQuotasService.restoreQuota).not.toHaveBeenCalled();
    });

    it('should report device deletion (decrement)', async () => {
      const userId = 'user-123';
      const usageReport = {
        deviceId: 'device-789',
        cpuCores: 4,
        memoryGB: 8,
        storageGB: 20,
        operation: 'decrement' as const,
      };

      mockQuotasService.restoreQuota.mockResolvedValue({ success: true });

      await controller.reportDeviceUsage(userId, usageReport);

      expect(mockQuotasService.restoreQuota).toHaveBeenCalledWith({
        userId,
        deviceCount: 1,
        cpuCores: 4,
        memoryGB: 8,
        storageGB: 20,
      });
      expect(mockQuotasService.deductQuota).not.toHaveBeenCalled();
    });

    it('should handle different device configurations', async () => {
      const configurations = [
        { cpuCores: 1, memoryGB: 2, storageGB: 5 },
        { cpuCores: 4, memoryGB: 8, storageGB: 20 },
        { cpuCores: 8, memoryGB: 16, storageGB: 40 },
      ];

      mockQuotasService.deductQuota.mockResolvedValue({ success: true });

      for (const config of configurations) {
        await controller.reportDeviceUsage('user-123', {
          deviceId: `device-${config.cpuCores}`,
          operation: 'increment',
          ...config,
        });
      }

      expect(mockQuotasService.deductQuota).toHaveBeenCalledTimes(3);
    });

    it('should call deductQuota with deviceCount 1 for increment', async () => {
      mockQuotasService.deductQuota.mockResolvedValue({ success: true });

      await controller.reportDeviceUsage('user-123', {
        deviceId: 'device-1',
        cpuCores: 2,
        memoryGB: 4,
        storageGB: 10,
        operation: 'increment',
      });

      expect(mockQuotasService.deductQuota).toHaveBeenCalledWith(
        expect.objectContaining({ deviceCount: 1 })
      );
    });

    it('should call restoreQuota with deviceCount 1 for decrement', async () => {
      mockQuotasService.restoreQuota.mockResolvedValue({ success: true });

      await controller.reportDeviceUsage('user-456', {
        deviceId: 'device-2',
        cpuCores: 2,
        memoryGB: 4,
        storageGB: 10,
        operation: 'decrement',
      });

      expect(mockQuotasService.restoreQuota).toHaveBeenCalledWith(
        expect.objectContaining({ deviceCount: 1 })
      );
    });
  });

  describe('batchCheckQuota', () => {
    it('should batch check quotas for multiple users', async () => {
      const requests = [
        { userId: 'user-1', quotaType: 'devices', requestedAmount: 1 },
        { userId: 'user-2', quotaType: 'devices', requestedAmount: 2 },
        { userId: 'user-3', quotaType: 'devices', requestedAmount: 1 },
      ];

      mockQuotasService.checkQuota
        .mockResolvedValueOnce({ allowed: true, userId: 'user-1' })
        .mockResolvedValueOnce({ allowed: false, userId: 'user-2' })
        .mockResolvedValueOnce({ allowed: true, userId: 'user-3' });

      const result = await controller.batchCheckQuota(requests);

      expect(result.total).toBe(3);
      expect(result.allowed).toBe(2);
      expect(result.denied).toBe(1);
      expect(result.results).toHaveLength(3);
      expect(mockQuotasService.checkQuota).toHaveBeenCalledTimes(3);
    });

    it('should return all allowed when all quotas are sufficient', async () => {
      const requests = [
        { userId: 'user-1', quotaType: 'devices', requestedAmount: 1 },
        { userId: 'user-2', quotaType: 'devices', requestedAmount: 1 },
      ];

      mockQuotasService.checkQuota.mockResolvedValue({ allowed: true });

      const result = await controller.batchCheckQuota(requests);

      expect(result.total).toBe(2);
      expect(result.allowed).toBe(2);
      expect(result.denied).toBe(0);
    });

    it('should return all denied when all quotas are insufficient', async () => {
      const requests = [
        { userId: 'user-1', quotaType: 'devices', requestedAmount: 100 },
        { userId: 'user-2', quotaType: 'devices', requestedAmount: 100 },
      ];

      mockQuotasService.checkQuota.mockResolvedValue({ allowed: false });

      const result = await controller.batchCheckQuota(requests);

      expect(result.total).toBe(2);
      expect(result.allowed).toBe(0);
      expect(result.denied).toBe(2);
    });

    it('should handle empty batch', async () => {
      const result = await controller.batchCheckQuota([]);

      expect(result.total).toBe(0);
      expect(result.allowed).toBe(0);
      expect(result.denied).toBe(0);
      expect(result.results).toEqual([]);
    });

    it('should include all results in response', async () => {
      const requests = [
        { userId: 'user-1', quotaType: 'devices', requestedAmount: 1 },
        { userId: 'user-2', quotaType: 'cpu', requestedAmount: 2 },
      ];

      const mockResults = [
        { allowed: true, remaining: 5, userId: 'user-1' },
        { allowed: false, remaining: 0, userId: 'user-2' },
      ];

      mockQuotasService.checkQuota
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const result = await controller.batchCheckQuota(requests);

      expect(result.results[0]).toEqual(mockResults[0]);
      expect(result.results[1]).toEqual(mockResults[1]);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', async () => {
      const userId = 'user-123';
      const mockStats = {
        userId,
        totalDevices: 5,
        totalCPUCores: 10,
        totalMemoryGB: 20,
        totalStorageGB: 50,
        utilizationRate: {
          devices: 0.5,
          cpu: 0.5,
          memory: 0.5,
        },
      };

      mockQuotasService.getUsageStats.mockResolvedValue(mockStats);

      const result = await controller.getUsageStats(userId);

      expect(result).toEqual(mockStats);
      expect(result.userId).toBe(userId);
      expect(result.totalDevices).toBe(5);
      expect(mockQuotasService.getUsageStats).toHaveBeenCalledWith(userId);
    });

    it('should return stats for different users', async () => {
      const users = ['user-1', 'user-2', 'user-3'];

      mockQuotasService.getUsageStats.mockResolvedValue({ totalDevices: 3 });

      for (const userId of users) {
        await controller.getUsageStats(userId);
      }

      expect(mockQuotasService.getUsageStats).toHaveBeenCalledTimes(3);
      expect(mockQuotasService.getUsageStats).toHaveBeenNthCalledWith(1, 'user-1');
      expect(mockQuotasService.getUsageStats).toHaveBeenNthCalledWith(2, 'user-2');
      expect(mockQuotasService.getUsageStats).toHaveBeenNthCalledWith(3, 'user-3');
    });

    it('should return detailed utilization rates', async () => {
      const mockStats = {
        userId: 'user-456',
        totalDevices: 8,
        totalCPUCores: 16,
        totalMemoryGB: 32,
        utilizationRate: {
          devices: 0.8,
          cpu: 0.75,
          memory: 0.6,
        },
      };

      mockQuotasService.getUsageStats.mockResolvedValue(mockStats);

      const result = await controller.getUsageStats('user-456');

      expect(result.utilizationRate.devices).toBe(0.8);
      expect(result.utilizationRate.cpu).toBe(0.75);
      expect(result.utilizationRate.memory).toBe(0.6);
    });
  });

  describe('Service Integration', () => {
    it('should call service methods with correct parameters', async () => {
      mockQuotasService.getUserQuota.mockResolvedValue({});
      mockQuotasService.checkQuota.mockResolvedValue({ allowed: true });
      mockQuotasService.deductQuota.mockResolvedValue({ success: true });
      mockQuotasService.restoreQuota.mockResolvedValue({ success: true });
      mockQuotasService.getUsageStats.mockResolvedValue({});

      await controller.getUserQuota('user-1');
      await controller.checkQuota({ userId: 'user-1', quotaType: 'devices', requestedAmount: 1 });
      await controller.deductQuota({ userId: 'user-1', deviceCount: 1 });
      await controller.restoreQuota({ userId: 'user-1', deviceCount: 1 });
      await controller.getUsageStats('user-1');

      expect(mockQuotasService.getUserQuota).toHaveBeenCalledWith('user-1');
      expect(mockQuotasService.checkQuota).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' })
      );
      expect(mockQuotasService.deductQuota).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' })
      );
      expect(mockQuotasService.restoreQuota).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' })
      );
      expect(mockQuotasService.getUsageStats).toHaveBeenCalledWith('user-1');
    });

    it('should handle async operations correctly', async () => {
      mockQuotasService.getUserQuota.mockResolvedValue({});

      const promise = controller.getUserQuota('user-123');

      expect(promise).toBeInstanceOf(Promise);
      await promise;
      expect(mockQuotasService.getUserQuota).toHaveBeenCalled();
    });
  });
});
