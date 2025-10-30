import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotificationsService } from '../notifications.service';
import { Notification, NotificationStatus, NotificationType, NotificationChannel } from '../../entities/notification.entity';
import { NotificationGateway } from '../../gateway/notification.gateway';
import { NotificationPreferencesService } from '../preferences.service';
import { EmailService } from '../../email/email.service';
import { SmsService } from '../../sms/sms.service';
import { NotificationType as PrefType, NotificationChannel as PrefChannel } from '../../entities/notification-preference.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockNotificationRepository: any;
  let mockGateway: any;
  let mockCacheManager: any;
  let mockPreferencesService: any;
  let mockEmailService: any;
  let mockSmsService: any;

  beforeEach(async () => {
    // Mock Repository
    mockNotificationRepository = {
      create: jest.fn((data) => ({ id: 'notif-123', ...data })),
      save: jest.fn((data) => Promise.resolve({ id: 'notif-123', ...data })),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
      })),
    };

    // Mock Gateway
    mockGateway = {
      sendToUser: jest.fn(),
      broadcast: jest.fn(),
      getConnectedClientsCount: jest.fn(() => 10),
    };

    // Mock Cache Manager
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    // Mock Preferences Service
    mockPreferencesService = {
      getUserPreference: jest.fn(),
      shouldReceiveNotification: jest.fn(() => Promise.resolve(true)),
    };

    // Mock Email Service
    mockEmailService = {
      sendEmail: jest.fn(() => Promise.resolve()),
    };

    // Mock SMS Service
    mockSmsService = {
      sendNotification: jest.fn(() => Promise.resolve()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: NotificationGateway,
          useValue: mockGateway,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
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
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAndSend', () => {
    const createDto = {
      userId: 'user-123',
      type: NotificationType.SYSTEM,
      title: 'Test Notification',
      message: 'This is a test message',
      data: { key: 'value' },
    };

    it('should create and send notification successfully', async () => {
      const mockNotification = {
        id: 'notif-123',
        ...createDto,
        status: NotificationStatus.SENT,
        sentAt: expect.any(Date),
      };

      mockNotificationRepository.save.mockResolvedValue(mockNotification);

      const result = await service.createAndSend(createDto);

      expect(result.status).toBe(NotificationStatus.SENT);
      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: NotificationType.SYSTEM,
          title: 'Test Notification',
          message: 'This is a test message',
        }),
      );
      expect(mockGateway.sendToUser).toHaveBeenCalledWith('user-123', expect.any(Object));
      expect(mockCacheManager.del).toHaveBeenCalledWith('user:user-123:notifications');
    });

    it('should handle WebSocket send failure', async () => {
      mockGateway.sendToUser.mockImplementation(() => {
        throw new Error('WebSocket error');
      });

      const result = await service.createAndSend(createDto);

      expect(result.status).toBe(NotificationStatus.FAILED);
      expect(result.errorMessage).toBe('WebSocket error');
    });
  });

  describe('broadcast', () => {
    it('should broadcast notification to all users', async () => {
      await service.broadcast('System Update', 'System will be down for maintenance');

      expect(mockGateway.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system',
          title: 'System Update',
          message: 'System will be down for maintenance',
        }),
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification = {
        id: 'notif-123',
        userId: 'user-123',
        status: NotificationStatus.SENT,
      };

      mockNotificationRepository.findOne.mockResolvedValue(mockNotification);
      mockNotificationRepository.save.mockResolvedValue({
        ...mockNotification,
        status: NotificationStatus.READ,
        readAt: expect.any(Date),
      });

      const result = await service.markAsRead('notif-123');

      expect(result.status).toBe(NotificationStatus.READ);
      expect(mockCacheManager.del).toHaveBeenCalledWith('user:user-123:notifications');
    });

    it('should return null if notification not found', async () => {
      mockNotificationRepository.findOne.mockResolvedValue(null);

      const result = await service.markAsRead('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getUserNotifications', () => {
    it('should return cached notifications', async () => {
      const cachedData = {
        data: [{ id: 'notif-1' }, { id: 'notif-2' }],
        total: 2,
      };

      mockCacheManager.get.mockResolvedValue(cachedData);

      const result = await service.getUserNotifications('user-123', 1, 10);

      expect(result).toEqual(cachedData);
      expect(mockNotificationRepository.findAndCount).not.toHaveBeenCalled();
    });

    it('should query database and cache result if not cached', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockNotificationRepository.findAndCount.mockResolvedValue([
        [{ id: 'notif-1' }, { id: 'notif-2' }],
        2,
      ]);

      const result = await service.getUserNotifications('user-123', 1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'user:user-123:notifications:1:10',
        expect.any(Object),
        60,
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      mockNotificationRepository.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-123');

      expect(result).toBe(5);
      expect(mockNotificationRepository.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          status: NotificationStatus.SENT,
        },
      });
    });
  });

  describe('getUnreadNotifications', () => {
    it('should return unread notifications', async () => {
      const unreadNotifications = [
        { id: 'notif-1', status: NotificationStatus.SENT },
        { id: 'notif-2', status: NotificationStatus.SENT },
      ];

      mockNotificationRepository.find.mockResolvedValue(unreadNotifications);

      const result = await service.getUnreadNotifications('user-123');

      expect(result).toEqual(unreadNotifications);
      expect(mockNotificationRepository.find).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          status: NotificationStatus.SENT,
        },
        order: { createdAt: 'DESC' },
        take: 50,
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      mockNotificationRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteNotification('notif-123');

      expect(result).toBe(true);
      expect(mockNotificationRepository.delete).toHaveBeenCalledWith('notif-123');
    });

    it('should return false if notification not found', async () => {
      mockNotificationRepository.delete.mockResolvedValue({ affected: 0 });

      const result = await service.deleteNotification('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredNotifications', () => {
    it('should cleanup expired notifications', async () => {
      mockNotificationRepository.delete.mockResolvedValue({ affected: 10 });

      const result = await service.cleanupExpiredNotifications();

      expect(result).toBe(10);
      expect(mockNotificationRepository.delete).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return notification statistics', async () => {
      mockNotificationRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(50) // sent
        .mockResolvedValueOnce(30) // read
        .mockResolvedValueOnce(10); // failed

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '25' }),
      };
      mockNotificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getStats();

      expect(result).toEqual({
        totalNotifications: 100,
        activeUsers: 25,
        connectedClients: 10,
        byStatus: {
          pending: 10,
          sent: 50,
          read: 30,
          failed: 10,
        },
      });
    });
  });

  describe('sendMultiChannelNotification', () => {
    const userId = 'user-123';
    const type = PrefType.DEVICE_CREATED;
    const payload = {
      title: 'Device Created',
      message: 'Your device has been created',
      userEmail: 'user@example.com',
      userPhone: '+1234567890',
    };

    it('should send notification via all enabled channels', async () => {
      const preference = {
        enabled: true,
        enabledChannels: [PrefChannel.WEBSOCKET, PrefChannel.EMAIL, PrefChannel.SMS],
      };

      mockPreferencesService.getUserPreference.mockResolvedValue(preference);

      await service.sendMultiChannelNotification(userId, type, payload);

      expect(mockPreferencesService.shouldReceiveNotification).toHaveBeenCalledTimes(3);
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
      expect(mockSmsService.sendNotification).toHaveBeenCalled();
    });

    it('should not send if notification type is disabled', async () => {
      const preference = {
        enabled: false,
        enabledChannels: [PrefChannel.WEBSOCKET],
      };

      mockPreferencesService.getUserPreference.mockResolvedValue(preference);

      await service.sendMultiChannelNotification(userId, type, payload);

      expect(mockPreferencesService.shouldReceiveNotification).not.toHaveBeenCalled();
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should only send via enabled channels', async () => {
      const preference = {
        enabled: true,
        enabledChannels: [PrefChannel.EMAIL], // Only email enabled
      };

      mockPreferencesService.getUserPreference.mockResolvedValue(preference);

      await service.sendMultiChannelNotification(userId, type, payload);

      expect(mockEmailService.sendEmail).toHaveBeenCalled();
      expect(mockSmsService.sendNotification).not.toHaveBeenCalled();
    });
  });
});
