# 权限代码迁移指南
## Code Migration Guide for Permission Naming Convention

## 📋 概述

本文档指导开发者将代码中的权限引用从旧格式（冒号）迁移到新格式（点号）。

## 🔍 需要更新的文件

通过扫描发现以下文件使用旧的冒号格式权限：

### Billing Service (18 处)
- `src/dashboard/dashboard.controller.ts` (4 处)
- `src/stats/stats.controller.ts` (12 处)
- `src/reports/reports.controller.ts` (6 处)
- `src/billing/billing.controller.ts` (17 处)

### SMS Receive Service (11 处)
- `src/controllers/verification-code.controller.ts` (7 处)
- `src/controllers/statistics.controller.ts` (3 处)

### Proxy Service (60+ 处)
- `src/proxy/controllers/proxy-usage-report.controller.ts` (12 处)
- `src/proxy/controllers/proxy-sticky-session.controller.ts` (7 处)
- `src/proxy/controllers/proxy-provider-ranking.controller.ts` (6 处)
- `src/proxy/controllers/proxy-intelligence.controller.ts` (13 处)
- `src/proxy/controllers/proxy-geo-matching.controller.ts` (7 处)
- `src/proxy/controllers/proxy-device-group.controller.ts` (7 处)
- 以及其他 controllers...

## 📝 迁移规则

### 格式转换规则

| 旧格式 (冒号) | 新格式 (点号) | 说明 |
|--------------|--------------|------|
| `billing:read` | `billing.read` | 基础权限 |
| `billing:create` | `billing.create` | 基础权限 |
| `billing:update` | `billing.update` | 基础权限 |
| `billing:delete` | `billing.delete` | 基础权限 |
| `sms:verification-code:read` | `sms.verification-code.read` | 子资源权限 |
| `sms:statistics:view` | `sms.statistics.view` | 子资源权限 |
| `proxy:report:create` | `proxy.report.create` | 子资源权限 |
| `proxy:device-group:manage-devices` | `proxy.device-group.manage-devices` | 多级子资源 |

### 转换示例

#### Before (旧格式)
```typescript
import { RequirePermission } from '@cloudphone/shared';

@Controller('billing')
export class BillingController {
  @Get()
  @RequirePermission('billing:read')  // ❌ 旧格式
  async findAll() {
    // ...
  }

  @Post()
  @RequirePermission('billing:create')  // ❌ 旧格式
  async create(@Body() dto: CreateBillingDto) {
    // ...
  }
}
```

#### After (新格式)
```typescript
import { RequirePermission } from '@cloudphone/shared';

@Controller('billing')
export class BillingController {
  @Get()
  @RequirePermission('billing.read')  // ✅ 新格式
  async findAll() {
    // ...
  }

  @Post()
  @RequirePermission('billing.create')  // ✅ 新格式
  async create(@Body() dto: CreateBillingDto) {
    // ...
  }
}
```

## 🤖 自动化迁移脚本

我们提供了自动化脚本来执行批量替换：

### 使用方法

```bash
# 1. 查看将要进行的更改（dry-run）
./scripts/migrate-permissions.sh --dry-run

# 2. 确认无误后执行实际更改
./scripts/migrate-permissions.sh

# 3. 检查更改结果
git diff
```

### 手动迁移步骤

如果需要手动迁移，按以下步骤操作：

#### 1. Billing Service

```bash
cd backend/billing-service

# 替换 billing:read
find src -type f -name "*.ts" -exec sed -i "s/'billing:read'/'billing.read'/g" {} +

# 替换 billing:create
find src -type f -name "*.ts" -exec sed -i "s/'billing:create'/'billing.create'/g" {} +

# 替换 billing:update
find src -type f -name "*.ts" -exec sed -i "s/'billing:update'/'billing.update'/g" {} +

# 替换 billing:delete
find src -type f -name "*.ts" -exec sed -i "s/'billing:delete'/'billing.delete'/g" {} +
```

#### 2. SMS Receive Service

```bash
cd backend/sms-receive-service

# 替换 sms: 相关权限
find src -type f -name "*.ts" -exec sed -i "s/'sms:verification-code:read'/'sms.verification-code.read'/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/'sms:verification-code:validate'/'sms.verification-code.validate'/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/'sms:verification-code:consume'/'sms.verification-code.consume'/g" {} +
find src -type f -name "*.ts" -exec sed -i "s/'sms:statistics:view'/'sms.statistics.view'/g" {} +
```

#### 3. Proxy Service

```bash
cd backend/proxy-service

# 替换所有 proxy: 权限（冒号改为点号）
find src -type f -name "*.ts" -exec sed -i "s/@RequirePermission('proxy:\([^']*\):/@RequirePermission('proxy.\1./g" {} +
find src -type f -name "*.ts" -exec sed -i "s/@RequirePermission('proxy:\([^']*\)')/@RequirePermission('proxy.\1')/g" {} +
```

