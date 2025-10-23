import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DevicesService } from '../devices.service';
import { Device, DeviceStatus } from '../../entities/device.entity';
import { DockerService } from '../../docker/docker.service';
import { AdbService } from '../../adb/adb.service';
import { PortManagerService } from '../../port-manager/port-manager.service';
import { EventBusService } from '@cloudphone/shared';
import { QuotaClientService } from '../../quota/quota-client.service';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';

describe('DevicesService', () => {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
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
          provide: QuotaClientService,
          useValue: mockQuotaClient,
        },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    deviceRepository = module.get<Repository<Device>>(getRepositoryToken(Device));
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

  describe('create', () => {
    const createDeviceDto: CreateDeviceDto = {
      userId: 'user-123',
      tenantId: 'tenant-456',
      name: 'Test Device',
      cpuCores: 2,
      memoryMB: 4096,
      storageMB: 32768,
      androidVersion: '11.0',
      resolution: '1080x1920',
      dpi: 320,
    };

    it('should successfully create a device with allocated ports', async () => {
      // Arrange
      const allocatedPorts = { adbPort: 5555, webrtcPort: 8080 };
      const savedDevice: Partial<Device> = {
        id: 'device-123',
        ...createDeviceDto,
        status: DeviceStatus.CREATING,
        adbPort: allocatedPorts.adbPort,
        adbHost: 'localhost',
        metadata: {
          webrtcPort: allocatedPorts.webrtcPort,
          createdBy: 'system',
        },
      };

      mockPortManager.allocatePorts.mockResolvedValue(allocatedPorts);
      mockDeviceRepository.create.mockReturnValue(savedDevice);
      mockDeviceRepository.save.mockResolvedValue(savedDevice);
      mockQuotaClient.reportDeviceUsage.mockResolvedValue(undefined);
      mockEventBus.publishDeviceEvent.mockResolvedValue(undefined);

      // Act
      const result = await service.create(createDeviceDto);

      // Assert
      expect(mockPortManager.allocatePorts).toHaveBeenCalled();
      expect(mockDeviceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDeviceDto,
          status: DeviceStatus.CREATING,
          adbPort: allocatedPorts.adbPort,
          adbHost: 'localhost',
        }),
      );
      expect(mockDeviceRepository.save).toHaveBeenCalledWith(savedDevice);
      expect(result).toEqual(savedDevice);
    });

    it('should report device usage to quota system', async () => {
      // Arrange
      const allocatedPorts = { adbPort: 5555, webrtcPort: 8080 };
      const savedDevice: Partial<Device> = {
        id: 'device-123',
        userId: 'user-123',
        cpuCores: 2,
        memoryMB: 4096,
        storageMB: 32768,
        status: DeviceStatus.CREATING,
      };

      mockPortManager.allocatePorts.mockResolvedValue(allocatedPorts);
      mockDeviceRepository.create.mockReturnValue(savedDevice);
      mockDeviceRepository.save.mockResolvedValue(savedDevice);
      mockQuotaClient.reportDeviceUsage.mockResolvedValue(undefined);
      mockEventBus.publishDeviceEvent.mockResolvedValue(undefined);

      // Act
      await service.create(createDeviceDto);

      // Assert
      expect(mockQuotaClient.reportDeviceUsage).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          deviceId: 'device-123',
          cpuCores: 2,
          memoryGB: 4,
          storageGB: 32,
          operation: 'increment',
        }),
      );
    });

    it('should publish device created event', async () => {
      // Arrange
      const allocatedPorts = { adbPort: 5555, webrtcPort: 8080 };
      const savedDevice: Partial<Device> = {
        id: 'device-123',
        userId: 'user-123',
        tenantId: 'tenant-456',
        name: 'Test Device',
        status: DeviceStatus.CREATING,
      };

      mockPortManager.allocatePorts.mockResolvedValue(allocatedPorts);
      mockDeviceRepository.create.mockReturnValue(savedDevice);
      mockDeviceRepository.save.mockResolvedValue(savedDevice);
      mockQuotaClient.reportDeviceUsage.mockResolvedValue(undefined);
      mockEventBus.publishDeviceEvent.mockResolvedValue(undefined);

      // Act
      await service.create(createDeviceDto);

      // Assert
      expect(mockEventBus.publishDeviceEvent).toHaveBeenCalledWith(
        'created',
        expect.objectContaining({
          deviceId: 'device-123',
          userId: 'user-123',
          deviceName: 'Test Device',
          status: DeviceStatus.CREATING,
          tenantId: 'tenant-456',
        }),
      );
    });

    it('should release ports when device creation fails', async () => {
      // Arrange
      const allocatedPorts = { adbPort: 5555, webrtcPort: 8080 };

      mockPortManager.allocatePorts.mockResolvedValue(allocatedPorts);
      mockDeviceRepository.create.mockImplementation(() => {
        throw new Error('Database error');
      });

      // Act & Assert
      await expect(service.create(createDeviceDto)).rejects.toThrow(
        'Database error',
      );
      expect(mockPortManager.releasePorts).toHaveBeenCalledWith(allocatedPorts);
    });

    it('should not throw when quota reporting fails', async () => {
      // Arrange
      const allocatedPorts = { adbPort: 5555, webrtcPort: 8080 };
      const savedDevice: Partial<Device> = {
        id: 'device-123',
        userId: 'user-123',
        cpuCores: 2,
        memoryMB: 4096,
        storageMB: 32768,
      };

      mockPortManager.allocatePorts.mockResolvedValue(allocatedPorts);
      mockDeviceRepository.create.mockReturnValue(savedDevice);
      mockDeviceRepository.save.mockResolvedValue(savedDevice);
      mockQuotaClient.reportDeviceUsage.mockRejectedValue(
        new Error('Quota service unavailable'),
      );
      mockEventBus.publishDeviceEvent.mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.create(createDeviceDto)).resolves.toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return paginated device list', async () => {
      // Arrange
      const devices: Partial<Device>[] = [
        { id: 'device-1', name: 'Device 1', userId: 'user-1' },
        { id: 'device-2', name: 'Device 2', userId: 'user-1' },
      ];

      mockDeviceRepository.findAndCount.mockResolvedValue([devices, 10]);

      // Act
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
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter by userId', async () => {
      // Arrange
      mockDeviceRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.findAll(1, 10, 'user-123');

      // Assert
      expect(mockDeviceRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter by status', async () => {
      // Arrange
      mockDeviceRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.findAll(1, 10, undefined, undefined, DeviceStatus.RUNNING);

      // Assert
      expect(mockDeviceRepository.findAndCount).toHaveBeenCalledWith({
        where: { status: DeviceStatus.RUNNING },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('should calculate correct pagination offset', async () => {
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

  describe('findOne', () => {
    it('should return device when found', async () => {
      // Arrange
      const device: Partial<Device> = {
        id: 'device-123',
        name: 'Test Device',
      };

      mockDeviceRepository.findOne.mockResolvedValue(device);

      // Act
      const result = await service.findOne('device-123');

      // Assert
      expect(result).toEqual(device);
      expect(mockDeviceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'device-123' },
      });
    });

    it('should throw NotFoundException when device not found', async () => {
      // Arrange
      mockDeviceRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        '设备 #non-existent-id 不存在',
      );
    });
  });

  describe('update', () => {
    it('should update device successfully', async () => {
      // Arrange
      const existingDevice: Partial<Device> = {
        id: 'device-123',
        name: 'Old Name',
        cpuCores: 2,
      };
      const updateDto: UpdateDeviceDto = {
        name: 'New Name',
      };
      const updatedDevice = { ...existingDevice, ...updateDto };

      mockDeviceRepository.findOne.mockResolvedValue(existingDevice);
      mockDeviceRepository.save.mockResolvedValue(updatedDevice);

      // Act
      const result = await service.update('device-123', updateDto);

      // Assert
      expect(result).toEqual(updatedDevice);
      expect(mockDeviceRepository.save).toHaveBeenCalledWith(
        expect.objectContaining(updateDto),
      );
    });

    it('should throw NotFoundException when updating non-existent device', async () => {
      // Arrange
      mockDeviceRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('non-existent-id', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should successfully remove device and clean up resources', async () => {
      // Arrange
      const device: Partial<Device> = {
        id: 'device-123',
        userId: 'user-123',
        containerId: 'container-123',
        adbPort: 5555,
        cpuCores: 2,
        memoryMB: 4096,
        storageMB: 32768,
        metadata: { webrtcPort: 8080 },
      };

      mockDeviceRepository.findOne.mockResolvedValue(device);
      mockQuotaClient.reportDeviceUsage.mockResolvedValue(undefined);
      mockAdbService.disconnectFromDevice.mockResolvedValue(undefined);
      mockDockerService.removeContainer.mockResolvedValue(undefined);
      mockDeviceRepository.save.mockResolvedValue({
        ...device,
        status: DeviceStatus.DELETED,
      });
      mockEventBus.publishDeviceEvent.mockResolvedValue(undefined);

      // Act
      await service.remove('device-123');

      // Assert
      expect(mockQuotaClient.reportDeviceUsage).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          deviceId: 'device-123',
          operation: 'decrement',
        }),
      );
      expect(mockAdbService.disconnectFromDevice).toHaveBeenCalledWith(
        'device-123',
      );
      expect(mockDockerService.removeContainer).toHaveBeenCalledWith(
        'container-123',
      );
      expect(mockPortManager.releasePorts).toHaveBeenCalledWith({
        adbPort: 5555,
        webrtcPort: 8080,
      });
      expect(mockEventBus.publishDeviceEvent).toHaveBeenCalledWith(
        'deleted',
        expect.objectContaining({
          deviceId: 'device-123',
          userId: 'user-123',
        }),
      );
    });

    it('should continue removal even when ADB disconnection fails', async () => {
      // Arrange
      const device: Partial<Device> = {
        id: 'device-123',
        userId: 'user-123',
        containerId: 'container-123',
        adbPort: 5555,
        cpuCores: 2,
        memoryMB: 4096,
        storageMB: 32768,
      };

      mockDeviceRepository.findOne.mockResolvedValue(device);
      mockQuotaClient.reportDeviceUsage.mockResolvedValue(undefined);
      mockAdbService.disconnectFromDevice.mockRejectedValue(
        new Error('ADB error'),
      );
      mockDockerService.removeContainer.mockResolvedValue(undefined);
      mockDeviceRepository.save.mockResolvedValue(device);
      mockEventBus.publishDeviceEvent.mockResolvedValue(undefined);

      // Act & Assert - should not throw
      await expect(service.remove('device-123')).resolves.toBeUndefined();
      expect(mockDockerService.removeContainer).toHaveBeenCalled();
    });

    it('should continue removal even when container removal fails', async () => {
      // Arrange
      const device: Partial<Device> = {
        id: 'device-123',
        userId: 'user-123',
        containerId: 'container-123',
        adbPort: 5555,
        cpuCores: 2,
        memoryMB: 4096,
        storageMB: 32768,
      };

      mockDeviceRepository.findOne.mockResolvedValue(device);
      mockQuotaClient.reportDeviceUsage.mockResolvedValue(undefined);
      mockAdbService.disconnectFromDevice.mockResolvedValue(undefined);
      mockDockerService.removeContainer.mockRejectedValue(
        new Error('Docker error'),
      );
      mockDeviceRepository.save.mockResolvedValue(device);
      mockEventBus.publishDeviceEvent.mockResolvedValue(undefined);

      // Act & Assert - should not throw
      await expect(service.remove('device-123')).resolves.toBeUndefined();
      expect(mockPortManager.releasePorts).toHaveBeenCalled();
    });
  });

  describe('start', () => {
    it('should successfully start a device', async () => {
      // Arrange
      const device: Partial<Device> = {
        id: 'device-123',
        userId: 'user-123',
        tenantId: 'tenant-456',
        containerId: 'container-123',
        adbHost: 'localhost',
        adbPort: 5555,
        status: DeviceStatus.STOPPED,
      };

      const startedDevice = {
        ...device,
        status: DeviceStatus.RUNNING,
        lastActiveAt: expect.any(Date),
      };

      mockDeviceRepository.findOne.mockResolvedValue(device);
      mockDockerService.startContainer.mockResolvedValue(undefined);
      mockDeviceRepository.save.mockResolvedValue(startedDevice);
      mockAdbService.connectToDevice.mockResolvedValue(undefined);
      mockQuotaClient.incrementConcurrentDevices.mockResolvedValue(undefined);
      mockEventBus.publishDeviceEvent.mockResolvedValue(undefined);

      // Act
      const result = await service.start('device-123');

      // Assert
      expect(mockDockerService.startContainer).toHaveBeenCalledWith(
        'container-123',
      );
      expect(mockAdbService.connectToDevice).toHaveBeenCalledWith(
        'device-123',
        'localhost',
        5555,
      );
      expect(mockQuotaClient.incrementConcurrentDevices).toHaveBeenCalledWith(
        'user-123',
      );
      expect(mockEventBus.publishDeviceEvent).toHaveBeenCalledWith(
        'started',
        expect.objectContaining({
          deviceId: 'device-123',
          userId: 'user-123',
        }),
      );
      expect(result.status).toBe(DeviceStatus.RUNNING);
    });

    it('should throw BadRequestException when device has no container', async () => {
      // Arrange
      const device: Partial<Device> = {
        id: 'device-123',
        containerId: null,
      };

      mockDeviceRepository.findOne.mockResolvedValue(device);

      // Act & Assert
      await expect(service.start('device-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.start('device-123')).rejects.toThrow(
        '设备没有关联的容器',
      );
    });

    it('should continue even when ADB connection fails', async () => {
      // Arrange
      const device: Partial<Device> = {
        id: 'device-123',
        userId: 'user-123',
        containerId: 'container-123',
        adbHost: 'localhost',
        adbPort: 5555,
      };

      mockDeviceRepository.findOne.mockResolvedValue(device);
      mockDockerService.startContainer.mockResolvedValue(undefined);
      mockDeviceRepository.save.mockResolvedValue(device);
      mockAdbService.connectToDevice.mockRejectedValue(
        new Error('ADB connection failed'),
      );
      mockQuotaClient.incrementConcurrentDevices.mockResolvedValue(undefined);
      mockEventBus.publishDeviceEvent.mockResolvedValue(undefined);

      // Act & Assert - should not throw
      await expect(service.start('device-123')).resolves.toBeDefined();
    });
  });

  describe('stop', () => {
    it('should successfully stop a running device', async () => {
      // Arrange
      const device: Partial<Device> = {
        id: 'device-123',
        userId: 'user-123',
        containerId: 'container-123',
        status: DeviceStatus.RUNNING,
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        lastActiveAt: new Date(Date.now() - 1800000), // 30 minutes ago
      };

      const stoppedDevice = {
        ...device,
        status: DeviceStatus.STOPPED,
      };

      mockDeviceRepository.findOne.mockResolvedValue(device);
      mockAdbService.disconnectFromDevice.mockResolvedValue(undefined);
      mockDockerService.stopContainer.mockResolvedValue(undefined);
      mockDeviceRepository.save.mockResolvedValue(stoppedDevice);
      mockQuotaClient.decrementConcurrentDevices.mockResolvedValue(undefined);
      mockEventBus.publishDeviceEvent.mockResolvedValue(undefined);

      // Act
      const result = await service.stop('device-123');

      // Assert
      expect(mockAdbService.disconnectFromDevice).toHaveBeenCalledWith(
        'device-123',
      );
      expect(mockDockerService.stopContainer).toHaveBeenCalledWith(
        'container-123',
      );
      expect(mockQuotaClient.decrementConcurrentDevices).toHaveBeenCalledWith(
        'user-123',
      );
      expect(mockEventBus.publishDeviceEvent).toHaveBeenCalledWith(
        'stopped',
        expect.objectContaining({
          deviceId: 'device-123',
          userId: 'user-123',
          duration: expect.any(Number),
        }),
      );
      expect(result.status).toBe(DeviceStatus.STOPPED);
    });

    it('should throw BadRequestException when device has no container', async () => {
      // Arrange
      const device: Partial<Device> = {
        id: 'device-123',
        containerId: null,
      };

      mockDeviceRepository.findOne.mockResolvedValue(device);

      // Act & Assert
      await expect(service.stop('device-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.stop('device-123')).rejects.toThrow(
        '设备没有关联的容器',
      );
    });

    it('should calculate correct duration', async () => {
      // Arrange
      const startTime = new Date(Date.now() - 7200000); // 2 hours ago
      const device: Partial<Device> = {
        id: 'device-123',
        userId: 'user-123',
        containerId: 'container-123',
        lastActiveAt: startTime,
        createdAt: new Date(),
      };

      mockDeviceRepository.findOne.mockResolvedValue(device);
      mockAdbService.disconnectFromDevice.mockResolvedValue(undefined);
      mockDockerService.stopContainer.mockResolvedValue(undefined);
      mockDeviceRepository.save.mockResolvedValue(device);
      mockQuotaClient.decrementConcurrentDevices.mockResolvedValue(undefined);
      mockEventBus.publishDeviceEvent.mockResolvedValue(undefined);

      // Act
      await service.stop('device-123');

      // Assert
      expect(mockEventBus.publishDeviceEvent).toHaveBeenCalledWith(
        'stopped',
        expect.objectContaining({
          duration: expect.any(Number),
        }),
      );

      const call = (mockEventBus.publishDeviceEvent as jest.Mock).mock.calls[0][1];
      // Duration should be approximately 7200 seconds (2 hours)
      expect(call.duration).toBeGreaterThan(7100);
      expect(call.duration).toBeLessThan(7300);
    });
  });
});
