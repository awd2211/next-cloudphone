import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import {
  FailoverService,
  FailureType,
  MigrationStrategy,
  FailureDetectionResult,
} from "../failover.service";
import { Device, DeviceStatus } from "../../entities/device.entity";
import {
  DeviceSnapshot,
  SnapshotStatus,
} from "../../entities/device-snapshot.entity";
import { DockerService } from "../../docker/docker.service";
import { SnapshotsService } from "../../snapshots/snapshots.service";
import { PortManagerService } from "../../port-manager/port-manager.service";
import { EventBusService } from "@cloudphone/shared";
import { RetryService } from "../../common/retry.service";

describe("FailoverService", () => {
  let service: FailoverService;
  let deviceRepository: jest.Mocked<Repository<Device>>;
  let snapshotRepository: jest.Mocked<Repository<DeviceSnapshot>>;
  let dockerService: jest.Mocked<DockerService>;
  let snapshotsService: jest.Mocked<SnapshotsService>;
  let portManagerService: jest.Mocked<PortManagerService>;
  let eventBusService: jest.Mocked<EventBusService>;
  let retryService: jest.Mocked<RetryService>;
  let configService: jest.Mocked<ConfigService>;

  const mockDevice: Device = {
    id: "device-123",
    name: "TestDevice",
    userId: "user-123",
    tenantId: "tenant-1",
    containerId: "container-abc",
    status: DeviceStatus.RUNNING,
    adbHost: "localhost",
    adbPort: 5555,
    cpuCores: 2,
    memoryMB: 4096,
    storageMB: 8192,
    resolution: "1080x1920",
    dpi: 420,
    androidVersion: "11",
    lastActiveAt: new Date(),
    lastHeartbeatAt: new Date(),
    updatedAt: new Date(),
    metadata: {},
  } as Device;

  const mockSnapshot: DeviceSnapshot = {
    id: "snapshot-123",
    deviceId: "device-123",
    name: "Test Snapshot",
    status: SnapshotStatus.READY,
    createdAt: new Date(),
  } as DeviceSnapshot;

  const mockContainerInfo = {
    State: {
      Running: true,
      Status: "running",
      Dead: false,
    },
    Id: "container-abc",
  };

  beforeEach(async () => {
    const mockDeviceRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      })),
    };

    const mockSnapshotRepository = {
      findOne: jest.fn(),
    };

    const mockDockerService = {
      getContainerInfo: jest.fn(),
      restartContainer: jest.fn(),
      stopContainer: jest.fn(),
      removeContainer: jest.fn(),
      createContainer: jest.fn(),
    };

    const mockSnapshotsService = {
      restoreSnapshot: jest.fn(),
    };

    const mockPortManagerService = {
      allocatePorts: jest.fn(),
    };

    const mockEventBusService = {
      publishDeviceEvent: jest.fn(),
    };

    const mockRetryService = {
      executeWithRetry: jest.fn((fn) => fn()),
    };

    const mockConfigService = {
      get: jest.fn((key, defaultValue) => {
        const config = {
          FAILOVER_ENABLED: true,
          FAILOVER_HEARTBEAT_TIMEOUT_MINUTES: 10,
          FAILOVER_MAX_CONSECUTIVE_FAILURES: 3,
          FAILOVER_AUTO_RECREATE_ENABLED: true,
          FAILOVER_SNAPSHOT_RECOVERY_ENABLED: true,
          FAILOVER_MAX_RECOVERY_ATTEMPTS: 3,
          FAILOVER_COOLDOWN_MINUTES: 15,
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FailoverService,
        {
          provide: getRepositoryToken(Device),
          useValue: mockDeviceRepository,
        },
        {
          provide: getRepositoryToken(DeviceSnapshot),
          useValue: mockSnapshotRepository,
        },
        {
          provide: DockerService,
          useValue: mockDockerService,
        },
        {
          provide: SnapshotsService,
          useValue: mockSnapshotsService,
        },
        {
          provide: PortManagerService,
          useValue: mockPortManagerService,
        },
        {
          provide: EventBusService,
          useValue: mockEventBusService,
        },
        {
          provide: RetryService,
          useValue: mockRetryService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FailoverService>(FailoverService);
    deviceRepository = module.get(getRepositoryToken(Device));
    snapshotRepository = module.get(getRepositoryToken(DeviceSnapshot));
    dockerService = module.get(DockerService);
    snapshotsService = module.get(SnapshotsService);
    portManagerService = module.get(PortManagerService);
    eventBusService = module.get(EventBusService);
    retryService = module.get(RetryService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with default config", () => {
      const config = service.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.heartbeatTimeoutMinutes).toBe(10);
      expect(config.maxConsecutiveFailures).toBe(3);
      expect(config.autoRecreateEnabled).toBe(true);
    });
  });

  describe("Failure Detection", () => {
    it("should detect heartbeat timeout failures", async () => {
      const oldHeartbeat = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
      const timeoutDevice = { ...mockDevice, lastHeartbeatAt: oldHeartbeat };

      // Mock the full query builder chain
      const mockGetMany = jest.fn().mockResolvedValue([timeoutDevice]);
      const mockAndWhere = jest.fn().mockReturnValue({ getMany: mockGetMany });
      const mockWhere = jest.fn().mockReturnValue({ andWhere: mockAndWhere });
      const mockQueryBuilder = { where: mockWhere };

      deviceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const failures = await service["detectHeartbeatTimeouts"]();

      expect(failures).toHaveLength(1);
      expect(failures[0].failureType).toBe(FailureType.HEARTBEAT_TIMEOUT);
      expect(failures[0].severity).toBe("high");
      expect(failures[0].deviceId).toBe("device-123");
    });

    it("should detect dead container failures", async () => {
      const deadContainerInfo = {
        State: { Status: "exited", Dead: true, ExitCode: 1 },
      };

      deviceRepository.find.mockResolvedValue([mockDevice]);
      dockerService.getContainerInfo.mockResolvedValue(deadContainerInfo);

      const failures = await service["detectContainerFailures"]();

      expect(failures).toHaveLength(1);
      expect(failures[0].failureType).toBe(FailureType.CONTAINER_DEAD);
      expect(failures[0].severity).toBe("critical");
    });

    it("should detect unhealthy container failures", async () => {
      const unhealthyContainerInfo = {
        State: {
          Running: true,
          Status: "running",
          Health: {
            Status: "unhealthy",
            Log: [{ ExitCode: 1, Output: "Health check failed" }],
          },
        },
      };

      deviceRepository.find.mockResolvedValue([mockDevice]);
      dockerService.getContainerInfo.mockResolvedValue(unhealthyContainerInfo);

      const failures = await service["detectContainerFailures"]();

      expect(failures).toHaveLength(1);
      expect(failures[0].failureType).toBe(FailureType.CONTAINER_UNHEALTHY);
      expect(failures[0].severity).toBe("high");
    });

    it("should detect missing container as failure", async () => {
      deviceRepository.find.mockResolvedValue([mockDevice]);
      dockerService.getContainerInfo.mockRejectedValue(new Error("Container not found"));

      const failures = await service["detectContainerFailures"]();

      expect(failures).toHaveLength(1);
      expect(failures[0].failureType).toBe(FailureType.CONTAINER_DEAD);
      expect(failures[0].severity).toBe("critical");
    });

    it("should detect error state devices", async () => {
      const errorDevice = { ...mockDevice, status: DeviceStatus.ERROR };
      deviceRepository.find.mockResolvedValue([errorDevice]);

      const failures = await service["detectErrorDevices"]();

      expect(failures).toHaveLength(1);
      expect(failures[0].failureType).toBe(FailureType.HIGH_ERROR_RATE);
      expect(failures[0].severity).toBe("medium");
    });
  });

  describe("Recovery Strategy Selection", () => {
    it("should choose restart strategy for unhealthy containers", () => {
      const failure: FailureDetectionResult = {
        deviceId: "device-123",
        failureType: FailureType.CONTAINER_UNHEALTHY,
        severity: "high",
        details: "Container unhealthy",
        timestamp: new Date(),
      };

      const strategy = service["determineRecoveryStrategy"](failure, mockDevice);

      expect(strategy).toBe(MigrationStrategy.RESTART_CONTAINER);
    });

    it("should choose snapshot restore when enabled and available", () => {
      const failure: FailureDetectionResult = {
        deviceId: "device-123",
        failureType: FailureType.CONTAINER_DEAD,
        severity: "critical",
        details: "Container dead",
        timestamp: new Date(),
      };

      service.updateConfig({ snapshotRecoveryEnabled: true });

      const strategy = service["determineRecoveryStrategy"](failure, mockDevice);

      expect(strategy).toBe(MigrationStrategy.RESTORE_FROM_SNAPSHOT);
    });

    it("should choose recreate as fallback strategy", () => {
      const failure: FailureDetectionResult = {
        deviceId: "device-123",
        failureType: FailureType.CONTAINER_DEAD,
        severity: "critical",
        details: "Container dead",
        timestamp: new Date(),
      };

      service.updateConfig({ snapshotRecoveryEnabled: false });

      const strategy = service["determineRecoveryStrategy"](failure, mockDevice);

      expect(strategy).toBe(MigrationStrategy.RECREATE);
    });
  });

  describe("Container Restart Recovery", () => {
    it("should successfully restart container", async () => {
      deviceRepository.findOne.mockResolvedValue(mockDevice);
      dockerService.restartContainer.mockResolvedValue(undefined);
      deviceRepository.save.mockImplementation((device) => Promise.resolve(device));

      const result = await service["restartContainer"](mockDevice);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe(MigrationStrategy.RESTART_CONTAINER);
      expect(dockerService.restartContainer).toHaveBeenCalledWith("container-abc");

      const savedDevice = deviceRepository.save.mock.calls[0][0];
      expect(savedDevice.status).toBe(DeviceStatus.RUNNING);
    });

    it("should handle restart failures", async () => {
      dockerService.restartContainer.mockRejectedValue(new Error("Restart failed"));

      const result = await service["restartContainer"](mockDevice);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Restart failed");
    });
  });

  describe("Snapshot Restore Recovery", () => {
    it("should successfully restore from snapshot", async () => {
      snapshotRepository.findOne.mockResolvedValue(mockSnapshot);
      dockerService.stopContainer.mockResolvedValue(undefined);
      dockerService.removeContainer.mockResolvedValue(undefined);
      snapshotsService.restoreSnapshot.mockResolvedValue({
        ...mockDevice,
        containerId: "new-container-123",
      });

      const result = await service["restoreFromSnapshot"](mockDevice);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe(MigrationStrategy.RESTORE_FROM_SNAPSHOT);
      expect(result.newContainerId).toBe("new-container-123");
      expect(snapshotsService.restoreSnapshot).toHaveBeenCalledWith(
        "snapshot-123",
        { replaceOriginal: true },
        "user-123",
      );
    });

    it("should fallback to recreate when no snapshot available", async () => {
      snapshotRepository.findOne.mockResolvedValue(null);
      dockerService.removeContainer.mockResolvedValue(undefined);
      portManagerService.allocatePorts.mockResolvedValue({
        adbPort: 5556,
        webrtcPort: 8080,
      });
      dockerService.createContainer.mockResolvedValue({ id: "new-container-456" });
      deviceRepository.save.mockImplementation((device) => Promise.resolve(device));

      const result = await service["restoreFromSnapshot"](mockDevice);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe(MigrationStrategy.RECREATE);
      expect(dockerService.createContainer).toHaveBeenCalled();
    });

    it("should handle snapshot restore errors", async () => {
      snapshotRepository.findOne.mockResolvedValue(mockSnapshot);
      snapshotsService.restoreSnapshot.mockRejectedValue(new Error("Restore failed"));

      const result = await service["restoreFromSnapshot"](mockDevice);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Restore failed");
    });
  });

  describe("Device Recreate Recovery", () => {
    it("should successfully recreate device", async () => {
      dockerService.removeContainer.mockResolvedValue(undefined);
      portManagerService.allocatePorts.mockResolvedValue({
        adbPort: 5557,
        webrtcPort: 8081,
      });
      dockerService.createContainer.mockResolvedValue({ id: "new-container-789" });
      deviceRepository.save.mockImplementation((device) => Promise.resolve(device));

      const result = await service["recreateDevice"](mockDevice);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe(MigrationStrategy.RECREATE);
      expect(result.newContainerId).toBe("new-container-789");

      const savedDevice = deviceRepository.save.mock.calls[0][0];
      expect(savedDevice.containerId).toBe("new-container-789");
      expect(savedDevice.adbPort).toBe(5557);
      expect(savedDevice.status).toBe(DeviceStatus.RUNNING);
    });

    it("should handle recreate failures and mark device as ERROR", async () => {
      dockerService.removeContainer.mockResolvedValue(undefined);
      portManagerService.allocatePorts.mockRejectedValue(new Error("No ports available"));
      deviceRepository.save.mockImplementation((device) => Promise.resolve(device));

      const result = await service["recreateDevice"](mockDevice);

      expect(result.success).toBe(false);
      expect(result.error).toContain("No ports available");

      const savedDevice = deviceRepository.save.mock.calls[0][0];
      expect(savedDevice.status).toBe(DeviceStatus.ERROR);
    });
  });

  describe("Failure Handling Logic", () => {
    it("should skip recovery for devices in cooldown period", async () => {
      const failure: FailureDetectionResult = {
        deviceId: "device-123",
        failureType: FailureType.CONTAINER_DEAD,
        severity: "critical",
        details: "Container dead",
        timestamp: new Date(),
      };

      // Set last migration time to 5 minutes ago (within 15-minute cooldown)
      service["lastMigrationTime"].set("device-123", new Date(Date.now() - 5 * 60 * 1000));

      await service["handleDeviceFailure"](failure);

      expect(deviceRepository.findOne).not.toHaveBeenCalled();
    });

    it("should mark device as permanently failed after max consecutive failures", async () => {
      const failure: FailureDetectionResult = {
        deviceId: "device-123",
        failureType: FailureType.CONTAINER_DEAD,
        severity: "critical",
        details: "Container dead",
        timestamp: new Date(),
      };

      // Record 3 failures (max)
      service["recordFailure"](failure);
      service["recordFailure"](failure);
      service["recordFailure"](failure);

      deviceRepository.update.mockResolvedValue(undefined as any);
      eventBusService.publishDeviceEvent.mockResolvedValue(undefined);

      await service["handleDeviceFailure"](failure);

      expect(deviceRepository.update).toHaveBeenCalledWith(
        { id: "device-123" },
        { status: DeviceStatus.ERROR },
      );
      expect(eventBusService.publishDeviceEvent).toHaveBeenCalledWith(
        "permanent_failure",
        expect.any(Object),
      );
    });

    it("should publish recovery success event", async () => {
      const failure: FailureDetectionResult = {
        deviceId: "device-123",
        failureType: FailureType.CONTAINER_UNHEALTHY,
        severity: "high",
        details: "Container unhealthy",
        timestamp: new Date(),
      };

      deviceRepository.findOne.mockResolvedValue(mockDevice);
      dockerService.restartContainer.mockResolvedValue(undefined);
      deviceRepository.save.mockImplementation((device) => Promise.resolve(device));
      eventBusService.publishDeviceEvent.mockResolvedValue(undefined);

      await service["handleDeviceFailure"](failure);

      expect(eventBusService.publishDeviceEvent).toHaveBeenCalledWith(
        "recovery_success",
        expect.objectContaining({
          deviceId: "device-123",
          failureType: FailureType.CONTAINER_UNHEALTHY,
          strategy: MigrationStrategy.RESTART_CONTAINER,
        }),
      );

      // Failure history should be cleared on success
      expect(service.getFailureHistory("device-123").size).toBe(0);
    });

    it("should publish recovery failed event", async () => {
      const failure: FailureDetectionResult = {
        deviceId: "device-123",
        failureType: FailureType.CONTAINER_DEAD,
        severity: "critical",
        details: "Container dead",
        timestamp: new Date(),
      };

      deviceRepository.findOne.mockResolvedValue(mockDevice);
      snapshotRepository.findOne.mockResolvedValue(null);
      dockerService.createContainer.mockRejectedValue(new Error("Create failed"));
      deviceRepository.save.mockImplementation((device) => Promise.resolve(device));
      eventBusService.publishDeviceEvent.mockResolvedValue(undefined);

      await service["handleDeviceFailure"](failure);

      expect(eventBusService.publishDeviceEvent).toHaveBeenCalledWith(
        "recovery_failed",
        expect.objectContaining({
          deviceId: "device-123",
          error: expect.any(String),
        }),
      );
    });
  });

  describe("Manual Recovery", () => {
    it("should trigger manual recovery for a device", async () => {
      // Need to mock both findOne calls (one in triggerManualRecovery, one in recoverDevice)
      deviceRepository.findOne.mockResolvedValue(mockDevice);
      snapshotRepository.findOne.mockResolvedValue(mockSnapshot);
      dockerService.stopContainer.mockResolvedValue(undefined);
      dockerService.removeContainer.mockResolvedValue(undefined);
      snapshotsService.restoreSnapshot.mockResolvedValue({
        ...mockDevice,
        containerId: "new-container-123",
      });

      const result = await service.triggerManualRecovery("device-123");

      expect(result.success).toBe(true);
      expect(result.deviceId).toBe("device-123");
      expect(deviceRepository.findOne).toHaveBeenCalledWith({
        where: { id: "device-123" },
      });
    });

    it("should throw error for non-existent device", async () => {
      deviceRepository.findOne.mockResolvedValue(null);

      await expect(service.triggerManualRecovery("non-existent")).rejects.toThrow(
        "Device non-existent not found",
      );
    });
  });

  describe("Failure History Management", () => {
    it("should record failure history", () => {
      const failure: FailureDetectionResult = {
        deviceId: "device-123",
        failureType: FailureType.CONTAINER_DEAD,
        severity: "critical",
        details: "Container dead",
        timestamp: new Date(),
      };

      service["recordFailure"](failure);

      const history = service.getFailureHistory("device-123");
      expect(history.size).toBe(1);
      expect(history.get("device-123")).toHaveLength(1);
    });

    it("should limit failure history to 10 entries per device", () => {
      const failure: FailureDetectionResult = {
        deviceId: "device-123",
        failureType: FailureType.HEARTBEAT_TIMEOUT,
        severity: "high",
        details: "Timeout",
        timestamp: new Date(),
      };

      for (let i = 0; i < 15; i++) {
        service["recordFailure"](failure);
      }

      const history = service.getFailureHistory("device-123");
      expect(history.get("device-123")!.length).toBe(10);
    });

    it("should get consecutive failure count", () => {
      const failure: FailureDetectionResult = {
        deviceId: "device-123",
        failureType: FailureType.CONTAINER_DEAD,
        severity: "critical",
        details: "Dead",
        timestamp: new Date(),
      };

      service["recordFailure"](failure);
      service["recordFailure"](failure);
      service["recordFailure"](failure);

      const count = service["getConsecutiveFailures"]("device-123");
      expect(count).toBe(3);
    });
  });

  describe("Configuration Management", () => {
    it("should update configuration", () => {
      service.updateConfig({
        heartbeatTimeoutMinutes: 20,
        maxConsecutiveFailures: 5,
      });

      const config = service.getConfig();
      expect(config.heartbeatTimeoutMinutes).toBe(20);
      expect(config.maxConsecutiveFailures).toBe(5);
    });
  });

  describe("Statistics", () => {
    it("should calculate failover statistics correctly", () => {
      // Add some failure history
      service["recordFailure"]({
        deviceId: "device-1",
        failureType: FailureType.CONTAINER_DEAD,
        severity: "critical",
        details: "Dead",
        timestamp: new Date(),
      });

      service["recordFailure"]({
        deviceId: "device-2",
        failureType: FailureType.HEARTBEAT_TIMEOUT,
        severity: "high",
        details: "Timeout",
        timestamp: new Date(),
      });

      // Add migration history
      service["migrationHistory"].push({
        success: true,
        deviceId: "device-1",
        strategy: MigrationStrategy.RESTART_CONTAINER,
        duration: 5000,
        recoveryAttempts: 1,
      });

      service["migrationHistory"].push({
        success: false,
        deviceId: "device-2",
        strategy: MigrationStrategy.RECREATE,
        duration: 10000,
        error: "Failed",
        recoveryAttempts: 2,
      });

      const stats = service.getStatistics();

      expect(stats.totalFailures).toBe(2);
      expect(stats.activeFailures).toBe(2);
      expect(stats.totalMigrations).toBe(2);
      expect(stats.successfulMigrations).toBe(1);
      expect(stats.failedMigrations).toBe(1);
      expect(stats.averageRecoveryTime).toBe(7500);
      expect(stats.failuresByType[FailureType.CONTAINER_DEAD]).toBe(1);
      expect(stats.failuresByType[FailureType.HEARTBEAT_TIMEOUT]).toBe(1);
      expect(stats.migrationsByStrategy[MigrationStrategy.RESTART_CONTAINER]).toBe(1);
      expect(stats.migrationsByStrategy[MigrationStrategy.RECREATE]).toBe(1);
    });
  });

  describe("Cooldown Management", () => {
    it("should detect cooldown period correctly", () => {
      const deviceId = "device-123";

      // Set last migration to 5 minutes ago (within 15-minute cooldown)
      service["lastMigrationTime"].set(deviceId, new Date(Date.now() - 5 * 60 * 1000));

      const inCooldown = service["isInCooldown"](deviceId);
      expect(inCooldown).toBe(true);
    });

    it("should allow recovery after cooldown period", () => {
      const deviceId = "device-123";

      // Set last migration to 20 minutes ago (beyond 15-minute cooldown)
      service["lastMigrationTime"].set(deviceId, new Date(Date.now() - 20 * 60 * 1000));

      const inCooldown = service["isInCooldown"](deviceId);
      expect(inCooldown).toBe(false);
    });

    it("should allow recovery when no previous migration", () => {
      const inCooldown = service["isInCooldown"]("new-device");
      expect(inCooldown).toBe(false);
    });
  });
});
