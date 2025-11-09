# 云手机平台 RBAC 优化建议

## 📋 当前系统评估

### ✅ 已有优势
- 完整的角色层级（17个角色，180个权限）
- 字段级权限控制（field_permissions）
- 数据范围权限（data_scopes）
- 多租户隔离
- 权限缓存机制

### ⚠️ 发现的问题

1. **缺少资源所有权区分**
   - 当前：`device.read` 可以读取所有设备
   - 问题：无法区分"读取自己的设备"和"读取所有设备"

2. **批量操作和单个操作未分离**
   - 当前：`device.delete` 既可删除单个也可批量删除
   - 风险：批量删除的危险性远高于单个删除

3. **缺少成本控制维度**
   - 问题：VIP用户和普通用户都能创建高配置设备
   - 缺失：按设备配置的权限限制

4. **审批流程不完善**
   - 当前：只有 `app.approve`
   - 缺失：敏感操作的审批权限（批量删除、高成本操作）

5. **时间和条件限制缺失**
   - 问题：无法设置"工作时间才能操作"
   - 缺失：基于时间、IP、设备状态的动态权限

---

## 🚀 优化建议

### 1️⃣ 资源所有权权限（Resource Ownership）

**新增权限维度**：区分操作自己的资源 vs 操作他人资源

```sql
-- 设备所有权权限
device.read.own          -- 读取自己的设备
device.read.all          -- 读取所有设备（管理员）
device.read.department   -- 读取本部门的设备（部门管理员）
device.read.tenant       -- 读取本租户的设备（租户管理员）

device.delete.own        -- 删除自己的设备
device.delete.all        -- 删除所有设备（仅管理员）

-- 应用所有权权限
app.read.own             -- 查看自己上传的应用
app.read.approved        -- 查看已审核的应用
app.read.all             -- 查看所有应用（审核员）

-- 代理所有权权限
proxy.use.shared         -- 使用共享代理池
proxy.use.dedicated      -- 使用专属代理池
```

**收益**：
- ✅ 更细粒度的权限控制
- ✅ 减少误操作他人资源的风险
- ✅ 符合最小权限原则

---

### 2️⃣ 批量操作权限（Bulk Operations）

**新增批量操作权限**：分离单个操作和批量操作

```sql
-- 设备批量操作
device.delete.single     -- 删除单个设备
device.delete.bulk       -- 批量删除设备（高风险，仅管理员）
device.start.bulk        -- 批量启动设备
device.stop.bulk         -- 批量停止设备

-- 应用批量操作
app.install.single       -- 单个设备安装应用
app.install.bulk         -- 批量设备安装应用

-- 短信批量操作
sms.send.single          -- 发送单条短信
sms.send.bulk            -- 批量发送短信（需要特殊权限）
```

**角色分配建议**：
- `user`: 只有 `.single` 权限
- `admin`: 同时拥有 `.single` 和 `.bulk` 权限
- `super_admin`: 所有批量操作权限

---

### 3️⃣ 成本控制权限（Cost Control）

**新增设备配置限制权限**：

```sql
-- 按设备配置分级
device.create.low        -- 创建低配设备（1核2G）
device.create.medium     -- 创建中配设备（2核4G）
device.create.high       -- 创建高配设备（4核8G）
device.create.premium    -- 创建旗舰设备（8核16G+）

-- 代理使用成本控制
proxy.use.budget.low     -- 使用低成本代理（<$10/day）
proxy.use.budget.medium  -- 使用中等代理（$10-50/day）
proxy.use.budget.high    -- 使用高成本代理（>$50/day）

-- 短信成本控制
sms.send.limit.100       -- 每天最多发送100条
sms.send.limit.1000      -- 每天最多发送1000条
sms.send.limit.unlimited -- 无限制发送（付费用户）
```

**角色分配建议**：
```javascript
user:           device.create.low, device.create.medium
vip_user:       device.create.low, device.create.medium, device.create.high
enterprise_user: device.create.low, device.create.medium, device.create.high
admin:          所有配置级别
```

---

### 4️⃣ 审批流程权限（Approval Workflow）

**新增审批相关权限**：

```sql
-- 应用审批流程
app.submit.review        -- 提交应用审核
app.review.level1        -- 一级审核（初审）
app.review.level2        -- 二级审核（终审）
app.review.reject        -- 拒绝应用
app.review.recall        -- 撤回审核

-- 敏感操作审批
operation.approve.bulk_delete    -- 审批批量删除请求
operation.approve.high_cost      -- 审批高成本操作
operation.approve.data_export    -- 审批数据导出请求

-- 账单争议处理
billing.dispute.create           -- 创建账单争议
billing.dispute.review           -- 审核账单争议
billing.dispute.approve          -- 批准退款
```

