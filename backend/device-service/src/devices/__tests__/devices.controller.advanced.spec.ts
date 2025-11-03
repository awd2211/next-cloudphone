import { Test, TestingModule } from '@nestjs/testing';
import { DevicesController } from '../devices.controller';
import { DevicesService } from '../devices.service';
import { DeviceDeletionSaga } from '../deletion.saga';
import { PermissionGuard } from '@cloudphone/shared';
import { QuotaGuard } from '../../quota/quota.guard';
import { QuotaClientService } from '../../quota/quota-client.service';
import { Reflector } from '@nestjs/core';
import { StartAppDto, StopAppDto, ClearAppDataDto } from '../dto/app-operations.dto';
import { CreateSnapshotDto, RestoreSnapshotDto } from '../dto/app-operations.dto';

/**
 * DevicesController 高级功能测试
 * 测试应用操作和快照管理端点
 */
describe('DevicesController - Advanced Features', () => {
  let controller: DevicesController;
  let service: jest.Mocked<DevicesService>;

  const mockDeviceId = 'device-123';
  const mockPackageName = 'com.example.app';
  const mockSnapshotId = 'snapshot-456';
  const mockSnapshotName = 'test-snapshot';

  beforeEach(async () => {
    // 创建 mock service
    const mockDevicesService = {
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
    };

    const mockDeletionSaga = {
      startDeletion: jest.fn().mockResolvedValue({ sagaId: 'saga-123' }),
      getSagaStatus: jest.fn().mockResolvedValue({ status: 'completed' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [
        {
          provide: DevicesService,
          useValue: mockDevicesService,
        },
        {
          provide: DeviceDeletionSaga,
          useValue: mockDeletionSaga,
        },
        {
          provide: QuotaClientService,
          useValue: {
            checkQuota: jest.fn().mockResolvedValue({ allowed: true }),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAll: jest.fn(),
            getAllAndOverride: jest.fn(),
            getAllAndMerge: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true }) // Mock permission guard
      .overrideGuard(QuotaGuard)
      .useValue({ canActivate: () => true }) // Mock quota guard
      .compile();

    controller = module.get<DevicesController>(DevicesController);
    service = module.get(DevicesService) as jest.Mocked<DevicesService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /devices/:id/apps/start - 启动应用', () => {
    it('应该成功启动应用', async () => {
      const dto: StartAppDto = { packageName: mockPackageName };

      const result = await controller.startApp(mockDeviceId, dto);

      expect(service.startApp).toHaveBeenCalledWith(mockDeviceId, mockPackageName);
      expect(result).toEqual({
        success: true,
        message: `应用 ${mockPackageName} 启动成功`,
      });
    });

    it('service 抛出异常时应该传播异常', async () => {
      const dto: StartAppDto = { packageName: mockPackageName };
      const error = new Error('设备不支持应用操作');
      service.startApp.mockRejectedValue(error);

      await expect(controller.startApp(mockDeviceId, dto)).rejects.toThrow(error);
      expect(service.startApp).toHaveBeenCalledWith(mockDeviceId, mockPackageName);
    });
  });

  describe('POST /devices/:id/apps/stop - 停止应用', () => {
    it('应该成功停止应用', async () => {
      const dto: StopAppDto = { packageName: mockPackageName };

      const result = await controller.stopApp(mockDeviceId, dto);

      expect(service.stopApp).toHaveBeenCalledWith(mockDeviceId, mockPackageName);
      expect(result).toEqual({
        success: true,
        message: `应用 ${mockPackageName} 停止成功`,
      });
    });

    it('service 抛出异常时应该传播异常', async () => {
      const dto: StopAppDto = { packageName: mockPackageName };
      const error = new Error('设备不支持应用操作');
      service.stopApp.mockRejectedValue(error);

      await expect(controller.stopApp(mockDeviceId, dto)).rejects.toThrow(error);
      expect(service.stopApp).toHaveBeenCalledWith(mockDeviceId, mockPackageName);
    });
  });

  describe('POST /devices/:id/apps/clear-data - 清除应用数据', () => {
    it('应该成功清除应用数据', async () => {
      const dto: ClearAppDataDto = { packageName: mockPackageName };

      const result = await controller.clearAppData(mockDeviceId, dto);

      expect(service.clearAppData).toHaveBeenCalledWith(mockDeviceId, mockPackageName);
      expect(result).toEqual({
        success: true,
        message: `应用 ${mockPackageName} 数据清除成功`,
      });
    });

    it('service 抛出异常时应该传播异常', async () => {
      const dto: ClearAppDataDto = { packageName: mockPackageName };
      const error = new Error('设备不支持应用操作');
      service.clearAppData.mockRejectedValue(error);

      await expect(controller.clearAppData(mockDeviceId, dto)).rejects.toThrow(error);
      expect(service.clearAppData).toHaveBeenCalledWith(mockDeviceId, mockPackageName);
    });
  });

  describe('POST /devices/:id/snapshots - 创建快照', () => {
    it('应该成功创建快照', async () => {
      const dto: CreateSnapshotDto = {
        name: mockSnapshotName,
        description: 'Test description',
      };

      const result = await controller.createSnapshot(mockDeviceId, dto);

      expect(service.createSnapshot).toHaveBeenCalledWith(
        mockDeviceId,
        mockSnapshotName,
        'Test description',
      );
      expect(result).toEqual({
        success: true,
        message: '快照创建成功',
        data: { snapshotId: mockSnapshotId },
      });
    });

    it('没有描述时应该成功创建快照', async () => {
      const dto: CreateSnapshotDto = {
        name: mockSnapshotName,
      };

      const result = await controller.createSnapshot(mockDeviceId, dto);

      expect(service.createSnapshot).toHaveBeenCalledWith(
        mockDeviceId,
        mockSnapshotName,
        undefined,
      );
      expect(result.success).toBe(true);
    });

    it('service 抛出异常时应该传播异常', async () => {
      const dto: CreateSnapshotDto = { name: mockSnapshotName };
      const error = new Error('设备不支持快照功能');
      service.createSnapshot.mockRejectedValue(error);

      await expect(controller.createSnapshot(mockDeviceId, dto)).rejects.toThrow(error);
      expect(service.createSnapshot).toHaveBeenCalled();
    });
  });

  describe('POST /devices/:id/snapshots/restore - 恢复快照', () => {
    it('应该成功恢复快照', async () => {
      const dto: RestoreSnapshotDto = { snapshotId: mockSnapshotId };

      const result = await controller.restoreSnapshot(mockDeviceId, dto);

      expect(service.restoreSnapshot).toHaveBeenCalledWith(mockDeviceId, mockSnapshotId);
      expect(result).toEqual({
        success: true,
        message: '快照恢复成功，设备将重启',
      });
    });

    it('service 抛出异常时应该传播异常', async () => {
      const dto: RestoreSnapshotDto = { snapshotId: mockSnapshotId };
      const error = new Error('快照不存在');
      service.restoreSnapshot.mockRejectedValue(error);

      await expect(controller.restoreSnapshot(mockDeviceId, dto)).rejects.toThrow(error);
      expect(service.restoreSnapshot).toHaveBeenCalledWith(mockDeviceId, mockSnapshotId);
    });
  });

  describe('GET /devices/:id/snapshots - 获取快照列表', () => {
    it('应该成功获取快照列表', async () => {
      const result = await controller.listSnapshots(mockDeviceId);

      expect(service.listSnapshots).toHaveBeenCalledWith(mockDeviceId);
      expect(result).toEqual({
        success: true,
        data: [
          {
            id: mockSnapshotId,
            name: mockSnapshotName,
            deviceId: mockDeviceId,
            createdAt: '2025-11-01T10:00:00Z',
            status: 'available',
          },
        ],
      });
    });

    it('没有快照时应该返回空数组', async () => {
      service.listSnapshots.mockResolvedValue([]);

      const result = await controller.listSnapshots(mockDeviceId);

      expect(service.listSnapshots).toHaveBeenCalledWith(mockDeviceId);
      expect(result.data).toEqual([]);
    });

    it('service 抛出异常时应该传播异常', async () => {
      const error = new Error('设备不支持快照功能');
      service.listSnapshots.mockRejectedValue(error);

      await expect(controller.listSnapshots(mockDeviceId)).rejects.toThrow(error);
      expect(service.listSnapshots).toHaveBeenCalledWith(mockDeviceId);
    });
  });

  describe('DELETE /devices/:id/snapshots/:snapshotId - 删除快照', () => {
    it('应该成功删除快照', async () => {
      const result = await controller.deleteSnapshot(mockDeviceId, mockSnapshotId);

      expect(service.deleteSnapshot).toHaveBeenCalledWith(mockDeviceId, mockSnapshotId);
      expect(result).toEqual({
        success: true,
        message: '快照删除成功',
      });
    });

    it('service 抛出异常时应该传播异常', async () => {
      const error = new Error('快照不存在');
      service.deleteSnapshot.mockRejectedValue(error);

      await expect(controller.deleteSnapshot(mockDeviceId, mockSnapshotId)).rejects.toThrow(
        error,
      );
      expect(service.deleteSnapshot).toHaveBeenCalledWith(mockDeviceId, mockSnapshotId);
    });
  });
});
