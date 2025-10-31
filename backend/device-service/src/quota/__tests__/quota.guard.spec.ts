import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { QuotaGuard, QuotaCheck, QuotaCheckType } from '../quota.guard';
import { QuotaClientService } from '../quota-client.service';

describe('QuotaGuard', () => {
  let guard: QuotaGuard;
  let quotaClient: jest.Mocked<QuotaClientService>;
  let reflector: jest.Mocked<Reflector>;

  const mockExecutionContext = (
    checkType: QuotaCheckType | null,
    userId: string | null,
    body: any = {}
  ): ExecutionContext => {
    const request = {
      user: userId ? { userId } : undefined,
      body,
      query: {},
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: jest.fn(),
    } as any;
  };

  beforeEach(async () => {
    const mockQuotaClient = {
      checkDeviceCreationQuota: jest.fn(),
      checkConcurrentQuota: jest.fn(),
    };

    const mockReflector = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaGuard,
        {
          provide: QuotaClientService,
          useValue: mockQuotaClient,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<QuotaGuard>(QuotaGuard);
    quotaClient = module.get(QuotaClientService);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Decorator Check', () => {
    it('should allow request when no quota check decorator present', async () => {
      const context = mockExecutionContext(null, 'user-123');
      reflector.get.mockReturnValue(null);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(quotaClient.checkDeviceCreationQuota).not.toHaveBeenCalled();
    });

    it('should allow request when QuotaCheckType.SKIP is set', async () => {
      const context = mockExecutionContext(QuotaCheckType.SKIP, 'user-123');
      reflector.get.mockReturnValue(QuotaCheckType.SKIP);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow request when userId is not found', async () => {
      const context = mockExecutionContext(QuotaCheckType.DEVICE_CREATION, null);
      reflector.get.mockReturnValue(QuotaCheckType.DEVICE_CREATION);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Device Creation Quota Check', () => {
    it('should allow device creation when quota check passes', async () => {
      const context = mockExecutionContext(QuotaCheckType.DEVICE_CREATION, 'user-123', {
        cpuCores: 2,
        memoryMB: 2048,
        storageMB: 8192,
      });

      reflector.get.mockReturnValue(QuotaCheckType.DEVICE_CREATION);
      quotaClient.checkDeviceCreationQuota.mockResolvedValue({
        allowed: true,
        reason: 'OK',
        remainingDevices: 5,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(quotaClient.checkDeviceCreationQuota).toHaveBeenCalledWith('user-123', {
        cpuCores: 2,
        memoryMB: 2048,
        storageMB: 8192,
      });
    });

    it('should block device creation when quota exceeded', async () => {
      const context = mockExecutionContext(QuotaCheckType.DEVICE_CREATION, 'user-123', {});

      reflector.get.mockReturnValue(QuotaCheckType.DEVICE_CREATION);
      quotaClient.checkDeviceCreationQuota.mockResolvedValue({
        allowed: false,
        reason: '设备数量已达上限',
        remainingDevices: 0,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('设备创建失败');
    });

    it('should use default specs when not provided in body', async () => {
      const context = mockExecutionContext(QuotaCheckType.DEVICE_CREATION, 'user-123');

      reflector.get.mockReturnValue(QuotaCheckType.DEVICE_CREATION);
      quotaClient.checkDeviceCreationQuota.mockResolvedValue({
        allowed: true,
        reason: 'OK',
        remainingDevices: 3,
      });

      await guard.canActivate(context);

      expect(quotaClient.checkDeviceCreationQuota).toHaveBeenCalledWith('user-123', {
        cpuCores: 2,
        memoryMB: 2048,
        storageMB: 8192,
      });
    });

    it('should attach quota check result to request', async () => {
      const request = {
        user: { userId: 'user-123' },
        body: {},
        query: {},
      };

      const context = {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: jest.fn(),
      } as any;

      const quotaResult = {
        allowed: true,
        reason: 'OK',
        remainingDevices: 3,
      };

      reflector.get.mockReturnValue(QuotaCheckType.DEVICE_CREATION);
      quotaClient.checkDeviceCreationQuota.mockResolvedValue(quotaResult);

      await guard.canActivate(context);

      expect(request['quotaCheckResult']).toEqual(quotaResult);
    });
  });

  describe('Concurrent Quota Check', () => {
    it('should allow when concurrent quota is available', async () => {
      const context = mockExecutionContext(QuotaCheckType.CONCURRENT_DEVICES, 'user-123');

      reflector.get.mockReturnValue(QuotaCheckType.CONCURRENT_DEVICES);
      quotaClient.checkConcurrentQuota.mockResolvedValue({
        allowed: true,
        reason: 'OK',
        remainingConcurrent: 2,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(quotaClient.checkConcurrentQuota).toHaveBeenCalledWith('user-123');
    });

    it('should block when concurrent limit reached', async () => {
      const context = mockExecutionContext(QuotaCheckType.CONCURRENT_DEVICES, 'user-123');

      reflector.get.mockReturnValue(QuotaCheckType.CONCURRENT_DEVICES);
      quotaClient.checkConcurrentQuota.mockResolvedValue({
        allowed: false,
        reason: '并发设备数已达上限',
        remainingConcurrent: 0,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('并发设备数已达上限');
    });
  });

  describe('User ID Extraction', () => {
    it('should extract userId from request.user', async () => {
      const context = mockExecutionContext(QuotaCheckType.DEVICE_CREATION, 'user-from-jwt');

      reflector.get.mockReturnValue(QuotaCheckType.DEVICE_CREATION);
      quotaClient.checkDeviceCreationQuota.mockResolvedValue({
        allowed: true,
        reason: 'OK',
        remainingDevices: 5,
      });

      await guard.canActivate(context);

      expect(quotaClient.checkDeviceCreationQuota).toHaveBeenCalledWith(
        'user-from-jwt',
        expect.any(Object)
      );
    });

    it('should extract userId from request.body when not in user', async () => {
      const request = {
        user: undefined,
        body: { userId: 'user-from-body' },
        query: {},
      };

      const context = {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: jest.fn(),
      } as any;

      reflector.get.mockReturnValue(QuotaCheckType.DEVICE_CREATION);
      quotaClient.checkDeviceCreationQuota.mockResolvedValue({
        allowed: true,
        reason: 'OK',
        remainingDevices: 5,
      });

      await guard.canActivate(context);

      expect(quotaClient.checkDeviceCreationQuota).toHaveBeenCalledWith(
        'user-from-body',
        expect.any(Object)
      );
    });

    it('should extract userId from request.query as fallback', async () => {
      const request = {
        user: undefined,
        body: {},
        query: { userId: 'user-from-query' },
      };

      const context = {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: jest.fn(),
      } as any;

      reflector.get.mockReturnValue(QuotaCheckType.DEVICE_CREATION);
      quotaClient.checkDeviceCreationQuota.mockResolvedValue({
        allowed: true,
        reason: 'OK',
        remainingDevices: 5,
      });

      await guard.canActivate(context);

      expect(quotaClient.checkDeviceCreationQuota).toHaveBeenCalledWith(
        'user-from-query',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw ForbiddenException on quota check error', async () => {
      const context = mockExecutionContext(QuotaCheckType.DEVICE_CREATION, 'user-123');

      reflector.get.mockReturnValue(QuotaCheckType.DEVICE_CREATION);
      quotaClient.checkDeviceCreationQuota.mockRejectedValue(new Error('Service unavailable'));

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('配额检查失败');
    });

    it('should return true for unknown quota check type', async () => {
      const context = mockExecutionContext('invalid_type' as any, 'user-123');

      reflector.get.mockReturnValue('invalid_type');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
