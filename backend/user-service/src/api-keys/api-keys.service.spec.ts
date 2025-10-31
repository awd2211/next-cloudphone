import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKey, ApiKeyStatus } from '../entities/api-key.entity';
import { createMockRepository, createMockApiKey } from '@cloudphone/shared/testing';

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let apiKeyRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    apiKeyRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        {
          provide: getRepositoryToken(ApiKey),
          useValue: apiKeyRepository,
        },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
  });

  beforeEach(() => {
    apiKeyRepository.create.mockClear();
    apiKeyRepository.save.mockClear();
    apiKeyRepository.find.mockClear();
    apiKeyRepository.findOne.mockClear();
    apiKeyRepository.remove.mockClear();
    apiKeyRepository.update.mockClear();
  });

  describe('createApiKey', () => {
    it('应该成功创建API密钥', async () => {
      // Arrange
      const dto = {
        userId: 'user-123',
        name: 'Production API Key',
        scopes: ['device:read', 'device:write'],
        description: 'For production use',
      };

      const mockApiKey = createMockApiKey(dto);

      apiKeyRepository.create.mockReturnValue(mockApiKey);
      apiKeyRepository.save.mockResolvedValue(mockApiKey);

      // Act
      const result = await service.createApiKey(dto);

      // Assert
      expect(result.apiKey).toBeDefined();
      expect(result.secret).toBeDefined();
      expect(typeof result.secret).toBe('string');
      expect(result.secret.length).toBeGreaterThan(0);
      expect(apiKeyRepository.save).toHaveBeenCalled();
    });

    it('应该生成带前缀的API密钥', async () => {
      // Arrange
      const dto = {
        userId: 'user-123',
        name: 'Test Key',
        scopes: ['read'],
      };

      apiKeyRepository.create.mockImplementation((data) => data as any);
      apiKeyRepository.save.mockImplementation((key) => Promise.resolve(key));

      // Act
      const result = await service.createApiKey(dto);

      // Assert
      expect(apiKeyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          prefix: expect.stringContaining('cp_live_'),
        })
      );
    });

    it('应该设置初始usageCount为0', async () => {
      // Arrange
      const dto = {
        userId: 'user-123',
        name: 'Test Key',
        scopes: ['read'],
      };

      apiKeyRepository.create.mockImplementation((data) => data as any);
      apiKeyRepository.save.mockImplementation((key) => Promise.resolve(key));

      // Act
      await service.createApiKey(dto);

      // Assert
      expect(apiKeyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          usageCount: 0,
        })
      );
    });

    it('应该设置状态为ACTIVE', async () => {
      // Arrange
      const dto = {
        userId: 'user-123',
        name: 'Test Key',
        scopes: ['read'],
      };

      apiKeyRepository.create.mockImplementation((data) => data as any);
      apiKeyRepository.save.mockImplementation((key) => Promise.resolve(key));

      // Act
      await service.createApiKey(dto);

      // Assert
      expect(apiKeyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ApiKeyStatus.ACTIVE,
        })
      );
    });
  });

  describe('validateApiKey', () => {
    it('应该成功验证有效的API密钥', async () => {
      // Arrange
      const secret = 'test-secret-key';
      const mockApiKey = createMockApiKey({
        status: ApiKeyStatus.ACTIVE,
        isActive: jest.fn(() => true),
        isExpired: jest.fn(() => false),
        usageCount: 5,
      });

      apiKeyRepository.findOne.mockResolvedValue(mockApiKey);
      apiKeyRepository.save.mockResolvedValue({
        ...mockApiKey,
        usageCount: 6,
      });

      // Act
      const result = await service.validateApiKey(secret);

      // Assert
      expect(result).toBeDefined();
      expect(apiKeyRepository.save).toHaveBeenCalled();
      const savedKey = apiKeyRepository.save.mock.calls[0][0];
      expect(savedKey.usageCount).toBe(6);
      expect(savedKey.lastUsedAt).toBeInstanceOf(Date);
    });

    it('应该在密钥不存在时返回null', async () => {
      // Arrange
      const secret = 'nonexistent-key';

      apiKeyRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.validateApiKey(secret);

      // Assert
      expect(result).toBeNull();
    });

    it('应该在密钥不活跃时返回null', async () => {
      // Arrange
      const secret = 'inactive-key';
      const mockApiKey = createMockApiKey({
        status: ApiKeyStatus.REVOKED,
        isActive: jest.fn(() => false),
        isExpired: jest.fn(() => false),
      });

      apiKeyRepository.findOne.mockResolvedValue(mockApiKey);

      // Act
      const result = await service.validateApiKey(secret);

      // Assert
      expect(result).toBeNull();
    });

    it('应该在密钥过期时更新状态并返回null', async () => {
      // Arrange
      const secret = 'expired-key';
      const mockApiKey = createMockApiKey({
        status: ApiKeyStatus.ACTIVE,
        isActive: jest.fn(() => false),
        isExpired: jest.fn(() => true),
      });

      apiKeyRepository.findOne.mockResolvedValue(mockApiKey);
      apiKeyRepository.save.mockResolvedValue({
        ...mockApiKey,
        status: ApiKeyStatus.EXPIRED,
      });

      // Act
      const result = await service.validateApiKey(secret);

      // Assert
      expect(result).toBeNull();
      expect(apiKeyRepository.save).toHaveBeenCalled();
      const savedKey = apiKeyRepository.save.mock.calls[0][0];
      expect(savedKey.status).toBe(ApiKeyStatus.EXPIRED);
    });
  });

  describe('getUserApiKeys', () => {
    it('应该成功获取用户的API密钥列表', async () => {
      // Arrange
      const userId = 'user-123';
      const mockApiKeys = [createMockApiKey({ userId }), createMockApiKey({ userId })];

      apiKeyRepository.find.mockResolvedValue(mockApiKeys);

      // Act
      const result = await service.getUserApiKeys(userId);

      // Assert
      expect(result).toEqual(mockApiKeys);
      expect(apiKeyRepository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
    });

    it('应该按创建时间降序排序', async () => {
      // Arrange
      const userId = 'user-123';

      apiKeyRepository.find.mockResolvedValue([]);

      // Act
      await service.getUserApiKeys(userId);

      // Assert
      expect(apiKeyRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC' },
        })
      );
    });
  });

  describe('getApiKey', () => {
    it('应该成功获取API密钥', async () => {
      // Arrange
      const apiKeyId = 'key-123';
      const mockApiKey = createMockApiKey({ id: apiKeyId });

      apiKeyRepository.findOne.mockResolvedValue(mockApiKey);

      // Act
      const result = await service.getApiKey(apiKeyId);

      // Assert
      expect(result).toEqual(mockApiKey);
      expect(apiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { id: apiKeyId },
        relations: ['user'],
      });
    });

    it('应该在API密钥不存在时抛出NotFoundException', async () => {
      // Arrange
      const apiKeyId = 'nonexistent';

      apiKeyRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getApiKey(apiKeyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateApiKey', () => {
    it('应该成功更新API密钥', async () => {
      // Arrange
      const apiKeyId = 'key-123';
      const dto = {
        name: 'Updated Name',
        scopes: ['device:read'],
      };

      const mockApiKey = createMockApiKey({ id: apiKeyId });

      apiKeyRepository.findOne.mockResolvedValue(mockApiKey);
      apiKeyRepository.save.mockResolvedValue({
        ...mockApiKey,
        ...dto,
      });

      // Act
      const result = await service.updateApiKey(apiKeyId, dto);

      // Assert
      expect(apiKeyRepository.save).toHaveBeenCalled();
    });

    it('应该在API密钥不存在时抛出NotFoundException', async () => {
      // Arrange
      const apiKeyId = 'nonexistent';
      const dto = { name: 'Test' };

      apiKeyRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateApiKey(apiKeyId, dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeApiKey', () => {
    it('应该成功撤销API密钥', async () => {
      // Arrange
      const apiKeyId = 'key-123';
      const mockApiKey = createMockApiKey({
        id: apiKeyId,
        status: ApiKeyStatus.ACTIVE,
      });

      apiKeyRepository.findOne.mockResolvedValue(mockApiKey);
      apiKeyRepository.save.mockResolvedValue({
        ...mockApiKey,
        status: ApiKeyStatus.REVOKED,
      });

      // Act
      const result = await service.revokeApiKey(apiKeyId);

      // Assert
      expect(apiKeyRepository.save).toHaveBeenCalled();
      const savedKey = apiKeyRepository.save.mock.calls[0][0];
      expect(savedKey.status).toBe(ApiKeyStatus.REVOKED);
    });

    it('应该在API密钥不存在时抛出NotFoundException', async () => {
      // Arrange
      const apiKeyId = 'nonexistent';

      apiKeyRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.revokeApiKey(apiKeyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteApiKey', () => {
    it('应该成功删除API密钥', async () => {
      // Arrange
      const apiKeyId = 'key-123';
      const mockApiKey = createMockApiKey({ id: apiKeyId });

      apiKeyRepository.findOne.mockResolvedValue(mockApiKey);
      apiKeyRepository.remove.mockResolvedValue(mockApiKey);

      // Act
      await service.deleteApiKey(apiKeyId);

      // Assert
      expect(apiKeyRepository.remove).toHaveBeenCalledWith(mockApiKey);
    });

    it('应该在API密钥不存在时抛出NotFoundException', async () => {
      // Arrange
      const apiKeyId = 'nonexistent';

      apiKeyRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteApiKey(apiKeyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getApiKeyStatistics', () => {
    it('应该返回API密钥统计信息', async () => {
      // Arrange
      const userId = 'user-123';
      const mockApiKeys = [
        createMockApiKey({ userId, status: ApiKeyStatus.ACTIVE, usageCount: 100 }),
        createMockApiKey({ userId, status: ApiKeyStatus.ACTIVE, usageCount: 50 }),
        createMockApiKey({ userId, status: ApiKeyStatus.REVOKED, usageCount: 0 }),
      ];

      apiKeyRepository.find.mockResolvedValue(mockApiKeys);

      // Act
      const result = await service.getApiKeyStatistics(userId);

      // Assert
      expect(result.totalKeys).toBe(3);
      expect(result.activeKeys).toBe(2);
      expect(result.revokedKeys).toBe(1);
      expect(result.totalUsage).toBe(150);
    });

    it('应该正确统计不同状态的密钥', async () => {
      // Arrange
      const userId = 'user-123';
      const mockApiKeys = [
        createMockApiKey({ status: ApiKeyStatus.ACTIVE }),
        createMockApiKey({ status: ApiKeyStatus.ACTIVE }),
        createMockApiKey({ status: ApiKeyStatus.REVOKED }),
        createMockApiKey({ status: ApiKeyStatus.EXPIRED }),
      ];

      apiKeyRepository.find.mockResolvedValue(mockApiKeys);

      // Act
      const result = await service.getApiKeyStatistics(userId);

      // Assert
      expect(result.activeKeys).toBe(2);
      expect(result.revokedKeys).toBe(1);
      expect(result.expiredKeys).toBe(1);
    });

    it('应该在没有密钥时返回零值统计', async () => {
      // Arrange
      const userId = 'user-123';

      apiKeyRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getApiKeyStatistics(userId);

      // Assert
      expect(result.totalKeys).toBe(0);
      expect(result.activeKeys).toBe(0);
      expect(result.revokedKeys).toBe(0);
      expect(result.totalUsage).toBe(0);
    });
  });
});
