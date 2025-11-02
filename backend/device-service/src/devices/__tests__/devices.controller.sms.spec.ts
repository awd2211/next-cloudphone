import { Test, TestingModule } from '@nestjs/testing';
import { DevicesController } from '../devices.controller';
import { DevicesService } from '../devices.service';
import { PermissionGuard } from '@cloudphone/shared';
import { QuotaGuard } from '../../quota/quota.guard';
import { QuotaClientService } from '../../quota/quota-client.service';
import { Reflector } from '@nestjs/core';
import { DeviceStatus } from '../../entities/device.entity';
import {
  RequestSmsDto,
  CancelSmsDto,
  SmsNumberResponse,
  SmsMessageDto,
} from '../dto/sms-request.dto';

/**
 * DevicesController SMS 端点测试
 * 测试 SMS 虚拟号码相关的 HTTP 端点
 */
describe('DevicesController - SMS Endpoints', () => {
  let controller: DevicesController;
  let service: jest.Mocked<DevicesService>;

  const mockDeviceId = 'device-123';
  const mockUserId = 'user-456';
  const mockRequestId = 'sms-request-789';
  const mockPhoneNumber = '+79001234567';

  const mockDevice = {
    id: mockDeviceId,
    userId: mockUserId,
    name: 'Test Device',
    status: DeviceStatus.RUNNING,
    metadata: {
      smsNumberRequest: {
        requestId: mockRequestId,
        phoneNumber: mockPhoneNumber,
        country: 'RU',
        service: 'telegram',
        status: 'active',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSmsResponse: SmsNumberResponse = {
    requestId: mockRequestId,
    phoneNumber: mockPhoneNumber,
    country: 'RU',
    service: 'telegram',
    status: 'pending',
    expiresAt: new Date(Date.now() + 300000).toISOString(),
  };

  const mockSmsMessage: SmsMessageDto = {
    from: '+79009876543',
    text: '123456',
    receivedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    // 创建 mock service
    const mockDevicesService = {
      requestSms: jest.fn().mockResolvedValue(mockSmsResponse),
      findOne: jest.fn().mockResolvedValue(mockDevice),
      cancelSms: jest.fn().mockResolvedValue(undefined),
      getSmsMessages: jest.fn().mockResolvedValue([mockSmsMessage]),
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

  describe('POST /devices/:id/request-sms - 请求虚拟 SMS 号码', () => {
    it('应该成功请求虚拟 SMS 号码', async () => {
      const dto: RequestSmsDto = {
        country: 'RU',
        service: 'telegram',
        operator: 'mts',
      };

      const result = await controller.requestSms(mockDeviceId, dto);

      expect(result).toEqual(mockSmsResponse);
      expect(service.requestSms).toHaveBeenCalledWith(mockDeviceId, dto);
      expect(service.requestSms).toHaveBeenCalledTimes(1);
    });

    it('应该验证请求参数的完整性', async () => {
      const dto: RequestSmsDto = {
        country: 'RU',
        service: 'telegram',
        // operator 是可选的
      };

      await controller.requestSms(mockDeviceId, dto);

      expect(service.requestSms).toHaveBeenCalledWith(mockDeviceId, dto);
    });

    it('应该传递正确的 deviceId', async () => {
      const dto: RequestSmsDto = {
        country: 'US',
        service: 'google',
      };

      await controller.requestSms('another-device-id', dto);

      expect(service.requestSms).toHaveBeenCalledWith('another-device-id', dto);
    });
  });

  describe('GET /devices/:id/sms-number - 获取虚拟号码信息', () => {
    it('应该返回设备的虚拟号码信息', async () => {
      const result = await controller.getSmsNumber(mockDeviceId);

      expect(result).toEqual(mockDevice.metadata.smsNumberRequest);
      expect(service.findOne).toHaveBeenCalledWith(mockDeviceId);
      expect(service.findOne).toHaveBeenCalledTimes(1);
    });

    it('应该在设备没有虚拟号码时返回 null', async () => {
      service.findOne.mockResolvedValue({
        ...mockDevice,
        metadata: {},
      } as any);

      const result = await controller.getSmsNumber(mockDeviceId);

      expect(result).toBeNull();
      expect(service.findOne).toHaveBeenCalledWith(mockDeviceId);
    });

    it('应该在 metadata 为 undefined 时返回 null', async () => {
      service.findOne.mockResolvedValue({
        ...mockDevice,
        metadata: undefined,
      } as any);

      const result = await controller.getSmsNumber(mockDeviceId);

      expect(result).toBeNull();
    });
  });

  describe('DELETE /devices/:id/sms-number - 取消虚拟号码', () => {
    it('应该成功取消虚拟号码', async () => {
      const dto: CancelSmsDto = {
        reason: '测试完成',
      };

      await controller.cancelSms(mockDeviceId, dto);

      expect(service.cancelSms).toHaveBeenCalledWith(mockDeviceId, dto);
      expect(service.cancelSms).toHaveBeenCalledTimes(1);
    });

    it('应该支持不传入 reason', async () => {
      await controller.cancelSms(mockDeviceId);

      expect(service.cancelSms).toHaveBeenCalledWith(mockDeviceId, undefined);
    });

    it('应该传递正确的 deviceId', async () => {
      const dto: CancelSmsDto = {
        reason: '不再需要',
      };

      await controller.cancelSms('another-device-id', dto);

      expect(service.cancelSms).toHaveBeenCalledWith('another-device-id', dto);
    });
  });

  describe('GET /devices/:id/sms-messages - 获取 SMS 消息历史', () => {
    it('应该返回 SMS 消息历史', async () => {
      const result = await controller.getSmsMessages(mockDeviceId);

      expect(result).toEqual([mockSmsMessage]);
      expect(service.getSmsMessages).toHaveBeenCalledWith(mockDeviceId);
      expect(service.getSmsMessages).toHaveBeenCalledTimes(1);
    });

    it('应该在没有消息时返回空数组', async () => {
      service.getSmsMessages.mockResolvedValue([]);

      const result = await controller.getSmsMessages(mockDeviceId);

      expect(result).toEqual([]);
      expect(service.getSmsMessages).toHaveBeenCalledWith(mockDeviceId);
    });

    it('应该传递正确的 deviceId', async () => {
      await controller.getSmsMessages('another-device-id');

      expect(service.getSmsMessages).toHaveBeenCalledWith('another-device-id');
    });

    it('应该返回数组类型的响应', async () => {
      const messages = [
        mockSmsMessage,
        {
          from: '+79001111111',
          text: '654321',
          receivedAt: new Date().toISOString(),
        },
      ];

      service.getSmsMessages.mockResolvedValue(messages);

      const result = await controller.getSmsMessages(mockDeviceId);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result).toEqual(messages);
    });
  });

  describe('Controller 集成 - 完整流程', () => {
    it('应该支持完整的 SMS 生命周期', async () => {
      // 1. 请求虚拟号码
      const requestDto: RequestSmsDto = {
        country: 'RU',
        service: 'telegram',
      };

      const requestResult = await controller.requestSms(mockDeviceId, requestDto);
      expect(requestResult).toEqual(mockSmsResponse);

      // 2. 获取虚拟号码信息
      const numberInfo = await controller.getSmsNumber(mockDeviceId);
      expect(numberInfo).toBeTruthy();

      // 3. 获取 SMS 消息
      const messages = await controller.getSmsMessages(mockDeviceId);
      expect(Array.isArray(messages)).toBe(true);

      // 4. 取消虚拟号码
      await controller.cancelSms(mockDeviceId, { reason: '测试完成' });

      // 验证所有方法都被调用
      expect(service.requestSms).toHaveBeenCalled();
      expect(service.findOne).toHaveBeenCalled();
      expect(service.getSmsMessages).toHaveBeenCalled();
      expect(service.cancelSms).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该传递 service 层的错误', async () => {
      const error = new Error('Device not found');
      service.requestSms.mockRejectedValue(error);

      const dto: RequestSmsDto = {
        country: 'RU',
        service: 'telegram',
      };

      await expect(controller.requestSms(mockDeviceId, dto)).rejects.toThrow('Device not found');
    });

    it('cancelSms 应该传递 service 层的错误', async () => {
      const error = new Error('No SMS number assigned');
      service.cancelSms.mockRejectedValue(error);

      await expect(controller.cancelSms(mockDeviceId, { reason: 'test' })).rejects.toThrow(
        'No SMS number assigned',
      );
    });

    it('getSmsMessages 应该传递 service 层的错误', async () => {
      const error = new Error('Device not found');
      service.getSmsMessages.mockRejectedValue(error);

      await expect(controller.getSmsMessages(mockDeviceId)).rejects.toThrow('Device not found');
    });
  });
});