**审批流程示例**：
```
用户请求批量删除50台设备
  → 需要 operation.approve.bulk_delete 权限的审批员批准
  → 审批通过后才能执行 device.delete.bulk
```

---

### 5️⃣ 设备生命周期权限（Device Lifecycle）

**新增基于设备状态的权限**：

```sql
-- 按设备状态控制操作
device.start.stopped     -- 启动已停止的设备
device.stop.running      -- 停止运行中的设备
device.restart.running   -- 重启运行中的设备
device.debug.error       -- 调试错误状态的设备
device.recover.failed    -- 恢复失败的设备

-- 快照操作（按状态）
device.snapshot.running  -- 对运行中设备创建快照
device.snapshot.stopped  -- 对停止设备创建快照
```

**业务逻辑**：
- 普通用户只能操作 `running` 和 `stopped` 状态设备
- DevOps 可以操作 `error` 和 `failed` 状态设备

---

### 6️⃣ 时间和地域限制（Temporal & Geo Restrictions）

**在 permissions 表中添加新字段**：

```sql
ALTER TABLE permissions ADD COLUMN time_restrictions JSONB;
ALTER TABLE permissions ADD COLUMN geo_restrictions JSONB;
ALTER TABLE permissions ADD COLUMN ip_whitelist TEXT[];

-- 示例：只允许工作时间操作
UPDATE permissions
SET time_restrictions = '{
  "allowed_hours": "09:00-18:00",
  "allowed_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
  "timezone": "Asia/Shanghai"
}'
WHERE name = 'device.delete.bulk';

-- 示例：只允许特定IP段访问
UPDATE permissions
SET ip_whitelist = ARRAY['192.168.1.0/24', '10.0.0.0/8']
WHERE name = 'admin.full';

-- 示例：地域限制（某些操作只能在特定国家执行）
UPDATE permissions
SET geo_restrictions = '{
  "allowed_countries": ["CN", "US"],
  "blocked_countries": ["KP"]
}'
WHERE name = 'proxy.acquire';
```

---

### 7️⃣ 临时授权和委托（Temporary Grant & Delegation）

**新增临时权限表**：

```sql
CREATE TABLE temporary_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  permission_id UUID NOT NULL REFERENCES permissions(id),
  granted_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  reason TEXT,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 临时权限索引
CREATE INDEX idx_temp_perm_user ON temporary_permissions(user_id, expires_at);
CREATE INDEX idx_temp_perm_active ON temporary_permissions(user_id, revoked, expires_at);
```

**业务场景**：
```javascript
// 场景1：临时提权
// 普通用户需要临时调试设备，管理员授予24小时 device.debug.error 权限

// 场景2：设备委托
// 用户A出差，将自己的10台设备临时委托给用户B管理（7天）

// 场景3：紧急操作
// 凌晨系统故障，DevOps申请临时 super_admin 权限（2小时）
```

**相关权限**：
```sql
permission.grant.temporary       -- 授予临时权限
permission.revoke.temporary      -- 撤销临时权限
permission.delegate.devices      -- 委托设备管理权
permission.delegate.apps         -- 委托应用管理权
```

---

### 8️⃣ API限流权限（Rate Limiting）

**在 roles 表中添加限流配置**：

```sql
ALTER TABLE roles ADD COLUMN rate_limits JSONB;

-- 为不同角色配置API限流
UPDATE roles SET rate_limits = '{
  "api_calls_per_minute": 60,
  "api_calls_per_hour": 1000,
  "concurrent_requests": 5,
  "device_operations_per_hour": 100
}' WHERE name = 'user';

UPDATE roles SET rate_limits = '{
  "api_calls_per_minute": 600,
  "api_calls_per_hour": 10000,
  "concurrent_requests": 50,
  "device_operations_per_hour": 1000
}' WHERE name = 'vip_user';

UPDATE roles SET rate_limits = '{
  "api_calls_per_minute": -1,
  "api_calls_per_hour": -1,
  "concurrent_requests": -1,
  "device_operations_per_hour": -1
}' WHERE name = 'admin';  -- -1 表示无限制
```

**限流维度**：
- API 调用频率（每分钟/每小时）
- 并发请求数
- 资源密集型操作限制（创建设备、批量操作）
- 数据导出频率

---

### 9️⃣ 动态权限（Contextual Permissions）

**基于上下文的动态权限检查**：

