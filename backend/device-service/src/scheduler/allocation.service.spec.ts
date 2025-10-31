import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AllocationService, SchedulingStrategy, AllocationRequest } from "./allocation.service";
import { DeviceAllocation, AllocationStatus } from "../entities/device-allocation.entity";
import { Device, DeviceStatus } from "../entities/device.entity";
import { EventBusService } from "@cloudphone/shared";
import { QuotaClientService } from "../quota/quota-client.service";
import { BillingClientService } from "./billing-client.service";
import { NotificationClientService } from "./notification-client.service";

describe("AllocationService", () => {
  let service: AllocationService;
  let allocationRepository: Repository<DeviceAllocation>;
  let deviceRepository: Repository<Device>;
  let eventBus: EventBusService;
  let quotaClient: QuotaClientService;
  let billingClient: BillingClientService;
  let notificationClient: NotificationClientService;

  // Mock data
  const mockDevice: Partial<Device> = {
    id: "device-1",
    name: "Test Device",
    status: DeviceStatus.RUNNING,
    cpuCores: 4,
    memoryMB: 8192,
    storageMB: 32768,
    cpuUsage: 30,
    memoryUsage: 40,
    storageUsage: 20,
    adbHost: "localhost",
    adbPort: 5555,
    createdAt: new Date(),
  };

  const mockAllocation: Partial<DeviceAllocation> = {
    id: "allocation-1",
    deviceId: "device-1",
    userId: "user-1",
    tenantId: "tenant-1",
    status: AllocationStatus.ALLOCATED,
    allocatedAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    durationMinutes: 60,
    metadata: {},
  };

  const mockQuotaCheckResponse = {
    allowed: true,
    reason: null,
    remainingDevices: 5,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllocationService,
        {
          provide: getRepositoryToken(DeviceAllocation),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Device),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: {
            publish: jest.fn(),
            publishDeviceEvent: jest.fn(),
            publishSystemError: jest.fn(),
          },
        },
        {
          provide: QuotaClientService,
          useValue: {
            checkDeviceCreationQuota: jest.fn(),
            reportDeviceUsage: jest.fn(),
          },
        },
        {
          provide: BillingClientService,
          useValue: {
            reportDeviceUsage: jest.fn(),
          },
        },
        {
          provide: NotificationClientService,
          useValue: {
            notifyAllocationSuccess: jest.fn(),
            notifyAllocationFailed: jest.fn(),
            notifyDeviceReleased: jest.fn(),
            sendBatchNotifications: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AllocationService>(AllocationService);
    allocationRepository = module.get<Repository<DeviceAllocation>>(
      getRepositoryToken(DeviceAllocation),
    );
    deviceRepository = module.get<Repository<Device>>(getRepositoryToken(Device));
    eventBus = module.get<EventBusService>(EventBusService);
    quotaClient = module.get<QuotaClientService>(QuotaClientService);
    billingClient = module.get<BillingClientService>(BillingClientService);
    notificationClient = module.get<NotificationClientService>(NotificationClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("setStrategy", () => {
    it("should set allocation strategy", () => {
      service.setStrategy(SchedulingStrategy.LEAST_CONNECTION);
      const stats = service.getAllocationStats();
      // Note: This requires getAllocationStats to be mocked or implemented
    });
  });

  describe("allocateDevice", () => {
    const request: AllocationRequest = {
      userId: "user-1",
      tenantId: "tenant-1",
      durationMinutes: 60,
    };

    beforeEach(() => {
      // Mock getAvailableDevices to return mock device
      jest.spyOn(service, "getAvailableDevices").mockResolvedValue([mockDevice as Device]);

      // Mock quota check
      jest.spyOn(quotaClient, "checkDeviceCreationQuota").mockResolvedValue(mockQuotaCheckResponse);

      // Mock repository methods
      jest.spyOn(allocationRepository, "create").mockReturnValue(mockAllocation as DeviceAllocation);
      jest.spyOn(allocationRepository, "save").mockResolvedValue(mockAllocation as DeviceAllocation);
      jest.spyOn(quotaClient, "reportDeviceUsage").mockResolvedValue(undefined);
      jest.spyOn(eventBus, "publishDeviceEvent").mockResolvedValue(undefined);
      jest.spyOn(notificationClient, "notifyAllocationSuccess").mockResolvedValue(undefined);
    });

    it("should successfully allocate a device", async () => {
      const result = await service.allocateDevice(request);

      expect(result).toBeDefined();
      expect(result.allocationId).toBe("allocation-1");
      expect(result.deviceId).toBe("device-1");
      expect(result.userId).toBe("user-1");
      expect(allocationRepository.create).toHaveBeenCalled();
      expect(allocationRepository.save).toHaveBeenCalled();
      expect(quotaClient.checkDeviceCreationQuota).toHaveBeenCalledWith("user-1", {
        cpuCores: 4,
        memoryMB: 8192,
        storageMB: 32768,
      });
      expect(eventBus.publishDeviceEvent).toHaveBeenCalledWith("allocated", expect.any(Object));
      expect(notificationClient.notifyAllocationSuccess).toHaveBeenCalled();
    });

    it("should throw BadRequestException when no devices available", async () => {
      jest.spyOn(service, "getAvailableDevices").mockResolvedValue([]);

      await expect(service.allocateDevice(request)).rejects.toThrow(BadRequestException);
      expect(eventBus.publish).toHaveBeenCalledWith(
        "cloudphone.events",
        "scheduler.allocation.failed",
        expect.any(Object),
      );
      expect(notificationClient.notifyAllocationFailed).toHaveBeenCalled();
    });

    it("should throw ForbiddenException when quota exceeded", async () => {
      const quotaExceededResponse = {
        allowed: false,
        reason: "Device quota exceeded",
        remainingDevices: 0,
      };
      jest.spyOn(quotaClient, "checkDeviceCreationQuota").mockResolvedValue(quotaExceededResponse);

      await expect(service.allocateDevice(request)).rejects.toThrow(ForbiddenException);
      expect(eventBus.publish).toHaveBeenCalledWith(
        "cloudphone.events",
        "scheduler.allocation.quota_exceeded",
        expect.any(Object),
      );
      expect(notificationClient.notifyAllocationFailed).toHaveBeenCalled();
    });

    it("should select device based on preferred specs", async () => {
      const requestWithSpecs: AllocationRequest = {
        ...request,
        preferredSpecs: {
          minCpu: 8,
          minMemory: 16384,
        },
      };

      const highSpecDevice: Partial<Device> = {
        ...mockDevice,
        id: "device-2",
        cpuCores: 8,
        memoryMB: 16384,
      };

      jest.spyOn(service, "getAvailableDevices").mockResolvedValue([
        mockDevice as Device,
        highSpecDevice as Device,
      ]);

      await service.allocateDevice(requestWithSpecs);

      // Should select high-spec device
      expect(allocationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: "device-2",
        }),
      );
    });

    it("should handle quota service unavailable gracefully", async () => {
      jest.spyOn(quotaClient, "checkDeviceCreationQuota").mockRejectedValue(
        new Error("Service unavailable"),
      );

      await expect(service.allocateDevice(request)).rejects.toThrow();
    });

    it("should report quota usage after allocation", async () => {
      await service.allocateDevice(request);

      expect(quotaClient.reportDeviceUsage).toHaveBeenCalledWith("user-1", {
        deviceId: "device-1",
        cpuCores: 4,
        memoryGB: 8,
        storageGB: 32,
        operation: "increment",
      });
    });
  });

  describe("releaseDevice", () => {
    const deviceId = "device-1";
    const userId = "user-1";

    beforeEach(() => {
      const queryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockAllocation),
      };

      jest.spyOn(allocationRepository, "createQueryBuilder").mockReturnValue(queryBuilder);
      jest.spyOn(allocationRepository, "save").mockResolvedValue(mockAllocation as DeviceAllocation);
      jest.spyOn(deviceRepository, "findOne").mockResolvedValue(mockDevice as Device);
      jest.spyOn(quotaClient, "reportDeviceUsage").mockResolvedValue(undefined);
      jest.spyOn(billingClient, "reportDeviceUsage").mockResolvedValue(undefined);
      jest.spyOn(eventBus, "publishDeviceEvent").mockResolvedValue(undefined);
      jest.spyOn(notificationClient, "notifyDeviceReleased").mockResolvedValue(undefined);
    });

    it("should successfully release a device", async () => {
      const result = await service.releaseDevice(deviceId, userId);

      expect(result).toBeDefined();
      expect(result.deviceId).toBe(deviceId);
      expect(result.durationSeconds).toBeGreaterThan(0);
      expect(allocationRepository.save).toHaveBeenCalled();
      expect(quotaClient.reportDeviceUsage).toHaveBeenCalledWith(userId, expect.objectContaining({
        deviceId,
        operation: "decrement",
      }));
      expect(billingClient.reportDeviceUsage).toHaveBeenCalled();
      expect(eventBus.publishDeviceEvent).toHaveBeenCalledWith("released", expect.any(Object));
      expect(notificationClient.notifyDeviceReleased).toHaveBeenCalled();
    });

    it("should throw NotFoundException when no active allocation found", async () => {
      const queryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      jest.spyOn(allocationRepository, "createQueryBuilder").mockReturnValue(queryBuilder);

      await expect(service.releaseDevice(deviceId, userId)).rejects.toThrow(NotFoundException);
    });

    it("should publish failed billing data to DLX when billing fails", async () => {
      jest.spyOn(billingClient, "reportDeviceUsage").mockRejectedValue(
        new Error("Billing service unavailable"),
      );

      await service.releaseDevice(deviceId, userId);

      expect(eventBus.publish).toHaveBeenCalledWith(
        "cloudphone.dlx",
        "billing.usage_report_failed",
        expect.objectContaining({
          type: "billing.usage_report_failed",
          allocationId: mockAllocation.id,
          deviceId,
          userId,
        }),
      );
    });

    it("should handle device not found gracefully", async () => {
      jest.spyOn(deviceRepository, "findOne").mockResolvedValue(null);

      const result = await service.releaseDevice(deviceId, userId);

      expect(result).toBeDefined();
      expect(quotaClient.reportDeviceUsage).not.toHaveBeenCalled();
      expect(billingClient.reportDeviceUsage).not.toHaveBeenCalled();
    });

    it("should calculate correct duration seconds", async () => {
      const allocatedAt = new Date(Date.now() - 3600000); // 1 hour ago
      const allocation = {
        ...mockAllocation,
        allocatedAt,
      };

      const queryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(allocation),
      };
      jest.spyOn(allocationRepository, "createQueryBuilder").mockReturnValue(queryBuilder);

      const result = await service.releaseDevice(deviceId, userId);

      expect(result.durationSeconds).toBeGreaterThanOrEqual(3599);
      expect(result.durationSeconds).toBeLessThanOrEqual(3601);
    });
  });

  describe("getAvailableDevices", () => {
    it("should return available devices", async () => {
      jest.spyOn(deviceRepository, "find").mockResolvedValue([mockDevice as Device]);
      jest.spyOn(allocationRepository, "find").mockResolvedValue([]);

      const result = await service.getAvailableDevices();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("device-1");
      expect(deviceRepository.find).toHaveBeenCalledWith({
        where: { status: DeviceStatus.RUNNING },
        order: { createdAt: "ASC" },
      });
    });

    it("should filter out allocated devices", async () => {
      jest.spyOn(deviceRepository, "find").mockResolvedValue([
        mockDevice as Device,
        { ...mockDevice, id: "device-2" } as Device,
      ]);
      jest.spyOn(allocationRepository, "find").mockResolvedValue([
        { deviceId: "device-1", status: AllocationStatus.ALLOCATED } as DeviceAllocation,
      ]);

      const result = await service.getAvailableDevices();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("device-2");
    });
  });

  describe("releaseExpiredAllocations", () => {
    it("should release expired allocations", async () => {
      const expiredAllocation = {
        ...mockAllocation,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };

      const queryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([expiredAllocation]),
      };

      jest.spyOn(allocationRepository, "createQueryBuilder").mockReturnValue(queryBuilder);
      jest.spyOn(allocationRepository, "save").mockResolvedValue(expiredAllocation as DeviceAllocation);
      jest.spyOn(eventBus, "publish").mockResolvedValue(undefined);

      const count = await service.releaseExpiredAllocations();

      expect(count).toBe(1);
      expect(allocationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AllocationStatus.EXPIRED,
        }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        "cloudphone.events",
        "scheduler.allocation.expired",
        expect.any(Object),
      );
    });

    it("should return 0 when no expired allocations", async () => {
      const queryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(allocationRepository, "createQueryBuilder").mockReturnValue(queryBuilder);

      const count = await service.releaseExpiredAllocations();

      expect(count).toBe(0);
    });
  });

  describe("getAllocationStats", () => {
    it("should return allocation statistics", async () => {
      jest.spyOn(allocationRepository, "count")
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20) // active
        .mockResolvedValueOnce(70) // released
        .mockResolvedValueOnce(10); // expired

      const stats = await service.getAllocationStats();

      expect(stats.totalAllocations).toBe(100);
      expect(stats.activeAllocations).toBe(20);
      expect(stats.releasedAllocations).toBe(70);
      expect(stats.expiredAllocations).toBe(10);
      expect(stats.strategy).toBeDefined();
    });
  });

  describe("getUserAllocations", () => {
    it("should return user allocations", async () => {
      jest.spyOn(allocationRepository, "find").mockResolvedValue([mockAllocation as DeviceAllocation]);

      const result = await service.getUserAllocations("user-1", 10);

      expect(result).toHaveLength(1);
      expect(allocationRepository.find).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        order: { allocatedAt: "DESC" },
        take: 10,
        relations: ["device"],
      });
    });
  });

  describe("batchAllocate", () => {
    it("should allocate multiple devices successfully", async () => {
      const requests = [
        { userId: "user-1", durationMinutes: 60 },
        { userId: "user-2", durationMinutes: 30 },
      ];

      jest.spyOn(service, "allocateDevice").mockResolvedValue({
        allocationId: "allocation-1",
        deviceId: "device-1",
        userId: "user-1",
        allocatedAt: new Date(),
        expiresAt: new Date(),
      } as any);

      jest.spyOn(deviceRepository, "findOne").mockResolvedValue(mockDevice as Device);

      const result = await service.batchAllocate(requests, true);

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.successes).toHaveLength(2);
      expect(result.failures).toHaveLength(0);
    });

    it("should continue on error when continueOnError is true", async () => {
      const requests = [
        { userId: "user-1", durationMinutes: 60 },
        { userId: "user-2", durationMinutes: 30 },
      ];

      jest.spyOn(service, "allocateDevice")
        .mockRejectedValueOnce(new Error("Allocation failed"))
        .mockResolvedValueOnce({
          allocationId: "allocation-2",
          deviceId: "device-2",
          userId: "user-2",
          allocatedAt: new Date(),
          expiresAt: new Date(),
        } as any);

      jest.spyOn(deviceRepository, "findOne").mockResolvedValue(mockDevice as Device);

      const result = await service.batchAllocate(requests, true);

      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.failures[0].userId).toBe("user-1");
    });

    it("should stop on first error when continueOnError is false", async () => {
      const requests = [
        { userId: "user-1", durationMinutes: 60 },
        { userId: "user-2", durationMinutes: 30 },
      ];

      jest.spyOn(service, "allocateDevice").mockRejectedValue(new Error("Allocation failed"));

      const result = await service.batchAllocate(requests, false);

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(service.allocateDevice).toHaveBeenCalledTimes(1);
    });
  });

  describe("extendAllocation", () => {
    it("should successfully extend allocation", async () => {
      const allocation = {
        ...mockAllocation,
        metadata: {
          extendCount: 0,
          extendHistory: [],
          totalExtendedMinutes: 0,
        },
      };

      jest.spyOn(allocationRepository, "findOne").mockResolvedValue(allocation as DeviceAllocation);
      jest.spyOn(allocationRepository, "save").mockResolvedValue(allocation as DeviceAllocation);
      jest.spyOn(eventBus, "publish").mockResolvedValue(undefined);
      jest.spyOn(deviceRepository, "findOne").mockResolvedValue(mockDevice as Device);
      jest.spyOn(notificationClient, "sendBatchNotifications").mockResolvedValue(undefined);

      const result = await service.extendAllocation("allocation-1", 30);

      expect(result).toBeDefined();
      expect(result.additionalMinutes).toBe(30);
      expect(result.extendCount).toBe(1);
      expect(allocationRepository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it("should throw NotFoundException when allocation not found", async () => {
      jest.spyOn(allocationRepository, "findOne").mockResolvedValue(null);

      await expect(service.extendAllocation("allocation-1", 30)).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when allocation not active", async () => {
      const allocation = {
        ...mockAllocation,
        status: AllocationStatus.RELEASED,
      };

      jest.spyOn(allocationRepository, "findOne").mockResolvedValue(allocation as DeviceAllocation);

      await expect(service.extendAllocation("allocation-1", 30)).rejects.toThrow(BadRequestException);
    });

    it("should enforce maximum extend count", async () => {
      const allocation = {
        ...mockAllocation,
        metadata: {
          extendCount: 5,
          extendHistory: [],
          totalExtendedMinutes: 0,
        },
      };

      jest.spyOn(allocationRepository, "findOne").mockResolvedValue(allocation as DeviceAllocation);

      await expect(service.extendAllocation("allocation-1", 30)).rejects.toThrow(ForbiddenException);
    });

    it("should enforce maximum extend minutes per request", async () => {
      const allocation = {
        ...mockAllocation,
        metadata: {},
      };

      jest.spyOn(allocationRepository, "findOne").mockResolvedValue(allocation as DeviceAllocation);

      await expect(service.extendAllocation("allocation-1", 200)).rejects.toThrow(BadRequestException);
    });

    it("should track extend history", async () => {
      const allocation = {
        ...mockAllocation,
        metadata: {
          extendCount: 1,
          extendHistory: [{ timestamp: new Date().toISOString(), additionalMinutes: 30 }],
          totalExtendedMinutes: 30,
        },
      };

      jest.spyOn(allocationRepository, "findOne").mockResolvedValue(allocation as DeviceAllocation);
      jest.spyOn(allocationRepository, "save").mockImplementation(async (entity) => entity as any);
      jest.spyOn(deviceRepository, "findOne").mockResolvedValue(mockDevice as Device);
      jest.spyOn(eventBus, "publish").mockResolvedValue(undefined);
      jest.spyOn(notificationClient, "sendBatchNotifications").mockResolvedValue(undefined);

      const result = await service.extendAllocation("allocation-1", 20);

      expect(result.extendCount).toBe(2);
      expect(result.totalDurationMinutes).toBe(110); // 60 + 30 + 20
    });
  });

  describe("scheduling strategies", () => {
    const devices: Device[] = [
      { ...mockDevice, id: "device-1", cpuUsage: 20, memoryUsage: 30 } as Device,
      { ...mockDevice, id: "device-2", cpuUsage: 50, memoryUsage: 60 } as Device,
      { ...mockDevice, id: "device-3", cpuUsage: 10, memoryUsage: 20 } as Device,
    ];

    beforeEach(() => {
      jest.spyOn(service, "getAvailableDevices").mockResolvedValue(devices);
      jest.spyOn(allocationRepository, "find").mockResolvedValue([]);
      jest.spyOn(quotaClient, "checkDeviceCreationQuota").mockResolvedValue(mockQuotaCheckResponse);
      jest.spyOn(allocationRepository, "create").mockReturnValue(mockAllocation as DeviceAllocation);
      jest.spyOn(allocationRepository, "save").mockResolvedValue(mockAllocation as DeviceAllocation);
      jest.spyOn(quotaClient, "reportDeviceUsage").mockResolvedValue(undefined);
      jest.spyOn(eventBus, "publishDeviceEvent").mockResolvedValue(undefined);
      jest.spyOn(notificationClient, "notifyAllocationSuccess").mockResolvedValue(undefined);
    });

    it("should use LEAST_CONNECTION strategy", async () => {
      service.setStrategy(SchedulingStrategy.LEAST_CONNECTION);

      await service.allocateDevice({ userId: "user-1", durationMinutes: 60 });

      // Should select device-3 (lowest usage)
      expect(allocationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: "device-3",
        }),
      );
    });

    it("should use RESOURCE_BASED strategy", async () => {
      service.setStrategy(SchedulingStrategy.RESOURCE_BASED);

      await service.allocateDevice({ userId: "user-1", durationMinutes: 60 });

      // Should select device-3 (highest available resources)
      expect(allocationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: "device-3",
        }),
      );
    });
  });
});
