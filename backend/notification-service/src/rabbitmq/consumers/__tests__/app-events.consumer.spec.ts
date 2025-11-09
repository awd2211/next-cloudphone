import { Test, TestingModule } from '@nestjs/testing';
import { AppEventsConsumer } from '../app-events.consumer';
import { NotificationsService } from '../../../notifications/notifications.service';
import { TemplatesService } from '../../../templates/templates.service';
import {
  AppInstalledEvent,
  AppInstallFailedEvent,
  AppUpdatedEvent,
} from '../../../types/events';

describe('AppEventsConsumer', () => {
  let consumer: AppEventsConsumer;
  let notificationsService: jest.Mocked<NotificationsService>;
  let templatesService: jest.Mocked<TemplatesService>;

  const mockMsg = {
    fields: { routingKey: 'app.installed' },
    properties: {},
    content: Buffer.from(''),
  } as any;

  beforeEach(async () => {
    const mockNotificationsService = {
      createRoleBasedNotification: jest.fn().mockResolvedValue({
        id: 'notification-123',
        userId: 'user-123',
        type: 'app.installed',
        channels: ['websocket'],
      }),
    };

    const mockTemplatesService = {
      render: jest.fn(),
      renderWithRole: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppEventsConsumer,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: TemplatesService,
          useValue: mockTemplatesService,
        },
      ],
    }).compile();

    consumer = module.get<AppEventsConsumer>(AppEventsConsumer);
    notificationsService = module.get(NotificationsService);
    templatesService = module.get(TemplatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleAppInstalled', () => {
    it('should create role-based notification for app installation', async () => {
      const event: AppInstalledEvent = {
        eventId: 'event-001',
        eventType: 'app.installed',
        version: '1.0',
        source: 'app-service',
        timestamp: new Date().toISOString(),
        payload: {
          appId: 'app-456',
          appName: 'WeChat',
          userId: 'user-123',
          userRole: 'user',
          userEmail: 'user@example.com',
          deviceId: 'device-789',
          deviceName: 'My Phone',
          version: '8.0.32',
          installedAt: '2025-11-06T12:00:00Z',
        },
      };

      await consumer.handleAppInstalled(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'app.installed',
        expect.objectContaining({
          appId: 'app-456',
          appName: 'WeChat',
          deviceId: 'device-789',
          deviceName: 'My Phone',
          version: '8.0.32',
          installedAt: '2025-11-06T12:00:00Z',
        }),
        expect.objectContaining({
          userEmail: 'user@example.com',
        })
      );
    });

    it('should use default deviceName when not provided', async () => {
      const event: AppInstalledEvent = {
        eventId: 'event-002',
        eventType: 'app.installed',
        version: '1.0',
        source: 'app-service',
        timestamp: new Date().toISOString(),
        payload: {
          appId: 'app-456',
          appName: 'WeChat',
          userId: 'user-123',
          userRole: 'user',
          userEmail: 'user@example.com',
          deviceId: 'device-789',
          version: '8.0.32',
          installedAt: '2025-11-06T12:00:00Z',
        },
      };

      await consumer.handleAppInstalled(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'app.installed',
        expect.objectContaining({
          deviceName: '云手机',
        }),
        expect.any(Object)
      );
    });

    it('should throw error when notification creation fails', async () => {
      const event: AppInstalledEvent = {
        eventId: 'event-003',
        eventType: 'app.installed',
        version: '1.0',
        source: 'app-service',
        timestamp: new Date().toISOString(),
        payload: {
          appId: 'app-456',
          appName: 'WeChat',
          userId: 'user-123',
          userRole: 'user',
          userEmail: 'user@example.com',
          deviceId: 'device-789',
          version: '8.0.32',
          installedAt: '2025-11-06T12:00:00Z',
        },
      };

      notificationsService.createRoleBasedNotification.mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      await expect(consumer.handleAppInstalled(event, mockMsg)).rejects.toThrow(
        'Service unavailable'
      );
    });
  });

  describe('handleAppInstallFailed', () => {
    it('should create role-based notification for app installation failure', async () => {
      const event: AppInstallFailedEvent = {
        eventId: 'event-004',
        eventType: 'app.install_failed',
        version: '1.0',
        source: 'app-service',
        timestamp: new Date().toISOString(),
        payload: {
          appId: 'app-456',
          appName: 'WeChat',
          userId: 'user-123',
          userRole: 'user',
          userEmail: 'user@example.com',
          deviceId: 'device-789',
          deviceName: 'My Phone',
          reason: 'Insufficient storage space',
          failedAt: '2025-11-06T12:00:00Z',
        },
      };

      await consumer.handleAppInstallFailed(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'app.install_failed',
        expect.objectContaining({
          appId: 'app-456',
          appName: 'WeChat',
          deviceId: 'device-789',
          deviceName: 'My Phone',
          reason: 'Insufficient storage space',
          failedAt: '2025-11-06T12:00:00Z',
        }),
        expect.objectContaining({
          userEmail: 'user@example.com',
        })
      );
    });

    it('should handle different failure reasons', async () => {
      const event: AppInstallFailedEvent = {
        eventId: 'event-005',
        eventType: 'app.install_failed',
        version: '1.0',
        source: 'app-service',
        timestamp: new Date().toISOString(),
        payload: {
          appId: 'app-456',
          appName: 'WeChat',
          userId: 'user-123',
          userRole: 'admin',
          userEmail: 'admin@example.com',
          deviceId: 'device-789',
          reason: 'APK file corrupted',
          failedAt: '2025-11-06T12:00:00Z',
        },
      };

      await consumer.handleAppInstallFailed(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'admin',
        'app.install_failed',
        expect.objectContaining({
          reason: 'APK file corrupted',
        }),
        expect.any(Object)
      );
    });

    it('should throw error when notification creation fails', async () => {
      const event: AppInstallFailedEvent = {
        eventId: 'event-006',
        eventType: 'app.install_failed',
        version: '1.0',
        source: 'app-service',
        timestamp: new Date().toISOString(),
        payload: {
          appId: 'app-456',
          appName: 'WeChat',
          userId: 'user-123',
          userRole: 'user',
          userEmail: 'user@example.com',
          deviceId: 'device-789',
          reason: 'Installation timeout',
          failedAt: '2025-11-06T12:00:00Z',
        },
      };

      notificationsService.createRoleBasedNotification.mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(consumer.handleAppInstallFailed(event, mockMsg)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('handleAppUpdated', () => {
    it('should create role-based notification for app update', async () => {
      const event: AppUpdatedEvent = {
        eventId: 'event-007',
        eventType: 'app.updated',
        version: '1.0',
        source: 'app-service',
        timestamp: new Date().toISOString(),
        payload: {
          appId: 'app-456',
          appName: 'WeChat',
          userId: 'user-123',
          userRole: 'user',
          userEmail: 'user@example.com',
          deviceId: 'device-789',
          oldVersion: '8.0.31',
          newVersion: '8.0.32',
          updatedAt: '2025-11-06T12:00:00Z',
        },
      };

      await consumer.handleAppUpdated(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'app.updated',
        expect.objectContaining({
          appId: 'app-456',
          appName: 'WeChat',
          deviceId: 'device-789',
          oldVersion: '8.0.31',
          newVersion: '8.0.32',
          updatedAt: '2025-11-06T12:00:00Z',
        }),
        expect.objectContaining({
          userEmail: 'user@example.com',
        })
      );
    });

    it('should use default oldVersion when not provided', async () => {
      const event: AppUpdatedEvent = {
        eventId: 'event-008',
        eventType: 'app.updated',
        version: '1.0',
        source: 'app-service',
        timestamp: new Date().toISOString(),
        payload: {
          appId: 'app-456',
          appName: 'WeChat',
          userId: 'user-123',
          userRole: 'user',
          userEmail: 'user@example.com',
          deviceId: 'device-789',
          oldVersion: '未知',
          newVersion: '8.0.32',
          updatedAt: '2025-11-06T12:00:00Z',
        },
      };

      await consumer.handleAppUpdated(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'app.updated',
        expect.objectContaining({
          oldVersion: '未知',
        }),
        expect.any(Object)
      );
    });

    it('should throw error when notification creation fails', async () => {
      const event: AppUpdatedEvent = {
        eventId: 'event-009',
        eventType: 'app.updated',
        version: '1.0',
        source: 'app-service',
        timestamp: new Date().toISOString(),
        payload: {
          appId: 'app-456',
          appName: 'WeChat',
          userId: 'user-123',
          userRole: 'user',
          userEmail: 'user@example.com',
          deviceId: 'device-789',
          oldVersion: '8.0.31',
          newVersion: '8.0.32',
          updatedAt: '2025-11-06T12:00:00Z',
        },
      };

      notificationsService.createRoleBasedNotification.mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(consumer.handleAppUpdated(event, mockMsg)).rejects.toThrow(
        'Network error'
      );
    });
  });
});
