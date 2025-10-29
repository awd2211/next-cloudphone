# Week 3 Day 4-5 - 数据库查询优化计划

**时间**: 2025-10-29 (2 天)
**目标**: 优化数据库查询性能，减少查询时间 90%，提升并发能力 200%

---

## 📋 优化目标

### 性能指标

| 指标 | 当前值 | 目标值 | 提升幅度 |
|------|--------|--------|----------|
| **设备列表查询时间** | ~500ms | <50ms | -90% |
| **用户详情查询时间** | ~300ms | <30ms | -90% |
| **Dashboard 聚合查询** | ~1200ms | <120ms | -90% |
| **并发查询能力** | 100 QPS | 300 QPS | +200% |
| **数据库连接数** | 峰值 50 | 稳定 20 | -60% |
| **Redis 缓存命中率** | 0% (未实现) | 70%+ | ∞ |

### 优化范围

- ✅ Device Service (设备服务)
- ✅ User Service (用户服务)
- ⚠️ Billing Service (计费服务) - 次要
- ⚠️ App Service (应用服务) - 次要

---

## 🎯 Phase 1: 数据库索引分析与优化 (Day 4, 4 小时)

### Task 1.1: 分析现有索引 (1 小时)

#### 检查点

1. **Device Service 表索引分析**
   ```sql
   -- 查看 devices 表的索引
   \d devices

   -- 查看索引使用情况
   SELECT
     schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
   FROM pg_stat_user_indexes
   WHERE tablename = 'devices'
   ORDER BY idx_scan DESC;

   -- 查看未使用的索引
   SELECT
     schemaname, tablename, indexname
   FROM pg_stat_user_indexes
   WHERE idx_scan = 0
     AND tablename = 'devices';
   ```

2. **User Service 表索引分析**
   ```sql
   \d users
   \d user_events
   \d user_snapshots
   ```

3. **识别慢查询**
   ```sql
   -- 开启慢查询日志
   ALTER DATABASE cloudphone_device SET log_min_duration_statement = 100;
   ALTER DATABASE cloudphone_user SET log_min_duration_statement = 100;

   -- 查看慢查询
   SELECT query, calls, total_time, mean_time, max_time
   FROM pg_stat_statements
   WHERE mean_time > 100
   ORDER BY mean_time DESC
   LIMIT 20;
   ```

#### 预期发现

- ❌ 缺失的复合索引:
  - `devices(user_id, status)`
  - `devices(provider_type, status)`
  - `devices(node_id, status)`
  - `user_events(aggregate_id, version)`
  - `user_events(event_type, created_at)`

- ❌ N+1 查询问题:
  - 设备列表查询用户信息
  - 用户列表查询配额信息
  - Dashboard 统计查询

---

### Task 1.2: 创建复合索引 (1 小时)

#### Device Service 索引优化

**文件**: `backend/device-service/migrations/20251029140000_add_query_indexes.sql`

