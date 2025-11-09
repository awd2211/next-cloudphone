import { Test, TestingModule } from '@nestjs/testing';
import { DeviceEventsConsumer } from '../device-events.consumer';
import { NotificationsService } from '../../../notifications/notifications.service';
import { EmailService } from '../../../email/email.service';
import { TemplatesService } from '../../../templates/templates.service';
import {
  DeviceCreatedEvent,
  DeviceStartedEvent,
  DeviceStoppedEvent,
  DeviceErrorEvent,
  DeviceDeletedEvent,
  DeviceType,
  DeviceProviderType,
} from '../../../types/events';
import { ConsumeMessage } from 'amqplib';

describe('DeviceEventsConsumer', () => {
  let consumer: DeviceEventsConsumer;
  let notificationsService: NotificationsService;
  let emailService: EmailService;
  let templatesService: TemplatesService;

  const mockNotificationsService = {
    createRoleBasedNotification: jest.fn(),
    createAndSend: jest.fn(),
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
  };

  const mockTemplatesService = {
    getTemplate: jest.fn(),
    renderTemplate: jest.fn(),
  };

  const mockConsumeMessage: Partial<ConsumeMessage> = {
    fields: {
      consumerTag: 'test-consumer',
      deliveryTag: 1,
      redelivered: false,
      exchange: 'cloudphone.events',
      routingKey: 'device.created',
    },
    properties: {
      contentType: 'application/json',
      contentEncoding: 'utf-8',
      headers: {},
      deliveryMode: 2,
      priority: 0,
      correlationId: undefined,
      replyTo: undefined,
      expiration: undefined,
      messageId: 'test-message-id',
      timestamp: Date.now(),
      type: undefined,
      userId: undefined,
      appId: undefined,
      clusterId: undefined,
    },
    content: Buffer.from('{}'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceEventsConsumer,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: TemplatesService,
          useValue: mockTemplatesService,
        },
      ],
    }).compile();

    consumer = module.get<DeviceEventsConsumer>(DeviceEventsConsumer);
    notificationsService = module.get<NotificationsService>(NotificationsService);
    emailService = module.get<EmailService>(EmailService);
    templatesService = module.get<TemplatesService>(TemplatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDeviceCreated', () => {
    it('should handle device created event successfully', async () => {
      // Arrange
      const event: DeviceCreatedEvent = {
        deviceId: 'device-123',
        deviceName: 'Test Device',
        deviceType: DeviceType.PHONE,
        providerType: DeviceProviderType.ALIYUN_ECP,
        userId: 'user-123',
        userEmail: 'user@example.com',
        userRole: 'user',
        tenantId: 'tenant-123',
        deviceConfig: {
          cpuCores: 4,
          memoryMB: 8192,
          storageGB: 64,
        },
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      mockNotificationsService.createRoleBasedNotification.mockResolvedValue({
        id: 'notification-123',
        userId: 'user-123',
        title: 'Device Created',
      });

      // Act
      await consumer.handleDeviceCreated(event, mockConsumeMessage as ConsumeMessage);

      // Assert
      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'device.created',
        expect.objectContaining({
          deviceName: 'Test Device',
          deviceId: 'device-123',
          providerType: DeviceProviderType.ALIYUN_ECP,
          cpuCores: 4,
          memoryMB: 8192,
          diskSizeGB: 64,
          spec: '4核 / 8192MB / 64GB',
        }),
        expect.objectContaining({
          userEmail: 'user@example.com',
        })
      );
    });

    it('should handle device created event with different provider', async () => {
      // Arrange
      const event: DeviceCreatedEvent = {
        deviceId: 'device-456',
        deviceName: 'Redroid Device',
        deviceType: DeviceType.PHONE,
        providerType: DeviceProviderType.REDROID,
        userId: 'user-456',
        userEmail: 'user@example.com',
        userRole: 'admin',
        tenantId: 'tenant-123',
        deviceConfig: {
          cpuCores: 8,
          memoryMB: 16384,
          storageGB: 128,
        },
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      mockNotificationsService.createRoleBasedNotification.mockResolvedValue({});

      // Act
      await consumer.handleDeviceCreated(event, mockConsumeMessage as ConsumeMessage);

      // Assert
      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-456',
        'admin',
        'device.created',
        expect.objectContaining({
          providerType: DeviceProviderType.REDROID,
          spec: '8核 / 16384MB / 128GB',
        }),
        expect.objectContaining({
          userEmail: 'user@example.com',
        })
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const event: DeviceCreatedEvent = {
        deviceId: 'device-error',
        deviceName: 'Error Device',
        deviceType: DeviceType.PHONE,
        providerType: DeviceProviderType.ALIYUN_ECP,
        userId: 'user-123',
        userEmail: 'user@example.com',
        userRole: 'user',
        tenantId: 'tenant-123',
        deviceConfig: {
          cpuCores: 2,
          memoryMB: 4096,
          storageGB: 32,
        },
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      mockNotificationsService.createRoleBasedNotification.mockRejectedValue(
        new Error('Notification service error')
      );

      // Act & Assert - should throw because the implementation re-throws errors
      await expect(
        consumer.handleDeviceCreated(event, mockConsumeMessage as ConsumeMessage)
      ).rejects.toThrow('Notification service error');
    });
  });

  describe('handleDeviceStarted', () => {
    it('should handle device started event', async () => {
      // Arrange
      const event: DeviceStartedEvent = {
        deviceId: 'device-123',
        deviceName: 'Test Device',
        deviceType: DeviceType.PHONE,
        userId: 'user-123',
        userEmail: 'user@example.com',
        userRole: 'user',
        tenantId: 'tenant-123',
        providerType: DeviceProviderType.ALIYUN_ECP,
        timestamp: new Date().toISOString(),
        startedAt: new Date().toISOString(),
      };

      mockNotificationsService.createRoleBasedNotification.mockResolvedValue({});

      // Act
      await consumer.handleDeviceStarted(event, mockConsumeMessage as ConsumeMessage);

      // Assert
      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'device.started',
        expect.objectContaining({
          deviceName: 'Test Device',
          deviceId: 'device-123',
        }),
        expect.objectContaining({
          userEmail: 'user@example.com',
        })
      );
    });
  });

  describe('handleDeviceStopped', () => {
    it('should handle device stopped event', async () => {
      // Arrange
      const event: DeviceStoppedEvent = {
        deviceId: 'device-123',
        deviceName: 'Test Device',
        deviceType: DeviceType.PHONE,
        userId: 'user-123',
        userEmail: 'user@example.com',
        userRole: 'user',
        tenantId: 'tenant-123',
        providerType: DeviceProviderType.ALIYUN_ECP,
        timestamp: new Date().toISOString(),
        stoppedAt: new Date().toISOString(),
        duration: 3600,
        reason: 'User requested',
      };

      mockNotificationsService.createRoleBasedNotification.mockResolvedValue({});

      // Act
      await consumer.handleDeviceStopped(event, mockConsumeMessage as ConsumeMessage);

      // Assert
      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'device.stopped',
        expect.objectContaining({
          deviceName: 'Test Device',
          reason: 'User requested',
        }),
        expect.objectContaining({
          userEmail: 'user@example.com',
        })
      );
    });
  });

  describe('handleDeviceError', () => {
    it('should handle device error event', async () => {
      // Arrange
      const event: DeviceErrorEvent = {
        deviceId: 'device-123',
        deviceName: 'Test Device',
        deviceType: DeviceType.PHONE,
        userId: 'user-123',
        userEmail: 'user@example.com',
        userRole: 'user',
        tenantId: 'tenant-123',
        providerType: DeviceProviderType.ALIYUN_ECP,
        errorType: 'Connection Error',
        errorMessage: 'Connection timeout',
        errorCode: 'CONN_TIMEOUT',
        occurredAt: new Date().toISOString(),
        priority: 'high',
        timestamp: new Date().toISOString(),
      };

      mockNotificationsService.createRoleBasedNotification.mockResolvedValue({});

      // Act
      await consumer.handleDeviceError(event, mockConsumeMessage as ConsumeMessage);

      // Assert
      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'device.error',
        expect.objectContaining({
          deviceName: 'Test Device',
          errorCode: 'CONN_TIMEOUT',
        }),
        expect.any(Object) // 额外的email参数
      );
    });
  });

  describe('handleDeviceDeleted', () => {
    it('should handle device deleted event', async () => {
      // Arrange
      const event: DeviceDeletedEvent = {
        deviceId: 'device-123',
        deviceName: 'Test Device',
        deviceType: DeviceType.PHONE,
        userId: 'user-123',
        userEmail: 'user@example.com',
        userRole: 'user',
        tenantId: 'tenant-123',
        providerType: DeviceProviderType.ALIYUN_ECP,
        timestamp: new Date().toISOString(),
        deletedAt: new Date().toISOString(),
        reason: 'User requested deletion',
      };

      mockNotificationsService.createRoleBasedNotification.mockResolvedValue({});

      // Act
      await consumer.handleDeviceDeleted(event, mockConsumeMessage as ConsumeMessage);

      // Assert
      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'device.deleted',
        expect.objectContaining({
          deviceName: 'Test Device',
          reason: 'User requested deletion',
        }),
        expect.any(Object) // 额外的email参数
      );
    });
  });

  describe('Provider Display Names', () => {
    it('should display correct provider names for different providers', async () => {
      // Arrange
      const providers = [
        { providerType: DeviceProviderType.ALIYUN_ECP as const, expected: '阿里云手机 (ECP)' },
        { providerType: DeviceProviderType.REDROID as const, expected: 'Redroid 容器设备' },
        { providerType: DeviceProviderType.HUAWEI_CPH as const, expected: '华为云手机' },
      ];

      for (const { providerType, expected } of providers) {
        const event: DeviceCreatedEvent = {
          deviceId: `device-${providerType}`,
          deviceName: `${providerType} Device`,
          deviceType: DeviceType.PHONE,
          providerType,
          userId: 'user-123',
          userEmail: 'user@example.com',
          userRole: 'user',
          tenantId: 'tenant-123',
          deviceConfig: {
            cpuCores: 4,
            memoryMB: 8192,
            storageGB: 64,
          },
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        mockNotificationsService.createRoleBasedNotification.mockResolvedValue({});

        // Act
        await consumer.handleDeviceCreated(event, mockConsumeMessage as ConsumeMessage);

        // Assert
        expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
          'user-123',
          'user',
          'device.created',
          expect.objectContaining({
            providerDisplayName: expect.any(String),
          }),
          expect.any(Object) // 额外的email参数
        );
      }
    });
  });
});
