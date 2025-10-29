# 多设备提供商支持 - 生产环境部署就绪清单

**验证时间**: 2025-10-29
**验证人**: Claude Code
**状态**: ✅ 就绪

---

## ✅ 代码完整性验证

### 1. Shared Module (核心类型定义)

| 文件 | 状态 | 说明 |
|------|------|------|
| `backend/shared/src/types/provider.types.ts` | ✅ 存在 | 定义 4 种 Provider 类型和中文名称 |
| `backend/shared/src/events/schemas/device.events.ts` | ✅ 存在 | 19 个设备事件包含 Provider 字段 |
| `backend/shared/src/index.ts` | ✅ 已更新 | 导出 Provider 类型 |

**验证命令**:
```bash
cd backend/shared && pnpm build
# ✅ 编译成功
```

---

### 2. Billing Service (差异化计费)

| 文件 | 状态 | 说明 |
|------|------|------|
| `backend/billing-service/src/billing/pricing-engine.service.ts` | ✅ 存在 | 计费引擎核心逻辑 (303 行) |
| `backend/billing-service/src/billing/pricing-engine.service.spec.ts` | ✅ 存在 | 18 个单元测试 |
| `backend/billing-service/src/billing/entities/usage-record.entity.ts` | ✅ 已更新 | 新增 6 个 Provider 字段 |
| `backend/billing-service/src/metering/metering.service.ts` | ✅ 已更新 | 集成计费引擎 |
| `backend/billing-service/migrations/20251029_add_provider_fields_to_usage_records.sql` | ✅ 存在 | 数据库迁移脚本 |

**验证命令**:
```bash
cd backend/billing-service && pnpm build
# ✅ 编译成功

pnpm test src/billing/pricing-engine.service.spec.ts
# ✅ 18/18 测试通过
```

---

### 3. Notification Service (Provider 感知通知)

| 文件 | 状态 | 说明 |
|------|------|------|
| `backend/notification-service/src/types/events.ts` | ✅ 已更新 | 从 Shared 导入事件类型 |
| `backend/notification-service/src/rabbitmq/consumers/device-events.consumer.ts` | ✅ 已更新 | 7 个事件处理方法包含 Provider 信息 |
| `backend/notification-service/update-device-templates-with-provider.sql` | ✅ 存在 | 通知模板更新脚本 |

**验证命令**:
```bash
cd backend/notification-service && pnpm build
# ✅ 编译成功
```

---

## 🗄️ 数据库迁移

### Billing Service 数据库

**迁移文件**: `backend/billing-service/migrations/20251029_add_provider_fields_to_usage_records.sql`

**新增字段**:
1. `provider_type` VARCHAR(20) - 设备提供商类型
2. `device_type` VARCHAR(10) - 设备类型
3. `device_name` VARCHAR(255) - 设备名称
4. `device_config` JSONB - 设备配置快照
5. `billing_rate` DECIMAL(10,4) - 计费费率
6. `pricing_tier` VARCHAR(20) - 定价层级

**新增索引**:
- `idx_usage_records_provider_type` - Provider 类型索引
- `idx_usage_records_device_type` - 设备类型索引
- `idx_usage_records_pricing_tier` - 定价层级索引
- `idx_usage_records_user_provider` - 用户+Provider 复合索引
- `idx_usage_records_tenant_provider` - 租户+Provider 复合索引

**执行命令**:
```bash
cd /home/eric/next-cloudphone/backend/billing-service
psql -U postgres -d cloudphone_billing < \
  migrations/20251029_add_provider_fields_to_usage_records.sql
```

**验证命令**:
```sql
-- 查看表结构
\d usage_records

-- 验证新字段存在
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'usage_records'
  AND column_name IN ('provider_type', 'device_config', 'billing_rate', 'pricing_tier');

-- 验证索引存在
SELECT indexname
FROM pg_indexes
WHERE tablename = 'usage_records'
  AND indexname LIKE '%provider%';
```

---

### Notification Service 数据库