```sql
-- =============================================
-- Device Service 查询优化索引
-- 创建时间: 2025-10-29
-- 目的: 优化常见查询，减少查询时间 90%
-- =============================================

-- 1. 用户设备列表查询 (最常用)
-- 查询: SELECT * FROM devices WHERE user_id = ? AND status = ? ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_user_status_created
ON devices(user_id, status, created_at DESC);

-- 2. 提供商设备列表查询
-- 查询: SELECT * FROM devices WHERE provider_type = ? AND status = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_provider_status
ON devices(provider_type, status);

-- 3. 节点设备列表查询
-- 查询: SELECT * FROM devices WHERE node_id = ? AND status IN (?)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_node_status
ON devices(node_id, status);

-- 4. 设备快照关联查询
-- 查询: SELECT * FROM device_snapshots WHERE device_id = ? ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_snapshots_device_created
ON device_snapshots(device_id, created_at DESC);

-- 5. 设备模板查询
-- 查询: SELECT * FROM device_templates WHERE user_id = ? AND is_public = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_user_public
ON device_templates(user_id, is_public);

-- 6. 节点资源查询
-- 查询: SELECT * FROM nodes WHERE status = 'active' ORDER BY cpu_usage ASC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nodes_status_cpu
ON nodes(status, cpu_usage) WHERE status = 'active';

-- 7. 部分索引：仅索引活跃设备 (减少索引大小)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_active_user
ON devices(user_id, created_at DESC)
WHERE status IN ('running', 'stopped', 'paused');

-- 8. 全文搜索索引 (设备名称)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_name_trgm
ON devices USING gin(name gin_trgm_ops);

-- =============================================
-- 清理无用索引
-- =============================================

-- 删除重复或未使用的索引 (如果存在)
-- DROP INDEX CONCURRENTLY IF EXISTS old_unused_index;

-- =============================================
-- 索引统计信息更新
-- =============================================

-- 更新统计信息以优化查询计划
ANALYZE devices;
ANALYZE device_snapshots;
ANALYZE device_templates;
ANALYZE nodes;
```

#### User Service 索引优化

**文件**: `backend/user-service/migrations/20251029140000_add_query_indexes.sql`

```sql
-- =============================================
-- User Service 查询优化索引
-- 创建时间: 2025-10-29
-- 目的: 优化 Event Sourcing 查询和用户查询
-- =============================================

-- 1. 事件溯源：按聚合 ID 和版本查询 (最关键)
-- 查询: SELECT * FROM user_events WHERE aggregate_id = ? AND version >= ? ORDER BY version ASC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_events_aggregate_version
ON user_events(aggregate_id, version ASC);

-- 2. 事件类型查询
-- 查询: SELECT * FROM user_events WHERE event_type = ? AND created_at >= ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_events_type_created
ON user_events(event_type, created_at DESC);

-- 3. 用户快照查询
-- 查询: SELECT * FROM user_snapshots WHERE user_id = ? ORDER BY version DESC LIMIT 1
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_snapshots_user_version
ON user_snapshots(user_id, version DESC);

-- 4. 用户配额查询
-- 查询: SELECT * FROM quotas WHERE user_id = ? AND quota_type = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotas_user_type
ON quotas(user_id, quota_type);

-- 5. 角色权限查询
-- 查询: SELECT * FROM role_permissions WHERE role_id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_permissions_role
ON role_permissions(role_id);

-- 6. 用户角色查询
-- 查询: SELECT * FROM user_roles WHERE user_id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user
ON user_roles(user_id);

-- 7. 全文搜索索引 (用户名、邮箱)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_trgm
ON users USING gin(email gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_trgm
ON users USING gin(username gin_trgm_ops);

-- =============================================
-- 分区表索引 (如果事件表很大)
-- =============================================

-- 如果 user_events 表超过 1000 万条，考虑分区
-- CREATE TABLE user_events_2025_10 PARTITION OF user_events
-- FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- =============================================
-- 索引统计信息更新
-- =============================================

ANALYZE user_events;
ANALYZE user_snapshots;
ANALYZE quotas;
ANALYZE users;
```

#### 执行索引创建

```bash
# Device Service
cd backend/device-service
pnpm migrate:apply

# User Service
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_device < migrations/20251029140000_add_query_indexes.sql

docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_user < migrations/20251029140000_add_query_indexes.sql
```

---

### Task 1.3: 验证索引效果 (1 小时)

#### 测试查询性能

**文件**: `backend/device-service/scripts/test-index-performance.sql`

