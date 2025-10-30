import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { EventBusService, SimpleEvent, PublishOptions } from './event-bus.service';

describe('EventBusService', () => {
  let service: EventBusService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockAmqpConnection: jest.Mocked<AmqpConnection>;

  beforeEach(async () => {
    // Mock ConfigService
    mockConfigService = {
      get: jest.fn(),
    } as any;

    // Mock AmqpConnection
    mockAmqpConnection = {
      publish: jest.fn(),
      channel: {} as any,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventBusService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
      ],
    }).compile();

    service = module.get<EventBusService>(EventBusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('构造和初始化', () => {
    it('应该成功创建服务实例', () => {
      expect(service).toBeDefined();
    });

    it('应该处理 AmqpConnection 为空的情况', async () => {
      // Arrange - Create service without AmqpConnection
      const moduleWithoutAmqp = await Test.createTestingModule({
        providers: [
          EventBusService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const serviceWithoutAmqp = moduleWithoutAmqp.get<EventBusService>(EventBusService);

      // Act & Assert
      await expect(
        serviceWithoutAmqp.publish('test-exchange', 'test.key', {}),
      ).rejects.toThrow('AmqpConnection not available');
    });
  });

  describe('publish', () => {
    it('应该成功发布事件', async () => {
      // Arrange
      const exchange = 'cloudphone.events';
      const routingKey = 'device.created';
      const message: SimpleEvent = {
        type: 'device.created',
        deviceId: 'device-123',
        userId: 'user-456',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publish(exchange, routingKey, message);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        exchange,
        routingKey,
        message,
        expect.objectContaining({
          persistent: true,
          timestamp: expect.any(Number),
        }),
      );
    });

    it('应该使用自定义发布选项', async () => {
      // Arrange
      const exchange = 'cloudphone.events';
      const routingKey = 'device.created';
      const message: SimpleEvent = { deviceId: 'device-123' };
      const options: PublishOptions = {
        persistent: false,
        timestamp: 1234567890,
        priority: 5,
        expiration: 60000,
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publish(exchange, routingKey, message, options);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        exchange,
        routingKey,
        message,
        {
          persistent: false,
          timestamp: 1234567890,
          priority: 5,
          expiration: '60000',
        },
      );
    });

    it('应该默认使用持久化消息', async () => {
      // Arrange
      const exchange = 'cloudphone.events';
      const routingKey = 'device.created';
      const message: SimpleEvent = { deviceId: 'device-123' };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publish(exchange, routingKey, message);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        exchange,
        routingKey,
        message,
        expect.objectContaining({
          persistent: true, // Default value
        }),
      );
    });

    it('应该在发布失败时抛出错误', async () => {
      // Arrange
      const exchange = 'cloudphone.events';
      const routingKey = 'device.created';
      const message: SimpleEvent = { deviceId: 'device-123' };
      const error = new Error('RabbitMQ connection failed');

      mockAmqpConnection.publish.mockRejectedValue(error);

      // Act & Assert
      await expect(service.publish(exchange, routingKey, message)).rejects.toThrow(
        'RabbitMQ connection failed',
      );
    });

    it('应该处理数字类型的过期时间', async () => {
      // Arrange
      const message: SimpleEvent = { deviceId: 'device-123' };
      const options: PublishOptions = {
        expiration: 60000, // Number
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publish('test', 'test.key', message, options);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'test',
        'test.key',
        message,
        expect.objectContaining({
          expiration: '60000', // Converted to string
        }),
      );
    });

    it('应该处理字符串类型的过期时间', async () => {
      // Arrange
      const message: SimpleEvent = { deviceId: 'device-123' };
      const options: PublishOptions = {
        expiration: '60000', // String
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publish('test', 'test.key', message, options);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'test',
        'test.key',
        message,
        expect.objectContaining({
          expiration: '60000',
        }),
      );
    });
  });

  describe('publishDeviceEvent', () => {
    it('应该发布设备创建事件', async () => {
      // Arrange
      const payload = {
        deviceId: 'device-123',
        userId: 'user-456',
        status: 'running',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publishDeviceEvent('created', payload);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'device.created',
        expect.objectContaining({
          type: 'device.created',
          timestamp: expect.any(String),
          deviceId: 'device-123',
          userId: 'user-456',
          status: 'running',
        }),
        expect.any(Object),
      );
    });

    it('应该发布设备停止事件', async () => {
      // Arrange
      const payload = {
        deviceId: 'device-123',
        reason: 'user_request',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publishDeviceEvent('stopped', payload);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'device.stopped',
        expect.objectContaining({
          type: 'device.stopped',
          deviceId: 'device-123',
          reason: 'user_request',
        }),
        expect.any(Object),
      );
    });
  });

  describe('publishAppEvent', () => {
    it('应该发布应用安装事件', async () => {
      // Arrange
      const payload = {
        appId: 'app-123',
        deviceId: 'device-456',
        status: 'success',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publishAppEvent('installed', payload);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'app.installed',
        expect.objectContaining({
          type: 'app.installed',
          timestamp: expect.any(String),
          appId: 'app-123',
          deviceId: 'device-456',
          status: 'success',
        }),
        expect.any(Object),
      );
    });

    it('应该发布应用卸载事件', async () => {
      // Arrange
      const payload = {
        appId: 'app-123',
        deviceId: 'device-456',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publishAppEvent('uninstalled', payload);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'app.uninstalled',
        expect.objectContaining({
          type: 'app.uninstalled',
          appId: 'app-123',
        }),
        expect.any(Object),
      );
    });
  });

  describe('publishOrderEvent', () => {
    it('应该发布订单创建事件', async () => {
      // Arrange
      const payload = {
        orderId: 'order-123',
        userId: 'user-456',
        amount: 100,
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publishOrderEvent('created', payload);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'order.created',
        expect.objectContaining({
          type: 'order.created',
          timestamp: expect.any(String),
          orderId: 'order-123',
          userId: 'user-456',
          amount: 100,
        }),
        expect.any(Object),
      );
    });

    it('应该发布订单支付成功事件', async () => {
      // Arrange
      const payload = {
        orderId: 'order-123',
        paymentId: 'payment-456',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publishOrderEvent('payment_success', payload);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'order.payment_success',
        expect.objectContaining({
          type: 'order.payment_success',
          orderId: 'order-123',
        }),
        expect.any(Object),
      );
    });
  });

  describe('publishUserEvent', () => {
    it('应该发布用户注册事件', async () => {
      // Arrange
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publishUserEvent('registered', payload);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'user.registered',
        expect.objectContaining({
          type: 'user.registered',
          timestamp: expect.any(String),
          userId: 'user-123',
          email: 'test@example.com',
        }),
        expect.any(Object),
      );
    });

    it('应该发布用户更新事件', async () => {
      // Arrange
      const payload = {
        userId: 'user-123',
        changes: { name: 'New Name' },
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publishUserEvent('updated', payload);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'user.updated',
        expect.objectContaining({
          type: 'user.updated',
          userId: 'user-123',
        }),
        expect.any(Object),
      );
    });
  });

  describe('publishNotificationEvent', () => {
    it('应该发布通知发送事件', async () => {
      // Arrange
      const payload = {
        notificationId: 'notification-123',
        userId: 'user-456',
        channel: 'email',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publishNotificationEvent('sent', payload);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'notification.sent',
        expect.objectContaining({
          type: 'notification.sent',
          timestamp: expect.any(String),
          notificationId: 'notification-123',
          userId: 'user-456',
          channel: 'email',
        }),
        expect.any(Object),
      );
    });

    it('应该发布通知失败事件', async () => {
      // Arrange
      const payload = {
        notificationId: 'notification-123',
        error: 'SMTP connection failed',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publishNotificationEvent('failed', payload);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'notification.failed',
        expect.objectContaining({
          type: 'notification.failed',
          notificationId: 'notification-123',
        }),
        expect.any(Object),
      );
    });
  });

  describe('publishBillingEvent', () => {
    it('应该发布计费事件', async () => {
      // Arrange
      const payload = {
        userId: 'user-123',
        amount: 100,
        chargeType: 'device_usage',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publishBillingEvent('charged', payload);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'billing.charged',
        expect.objectContaining({
          type: 'billing.charged',
          timestamp: expect.any(String),
          userId: 'user-123',
          amount: 100,
          chargeType: 'device_usage',
        }),
        expect.any(Object),
      );
    });

    it('应该发布支付成功事件', async () => {
      // Arrange
      const payload = {
        userId: 'user-123',
        orderId: 'order-456',
        amount: 100,
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publishBillingEvent('payment_success', payload);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'billing.payment_success',
        expect.objectContaining({
          type: 'billing.payment_success',
          userId: 'user-123',
          orderId: 'order-456',
        }),
        expect.any(Object),
      );
    });
  });

  describe('类型安全和接口', () => {
    it('应该支持 SimpleEvent 接口', async () => {
      // Arrange
      const event: SimpleEvent = {
        type: 'test.event',
        timestamp: new Date().toISOString(),
        customField: 'custom value',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publish('test', 'test.event', event);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'test',
        'test.event',
        event,
        expect.any(Object),
      );
    });

    it('应该支持扩展事件负载', async () => {
      // Arrange
      interface CustomEvent extends SimpleEvent {
        customField1: string;
        customField2: number;
      }

      const event: CustomEvent = {
        type: 'custom.event',
        timestamp: new Date().toISOString(),
        customField1: 'value1',
        customField2: 123,
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publish('test', 'custom.event', event);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'test',
        'custom.event',
        event,
        expect.any(Object),
      );
    });

    it('应该支持动态字段', async () => {
      // Arrange
      const event: SimpleEvent = {
        type: 'dynamic.event',
        dynamicField1: 'value1',
        dynamicField2: 123,
        dynamicField3: { nested: 'object' },
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publish('test', 'dynamic.event', event);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'test',
        'dynamic.event',
        event,
        expect.any(Object),
      );
    });
  });

  describe('错误处理', () => {
    it('应该记录发布失败的错误日志', async () => {
      // Arrange
      const error = new Error('RabbitMQ error');
      mockAmqpConnection.publish.mockRejectedValue(error);

      // Mock logger to spy on error calls
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error');

      // Act & Assert
      await expect(
        service.publish('test', 'test.key', {}),
      ).rejects.toThrow('RabbitMQ error');

      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('应该在所有便捷方法中传播错误', async () => {
      // Arrange
      const error = new Error('Publish failed');
      mockAmqpConnection.publish.mockRejectedValue(error);

      // Act & Assert
      await expect(service.publishDeviceEvent('created', {})).rejects.toThrow();
      await expect(service.publishAppEvent('installed', {})).rejects.toThrow();
      await expect(service.publishOrderEvent('created', {})).rejects.toThrow();
      await expect(service.publishUserEvent('registered', {})).rejects.toThrow();
      await expect(service.publishNotificationEvent('sent', {})).rejects.toThrow();
      await expect(service.publishBillingEvent('charged', {})).rejects.toThrow();
    });
  });

  describe('时间戳处理', () => {
    it('应该自动添加 ISO 格式时间戳', async () => {
      // Arrange
      const payload = { deviceId: 'device-123' };
      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publishDeviceEvent('created', payload);

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'device.created',
        expect.objectContaining({
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), // ISO format
        }),
        expect.any(Object),
      );
    });

    it('应该使用当前时间作为消息时间戳', async () => {
      // Arrange
      const beforeTime = Date.now();
      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publish('test', 'test.key', {});
      const afterTime = Date.now();

      // Assert
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'test',
        'test.key',
        {},
        expect.objectContaining({
          timestamp: expect.any(Number),
        }),
      );

      const callArgs = mockAmqpConnection.publish.mock.calls[0];
      const timestamp = callArgs[3]?.timestamp as number;
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });
});