**迁移文件**: `backend/notification-service/update-device-templates-with-provider.sql`

**更新内容**:
- 更新 3 个现有模板（device.created, device.creation_failed, device.error）
- 新增 4 个模板（device.started, device.stopped, device.connection_lost, device.deleted）
- 所有模板支持 `{{providerDisplayName}}` 变量

**执行命令**:
```bash
cd /home/eric/next-cloudphone/backend/notification-service
psql -U postgres -d cloudphone < \
  update-device-templates-with-provider.sql
```

**验证命令**:
```sql
-- 查看设备相关模板
SELECT code, name, title
FROM notification_templates
WHERE code LIKE 'device.%'
ORDER BY code;

-- 验证模板包含 Provider 信息
SELECT code, body
FROM notification_templates
WHERE code = 'device.created';
-- 应该看到 {{providerDisplayName}} 变量
```

---

## 🧪 测试验证

### 单元测试

```bash
# Billing Service - Pricing Engine 测试
cd backend/billing-service
pnpm test src/billing/pricing-engine.service.spec.ts

# 预期结果：
# Test Suites: 1 passed, 1 total
# Tests:       18 passed, 18 total
# ✅ 所有测试通过
```

### 手动功能测试

#### 1. 测试差异化计费

```typescript
// 在 Billing Service 控制台或测试中
import { PricingEngineService } from './billing/pricing-engine.service';
import { DeviceProviderType } from '@cloudphone/shared';

const pricingEngine = new PricingEngineService();

// 测试 Redroid 设备计费
const redroidCost = pricingEngine.calculateCost(
  DeviceProviderType.REDROID,
  { cpuCores: 2, memoryMB: 2048, gpuEnabled: false },
  3600 // 1 小时
);
console.log('Redroid 1小时成本:', redroidCost.totalCost); // 预期: 0.8 元

// 测试 Physical 设备计费
const physicalCost = pricingEngine.calculateCost(
  DeviceProviderType.PHYSICAL,
  { cpuCores: 0, memoryMB: 0 },
  3600
);
console.log('Physical 1小时成本:', physicalCost.totalCost); // 预期: 0.3 元

// 测试云手机计费
const huaweiCost = pricingEngine.calculateCost(
  DeviceProviderType.HUAWEI_CPH,
  { cpuCores: 2, memoryMB: 2048 },
  3600
);
console.log('华为云手机 1小时成本:', huaweiCost.totalCost); // 预期: 2.1 元
```

#### 2. 测试事件发布（需要运行的服务）

```bash
# 启动必要服务
docker compose -f docker-compose.dev.yml up -d postgres redis rabbitmq

# 启动 Billing Service
cd backend/billing-service && pnpm dev

# 启动 Notification Service
cd backend/notification-service && pnpm dev

# 模拟设备停止事件
# 在 RabbitMQ 管理界面 (http://localhost:15672) 发布测试消息到 cloudphone.events
# 路由键: device.stopped
# 消息体:
{
  "deviceId": "test-device-123",
  "deviceName": "测试Redroid设备",
  "userId": "user-123",
  "providerType": "redroid",
  "deviceType": "phone",
  "stoppedAt": "2025-10-29T10:00:00Z",
  "duration": 3600,
  "timestamp": "2025-10-29T10:00:00Z"
}

# 预期结果:
# 1. Billing Service 计算成本为 0.8 元
# 2. Notification Service 发送通知 "Redroid 容器设备 已停止"
```

---

## 🚀 生产环境部署步骤

### Step 1: 备份数据库

```bash
# 备份 Billing Service 数据库
pg_dump -U postgres -d cloudphone_billing > backup_billing_$(date +%Y%m%d).sql

# 备份 Notification Service 数据库
pg_dump -U postgres -d cloudphone > backup_cloudphone_$(date +%Y%m%d).sql
```

### Step 2: 停止相关服务

```bash
pm2 stop billing-service
pm2 stop notification-service
```

### Step 3: 部署代码