```sql
-- =============================================
-- 索引性能测试
-- =============================================

-- 开启查询分析
\timing

-- 1. 测试用户设备列表查询
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM devices
WHERE user_id = 'test-user-id'
  AND status = 'running'
ORDER BY created_at DESC
LIMIT 20;

-- 预期: Index Scan using idx_devices_user_status_created

-- 2. 测试提供商设备列表查询
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM devices
WHERE provider_type = 'redroid'
  AND status IN ('running', 'stopped')
ORDER BY created_at DESC;

-- 预期: Index Scan using idx_devices_provider_status

-- 3. 测试事件溯源查询
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM user_events
WHERE aggregate_id = 'user-123'
  AND version >= 10
ORDER BY version ASC;

-- 预期: Index Scan using idx_user_events_aggregate_version

-- 4. 测试聚合查询
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  status,
  COUNT(*) as count,
  AVG(cpu_cores) as avg_cpu
FROM devices
WHERE user_id = 'test-user-id'
GROUP BY status;

-- 预期: Index Scan + GroupAggregate

-- =============================================
-- 索引大小检查
-- =============================================

SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('devices', 'user_events', 'device_snapshots')
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

---

### Task 1.4: 配置数据库参数优化 (1 小时)

#### PostgreSQL 性能调优

**文件**: `database/postgresql.conf.optimized`

```conf
# =============================================
# PostgreSQL 14 性能优化配置
# 适用于: 16GB RAM, 8 CPU, SSD
# =============================================

# ---- 内存配置 ----
shared_buffers = 4GB                 # 25% of RAM
effective_cache_size = 12GB          # 75% of RAM
work_mem = 64MB                      # Per query sort/hash
maintenance_work_mem = 1GB           # VACUUM, CREATE INDEX

# ---- 连接配置 ----
max_connections = 200                # 最大连接数
max_prepared_transactions = 200      # 预编译事务

# ---- WAL (预写日志) 配置 ----
wal_buffers = 16MB
checkpoint_completion_target = 0.9   # 平滑检查点
max_wal_size = 4GB
min_wal_size = 1GB

# ---- 查询优化器 ----
random_page_cost = 1.1               # SSD 优化
effective_io_concurrency = 200       # SSD 并发 I/O
default_statistics_target = 100      # 统计信息精度

# ---- 并行查询 ----
max_parallel_workers_per_gather = 4  # 每个查询并行 worker
max_parallel_workers = 8             # 总并行 worker
parallel_tuple_cost = 0.01           # 并行成本调整

# ---- 自动 VACUUM ----
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 10s             # 检查间隔
autovacuum_vacuum_threshold = 50     # 最少行数
autovacuum_vacuum_scale_factor = 0.1 # 10% 变更触发

# ---- 日志配置 ----
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_rotation_age = 1d
log_rotation_size = 100MB

# 慢查询日志
log_min_duration_statement = 100     # 记录 >100ms 的查询
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# ---- 性能统计 ----
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all

# ---- 其他优化 ----
synchronous_commit = off             # 异步提交 (性能优先)
full_page_writes = on                # 数据安全
```

**应用配置**:

```bash
# 备份原配置
docker compose -f docker-compose.dev.yml exec postgres \
  cp /var/lib/postgresql/data/postgresql.conf /var/lib/postgresql/data/postgresql.conf.backup

# 应用新配置 (修改 docker-compose.dev.yml 挂载)
# 或者直接在容器内修改
docker compose -f docker-compose.dev.yml exec postgres \
  nano /var/lib/postgresql/data/postgresql.conf

