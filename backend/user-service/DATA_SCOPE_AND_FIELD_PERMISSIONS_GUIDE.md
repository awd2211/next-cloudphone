# 数据范围和字段权限配置指南

## 概述

本文档说明云手机平台的数据范围（Data Scope）和字段权限（Field Permission）配置，帮助你理解不同角色的数据访问控制策略。

## 1. 数据范围配置 (Data Scopes)

数据范围控制**用户能看到哪些数据记录**。

### 1.1 范围类型说明

| 范围类型 | 说明 | 使用场景 |
|---------|------|---------|
| `all` | 全部数据，无限制 | 管理员、超级管理员 |
| `tenant` | 本租户数据 | 多租户场景，同租户用户共享数据 |
| `department` | 本部门及子部门数据 | 按部门划分的数据权限 |
| `department_only` | 仅本部门数据（不含子部门） | 严格的部门数据隔离 |
| `self` | 仅本人创建/拥有的数据 | 个人数据隔离 |
| `custom` | 自定义过滤条件 | 复杂的业务场景，如特定区域、特定状态等 |

### 1.2 管理员角色 (admin) - 数据范围

**策略：全权限访问**

| 资源类型 | 范围 | 说明 |
|---------|------|------|
| device（云手机设备） | all | 管理员可以管理所有用户的云手机设备 |
| user（用户） | all | 管理员可以查看和管理所有用户 |
| app（应用） | all | 管理员可以管理所有应用 |
| order（订单） | all | 管理员可以查看所有订单 |
| billing（账单） | all | 管理员可以查看所有账单 |
| payment（支付） | all | 管理员可以查看所有支付记录 |
| audit_log（审计日志） | all | 管理员可以查看所有审计日志 |

**业务场景：**
- 管理员需要全局视图来监控平台运行状况
- 管理员需要处理用户工单和投诉
- 管理员需要进行数据分析和报表统计

### 1.3 普通用户角色 (user) - 数据范围

**策略：数据隔离，保护用户隐私**

| 资源类型 | 范围 | 说明 |
|---------|------|------|
| device（云手机设备） | self | 用户只能看到自己创建的设备 |
| user（用户） | self | 用户只能查看和修改自己的信息 |
| app（应用） | tenant | 用户可以看到租户内的所有应用（应用商店场景） |
| order（订单） | self | 用户只能查看自己的订单 |
| billing（账单） | self | 用户只能查看自己的账单 |
| payment（支付） | self | 用户只能查看自己的支付记录 |
| audit_log（审计日志） | self | 用户只能查看自己的操作日志 |

**业务场景：**
- 保护用户隐私，防止数据泄露
- 用户之间的数据完全隔离
- 应用商店采用 tenant 范围，允许同租户用户共享应用库

**特殊说明：app 为什么是 tenant？**

应用（app）采用 `tenant` 范围而不是 `self`，原因：
1. **应用共享**：企业租户内的用户需要共享应用库
2. **应用市场**：同租户用户可以看到和安装同一批应用
3. **管理便利**：租户管理员可以为租户内所有用户统一管理应用

## 2. 字段权限配置 (Field Permissions)

字段权限控制**用户能看到和修改数据的哪些字段**。

### 2.1 字段访问级别

| 级别 | 说明 | 示例 |
|-----|------|------|
| `hidden` | 完全隐藏，用户看不到 | 密码、密钥、内部ID |
| `read` | 只读，可以查看但不能修改 | ID、创建时间、系统状态 |
| `write` | 可读可写 | 昵称、头像、描述 |
| `required` | 必填字段（创建/更新时必须提供） | 用户名、邮箱 |

### 2.2 操作类型

不同操作可以有不同的字段权限：

| 操作 | 说明 | 典型场景 |
|-----|------|---------|
| `create` | 创建记录时 | 用户注册、创建设备 |
| `update` | 更新记录时 | 修改个人信息、更新设备配置 |
| `view` | 查看记录时 | 查看用户列表、查看设备详情 |
| `export` | 导出数据时 | 导出报表、数据备份 |

### 2.3 管理员角色 (admin) - 字段权限

#### 用户资源 (user)

