# Proxy Service 数据库

> ⚠️ **重要**: 本项目统一使用 TypeORM 管理数据库，SQL脚本仅供参考

## 数据库结构

Proxy Service 使用独立的 PostgreSQL 数据库：`cloudphone_proxy`

**数据库管理方式**:
- ✅ **开发环境**: TypeORM `synchronize: true` 自动同步
- ✅ **生产环境**: TypeORM migrations 迁移脚本
- ❌ ~~手动执行SQL~~ (不推荐)

### 数据表

| 表名 | 说明 | 用途 |
|------|------|------|
| `proxy_providers` | 供应商配置 | 存储IPRoyal, Bright Data, Oxylabs等供应商的配置信息 |
| `proxy_usage` | 使用记录 | 记录每次代理使用情况，用于统计和计费 |
| `proxy_health` | 健康检查记录 | 存储代理健康检查历史 |
| `proxy_sessions` | 会话管理 | 跟踪代理会话的完整生命周期 |
| `cost_records` | 成本记录 | 按日汇总的成本统计 |

### 统计视图

| 视图名 | 说明 |
|--------|------|
| `daily_usage_stats` | 每日使用统计（按供应商） |
| `provider_performance` | 供应商性能统计 |

---

## 初始化数据库

### 开发环境（自动同步）

开发环境使用 TypeORM 的 `synchronize: true` 自动创建和更新表结构：

```bash
# 1. 确保 PostgreSQL 运行
docker compose -f ../../docker-compose.dev.yml up -d postgres

# 2. 创建数据库（如果不存在）
createdb cloudphone_proxy

# 3. 启动服务，TypeORM 会自动创建所有表
cd backend/proxy-service
pnpm start:dev
```

**自动创建的表**:
- ✅ `proxy_providers` - 从 ProxyProvider 实体
- ✅ `proxy_usage` - 从 ProxyUsage 实体
- ✅ `proxy_health` - 从 ProxyHealth 实体
- ✅ `proxy_sessions` - 从 ProxySession 实体
- ✅ `cost_records` - 从 CostRecord 实体

**优点**:
- 🚀 零配置，启动即用
- 🔄 实体变更自动同步
- 🐛 快速开发迭代

**注意**:
- ⚠️ 仅用于开发环境
- ⚠️ 表结构变更可能导致数据丢失

---

## 数据库迁移（TypeORM Migrations）

### 生产环境迁移

生产环境必须关闭 `synchronize`，使用 TypeORM migrations：

#### 1. 配置 TypeORM CLI

创建 `src/config/typeorm-cli.config.ts`:

```typescript
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'cloudphone_proxy',
  entities: ['src/entities/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false, // 生产环境必须为false
});
```

#### 2. 生成迁移

当实体发生变更时，生成迁移脚本：

```bash
# 基于实体变更自动生成迁移
npm run typeorm migration:generate -- -d src/config/typeorm-cli.config.ts -n AddProxyTables

# 或创建空迁移（手动编写）
npm run typeorm migration:create -- -n CustomMigration
```

这会在 `src/migrations/` 目录生成迁移文件。

#### 3. 运行迁移

```bash
# 运行所有待执行的迁移
npm run typeorm migration:run -- -d src/config/typeorm-cli.config.ts

# 查看迁移状态
npm run typeorm migration:show -- -d src/config/typeorm-cli.config.ts
```

#### 4. 回滚迁移

```bash
# 回滚最后一次迁移
npm run typeorm migration:revert -- -d src/config/typeorm-cli.config.ts
```

### 迁移最佳实践

1. **总是先测试**: 在开发/测试环境验证迁移后再用于生产
2. **备份数据**: 运行生产迁移前务必备份数据库
3. **版本控制**: 将迁移文件提交到 git
4. **顺序执行**: 按照时间戳顺序执行，不要跳过
5. **不可变**: 一旦部署到生产，不要修改已有迁移

### 开发环境（自动同步）

