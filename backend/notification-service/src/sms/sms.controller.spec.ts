import { Test, TestingModule } from '@nestjs/testing';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { OtpService, OtpType } from './otp.service';

describe('SmsController', () => {
  let controller: SmsController;
  let smsService: any;
  let otpService: any;

  const mockSmsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    send: jest.fn(),
    sendOtp: jest.fn(),
    sendBatch: jest.fn(),
    getAllStats: jest.fn(),
    healthCheck: jest.fn(),
    validatePhoneNumber: jest.fn(),
  };

  const mockOtpService = {
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    hasActiveOtp: jest.fn(),
    getRemainingTtl: jest.fn(),
    getRemainingRetries: jest.fn(),
    getStats: jest.fn(),
    clearOtp: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SmsController],
      providers: [
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
        {
          provide: OtpService,
          useValue: mockOtpService,
        },
      ],
    }).compile();

    controller = module.get<SmsController>(SmsController);
    smsService = module.get(SmsService);
    otpService = module.get(OtpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return SMS records without filters', async () => {
      const query: any = {};
      const mockRecords = {
        data: [
          { id: 'sms-1', phone: '+1234567890', status: 'sent', message: 'Test message' },
          { id: 'sms-2', phone: '+9876543210', status: 'delivered', message: 'Another message' },
        ],
        total: 2,
        page: 1,
        limit: 10,
      };

      mockSmsService.findAll.mockResolvedValue(mockRecords);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockRecords);
      expect(result.data).toHaveLength(2);
      expect(mockSmsService.findAll).toHaveBeenCalledWith(query);
    });

    it('should return SMS records with status filter', async () => {
      const query: any = { status: 'sent', page: 1, limit: 10 };
      const mockRecords = {
        data: [{ id: 'sms-1', phone: '+1234567890', status: 'sent' }],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockSmsService.findAll.mockResolvedValue(mockRecords);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockRecords);
      expect(result.data[0].status).toBe('sent');
    });

    it('should return SMS records with phone filter', async () => {
      const query: any = { phone: '+1234567890' };
      const mockRecords = {
        data: [{ id: 'sms-1', phone: '+1234567890', status: 'sent' }],
        total: 1,
      };

      mockSmsService.findAll.mockResolvedValue(mockRecords);

      const result = await controller.findAll(query);

      expect(result.data[0].phone).toBe('+1234567890');
    });
  });

  describe('findOne', () => {
    it('should return SMS record by ID', async () => {
      const id = 'sms-123';
      const mockRecord = {
        id: 'sms-123',
        phone: '+1234567890',
        status: 'sent',
        message: 'Test message',
        provider: 'twilio',
      };

      mockSmsService.findOne.mockResolvedValue(mockRecord);

      const result = await controller.findOne(id);

      expect(result).toEqual(mockRecord);
      expect(result.id).toBe(id);
      expect(mockSmsService.findOne).toHaveBeenCalledWith(id);
    });

    it('should return different SMS record', async () => {
      const id = 'sms-456';
      const mockRecord = {
        id: 'sms-456',
        phone: '+9876543210',
        status: 'failed',
      };

      mockSmsService.findOne.mockResolvedValue(mockRecord);

      const result = await controller.findOne(id);

      expect(result.id).toBe(id);
      expect(result.status).toBe('failed');
    });
  });

  describe('send', () => {
    it('should send SMS successfully', async () => {
      const dto: any = {
        phoneNumber: '+1234567890',
        message: 'Test message',
        from: 'CloudPhone',
      };

      const mockResult = {
        success: true,
        messageId: 'msg-123',
        error: null,
      };

      mockSmsService.send.mockResolvedValue(mockResult);

      const result = await controller.send(dto);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(mockSmsService.send).toHaveBeenCalledWith({
        to: dto.phoneNumber,
        message: dto.message,
        from: dto.from,
      });
    });

    it('should handle send failure', async () => {
      const dto: any = {
        phoneNumber: '+1234567890',
        message: 'Test message',
      };

      const mockResult = {
        success: false,
        messageId: null,
        error: 'Provider error',
      };

      mockSmsService.send.mockResolvedValue(mockResult);

      const result = await controller.send(dto);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Provider error');
    });
  });

  describe('sendOtp', () => {
    it('should send OTP successfully', async () => {
      const dto: any = {
        phoneNumber: '+1234567890',
        code: '123456',
        expiryMinutes: 5,
      };

      const mockResult = {
        success: true,
        messageId: 'otp-msg-123',
        error: null,
      };

      mockSmsService.sendOtp.mockResolvedValue(mockResult);

      const result = await controller.sendOtp(dto);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('otp-msg-123');
      expect(mockSmsService.sendOtp).toHaveBeenCalledWith(
        dto.phoneNumber,
        dto.code,
        dto.expiryMinutes
      );
    });

    it('should send OTP without expiry minutes', async () => {
      const dto: any = {
        phoneNumber: '+1234567890',
        code: '654321',
      };

      const mockResult = {
        success: true,
        messageId: 'otp-msg-456',
      };

      mockSmsService.sendOtp.mockResolvedValue(mockResult);

      const result = await controller.sendOtp(dto);

      expect(result.success).toBe(true);
      expect(mockSmsService.sendOtp).toHaveBeenCalledWith(
        dto.phoneNumber,
        dto.code,
        undefined
      );
    });
  });

  describe('sendBatch', () => {
    it('should send batch SMS successfully', async () => {
      const dto: any = {
        phoneNumbers: ['+1234567890', '+9876543210', '+1111111111'],
        message: 'Batch message',
      };

      const mockResults = [
        { success: true, messageId: 'msg-1' },
        { success: true, messageId: 'msg-2' },
        { success: false, error: 'Failed to send' },
      ];

      mockSmsService.sendBatch.mockResolvedValue(mockResults);

      const result = await controller.sendBatch(dto);

      expect(result.total).toBe(3);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.results).toEqual(mockResults);
      expect(mockSmsService.sendBatch).toHaveBeenCalledWith(dto.phoneNumbers, dto.message);
    });

    it('should handle all successful batch sends', async () => {
      const dto: any = {
        phoneNumbers: ['+1234567890', '+9876543210'],
        message: 'Success message',
      };

      const mockResults = [
        { success: true, messageId: 'msg-1' },
        { success: true, messageId: 'msg-2' },
      ];

      mockSmsService.sendBatch.mockResolvedValue(mockResults);

      const result = await controller.sendBatch(dto);

      expect(result.total).toBe(2);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle all failed batch sends', async () => {
      const dto: any = {
        phoneNumbers: ['+1234567890', '+9876543210'],
        message: 'Failed message',
      };

      const mockResults = [
        { success: false, error: 'Error 1' },
        { success: false, error: 'Error 2' },
      ];

      mockSmsService.sendBatch.mockResolvedValue(mockResults);

      const result = await controller.sendBatch(dto);

      expect(result.total).toBe(2);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return SMS statistics', async () => {
      const mockStats = {
        totalSent: 1000,
        totalDelivered: 950,
        totalFailed: 50,
        byProvider: {
          twilio: { sent: 600, delivered: 580 },
          nexmo: { sent: 400, delivered: 370 },
        },
        byStatus: {
          sent: 100,
          delivered: 850,
          failed: 50,
        },
      };

      mockSmsService.getAllStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(result.totalSent).toBe(1000);
      expect(result.totalDelivered).toBe(950);
      expect(mockSmsService.getAllStats).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const mockHealth = {
        status: 'ok',
        providers: {
          twilio: 'connected',
          nexmo: 'connected',
        },
        timestamp: new Date().toISOString(),
      };

      mockSmsService.healthCheck.mockResolvedValue(mockHealth);

      const result = await controller.healthCheck();

      expect(result.status).toBe('ok');
      expect(result.providers).toBeDefined();
      expect(mockSmsService.healthCheck).toHaveBeenCalled();
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate valid phone number', async () => {
      const phoneNumber = '+1234567890';

      mockSmsService.validatePhoneNumber.mockReturnValue(true);

      const result = await controller.validatePhoneNumber(phoneNumber);

      expect(result.phoneNumber).toBe(phoneNumber);
      expect(result.isValid).toBe(true);
      expect(result.format).toContain('Valid');
      expect(mockSmsService.validatePhoneNumber).toHaveBeenCalledWith(phoneNumber);
    });

    it('should validate invalid phone number', async () => {
      const phoneNumber = '1234567890'; // Missing +

      mockSmsService.validatePhoneNumber.mockReturnValue(false);

      const result = await controller.validatePhoneNumber(phoneNumber);

      expect(result.phoneNumber).toBe(phoneNumber);
      expect(result.isValid).toBe(false);
      expect(result.format).toContain('Invalid');
    });
  });

  // ========================================
  // OTP 验证码相关端点测试
  // ========================================

  describe('sendOtpV2', () => {
    it('should send OTP for registration', async () => {
      const dto: any = {
        phoneNumber: '+1234567890',
        type: OtpType.REGISTRATION,
      };

      const mockResult = {
        success: true,
        messageId: 'otp-v2-123',
        expiresIn: 300,
      };

      mockOtpService.sendOtp.mockResolvedValue(mockResult);

      const result = await controller.sendOtpV2(dto);

      expect(result.success).toBe(true);
      expect(result.expiresIn).toBe(300);
      expect(mockOtpService.sendOtp).toHaveBeenCalledWith(
        dto.phoneNumber,
        dto.type,
        undefined
      );
    });

    it('should send OTP with custom message', async () => {
      const dto: any = {
        phoneNumber: '+1234567890',
        type: OtpType.LOGIN,
        customMessage: 'Your login code is: {code}',
      };

      const mockResult = {
        success: true,
        messageId: 'otp-v2-456',
      };

      mockOtpService.sendOtp.mockResolvedValue(mockResult);

      const result = await controller.sendOtpV2(dto);

      expect(result.success).toBe(true);
      expect(mockOtpService.sendOtp).toHaveBeenCalledWith(
        dto.phoneNumber,
        dto.type,
        dto.customMessage
      );
    });

    it('should send OTP for password reset', async () => {
      const dto: any = {
        phoneNumber: '+9876543210',
        type: OtpType.PASSWORD_RESET,
      };

      const mockResult = {
        success: true,
        messageId: 'otp-v2-789',
      };

      mockOtpService.sendOtp.mockResolvedValue(mockResult);

      const result = await controller.sendOtpV2(dto);

      expect(result.success).toBe(true);
      expect(mockOtpService.sendOtp).toHaveBeenCalledWith(dto.phoneNumber, dto.type, undefined);
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP successfully', async () => {
      const dto: any = {
        phoneNumber: '+1234567890',
        code: '123456',
        type: OtpType.REGISTRATION,
      };

      const mockResult = {
        valid: true,
        message: 'OTP verified successfully',
      };

      mockOtpService.verifyOtp.mockResolvedValue(mockResult);

      const result = await controller.verifyOtp(dto);

      expect(result.valid).toBe(true);
      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith(
        dto.phoneNumber,
        dto.code,
        dto.type
      );
    });

    it('should fail to verify invalid OTP', async () => {
      const dto: any = {
        phoneNumber: '+1234567890',
        code: '999999',
        type: OtpType.LOGIN,
      };

      const mockResult = {
        valid: false,
        message: 'Invalid OTP code',
      };

      mockOtpService.verifyOtp.mockResolvedValue(mockResult);

      const result = await controller.verifyOtp(dto);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid');
    });

    it('should fail to verify expired OTP', async () => {
      const dto: any = {
        phoneNumber: '+1234567890',
        code: '123456',
        type: OtpType.PASSWORD_RESET,
      };

      const mockResult = {
        valid: false,
        message: 'OTP has expired',
      };

      mockOtpService.verifyOtp.mockResolvedValue(mockResult);

      const result = await controller.verifyOtp(dto);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('expired');
    });
  });

  describe('hasActiveOtp', () => {
    it('should return true when OTP is active', async () => {
      const phoneNumber = '+1234567890';
      const type = OtpType.REGISTRATION;

      mockOtpService.hasActiveOtp.mockResolvedValue(true);
      mockOtpService.getRemainingTtl.mockResolvedValue(240);

      const result = await controller.hasActiveOtp(phoneNumber, type);

      expect(result.hasActive).toBe(true);
      expect(result.remainingSeconds).toBe(240);
      expect(result.phoneNumber).toBe(phoneNumber);
      expect(result.type).toBe(type);
    });

    it('should return false when no active OTP', async () => {
      const phoneNumber = '+1234567890';
      const type = OtpType.LOGIN;

      mockOtpService.hasActiveOtp.mockResolvedValue(false);

      const result = await controller.hasActiveOtp(phoneNumber, type);

      expect(result.hasActive).toBe(false);
      expect(result.remainingSeconds).toBe(0);
    });
  });

  describe('getRemainingRetries', () => {
    it('should return remaining retries', async () => {
      const phoneNumber = '+1234567890';
      const type = OtpType.REGISTRATION;

      mockOtpService.getRemainingRetries.mockResolvedValue(3);

      const result = await controller.getRemainingRetries(phoneNumber, type);

      expect(result.remainingRetries).toBe(3);
      expect(result.phoneNumber).toBe(phoneNumber);
      expect(result.type).toBe(type);
    });

    it('should return zero retries when exhausted', async () => {
      const phoneNumber = '+1234567890';
      const type = OtpType.LOGIN;

      mockOtpService.getRemainingRetries.mockResolvedValue(0);

      const result = await controller.getRemainingRetries(phoneNumber, type);

      expect(result.remainingRetries).toBe(0);
    });
  });

  describe('getOtpStats', () => {
    it('should return OTP statistics', async () => {
      const mockStats = {
        totalSent: 5000,
        totalVerified: 4500,
        totalFailed: 500,
        byType: {
          registration: 2000,
          login: 1500,
          password_reset: 1000,
          phone_verify: 500,
        },
      };

      mockOtpService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getOtpStats();

      expect(result).toEqual(mockStats);
      expect(result.totalSent).toBe(5000);
      expect(result.totalVerified).toBe(4500);
      expect(mockOtpService.getStats).toHaveBeenCalled();
    });
  });

  describe('clearOtp', () => {
    it('should clear OTP successfully', async () => {
      const body = {
        phoneNumber: '+1234567890',
        type: OtpType.REGISTRATION,
      };

      mockOtpService.clearOtp.mockResolvedValue(undefined);

      const result = await controller.clearOtp(body);

      expect(result.message).toContain('cleared successfully');
      expect(mockOtpService.clearOtp).toHaveBeenCalledWith(body.phoneNumber, body.type);
    });

    it('should clear different OTP type', async () => {
      const body = {
        phoneNumber: '+9876543210',
        type: OtpType.PASSWORD_RESET,
      };

      mockOtpService.clearOtp.mockResolvedValue(undefined);

      const result = await controller.clearOtp(body);

      expect(result.message).toBeDefined();
      expect(mockOtpService.clearOtp).toHaveBeenCalledWith(body.phoneNumber, body.type);
    });
  });
});