**查看操作 (view)：**
- 隐藏字段：无
- 只读字段：`password`（密码哈希也不应该显示）
- 可写字段：无限制
- 必填字段：无

**创建操作 (create)：**
- 隐藏字段：无
- 只读字段：`id`, `createdAt`, `updatedAt`（系统自动生成）
- 可写字段：无限制
- 必填字段：`username`, `email`, `password`

**更新操作 (update)：**
- 隐藏字段：无
- 只读字段：`id`, `username`, `createdAt`, `updatedAt`
- 可写字段：无限制
- 必填字段：无

**业务场景：**
- 管理员创建用户时必须提供用户名、邮箱、密码
- 管理员更新用户时，不能修改用户名（避免引用混乱）
- 密码字段对所有人（包括管理员）都是只读的，修改密码需要专门的 API

#### 设备资源 (device)

**查看操作 (view)：**
- 无限制，管理员可以查看所有设备字段

#### 支付资源 (payment)

**查看操作 (view)：**
- 无限制，管理员可以查看所有支付信息（用于对账、退款等）

### 2.4 普通用户角色 (user) - 字段权限

#### 用户资源 (user)

**查看操作 (view)：**
- **隐藏字段**：
  - `password`：密码哈希
  - `salt`：密码盐
  - `twoFactorSecret`：双因素认证密钥
  - `apiKey`：API密钥
- **只读字段**：
  - `id`：用户ID
  - `username`：用户名
  - `email`：邮箱
  - `tenantId`：租户ID
  - `createdAt`：创建时间
  - `updatedAt`：更新时间
  - `lastLoginAt`：最后登录时间
  - `lastLoginIp`：最后登录IP

**更新操作 (update)：**
- **隐藏字段**：同 view
- **只读字段**：
  - `id`, `username`, `email`, `tenantId`
  - `createdAt`, `updatedAt`
  - `status`：用户状态（只有管理员可以改）
  - `roles`：角色（只有管理员可以改）
- **可写字段**（仅允许修改这些字段）：
  - `fullName`：全名
  - `avatar`：头像
  - `phone`：电话
  - `locale`：语言偏好
  - `timezone`：时区

**业务场景：**
- 用户可以修改自己的昵称、头像、电话等个人信息
- 用户不能修改用户名、邮箱（防止账号混乱）
- 用户不能查看自己的密码哈希、API密钥等敏感信息
- 用户不能修改自己的状态和角色（防止权限提升）

#### 设备资源 (device)

**查看操作 (view)：**
- **隐藏字段**：
  - `internalIp`：内部IP地址
  - `containerId`：Docker容器ID
  - `nodeId`：节点ID
- **只读字段**：
  - `id`, `userId`, `tenantId`
  - `createdAt`, `updatedAt`
  - `status`：设备状态

**创建操作 (create)：**
- **只读字段**：
  - `id`, `userId`, `tenantId`（系统自动填充）
  - `createdAt`, `updatedAt`
  - `status`（初始状态由系统设置）
- **可写字段**：
  - `name`：设备名称
  - `deviceType`：设备类型
  - `osVersion`：操作系统版本
  - `cpuCores`：CPU核心数
  - `memoryMB`：内存大小
  - `storageMB`：存储大小
  - `region`：区域
- **必填字段**：
  - `name`：设备名称
  - `deviceType`：设备类型

**更新操作 (update)：**
- **隐藏字段**：同 view
- **只读字段**：
  - `id`, `userId`, `tenantId`
  - `deviceType`（创建后不可修改）
  - `createdAt`, `updatedAt`
- **可写字段**（仅允许修改）：
  - `name`：设备名称
  - `status`：设备状态（启动/停止）
  - `tags`：标签

**业务场景：**
- 用户创建设备时，可以选择配置（CPU、内存等）
- 用户不能看到设备的内部技术字段（容器ID、节点ID等）
- 用户可以重命名设备、启动/停止设备、添加标签
- 用户不能修改设备类型（创建后固定）

#### 订单资源 (order)

**查看操作 (view)：**
- **只读字段**：所有字段
  - `id`, `userId`, `totalAmount`, `status`, `createdAt`, `updatedAt`

