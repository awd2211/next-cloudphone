import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProviderConfigController } from './provider-config.controller';
import { ProviderConfig } from '../entities';

describe('ProviderConfigController', () => {
  let controller: ProviderConfigController;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProviderConfigController],
      providers: [
        {
          provide: getRepositoryToken(ProviderConfig),
          useValue: mockRepository,
        },
      ],
    }).compile();

    controller = module.get<ProviderConfigController>(ProviderConfigController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllProviders', () => {
    it('should return all providers with success rates', async () => {
      const mockProviders = [
        {
          id: 'provider-1',
          provider: 'sms-activate',
          enabled: true,
          totalRequests: 100,
          totalSuccess: 95,
          priority: 1,
        },
        {
          id: 'provider-2',
          provider: '5sim',
          enabled: false,
          totalRequests: 50,
          totalSuccess: 48,
          priority: 2,
        },
      ];

      mockRepository.find.mockResolvedValue(mockProviders);

      const result = await controller.getAllProviders();

      expect(result).toHaveLength(2);
      expect(result[0].successRate).toBe(95);
      expect(result[1].successRate).toBe(96);
      expect((result[0] as any).apiKey).toBeUndefined();
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { priority: 'ASC', createdAt: 'DESC' },
      });
    });

    it('should handle providers with zero requests', async () => {
      const mockProviders = [
        {
          id: 'provider-1',
          provider: 'smspool',
          enabled: true,
          totalRequests: 0,
          totalSuccess: 0,
        },
      ];

      mockRepository.find.mockResolvedValue(mockProviders);

      const result = await controller.getAllProviders();

      expect(result[0].successRate).toBe(0);
    });

    it('should not expose API keys in response', async () => {
      const mockProviders = [
        {
          id: 'provider-1',
          provider: 'sms-activate',
          apiKey: 'encrypted:secret',
          totalRequests: 10,
          totalSuccess: 10,
        },
      ];

      mockRepository.find.mockResolvedValue(mockProviders);

      const result = await controller.getAllProviders();

      expect((result[0] as any).apiKey).toBeUndefined();
    });
  });

  describe('getProviderById', () => {
    it('should return provider by ID', async () => {
      const mockProvider = {
        id: 'provider-123',
        provider: 'sms-activate',
        enabled: true,
        totalRequests: 100,
        totalSuccess: 90,
      };

      mockRepository.findOne.mockResolvedValue(mockProvider);

      const result = await controller.getProviderById('provider-123');

      expect(result.id).toBe('provider-123');
      expect(result.successRate).toBe(90);
      expect((result as any).apiKey).toBeUndefined();
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'provider-123' },
      });
    });

    it('should throw NotFoundException if provider not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(controller.getProviderById('nonexistent')).rejects.toThrow(
        NotFoundException
      );
      await expect(controller.getProviderById('nonexistent')).rejects.toThrow(
        'Provider config with ID nonexistent not found'
      );
    });
  });

  describe('createProvider', () => {
    it('should create new provider with encrypted API key', async () => {
      const createDto: any = {
        provider: 'sms-activate',
        apiKey: 'plain-api-key',
        enabled: true,
        priority: 1,
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data);
      mockRepository.save.mockResolvedValue({
        id: 'new-provider-123',
        ...createDto,
        apiKey: 'encrypted:key',
        apiKeyEncrypted: true,
        healthStatus: 'healthy',
        totalRequests: 0,
        totalSuccess: 0,
        totalFailures: 0,
      });

      const result = await controller.createProvider(createDto);

      expect(result.id).toBe('new-provider-123');
      expect(result.provider).toBe('sms-activate');
      expect((result as any).apiKey).toBeUndefined();
      expect(result.successRate).toBe(0);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { provider: 'sms-activate' },
      });
    });

    it('should throw ConflictException if provider already exists', async () => {
      const createDto: any = {
        provider: 'sms-activate',
        apiKey: 'api-key',
      };

      mockRepository.findOne.mockResolvedValue({ id: 'existing', provider: 'sms-activate' });

      await expect(controller.createProvider(createDto)).rejects.toThrow(ConflictException);
      await expect(controller.createProvider(createDto)).rejects.toThrow(
        'Provider sms-activate already exists'
      );
    });
  });

  describe('updateProvider', () => {
    it('should update provider configuration', async () => {
      const updateDto: any = {
        enabled: false,
        priority: 3,
      };

      const existingProvider = {
        id: 'provider-123',
        provider: 'sms-activate',
        enabled: true,
        priority: 1,
        totalRequests: 100,
        totalSuccess: 95,
      };

      mockRepository.findOne.mockResolvedValue(existingProvider);
      mockRepository.save.mockResolvedValue({
        ...existingProvider,
        ...updateDto,
      });

      const result = await controller.updateProvider('provider-123', updateDto);

      expect(result.enabled).toBe(false);
      expect(result.priority).toBe(3);
      expect((result as any).apiKey).toBeUndefined();
    });

    it('should throw NotFoundException if provider not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(controller.updateProvider('nonexistent', {})).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('deleteProvider', () => {
    it('should delete provider successfully', async () => {
      const mockProvider = {
        id: 'provider-123',
        provider: 'sms-activate',
      };

      mockRepository.findOne.mockResolvedValue(mockProvider);
      mockRepository.remove.mockResolvedValue(mockProvider);

      await controller.deleteProvider('provider-123');

      expect(mockRepository.remove).toHaveBeenCalledWith(mockProvider);
    });

    it('should throw NotFoundException if provider not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(controller.deleteProvider('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('toggleProvider', () => {
    it('should toggle provider from enabled to disabled', async () => {
      const mockProvider = {
        id: 'provider-123',
        provider: 'sms-activate',
        enabled: true,
        totalRequests: 50,
        totalSuccess: 48,
      };

      mockRepository.findOne.mockResolvedValue(mockProvider);
      mockRepository.save.mockResolvedValue({
        ...mockProvider,
        enabled: false,
      });

      const result = await controller.toggleProvider('provider-123');

      expect(result.enabled).toBe(false);
    });

    it('should toggle provider from disabled to enabled', async () => {
      const mockProvider = {
        id: 'provider-123',
        provider: 'sms-activate',
        enabled: false,
        totalRequests: 0,
        totalSuccess: 0,
      };

      mockRepository.findOne.mockResolvedValue(mockProvider);
      mockRepository.save.mockResolvedValue({
        ...mockProvider,
        enabled: true,
      });

      const result = await controller.toggleProvider('provider-123');

      expect(result.enabled).toBe(true);
    });

    it('should throw NotFoundException if provider not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(controller.toggleProvider('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('testProvider', () => {
    it('should throw NotFoundException if provider not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(controller.testProvider('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return result with success and latency', async () => {
      const mockProvider = {
        id: 'provider-123',
        provider: 'sms-activate',
        apiKey: 'encrypted:key',
      };

      mockRepository.findOne.mockResolvedValue(mockProvider);

      const result = await controller.testProvider('provider-123');

      expect(result.success).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.latency).toBeDefined();
      expect(typeof result.latency).toBe('number');
      expect(result.message).toBeDefined();
    });
  });

  describe('refreshBalance', () => {
    it('should throw NotFoundException if provider not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(controller.refreshBalance('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });

    // Note: Balance refresh tests that involve actual API key decryption and external API calls
    // are skipped in unit tests. These should be covered by integration tests.
  });

  describe('resetStats', () => {
    it('should reset provider statistics', async () => {
      const mockProvider = {
        id: 'provider-123',
        provider: 'sms-activate',
        totalRequests: 1000,
        totalSuccess: 950,
        totalFailures: 50,
      };

      mockRepository.findOne.mockResolvedValue(mockProvider);
      mockRepository.save.mockResolvedValue({
        ...mockProvider,
        totalRequests: 0,
        totalSuccess: 0,
        totalFailures: 0,
      });

      const result = await controller.resetStats('provider-123');

      expect(result.successRate).toBe(0);
      expect((result as any).apiKey).toBeUndefined();
    });

    it('should throw NotFoundException if provider not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(controller.resetStats('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
