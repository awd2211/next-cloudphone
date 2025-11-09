import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { DeviceProviderType } from './provider.types';

describe('ProvidersController', () => {
  let controller: ProvidersController;
  let providersService: any;

  const mockProvidersService = {
    getAllProviderSpecs: jest.fn(),
    getProviderSpecsByType: jest.fn(),
    getCloudSyncStatus: jest.fn(),
    triggerCloudSync: jest.fn(),
    getProviderHealth: jest.fn(),
    getProviderConfig: jest.fn(),
    updateProviderConfig: jest.fn(),
    testProviderConnection: jest.fn(),
    getCloudBillingReconciliation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersController],
      providers: [
        {
          provide: ProvidersService,
          useValue: mockProvidersService,
        },
      ],
    }).compile();

    controller = module.get<ProvidersController>(ProvidersController);
    providersService = module.get(ProvidersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have providersService injected', () => {
      expect(providersService).toBeDefined();
      expect(providersService).toBe(mockProvidersService);
    });
  });

  describe('getAllProviderSpecs', () => {
    it('should return all provider specs', async () => {
      const mockSpecs = [
        { provider: DeviceProviderType.ALIYUN, specs: ['spec-1', 'spec-2'] },
        { provider: DeviceProviderType.TENCENT, specs: ['spec-3', 'spec-4'] },
        { provider: DeviceProviderType.HUAWEI, specs: ['spec-5'] },
      ];

      mockProvidersService.getAllProviderSpecs.mockResolvedValue(mockSpecs);

      const result = await controller.getAllProviderSpecs();

      expect(result.data).toEqual(mockSpecs);
      expect(result.data).toHaveLength(3);
      expect(mockProvidersService.getAllProviderSpecs).toHaveBeenCalled();
    });

    it('should return empty array when no specs exist', async () => {
      mockProvidersService.getAllProviderSpecs.mockResolvedValue([]);

      const result = await controller.getAllProviderSpecs();

      expect(result.data).toEqual([]);
    });

    it('should include all providers', async () => {
      const mockSpecs = [
        { provider: DeviceProviderType.ALIYUN },
        { provider: DeviceProviderType.TENCENT },
        { provider: DeviceProviderType.HUAWEI },
        { provider: DeviceProviderType.AWS },
      ];

      mockProvidersService.getAllProviderSpecs.mockResolvedValue(mockSpecs);

      const result = await controller.getAllProviderSpecs();

      expect(result.data).toHaveLength(4);
    });
  });

  describe('getProviderSpecsByType', () => {
    it('should return specs for specific provider', async () => {
      const mockSpecs = [
        { id: '1', name: 'ecs.t5-c1m1', cpu: 1, memory: 1024 },
        { id: '2', name: 'ecs.t5-c2m2', cpu: 2, memory: 2048 },
      ];

      mockProvidersService.getProviderSpecsByType.mockResolvedValue(mockSpecs);

      const result = await controller.getProviderSpecsByType(DeviceProviderType.ALIYUN);

      expect(result.data).toEqual(mockSpecs);
      expect(result.data).toHaveLength(2);
      expect(mockProvidersService.getProviderSpecsByType).toHaveBeenCalledWith(
        DeviceProviderType.ALIYUN
      );
    });

    it('should handle different providers', async () => {
      const providers = [
        DeviceProviderType.ALIYUN,
        DeviceProviderType.TENCENT,
        DeviceProviderType.HUAWEI,
      ];

      mockProvidersService.getProviderSpecsByType.mockResolvedValue([]);

      for (const provider of providers) {
        await controller.getProviderSpecsByType(provider);
      }

      expect(mockProvidersService.getProviderSpecsByType).toHaveBeenCalledTimes(3);
    });

    it('should return empty array for provider with no specs', async () => {
      mockProvidersService.getProviderSpecsByType.mockResolvedValue([]);

      const result = await controller.getProviderSpecsByType(DeviceProviderType.AWS);

      expect(result.data).toEqual([]);
    });
  });

  describe('getCloudSyncStatus', () => {
    it('should return cloud sync status', async () => {
      const query = { provider: DeviceProviderType.ALIYUN };
      const mockStatus = {
        provider: DeviceProviderType.ALIYUN,
        lastSyncTime: '2025-01-06T10:00:00Z',
        status: 'success',
        syncedDevices: 150,
      };

      mockProvidersService.getCloudSyncStatus.mockResolvedValue(mockStatus);

      const result = await controller.getCloudSyncStatus(query);

      expect(result).toEqual(mockStatus);
      expect(result.syncedDevices).toBe(150);
      expect(mockProvidersService.getCloudSyncStatus).toHaveBeenCalledWith(query);
    });

    it('should handle sync status for all providers', async () => {
      const query = {};
      const mockStatus = {
        providers: [
          { provider: DeviceProviderType.ALIYUN, status: 'success' },
          { provider: DeviceProviderType.TENCENT, status: 'pending' },
        ],
      };

      mockProvidersService.getCloudSyncStatus.mockResolvedValue(mockStatus);

      const result = await controller.getCloudSyncStatus(query);

      expect(result.providers).toHaveLength(2);
    });

    it('should return sync failure status', async () => {
      const query = { provider: DeviceProviderType.HUAWEI };
      const mockStatus = {
        provider: DeviceProviderType.HUAWEI,
        status: 'failed',
        error: 'Connection timeout',
      };

      mockProvidersService.getCloudSyncStatus.mockResolvedValue(mockStatus);

      const result = await controller.getCloudSyncStatus(query);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Connection timeout');
    });
  });

  describe('triggerCloudSync', () => {
    it('should trigger cloud sync for specific provider', async () => {
      const dto = { provider: DeviceProviderType.ALIYUN };
      const mockResponse = {
        success: true,
        message: 'Sync triggered for ALIYUN',
        jobId: 'sync-job-123',
      };

      mockProvidersService.triggerCloudSync.mockResolvedValue(mockResponse);

      const result = await controller.triggerCloudSync(dto);

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('sync-job-123');
      expect(mockProvidersService.triggerCloudSync).toHaveBeenCalledWith(DeviceProviderType.ALIYUN);
    });

    it('should trigger sync for all providers when no provider specified', async () => {
      const dto = {};
      const mockResponse = {
        success: true,
        message: 'Sync triggered for all providers',
      };

      mockProvidersService.triggerCloudSync.mockResolvedValue(mockResponse);

      const result = await controller.triggerCloudSync(dto);

      expect(result.success).toBe(true);
      expect(mockProvidersService.triggerCloudSync).toHaveBeenCalledWith(undefined);
    });

    it('should handle different providers', async () => {
      const providers = [DeviceProviderType.ALIYUN, DeviceProviderType.TENCENT];

      mockProvidersService.triggerCloudSync.mockResolvedValue({ success: true });

      for (const provider of providers) {
        await controller.triggerCloudSync({ provider });
        expect(mockProvidersService.triggerCloudSync).toHaveBeenCalledWith(provider);
      }
    });
  });

  describe('getProviderHealth', () => {
    it('should return provider health status', async () => {
      const mockHealth = [
        { provider: DeviceProviderType.ALIYUN, status: 'healthy', responseTime: 150 },
        { provider: DeviceProviderType.TENCENT, status: 'healthy', responseTime: 200 },
        { provider: DeviceProviderType.HUAWEI, status: 'degraded', responseTime: 800 },
      ];

      mockProvidersService.getProviderHealth.mockResolvedValue(mockHealth);

      const result = await controller.getProviderHealth();

      expect(result.data).toEqual(mockHealth);
      expect(result.data).toHaveLength(3);
      expect(result.data[0].status).toBe('healthy');
      expect(mockProvidersService.getProviderHealth).toHaveBeenCalled();
    });

    it('should handle unhealthy providers', async () => {
      const mockHealth = [
        { provider: DeviceProviderType.ALIYUN, status: 'unhealthy', error: 'API timeout' },
      ];

      mockProvidersService.getProviderHealth.mockResolvedValue(mockHealth);

      const result = await controller.getProviderHealth();

      expect(result.data[0].status).toBe('unhealthy');
      expect(result.data[0].error).toBe('API timeout');
    });

    it('should return health for all configured providers', async () => {
      const mockHealth = [
        { provider: DeviceProviderType.ALIYUN, status: 'healthy' },
        { provider: DeviceProviderType.TENCENT, status: 'healthy' },
        { provider: DeviceProviderType.HUAWEI, status: 'healthy' },
        { provider: DeviceProviderType.AWS, status: 'healthy' },
      ];

      mockProvidersService.getProviderHealth.mockResolvedValue(mockHealth);

      const result = await controller.getProviderHealth();

      expect(result.data).toHaveLength(4);
    });
  });

  describe('getProviderConfig', () => {
    it('should return provider configuration', async () => {
      const mockConfig = {
        provider: DeviceProviderType.ALIYUN,
        accessKeyId: 'LTAI***',
        region: 'cn-hangzhou',
        enabled: true,
      };

      mockProvidersService.getProviderConfig.mockResolvedValue(mockConfig);

      const result = await controller.getProviderConfig(DeviceProviderType.ALIYUN);

      expect(result).toEqual(mockConfig);
      expect(result.provider).toBe(DeviceProviderType.ALIYUN);
      expect(mockProvidersService.getProviderConfig).toHaveBeenCalledWith(DeviceProviderType.ALIYUN);
    });

    it('should return config for different providers', async () => {
      const providers = [DeviceProviderType.TENCENT, DeviceProviderType.HUAWEI];

      mockProvidersService.getProviderConfig.mockResolvedValue({ enabled: true });

      for (const provider of providers) {
        await controller.getProviderConfig(provider);
        expect(mockProvidersService.getProviderConfig).toHaveBeenCalledWith(provider);
      }
    });

    it('should mask sensitive data', async () => {
      const mockConfig = {
        provider: DeviceProviderType.TENCENT,
        secretId: 'AKI***',
        secretKey: '***',
        region: 'ap-guangzhou',
      };

      mockProvidersService.getProviderConfig.mockResolvedValue(mockConfig);

      const result = await controller.getProviderConfig(DeviceProviderType.TENCENT);

      expect(result.secretKey).toBe('***');
    });
  });

  describe('updateProviderConfig', () => {
    it('should update provider configuration', async () => {
      const updateDto = {
        accessKeyId: 'LTAI_NEW',
        region: 'cn-shanghai',
        enabled: true,
      };

      const mockResponse = {
        success: true,
        message: 'Configuration updated',
        config: { ...updateDto, provider: DeviceProviderType.ALIYUN },
      };

      mockProvidersService.updateProviderConfig.mockResolvedValue(mockResponse);

      const result = await controller.updateProviderConfig(DeviceProviderType.ALIYUN, updateDto);

      expect(result.success).toBe(true);
      expect(result.config.region).toBe('cn-shanghai');
      expect(mockProvidersService.updateProviderConfig).toHaveBeenCalledWith(
        DeviceProviderType.ALIYUN,
        updateDto
      );
    });

    it('should update partial configuration', async () => {
      const updateDto = { enabled: false };

      mockProvidersService.updateProviderConfig.mockResolvedValue({ success: true });

      await controller.updateProviderConfig(DeviceProviderType.HUAWEI, updateDto);

      expect(mockProvidersService.updateProviderConfig).toHaveBeenCalledWith(
        DeviceProviderType.HUAWEI,
        updateDto
      );
    });

    it('should handle different providers', async () => {
      const updateDto = { region: 'us-west-1' };

      mockProvidersService.updateProviderConfig.mockResolvedValue({ success: true });

      await controller.updateProviderConfig(DeviceProviderType.AWS, updateDto);

      expect(mockProvidersService.updateProviderConfig).toHaveBeenCalledWith(
        DeviceProviderType.AWS,
        updateDto
      );
    });
  });

  describe('testProviderConnection', () => {
    it('should test provider connection successfully', async () => {
      const mockResult = {
        success: true,
        message: 'Connection successful',
        responseTime: 180,
        details: {
          apiVersion: '2.0',
          region: 'cn-hangzhou',
        },
      };

      mockProvidersService.testProviderConnection.mockResolvedValue(mockResult);

      const result = await controller.testProviderConnection(DeviceProviderType.ALIYUN);

      expect(result.success).toBe(true);
      expect(result.responseTime).toBe(180);
      expect(mockProvidersService.testProviderConnection).toHaveBeenCalledWith(
        DeviceProviderType.ALIYUN
      );
    });

    it('should handle connection failure', async () => {
      const mockResult = {
        success: false,
        message: 'Connection failed',
        error: 'Invalid credentials',
      };

      mockProvidersService.testProviderConnection.mockResolvedValue(mockResult);

      const result = await controller.testProviderConnection(DeviceProviderType.TENCENT);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should test different providers', async () => {
      const providers = [
        DeviceProviderType.ALIYUN,
        DeviceProviderType.TENCENT,
        DeviceProviderType.HUAWEI,
      ];

      mockProvidersService.testProviderConnection.mockResolvedValue({ success: true });

      for (const provider of providers) {
        await controller.testProviderConnection(provider);
      }

      expect(mockProvidersService.testProviderConnection).toHaveBeenCalledTimes(3);
    });
  });

  describe('getCloudBillingReconciliation', () => {
    it('should return cloud billing reconciliation data', async () => {
      const query = {
        provider: DeviceProviderType.ALIYUN,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const mockData = {
        provider: DeviceProviderType.ALIYUN,
        period: '2025-01',
        totalCost: 12500.5,
        discrepancies: [
          { deviceId: 'device-1', cloudCost: 100, localCost: 95, diff: 5 },
        ],
        reconciliationRate: 0.98,
      };

      mockProvidersService.getCloudBillingReconciliation.mockResolvedValue(mockData);

      const result = await controller.getCloudBillingReconciliation(query);

      expect(result).toEqual(mockData);
      expect(result.totalCost).toBe(12500.5);
      expect(result.discrepancies).toHaveLength(1);
      expect(mockProvidersService.getCloudBillingReconciliation).toHaveBeenCalledWith(query);
    });

    it('should handle reconciliation for all providers', async () => {
      const query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const mockData = {
        providers: [
          { provider: DeviceProviderType.ALIYUN, totalCost: 10000 },
          { provider: DeviceProviderType.TENCENT, totalCost: 8000 },
        ],
        totalCost: 18000,
      };

      mockProvidersService.getCloudBillingReconciliation.mockResolvedValue(mockData);

      const result = await controller.getCloudBillingReconciliation(query);

      expect(result.providers).toHaveLength(2);
      expect(result.totalCost).toBe(18000);
    });

    it('should handle period with no discrepancies', async () => {
      const query = {
        provider: DeviceProviderType.HUAWEI,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const mockData = {
        provider: DeviceProviderType.HUAWEI,
        totalCost: 5000,
        discrepancies: [],
        reconciliationRate: 1.0,
      };

      mockProvidersService.getCloudBillingReconciliation.mockResolvedValue(mockData);

      const result = await controller.getCloudBillingReconciliation(query);

      expect(result.discrepancies).toEqual([]);
      expect(result.reconciliationRate).toBe(1.0);
    });
  });

  describe('Response Format', () => {
    it('should return data wrapper for specs endpoints', async () => {
      mockProvidersService.getAllProviderSpecs.mockResolvedValue([]);
      mockProvidersService.getProviderSpecsByType.mockResolvedValue([]);

      const result1 = await controller.getAllProviderSpecs();
      const result2 = await controller.getProviderSpecsByType(DeviceProviderType.ALIYUN);

      expect(result1).toHaveProperty('data');
      expect(result2).toHaveProperty('data');
    });

    it('should return data wrapper for health endpoint', async () => {
      mockProvidersService.getProviderHealth.mockResolvedValue([]);

      const result = await controller.getProviderHealth();

      expect(result).toHaveProperty('data');
    });
  });

  describe('Service Integration', () => {
    it('should call service methods with correct parameters', async () => {
      mockProvidersService.getAllProviderSpecs.mockResolvedValue([]);
      mockProvidersService.getProviderSpecsByType.mockResolvedValue([]);
      mockProvidersService.getCloudSyncStatus.mockResolvedValue({});
      mockProvidersService.triggerCloudSync.mockResolvedValue({});
      mockProvidersService.getProviderHealth.mockResolvedValue([]);
      mockProvidersService.getProviderConfig.mockResolvedValue({});
      mockProvidersService.updateProviderConfig.mockResolvedValue({});
      mockProvidersService.testProviderConnection.mockResolvedValue({});
      mockProvidersService.getCloudBillingReconciliation.mockResolvedValue({});

      await controller.getAllProviderSpecs();
      await controller.getProviderSpecsByType(DeviceProviderType.ALIYUN);
      await controller.getCloudSyncStatus({});
      await controller.triggerCloudSync({});
      await controller.getProviderHealth();
      await controller.getProviderConfig(DeviceProviderType.ALIYUN);
      await controller.updateProviderConfig(DeviceProviderType.ALIYUN, {});
      await controller.testProviderConnection(DeviceProviderType.ALIYUN);
      await controller.getCloudBillingReconciliation({});

      expect(mockProvidersService.getAllProviderSpecs).toHaveBeenCalled();
      expect(mockProvidersService.getProviderSpecsByType).toHaveBeenCalledWith(
        DeviceProviderType.ALIYUN
      );
      expect(mockProvidersService.getCloudSyncStatus).toHaveBeenCalled();
      expect(mockProvidersService.triggerCloudSync).toHaveBeenCalled();
      expect(mockProvidersService.getProviderHealth).toHaveBeenCalled();
      expect(mockProvidersService.getProviderConfig).toHaveBeenCalled();
      expect(mockProvidersService.updateProviderConfig).toHaveBeenCalled();
      expect(mockProvidersService.testProviderConnection).toHaveBeenCalled();
      expect(mockProvidersService.getCloudBillingReconciliation).toHaveBeenCalled();
    });
  });
});