**业务场景：**
- 订单一旦创建，用户只能查看，不能修改
- 订单修改需要通过专门的 API（如取消订单、申请退款）

#### 账单资源 (billing)

**查看操作 (view)：**
- **只读字段**：所有字段
  - `id`, `userId`, `amount`, `balance`, `status`, `createdAt`

**业务场景：**
- 账单由系统自动生成，用户只能查看
- 账单不可修改，保证财务数据准确性

#### 支付资源 (payment)

**查看操作 (view)：**
- **隐藏字段**：
  - `paymentSecret`：支付密钥
  - `merchantKey`：商户密钥
  - `internalTransactionId`：内部交易ID
- **只读字段**：
  - `id`, `userId`, `amount`, `status`
  - `paymentMethod`：支付方式
  - `createdAt`：创建时间

**业务场景：**
- 用户可以查看自己的支付记录
- 敏感的支付密钥、商户信息对用户隐藏
- 支付记录不可修改（财务合规要求）

#### 应用资源 (app)

**查看操作 (view)：**
- **隐藏字段**：
  - `uploadUserId`：上传用户ID
  - `internalPath`：内部存储路径
  - `storageKey`：存储密钥
- **只读字段**：
  - `id`, `packageName`, `version`, `size`, `uploadedAt`

**业务场景：**
- 用户可以查看应用的基本信息（包名、版本、大小）
- 内部存储路径、上传者等信息对用户隐藏
- 应用信息只读，修改需要通过专门的审核流程

#### 审计日志 (audit_log)

**查看操作 (view)：**
- **隐藏字段**：
  - `ip`：IP地址
  - `userAgent`：浏览器标识
  - `requestBody`：请求体
  - `responseBody`：响应体
- **只读字段**：
  - `id`, `userId`, `action`, `resource`, `createdAt`

**业务场景：**
- 用户可以查看自己的操作历史（动作、资源、时间）
- 详细的请求/响应数据对用户隐藏（可能包含敏感信息）
- 审计日志只读，不可修改（合规要求）

## 3. 配置统计

### 数据范围配置
- **总计**：14 条配置
- **管理员（admin）**：7 条（全权限）
- **普通用户（user）**：7 条（数据隔离）

### 字段权限配置
- **总计**：15 条配置
- **管理员（admin）**：5 条（主要是系统字段保护）
- **普通用户（user）**：10 条（严格的字段访问控制）

## 4. 如何使用

### 4.1 前端使用

访问前端管理页面：

- 数据范围配置：http://localhost:5173/permissions/data-scope
- 字段权限配置：http://localhost:5173/permissions/field-permission

### 4.2 后端 API

**数据范围 API：**
```bash
# 获取所有数据范围配置
GET /data-scopes?roleId=xxx&resourceType=device

# 创建数据范围配置
POST /data-scopes
{
  "roleId": "role-uuid",
  "resourceType": "device",
  "scopeType": "self",
  "description": "普通用户只能访问自己的设备"
}

# 更新数据范围配置
PUT /data-scopes/:id

# 删除数据范围配置
DELETE /data-scopes/:id

# 切换启用状态
PATCH /data-scopes/:id/toggle
```

**字段权限 API：**
```bash
# 获取所有字段权限配置
GET /field-permissions?roleId=xxx&resourceType=user&operation=view

# 创建字段权限配置
POST /field-permissions
{
  "roleId": "role-uuid",
  "resourceType": "user",
  "operation": "view",
  "hiddenFields": ["password", "salt"],
  "readOnlyFields": ["id", "username"],
  "writableFields": ["fullName", "avatar"],
  "requiredFields": ["username", "email"]
}

# 更新字段权限配置
PUT /field-permissions/:id

# 删除字段权限配置
DELETE /field-permissions/:id

# 切换启用状态
PATCH /field-permissions/:id/toggle
```

### 4.3 在代码中应用

**应用数据范围：**

```typescript
import { ApplyDataScope } from '@/permissions/decorators/data-scope.decorators';

@Get()
@ApplyDataScope('device') // 自动应用数据范围过滤
async getDevices(@Request() req) {
  // 返回的数据会根据用户角色自动过滤
  // 管理员：所有设备
  // 普通用户：只有自己的设备
  return this.deviceService.findAll(req.user);
}
```

