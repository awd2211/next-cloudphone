import { INestApplication } from '@nestjs/common';
import { createE2ETestHelper, E2ETestHelper } from '../helpers/e2e-test.helper';

describe('NotificationsController (E2E)', () => {
  let helper: E2ETestHelper;
  let app: INestApplication;
  let testUserId: string;
  let createdNotificationId: string;

  beforeAll(async () => {
    helper = await createE2ETestHelper();
    app = helper.getApp();
    testUserId = 'test-user-' + Date.now();
  });

  afterAll(async () => {
    await helper.closeApp();
  });

  describe('POST /notifications', () => {
    it('should create and send a notification', async () => {
      const dto = {
        userId: testUserId,
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'info',
        channels: ['websocket'],
        data: { testKey: 'testValue' },
      };

      const response = await helper.post('/notifications').send(dto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(dto.userId);
      expect(response.body.title).toBe(dto.title);
      expect(response.body.message).toBe(dto.message);
      expect(response.body.type).toBe(dto.type);
      expect(response.body.read).toBe(false);

      // Save notification ID for later tests
      createdNotificationId = response.body.id;
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        userId: testUserId,
        // Missing title and message
      };

      const response = await helper.post('/notifications').send(invalidDto);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate notification type', async () => {
      const invalidDto = {
        userId: testUserId,
        title: 'Test',
        message: 'Test',
        type: 'invalid-type', // Invalid type
        channels: ['websocket'],
      };

      const response = await helper.post('/notifications').send(invalidDto);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /notifications/broadcast', () => {
    it('should broadcast notification to all users', async () => {
      const broadcastData = {
        title: 'System Announcement',
        message: 'This is a system-wide announcement',
        data: { priority: 'high' },
      };

      const response = await helper.post('/notifications/broadcast').send(broadcastData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('广播已发送');
    });

    it('should validate broadcast data', async () => {
      const invalidData = {
        // Missing title and message
        data: {},
      };

      const response = await helper.post('/notifications/broadcast').send(invalidData);

      expect(response.status).toBe(400);
    });

    it('should handle broadcast with only required fields', async () => {
      const minimalData = {
        title: 'Minimal Broadcast',
        message: 'Minimal message',
      };

      const response = await helper.post('/notifications/broadcast').send(minimalData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /notifications/unread/count', () => {
    it('should return unread count for a user', async () => {
      const response = await helper.get(`/notifications/unread/count?userId=${testUserId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 when userId is missing', async () => {
      const response = await helper.get('/notifications/unread/count');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
    });

    it('should return 0 for user with no notifications', async () => {
      const nonExistentUserId = 'non-existent-user-' + Date.now();
      const response = await helper.get(`/notifications/unread/count?userId=${nonExistentUserId}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
    });
  });

  describe('GET /notifications/user/:userId', () => {
    it('should get user notifications with pagination', async () => {
      const response = await helper.get(`/notifications/user/${testUserId}?page=1&limit=10`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get only unread notifications', async () => {
      const response = await helper.get(`/notifications/user/${testUserId}?unreadOnly=true`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // All notifications should be unread
      response.body.data.forEach((notification: any) => {
        expect(notification.read).toBe(false);
      });
    });

    it('should use default pagination when not specified', async () => {
      const response = await helper.get(`/notifications/user/${testUserId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
    });

    it('should handle custom page size', async () => {
      const response = await helper.get(`/notifications/user/${testUserId}?page=1&limit=5`);

      expect(response.status).toBe(200);
      expect(response.body.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array for user with no notifications', async () => {
      const nonExistentUserId = 'non-existent-user-' + Date.now();
      const response = await helper.get(`/notifications/user/${nonExistentUserId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      if (!createdNotificationId) {
        // Create a notification first if we don't have one
        const createResponse = await helper.post('/notifications').send({
          userId: testUserId,
          title: 'Test',
          message: 'Test',
          type: 'info',
          channels: ['websocket'],
        });
        createdNotificationId = createResponse.body.id;
      }

      const response = await helper.patch(`/notifications/${createdNotificationId}/read`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('notification');
    });

    it('should return error for non-existent notification', async () => {
      const nonExistentId = 'non-existent-id-' + Date.now();
      const response = await helper.patch(`/notifications/${nonExistentId}/read`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('通知不存在');
    });
  });

  describe('POST /notifications/read-all', () => {
    beforeEach(async () => {
      // Create some test notifications
      await helper.post('/notifications').send({
        userId: testUserId,
        title: 'Test 1',
        message: 'Test message 1',
        type: 'info',
        channels: ['websocket'],
      });
      await helper.post('/notifications').send({
        userId: testUserId,
        title: 'Test 2',
        message: 'Test message 2',
        type: 'info',
        channels: ['websocket'],
      });
    });

    it('should mark all notifications as read for a user', async () => {
      const response = await helper.post('/notifications/read-all').send({ userId: testUserId });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('updated');
      expect(response.body.message).toContain('已标记');
    });

    it('should return error when userId is missing', async () => {
      const response = await helper.post('/notifications/read-all').send({});

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('缺少userId参数');
    });

    it('should handle user with no unread notifications', async () => {
      const newUserId = 'user-with-no-notifications-' + Date.now();
      const response = await helper.post('/notifications/read-all').send({ userId: newUserId });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(0);
    });
  });

  describe('DELETE /notifications/:id', () => {
    it('should delete a notification', async () => {
      // Create a notification to delete
      const createResponse = await helper.post('/notifications').send({
        userId: testUserId,
        title: 'To Delete',
        message: 'This will be deleted',
        type: 'info',
        channels: ['websocket'],
      });
      const notificationId = createResponse.body.id;

      const response = await helper.delete(`/notifications/${notificationId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('通知已删除');
    });

    it('should return error when deleting non-existent notification', async () => {
      const nonExistentId = 'non-existent-id-' + Date.now();
      const response = await helper.delete(`/notifications/${nonExistentId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('通知不存在');
    });
  });

  describe('POST /notifications/batch/delete', () => {
    it('should batch delete multiple notifications', async () => {
      // Create multiple notifications
      const createResponse1 = await helper.post('/notifications').send({
        userId: testUserId,
        title: 'Batch Delete 1',
        message: 'Message 1',
        type: 'info',
        channels: ['websocket'],
      });
      const createResponse2 = await helper.post('/notifications').send({
        userId: testUserId,
        title: 'Batch Delete 2',
        message: 'Message 2',
        type: 'info',
        channels: ['websocket'],
      });

      const ids = [createResponse1.body.id, createResponse2.body.id];
      const response = await helper.post('/notifications/batch/delete').send({ ids });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('deleted');
      expect(response.body.message).toContain('已删除');
    });

    it('should return error when ids array is empty', async () => {
      const response = await helper.post('/notifications/batch/delete').send({ ids: [] });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('请提供要删除的通知ID列表');
    });

    it('should return error when ids is missing', async () => {
      const response = await helper.post('/notifications/batch/delete').send({});

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('请提供要删除的通知ID列表');
    });
  });

  describe('GET /notifications/stats', () => {
    it('should return notification statistics', async () => {
      const response = await helper.get('/notifications/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('unread');
      expect(response.body).toHaveProperty('read');
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.unread).toBe('number');
      expect(typeof response.body.read).toBe('number');
      expect(response.body.total).toBeGreaterThanOrEqual(0);
    });

    it('should have consistent statistics', async () => {
      const response = await helper.get('/notifications/stats');

      expect(response.status).toBe(200);
      // Total should equal read + unread
      expect(response.body.total).toBeGreaterThanOrEqual(response.body.read + response.body.unread);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle malformed JSON', async () => {
      const response = await helper
        .post('/notifications')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    it('should validate userId format in read-all', async () => {
      const response = await helper.post('/notifications/read-all').send({ userId: '' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Pagination Edge Cases', () => {
    it('should handle page number 0', async () => {
      const response = await helper.get(`/notifications/user/${testUserId}?page=0&limit=10`);

      expect(response.status).toBe(200);
      // Service should handle this gracefully
    });

    it('should handle very large limit', async () => {
      const response = await helper.get(`/notifications/user/${testUserId}?page=1&limit=1000`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(1000);
    });

    it('should handle negative page number', async () => {
      const response = await helper.get(`/notifications/user/${testUserId}?page=-1&limit=10`);

      expect(response.status).toBe(200);
      // Service should handle this gracefully
    });
  });
});