# 重启 PostgreSQL
docker compose -f docker-compose.dev.yml restart postgres
```

---

## 🎯 Phase 2: N+1 查询问题修复 (Day 4, 4 小时)

### Task 2.1: 识别 N+1 查询 (1 小时)

#### Device Service N+1 查询

**问题 1**: 设备列表查询用户信息

```typescript
// ❌ 错误：N+1 查询
async findAll(userId: string): Promise<Device[]> {
  const devices = await this.deviceRepository.find({ where: { userId } });

  // N+1: 对每个设备查询用户信息
  for (const device of devices) {
    device.user = await this.userService.findOne(device.userId);
  }

  return devices;
}
```

**问题 2**: 设备列表查询节点信息

```typescript
// ❌ 错误：N+1 查询
async getDevicesWithNode(): Promise<Device[]> {
  const devices = await this.deviceRepository.find();

  // N+1: 对每个设备查询节点信息
  for (const device of devices) {
    device.node = await this.nodeRepository.findOne({ where: { id: device.nodeId } });
  }

  return devices;
}
```

---

### Task 2.2: 使用 Eager Loading 修复 (2 小时)

#### 修复 Device Service N+1

**文件**: `backend/device-service/src/devices/devices.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  /**
   * ✅ 修复：使用 LEFT JOIN 预加载关联数据
   */
  async findAllWithRelations(userId: string): Promise<Device[]> {
    return this.deviceRepository
      .createQueryBuilder('device')
      .leftJoinAndSelect('device.node', 'node')           // 预加载节点
      .leftJoinAndSelect('device.snapshots', 'snapshot')  // 预加载快照
      .where('device.userId = :userId', { userId })
      .orderBy('device.createdAt', 'DESC')
      .getMany();
  }

  /**
   * ✅ 修复：使用 IN 查询批量获取用户信息
   */
  async findAllWithUserInfo(userId: string): Promise<any[]> {
    // 1. 获取设备列表
    const devices = await this.deviceRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (devices.length === 0) return [];

    // 2. 批量查询用户信息 (单次查询)
    const userIds = [...new Set(devices.map(d => d.userId))];
    const users = await this.userService.findByIds(userIds); // 批量查询
    const userMap = new Map(users.map(u => [u.id, u]));

    // 3. 组装数据
    return devices.map(device => ({
      ...device,
      user: userMap.get(device.userId),
    }));
  }

  /**
   * ✅ 修复：使用 DataLoader 模式 (更优雅)
   */
  async findAllWithDataLoader(userId: string): Promise<any[]> {
    const devices = await this.deviceRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // 使用 DataLoader 批量加载关联数据
    const devicesWithRelations = await Promise.all(
      devices.map(async (device) => ({
        ...device,
        user: await this.userLoader.load(device.userId),
        node: await this.nodeLoader.load(device.nodeId),
      }))
    );

    return devicesWithRelations;
  }
}
```

#### 创建 DataLoader

**文件**: `backend/device-service/src/common/loaders/user.loader.ts`

```typescript
import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class UserLoader {
  private loader: DataLoader<string, any>;

  constructor(private userService: UserService) {
    this.loader = new DataLoader(async (userIds: readonly string[]) => {
      // 批量查询
      const users = await this.userService.findByIds([...userIds]);
      const userMap = new Map(users.map(u => [u.id, u]));

      // 保持顺序返回
      return userIds.map(id => userMap.get(id) || null);
    });
  }

  async load(userId: string) {
    return this.loader.load(userId);
  }
}
```

**安装 DataLoader**:
```bash
cd backend/device-service
pnpm add dataloader
pnpm add -D @types/dataloader
```

---

### Task 2.3: 优化 Dashboard 聚合查询 (1 小时)

#### Dashboard 查询优化

**文件**: `backend/device-service/src/devices/devices.service.ts`

```typescript
/**
 * ✅ 优化前：多次查询
 */
async getDashboardStats_BEFORE(userId: string) {
  const totalDevices = await this.deviceRepository.count({ where: { userId } });
  const runningDevices = await this.deviceRepository.count({ where: { userId, status: 'running' } });
  const stoppedDevices = await this.deviceRepository.count({ where: { userId, status: 'stopped' } });
  const errorDevices = await this.deviceRepository.count({ where: { userId, status: 'error' } });

  return { totalDevices, runningDevices, stoppedDevices, errorDevices };
}

/**
 * ✅ 优化后：单次聚合查询
 */
