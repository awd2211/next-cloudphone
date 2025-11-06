import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationCodeController } from './verification-code.controller';
import { VerificationCodeExtractorService } from '../services/verification-code-extractor.service';
import { VerificationCodeCacheService } from '../services/verification-code-cache.service';
import { SmsMessage } from '../entities/sms-message.entity';

describe('VerificationCodeController', () => {
  let controller: VerificationCodeController;
  let extractorService: jest.Mocked<VerificationCodeExtractorService>;
  let cacheService: jest.Mocked<VerificationCodeCacheService>;
  let smsMessageRepo: jest.Mocked<Repository<SmsMessage>>;

  const mockExtractorService = {
    extractCode: jest.fn(),
    getSupportedPatterns: jest.fn(),
    testPattern: jest.fn(),
  };

  const mockCacheService = {
    getCodeByPhone: jest.fn(),
    getCodeByDevice: jest.fn(),
    cacheCode: jest.fn(),
    isCodeValid: jest.fn(),
    markCodeConsumed: jest.fn(),
    getCacheStatistics: jest.fn(),
    getMultipleCodes: jest.fn(),
  };

  const mockSmsMessageRepo = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerificationCodeController],
      providers: [
        {
          provide: VerificationCodeExtractorService,
          useValue: mockExtractorService,
        },
        {
          provide: VerificationCodeCacheService,
          useValue: mockCacheService,
        },
        {
          provide: getRepositoryToken(SmsMessage),
          useValue: mockSmsMessageRepo,
        },
      ],
    }).compile();

    controller = module.get<VerificationCodeController>(VerificationCodeController);
    extractorService = module.get(VerificationCodeExtractorService);
    cacheService = module.get(VerificationCodeCacheService);
    smsMessageRepo = module.get(getRepositoryToken(SmsMessage));

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /extract - extractCode', () => {
    it('should extract verification code successfully', async () => {
      const dto = {
        message: 'Your verification code is 123456',
        serviceCode: 'telegram',
      };

      const extractedResult = {
        code: '123456',
        confidence: 95,
        pattern: 'DIGIT_6_WITH_KEYWORDS',
      };

      mockExtractorService.extractCode.mockResolvedValueOnce(extractedResult);

      const result = await controller.extractCode(dto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(extractedResult);
      expect(mockExtractorService.extractCode).toHaveBeenCalledWith(
        dto.message,
        dto.serviceCode,
      );
    });

    it('should return success=false when no code found', async () => {
      const dto = {
        message: 'This message has no code',
      };

      mockExtractorService.extractCode.mockResolvedValueOnce(null);

      const result = await controller.extractCode(dto);

      expect(result.success).toBe(false);
      expect(result.message).toBe('No verification code found in the message');
    });

    it('should handle extraction without serviceCode', async () => {
      const dto = {
        message: 'Code: 888999',
      };

      const extractedResult = {
        code: '888999',
        confidence: 80,
        pattern: 'DIGIT_6_STANDALONE',
      };

      mockExtractorService.extractCode.mockResolvedValueOnce(extractedResult);

      const result = await controller.extractCode(dto);

      expect(result.success).toBe(true);
      expect(mockExtractorService.extractCode).toHaveBeenCalledWith(
        dto.message,
        undefined,
      );
    });

    it('should handle service errors gracefully', async () => {
      const dto = {
        message: 'Test message',
      };

      mockExtractorService.extractCode.mockRejectedValueOnce(
        new Error('Extraction service error'),
      );

      await expect(controller.extractCode(dto)).rejects.toThrow('Extraction service error');
    });
  });

  describe('GET /phone/:phoneNumber - getCodeByPhone', () => {
    it('should return cached code when available', async () => {
      const phoneNumber = '+79991234567';
      const serviceCode = 'telegram';

      const cachedCode = {
        phoneNumber,
        serviceCode,
        code: '123456',
        confidence: 95,
        pattern: 'DIGIT_6_WITH_KEYWORDS',
        receivedAt: new Date(),
        consumed: false,
      };

      mockCacheService.getCodeByPhone.mockResolvedValueOnce(cachedCode);

      const result = await controller.getCodeByPhone(phoneNumber, serviceCode);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        ...cachedCode,
        source: 'cache',
      });
      expect(mockCacheService.getCodeByPhone).toHaveBeenCalledWith(
        phoneNumber,
        serviceCode,
      );
    });

    it('should query database when cache miss', async () => {
      const phoneNumber = '+79991234567';
      const serviceCode = 'telegram';

      mockCacheService.getCodeByPhone.mockResolvedValueOnce(null);

      const mockSmsMessage: Partial<SmsMessage> = {
        id: 'msg-123',
        messageText: 'Your Telegram code is 654321',
        receivedAt: new Date(),
        virtualNumber: {
          id: 'num-123',
          phoneNumber,
          serviceCode,
        } as any,
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValueOnce([mockSmsMessage]),
      };

      mockSmsMessageRepo.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      const extractedCode = {
        code: '654321',
        confidence: 90,
        pattern: 'DIGIT_6_WITH_KEYWORDS',
      };

      mockExtractorService.extractCode.mockResolvedValueOnce(extractedCode);

      const result = await controller.getCodeByPhone(phoneNumber, serviceCode);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        code: '654321',
        phoneNumber,
        serviceCode,
        consumed: false,
        source: 'database',
      });
      expect(mockCacheService.cacheCode).toHaveBeenCalledWith(
        phoneNumber,
        serviceCode,
        extractedCode,
      );
    });

    it('should return not found when no messages exist', async () => {
      const phoneNumber = '+79991234567';
      const serviceCode = 'telegram';

      mockCacheService.getCodeByPhone.mockResolvedValueOnce(null);

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValueOnce([]),
      };

      mockSmsMessageRepo.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      const result = await controller.getCodeByPhone(phoneNumber, serviceCode);

      expect(result.success).toBe(false);
      expect(result.message).toBe('No verification code found for this number');
    });

    it('should try multiple messages until code found', async () => {
      const phoneNumber = '+79991234567';
      const serviceCode = 'telegram';

      mockCacheService.getCodeByPhone.mockResolvedValueOnce(null);

      const mockMessages: Partial<SmsMessage>[] = [
        {
          id: 'msg-1',
          messageText: 'Welcome message with no code',
          receivedAt: new Date(),
        },
        {
          id: 'msg-2',
          messageText: 'Your code is 999888',
          receivedAt: new Date(),
        },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValueOnce(mockMessages),
      };

      mockSmsMessageRepo.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      mockExtractorService.extractCode
        .mockResolvedValueOnce(null) // First message has no code
        .mockResolvedValueOnce({
          // Second message has code
          code: '999888',
          confidence: 88,
          pattern: 'DIGIT_6_WITH_KEYWORDS',
        });

      const result = await controller.getCodeByPhone(phoneNumber, serviceCode);

      expect(result.success).toBe(true);
      expect(result.data?.code).toBe('999888');
      expect(mockExtractorService.extractCode).toHaveBeenCalledTimes(2);
    });
  });

  describe('GET /device/:deviceId - getCodeByDevice', () => {
    it('should return cached code for device', async () => {
      const deviceId = 'device-123';

      const cachedCode = {
        deviceId,
        phoneNumber: '+79991234567',
        serviceCode: 'whatsapp',
        code: '777888',
        confidence: 92,
        receivedAt: new Date(),
        consumed: false,
      };

      mockCacheService.getCodeByDevice.mockResolvedValueOnce(cachedCode);

      const result = await controller.getCodeByDevice(deviceId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        ...cachedCode,
        source: 'cache',
      });
      expect(mockCacheService.getCodeByDevice).toHaveBeenCalledWith(deviceId);
    });

    it('should return not found when no code cached for device', async () => {
      const deviceId = 'device-123';

      mockCacheService.getCodeByDevice.mockResolvedValueOnce(null);

      const result = await controller.getCodeByDevice(deviceId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('No verification code found for this device');
    });

    it('should handle device IDs with special characters', async () => {
      const deviceId = 'device-abc-123-xyz';

      mockCacheService.getCodeByDevice.mockResolvedValueOnce(null);

      const result = await controller.getCodeByDevice(deviceId);

      expect(result.success).toBe(false);
      expect(mockCacheService.getCodeByDevice).toHaveBeenCalledWith(deviceId);
    });
  });

  describe('POST /validate - validateCode', () => {
    it('should validate code successfully', async () => {
      const dto = {
        phoneNumber: '+79991234567',
        serviceCode: 'telegram',
        code: '123456',
      };

      mockCacheService.isCodeValid.mockResolvedValueOnce(true);

      const result = await controller.validateCode(dto);

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
      expect(mockCacheService.isCodeValid).toHaveBeenCalledWith(
        dto.phoneNumber,
        dto.serviceCode,
        dto.code,
      );
    });

    it('should return invalid for expired code', async () => {
      const dto = {
        phoneNumber: '+79991234567',
        serviceCode: 'telegram',
        code: '123456',
      };

      mockCacheService.isCodeValid.mockResolvedValueOnce(false);

      const result = await controller.validateCode(dto);

      expect(result.success).toBe(true);
      expect(result.valid).toBe(false);
    });

    it('should return invalid for wrong code', async () => {
      const dto = {
        phoneNumber: '+79991234567',
        serviceCode: 'telegram',
        code: '999999',
      };

      mockCacheService.isCodeValid.mockResolvedValueOnce(false);

      const result = await controller.validateCode(dto);

      expect(result.valid).toBe(false);
    });
  });

  describe('POST /consume - consumeCode', () => {
    it('should consume valid code successfully', async () => {
      const dto = {
        phoneNumber: '+79991234567',
        serviceCode: 'telegram',
        code: '123456',
      };

      mockCacheService.isCodeValid.mockResolvedValueOnce(true);
      mockCacheService.markCodeConsumed.mockResolvedValueOnce(true);

      const result = await controller.consumeCode(dto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Code marked as consumed');
      expect(mockCacheService.markCodeConsumed).toHaveBeenCalledWith(
        dto.phoneNumber,
        dto.serviceCode,
      );
    });

    it('should reject invalid code consumption', async () => {
      const dto = {
        phoneNumber: '+79991234567',
        serviceCode: 'telegram',
        code: '123456',
      };

      mockCacheService.isCodeValid.mockResolvedValueOnce(false);

      const result = await controller.consumeCode(dto);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid or expired verification code');
      expect(mockCacheService.markCodeConsumed).not.toHaveBeenCalled();
    });

    it('should handle consume failure', async () => {
      const dto = {
        phoneNumber: '+79991234567',
        serviceCode: 'telegram',
        code: '123456',
      };

      mockCacheService.isCodeValid.mockResolvedValueOnce(true);
      mockCacheService.markCodeConsumed.mockResolvedValueOnce(false);

      const result = await controller.consumeCode(dto);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to consume code');
    });

    it('should handle already consumed code', async () => {
      const dto = {
        phoneNumber: '+79991234567',
        serviceCode: 'telegram',
        code: '123456',
      };

      // Code is no longer valid (already consumed)
      mockCacheService.isCodeValid.mockResolvedValueOnce(false);

      const result = await controller.consumeCode(dto);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid or expired');
    });
  });

  describe('GET /patterns - getSupportedPatterns', () => {
    it('should return all supported patterns', async () => {
      const mockPatterns = [
        {
          name: 'DIGIT_6_WITH_KEYWORDS',
          description: '6位数字验证码（带关键词）',
          regex: '/验证码[:：]?\\s*(\\d{6})/i',
          priority: 100,
        },
        {
          name: 'DIGIT_4_STANDALONE',
          description: '4位数字验证码',
          regex: '/\\b(\\d{4})\\b/',
          priority: 50,
        },
        {
          name: 'ALPHANUMERIC_6',
          description: '6位字母数字混合',
          regex: '/\\b([A-Z0-9]{6})\\b/',
          priority: 60,
        },
      ];

      mockExtractorService.getSupportedPatterns.mockReturnValueOnce(mockPatterns);

      const result = await controller.getSupportedPatterns();

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(3);
      expect(result.data.patterns).toEqual(mockPatterns);
    });

    it('should handle empty patterns list', async () => {
      mockExtractorService.getSupportedPatterns.mockReturnValueOnce([]);

      const result = await controller.getSupportedPatterns();

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(0);
      expect(result.data.patterns).toEqual([]);
    });
  });

  describe('POST /test-pattern - testPattern', () => {
    it('should test pattern successfully', async () => {
      const body = {
        message: 'Your code is 123456',
        patternName: 'DIGIT_6_WITH_KEYWORDS',
      };

      const testResult = {
        matched: true,
        code: '123456',
        confidence: 95,
        pattern: 'DIGIT_6_WITH_KEYWORDS',
      };

      mockExtractorService.testPattern.mockReturnValueOnce(testResult);

      const result = await controller.testPattern(body);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testResult);
      expect(mockExtractorService.testPattern).toHaveBeenCalledWith(
        body.message,
        body.patternName,
      );
    });

    it('should return failure when pattern does not match', async () => {
      const body = {
        message: 'No code here',
        patternName: 'DIGIT_6_WITH_KEYWORDS',
      };

      mockExtractorService.testPattern.mockReturnValueOnce(null);

      const result = await controller.testPattern(body);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Pattern did not match or code is invalid');
    });

    it('should handle invalid pattern name', async () => {
      const body = {
        message: 'Your code is 123456',
        patternName: 'INVALID_PATTERN',
      };

      mockExtractorService.testPattern.mockReturnValueOnce(null);

      const result = await controller.testPattern(body);

      expect(result.success).toBe(false);
    });
  });

  describe('GET /cache/stats - getCacheStats', () => {
    it('should return cache statistics', async () => {
      const mockStats = {
        estimated_size: 150,
        hit_rate: '85.5%',
      };

      mockCacheService.getCacheStatistics.mockResolvedValueOnce(mockStats);

      const result = await controller.getCacheStats();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
    });

    it('should handle empty cache statistics', async () => {
      const emptyStats = {
        estimated_size: 0,
        hit_rate: '0%',
      };

      mockCacheService.getCacheStatistics.mockResolvedValueOnce(emptyStats);

      const result = await controller.getCacheStats();

      expect(result.success).toBe(true);
      expect(result.data.estimated_size).toBe(0);
    });
  });

  describe('POST /batch-query - batchQueryCodes', () => {
    it('should query multiple codes successfully', async () => {
      const body = {
        requests: [
          { phoneNumber: '+79991111111', serviceCode: 'telegram' },
          { phoneNumber: '+79992222222', serviceCode: 'whatsapp' },
          { phoneNumber: '+79993333333', serviceCode: 'wechat' },
        ],
      };

      const mockResults = new Map<string, any>([
        [
          '+79991111111:telegram',
          {
            phoneNumber: '+79991111111',
            serviceCode: 'telegram',
            code: '111111',
            confidence: 90,
          },
        ],
        ['+79992222222:whatsapp', null], // Not found
        [
          '+79993333333:wechat',
          {
            phoneNumber: '+79993333333',
            serviceCode: 'wechat',
            code: '333333',
            confidence: 88,
          },
        ],
      ]);

      mockCacheService.getMultipleCodes.mockResolvedValueOnce(mockResults);

      const result = await controller.batchQueryCodes(body);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data[0].found).toBe(true);
      expect(result.data[1].found).toBe(false);
      expect(result.data[2].found).toBe(true);
    });

    it('should handle empty batch query', async () => {
      const body = {
        requests: [],
      };

      const emptyResults = new Map<string, any>();

      mockCacheService.getMultipleCodes.mockResolvedValueOnce(emptyResults);

      const result = await controller.batchQueryCodes(body);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should handle large batch queries', async () => {
      const requests = Array.from({ length: 100 }, (_, i) => ({
        phoneNumber: `+7999${String(i).padStart(7, '0')}`,
        serviceCode: 'telegram',
      }));

      const body = { requests };

      const mockResults = new Map<string, any>(
        requests.map((req) => [`${req.phoneNumber}:${req.serviceCode}`, null]),
      );

      mockCacheService.getMultipleCodes.mockResolvedValueOnce(mockResults);

      const result = await controller.batchQueryCodes(body);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(100);
      expect(mockCacheService.getMultipleCodes).toHaveBeenCalledWith(requests);
    });

    it('should handle duplicate requests in batch', async () => {
      const body = {
        requests: [
          { phoneNumber: '+79991111111', serviceCode: 'telegram' },
          { phoneNumber: '+79991111111', serviceCode: 'telegram' }, // Duplicate
          { phoneNumber: '+79992222222', serviceCode: 'telegram' },
        ],
      };

      const mockResults = new Map<string, any>([
        [
          '+79991111111:telegram',
          {
            phoneNumber: '+79991111111',
            serviceCode: 'telegram',
            code: '111111',
            confidence: 90,
          },
        ],
        ['+79992222222:telegram', null],
      ]);

      mockCacheService.getMultipleCodes.mockResolvedValueOnce(mockResults);

      const result = await controller.batchQueryCodes(body);

      expect(result.success).toBe(true);
      // Should return results for unique keys
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle phone numbers with different formats', async () => {
      const formats = ['+79991234567', '79991234567', '+7 (999) 123-45-67'];

      for (const phoneNumber of formats) {
        mockCacheService.getCodeByPhone.mockResolvedValueOnce({
          phoneNumber,
          serviceCode: 'telegram',
          code: '123456',
          confidence: 90,
          receivedAt: new Date(),
          consumed: false,
        });

        const result = await controller.getCodeByPhone(phoneNumber, 'telegram');
        expect(result.success).toBe(true);
      }
    });

    it('should handle very long messages for extraction', async () => {
      const longMessage = 'A'.repeat(5000) + ' Your code is 123456 ' + 'B'.repeat(5000);

      const dto = {
        message: longMessage,
        serviceCode: 'telegram',
      };

      mockExtractorService.extractCode.mockResolvedValueOnce({
        code: '123456',
        confidence: 85,
        pattern: 'DIGIT_6_WITH_KEYWORDS',
      });

      const result = await controller.extractCode(dto);

      expect(result.success).toBe(true);
      expect(result.data?.code).toBe('123456');
    });

    it('should handle concurrent cache operations', async () => {
      const phoneNumber = '+79991234567';
      const serviceCode = 'telegram';

      mockCacheService.getCodeByPhone.mockResolvedValue({
        phoneNumber,
        serviceCode,
        code: '123456',
        confidence: 90,
        receivedAt: new Date(),
        consumed: false,
      });

      // Simulate concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        controller.getCodeByPhone(phoneNumber, serviceCode),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.data?.code).toBe('123456');
      });
    });

    it('should handle service codes with special characters', async () => {
      const dto = {
        phoneNumber: '+79991234567',
        serviceCode: 'my-service_v2.0',
        code: '123456',
      };

      mockCacheService.isCodeValid.mockResolvedValueOnce(true);
      mockCacheService.markCodeConsumed.mockResolvedValueOnce(true);

      const result = await controller.consumeCode(dto);

      expect(result.success).toBe(true);
    });

    it('should handle UTF-8 messages with emojis', async () => {
      const dto = {
        message: '🔐 Your verification code is 123456 🎉',
        serviceCode: 'telegram',
      };

      mockExtractorService.extractCode.mockResolvedValueOnce({
        code: '123456',
        confidence: 90,
        pattern: 'DIGIT_6_WITH_KEYWORDS',
      });

      const result = await controller.extractCode(dto);

      expect(result.success).toBe(true);
      expect(result.data?.code).toBe('123456');
    });
  });
});
