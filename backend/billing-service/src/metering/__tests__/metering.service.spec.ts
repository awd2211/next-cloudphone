import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { MeteringService, DeviceUsageData } from '../metering.service';
import { UsageRecord } from '../../billing/entities/usage-record.entity';
import { HttpClientService, DeviceProviderType, DeviceType } from '@cloudphone/shared';
import { PricingEngineService } from '../../billing/pricing-engine.service';
import {
  createMockUsageRecord,
  createMockBillingCalculation,
} from '../../__tests__/helpers/mock-factories';

describe('MeteringService', () => {
  let service: MeteringService;
  let usageRecordRepository: jest.Mocked<Repository<UsageRecord>>;
  let httpClient: jest.Mocked<HttpClientService>;
  let configService: jest.Mocked<ConfigService>;
  let pricingEngine: jest.Mocked<PricingEngineService>;

  const mockDevice = {
    id: 'device-123',
    name: 'Test Device',
    userId: 'user-123',
    tenantId: 'tenant-123',
    status: 'running',
    providerType: DeviceProviderType.REDROID,
    deviceType: DeviceType.PHONE,
    cpu: 2,
    memory: 2048,
    storage: 64,
    lastActiveAt: new Date().toISOString(),
  };

  const mockDeviceStats = {
    cpuUsage: 45.5,
    memoryUsage: 1024,
    storageUsage: 30,
    networkTraffic: 500,
  };

  const mockUsageData: DeviceUsageData = {
    deviceId: 'device-123',
    deviceName: 'Test Device',
    userId: 'user-123',
    tenantId: 'tenant-123',
    providerType: DeviceProviderType.REDROID,
    deviceType: DeviceType.PHONE,
    deviceConfig: {
      cpuCores: 2,
      memoryMB: 2048,
      storageGB: 64,
      gpuEnabled: false,
    },
    cpuUsage: 45.5,
    memoryUsage: 1024,
    storageUsage: 30,
    networkTraffic: 500,
    duration: 3600,
  };

  const mockBillingCalculation = createMockBillingCalculation();

  const mockUsageRecord: UsageRecord = createMockUsageRecord({
    id: 'record-123',
    deviceId: 'device-123',
    userId: 'user-123',
    tenantId: 'tenant-123',
    deviceName: 'Test Device',
    deviceConfig: mockUsageData.deviceConfig,
  });

  beforeEach(async () => {
    const mockUsageRecordRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 10 }),
      })),
    };

    const mockHttpClient = {
      get: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          DEVICE_SERVICE_URL: 'http://localhost:30002',
          USAGE_RECORD_RETENTION_DAYS: 90,
        };
        return config[key] || defaultValue;
      }),
    };

    const mockPricingEngine = {
      calculateCost: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeteringService,
        {
          provide: getRepositoryToken(UsageRecord),
          useValue: mockUsageRecordRepository,
        },
        {
          provide: HttpClientService,
          useValue: mockHttpClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PricingEngineService,
          useValue: mockPricingEngine,
        },
      ],
    }).compile();

    service = module.get<MeteringService>(MeteringService);
    usageRecordRepository = module.get(getRepositoryToken(UsageRecord));
    httpClient = module.get(HttpClientService);
    configService = module.get(ConfigService);
    pricingEngine = module.get(PricingEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Device Usage Collection', () => {
    it('should collect device usage data successfully', async () => {
      httpClient.get
        .mockResolvedValueOnce({ data: mockDevice }) // Device details
        .mockResolvedValueOnce({ data: mockDeviceStats }); // Device stats

      const result = await service.collectDeviceUsage('device-123');

      expect(result).toBeDefined();
      expect(result.deviceId).toBe('device-123');
      expect(result.userId).toBe('user-123');
      expect(result.cpuUsage).toBe(45.5);
      expect(result.memoryUsage).toBe(1024);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(httpClient.get).toHaveBeenCalledTimes(2);
    });

    it('should throw error when device details fetch fails', async () => {
      httpClient.get.mockRejectedValue(new Error('Device not found'));

      await expect(service.collectDeviceUsage('device-123')).rejects.toThrow('Device not found');
    });
  });

  describe('Usage Record Management', () => {
    it('should save usage record with billing calculation', async () => {
      pricingEngine.calculateCost.mockReturnValue(mockBillingCalculation);
      usageRecordRepository.create.mockReturnValue(mockUsageRecord);
      usageRecordRepository.save.mockResolvedValue(mockUsageRecord);

      const result = await service.saveUsageRecord(mockUsageData);

      expect(result).toBeDefined();
      expect(pricingEngine.calculateCost).toHaveBeenCalledWith(
        DeviceProviderType.REDROID,
        mockUsageData.deviceConfig,
        3600
      );
      expect(usageRecordRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'device-123',
          userId: 'user-123',
          cost: 2.5,
          billingRate: 2.5,
        })
      );
      expect(usageRecordRepository.save).toHaveBeenCalled();
    });
  });

  describe('Usage Statistics', () => {
    it('should get user usage statistics', async () => {
      const mockRecords = [
        { ...mockUsageRecord, durationSeconds: 3600, quantity: 1 },
        { ...mockUsageRecord, durationSeconds: 7200, quantity: 2 },
      ];

      usageRecordRepository.find.mockResolvedValue(mockRecords as any);

      const result = await service.getUserUsageStats('user-123');

      expect(result.records).toHaveLength(2);
      expect(result.summary.totalRecords).toBe(2);
      expect(result.summary.totalCpuHours).toBe('3.00');
      expect(result.summary.totalMemoryGB).toBe('3.00');
    });

    it('should get user usage statistics with date range', async () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      usageRecordRepository.find.mockResolvedValue([mockUsageRecord] as any);

      const result = await service.getUserUsageStats('user-123', startDate, endDate);

      expect(usageRecordRepository.find).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          startTime: Between(startDate, endDate),
        },
        order: { startTime: 'DESC' },
      });
      expect(result.records).toBeDefined();
    });

    it('should get device usage statistics', async () => {
      const mockRecords = [
        { ...mockUsageRecord, durationSeconds: 3600, quantity: 1 },
        { ...mockUsageRecord, durationSeconds: 3600, quantity: 1 },
      ];

      usageRecordRepository.find.mockResolvedValue(mockRecords as any);

      const result = await service.getDeviceUsageStats('device-123');

      expect(result.records).toHaveLength(2);
      expect(result.summary.totalRecords).toBe(2);
      expect(result.summary.avgCpuUsage).toBe('1.00');
      expect(result.summary.avgMemoryUsage).toBe('1.00');
    });

    it('should get tenant usage statistics', async () => {
      const mockRecords = [
        { ...mockUsageRecord, userId: 'user-1', deviceId: 'device-1' },
        { ...mockUsageRecord, userId: 'user-2', deviceId: 'device-2' },
        { ...mockUsageRecord, userId: 'user-1', deviceId: 'device-3' },
      ];

      usageRecordRepository.find.mockResolvedValue(mockRecords as any);

      const result = await service.getTenantUsageStats('tenant-123');

      expect(result.totalRecords).toBe(3);
      expect(result.totalUsers).toBe(2);
      expect(result.totalDevices).toBe(3);
      expect(result.userStats).toHaveLength(2);
      expect(result.deviceStats).toHaveLength(3);
    });
  });

  describe('Usage Tracking', () => {
    it('should start usage tracking', async () => {
      const trackingData = {
        deviceId: 'device-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
      };

      usageRecordRepository.create.mockReturnValue(mockUsageRecord);
      usageRecordRepository.save.mockResolvedValue(mockUsageRecord);

      const result = await service.startUsageTracking(trackingData);

      expect(result).toBeDefined();
      expect(usageRecordRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          deviceId: 'device-123',
          usageType: 'device_usage',
          isBilled: false,
        })
      );
    });

    it('should stop usage tracking successfully', async () => {
      const activeRecord = {
        ...mockUsageRecord,
        endTime: null,
        providerType: DeviceProviderType.REDROID,
        deviceConfig: mockUsageData.deviceConfig,
      };

      usageRecordRepository.findOne.mockResolvedValue(activeRecord as any);
      usageRecordRepository.save.mockResolvedValue({
        ...activeRecord,
        endTime: new Date(),
        cost: 2.5,
      } as any);
      pricingEngine.calculateCost.mockReturnValue(mockBillingCalculation);

      await service.stopUsageTracking('device-123', 3600);

      expect(usageRecordRepository.findOne).toHaveBeenCalledWith({
        where: {
          deviceId: 'device-123',
          endTime: null,
        },
        order: {
          createdAt: 'DESC',
        },
      });
      expect(pricingEngine.calculateCost).toHaveBeenCalledWith(
        DeviceProviderType.REDROID,
        mockUsageData.deviceConfig,
        3600
      );
      expect(usageRecordRepository.save).toHaveBeenCalled();
    });

    it('should handle stop tracking when no active record found', async () => {
      usageRecordRepository.findOne.mockResolvedValue(null);

      await service.stopUsageTracking('device-123', 3600);

      expect(usageRecordRepository.findOne).toHaveBeenCalled();
      expect(usageRecordRepository.save).not.toHaveBeenCalled();
    });

    it('should fallback to simple billing when no device config', async () => {
      const activeRecord = {
        ...mockUsageRecord,
        endTime: null,
        providerType: null,
        deviceConfig: null,
      };

      usageRecordRepository.findOne.mockResolvedValue(activeRecord as any);
      usageRecordRepository.save.mockResolvedValue({
        ...activeRecord,
        endTime: new Date(),
        cost: 1.0,
      } as any);

      await service.stopUsageTracking('device-123', 3600);

      expect(pricingEngine.calculateCost).not.toHaveBeenCalled();
      expect(usageRecordRepository.save).toHaveBeenCalled();
    });
  });

  describe('Scheduled Tasks', () => {
    it('should cleanup old usage records', async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 10 }),
      };

      usageRecordRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.cleanupOldRecords();

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });
  });
});
