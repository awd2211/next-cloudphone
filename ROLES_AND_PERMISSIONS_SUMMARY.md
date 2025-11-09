# 云手机平台 - 角色和权限配置总览

## 📊 数据库中的角色配置

**数据库**: `cloudphone_user`
**总权限数**: 638个
**资源类型**: 51种
**角色数**: 17个

---

## 🎭 所有角色概览

| 角色 | 权限数 | 描述 | 适用场景 |
|------|--------|------|----------|
| **super_admin** | 638 | 超级管理员 - 所有权限 | 平台管理员 |
| **admin** | 261 | 普通管理员 - 业务资源管理 | 业务管理员 |
| **tenant_admin** | 230 | 租户管理员 - 租户范围管理 | 企业管理员 |
| **vip_user** | 108 | VIP用户 - 高级权限 | VIP客户 |
| **enterprise_user** | 77 | 企业用户 - 企业资源 | 企业员工 |
| **user** | 68 | 普通用户 - 个人设备管理 | 个人用户 |
| **devops** | 68 | 运维工程师 - 系统运维 | 运维团队 |
| **department_admin** | 66 | 部门管理员 - 部门管理 | 部门负责人 |
| **readonly_user** | 36 | 只读用户 - 仅查看 | 数据查看 |
| **data_analyst** | 20 | 数据分析师 - 报表分析 | 数据分析 |
| **finance** | 16 | 财务专员 - 财务管理 | 财务部门 |
| **developer** | 13 | 开发者 - 应用管理 | 应用开发 |
| **customer_service** | 10 | 客服专员 - 工单处理 | 客服部门 |
| **auditor** | 10 | 审核专员 - 内容审核 | 审核团队 |
| **test_user** | 10 | 测试用户 - 测试环境 | 测试人员 |
| **accountant** | 5 | 会计 - 财务报表 | 会计部门 |
| **guest** | 2 | 访客 - 临时访问 | 访客 |

---

## 🔑 主要资源类型及权限数

| 资源 | 权限数 | 典型权限 |
|------|--------|----------|
| **proxy** | 91 | 代理管理、成本监控、地理匹配等 |
| **device** | 77 | 设备创建、控制、备份、监控等 |
| **payment** | 30 | 支付管理、退款、对账等 |
| **sms** | 26 | 短信发送、验证码等 |
| **app** | 24 | 应用上传、审核、安装等 |
| **user** | 23 | 用户管理、角色分配等 |
| **billing** | 20 | 账单查看、创建、更新等 |
| **quota** | 15 | 配额管理、限制设置等 |
| **field-permission** | 14 | 字段权限配置 |
| **permission** | 13 | 权限管理 |

---

## 📋 典型角色的权限示例

### 1. super_admin（超级管理员）
**权限数**: 638（所有权限）

**权限范围**:
- ✅ 系统所有功能
- ✅ 所有资源的CRUD
- ✅ 系统配置和管理
- ✅ 跨租户访问

### 2. admin（普通管理员）
**权限数**: 261

**典型权限**:
- ✅ 用户管理（user:create, user:read, user:update, user:delete）
- ✅ 设备管理（device:create, device:control, device:read）
- ✅ 应用管理（app:approve, app:publish）
- ✅ 账单查看（billing:read）
- ❌ 系统配置（不包括系统级设置）
- ❌ 跨租户操作

### 3. tenant_admin（租户管理员）
**权限数**: 230

**租户管理员的权限**（前50个）:
```
admin:view
app:create, app:read, app:update, app:delete
app:approve, app:publish, app:install
billing:create, billing:read, billing:update, billing:delete
device:create, device:read, device:update, device:delete
device:control, device:backup, device:clone
data-scope:create, data-scope:view, data-scope:update
... 等
```

**权限范围**:
- ✅ 租户用户管理
- ✅ 租户设备管理
- ✅ 租户应用管理
- ✅ 租户账单查看
- ✅ 租户配额管理
- ✅ 租户报表统计
- ❌ 其他租户数据
- ❌ 系统级配置

### 4. user（普通用户）
**权限数**: 68

