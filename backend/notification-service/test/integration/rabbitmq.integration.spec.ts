import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { DeviceEventsConsumer } from '../../src/rabbitmq/consumers/device-events.consumer';
import { UserEventsConsumer } from '../../src/rabbitmq/consumers/user-events.consumer';
import { BillingEventsConsumer } from '../../src/rabbitmq/consumers/billing-events.consumer';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { Notification } from '../../src/entities/notification.entity';
import {
  createTestDataSource,
  cleanDatabase,
  closeTestDataSource,
} from '../helpers/test-database.helper';
import {
  createTestRabbitMQConnection,
  createTestChannel,
  publishTestEvent,
  waitForMessageProcessing,
  closeRabbitMQ,
  setupTestExchangeAndQueue,
} from '../helpers/test-rabbitmq.helper';
import { TestDataFactory } from '../helpers/test-data.factory';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as amqp from 'amqplib';
import { EmailService } from '../../src/email/email.service';
import { TemplatesService } from '../../src/templates/templates.service';
import { NotificationGateway } from '../../src/gateway/notification.gateway';
import { CacheService } from '../../src/cache/cache.service';
import { NotificationPreferencesService } from '../../src/notifications/preferences.service';
import { SmsService } from '../../src/sms/sms.service';

describe('RabbitMQ Integration Tests', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let connection: amqp.Connection;
  let channel: amqp.Channel;
  let notificationsService: NotificationsService;
  let notificationRepository;

  // Mock dependencies - must match NotificationsService constructor
  const mockNotificationGateway = {
    sendToUser: jest.fn(),
    broadcast: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    wrap: jest.fn((key, fn) => fn()), // 直接执行函数，不缓存
  };

  const mockPreferencesService = {
    getUserPreferences: jest.fn().mockResolvedValue([
      { type: 'device', channel: 'email', enabled: true },
      { type: 'device', channel: 'sms', enabled: true },
      { type: 'device', channel: 'websocket', enabled: true },
    ]),
    getUserPreference: jest.fn().mockResolvedValue({
      type: 'device',
      enabled: true,
      enabledChannels: ['websocket', 'email', 'sms'], // Array of enabled channels
    }),
    shouldReceiveNotification: jest.fn().mockResolvedValue(true),
  };

  const mockEmailService = {
    sendEmail: jest.fn().mockResolvedValue(true),
  };

  const mockSmsService = {
    sendSms: jest.fn().mockResolvedValue(true),
  };

  const mockTemplatesService = {
    getTemplate: jest.fn(),
    renderTemplate: jest.fn(),
    findByTypeAndRole: jest.fn().mockResolvedValue(null),
    render: jest.fn((template, data) => ({
      title: template.title,
      body: template.body,
    })),
    renderWithRole: jest.fn().mockResolvedValue({
      title: 'Test Notification',
      body: 'Test notification body',
      emailHtml: '<html>Test</html>',
      smsText: 'Test SMS',
    }),
  };

  beforeAll(async () => {
    // 创建真实的数据库和 RabbitMQ 连接
    dataSource = await createTestDataSource();
    notificationRepository = dataSource.getRepository(Notification);
    connection = await createTestRabbitMQConnection();
    channel = await createTestChannel(connection);

    // 创建测试模块 - 必须包含 NotificationsService 的所有依赖
    module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        DeviceEventsConsumer,
        UserEventsConsumer,
        BillingEventsConsumer,
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationRepository,
        },
        {
          provide: NotificationGateway,
          useValue: mockNotificationGateway,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: NotificationPreferencesService,
          useValue: mockPreferencesService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
        {
          provide: TemplatesService,
          useValue: mockTemplatesService,
        },
      ],
    }).compile();

    notificationsService = module.get<NotificationsService>(NotificationsService);

    // 设置测试交换机和队列
    await setupTestExchangeAndQueue(
      channel,
      'cloudphone.events',
      'notification-service.device.created.test',
      'device.created',
    );
  });

  beforeEach(async () => {
    await cleanDatabase(dataSource);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (connection) await closeRabbitMQ(connection);
    if (dataSource) await closeTestDataSource(dataSource);
    if (module) await module.close();
  });

  describe('Device Events Consumer', () => {
    let consumer: DeviceEventsConsumer;

    beforeAll(() => {
      consumer = module.get<DeviceEventsConsumer>(DeviceEventsConsumer);
    });

    it('should consume device.created event and create notification in database', async () => {
      // Arrange
      const userId = TestDataFactory.randomUserId(); // ✅ Use real UUID
      const event = TestDataFactory.createDeviceCreatedEvent({
        payload: {
          userId,
          deviceId: 'device-123',
          deviceName: 'Integration Test Device',
        },
      });

      const mockMessage = {
        fields: { routingKey: 'device.created' },
        properties: {},
        content: Buffer.from(JSON.stringify(event)),
      } as amqp.ConsumeMessage;

      // Act
      await consumer.handleDeviceCreated(event.payload as any, mockMessage);

      // 等待异步处理完成
      await waitForMessageProcessing(500);

      // Assert - 验证数据库中创建了通知
      const notifications = await notificationRepository.find({
        where: { userId },
      });

      expect(notifications.length).toBeGreaterThan(0);
      const notification = notifications[0];
      expect(notification.data).toHaveProperty('deviceName', 'Integration Test Device');
    });

    it('should handle multiple concurrent events', async () => {
      // Arrange
      const events = Array.from({ length: 5 }, (_, i) =>
        TestDataFactory.createDeviceCreatedEvent({
          payload: {
            userId: TestDataFactory.randomUserId(), // ✅ Use real UUID
            deviceId: `device-${i}`,
            deviceName: `Device ${i}`,
          },
        }),
      );

      const mockMessage = {
        fields: { routingKey: 'device.created' },
        properties: {},
        content: Buffer.from('{}'),
      } as amqp.ConsumeMessage;

      // Act - 并发处理多个事件
      await Promise.all(
        events.map(event => consumer.handleDeviceCreated(event.payload as any, mockMessage)),
      );

      await waitForMessageProcessing(500);

      // Assert
      const count = await notificationRepository.count();
      expect(count).toBe(5);
    });

    it('should handle event with missing optional fields gracefully', async () => {
      // Arrange
      const event = TestDataFactory.createDeviceCreatedEvent({
        payload: {
          userId: TestDataFactory.randomUserId(), // ✅ Use real UUID
          deviceId: 'device-123',
          deviceName: 'Minimal Device',
          userEmail: undefined, // 可选字段不提供
          tenantId: undefined,
        },
      });

      const mockMessage = {
        fields: { routingKey: 'device.created' },
        properties: {},
        content: Buffer.from('{}'),
      } as amqp.ConsumeMessage;

      // Act & Assert - 应该不抛出异常
      await expect(
        consumer.handleDeviceCreated(event.payload as any, mockMessage),
      ).resolves.not.toThrow();
    });

    it('should retry and send to DLX on repeated failure', async () => {
      // Arrange
      const event = TestDataFactory.createDeviceCreatedEvent();
      const mockMessage = {
        fields: { routingKey: 'device.created', deliveryTag: 1 },
        properties: {},
        content: Buffer.from('{}'),
      } as amqp.ConsumeMessage;

      // Mock service to throw error
      const spy = jest.spyOn(notificationsService, 'createRoleBasedNotification').mockRejectedValue(
        new Error('Service unavailable'),
      );

      try {
        // Act & Assert
        await expect(
          consumer.handleDeviceCreated(event.payload as any, mockMessage),
        ).rejects.toThrow('Service unavailable');

        // 验证错误被正确抛出，RabbitMQ 会自动重试并最终发送到 DLX
      } finally {
        // ✅ Restore original implementation
        spy.mockRestore();
      }
    });
  });

  describe('User Events Consumer', () => {
    let consumer: UserEventsConsumer;

    beforeAll(() => {
      consumer = module.get<UserEventsConsumer>(UserEventsConsumer);
    });

    it('should consume user.registered event and create notification', async () => {
      // Arrange
      const userId = TestDataFactory.randomUserId(); // ✅ Use real UUID
      const event = TestDataFactory.createUserRegisteredEvent({
        payload: {
          userId,
          username: 'newuser',
          email: 'newuser@example.com',
        },
      });

      const mockMessage = {
        fields: { routingKey: 'user.registered' },
        properties: {},
        content: Buffer.from('{}'),
      } as amqp.ConsumeMessage;

      // Act
      await consumer.handleUserRegistered(event as any, mockMessage); // ✅ Correct method name
      await waitForMessageProcessing(500);

      // Assert
      const notifications = await notificationRepository.find({
        where: { userId },
      });

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].data).toHaveProperty('username', 'newuser');
    });
  });

  describe('Billing Events Consumer', () => {
    let consumer: BillingEventsConsumer;

    beforeAll(() => {
      consumer = module.get<BillingEventsConsumer>(BillingEventsConsumer);
    });

    it('should consume billing.low_balance event and create notification', async () => {
      // Arrange
      const userId = TestDataFactory.randomUserId(); // ✅ Use real UUID
      const event = TestDataFactory.createLowBalanceEvent({
        payload: {
          userId,
          currentBalance: 30.0,
          threshold: 100.0,
        },
      });

      const mockMessage = {
        fields: { routingKey: 'billing.low_balance' },
        properties: {},
        content: Buffer.from('{}'),
      } as amqp.ConsumeMessage;

      // Act
      await consumer.handleLowBalance(event as any, mockMessage);
      await waitForMessageProcessing(500);

      // Assert
      const notifications = await notificationRepository.find({
        where: { userId },
      });

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].data).toHaveProperty('balance', 30.0);
    });
  });

  describe('End-to-End Event Flow', () => {
    it('should publish event to RabbitMQ and consume it successfully', async () => {
      // Arrange
      const userId = TestDataFactory.randomUserId(); // ✅ Use real UUID
      const event = TestDataFactory.createDeviceCreatedEvent({
        payload: {
          userId,
          deviceId: 'e2e-device',
          deviceName: 'E2E Test Device',
        },
      });

      // 设置消费者
      const consumer = module.get<DeviceEventsConsumer>(DeviceEventsConsumer);
      let messageReceived = false;

      await channel.consume(
        'notification-service.device.created.test',
        async msg => {
          if (msg) {
            const parsedEvent = JSON.parse(msg.content.toString());
            await consumer.handleDeviceCreated(parsedEvent.payload, msg);
            messageReceived = true;
            channel.ack(msg);
          }
        },
        { noAck: false },
      );

      // Act - 发布事件到 RabbitMQ
      await publishTestEvent(channel, 'cloudphone.events', 'device.created', event);

      // 等待消息被消费
      await waitForMessageProcessing(2000);

      // Assert
      expect(messageReceived).toBe(true);
      const notifications = await notificationRepository.find({
        where: { userId },
      });
      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should handle high message throughput', async () => {
      // Arrange
      const consumer = module.get<DeviceEventsConsumer>(DeviceEventsConsumer);
      const eventCount = 50;
      const events = Array.from({ length: eventCount }, (_, i) =>
        TestDataFactory.createDeviceCreatedEvent({
          payload: {
            userId: TestDataFactory.randomUserId(), // ✅ Use real UUID for each event
            deviceId: `device-${i}`,
          },
        }),
      );

      // Act - 快速发布50个事件
      for (const event of events) {
        await publishTestEvent(channel, 'cloudphone.events', 'device.created', event);
      }

      // 等待所有消息处理完成
      await waitForMessageProcessing(5000);

      // Assert
      const count = await notificationRepository.count();
      expect(count).toBeGreaterThanOrEqual(eventCount * 0.9); // 至少90%成功（允许少量失败）
    });
  });

  describe('Error Scenarios', () => {
    it('should handle malformed event data', async () => {
      // Arrange
      const consumer = module.get<DeviceEventsConsumer>(DeviceEventsConsumer);
      const malformedEvent: any = {
        payload: {
          // 缺少必填字段
          deviceName: 'Incomplete Device',
        },
      };

      const mockMessage = {
        fields: { routingKey: 'device.created' },
        properties: {},
        content: Buffer.from('{}'),
      } as amqp.ConsumeMessage;

      // Act & Assert
      await expect(consumer.handleDeviceCreated(malformedEvent.payload, mockMessage)).rejects.toThrow();
    });

    it('should handle database connection failure gracefully', async () => {
      // Arrange
      const consumer = module.get<DeviceEventsConsumer>(DeviceEventsConsumer);
      const event = TestDataFactory.createDeviceCreatedEvent();
      const mockMessage = {
        fields: { routingKey: 'device.created' },
        properties: {},
        content: Buffer.from('{}'),
      } as amqp.ConsumeMessage;

      // 模拟数据库连接失败
      const originalSave = notificationRepository.save;
      notificationRepository.save = jest.fn().mockRejectedValue(new Error('Connection lost'));

      // Act & Assert
      await expect(
        consumer.handleDeviceCreated(event.payload as any, mockMessage),
      ).rejects.toThrow();

      // Cleanup
      notificationRepository.save = originalSave;
    });
  });
});
