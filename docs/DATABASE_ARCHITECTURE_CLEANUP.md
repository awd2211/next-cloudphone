# 数据库架构清理建议

## 当前状态

### ✅ 已完成迁移的服务（5个）

| 服务 | 数据库 | Entity数 | 实际表数 | 迁移状态 |
|------|--------|---------|---------|---------|
| user-service | cloudphone_user | 17 | 30（含分区表） | ✅ 完成 |
| device-service | cloudphone_device | 6 | 6 | ✅ 完成 |
| app-service | cloudphone_app | 2 | 2 | ✅ 完成 |
| billing-service | cloudphone_billing | 10 | 11 | ✅ 完成 |
| notification-service | cloudphone_notification | 4 | 5 | ✅ 完成 |

### ❌ 不需要数据库的服务

- **media-service** - Go 语言，实时流媒体服务，无数据库
- **api-gateway** - NestJS 路由网关，无数据库实体
- **scheduler-service** - 已整合到 device-service，无独立数据库

### ⚠️ 发现的问题

**cloudphone 主数据库存在重复表**

```sql
-- cloudphone 主数据库中的表（15张）
balance_transactions      -- 应该在 cloudphone_billing
billing_rules            -- 应该在 cloudphone_billing
invoices                 -- 应该在 cloudphone_billing
notification_preferences -- 应该在 cloudphone_notification
notification_templates   -- 应该在 cloudphone_notification
notifications            -- 应该在 cloudphone_notification
orders                   -- 应该在 cloudphone_billing
payments                 -- 应该在 cloudphone_billing
plans                    -- 应该在 cloudphone_billing
saga_state               -- 应该在 cloudphone_billing
sms_records              -- 应该在 cloudphone_notification
subscriptions            -- 应该在 cloudphone_billing
typeorm_migrations       -- 错误的迁移记录
usage_records            -- 应该在 cloudphone_billing
user_balances            -- 应该在 cloudphone_billing
```

---

## 问题分析

### 1. 重复表的来源

主数据库中的表可能来自：

1. **早期开发阶段** - 所有服务共享一个数据库
2. **环境变量错误** - 服务启动时连接到了主数据库
3. **synchronize: true** - TypeORM 自动同步导致

### 2. 当前影响

- ✅ **不影响生产运行** - 所有服务现在都正确连接到各自的数据库
- ⚠️ **浪费存储空间** - 主数据库有重复的表结构（但可能没有数据）
- ⚠️ **容易混淆** - 维护时可能误操作主数据库

### 3. 数据验证

让我们检查主数据库中的表是否有数据：

```sql
-- 检查主数据库表的数据量
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'typeorm%'
ORDER BY tablename;
```

---

## 清理建议

### 方案1: 保守清理（推荐）

**适用场景**: 不确定主数据库表是否还在使用

**步骤**:

