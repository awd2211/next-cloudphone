import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpStatus } from '@nestjs/common';
import { BusinessException, BusinessErrors } from '@cloudphone/shared';
import { SnapshotsService } from '../snapshots.service';
import { DeviceSnapshot, SnapshotStatus } from '../../entities/device-snapshot.entity';
import { Device, DeviceStatus } from '../../entities/device.entity';
import { DockerService } from '../../docker/docker.service';
import { DevicesService } from '../../devices/devices.service';
import { PortManagerService } from '../../port-manager/port-manager.service';
import { CreateSnapshotDto } from '../dto/create-snapshot.dto';
import { RestoreSnapshotDto } from '../dto/restore-snapshot.dto';

describe('SnapshotsService', () => {
  let service: SnapshotsService;
  let snapshotRepository: jest.Mocked<Repository<DeviceSnapshot>>;
  let deviceRepository: jest.Mocked<Repository<Device>>;
  let dockerService: jest.Mocked<DockerService>;
  let devicesService: jest.Mocked<DevicesService>;
  let portManagerService: jest.Mocked<PortManagerService>;

  const mockUserId = 'user-123';
  const mockDeviceId = 'device-123';
  const mockContainerId = 'container-abc';
  const mockSnapshotId = 'snapshot-456';

  const mockDevice: Device = {
    id: mockDeviceId,
    name: 'TestDevice',
    containerId: mockContainerId,
    status: DeviceStatus.RUNNING,
    adbPort: 5555,
    cpuCores: 2,
    memoryMB: 4096,
    resolution: '1080x1920',
    androidVersion: '11',
  } as Device;

  const mockSnapshot: DeviceSnapshot = {
    id: mockSnapshotId,
    name: 'Test Snapshot',
    description: 'Test description',
    deviceId: mockDeviceId,
    status: SnapshotStatus.READY,
    imageId: 'img-123',
    imageName: 'cloudphone-snapshot:snapshot-456',
    imageSize: 1000000000,
    metadata: {
      deviceName: 'TestDevice',
      cpuCores: 2,
      memoryMB: 4096,
      resolution: '1080x1920',
      androidVersion: '11',
    },
    version: 1,
    tags: ['production'],
    createdBy: mockUserId,
    isCompressed: false,
    restoreCount: 0,
    isAutoBackup: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    device: mockDevice,
  } as DeviceSnapshot;

  // Mock Docker container
  const mockContainer = {
    id: mockContainerId,
    commit: jest.fn().mockResolvedValue({ Id: 'img-123' }),
    start: jest.fn().mockResolvedValue(undefined),
  };

  // Mock Docker image
  const mockImage = {
    Id: 'img-123',
    inspect: jest.fn().mockResolvedValue({ Size: 1000000000 }),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  // Mock Docker instance
  const mockDocker = {
    getContainer: jest.fn().mockReturnValue(mockContainer),
    getImage: jest.fn().mockReturnValue(mockImage),
    createContainer: jest.fn().mockResolvedValue(mockContainer),
  };

  beforeEach(async () => {
    const mockSnapshotRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockDeviceRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const mockDockerService = {
      removeContainer: jest.fn(),
      docker: mockDocker,
    };

    const mockDevicesService = {
      stop: jest.fn(),
    };

    const mockPortManagerService = {
      allocatePorts: jest.fn().mockResolvedValue({ adbPort: 5556 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SnapshotsService,
        {
          provide: getRepositoryToken(DeviceSnapshot),
          useValue: mockSnapshotRepository,
        },
        {
          provide: getRepositoryToken(Device),
          useValue: mockDeviceRepository,
        },
        {
          provide: DockerService,
          useValue: mockDockerService,
        },
        {
          provide: DevicesService,
          useValue: mockDevicesService,
        },
        {
          provide: PortManagerService,
          useValue: mockPortManagerService,
        },
      ],
    }).compile();

    service = module.get<SnapshotsService>(SnapshotsService);
    snapshotRepository = module.get(getRepositoryToken(DeviceSnapshot));
    deviceRepository = module.get(getRepositoryToken(Device));
    dockerService = module.get(DockerService);
    devicesService = module.get(DevicesService);
    portManagerService = module.get(PortManagerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSnapshot', () => {
    const createDto: CreateSnapshotDto = {
      name: 'Snapshot 1',
      description: 'Test snapshot',
      tags: ['test'],
    };

    it('should create a snapshot successfully', async () => {
      const creatingSnapshot = { ...mockSnapshot, status: SnapshotStatus.CREATING };
      deviceRepository.findOne.mockResolvedValue(mockDevice);
      snapshotRepository.create.mockReturnValue(creatingSnapshot);
      snapshotRepository.save.mockResolvedValue(creatingSnapshot);

      const result = await service.createSnapshot(mockDeviceId, createDto, mockUserId);

      expect(deviceRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockDeviceId },
      });
      expect(snapshotRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createDto.name,
          description: createDto.description,
          deviceId: mockDeviceId,
          status: SnapshotStatus.CREATING,
          tags: createDto.tags,
          createdBy: mockUserId,
        })
      );
      expect(snapshotRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(SnapshotStatus.CREATING);
    });

    it('should throw error if device not found', async () => {
      deviceRepository.findOne.mockResolvedValue(null);

      await expect(service.createSnapshot(mockDeviceId, createDto, mockUserId)).rejects.toThrow();
    });

    it('should throw error if device is not running', async () => {
      const stoppedDevice = { ...mockDevice, status: DeviceStatus.STOPPED };
      deviceRepository.findOne.mockResolvedValue(stoppedDevice);

      await expect(service.createSnapshot(mockDeviceId, createDto, mockUserId)).rejects.toThrow(
        BusinessException
      );
    });

    it('should include custom metadata in snapshot', async () => {
      const customMetadata = { appVersion: '1.0.0', environment: 'prod' };
      const dtoWithMetadata = { ...createDto, metadata: customMetadata };

      deviceRepository.findOne.mockResolvedValue(mockDevice);
      snapshotRepository.create.mockReturnValue(mockSnapshot);
      snapshotRepository.save.mockResolvedValue(mockSnapshot);

      await service.createSnapshot(mockDeviceId, dtoWithMetadata, mockUserId);

      expect(snapshotRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining(customMetadata),
        })
      );
    });
  });

  describe('restoreSnapshot', () => {
    const restoreDto: RestoreSnapshotDto = {
      replaceOriginal: false,
      deviceName: 'Restored Device',
    };

    it('should restore snapshot to new device', async () => {
      snapshotRepository.findOne.mockResolvedValue(mockSnapshot);
      dockerService['docker'].getImage = jest.fn().mockReturnValue(mockImage);
      dockerService['docker'].createContainer = jest.fn().mockResolvedValue(mockContainer);
      portManagerService.allocatePorts.mockResolvedValue({ adbPort: 5556 });
      deviceRepository.create.mockReturnValue({ ...mockDevice, id: 'new-device-id' } as Device);
      deviceRepository.save.mockResolvedValue({ ...mockDevice, id: 'new-device-id' } as Device);

      const result = await service.restoreSnapshot(mockSnapshotId, restoreDto, mockUserId);

      expect(snapshotRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSnapshotId },
        relations: ['device'],
      });
      expect(deviceRepository.create).toHaveBeenCalled();
      expect(result.id).toBe('new-device-id');
      expect(snapshotRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          restoreCount: 1,
        })
      );
    });

    it('should throw error if snapshot not found', async () => {
      snapshotRepository.findOne.mockResolvedValue(null);

      await expect(
        service.restoreSnapshot(mockSnapshotId, restoreDto, mockUserId)
      ).rejects.toThrow();
    });

    it('should throw error if snapshot is not ready', async () => {
      const creatingSnapshot = { ...mockSnapshot, status: SnapshotStatus.CREATING };
      snapshotRepository.findOne.mockResolvedValue(creatingSnapshot);

      await expect(
        service.restoreSnapshot(mockSnapshotId, restoreDto, mockUserId)
      ).rejects.toThrow();
    });

    it('should throw error if Docker image does not exist', async () => {
      snapshotRepository.findOne.mockResolvedValue(mockSnapshot);
      dockerService['docker'].getImage = jest.fn().mockReturnValue({
        inspect: jest.fn().mockRejectedValue(new Error('Image not found')),
      });

      await expect(service.restoreSnapshot(mockSnapshotId, restoreDto, mockUserId)).rejects.toThrow(
        BusinessException
      );
    });

    it('should replace original device if replaceOriginal is true', async () => {
      const replaceDto = { ...restoreDto, replaceOriginal: true };
      snapshotRepository.findOne.mockResolvedValue(mockSnapshot);
      dockerService['docker'].getImage = jest.fn().mockReturnValue(mockImage);
      dockerService['docker'].createContainer = jest.fn().mockResolvedValue(mockContainer);
      devicesService.stop.mockResolvedValue(undefined);
      dockerService.removeContainer.mockResolvedValue(undefined);
      deviceRepository.save.mockResolvedValue(mockDevice);

      const result = await service.restoreSnapshot(mockSnapshotId, replaceDto, mockUserId);

      expect(devicesService.stop).toHaveBeenCalledWith(mockDeviceId);
      expect(dockerService.removeContainer).toHaveBeenCalledWith(mockContainerId);
      expect(result.id).toBe(mockDeviceId);
    });

    it('should increment restore count', async () => {
      const freshSnapshot = { ...mockSnapshot, restoreCount: 0 };
      snapshotRepository.findOne.mockResolvedValue(freshSnapshot);
      dockerService['docker'].getImage = jest.fn().mockReturnValue(mockImage);
      dockerService['docker'].createContainer = jest.fn().mockResolvedValue(mockContainer);
      portManagerService.allocatePorts.mockResolvedValue({ adbPort: 5556 });
      deviceRepository.create.mockReturnValue(mockDevice);
      deviceRepository.save.mockResolvedValue(mockDevice);
      snapshotRepository.save.mockResolvedValue({ ...freshSnapshot, restoreCount: 1 });

      await service.restoreSnapshot(mockSnapshotId, restoreDto, mockUserId);

      // Check that save was called with incremented count
      const saveCall = (snapshotRepository.save as jest.Mock).mock.calls.find(
        (call) => call[0].restoreCount === 1
      );
      expect(saveCall).toBeDefined();
      expect(saveCall[0]).toMatchObject({
        restoreCount: 1,
        status: SnapshotStatus.READY,
      });
    });
  });

  describe('compressSnapshot', () => {
    it('should compress snapshot successfully', async () => {
      snapshotRepository.findOne.mockResolvedValue(mockSnapshot);
      snapshotRepository.save.mockResolvedValue({
        ...mockSnapshot,
        isCompressed: true,
      });

      // Mock execAsync (actual compression would be tested in integration tests)
      jest.spyOn(service as any, 'compressSnapshot').mockResolvedValue({
        ...mockSnapshot,
        isCompressed: true,
        compressedSize: 500000000,
      });

      const result = await service.compressSnapshot(mockSnapshotId);

      expect(result.isCompressed).toBe(true);
    });

    it('should throw error if snapshot not found', async () => {
      snapshotRepository.findOne.mockResolvedValue(null);

      await expect(service.compressSnapshot(mockSnapshotId)).rejects.toThrow();
    });

    it('should skip compression if already compressed', async () => {
      const compressedSnapshot = { ...mockSnapshot, isCompressed: true };
      snapshotRepository.findOne.mockResolvedValue(compressedSnapshot);

      const result = await service.compressSnapshot(mockSnapshotId);

      expect(result.isCompressed).toBe(true);
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete snapshot successfully', async () => {
      snapshotRepository.findOne.mockResolvedValue(mockSnapshot);
      dockerService['docker'].getImage = jest.fn().mockReturnValue(mockImage);
      snapshotRepository.remove.mockResolvedValue(mockSnapshot);

      await service.deleteSnapshot(mockSnapshotId, mockUserId);

      expect(mockImage.remove).toHaveBeenCalledWith({ force: true });
      expect(snapshotRepository.remove).toHaveBeenCalledWith(mockSnapshot);
    });

    it('should throw error if snapshot not found', async () => {
      snapshotRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteSnapshot(mockSnapshotId, mockUserId)).rejects.toThrow();
    });

    it('should throw error if user is not the owner', async () => {
      snapshotRepository.findOne.mockResolvedValue(mockSnapshot);

      await expect(service.deleteSnapshot(mockSnapshotId, 'different-user')).rejects.toThrow(
        BusinessException
      );
    });

    it('should handle Docker image deletion failure gracefully', async () => {
      snapshotRepository.findOne.mockResolvedValue(mockSnapshot);
      dockerService['docker'].getImage = jest.fn().mockReturnValue({
        remove: jest.fn().mockRejectedValue(new Error('Image not found')),
      });
      snapshotRepository.remove.mockResolvedValue(mockSnapshot);

      // Should not throw, just log warning
      await expect(service.deleteSnapshot(mockSnapshotId, mockUserId)).resolves.not.toThrow();

      expect(snapshotRepository.remove).toHaveBeenCalledWith(mockSnapshot);
    });
  });

  describe('findByDevice', () => {
    it('should return all snapshots for a device', async () => {
      const snapshots = [mockSnapshot, { ...mockSnapshot, id: 'snapshot-2' }];
      snapshotRepository.find.mockResolvedValue(snapshots);

      const result = await service.findByDevice(mockDeviceId);

      expect(snapshotRepository.find).toHaveBeenCalledWith({
        where: { deviceId: mockDeviceId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('findByUser', () => {
    it('should return all snapshots created by user', async () => {
      const snapshots = [mockSnapshot, { ...mockSnapshot, id: 'snapshot-2' }];
      snapshotRepository.find.mockResolvedValue(snapshots);

      const result = await service.findByUser(mockUserId);

      expect(snapshotRepository.find).toHaveBeenCalledWith({
        where: { createdBy: mockUserId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('should return snapshot with relations', async () => {
      snapshotRepository.findOne.mockResolvedValue(mockSnapshot);

      const result = await service.findOne(mockSnapshotId);

      expect(snapshotRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSnapshotId },
        relations: ['device'],
      });
      expect(result.id).toBe(mockSnapshotId);
    });

    it('should throw error if snapshot not found', async () => {
      snapshotRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockSnapshotId)).rejects.toThrow();
    });

    it('should check user permission when userId is provided', async () => {
      snapshotRepository.findOne.mockResolvedValue(mockSnapshot);

      const result = await service.findOne(mockSnapshotId, mockUserId);

      expect(result.createdBy).toBe(mockUserId);
    });

    it('should throw error if user is not the owner', async () => {
      snapshotRepository.findOne.mockResolvedValue(mockSnapshot);

      await expect(service.findOne(mockSnapshotId, 'different-user')).rejects.toThrow();
    });
  });

  describe('getStatistics', () => {
    it('should return statistics for all snapshots', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: 'ready', count: '8' },
          { status: 'creating', count: '2' },
        ]),
        getRawOne: jest.fn().mockResolvedValue({ totalSize: '5000000000' }),
      };

      snapshotRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getStatistics();

      expect(result.total).toBe(10);
      expect(result.byStatus).toHaveLength(2);
      expect(result.totalSize).toBe(5000000000);
    });

    it('should filter statistics by userId when provided', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ status: 'ready', count: '5' }]),
        getRawOne: jest.fn().mockResolvedValue({ totalSize: '2000000000' }),
      };

      snapshotRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getStatistics(mockUserId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('snapshot.createdBy = :userId', {
        userId: mockUserId,
      });
      expect(result.total).toBe(5);
    });
  });
});
