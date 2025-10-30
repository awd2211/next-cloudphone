import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { BadRequestException } from "@nestjs/common";
import { BusinessException } from "@cloudphone/shared";
import { ConfigService } from "@nestjs/config";
import { ModuleRef } from "@nestjs/core";
import { DevicesService } from "../devices.service";
import { Device, DeviceStatus } from "../../entities/device.entity";
import { DockerService } from "../../docker/docker.service";
import { AdbService } from "../../adb/adb.service";
import { PortManagerService } from "../../port-manager/port-manager.service";
import { EventBusService, EventOutboxService, SagaOrchestratorService } from "@cloudphone/shared";
import { QuotaClientService } from "../../quota/quota-client.service";
import { CacheService } from "../../cache/cache.service";
import { DeviceProviderFactory } from "../../providers/device-provider.factory";
import { CreateDeviceDto } from "../dto/create-device.dto";
import { UpdateDeviceDto } from "../dto/update-device.dto";

describe("DevicesService", () => {
  let service: DevicesService;
  let deviceRepository: Repository<Device>;
  let dockerService: DockerService;
  let adbService: AdbService;
  let portManager: PortManagerService;
  let eventBus: EventBusService;
  let quotaClient: QuotaClientService;
  let configService: ConfigService;

  const mockDeviceRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
  };

  const mockDockerService = {
    createContainer: jest.fn(),
    startContainer: jest.fn(),
    stopContainer: jest.fn(),
    removeContainer: jest.fn(),
    getContainerInfo: jest.fn(),
  };

  const mockAdbService = {
    connectToDevice: jest.fn(),
    disconnectFromDevice: jest.fn(),
    executeShellCommand: jest.fn(),
  };

  const mockPortManager = {
    allocatePorts: jest.fn(),
    releasePorts: jest.fn(),
  };

  const mockEventBus = {
    publishDeviceEvent: jest.fn(),
  };

  const mockQuotaClient = {
    reportDeviceUsage: jest.fn(),
    incrementConcurrentDevices: jest.fn(),
    decrementConcurrentDevices: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  // Mock provider returned by DeviceProviderFactory
  const mockProvider = {
    create: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    destroy: jest.fn(),
    getStatus: jest.fn(),
    getMetrics: jest.fn(),
  };

  const mockProviderFactory = {
    getProvider: jest.fn(() => mockProvider),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    // wrap 应该执行回调函数 (缓存未命中场景)
    wrap: jest.fn((key, fn, ttl) => fn()),
  };

  const mockEventOutboxService = {
    writeEvent: jest.fn(),
  };

  const mockSagaOrchestrator = {
    executeSaga: jest.fn(),
    getSagaStatus: jest.fn(),
    compensateSaga: jest.fn(),
  };

  const mockModuleRef = {
    get: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      getRepository: jest.fn(() => mockDeviceRepository),
      save: jest.fn((entity, data) => Promise.resolve(data)),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        {
          provide: getRepositoryToken(Device),
          useValue: mockDeviceRepository,
        },
        {
          provide: DeviceProviderFactory,
          useValue: mockProviderFactory,
        },
        {
          provide: DockerService,
          useValue: mockDockerService,
        },
        {
          provide: AdbService,
          useValue: mockAdbService,
        },
        {
          provide: PortManagerService,
          useValue: mockPortManager,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
        {
          provide: EventOutboxService,
          useValue: mockEventOutboxService,
        },
        {
          provide: QuotaClientService,
          useValue: mockQuotaClient,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ModuleRef,
          useValue: mockModuleRef,
        },
        {
          provide: SagaOrchestratorService,
          useValue: mockSagaOrchestrator,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    deviceRepository = module.get<Repository<Device>>(
      getRepositoryToken(Device),
    );
    dockerService = module.get<DockerService>(DockerService);
    adbService = module.get<AdbService>(AdbService);
    portManager = module.get<PortManagerService>(PortManagerService);
    eventBus = module.get<EventBusService>(EventBusService);
    quotaClient = module.get<QuotaClientService>(QuotaClientService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const createDeviceDto: CreateDeviceDto = {
      userId: "user-123",
      tenantId: "tenant-456",
      name: "Test Device",
      cpuCores: 2,
      memoryMB: 4096,
      storageMB: 32768,
      androidVersion: "11.0",
      resolution: "1080x1920",
      dpi: 320,
    };

    it("should successfully create a device using Saga orchestration", async () => {
      // Arrange
      const sagaId = "saga-123";
      const createdDevice: Partial<Device> = {
        id: "device-123",
        ...createDeviceDto,
        providerType: "redroid" as any,
        status: DeviceStatus.CREATING,
        adbPort: 5555,
        adbHost: "localhost",
      };

      mockSagaOrchestrator.executeSaga.mockResolvedValue(sagaId);
      mockDeviceRepository.findOne.mockResolvedValue(createdDevice as Device);

      // Act
      const result = await service.create(createDeviceDto);

      // Assert
      expect(result.sagaId).toBe(sagaId);
      expect(result.device).toBeDefined();
      expect(mockSagaOrchestrator.executeSaga).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "DEVICE_CREATION",
          timeoutMs: 600000,
          maxRetries: 3,
          steps: expect.arrayContaining([
            expect.objectContaining({ name: "ALLOCATE_PORTS" }),
            expect.objectContaining({ name: "CREATE_PROVIDER_DEVICE" }),
            expect.objectContaining({ name: "CREATE_DATABASE_RECORD" }),
            expect.objectContaining({ name: "REPORT_QUOTA_USAGE" }),
            expect.objectContaining({ name: "START_DEVICE" }),
          ]),
        }),
        expect.objectContaining({
          userId: createDeviceDto.userId,
          name: createDeviceDto.name,
        }),
      );
    });

    it("should return placeholder device when not found immediately after Saga", async () => {
      // Arrange
      const sagaId = "saga-456";

      mockSagaOrchestrator.executeSaga.mockResolvedValue(sagaId);
      mockDeviceRepository.findOne.mockResolvedValue(null); // Device not found yet

      // Act
      const result = await service.create(createDeviceDto);

      // Assert
      expect(result.sagaId).toBe(sagaId);
      expect(result.device.id).toBe("pending");
      expect(result.device.status).toBe(DeviceStatus.CREATING);
      expect(result.device.name).toBe(createDeviceDto.name);
    });

    it("should call provider factory with correct provider type", async () => {
      // Arrange
      const sagaId = "saga-789";

      mockSagaOrchestrator.executeSaga.mockResolvedValue(sagaId);
      mockDeviceRepository.findOne.mockResolvedValue(null);

      // Act
      await service.create(createDeviceDto);

      // Assert
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith("redroid");
    });

    it("should use PHYSICAL provider when specified", async () => {
      // Arrange
      const physicalDto = { ...createDeviceDto, providerType: "physical" as any };
      const sagaId = "saga-physical";

      mockSagaOrchestrator.executeSaga.mockResolvedValue(sagaId);
      mockDeviceRepository.findOne.mockResolvedValue(null);

      // Act
      await service.create(physicalDto);

      // Assert
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith("physical");
    });

    it("should handle Saga execution errors", async () => {
      // Arrange
      mockSagaOrchestrator.executeSaga.mockRejectedValue(
        new Error("Saga execution failed"),
      );

      // Act & Assert
      await expect(service.create(createDeviceDto)).rejects.toThrow(
        "Saga execution failed",
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated device list", async () => {
      // Arrange
      const devices: Partial<Device>[] = [
        { id: "device-1", name: "Device 1", userId: "user-1" },
        { id: "device-2", name: "Device 2", userId: "user-1" },
      ];

      mockDeviceRepository.findAndCount.mockResolvedValue([devices as Device[], 10]);

      // Act - no userId = no cache, direct query
      const result = await service.findAll(1, 10);

      // Assert
      expect(result).toEqual({
        data: devices,
        total: 10,
        page: 1,
        limit: 10,
      });
      expect(mockDeviceRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        order: { createdAt: "DESC" },
      });
    });

    it("should filter by userId", async () => {
      // Arrange
      mockDeviceRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act - with userId, will use cache.wrap
      await service.findAll(1, 10, "user-123");

      // Assert
      expect(mockCacheService.wrap).toHaveBeenCalled();
      expect(mockDeviceRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        skip: 0,
        take: 10,
        order: { createdAt: "DESC" },
      });
    });

    it("should filter by status", async () => {
      // Arrange
      mockDeviceRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.findAll(1, 10, undefined, undefined, DeviceStatus.RUNNING);

      // Assert
      expect(mockDeviceRepository.findAndCount).toHaveBeenCalledWith({
        where: { status: DeviceStatus.RUNNING },
        skip: 0,
        take: 10,
        order: { createdAt: "DESC" },
      });
    });

    it("should calculate correct pagination offset", async () => {
      // Arrange
      mockDeviceRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.findAll(3, 20);

      // Assert
      expect(mockDeviceRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (3 - 1) * 20
          take: 20,
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should return device when found", async () => {
      // Arrange
      const device: Partial<Device> = {
        id: "device-123",
        name: "Test Device",
        providerType: "redroid" as any,
      };

      mockDeviceRepository.findOne.mockResolvedValue(device as Device);

      // Act
      const result = await service.findOne("device-123");

      // Assert
      expect(result).toEqual(device);
      expect(mockDeviceRepository.findOne).toHaveBeenCalledWith({
        where: { id: "device-123" },
      });
    });

    it("should throw BusinessException when device not found", async () => {
      // Arrange
      mockDeviceRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne("non-existent-id")).rejects.toThrow(
        BusinessException,
      );
      await expect(service.findOne("non-existent-id")).rejects.toThrow(
        "设备不存在: non-existent-id",
      );
    });
  });

  describe("update", () => {
    it("should update device successfully", async () => {
      // Arrange
      const existingDevice: Partial<Device> = {
        id: "device-123",
        name: "Old Name",
        cpuCores: 2,
        providerType: "redroid" as any,
      };
      const updateDto: UpdateDeviceDto = {
        name: "New Name",
      };
      const updatedDevice = { ...existingDevice, ...updateDto };

      mockDeviceRepository.findOne.mockResolvedValue(existingDevice as Device);
      mockDeviceRepository.save.mockResolvedValue(updatedDevice as Device);

      // Act
      const result = await service.update("device-123", updateDto);

      // Assert
      expect(result).toEqual(updatedDevice);
      expect(mockDeviceRepository.save).toHaveBeenCalledWith(
        expect.objectContaining(updateDto),
      );
    });

    it("should throw BusinessException when updating non-existent device", async () => {
      // Arrange
      mockDeviceRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update("non-existent-id", { name: "New Name" }),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("remove", () => {
    it("should successfully remove device and clean up resources", async () => {
      // Arrange
      const device: Partial<Device> = {
        id: "device-123",
        userId: "user-123",
        providerType: "redroid" as any,
        containerId: "container-123",
        externalId: "container-123",
        adbPort: 5555,
        cpuCores: 2,
        memoryMB: 4096,
        storageMB: 32768,
        metadata: { webrtcPort: 8080 },
      };

      mockDeviceRepository.findOne.mockResolvedValue(device as Device);
      mockQuotaClient.reportDeviceUsage.mockResolvedValue(undefined);
      mockAdbService.disconnectFromDevice.mockResolvedValue(undefined);
      mockProvider.destroy.mockResolvedValue(undefined);
      mockDeviceRepository.save.mockResolvedValue({
        ...device,
        status: DeviceStatus.DELETED,
      } as Device);
      mockEventOutboxService.writeEvent.mockResolvedValue(undefined);

      // Act
      await service.remove("device-123");

      // Assert
      expect(mockQuotaClient.reportDeviceUsage).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          deviceId: "device-123",
          operation: "decrement",
        }),
      );
      expect(mockAdbService.disconnectFromDevice).toHaveBeenCalledWith(
        "device-123",
      );
      expect(mockProvider.destroy).toHaveBeenCalledWith("container-123");
      expect(mockPortManager.releasePorts).toHaveBeenCalledWith({
        adbPort: 5555,
        webrtcPort: 8080,
      });
      expect(mockEventOutboxService.writeEvent).toHaveBeenCalledWith(
        expect.any(Object), // queryRunner
        "device",
        "device-123",
        "device.deleted",
        expect.objectContaining({
          deviceId: "device-123",
          userId: "user-123",
        }),
      );
    });

    it("should continue removal even when ADB disconnection fails", async () => {
      // Arrange
      const device: Partial<Device> = {
        id: "device-123",
        userId: "user-123",
        providerType: "redroid" as any,
        containerId: "container-123",
        externalId: "container-123",
        adbPort: 5555,
        cpuCores: 2,
        memoryMB: 4096,
        storageMB: 32768,
      };

      mockDeviceRepository.findOne.mockResolvedValue(device as Device);
      mockQuotaClient.reportDeviceUsage.mockResolvedValue(undefined);
      mockAdbService.disconnectFromDevice.mockRejectedValue(
        new Error("ADB error"),
      );
      mockProvider.destroy.mockResolvedValue(undefined);
      mockDeviceRepository.save.mockResolvedValue(device as Device);
      mockEventOutboxService.writeEvent.mockResolvedValue(undefined);

      // Act & Assert - should not throw
      await expect(service.remove("device-123")).resolves.toBeUndefined();
      expect(mockProvider.destroy).toHaveBeenCalled();
    });

    it("should continue removal even when provider destroy fails", async () => {
      // Arrange
      const device: Partial<Device> = {
        id: "device-123",
        userId: "user-123",
        providerType: "redroid" as any,
        containerId: "container-123",
        externalId: "container-123",
        adbPort: 5555,
        cpuCores: 2,
        memoryMB: 4096,
        storageMB: 32768,
      };

      mockDeviceRepository.findOne.mockResolvedValue(device as Device);
      mockQuotaClient.reportDeviceUsage.mockResolvedValue(undefined);
      mockAdbService.disconnectFromDevice.mockResolvedValue(undefined);
      mockProvider.destroy.mockRejectedValue(
        new Error("Provider error"),
      );
      mockDeviceRepository.save.mockResolvedValue(device as Device);
      mockEventOutboxService.writeEvent.mockResolvedValue(undefined);

      // Act & Assert - should not throw
      await expect(service.remove("device-123")).resolves.toBeUndefined();
      expect(mockPortManager.releasePorts).toHaveBeenCalled();
    });
  });

  describe("start", () => {
    it("should successfully start a device", async () => {
      // Arrange
      const device: Partial<Device> = {
        id: "device-123",
        userId: "user-123",
        tenantId: "tenant-456",
        providerType: "redroid" as any,
        externalId: "container-123",
        containerId: "container-123",
        adbHost: "localhost",
        adbPort: 5555,
        status: DeviceStatus.STOPPED,
      };

      const startedDevice = {
        ...device,
        status: DeviceStatus.RUNNING,
        lastActiveAt: expect.any(Date),
      };

      mockDeviceRepository.findOne.mockResolvedValue(device as Device);
      mockProvider.start.mockResolvedValue(undefined);
      mockDeviceRepository.save.mockResolvedValue(startedDevice as Device);
      mockAdbService.connectToDevice.mockResolvedValue(undefined);
      mockQuotaClient.incrementConcurrentDevices.mockResolvedValue(undefined);
      mockEventOutboxService.writeEvent.mockResolvedValue(undefined);

      // Act
      const result = await service.start("device-123");

      // Assert
      expect(mockProvider.start).toHaveBeenCalledWith("container-123");
      expect(mockAdbService.connectToDevice).toHaveBeenCalledWith(
        "device-123",
        "localhost",
        5555,
      );
      expect(mockQuotaClient.incrementConcurrentDevices).toHaveBeenCalledWith(
        "user-123",
      );
      expect(mockEventOutboxService.writeEvent).toHaveBeenCalledWith(
        expect.any(Object), // queryRunner
        "device",
        "device-123",
        "device.started",
        expect.objectContaining({
          deviceId: "device-123",
          userId: "user-123",
        }),
      );
      expect(result.status).toBe(DeviceStatus.RUNNING);
    });

    it("should skip provider start when device has no externalId", async () => {
      // Arrange
      const device: Partial<Device> = {
        id: "device-123",
        userId: "user-123",
        providerType: "redroid" as any,
        externalId: null,
        adbHost: "localhost",
        adbPort: 5555,
      };

      mockDeviceRepository.findOne.mockResolvedValue(device as Device);
      mockDeviceRepository.save.mockResolvedValue({
        ...device,
        status: DeviceStatus.RUNNING,
      } as Device);
      mockAdbService.connectToDevice.mockResolvedValue(undefined);
      mockQuotaClient.incrementConcurrentDevices.mockResolvedValue(undefined);
      mockEventOutboxService.writeEvent.mockResolvedValue(undefined);

      // Act
      const result = await service.start("device-123");

      // Assert - provider.start should NOT be called
      expect(mockProvider.start).not.toHaveBeenCalled();
      expect(result.status).toBe(DeviceStatus.RUNNING);
    });

    it("should continue even when ADB connection fails", async () => {
      // Arrange
      const device: Partial<Device> = {
        id: "device-123",
        userId: "user-123",
        providerType: "redroid" as any,
        externalId: "container-123",
        containerId: "container-123",
        adbHost: "localhost",
        adbPort: 5555,
      };

      mockDeviceRepository.findOne.mockResolvedValue(device as Device);
      mockProvider.start.mockResolvedValue(undefined);
      mockDeviceRepository.save.mockResolvedValue(device as Device);
      mockAdbService.connectToDevice.mockRejectedValue(
        new Error("ADB connection failed"),
      );
      mockQuotaClient.incrementConcurrentDevices.mockResolvedValue(undefined);
      mockEventOutboxService.writeEvent.mockResolvedValue(undefined);

      // Act & Assert - should not throw
      await expect(service.start("device-123")).resolves.toBeDefined();
    });
  });

  describe("stop", () => {
    it("should successfully stop a running device", async () => {
      // Arrange
      const device: Partial<Device> = {
        id: "device-123",
        userId: "user-123",
        providerType: "redroid" as any,
        externalId: "container-123",
        containerId: "container-123",
        adbPort: 5555, // ← Add this to trigger ADB disconnect
        status: DeviceStatus.RUNNING,
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        lastActiveAt: new Date(Date.now() - 1800000), // 30 minutes ago
      };

      const stoppedDevice = {
        ...device,
        status: DeviceStatus.STOPPED,
      };

      mockDeviceRepository.findOne.mockResolvedValue(device as Device);
      mockAdbService.disconnectFromDevice.mockResolvedValue(undefined);
      mockProvider.stop.mockResolvedValue(undefined);
      mockDeviceRepository.save.mockResolvedValue(stoppedDevice as Device);
      mockQuotaClient.decrementConcurrentDevices.mockResolvedValue(undefined);
      mockEventOutboxService.writeEvent.mockResolvedValue(undefined);

      // Act
      const result = await service.stop("device-123");

      // Assert
      expect(mockAdbService.disconnectFromDevice).toHaveBeenCalledWith(
        "device-123",
      );
      expect(mockProvider.stop).toHaveBeenCalledWith("container-123");
      expect(mockQuotaClient.decrementConcurrentDevices).toHaveBeenCalledWith(
        "user-123",
      );
      expect(mockEventOutboxService.writeEvent).toHaveBeenCalledWith(
        expect.any(Object), // queryRunner
        "device",
        "device-123",
        "device.stopped",
        expect.objectContaining({
          deviceId: "device-123",
          userId: "user-123",
          duration: expect.any(Number),
        }),
      );
      expect(result.status).toBe(DeviceStatus.STOPPED);
    });

    it("should skip provider stop when device has no externalId", async () => {
      // Arrange
      const device: Partial<Device> = {
        id: "device-123",
        userId: "user-123",
        providerType: "redroid" as any,
        externalId: null,
        adbPort: 5555, // ← Add this so ADB disconnect is called
        createdAt: new Date(),
        lastActiveAt: new Date(),
      };

      mockDeviceRepository.findOne.mockResolvedValue(device as Device);
      mockAdbService.disconnectFromDevice.mockResolvedValue(undefined);
      mockDeviceRepository.save.mockResolvedValue({
        ...device,
        status: DeviceStatus.STOPPED,
      } as Device);
      mockQuotaClient.decrementConcurrentDevices.mockResolvedValue(undefined);
      mockEventOutboxService.writeEvent.mockResolvedValue(undefined);

      // Act
      const result = await service.stop("device-123");

      // Assert - provider.stop should NOT be called
      expect(mockProvider.stop).not.toHaveBeenCalled();
      expect(result.status).toBe(DeviceStatus.STOPPED);
    });

    it("should calculate correct duration", async () => {
      // Arrange
      const startTime = new Date(Date.now() - 7200000); // 2 hours ago
      const device: Partial<Device> = {
        id: "device-123",
        userId: "user-123",
        providerType: "redroid" as any,
        externalId: "container-123",
        containerId: "container-123",
        lastActiveAt: startTime,
        createdAt: new Date(),
      };

      mockDeviceRepository.findOne.mockResolvedValue(device as Device);
      mockAdbService.disconnectFromDevice.mockResolvedValue(undefined);
      mockProvider.stop.mockResolvedValue(undefined);
      mockDeviceRepository.save.mockResolvedValue(device as Device);
      mockQuotaClient.decrementConcurrentDevices.mockResolvedValue(undefined);
      mockEventOutboxService.writeEvent.mockResolvedValue(undefined);

      // Act
      await service.stop("device-123");

      // Assert
      expect(mockEventOutboxService.writeEvent).toHaveBeenCalledWith(
        expect.any(Object), // queryRunner
        "device",
        "device-123",
        "device.stopped",
        expect.objectContaining({
          duration: expect.any(Number),
        }),
      );

      const call = (mockEventOutboxService.writeEvent as jest.Mock).mock
        .calls[0][4];
      // Duration should be approximately 7200 seconds (2 hours)
      expect(call.duration).toBeGreaterThan(7100);
      expect(call.duration).toBeLessThan(7300);
    });
  });
});
