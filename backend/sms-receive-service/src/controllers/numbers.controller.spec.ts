import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { NumbersController } from './numbers.controller';
import { NumberManagementService } from '../services/number-management.service';
import { MessagePollingService } from '../services/message-polling.service';
import { PlatformSelectorService } from '../services/platform-selector.service';
import { VirtualNumber, SmsMessage } from '../entities';
import { RequestNumberDto, BatchRequestDto } from '../dto/request-number.dto';

describe('NumbersController', () => {
  let controller: NumbersController;
  let numberManagement: NumberManagementService;
  let messagePolling: MessagePollingService;
  let platformSelector: PlatformSelectorService;
  let numberRepo: Repository<VirtualNumber>;
  let messageRepo: Repository<SmsMessage>;

  // Mock services
  const mockNumberManagement = {
    requestNumber: jest.fn(),
    getNumberStatus: jest.fn(),
    cancelNumber: jest.fn(),
    batchRequest: jest.fn(),
  };

  const mockMessagePolling = {
    getPollingStats: jest.fn(),
    triggerPoll: jest.fn(),
  };

  const mockPlatformSelector = {
    getProviderStats: jest.fn(),
  };

  // Mock repositories
  const mockNumberRepo = {
    findOne: jest.fn(),
  };

  const mockMessageRepo = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NumbersController],
      providers: [
        {
          provide: NumberManagementService,
          useValue: mockNumberManagement,
        },
        {
          provide: MessagePollingService,
          useValue: mockMessagePolling,
        },
        {
          provide: PlatformSelectorService,
          useValue: mockPlatformSelector,
        },
        {
          provide: getRepositoryToken(VirtualNumber),
          useValue: mockNumberRepo,
        },
        {
          provide: getRepositoryToken(SmsMessage),
          useValue: mockMessageRepo,
        },
      ],
    }).compile();

    controller = module.get<NumbersController>(NumbersController);
    numberManagement = module.get<NumberManagementService>(NumberManagementService);
    messagePolling = module.get<MessagePollingService>(MessagePollingService);
    platformSelector = module.get<PlatformSelectorService>(PlatformSelectorService);
    numberRepo = module.get<Repository<VirtualNumber>>(getRepositoryToken(VirtualNumber));
    messageRepo = module.get<Repository<SmsMessage>>(getRepositoryToken(SmsMessage));

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('POST /numbers - requestNumber', () => {
    it('should request a number successfully', async () => {
      const requestDto: RequestNumberDto = {
        service: 'telegram',
        country: 'RU',
        deviceId: 'device-123',
      };

      const mockNumber: Partial<VirtualNumber> = {
        id: 'num-123',
        provider: 'sms-activate',
        phoneNumber: '+79991234567',
        countryCode: 'RU',
        countryName: 'Russia',
        serviceCode: 'tg',
        serviceName: 'telegram',
        status: 'active',
        cost: 15.5,
        deviceId: 'device-123',
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        fromPool: false,
        selectedByAlgorithm: 'smart-routing',
      };

      mockNumberManagement.requestNumber.mockResolvedValueOnce(mockNumber);

      const result = await controller.requestNumber(requestDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('num-123');
      expect(result.phoneNumber).toBe('+79991234567');
      expect(result.provider).toBe('sms-activate');
      expect(mockNumberManagement.requestNumber).toHaveBeenCalledWith(requestDto);
    });

    it('should map virtual number to response DTO correctly', async () => {
      const requestDto: RequestNumberDto = {
        service: 'whatsapp',
        country: 'US',
        deviceId: 'device-456',
      };

      const mockNumber: Partial<VirtualNumber> = {
        id: 'num-456',
        provider: '5sim',
        phoneNumber: '+19991234567',
        countryCode: 'US',
        countryName: 'United States',
        serviceCode: 'wa',
        serviceName: 'whatsapp',
        status: 'active',
        cost: 12.0,
        deviceId: 'device-456',
        userId: 'user-789',
        activatedAt: new Date('2025-01-01T00:00:00Z'),
        expiresAt: new Date('2025-01-01T00:10:00Z'),
        fromPool: true,
        selectedByAlgorithm: 'pool',
        metadata: { poolId: 'pool-123' },
      };

      mockNumberManagement.requestNumber.mockResolvedValueOnce(mockNumber);

      const result = await controller.requestNumber(requestDto);

      expect(result).toEqual({
        id: 'num-456',
        provider: '5sim',
        phoneNumber: '+19991234567',
        countryCode: 'US',
        countryName: 'United States',
        serviceCode: 'wa',
        serviceName: 'whatsapp',
        status: 'active',
        cost: 12.0,
        deviceId: 'device-456',
        userId: 'user-789',
        activatedAt: mockNumber.activatedAt,
        expiresAt: mockNumber.expiresAt,
        smsReceivedAt: undefined,
        completedAt: undefined,
        fromPool: true,
        selectedByAlgorithm: 'pool',
        metadata: { poolId: 'pool-123' },
      });
    });

    it('should handle service errors', async () => {
      const requestDto: RequestNumberDto = {
        service: 'telegram',
        deviceId: 'device-123',
      };

      mockNumberManagement.requestNumber.mockRejectedValueOnce(
        new Error('No providers available')
      );

      await expect(controller.requestNumber(requestDto)).rejects.toThrow(
        'No providers available'
      );
    });
  });

  describe('GET /numbers/:id - getNumber', () => {
    it('should return number status', async () => {
      const mockNumber: Partial<VirtualNumber> = {
        id: 'num-123',
        provider: 'sms-activate',
        phoneNumber: '+79991234567',
        status: 'waiting_sms',
        cost: 15.5,
      };

      mockNumberManagement.getNumberStatus.mockResolvedValueOnce(mockNumber);

      const result = await controller.getNumber('num-123');

      expect(result.id).toBe('num-123');
      expect(result.status).toBe('waiting_sms');
      expect(mockNumberManagement.getNumberStatus).toHaveBeenCalledWith('num-123');
    });

    it('should throw NotFoundException for non-existent number', async () => {
      mockNumberManagement.getNumberStatus.mockRejectedValueOnce(
        new NotFoundException('Virtual number not found')
      );

      await expect(controller.getNumber('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /numbers/:id - cancelNumber', () => {
    it('should cancel number and return refund info', async () => {
      mockNumberManagement.cancelNumber.mockResolvedValueOnce({
        refunded: true,
        amount: 15.5,
      });

      const result = await controller.cancelNumber('num-123');

      expect(result).toEqual({
        refunded: true,
        amount: 15.5,
        message: 'Number cancelled and refunded $15.5',
      });
      expect(mockNumberManagement.cancelNumber).toHaveBeenCalledWith('num-123');
    });

    it('should handle cancellation with zero refund', async () => {
      mockNumberManagement.cancelNumber.mockResolvedValueOnce({
        refunded: false,
        amount: 0,
      });

      const result = await controller.cancelNumber('num-456');

      expect(result.refunded).toBe(false);
      expect(result.amount).toBe(0);
    });

    it('should throw NotFoundException for non-existent number', async () => {
      mockNumberManagement.cancelNumber.mockRejectedValueOnce(
        new NotFoundException('Virtual number not found')
      );

      await expect(controller.cancelNumber('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /numbers/batch - batchRequest', () => {
    it('should process batch request successfully', async () => {
      const batchDto: BatchRequestDto = {
        service: 'telegram',
        country: 'RU',
        deviceIds: ['device-1', 'device-2', 'device-3'],
      };

      const mockBatchResult = {
        total: 3,
        successful: 3,
        failed: 0,
        numbers: [
          {
            deviceId: 'device-1',
            numberId: 'num-1',
            phoneNumber: '+79991111111',
            provider: 'sms-activate',
            error: null,
          },
          {
            deviceId: 'device-2',
            numberId: 'num-2',
            phoneNumber: '+79992222222',
            provider: 'sms-activate',
            error: null,
          },
          {
            deviceId: 'device-3',
            numberId: 'num-3',
            phoneNumber: '+79993333333',
            provider: '5sim',
            error: null,
          },
        ],
      };

      mockNumberManagement.batchRequest.mockResolvedValueOnce(mockBatchResult);

      const result = await controller.batchRequest(batchDto);

      expect(result).toEqual(mockBatchResult);
      expect(mockNumberManagement.batchRequest).toHaveBeenCalledWith(
        'telegram',
        'RU',
        ['device-1', 'device-2', 'device-3'],
        undefined
      );
    });

    it('should handle partial failures in batch request', async () => {
      const batchDto: BatchRequestDto = {
        service: 'whatsapp',
        country: 'US',
        deviceIds: ['device-1', 'device-2'],
        provider: 'sms-activate',
      };

      const mockBatchResult = {
        total: 2,
        successful: 1,
        failed: 1,
        numbers: [
          {
            deviceId: 'device-1',
            numberId: 'num-1',
            phoneNumber: '+19991111111',
            provider: 'sms-activate',
            error: null,
          },
          {
            deviceId: 'device-2',
            numberId: null,
            phoneNumber: null,
            provider: null,
            error: 'No numbers available',
          },
        ],
      };

      mockNumberManagement.batchRequest.mockResolvedValueOnce(mockBatchResult);

      const result = await controller.batchRequest(batchDto);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(mockNumberManagement.batchRequest).toHaveBeenCalledWith(
        'whatsapp',
        'US',
        ['device-1', 'device-2'],
        'sms-activate'
      );
    });

    it('should pass provider parameter when specified', async () => {
      const batchDto: BatchRequestDto = {
        service: 'telegram',
        country: 'RU',
        deviceIds: ['device-1'],
        provider: '5sim',
      };

      mockNumberManagement.batchRequest.mockResolvedValueOnce({
        total: 1,
        successful: 1,
        failed: 0,
        numbers: [],
      });

      await controller.batchRequest(batchDto);

      expect(mockNumberManagement.batchRequest).toHaveBeenCalledWith(
        'telegram',
        'RU',
        ['device-1'],
        '5sim'
      );
    });
  });

  describe('GET /numbers/:id/messages - getMessages', () => {
    it('should return messages for a number', async () => {
      const mockNumber: Partial<VirtualNumber> = {
        id: 'num-123',
        phoneNumber: '+79991234567',
      };

      const mockMessages: Partial<SmsMessage>[] = [
        {
          id: 'msg-1',
          virtualNumberId: 'num-123',
          verificationCode: '123456',
          messageText: 'Your code is 123456',
          sender: 'Telegram',
          receivedAt: new Date('2025-01-01T00:00:00Z'),
          deliveredToDevice: true,
        },
        {
          id: 'msg-2',
          virtualNumberId: 'num-123',
          verificationCode: '789456',
          messageText: 'Code: 789456',
          sender: 'WhatsApp',
          receivedAt: new Date('2025-01-01T00:05:00Z'),
          deliveredToDevice: false,
        },
      ];

      mockNumberRepo.findOne.mockResolvedValueOnce(mockNumber);
      mockMessageRepo.find.mockResolvedValueOnce(mockMessages);

      const result = await controller.getMessages('num-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'msg-1',
        virtualNumberId: 'num-123',
        verificationCode: '123456',
        messageText: 'Your code is 123456',
        sender: 'Telegram',
        receivedAt: mockMessages[0].receivedAt,
        deliveredToDevice: true,
      });
      expect(mockMessageRepo.find).toHaveBeenCalledWith({
        where: { virtualNumberId: 'num-123' },
        order: { receivedAt: 'DESC' },
      });
    });

    it('should return empty array when no messages', async () => {
      const mockNumber: Partial<VirtualNumber> = {
        id: 'num-456',
        phoneNumber: '+79997654321',
      };

      mockNumberRepo.findOne.mockResolvedValueOnce(mockNumber);
      mockMessageRepo.find.mockResolvedValueOnce([]);

      const result = await controller.getMessages('num-456');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when number does not exist', async () => {
      mockNumberRepo.findOne.mockResolvedValueOnce(null);

      await expect(controller.getMessages('nonexistent')).rejects.toThrow(NotFoundException);
      expect(mockMessageRepo.find).not.toHaveBeenCalled();
    });

    it('should order messages by receivedAt DESC', async () => {
      const mockNumber: Partial<VirtualNumber> = {
        id: 'num-123',
      };

      mockNumberRepo.findOne.mockResolvedValueOnce(mockNumber);
      mockMessageRepo.find.mockResolvedValueOnce([]);

      await controller.getMessages('num-123');

      expect(mockMessageRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { receivedAt: 'DESC' },
        })
      );
    });
  });

  describe('GET /numbers/stats/polling - getPollingStats', () => {
    it('should return polling statistics', async () => {
      const mockStats = {
        activeNumbers: 15,
        totalPolledToday: 1234,
        averagePollInterval: 5000,
        messagesReceivedToday: 456,
        successRate: 95.5,
      };

      mockMessagePolling.getPollingStats.mockResolvedValueOnce(mockStats);

      const result = await controller.getPollingStats();

      expect(result).toEqual(mockStats);
      expect(mockMessagePolling.getPollingStats).toHaveBeenCalled();
    });

    it('should handle empty stats', async () => {
      const emptyStats = {
        activeNumbers: 0,
        totalPolledToday: 0,
        averagePollInterval: 0,
        messagesReceivedToday: 0,
        successRate: 0,
      };

      mockMessagePolling.getPollingStats.mockResolvedValueOnce(emptyStats);

      const result = await controller.getPollingStats();

      expect(result.activeNumbers).toBe(0);
    });
  });

  describe('GET /numbers/stats/providers - getProviderStats', () => {
    it('should return provider statistics', async () => {
      const mockProviderStats = [
        {
          providerName: 'sms-activate',
          totalRequests: 1000,
          successCount: 950,
          failureCount: 50,
          averageResponseTime: 2500,
          averageCost: 0.12,
          successRate: 95.0,
          isHealthy: true,
          consecutiveFailures: 0,
        },
        {
          providerName: '5sim',
          totalRequests: 500,
          successCount: 480,
          failureCount: 20,
          averageResponseTime: 3000,
          averageCost: 0.10,
          successRate: 96.0,
          isHealthy: true,
          consecutiveFailures: 0,
        },
      ];

      mockPlatformSelector.getProviderStats.mockReturnValueOnce(mockProviderStats);

      const result = await controller.getProviderStats();

      expect(result).toHaveLength(2);
      expect(result[0].providerName).toBe('sms-activate');
      expect(result[0].successRate).toBe(95.0);
      expect(result[1].providerName).toBe('5sim');
      expect(mockPlatformSelector.getProviderStats).toHaveBeenCalled();
    });

    it('should map all provider stat fields correctly', async () => {
      const mockStats = [
        {
          providerName: 'test-provider',
          totalRequests: 100,
          successCount: 90,
          failureCount: 10,
          averageResponseTime: 1500,
          averageCost: 0.08,
          successRate: 90.0,
          isHealthy: false,
          consecutiveFailures: 3,
        },
      ];

      mockPlatformSelector.getProviderStats.mockReturnValueOnce(mockStats);

      const result = await controller.getProviderStats();

      expect(result[0]).toEqual({
        providerName: 'test-provider',
        totalRequests: 100,
        successCount: 90,
        failureCount: 10,
        averageResponseTime: 1500,
        averageCost: 0.08,
        successRate: 90.0,
        isHealthy: false,
        consecutiveFailures: 3,
      });
    });

    it('should return empty array when no providers', async () => {
      mockPlatformSelector.getProviderStats.mockReturnValueOnce([]);

      const result = await controller.getProviderStats();

      expect(result).toEqual([]);
    });
  });

  describe('POST /numbers/poll/trigger - triggerPoll', () => {
    it('should trigger manual poll successfully', async () => {
      mockMessagePolling.triggerPoll.mockResolvedValueOnce(undefined);

      const before = new Date();
      const result = await controller.triggerPoll();
      const after = new Date();

      expect(result.message).toBe('Polling triggered successfully');
      expect(result.triggeredAt).toBeDefined();

      const triggeredDate = new Date(result.triggeredAt);
      expect(triggeredDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(triggeredDate.getTime()).toBeLessThanOrEqual(after.getTime());

      expect(mockMessagePolling.triggerPoll).toHaveBeenCalled();
    });

    it('should return ISO format timestamp', async () => {
      mockMessagePolling.triggerPoll.mockResolvedValueOnce(undefined);

      const result = await controller.triggerPoll();

      // Check ISO 8601 format
      expect(result.triggeredAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('should handle polling service errors', async () => {
      mockMessagePolling.triggerPoll.mockRejectedValueOnce(
        new Error('Polling service unavailable')
      );

      await expect(controller.triggerPoll()).rejects.toThrow('Polling service unavailable');
    });
  });

  describe('DTO Mapping - mapToResponseDto', () => {
    it('should map all fields correctly', () => {
      const mockNumber: Partial<VirtualNumber> = {
        id: 'num-123',
        provider: 'sms-activate',
        phoneNumber: '+79991234567',
        countryCode: 'RU',
        countryName: 'Russia',
        serviceCode: 'tg',
        serviceName: 'telegram',
        status: 'completed',
        cost: 15.5,
        deviceId: 'device-123',
        userId: 'user-456',
        activatedAt: new Date('2025-01-01T00:00:00Z'),
        expiresAt: new Date('2025-01-01T00:10:00Z'),
        smsReceivedAt: new Date('2025-01-01T00:05:00Z'),
        completedAt: new Date('2025-01-01T00:06:00Z'),
        fromPool: true,
        selectedByAlgorithm: 'pool',
        metadata: { poolId: 'pool-123', extra: 'data' },
      };

      const mapped = (controller as any).mapToResponseDto(mockNumber);

      expect(mapped).toEqual({
        id: 'num-123',
        provider: 'sms-activate',
        phoneNumber: '+79991234567',
        countryCode: 'RU',
        countryName: 'Russia',
        serviceCode: 'tg',
        serviceName: 'telegram',
        status: 'completed',
        cost: 15.5,
        deviceId: 'device-123',
        userId: 'user-456',
        activatedAt: mockNumber.activatedAt,
        expiresAt: mockNumber.expiresAt,
        smsReceivedAt: mockNumber.smsReceivedAt,
        completedAt: mockNumber.completedAt,
        fromPool: true,
        selectedByAlgorithm: 'pool',
        metadata: { poolId: 'pool-123', extra: 'data' },
      });
    });

    it('should handle undefined optional fields', () => {
      const mockNumber: Partial<VirtualNumber> = {
        id: 'num-456',
        provider: '5sim',
        phoneNumber: '+19991234567',
        status: 'active',
        cost: 12.0,
      };

      const mapped = (controller as any).mapToResponseDto(mockNumber);

      expect(mapped.smsReceivedAt).toBeUndefined();
      expect(mapped.completedAt).toBeUndefined();
      expect(mapped.userId).toBeUndefined();
    });

    it('should convert cost to Number', () => {
      const mockNumber: Partial<VirtualNumber> = {
        id: 'num-789',
        cost: '18.50' as any, // Simulating string from database
      };

      const mapped = (controller as any).mapToResponseDto(mockNumber);

      expect(typeof mapped.cost).toBe('number');
      expect(mapped.cost).toBe(18.5);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors to caller', async () => {
      const requestDto: RequestNumberDto = {
        service: 'telegram',
        deviceId: 'device-123',
      };

      const error = new Error('Database connection failed');
      mockNumberManagement.requestNumber.mockRejectedValueOnce(error);

      await expect(controller.requestNumber(requestDto)).rejects.toThrow(error);
    });

    it('should handle BadRequestException from service', async () => {
      const requestDto: RequestNumberDto = {
        service: 'invalid-service',
        deviceId: 'device-123',
      };

      mockNumberManagement.requestNumber.mockRejectedValueOnce(
        new Error('Invalid service code')
      );

      await expect(controller.requestNumber(requestDto)).rejects.toThrow('Invalid service code');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty batch request', async () => {
      const batchDto: BatchRequestDto = {
        service: 'telegram',
        country: 'RU',
        deviceIds: [],
      };

      mockNumberManagement.batchRequest.mockResolvedValueOnce({
        total: 0,
        successful: 0,
        failed: 0,
        numbers: [],
      });

      const result = await controller.batchRequest(batchDto);

      expect(result.total).toBe(0);
    });

    it('should handle very long device ID', async () => {
      const longDeviceId = 'device-' + 'x'.repeat(1000);
      const requestDto: RequestNumberDto = {
        service: 'telegram',
        deviceId: longDeviceId,
      };

      const mockNumber: Partial<VirtualNumber> = {
        id: 'num-123',
        deviceId: longDeviceId,
        phoneNumber: '+79991234567',
      };

      mockNumberManagement.requestNumber.mockResolvedValueOnce(mockNumber);

      const result = await controller.requestNumber(requestDto);

      expect(result.deviceId).toBe(longDeviceId);
    });

    it('should handle special characters in service name', async () => {
      const requestDto: RequestNumberDto = {
        service: 'test-service-@#$',
        deviceId: 'device-123',
      };

      const mockNumber: Partial<VirtualNumber> = {
        id: 'num-123',
        serviceName: 'test-service-@#$',
      };

      mockNumberManagement.requestNumber.mockResolvedValueOnce(mockNumber);

      await controller.requestNumber(requestDto);

      expect(mockNumberManagement.requestNumber).toHaveBeenCalledWith(requestDto);
    });
  });
});
