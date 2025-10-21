export interface CacheConfig {
  // Redis 配置
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };

  // 本地缓存配置
  local: {
    stdTTL: number; // 默认 TTL (秒)
    checkperiod: number; // 检查过期间隔 (秒)
    maxKeys: number; // 最大键数量
    useClones: boolean; // 是否克隆对象
  };

  // 缓存策略
  strategy: {
    // 缓存雪崩防护: 随机 TTL 范围 (0-30秒)
    randomTTLRange: number;

    // 缓存穿透防护: 空值缓存 TTL (秒)
    nullValueTTL: number;

    // 热点数据前缀 (永不过期)
    hotDataPrefixes: string[];
  };
}

export const defaultCacheConfig: CacheConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '1', 10),
  },
  local: {
    stdTTL: 60, // 1分钟
    checkperiod: 120, // 2分钟检查一次
    maxKeys: 1000,
    useClones: false, // 性能优化: 不克隆
  },
  strategy: {
    randomTTLRange: 30, // 0-30秒随机
    nullValueTTL: 60, // 空值缓存1分钟
    hotDataPrefixes: ['user:', 'plan:', 'config:'], // 热点数据前缀
  },
};