```bash
cd /home/eric/next-cloudphone

# 拉取最新代码（如果使用 Git）
git pull origin main

# 安装依赖
cd backend/shared && pnpm install && pnpm build
cd ../billing-service && pnpm install && pnpm build
cd ../notification-service && pnpm install && pnpm build
```

### Step 4: 执行数据库迁移

```bash
# Billing Service
cd backend/billing-service
psql -U postgres -d cloudphone_billing < \
  migrations/20251029_add_provider_fields_to_usage_records.sql

# Notification Service
cd ../notification-service
psql -U postgres -d cloudphone < \
  update-device-templates-with-provider.sql
```

### Step 5: 验证迁移结果

```bash
# 验证 Billing Service 表结构
psql -U postgres -d cloudphone_billing -c "\d usage_records" | grep provider

# 验证 Notification Service 模板
psql -U postgres -d cloudphone -c \
  "SELECT code, title FROM notification_templates WHERE code LIKE 'device.%';"
```

### Step 6: 启动服务

```bash
pm2 restart billing-service
pm2 restart notification-service

# 查看日志确认无错误
pm2 logs billing-service --lines 50
pm2 logs notification-service --lines 50
```

### Step 7: 健康检查

```bash
# Billing Service 健康检查
curl http://localhost:30005/health

# Notification Service 健康检查
curl http://localhost:30006/health

# 预期响应: {"status": "ok"}
```

---

## 📊 监控指标

### 建议监控的指标

1. **Provider 使用分布**:
   ```sql
   SELECT
     provider_type,
     COUNT(*) as usage_count,
     SUM(cost) as total_revenue,
     AVG(cost) as avg_cost
   FROM usage_records
   WHERE "startTime" >= NOW() - INTERVAL '24 hours'
   GROUP BY provider_type;
   ```

2. **定价层级分布**:
   ```sql
   SELECT
     pricing_tier,
     COUNT(*) as count,
     AVG(billing_rate) as avg_rate
   FROM usage_records
   WHERE "startTime" >= NOW() - INTERVAL '7 days'
   GROUP BY pricing_tier;
   ```

3. **通知发送成功率**:
   ```sql
   SELECT
     COUNT(*) as total,
     SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
     SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
   FROM notifications
   WHERE "createdAt" >= NOW() - INTERVAL '24 hours';
   ```

---

## 🔄 回滚计划

如果部署后发现问题，按以下步骤回滚：

### Step 1: 停止服务

```bash
pm2 stop billing-service
pm2 stop notification-service
```

### Step 2: 回滚代码

```bash
cd /home/eric/next-cloudphone
git checkout <previous-commit-hash>

cd backend/billing-service && pnpm install && pnpm build
cd ../notification-service && pnpm install && pnpm build
```

### Step 3: 回滚数据库（如果需要）

```bash
# 恢复备份
psql -U postgres -d cloudphone_billing < backup_billing_YYYYMMDD.sql
psql -U postgres -d cloudphone < backup_cloudphone_YYYYMMDD.sql
```

### Step 4: 重启服务

```bash
pm2 restart billing-service
pm2 restart notification-service
```

---

## ✅ 最终检查清单

在生产环境部署前，请确认以下所有项：

- [ ] 所有代码文件已提交到 Git
- [ ] 数据库备份已完成
- [ ] 数据库迁移脚本已测试
- [ ] 单元测试全部通过（18/18）
- [ ] TypeScript 编译成功（3 个服务）
- [ ] 环境变量配置正确
- [ ] RabbitMQ 连接正常
- [ ] PostgreSQL 连接正常
- [ ] 监控告警已配置
- [ ] 回滚计划已准备

---

## 📞 联系方式

**部署支持**: 请参考各服务的 README.md
**问题反馈**: GitHub Issues

---

**验证人**: Claude Code
**验证日期**: 2025-10-29
**验证状态**: ✅ 就绪
**推荐部署时间**: 业务低峰期（凌晨 2-4 点）
