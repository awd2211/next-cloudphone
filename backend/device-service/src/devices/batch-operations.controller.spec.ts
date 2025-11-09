import { Test, TestingModule } from '@nestjs/testing';
import { BatchOperationsController } from './batch-operations.controller';
import { BatchOperationsService } from './batch-operations.service';

describe('BatchOperationsController', () => {
  let controller: BatchOperationsController;
  let service: any;

  const mockBatchOperationsService = {
    batchCreate: jest.fn(),
    batchOperate: jest.fn(),
    getGroupStatistics: jest.fn(),
    getDevicesByGroup: jest.fn(),
    updateDeviceGroup: jest.fn(),
    batchGetStatus: jest.fn(),
    batchExecuteAndCollect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BatchOperationsController],
      providers: [
        {
          provide: BatchOperationsService,
          useValue: mockBatchOperationsService,
        },
      ],
    }).compile();

    controller = module.get<BatchOperationsController>(BatchOperationsController);
    service = module.get(BatchOperationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('batchCreate', () => {
    it('should batch create devices', async () => {
      const dto: any = {
        count: 5,
        prefix: 'test-device',
        userId: 'user-123',
        templateId: 'template-456',
      };

      const mockResult: any = {
        success: true,
        total: 5,
        succeeded: 5,
        failed: 0,
        results: [
          { deviceId: 'test-device-1', success: true },
          { deviceId: 'test-device-2', success: true },
          { deviceId: 'test-device-3', success: true },
          { deviceId: 'test-device-4', success: true },
          { deviceId: 'test-device-5', success: true },
        ],
      };

      service.batchCreate.mockResolvedValue(mockResult);

      const result = await controller.batchCreate(dto);

      expect(result.success).toBe(true);
      expect(result.total).toBe(5);
      expect(result.succeeded).toBe(5);
      expect(result.failed).toBe(0);
      expect(service.batchCreate).toHaveBeenCalledWith(dto);
    });

    it('should handle partial failures in batch create', async () => {
      const dto: any = {
        count: 3,
        prefix: 'test-device',
      };

      const mockResult: any = {
        success: false,
        total: 3,
        succeeded: 2,
        failed: 1,
        results: [
          { deviceId: 'test-device-1', success: true },
          { deviceId: 'test-device-2', success: false, error: 'Quota exceeded' },
          { deviceId: 'test-device-3', success: true },
        ],
      };

      service.batchCreate.mockResolvedValue(mockResult);

      const result = await controller.batchCreate(dto);

      expect(result.success).toBe(false);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);
    });
  });

  describe('batchOperate', () => {
    it('should execute batch operation', async () => {
      const dto: any = {
        operation: 'start',
        deviceIds: ['device-1', 'device-2'],
      };

      const mockResult: any = {
        success: true,
        total: 2,
        succeeded: 2,
        failed: 0,
      };

      service.batchOperate.mockResolvedValue(mockResult);

      const result = await controller.batchOperate(dto);

      expect(result.success).toBe(true);
      expect(result.total).toBe(2);
      expect(service.batchOperate).toHaveBeenCalledWith(dto);
    });
  });

  describe('batchStart', () => {
    it('should batch start devices', async () => {
      const body: any = {
        deviceIds: ['device-1', 'device-2', 'device-3'],
        maxConcurrency: 2,
      };

      const mockResult: any = {
        success: true,
        total: 3,
        succeeded: 3,
        failed: 0,
      };

      service.batchOperate.mockResolvedValue(mockResult);

      const result = await controller.batchStart(body);

      expect(result.success).toBe(true);
      expect(service.batchOperate).toHaveBeenCalledWith({
        operation: 'start',
        ...body,
      });
    });

    it('should batch start devices by group', async () => {
      const body: any = {
        groupName: 'production',
        userId: 'user-123',
      };

      const mockResult: any = {
        success: true,
        total: 10,
        succeeded: 10,
        failed: 0,
      };

      service.batchOperate.mockResolvedValue(mockResult);

      const result = await controller.batchStart(body);

      expect(result.success).toBe(true);
      expect(service.batchOperate).toHaveBeenCalledWith({
        operation: 'start',
        ...body,
      });
    });
  });

  describe('batchStop', () => {
    it('should batch stop devices', async () => {
      const body: any = {
        deviceIds: ['device-1', 'device-2'],
      };

      const mockResult: any = {
        success: true,
        total: 2,
        succeeded: 2,
        failed: 0,
      };

      service.batchOperate.mockResolvedValue(mockResult);

      const result = await controller.batchStop(body);

      expect(result.success).toBe(true);
      expect(service.batchOperate).toHaveBeenCalledWith({
        operation: 'stop',
        ...body,
      });
    });
  });

  describe('batchRestart', () => {
    it('should batch restart devices', async () => {
      const body: any = {
        deviceIds: ['device-1'],
      };

      const mockResult: any = {
        success: true,
        total: 1,
        succeeded: 1,
        failed: 0,
      };

      service.batchOperate.mockResolvedValue(mockResult);

      const result = await controller.batchRestart(body);

      expect(result.success).toBe(true);
      expect(service.batchOperate).toHaveBeenCalledWith({
        operation: 'restart',
        ...body,
      });
    });
  });

  describe('batchDelete', () => {
    it('should batch delete devices', async () => {
      const body: any = {
        deviceIds: ['device-1', 'device-2'],
      };

      const mockResult: any = {
        success: true,
        total: 2,
        succeeded: 2,
        failed: 0,
      };

      service.batchOperate.mockResolvedValue(mockResult);

      const result = await controller.batchDelete(body);

      expect(result.success).toBe(true);
      expect(service.batchOperate).toHaveBeenCalledWith({
        operation: 'delete',
        ...body,
      });
    });
  });

  describe('batchExecute', () => {
    it('should batch execute command on devices', async () => {
      const body: any = {
        deviceIds: ['device-1', 'device-2'],
        command: 'echo "Hello World"',
      };

      const mockResult: any = {
        success: true,
        total: 2,
        succeeded: 2,
        failed: 0,
      };

      service.batchOperate.mockResolvedValue(mockResult);

      const result = await controller.batchExecute(body);

      expect(result.success).toBe(true);
      expect(service.batchOperate).toHaveBeenCalledWith({
        operation: 'execute_command',
        ...body,
      });
    });
  });

  describe('batchInstall', () => {
    it('should batch install app on devices', async () => {
      const body: any = {
        deviceIds: ['device-1', 'device-2'],
        apkPath: '/path/to/app.apk',
      };

      const mockResult: any = {
        success: true,
        total: 2,
        succeeded: 2,
        failed: 0,
      };

      service.batchOperate.mockResolvedValue(mockResult);

      const result = await controller.batchInstall(body);

      expect(result.success).toBe(true);
      expect(service.batchOperate).toHaveBeenCalledWith({
        operation: 'install_app',
        ...body,
      });
    });
  });

  describe('batchUninstall', () => {
    it('should batch uninstall app from devices', async () => {
      const body: any = {
        deviceIds: ['device-1', 'device-2'],
        packageName: 'com.example.app',
      };

      const mockResult: any = {
        success: true,
        total: 2,
        succeeded: 2,
        failed: 0,
      };

      service.batchOperate.mockResolvedValue(mockResult);

      const result = await controller.batchUninstall(body);

      expect(result.success).toBe(true);
      expect(service.batchOperate).toHaveBeenCalledWith({
        operation: 'uninstall_app',
        ...body,
      });
    });
  });

  describe('getGroupStatistics', () => {
    it('should return group statistics', async () => {
      const mockStats = {
        production: { count: 20, running: 18, stopped: 2 },
        development: { count: 10, running: 5, stopped: 5 },
        testing: { count: 5, running: 3, stopped: 2 },
      };

      service.getGroupStatistics.mockResolvedValue(mockStats);

      const result = await controller.getGroupStatistics();

      expect(result).toEqual(mockStats);
      expect(service.getGroupStatistics).toHaveBeenCalled();
    });

    it('should handle empty groups', async () => {
      service.getGroupStatistics.mockResolvedValue({});

      const result = await controller.getGroupStatistics();

      expect(result).toEqual({});
    });
  });

  describe('getDevicesByGroup', () => {
    it('should return devices in a group', async () => {
      const groupName = 'production';
      const mockDevices = [
        { id: 'device-1', name: 'prod-device-1', status: 'running' },
        { id: 'device-2', name: 'prod-device-2', status: 'running' },
      ];

      service.getDevicesByGroup.mockResolvedValue(mockDevices);

      const result = await controller.getDevicesByGroup(groupName);

      expect(result).toEqual(mockDevices);
      expect(result).toHaveLength(2);
      expect(service.getDevicesByGroup).toHaveBeenCalledWith(groupName);
    });

    it('should handle empty group', async () => {
      service.getDevicesByGroup.mockResolvedValue([]);

      const result = await controller.getDevicesByGroup('empty-group');

      expect(result).toEqual([]);
    });
  });

  describe('updateDeviceGroup', () => {
    it('should update devices to new group', async () => {
      const body = {
        deviceIds: ['device-1', 'device-2', 'device-3'],
        groupName: 'production',
      };

      service.updateDeviceGroup.mockResolvedValue(undefined);

      const result = await controller.updateDeviceGroup(body);

      expect(result.message).toBe(
        'Successfully updated 3 devices to group "production"',
      );
      expect(service.updateDeviceGroup).toHaveBeenCalledWith(
        body.deviceIds,
        body.groupName,
      );
    });

    it('should handle single device update', async () => {
      const body = {
        deviceIds: ['device-1'],
        groupName: 'testing',
      };

      service.updateDeviceGroup.mockResolvedValue(undefined);

      const result = await controller.updateDeviceGroup(body);

      expect(result.message).toBe(
        'Successfully updated 1 devices to group "testing"',
      );
    });
  });

  describe('batchGetStatus', () => {
    it('should return status for multiple devices', async () => {
      const body = {
        deviceIds: ['device-1', 'device-2'],
      };

      const mockStatuses = {
        'device-1': { status: 'running', uptime: 3600 },
        'device-2': { status: 'stopped', uptime: 0 },
      };

      service.batchGetStatus.mockResolvedValue(mockStatuses);

      const result = await controller.batchGetStatus(body);

      expect(result).toEqual(mockStatuses);
      expect(service.batchGetStatus).toHaveBeenCalledWith(body.deviceIds);
    });

    it('should handle empty device list', async () => {
      const body = {
        deviceIds: [],
      };

      service.batchGetStatus.mockResolvedValue({});

      const result = await controller.batchGetStatus(body);

      expect(result).toEqual({});
    });
  });

  describe('batchExecuteAndCollect', () => {
    it('should execute command and collect results', async () => {
      const body = {
        deviceIds: ['device-1', 'device-2'],
        command: 'cat /proc/version',
      };

      const mockResults = {
        'device-1': 'Linux version 5.10.0',
        'device-2': 'Linux version 5.10.0',
      };

      service.batchExecuteAndCollect.mockResolvedValue(mockResults);

      const result = await controller.batchExecuteAndCollect(body);

      expect(result).toEqual(mockResults);
      expect(service.batchExecuteAndCollect).toHaveBeenCalledWith(
        body.deviceIds,
        body.command,
        undefined,
      );
    });

    it('should execute with custom concurrency', async () => {
      const body = {
        deviceIds: ['device-1', 'device-2', 'device-3'],
        command: 'uptime',
        maxConcurrency: 2,
      };

      const mockResults = {
        'device-1': 'up 1 day',
        'device-2': 'up 2 days',
        'device-3': 'up 3 days',
      };

      service.batchExecuteAndCollect.mockResolvedValue(mockResults);

      const result = await controller.batchExecuteAndCollect(body);

      expect(result).toEqual(mockResults);
      expect(service.batchExecuteAndCollect).toHaveBeenCalledWith(
        body.deviceIds,
        body.command,
        2,
      );
    });
  });
});
