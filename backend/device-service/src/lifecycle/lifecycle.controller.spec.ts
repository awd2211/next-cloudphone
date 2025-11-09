import { Test, TestingModule } from '@nestjs/testing';
import { LifecycleController } from './lifecycle.controller';
import { LifecycleService } from './lifecycle.service';
import { AutoScalingService } from './autoscaling.service';
import { BackupExpirationService } from './backup-expiration.service';

describe('LifecycleController', () => {
  let controller: LifecycleController;
  let lifecycleService: any;
  let autoScalingService: any;
  let backupExpirationService: any;

  const mockLifecycleService = {
    triggerManualCleanup: jest.fn(),
    getCleanupStatistics: jest.fn(),
  };

  const mockAutoScalingService = {
    getStatus: jest.fn(),
    getConfig: jest.fn(),
    getScalingHistory: jest.fn(),
    triggerManualScaling: jest.fn(),
    updateConfig: jest.fn(),
  };

  const mockBackupExpirationService = {
    getConfig: jest.fn(),
    updateConfig: jest.fn(),
    getBackupStatistics: jest.fn(),
    performScheduledBackups: jest.fn(),
    triggerManualBackup: jest.fn(),
    triggerManualExpirationCheck: jest.fn(),
    cleanupOldBackups: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LifecycleController],
      providers: [
        {
          provide: LifecycleService,
          useValue: mockLifecycleService,
        },
        {
          provide: AutoScalingService,
          useValue: mockAutoScalingService,
        },
        {
          provide: BackupExpirationService,
          useValue: mockBackupExpirationService,
        },
      ],
    }).compile();

    controller = module.get<LifecycleController>(LifecycleController);
    lifecycleService = module.get(LifecycleService);
    autoScalingService = module.get(AutoScalingService);
    backupExpirationService = module.get(BackupExpirationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('triggerCleanup', () => {
    it('should trigger manual cleanup and return results', async () => {
      const mockResult = {
        totalCleaned: 5,
        idleDevicesCleaned: 2,
        errorDevicesCleaned: 2,
        stoppedDevicesCleaned: 1,
      };

      lifecycleService.triggerManualCleanup.mockResolvedValue(mockResult);

      const result = await controller.triggerCleanup();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe('清理完成: 共清理 5 项');
      expect(lifecycleService.triggerManualCleanup).toHaveBeenCalled();
    });

    it('should handle cleanup with zero items', async () => {
      const mockResult = {
        totalCleaned: 0,
        idleDevicesCleaned: 0,
        errorDevicesCleaned: 0,
        stoppedDevicesCleaned: 0,
      };

      lifecycleService.triggerManualCleanup.mockResolvedValue(mockResult);

      const result = await controller.triggerCleanup();

      expect(result.success).toBe(true);
      expect(result.data.totalCleaned).toBe(0);
      expect(result.message).toBe('清理完成: 共清理 0 项');
    });
  });

  describe('getCleanupStatistics', () => {
    it('should return cleanup statistics', async () => {
      const mockStats = {
        idleDevicesCount: 10,
        errorDevicesCount: 5,
        stoppedDevicesCount: 3,
        totalPendingCleanup: 18,
      };

      lifecycleService.getCleanupStatistics.mockResolvedValue(mockStats);

      const result = await controller.getCleanupStatistics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(lifecycleService.getCleanupStatistics).toHaveBeenCalled();
    });

    it('should handle empty cleanup statistics', async () => {
      const mockStats = {
        idleDevicesCount: 0,
        errorDevicesCount: 0,
        stoppedDevicesCount: 0,
        totalPendingCleanup: 0,
      };

      lifecycleService.getCleanupStatistics.mockResolvedValue(mockStats);

      const result = await controller.getCleanupStatistics();

      expect(result.success).toBe(true);
      expect(result.data.totalPendingCleanup).toBe(0);
    });
  });

  describe('getAutoscalingStatus', () => {
    it('should return autoscaling status and config', async () => {
      const mockStatus = {
        enabled: true,
        lastChecked: new Date('2025-01-06T00:00:00.000Z'),
        currentDevices: 50,
        targetDevices: 55,
      };

      const mockConfig = {
        enabled: true,
        minDevices: 10,
        maxDevices: 100,
        targetUtilization: 0.7,
        checkIntervalMs: 300000,
      };

      autoScalingService.getStatus.mockResolvedValue(mockStatus);
      autoScalingService.getConfig.mockReturnValue(mockConfig);

      const result = await controller.getAutoscalingStatus();

      expect(result.success).toBe(true);
      expect(result.data.status).toEqual(mockStatus);
      expect(result.data.config).toEqual(mockConfig);
      expect(autoScalingService.getStatus).toHaveBeenCalled();
      expect(autoScalingService.getConfig).toHaveBeenCalled();
    });

    it('should handle disabled autoscaling', async () => {
      const mockStatus = {
        enabled: false,
        currentDevices: 30,
      };

      const mockConfig = {
        enabled: false,
      };

      autoScalingService.getStatus.mockResolvedValue(mockStatus);
      autoScalingService.getConfig.mockReturnValue(mockConfig);

      const result = await controller.getAutoscalingStatus();

      expect(result.success).toBe(true);
      expect(result.data.status.enabled).toBe(false);
      expect(result.data.config.enabled).toBe(false);
    });
  });

  describe('getAutoscalingHistory', () => {
    it('should return autoscaling history', async () => {
      const mockHistory = [
        {
          timestamp: new Date('2025-01-06T00:00:00.000Z'),
          action: 'scale_up',
          from: 40,
          to: 50,
        },
        {
          timestamp: new Date('2025-01-06T01:00:00.000Z'),
          action: 'scale_down',
          from: 50,
          to: 45,
        },
      ];

      autoScalingService.getScalingHistory.mockReturnValue(mockHistory);

      const result = await controller.getAutoscalingHistory();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].action).toBe('scale_up');
      expect(autoScalingService.getScalingHistory).toHaveBeenCalled();
    });

    it('should handle empty history', async () => {
      autoScalingService.getScalingHistory.mockReturnValue([]);

      const result = await controller.getAutoscalingHistory();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('triggerAutoscaling', () => {
    it('should trigger autoscaling and return scale_up action', async () => {
      const mockResult = {
        success: true,
        action: 'scale_up',
        currentDevices: 40,
        targetDevices: 50,
        devicesCreated: 10,
      };

      autoScalingService.triggerManualScaling.mockResolvedValue(mockResult);

      const result = await controller.triggerAutoscaling();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe('扩缩容已执行');
      expect(autoScalingService.triggerManualScaling).toHaveBeenCalled();
    });

    it('should handle no_action result', async () => {
      const mockResult = {
        success: true,
        action: 'no_action',
        currentDevices: 50,
        targetDevices: 50,
      };

      autoScalingService.triggerManualScaling.mockResolvedValue(mockResult);

      const result = await controller.triggerAutoscaling();

      expect(result.success).toBe(true);
      expect(result.message).toBe('扩缩容无需调整');
    });

    it('should handle scale_down action', async () => {
      const mockResult = {
        success: true,
        action: 'scale_down',
        currentDevices: 60,
        targetDevices: 50,
        devicesRemoved: 10,
      };

      autoScalingService.triggerManualScaling.mockResolvedValue(mockResult);

      const result = await controller.triggerAutoscaling();

      expect(result.success).toBe(true);
      expect(result.message).toBe('扩缩容已执行');
    });
  });

  describe('updateAutoscalingConfig', () => {
    it('should update autoscaling config', async () => {
      const updates: any = {
        minDevices: 20,
        maxDevices: 150,
      };

      const mockConfig = {
        enabled: true,
        minDevices: 20,
        maxDevices: 150,
        targetUtilization: 0.7,
        checkIntervalMs: 300000,
      };

      autoScalingService.getConfig.mockReturnValue(mockConfig);

      const result = await controller.updateAutoscalingConfig(updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
      expect(result.message).toBe('自动扩缩容配置已更新');
      expect(autoScalingService.updateConfig).toHaveBeenCalledWith(updates);
      expect(autoScalingService.getConfig).toHaveBeenCalled();
    });

    it('should update target utilization', async () => {
      const updates: any = {
        targetUtilization: 0.8,
      };

      const mockConfig = {
        enabled: true,
        targetUtilization: 0.8,
      };

      autoScalingService.getConfig.mockReturnValue(mockConfig);

      const result = await controller.updateAutoscalingConfig(updates);

      expect(result.success).toBe(true);
      expect(result.data.targetUtilization).toBe(0.8);
    });
  });

  describe('getBackupConfig', () => {
    it('should return backup config', async () => {
      const mockConfig = {
        enabled: true,
        backupIntervalHours: 24,
        retentionDays: 7,
        maxBackupsPerDevice: 3,
      };

      backupExpirationService.getConfig.mockReturnValue(mockConfig);

      const result = await controller.getBackupConfig();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
      expect(backupExpirationService.getConfig).toHaveBeenCalled();
    });
  });

  describe('updateBackupConfig', () => {
    it('should update backup config', async () => {
      const updates: any = {
        retentionDays: 14,
        maxBackupsPerDevice: 5,
      };

      const mockConfig = {
        enabled: true,
        backupIntervalHours: 24,
        retentionDays: 14,
        maxBackupsPerDevice: 5,
      };

      backupExpirationService.getConfig.mockReturnValue(mockConfig);

      const result = await controller.updateBackupConfig(updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
      expect(result.message).toBe('自动备份配置已更新');
      expect(backupExpirationService.updateConfig).toHaveBeenCalledWith(updates);
      expect(backupExpirationService.getConfig).toHaveBeenCalled();
    });
  });

  describe('getBackupStatistics', () => {
    it('should return backup statistics', async () => {
      const mockStats = {
        totalBackups: 150,
        backupsLastDay: 20,
        backupsLastWeek: 100,
        averageBackupSize: 1024,
        oldestBackup: new Date('2025-01-01T00:00:00.000Z'),
      };

      backupExpirationService.getBackupStatistics.mockResolvedValue(mockStats);

      const result = await controller.getBackupStatistics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(backupExpirationService.getBackupStatistics).toHaveBeenCalled();
    });
  });

  describe('triggerBackup', () => {
    it('should trigger backup for all devices', async () => {
      const mockResults = [
        { deviceId: 'device-1', success: true },
        { deviceId: 'device-2', success: true },
        { deviceId: 'device-3', success: false, error: 'Device offline' },
      ];

      backupExpirationService.performScheduledBackups.mockResolvedValue(mockResults);

      const result = await controller.triggerBackup();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResults);
      expect(result.message).toBe('备份任务已执行: 成功 2/3');
      expect(backupExpirationService.performScheduledBackups).toHaveBeenCalled();
    });

    it('should handle all successful backups', async () => {
      const mockResults = [
        { deviceId: 'device-1', success: true },
        { deviceId: 'device-2', success: true },
      ];

      backupExpirationService.performScheduledBackups.mockResolvedValue(mockResults);

      const result = await controller.triggerBackup();

      expect(result.success).toBe(true);
      expect(result.message).toBe('备份任务已执行: 成功 2/2');
    });
  });

  describe('backupDevice', () => {
    it('should backup a specific device', async () => {
      const deviceId = 'device-123';
      const user = { id: 'user-456' };

      const mockSnapshot = {
        id: 'snapshot-789',
        deviceId: 'device-123',
        createdBy: 'user-456',
        createdAt: new Date('2025-01-06T00:00:00.000Z'),
      };

      backupExpirationService.triggerManualBackup.mockResolvedValue(mockSnapshot);

      const result = await controller.backupDevice(deviceId, user);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSnapshot);
      expect(result.message).toBe('设备备份已创建');
      expect(backupExpirationService.triggerManualBackup).toHaveBeenCalledWith(
        deviceId,
        user.id,
      );
    });
  });

  describe('checkExpiration', () => {
    it('should check expiration for devices and snapshots', async () => {
      const mockResult = {
        devicesExpiring: ['device-1', 'device-2'],
        snapshotsExpiring: ['snapshot-1', 'snapshot-2', 'snapshot-3'],
      };

      backupExpirationService.triggerManualExpirationCheck.mockResolvedValue(mockResult);

      const result = await controller.checkExpiration();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe('到期检查完成: 2 设备即将到期, 3 快照即将到期');
      expect(backupExpirationService.triggerManualExpirationCheck).toHaveBeenCalled();
    });

    it('should handle no expiring items', async () => {
      const mockResult = {
        devicesExpiring: [],
        snapshotsExpiring: [],
      };

      backupExpirationService.triggerManualExpirationCheck.mockResolvedValue(mockResult);

      const result = await controller.checkExpiration();

      expect(result.success).toBe(true);
      expect(result.message).toBe('到期检查完成: 0 设备即将到期, 0 快照即将到期');
    });
  });

  describe('cleanupBackups', () => {
    it('should cleanup old backups', async () => {
      backupExpirationService.cleanupOldBackups.mockResolvedValue(15);

      const result = await controller.cleanupBackups();

      expect(result.success).toBe(true);
      expect(result.data.cleanedCount).toBe(15);
      expect(result.message).toBe('备份清理完成: 已删除 15 个过期备份');
      expect(backupExpirationService.cleanupOldBackups).toHaveBeenCalled();
    });

    it('should handle zero cleanups', async () => {
      backupExpirationService.cleanupOldBackups.mockResolvedValue(0);

      const result = await controller.cleanupBackups();

      expect(result.success).toBe(true);
      expect(result.data.cleanedCount).toBe(0);
      expect(result.message).toBe('备份清理完成: 已删除 0 个过期备份');
    });
  });
});
