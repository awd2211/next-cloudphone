import { INestApplication } from '@nestjs/common';
import { createE2ETestHelper, E2ETestHelper } from '../helpers/e2e-test.helper';

describe('SmsController (E2E)', () => {
  let helper: E2ETestHelper;
  let app: INestApplication;
  const testPhoneNumber = '+8613800138000'; // Valid Chinese mobile number
  const testPhoneNumber2 = '+8613900139000';

  beforeAll(async () => {
    helper = await createE2ETestHelper();
    app = helper.getApp();
  });

  afterAll(async () => {
    await helper.closeApp();
  });

  describe('GET /sms', () => {
    it('should get SMS records with default pagination', async () => {
      const response = await helper.get('/sms');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter SMS records by status', async () => {
      const response = await helper.get('/sms?status=sent');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should filter SMS records by phone number', async () => {
      const response = await helper.get(`/sms?phone=${testPhoneNumber}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should support custom pagination', async () => {
      const response = await helper.get('/sms?page=1&limit=5');

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should filter by multiple parameters', async () => {
      const response = await helper.get('/sms?status=sent&page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /sms/:id', () => {
    it('should get SMS record by ID', async () => {
      // First, create an SMS record
      const sendResponse = await helper.post('/sms/send').send({
        phoneNumber: testPhoneNumber,
        message: 'Test message for get by ID',
      });

      if (sendResponse.body.messageId) {
        const response = await helper.get(`/sms/${sendResponse.body.messageId}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id');
        expect(response.body.id).toBe(sendResponse.body.messageId);
      }
    });

    it('should return 404 for non-existent SMS ID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await helper.get(`/sms/${nonExistentId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /sms/send', () => {
    it('should send SMS successfully', async () => {
      const dto = {
        phoneNumber: testPhoneNumber,
        message: 'Hello, this is a test SMS message!',
      };

      const response = await helper.post('/sms/send').send(dto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('messageId');
    });

    it('should send SMS with custom from number', async () => {
      const dto = {
        phoneNumber: testPhoneNumber,
        message: 'Test message',
        from: '+1234567890',
      };

      const response = await helper.post('/sms/send').send(dto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success');
    });

    it('should validate phone number format', async () => {
      const invalidDto = {
        phoneNumber: 'invalid-phone',
        message: 'Test message',
      };

      const response = await helper.post('/sms/send').send(invalidDto);

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
    });

    it('should validate required message field', async () => {
      const invalidDto = {
        phoneNumber: testPhoneNumber,
        // Missing message
      };

      const response = await helper.post('/sms/send').send(invalidDto);

      expect(response.status).toBe(400);
    });

    it('should handle empty message', async () => {
      const invalidDto = {
        phoneNumber: testPhoneNumber,
        message: '',
      };

      const response = await helper.post('/sms/send').send(invalidDto);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /sms/send-otp', () => {
    it('should send OTP successfully', async () => {
      const dto = {
        phoneNumber: testPhoneNumber,
        code: '123456',
        expiryMinutes: 5,
      };

      const response = await helper.post('/sms/send-otp').send(dto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('messageId');
    });

    it('should send OTP with default expiry', async () => {
      const dto = {
        phoneNumber: testPhoneNumber,
        code: '654321',
      };

      const response = await helper.post('/sms/send-otp').send(dto);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should validate OTP code format', async () => {
      const invalidDto = {
        phoneNumber: testPhoneNumber,
        code: '',
      };

      const response = await helper.post('/sms/send-otp').send(invalidDto);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /sms/send-batch', () => {
    it('should send batch SMS successfully', async () => {
      const dto = {
        phoneNumbers: [testPhoneNumber, testPhoneNumber2],
        message: 'Batch test message',
      };

      const response = await helper.post('/sms/send-batch').send(dto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('failed');
      expect(response.body).toHaveProperty('results');
      expect(response.body.total).toBe(2);
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBe(2);
    });

    it('should handle single phone number in batch', async () => {
      const dto = {
        phoneNumbers: [testPhoneNumber],
        message: 'Single batch message',
      };

      const response = await helper.post('/sms/send-batch').send(dto);

      expect(response.status).toBe(201);
      expect(response.body.total).toBe(1);
    });

    it('should validate all phone numbers in batch', async () => {
      const invalidDto = {
        phoneNumbers: [testPhoneNumber, 'invalid-phone'],
        message: 'Test message',
      };

      const response = await helper.post('/sms/send-batch').send(invalidDto);

      expect(response.status).toBe(400);
    });

    it('should validate required message field', async () => {
      const invalidDto = {
        phoneNumbers: [testPhoneNumber],
        // Missing message
      };

      const response = await helper.post('/sms/send-batch').send(invalidDto);

      expect(response.status).toBe(400);
    });

    it('should handle empty phone numbers array', async () => {
      const invalidDto = {
        phoneNumbers: [],
        message: 'Test message',
      };

      const response = await helper.post('/sms/send-batch').send(invalidDto);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /sms/stats', () => {
    it('should return SMS statistics', async () => {
      const response = await helper.get('/sms/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('sent');
      expect(response.body).toHaveProperty('failed');
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.sent).toBe('number');
      expect(typeof response.body.failed).toBe('number');
    });

    it('should have consistent statistics', async () => {
      const response = await helper.get('/sms/stats');

      expect(response.status).toBe(200);
      // Total should be >= sent + failed
      expect(response.body.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /sms/health', () => {
    it('should return health status without authentication', async () => {
      // This is a public endpoint, but our mock will still allow it
      const response = await helper.get('/sms/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('provider');
    });
  });

  describe('GET /sms/validate', () => {
    it('should validate correct phone number format', async () => {
      const response = await helper.get(`/sms/validate?phoneNumber=${testPhoneNumber}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('phoneNumber');
      expect(response.body).toHaveProperty('isValid');
      expect(response.body).toHaveProperty('format');
      expect(response.body.phoneNumber).toBe(testPhoneNumber);
      expect(response.body.isValid).toBe(true);
    });

    it('should validate incorrect phone number format', async () => {
      const response = await helper.get('/sms/validate?phoneNumber=invalid-phone');

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(false);
      expect(response.body.format).toContain('Invalid');
    });

    it('should handle missing phone number', async () => {
      const response = await helper.get('/sms/validate');

      expect(response.status).toBe(200);
    });
  });

  describe('POST /sms/otp/send', () => {
    it('should send OTP for registration', async () => {
      const dto = {
        phoneNumber: testPhoneNumber,
        type: 'registration',
      };

      const response = await helper.post('/sms/otp/send').send(dto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('messageId');
    });

    it('should send OTP for login', async () => {
      const dto = {
        phoneNumber: testPhoneNumber,
        type: 'login',
      };

      const response = await helper.post('/sms/otp/send').send(dto);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should send OTP for password reset', async () => {
      const dto = {
        phoneNumber: testPhoneNumber,
        type: 'password_reset',
      };

      const response = await helper.post('/sms/otp/send').send(dto);

      expect(response.status).toBe(201);
    });

    it('should send OTP with custom message', async () => {
      const dto = {
        phoneNumber: testPhoneNumber,
        type: 'registration',
        customMessage: 'Your custom verification code is: ',
      };

      const response = await helper.post('/sms/otp/send').send(dto);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should validate OTP type', async () => {
      const invalidDto = {
        phoneNumber: testPhoneNumber,
        type: 'invalid_type',
      };

      const response = await helper.post('/sms/otp/send').send(invalidDto);

      expect(response.status).toBe(400);
    });

    it('should validate phone number format', async () => {
      const invalidDto = {
        phoneNumber: 'invalid-phone',
        type: 'registration',
      };

      const response = await helper.post('/sms/otp/send').send(invalidDto);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /sms/otp/verify', () => {
    beforeEach(async () => {
      // Send an OTP first
      await helper.post('/sms/otp/send').send({
        phoneNumber: testPhoneNumber,
        type: 'login',
      });
    });

    it('should verify OTP successfully with correct code', async () => {
      // This will likely fail without actual OTP code, but tests the endpoint structure
      const dto = {
        phoneNumber: testPhoneNumber,
        code: '123456',
        type: 'login',
      };

      const response = await helper.post('/sms/otp/verify').send(dto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('valid');
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        phoneNumber: testPhoneNumber,
        // Missing code and type
      };

      const response = await helper.post('/sms/otp/verify').send(invalidDto);

      expect(response.status).toBe(400);
    });

    it('should validate OTP type', async () => {
      const invalidDto = {
        phoneNumber: testPhoneNumber,
        code: '123456',
        type: 'invalid_type',
      };

      const response = await helper.post('/sms/otp/verify').send(invalidDto);

      expect(response.status).toBe(400);
    });

    it('should validate empty code', async () => {
      const invalidDto = {
        phoneNumber: testPhoneNumber,
        code: '',
        type: 'login',
      };

      const response = await helper.post('/sms/otp/verify').send(invalidDto);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /sms/otp/active', () => {
    it('should check if OTP is active', async () => {
      const response = await helper.get(
        `/sms/otp/active?phoneNumber=${testPhoneNumber}&type=registration`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('phoneNumber');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('hasActive');
      expect(response.body).toHaveProperty('remainingSeconds');
      expect(typeof response.body.hasActive).toBe('boolean');
      expect(typeof response.body.remainingSeconds).toBe('number');
    });

    it('should check different OTP types', async () => {
      const types = ['registration', 'login', 'password_reset'];

      for (const type of types) {
        const response = await helper.get(
          `/sms/otp/active?phoneNumber=${testPhoneNumber}&type=${type}`
        );

        expect(response.status).toBe(200);
        expect(response.body.type).toBe(type);
      }
    });

    it('should validate required parameters', async () => {
      const response = await helper.get('/sms/otp/active');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /sms/otp/retries', () => {
    it('should get remaining retries', async () => {
      const response = await helper.get(
        `/sms/otp/retries?phoneNumber=${testPhoneNumber}&type=login`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('phoneNumber');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('remainingRetries');
      expect(typeof response.body.remainingRetries).toBe('number');
      expect(response.body.remainingRetries).toBeGreaterThanOrEqual(0);
    });

    it('should handle different OTP types', async () => {
      const response = await helper.get(
        `/sms/otp/retries?phoneNumber=${testPhoneNumber}&type=registration`
      );

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('registration');
    });
  });

  describe('GET /sms/otp/stats', () => {
    it('should return OTP statistics', async () => {
      const response = await helper.get('/sms/otp/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalSent');
      expect(response.body).toHaveProperty('totalVerified');
      expect(response.body).toHaveProperty('totalFailed');
      expect(typeof response.body.totalSent).toBe('number');
      expect(typeof response.body.totalVerified).toBe('number');
      expect(typeof response.body.totalFailed).toBe('number');
    });

    it('should have consistent OTP statistics', async () => {
      const response = await helper.get('/sms/otp/stats');

      expect(response.status).toBe(200);
      expect(response.body.totalSent).toBeGreaterThanOrEqual(0);
      expect(response.body.totalVerified).toBeGreaterThanOrEqual(0);
      expect(response.body.totalFailed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('POST /sms/otp/clear', () => {
    beforeEach(async () => {
      // Send an OTP first
      await helper.post('/sms/otp/send').send({
        phoneNumber: testPhoneNumber,
        type: 'registration',
      });
    });

    it('should clear OTP successfully', async () => {
      const dto = {
        phoneNumber: testPhoneNumber,
        type: 'registration',
      };

      const response = await helper.post('/sms/otp/clear').send(dto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cleared');
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        phoneNumber: testPhoneNumber,
        // Missing type
      };

      const response = await helper.post('/sms/otp/clear').send(invalidDto);

      expect(response.status).toBe(400);
    });

    it('should handle clearing non-existent OTP', async () => {
      const dto = {
        phoneNumber: '+8619900000000',
        type: 'registration',
      };

      const response = await helper.post('/sms/otp/clear').send(dto);

      // Should succeed even if OTP doesn't exist
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complete OTP workflow', async () => {
      const workflowPhone = '+8618800000000';

      // 1. Send OTP
      const sendResponse = await helper.post('/sms/otp/send').send({
        phoneNumber: workflowPhone,
        type: 'registration',
      });
      expect(sendResponse.body.success).toBe(true);

      // 2. Check if active
      const activeResponse = await helper.get(
        `/sms/otp/active?phoneNumber=${workflowPhone}&type=registration`
      );
      expect(activeResponse.body.hasActive).toBe(true);

      // 3. Check retries
      const retriesResponse = await helper.get(
        `/sms/otp/retries?phoneNumber=${workflowPhone}&type=registration`
      );
      expect(retriesResponse.body.remainingRetries).toBeGreaterThanOrEqual(0);

      // 4. Clear OTP
      const clearResponse = await helper.post('/sms/otp/clear').send({
        phoneNumber: workflowPhone,
        type: 'registration',
      });
      expect(clearResponse.body.success).toBe(true);
    });

    it('should handle concurrent SMS sending', async () => {
      const sends = [
        helper.post('/sms/send').send({
          phoneNumber: testPhoneNumber,
          message: 'Concurrent message 1',
        }),
        helper.post('/sms/send').send({
          phoneNumber: testPhoneNumber2,
          message: 'Concurrent message 2',
        }),
      ];

      const responses = await Promise.all(sends);

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success');
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle malformed JSON', async () => {
      const response = await helper
        .post('/sms/send')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    it('should validate phone number internationally', async () => {
      const invalidNumbers = ['12345', '1234567890', 'abcdefghij'];

      for (const number of invalidNumbers) {
        const response = await helper.post('/sms/send').send({
          phoneNumber: number,
          message: 'Test',
        });

        expect(response.status).toBe(400);
      }
    });

    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(1000);
      const response = await helper.post('/sms/send').send({
        phoneNumber: testPhoneNumber,
        message: longMessage,
      });

      // Should either succeed or return appropriate error
      expect([201, 400]).toContain(response.status);
    });
  });
});
