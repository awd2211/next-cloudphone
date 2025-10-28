# Device Service 数据库迁移

## 概述

Device Service 使用 SQL 迁移文件管理数据库 schema 变更。

## 迁移文件

### 20251028120000_add_composite_indexes.sql

**目的**: 为高频查询添加复合索引，提升查询性能 5-10x

**新增索引** (7 个):
1. `idx_devices_user_status` - 用户设备状态查询
2. `idx_devices_tenant_status` - 租户设备状态查询
3. `idx_devices_status_expires` - 设备过期检查
4. `idx_devices_user_created` - 用户设备列表（时间排序）
5. `idx_snapshots_device_created` - 设备快照列表
6. `idx_devices_status_heartbeat` - 设备心跳监控
7. `idx_devices_container` - Docker 容器 ID 查找

**特性**:
- ✅ 使用 `CONCURRENTLY` - 不锁表，零停机时间
- ✅ 使用 `IF NOT EXISTS` - 幂等性，可重复执行
- ✅ 部分索引 (`WHERE` 条件) - 减少索引大小
- ✅ 自动 ANALYZE - 更新统计信息

## 应用迁移

### 方法 1: 直接执行 SQL（推荐用于开发环境）

```bash
# 确保 PostgreSQL 和 Device Service 正在运行
docker compose -f docker-compose.dev.yml ps postgres

# 应用迁移
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_device < migrations/20251028120000_add_composite_indexes.sql
```

### 方法 2: 使用 psql 客户端

```bash
# 连接到数据库
psql -h localhost -U postgres -d cloudphone_device

# 在 psql 中执行
\i migrations/20251028120000_add_composite_indexes.sql
```

### 方法 3: 生产环境（通过 CI/CD）

```bash
# 在生产部署脚本中
psql -h $DB_HOST -U $DB_USER -d cloudphone_device \
  < migrations/20251028120000_add_composite_indexes.sql
```

## 验证迁移

### 检查索引是否创建成功

```sql
-- 查看所有新创建的复合索引
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('devices', 'device_snapshots')
  AND (
    indexname LIKE 'idx_%_user_%' OR
    indexname LIKE 'idx_%_tenant_%' OR
    indexname LIKE 'idx_%_status_%' OR
    indexname LIKE 'idx_%_device_%' OR
    indexname LIKE 'idx_%_container%'
  )
ORDER BY tablename, indexname;
```

### 检查索引大小

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexrelname LIKE 'idx_devices%' OR indexrelname LIKE 'idx_snapshots%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### 测试查询性能

```sql
-- 测试用户设备状态查询（应使用 idx_devices_user_status）
EXPLAIN ANALYZE
SELECT * FROM devices
WHERE userId = 'test-user-id' AND status = 'running';

-- 测试设备过期检查（应使用 idx_devices_status_expires）
EXPLAIN ANALYZE
SELECT * FROM devices
WHERE status = 'running' AND expiresAt < NOW();
```

## 回滚迁移

如果需要回滚索引（不推荐，除非遇到问题）：

```sql
-- 删除所有复合索引
DROP INDEX CONCURRENTLY IF EXISTS idx_devices_user_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_devices_tenant_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_devices_status_expires;
DROP INDEX CONCURRENTLY IF EXISTS idx_devices_user_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_snapshots_device_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_devices_status_heartbeat;
DROP INDEX CONCURRENTLY IF EXISTS idx_devices_container;
```

## 性能影响

**预期改进**:
- 用户设备列表查询: **5-10x** 更快
- 租户设备统计: **5-10x** 更快
- 设备过期检查（定时任务）: **10-20x** 更快
- 快照列表查询: **3-5x** 更快

**索引维护成本**:
- 磁盘空间: 约 10-50MB（取决于数据量）
- 写入开销: 每次 INSERT/UPDATE/DELETE 增加约 5-10% 时间
- 净收益: 对读多写少的场景，收益远大于成本

## 故障排除

### 问题: 创建索引失败 "relation does not exist"

**原因**: 数据库表还未创建

**解决方案**:
1. 确保 Device Service 至少运行过一次（创建表）
2. 或者先运行基础迁移创建表

### 问题: 创建索引很慢

**原因**: `CONCURRENTLY` 模式需要扫描整张表

**解决方案**:
- 这是正常的，大表可能需要几分钟
- 不会锁表，服务可以正常运行
- 耐心等待完成

### 问题: 索引未被使用

**原因**: 统计信息未更新

**解决方案**:
```sql
ANALYZE devices;
ANALYZE device_snapshots;
```

## 最佳实践

1. **在低峰期应用**: 虽然 CONCURRENTLY 不锁表，但仍会占用资源
2. **先在测试环境验证**: 确保索引按预期工作
3. **监控查询计划**: 使用 `EXPLAIN ANALYZE` 验证索引被使用
4. **定期维护**: 运行 `VACUUM` 和 `ANALYZE` 保持统计信息最新