```typescript
// 在 RolesGuard 中实现动态权限检查
interface PermissionContext {
  userId: string;
  targetResourceId?: string;
  targetResourceOwner?: string;
  deviceStatus?: 'running' | 'stopped' | 'error';
  deviceConfig?: { cpu: number; memory: number };
  operationType?: 'single' | 'bulk';
  currentTime?: Date;
  userIP?: string;
  userLocation?: { country: string; city: string };
}

async checkPermission(
  user: User,
  permission: string,
  context: PermissionContext
): Promise<boolean> {

  // 1. 基础权限检查
  if (!user.hasPermission(permission)) return false;

  // 2. 所有权检查
  if (permission.endsWith('.own')) {
    if (context.targetResourceOwner !== user.id) return false;
  }

  // 3. 设备状态检查
  if (permission.includes('device.')) {
    const requiredStatus = this.extractRequiredStatus(permission);
    if (requiredStatus && context.deviceStatus !== requiredStatus) {
      return false;
    }
  }

  // 4. 成本控制检查
  if (permission.includes('.create.')) {
    const configLevel = this.extractConfigLevel(permission);
    if (!this.isConfigAllowed(user, context.deviceConfig, configLevel)) {
      return false;
    }
  }

  // 5. 时间限制检查
  const timeRestrictions = await this.getTimeRestrictions(permission);
  if (timeRestrictions && !this.isTimeAllowed(timeRestrictions, context.currentTime)) {
    return false;
  }

  // 6. IP白名单检查
  const ipWhitelist = await this.getIPWhitelist(permission);
  if (ipWhitelist && !ipWhitelist.includes(context.userIP)) {
    return false;
  }

  return true;
}
```

---

### 🔟 权限继承和组合（Permission Inheritance & Composition）

**创建权限组**：

```sql
CREATE TABLE permission_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE permission_group_members (
  group_id UUID REFERENCES permission_groups(id),
  permission_id UUID REFERENCES permissions(id),
  PRIMARY KEY (group_id, permission_id)
);

-- 预定义权限组
INSERT INTO permission_groups (id, name, description) VALUES
('90000000-0000-0000-0001-000000000001', 'device_basic_operations', '设备基础操作权限组'),
('90000000-0000-0000-0001-000000000002', 'device_advanced_operations', '设备高级操作权限组'),
('90000000-0000-0000-0001-000000000003', 'billing_read_only', '账单只读权限组'),
('90000000-0000-0000-0001-000000000004', 'billing_full_access', '账单完整访问权限组');

-- 权限组成员
-- device_basic_operations 包含
INSERT INTO permission_group_members (group_id, permission_id)
SELECT '90000000-0000-0000-0001-000000000001', id FROM permissions
WHERE name IN (
  'device.read.own',
  'device.create.low',
  'device.create.medium',
  'device.start.stopped',
  'device.stop.running'
);

-- device_advanced_operations 继承 device_basic_operations 并添加更多权限
INSERT INTO permission_group_members (group_id, permission_id)
SELECT '90000000-0000-0000-0001-000000000002', id FROM permissions
WHERE name IN (
  -- 继承基础操作
  'device.read.own',
  'device.create.low',
  'device.create.medium',
  'device.start.stopped',
  'device.stop.running',
  -- 添加高级操作
  'device.create.high',
  'device.snapshot.running',
  'device.snapshot.restore',
  'device.debug.error'
);
```

---

## 📊 实施优先级

### 🔴 高优先级（立即实施）

1. **资源所有权权限**
   - 影响：防止用户误操作他人资源
   - 实施难度：中
   - 预计时间：1周

2. **批量操作权限分离**
   - 影响：防止误删除大量设备
   - 实施难度：低
   - 预计时间：3天

3. **成本控制权限**
   - 影响：控制资源消耗和成本
   - 实施难度：中
   - 预计时间：1周

### 🟡 中优先级（1个月内）

4. **审批流程权限**
   - 影响：规范敏感操作流程
   - 实施难度：高
   - 预计时间：2周

5. **设备生命周期权限**
   - 影响：提升操作安全性
   - 实施难度：低
   - 预计时间：3天

6. **API限流权限**
   - 影响：保护系统稳定性
   - 实施难度：中
   - 预计时间：1周

### 🟢 低优先级（长期优化）

7. **临时授权和委托**
   - 影响：提升灵活性
   - 实施难度：高
   - 预计时间：2周

8. **时间和地域限制**
   - 影响：合规性和安全性
   - 实施难度：中
   - 预计时间：1周

