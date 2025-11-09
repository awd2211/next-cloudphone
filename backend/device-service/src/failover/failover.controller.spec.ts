import { Test, TestingModule } from '@nestjs/testing';
import { FailoverController } from './failover.controller';
import { FailoverService } from './failover.service';

describe('FailoverController', () => {
  let controller: FailoverController;
  let failoverService: any;

  const mockFailoverService = {
    getConfig: jest.fn(),
    updateConfig: jest.fn(),
    getStatistics: jest.fn(),
    getFailureHistory: jest.fn(),
    getMigrationHistory: jest.fn(),
    detectAndRecoverFailures: jest.fn(),
    triggerManualRecovery: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FailoverController],
      providers: [
        {
          provide: FailoverService,
          useValue: mockFailoverService,
        },
      ],
    }).compile();

    controller = module.get<FailoverController>(FailoverController);
    failoverService = module.get(FailoverService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have failoverService injected', () => {
      expect(failoverService).toBeDefined();
      expect(failoverService).toBe(mockFailoverService);
    });
  });

  describe('getConfig', () => {
    it('should return failover configuration', async () => {
      const mockConfig = {
        maxRetries: 3,
        retryDelay: 5000,
        healthCheckInterval: 10000,
        migrationEnabled: true,
      };

      mockFailoverService.getConfig.mockReturnValue(mockConfig);

      const result = await controller.getConfig();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
      expect(result.data.maxRetries).toBe(3);
      expect(mockFailoverService.getConfig).toHaveBeenCalled();
    });

    it('should include all configuration parameters', async () => {
      const mockConfig = {
        maxRetries: 5,
        retryDelay: 10000,
        healthCheckInterval: 30000,
        migrationEnabled: false,
        autoRecovery: true,
        notificationEnabled: true,
      };

      mockFailoverService.getConfig.mockReturnValue(mockConfig);

      const result = await controller.getConfig();

      expect(result.data.maxRetries).toBe(5);
      expect(result.data.migrationEnabled).toBe(false);
      expect(result.data.autoRecovery).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('should update failover configuration', async () => {
      const updates = {
        maxRetries: 5,
        retryDelay: 8000,
      };

      const updatedConfig = {
        maxRetries: 5,
        retryDelay: 8000,
        healthCheckInterval: 10000,
        migrationEnabled: true,
      };

      mockFailoverService.updateConfig.mockReturnValue(undefined);
      mockFailoverService.getConfig.mockReturnValue(updatedConfig);

      const result = await controller.updateConfig(updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedConfig);
      expect(result.message).toBe('故障转移配置已更新');
      expect(mockFailoverService.updateConfig).toHaveBeenCalledWith(updates);
    });

    it('should update partial configuration', async () => {
      const updates = {
        migrationEnabled: false,
      };

      const updatedConfig = {
        maxRetries: 3,
        retryDelay: 5000,
        healthCheckInterval: 10000,
        migrationEnabled: false,
      };

      mockFailoverService.updateConfig.mockReturnValue(undefined);
      mockFailoverService.getConfig.mockReturnValue(updatedConfig);

      const result = await controller.updateConfig(updates);

      expect(result.data.migrationEnabled).toBe(false);
      expect(result.data.maxRetries).toBe(3);
    });

    it('should return updated configuration', async () => {
      const updates = {
        healthCheckInterval: 20000,
      };

      const updatedConfig = {
        healthCheckInterval: 20000,
      };

      mockFailoverService.getConfig.mockReturnValue(updatedConfig);

      const result = await controller.updateConfig(updates);

      expect(result.success).toBe(true);
      expect(result.data.healthCheckInterval).toBe(20000);
    });
  });

  describe('getStatistics', () => {
    it('should return failover statistics', async () => {
      const mockStats = {
        totalFailures: 25,
        recoveredFailures: 20,
        failedRecoveries: 5,
        successRate: 80,
        totalMigrations: 15,
        averageRecoveryTime: 3500,
      };

      mockFailoverService.getStatistics.mockReturnValue(mockStats);

      const result = await controller.getStatistics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(result.data.totalFailures).toBe(25);
      expect(result.data.successRate).toBe(80);
      expect(mockFailoverService.getStatistics).toHaveBeenCalled();
    });

    it('should include recovery metrics', async () => {
      const mockStats = {
        totalFailures: 100,
        recoveredFailures: 92,
        failedRecoveries: 8,
        successRate: 92,
        averageRecoveryTime: 2800,
        maxRecoveryTime: 8000,
      };

      mockFailoverService.getStatistics.mockReturnValue(mockStats);

      const result = await controller.getStatistics();

      expect(result.data.successRate).toBe(92);
      expect(result.data.averageRecoveryTime).toBe(2800);
      expect(result.data.maxRecoveryTime).toBe(8000);
    });
  });

  describe('getFailureHistory', () => {
    it('should return all failure history', async () => {
      const mockHistoryMap = new Map([
        ['device-1', [
          { timestamp: '2025-01-01T10:00:00Z', reason: 'container_crash' },
          { timestamp: '2025-01-02T12:00:00Z', reason: 'health_check_failed' },
        ]],
        ['device-2', [
          { timestamp: '2025-01-03T14:00:00Z', reason: 'network_error' },
        ]],
      ]);

      mockFailoverService.getFailureHistory.mockReturnValue(mockHistoryMap);

      const result = await controller.getFailureHistory();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data['device-1']).toHaveLength(2);
      expect(result.data['device-2']).toHaveLength(1);
      expect(mockFailoverService.getFailureHistory).toHaveBeenCalled();
    });

    it('should convert Map to object', async () => {
      const mockHistoryMap = new Map([
        ['device-123', [{ timestamp: '2025-01-01', reason: 'crash' }]],
      ]);

      mockFailoverService.getFailureHistory.mockReturnValue(mockHistoryMap);

      const result = await controller.getFailureHistory();

      expect(typeof result.data).toBe('object');
      expect(Array.isArray(result.data)).toBe(false);
      expect(result.data['device-123']).toBeDefined();
    });

    it('should return empty object when no failures', async () => {
      mockFailoverService.getFailureHistory.mockReturnValue(new Map());

      const result = await controller.getFailureHistory();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });
  });

  describe('getDeviceFailureHistory', () => {
    it('should return failure history for specific device', async () => {
      const mockHistoryMap = new Map([
        ['device-123', [
          { timestamp: '2025-01-01T10:00:00Z', reason: 'container_crash', recovered: true },
          { timestamp: '2025-01-02T12:00:00Z', reason: 'health_check_failed', recovered: true },
          { timestamp: '2025-01-03T14:00:00Z', reason: 'out_of_memory', recovered: false },
        ]],
      ]);

      mockFailoverService.getFailureHistory.mockReturnValue(mockHistoryMap);

      const result = await controller.getDeviceFailureHistory('device-123');

      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe('device-123');
      expect(result.data.failures).toHaveLength(3);
      expect(result.data.failures[0].reason).toBe('container_crash');
      expect(mockFailoverService.getFailureHistory).toHaveBeenCalledWith('device-123');
    });

    it('should return empty array when device has no failures', async () => {
      const mockHistoryMap = new Map();

      mockFailoverService.getFailureHistory.mockReturnValue(mockHistoryMap);

      const result = await controller.getDeviceFailureHistory('device-456');

      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe('device-456');
      expect(result.data.failures).toEqual([]);
    });

    it('should include failure details', async () => {
      const mockHistoryMap = new Map([
        ['device-789', [
          {
            timestamp: '2025-01-05T16:00:00Z',
            reason: 'disk_full',
            recovered: true,
            recoveryDuration: 5000,
          },
        ]],
      ]);

      mockFailoverService.getFailureHistory.mockReturnValue(mockHistoryMap);

      const result = await controller.getDeviceFailureHistory('device-789');

      expect(result.data.failures[0].reason).toBe('disk_full');
      expect(result.data.failures[0].recovered).toBe(true);
      expect(result.data.failures[0].recoveryDuration).toBe(5000);
    });
  });

  describe('getMigrationHistory', () => {
    it('should return migration history', async () => {
      const mockMigrationHistory = [
        {
          deviceId: 'device-1',
          fromHost: 'host-1',
          toHost: 'host-2',
          timestamp: '2025-01-01T10:00:00Z',
          status: 'success',
          duration: 12000,
        },
        {
          deviceId: 'device-2',
          fromHost: 'host-2',
          toHost: 'host-3',
          timestamp: '2025-01-02T12:00:00Z',
          status: 'success',
          duration: 15000,
        },
      ];

      mockFailoverService.getMigrationHistory.mockReturnValue(mockMigrationHistory);

      const result = await controller.getMigrationHistory();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMigrationHistory);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].status).toBe('success');
      expect(mockFailoverService.getMigrationHistory).toHaveBeenCalled();
    });

    it('should include migration details', async () => {
      const mockMigrationHistory = [
        {
          deviceId: 'device-123',
          fromHost: 'node-1',
          toHost: 'node-2',
          timestamp: '2025-01-03T14:00:00Z',
          status: 'success',
          duration: 10000,
          reason: 'host_overload',
        },
      ];

      mockFailoverService.getMigrationHistory.mockReturnValue(mockMigrationHistory);

      const result = await controller.getMigrationHistory();

      expect(result.data[0].fromHost).toBe('node-1');
      expect(result.data[0].toHost).toBe('node-2');
      expect(result.data[0].duration).toBe(10000);
      expect(result.data[0].reason).toBe('host_overload');
    });

    it('should return empty array when no migrations', async () => {
      mockFailoverService.getMigrationHistory.mockReturnValue([]);

      const result = await controller.getMigrationHistory();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('triggerDetection', () => {
    it('should trigger failure detection and recovery', async () => {
      mockFailoverService.detectAndRecoverFailures.mockResolvedValue(undefined);

      const result = await controller.triggerDetection();

      expect(result.success).toBe(true);
      expect(result.message).toBe('故障检测和恢复任务已执行');
      expect(mockFailoverService.detectAndRecoverFailures).toHaveBeenCalled();
    });

    it('should be an async operation', async () => {
      mockFailoverService.detectAndRecoverFailures.mockResolvedValue(undefined);

      const promise = controller.triggerDetection();

      expect(promise).toBeInstanceOf(Promise);
      await promise;
      expect(mockFailoverService.detectAndRecoverFailures).toHaveBeenCalledTimes(1);
    });
  });

  describe('triggerRecovery', () => {
    it('should trigger manual recovery successfully', async () => {
      const mockResult = {
        success: true,
        deviceId: 'device-123',
        message: 'Device recovered successfully',
      };

      mockFailoverService.triggerManualRecovery.mockResolvedValue(mockResult);

      const result = await controller.triggerRecovery('device-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe('设备 device-123 恢复成功');
      expect(mockFailoverService.triggerManualRecovery).toHaveBeenCalledWith('device-123');
    });

    it('should handle recovery failure', async () => {
      const mockResult = {
        success: false,
        deviceId: 'device-456',
        error: 'Device not found',
      };

      mockFailoverService.triggerManualRecovery.mockResolvedValue(mockResult);

      const result = await controller.triggerRecovery('device-456');

      expect(result.success).toBe(false);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe('设备 device-456 恢复失败: Device not found');
    });

    it('should include recovery details', async () => {
      const mockResult = {
        success: true,
        deviceId: 'device-789',
        message: 'Recovery completed',
        recoveryDuration: 5500,
        actions: ['restart_container', 'restore_state'],
      };

      mockFailoverService.triggerManualRecovery.mockResolvedValue(mockResult);

      const result = await controller.triggerRecovery('device-789');

      expect(result.data.recoveryDuration).toBe(5500);
      expect(result.data.actions).toContain('restart_container');
      expect(result.data.actions).toContain('restore_state');
    });
  });

  describe('Response Format', () => {
    it('should return standard response format with success flag', async () => {
      mockFailoverService.getConfig.mockReturnValue({});

      const result = await controller.getConfig();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(typeof result.success).toBe('boolean');
    });

    it('should include message in mutation operations', async () => {
      mockFailoverService.updateConfig.mockReturnValue(undefined);
      mockFailoverService.getConfig.mockReturnValue({});

      const result = await controller.updateConfig({});

      expect(result).toHaveProperty('message');
      expect(typeof result.message).toBe('string');
    });
  });
});
