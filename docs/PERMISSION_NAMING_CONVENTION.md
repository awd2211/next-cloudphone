# 权限命名规范 (Permission Naming Convention)

## 📋 目标

统一整个系统的权限命名规范，解决当前存在的命名不一致问题，确保代码中的 `@RequirePermission` 装饰器与数据库中的权限名称完全匹配。

## 🔍 现状分析

### 当前问题

1. **两种分隔符共存**:
   - 点号 (`.`): 79.2% 的权限使用此格式 (407/514)
   - 冒号 (`:`): 20.8% 的权限使用此格式 (107/514)

2. **同一资源内部不一致**:
   ```
   billing.read    ← 点号格式
   billing:create  ← 冒号格式  ❌ 不一致
   billing:read    ← 冒号格式（与上面重复）
   ```

3. **代码与数据库不匹配**:
   ```typescript
   // payments.controller.ts
   @RequirePermission('billing.payment-create')  // ❌ 数据库中不存在
   @RequirePermission('billing.payment-read')    // ❌ 数据库中不存在

   // 数据库中只有
   billing:create  ← 冒号格式
   billing:read    ← 冒号格式
   ```

### 数据统计

| 资源类型 | 使用点号 | 使用冒号 | 示例 |
|---------|---------|---------|------|
| api-key | ✅ 100% | ❌ 0% | `api-key.create` |
| app | ✅ 100% | ❌ 0% | `app.bulk-install.approve` |
| device | ⚠️ 混合 | ⚠️ 混合 | `device.create`, `device:read` |
| billing | ⚠️ 混合 | ⚠️ 混合 | `billing.read`, `billing:create` |
| user | ✅ 100% | ❌ 0% | `user.create` |
| permission | ❌ 0% | ✅ 100% | `permission:dataScope:create` |

## ✅ 统一规范

### 1. 命名格式

**标准格式**: `resource.sub-resource.action`

- **分隔符**: 统一使用点号 (`.`)
- **命名风格**: kebab-case (小写字母 + 连字符)
- **层级结构**: 最多 3 级

### 2. 命名规则

#### 2.1 基础权限（2级）

```
resource.action
```

**示例**:
```
user.create          ✅ 创建用户
user.read           ✅ 查看用户
user.update         ✅ 更新用户
user.delete         ✅ 删除用户
device.create       ✅ 创建设备
billing.read        ✅ 查看账单
```

#### 2.2 子资源权限（3级）

当需要对资源的特定子功能进行权限控制时：

```
resource.sub-resource.action
```

**示例**:
```
billing.payment.create        ✅ 创建支付订单
billing.payment.read          ✅ 查看支付记录
billing.payment.refund        ✅ 执行退款操作
billing.invoice.generate      ✅ 生成发票
billing.invoice.download      ✅ 下载发票
app.bulk-install.approve      ✅ 批准批量安装
app.bulk-install.execute      ✅ 执行批量安装
device.snapshot.create        ✅ 创建设备快照
device.snapshot.restore       ✅ 恢复设备快照
```

#### 2.3 数据范围权限（3级）

用于控制用户可访问的数据范围：

```
resource.read.scope
```

**示例**:
```
device.read.own               ✅ 只能查看自己的设备
device.read.department        ✅ 可查看部门的设备
device.read.tenant            ✅ 可查看租户的设备
device.read.all               ✅ 可查看所有设备
user.read.own                 ✅ 只能查看自己的信息
user.read.all                 ✅ 可查看所有用户信息
```

#### 2.4 操作范围权限（3级）

用于控制批量操作：

```
resource.action.scope
```

**示例**:
```
device.delete.single          ✅ 删除单个设备
device.delete.bulk            ✅ 批量删除设备
device.start.single           ✅ 启动单个设备
device.start.bulk             ✅ 批量启动设备
```

### 3. 特殊约定

#### 3.1 通配符权限

管理员角色可使用通配符：

```
admin.full                    ✅ 完全管理员权限（所有资源的所有操作）
resource.*                    ✅ 资源的所有操作（如 device.*）
```

**注意**: 不再使用 `:*:*` 格式

#### 3.2 审批工作流权限

对于需要审批的操作，使用 3 级格式：

```
resource.operation.request    ✅ 请求操作
resource.operation.approve    ✅ 批准操作
resource.operation.execute    ✅ 执行操作
```

**示例**:
```
device.premium-create.request  ✅ 请求创建高级设备
device.premium-create.approve  ✅ 批准创建高级设备
device.premium-create.execute  ✅ 执行创建高级设备
```

#### 3.3 敏感操作权限

对于敏感操作，添加明确的标识：

```
resource.sensitive-action
```

**示例**:
```
audit-log.sensitive-read      ✅ 查看敏感审计日志
user.password.reset           ✅ 重置用户密码
```

## 🔄 迁移方案

### 阶段 1: 创建新权限（不影响现有系统）

1. 为所有使用冒号格式的权限创建对应的点号格式版本
2. 标记旧权限为 `deprecated`，但保持激活状态
3. 为 `billing` 资源添加缺失的细粒度权限

**执行**: 运行 `/home/eric/next-cloudphone/database/migrations/001-unify-permission-naming.sql`

### 阶段 2: 更新代码（逐步迁移）

1. 更新所有 `@RequirePermission` 装饰器使用新格式
2. 更新所有 Guard 和权限检查逻辑
3. 更新前端权限检查代码

### 阶段 3: 数据迁移（维护窗口）

