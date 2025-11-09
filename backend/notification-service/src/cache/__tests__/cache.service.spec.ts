import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from '../cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let mockCacheManager: any;

  beforeEach(async () => {
    // Mock Redis store with client
    const mockRedisClient = {
      keys: jest.fn(),
    };

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
      store: {
        client: mockRedisClient,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached value when key exists', async () => {
      const testData = { id: '123', name: 'Test' };
      mockCacheManager.get.mockResolvedValue(testData);

      const result = await service.get('test:key');

      expect(mockCacheManager.get).toHaveBeenCalledWith('test:key');
      expect(result).toEqual(testData);
    });

    it('should return null when key does not exist', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.get('nonexistent:key');

      expect(result).toBeNull();
    });

    it('should return null when cache manager throws error', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis connection error'));

      const result = await service.get('test:key');

      expect(result).toBeNull();
    });

    it('should handle null values from cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.get('test:key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set cache with default TTL', async () => {
      const testData = { id: '123', name: 'Test' };
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.set('test:key', testData);

      expect(mockCacheManager.set).toHaveBeenCalledWith('test:key', testData, 60000);
    });

    it('should set cache with custom TTL', async () => {
      const testData = { id: '123', name: 'Test' };
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.set('test:key', testData, 300);

      expect(mockCacheManager.set).toHaveBeenCalledWith('test:key', testData, 300000);
    });

    it('should handle errors gracefully when setting cache', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Redis write error'));

      await expect(service.set('test:key', { data: 'test' })).resolves.not.toThrow();
    });

    it('should set string values', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.set('test:key', 'simple string value');

      expect(mockCacheManager.set).toHaveBeenCalledWith('test:key', 'simple string value', 60000);
    });

    it('should set number values', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.set('test:key', 12345, 120);

      expect(mockCacheManager.set).toHaveBeenCalledWith('test:key', 12345, 120000);
    });
  });

  describe('del', () => {
    it('should delete cache key', async () => {
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.del('test:key');

      expect(mockCacheManager.del).toHaveBeenCalledWith('test:key');
    });

    it('should handle errors when deleting key', async () => {
      mockCacheManager.del.mockRejectedValue(new Error('Redis delete error'));

      await expect(service.del('test:key')).resolves.not.toThrow();
    });
  });

  describe('delPattern', () => {
    it('should delete all keys matching pattern', async () => {
      const matchedKeys = ['user:123:notifications', 'user:123:preferences', 'user:123:stats'];
      mockCacheManager.store.client.keys.mockResolvedValue(matchedKeys);
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.delPattern('user:123:*');

      expect(mockCacheManager.store.client.keys).toHaveBeenCalledWith('user:123:*');
      expect(mockCacheManager.del).toHaveBeenCalledTimes(3);
      expect(mockCacheManager.del).toHaveBeenCalledWith('user:123:notifications');
      expect(mockCacheManager.del).toHaveBeenCalledWith('user:123:preferences');
      expect(mockCacheManager.del).toHaveBeenCalledWith('user:123:stats');
    });

    it('should handle pattern with no matches', async () => {
      mockCacheManager.store.client.keys.mockResolvedValue([]);

      await service.delPattern('nonexistent:*');

      expect(mockCacheManager.store.client.keys).toHaveBeenCalledWith('nonexistent:*');
      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    it('should handle errors in pattern deletion', async () => {
      mockCacheManager.store.client.keys.mockRejectedValue(new Error('Redis keys error'));

      await expect(service.delPattern('user:*')).resolves.not.toThrow();
    });

    it('should handle missing store or client gracefully', async () => {
      const serviceWithoutStore = new CacheService({
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        reset: jest.fn(),
        store: null,
      } as any);

      await expect(serviceWithoutStore.delPattern('user:*')).resolves.not.toThrow();
    });
  });

  describe('reset', () => {
    it('should clear all cache keys', async () => {
      mockCacheManager.reset.mockResolvedValue(undefined);

      await service.reset();

      expect(mockCacheManager.reset).toHaveBeenCalled();
    });

    it('should handle errors when resetting cache', async () => {
      mockCacheManager.reset.mockRejectedValue(new Error('Redis flush error'));

      await expect(service.reset()).resolves.not.toThrow();
    });
  });

  describe('mget', () => {
    it('should get multiple cache values', async () => {
      mockCacheManager.get
        .mockResolvedValueOnce({ id: '1', name: 'User 1' })
        .mockResolvedValueOnce({ id: '2', name: 'User 2' })
        .mockResolvedValueOnce(undefined);

      const result = await service.mget(['user:1', 'user:2', 'user:3']);

      expect(mockCacheManager.get).toHaveBeenCalledTimes(3);
      expect(result).toEqual([
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
        null,
      ]);
    });

    it('should handle empty keys array', async () => {
      const result = await service.mget([]);

      expect(mockCacheManager.get).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('mset', () => {
    it('should set multiple cache values', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);

      const items = [
        { key: 'user:1', value: { id: '1', name: 'User 1' } },
        { key: 'user:2', value: { id: '2', name: 'User 2' } },
      ];

      await service.mset(items, 120);

      expect(mockCacheManager.set).toHaveBeenCalledTimes(2);
      expect(mockCacheManager.set).toHaveBeenCalledWith('user:1', { id: '1', name: 'User 1' }, 120000);
      expect(mockCacheManager.set).toHaveBeenCalledWith('user:2', { id: '2', name: 'User 2' }, 120000);
    });

    it('should use default TTL when not specified', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);

      const items = [{ key: 'test:1', value: 'data1' }];

      await service.mset(items);

      expect(mockCacheManager.set).toHaveBeenCalledWith('test:1', 'data1', 60000);
    });

    it('should handle empty items array', async () => {
      await service.mset([]);

      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('wrap', () => {
    it('should return cached value when available', async () => {
      const cachedData = { id: '123', name: 'Cached' };
      mockCacheManager.get.mockResolvedValue(cachedData);
      const mockFn = jest.fn();

      const result = await service.wrap('test:key', mockFn);

      expect(mockCacheManager.get).toHaveBeenCalledWith('test:key');
      expect(mockFn).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
    });

    it('should execute function and cache result when cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      mockCacheManager.set.mockResolvedValue(undefined);
      const freshData = { id: '123', name: 'Fresh' };
      const mockFn = jest.fn().mockResolvedValue(freshData);

      const result = await service.wrap('test:key', mockFn, 300);

      expect(mockCacheManager.get).toHaveBeenCalledWith('test:key');
      expect(mockFn).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith('test:key', freshData, 300000);
      expect(result).toEqual(freshData);
    });

    it('should use default TTL in wrap when not specified', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      mockCacheManager.set.mockResolvedValue(undefined);
      const mockFn = jest.fn().mockResolvedValue({ data: 'test' });

      await service.wrap('test:key', mockFn);

      expect(mockCacheManager.set).toHaveBeenCalledWith('test:key', { data: 'test' }, 60000);
    });

    it('should handle null cached value as cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);
      const freshData = { id: '456', name: 'New' };
      const mockFn = jest.fn().mockResolvedValue(freshData);

      const result = await service.wrap('test:key', mockFn);

      expect(mockFn).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled();
      expect(result).toEqual(freshData);
    });

    it('should propagate errors from callback function', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      const mockFn = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(service.wrap('test:key', mockFn)).rejects.toThrow('Database error');
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });
  });
});
