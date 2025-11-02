import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Repository, DataSource } from 'typeorm';
import { DevicesService } from '../devices.service';
import { Device, DeviceStatus } from '../../entities/device.entity';
import {
  BusinessException,
  BusinessErrorCode,
  HttpClientService,
  EventBusService,
  EventOutboxService,
  SagaOrchestratorService,
} from '@cloudphone/shared';
import { RequestSmsDto, CancelSmsDto, SmsNumberResponse, SmsMessageDto } from '../dto/sms-request.dto';
import { DockerService } from '../../docker/docker.service';
import { AdbService } from '../../adb/adb.service';
import { PortManagerService } from '../../port-manager/port-manager.service';
import { QuotaClientService } from '../../quota/quota-client.service';
import { CacheService } from '../../cache/cache.service';
import { DeviceProviderFactory } from '../../providers/device-provider.factory';

/**
 * DevicesService SMS 方法单元测试
 * 测试 SMS 虚拟号码请求、取消和消息获取功能
 */
describe('DevicesService - SMS Methods', () => {
  let service: DevicesService;
  let httpClient: jest.Mocked<HttpClientService>;
  let cacheService: jest.Mocked<CacheService>;

  const mockDeviceId = 'test-device-001';
  const mockUserId = 'user-001';
  const mockRequestId = 'sms-request-123';
  const mockPhoneNumber = '+79001234567';
  const mockSmsServiceUrl = 'http://localhost:30008';

  beforeEach(async () => {
    // Create minimal mocks for all dependencies
    const mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'SMS_RECEIVE_SERVICE_URL') return mockSmsServiceUrl;
        return defaultValue;
      }),
    };

    const mockHttpClient = {
      post: jest.fn(),
      get: jest.fn(),
    };

    const mockCacheService = {
      wrap: jest.fn((key, fn, ttl) => fn()),
      del: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        {
          provide: getRepositoryToken(Device),
          useValue: mockRepository,
        },
        {
          provide: getDataSourceToken(),
          useValue: {
            query: jest.fn(),
            createQueryRunner: jest.fn(() => ({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
            })),
          },
        },
        {
          provide: DeviceProviderFactory,
          useValue: {
            getProvider: jest.fn(),
          },
        },
        {
          provide: DockerService,
          useValue: {
            createContainer: jest.fn(),
            startContainer: jest.fn(),
            stopContainer: jest.fn(),
          },
        },
        {
          provide: AdbService,
          useValue: {
            connect: jest.fn(),
            disconnect: jest.fn(),
          },
        },
        {
          provide: PortManagerService,
          useValue: {
            allocatePort: jest.fn().mockResolvedValue(5555),
            releasePort: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventBusService,
          useValue: {
            publish: jest.fn(),
            publishDeviceEvent: jest.fn(),
          },
        },
        {
          provide: EventOutboxService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: QuotaClientService,
          useValue: {
            deductQuota: jest.fn(),
            restoreQuota: jest.fn(),
          },
        },
        {
          provide: 'PROXY_CLIENT_SERVICE',
          useValue: {
            createDevice: jest.fn(),
            deleteDevice: jest.fn(),
          },
        },
        {
          provide: 'PROXY_STATS_SERVICE',
          useValue: {
            recordStats: jest.fn(),
          },
        },
        {
          provide: HttpClientService,
          useValue: mockHttpClient,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ModuleRef,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: SagaOrchestratorService,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    httpClient = module.get(HttpClientService);
    cacheService = module.get(CacheService);

    // Spy on logger methods to prevent console output
    jest.spyOn(service['logger'], 'log').mockImplementation();
    jest.spyOn(service['logger'], 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestSms', () => {
    const mockDevice: Partial<Device> = {
      id: mockDeviceId,
      userId: mockUserId,
      status: DeviceStatus.RUNNING,
      metadata: {},
    };

    const requestDto: RequestSmsDto = {
      country: 'RU',
      service: 'telegram',
      operator: 'mts',
    };

    const mockSmsResponse: SmsNumberResponse = {
      requestId: mockRequestId,
      phoneNumber: mockPhoneNumber,
      country: 'RU',
      service: 'telegram',
      status: 'pending',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    };

    it('应该成功请求虚拟 SMS 号码', async () => {
      // Mock findOne to return running device
      jest.spyOn(service, 'findOne').mockResolvedValue(mockDevice as Device);

      // Mock HTTP client response
      httpClient.post.mockResolvedValue({
        data: mockSmsResponse,
      });

      // Mock updateDeviceMetadata (private method, spy on save)
      const saveSpy = jest.spyOn(service['devicesRepository'], 'save').mockResolvedValue(mockDevice as Device);

      // Execute
      const result = await service.requestSms(mockDeviceId, requestDto);

      // Assertions
      expect(result).toEqual(mockSmsResponse);
      expect(service.findOne).toHaveBeenCalledWith(mockDeviceId);
      expect(httpClient.post).toHaveBeenCalledWith(
        `${mockSmsServiceUrl}/sms-numbers/request`,
        {
          deviceId: mockDeviceId,
          userId: mockUserId,
          country: requestDto.country,
          service: requestDto.service,
          operator: requestDto.operator,
        },
        {},
        {
          timeout: 15000,
          retries: 2,
          serviceName: 'sms-receive-service',
        },
      );
    });

    it('应该在设备状态非 RUNNING 时抛出错误', async () => {
      // Mock findOne to return stopped device
      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...mockDevice,
        status: DeviceStatus.STOPPED,
      } as Device);

      // Execute and assert
      await expect(service.requestSms(mockDeviceId, requestDto)).rejects.toThrow('请求虚拟号码失败');
      await expect(service.requestSms(mockDeviceId, requestDto)).rejects.toThrow('设备必须处于运行状态');
    });

    it('应该在 SMS 服务调用失败时抛出错误', async () => {
      // Mock findOne
      jest.spyOn(service, 'findOne').mockResolvedValue(mockDevice as Device);

      // Mock HTTP client to throw error
      httpClient.post.mockRejectedValue(new Error('SMS service unavailable'));

      // Execute and assert
      await expect(service.requestSms(mockDeviceId, requestDto)).rejects.toThrow(BusinessException);
    });
  });

  describe('cancelSms', () => {
    const mockDeviceWithSms: Partial<Device> = {
      id: mockDeviceId,
      userId: mockUserId,
      status: DeviceStatus.RUNNING,
      metadata: {
        smsNumberRequest: {
          requestId: mockRequestId,
          phoneNumber: mockPhoneNumber,
          country: 'RU',
          service: 'telegram',
          status: 'active',
        },
      },
    };

    const cancelDto: CancelSmsDto = {
      reason: '测试完成',
    };

    it('应该成功取消虚拟 SMS 号码', async () => {
      // Mock findOne
      jest.spyOn(service, 'findOne').mockResolvedValue(mockDeviceWithSms as Device);

      // Mock HTTP client
      httpClient.post.mockResolvedValue({ data: { success: true } });

      // Execute
      await service.cancelSms(mockDeviceId, cancelDto);

      // Assertions
      expect(service.findOne).toHaveBeenCalledWith(mockDeviceId);
      expect(httpClient.post).toHaveBeenCalledWith(
        `${mockSmsServiceUrl}/sms-numbers/${mockRequestId}/cancel`,
        {
          reason: cancelDto.reason,
        },
        {},
        {
          timeout: 10000,
          retries: 2,
          serviceName: 'sms-receive-service',
        },
      );
    });

    it('应该在设备未分配虚拟号码时抛出错误', async () => {
      // Mock findOne to return device without SMS number
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: mockDeviceId,
        userId: mockUserId,
        status: DeviceStatus.RUNNING,
        metadata: {},
      } as Device);

      // Execute and assert
      await expect(service.cancelSms(mockDeviceId, cancelDto)).rejects.toThrow('取消虚拟号码失败');
      await expect(service.cancelSms(mockDeviceId, cancelDto)).rejects.toThrow('设备未分配虚拟号码');
    });
  });

  describe('getSmsMessages', () => {
    const mockSmsMessage: SmsMessageDto = {
      from: '+79009876543',
      text: '123456',
      receivedAt: new Date().toISOString(),
    };

    it('应该成功获取 SMS 消息', async () => {
      // Mock findOne to return device with SMS message
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: mockDeviceId,
        userId: mockUserId,
        metadata: {
          lastSmsReceived: mockSmsMessage,
        },
      } as Device);

      // Execute
      const result = await service.getSmsMessages(mockDeviceId);

      // Assertions
      expect(result).toEqual([mockSmsMessage]);
      expect(service.findOne).toHaveBeenCalledWith(mockDeviceId);
    });

    it('应该在没有 SMS 消息时返回空数组', async () => {
      // Mock findOne to return device without SMS message
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: mockDeviceId,
        userId: mockUserId,
        metadata: {},
      } as Device);

      // Execute
      const result = await service.getSmsMessages(mockDeviceId);

      // Assertions
      expect(result).toEqual([]);
    });

    it('应该在 metadata 为 undefined 时返回空数组', async () => {
      // Mock findOne to return device without metadata
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: mockDeviceId,
        userId: mockUserId,
        metadata: undefined,
      } as Device);

      // Execute
      const result = await service.getSmsMessages(mockDeviceId);

      // Assertions
      expect(result).toEqual([]);
    });
  });
});
