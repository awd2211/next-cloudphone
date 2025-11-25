import { ConfigService } from '@nestjs/config';
import { UnifiedCacheService, CacheLayer } from './unified-cache.service';

describe('UnifiedCacheService', () => {
  let service: UnifiedCacheService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: '',
        REDIS_CACHE_DB: 1,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    // Create service with L1 only to avoid Redis connection in unit tests
    service = new UnifiedCacheService(
      mockConfigService as unknown as ConfigService,
      {
        keyPrefix: 'test:',
        enableL1Cache: true,
        l1MaxSize: 100,
        l1TTL: 60,
        defaultTTL: 300,
        randomTTLRange: 0, // Disable random TTL for predictable tests
      },
    );
    // Override redis to null to test L1 only behavior
    (service as any).redis = null;
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached value from L1 cache', async () => {
      await service.set('test-key', { foo: 'bar' });

      const result = await service.get<{ foo: string }>('test-key');

      expect(result).toEqual({ foo: 'bar' });
    });

    it('should return null for non-existent key', async () => {
      const result = await service.get('non-existent');

      expect(result).toBeNull();
    });

    it('should track L1 hits in stats', async () => {
      await service.set('stats-key', 'value');

      // Reset stats for clean measurement
      service.resetStats();

      await service.get('stats-key');

      const stats = service.getStats();
      expect(stats.l1.hits).toBe(1);
    });
  });

  describe('set', () => {
    it('should set value in L1 cache', async () => {
      const result = await service.set('l1-key', 'value');

      expect(result).toBe(true);

      const retrieved = await service.get('l1-key');
      expect(retrieved).toBe('value');
    });

    it('should handle object values', async () => {
      const obj = { name: 'test', count: 42 };

      await service.set('obj-key', obj);
      const result = await service.get<typeof obj>('obj-key');

      expect(result).toEqual(obj);
    });

    it('should handle null values with cacheNullValue option', async () => {
      await service.set('null-key', null, { cacheNullValue: true });

      const result = await service.get('null-key');

      expect(result).toBeNull();
    });
  });

  describe('getOrSet', () => {
    it('should return existing cached value without calling factory', async () => {
      await service.set('existing-key', 'cached-value');
      const factory = jest.fn().mockResolvedValue('new-value');

      const result = await service.getOrSet('existing-key', factory);

      expect(result).toBe('cached-value');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result when key not found', async () => {
      const factory = jest.fn().mockResolvedValue('new-value');

      const result = await service.getOrSet('new-key', factory);

      expect(result).toBe('new-value');
      expect(factory).toHaveBeenCalled();

      // Verify it was cached
      const cached = await service.get('new-key');
      expect(cached).toBe('new-value');
    });

    it('should throw if factory throws', async () => {
      const factory = jest.fn().mockRejectedValue(new Error('Factory error'));

      await expect(service.getOrSet('error-key', factory)).rejects.toThrow('Factory error');
    });
  });

  describe('del', () => {
    it('should delete from L1 cache', async () => {
      await service.set('delete-me', 'value');

      const deletedCount = await service.del('delete-me');

      expect(deletedCount).toBe(1);
      const afterDelete = await service.get('delete-me');
      expect(afterDelete).toBeNull();
    });

    it('should handle deleting non-existent key', async () => {
      const deletedCount = await service.del('non-existent');

      expect(deletedCount).toBe(0);
    });

    it('should delete multiple keys', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');

      const deletedCount = await service.del(['key1', 'key2']);

      expect(deletedCount).toBe(2);
    });
  });

  describe('exists', () => {
    it('should return true for existing key', async () => {
      await service.set('exists-key', 'value');

      const result = await service.exists('exists-key');

      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const result = await service.exists('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics structure', () => {
      const stats = service.getStats();

      // Check nested structure
      expect(stats).toHaveProperty('l1');
      expect(stats).toHaveProperty('l2');
      expect(stats).toHaveProperty('total');

      expect(stats.l1).toHaveProperty('hits');
      expect(stats.l1).toHaveProperty('hitRate');
      expect(stats.l1).toHaveProperty('size');

      expect(stats.l2).toHaveProperty('hits');
      expect(stats.l2).toHaveProperty('hitRate');

      expect(stats.total).toHaveProperty('hits');
      expect(stats.total).toHaveProperty('misses');
      expect(stats.total).toHaveProperty('sets');
      expect(stats.total).toHaveProperty('deletes');
      expect(stats.total).toHaveProperty('hitRate');
    });

    it('should track operations correctly', async () => {
      service.resetStats();

      // Perform operations
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      await service.get('key1');
      await service.get('non-existent');
      await service.del('key1');

      const stats = service.getStats();

      expect(stats.total.sets).toBe(2);
      expect(stats.l1.hits).toBe(1);
      expect(stats.total.misses).toBe(1);
      expect(stats.total.deletes).toBe(1);
    });
  });

  describe('resetStats', () => {
    it('should reset all counters', async () => {
      await service.set('key', 'value');
      await service.get('key');

      service.resetStats();

      const stats = service.getStats();
      expect(stats.l1.hits).toBe(0);
      expect(stats.l2.hits).toBe(0);
      expect(stats.total.misses).toBe(0);
      expect(stats.total.sets).toBe(0);
    });
  });

  describe('mget', () => {
    it('should get multiple keys at once', async () => {
      await service.set('multi1', 'value1');
      await service.set('multi2', 'value2');

      const result = await service.mget<string>(['multi1', 'multi2', 'missing']);

      expect(result.get('multi1')).toBe('value1');
      expect(result.get('multi2')).toBe('value2');
      expect(result.get('missing')).toBeNull();
    });
  });

  describe('mset', () => {
    it('should set multiple keys at once', async () => {
      await service.mset([
        { key: 'batch1', value: 'val1' },
        { key: 'batch2', value: 'val2' },
      ]);

      const val1 = await service.get('batch1');
      const val2 = await service.get('batch2');

      expect(val1).toBe('val1');
      expect(val2).toBe('val2');
    });
  });

  describe('delPattern', () => {
    it('should delete keys matching pattern', async () => {
      await service.set('user:1', 'u1');
      await service.set('user:2', 'u2');
      await service.set('other:1', 'o1');

      const deletedCount = await service.delPattern('user:*');

      expect(deletedCount).toBe(2);
      expect(await service.get('user:1')).toBeNull();
      expect(await service.get('user:2')).toBeNull();
      expect(await service.get('other:1')).toBe('o1');
    });
  });

  describe('L1 cache TTL expiration', () => {
    it('should return null for expired entries', async () => {
      // Create service with very short L1 TTL for testing
      const shortTTLService = new UnifiedCacheService(
        mockConfigService as unknown as ConfigService,
        {
          keyPrefix: 'short:',
          l1TTL: 1, // 1 second TTL
          enableL1Cache: true,
          randomTTLRange: 0,
        },
      );
      (shortTTLService as any).redis = null;

      await shortTTLService.set('expire-key', 'value');

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result = await shortTTLService.get('expire-key');

      expect(result).toBeNull();

      await shortTTLService.onModuleDestroy();
    });
  });

  describe('L1 cache size limit', () => {
    it('should evict oldest entry when size limit reached', async () => {
      // Create service with small L1 cache
      const smallCacheService = new UnifiedCacheService(
        mockConfigService as unknown as ConfigService,
        {
          keyPrefix: 'small:',
          l1MaxSize: 3,
          enableL1Cache: true,
          randomTTLRange: 0,
        },
      );
      (smallCacheService as any).redis = null;

      // Fill cache
      await smallCacheService.set('key1', 'value1');
      await smallCacheService.set('key2', 'value2');
      await smallCacheService.set('key3', 'value3');

      // Add one more (should evict key1)
      await smallCacheService.set('key4', 'value4');

      // key1 should be evicted
      const key1 = await smallCacheService.get('key1');
      const key4 = await smallCacheService.get('key4');

      expect(key1).toBeNull();
      expect(key4).toBe('value4');

      await smallCacheService.onModuleDestroy();
    });
  });
});
