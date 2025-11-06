import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { NumberManagementService } from './number-management.service';
import { VirtualNumber, ProviderConfig, NumberPool } from '../entities';
import { PlatformSelectorService } from './platform-selector.service';
import { EventBusService } from '@cloudphone/shared';
import { ProviderError } from '../providers/provider.interface';

describe('NumberManagementService', () => {
  let service: NumberManagementService;
  let numberRepo: Repository<VirtualNumber>;
  let providerRepo: Repository<ProviderConfig>;
  let poolRepo: Repository<NumberPool>;
  let platformSelector: PlatformSelectorService;
  let eventBus: EventBusService;

  // Mock provider instance
  const mockProvider = {
    getNumber: jest.fn(),
    cancel: jest.fn(),
    getStatus: jest.fn(),
    getMessage: jest.fn(),
  };

  // Mock repositories
  const mockNumberRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockProviderRepository = {
    findOne: jest.fn(),
  };

  const mockPoolRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  // Mock PlatformSelectorService
  const mockPlatformSelector = {
    selectBestPlatform: jest.fn(),
    recordSuccess: jest.fn(),
    recordFailure: jest.fn(),
  };

  // Mock EventBusService
  const mockEventBus = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NumberManagementService,
        {
          provide: getRepositoryToken(VirtualNumber),
          useValue: mockNumberRepository,
        },
        {
          provide: getRepositoryToken(ProviderConfig),
          useValue: mockProviderRepository,
        },
        {
          provide: getRepositoryToken(NumberPool),
          useValue: mockPoolRepository,
        },
        {
          provide: PlatformSelectorService,
          useValue: mockPlatformSelector,
        },
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<NumberManagementService>(NumberManagementService);
    numberRepo = module.get<Repository<VirtualNumber>>(getRepositoryToken(VirtualNumber));
    providerRepo = module.get<Repository<ProviderConfig>>(getRepositoryToken(ProviderConfig));
    poolRepo = module.get<Repository<NumberPool>>(getRepositoryToken(NumberPool));
    platformSelector = module.get<PlatformSelectorService>(PlatformSelectorService);
    eventBus = module.get<EventBusService>(EventBusService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have correct MAX_RETRY_ATTEMPTS', () => {
      expect((service as any).MAX_RETRY_ATTEMPTS).toBe(3);
    });
  });

  describe('requestNumber - Smart Routing', () => {
    it('should request number with smart routing when no provider specified', async () => {
      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'High availability',
        fallbackLevel: 0,
      };

      const mockProviderResult = {
        activationId: 'act-123',
        phoneNumber: '+79991234567',
        cost: 15.5,
        raw: { id: 'act-123' },
      };

      const mockNumber = {
        id: 'num-123',
        provider: 'sms-activate',
        phoneNumber: '+79991234567',
        cost: 15.5,
        status: 'active',
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockProvider.getNumber.mockResolvedValue(mockProviderResult);
      mockNumberRepository.create.mockReturnValue(mockNumber);
      mockNumberRepository.save.mockResolvedValue(mockNumber);

      const result = await service.requestNumber({
        service: 'telegram',
        country: 'RU',
        deviceId: 'device-123',
      });

      expect(result).toEqual(mockNumber);
      expect(mockPlatformSelector.selectBestPlatform).toHaveBeenCalledWith('telegram', 'RU');
      expect(mockProvider.getNumber).toHaveBeenCalledWith('tg', 'RU');
      expect(mockPlatformSelector.recordSuccess).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'sms.number.requested',
        expect.objectContaining({
          numberId: 'num-123',
          deviceId: 'device-123',
          service: 'telegram',
          provider: 'sms-activate',
          phoneNumber: '+79991234567',
        })
      );
    });

    it('should use default country RU when not specified', async () => {
      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'High availability',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockProvider.getNumber.mockResolvedValue({
        activationId: 'act-123',
        phoneNumber: '+79991234567',
        cost: 15.5,
        raw: {},
      });
      mockNumberRepository.create.mockReturnValue({ id: 'num-123' });
      mockNumberRepository.save.mockResolvedValue({ id: 'num-123' });

      await service.requestNumber({
        service: 'telegram',
        deviceId: 'device-123',
      });

      expect(mockPlatformSelector.selectBestPlatform).toHaveBeenCalledWith('telegram', 'RU');
      expect(mockProvider.getNumber).toHaveBeenCalledWith('tg', 'RU');
    });
  });

  describe('requestNumber - Manual Provider Selection', () => {
    it('should use manual provider with fallback when provider specified', async () => {
      const mockSelection = {
        providerName: '5sim',
        provider: mockProvider,
        score: 90,
        reason: 'Manual selection',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockProvider.getNumber.mockResolvedValue({
        activationId: 'act-456',
        phoneNumber: '+79997654321',
        cost: 12.0,
        raw: {},
      });
      mockNumberRepository.create.mockReturnValue({ id: 'num-456' });
      mockNumberRepository.save.mockResolvedValue({ id: 'num-456' });

      await service.requestNumber({
        service: 'whatsapp',
        country: 'US',
        deviceId: 'device-456',
        provider: '5sim',
      });

      // Should still call selectBestPlatform in retry logic
      expect(mockPlatformSelector.selectBestPlatform).toHaveBeenCalled();
    });

    it('should force provider without fallback when forceProvider=true', async () => {
      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 100,
        reason: 'Forced',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockProvider.getNumber.mockResolvedValue({
        activationId: 'act-789',
        phoneNumber: '+79993334455',
        cost: 20.0,
        raw: {},
      });
      mockNumberRepository.create.mockReturnValue({ id: 'num-789' });
      mockNumberRepository.save.mockResolvedValue({ id: 'num-789' });

      await service.requestNumber({
        service: 'google',
        country: 'RU',
        deviceId: 'device-789',
        provider: 'sms-activate',
        forceProvider: true,
      });

      expect(mockPlatformSelector.selectBestPlatform).toHaveBeenCalled();
    });
  });

  describe('requestNumber - Pool Usage', () => {
    it('should use pooled number when usePool=true and pool has available number', async () => {
      const mockPoolNumber: Partial<NumberPool> = {
        id: 'pool-123',
        provider: 'sms-activate',
        providerActivationId: 'act-pool-123',
        phoneNumber: '+79991112233',
        countryCode: 'RU',
        serviceCode: 'tg',
        cost: 10.0,
        status: 'available',
        expiresAt: new Date(Date.now() + 60000),
        priority: 100,
        reservedCount: 0,
        usedCount: 0,
      };

      const mockNumber = {
        id: 'num-pool-123',
        provider: 'sms-activate',
        phoneNumber: '+79991112233',
        fromPool: true,
        poolId: 'pool-123',
      };

      mockPoolRepository.findOne.mockResolvedValue(mockPoolNumber);
      mockPoolRepository.save.mockResolvedValue(mockPoolNumber);
      mockNumberRepository.create.mockReturnValue(mockNumber);
      mockNumberRepository.save.mockResolvedValue(mockNumber);

      const result = await service.requestNumber({
        service: 'telegram',
        country: 'RU',
        deviceId: 'device-pool',
        usePool: true,
      });

      expect(result.fromPool).toBe(true);
      expect(result.poolId).toBe('pool-123');
      expect(mockPoolRepository.findOne).toHaveBeenCalledWith({
        where: {
          serviceCode: 'tg',
          countryCode: 'RU',
          status: 'available',
        },
        order: {
          priority: 'DESC',
          createdAt: 'ASC',
        },
      });
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'sms.number.from_pool',
        expect.objectContaining({
          numberId: 'num-pool-123',
          deviceId: 'device-pool',
          poolId: 'pool-123',
        })
      );
    });

    it('should buy new number when pool is empty', async () => {
      mockPoolRepository.findOne.mockResolvedValue(null);

      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'Smart routing',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockProvider.getNumber.mockResolvedValue({
        activationId: 'act-new',
        phoneNumber: '+79995556677',
        cost: 15.0,
        raw: {},
      });
      mockNumberRepository.create.mockReturnValue({ id: 'num-new' });
      mockNumberRepository.save.mockResolvedValue({ id: 'num-new' });

      await service.requestNumber({
        service: 'telegram',
        country: 'RU',
        deviceId: 'device-new',
        usePool: true,
      });

      expect(mockPoolRepository.findOne).toHaveBeenCalled();
      expect(mockProvider.getNumber).toHaveBeenCalled();
    });

    it('should skip expired pool numbers', async () => {
      const expiredPoolNumber: Partial<NumberPool> = {
        id: 'pool-expired',
        status: 'available',
        expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
      };

      mockPoolRepository.findOne.mockResolvedValue(expiredPoolNumber);

      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'Smart routing',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockProvider.getNumber.mockResolvedValue({
        activationId: 'act-new',
        phoneNumber: '+79995556677',
        cost: 15.0,
        raw: {},
      });
      mockNumberRepository.create.mockReturnValue({ id: 'num-new' });
      mockNumberRepository.save.mockResolvedValue({ id: 'num-new' });

      await service.requestNumber({
        service: 'telegram',
        deviceId: 'device-123',
        usePool: true,
      });

      // Should not use expired pool number
      expect(mockProvider.getNumber).toHaveBeenCalled();
    });
  });

  describe('requestNumber - Retry Logic', () => {
    it('should retry with fallback on retryable error', async () => {
      const mockSelection1 = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'First attempt',
        fallbackLevel: 0,
      };

      const mockSelection2 = {
        providerName: '5sim',
        provider: mockProvider,
        score: 85.0,
        reason: 'Fallback',
        fallbackLevel: 1,
      };

      mockPlatformSelector.selectBestPlatform
        .mockResolvedValueOnce(mockSelection1)
        .mockResolvedValueOnce(mockSelection2);

      const retryableError = new ProviderError('No numbers available', 'sms-activate', 'NO_NUMBERS', true);
      mockProvider.getNumber
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce({
          activationId: 'act-retry',
          phoneNumber: '+79998887766',
          cost: 18.0,
          raw: {},
        });

      mockNumberRepository.create.mockReturnValue({ id: 'num-retry' });
      mockNumberRepository.save.mockResolvedValue({ id: 'num-retry' });

      const result = await service.requestNumber({
        service: 'telegram',
        country: 'RU',
        deviceId: 'device-retry',
      });

      expect(result.id).toBe('num-retry');
      expect(mockPlatformSelector.recordFailure).toHaveBeenCalledWith('sms-activate', retryableError);
      expect(mockPlatformSelector.recordSuccess).toHaveBeenCalled();
      expect(mockProvider.getNumber).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'Attempt',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);

      const retryableError = new ProviderError('No numbers available', 'sms-activate', 'NO_NUMBERS', true);
      mockProvider.getNumber.mockRejectedValue(retryableError);

      await expect(
        service.requestNumber({
          service: 'telegram',
          country: 'RU',
          deviceId: 'device-fail',
        })
      ).rejects.toThrow(BadRequestException);

      // Should attempt 3 times
      expect(mockProvider.getNumber).toHaveBeenCalledTimes(3);
      expect(mockPlatformSelector.recordFailure).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable error', async () => {
      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'Attempt',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);

      const nonRetryableError = new ProviderError('Invalid API key', 'sms-activate', 'AUTH_ERROR', false);
      mockProvider.getNumber.mockRejectedValue(nonRetryableError);

      await expect(
        service.requestNumber({
          service: 'telegram',
          country: 'RU',
          deviceId: 'device-fail',
        })
      ).rejects.toThrow(BadRequestException);

      // Should only attempt once
      expect(mockProvider.getNumber).toHaveBeenCalledTimes(1);
      expect(mockPlatformSelector.recordFailure).toHaveBeenCalledTimes(1);
    });
  });

  describe('getNumberStatus', () => {
    it('should return number status when number exists', async () => {
      const mockNumber = {
        id: 'num-123',
        phoneNumber: '+79991234567',
        status: 'active',
        provider: 'sms-activate',
      };

      mockNumberRepository.findOne.mockResolvedValue(mockNumber);

      const result = await service.getNumberStatus('num-123');

      expect(result).toEqual(mockNumber);
      expect(mockNumberRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'num-123' },
      });
    });

    it('should throw NotFoundException when number does not exist', async () => {
      mockNumberRepository.findOne.mockResolvedValue(null);

      await expect(service.getNumberStatus('num-nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('cancelNumber', () => {
    it('should cancel active number and get refund', async () => {
      const mockNumber = {
        id: 'num-cancel',
        phoneNumber: '+79991234567',
        status: 'active',
        providerActivationId: 'act-123',
        provider: 'sms-activate',
        serviceName: 'telegram',
        countryCode: 'RU',
        deviceId: 'device-123',
        cost: 15.0,
      };

      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'Cancel',
        fallbackLevel: 0,
      };

      mockNumberRepository.findOne.mockResolvedValue(mockNumber);
      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockProvider.cancel.mockResolvedValue({ success: true });
      mockNumberRepository.save.mockResolvedValue({ ...mockNumber, status: 'cancelled' });

      const result = await service.cancelNumber('num-cancel');

      expect(result).toEqual({ refunded: true, amount: 15.0 });
      expect(mockProvider.cancel).toHaveBeenCalledWith('act-123');
      expect(mockNumberRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' })
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'sms.number.cancelled',
        expect.objectContaining({
          numberId: 'num-cancel',
          refunded: true,
          amount: 15.0,
        })
      );
    });

    it('should cancel waiting_sms status number', async () => {
      const mockNumber = {
        id: 'num-waiting',
        status: 'waiting_sms',
        providerActivationId: 'act-456',
        provider: 'sms-activate',
        serviceName: 'telegram',
        countryCode: 'RU',
        deviceId: 'device-456',
        cost: 12.0,
      };

      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'Cancel',
        fallbackLevel: 0,
      };

      mockNumberRepository.findOne.mockResolvedValue(mockNumber);
      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockProvider.cancel.mockResolvedValue({ success: true });
      mockNumberRepository.save.mockResolvedValue({ ...mockNumber, status: 'cancelled' });

      const result = await service.cancelNumber('num-waiting');

      expect(result.refunded).toBe(true);
    });

    it('should throw NotFoundException when number does not exist', async () => {
      mockNumberRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelNumber('num-nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException when number is already completed', async () => {
      const mockNumber = {
        id: 'num-completed',
        status: 'completed',
      };

      mockNumberRepository.findOne.mockResolvedValue(mockNumber);

      await expect(service.cancelNumber('num-completed')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when provider cancellation fails', async () => {
      const mockNumber = {
        id: 'num-fail',
        status: 'active',
        providerActivationId: 'act-fail',
        provider: 'sms-activate',
        serviceName: 'telegram',
        countryCode: 'RU',
      };

      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'Cancel',
        fallbackLevel: 0,
      };

      mockNumberRepository.findOne.mockResolvedValue(mockNumber);
      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockProvider.cancel.mockRejectedValue(new Error('Provider API error'));

      await expect(service.cancelNumber('num-fail')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('batchRequest', () => {
    it('should process batch request for multiple devices', async () => {
      const deviceIds = ['device-1', 'device-2', 'device-3'];

      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'Smart routing',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockProvider.getNumber
        .mockResolvedValueOnce({
          activationId: 'act-1',
          phoneNumber: '+79991111111',
          cost: 15.0,
          raw: {},
        })
        .mockResolvedValueOnce({
          activationId: 'act-2',
          phoneNumber: '+79992222222',
          cost: 15.0,
          raw: {},
        })
        .mockResolvedValueOnce({
          activationId: 'act-3',
          phoneNumber: '+79993333333',
          cost: 15.0,
          raw: {},
        });

      mockNumberRepository.create
        .mockReturnValueOnce({ id: 'num-1', phoneNumber: '+79991111111', provider: 'sms-activate' })
        .mockReturnValueOnce({ id: 'num-2', phoneNumber: '+79992222222', provider: 'sms-activate' })
        .mockReturnValueOnce({ id: 'num-3', phoneNumber: '+79993333333', provider: 'sms-activate' });

      mockNumberRepository.save
        .mockResolvedValueOnce({ id: 'num-1' })
        .mockResolvedValueOnce({ id: 'num-2' })
        .mockResolvedValueOnce({ id: 'num-3' });

      const result = await service.batchRequest('telegram', 'RU', deviceIds);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.numbers).toHaveLength(3);
      expect(result.numbers[0].numberId).toBe('num-1');
      expect(result.numbers[1].numberId).toBe('num-2');
      expect(result.numbers[2].numberId).toBe('num-3');
    });

    it('should handle partial failures in batch request', async () => {
      const deviceIds = ['device-1', 'device-2', 'device-3'];

      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'Smart routing',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);

      // First and third succeed, second fails (no retries because retryable=false)
      mockProvider.getNumber
        .mockResolvedValueOnce({
          activationId: 'act-1',
          phoneNumber: '+79991111111',
          cost: 15.0,
          raw: {},
        })
        .mockRejectedValueOnce(new ProviderError('No numbers', 'sms-activate', 'NO_NUMBERS', false))
        .mockResolvedValueOnce({
          activationId: 'act-3',
          phoneNumber: '+79993333333',
          cost: 15.0,
          raw: {},
        });

      const entity1 = {
        id: 'num-1',
        phoneNumber: '+79991111111',
        provider: 'sms-activate',
        serviceName: 'telegram',
        deviceId: 'device-1',
        cost: 15.0,
        providerActivationId: 'act-1',
      };
      const entity3 = {
        id: 'num-3',
        phoneNumber: '+79993333333',
        provider: 'sms-activate',
        serviceName: 'telegram',
        deviceId: 'device-3',
        cost: 15.0,
        providerActivationId: 'act-3',
      };

      mockNumberRepository.create
        .mockReturnValueOnce(entity1)
        .mockReturnValueOnce(entity3);

      mockNumberRepository.save
        .mockResolvedValueOnce(entity1)
        .mockResolvedValueOnce(entity3);

      const result = await service.batchRequest('telegram', 'RU', deviceIds);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.numbers[0].error).toBeNull();
      expect(result.numbers[1].error).toBeTruthy();
      expect(result.numbers[2].error).toBeNull();
    });

    it('should throw BadRequestException when batch size exceeds limit', async () => {
      const deviceIds = Array.from({ length: 101 }, (_, i) => `device-${i}`);

      await expect(
        service.batchRequest('telegram', 'RU', deviceIds)
      ).rejects.toThrow(BadRequestException);
    });

    it('should add delay between batch requests', async () => {
      const deviceIds = ['device-1', 'device-2'];
      const sleepSpy = jest.spyOn(service as any, 'sleep');

      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'Smart routing',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockProvider.getNumber.mockResolvedValue({
        activationId: 'act-1',
        phoneNumber: '+79991111111',
        cost: 15.0,
        raw: {},
      });
      mockNumberRepository.create.mockReturnValue({ id: 'num-1' });
      mockNumberRepository.save.mockResolvedValue({ id: 'num-1' });

      await service.batchRequest('telegram', 'RU', deviceIds);

      // Should sleep between requests (not after last one)
      expect(sleepSpy).toHaveBeenCalledWith(500);
    });
  });

  describe('Service Code Mapping', () => {
    it('should map service names to codes correctly', () => {
      const getServiceCode = (service as any).getServiceCode.bind(service);

      expect(getServiceCode('google')).toBe('go');
      expect(getServiceCode('telegram')).toBe('tg');
      expect(getServiceCode('whatsapp')).toBe('wa');
      expect(getServiceCode('facebook')).toBe('fb');
      expect(getServiceCode('instagram')).toBe('ig');
      expect(getServiceCode('twitter')).toBe('tw');
      expect(getServiceCode('wechat')).toBe('wx');
      expect(getServiceCode('tiktok')).toBe('tk');
      expect(getServiceCode('discord')).toBe('ds');
      expect(getServiceCode('uber')).toBe('ub');
      expect(getServiceCode('amazon')).toBe('am');
      expect(getServiceCode('microsoft')).toBe('mm');
    });

    it('should handle unknown service codes', () => {
      const getServiceCode = (service as any).getServiceCode.bind(service);

      expect(getServiceCode('unknown-service')).toBe('unknown-service');
    });

    it('should be case-insensitive', () => {
      const getServiceCode = (service as any).getServiceCode.bind(service);

      expect(getServiceCode('TELEGRAM')).toBe('tg');
      expect(getServiceCode('WhatsApp')).toBe('wa');
    });
  });

  describe('Service Name Reverse Mapping', () => {
    it('should map codes back to service names', () => {
      const getServiceName = (service as any).getServiceName.bind(service);

      expect(getServiceName('go')).toBe('google');
      expect(getServiceName('tg')).toBe('telegram');
      expect(getServiceName('wa')).toBe('whatsapp');
      expect(getServiceName('fb')).toBe('facebook');
    });

    it('should return code if no mapping exists', () => {
      const getServiceName = (service as any).getServiceName.bind(service);

      expect(getServiceName('unknown')).toBe('unknown');
    });
  });

  describe('Country Name Mapping', () => {
    it('should map country codes to names', () => {
      const getCountryName = (service as any).getCountryName.bind(service);

      expect(getCountryName('RU')).toBe('Russia');
      expect(getCountryName('US')).toBe('United States');
      expect(getCountryName('CN')).toBe('China');
      expect(getCountryName('GB')).toBe('United Kingdom');
      expect(getCountryName('UK')).toBe('United Kingdom');
      expect(getCountryName('FR')).toBe('France');
      expect(getCountryName('DE')).toBe('Germany');
      expect(getCountryName('IN')).toBe('India');
    });

    it('should handle lowercase country codes', () => {
      const getCountryName = (service as any).getCountryName.bind(service);

      expect(getCountryName('ru')).toBe('Russia');
      expect(getCountryName('us')).toBe('United States');
    });

    it('should default to Russia for unknown codes', () => {
      const getCountryName = (service as any).getCountryName.bind(service);

      expect(getCountryName('XX')).toBe('Russia');
      expect(getCountryName(undefined)).toBe('Russia');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty deviceId', async () => {
      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'Smart routing',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockProvider.getNumber.mockResolvedValue({
        activationId: 'act-123',
        phoneNumber: '+79991234567',
        cost: 15.0,
        raw: {},
      });
      mockNumberRepository.create.mockReturnValue({ id: 'num-123' });
      mockNumberRepository.save.mockResolvedValue({ id: 'num-123' });

      const result = await service.requestNumber({
        service: 'telegram',
        deviceId: '',
      });

      expect(result).toBeDefined();
    });

    it('should handle special characters in service name', async () => {
      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'Smart routing',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockProvider.getNumber.mockResolvedValue({
        activationId: 'act-123',
        phoneNumber: '+79991234567',
        cost: 15.0,
        raw: {},
      });
      mockNumberRepository.create.mockReturnValue({ id: 'num-123' });
      mockNumberRepository.save.mockResolvedValue({ id: 'num-123' });

      await service.requestNumber({
        service: 'test-service-123',
        deviceId: 'device-123',
      });

      // Should use raw service name if no mapping
      expect(mockProvider.getNumber).toHaveBeenCalledWith('test-service-123', 'RU');
    });

    it('should handle very long device IDs', async () => {
      const longDeviceId = 'device-' + 'x'.repeat(1000);

      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'Smart routing',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockProvider.getNumber.mockResolvedValue({
        activationId: 'act-123',
        phoneNumber: '+79991234567',
        cost: 15.0,
        raw: {},
      });
      mockNumberRepository.create.mockReturnValue({ id: 'num-123', deviceId: longDeviceId });
      mockNumberRepository.save.mockResolvedValue({ id: 'num-123' });

      const result = await service.requestNumber({
        service: 'telegram',
        deviceId: longDeviceId,
      });

      expect(result.deviceId).toBe(longDeviceId);
    });
  });

  describe('Event Publishing', () => {
    it('should publish sms.number.requested event with correct payload', async () => {
      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'Smart routing',
        fallbackLevel: 0,
      };

      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockProvider.getNumber.mockResolvedValue({
        activationId: 'act-event',
        phoneNumber: '+79991234567',
        cost: 15.5,
        raw: {},
      });
      const savedEntity = {
        id: 'num-event',
        phoneNumber: '+79991234567',
        cost: 15.5,
        provider: 'sms-activate',
        serviceName: 'telegram',
        deviceId: 'device-event',
        providerActivationId: 'act-event',
      };
      mockNumberRepository.create.mockReturnValue(savedEntity);
      mockNumberRepository.save.mockResolvedValue(savedEntity);

      await service.requestNumber({
        service: 'telegram',
        country: 'RU',
        deviceId: 'device-event',
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'sms.number.requested',
        expect.objectContaining({
          numberId: 'num-event',
          deviceId: 'device-event',
          service: 'telegram',
          provider: 'sms-activate',
          phoneNumber: '+79991234567',
          cost: 15.5,
          selectionMethod: expect.any(String),
          responseTime: expect.any(Number),
        })
      );
    });

    it('should publish sms.number.cancelled event on cancellation', async () => {
      const mockNumber = {
        id: 'num-cancel-event',
        status: 'active',
        providerActivationId: 'act-123',
        provider: 'sms-activate',
        serviceName: 'telegram',
        countryCode: 'RU',
        deviceId: 'device-cancel',
        cost: 12.5,
      };

      const mockSelection = {
        providerName: 'sms-activate',
        provider: mockProvider,
        score: 95.5,
        reason: 'Cancel',
        fallbackLevel: 0,
      };

      mockNumberRepository.findOne.mockResolvedValue(mockNumber);
      mockPlatformSelector.selectBestPlatform.mockResolvedValue(mockSelection);
      mockProvider.cancel.mockResolvedValue({ success: true });
      mockNumberRepository.save.mockResolvedValue({ ...mockNumber, status: 'cancelled' });

      await service.cancelNumber('num-cancel-event');

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'sms.number.cancelled',
        expect.objectContaining({
          numberId: 'num-cancel-event',
          deviceId: 'device-cancel',
          provider: 'sms-activate',
          refunded: true,
          amount: 12.5,
        })
      );
    });

    it('should publish sms.number.from_pool event when using pooled number', async () => {
      const mockPoolNumber: Partial<NumberPool> = {
        id: 'pool-event',
        provider: 'sms-activate',
        providerActivationId: 'act-pool',
        phoneNumber: '+79991112233',
        countryCode: 'RU',
        serviceCode: 'tg',
        cost: 10.0,
        status: 'available',
        expiresAt: new Date(Date.now() + 60000),
      };

      mockPoolRepository.findOne.mockResolvedValue(mockPoolNumber);
      mockPoolRepository.save.mockResolvedValue(mockPoolNumber);
      const poolNumberEntity = {
        id: 'num-pool-event',
        phoneNumber: '+79991112233',
        provider: 'sms-activate',
        serviceName: 'telegram',
        deviceId: 'device-pool-event',
        providerActivationId: 'act-pool',
        cost: 10.0,
        poolId: 'pool-event',
      };
      mockNumberRepository.create.mockReturnValue(poolNumberEntity);
      mockNumberRepository.save.mockResolvedValue(poolNumberEntity);

      await service.requestNumber({
        service: 'telegram',
        deviceId: 'device-pool-event',
        usePool: true,
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'sms.number.from_pool',
        expect.objectContaining({
          numberId: 'num-pool-event',
          deviceId: 'device-pool-event',
          poolId: 'pool-event',
          phoneNumber: '+79991112233',
        })
      );
    });
  });
});
