# 数据库对齐方案

## 📊 当前数据库状态

### PostgreSQL 中的数据库

| 数据库名 | 使用服务 | 状态 | 说明 |
|---------|---------|------|------|
| `cloudphone_user` | User Service | ✅ 使用中 | 用户、角色、权限、配额、工单 |
| `cloudphone_device` | Device Service | ✅ 使用中 | 设备、Docker、快照、模板 |
| `cloudphone_app` | App Service | ✅ 使用中 | 应用、安装记录 |
| `cloudphone_billing` | Billing Service | ✅ 使用中 | 订单、支付、账单、余额 |
| `cloudphone_notification` | Notification Service | ✅ 使用中 | 通知、模板 |
| `cloudphone_scheduler` | Scheduler Service (Python) | ✅ 使用中 | 定时任务 |
| `cloudphone_auth` | **无** | ❌ 废弃 | API Gateway 旧数据库 |

---

## ⚠️ 发现的问题

### 1. API Gateway 配置错误

**文件Menu`backend/api-gateway/.env`
```env
DB_DATABASE=cloudphone_core  ❌ 错误（数据库不存在）
```

**修复**: 删除或注释（API Gateway 不再需要数据库）

### 2. cloudphone_auth 数据库废弃

**状态Menu 空数据库，不再使用

**建议**: 删除此数据库

---

## ✅ 修复方案

### 1. 更新 API Gateway 配置

```bash
# backend/api-gateway/.env
# ❌ 删除或注释这行
# DB_DATABASE=cloudphone_core

# API Gateway 不再需要数据库连接
# 已改为纯代理 + JWT 验证（无状态）
```

### 2. 删除 cloudphone_auth 数据库

```sql
-- 确认数据库为空
SELECT count(*) FROM pg_tables WHERE schemaname = 'public';

-- 删除数据库
DROP DATABASE IF EXISTS cloudphone_auth;
```

### 3. 创建 cloudphone_core（如果需要）

如果某些服务需要 cloudphone_core：
```sql
CREATE DATABASE cloudphone_core
  WITH OWNER = postgres
  ENCODING = 'UTF8'
  LC_COLLATE = 'en_US.utf8'
  LC_CTYPE = 'en_US.utf8';
```

---

## 📋 标准数据库配置

### 各服务 .env 文件

#### User Service
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=cloudphone_user
```

#### Device Service
```env
DB_DATABASE=cloudphone_device
```

#### App Service
```env
DB_DATABASE=cloudphone_app
```

#### Billing Service
```env
DB_DATABASE=cloudphone_billing
```

#### Notification Service
```env
DB_DATABASE=cloudphone_notification
```

#### API Gateway
```env
# 不再需要数据库配置
# JWT_SECRET=your-secret-key
```

---

## 🔄 数据库迁移检查

### 检查各数据库的表

```bash
# User Service 数据库
docker exec cloudphone-postgres psql -U postgres -d cloudphone_user -c "\dt"

应该包含:
- users
- roles
- permissions
- user_roles
- role_permissions
- data_scopes
- field_permissions
- menus
- departments
- tenants
- quotas
- tickets
- ticket_replies
- audit_logs
- api_keys

# Device Service 数据库
docker exec cloudphone-postgres psql -U postgres -d cloudphone_device -c "\dt"

应该包含:
- devices
- device_snapshots
- device_templates
- gpu_allocations

# App Service 数据库
docker exec cloudphone-postgres psql -U postgres -d cloudphone_app -c "\dt"

应该包含:
- applications
- device_applications

# Billing Service 数据库
docker exec cloudphone-postgres psql -U postgres -d cloudphone_billing -c "\dt"

应该包含:
- plans
- orders
- payments
- balances
- balance_transactions
- invoices
- usage_records
- billing_rules

# Notification Service 数据库
docker exec cloudphone-postgres psql -U postgres -d cloudphone_notification -c "\dt"

应该包含:
- notifications
- notification_templates
```

---

## 🎯 立Login执行的修复

### Step 1: 更新 API Gateway 配置
```bash
# 编辑 backend/api-gateway/.env
# 删除 DB_DATABASE 配置
```

### Step 2: 删除废弃数据库
```bash
docker exec cloudphone-postgres psql -U postgres -c "DROP DATABASE IF EXISTS cloudphone_auth;"
```

### Step 3: 验证数据库迁移

检查每个服务是否运行了迁移：

```bash
cd backend/user-service && npm run migrate:status
cd backend/device-service && npm run migrate:status  
cd backend/app-service && npm run migrate:status
cd backend/billing-service && npm run migrate:status
cd backend/notification-service && npm run migrate:status
```

---

## 📊 数据库架构优化建议

### 当前架构（多数据库）
```
✅ 优点：
- 服务完全独立
- 故障隔离
- 独立扩展

⚠️ 缺点：
- 跨服务查询困难
- 数据一致性需要事件驱动
```

### 如果需要优化

**选项 A: 保持多数据库** (推荐，微服务标准)
- 使用事件驱动同步数据
- 你已经有 RabbitMQ ✅

**选项 B: 合并部分数据库**
- User + Billing → cloudphone_core
- 减少数据库数量
- 但违反微服务原则

---

## ✅ 推荐配置

保持当前的多数据库架构，但需要：

1. **删除 cloudphone_auth**（废弃）
2. **更新 API Gateway .env**（删除数据库配置）
3. **确保所有迁移已运行**（表结构一致）
4. **使用事件驱动**（跨服务数据同步）

---

## 🚀 执行修复

要我现在执行这些修复吗？

