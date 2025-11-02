import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SmsEventsConsumer } from '../sms-events.consumer';
import { AdbService } from '../../../adb/adb.service';
import { DevicesService } from '../../../devices/devices.service';
import { DeviceStatus } from '../../../entities/device.entity';
import { ConsumeMessage } from 'amqplib';

/**
 * SmsEventsConsumer 单元测试
 * 测试 RabbitMQ SMS 事件消费者
 */
describe('SmsEventsConsumer', () => {
  let consumer: SmsEventsConsumer;
  let adbService: jest.Mocked<AdbService>;
  let devicesService: jest.Mocked<DevicesService>;

  const mockDeviceId = 'device-123';
  const mockUserId = 'user-456';
  const mockRequestId = 'sms-request-789';
  const mockPhoneNumber = '+79001234567';
  const mockVerificationCode = '123456';
  const mockMessageId = 'msg-abc';

  const mockDevice = {
    id: mockDeviceId,
    userId: mockUserId,
    status: DeviceStatus.RUNNING,
    metadata: {},
  };

  const mockConsumeMessage = {} as ConsumeMessage;

  beforeEach(async () => {
    const mockAdbService = {
      broadcastSmsCode: jest.fn().mockResolvedValue(undefined),
    };

    const mockDevicesService = {
      findOne: jest.fn().mockResolvedValue(mockDevice),
      updateDeviceMetadata: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsEventsConsumer,
        {
          provide: AdbService,
          useValue: mockAdbService,
        },
        {
          provide: DevicesService,
          useValue: mockDevicesService,
        },
      ],
    }).compile();

    consumer = module.get<SmsEventsConsumer>(SmsEventsConsumer);
    adbService = module.get(AdbService);
    devicesService = module.get(DevicesService);

    // Spy on logger to prevent console output
    jest.spyOn(consumer['logger'], 'log').mockImplementation();
    jest.spyOn(consumer['logger'], 'warn').mockImplementation();
    jest.spyOn(consumer['logger'], 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleSmsMessageReceived - 处理短信验证码接收事件', () => {
    const mockEvent = {
      messageId: mockMessageId,
      deviceId: mockDeviceId,
      phoneNumber: mockPhoneNumber,
      verificationCode: mockVerificationCode,
      service: 'telegram',
      receivedAt: new Date().toISOString(),
      userId: mockUserId,
    };

    it('应该成功处理短信验证码事件', async () => {
      await consumer.handleSmsMessageReceived(mockEvent, mockConsumeMessage);

      // 验证设备查询
      expect(devicesService.findOne).toHaveBeenCalledWith(mockDeviceId);

      // 验证 ADB broadcast 调用
      expect(adbService.broadcastSmsCode).toHaveBeenCalledWith(
        mockDeviceId,
        mockVerificationCode,
        mockPhoneNumber,
        mockEvent.service,
      );

      // 验证 metadata 更新
      expect(devicesService.updateDeviceMetadata).toHaveBeenCalledWith(
        mockDeviceId,
        expect.objectContaining({
          lastSmsReceived: expect.objectContaining({
            messageId: mockMessageId,
            phoneNumber: mockPhoneNumber,
            verificationCode: mockVerificationCode,
            service: mockEvent.service,
            receivedAt: mockEvent.receivedAt,
            pushedAt: expect.any(String),
          }),
        }),
      );
    });

    it('应该在设备不存在时跳过处理', async () => {
      devicesService.findOne.mockResolvedValue(null);

      await consumer.handleSmsMessageReceived(mockEvent, mockConsumeMessage);

      expect(devicesService.findOne).toHaveBeenCalledWith(mockDeviceId);
      expect(adbService.broadcastSmsCode).not.toHaveBeenCalled();
      expect(devicesService.updateDeviceMetadata).not.toHaveBeenCalled();
      expect(consumer['logger'].warn).toHaveBeenCalledWith(`设备不存在: ${mockDeviceId}`);
    });

    it('应该在设备状态非 RUNNING 时跳过推送', async () => {
      devicesService.findOne.mockResolvedValue({
        ...mockDevice,
        status: DeviceStatus.STOPPED,
      } as any);

      await consumer.handleSmsMessageReceived(mockEvent, mockConsumeMessage);

      expect(devicesService.findOne).toHaveBeenCalledWith(mockDeviceId);
      expect(adbService.broadcastSmsCode).not.toHaveBeenCalled();
      expect(devicesService.updateDeviceMetadata).not.toHaveBeenCalled();
      expect(consumer['logger'].warn).toHaveBeenCalledWith(
        expect.stringContaining('设备状态不是 RUNNING'),
      );
    });

    it('应该在 ADB broadcast 失败时抛出错误', async () => {
      const error = new Error('ADB connection failed');
      adbService.broadcastSmsCode.mockRejectedValue(error);

      await expect(
        consumer.handleSmsMessageReceived(mockEvent, mockConsumeMessage),
      ).rejects.toThrow('ADB connection failed');

      expect(devicesService.findOne).toHaveBeenCalled();
      expect(adbService.broadcastSmsCode).toHaveBeenCalled();
      expect(devicesService.updateDeviceMetadata).not.toHaveBeenCalled();
      expect(consumer['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('处理短信验证码事件失败'),
        expect.any(String),
      );
    });

    it('应该在 metadata 更新失败时抛出错误', async () => {
      const error = new Error('Database error');
      devicesService.updateDeviceMetadata.mockRejectedValue(error);

      await expect(
        consumer.handleSmsMessageReceived(mockEvent, mockConsumeMessage),
      ).rejects.toThrow('Database error');

      expect(adbService.broadcastSmsCode).toHaveBeenCalled();
      expect(devicesService.updateDeviceMetadata).toHaveBeenCalled();
    });

    it('应该处理没有 service 字段的事件', async () => {
      const eventWithoutService = {
        ...mockEvent,
        service: undefined,
      };

      await consumer.handleSmsMessageReceived(eventWithoutService, mockConsumeMessage);

      expect(adbService.broadcastSmsCode).toHaveBeenCalledWith(
        mockDeviceId,
        mockVerificationCode,
        mockPhoneNumber,
        undefined,
      );
    });
  });

  describe('handleSmsNumberRequested - 处理虚拟号码请求事件', () => {
    const mockEvent = {
      requestId: mockRequestId,
      deviceId: mockDeviceId,
      userId: mockUserId,
      country: 'RU',
      service: 'telegram',
      requestedAt: new Date().toISOString(),
    };

    it('应该成功处理虚拟号码请求事件', async () => {
      await consumer.handleSmsNumberRequested(mockEvent, mockConsumeMessage);

      // 验证设备查询
      expect(devicesService.findOne).toHaveBeenCalledWith(mockDeviceId);

      // 验证 metadata 更新
      expect(devicesService.updateDeviceMetadata).toHaveBeenCalledWith(
        mockDeviceId,
        expect.objectContaining({
          smsNumberRequest: expect.objectContaining({
            requestId: mockRequestId,
            country: mockEvent.country,
            service: mockEvent.service,
            status: 'pending',
            requestedAt: mockEvent.requestedAt,
          }),
        }),
      );
    });

    it('应该在设备不存在时跳过处理', async () => {
      devicesService.findOne.mockResolvedValue(null);

      await consumer.handleSmsNumberRequested(mockEvent, mockConsumeMessage);

      expect(devicesService.findOne).toHaveBeenCalledWith(mockDeviceId);
      expect(devicesService.updateDeviceMetadata).not.toHaveBeenCalled();
      expect(consumer['logger'].warn).toHaveBeenCalledWith(`设备不存在: ${mockDeviceId}`);
    });

    it('应该在 metadata 更新失败时抛出错误', async () => {
      const error = new Error('Database error');
      devicesService.updateDeviceMetadata.mockRejectedValue(error);

      await expect(
        consumer.handleSmsNumberRequested(mockEvent, mockConsumeMessage),
      ).rejects.toThrow('Database error');

      expect(devicesService.findOne).toHaveBeenCalled();
      expect(devicesService.updateDeviceMetadata).toHaveBeenCalled();
      expect(consumer['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('处理虚拟号码请求事件失败'),
        expect.any(String),
      );
    });

    it('应该处理没有 service 字段的事件', async () => {
      const eventWithoutService = {
        ...mockEvent,
        service: undefined,
      };

      await consumer.handleSmsNumberRequested(eventWithoutService, mockConsumeMessage);

      expect(devicesService.updateDeviceMetadata).toHaveBeenCalledWith(
        mockDeviceId,
        expect.objectContaining({
          smsNumberRequest: expect.objectContaining({
            service: undefined,
          }),
        }),
      );
    });
  });

  describe('handleSmsNumberCancelled - 处理虚拟号码取消事件', () => {
    const mockEvent = {
      requestId: mockRequestId,
      deviceId: mockDeviceId,
      phoneNumber: mockPhoneNumber,
      userId: mockUserId,
      reason: '用户主动取消',
      cancelledAt: new Date().toISOString(),
    };

    it('应该成功处理虚拟号码取消事件', async () => {
      await consumer.handleSmsNumberCancelled(mockEvent, mockConsumeMessage);

      // 验证设备查询
      expect(devicesService.findOne).toHaveBeenCalledWith(mockDeviceId);

      // 验证 metadata 更新
      expect(devicesService.updateDeviceMetadata).toHaveBeenCalledWith(
        mockDeviceId,
        expect.objectContaining({
          smsNumberRequest: expect.objectContaining({
            requestId: mockRequestId,
            phoneNumber: mockPhoneNumber,
            status: 'cancelled',
            reason: mockEvent.reason,
            cancelledAt: mockEvent.cancelledAt,
          }),
        }),
      );
    });

    it('应该在设备不存在时跳过处理', async () => {
      devicesService.findOne.mockResolvedValue(null);

      await consumer.handleSmsNumberCancelled(mockEvent, mockConsumeMessage);

      expect(devicesService.findOne).toHaveBeenCalledWith(mockDeviceId);
      expect(devicesService.updateDeviceMetadata).not.toHaveBeenCalled();
      expect(consumer['logger'].warn).toHaveBeenCalledWith(`设备不存在: ${mockDeviceId}`);
    });

    it('应该在 metadata 更新失败时抛出错误', async () => {
      const error = new Error('Database error');
      devicesService.updateDeviceMetadata.mockRejectedValue(error);

      await expect(
        consumer.handleSmsNumberCancelled(mockEvent, mockConsumeMessage),
      ).rejects.toThrow('Database error');

      expect(devicesService.findOne).toHaveBeenCalled();
      expect(devicesService.updateDeviceMetadata).toHaveBeenCalled();
      expect(consumer['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('处理虚拟号码取消事件失败'),
        expect.any(String),
      );
    });

    it('应该处理没有 reason 字段的事件', async () => {
      const eventWithoutReason = {
        ...mockEvent,
        reason: undefined,
      };

      await consumer.handleSmsNumberCancelled(eventWithoutReason, mockConsumeMessage);

      expect(devicesService.updateDeviceMetadata).toHaveBeenCalledWith(
        mockDeviceId,
        expect.objectContaining({
          smsNumberRequest: expect.objectContaining({
            reason: undefined,
          }),
        }),
      );
    });
  });

  describe('DLX 错误处理', () => {
    it('handleSmsMessageReceived 应该在错误时抛出异常进入 DLX', async () => {
      const mockEvent = {
        messageId: mockMessageId,
        deviceId: mockDeviceId,
        phoneNumber: mockPhoneNumber,
        verificationCode: mockVerificationCode,
        service: 'telegram',
        receivedAt: new Date().toISOString(),
        userId: mockUserId,
      };

      const error = new Error('Critical error');
      adbService.broadcastSmsCode.mockRejectedValue(error);

      await expect(
        consumer.handleSmsMessageReceived(mockEvent, mockConsumeMessage),
      ).rejects.toThrow('Critical error');
    });

    it('handleSmsNumberRequested 应该在错误时抛出异常进入 DLX', async () => {
      const mockEvent = {
        requestId: mockRequestId,
        deviceId: mockDeviceId,
        userId: mockUserId,
        country: 'RU',
        service: 'telegram',
        requestedAt: new Date().toISOString(),
      };

      const error = new Error('Critical error');
      devicesService.updateDeviceMetadata.mockRejectedValue(error);

      await expect(
        consumer.handleSmsNumberRequested(mockEvent, mockConsumeMessage),
      ).rejects.toThrow('Critical error');
    });

    it('handleSmsNumberCancelled 应该在错误时抛出异常进入 DLX', async () => {
      const mockEvent = {
        requestId: mockRequestId,
        deviceId: mockDeviceId,
        phoneNumber: mockPhoneNumber,
        userId: mockUserId,
        reason: '测试',
        cancelledAt: new Date().toISOString(),
      };

      const error = new Error('Critical error');
      devicesService.updateDeviceMetadata.mockRejectedValue(error);

      await expect(
        consumer.handleSmsNumberCancelled(mockEvent, mockConsumeMessage),
      ).rejects.toThrow('Critical error');
    });
  });

  describe('日志记录', () => {
    it('应该记录短信验证码接收的日志', async () => {
      const mockEvent = {
        messageId: mockMessageId,
        deviceId: mockDeviceId,
        phoneNumber: mockPhoneNumber,
        verificationCode: mockVerificationCode,
        service: 'telegram',
        receivedAt: new Date().toISOString(),
        userId: mockUserId,
      };

      await consumer.handleSmsMessageReceived(mockEvent, mockConsumeMessage);

      expect(consumer['logger'].log).toHaveBeenCalledWith(
        expect.stringContaining('收到短信验证码事件'),
      );
      expect(consumer['logger'].log).toHaveBeenCalledWith(
        expect.stringContaining('短信验证码已推送到设备'),
      );
    });

    it('应该记录虚拟号码请求的日志', async () => {
      const mockEvent = {
        requestId: mockRequestId,
        deviceId: mockDeviceId,
        userId: mockUserId,
        country: 'RU',
        service: 'telegram',
        requestedAt: new Date().toISOString(),
      };

      await consumer.handleSmsNumberRequested(mockEvent, mockConsumeMessage);

      expect(consumer['logger'].log).toHaveBeenCalledWith(
        expect.stringContaining('收到虚拟号码请求事件'),
      );
      expect(consumer['logger'].log).toHaveBeenCalledWith(
        expect.stringContaining('虚拟号码请求已记录'),
      );
    });

    it('应该记录虚拟号码取消的日志', async () => {
      const mockEvent = {
        requestId: mockRequestId,
        deviceId: mockDeviceId,
        phoneNumber: mockPhoneNumber,
        userId: mockUserId,
        reason: '测试',
        cancelledAt: new Date().toISOString(),
      };

      await consumer.handleSmsNumberCancelled(mockEvent, mockConsumeMessage);

      expect(consumer['logger'].log).toHaveBeenCalledWith(
        expect.stringContaining('收到虚拟号码取消事件'),
      );
      expect(consumer['logger'].log).toHaveBeenCalledWith(
        expect.stringContaining('虚拟号码取消已记录'),
      );
    });
  });
});