1. 将用户已有的旧权限映射到新权限
2. 更新所有角色的权限绑定
3. 验证所有用户权限正确性

### 阶段 4: 清理（可选）

1. 禁用旧权限 (`isActive = false`)
2. 在数据库中保留旧权限记录（用于审计）
3. 文档标记旧权限已废弃

## 📊 迁移清单

### 需要重命名的权限（示例）

| 旧名称 | 新名称 | 资源 | 操作 |
|-------|--------|------|------|
| `billing:create` | `billing.create` | billing | create |
| `billing:read` | `billing.read` | billing | read |
| `billing:update` | `billing.update` | billing | update |
| `billing:delete` | `billing.delete` | billing | delete |
| `device:*` | `device.*` | device | * |
| `device:create` | `device.create` | device | create |
| `device:read` | `device.read` | device | read |
| `device:sms:request` | `device.sms.request` | device | sms.request |
| `device:sms:cancel` | `device.sms.cancel` | device | sms.cancel |
| `permission:dataScope:create` | `permission.data-scope.create` | permission | data-scope.create |
| `permission:dataScope:update` | `permission.data-scope.update` | permission | data-scope.update |
| `permission:menu:list` | `permission.menu.list` | permission | menu.list |
| `field-permission:create` | `field-permission.create` | field-permission | create |
| `admin:*:*` | `admin.full` | admin | full |
| `admin:view` | `admin.view` | admin | view |

### 需要新增的权限（补充缺失）

| 权限名称 | 描述 | 资源 | 操作 |
|---------|------|------|------|
| `billing.payment.create` | 创建支付订单 | billing | payment.create |
| `billing.payment.read` | 查看支付记录 | billing | payment.read |
| `billing.payment.update` | 更新支付状态 | billing | payment.update |
| `billing.payment.delete` | 删除支付记录 | billing | payment.delete |
| `billing.payment.refund` | 执行退款操作 | billing | payment.refund |
| `billing.payment.verify` | 验证支付结果 | billing | payment.verify |
| `billing.invoice.generate` | 生成发票 | billing | invoice.generate |
| `billing.invoice.download` | 下载发票 | billing | invoice.download |

## 🎯 实施步骤

### 立即执行（阶段 1）

```bash
# 1. 应用数据库迁移脚本
cd /home/eric/next-cloudphone
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_user < database/migrations/001-unify-permission-naming.sql

# 2. 验证新权限已创建
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_user -c "
  SELECT name, resource, action, description, \"isDeprecated\"
  FROM permissions
  WHERE name LIKE 'billing.payment%'
  ORDER BY name;
  "

# 3. 验证 super_admin 已获得新权限
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_user -c "
  SELECT r.name as role_name, p.name as permission_name, p.description
  FROM roles r
  JOIN role_permissions rp ON r.id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE r.name = 'super_admin' AND p.name LIKE 'billing.payment%'
  ORDER BY p.name;
  "
```

### 代码更新（阶段 2）

需要更新的文件:

1. **billing-service/src/payments/payments.controller.ts** ✅ 已正确使用新格式
2. **billing-service/src/metering/metering.controller.ts** - 需要检查
3. **所有使用 `billing:*` 格式的代码**
4. **所有使用 `device:*` 格式的代码**
5. **所有使用 `permission:*:*` 格式的代码**

### 测试验证（阶段 3）

```bash
# 1. 测试支付权限
curl -X GET http://localhost:30000/payments \
  -H "Authorization: Bearer $TOKEN"

# 2. 测试旧权限仍然有效（向后兼容）
# 验证使用 billing:read 的代码仍能工作

# 3. 测试权限继承和角色绑定
```

## 📝 代码示例

### Before (旧格式 - 不推荐)

```typescript
@RequirePermission('billing:create')  // ❌ 冒号格式
@RequirePermission('device:read')     // ❌ 冒号格式
@RequirePermission('permission:dataScope:create')  // ❌ 冒号格式
```

### After (新格式 - 推荐)

```typescript
@RequirePermission('billing.create')          // ✅ 点号格式
@RequirePermission('device.read')             // ✅ 点号格式
@RequirePermission('permission.data-scope.create')  // ✅ 点号格式 + kebab-case
@RequirePermission('billing.payment.create')  // ✅ 子资源格式
@RequirePermission('device.read.own')         // ✅ 数据范围格式
```

## 🚨 注意事项

1. **不要删除旧权限**: 标记为 deprecated 但保持激活，确保平滑迁移
2. **向后兼容**: 迁移脚本会为所有角色同时分配新旧两种权限
3. **测试充分**: 在生产环境执行前，在开发/测试环境充分验证
4. **文档更新**: 更新所有相关文档和 API 文档
5. **通知开发团队**: 确保所有开发人员了解新规范

## 📚 参考资源

- 现有权限列表: `SELECT DISTINCT resource FROM permissions ORDER BY resource;`
- 权限统计: 查看本文档的"现状分析"部分
- 迁移脚本: `database/migrations/001-unify-permission-naming.sql`

## 🔗 相关文档

- RBAC 系统设计: `docs/RBAC_SYSTEM_DESIGN.md`
- 权限守卫实现: `backend/shared/src/auth/guards/permissions.guard.ts`
- 角色管理: `backend/user-service/src/roles/`

---

**版本**: 1.0.0
**创建日期**: 2025-11-07
**最后更新**: 2025-11-07
**维护者**: System Architecture Team
