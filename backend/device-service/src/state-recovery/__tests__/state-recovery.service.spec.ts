import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
import {
  StateRecoveryService,
  StateInconsistencyType,
  StateInconsistency,
  OperationRecord,
} from "../state-recovery.service";
import { Device, DeviceStatus } from "../../entities/device.entity";
import { DockerService } from "../../docker/docker.service";
import { EventBusService } from "@cloudphone/shared";

describe("StateRecoveryService", () => {
  let service: StateRecoveryService;
  let deviceRepository: jest.Mocked<Repository<Device>>;
  let dockerService: jest.Mocked<DockerService>;
  let eventBusService: jest.Mocked<EventBusService>;
  let dataSource: jest.Mocked<DataSource>;
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
    lastActiveAt: new Date(),
    updatedAt: new Date(),
    metadata: {},
  } as Device;

  const mockContainerInfo = {
    State: {
      Running: true,
      Status: "running",
    },
    Id: "container-abc",
  };

  beforeEach(async () => {
    const mockDeviceRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    };

    const mockDockerService = {
      listContainers: jest.fn(),
      getContainerInfo: jest.fn(),
      removeContainer: jest.fn(),
    };

    const mockEventBusService = {
      publish: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key, defaultValue) => {
        const config = {
          STATE_RECOVERY_ENABLED: true,
          STATE_RECOVERY_AUTO_HEAL_ENABLED: true,
          STATE_RECOVERY_RECORD_OPERATIONS: true,
          STATE_RECOVERY_MAX_OPERATION_HISTORY: 1000,
          STATE_RECOVERY_CHECK_INTERVAL_MINUTES: 15,
        };
        return config[key] ?? defaultValue;
      }),
    };

    const mockDataSource = {
      transaction: jest.fn((callback) => callback(mockEntityManager)),
    };

    const mockEntityManager = {
      getRepository: jest.fn(() => mockDeviceRepository),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StateRecoveryService,
        {
          provide: getRepositoryToken(Device),
          useValue: mockDeviceRepository,
        },
        {
          provide: DockerService,
          useValue: mockDockerService,
        },
        {
          provide: EventBusService,
          useValue: mockEventBusService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<StateRecoveryService>(StateRecoveryService);
    deviceRepository = module.get(getRepositoryToken(Device));
    dockerService = module.get(DockerService);
    eventBusService = module.get(EventBusService);
    configService = module.get(ConfigService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with default config", () => {
      const config = service.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.autoHealEnabled).toBe(true);
      expect(config.recordOperations).toBe(true);
      expect(config.maxOperationHistory).toBe(1000);
    });

    it("should load config from ConfigService", () => {
      expect(configService.get).toHaveBeenCalledWith("STATE_RECOVERY_ENABLED", true);
      expect(configService.get).toHaveBeenCalledWith(
        "STATE_RECOVERY_AUTO_HEAL_ENABLED",
        true,
      );
    });
  });

  describe("Inconsistency Detection", () => {
    it("should detect status mismatch between database and Docker", async () => {
      const runningDevice = { ...mockDevice, status: DeviceStatus.RUNNING };
      deviceRepository.find.mockResolvedValue([runningDevice]);
      dockerService.getContainerInfo.mockResolvedValue({
        State: { Running: false, Status: "exited" },
      });
      dockerService.listContainers.mockResolvedValue([]);

      const inconsistencies = await service["detectInconsistencies"]();

      expect(inconsistencies.length).toBeGreaterThan(0);
      expect(inconsistencies[0].type).toBe(StateInconsistencyType.STATUS_MISMATCH);
      expect(inconsistencies[0].severity).toBe("high");
      expect(inconsistencies[0].autoFixable).toBe(true);
    });

    it("should detect missing containers", async () => {
      const deviceWithContainer = { ...mockDevice, status: DeviceStatus.RUNNING };
      deviceRepository.find.mockResolvedValue([deviceWithContainer]);
      dockerService.getContainerInfo.mockRejectedValue(new Error("Container not found"));
      dockerService.listContainers.mockResolvedValue([]);

      const inconsistencies = await service["detectInconsistencies"]();

      expect(inconsistencies.length).toBeGreaterThan(0);
      expect(inconsistencies[0].type).toBe(StateInconsistencyType.MISSING_CONTAINER);
      expect(inconsistencies[0].severity).toBe("critical");
    });

    it("should detect orphaned containers", async () => {
      const orphanedContainer = {
        Id: "orphan-123",
        Names: ["/cloudphone-orphan"],
        Labels: { "com.cloudphone.managed": "true" },
      };

      deviceRepository.find.mockResolvedValue([]);
      dockerService.listContainers.mockResolvedValue([orphanedContainer]);

      const inconsistencies = await service["detectInconsistencies"]();

      const orphanedInconsistency = inconsistencies.find(
        (inc) => inc.type === StateInconsistencyType.ORPHANED_CONTAINER,
      );

      expect(orphanedInconsistency).toBeDefined();
      expect(orphanedInconsistency?.containerId).toBe("orphan-123");
      expect(orphanedInconsistency?.severity).toBe("medium");
    });

    it("should handle Docker API errors gracefully", async () => {
      deviceRepository.find.mockResolvedValue([mockDevice]);
      dockerService.getContainerInfo.mockRejectedValue(new Error("Docker API error"));
      dockerService.listContainers.mockRejectedValue(new Error("List failed"));

      await expect(service["detectInconsistencies"]()).resolves.toBeDefined();
    });
  });

  describe("Auto-Healing", () => {
    it("should heal status mismatch by updating database", async () => {
      const inconsistency: StateInconsistency = {
        type: StateInconsistencyType.STATUS_MISMATCH,
        deviceId: "device-123",
        containerId: "container-abc",
        expectedState: { status: DeviceStatus.RUNNING },
        actualState: { status: "exited", running: false },
        severity: "high",
        details: "Database says running but container is stopped",
        timestamp: new Date(),
        autoFixable: true,
      };

      deviceRepository.findOne.mockResolvedValue(mockDevice);
      deviceRepository.save.mockImplementation((device) => Promise.resolve(device));
      eventBusService.publish.mockResolvedValue(undefined);

      const result = await service["autoHeal"](inconsistency);

      expect(result.success).toBe(true);
      expect(result.action).toContain("Updated database status");
      expect(deviceRepository.save).toHaveBeenCalled();
      expect(eventBusService.publish).toHaveBeenCalledWith(
        "cloudphone.events",
        "state.self_healing_success",
        expect.any(Object),
      );
    });

    it("should heal missing container by marking device as ERROR", async () => {
      const inconsistency: StateInconsistency = {
        type: StateInconsistencyType.MISSING_CONTAINER,
        deviceId: "device-123",
        containerId: "container-abc",
        expectedState: { containerExists: true },
        actualState: { containerExists: false },
        severity: "critical",
        details: "Container not found",
        timestamp: new Date(),
        autoFixable: true,
      };

      deviceRepository.findOne.mockResolvedValue(mockDevice);
      deviceRepository.save.mockImplementation((device) => Promise.resolve(device));
      eventBusService.publish.mockResolvedValue(undefined);

      const result = await service["autoHeal"](inconsistency);

      expect(result.success).toBe(true);
      expect(result.action).toContain("Marked device as ERROR");

      const savedDevice = deviceRepository.save.mock.calls[0][0];
      expect(savedDevice.status).toBe(DeviceStatus.ERROR);
      expect(savedDevice.metadata.lastError).toBe("Container missing");
    });

    it("should heal orphaned container by removing it", async () => {
      const inconsistency: StateInconsistency = {
        type: StateInconsistencyType.ORPHANED_CONTAINER,
        containerId: "orphan-123",
        expectedState: { inDatabase: true },
        actualState: { inDatabase: false },
        severity: "medium",
        details: "Orphaned container",
        timestamp: new Date(),
        autoFixable: true,
      };

      dockerService.removeContainer.mockResolvedValue(undefined);
      eventBusService.publish.mockResolvedValue(undefined);

      const result = await service["autoHeal"](inconsistency);

      expect(result.success).toBe(true);
      expect(result.action).toContain("Removed orphaned container");
      expect(dockerService.removeContainer).toHaveBeenCalledWith("orphan-123");
    });

    it("should handle auto-healing failures", async () => {
      const inconsistency: StateInconsistency = {
        type: StateInconsistencyType.STATUS_MISMATCH,
        deviceId: "device-123",
        containerId: "container-abc",
        expectedState: {},
        actualState: {},
        severity: "high",
        details: "Mismatch",
        timestamp: new Date(),
        autoFixable: true,
      };

      deviceRepository.findOne.mockRejectedValue(new Error("Database error"));
      eventBusService.publish.mockResolvedValue(undefined);

      const result = await service["autoHeal"](inconsistency);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(eventBusService.publish).toHaveBeenCalledWith(
        "cloudphone.events",
        "state.self_healing_failed",
        expect.any(Object),
      );
    });
  });

  describe("Operation Recording", () => {
    it("should record operation with generated ID", () => {
      const operation = {
        operationType: "update",
        entityType: "device",
        entityId: "device-123",
        beforeState: { status: DeviceStatus.RUNNING },
        afterState: { status: DeviceStatus.STOPPED },
        executedBy: "user-123",
        rollbackable: true,
      };

      const operationId = service.recordOperation(operation);

      expect(operationId).toBeDefined();
      expect(operationId).toMatch(/^op_/);

      const history = service.getOperationHistory();
      expect(history).toHaveLength(1);
      expect(history[0].entityId).toBe("device-123");
    });

    it("should limit operation history size", () => {
      service.updateConfig({ maxOperationHistory: 5 });

      for (let i = 0; i < 10; i++) {
        service.recordOperation({
          operationType: "update",
          entityType: "device",
          entityId: `device-${i}`,
          beforeState: {},
          afterState: {},
          executedBy: "test",
          rollbackable: true,
        });
      }

      const history = service.getOperationHistory();
      expect(history.length).toBeLessThanOrEqual(5);
    });

    it("should filter operation history by entity ID", () => {
      service.recordOperation({
        operationType: "update",
        entityType: "device",
        entityId: "device-1",
        beforeState: {},
        afterState: {},
        executedBy: "test",
        rollbackable: true,
      });

      service.recordOperation({
        operationType: "update",
        entityType: "device",
        entityId: "device-2",
        beforeState: {},
        afterState: {},
        executedBy: "test",
        rollbackable: true,
      });

      const filteredHistory = service.getOperationHistory("device-1");
      expect(filteredHistory).toHaveLength(1);
      expect(filteredHistory[0].entityId).toBe("device-1");
    });

    it("should not record operations when disabled", () => {
      service.updateConfig({ recordOperations: false });

      const operationId = service.recordOperation({
        operationType: "update",
        entityType: "device",
        entityId: "device-123",
        beforeState: {},
        afterState: {},
        executedBy: "test",
        rollbackable: true,
      });

      expect(operationId).toBe("");
      expect(service.getOperationHistory()).toHaveLength(0);
    });
  });

  describe("Rollback Operations", () => {
    it("should rollback device update operation", async () => {
      const operationId = service.recordOperation({
        operationType: "update",
        entityType: "device",
        entityId: "device-123",
        beforeState: { status: DeviceStatus.RUNNING, name: "OldName" },
        afterState: { status: DeviceStatus.STOPPED, name: "NewName" },
        executedBy: "user-123",
        rollbackable: true,
      });

      deviceRepository.update.mockResolvedValue(undefined as any);
      eventBusService.publish.mockResolvedValue(undefined);

      const result = await service.rollbackOperation(operationId);

      expect(result.success).toBe(true);
      expect(result.operationId).toBe(operationId);
      expect(deviceRepository.update).toHaveBeenCalledWith(
        { id: "device-123" },
        expect.objectContaining({ status: DeviceStatus.RUNNING, name: "OldName" }),
      );
      expect(eventBusService.publish).toHaveBeenCalledWith(
        "cloudphone.events",
        "state.rollback_success",
        expect.any(Object),
      );
    });

    it("should restore deleted device", async () => {
      const operationId = service.recordOperation({
        operationType: "delete",
        entityType: "device",
        entityId: "device-123",
        beforeState: {
          name: "DeletedDevice",
          status: DeviceStatus.RUNNING,
          userId: "user-123",
        },
        afterState: null,
        executedBy: "user-123",
        rollbackable: true,
      });

      deviceRepository.create.mockImplementation((data) => data as Device);
      deviceRepository.save.mockImplementation((device) => Promise.resolve(device));
      eventBusService.publish.mockResolvedValue(undefined);

      const result = await service.rollbackOperation(operationId);

      expect(result.success).toBe(true);
      expect(deviceRepository.create).toHaveBeenCalled();
      expect(deviceRepository.save).toHaveBeenCalled();
    });

    it("should reject rollback for non-existent operation", async () => {
      const result = await service.rollbackOperation("non-existent-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Operation not found");
    });

    it("should reject rollback for already rolled back operation", async () => {
      const operationId = service.recordOperation({
        operationType: "update",
        entityType: "device",
        entityId: "device-123",
        beforeState: {},
        afterState: {},
        executedBy: "user-123",
        rollbackable: true,
      });

      deviceRepository.update.mockResolvedValue(undefined as any);
      eventBusService.publish.mockResolvedValue(undefined);

      // First rollback
      await service.rollbackOperation(operationId);

      // Second rollback attempt
      const result = await service.rollbackOperation(operationId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Operation already rolled back");
    });

    it("should reject rollback for non-rollbackable operation", async () => {
      const operationId = service.recordOperation({
        operationType: "create",
        entityType: "device",
        entityId: "device-123",
        beforeState: null,
        afterState: {},
        executedBy: "user-123",
        rollbackable: false, // Not rollbackable
      });

      const result = await service.rollbackOperation(operationId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Operation is not rollbackable");
    });

    it("should handle rollback transaction failures", async () => {
      const operationId = service.recordOperation({
        operationType: "update",
        entityType: "device",
        entityId: "device-123",
        beforeState: {},
        afterState: {},
        executedBy: "user-123",
        rollbackable: true,
      });

      dataSource.transaction.mockRejectedValue(new Error("Transaction failed"));

      const result = await service.rollbackOperation(operationId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Transaction failed");
    });
  });

  describe("Configuration Management", () => {
    it("should update configuration", () => {
      service.updateConfig({
        autoHealEnabled: false,
        maxOperationHistory: 500,
      });

      const config = service.getConfig();
      expect(config.autoHealEnabled).toBe(false);
      expect(config.maxOperationHistory).toBe(500);
    });

    it("should preserve other config values when updating", () => {
      service.updateConfig({ autoHealEnabled: false });

      const config = service.getConfig();
      expect(config.enabled).toBe(true); // Unchanged
      expect(config.autoHealEnabled).toBe(false); // Updated
    });
  });

  describe("Statistics", () => {
    it("should calculate statistics correctly", () => {
      // Record some operations
      service.recordOperation({
        operationType: "update",
        entityType: "device",
        entityId: "device-1",
        beforeState: {},
        afterState: {},
        executedBy: "test",
        rollbackable: true,
      });

      service.recordOperation({
        operationType: "delete",
        entityType: "device",
        entityId: "device-2",
        beforeState: {},
        afterState: {},
        executedBy: "test",
        rollbackable: false,
      });

      // Record some inconsistencies
      service["recordInconsistency"]({
        type: StateInconsistencyType.STATUS_MISMATCH,
        deviceId: "device-1",
        expectedState: {},
        actualState: {},
        severity: "high",
        details: "Test",
        timestamp: new Date(),
        autoFixable: true,
      });

      service["recordInconsistency"]({
        type: StateInconsistencyType.MISSING_CONTAINER,
        deviceId: "device-2",
        expectedState: {},
        actualState: {},
        severity: "critical",
        details: "Test",
        timestamp: new Date(),
        autoFixable: true,
      });

      const stats = service.getStatistics();

      expect(stats.totalOperations).toBe(2);
      expect(stats.rollbackableOperations).toBe(1);
      expect(stats.totalInconsistencies).toBe(2);
      expect(stats.inconsistenciesByType[StateInconsistencyType.STATUS_MISMATCH]).toBe(1);
      expect(stats.inconsistenciesByType[StateInconsistencyType.MISSING_CONTAINER]).toBe(1);
    });

    it("should count recent inconsistencies", () => {
      // Add old inconsistency (2 hours ago)
      const oldInconsistency: StateInconsistency = {
        type: StateInconsistencyType.STATUS_MISMATCH,
        deviceId: "device-old",
        expectedState: {},
        actualState: {},
        severity: "high",
        details: "Old",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        autoFixable: true,
      };

      service["recordInconsistency"](oldInconsistency);

      // Add recent inconsistency
      service["recordInconsistency"]({
        type: StateInconsistencyType.MISSING_CONTAINER,
        deviceId: "device-recent",
        expectedState: {},
        actualState: {},
        severity: "critical",
        details: "Recent",
        timestamp: new Date(),
        autoFixable: true,
      });

      const stats = service.getStatistics();
      expect(stats.recentInconsistencies).toBe(1); // Only recent one
      expect(stats.totalInconsistencies).toBe(2); // All
    });
  });

  describe("Consistency Check Cron", () => {
    it("should perform consistency check when enabled", async () => {
      deviceRepository.find.mockResolvedValue([mockDevice]);
      dockerService.getContainerInfo.mockResolvedValue(mockContainerInfo);
      dockerService.listContainers.mockResolvedValue([]);
      eventBusService.publish.mockResolvedValue(undefined);

      await service.performConsistencyCheck();

      expect(deviceRepository.find).toHaveBeenCalled();
      expect(dockerService.listContainers).toHaveBeenCalled();
    });

    it("should skip consistency check when disabled", async () => {
      service.updateConfig({ enabled: false });

      await service.performConsistencyCheck();

      expect(deviceRepository.find).not.toHaveBeenCalled();
    });

    it("should handle consistency check errors gracefully", async () => {
      deviceRepository.find.mockRejectedValue(new Error("Database error"));

      await expect(service.performConsistencyCheck()).resolves.not.toThrow();
    });
  });
});
