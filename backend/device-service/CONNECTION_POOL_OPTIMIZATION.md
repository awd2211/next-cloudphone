# 数据库连接池优化配置

本文档展示如何优化 PostgreSQL 和 Redis 的连接池配置，提升并发性能和资源利用率。

---

## 1. TypeORM 连接池配置

### 基础配置

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_DATABASE || 'cloudphone_device',

      // ========== 连接池配置 ==========
      extra: {
        // 最大连接数 (默认 10)
        // 公式: max = (CPU 核心数 × 2) + 有效磁盘数
        // 示例: 8 核 CPU + 1 SSD = 8 × 2 + 1 = 17 ≈ 20
        max: 20,

        // 最小连接数 (保持活跃，避免冷启动)
        min: 5,

        // 空闲连接超时 (毫秒)
        // 超过此时间未使用的连接会被释放
        idleTimeoutMillis: 30000, // 30 秒

        // 连接超时 (毫秒)
        // 等待可用连接的最大时间
        connectionTimeoutMillis: 5000, // 5 秒

        // SQL 执行超时 (毫秒)
        // 防止慢查询占用连接
        statement_timeout: 30000, // 30 秒
        query_timeout: 30000,

        // 连接复用
        application_name: 'device-service',
      },

      // ========== 查询性能优化 ==========
      logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
      maxQueryExecutionTime: 1000, // 记录 >1s 的慢查询

      // ========== 实体缓存 (可选) ==========
      cache: {
        type: 'redis',
        options: {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT),
        },
        duration: 60000, // 缓存 1 分钟
      },
    }),
  ],
})
export class AppModule {}
```

---

## 2. 连接池大小计算

### 公式

```
max_connections = (CPU 核心数 × 2) + 有效磁盘数
```

### 示例场景

| 服务器配置 | CPU 核心数 | 磁盘数 | 推荐最大连接数 |
|-----------|-----------|-------|---------------|
| 小型服务器 | 4 核 | 1 SSD | 4 × 2 + 1 = **9** |
| 中型服务器 | 8 核 | 1 SSD | 8 × 2 + 1 = **17** |
| 大型服务器 | 16 核 | 2 SSD | 16 × 2 + 2 = **34** |

### 多服务场景

如果有 3 个服务连接同一个数据库:
```
每服务最大连接数 = 总连接数 / 服务数
                  = 20 / 3
                  ≈ 6-7
```

**配置**:
```typescript
extra: {
  max: 7,  // 每服务最多 7 个连接
  min: 2,  // 每服务保持 2 个连接活跃
}
```

---

## 3. Redis 连接池配置

### cache-manager-redis-yet 配置

```typescript
// cache.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,

            // 连接超时
            connectTimeout: 5000,

            // 重连策略
            reconnectStrategy: (retries) => {
              if (retries > 10) {
                console.error('[Redis] Max retries reached, giving up');
                return new Error('Max retries reached');
              }
              // 指数退避: 100ms, 200ms, 400ms, 800ms...
              const delay = Math.min(retries * 100, 3000);
              console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${retries})`);
              return delay;
            },
          },

          // ========== 连接池配置 ==========
          // Redis 客户端默认使用单连接，但可以配置多个
          connectionName: 'device-service-cache',

          // 懒加载连接 (首次使用时才连接)
          lazyConnect: false,

          // ========== 性能优化 ==========
          // 启用准备检查
          enableReadyCheck: true,

          // 每个请求的最大重试次数
          maxRetriesPerRequest: 3,

          // 命令队列
          enableOfflineQueue: true,
        }),

        // 默认 TTL (毫秒)
        ttl: 60 * 1000, // 60 秒
      }),
    }),
  ],
  exports: [CacheModule],
})
export class CustomCacheModule {}
```

---

### IORedis 高级配置 (可选)

如果需要更高级的 Redis 配置，可以直接使用 `ioredis`:

```typescript
import { Module, Global } from '@nestjs/common';
import { Redis } from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        const redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,

          // ========== 连接池配置 ==========
          // Redis Cluster 模式下的连接池
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) return null;
            return Math.min(times * 100, 3000);
          },

          // 连接超时
          connectTimeout: 5000,

          // 保持连接活跃
          keepAlive: 30000,

          // ========== 性能优化 ==========
          // 启用离线队列
          enableOfflineQueue: true,

          // 启用准备检查
          enableReadyCheck: true,

          // 懒加载
          lazyConnect: false,

          // ========== 事件监听 ==========
          reconnectOnError: (err) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
              // 仅在特定错误时重连
              return true;
            }
            return false;
          },
        });

        redis.on('connect', () => {
          console.log('[Redis] Connected successfully');
        });

        redis.on('error', (err) => {
          console.error('[Redis] Connection error:', err);
        });

        redis.on('ready', () => {
          console.log('[Redis] Client ready');
        });

        redis.on('reconnecting', (delay) => {
          console.log(`[Redis] Reconnecting in ${delay}ms`);
        });

        return redis;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
```

---

## 4. 监控连接池状态

### PostgreSQL 连接数查询

```sql
-- 查看当前连接数
SELECT
  datname,
  count(*) as connections
FROM pg_stat_activity
WHERE datname IN ('cloudphone_device', 'cloudphone_user')
GROUP BY datname;

-- 查看连接详情
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  state_change,
  query
FROM pg_stat_activity
WHERE datname = 'cloudphone_device'
ORDER BY query_start DESC;

-- 查看最大连接数配置
SHOW max_connections;

-- 查看当前活跃连接数
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- 查看空闲连接数
SELECT count(*) FROM pg_stat_activity WHERE state = 'idle';
```

### 添加 Prometheus 监控