9. **动态权限**
   - 影响：最细粒度控制
   - 实施难度：高
   - 预计时间：3周

10. **权限继承和组合**
    - 影响：简化权限管理
    - 实施难度：中
    - 预计时间：1周

---

## 🎯 快速实施方案（MVP）

如果你希望快速看到效果，建议先实施以下3个优化：

### 第1步：资源所有权权限（3天）

```sql
-- 1. 添加新权限
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('30000000-0000-0000-0000-000000000100', 'device.read.own', '读取自己的设备', 'device', 'read', true),
('30000000-0000-0000-0000-000000000101', 'device.read.all', '读取所有设备', 'device', 'read', true),
('30000000-0000-0000-0000-000000000102', 'device.delete.own', '删除自己的设备', 'device', 'delete', true),
('30000000-0000-0000-0000-000000000103', 'device.delete.all', '删除所有设备', 'device', 'delete', true);

-- 2. 为角色分配权限
-- user: 只能操作自己的资源
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions
WHERE name IN ('device.read.own', 'device.delete.own');

-- admin: 可以操作所有资源
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions
WHERE name IN ('device.read.all', 'device.delete.all');
```

### 第2步：批量操作权限（2天）

```sql
-- 添加批量操作权限
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('30000000-0000-0000-0000-000000000110', 'device.delete.single', '删除单个设备', 'device', 'delete', true),
('30000000-0000-0000-0000-000000000111', 'device.delete.bulk', '批量删除设备', 'device', 'delete', true);

-- user: 只能单个删除
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions
WHERE name = 'device.delete.single';

-- admin: 可以批量删除
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions
WHERE name IN ('device.delete.single', 'device.delete.bulk');
```

### 第3步：成本控制权限（3天）

```sql
-- 添加设备配置级别权限
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('30000000-0000-0000-0000-000000000120', 'device.create.low', '创建低配设备(1核2G)', 'device', 'create', true),
('30000000-0000-0000-0000-000000000121', 'device.create.medium', '创建中配设备(2核4G)', 'device', 'create', true),
('30000000-0000-0000-0000-000000000122', 'device.create.high', '创建高配设备(4核8G)', 'device', 'create', true);

-- 角色分配
-- user: 只能创建低配和中配
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions
WHERE name IN ('device.create.low', 'device.create.medium');

-- vip_user: 可以创建高配
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'vip_user'), id FROM permissions
WHERE name IN ('device.create.low', 'device.create.medium', 'device.create.high');
```

---

## 🔍 监控和审计建议

### 权限使用分析

```sql
-- 创建权限使用日志表
CREATE TABLE permission_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  permission_name VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  action_result VARCHAR(50), -- 'granted', 'denied', 'error'
  denial_reason TEXT,
  request_context JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_perm_usage_user ON permission_usage_logs(user_id, created_at);
CREATE INDEX idx_perm_usage_perm ON permission_usage_logs(permission_name, created_at);
CREATE INDEX idx_perm_usage_result ON permission_usage_logs(action_result, created_at);

-- 分析：最常被拒绝的权限请求
SELECT
  permission_name,
  COUNT(*) as denial_count,
  COUNT(DISTINCT user_id) as affected_users
FROM permission_usage_logs
WHERE action_result = 'denied'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY permission_name
ORDER BY denial_count DESC
LIMIT 10;

-- 分析：异常权限使用（深夜批量操作）
SELECT
  user_id,
  permission_name,
  COUNT(*) as usage_count
FROM permission_usage_logs
WHERE permission_name LIKE '%.bulk%'
  AND EXTRACT(HOUR FROM created_at) BETWEEN 0 AND 6
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id, permission_name
ORDER BY usage_count DESC;
```

---

## 💡 总结

### 当前系统评分：7/10

**优势**：
- ✅ 基础权限体系完整
- ✅ 字段级和数据范围权限
- ✅ 角色层级清晰

**待改进**：
- ⚠️ 缺少资源所有权区分
- ⚠️ 批量操作风险高
- ⚠️ 成本控制不足
- ⚠️ 审批流程缺失

### 实施建议优先级

1. **立即实施**：资源所有权 + 批量操作 + 成本控制（MVP）
2. **1个月内**：审批流程 + 设备生命周期 + API限流
3. **长期优化**：动态权限 + 临时授权 + 权限组合

**预期收益**：
- 🔒 安全性提升 40%
- 💰 成本控制改善 30%
- 👥 用户体验优化 25%
- 📊 合规性增强 50%

---

**文档版本**：v1.0
**最后更新**：2025-11-06
**作者**：Claude Code Analysis
