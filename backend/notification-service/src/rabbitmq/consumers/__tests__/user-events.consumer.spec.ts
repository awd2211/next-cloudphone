import { Test, TestingModule } from '@nestjs/testing';
import { UserEventsConsumer } from '../user-events.consumer';
import { NotificationsService } from '../../../notifications/notifications.service';
import { EmailService } from '../../../email/email.service';
import { TemplatesService } from '../../../templates/templates.service';
import {
  UserRegisteredEvent,
  UserLoginFailedEvent,
  PasswordResetRequestedEvent,
  PasswordChangedEvent,
  TwoFactorEnabledEvent,
  ProfileUpdatedEvent,
} from '../../../types/events';

describe('UserEventsConsumer', () => {
  let consumer: UserEventsConsumer;
  let notificationsService: jest.Mocked<NotificationsService>;
  let emailService: jest.Mocked<EmailService>;
  let templatesService: jest.Mocked<TemplatesService>;

  const mockMsg = {
    fields: { routingKey: 'user.registered' },
    properties: {},
    content: Buffer.from(''),
  } as any;

  beforeEach(async () => {
    const mockNotificationsService = {
      createRoleBasedNotification: jest.fn().mockResolvedValue({
        id: 'notification-123',
        userId: 'user-123',
        type: 'user.registered',
        channels: ['websocket', 'email'],
      }),
    };

    const mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue(true),
    };

    const mockTemplatesService = {
      render: jest.fn(),
      renderWithRole: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserEventsConsumer,
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

    consumer = module.get<UserEventsConsumer>(UserEventsConsumer);
    notificationsService = module.get(NotificationsService);
    emailService = module.get(EmailService);
    templatesService = module.get(TemplatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleUserRegistered', () => {
    it('should create role-based notification for user registration', async () => {
      const event: UserRegisteredEvent = {
        version: '1.0',
        source: 'user-service',
        eventId: 'event-001',
        eventType: 'user.registered',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'newuser',
          email: 'newuser@example.com',
          registerTime: '2025-11-06T12:00:00Z',
        },
      };

      await consumer.handleUserRegistered(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'user.registered',
        expect.objectContaining({
          username: 'newuser',
          email: 'newuser@example.com',
          registeredAt: '2025-11-06T12:00:00Z',
          loginUrl: expect.stringMatching(/\/login$/),
        }),
        expect.objectContaining({
          userEmail: 'newuser@example.com',
        })
      );
    });

    it('should throw error when notification creation fails', async () => {
      const event: UserRegisteredEvent = {
        version: '1.0',
        source: 'user-service',
        eventId: 'event-002',
        eventType: 'user.registered',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'newuser',
          email: 'newuser@example.com',
          registerTime: '2025-11-06T12:00:00Z',
        },
      };

      notificationsService.createRoleBasedNotification.mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      await expect(consumer.handleUserRegistered(event, mockMsg)).rejects.toThrow(
        'Service unavailable'
      );
    });
  });

  describe('handleLoginFailed', () => {
    it('should create notification when failure count reaches threshold', async () => {
      const event: UserLoginFailedEvent = {
        version: '1.0',
        source: 'user-service',
        eventId: 'event-003',
        eventType: 'user.login_failed',
        timestamp: '2025-11-06T12:00:00Z',
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'testuser',
          userEmail: 'testuser@example.com',
          ipAddress: '192.168.1.100',
          failureCount: 3,
          timestamp: new Date().toISOString(),
        },
      };

      await consumer.handleLoginFailed(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'user.login_failed',
        expect.objectContaining({
          username: 'testuser',
          ipAddress: '192.168.1.100',
          failureCount: 3,
          attemptTime: expect.any(String),
          location: '未知位置',
        }),
        expect.objectContaining({
          userEmail: 'testuser@example.com',
        })
      );
    });

    it('should not create notification when failure count below threshold', async () => {
      const event: UserLoginFailedEvent = {
        version: '1.0',
        source: 'user-service',
        eventId: 'event-004',
        eventType: 'user.login_failed',
        timestamp: '2025-11-06T12:00:00Z',
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'testuser',
          userEmail: 'testuser@example.com',
          ipAddress: '192.168.1.100',
          failureCount: 2,
          timestamp: new Date().toISOString(),
        },
      };

      await consumer.handleLoginFailed(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).not.toHaveBeenCalled();
    });

    it('should use default role when userRole is not provided', async () => {
      const event: UserLoginFailedEvent = {
        version: '1.0',
        source: 'user-service',
        eventId: 'event-005',
        eventType: 'user.login_failed',
        timestamp: '2025-11-06T12:00:00Z',
        payload: {
          userId: 'user-123',
          username: 'testuser',
          userEmail: 'testuser@example.com',
          ipAddress: '192.168.1.100',
          failureCount: 5,
          timestamp: new Date().toISOString(),
        },
      };

      await consumer.handleLoginFailed(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'user.login_failed',
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('handlePasswordResetRequested', () => {
    it('should create role-based notification for password reset', async () => {
      const event: PasswordResetRequestedEvent = {
        version: '1.0',
        source: 'user-service',
        eventId: 'event-006',
        eventType: 'user.password_reset_requested',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'testuser',
          email: 'testuser@example.com',
          resetToken: 'ABCDEF123456TOKEN',
          expiresAt: '2025-11-06T13:00:00Z',
        },
      };

      await consumer.handlePasswordResetRequested(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'user.password_reset',
        expect.objectContaining({
          username: 'testuser',
          resetUrl: expect.stringMatching(/reset-password\?token=ABCDEF123456TOKEN/),
          code: 'ABCDEF',
          expiresAt: '2025-11-06T13:00:00Z',
          email: 'testuser@example.com',
        }),
        expect.objectContaining({
          userEmail: 'testuser@example.com',
        })
      );
    });

    it('should use default username when not provided', async () => {
      const event: PasswordResetRequestedEvent = {
        version: '1.0',
        source: 'user-service',
        eventId: 'event-007',
        eventType: 'user.password_reset_requested',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          email: 'testuser@example.com',
          resetToken: 'TOKEN123',
          expiresAt: '2025-11-06T13:00:00Z',
        },
      };

      await consumer.handlePasswordResetRequested(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'user.password_reset',
        expect.objectContaining({
          username: '用户',
        }),
        expect.any(Object)
      );
    });

    it('should throw error when notification creation fails', async () => {
      const event: PasswordResetRequestedEvent = {
        version: '1.0',
        source: 'user-service',
        eventId: 'event-008',
        eventType: 'user.password_reset_requested',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          email: 'testuser@example.com',
          resetToken: 'TOKEN123',
          expiresAt: '2025-11-06T13:00:00Z',
        },
      };

      notificationsService.createRoleBasedNotification.mockRejectedValueOnce(
        new Error('Email service error')
      );

      await expect(consumer.handlePasswordResetRequested(event, mockMsg)).rejects.toThrow(
        'Email service error'
      );
    });
  });

  describe('handlePasswordChanged', () => {
    it('should create role-based notification for password change', async () => {
      const event: PasswordChangedEvent = {
        version: '1.0',
        source: 'user-service',
        eventId: 'event-009',
        eventType: 'user.password_changed',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'testuser',
          email: 'testuser@example.com',
          changedAt: '2025-11-06T12:00:00Z',
        },
      };

      await consumer.handlePasswordChanged(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'user.password_changed',
        expect.objectContaining({
          username: 'testuser',
          changedAt: '2025-11-06T12:00:00Z',
          email: 'testuser@example.com',
        }),
        expect.objectContaining({
          userEmail: 'testuser@example.com',
        })
      );
    });

    it('should throw error when notification creation fails', async () => {
      const event: PasswordChangedEvent = {
        version: '1.0',
        source: 'user-service',
        eventId: 'event-010',
        eventType: 'user.password_changed',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'testuser',
          email: 'testuser@example.com',
          changedAt: '2025-11-06T12:00:00Z',
        },
      };

      notificationsService.createRoleBasedNotification.mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(consumer.handlePasswordChanged(event, mockMsg)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('handleTwoFactorEnabled', () => {
    it('should create role-based notification for 2FA enablement', async () => {
      const event: TwoFactorEnabledEvent = {
        version: '1.0',
        source: 'user-service',
        eventId: 'event-011',
        eventType: 'user.two_factor_enabled',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'testuser',
          email: 'testuser@example.com',
          enabledAt: '2025-11-06T12:00:00Z',
        },
      };

      await consumer.handleTwoFactorEnabled(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'user.two_factor_enabled',
        expect.objectContaining({
          username: 'testuser',
          enabledAt: '2025-11-06T12:00:00Z',
          email: 'testuser@example.com',
        }),
        expect.objectContaining({
          userEmail: 'testuser@example.com',
        })
      );
    });

    it('should use default username when not provided', async () => {
      const event: TwoFactorEnabledEvent = {
        version: '1.0',
        source: 'user-service',
        eventId: 'event-012',
        eventType: 'user.two_factor_enabled',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          username: 'adminuser',
          userRole: 'admin',
          email: 'admin@example.com',
          enabledAt: '2025-11-06T12:00:00Z',
        },
      };

      await consumer.handleTwoFactorEnabled(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'admin',
        'user.two_factor_enabled',
        expect.objectContaining({
          username: 'adminuser',
        }),
        expect.any(Object)
      );
    });

    it('should throw error when notification creation fails', async () => {
      const event: TwoFactorEnabledEvent = {
        version: '1.0',
        source: 'user-service',
        eventId: 'event-013',
        eventType: 'user.two_factor_enabled',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          username: 'testuser',
          userRole: 'user',
          email: 'testuser@example.com',
          enabledAt: '2025-11-06T12:00:00Z',
        },
      };

      notificationsService.createRoleBasedNotification.mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(consumer.handleTwoFactorEnabled(event, mockMsg)).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('handleProfileUpdated', () => {
    it('should create role-based notification for profile update', async () => {
      const event: ProfileUpdatedEvent = {
        version: '1.0',
        source: 'user-service',
        eventId: 'event-014',
        eventType: 'user.profile_updated',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'testuser',
          userEmail: 'testuser@example.com',
          updatedFields: ['email', 'phone'],
          updatedAt: '2025-11-06T12:00:00Z',
        },
      };

      await consumer.handleProfileUpdated(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'user.profile_updated',
        expect.objectContaining({
          username: 'testuser',
          updatedFields: ['email', 'phone'],
          updatedAt: '2025-11-06T12:00:00Z',
        }),
        expect.objectContaining({
          userEmail: 'testuser@example.com',
        })
      );
    });

    it('should handle single field update', async () => {
      const event: ProfileUpdatedEvent = {
        version: '1.0',
        source: 'user-service',
        eventId: 'event-015',
        eventType: 'user.profile_updated',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'testuser',
          userEmail: 'testuser@example.com',
          updatedFields: ['avatar'],
          updatedAt: '2025-11-06T12:00:00Z',
        },
      };

      await consumer.handleProfileUpdated(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'user.profile_updated',
        expect.objectContaining({
          updatedFields: ['avatar'],
        }),
        expect.any(Object)
      );
    });

    it('should throw error when notification creation fails', async () => {
      const event: ProfileUpdatedEvent = {
        version: '1.0',
        source: 'user-service',
        eventId: 'event-016',
        eventType: 'user.profile_updated',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'testuser',
          userEmail: 'testuser@example.com',
          updatedFields: ['email'],
          updatedAt: '2025-11-06T12:00:00Z',
        },
      };

      notificationsService.createRoleBasedNotification.mockRejectedValueOnce(
        new Error('Service error')
      );

      await expect(consumer.handleProfileUpdated(event, mockMsg)).rejects.toThrow(
        'Service error'
      );
    });
  });
});