async getDashboardStats(userId: string) {
  const result = await this.deviceRepository
    .createQueryBuilder('device')
    .select('device.status', 'status')
    .addSelect('COUNT(*)', 'count')
    .addSelect('SUM(device.cpuCores)', 'totalCpu')
    .addSelect('SUM(device.memoryMb)', 'totalMemory')
    .where('device.userId = :userId', { userId })
    .groupBy('device.status')
    .getRawMany();

  // 转换为前端需要的格式
  const stats = {
    totalDevices: 0,
    runningDevices: 0,
    stoppedDevices: 0,
    errorDevices: 0,
    totalCpu: 0,
    totalMemory: 0,
  };

  result.forEach(row => {
    stats.totalDevices += parseInt(row.count);
    stats.totalCpu += parseInt(row.totalCpu || 0);
    stats.totalMemory += parseInt(row.totalMemory || 0);

    if (row.status === 'running') stats.runningDevices = parseInt(row.count);
    if (row.status === 'stopped') stats.stoppedDevices = parseInt(row.count);
    if (row.status === 'error') stats.errorDevices = parseInt(row.count);
  });

  return stats;
}

/**
 * ✅ 更进一步：使用物化视图 (Materialized View)
 */
async createDashboardMaterializedView() {
  await this.deviceRepository.query(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS device_stats_by_user AS
    SELECT
      user_id,
      status,
      COUNT(*) as count,
      SUM(cpu_cores) as total_cpu,
      SUM(memory_mb) as total_memory,
      NOW() as last_updated
    FROM devices
    GROUP BY user_id, status;

    CREATE INDEX ON device_stats_by_user(user_id);

    -- 定时刷新 (每 5 分钟)
    -- 需要配合 pg_cron 扩展
  `);
}

async getDashboardStatsFromMaterializedView(userId: string) {
  const result = await this.deviceRepository.query(`
    SELECT * FROM device_stats_by_user WHERE user_id = $1
  `, [userId]);

  // 处理结果...
  return stats;
}
```

---

## 🎯 Phase 3: Redis 缓存层实现 (Day 5, 4 小时)

### Task 3.1: 设计缓存策略 (30 分钟)

#### 缓存分层策略

| 数据类型 | TTL | 缓存键格式 | 失效策略 |
|----------|-----|------------|----------|
| **设备列表** | 60s | `devices:user:{userId}:list` | 设备变更时主动失效 |
| **设备详情** | 300s | `device:{deviceId}` | 设备变更时主动失效 |
| **用户信息** | 600s | `user:{userId}` | 用户变更时主动失效 |
| **Dashboard 统计** | 120s | `stats:user:{userId}:dashboard` | 定时刷新 |
| **节点列表** | 300s | `nodes:active` | 节点变更时主动失效 |
| **配额信息** | 600s | `quota:user:{userId}` | 配额变更时主动失效 |

#### 缓存更新策略

1. **Cache-Aside (旁路缓存)**: 适用于读多写少
   - 读: 先查缓存，未命中查数据库并写入缓存
   - 写: 直接写数据库，删除缓存

2. **Write-Through (写穿)**: 适用于数据一致性要求高
   - 写: 同时写数据库和缓存
   - 读: 优先从缓存读

3. **Write-Behind (写回)**: 适用于写多读少
   - 写: 先写缓存，异步批量写数据库
   - 读: 优先从缓存读

**本项目采用**: Cache-Aside + 主动失效

---

### Task 3.2: 实现缓存装饰器 (1.5 小时)

#### 通用缓存装饰器

**文件**: `backend/shared/src/decorators/cacheable.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

export interface CacheableOptions {
  /**
   * 缓存键模板
   * 支持占位符: {0}, {1}, {2} 对应方法参数
   * 示例: 'device:{0}' → 'device:123'
   */
  keyTemplate: string;

  /**
   * TTL (秒)
   */
  ttl: number;

  /**
   * 条件缓存: 返回 true 才缓存
   */
  condition?: (...args: any[]) => boolean;

  /**
   * 缓存键生成函数 (可选，覆盖 keyTemplate)
   */
  keyGenerator?: (...args: any[]) => string;
}

/**
 * 缓存装饰器
 *
 * @example
 * @Cacheable({ keyTemplate: 'device:{0}', ttl: 300 })
 * async findOne(id: string): Promise<Device> {
 *   return this.deviceRepository.findOne({ where: { id } });
 * }
 */
export function Cacheable(options: CacheableOptions): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, options)(target, propertyKey, descriptor);

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService = this.cacheService || this.redis;

      if (!cacheService) {
        console.warn('[Cacheable] Cache service not found, executing original method');
        return originalMethod.apply(this, args);
      }

      // 生成缓存键
      let cacheKey: string;
      if (options.keyGenerator) {
        cacheKey = options.keyGenerator(...args);
      } else {
        cacheKey = options.keyTemplate.replace(/\{(\d+)\}/g, (_, index) => {
          return args[parseInt(index)] || '';
        });
      }

      // 检查条件
      if (options.condition && !options.condition(...args)) {
        console.log(`[Cacheable] Condition not met for key: ${cacheKey}`);
        return originalMethod.apply(this, args);
      }

      try {
        // 1. 尝试从缓存获取
        const cached = await cacheService.get(cacheKey);

        if (cached) {
          console.log(`[Cacheable] Cache HIT: ${cacheKey}`);
          return JSON.parse(cached);
        }

        console.log(`[Cacheable] Cache MISS: ${cacheKey}`);

        // 2. 执行原方法
        const result = await originalMethod.apply(this, args);

        // 3. 写入缓存
        if (result !== null && result !== undefined) {
          await cacheService.set(cacheKey, JSON.stringify(result), 'EX', options.ttl);
          console.log(`[Cacheable] Cache SET: ${cacheKey} (TTL: ${options.ttl}s)`);
        }

        return result;
      } catch (error) {
        console.error(`[Cacheable] Cache error for key ${cacheKey}:`, error);
        // 缓存失败不影响业务逻辑
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * 缓存失效装饰器
 *
 * @example
 * @CacheEvict({ keys: ['device:{0}', 'devices:user:{userId}:list'] })
 * async update(id: string, dto: UpdateDeviceDto): Promise<Device> {
 *   return this.deviceRepository.save({ id, ...dto });
 * }
 */
export function CacheEvict(options: { keys: string[] }): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      const cacheService = this.cacheService || this.redis;

      if (!cacheService) {
        return result;
      }

      // 删除相关缓存
      for (const keyTemplate of options.keys) {
        const cacheKey = keyTemplate.replace(/\{(\d+)\}/g, (_, index) => {
          return args[parseInt(index)] || '';
        }).replace(/\{(\w+)\}/g, (_, field) => {
          // 支持从结果对象中取值: {userId} → result.userId
          return result[field] || args[0]?.[field] || '';
        });

        try {
          await cacheService.del(cacheKey);
          console.log(`[CacheEvict] Deleted cache: ${cacheKey}`);
        } catch (error) {
          console.error(`[CacheEvict] Failed to delete cache ${cacheKey}:`, error);
        }
      }

      return result;
    };

    return descriptor;
  };
}
```

---

### Task 3.3: 应用缓存到 Device Service (1 小时)

**文件**: `backend/device-service/src/devices/devices.service.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Cacheable, CacheEvict } from '@cloudphone/shared';
import { Device } from '../entities/device.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @Inject(CACHE_MANAGER)
    private cacheService: Cache,
  ) {}

  /**
   * ✅ 缓存设备详情 (5 分钟)
   */
  @Cacheable({ keyTemplate: 'device:{0}', ttl: 300 })
  async findOne(id: string): Promise<Device> {
    return this.deviceRepository.findOne({ where: { id } });
  }

  /**
   * ✅ 缓存用户设备列表 (1 分钟)
   */
  @Cacheable({
    keyTemplate: 'devices:user:{0}:list',
    ttl: 60,
    condition: (userId) => !!userId // 仅当 userId 存在时缓存
  })
  async findByUser(userId: string): Promise<Device[]> {
    return this.deviceRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * ✅ 缓存 Dashboard 统计 (2 分钟)
   */
  @Cacheable({ keyTemplate: 'stats:user:{0}:dashboard', ttl: 120 })
  async getDashboardStats(userId: string) {
    const result = await this.deviceRepository
      .createQueryBuilder('device')
      .select('device.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('device.userId = :userId', { userId })
      .groupBy('device.status')
      .getRawMany();

    // 处理结果...
    return stats;
  }

  /**
   * ✅ 更新设备时删除相关缓存
   */
  @CacheEvict({
    keys: [
      'device:{0}',                      // 设备详情缓存
      'devices:user:{userId}:list',      // 用户设备列表缓存
      'stats:user:{userId}:dashboard',   // Dashboard 统计缓存
    ]
  })
  async update(id: string, dto: UpdateDeviceDto): Promise<Device> {
    const device = await this.findOne(id);
    Object.assign(device, dto);
    return this.deviceRepository.save(device);
  }

  /**
   * ✅ 创建设备时删除相关缓存
   */
  @CacheEvict({
    keys: [
      'devices:user:{userId}:list',
      'stats:user:{userId}:dashboard',
    ]
  })
  async create(dto: CreateDeviceDto): Promise<Device> {
    const device = this.deviceRepository.create(dto);
    return this.deviceRepository.save(device);
  }

  /**
   * ✅ 删除设备时删除相关缓存
   */
  @CacheEvict({
    keys: [
      'device:{0}',
      'devices:user:{userId}:list',
      'stats:user:{userId}:dashboard',
    ]
  })
  async remove(id: string): Promise<void> {
    const device = await this.findOne(id);
    await this.deviceRepository.remove(device);
  }
}
```

---

### Task 3.4: 监控缓存性能 (1 小时)

#### 缓存性能监控

**文件**: `backend/device-service/src/cache/cache-metrics.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge } from 'prom-client';

@Injectable()
export class CacheMetricsService {
  private hitCount = 0;
  private missCount = 0;

  constructor(
    @InjectMetric('cache_hits_total')
    private cacheHitsCounter: Counter<string>,
    @InjectMetric('cache_misses_total')
    private cacheMissesCounter: Counter<string>,
    @InjectMetric('cache_hit_rate')
    private cacheHitRateGauge: Gauge<string>,
  ) {}

  recordHit(key: string) {
    this.hitCount++;
    this.cacheHitsCounter.inc({ key_prefix: this.getKeyPrefix(key) });
  }

  recordMiss(key: string) {
    this.missCount++;
    this.cacheMissesCounter.inc({ key_prefix: this.getKeyPrefix(key) });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  updateHitRate() {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? this.hitCount / total : 0;

    this.cacheHitRateGauge.set(hitRate);

    console.log(`[CacheMetrics] Hit Rate: ${(hitRate * 100).toFixed(2)}% (Hits: ${this.hitCount}, Misses: ${this.missCount})`);

    // 重置计数器
    this.hitCount = 0;
    this.missCount = 0;
  }

  private getKeyPrefix(key: string): string {
    return key.split(':')[0];
  }
}
```

**Prometheus Metrics**:
```typescript
// app.module.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
      customMetrics: [
        {
          name: 'cache_hits_total',
          help: 'Total cache hits',
          type: 'Counter',
          labelNames: ['key_prefix'],
        },
        {
          name: 'cache_misses_total',
          help: 'Total cache misses',
          type: 'Counter',
          labelNames: ['key_prefix'],
        },
        {
          name: 'cache_hit_rate',
          help: 'Cache hit rate (0-1)',
          type: 'Gauge',
        },
      ],
    }),
  ],
})
export class AppModule {}
```

---

## 🎯 Phase 4: 连接池优化 (Day 5, 2 小时)

### Task 4.1: TypeORM 连接池配置

**文件**: `backend/device-service/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,

      // ✅ 连接池优化
      extra: {
        max: 20,                    // 最大连接数 (默认 10)
        min: 5,                     // 最小连接数 (保持活跃)
        idleTimeoutMillis: 30000,   // 空闲连接超时 (30 秒)
        connectionTimeoutMillis: 5000, // 连接超时 (5 秒)

        // 连接健康检查
        statement_timeout: 30000,   // SQL 执行超时 (30 秒)
        query_timeout: 30000,

        // 连接复用
        application_name: 'device-service',
      },

      // ✅ 查询性能优化
      logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
      maxQueryExecutionTime: 1000, // 记录慢查询 (>1s)

      // ✅ 实体缓存
      cache: {
        type: 'redis',
        options: {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT),
        },
        duration: 60000, // 1 分钟
      },
    }),
  ],
})
export class AppModule {}
```

---

### Task 4.2: Redis 连接池配置

**文件**: `backend/device-service/src/cache/cache.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT),
          },

          // ✅ 连接池配置
          connectionName: 'device-service-cache',
          lazyConnect: false,

          // ✅ 性能优化
          enableReadyCheck: true,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) return null;
            return Math.min(times * 100, 3000);
          },
        }),

        // 默认 TTL
        ttl: 60,
      }),
    }),
  ],
  exports: [CacheModule],
})
export class CustomCacheModule {}
```

---

## 📊 验证和测试

### 性能测试脚本

**文件**: `scripts/benchmark-database-optimization.sh`

```bash
#!/bin/bash

echo "========================================="
echo "  数据库优化性能基准测试"
echo "========================================="

# 1. 设备列表查询性能测试
echo ""
echo "1️⃣  测试设备列表查询 (100 次)"
ab -n 100 -c 10 -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:30002/devices?userId=test-user-id

# 2. 设备详情查询性能测试
echo ""
echo "2️⃣  测试设备详情查询 (100 次)"
ab -n 100 -c 10 -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:30002/devices/test-device-id

# 3. Dashboard 统计查询性能测试
echo ""
echo "3️⃣  测试 Dashboard 统计查询 (100 次)"
ab -n 100 -c 10 -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:30002/devices/stats/dashboard

# 4. 缓存命中率测试
echo ""
echo "4️⃣  测试缓存命中率"
curl -s http://localhost:30002/metrics | grep cache_hit_rate

# 5. 数据库连接数测试
echo ""
echo "5️⃣  测试数据库连接数"
docker compose -f docker-compose.dev.yml exec postgres \
  psql -U postgres -d cloudphone_device -c "SELECT count(*) FROM pg_stat_activity WHERE datname='cloudphone_device';"

echo ""
echo "========================================="
echo "  测试完成"
echo "========================================="
```

---

## 📈 预期优化效果

| 优化项 | 优化前 | 优化后 | 提升 |
|--------|--------|--------|------|
| 设备列表查询 (无缓存) | 500ms | 50ms | -90% |
| 设备列表查询 (有缓存) | 500ms | 5ms | -99% |
| Dashboard 统计查询 | 1200ms | 120ms | -90% |
| 缓存命中率 | 0% | 70%+ | ∞ |
| 数据库连接数 | 峰值 50 | 稳定 20 | -60% |
| 并发查询能力 | 100 QPS | 300 QPS | +200% |

---

## ✅ 验收标准

- [x] 创建 6+ 复合索引
- [x] 修复 3+ N+1 查询问题
- [x] 实现缓存装饰器
- [x] 应用缓存到 5+ 核心查询
- [x] 配置数据库连接池
- [x] 配置 Redis 连接池
- [x] 添加缓存性能监控
- [ ] 查询时间减少 90%+ (待验证)
- [ ] 缓存命中率 70%+ (待验证)
- [ ] 并发能力提升 200%+ (待验证)

---

**计划制定时间**: 2025-10-29
**预计完成时间**: 2025-10-30 (2 天)
**下一阶段**: Week 3 Day 6 - API Gateway 优化
