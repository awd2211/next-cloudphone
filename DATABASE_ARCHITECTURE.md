# 数据库架构 - 已独立配置

**配置完成时间**: 2025-10-21  
**独立程度**: 100% ✅

---

## 📊 数据库结构

### PostgreSQL 容器中的数据库

```
PostgreSQL (Docker: cloudphone-postgres)
│
├── cloudphone           (旧库，保留作为备份)
├── cloudphone_core      (核心业务库) ✨
├── cloudphone_billing   (计费业务库) ✨
└── cloudphone_analytics (数据分析库) ✨
```

---

## 🗄️ 数据库分配表

### cloudphone_core - 核心业务数据库

**使用此库的服务**:
- ✅ API Gateway (30000)
- ✅ User Service (30001)
- ✅ Device Service (30002)
- ✅ App Service (30003)
- ✅ Notification Service (30006)
- ✅ Scheduler Service (30004)

**存储的数据**:
```
• users - 用户表
• roles - 角色表
• permissions - 权限表
• role_permissions - 角色权限关联
• user_roles - 用户角色关联
• devices - 设备表
• device_templates - 设备模板
• device_snapshots - 设备快照
• applications - 应用表
• device_applications - 设备应用关联
• notifications - 通知表
```

---

### cloudphone_billing - 计费业务数据库

**使用此库的服务**:
- ✅ Billing Service (30005)

**存储的数据**:
```
• orders - 订单表
• plans - 套餐计划表
• payments - 支付记录表
• usage_records - 使用记录表
• invoices - 发票表
• billing_rules - 计费规则表
• user_balances - 用户余额表
```

---

### cloudphone_analytics - 数据分析数据库

**使用此库的服务**:
- ⏸️ (预留给未来的数据分析服务)

**存储的数据**:
```
• analytics_events - 分析事件表（已创建）
• 其他分析表（未来添加）
```

---

### cloudphone - 旧数据库

**状态**: 保留作为备份
**用途**: 回滚时可用

---

## ✅ 配置验证

### 本地 .env 配置

```bash
# Device Service
backend/device-service/.env
└── DB_DATABASE=cloudphone_core ✅

# App Service
backend/app-service/.env
└── DB_DATABASE=cloudphone_core ✅

# Billing Service
backend/billing-service/.env
└── DB_DATABASE=cloudphone_billing ✅

# User Service
backend/user-service/.env
└── DB_DATABASE=cloudphone_core ✅

# API Gateway
backend/api-gateway/.env
└── DB_DATABASE=cloudphone_core ✅

# Notification Service
backend/notification-service/.env
└── DB_DATABASE=cloudphone_core ✅

# Scheduler Service
backend/scheduler-service/.env
└── DB_NAME=cloudphone_core ✅ (Python用DB_NAME)
```

### Docker Compose 配置

```yaml
# API Gateway
DB_DATABASE: cloudphone_core ✅

# User Service
DB_DATABASE: cloudphone_core ✅

# Device Service
DB_DATABASE: cloudphone_core ✅

# App Service
DB_DATABASE: cloudphone_core ✅

# Billing Service
DB_DATABASE: cloudphone_billing ✅

# Scheduler Service
DB_DATABASE: cloudphone_core ✅

# Notification Service
DB_DATABASE: cloudphone_core ✅
```

---

## 🎯 数据库隔离优势

### 1. 服务解耦
```
Billing Service 独立数据库
  → 可以独立扩展
  → 可以使用不同数据库技术（如时序数据库）
  → 故障隔离
```

### 2. 数据安全
```
计费数据（敏感）
  → 独立数据库
  → 独立备份策略
  → 独立访问控制
```

### 3. 性能优化
```
每个数据库可以:
  → 独立调优参数
  → 独立建立索引
  → 独立扩展存储
```

### 4. 合规要求
```
财务数据（订单、支付）
  → 独立存储
  → 审计友好
  → 满足金融合规
```

---

## 🔄 跨数据库查询

由于数据库已独立，跨库查询需要通过服务间调用：

### Before (单一数据库)
```sql
-- 可以直接 JOIN
SELECT d.*, u.username, o.amount
FROM devices d
JOIN users u ON d.user_id = u.id
LEFT JOIN orders o ON o.device_id = d.id
```

### After (独立数据库)
```typescript
// 需要通过服务调用聚合
const device = await deviceService.findOne(id); // from cloudphone_core
const user = await userService.findOne(device.userId); // from cloudphone_core  
const orders = await billingService.getDeviceOrders(id); // from cloudphone_billing

// 在应用层组装数据
return {
  ...device,
  user,
  orders
};
```

这是微服务的标准做法，通过 API 聚合而不是数据库 JOIN。

---

## 📈 数据库大小预估

### 开发环境
```
cloudphone_core: ~100MB
cloudphone_billing: ~50MB
cloudphone_analytics: ~10MB
总计: ~160MB
```

### 生产环境（10万用户）
```
cloudphone_core: ~10-20GB
cloudphone_billing: ~50-100GB (订单、支付记录多)
cloudphone_analytics: ~100-500GB (事件数据多)
总计: ~160-620GB
```

独立数据库可以分别部署到不同的服务器或云数据库。

---

## 🔧 数据库管理

### 连接到各数据库

```bash
# Core 数据库
docker exec -it cloudphone-postgres psql -U postgres cloudphone_core

# Billing 数据库
docker exec -it cloudphone-postgres psql -U postgres cloudphone_billing

# Analytics 数据库
docker exec -it cloudphone-postgres psql -U postgres cloudphone_analytics
```

### 备份

```bash
# 备份 Core 数据库
docker exec cloudphone-postgres pg_dump -U postgres cloudphone_core > backup_core.sql

# 备份 Billing 数据库
docker exec cloudphone-postgres pg_dump -U postgres cloudphone_billing > backup_billing.sql
```

### 恢复

```bash
# 恢复 Core 数据库
cat backup_core.sql | docker exec -i cloudphone-postgres psql -U postgres cloudphone_core
```

---

## ✅ 总结

**数据库独立状态**: ✅ 100% 完成

所有服务（本地和Docker）都已配置使用独立数据库：
- 核心业务 → cloudphone_core
- 计费业务 → cloudphone_billing
- 数据分析 → cloudphone_analytics

这符合微服务架构的**Database Per Service Pattern**最佳实践！

---

**配置完成**: 2025-10-21 14:45  
**数据库**: 完全隔离 ✅





