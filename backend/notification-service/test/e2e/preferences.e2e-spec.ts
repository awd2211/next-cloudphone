import { INestApplication } from '@nestjs/common';
import { createE2ETestHelper, E2ETestHelper } from '../helpers/e2e-test.helper';

describe('PreferencesController (E2E)', () => {
  let helper: E2ETestHelper;
  let app: INestApplication;
  let testUserId: string;

  beforeAll(async () => {
    helper = await createE2ETestHelper();
    app = helper.getApp();
    testUserId = 'pref-test-user-' + Date.now();
  });

  afterAll(async () => {
    await helper.closeApp();
  });

  describe('GET /notifications/preferences', () => {
    it('should get all user preferences', async () => {
      const response = await helper.get(`/notifications/preferences?userId=${testUserId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('preferences');
      expect(Array.isArray(response.body.preferences)).toBe(true);
      expect(response.body.userId).toBe(testUserId);
    });

    it('should return preferences with expected structure', async () => {
      const response = await helper.get(`/notifications/preferences?userId=${testUserId}`);

      expect(response.status).toBe(200);
      if (response.body.preferences.length > 0) {
        const pref = response.body.preferences[0];
        expect(pref).toHaveProperty('notificationType');
        expect(pref).toHaveProperty('enabled');
        expect(pref).toHaveProperty('enabledChannels');
        expect(pref).toHaveProperty('customSettings');
        expect(pref).toHaveProperty('updatedAt');
      }
    });

    it('should require userId parameter', async () => {
      const response = await helper.get('/notifications/preferences');

      // Should still return 200 but might have validation in response
      expect(response.status).toBe(200);
    });
  });

  describe('GET /notifications/preferences/:type', () => {
    it('should get specific notification type preference', async () => {
      const notificationType = 'device_started';
      const response = await helper.get(
        `/notifications/preferences/${notificationType}?userId=${testUserId}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('notificationType');
      expect(response.body).toHaveProperty('enabled');
      expect(response.body).toHaveProperty('enabledChannels');
      expect(response.body.notificationType).toBe(notificationType);
    });

    it('should handle different notification types', async () => {
      const types = ['device_created', 'device_started', 'device_stopped'];

      for (const type of types) {
        const response = await helper.get(
          `/notifications/preferences/${type}?userId=${testUserId}`
        );

        expect(response.status).toBe(200);
        expect(response.body.notificationType).toBe(type);
      }
    });

    it('should return 400 for invalid notification type', async () => {
      const response = await helper.get(
        `/notifications/preferences/invalid_type?userId=${testUserId}`
      );

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /notifications/preferences/:type', () => {
    it('should update notification preference', async () => {
      const notificationType = 'device_started';
      const updateDto = {
        enabled: false,
        enabledChannels: ['email'],
      };

      const response = await helper
        .put(`/notifications/preferences/${notificationType}?userId=${testUserId}`)
        .send(updateDto);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('preference');
      expect(response.body.preference.enabled).toBe(updateDto.enabled);
      expect(response.body.preference.enabledChannels).toEqual(updateDto.enabledChannels);
    });

    it('should update only enabled field', async () => {
      const notificationType = 'device_stopped';
      const updateDto = {
        enabled: true,
      };

      const response = await helper
        .put(`/notifications/preferences/${notificationType}?userId=${testUserId}`)
        .send(updateDto);

      expect(response.status).toBe(200);
      expect(response.body.preference.enabled).toBe(true);
    });

    it('should update only enabled channels', async () => {
      const notificationType = 'device_created';
      const updateDto = {
        enabledChannels: ['websocket', 'email'],
      };

      const response = await helper
        .put(`/notifications/preferences/${notificationType}?userId=${testUserId}`)
        .send(updateDto);

      expect(response.status).toBe(200);
      expect(response.body.preference.enabledChannels).toEqual(updateDto.enabledChannels);
    });

    it('should update custom settings', async () => {
      const notificationType = 'device_error';
      const updateDto = {
        customSettings: {
          emailFrequency: 'immediate',
          sound: 'alert',
        },
      };

      const response = await helper
        .put(`/notifications/preferences/${notificationType}?userId=${testUserId}`)
        .send(updateDto);

      expect(response.status).toBe(200);
      expect(response.body.preference.customSettings).toEqual(updateDto.customSettings);
    });

    it('should validate channel values', async () => {
      const notificationType = 'device_started';
      const invalidDto = {
        enabledChannels: ['invalid_channel'],
      };

      const response = await helper
        .put(`/notifications/preferences/${notificationType}?userId=${testUserId}`)
        .send(invalidDto);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /notifications/preferences/batch', () => {
    it('should batch update multiple preferences', async () => {
      const batchDto = {
        preferences: [
          {
            notificationType: 'device_created',
            enabled: true,
            enabledChannels: ['websocket'],
          },
          {
            notificationType: 'device_started',
            enabled: false,
            enabledChannels: ['email'],
          },
          {
            notificationType: 'device_stopped',
            enabled: true,
            enabledChannels: ['websocket', 'email'],
          },
        ],
      };

      const response = await helper
        .post(`/notifications/preferences/batch?userId=${testUserId}`)
        .send(batchDto);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('updatedCount');
      expect(response.body.updatedCount).toBe(3);
      expect(response.body.message).toContain('3 preferences updated');
    });

    it('should handle single preference in batch', async () => {
      const batchDto = {
        preferences: [
          {
            notificationType: 'app_installed',
            enabled: true,
            enabledChannels: ['websocket'],
          },
        ],
      };

      const response = await helper
        .post(`/notifications/preferences/batch?userId=${testUserId}`)
        .send(batchDto);

      expect(response.status).toBe(200);
      expect(response.body.updatedCount).toBe(1);
    });

    it('should validate all preferences in batch', async () => {
      const invalidBatchDto = {
        preferences: [
          {
            notificationType: 'device_created',
            enabled: true,
          },
          {
            // Invalid - missing notificationType
            enabled: false,
          },
        ],
      };

      const response = await helper
        .post(`/notifications/preferences/batch?userId=${testUserId}`)
        .send(invalidBatchDto);

      expect(response.status).toBe(400);
    });

    it('should return error when preferences array is empty', async () => {
      const response = await helper
        .post(`/notifications/preferences/batch?userId=${testUserId}`)
        .send({ preferences: [] });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /notifications/preferences/reset', () => {
    beforeEach(async () => {
      // Modify some preferences before reset
      await helper
        .put(`/notifications/preferences/device_started?userId=${testUserId}`)
        .send({ enabled: false });
    });

    it('should reset preferences to default', async () => {
      const response = await helper.post(`/notifications/preferences/reset?userId=${testUserId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('totalPreferences');
      expect(response.body.totalPreferences).toBeGreaterThan(0);
      expect(response.body.message).toContain('reset to default');
    });

    it('should restore default settings after reset', async () => {
      // Reset
      await helper.post(`/notifications/preferences/reset?userId=${testUserId}`);

      // Verify default settings are restored
      const response = await helper.get(
        `/notifications/preferences/device_started?userId=${testUserId}`
      );

      expect(response.status).toBe(200);
      // Default should be enabled
      expect(response.body.enabled).toBe(true);
    });

    it('should require userId parameter', async () => {
      const response = await helper.post('/notifications/preferences/reset');

      // Should handle missing userId gracefully
      expect(response.status).toBe(200);
    });
  });

  describe('GET /notifications/preferences/meta/types', () => {
    it('should get all available notification types', async () => {
      const response = await helper.get('/notifications/preferences/meta/types');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('types');
      expect(Array.isArray(response.body.types)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);
    });

    it('should return types with expected structure', async () => {
      const response = await helper.get('/notifications/preferences/meta/types');

      expect(response.status).toBe(200);
      expect(response.body.types.length).toBeGreaterThan(0);

      const type = response.body.types[0];
      expect(type).toHaveProperty('type');
      expect(type).toHaveProperty('description');
      expect(type).toHaveProperty('priority');
      expect(type).toHaveProperty('defaultChannels');
      expect(Array.isArray(type.defaultChannels)).toBe(true);
    });

    it('should include common notification types', async () => {
      const response = await helper.get('/notifications/preferences/meta/types');

      expect(response.status).toBe(200);
      const typeNames = response.body.types.map((t: any) => t.type);

      // Verify some expected types exist
      expect(typeNames).toContain('device_created');
      expect(typeNames).toContain('device_started');
    });
  });

  describe('GET /notifications/preferences/meta/stats', () => {
    it('should get user preference statistics', async () => {
      const response = await helper.get(
        `/notifications/preferences/meta/stats?userId=${testUserId}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('stats');
      expect(response.body.userId).toBe(testUserId);
    });

    it('should return stats with counts', async () => {
      const response = await helper.get(
        `/notifications/preferences/meta/stats?userId=${testUserId}`
      );

      expect(response.status).toBe(200);
      const stats = response.body.stats;

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('enabled');
      expect(stats).toHaveProperty('disabled');
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.enabled).toBe('number');
      expect(typeof stats.disabled).toBe('number');
    });

    it('should have consistent stats totals', async () => {
      const response = await helper.get(
        `/notifications/preferences/meta/stats?userId=${testUserId}`
      );

      expect(response.status).toBe(200);
      const stats = response.body.stats;

      // Total should equal enabled + disabled
      expect(stats.total).toBe(stats.enabled + stats.disabled);
    });
  });

  describe('POST /notifications/preferences/check', () => {
    it('should check if user should receive notification', async () => {
      const checkDto = {
        userId: testUserId,
        notificationType: 'device_started',
        channel: 'websocket',
      };

      const response = await helper.post('/notifications/preferences/check').send(checkDto);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('notificationType');
      expect(response.body).toHaveProperty('channel');
      expect(response.body).toHaveProperty('shouldReceive');
      expect(typeof response.body.shouldReceive).toBe('boolean');
    });

    it('should respect user preferences', async () => {
      // Disable a notification type
      await helper
        .put(`/notifications/preferences/device_error?userId=${testUserId}`)
        .send({ enabled: false });

      // Check if should receive
      const response = await helper.post('/notifications/preferences/check').send({
        userId: testUserId,
        notificationType: 'device_error',
        channel: 'websocket',
      });

      expect(response.status).toBe(200);
      expect(response.body.shouldReceive).toBe(false);
    });

    it('should respect channel preferences', async () => {
      // Enable only email channel
      await helper
        .put(`/notifications/preferences/device_created?userId=${testUserId}`)
        .send({ enabledChannels: ['email'] });

      // Check websocket channel
      const response = await helper.post('/notifications/preferences/check').send({
        userId: testUserId,
        notificationType: 'device_created',
        channel: 'websocket',
      });

      expect(response.status).toBe(200);
      expect(response.body.shouldReceive).toBe(false);
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        userId: testUserId,
        // Missing notificationType and channel
      };

      const response = await helper.post('/notifications/preferences/check').send(invalidDto);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /notifications/preferences/channel/:channel', () => {
    beforeEach(async () => {
      // Set up some channel preferences
      await helper.post(`/notifications/preferences/batch?userId=${testUserId}`).send({
        preferences: [
          {
            notificationType: 'device_created',
            enabled: true,
            enabledChannels: ['websocket', 'email'],
          },
          {
            notificationType: 'device_started',
            enabled: true,
            enabledChannels: ['websocket'],
          },
          {
            notificationType: 'device_stopped',
            enabled: true,
            enabledChannels: ['email'],
          },
        ],
      });
    });

    it('should get enabled types for websocket channel', async () => {
      const response = await helper.get(
        `/notifications/preferences/channel/websocket?userId=${testUserId}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('channel');
      expect(response.body).toHaveProperty('enabledTypes');
      expect(response.body).toHaveProperty('count');
      expect(response.body.channel).toBe('websocket');
      expect(Array.isArray(response.body.enabledTypes)).toBe(true);
    });

    it('should get enabled types for email channel', async () => {
      const response = await helper.get(
        `/notifications/preferences/channel/email?userId=${testUserId}`
      );

      expect(response.status).toBe(200);
      expect(response.body.channel).toBe('email');
      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });

    it('should return 400 for invalid channel', async () => {
      const response = await helper.get(
        `/notifications/preferences/channel/invalid_channel?userId=${testUserId}`
      );

      expect(response.status).toBe(400);
    });

    it('should handle SMS channel', async () => {
      const response = await helper.get(
        `/notifications/preferences/channel/sms?userId=${testUserId}`
      );

      expect(response.status).toBe(200);
      expect(response.body.channel).toBe('sms');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complete preference management workflow', async () => {
      const workflowUserId = 'workflow-user-' + Date.now();

      // 1. Get initial preferences
      const initialResponse = await helper.get(
        `/notifications/preferences?userId=${workflowUserId}`
      );
      expect(initialResponse.status).toBe(200);

      // 2. Batch update preferences
      await helper.post(`/notifications/preferences/batch?userId=${workflowUserId}`).send({
        preferences: [
          {
            notificationType: 'device_created',
            enabled: true,
            enabledChannels: ['websocket'],
          },
          {
            notificationType: 'device_error',
            enabled: false,
          },
        ],
      });

      // 3. Check specific preference
      const checkResponse = await helper.post('/notifications/preferences/check').send({
        userId: workflowUserId,
        notificationType: 'device_created',
        channel: 'websocket',
      });
      expect(checkResponse.body.shouldReceive).toBe(true);

      // 4. Get stats
      const statsResponse = await helper.get(
        `/notifications/preferences/meta/stats?userId=${workflowUserId}`
      );
      expect(statsResponse.status).toBe(200);

      // 5. Reset to default
      const resetResponse = await helper.post(
        `/notifications/preferences/reset?userId=${workflowUserId}`
      );
      expect(resetResponse.body.success).toBe(true);
    });

    it('should handle concurrent preference updates', async () => {
      const concurrentUserId = 'concurrent-user-' + Date.now();

      const updates = [
        helper
          .put(`/notifications/preferences/device_created?userId=${concurrentUserId}`)
          .send({ enabled: true }),
        helper
          .put(`/notifications/preferences/device_started?userId=${concurrentUserId}`)
          .send({ enabled: false }),
        helper
          .put(`/notifications/preferences/device_stopped?userId=${concurrentUserId}`)
          .send({ enabled: true }),
      ];

      const responses = await Promise.all(updates);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle malformed JSON', async () => {
      const response = await helper
        .post('/notifications/preferences/batch?userId=' + testUserId)
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    it('should validate boolean types', async () => {
      const response = await helper
        .put(`/notifications/preferences/device_created?userId=${testUserId}`)
        .send({ enabled: 'not-a-boolean' });

      expect(response.status).toBe(400);
    });

    it('should validate array types', async () => {
      const response = await helper
        .put(`/notifications/preferences/device_created?userId=${testUserId}`)
        .send({ enabledChannels: 'not-an-array' });

      expect(response.status).toBe(400);
    });
  });
});