## ⚠️ 注意事项

### 1. 数据库同步

**重要**: 代码更新前，必须先执行数据库迁移脚本！

```bash
# 确保已执行数据库迁移
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_user < \
  database/migrations/001-unify-permission-naming-simple.sql
```

### 2. 创建缺失的权限

某些代码使用的权限可能在数据库中不存在，需要手动创建：

```sql
-- 示例：创建 SMS 相关权限
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'sms.verification-code.read', '查看验证码', 'sms', 'verification-code.read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'sms.verification-code.validate', '验证验证码', 'sms', 'verification-code.validate', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'sms.verification-code.consume', '消费验证码', 'sms', 'verification-code.consume', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'sms.statistics.view', '查看SMS统计', 'sms', 'statistics.view', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 分配给 super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
  AND p.name LIKE 'sms.%'
ON CONFLICT DO NOTHING;
```

### 3. 测试验证

每个服务更新后，必须测试权限检查是否正常工作：

```bash
# 1. 重新编译 TypeScript
cd backend/billing-service
pnpm build

# 2. 重启服务
pm2 restart billing-service

# 3. 查看日志确认无错误
pm2 logs billing-service --lines 50

# 4. 测试API端点
curl -X GET http://localhost:30000/billing \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. 向后兼容性

**好消息**: 数据库迁移保留了旧权限（标记为 deprecated），因此：
- ✅ 更新前的代码继续工作
- ✅ 更新后的代码也能工作
- ✅ 可以逐步迁移，不必一次性全部更新

## 🔧 故障排除

### 问题 1: 权限被拒绝 (403 Forbidden)

**可能原因**: 新权限未分配给角色

**解决方案**:
```sql
-- 检查权限是否存在
SELECT * FROM permissions WHERE name = 'billing.read';

-- 检查角色是否有该权限
SELECT r.name, p.name
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.name = 'billing.read';

-- 如果没有，手动分配
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin' AND p.name = 'billing.read'
ON CONFLICT DO NOTHING;
```

### 问题 2: 编译错误

**可能原因**: sed 替换导致语法错误

**解决方案**:
```bash
# 使用 git 恢复文件
git checkout backend/billing-service/src/billing/billing.controller.ts

# 手动编辑文件
vim backend/billing-service/src/billing/billing.controller.ts

# 使用编辑器的查找替换功能 (Ctrl+H)
# 查找: 'billing:read'
# 替换为: 'billing.read'
```

### 问题 3: 部分权限未更新

**可能原因**: 使用双引号而非单引号

**解决方案**:
```bash
# 同时替换单引号和双引号版本
sed -i "s/'billing:read'/'billing.read'/g" src/billing/billing.controller.ts
sed -i 's/"billing:read"/"billing.read"/g' src/billing/billing.controller.ts
```

## 📊 迁移进度追踪

### 待迁移服务

- [ ] **billing-service** (39 处)
  - [ ] dashboard.controller.ts
  - [ ] stats.controller.ts
  - [ ] reports.controller.ts
  - [ ] billing.controller.ts

- [ ] **sms-receive-service** (11 处)
  - [ ] verification-code.controller.ts
  - [ ] statistics.controller.ts

- [ ] **proxy-service** (60+ 处)
  - [ ] proxy-usage-report.controller.ts
  - [ ] proxy-sticky-session.controller.ts
  - [ ] proxy-provider-ranking.controller.ts
  - [ ] proxy-intelligence.controller.ts
  - [ ] proxy-geo-matching.controller.ts
  - [ ] proxy-device-group.controller.ts
  - [ ] 其他 controllers...

### 已迁移服务

- [x] **billing-service/payments.controller.ts** - ✅ 已使用正确格式

## 🎯 最佳实践

1. **一次迁移一个服务**: 不要同时更新多个服务，便于排查问题
2. **先测试后部署**: 在开发环境充分测试后再部署到生产环境
3. **保留 Git 历史**: 每个服务迁移后单独提交，方便回滚
4. **文档先行**: 更新代码前先确保数据库迁移已完成
5. **持续验证**: 迁移后持续监控日志，确保无权限拒绝错误

## 📚 相关资源

- **权限命名规范**: `docs/PERMISSION_NAMING_CONVENTION.md`
- **迁移完成报告**: `PERMISSION_UNIFICATION_COMPLETE.md`
- **数据库迁移脚本**: `database/migrations/001-unify-permission-naming-simple.sql`
- **自动化脚本**: `scripts/migrate-permissions.sh`

---

**更新时间**: 2025-11-07
**维护者**: System Architecture Team
