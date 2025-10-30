import { Test, TestingModule } from '@nestjs/testing';
import { DistributedLockService } from './distributed-lock.service';
import { Redis } from 'ioredis';

describe('DistributedLockService', () => {
  let service: DistributedLockService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(async () => {
    // Mock Redis
    mockRedis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      eval: jest.fn(),
      exists: jest.fn(),
      pttl: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributedLockService,
        {
          provide: Redis,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<DistributedLockService>(DistributedLockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('构造和初始化', () => {
    it('应该成功创建服务实例', () => {
      expect(service).toBeDefined();
    });
  });

  describe('acquireLock', () => {
    it('应该成功获取锁', async () => {
      // Arrange
      mockRedis.set.mockResolvedValue('OK' as any);

      // Act
      const lockId = await service.acquireLock('resource:123', 5000);

      // Assert
      expect(lockId).toBeDefined();
      expect(typeof lockId).toBe('string');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'lock:resource:123',
        expect.any(String), // UUID
        'PX',
        5000,
        'NX',
      );
    });

    it('应该在锁被占用时重试', async () => {
      // Arrange - First 2 attempts fail, 3rd succeeds
      mockRedis.set
        .mockResolvedValueOnce(null as any) // First attempt fails
        .mockResolvedValueOnce(null as any) // Second attempt fails
        .mockResolvedValueOnce('OK' as any); // Third attempt succeeds

      mockRedis.get.mockResolvedValue('existing-lock-id'); // Lock is held

      // Act
      const lockId = await service.acquireLock('resource:123', 5000, 2, 10);

      // Assert
      expect(lockId).toBeDefined();
      expect(mockRedis.set).toHaveBeenCalledTimes(3);
    }, 10000);

    it('应该在达到最大重试次数后抛出错误', async () => {
      // Arrange
      mockRedis.set.mockResolvedValue(null as any); // Always fails
      mockRedis.get.mockResolvedValue('existing-lock-id');

      // Act & Assert
      await expect(
        service.acquireLock('resource:123', 5000, 2, 10),
      ).rejects.toThrow("Failed to acquire lock 'resource:123' after 3 attempts");

      expect(mockRedis.set).toHaveBeenCalledTimes(3); // Initial + 2 retries
    }, 10000);

    it('应该处理 Redis 错误并重试', async () => {
      // Arrange
      mockRedis.set
        .mockRejectedValueOnce(new Error('Redis connection error'))
        .mockResolvedValueOnce('OK' as any);

      // Act
      const lockId = await service.acquireLock('resource:123', 5000, 2, 10);

      // Assert
      expect(lockId).toBeDefined();
      expect(mockRedis.set).toHaveBeenCalledTimes(2);
    }, 10000);

    it('应该使用正确的锁键前缀', async () => {
      // Arrange
      mockRedis.set.mockResolvedValue('OK' as any);

      // Act
      await service.acquireLock('user:456:login', 5000);

      // Assert
      expect(mockRedis.set).toHaveBeenCalledWith(
        'lock:user:456:login', // Prefixed with 'lock:'
        expect.any(String),
        'PX',
        5000,
        'NX',
      );
    });
  });

  describe('releaseLock', () => {
    it('应该成功释放锁', async () => {
      // Arrange
      const lockId = 'test-lock-id-123';
      mockRedis.eval.mockResolvedValue(1 as any); // Lock released successfully

      // Act
      const result = await service.releaseLock('resource:123', lockId);

      // Assert
      expect(result).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call("get", KEYS[1])'),
        1,
        'lock:resource:123',
        lockId,
      );
    });

    it('应该在锁不存在或不匹配时返回 false', async () => {
      // Arrange
      const lockId = 'test-lock-id-123';
      mockRedis.eval.mockResolvedValue(0 as any); // Lock not found or doesn't match

      // Act
      const result = await service.releaseLock('resource:123', lockId);

      // Assert
      expect(result).toBe(false);
    });

    it('应该处理释放锁时的 Redis 错误', async () => {
      // Arrange
      const lockId = 'test-lock-id-123';
      mockRedis.eval.mockRejectedValue(new Error('Redis error'));

      // Act
      const result = await service.releaseLock('resource:123', lockId);

      // Assert
      expect(result).toBe(false);
    });

    it('应该使用 Lua 脚本确保原子性', async () => {
      // Arrange
      const lockId = 'test-lock-id-123';
      mockRedis.eval.mockResolvedValue(1 as any);

      // Act
      await service.releaseLock('resource:123', lockId);

      // Assert
      const luaScript = (mockRedis.eval as jest.Mock).mock.calls[0][0];
      expect(luaScript).toContain('redis.call("get", KEYS[1])');
      expect(luaScript).toContain('redis.call("del", KEYS[1])');
    });
  });

  describe('withLock', () => {
    it('应该在锁内执行函数并返回结果', async () => {
      // Arrange
      mockRedis.set.mockResolvedValue('OK' as any);
      mockRedis.eval.mockResolvedValue(1 as any);

      const mockFn = jest.fn().mockResolvedValue('function result');

      // Act
      const result = await service.withLock('resource:123', 5000, mockFn);

      // Assert
      expect(result).toBe('function result');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).toHaveBeenCalled(); // Lock acquired
      expect(mockRedis.eval).toHaveBeenCalled(); // Lock released
    });

    it('应该在函数抛出异常后仍然释放锁', async () => {
      // Arrange
      mockRedis.set.mockResolvedValue('OK' as any);
      mockRedis.eval.mockResolvedValue(1 as any);

      const mockFn = jest.fn().mockRejectedValue(new Error('Function error'));

      // Act & Assert
      await expect(
        service.withLock('resource:123', 5000, mockFn),
      ).rejects.toThrow('Function error');

      // Lock should still be released
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('应该传递函数的返回值', async () => {
      // Arrange
      mockRedis.set.mockResolvedValue('OK' as any);
      mockRedis.eval.mockResolvedValue(1 as any);

      const complexResult = { data: [1, 2, 3], status: 'success' };
      const mockFn = jest.fn().mockResolvedValue(complexResult);

      // Act
      const result = await service.withLock('resource:123', 5000, mockFn);

      // Assert
      expect(result).toEqual(complexResult);
    });
  });

  describe('tryAcquireLock', () => {
    it('应该成功获取锁（非阻塞）', async () => {
      // Arrange
      mockRedis.set.mockResolvedValue('OK' as any);

      // Act
      const lockId = await service.tryAcquireLock('resource:123', 5000);

      // Assert
      expect(lockId).toBeDefined();
      expect(typeof lockId).toBe('string');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'lock:resource:123',
        expect.any(String),
        'PX',
        5000,
        'NX',
      );
    });

    it('应该在锁被占用时立即返回 null', async () => {
      // Arrange
      mockRedis.set.mockResolvedValue(null as any); // Lock is busy

      // Act
      const lockId = await service.tryAcquireLock('resource:123', 5000);

      // Assert
      expect(lockId).toBeNull();
      expect(mockRedis.set).toHaveBeenCalledTimes(1); // No retries
    });

    it('应该处理 Redis 错误并返回 null', async () => {
      // Arrange
      mockRedis.set.mockRejectedValue(new Error('Redis error'));

      // Act
      const lockId = await service.tryAcquireLock('resource:123', 5000);

      // Assert
      expect(lockId).toBeNull();
    });
  });

  describe('isLocked', () => {
    it('应该返回 true 如果锁存在', async () => {
      // Arrange
      mockRedis.exists.mockResolvedValue(1);

      // Act
      const result = await service.isLocked('resource:123');

      // Assert
      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('lock:resource:123');
    });

    it('应该返回 false 如果锁不存在', async () => {
      // Arrange
      mockRedis.exists.mockResolvedValue(0);

      // Act
      const result = await service.isLocked('resource:123');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getLockTTL', () => {
    it('应该返回锁的剩余过期时间', async () => {
      // Arrange
      mockRedis.pttl.mockResolvedValue(3000); // 3 seconds remaining

      // Act
      const ttl = await service.getLockTTL('resource:123');

      // Assert
      expect(ttl).toBe(3000);
      expect(mockRedis.pttl).toHaveBeenCalledWith('lock:resource:123');
    });

    it('应该返回 -1 如果锁不存在', async () => {
      // Arrange
      mockRedis.pttl.mockResolvedValue(-2); // Key doesn't exist

      // Act
      const ttl = await service.getLockTTL('resource:123');

      // Assert
      expect(ttl).toBe(-2);
    });
  });

  describe('extendLock', () => {
    it('应该成功延长锁的过期时间', async () => {
      // Arrange
      const lockId = 'test-lock-id-123';
      mockRedis.eval.mockResolvedValue(1 as any);

      // Act
      const result = await service.extendLock('resource:123', lockId, 10000);

      // Assert
      expect(result).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('pexpire'),
        1,
        'lock:resource:123',
        lockId,
        '10000',
      );
    });

    it('应该在锁不匹配时返回 false', async () => {
      // Arrange
      const lockId = 'wrong-lock-id';
      mockRedis.eval.mockResolvedValue(0 as any);

      // Act
      const result = await service.extendLock('resource:123', lockId, 10000);

      // Assert
      expect(result).toBe(false);
    });

    it('应该处理延长锁时的 Redis 错误', async () => {
      // Arrange
      const lockId = 'test-lock-id-123';
      mockRedis.eval.mockRejectedValue(new Error('Redis error'));

      // Act
      const result = await service.extendLock('resource:123', lockId, 10000);

      // Assert
      expect(result).toBe(false);
    });

    it('应该使用 Lua 脚本确保原子性', async () => {
      // Arrange
      const lockId = 'test-lock-id-123';
      mockRedis.eval.mockResolvedValue(1 as any);

      // Act
      await service.extendLock('resource:123', lockId, 10000);

      // Assert
      const luaScript = (mockRedis.eval as jest.Mock).mock.calls[0][0];
      expect(luaScript).toContain('redis.call("get", KEYS[1])');
      expect(luaScript).toContain('redis.call("pexpire", KEYS[1]');
    });
  });

  describe('forceReleaseLock', () => {
    it('应该强制释放锁', async () => {
      // Arrange
      mockRedis.del.mockResolvedValue(1);

      // Act
      const result = await service.forceReleaseLock('resource:123');

      // Assert
      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('lock:resource:123');
    });

    it('应该在锁不存在时返回 false', async () => {
      // Arrange
      mockRedis.del.mockResolvedValue(0);

      // Act
      const result = await service.forceReleaseLock('resource:123');

      // Assert
      expect(result).toBe(false);
    });

    it('应该处理强制释放时的 Redis 错误', async () => {
      // Arrange
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      // Act
      const result = await service.forceReleaseLock('resource:123');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('锁键生成', () => {
    it('应该为不同资源生成不同的锁键', async () => {
      // Arrange
      mockRedis.set.mockResolvedValue('OK' as any);

      // Act
      await service.acquireLock('user:123', 5000);
      await service.acquireLock('order:456', 5000);

      // Assert
      expect(mockRedis.set).toHaveBeenNthCalledWith(
        1,
        'lock:user:123',
        expect.any(String),
        'PX',
        5000,
        'NX',
      );
      expect(mockRedis.set).toHaveBeenNthCalledWith(
        2,
        'lock:order:456',
        expect.any(String),
        'PX',
        5000,
        'NX',
      );
    });
  });

  describe('并发锁场景', () => {
    it('应该防止并发获取同一锁', async () => {
      // Arrange
      let lockAcquired = false;
      mockRedis.set.mockImplementation(async () => {
        if (lockAcquired) {
          return null; // Lock already held
        }
        lockAcquired = true;
        return 'OK';
      });

      // Act
      const [lockId1, lockId2] = await Promise.all([
        service.tryAcquireLock('resource:123', 5000),
        service.tryAcquireLock('resource:123', 5000),
      ]);

      // Assert - Only one should succeed
      const successCount = [lockId1, lockId2].filter((id) => id !== null).length;
      expect(successCount).toBe(1);
    });
  });

  describe('日志记录', () => {
    it('应该记录成功获取锁的日志', async () => {
      // Arrange
      mockRedis.set.mockResolvedValue('OK' as any);
      const loggerSpy = jest.spyOn(service['logger'], 'debug');

      // Act
      await service.acquireLock('resource:123', 5000);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Lock acquired'),
      );
    });

    it('应该记录重试日志', async () => {
      // Arrange
      mockRedis.set
        .mockResolvedValueOnce(null as any)
        .mockResolvedValueOnce('OK' as any);
      mockRedis.get.mockResolvedValue('existing-lock-id');

      const loggerSpy = jest.spyOn(service['logger'], 'debug');

      // Act
      await service.acquireLock('resource:123', 5000, 1, 10);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('retrying'),
      );
    }, 10000);
  });
});
