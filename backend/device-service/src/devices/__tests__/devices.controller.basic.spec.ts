import { Test, TestingModule } from '@nestjs/testing';
import { DevicesController } from '../devices.controller';
import { DevicesService } from '../devices.service';
import { PermissionGuard } from '@cloudphone/shared';
import { QuotaGuard } from '../../quota/quota.guard';
import { QuotaClientService } from '../../quota/quota-client.service';
import { Reflector } from '@nestjs/core';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';
import { DeviceStatus, DeviceProviderType } from '../../entities/device.entity';

/**
 * DevicesController 基础功能测试
 * 测试设备 CRUD 基础端点
 */
describe('DevicesController - Basic CRUD', () => {
  let controller: DevicesController;
  let service: jest.Mocked<DevicesService>;

  const mockDeviceId = 'device-123';
  const mockUserId = 'user-456';
  const mockSagaId = 'saga-789';

  const mockDevice = {
    id: mockDeviceId,
    userId: mockUserId,
    name: 'Test Device',
    status: DeviceStatus.IDLE,
    provider: DeviceProviderType.REDROID,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // 创建 mock service
    const mockDevicesService = {
      create: jest.fn().mockResolvedValue({
        sagaId: mockSagaId,
        device: mockDevice,
      }),
      findAll: jest.fn().mockResolvedValue({
        data: [mockDevice],
        total: 1,
        page: 1,
        limit: 10,
      }),
      findOne: jest.fn().mockResolvedValue(mockDevice),
      update: jest.fn().mockResolvedValue(mockDevice),
      remove: jest.fn().mockResolvedValue(undefined),
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      restart: jest.fn().mockResolvedValue(mockDevice),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [
        {
          provide: DevicesService,
          useValue: mockDevicesService,
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
      .useValue({ canActivate: () => true })
      .overrideGuard(QuotaGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DevicesController>(DevicesController);
    service = module.get(DevicesService) as jest.Mocked<DevicesService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /devices - 创建设备', () => {
    it('应该成功创建设备并返回 Saga ID', async () => {
      const dto: CreateDeviceDto = {
        userId: mockUserId,
        name: 'Test Device',
        provider: DeviceProviderType.REDROID,
      };

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        success: true,
        data: {
          sagaId: mockSagaId,
          device: mockDevice,
        },
        message: '设备创建 Saga 已启动，请稍候...',
      });
    });

    it('service 抛出异常时应该传播异常', async () => {
      const dto: CreateDeviceDto = {
        userId: mockUserId,
        name: 'Test Device',
        provider: DeviceProviderType.REDROID,
      };
      const error = new Error('创建设备失败');
      service.create.mockRejectedValue(error);

      await expect(controller.create(dto)).rejects.toThrow(error);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('GET /devices/stats - 获取设备统计', () => {
    it('应该返回设备状态统计', async () => {
      const mockDevices = [
        { ...mockDevice, status: DeviceStatus.IDLE },
        { ...mockDevice, id: 'device-2', status: DeviceStatus.RUNNING },
        { ...mockDevice, id: 'device-3', status: DeviceStatus.STOPPED },
        { ...mockDevice, id: 'device-4', status: DeviceStatus.ERROR },
      ];
      service.findAll.mockResolvedValue({
        data: mockDevices,
        total: 4,
        page: 1,
        limit: 9999,
      });

      const result = await controller.getOverallStats();

      expect(service.findAll).toHaveBeenCalledWith(1, 9999);
      expect(result).toEqual({
        success: true,
        data: {
          total: 4,
          idle: 1,
          running: 1,
          stopped: 1,
          error: 1,
        },
      });
    });

    it('没有设备时应该返回全零统计', async () => {
      service.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 9999,
      });

      const result = await controller.getOverallStats();

      expect(result.data).toEqual({
        total: 0,
        idle: 0,
        running: 0,
        stopped: 0,
        error: 0,
      });
    });
  });

  describe('GET /devices/available - 获取可用设备', () => {
    it('应该返回所有 IDLE 状态的设备', async () => {
      const idleDevices = [
        { ...mockDevice, status: DeviceStatus.IDLE },
        { ...mockDevice, id: 'device-2', status: DeviceStatus.IDLE },
      ];
      service.findAll.mockResolvedValue({
        data: idleDevices,
        total: 2,
        page: 1,
        limit: 9999,
      });

      const result = await controller.getAvailableDevices();

      expect(service.findAll).toHaveBeenCalledWith(
        1,
        9999,
        undefined,
        undefined,
        DeviceStatus.IDLE,
      );
      expect(result).toEqual({
        success: true,
        data: idleDevices,
        total: 2,
      });
    });

    it('没有可用设备时应该返回空数组', async () => {
      service.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 9999,
      });

      const result = await controller.getAvailableDevices();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('GET /devices - 获取设备列表', () => {
    it('应该使用默认分页参数获取设备列表', async () => {
      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual({
        success: true,
        data: [mockDevice],
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    it('应该使用自定义分页参数', async () => {
      await controller.findAll('2', '20');

      expect(service.findAll).toHaveBeenCalledWith(
        2,
        20,
        undefined,
        undefined,
        undefined,
      );
    });

    it('应该支持 userId 过滤', async () => {
      await controller.findAll('1', '10', mockUserId);

      expect(service.findAll).toHaveBeenCalledWith(
        1,
        10,
        mockUserId,
        undefined,
        undefined,
      );
    });

    it('应该支持 tenantId 过滤', async () => {
      const tenantId = 'tenant-123';
      await controller.findAll('1', '10', undefined, tenantId);

      expect(service.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        tenantId,
        undefined,
      );
    });

    it('应该支持 status 过滤', async () => {
      await controller.findAll('1', '10', undefined, undefined, DeviceStatus.RUNNING);

      expect(service.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        DeviceStatus.RUNNING,
      );
    });

    it('应该支持所有过滤条件组合', async () => {
      const tenantId = 'tenant-123';
      await controller.findAll('3', '15', mockUserId, tenantId, DeviceStatus.IDLE);

      expect(service.findAll).toHaveBeenCalledWith(
        3,
        15,
        mockUserId,
        tenantId,
        DeviceStatus.IDLE,
      );
    });
  });

  describe('GET /devices/:id - 获取单个设备', () => {
    it('应该成功获取设备详情', async () => {
      const result = await controller.findOne(mockDeviceId);

      expect(service.findOne).toHaveBeenCalledWith(mockDeviceId);
      expect(result).toEqual({
        success: true,
        data: mockDevice,
      });
    });

    it('设备不存在时应该传播异常', async () => {
      const error = new Error('设备不存在');
      service.findOne.mockRejectedValue(error);

      await expect(controller.findOne('nonexistent')).rejects.toThrow(error);
      expect(service.findOne).toHaveBeenCalledWith('nonexistent');
    });
  });

  describe('PATCH /devices/:id - 更新设备', () => {
    it('应该成功更新设备', async () => {
      const dto: UpdateDeviceDto = {
        name: 'Updated Device',
      };
      const updatedDevice = { ...mockDevice, name: 'Updated Device' };
      service.update.mockResolvedValue(updatedDevice);

      const result = await controller.update(mockDeviceId, dto);

      expect(service.update).toHaveBeenCalledWith(mockDeviceId, dto);
      expect(result).toEqual({
        success: true,
        data: updatedDevice,
        message: '设备更新成功',
      });
    });

    it('设备不存在时应该传播异常', async () => {
      const dto: UpdateDeviceDto = { name: 'Updated' };
      const error = new Error('设备不存在');
      service.update.mockRejectedValue(error);

      await expect(controller.update('nonexistent', dto)).rejects.toThrow(error);
    });
  });

  describe('DELETE /devices/:id - 删除设备', () => {
    it('应该成功删除设备', async () => {
      const result = await controller.remove(mockDeviceId);

      expect(service.remove).toHaveBeenCalledWith(mockDeviceId);
      expect(result).toEqual({
        success: true,
        message: '设备删除成功',
      });
    });

    it('设备不存在时应该传播异常', async () => {
      const error = new Error('设备不存在');
      service.remove.mockRejectedValue(error);

      await expect(controller.remove('nonexistent')).rejects.toThrow(error);
      expect(service.remove).toHaveBeenCalledWith('nonexistent');
    });
  });

  describe('POST /devices/:id/start - 启动设备', () => {
    it('应该成功启动设备', async () => {
      const result = await controller.start(mockDeviceId);

      expect(service.start).toHaveBeenCalledWith(mockDeviceId);
      expect(result).toEqual({
        success: true,
        message: '设备启动成功',
      });
    });

    it('service 抛出异常时应该传播异常', async () => {
      const error = new Error('启动设备失败');
      service.start.mockRejectedValue(error);

      await expect(controller.start(mockDeviceId)).rejects.toThrow(error);
    });
  });

  describe('POST /devices/:id/stop - 停止设备', () => {
    it('应该成功停止设备', async () => {
      const result = await controller.stop(mockDeviceId);

      expect(service.stop).toHaveBeenCalledWith(mockDeviceId);
      expect(result).toEqual({
        success: true,
        message: '设备停止成功',
      });
    });

    it('service 抛出异常时应该传播异常', async () => {
      const error = new Error('停止设备失败');
      service.stop.mockRejectedValue(error);

      await expect(controller.stop(mockDeviceId)).rejects.toThrow(error);
    });
  });

  describe('POST /devices/:id/reboot - 重启设备', () => {
    it('应该成功重启设备', async () => {
      const result = await controller.reboot(mockDeviceId);

      expect(service.restart).toHaveBeenCalledWith(mockDeviceId);
      expect(result).toEqual({
        success: true,
        data: mockDevice,
        message: '设备重启成功',
      });
    });

    it('service 抛出异常时应该传播异常', async () => {
      const error = new Error('重启设备失败');
      service.restart.mockRejectedValue(error);

      await expect(controller.reboot(mockDeviceId)).rejects.toThrow(error);
    });
  });

  describe('边界情况测试', () => {
    it('分页参数为字符串时应该正确转换为数字', async () => {
      await controller.findAll('5', '25');

      expect(service.findAll).toHaveBeenCalledWith(
        5,
        25,
        undefined,
        undefined,
        undefined,
      );
    });

    it('应该处理大量设备的统计计算', async () => {
      const largeDeviceList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockDevice,
        id: `device-${i}`,
        status: i % 4 === 0 ? DeviceStatus.IDLE :
               i % 4 === 1 ? DeviceStatus.RUNNING :
               i % 4 === 2 ? DeviceStatus.STOPPED : DeviceStatus.ERROR,
      }));

      service.findAll.mockResolvedValue({
        data: largeDeviceList,
        total: 1000,
        page: 1,
        limit: 9999,
      });

      const result = await controller.getOverallStats();

      expect(result.data.total).toBe(1000);
      expect(result.data.idle).toBe(250);
      expect(result.data.running).toBe(250);
      expect(result.data.stopped).toBe(250);
      expect(result.data.error).toBe(250);
    });
  });
});