**典型权限**:
- ✅ 创建自己的设备（device:create）
- ✅ 管理自己的设备（device:read, device:control）
- ✅ 安装应用（app:install）
- ✅ 查看自己的账单（billing:read）
- ❌ 查看其他用户数据
- ❌ 管理员功能
- ❌ 系统配置

### 5. department_admin（部门管理员）
**权限数**: 66

**权限范围**:
- ✅ 部门用户管理
- ✅ 部门设备管理
- ✅ 部门报表查看
- ❌ 其他部门数据
- ❌ 租户级配置

### 6. readonly_user（只读用户）
**权限数**: 36

**权限范围**:
- ✅ 查看数据（所有read权限）
- ❌ 创建、修改、删除操作
- ❌ 任何写入操作

### 7. customer_service（客服专员）
**权限数**: 10

**权限范围**:
- ✅ 查看用户信息
- ✅ 查看设备信息
- ✅ 查看订单记录
- ✅ 工单处理
- ❌ 修改用户密码
- ❌ 查看支付密码
- ❌ 删除数据
- ❌ 修改账单

### 8. guest（访客）
**权限数**: 2

**权限范围**:
- ✅ 浏览公开内容
- ❌ 任何修改操作
- ❌ 查看私密数据

---

## 🎯 你的需求确认

根据数据库配置，你已经有：

### ✅ 已有的完整RBAC系统

1. **17个预定义角色** - 覆盖各种业务场景
2. **638个权限** - 细粒度的权限控制
3. **51种资源** - 覆盖所有业务模块
4. **角色-权限关联表** - role_permissions表已配置

### ❌ 当前的问题

**问题**: JWT Token优化后，普通用户（非super_admin）的权限验证逻辑断了

**影响**:
- ✅ super_admin（638权限）可以正常使用
- ❌ admin（261权限）无法使用 → 返回403
- ❌ tenant_admin（230权限）无法使用 → 返回403
- ❌ user（68权限）无法使用 → 返回403
- ❌ 所有其他角色都无法使用

**原因**:
- API Gateway的PermissionsGuard在尝试从Token读取permissions（已移除）
- User Service的PermissionsGuard在尝试从Token中的roles提取permissions（数据不完整）

---

## 💡 解决方案

### 需要做的事：

**让不同角色登录后拥有各自的权限** → 需要修复权限查询逻辑

### 修复后的效果：

```
用户登录 → JWT Token（仅包含userId, username, roles的ID）
           ↓
      访问API需要权限
           ↓
      API Gateway查询: GET /menu-permissions/user/:userId/permissions
           ↓
      返回该用户的所有权限（根据角色动态计算）
           ↓
      super_admin → 638个权限
      admin → 261个权限
      tenant_admin → 230个权限
      user → 68个权限
      ...
           ↓
      根据权限允许/拒绝API访问
```

**示例**:
- **super_admin** 登录 → 可以访问所有API
- **admin** 登录 → 可以管理用户、设备，但不能修改系统配置
- **user** 登录 → 只能管理自己的设备
- **readonly_user** 登录 → 只能查看数据，不能修改
- **guest** 登录 → 只能浏览公开内容

---

## 📌 下一步确认

请确认以下需求：

### 1. 权限验证时机
- [ ] 用户登录后，前端立即获取权限列表（用于显示/隐藏菜单）
- [ ] 每次API调用时，后端验证权限（安全控制）

### 2. 前端菜单控制
- [ ] 需要根据用户权限动态显示菜单吗？
  - 例如：admin看到"用户管理"菜单，user看不到

### 3. 数据范围控制
- [ ] 需要实现数据隔离吗？
  - 例如：tenant_admin只能看到本租户的数据
  - 例如：user只能看到自己的设备

### 4. 测试用户
- [ ] 是否需要我帮你创建测试用户？
  - 创建admin角色的测试用户
  - 创建user角色的测试用户
  - 用于验证权限隔离效果

---

**现在请告诉我**：

1. 你想要先修复权限系统，让不同角色能正常登录和使用吗？
2. 还是有其他具体的需求和场景？