**应用字段权限：**

```typescript
import { ApplyFieldPermissions } from '@/permissions/decorators/field-permission.decorators';

@Get(':id')
@ApplyFieldPermissions('user', 'view') // 自动应用字段过滤
async getUser(@Param('id') id: string, @Request() req) {
  const user = await this.userService.findOne(id);
  // 返回的用户对象会根据角色自动过滤字段
  // 管理员：所有字段（除了 password）
  // 普通用户：隐藏 password, salt, apiKey 等敏感字段
  return user;
}
```

## 5. 扩展配置

### 5.1 添加新角色

如果要添加新角色（如 `customer_service` 客服角色）：

```sql
-- 1. 创建角色
INSERT INTO roles (id, name, description)
VALUES (gen_random_uuid(), 'customer_service', '客服');

-- 2. 配置数据范围（客服可以查看本租户的用户和订单）
INSERT INTO data_scopes ("roleId", "resourceType", "scopeType", description)
VALUES
  ('customer-service-role-id', 'user', 'tenant', '客服可以查看本租户用户'),
  ('customer-service-role-id', 'order', 'tenant', '客服可以查看本租户订单');

-- 3. 配置字段权限（客服不能查看用户的支付密码、银行卡等）
INSERT INTO field_permissions ("roleId", "resourceType", operation, "hiddenFields")
VALUES (
  'customer-service-role-id',
  'user',
  'view',
  ARRAY['password', 'bankCard', 'idCard']
);
```

### 5.2 自定义过滤条件

对于复杂场景，可以使用 `custom` 范围类型：

```sql
-- 区域经理只能查看特定区域的设备
INSERT INTO data_scopes ("roleId", "resourceType", "scopeType", filter)
VALUES (
  'region-manager-role-id',
  'device',
  'custom',
  '{"region": {"$in": ["beijing", "shanghai"]}}'::jsonb
);

-- 高级用户可以查看高价值订单
INSERT INTO data_scopes ("roleId", "resourceType", "scopeType", filter)
VALUES (
  'vip-user-role-id',
  'order',
  'custom',
  '{"totalAmount": {"$gte": 1000}}'::jsonb
);
```

## 6. 最佳实践

1. **最小权限原则**：默认拒绝，按需授权
2. **数据隔离**：普通用户之间的数据完全隔离
3. **敏感字段保护**：密码、密钥、证件号等必须隐藏
4. **系统字段只读**：ID、创建时间等系统字段不可修改
5. **财务数据只读**：订单、账单、支付记录不可修改
6. **审计日志完整**：记录所有敏感操作，日志不可修改

## 7. 安全建议

1. **定期审查权限配置**：确保权限配置符合业务需求
2. **监控异常访问**：记录和监控跨权限访问尝试
3. **字段脱敏**：对敏感字段进行脱敏处理（如手机号、身份证）
4. **API限流**：防止暴力破解和数据爬取
5. **日志审计**：记录所有权限变更操作

## 8. 故障排查

### 问题：用户看不到应该看到的数据

**检查步骤：**
1. 确认用户的角色：`SELECT roles FROM users WHERE id = 'user-id'`
2. 确认数据范围配置：`SELECT * FROM data_scopes WHERE "roleId" = 'role-id' AND "resourceType" = 'xxx'`
3. 确认配置是否启用：`isActive = true`
4. 检查优先级：如果有多条配置，优先级最高（数字最小）的生效

### 问题：用户看到了不应该看到的字段

**检查步骤：**
1. 确认字段权限配置：`SELECT * FROM field_permissions WHERE "roleId" = 'role-id' AND "resourceType" = 'xxx' AND operation = 'view'`
2. 确认 `hiddenFields` 列表包含该字段
3. 确认后端 API 使用了 `@ApplyFieldPermissions` 装饰器
4. 检查前端是否绕过了权限控制（前端权限只是UI优化，后端才是真正的防护）

## 9. 相关文档

- [RBAC 权限系统设计](./RBAC_DESIGN.md)
- [菜单权限配置指南](./MENU_PERMISSION_GUIDE.md)
- [API 权限控制](./API_PERMISSION_GUIDE.md)