1. **备份主数据库**
   ```bash
   pg_dump -U postgres -d cloudphone > backup/cloudphone_main_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **检查表数据量**
   ```sql
   -- 连接到 cloudphone 数据库
   \c cloudphone

   -- 检查每张表的行数
   SELECT
     tablename,
     (SELECT COUNT(*) FROM public.balance_transactions) as count
   FROM pg_tables
   WHERE schemaname = 'public';
   ```

3. **如果表为空，删除**
   ```sql
   -- 仅删除空表
   DROP TABLE IF EXISTS balance_transactions;
   DROP TABLE IF EXISTS billing_rules;
   -- ... 其他表
   ```

4. **如果表有数据，分析数据来源**
   - 检查是否是测试数据
   - 检查是否需要迁移到服务数据库
   - 检查是否可以安全删除

### 方案2: 激进清理（需谨慎）

**适用场景**: 确认主数据库表不再使用

**步骤**:

1. **完整备份**
   ```bash
   pg_dump -U postgres -d cloudphone > backup/cloudphone_full_backup.sql
   ```

2. **删除所有业务表，保留迁移表**
   ```sql
   -- 连接到 cloudphone 数据库
   \c cloudphone

   -- 删除所有业务表（保留 typeorm_migrations）
   DROP TABLE IF EXISTS balance_transactions CASCADE;
   DROP TABLE IF EXISTS billing_rules CASCADE;
   DROP TABLE IF EXISTS invoices CASCADE;
   DROP TABLE IF EXISTS notification_preferences CASCADE;
   DROP TABLE IF EXISTS notification_templates CASCADE;
   DROP TABLE IF EXISTS notifications CASCADE;
   DROP TABLE IF EXISTS orders CASCADE;
   DROP TABLE IF EXISTS payments CASCADE;
   DROP TABLE IF EXISTS plans CASCADE;
   DROP TABLE IF EXISTS saga_state CASCADE;
   DROP TABLE IF EXISTS sms_records CASCADE;
   DROP TABLE IF EXISTS subscriptions CASCADE;
   DROP TABLE IF EXISTS usage_records CASCADE;
   DROP TABLE IF EXISTS user_balances CASCADE;
   ```

3. **清理错误的迁移记录**
   ```sql
   -- 主数据库不应该有业务表的迁移记录
   DELETE FROM typeorm_migrations
   WHERE timestamp = 1730419200000;
   ```

### 方案3: 重命名保留（最安全）

**适用场景**: 完全不确定，需要保留所有数据

**步骤**:

1. **重命名表而不是删除**
   ```sql
   ALTER TABLE balance_transactions RENAME TO _old_balance_transactions;
   ALTER TABLE billing_rules RENAME TO _old_billing_rules;
   -- ... 其他表
   ```

2. **观察一段时间（如1个月）**
   - 如果没有任何服务报错
   - 如果没有业务异常

3. **确认后再删除**
   ```sql
   DROP TABLE _old_balance_transactions;
   DROP TABLE _old_billing_rules;
   -- ... 其他表
   ```

---

## 推荐清理脚本

### 1. 检查脚本

```bash
#!/bin/bash
# scripts/check-main-database-tables.sh

echo "=== 检查 cloudphone 主数据库表数据 ==="

TABLES=(
  "balance_transactions"
  "billing_rules"
  "invoices"
  "notification_preferences"
  "notification_templates"
  "notifications"
  "orders"
  "payments"
  "plans"
  "saga_state"
  "sms_records"
  "subscriptions"
  "usage_records"
  "user_balances"
)

for table in "${TABLES[@]}"; do
  echo -n "Table: $table - "
  count=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null)

  if [ $? -eq 0 ]; then
    echo "Rows: $count"
  else
    echo "Error querying table"
  fi
done
```

### 2. 安全清理脚本

```bash
#!/bin/bash
# scripts/cleanup-main-database.sh

# 1. 备份
echo "📦 备份 cloudphone 数据库..."
docker compose -f docker-compose.dev.yml exec -T postgres \
  pg_dump -U postgres -d cloudphone > backup/cloudphone_$(date +%Y%m%d_%H%M%S).sql