开发环境使用 `synchronize: true`：
- ✅ 实体变更自动同步
- ✅ 无需手动迁移
- ⚠️ 不适合生产环境

---

## 查询示例

### 查看今日使用统计

```sql
SELECT * FROM daily_usage_stats
WHERE usage_date = CURRENT_DATE
ORDER BY total_requests DESC;
```

### 查看供应商性能

```sql
SELECT
    name,
    total_requests,
    successful_requests,
    success_rate_percent,
    total_cost
FROM provider_performance
ORDER BY total_requests DESC;
```

### 查看最近的代理使用记录

```sql
SELECT
    proxy_id,
    provider,
    country,
    bandwidth_mb,
    cost,
    success,
    used_at
FROM proxy_usage
ORDER BY used_at DESC
LIMIT 100;
```

### 查看活跃会话

```sql
SELECT
    session_id,
    provider,
    device_id,
    country,
    started_at,
    total_bandwidth_mb,
    total_cost,
    request_count,
    success_count
FROM proxy_sessions
WHERE ended_at IS NULL
ORDER BY started_at DESC;
```

### 查看每日成本

```sql
SELECT
    record_date,
    SUM(total_cost) as daily_cost,
    SUM(total_requests) as daily_requests,
    SUM(total_bandwidth_mb) as daily_bandwidth_mb
FROM cost_records
GROUP BY record_date
ORDER BY record_date DESC
LIMIT 30;
```

---

## 数据清理

### 清理旧的使用记录（保留最近30天）

```sql
DELETE FROM proxy_usage
WHERE used_at < CURRENT_DATE - INTERVAL '30 days';
```

### 清理旧的健康检查记录（保留最近7天）

```sql
DELETE FROM proxy_health
WHERE checked_at < CURRENT_DATE - INTERVAL '7 days';
```

### 清理已结束的会话（保留最近30天）

```sql
DELETE FROM proxy_sessions
WHERE ended_at IS NOT NULL
AND ended_at < CURRENT_DATE - INTERVAL '30 days';
```

---

## 备份和恢复

### 备份数据库

```bash
# 备份整个数据库
pg_dump -U postgres cloudphone_proxy > cloudphone_proxy_backup.sql

# 备份仅数据（不包含表结构）
pg_dump -U postgres --data-only cloudphone_proxy > cloudphone_proxy_data.sql

# 备份特定表
pg_dump -U postgres -t proxy_usage cloudphone_proxy > proxy_usage_backup.sql
```

### 恢复数据库

```bash
# 恢复整个数据库
psql -U postgres cloudphone_proxy < cloudphone_proxy_backup.sql

# 恢复仅数据
psql -U postgres cloudphone_proxy < cloudphone_proxy_data.sql
```

---

## 性能优化

### 索引维护

```sql
-- 重建索引
REINDEX TABLE proxy_usage;
REINDEX TABLE proxy_health;

-- 分析表统计信息
ANALYZE proxy_usage;
ANALYZE proxy_health;
```

### 查看表大小

```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 查看慢查询

```sql
-- 启用慢查询日志
ALTER SYSTEM SET log_min_duration_statement = 1000; -- 记录超过1秒的查询
SELECT pg_reload_conf();

-- 查看活跃查询
SELECT pid, usename, query, state, query_start
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;
```

---

## 故障排查

### 检查数据库连接

```bash
# 测试连接
psql -U postgres -d cloudphone_proxy -c "SELECT 1"
```

### 检查表是否存在

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public';
```

### 检查数据库大小

```sql
SELECT pg_size_pretty(pg_database_size('cloudphone_proxy'));
```

### 检查连接数

```sql
SELECT count(*) FROM pg_stat_activity
WHERE datname = 'cloudphone_proxy';
```

---

## 相关文档

- [Proxy Service README](../README.md)
- [MVP 完成报告](../MVP_COMPLETED.md)
- [TypeORM 文档](https://typeorm.io)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
