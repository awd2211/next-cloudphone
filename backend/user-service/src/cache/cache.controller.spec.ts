import { Test, TestingModule } from '@nestjs/testing';
import { CacheController } from './cache.controller';
import { CacheService } from './cache.service';

describe('CacheController', () => {
  let controller: CacheController;
  let cacheService: any;

  const mockCacheService = {
    getStats: jest.fn(),
    resetStats: jest.fn(),
    flush: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    exists: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CacheController],
      providers: [
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    controller = module.get<CacheController>(CacheController);
    cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have cacheService injected', () => {
      expect(cacheService).toBeDefined();
      expect(cacheService).toBe(mockCacheService);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const mockStats = {
        hits: 1500,
        misses: 300,
        hitRate: 0.833,
        totalKeys: 250,
        memoryUsage: 5242880,
      };

      mockCacheService.getStats.mockReturnValue(mockStats);

      const result = controller.getStats();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
      expect(mockCacheService.getStats).toHaveBeenCalled();
    });

    it('should include timestamp in ISO format', () => {
      mockCacheService.getStats.mockReturnValue({});

      const result = controller.getStats();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return detailed statistics', () => {
      const mockStats = {
        hits: 5000,
        misses: 1000,
        hitRate: 0.833,
        totalKeys: 500,
        memoryUsage: 10485760,
        evictions: 25,
        expirations: 150,
      };

      mockCacheService.getStats.mockReturnValue(mockStats);

      const result = controller.getStats();

      expect(result.data.hits).toBe(5000);
      expect(result.data.hitRate).toBe(0.833);
      expect(result.data.evictions).toBe(25);
    });

    it('should handle zero statistics', () => {
      const mockStats = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalKeys: 0,
        memoryUsage: 0,
      };

      mockCacheService.getStats.mockReturnValue(mockStats);

      const result = controller.getStats();

      expect(result.data.hits).toBe(0);
      expect(result.data.totalKeys).toBe(0);
    });
  });

  describe('resetStats', () => {
    it('should reset cache statistics', () => {
      mockCacheService.resetStats.mockReturnValue(undefined);

      controller.resetStats();

      expect(mockCacheService.resetStats).toHaveBeenCalled();
      expect(mockCacheService.resetStats).toHaveBeenCalledTimes(1);
    });

    it('should not return any value', () => {
      mockCacheService.resetStats.mockReturnValue(undefined);

      const result = controller.resetStats();

      expect(result).toBeUndefined();
    });
  });

  describe('flush', () => {
    it('should flush all cache', async () => {
      mockCacheService.flush.mockResolvedValue(undefined);

      await controller.flush();

      expect(mockCacheService.flush).toHaveBeenCalled();
      expect(mockCacheService.flush).toHaveBeenCalledTimes(1);
    });

    it('should be an async operation', async () => {
      mockCacheService.flush.mockResolvedValue(undefined);

      const promise = controller.flush();

      expect(promise).toBeInstanceOf(Promise);
      await promise;
    });

    it('should not return any value', async () => {
      mockCacheService.flush.mockResolvedValue(undefined);

      const result = await controller.flush();

      expect(result).toBeUndefined();
    });
  });

  describe('deleteCache', () => {
    it('should delete cache by key', async () => {
      mockCacheService.del.mockResolvedValue(undefined);

      await controller.deleteCache('user:123');

      expect(mockCacheService.del).toHaveBeenCalledWith('user:123');
      expect(mockCacheService.del).toHaveBeenCalledTimes(1);
    });

    it('should throw error when key is not provided', async () => {
      await expect(controller.deleteCache('')).rejects.toThrow('Key parameter is required');
      await expect(controller.deleteCache(undefined as any)).rejects.toThrow('Key parameter is required');
    });

    it('should delete different key patterns', async () => {
      mockCacheService.del.mockResolvedValue(undefined);

      await controller.deleteCache('user:456');
      await controller.deleteCache('session:abc123');
      await controller.deleteCache('permissions:user:789');

      expect(mockCacheService.del).toHaveBeenCalledTimes(3);
      expect(mockCacheService.del).toHaveBeenNthCalledWith(1, 'user:456');
      expect(mockCacheService.del).toHaveBeenNthCalledWith(2, 'session:abc123');
      expect(mockCacheService.del).toHaveBeenNthCalledWith(3, 'permissions:user:789');
    });

    it('should be an async operation', async () => {
      mockCacheService.del.mockResolvedValue(undefined);

      const promise = controller.deleteCache('test:key');

      expect(promise).toBeInstanceOf(Promise);
      await promise;
    });
  });

  describe('deletePattern', () => {
    it('should delete caches matching pattern', async () => {
      mockCacheService.delPattern.mockResolvedValue(15);

      const result = await controller.deletePattern('user:*');

      expect(result.success).toBe(true);
      expect(result.data.pattern).toBe('user:*');
      expect(result.data.deletedCount).toBe(15);
      expect(mockCacheService.delPattern).toHaveBeenCalledWith('user:*');
    });

    it('should throw error when pattern is not provided', async () => {
      await expect(controller.deletePattern('')).rejects.toThrow('Pattern parameter is required');
      await expect(controller.deletePattern(undefined as any)).rejects.toThrow('Pattern parameter is required');
    });

    it('should handle different wildcard patterns', async () => {
      mockCacheService.delPattern.mockResolvedValue(10);

      const result1 = await controller.deletePattern('session:*');
      expect(result1.data.pattern).toBe('session:*');

      mockCacheService.delPattern.mockResolvedValue(25);
      const result2 = await controller.deletePattern('permissions:user:*');
      expect(result2.data.pattern).toBe('permissions:user:*');

      expect(mockCacheService.delPattern).toHaveBeenCalledTimes(2);
    });

    it('should return zero when no keys match pattern', async () => {
      mockCacheService.delPattern.mockResolvedValue(0);

      const result = await controller.deletePattern('nonexistent:*');

      expect(result.success).toBe(true);
      expect(result.data.deletedCount).toBe(0);
    });

    it('should handle complex patterns', async () => {
      mockCacheService.delPattern.mockResolvedValue(5);

      const result = await controller.deletePattern('cache:user:*:settings');

      expect(result.data.pattern).toBe('cache:user:*:settings');
      expect(result.data.deletedCount).toBe(5);
      expect(mockCacheService.delPattern).toHaveBeenCalledWith('cache:user:*:settings');
    });
  });

  describe('exists', () => {
    it('should check if key exists and return true', async () => {
      mockCacheService.exists.mockResolvedValue(true);

      const result = await controller.exists('user:123');

      expect(result.success).toBe(true);
      expect(result.data.key).toBe('user:123');
      expect(result.data.exists).toBe(true);
      expect(mockCacheService.exists).toHaveBeenCalledWith('user:123');
    });

    it('should check if key exists and return false', async () => {
      mockCacheService.exists.mockResolvedValue(false);

      const result = await controller.exists('user:999');

      expect(result.success).toBe(true);
      expect(result.data.key).toBe('user:999');
      expect(result.data.exists).toBe(false);
    });

    it('should throw error when key is not provided', async () => {
      await expect(controller.exists('')).rejects.toThrow('Key parameter is required');
      await expect(controller.exists(undefined as any)).rejects.toThrow('Key parameter is required');
    });

    it('should check existence for different key types', async () => {
      mockCacheService.exists.mockResolvedValue(true);

      await controller.exists('session:abc123');
      await controller.exists('permissions:user:456');
      await controller.exists('quota:org:789');

      expect(mockCacheService.exists).toHaveBeenCalledTimes(3);
      expect(mockCacheService.exists).toHaveBeenNthCalledWith(1, 'session:abc123');
      expect(mockCacheService.exists).toHaveBeenNthCalledWith(2, 'permissions:user:456');
      expect(mockCacheService.exists).toHaveBeenNthCalledWith(3, 'quota:org:789');
    });

    it('should be an async operation', async () => {
      mockCacheService.exists.mockResolvedValue(true);

      const promise = controller.exists('test:key');

      expect(promise).toBeInstanceOf(Promise);
      await promise;
    });
  });

  describe('Response Format', () => {
    it('should return standard response format for stats', () => {
      mockCacheService.getStats.mockReturnValue({});

      const result = controller.getStats();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('timestamp');
      expect(result.success).toBe(true);
    });

    it('should return standard response format for deletePattern', async () => {
      mockCacheService.delPattern.mockResolvedValue(5);

      const result = await controller.deletePattern('test:*');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result.success).toBe(true);
    });

    it('should return standard response format for exists', async () => {
      mockCacheService.exists.mockResolvedValue(true);

      const result = await controller.exists('test:key');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing key parameter in deleteCache', async () => {
      await expect(controller.deleteCache('')).rejects.toThrow();
    });

    it('should handle missing pattern parameter in deletePattern', async () => {
      await expect(controller.deletePattern('')).rejects.toThrow();
    });

    it('should handle missing key parameter in exists', async () => {
      await expect(controller.exists('')).rejects.toThrow();
    });

    it('should propagate service errors', async () => {
      const error = new Error('Cache service unavailable');
      mockCacheService.flush.mockRejectedValue(error);

      await expect(controller.flush()).rejects.toThrow('Cache service unavailable');
    });
  });
});
