import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

describe('NotificationsController', () => {
  let app: INestApplication;
  let service: NotificationsService;

  const mockNotificationsService = {
    createAndSend: jest.fn(),
    broadcast: jest.fn(),
    getUnreadNotifications: jest.fn(),
    getUserNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    batchDelete: jest.fn(),
    getStats: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockPermissionsGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockNotification = {
    id: 'notif-123',
    userId: 'user-123',
    title: 'Test Notification',
    message: 'This is a test notification',
    type: 'info',
    read: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    service = moduleFixture.get<NotificationsService>(NotificationsService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  /**
   * ✅ 响应格式验证测试
   * 确保所有端点返回正确的格式,包含 success 字段
   */
  describe('Response Format Validation', () => {
    describe('POST /notifications - create', () => {
      it('should return created notification', async () => {
        // Arrange
        mockNotificationsService.createAndSend.mockResolvedValue(mockNotification);

        // Act
        const response = await request(app.getHttpServer())
          .post('/notifications')
          .send({
            userId: 'user-123',
            title: 'Test',
            message: 'Test message',
            type: 'info',
          })
          .expect(201);

        // Assert
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('title');
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('POST /notifications/broadcast - broadcast', () => {
      it('should return success response', async () => {
        // Arrange
        mockNotificationsService.broadcast.mockResolvedValue(undefined);

        // Act
        const response = await request(app.getHttpServer())
          .post('/notifications/broadcast')
          .send({
            title: 'System Update',
            message: 'New version available',
            data: { version: '2.0.0' },
          })
          .expect(201);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('广播已发送');
      });
    });

    describe('GET /notifications/unread/count - getUnreadCount', () => {
      it('should return unread count in flat format', async () => {
        // Arrange
        mockNotificationsService.getUnreadCount.mockResolvedValue(2);

        // Act
        const response = await request(app.getHttpServer())
          .get('/notifications/unread/count?userId=user-123')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('count');
        expect(response.body.count).toBe(2);
        expect(service.getUnreadCount).toHaveBeenCalledWith('user-123');
      });

      it('should return zero count when userId not provided', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/notifications/unread/count')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('count');
        expect(response.body.count).toBe(0);
      });
    });

    describe('GET /notifications/user/:userId - getUserNotifications', () => {
      it('should return paginated user notifications', async () => {
        // Arrange
        mockNotificationsService.getUserNotifications.mockResolvedValue({
          data: [
            mockNotification,
            { ...mockNotification, id: 'notif-789', read: true },
          ],
          total: 2,
        });

        // Act
        const response = await request(app.getHttpServer())
          .get('/notifications/user/user-123?page=1&limit=10')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.total).toBe(2);
        expect(service.getUserNotifications).toHaveBeenCalledWith('user-123', 1, 10);
      });

      it('should return only unread notifications when unreadOnly=true', async () => {
        // Arrange
        mockNotificationsService.getUnreadNotifications.mockResolvedValue([
          mockNotification,
        ]);

        // Act
        const response = await request(app.getHttpServer())
          .get('/notifications/user/user-123?unreadOnly=true')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.total).toBe(1);
        expect(service.getUnreadNotifications).toHaveBeenCalledWith('user-123');
      });

      it('should use default pagination when not provided', async () => {
        // Arrange
        mockNotificationsService.getUserNotifications.mockResolvedValue({
          data: [],
          total: 0,
        });

        // Act
        await request(app.getHttpServer())
          .get('/notifications/user/user-123')
          .expect(200);

        // Assert
        expect(service.getUserNotifications).toHaveBeenCalledWith('user-123', 1, 10);
      });
    });

    describe('PATCH /notifications/:id/read - markAsRead', () => {
      it('should return marked notification with success field', async () => {
        // Arrange
        mockNotificationsService.markAsRead.mockReturnValue({
          ...mockNotification,
          read: true,
        });

        // Act
        const response = await request(app.getHttpServer())
          .patch('/notifications/notif-123/read')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('notification');
        expect(response.body.notification.read).toBe(true);
      });

      it('should return failure when notification not found', async () => {
        // Arrange
        mockNotificationsService.markAsRead.mockReturnValue(null);

        // Act
        const response = await request(app.getHttpServer())
          .patch('/notifications/nonexistent/read')
          .expect(200);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('不存在');
      });
    });

    describe('POST /notifications/read-all - markAllAsRead', () => {
      it('should return success response with count', async () => {
        // Arrange
        mockNotificationsService.markAllAsRead.mockResolvedValue({
          updated: 5,
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/notifications/read-all')
          .send({ userId: 'user-123' })
          .expect(201);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('5 条通知');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data.updated).toBe(5);
      });

      it('should return failure when userId missing', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .post('/notifications/read-all')
          .send({})
          .expect(201);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('缺少userId参数');
      });
    });

    describe('DELETE /notifications/:id - delete', () => {
      it('should return success response', async () => {
        // Arrange
        mockNotificationsService.deleteNotification.mockReturnValue(true);

        // Act
        const response = await request(app.getHttpServer())
          .delete('/notifications/notif-123')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('已删除');
      });

      it('should return failure when notification not found', async () => {
        // Arrange
        mockNotificationsService.deleteNotification.mockReturnValue(false);

        // Act
        const response = await request(app.getHttpServer())
          .delete('/notifications/nonexistent')
          .expect(200);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('不存在');
      });
    });

    describe('POST /notifications/batch/delete - batchDelete', () => {
      it('should return batch delete result with success field', async () => {
        // Arrange
        mockNotificationsService.batchDelete.mockResolvedValue({
          deleted: 3,
          failed: 0,
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/notifications/batch/delete')
          .send({
            ids: ['notif-1', 'notif-2', 'notif-3'],
          })
          .expect(201);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('已删除 3 条通知');
        expect(response.body).toHaveProperty('data');
      });

      it('should return failure when ids not provided', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .post('/notifications/batch/delete')
          .send({})
          .expect(201);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('请提供要删除的通知ID列表');
      });

      it('should return failure when ids array is empty', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .post('/notifications/batch/delete')
          .send({ ids: [] })
          .expect(201);

        // Assert
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /notifications/stats - getStats', () => {
      it('should return statistics', async () => {
        // Arrange
        mockNotificationsService.getStats.mockReturnValue({
          total: 100,
          unread: 25,
          byType: {
            info: 40,
            warning: 30,
            error: 20,
            success: 10,
          },
          byDay: {
            '2025-01-06': 15,
            '2025-01-05': 20,
          },
        });

        // Act
        const response = await request(app.getHttpServer())
          .get('/notifications/stats')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('unread');
        expect(response.body).toHaveProperty('byType');
        expect(response.body).toHaveProperty('byDay');
        expect(response.body.total).toBe(100);
      });
    });
  });

  describe('Business Logic Tests', () => {
    it('should call service with correct parameters for broadcast', async () => {
      // Arrange
      mockNotificationsService.broadcast.mockResolvedValue(undefined);

      // Act
      await request(app.getHttpServer())
        .post('/notifications/broadcast')
        .send({
          title: 'Announcement',
          message: 'Server maintenance',
          data: { time: '2AM' },
        })
        .expect(201);

      // Assert
      expect(service.broadcast).toHaveBeenCalledWith(
        'Announcement',
        'Server maintenance',
        { time: '2AM' }
      );
    });

    it('should call markAllAsRead with userId', async () => {
      // Arrange
      mockNotificationsService.markAllAsRead.mockResolvedValue({ updated: 3 });

      // Act
      await request(app.getHttpServer())
        .post('/notifications/read-all')
        .send({ userId: 'user-456' })
        .expect(201);

      // Assert
      expect(service.markAllAsRead).toHaveBeenCalledWith('user-456');
    });

    it('should call batchDelete with correct ids', async () => {
      // Arrange
      mockNotificationsService.batchDelete.mockResolvedValue({ deleted: 2, failed: 0 });
      const ids = ['notif-1', 'notif-2'];

      // Act
      await request(app.getHttpServer())
        .post('/notifications/batch/delete')
        .send({ ids })
        .expect(201);

      // Assert
      expect(service.batchDelete).toHaveBeenCalledWith(ids);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Arrange
      const error = new Error('Service unavailable');
      mockNotificationsService.getUserNotifications.mockRejectedValue(error);

      // Act
      const response = await request(app.getHttpServer())
        .get('/notifications/user/user-123')
        .expect(500);

      // Assert
      expect(response.body).toBeDefined();
    });

    it('should handle createAndSend errors', async () => {
      // Arrange
      const error = new Error('Failed to send notification');
      mockNotificationsService.createAndSend.mockRejectedValue(error);

      // Act
      const response = await request(app.getHttpServer())
        .post('/notifications')
        .send({
          userId: 'user-123',
          title: 'Test',
          message: 'Test',
        })
        .expect(500);

      // Assert
      expect(response.body).toBeDefined();
    });
  });
});
