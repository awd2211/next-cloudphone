import {
  createTestRedisClient,
  cleanRedis,
  closeRedis,
  waitForRedis,
} from '../helpers/test-redis.helper';
import Redis from 'ioredis';

describe('Redis Integration Tests', () => {
  let redisClient: Redis;

  beforeAll(async () => {
    // 创建真实的 Redis 连接
    redisClient = createTestRedisClient();
    await waitForRedis(redisClient);
  });

  beforeEach(async () => {
    await cleanRedis(redisClient);
  });

  afterAll(async () => {
    await closeRedis(redisClient);
  });

  describe('Basic Operations', () => {
    it('should set and get value from real Redis', async () => {
      // Arrange
      const key = 'test:key';
      const value = JSON.stringify({ name: 'Test', count: 123 });

      // Act
      await redisClient.set(key, value);
      const result = await redisClient.get(key);

      // Assert
      expect(result).toBe(value);
      expect(JSON.parse(result!)).toEqual({ name: 'Test', count: 123 });
    });

    it('should handle string values', async () => {
      // Arrange
      const key = 'test:string';
      const value = 'Hello Redis';

      // Act
      await redisClient.set(key, value);
      const result = await redisClient.get(key);

      // Assert
      expect(result).toBe(value);
    });

    it('should return null for non-existent key', async () => {
      // Act
      const result = await redisClient.get('non:existent:key');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire key after TTL', async () => {
      // Arrange
      const key = 'test:expire';
      const value = 'Will expire';

      // Act
      await redisClient.set(key, value, 'EX', 1); // 1 second TTL
      const immediate = await redisClient.get(key);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      const afterExpire = await redisClient.get(key);

      // Assert
      expect(immediate).toBe(value);
      expect(afterExpire).toBeNull();
    });

    it('should verify TTL is set correctly', async () => {
      // Arrange
      const key = 'test:ttl-verify';
      const value = 'Test';
      const ttl = 3600;

      // Act
      await redisClient.set(key, value, 'EX', ttl);
      const redisTTL = await redisClient.ttl(key);

      // Assert
      expect(redisTTL).toBeGreaterThan(3500); // 允许少量误差
      expect(redisTTL).toBeLessThanOrEqual(3600);
    });
  });

  describe('Delete Operations', () => {
    it('should delete key from Redis', async () => {
      // Arrange
      const key = 'test:delete';
      await redisClient.set(key, 'Delete me');

      // Act
      await redisClient.del(key);
      const result = await redisClient.get(key);

      // Assert
      expect(result).toBeNull();

      // 验证 Redis 中确实被删除
      const exists = await redisClient.exists(key);
      expect(exists).toBe(0);
    });

    it('should delete all keys matching pattern', async () => {
      // Arrange
      await redisClient.set('user:123:profile', JSON.stringify({ name: 'User 123' }));
      await redisClient.set('user:123:settings', JSON.stringify({ theme: 'dark' }));
      await redisClient.set('user:456:profile', JSON.stringify({ name: 'User 456' }));
      await redisClient.set('device:789:info', JSON.stringify({ status: 'online' }));

      // Act
      const keys = await redisClient.keys('user:123:*');
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }

      // Assert
      const profile = await redisClient.get('user:123:profile');
      const settings = await redisClient.get('user:123:settings');
      const user456 = await redisClient.get('user:456:profile');
      const device = await redisClient.get('device:789:info');

      expect(profile).toBeNull();
      expect(settings).toBeNull();
      expect(user456).not.toBeNull();
      expect(device).not.toBeNull();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent set operations', async () => {
      // Arrange
      const operations = Array.from({ length: 100 }, (_, i) => ({
        key: `concurrent:${i}`,
        value: `value-${i}`,
      }));

      // Act
      await Promise.all(
        operations.map(op => redisClient.set(op.key, op.value)),
      );

      // Assert
      const results = await Promise.all(
        operations.map(op => redisClient.get(op.key)),
      );

      results.forEach((result, i) => {
        expect(result).toBe(`value-${i}`);
      });
    });

    it('should handle concurrent get operations', async () => {
      // Arrange
      await redisClient.set('concurrent:read', 'shared-value');

      // Act - 100个并发读取
      const results = await Promise.all(
        Array.from({ length: 100 }, () => redisClient.get('concurrent:read')),
      );

      // Assert
      results.forEach(result => {
        expect(result).toBe('shared-value');
      });
    });
  });

  describe('Large Data Handling', () => {
    it('should handle large objects', async () => {
      // Arrange
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: `Item ${i}`,
        timestamp: Date.now(),
      }));
      const key = 'test:large:data';

      // Act
      await redisClient.set(key, JSON.stringify(largeArray));
      const result = await redisClient.get(key);

      // Assert
      expect(JSON.parse(result!)).toEqual(largeArray);
      expect(JSON.parse(result!)).toHaveLength(10000);
    });

    it('should handle large strings', async () => {
      // Arrange
      const largeString = 'x'.repeat(1000000); // 1MB string
      const key = 'test:large:string';

      // Act
      await redisClient.set(key, largeString);
      const result = await redisClient.get(key);

      // Assert
      expect(result).toBe(largeString);
      expect(result!.length).toBe(1000000);
    });
  });

  describe('Database Operations', () => {
    it('should clear entire Redis database', async () => {
      // Arrange
      await redisClient.set('key1', 'value1');
      await redisClient.set('key2', 'value2');
      await redisClient.set('key3', 'value3');

      // Act
      await redisClient.flushdb();

      // Assert
      const key1 = await redisClient.get('key1');
      const key2 = await redisClient.get('key2');
      const key3 = await redisClient.get('key3');

      expect(key1).toBeNull();
      expect(key2).toBeNull();
      expect(key3).toBeNull();

      // 验证 Redis 数据库确实为空
      const dbSize = await redisClient.dbsize();
      expect(dbSize).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should complete 1000 operations within reasonable time', async () => {
      // Arrange
      const startTime = Date.now();
      const operations = 1000;

      // Act
      await Promise.all(
        Array.from({ length: operations }, (_, i) =>
          redisClient.set(`perf:${i}`, `value-${i}`),
        ),
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert - 1000次操作应该在5秒内完成
      expect(duration).toBeLessThan(5000);
      console.log(`✓ 1000 Redis operations completed in ${duration}ms`);
    });
  });

  describe('Connection Health', () => {
    it('should maintain connection and respond to ping', async () => {
      // Act
      const pong = await redisClient.ping();

      // Assert
      expect(pong).toBe('PONG');
    });

    it('should report connection status', async () => {
      // Assert
      expect(redisClient.status).toBe('ready');
    });
  });
});