```typescript
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Gauge } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class DatabaseMetricsService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,

    @InjectMetric('db_connections_active')
    private activeConnectionsGauge: Gauge<string>,

    @InjectMetric('db_connections_idle')
    private idleConnectionsGauge: Gauge<string>,

    @InjectMetric('db_connections_total')
    private totalConnectionsGauge: Gauge<string>,
  ) {}

  @Cron('*/30 * * * * *') // 每 30 秒
  async updateConnectionMetrics() {
    try {
      const result = await this.dataSource.query(`
        SELECT
          count(*) FILTER (WHERE state = 'active') as active,
          count(*) FILTER (WHERE state = 'idle') as idle,
          count(*) as total
        FROM pg_stat_activity
        WHERE datname = current_database();
      `);

      const { active, idle, total } = result[0];

      this.activeConnectionsGauge.set(parseInt(active));
      this.idleConnectionsGauge.set(parseInt(idle));
      this.totalConnectionsGauge.set(parseInt(total));

      console.log(`[DB Metrics] Connections - Active: ${active}, Idle: ${idle}, Total: ${total}`);
    } catch (error) {
      console.error('[DB Metrics] Failed to update connection metrics:', error);
    }
  }
}
```

### 注册 Prometheus 指标

```typescript
// app.module.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
      customMetrics: [
        {
          name: 'db_connections_active',
          help: 'Number of active database connections',
          type: 'Gauge',
        },
        {
          name: 'db_connections_idle',
          help: 'Number of idle database connections',
          type: 'Gauge',
        },
        {
          name: 'db_connections_total',
          help: 'Total number of database connections',
          type: 'Gauge',
        },
      ],
    }),
  ],
})
export class AppModule {}
```

### 查询指标

```bash
# 访问 metrics 端点
curl http://localhost:30002/metrics | grep db_connections

# 输出示例:
# db_connections_active 3
# db_connections_idle 2
# db_connections_total 5
```

---

## 5. 常见问题和优化建议

### 问题 1: 连接耗尽

**症状**: `FATAL: sorry, too many clients already`

**原因**:
- 连接池配置过大
- 连接未正确释放
- 慢查询占用连接

**解决方法**:
1. 降低 `max` 连接数
2. 设置 `statement_timeout` 防止慢查询
3. 检查是否有连接泄漏

```typescript
// 设置合理的连接池大小
extra: {
  max: 10, // 降低最大连接数
  idleTimeoutMillis: 10000, // 更快释放空闲连接
  statement_timeout: 10000, // 10 秒超时
}
```

---

### 问题 2: 连接频繁创建/销毁

**症状**: 高 CPU 和网络开销

**原因**:
- `min` 连接数设置为 0
- `idleTimeoutMillis` 过短

**解决方法**:
```typescript
extra: {
  min: 5, // 保持 5 个连接活跃
  idleTimeoutMillis: 60000, // 延长空闲超时到 60 秒
}
```

---

### 问题 3: 连接超时

**症状**: `connect ETIMEDOUT`

**原因**:
- 数据库服务器过载
- 网络延迟
- 连接池已满

**解决方法**:
```typescript
extra: {
  connectionTimeoutMillis: 10000, // 增加连接超时到 10 秒
  max: 20, // 增加最大连接数
}
```

---

## 6. 性能调优建议

### 小型应用 (QPS < 100)

```typescript
extra: {
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
}
```

### 中型应用 (QPS 100-500)

```typescript
extra: {
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
}
```

### 大型应用 (QPS > 500)

```typescript
extra: {
  max: 50,
  min: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,

  // 启用 pgBouncer 连接池中间件
  // 见下方 pgBouncer 配置
}
```

---

## 7. 使用 pgBouncer (高级)

对于高并发场景，推荐使用 pgBouncer 作为连接池中间件。

### Docker Compose 配置

```yaml
services:
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      - DATABASES=cloudphone_device=host=postgres port=5432 dbname=cloudphone_device
      - POOL_MODE=transaction
      - MAX_CLIENT_CONN=1000
      - DEFAULT_POOL_SIZE=25
      - SERVER_IDLE_TIMEOUT=600
      - IGNORE_STARTUP_PARAMETERS=extra_float_digits
    ports:
      - "6432:6432"
    depends_on:
      - postgres
```

### 应用配置

```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  host: 'pgbouncer', // 连接到 pgBouncer
  port: 6432,        // pgBouncer 端口
  // ... 其他配置
}),
```

**优势**:
- 支持更多并发连接 (1000+)
- 更高效的连接复用
- 降低数据库服务器负载

---

## 8. 检查清单

优化连接池配置时，确保:

- [ ] 根据 CPU 核心数计算合理的 `max` 连接数
- [ ] 设置合理的 `min` 连接数 (通常为 `max` 的 25-50%)
- [ ] 配置 `statement_timeout` 防止慢查询占用连接
- [ ] 配置 `idleTimeoutMillis` 及时释放空闲连接
- [ ] 启用连接池监控 (Prometheus/Grafana)
- [ ] 定期检查 `pg_stat_activity` 识别异常连接
- [ ] 考虑使用 pgBouncer (QPS > 500)

---

## 9. 参考资料

- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [TypeORM Connection Options](https://typeorm.io/data-source-options#postgres--cockroachdb-connection-options)
- [pgBouncer Documentation](https://www.pgbouncer.org/config.html)
- [Redis Connection Pool Best Practices](https://redis.io/docs/manual/patterns/connection-pool/)

---

**文档更新时间**: 2025-10-29
**推荐阅读**: [CACHE_IMPLEMENTATION_EXAMPLE.md](./CACHE_IMPLEMENTATION_EXAMPLE.md)
