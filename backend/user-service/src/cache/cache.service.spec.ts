import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService, CacheLayer } from './cache.service';

// Mock node-cache
jest.mock('node-cache');
import NodeCache from 'node-cache';

// Mock ioredis
jest.mock('ioredis');
import Redis from 'ioredis';

describe('CacheService', () => {
  let service: CacheService;
  let configService: ConfigService;
  let mockLocalCache: jest.Mocked<NodeCache>;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(async () => {
    // Setup mocks
    mockLocalCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      has: jest.fn(),
      keys: jest.fn().mockReturnValue([]),
      flushAll: jest.fn(),
      getStats: jest.fn().mockReturnValue({ hits: 0, misses: 0, keys: 0, ksize: 0, vsize: 0 }),
      close: jest.fn(),
      on: jest.fn(),
    } as any;

    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      scan: jest.fn(),
      flushdb: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
    } as any;

    // Mock constructors
    (NodeCache as jest.MockedClass<typeof NodeCache>).mockImplementation(() => mockLocalCache);
    (Redis as any).mockImplementation(() => mockRedis);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('应该从L1缓存获取数据', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test' };
      mockLocalCache.get.mockReturnValue(JSON.stringify(value));

      // Act
      const result = await service.get(key);

      // Assert
      expect(result).toEqual(value);
      expect(mockLocalCache.get).toHaveBeenCalledWith(key);
      expect(mockRedis.get).not.toHaveBeenCalled(); // L1命中，不查L2
    });

    it('应该从L2缓存获取数据并回填L1', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test' };
      mockLocalCache.get.mockReturnValue(undefined); // L1 miss
      mockRedis.get.mockResolvedValue(JSON.stringify(value)); // L2 hit

      // Act
      const result = await service.get(key);

      // Assert
      expect(result).toEqual(value);
      expect(mockLocalCache.get).toHaveBeenCalledWith(key);
      expect(mockRedis.get).toHaveBeenCalledWith(key);
      expect(mockLocalCache.set).toHaveBeenCalled(); // 回填L1
    });

    it('应该在两级缓存都未命中时返回null', async () => {
      // Arrange
      const key = 'test:key';
      mockLocalCache.get.mockReturnValue(undefined);
      mockRedis.get.mockResolvedValue(null);

      // Act
      const result = await service.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('应该只从L1获取数据（指定layer）', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test' };
      mockLocalCache.get.mockReturnValue(JSON.stringify(value));

      // Act
      const result = await service.get(key, { layer: CacheLayer.L1_ONLY });

      // Assert
      expect(result).toEqual(value);
      expect(mockLocalCache.get).toHaveBeenCalled();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('应该只从L2获取数据（指定layer）', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(value));

      // Act
      const result = await service.get(key, { layer: CacheLayer.L2_ONLY });

      // Assert
      expect(result).toEqual(value);
      expect(mockLocalCache.get).not.toHaveBeenCalled();
      expect(mockRedis.get).toHaveBeenCalled();
    });

    it('应该正确处理空值标记', async () => {
      // Arrange
      const key = 'test:key';
      mockLocalCache.get.mockReturnValue('__NULL__');

      // Act
      const result = await service.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('应该在错误时返回null', async () => {
      // Arrange
      const key = 'test:key';
      mockLocalCache.get.mockImplementation(() => {
        throw new Error('Cache error');
      });

      // Act
      const result = await service.get(key);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('应该设置L1和L2缓存', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test' };
      const ttl = 60;
      mockRedis.setex.mockResolvedValue('OK');

      // Act
      const result = await service.set(key, value, { ttl });

      // Assert
      expect(result).toBe(true);
      expect(mockLocalCache.set).toHaveBeenCalledWith(key, JSON.stringify(value), ttl);
      expect(mockRedis.setex).toHaveBeenCalledWith(key, ttl, JSON.stringify(value));
    });

    it('应该只设置L1缓存（指定layer）', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test' };
      const ttl = 60;

      // Act
      const result = await service.set(key, value, { ttl, layer: CacheLayer.L1_ONLY });

      // Assert
      expect(result).toBe(true);
      expect(mockLocalCache.set).toHaveBeenCalled();
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('应该只设置L2缓存（指定layer）', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test' };
      const ttl = 60;
      mockRedis.setex.mockResolvedValue('OK');

      // Act
      const result = await service.set(key, value, { ttl, layer: CacheLayer.L2_ONLY });

      // Assert
      expect(result).toBe(true);
      expect(mockLocalCache.set).not.toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('应该缓存null值', async () => {
      // Arrange
      const key = 'test:key';
      const value = null;
      const ttl = 60;
      mockRedis.setex.mockResolvedValue('OK');

      // Act
      const result = await service.set(key, value, { ttl });

      // Assert
      expect(result).toBe(true);
      expect(mockLocalCache.set).toHaveBeenCalledWith(key, '__NULL__', ttl);
      expect(mockRedis.setex).toHaveBeenCalledWith(key, ttl, '__NULL__');
    });

    it('应该在错误时返回false', async () => {
      // Arrange
      const key = 'test:key';
      const value = { data: 'test' };
      mockLocalCache.set.mockImplementation(() => {
        throw new Error('Cache error');
      });

      // Act
      const result = await service.set(key, value);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('del', () => {
    it('应该删除单个key', async () => {
      // Arrange
      const key = 'test:key';
      mockRedis.del.mockResolvedValue(1);

      // Act
      const result = await service.del(key);

      // Assert
      expect(result).toBe(true);
      expect(mockLocalCache.del).toHaveBeenCalledWith(key);
      expect(mockRedis.del).toHaveBeenCalledWith(key);
    });

    it('应该批量删除多个keys', async () => {
      // Arrange
      const keys = ['test:key1', 'test:key2', 'test:key3'];
      mockRedis.del.mockResolvedValue(3);

      // Act
      const result = await service.del(keys);

      // Assert
      expect(result).toBe(true);
      keys.forEach((key) => {
        expect(mockLocalCache.del).toHaveBeenCalledWith(key);
      });
      expect(mockRedis.del).toHaveBeenCalledWith(...keys);
    });

    it('应该在错误时返回false', async () => {
      // Arrange
      const key = 'test:key';
      mockRedis.del.mockRejectedValue(new Error('Delete error'));

      // Act
      const result = await service.del(key);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('delayedDoubleDel', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('应该执行延迟双删', async () => {
      // Arrange
      const key = 'test:key';
      const delayMs = 500;
      mockRedis.del.mockResolvedValue(1);

      // Act
      await service.delayedDoubleDel(key, delayMs);

      // Assert - 第一次删除
      expect(mockLocalCache.del).toHaveBeenCalledTimes(1);
      expect(mockRedis.del).toHaveBeenCalledTimes(1);

      // 快进时间
      jest.advanceTimersByTime(delayMs);
      await Promise.resolve(); // 等待异步操作

      // Assert - 第二次删除
      expect(mockLocalCache.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('delPattern', () => {
    it('应该删除匹配模式的keys', async () => {
      // Arrange
      const pattern = 'user:*';
      mockLocalCache.keys.mockReturnValue(['user:1', 'user:2', 'role:1']);
      mockRedis.scan.mockResolvedValue(['0', ['user:1', 'user:2']]);
      mockRedis.del.mockResolvedValue(2);

      // Act
      const result = await service.delPattern(pattern);

      // Assert
      expect(result).toBeGreaterThan(0);
      expect(mockLocalCache.del).toHaveBeenCalledWith('user:1');
      expect(mockLocalCache.del).toHaveBeenCalledWith('user:2');
      expect(mockLocalCache.del).not.toHaveBeenCalledWith('role:1');
    });

    it('应该处理多次scan', async () => {
      // Arrange
      const pattern = 'user:*';
      mockLocalCache.keys.mockReturnValue([]);
      mockRedis.scan
        .mockResolvedValueOnce(['1', ['user:1', 'user:2']])
        .mockResolvedValueOnce(['0', ['user:3']]);
      mockRedis.del.mockResolvedValue(3);

      // Act
      const result = await service.delPattern(pattern);

      // Assert
      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledTimes(2);
    });

    it('应该在错误时返回0', async () => {
      // Arrange
      const pattern = 'user:*';
      mockLocalCache.keys.mockImplementation(() => {
        throw new Error('Keys error');
      });

      // Act
      const result = await service.delPattern(pattern);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('exists', () => {
    it('应该检查L1缓存存在', async () => {
      // Arrange
      const key = 'test:key';
      mockLocalCache.has.mockReturnValue(true);

      // Act
      const result = await service.exists(key);

      // Assert
      expect(result).toBe(true);
      expect(mockLocalCache.has).toHaveBeenCalledWith(key);
      expect(mockRedis.exists).not.toHaveBeenCalled();
    });

    it('应该检查L2缓存存在', async () => {
      // Arrange
      const key = 'test:key';
      mockLocalCache.has.mockReturnValue(false);
      mockRedis.exists.mockResolvedValue(1);

      // Act
      const result = await service.exists(key);

      // Assert
      expect(result).toBe(true);
      expect(mockLocalCache.has).toHaveBeenCalled();
      expect(mockRedis.exists).toHaveBeenCalledWith(key);
    });

    it('应该在两级缓存都不存在时返回false', async () => {
      // Arrange
      const key = 'test:key';
      mockLocalCache.has.mockReturnValue(false);
      mockRedis.exists.mockResolvedValue(0);

      // Act
      const result = await service.exists(key);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getOrSet', () => {
    it('应该返回缓存值（缓存命中）', async () => {
      // Arrange
      const key = 'test:key';
      const cachedValue = { data: 'cached' };
      mockLocalCache.get.mockReturnValue(JSON.stringify(cachedValue));
      const factory = jest.fn();

      // Act
      const result = await service.getOrSet(key, factory);

      // Assert
      expect(result).toEqual(cachedValue);
      expect(factory).not.toHaveBeenCalled(); // 缓存命中，不调用factory
    });

    it('应该调用factory并缓存结果（缓存未命中）', async () => {
      // Arrange
      const key = 'test:key';
      const factoryValue = { data: 'factory' };
      mockLocalCache.get.mockReturnValue(undefined);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      const factory = jest.fn().mockResolvedValue(factoryValue);

      // Act
      const result = await service.getOrSet(key, factory, { ttl: 60 });

      // Assert
      expect(result).toEqual(factoryValue);
      expect(factory).toHaveBeenCalled();
      expect(mockLocalCache.set).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('应该缓存null值（防止缓存穿透）', async () => {
      // Arrange
      const key = 'test:key';
      mockLocalCache.get.mockReturnValue(undefined);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      const factory = jest.fn().mockResolvedValue(null);

      // Act
      const result = await service.getOrSet(key, factory);

      // Assert
      expect(result).toBeNull();
      expect(factory).toHaveBeenCalled();
      expect(mockLocalCache.set).toHaveBeenCalledWith(key, '__NULL__', expect.any(Number));
    });

    it('应该在factory错误时返回null', async () => {
      // Arrange
      const key = 'test:key';
      mockLocalCache.get.mockReturnValue(undefined);
      mockRedis.get.mockResolvedValue(null);
      const factory = jest.fn().mockRejectedValue(new Error('Factory error'));

      // Act
      const result = await service.getOrSet(key, factory);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('flush', () => {
    it('应该清空所有缓存', async () => {
      // Arrange
      mockRedis.flushdb.mockResolvedValue('OK');

      // Act
      await service.flush();

      // Assert
      expect(mockLocalCache.flushAll).toHaveBeenCalled();
      expect(mockRedis.flushdb).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('应该返回缓存统计信息', () => {
      // Act
      const stats = service.getStats();

      // Assert
      expect(stats).toHaveProperty('l1');
      expect(stats).toHaveProperty('l2');
      expect(stats).toHaveProperty('total');
      expect(stats.l1).toHaveProperty('hits');
      expect(stats.l1).toHaveProperty('hitRate');
      expect(stats.l2).toHaveProperty('hits');
      expect(stats.l2).toHaveProperty('hitRate');
      expect(stats.total).toHaveProperty('hits');
      expect(stats.total).toHaveProperty('misses');
      expect(stats.total).toHaveProperty('sets');
      expect(stats.total).toHaveProperty('hitRate');
    });
  });

  describe('resetStats', () => {
    it('应该重置统计信息', () => {
      // Act
      service.resetStats();
      const stats = service.getStats();

      // Assert
      expect(stats.l1.hits).toBe(0);
      expect(stats.l2.hits).toBe(0);
      expect(stats.total.misses).toBe(0);
      expect(stats.total.sets).toBe(0);
    });
  });

  describe('onModuleDestroy', () => {
    it('应该清理连接', async () => {
      // Arrange
      mockRedis.quit.mockResolvedValue('OK');

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(mockRedis.quit).toHaveBeenCalled();
      expect(mockLocalCache.close).toHaveBeenCalled();
    });
  });
});