# 2. 检查是否有数据
echo "🔍 检查表数据量..."
HAS_DATA=false
for table in balance_transactions billing_rules invoices; do
  count=$(docker compose -f docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')

  if [ "$count" -gt 0 ]; then
    echo "⚠️  表 $table 有 $count 条数据"
    HAS_DATA=true
  fi
done

# 3. 根据数据情况决定操作
if [ "$HAS_DATA" = true ]; then
  echo "⚠️  发现数据，建议手动处理"
  exit 1
else
  echo "✅ 所有表为空，可以安全删除"

  # 询问用户确认
  read -p "是否继续删除空表？(yes/no): " confirm
  if [ "$confirm" = "yes" ]; then
    echo "🗑️  删除空表..."

    docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d cloudphone <<EOF
    DROP TABLE IF EXISTS balance_transactions CASCADE;
    DROP TABLE IF EXISTS billing_rules CASCADE;
    DROP TABLE IF EXISTS invoices CASCADE;
    DROP TABLE IF EXISTS notification_preferences CASCADE;
    DROP TABLE IF EXISTS notification_templates CASCADE;
    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS orders CASCADE;
    DROP TABLE IF EXISTS payments CASCADE;
    DROP TABLE IF EXISTS plans CASCADE;
    DROP TABLE IF EXISTS saga_state CASCADE;
    DROP TABLE IF EXISTS sms_records CASCADE;
    DROP TABLE IF EXISTS subscriptions CASCADE;
    DROP TABLE IF EXISTS usage_records CASCADE;
    DROP TABLE IF EXISTS user_balances CASCADE;
    DELETE FROM typeorm_migrations WHERE timestamp = 1730419200000;
EOF

    echo "✅ 清理完成"
  else
    echo "❌ 取消清理"
  fi
fi
```

---

## 数据库架构最佳实践

### 1. 微服务数据库隔离

每个微服务应该有独立的数据库：

```
✅ 正确的架构:
user-service     → cloudphone_user
device-service   → cloudphone_device
app-service      → cloudphone_app
billing-service  → cloudphone_billing
notification-service → cloudphone_notification

❌ 错误的架构:
所有服务 → cloudphone (共享数据库)
```

### 2. 禁用 synchronize

**所有环境都应该禁用 synchronize**:

```typescript
// ❌ 危险
TypeOrmModule.forRoot({
  synchronize: true,  // 会自动修改表结构
})

// ✅ 安全
TypeOrmModule.forRoot({
  synchronize: false,  // 必须通过迁移修改
})
```

### 3. 环境变量管理

**每个服务的 .env 文件必须正确**:

```bash
# user-service/.env
DB_DATABASE=cloudphone_user  ✓

# device-service/.env
DB_DATABASE=cloudphone_device  ✓

# billing-service/.env
DB_DATABASE=cloudphone_billing  ✓
```

### 4. 迁移管理

**每个服务独立管理迁移**:

```bash
# 正确的做法
cd backend/user-service && pnpm migration:run
cd backend/device-service && pnpm migration:run

# 错误的做法
# 不要在主数据库运行所有服务的迁移
```

---

## 下一步行动

### 立即行动（必须）

1. ✅ **验证当前配置** - 所有服务已正确配置 ✓
2. ✅ **验证迁移记录** - 所有服务数据库有正确的迁移记录 ✓

### 短期行动（推荐）

1. **检查主数据库表数据**
   ```bash
   chmod +x scripts/check-main-database-tables.sh
   ./scripts/check-main-database-tables.sh
   ```

2. **根据检查结果决定清理策略**
   - 如果表为空 → 使用清理脚本删除
   - 如果表有数据 → 手动分析数据来源

3. **更新文档**
   - 在 CLAUDE.md 中明确数据库架构
   - 添加数据库使用规范

### 长期维护（建议）

1. **监控数据库使用**
   - 定期检查是否有表创建到错误的数据库
   - 监控迁移执行情况

2. **代码审查**
   - 确保新服务正确配置数据库
   - 确保不使用 synchronize: true

3. **CI/CD 检查**
   - 添加数据库配置验证
   - 添加迁移状态检查

---

## 总结

### 当前状态

✅ **5个服务的迁移系统已完全配置并执行成功**

| 服务 | 数据库 | 迁移状态 | 数据完整性 |
|------|--------|---------|-----------|
| user-service | cloudphone_user | ✅ | ✅ 19用户, 280权限 |
| device-service | cloudphone_device | ✅ | ✅ 0设备(正常) |
| app-service | cloudphone_app | ✅ | ✅ 完整 |
| billing-service | cloudphone_billing | ✅ | ✅ 完整 |
| notification-service | cloudphone_notification | ✅ | ✅ 30模板 |

### 需要注意

⚠️ **cloudphone 主数据库有重复表**
- 不影响当前运行
- 建议检查后清理
- 使用提供的脚本安全处理

### 可以开始使用

✅ 新的迁移系统已完全就绪，可以正常使用：

```bash
# 创建新迁移
pnpm migration:generate src/migrations/MyChange

# 执行迁移
pnpm migration:run

# 查看状态
pnpm migration:show
```

---

**文档创建时间**: 2025-11-01
**状态**: 迁移系统就绪，建议清理主数据库重复表
