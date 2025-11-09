import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { Notification } from '../../src/entities/notification.entity';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationCategory,
} from '@cloudphone/shared';
import {
  createTestDataSource,
  cleanDatabase,
  closeTestDataSource,
} from '../helpers/test-database.helper';
import { TestDataFactory } from '../helpers/test-data.factory';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationGateway } from '../../src/gateway/notification.gateway';
import { CacheService } from '../../src/cache/cache.service';
import { NotificationPreferencesService } from '../../src/notifications/preferences.service';
import { EmailService } from '../../src/email/email.service';
import { SmsService } from '../../src/sms/sms.service';
import { TemplatesService } from '../../src/templates/templates.service';

describe('NotificationsService Integration Tests', () => {
  let module: TestingModule;
  let service: NotificationsService;
  let dataSource: DataSource;
  let notificationRepository;

  // Mock dependencies
  const mockNotificationGateway = {
    sendToUser: jest.fn(),
    broadcastToRole: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    wrap: jest.fn((key, fn) => fn()), // 直接执行函数，不缓存
  };

  const mockPreferencesService = {
    getUserPreferences: jest.fn().mockResolvedValue({
      email: true,
      sms: true,
      websocket: true,
    }),
  };

  const mockEmailService = {
    sendEmail: jest.fn().mockResolvedValue(true),
  };

  const mockSmsService = {
    sendSms: jest.fn().mockResolvedValue(true),
  };

  const mockTemplatesService = {
    findByTypeAndRole: jest.fn(),
    render: jest.fn((template, data) => ({
      title: template.title,
      body: template.body,
    })),
  };

  beforeAll(async () => {
    // 创建真实的数据库连接
    dataSource = await createTestDataSource();
    notificationRepository = dataSource.getRepository(Notification);

    // 创建测试模块
    module = await Test.createTestingModule({
      providers: [
        NotificationsService,
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

    service = module.get<NotificationsService>(NotificationsService);
  });

  beforeEach(async () => {
    // 每个测试前清理数据库
    await cleanDatabase(dataSource);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (dataSource) await closeTestDataSource(dataSource);
    if (module) await module.close();
  });

  describe('createAndSend()', () => {
    it('should create notification and save to real database', async () => {
      // Arrange
      const dto = TestDataFactory.createNotificationDto();

      // Act
      const result = await service.createAndSend(dto);

      // Assert - 验证返回值
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.userId).toBe(dto.userId);
      expect(result.title).toBe(dto.title);

      // Assert - 验证数据库中真实存在
      const saved = await notificationRepository.findOne({
        where: { id: result.id },
      });
      expect(saved).toBeDefined();
      expect(saved.title).toBe(dto.title);
      expect(saved.message).toBe(dto.message);
    });

    it('should handle concurrent notification creation', async () => {
      // Arrange
      const userId = TestDataFactory.randomUserId();
      const dtos = TestDataFactory.createMultipleNotifications(10, { userId });

      // Act - 并发创建10个通知
      const results = await Promise.all(dtos.map(dto => service.createAndSend(dto)));

      // Assert - 所有通知都应该创建成功
      expect(results).toHaveLength(10);
      const ids = results.map(r => r.id);
      expect(new Set(ids).size).toBe(10); // 所有ID都应该唯一

      // Assert - 验证数据库中确实有10条记录
      const count = await notificationRepository.count({ where: { userId } });
      expect(count).toBe(10);
    });

    it('should persist complex data field correctly', async () => {
      // Arrange
      const complexData = {
        deviceId: 'device-123',
        deviceName: 'Test Device',
        nested: {
          config: {
            cpuCores: 4,
            memory: '8GB',
          },
        },
        array: [1, 2, 3],
      };
      const dto = TestDataFactory.createNotificationDto({ data: complexData });

      // Act
      const result = await service.createAndSend(dto);

      // Assert
      const saved = await notificationRepository.findOne({
        where: { id: result.id },
      });
      expect(saved.data).toEqual(complexData);
    });
  });

  describe('getUserNotifications()', () => {
    it('should return notifications ordered by createdAt DESC', async () => {
      // Arrange
      const userId = TestDataFactory.randomUserId();
      await service.createAndSend(TestDataFactory.createNotificationDto({ userId, title: 'First' }));
      await new Promise(resolve => setTimeout(resolve, 10)); // 确保时间戳不同
      await service.createAndSend(TestDataFactory.createNotificationDto({ userId, title: 'Second' }));
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.createAndSend(TestDataFactory.createNotificationDto({ userId, title: 'Third' }));

      // Act
      const result = await service.getUserNotifications(userId, 1, 10);

      // Assert
      expect(result.data).toHaveLength(3);
      expect(result.data[0].title).toBe('Third'); // 最新的在前面
      expect(result.data[1].title).toBe('Second');
      expect(result.data[2].title).toBe('First');
    });

    it('should paginate results correctly', async () => {
      // Arrange
      const userId = TestDataFactory.randomUserId();
      const dtos = TestDataFactory.createMultipleNotifications(25, { userId });
      await Promise.all(dtos.map(dto => service.createAndSend(dto)));

      // Act - 第一页
      const page1 = await service.getUserNotifications(userId, 1, 10);

      // Assert
      expect(page1.data).toHaveLength(10);
      expect(page1.total).toBe(25);
    });

    it('should return empty array for user with no notifications', async () => {
      // Arrange
      const userId = TestDataFactory.randomUserId(); // 生成有效的 UUID

      // Act
      const result = await service.getUserNotifications(userId, 1, 10);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('markAsRead()', () => {
    it('should update notification status in database', async () => {
      // Arrange
      const notification = await service.createAndSend(TestDataFactory.createNotificationDto());

      // Act
      await service.markAsRead(notification.id);

      // Assert - 从数据库重新查询
      const updated = await notificationRepository.findOne({
        where: { id: notification.id },
      });
      expect(updated.status).toBe(NotificationStatus.READ);
      expect(updated.readAt).toBeDefined();
      expect(updated.readAt).toBeInstanceOf(Date);
    });

    it('should return null for non-existent notification', async () => {
      // Act
      const result = await service.markAsRead(TestDataFactory.randomUserId()); // 生成有效的 UUID

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('markAllAsRead()', () => {
    it('should mark all user notifications as read', async () => {
      // Arrange
      const userId = TestDataFactory.randomUserId();
      await Promise.all(
        TestDataFactory.createMultipleNotifications(5, { userId }).map(dto => service.createAndSend(dto)),
      );

      // Act
      const result = await service.markAllAsRead(userId);

      // Assert
      expect(result.updated).toBe(5);

      const allNotifications = await notificationRepository.find({
        where: { userId },
      });
      expect(allNotifications).toHaveLength(5);
      allNotifications.forEach(notification => {
        expect(notification.status).toBe(NotificationStatus.READ);
        expect(notification.readAt).toBeDefined();
      });
    });

    it('should only affect the specified user', async () => {
      // Arrange
      const user1 = TestDataFactory.randomUserId();
      const user2 = TestDataFactory.randomUserId();
      await service.createAndSend(TestDataFactory.createNotificationDto({ userId: user1 }));
      await service.createAndSend(TestDataFactory.createNotificationDto({ userId: user2 }));

      // Act
      await service.markAllAsRead(user1);

      // Assert
      const user1Notifications = await notificationRepository.find({ where: { userId: user1 } });
      const user2Notifications = await notificationRepository.find({ where: { userId: user2 } });

      expect(user1Notifications[0].status).toBe(NotificationStatus.READ);
      expect(user2Notifications[0].status).not.toBe(NotificationStatus.READ);
    });
  });

  describe('cleanupExpiredNotifications()', () => {
    it('should delete expired notifications', async () => {
      // Arrange
      const userId = TestDataFactory.randomUserId();

      // 创建一个已过期的通知
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 昨天
      const notification = notificationRepository.create({
        userId,
        title: 'Expired',
        message: 'Should be deleted',
        type: NotificationCategory.SYSTEM,
        status: NotificationStatus.UNREAD,
        expiresAt: expiredDate,
      });
      await notificationRepository.save(notification);

      // Act
      const deletedCount = await service.cleanupExpiredNotifications();

      // Assert
      expect(deletedCount).toBe(1);
      const remaining = await notificationRepository.findOne({
        where: { id: notification.id },
      });
      expect(remaining).toBeNull();
    });

    it('should not delete non-expired notifications', async () => {
      // Arrange
      const userId = TestDataFactory.randomUserId();

      // 创建一个未过期的通知
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 明天
      const notification = notificationRepository.create({
        userId,
        title: 'Not Expired',
        message: 'Should NOT be deleted',
        type: NotificationCategory.SYSTEM,
        status: NotificationStatus.UNREAD,
        expiresAt: futureDate,
      });
      await notificationRepository.save(notification);

      // Act
      const deletedCount = await service.cleanupExpiredNotifications();

      // Assert
      expect(deletedCount).toBe(0);
      const remaining = await notificationRepository.findOne({
        where: { id: notification.id },
      });
      expect(remaining).toBeDefined();
    });
  });

  describe('Transaction and Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const dto = TestDataFactory.createNotificationDto();

      // Mock repository save to throw error
      const originalSave = notificationRepository.save;
      notificationRepository.save = jest.fn().mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.createAndSend(dto)).rejects.toThrow('Database error');

      // Cleanup
      notificationRepository.save = originalSave;
    });
  });
});
