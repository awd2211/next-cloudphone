import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AllocationService, SchedulingStrategy } from './allocation.service';
import { DeviceAllocation, AllocationStatus } from '../entities/device-allocation.entity';
import { Device, DeviceStatus } from '../entities/device.entity';
import { EventBusService, DistributedLockService } from '@cloudphone/shared';
import { QuotaClientService } from '../quota/quota-client.service';
import { BillingClientService } from './billing-client.service';
import { NotificationClientService } from './notification-client.service';

describe('AllocationService', () => {
  let service: AllocationService;
  let allocationRepository: Repository<DeviceAllocation>;
  let deviceRepository: Repository<Device>;
  let eventBus: EventBusService;
  let quotaClient: QuotaClientService;
  let billingClient: BillingClientService;
  let notificationClient: NotificationClientService;

  const mockAllocationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn().mockResolvedValue([]), // 默认返回空数组
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockDeviceRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockEventBus = {
    publish: jest.fn(),
    publishDeviceEvent: jest.fn(),
    publishSystemError: jest.fn(),
  };

  const mockQuotaClient = {
    checkDeviceCreationQuota: jest.fn(),
    reportDeviceUsage: jest.fn(),
  };

  const mockBillingClient = {
    reportDeviceUsage: jest.fn(),
  };

  const mockNotificationClient = {
    notifyAllocationFailed: jest.fn(),
    notifyAllocationSuccess: jest.fn(),
    notifyDeviceReleased: jest.fn(),
    sendBatchNotifications: jest.fn(),
  };

  const mockDistributedLockService = {
    acquireLock: jest.fn().mockResolvedValue(true),
    releaseLock: jest.fn().mockResolvedValue(undefined),
    withLock: jest.fn(async (key, ttl, callback, retries, retryDelay) => {
      return await callback();
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllocationService,
        {
          provide: getRepositoryToken(DeviceAllocation),
          useValue: mockAllocationRepository,
        },
        {
          provide: getRepositoryToken(Device),
          useValue: mockDeviceRepository,
        },
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
        {
          provide: QuotaClientService,
          useValue: mockQuotaClient,
        },
        {
          provide: BillingClientService,
          useValue: mockBillingClient,
        },
        {
          provide: NotificationClientService,
          useValue: mockNotificationClient,
        },
        {
          provide: DistributedLockService,
          useValue: mockDistributedLockService,
        },
      ],
    }).compile();

    service = module.get<AllocationService>(AllocationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('设备分配', () => {
    const mockDevice: Partial<Device> = {
      id: 'device-1',
      name: 'Test Device',
      status: DeviceStatus.RUNNING,
      cpuCores: 4,
      memoryMB: 4096,
      storageMB: 32768,
      adbHost: 'localhost',
      adbPort: 5555,
    };

    it('应该成功分配设备', async () => {
      mockDeviceRepository.find.mockResolvedValue([mockDevice]);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockAllocationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQuotaClient.checkDeviceCreationQuota.mockResolvedValue({
        allowed: true,
        maxDevices: 5,
        currentDevices: 2,
        remainingDevices: 3,
      });
      const mockAllocation = {
        id: 'allocation-1',
        deviceId: 'device-1',
        userId: 'user-1',
        status: AllocationStatus.ALLOCATED,
        allocatedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      };
      mockAllocationRepository.create.mockReturnValue(mockAllocation);
      mockAllocationRepository.save.mockResolvedValue(mockAllocation);

      const result = await service.allocateDevice({
        userId: 'user-1',
        durationMinutes: 60,
      });

      expect(result).toBeDefined();
      expect(result.allocationId).toBe('allocation-1');
      expect(mockEventBus.publishDeviceEvent).toHaveBeenCalled();
    });

    it('应该在没有可用设备时抛出异常', async () => {
      mockDeviceRepository.find.mockResolvedValue([]);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockAllocationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(
        service.allocateDevice({ userId: 'user-1', durationMinutes: 60 })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('统计信息', () => {
    it('应该返回分配统计信息', async () => {
      mockAllocationRepository.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(70)
        .mockResolvedValueOnce(10);

      const stats = await service.getAllocationStats();

      expect(stats).toEqual({
        totalAllocations: 100,
        activeAllocations: 20,
        releasedAllocations: 70,
        expiredAllocations: 10,
        strategy: expect.any(String),
      });
    });
  });
});
