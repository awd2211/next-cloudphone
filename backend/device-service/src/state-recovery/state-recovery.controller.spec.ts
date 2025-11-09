import { Test, TestingModule } from '@nestjs/testing';
import { StateRecoveryController } from './state-recovery.controller';
import { StateRecoveryService, StateRecoveryConfig } from './state-recovery.service';

describe('StateRecoveryController', () => {
  let controller: StateRecoveryController;
  let stateRecoveryService: any;

  const mockStateRecoveryService = {
    getConfig: jest.fn(),
    updateConfig: jest.fn(),
    getStatistics: jest.fn(),
    getInconsistencyHistory: jest.fn(),
    getOperationHistory: jest.fn(),
    performConsistencyCheck: jest.fn(),
    rollbackOperation: jest.fn(),
  };

  const mockConfig: StateRecoveryConfig = {
    enabled: true,
    checkIntervalMs: 300000,
    maxHistorySize: 1000,
    autoHealEnabled: true,
    rollbackTimeoutMs: 30000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StateRecoveryController],
      providers: [
        {
          provide: StateRecoveryService,
          useValue: mockStateRecoveryService,
        },
      ],
    }).compile();

    controller = module.get<StateRecoveryController>(StateRecoveryController);
    stateRecoveryService = module.get(StateRecoveryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getConfig', () => {
    it('should return state recovery config', async () => {
      mockStateRecoveryService.getConfig.mockReturnValue(mockConfig);

      const result = await controller.getConfig();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
      expect(result.data.enabled).toBe(true);
      expect(stateRecoveryService.getConfig).toHaveBeenCalled();
    });

    it('should return config with disabled state', async () => {
      const disabledConfig = { ...mockConfig, enabled: false };
      mockStateRecoveryService.getConfig.mockReturnValue(disabledConfig);

      const result = await controller.getConfig();

      expect(result.success).toBe(true);
      expect(result.data.enabled).toBe(false);
    });

    it('should return config with custom intervals', async () => {
      const customConfig = {
        ...mockConfig,
        checkIntervalMs: 600000,
        rollbackTimeoutMs: 60000,
      };
      mockStateRecoveryService.getConfig.mockReturnValue(customConfig);

      const result = await controller.getConfig();

      expect(result.data.checkIntervalMs).toBe(600000);
      expect(result.data.rollbackTimeoutMs).toBe(60000);
    });
  });

  describe('updateConfig', () => {
    it('should update state recovery config', async () => {
      const updates: Partial<StateRecoveryConfig> = {
        checkIntervalMs: 600000,
        maxHistorySize: 2000,
      };

      const updatedConfig = {
        ...mockConfig,
        ...updates,
      };

      mockStateRecoveryService.getConfig.mockReturnValue(updatedConfig);

      const result = await controller.updateConfig(updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedConfig);
      expect(result.message).toBe('状态恢复配置已更新');
      expect(stateRecoveryService.updateConfig).toHaveBeenCalledWith(updates);
      expect(stateRecoveryService.getConfig).toHaveBeenCalled();
    });

    it('should enable/disable auto heal', async () => {
      const updates: Partial<StateRecoveryConfig> = {
        autoHealEnabled: false,
      };

      const updatedConfig = {
        ...mockConfig,
        autoHealEnabled: false,
      };

      mockStateRecoveryService.getConfig.mockReturnValue(updatedConfig);

      const result = await controller.updateConfig(updates);

      expect(result.data.autoHealEnabled).toBe(false);
      expect(stateRecoveryService.updateConfig).toHaveBeenCalledWith(updates);
    });

    it('should update multiple config fields', async () => {
      const updates: Partial<StateRecoveryConfig> = {
        enabled: false,
        checkIntervalMs: 900000,
        maxHistorySize: 500,
      };

      const updatedConfig = { ...mockConfig, ...updates };
      mockStateRecoveryService.getConfig.mockReturnValue(updatedConfig);

      const result = await controller.updateConfig(updates);

      expect(result.data.enabled).toBe(false);
      expect(result.data.checkIntervalMs).toBe(900000);
      expect(result.data.maxHistorySize).toBe(500);
    });
  });

  describe('getStatistics', () => {
    it('should return state recovery statistics', async () => {
      const mockStats = {
        totalChecks: 150,
        inconsistenciesDetected: 12,
        autoHealsPerformed: 10,
        rollbacksPerformed: 2,
        lastCheckTime: new Date('2025-01-06T00:00:00.000Z'),
        averageCheckDuration: 250,
      };

      mockStateRecoveryService.getStatistics.mockReturnValue(mockStats);

      const result = await controller.getStatistics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(result.data.totalChecks).toBe(150);
      expect(result.data.inconsistenciesDetected).toBe(12);
      expect(stateRecoveryService.getStatistics).toHaveBeenCalled();
    });

    it('should handle empty statistics', async () => {
      const mockStats = {
        totalChecks: 0,
        inconsistenciesDetected: 0,
        autoHealsPerformed: 0,
        rollbacksPerformed: 0,
      };

      mockStateRecoveryService.getStatistics.mockReturnValue(mockStats);

      const result = await controller.getStatistics();

      expect(result.success).toBe(true);
      expect(result.data.totalChecks).toBe(0);
    });
  });

  describe('getInconsistencyHistory', () => {
    it('should return inconsistency history', async () => {
      const mockHistory = [
        {
          id: 'inconsistency-1',
          deviceId: 'device-123',
          timestamp: new Date('2025-01-06T00:00:00.000Z'),
          type: 'state_mismatch',
          expectedState: 'running',
          actualState: 'stopped',
          resolved: true,
        },
        {
          id: 'inconsistency-2',
          deviceId: 'device-456',
          timestamp: new Date('2025-01-06T01:00:00.000Z'),
          type: 'missing_container',
          resolved: false,
        },
      ];

      mockStateRecoveryService.getInconsistencyHistory.mockReturnValue(mockHistory);

      const result = await controller.getInconsistencyHistory();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockHistory);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].type).toBe('state_mismatch');
      expect(stateRecoveryService.getInconsistencyHistory).toHaveBeenCalled();
    });

    it('should handle empty inconsistency history', async () => {
      mockStateRecoveryService.getInconsistencyHistory.mockReturnValue([]);

      const result = await controller.getInconsistencyHistory();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should return history with resolved and unresolved items', async () => {
      const mockHistory = [
        { id: '1', resolved: true },
        { id: '2', resolved: false },
        { id: '3', resolved: true },
      ];

      mockStateRecoveryService.getInconsistencyHistory.mockReturnValue(mockHistory);

      const result = await controller.getInconsistencyHistory();

      const resolvedCount = result.data.filter((item: any) => item.resolved).length;
      const unresolvedCount = result.data.filter((item: any) => !item.resolved).length;

      expect(resolvedCount).toBe(2);
      expect(unresolvedCount).toBe(1);
    });
  });

  describe('getOperationHistory', () => {
    it('should return all operation history when entityId is not provided', async () => {
      const mockHistory = [
        {
          id: 'op-1',
          entityId: 'device-123',
          operation: 'start',
          timestamp: new Date('2025-01-06T00:00:00.000Z'),
          canRollback: true,
        },
        {
          id: 'op-2',
          entityId: 'device-456',
          operation: 'stop',
          timestamp: new Date('2025-01-06T01:00:00.000Z'),
          canRollback: true,
        },
      ];

      mockStateRecoveryService.getOperationHistory.mockReturnValue(mockHistory);

      const result = await controller.getOperationHistory();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockHistory);
      expect(result.data).toHaveLength(2);
      expect(stateRecoveryService.getOperationHistory).toHaveBeenCalledWith(undefined);
    });

    it('should return operation history for specific entityId', async () => {
      const entityId = 'device-123';
      const mockHistory = [
        {
          id: 'op-1',
          entityId: 'device-123',
          operation: 'start',
          canRollback: true,
        },
        {
          id: 'op-3',
          entityId: 'device-123',
          operation: 'restart',
          canRollback: false,
        },
      ];

      mockStateRecoveryService.getOperationHistory.mockReturnValue(mockHistory);

      const result = await controller.getOperationHistory(entityId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockHistory);
      expect(result.data.every((item: any) => item.entityId === entityId)).toBe(true);
      expect(stateRecoveryService.getOperationHistory).toHaveBeenCalledWith(entityId);
    });

    it('should handle empty operation history', async () => {
      mockStateRecoveryService.getOperationHistory.mockReturnValue([]);

      const result = await controller.getOperationHistory('device-999');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should filter operations by canRollback flag', async () => {
      const mockHistory = [
        { id: 'op-1', canRollback: true },
        { id: 'op-2', canRollback: false },
        { id: 'op-3', canRollback: true },
      ];

      mockStateRecoveryService.getOperationHistory.mockReturnValue(mockHistory);

      const result = await controller.getOperationHistory();

      const rollbackableCount = result.data.filter((item: any) => item.canRollback).length;
      expect(rollbackableCount).toBe(2);
    });
  });

  describe('triggerConsistencyCheck', () => {
    it('should trigger consistency check', async () => {
      mockStateRecoveryService.performConsistencyCheck.mockResolvedValue(undefined);

      const result = await controller.triggerConsistencyCheck();

      expect(result.success).toBe(true);
      expect(result.message).toBe('状态一致性检查已执行');
      expect(stateRecoveryService.performConsistencyCheck).toHaveBeenCalled();
    });

    it('should handle multiple consecutive checks', async () => {
      mockStateRecoveryService.performConsistencyCheck.mockResolvedValue(undefined);

      await controller.triggerConsistencyCheck();
      await controller.triggerConsistencyCheck();
      await controller.triggerConsistencyCheck();

      expect(stateRecoveryService.performConsistencyCheck).toHaveBeenCalledTimes(3);
    });
  });

  describe('rollbackOperation', () => {
    it('should successfully rollback an operation', async () => {
      const operationId = 'op-123';
      const mockResult = {
        success: true,
        operationId: 'op-123',
        rolledBackAt: new Date('2025-01-06T00:00:00.000Z'),
        previousState: 'stopped',
        restoredState: 'running',
      };

      mockStateRecoveryService.rollbackOperation.mockResolvedValue(mockResult);

      const result = await controller.rollbackOperation(operationId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe(`操作 ${operationId} 已成功回滚`);
      expect(stateRecoveryService.rollbackOperation).toHaveBeenCalledWith(operationId);
    });

    it('should handle failed rollback', async () => {
      const operationId = 'op-456';
      const mockResult = {
        success: false,
        operationId: 'op-456',
        error: 'Operation is not rollbackable',
      };

      mockStateRecoveryService.rollbackOperation.mockResolvedValue(mockResult);

      const result = await controller.rollbackOperation(operationId);

      expect(result.success).toBe(false);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe(`回滚失败: ${mockResult.error}`);
    });

    it('should handle rollback with different error messages', async () => {
      const errors = [
        'Operation not found',
        'Operation already rolled back',
        'Rollback timeout',
      ];

      for (const error of errors) {
        const mockResult = {
          success: false,
          error,
        };

        mockStateRecoveryService.rollbackOperation.mockResolvedValue(mockResult);

        const result = await controller.rollbackOperation('op-test');

        expect(result.success).toBe(false);
        expect(result.message).toContain(error);
      }
    });

    it('should rollback multiple operations', async () => {
      const operationIds = ['op-1', 'op-2', 'op-3'];

      for (const id of operationIds) {
        const mockResult = { success: true, operationId: id };
        mockStateRecoveryService.rollbackOperation.mockResolvedValue(mockResult);

        await controller.rollbackOperation(id);

        expect(stateRecoveryService.rollbackOperation).toHaveBeenCalledWith(id);
      }

      expect(stateRecoveryService.rollbackOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('Response Format', () => {
    it('should return success flag in all responses', async () => {
      mockStateRecoveryService.getConfig.mockReturnValue(mockConfig);
      mockStateRecoveryService.getStatistics.mockReturnValue({});
      mockStateRecoveryService.getInconsistencyHistory.mockReturnValue([]);
      mockStateRecoveryService.getOperationHistory.mockReturnValue([]);
      mockStateRecoveryService.performConsistencyCheck.mockResolvedValue(undefined);
      mockStateRecoveryService.rollbackOperation.mockResolvedValue({ success: true });

      const configResult = await controller.getConfig();
      const statsResult = await controller.getStatistics();
      const inconsistencyResult = await controller.getInconsistencyHistory();
      const operationResult = await controller.getOperationHistory();
      const checkResult = await controller.triggerConsistencyCheck();
      const rollbackResult = await controller.rollbackOperation('op-1');

      expect(configResult.success).toBe(true);
      expect(statsResult.success).toBe(true);
      expect(inconsistencyResult.success).toBe(true);
      expect(operationResult.success).toBe(true);
      expect(checkResult.success).toBe(true);
      expect(rollbackResult.success).toBe(true);
    });

    it('should return data property for query endpoints', async () => {
      mockStateRecoveryService.getConfig.mockReturnValue(mockConfig);
      mockStateRecoveryService.getStatistics.mockReturnValue({ total: 10 });
      mockStateRecoveryService.getInconsistencyHistory.mockReturnValue([]);
      mockStateRecoveryService.getOperationHistory.mockReturnValue([]);

      const configResult = await controller.getConfig();
      const statsResult = await controller.getStatistics();
      const inconsistencyResult = await controller.getInconsistencyHistory();
      const operationResult = await controller.getOperationHistory();

      expect(configResult.data).toBeDefined();
      expect(statsResult.data).toBeDefined();
      expect(inconsistencyResult.data).toBeDefined();
      expect(operationResult.data).toBeDefined();
    });

    it('should return message property for action endpoints', async () => {
      mockStateRecoveryService.getConfig.mockReturnValue(mockConfig);
      mockStateRecoveryService.performConsistencyCheck.mockResolvedValue(undefined);
      mockStateRecoveryService.rollbackOperation.mockResolvedValue({ success: true });

      const updateResult = await controller.updateConfig({});
      const checkResult = await controller.triggerConsistencyCheck();
      const rollbackResult = await controller.rollbackOperation('op-1');

      expect(updateResult.message).toBeDefined();
      expect(checkResult.message).toBeDefined();
      expect(rollbackResult.message).toBeDefined();
    });
  });
});
