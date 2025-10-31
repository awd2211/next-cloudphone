import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { QuotaClientService, QuotaStatus } from '../quota-client.service';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('QuotaClientService', () => {
  let service: QuotaClientService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockQuotaResponse = {
    id: 'quota-123',
    userId: 'user-456',
    planId: 'plan-789',
    planName: 'Professional',
    status: QuotaStatus.ACTIVE,
    limits: {
      maxDevices: 10,
      maxConcurrentDevices: 5,
      maxCpuCoresPerDevice: 8,
      maxMemoryMBPerDevice: 16384,
      maxStorageGBPerDevice: 100,
      totalCpuCores: 32,
      totalMemoryGB: 64,
      totalStorageGB: 500,
      maxBandwidthMbps: 1000,
      monthlyTrafficGB: 1000,
      maxUsageHoursPerDay: 24,
      maxUsageHoursPerMonth: 720,
    },
    usage: {
      currentDevices: 5,
      currentConcurrentDevices: 2,
      usedCpuCores: 16,
      usedMemoryGB: 32,
      usedStorageGB: 250,
      currentBandwidthMbps: 500,
      monthlyTrafficUsedGB: 400,
      todayUsageHours: 12,
      monthlyUsageHours: 360,
      lastUpdatedAt: new Date(),
    },
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
    autoRenew: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaClientService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'USER_SERVICE_URL') return 'http://localhost:30001';
              if (key === 'QUOTA_ALLOW_ON_ERROR') return defaultValue;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<QuotaClientService>(QuotaClientService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserQuota', () => {
    it('should fetch user quota successfully', async () => {
      // Arrange
      const userId = 'user-456';
      const mockResponse: AxiosResponse = {
        data: mockQuotaResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      // Act
      const result = await service.getUserQuota(userId);

      // Assert
      expect(result).toEqual(mockQuotaResponse);
      expect(httpService.get).toHaveBeenCalledWith(
        `http://localhost:30001/api/quotas/user/${userId}`
      );
    });

    it('should throw 404 error when user quota not found', async () => {
      // Arrange
      const userId = 'nonexistent-user';
      jest.spyOn(httpService, 'get').mockReturnValue(
        throwError(() => ({
          response: { status: 404 },
        }))
      );

      // Act & Assert
      await expect(service.getUserQuota(userId)).rejects.toThrow('User quota not found');
    });

    it('should throw internal error on service failure', async () => {
      // Arrange
      const userId = 'user-456';
      jest.spyOn(httpService, 'get').mockReturnValue(
        throwError(() => ({
          response: { status: 500 },
        }))
      );

      // Act & Assert
      await expect(service.getUserQuota(userId)).rejects.toThrow('Failed to fetch user quota');
    });
  });

  describe('checkDeviceCreationQuota', () => {
    const deviceSpecs = {
      cpuCores: 4,
      memoryMB: 8192,
      storageMB: 51200, // 50GB
    };

    it('should allow device creation when quota is sufficient', async () => {
      // Arrange
      const userId = 'user-456';
      const mockResponse: AxiosResponse = {
        data: mockQuotaResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      // Act
      const result = await service.checkDeviceCreationQuota(userId, deviceSpecs);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remainingDevices).toBe(5); // 10 - 5
      expect(result.remainingCpu).toBe(16); // 32 - 16
      expect(result.remainingMemory).toBe(32); // 64 - 32
      expect(result.remainingStorage).toBe(250); // 500 - 250
    });

    it('should deny when device quota exceeded', async () => {
      // Arrange
      const userId = 'user-456';
      const quotaExceeded = {
        ...mockQuotaResponse,
        usage: {
          ...mockQuotaResponse.usage,
          currentDevices: 10, // 达到上限
        },
      };

      const mockResponse: AxiosResponse = {
        data: quotaExceeded,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      // Act
      const result = await service.checkDeviceCreationQuota(userId, deviceSpecs);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Device quota exceeded');
      expect(result.remainingDevices).toBe(0);
    });

    it('should deny when quota status is not ACTIVE', async () => {
      // Arrange
      const userId = 'user-456';
      const inactiveQuota = {
        ...mockQuotaResponse,
        status: QuotaStatus.SUSPENDED,
      };

      const mockResponse: AxiosResponse = {
        data: inactiveQuota,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      // Act
      const result = await service.checkDeviceCreationQuota(userId, deviceSpecs);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Quota status is suspended');
    });

    it('should deny when quota has expired', async () => {
      // Arrange
      const userId = 'user-456';
      const expiredQuota = {
        ...mockQuotaResponse,
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000), // 昨天过期
      };

      const mockResponse: AxiosResponse = {
        data: expiredQuota,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      // Act
      const result = await service.checkDeviceCreationQuota(userId, deviceSpecs);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Quota has expired');
    });

    it('should deny when CPU cores per device exceeds limit', async () => {
      // Arrange
      const userId = 'user-456';
      const oversizedSpecs = {
        cpuCores: 16, // 超过限制 (8核)
        memoryMB: 8192,
        storageMB: 51200,
      };

      const mockResponse: AxiosResponse = {
        data: mockQuotaResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      // Act
      const result = await service.checkDeviceCreationQuota(userId, oversizedSpecs);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('CPU cores per device exceeds limit');
    });

    it('should deny when total CPU quota exceeded', async () => {
      // Arrange
      const userId = 'user-456';
      const highCpuSpecs = {
        cpuCores: 8, // 单设备符合要求
        memoryMB: 8192,
        storageMB: 51200,
      };

      const nearLimitQuota = {
        ...mockQuotaResponse,
        usage: {
          ...mockQuotaResponse.usage,
          usedCpuCores: 30, // 已用30核，总共32核
        },
      };

      const mockResponse: AxiosResponse = {
        data: nearLimitQuota,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      // Act
      const result = await service.checkDeviceCreationQuota(userId, highCpuSpecs);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Total CPU quota exceeded');
      expect(result.remainingCpu).toBe(2);
    });

    it('should allow operation on error when QUOTA_ALLOW_ON_ERROR is true', async () => {
      // Arrange
      const userId = 'user-456';
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => new Error('Network error')));
      jest.spyOn(configService, 'get').mockReturnValue(true); // QUOTA_ALLOW_ON_ERROR=true

      // Act
      const result = await service.checkDeviceCreationQuota(userId, deviceSpecs);

      // Assert
      expect(result.allowed).toBe(true);
    });

    it('should deny operation on error when QUOTA_ALLOW_ON_ERROR is false', async () => {
      // Arrange
      const userId = 'user-456';
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => new Error('Network error')));

      // Act
      const result = await service.checkDeviceCreationQuota(userId, deviceSpecs);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Quota service unavailable');
    });
  });

  describe('reportDeviceUsage', () => {
    it('should report device usage successfully', async () => {
      // Arrange
      const userId = 'user-456';
      const usageReport = {
        deviceId: 'device-123',
        cpuCores: 4,
        memoryGB: 8,
        storageGB: 50,
        operation: 'increment' as const,
      };

      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      // Act
      await service.reportDeviceUsage(userId, usageReport);

      // Assert
      expect(httpService.post).toHaveBeenCalledWith(
        `http://localhost:30001/api/quotas/user/${userId}/usage`,
        usageReport
      );
    });

    it('should not throw error when usage reporting fails', async () => {
      // Arrange
      const userId = 'user-456';
      const usageReport = {
        deviceId: 'device-123',
        cpuCores: 4,
        memoryGB: 8,
        storageGB: 50,
        operation: 'increment' as const,
      };

      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => new Error('Service unavailable')));

      // Act & Assert - 应该不抛出异常，只记录警告
      await expect(service.reportDeviceUsage(userId, usageReport)).resolves.not.toThrow();
    });
  });

  describe('checkConcurrentQuota', () => {
    it('should allow when concurrent quota is available', async () => {
      // Arrange
      const userId = 'user-456';
      const mockResponse: AxiosResponse = {
        data: mockQuotaResponse, // currentConcurrentDevices: 2, max: 5
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      // Act
      const result = await service.checkConcurrentQuota(userId);

      // Assert
      expect(result.allowed).toBe(true);
    });

    it('should deny when concurrent quota exceeded', async () => {
      // Arrange
      const userId = 'user-456';
      const maxConcurrent = {
        ...mockQuotaResponse,
        usage: {
          ...mockQuotaResponse.usage,
          currentConcurrentDevices: 5, // 达到上限
        },
      };

      const mockResponse: AxiosResponse = {
        data: maxConcurrent,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      // Act
      const result = await service.checkConcurrentQuota(userId);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Concurrent device quota exceeded');
    });

    it('should allow on error (default fallback)', async () => {
      // Arrange
      const userId = 'user-456';
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => new Error('Network error')));

      // Act
      const result = await service.checkConcurrentQuota(userId);

      // Assert
      expect(result.allowed).toBe(true); // 默认允许
    });
  });

  describe('getQuotaUsageStats', () => {
    it('should calculate usage percentages correctly', async () => {
      // Arrange
      const userId = 'user-456';
      const mockResponse: AxiosResponse = {
        data: mockQuotaResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      // Act
      const stats = await service.getQuotaUsageStats(userId);

      // Assert
      expect(stats.devices).toBe(50); // 5/10 * 100
      expect(stats.cpu).toBe(50); // 16/32 * 100
      expect(stats.memory).toBe(50); // 32/64 * 100
      expect(stats.storage).toBe(50); // 250/500 * 100
      expect(stats.traffic).toBe(40); // 400/1000 * 100
      expect(stats.hours).toBe(50); // 360/720 * 100
    });

    it('should return 0 when limits are 0 (避免除以0)', async () => {
      // Arrange
      const userId = 'user-456';
      const zeroLimits = {
        ...mockQuotaResponse,
        limits: {
          ...mockQuotaResponse.limits,
          maxDevices: 0,
          totalCpuCores: 0,
          totalMemoryGB: 0,
          totalStorageGB: 0,
          monthlyTrafficGB: 0,
          maxUsageHoursPerMonth: 0,
        },
      };

      const mockResponse: AxiosResponse = {
        data: zeroLimits,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      // Act
      const stats = await service.getQuotaUsageStats(userId);

      // Assert
      expect(stats.devices).toBe(0);
      expect(stats.cpu).toBe(0);
      expect(stats.memory).toBe(0);
      expect(stats.storage).toBe(0);
      expect(stats.traffic).toBe(0);
      expect(stats.hours).toBe(0);
    });
  });

  describe('incrementConcurrentDevices', () => {
    it('should increment concurrent devices successfully', async () => {
      // Arrange
      const userId = 'user-456';
      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      // Act
      await service.incrementConcurrentDevices(userId);

      // Assert
      expect(httpService.post).toHaveBeenCalledWith('http://localhost:30001/api/quotas/deduct', {
        userId,
        deviceCount: 0,
        concurrent: true,
      });
    });

    it('should not throw error on failure', async () => {
      // Arrange
      const userId = 'user-456';
      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => new Error('Service error')));

      // Act & Assert
      await expect(service.incrementConcurrentDevices(userId)).resolves.not.toThrow();
    });
  });

  describe('decrementConcurrentDevices', () => {
    it('should decrement concurrent devices successfully', async () => {
      // Arrange
      const userId = 'user-456';
      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      // Act
      await service.decrementConcurrentDevices(userId);

      // Assert
      expect(httpService.post).toHaveBeenCalledWith('http://localhost:30001/api/quotas/restore', {
        userId,
        deviceCount: 0,
        concurrent: true,
      });
    });
  });
});
