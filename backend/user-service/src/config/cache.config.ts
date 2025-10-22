import { registerAs } from '@nestjs/config';

/**
 * 缓存配置
 *
 * 使用 registerAs 注册命名空间配置
 * 可通过 ConfigService.get('cache.redis.host') 访问
 */
export default registerAs('cache', () => ({
  // Redis 配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '1', 10),
  },

  // 本地缓存配置
  local: {
    stdTTL: parseInt(process.env.CACHE_LOCAL_TTL || '300', 10), // 默认 5 分钟
    checkperiod: parseInt(process.env.CACHE_CHECK_PERIOD || '120', 10), // 2 分钟检查一次
    maxKeys: parseInt(process.env.CACHE_MAX_KEYS || '2000', 10), // 最多 2000 个键
    useClones: process.env.CACHE_USE_CLONES === 'true' ? true : false, // 默认不克隆
  },

  // 缓存策略
  strategy: {
    // 缓存雪崩防护: 随机 TTL 范围
    randomTTLRange: parseInt(process.env.CACHE_RANDOM_TTL_RANGE || '60', 10),

    // 缓存穿透防护: 空值缓存 TTL
    nullValueTTL: parseInt(process.env.CACHE_NULL_VALUE_TTL || '120', 10),

    // 热点数据前缀 (永不过期)
    hotDataPrefixes: (process.env.CACHE_HOT_PREFIXES || 'user:,role:,permission:,plan:,config:,device:')
      .split(',')
      .map(p => p.trim()),
  },
}));
