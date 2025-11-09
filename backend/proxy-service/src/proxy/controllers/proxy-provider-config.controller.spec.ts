import { Test, TestingModule } from '@nestjs/testing';
import { ProxyProviderConfigController } from './proxy-provider-config.controller';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProxyProvider } from '../../entities/proxy-provider.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('ProxyProviderConfigController', () => {
  let controller: ProxyProviderConfigController;
  let providerRepo: any;

  const mockProxyProvider = {
    id: 'provider-123',
    name: 'Test Provider',
    type: 'brightdata',
    enabled: true,
    priority: 10,
    costPerGB: 5.00,
    config: {
      // Use unencrypted format for testing
      username: 'test-user',
      password: 'test-pass',
      zone: 'test-zone',
    },
    totalRequests: 100,
    successRequests: 90,
    failedRequests: 10,
    successRate: 90.0,
    avgLatencyMs: 150,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-10T00:00:00.000Z'),
  };

  const mockProviderRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyProviderConfigController],
      providers: [
        {
          provide: getRepositoryToken(ProxyProvider),
          useValue: mockProviderRepository,
        },
      ],
    }).compile();

    controller = module.get<ProxyProviderConfigController>(ProxyProviderConfigController);
    providerRepo = module.get(getRepositoryToken(ProxyProvider));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllProviders', () => {
    it('should return all proxy providers', async () => {
      const providers = [mockProxyProvider];
      providerRepo.find.mockResolvedValue(providers);

      const result = await controller.getAllProviders();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('provider-123');
      expect(result[0].name).toBe('Test Provider');
      expect(result[0].hasConfig).toBe(true);
      expect(providerRepo.find).toHaveBeenCalledWith({
        order: { priority: 'DESC', createdAt: 'DESC' },
      });
    });

    it('should return empty array when no providers exist', async () => {
      providerRepo.find.mockResolvedValue([]);

      const result = await controller.getAllProviders();

      expect(result).toHaveLength(0);
      expect(providerRepo.find).toHaveBeenCalled();
    });
  });

  describe('getProviderById', () => {
    it('should return provider by ID', async () => {
      providerRepo.findOne.mockResolvedValue(mockProxyProvider);

      const result = await controller.getProviderById('provider-123');

      expect(result.id).toBe('provider-123');
      expect(result.name).toBe('Test Provider');
      expect(providerRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'provider-123' },
      });
    });

    it('should throw NotFoundException when provider does not exist', async () => {
      providerRepo.findOne.mockResolvedValue(null);

      await expect(controller.getProviderById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getProviderById('invalid-id')).rejects.toThrow(
        'Proxy provider with ID invalid-id not found',
      );
    });
  });

  describe('createProvider', () => {
    it('should create a new provider', async () => {
      const createDto: any = {
        name: 'New Provider',
        type: 'oxylabs',
        enabled: true,
        priority: 5,
        costPerGB: 3.50,
        config: {
          username: 'testuser',
          password: 'testpass',
        },
      };

      providerRepo.findOne.mockResolvedValue(null); // No existing provider
      providerRepo.create.mockReturnValue({
        ...createDto,
        config: { encrypted: true, data: 'encrypted-config' },
      });
      providerRepo.save.mockResolvedValue({
        id: 'new-provider-123',
        ...createDto,
        config: { encrypted: true, data: 'encrypted-config' },
        totalRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        successRate: 0,
        avgLatencyMs: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await controller.createProvider(createDto);

      expect(result.id).toBe('new-provider-123');
      expect(result.name).toBe('New Provider');
      expect(providerRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'New Provider' },
      });
      expect(providerRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when provider name already exists', async () => {
      const createDto: any = {
        name: 'Test Provider',
        type: 'brightdata',
      };

      providerRepo.findOne.mockResolvedValue(mockProxyProvider);

      await expect(controller.createProvider(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(controller.createProvider(createDto)).rejects.toThrow(
        'Provider with name Test Provider already exists',
      );
    });
  });

  describe('updateProvider', () => {
    it('should update an existing provider', async () => {
      const updateDto: any = {
        enabled: false,
        priority: 20,
      };

      const updatedProvider = {
        ...mockProxyProvider,
        ...updateDto,
      };

      providerRepo.findOne.mockResolvedValue(mockProxyProvider);
      providerRepo.save.mockResolvedValue(updatedProvider);

      const result = await controller.updateProvider('provider-123', updateDto);

      expect(result.enabled).toBe(false);
      expect(result.priority).toBe(20);
      expect(providerRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'provider-123' },
      });
      expect(providerRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when provider does not exist', async () => {
      providerRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.updateProvider('invalid-id', { enabled: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteProvider', () => {
    it('should delete a provider', async () => {
      providerRepo.findOne.mockResolvedValue(mockProxyProvider);
      providerRepo.remove.mockResolvedValue(mockProxyProvider);

      await controller.deleteProvider('provider-123');

      expect(providerRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'provider-123' },
      });
      expect(providerRepo.remove).toHaveBeenCalledWith(mockProxyProvider);
    });

    it('should throw NotFoundException when provider does not exist', async () => {
      providerRepo.findOne.mockResolvedValue(null);

      await expect(controller.deleteProvider('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleProvider', () => {
    it('should toggle provider enabled status from true to false', async () => {
      const toggledProvider = {
        ...mockProxyProvider,
        enabled: false,
      };

      providerRepo.findOne.mockResolvedValue(mockProxyProvider);
      providerRepo.save.mockResolvedValue(toggledProvider);

      const result = await controller.toggleProvider('provider-123');

      expect(result.enabled).toBe(false);
      expect(providerRepo.save).toHaveBeenCalled();
    });

    it('should toggle provider enabled status from false to true', async () => {
      const disabledProvider = {
        ...mockProxyProvider,
        enabled: false,
      };
      const enabledProvider = {
        ...mockProxyProvider,
        enabled: true,
      };

      providerRepo.findOne.mockResolvedValue(disabledProvider);
      providerRepo.save.mockResolvedValue(enabledProvider);

      const result = await controller.toggleProvider('provider-123');

      expect(result.enabled).toBe(true);
    });

    it('should throw NotFoundException when provider does not exist', async () => {
      providerRepo.findOne.mockResolvedValue(null);

      await expect(controller.toggleProvider('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('testProvider', () => {
    it('should return successful test result', async () => {
      providerRepo.findOne.mockResolvedValue(mockProxyProvider);

      // Mock fetch to succeed
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ip: '123.45.67.89' }),
      });

      const result = await controller.testProvider('provider-123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('123.45.67.89');
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(providerRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'provider-123' },
      });
    });

    it('should return failure result when connection fails', async () => {
      providerRepo.findOne.mockResolvedValue(mockProxyProvider);

      // Mock fetch to fail
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection timeout'));

      const result = await controller.testProvider('provider-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should throw NotFoundException when provider does not exist', async () => {
      providerRepo.findOne.mockResolvedValue(null);

      await expect(controller.testProvider('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('resetStats', () => {
    it('should reset provider statistics', async () => {
      const resetProvider = {
        ...mockProxyProvider,
        totalRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        successRate: 0,
        avgLatencyMs: 0,
      };

      providerRepo.findOne.mockResolvedValue(mockProxyProvider);
      providerRepo.save.mockResolvedValue(resetProvider);

      const result = await controller.resetStats('provider-123');

      expect(result.totalRequests).toBe(0);
      expect(result.successRequests).toBe(0);
      expect(result.failedRequests).toBe(0);
      expect(result.successRate).toBe(0);
      expect(result.avgLatencyMs).toBe(0);
      expect(providerRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when provider does not exist', async () => {
      providerRepo.findOne.mockResolvedValue(null);

      await expect(controller.resetStats('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
