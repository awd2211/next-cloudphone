import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsService } from '../sms.service';
import { TwilioSmsProvider } from '../providers/twilio.provider';
import { AwsSnsProvider } from '../providers/aws-sns.provider';
import { MessageBirdProvider } from '../providers/messagebird.provider';
import { AliyunSmsProvider } from '../providers/aliyun.provider';
import { TencentSmsProvider } from '../providers/tencent.provider';
import { SmsOptions, SmsResult } from '../sms.interface';

describe('SmsService', () => {
  let service: SmsService;
  let twilioProvider: TwilioSmsProvider;
  let awsProvider: AwsSnsProvider;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, string> = {
        SMS_PRIMARY_PROVIDER: 'twilio',
        SMS_FALLBACK_PROVIDERS: 'aws-sns,messagebird',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockTwilioProvider = {
    name: 'twilio',
    send: jest.fn(),
    sendBatch: jest.fn(),
    validatePhoneNumber: jest.fn(),
    getStats: jest.fn(),
  };

  const mockAwsProvider = {
    name: 'aws-sns',
    send: jest.fn(),
    sendBatch: jest.fn(),
    validatePhoneNumber: jest.fn(),
    getStats: jest.fn(),
  };

  const mockMessageBirdProvider = {
    name: 'messagebird',
    send: jest.fn(),
    sendBatch: jest.fn(),
    validatePhoneNumber: jest.fn(),
    getStats: jest.fn(),
  };

  const mockAliyunProvider = {
    name: 'aliyun',
    send: jest.fn(),
    sendBatch: jest.fn(),
    validatePhoneNumber: jest.fn(),
    getStats: jest.fn(),
  };

  const mockTencentProvider = {
    name: 'tencent',
    send: jest.fn(),
    sendBatch: jest.fn(),
    validatePhoneNumber: jest.fn(),
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: TwilioSmsProvider,
          useValue: mockTwilioProvider,
        },
        {
          provide: AwsSnsProvider,
          useValue: mockAwsProvider,
        },
        {
          provide: MessageBirdProvider,
          useValue: mockMessageBirdProvider,
        },
        {
          provide: AliyunSmsProvider,
          useValue: mockAliyunProvider,
        },
        {
          provide: TencentSmsProvider,
          useValue: mockTencentProvider,
        },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
    twilioProvider = module.get<TwilioSmsProvider>(TwilioSmsProvider);
    awsProvider = module.get<AwsSnsProvider>(AwsSnsProvider);
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should register all providers', () => {
      expect(service['providers'].size).toBe(5);
      expect(service['providers'].has('twilio')).toBe(true);
      expect(service['providers'].has('aws-sns')).toBe(true);
      expect(service['providers'].has('messagebird')).toBe(true);
      expect(service['providers'].has('aliyun')).toBe(true);
      expect(service['providers'].has('tencent')).toBe(true);
    });

    it('should configure primary and fallback providers', () => {
      expect(service['primaryProvider']).toBe('twilio');
      expect(service['fallbackProviders']).toEqual(['aws-sns', 'messagebird']);
    });
  });

  describe('send', () => {
    const smsOptions: SmsOptions = {
      to: '+8613800138000',
      message: 'Test message',
    };

    it('should send SMS using primary provider when successful', async () => {
      const successResult: SmsResult = {
        success: true,
        messageId: 'msg-123',
        provider: 'twilio',
      };

      mockTwilioProvider.send.mockResolvedValue(successResult);

      const result = await service.send(smsOptions);

      expect(result).toEqual(successResult);
      expect(mockTwilioProvider.send).toHaveBeenCalledWith(smsOptions);
      expect(mockAwsProvider.send).not.toHaveBeenCalled();
    });

    it('should failover to fallback provider when primary fails', async () => {
      const failureResult: SmsResult = {
        success: false,
        error: 'Primary provider failed',
      };

      const successResult: SmsResult = {
        success: true,
        messageId: 'msg-456',
        provider: 'aws-sns',
      };

      mockTwilioProvider.send.mockResolvedValue(failureResult);
      mockAwsProvider.send.mockResolvedValue(successResult);

      const result = await service.send(smsOptions);

      expect(result).toEqual(successResult);
      expect(mockTwilioProvider.send).toHaveBeenCalledWith(smsOptions);
      expect(mockAwsProvider.send).toHaveBeenCalledWith(smsOptions);
    });

    it('should try all fallback providers if primary and first fallback fail', async () => {
      const failureResult: SmsResult = {
        success: false,
        error: 'Provider failed',
      };

      const successResult: SmsResult = {
        success: true,
        messageId: 'msg-789',
        provider: 'messagebird',
      };

      mockTwilioProvider.send.mockResolvedValue(failureResult);
      mockAwsProvider.send.mockResolvedValue(failureResult);
      mockMessageBirdProvider.send.mockResolvedValue(successResult);

      const result = await service.send(smsOptions);

      expect(result).toEqual(successResult);
      expect(mockTwilioProvider.send).toHaveBeenCalled();
      expect(mockAwsProvider.send).toHaveBeenCalled();
      expect(mockMessageBirdProvider.send).toHaveBeenCalled();
    });

    it('should return failure if all providers fail', async () => {
      const failureResult: SmsResult = {
        success: false,
        error: 'All providers failed',
      };

      mockTwilioProvider.send.mockResolvedValue(failureResult);
      mockAwsProvider.send.mockResolvedValue(failureResult);
      mockMessageBirdProvider.send.mockResolvedValue(failureResult);

      const result = await service.send(smsOptions);

      expect(result.success).toBe(false);
    });
  });

  describe('sendOtp', () => {
    it('should send OTP message with correct format', async () => {
      const phoneNumber = '+8613800138000';
      const code = '123456';
      const expiryMinutes = 5;

      const successResult: SmsResult = {
        success: true,
        messageId: 'otp-msg-123',
      };

      mockTwilioProvider.send.mockResolvedValue(successResult);

      const result = await service.sendOtp(phoneNumber, code, expiryMinutes);

      expect(result.success).toBe(true);
      expect(mockTwilioProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: phoneNumber,
          message: expect.stringContaining(code),
          isOtp: true,
        }),
      );
    });
  });

  describe('sendBatch', () => {
    it('should send batch SMS to multiple recipients', async () => {
      const phoneNumbers = ['+8613800138000', '+8613800138001'];
      const message = 'Batch test message';

      const successResults = phoneNumbers.map((phone) => ({
        success: true,
        messageId: `batch-${phone}`,
      }));

      mockTwilioProvider.sendBatch.mockResolvedValue(successResults);

      const results = await service.sendBatch(phoneNumbers, message);

      expect(results).toHaveLength(2);
      expect(mockTwilioProvider.sendBatch).toHaveBeenCalledWith(
        phoneNumbers,
        message,
      );
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate phone numbers using primary provider', () => {
      const phoneNumber = '+8613800138000';
      mockTwilioProvider.validatePhoneNumber.mockReturnValue(true);

      const result = service.validatePhoneNumber(phoneNumber);

      expect(result).toBe(true);
      expect(mockTwilioProvider.validatePhoneNumber).toHaveBeenCalledWith(
        phoneNumber,
      );
    });
  });

  describe('sendNotification', () => {
    it('should send notification SMS successfully', async () => {
      const phoneNumber = '+8613800138000';
      const message = 'You have a new notification';

      const successResult: SmsResult = {
        success: true,
        messageId: 'notif-msg-123',
      };

      mockTwilioProvider.send.mockResolvedValue(successResult);

      const result = await service.sendNotification(phoneNumber, message);

      expect(result.success).toBe(true);
      expect(mockTwilioProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: phoneNumber,
          message,
        }),
      );
    });
  });
});
