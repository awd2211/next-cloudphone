import Redis from 'ioredis';

/**
 * 创建测试 Redis 客户端
 */
export function createTestRedisClient(): Redis {
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6380'),
    db: 1, // 使用不同的数据库编号，避免影响开发环境
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 50, 2000);
    },
  });
}

/**
 * 清理 Redis 测试数据
 */
export async function cleanRedis(redis: Redis): Promise<void> {
  await redis.flushdb();
}

/**
 * 关闭 Redis 连接
 */
export async function closeRedis(redis: Redis): Promise<void> {
  if (redis.status === 'ready') {
    await redis.quit();
  }
}

/**
 * 等待 Redis 连接就绪
 */
export async function waitForRedis(redis: Redis, timeoutMs = 5000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      await redis.connect();
      const pong = await redis.ping();
      if (pong === 'PONG') {
        return;
      }
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  throw new Error('Redis connection timeout');
}
