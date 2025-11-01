import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { BusinessException, BusinessErrorCode } from '@cloudphone/shared';
import { DevicesService } from '../devices.service';
import { DeviceProviderFactory } from '../../providers/device-provider.factory';
import { IDeviceProvider } from '../../providers/device-provider.interface';
import { Device, DeviceProviderType } from '../../entities/device.entity';

/**
 * DevicesService 高级功能测试
 * 测试应用操作和快照管理功能
 */
describe('DevicesService - Advanced Features', () => {
  let service: DevicesService;
  let providerFactory: jest.Mocked<DeviceProviderFactory>;
  let mockProvider: jest.Mocked<IDeviceProvider>;

  const mockDeviceId = 'device-123';
  const mockExternalId = 'external-abc';
  const mockPackageName = 'com.example.app';
  const mockSnapshotId = 'snapshot-456';
  const mockSnapshotName = 'test-snapshot';

  beforeEach(async () => {
    // 创建 mock provider
    mockProvider = {
      getCapabilities: jest.fn().mockReturnValue({
        supportsAppOperation: true,
        supportsSnapshot: true,
      }),
      startApp: jest.fn().mockResolvedValue(undefined),
      stopApp: jest.fn().mockResolvedValue(undefined),
      clearAppData: jest.fn().mockResolvedValue(undefined),
      createSnapshot: jest.fn().mockResolvedValue(mockSnapshotId),
      restoreSnapshot: jest.fn().mockResolvedValue(undefined),
      listSnapshots: jest.fn().mockResolvedValue([
        {
          id: mockSnapshotId,
          name: mockSnapshotName,
          deviceId: mockDeviceId,
          createdAt: '2025-11-01T10:00:00Z',
          status: 'available',
        },
      ]),
      deleteSnapshot: jest.fn().mockResolvedValue(undefined),
    } as any;

    // 创建 mock provider factory
    providerFactory = {
      getProvider: jest.fn().mockReturnValue(mockProvider),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: DevicesService,
          useValue: {
            findOne: jest.fn(),
            startApp: jest.fn(),
            stopApp: jest.fn(),
            clearAppData: jest.fn(),
            createSnapshot: jest.fn(),
            restoreSnapshot: jest.fn(),
            listSnapshots: jest.fn(),
            deleteSnapshot: jest.fn(),
            providerFactory,
          },
        },
        {
          provide: DeviceProviderFactory,
          useValue: providerFactory,
        },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  describe('startApp', () => {
    it('应该成功启动应用', async () => {
      const mockDevice: Partial<Device> = {
        id: mockDeviceId,
        externalId: mockExternalId,
        providerType: DeviceProviderType.ALIYUN_ECP,
      };

      // Mock findOne 方法
      jest.spyOn(service, 'findOne').mockResolvedValue(mockDevice as Device);

      // Mock startApp 实现
      jest.spyOn(service, 'startApp').mockImplementation(async (deviceId, packageName) => {
        const device = await service.findOne(deviceId);

        if (!device.externalId) {
          throw new BusinessException(
            BusinessErrorCode.DEVICE_NOT_AVAILABLE,
            '设备缺少 externalId',
            HttpStatus.BAD_REQUEST,
          );
        }

        const provider = providerFactory.getProvider(device.providerType);
        const capabilities = provider.getCapabilities();

        if (!capabilities.supportsAppOperation) {
          throw new BusinessException(
            BusinessErrorCode.OPERATION_NOT_SUPPORTED,
            '设备 Provider 不支持应用操作',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (!provider.startApp) {
          throw new BusinessException(
            BusinessErrorCode.OPERATION_NOT_SUPPORTED,
            '设备 Provider 未实现 startApp 方法',
            HttpStatus.BAD_REQUEST,
          );
        }

        await provider.startApp(device.externalId, packageName);
      });

      await service.startApp(mockDeviceId, mockPackageName);

      expect(service.findOne).toHaveBeenCalledWith(mockDeviceId);
      expect(providerFactory.getProvider).toHaveBeenCalledWith(DeviceProviderType.ALIYUN_ECP);
      expect(mockProvider.getCapabilities).toHaveBeenCalled();
      expect(mockProvider.startApp).toHaveBeenCalledWith(mockExternalId, mockPackageName);
    });

    it('设备缺少 externalId 时应该抛出异常', async () => {
      const mockDevice: Partial<Device> = {
        id: mockDeviceId,
        externalId: null,
        providerType: DeviceProviderType.ALIYUN_ECP,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDevice as Device);
      jest.spyOn(service, 'startApp').mockImplementation(async (deviceId) => {
        const device = await service.findOne(deviceId);

        if (!device.externalId) {
          throw new BusinessException(
            BusinessErrorCode.DEVICE_NOT_AVAILABLE,
            '设备缺少 externalId',
            HttpStatus.BAD_REQUEST,
          );
        }
      });

      await expect(service.startApp(mockDeviceId, mockPackageName)).rejects.toThrow(
        BusinessException,
      );
    });

    it('Provider 不支持应用操作时应该抛出异常', async () => {
      const mockDevice: Partial<Device> = {
        id: mockDeviceId,
        externalId: mockExternalId,
        providerType: DeviceProviderType.HUAWEI_CPH,
      };

      const unsupportedProvider = {
        ...mockProvider,
        getCapabilities: jest.fn().mockReturnValue({
          supportsAppOperation: false,
        }),
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDevice as Device);
      providerFactory.getProvider.mockReturnValue(unsupportedProvider as any);

      jest.spyOn(service, 'startApp').mockImplementation(async (deviceId) => {
        const device = await service.findOne(deviceId);
        const provider = providerFactory.getProvider(device.providerType);
        const capabilities = provider.getCapabilities();

        if (!capabilities.supportsAppOperation) {
          throw new BusinessException(
            BusinessErrorCode.OPERATION_NOT_SUPPORTED,
            '设备 Provider 不支持应用操作',
            HttpStatus.BAD_REQUEST,
          );
        }
      });

      await expect(service.startApp(mockDeviceId, mockPackageName)).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('stopApp', () => {
    it('应该成功停止应用', async () => {
      const mockDevice: Partial<Device> = {
        id: mockDeviceId,
        externalId: mockExternalId,
        providerType: DeviceProviderType.ALIYUN_ECP,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDevice as Device);
      jest.spyOn(service, 'stopApp').mockImplementation(async (deviceId, packageName) => {
        const device = await service.findOne(deviceId);
        const provider = providerFactory.getProvider(device.providerType);
        await provider.stopApp!(device.externalId!, packageName);
      });

      await service.stopApp(mockDeviceId, mockPackageName);

      expect(service.findOne).toHaveBeenCalledWith(mockDeviceId);
      expect(mockProvider.stopApp).toHaveBeenCalledWith(mockExternalId, mockPackageName);
    });
  });

  describe('clearAppData', () => {
    it('应该成功清除应用数据', async () => {
      const mockDevice: Partial<Device> = {
        id: mockDeviceId,
        externalId: mockExternalId,
        providerType: DeviceProviderType.ALIYUN_ECP,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDevice as Device);
      jest.spyOn(service, 'clearAppData').mockImplementation(async (deviceId, packageName) => {
        const device = await service.findOne(deviceId);
        const provider = providerFactory.getProvider(device.providerType);
        await provider.clearAppData!(device.externalId!, packageName);
      });

      await service.clearAppData(mockDeviceId, mockPackageName);

      expect(service.findOne).toHaveBeenCalledWith(mockDeviceId);
      expect(mockProvider.clearAppData).toHaveBeenCalledWith(mockExternalId, mockPackageName);
    });
  });

  describe('createSnapshot', () => {
    it('应该成功创建快照', async () => {
      const mockDevice: Partial<Device> = {
        id: mockDeviceId,
        externalId: mockExternalId,
        providerType: DeviceProviderType.ALIYUN_ECP,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDevice as Device);
      jest.spyOn(service, 'createSnapshot').mockImplementation(
        async (deviceId, name, description) => {
          const device = await service.findOne(deviceId);
          const provider = providerFactory.getProvider(device.providerType);
          return await provider.createSnapshot!(device.externalId!, name, description);
        },
      );

      const result = await service.createSnapshot(mockDeviceId, mockSnapshotName, 'Test description');

      expect(result).toBe(mockSnapshotId);
      expect(service.findOne).toHaveBeenCalledWith(mockDeviceId);
      expect(mockProvider.createSnapshot).toHaveBeenCalledWith(
        mockExternalId,
        mockSnapshotName,
        'Test description',
      );
    });

    it('Provider 不支持快照时应该抛出异常', async () => {
      const mockDevice: Partial<Device> = {
        id: mockDeviceId,
        externalId: mockExternalId,
        providerType: DeviceProviderType.REDROID,
      };

      const unsupportedProvider = {
        ...mockProvider,
        getCapabilities: jest.fn().mockReturnValue({
          supportsSnapshot: false,
        }),
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDevice as Device);
      providerFactory.getProvider.mockReturnValue(unsupportedProvider as any);

      jest.spyOn(service, 'createSnapshot').mockImplementation(async (deviceId) => {
        const device = await service.findOne(deviceId);
        const provider = providerFactory.getProvider(device.providerType);
        const capabilities = provider.getCapabilities();

        if (!capabilities.supportsSnapshot) {
          throw new BusinessException(
            BusinessErrorCode.OPERATION_NOT_SUPPORTED,
            '设备 Provider 不支持快照功能',
            HttpStatus.BAD_REQUEST,
          );
        }
      });

      await expect(
        service.createSnapshot(mockDeviceId, mockSnapshotName),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('restoreSnapshot', () => {
    it('应该成功恢复快照', async () => {
      const mockDevice: Partial<Device> = {
        id: mockDeviceId,
        externalId: mockExternalId,
        providerType: DeviceProviderType.ALIYUN_ECP,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDevice as Device);
      jest.spyOn(service, 'restoreSnapshot').mockImplementation(
        async (deviceId, snapshotId) => {
          const device = await service.findOne(deviceId);
          const provider = providerFactory.getProvider(device.providerType);
          await provider.restoreSnapshot!(device.externalId!, snapshotId);
        },
      );

      await service.restoreSnapshot(mockDeviceId, mockSnapshotId);

      expect(service.findOne).toHaveBeenCalledWith(mockDeviceId);
      expect(mockProvider.restoreSnapshot).toHaveBeenCalledWith(mockExternalId, mockSnapshotId);
    });
  });

  describe('listSnapshots', () => {
    it('应该成功获取快照列表', async () => {
      const mockDevice: Partial<Device> = {
        id: mockDeviceId,
        externalId: mockExternalId,
        providerType: DeviceProviderType.ALIYUN_ECP,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDevice as Device);
      jest.spyOn(service, 'listSnapshots').mockImplementation(async (deviceId) => {
        const device = await service.findOne(deviceId);
        const provider = providerFactory.getProvider(device.providerType);
        return await provider.listSnapshots!(device.externalId!);
      });

      const result = await service.listSnapshots(mockDeviceId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockSnapshotId);
      expect(result[0].name).toBe(mockSnapshotName);
      expect(service.findOne).toHaveBeenCalledWith(mockDeviceId);
      expect(mockProvider.listSnapshots).toHaveBeenCalledWith(mockExternalId);
    });
  });

  describe('deleteSnapshot', () => {
    it('应该成功删除快照', async () => {
      const mockDevice: Partial<Device> = {
        id: mockDeviceId,
        externalId: mockExternalId,
        providerType: DeviceProviderType.ALIYUN_ECP,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDevice as Device);
      jest.spyOn(service, 'deleteSnapshot').mockImplementation(
        async (deviceId, snapshotId) => {
          const device = await service.findOne(deviceId);
          const provider = providerFactory.getProvider(device.providerType);
          await provider.deleteSnapshot!(device.externalId!, snapshotId);
        },
      );

      await service.deleteSnapshot(mockDeviceId, mockSnapshotId);

      expect(service.findOne).toHaveBeenCalledWith(mockDeviceId);
      expect(mockProvider.deleteSnapshot).toHaveBeenCalledWith(mockExternalId, mockSnapshotId);
    });
  });
});
