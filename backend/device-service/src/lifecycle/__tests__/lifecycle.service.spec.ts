import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { LifecycleService, CleanupResult } from "../lifecycle.service";
import { Device, DeviceStatus } from "../../entities/device.entity";
import { DockerService } from "../../docker/docker.service";
import { AdbService } from "../../adb/adb.service";
import { PortManagerService } from "../../port-manager/port-manager.service";
import { EventBusService } from "@cloudphone/shared";
import { MetricsService } from "../../metrics/metrics.service";

describe("LifecycleService", () => {
  let service: LifecycleService;
  let deviceRepository: jest.Mocked<Repository<Device>>;
  let dockerService: jest.Mocked<DockerService>;
  let adbService: jest.Mocked<AdbService>;
  let portManager: jest.Mocked<PortManagerService>;
  let configService: jest.Mocked<ConfigService>;
  let eventBus: jest.Mocked<EventBusService>;
  let metricsService: jest.Mocked<MetricsService>;

  const mockDevice: Device = {
    id: "device-123",
    name: "TestDevice",
    userId: "user-123",
    containerId: "container-abc",
    status: DeviceStatus.RUNNING,
    adbHost: "localhost",
    adbPort: 5555,
    lastActiveAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
    updatedAt: new Date(),
  } as Device;

  beforeEach(async () => {
    const mockDeviceRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    };

    const mockDockerService = {
      listContainers: jest.fn(),
      removeContainer: jest.fn(),
      stopContainer: jest.fn(),
      restartContainer: jest.fn(),
      getContainerInfo: jest.fn(),
    };

    const mockAdbService = {
      connectToDevice: jest.fn(),
      disconnectFromDevice: jest.fn(),
    };

    const mockPortManager = {
      releasePorts: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key, defaultValue) => {
        const config = {
          DEVICE_IDLE_CLEANUP_HOURS: 24,
          DEVICE_ERROR_CLEANUP_HOURS: 2,
          DEVICE_STOPPED_CLEANUP_DAYS: 7,
          AUTO_DELETE_IDLE_DEVICES: false,
        };
        return config[key] ?? defaultValue;
      }),
    };

    const mockEventBus = {
      publish: jest.fn(),
      publishDeviceEvent: jest.fn(),
    };

    const mockMetricsService = {
      recordOperationDuration: jest.fn(),
      recordOperationError: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifecycleService,
        {
          provide: getRepositoryToken(Device),
          useValue: mockDeviceRepository,
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
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    service = module.get<LifecycleService>(LifecycleService);
    deviceRepository = module.get(getRepositoryToken(Device));
    dockerService = module.get(DockerService);
    adbService = module.get(AdbService);
    portManager = module.get(PortManagerService);
    configService = module.get(ConfigService);
    eventBus = module.get(EventBusService);
    metricsService = module.get(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers(); // Reset timers after each test
  });

  describe("cleanupIdleDevices", () => {
    it("should cleanup idle devices", async () => {
      const idleDevices = [mockDevice, { ...mockDevice, id: "device-456" }];
      deviceRepository.find.mockResolvedValue(idleDevices);
      adbService.disconnectFromDevice.mockResolvedValue(undefined);
      dockerService.stopContainer.mockResolvedValue(undefined);
      deviceRepository.save.mockImplementation((device) => Promise.resolve(device));
      eventBus.publish.mockResolvedValue(undefined);

      const result = await service.cleanupIdleDevices();

      expect(deviceRepository.find).toHaveBeenCalledWith({
        where: {
          status: DeviceStatus.RUNNING,
          lastActiveAt: expect.any(Object),
        },
      });
      expect(result.cleaned).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(dockerService.stopContainer).toHaveBeenCalledTimes(2);
      expect(eventBus.publish).toHaveBeenCalledTimes(2);
    });

    it("should delete idle devices when AUTO_DELETE_IDLE_DEVICES is true", async () => {
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === "AUTO_DELETE_IDLE_DEVICES") return true;
        return defaultValue;
      });

      const idleDevices = [mockDevice];
      deviceRepository.find.mockResolvedValue(idleDevices);
      adbService.disconnectFromDevice.mockResolvedValue(undefined);
      dockerService.removeContainer.mockResolvedValue(undefined);
      deviceRepository.save.mockImplementation((device) => Promise.resolve(device));
      eventBus.publish.mockResolvedValue(undefined);
      eventBus.publishDeviceEvent.mockResolvedValue(undefined);

      const result = await service.cleanupIdleDevices();

      expect(dockerService.removeContainer).toHaveBeenCalled();
      expect(eventBus.publishDeviceEvent).toHaveBeenCalledWith(
        "deleted",
        expect.any(Object),
      );
      expect(result.cleaned).toBe(1);
    });

    it("should handle errors gracefully", async () => {
      const idleDevices = [mockDevice];
      deviceRepository.find.mockResolvedValue(idleDevices);
      // Make stopDevice fail by throwing error during stopContainer
      dockerService.stopContainer.mockRejectedValue(new Error("Docker error"));
      adbService.disconnectFromDevice.mockResolvedValue(undefined);
      deviceRepository.save.mockRejectedValue(new Error("Save failed"));

      const result = await service.cleanupIdleDevices();

      expect(result.cleaned).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("device-123");
      expect(metricsService.recordOperationError).toHaveBeenCalledWith(
        "cleanup_idle",
        "device_cleanup_failed",
      );
    });

    it("should return empty result when no idle devices found", async () => {
      deviceRepository.find.mockResolvedValue([]);

      const result = await service.cleanupIdleDevices();

      expect(result.cleaned).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("cleanupErrorDevices", () => {
    it("should cleanup error devices", async () => {
      jest.useFakeTimers(); // Use fake timers for the 5-second delay

      const errorDevice = { ...mockDevice, status: DeviceStatus.ERROR };
      deviceRepository.find.mockResolvedValue([errorDevice]);
      dockerService.restartContainer.mockResolvedValue(undefined);
      dockerService.getContainerInfo.mockResolvedValue({
        State: { Running: false },
      });
      dockerService.removeContainer.mockResolvedValue(undefined);
      adbService.disconnectFromDevice.mockResolvedValue(undefined);
      deviceRepository.save.mockImplementation((device) => Promise.resolve(device));
      eventBus.publish.mockResolvedValue(undefined);
      eventBus.publishDeviceEvent.mockResolvedValue(undefined);

      const cleanupPromise = service.cleanupErrorDevices();

      // Fast-forward through the 5-second delay
      await jest.advanceTimersByTimeAsync(5000);

      const result = await cleanupPromise;

      expect(deviceRepository.find).toHaveBeenCalledWith({
        where: {
          status: DeviceStatus.ERROR,
          updatedAt: expect.any(Object),
        },
      });
      expect(result.cleaned).toBe(1);
      expect(dockerService.removeContainer).toHaveBeenCalled();
    });

    it("should attempt recovery before deleting", async () => {
      jest.useFakeTimers();

      const errorDevice = { ...mockDevice, status: DeviceStatus.ERROR };
      deviceRepository.find.mockResolvedValue([errorDevice]);
      dockerService.restartContainer.mockResolvedValue(undefined);
      dockerService.getContainerInfo.mockResolvedValue({
        State: { Running: true },
      });
      adbService.connectToDevice.mockResolvedValue(undefined);
      deviceRepository.save.mockImplementation((device) => Promise.resolve(device));

      const cleanupPromise = service.cleanupErrorDevices();
      await jest.advanceTimersByTimeAsync(5000);
      const result = await cleanupPromise;

      expect(dockerService.restartContainer).toHaveBeenCalled();
      expect(adbService.connectToDevice).toHaveBeenCalled();
      expect(result.cleaned).toBe(0); // No cleanup, device recovered
    });

    it("should handle recovery failures", async () => {
      const errorDevice = { ...mockDevice, status: DeviceStatus.ERROR };
      deviceRepository.find.mockResolvedValue([errorDevice]);
      dockerService.restartContainer.mockRejectedValue(new Error("Restart failed"));
      dockerService.removeContainer.mockResolvedValue(undefined);
      adbService.disconnectFromDevice.mockResolvedValue(undefined);
      deviceRepository.save.mockImplementation((device) => Promise.resolve(device));
      eventBus.publish.mockResolvedValue(undefined);
      eventBus.publishDeviceEvent.mockResolvedValue(undefined);

      const result = await service.cleanupErrorDevices();

      expect(dockerService.removeContainer).toHaveBeenCalled();
      expect(result.cleaned).toBe(1);
    });
  });

  describe("cleanupStoppedDevices", () => {
    it("should cleanup long-term stopped devices", async () => {
      const stoppedDevice = {
        ...mockDevice,
        status: DeviceStatus.STOPPED,
        updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      };
      deviceRepository.find.mockResolvedValue([stoppedDevice]);
      adbService.disconnectFromDevice.mockResolvedValue(undefined);
      dockerService.removeContainer.mockResolvedValue(undefined);
      deviceRepository.save.mockImplementation((device) => Promise.resolve(device));
      eventBus.publish.mockResolvedValue(undefined);
      eventBus.publishDeviceEvent.mockResolvedValue(undefined);

      const result = await service.cleanupStoppedDevices();

      expect(deviceRepository.find).toHaveBeenCalledWith({
        where: {
          status: DeviceStatus.STOPPED,
          updatedAt: expect.any(Object),
        },
      });
      expect(result.cleaned).toBe(1);
      expect(dockerService.removeContainer).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(
        "cloudphone.events",
        "device.cleaned",
        expect.objectContaining({
          payload: expect.objectContaining({
            reason: "long_term_stopped",
          }),
        }),
      );
    });

    it("should handle cleanup errors", async () => {
      const stoppedDevice = { ...mockDevice, status: DeviceStatus.STOPPED };
      deviceRepository.find.mockResolvedValue([stoppedDevice]);
      // Make deleteDevice fail completely
      dockerService.removeContainer.mockRejectedValue(new Error("Delete error"));
      adbService.disconnectFromDevice.mockResolvedValue(undefined);
      deviceRepository.save.mockRejectedValue(new Error("Save failed"));

      const result = await service.cleanupStoppedDevices();

      expect(result.cleaned).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(metricsService.recordOperationError).toHaveBeenCalled();
    });
  });

  describe("cleanupOrphanedContainers", () => {
    it("should cleanup orphaned containers", async () => {
      const containers = [
        { Id: "container-1", Names: ["/cloudphone-device-orphan"] },
        { Id: "container-2", Names: ["/cloudphone-device-existing"] },
      ];
      dockerService.listContainers.mockResolvedValue(containers);
      deviceRepository.findOne
        .mockResolvedValueOnce(null) // orphan
        .mockResolvedValueOnce(mockDevice); // existing
      dockerService.removeContainer.mockResolvedValue(undefined);

      const result = await service.cleanupOrphanedContainers();

      expect(dockerService.listContainers).toHaveBeenCalledWith(true);
      expect(dockerService.removeContainer).toHaveBeenCalledTimes(1);
      expect(dockerService.removeContainer).toHaveBeenCalledWith("container-1");
      expect(result.cleaned).toBe(1);
    });

    it("should handle container deletion errors", async () => {
      const containers = [{ Id: "container-1", Names: ["/cloudphone-device-orphan"] }];
      dockerService.listContainers.mockResolvedValue(containers);
      deviceRepository.findOne.mockResolvedValue(null);
      dockerService.removeContainer.mockRejectedValue(new Error("Delete failed"));

      const result = await service.cleanupOrphanedContainers();

      expect(result.cleaned).toBe(0);
      expect(result.errors).toHaveLength(1);
    });

    it("should skip non-cloudphone containers", async () => {
      const containers = [
        { Id: "container-1", Names: ["/other-app-container"] },
        { Id: "container-2", Names: ["/cloudphone-device-123"] },
      ];
      dockerService.listContainers.mockResolvedValue(containers);
      deviceRepository.findOne.mockResolvedValue(mockDevice);

      const result = await service.cleanupOrphanedContainers();

      expect(dockerService.removeContainer).not.toHaveBeenCalled();
      expect(result.cleaned).toBe(0);
    });
  });

  describe("performAutoCleanup", () => {
    it("should perform all cleanup tasks", async () => {
      deviceRepository.find.mockResolvedValue([]);
      dockerService.listContainers.mockResolvedValue([]);

      const result = await service.performAutoCleanup();

      expect(result).toMatchObject({
        totalScanned: 0,
        totalCleaned: 0,
        details: {
          idleDevices: 0,
          errorDevices: 0,
          expiredDevices: 0,
          orphanedContainers: 0,
        },
        errors: [],
      });
      expect(metricsService.recordOperationDuration).toHaveBeenCalledWith(
        "auto_cleanup",
        expect.any(Number),
      );
    });

    it("should aggregate cleanup results", async () => {
      jest.useFakeTimers();

      const idleDevice = { ...mockDevice };
      const errorDevice = { ...mockDevice, id: "device-error", status: DeviceStatus.ERROR };
      const stoppedDevice = {
        ...mockDevice,
        id: "device-stopped",
        status: DeviceStatus.STOPPED,
      };

      deviceRepository.find
        .mockResolvedValueOnce([idleDevice]) // idle
        .mockResolvedValueOnce([errorDevice]) // error
        .mockResolvedValueOnce([stoppedDevice]); // stopped

      dockerService.listContainers.mockResolvedValue([]);
      dockerService.stopContainer.mockResolvedValue(undefined);
      dockerService.removeContainer.mockResolvedValue(undefined);
      dockerService.restartContainer.mockResolvedValue(undefined);
      dockerService.getContainerInfo.mockResolvedValue({ State: { Running: false } });
      adbService.disconnectFromDevice.mockResolvedValue(undefined);
      deviceRepository.save.mockImplementation((device) => Promise.resolve(device));
      eventBus.publish.mockResolvedValue(undefined);
      eventBus.publishDeviceEvent.mockResolvedValue(undefined);

      const cleanupPromise = service.performAutoCleanup();
      await jest.advanceTimersByTimeAsync(5000);
      const result = await cleanupPromise;

      expect(result.totalCleaned).toBe(3);
      expect(result.details.idleDevices).toBe(1);
      expect(result.details.errorDevices).toBe(1);
      expect(result.details.expiredDevices).toBe(1);
    });

    it("should handle global errors gracefully", async () => {
      deviceRepository.find.mockRejectedValue(new Error("Database error"));

      const result = await service.performAutoCleanup();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes("全局错误"))).toBe(true);
    });
  });

  describe("getCleanupStatistics", () => {
    it("should return cleanup candidates count", async () => {
      deviceRepository.count
        .mockResolvedValueOnce(5) // idle
        .mockResolvedValueOnce(2) // error
        .mockResolvedValueOnce(3); // stopped

      const result = await service.getCleanupStatistics();

      expect(result).toEqual({
        idleCandidates: 5,
        errorCandidates: 2,
        stoppedCandidates: 3,
      });
      expect(deviceRepository.count).toHaveBeenCalledTimes(3);
    });

    it("should use correct time thresholds", async () => {
      deviceRepository.count.mockResolvedValue(0);

      await service.getCleanupStatistics();

      const calls = (deviceRepository.count as jest.Mock).mock.calls;
      expect(calls[0][0].where.status).toBe(DeviceStatus.RUNNING);
      expect(calls[0][0].where.lastActiveAt).toBeDefined();
      expect(calls[1][0].where.status).toBe(DeviceStatus.ERROR);
      expect(calls[1][0].where.updatedAt).toBeDefined();
      expect(calls[2][0].where.status).toBe(DeviceStatus.STOPPED);
      expect(calls[2][0].where.updatedAt).toBeDefined();
    });
  });

  describe("triggerManualCleanup", () => {
    it("should trigger cleanup and return result", async () => {
      deviceRepository.find.mockResolvedValue([]);
      dockerService.listContainers.mockResolvedValue([]);

      const result = await service.triggerManualCleanup();

      expect(result).toBeDefined();
      expect(result).toMatchObject({
        totalScanned: 0,
        totalCleaned: 0,
        details: expect.any(Object),
        errors: expect.any(Array),
      });
    });
  });
});
