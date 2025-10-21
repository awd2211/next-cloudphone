# 定制化权限系统使用指南

根据您的业务需求定制的企业级权限系统，支持 **B2B + B2C + 代理商 + 开发者** 多种用户类型。

---

## 📋 目录

1. [业务场景概述](#业务场景概述)
2. [角色体系](#角色体系)
3. [权限列表](#权限列表)
4. [数据范围策略](#数据范围策略)
5. [分级脱敏策略](#分级脱敏策略)
6. [初始化步骤](#初始化步骤)
7. [测试账号](#测试账号)
8. [使用示例](#使用示例)

---

## 业务场景概述

### 用户群体

您的云手机平台支持以下 4 类用户：

1. **企业客户（B2B）** - 企业批量购买云手机，需要管理多个设备
2. **个人用户（B2C）** - 个人用户自主购买使用
3. **代理商/渠道商** - 管理下级客户，查看分润数据
4. **开发者/API用户** - 通过 API 接入使用

### 组织架构

- **扁平化组织**：无部门层级，所有用户平级
- **租户隔离**：不同租户数据完全隔离
- **代理商体系**：代理商只能查看自己的客户数据

### 数据安全

- **分级脱敏**：不同角色看到不同程度的脱敏数据
  - 超级管理员/平台管理员：完整数据
  - 财务管理员：部分脱敏（手机号脱敏）
  - 客服人员：更多脱敏（手机号、邮箱、身份证）
  - 数据分析师：完全脱敏（哈希处理）

---

## 角色体系

### 10 个预定义角色

| 角色代码 | 角色名称 | 适用场景 | 数据范围 |
|----------|----------|----------|----------|
| `super_admin` | Super Admin | 平台初始化、紧急维护 | 全部数据 |
| `platform_admin` | Platform Admin | 平台日常运营管理 | 租户数据 |
| `finance_manager` | Finance Manager | 财务数据、账单、分润管理 | 租户数据 |
| `operations_manager` | Operations Manager | 系统运维、设备节点管理 | 租户数据 |
| `customer_service` | Customer Service | 用户工单、技术支持 | 租户数据 |
| `data_analyst` | Data Analyst | 运营数据、分析报表 | 租户数据 |
| `agent` | Agent | 代理商/渠道商 | 本人数据（自己的客户） |
| `developer` | Developer | API 接入使用 | 本人数据 |
| `enterprise_user` | Enterprise User | 企业客户 | 本人数据 |
| `individual_user` | Individual User | 个人用户 | 本人数据 |

### 角色权限对比

| 功能模块 | Super Admin | Platform Admin | Finance | Operations | Support | Analyst | Agent | Developer | Enterprise | Individual |
|---------|-------------|----------------|---------|------------|---------|---------|-------|-----------|------------|------------|
| 用户管理 | ✅ 完全 | ✅ 完全 | 📖 查看 | ❌ | 📝 部分 | 📖 查看 | ❌ | ❌ | ❌ | ❌ |
| 设备管理 | ✅ 完全 | ✅ 完全 | ❌ | ✅ 完全 | 📝 部分 | 📖 查看 | 📖 查看 | ✅ API | ✅ 完全 | ✅ 基础 |
| 财务管理 | ✅ 完全 | 📖 查看 | ✅ 完全 | ❌ | ❌ | 📖 查看 | ❌ | ❌ | 📖 查看 | 📖 查看 |
| 工单系统 | ✅ 完全 | ✅ 完全 | ❌ | ❌ | ✅ 完全 | ❌ | ❌ | ❌ | 📝 创建 | 📝 创建 |
| 代理商管理 | ✅ 完全 | ✅ 完全 | ❌ | ❌ | ❌ | ❌ | ✅ 客户 | ❌ | ❌ | ❌ |
| API 管理 | ✅ 完全 | ✅ 完全 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 完全 | ❌ | ❌ |
| 数据分析 | ✅ 完全 | ✅ 完全 | 💰 财务 | 📊 系统 | 📈 基础 | ✅ 完全 | 📈 基础 | ❌ | ❌ | ❌ |
| 系统管理 | ✅ 完全 | ✅ 完全 | ❌ | ✅ 完全 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

图例：
- ✅ 完全权限
- 📝 部分权限（创建+修改）
- 📖 仅查看
- ❌ 无权限

---

## 权限列表

### 按业务模块分组（共 100+ 权限）

#### 1. 用户管理 (8 个权限)

```
user:create              - 创建用户
user:read                - 查看用户
user:read_sensitive      - 查看用户敏感信息（完整手机号、邮箱等）
user:update              - 更新用户信息
user:delete              - 删除用户
user:ban                 - 禁用/启用用户账号
user:reset_password      - 重置用户密码
user:export              - 导出用户数据
```

#### 2. 设备管理 (7 个权限)

```
device:create            - 创建设备
device:read              - 查看设备
device:update            - 更新设备配置
device:delete            - 删除设备
device:control           - 控制设备（启动/停止/重启）
device:console           - 访问设备控制台（VNC/ADB）
device:export            - 导出设备数据
```

#### 3. 应用管理 (7 个权限)

```
app:create               - 上传应用
app:read                 - 查看应用
app:update               - 更新应用
app:delete               - 删除应用
app:install              - 安装应用到设备
app:uninstall            - 卸载应用
app:export               - 导出应用列表
```

#### 4. 订单管理 (5 个权限)

```
order:create             - 创建订单
order:read               - 查看订单
order:update             - 更新订单
order:cancel             - 取消订单
order:export             - 导出订单数据
```

#### 5. 账单管理 (4 个权限)

```
billing:read             - 查看账单
billing:read_all         - 查看所有用户账单（财务）
billing:update           - 修改账单状态
billing:export           - 导出账单数据（不脱敏）
```

#### 6. 支付管理 (5 个权限)

```
payment:create           - 创建支付
payment:read             - 查看支付记录
payment:refund           - 退款
payment:approve_refund   - 审批退款申请
payment:export           - 导出支付数据
```

#### 7. 套餐管理 (5 个权限)

```
plan:create              - 创建套餐
plan:read                - 查看套餐
plan:update              - 更新套餐
plan:delete              - 删除套餐
plan:set_price           - 设置套餐价格
```

#### 8. 工单系统 (6 个权限)

```
ticket:create            - 创建工单
ticket:read              - 查看工单
ticket:update            - 更新工单
ticket:assign            - 分配工单
ticket:close             - 关闭工单
ticket:export            - 导出工单数据
```

#### 9. 代理商管理 (5 个权限)

```
agent:create             - 创建代理商
agent:read               - 查看代理商
agent:update             - 更新代理商信息
agent:delete             - 删除代理商
agent:set_pricing        - 设置代理商价格策略
```

#### 10. 代理商客户管理 (4 个权限)

```
agent_customer:create         - 创建客户账号
agent_customer:read           - 查看客户信息
agent_customer:update         - 更新客户信息
agent_customer:assign_resource - 分配资源给客户
```

#### 11. 分润管理 (5 个权限)

```
commission:read               - 查看分润记录
commission:read_all           - 查看所有代理商分润（财务）
commission:withdraw           - 申请提现
commission:approve_withdraw   - 审批提现申请
commission:export             - 导出分润数据
```

#### 12. API 密钥管理 (4 个权限)

```
api_key:create           - 创建 API 密钥
api_key:read             - 查看 API 密钥
api_key:delete           - 删除 API 密钥
api_key:rotate           - 轮换 API 密钥
```

#### 13. API 配额管理 (2 个权限)

```
api_quota:read           - 查看 API 配额
api_quota:update         - 更新 API 配额
```

#### 14. API 调用日志 (2 个权限)

```
api_log:read             - 查看 API 调用日志
api_log:export           - 导出 API 调用日志
```

#### 15. Webhook 管理 (5 个权限)

```
webhook:create           - 创建 Webhook
webhook:read             - 查看 Webhook
webhook:update           - 更新 Webhook
webhook:delete           - 删除 Webhook
webhook:test             - 测试 Webhook
```

#### 16. 数据分析 (4 个权限)

```
analytics:read_basic     - 查看基础数据分析
analytics:read_advanced  - 查看高级数据分析
analytics:read_financial - 查看财务数据分析
analytics:export         - 导出分析报表
```

#### 17. 系统管理 (4 个权限)

```
system:settings_read     - 查看系统设置
system:settings_update   - 更新系统设置
system:node_manage       - 管理设备节点
system:monitor           - 系统监控
```

#### 18. 角色权限管理 (20 个权限)

```
role:create              - 创建角色
role:read                - 查看角色
role:update              - 更新角色
role:delete              - 删除角色
role:assign              - 分配角色

permission:create        - 创建权限
permission:read          - 查看权限
permission:update        - 更新权限
permission:delete        - 删除权限
permission:dataScope:*   - 数据范围配置相关
permission:fieldPermission:* - 字段权限配置相关
permission:menu:*        - 菜单权限相关
permission:cache:*       - 权限缓存相关
```

#### 19. 审计日志 (2 个权限)

```
audit_log:read           - 查看审计日志
audit_log:export         - 导出审计日志
```

---

## 数据范围策略

### 范围类型说明

| 范围类型 | 说明 | 适用角色 | 示例 |
|----------|------|----------|------|
| `ALL` | 全部数据 | Super Admin | 查看所有租户的所有数据 |
| `TENANT` | 租户数据 | Platform Admin, Finance, Operations, Support, Analyst | 查看本租户的所有数据 |
| `SELF` | 本人数据 | Agent, Developer, Enterprise User, Individual User | 只能查看自己的数据 |
| `CUSTOM` | 自定义过滤器 | Agent（查看自己客户的数据） | 通过 agentId 过滤 |

### 各角色数据范围配置

#### Super Admin
```yaml
device: ALL          # 所有设备
user: ALL            # 所有用户
order: ALL           # 所有订单
billing: ALL         # 所有账单
```

#### Platform Admin / Finance / Operations / Support / Analyst
```yaml
所有资源: TENANT     # 本租户所有数据
```

#### Agent（代理商）
```yaml
agent_customer: SELF              # 自己创建的客户
commission: SELF                  # 自己的分润
device: CUSTOM (agentId=$userId)  # 自己客户的设备
order: CUSTOM (agentId=$userId)   # 自己客户的订单
```

#### Developer / Enterprise User / Individual User
```yaml
所有资源: SELF       # 只能访问自己的数据
```

---

## 分级脱敏策略

### 用户信息脱敏规则

#### 1. Super Admin / Platform Admin
- **敏感字段**：完全可见
- **隐藏字段**：password, salt

```json
{
  "username": "zhangsan",
  "email": "zhangsan@example.com",    // 完整
  "phone": "13800138000",              // 完整
  "idCard": "110101199001011234"       // 完整
}
```

#### 2. Finance Manager
- **手机号**：部分脱敏（保留前3后4位）
- **其他**：完整可见

```json
{
  "username": "zhangsan",
  "email": "zhangsan@example.com",    // 完整
  "phone": "138****8000",              // 脱敏：{3}****{4}
  "idCard": "110101199001011234"       // 完整
}
```

#### 3. Customer Service
- **手机号**：更多脱敏（仅保留后4位）
- **邮箱**：脱敏（保留前3位）
- **身份证**：脱敏（保留前6后4位）

```json
{
  "username": "zhangsan",
  "email": "zha***@***",               // 脱敏：{3}***@***
  "phone": "***-****-8000",            // 脱敏：***-****-{4}
  "idCard": "110101********1234"       // 脱敏：{6}********{4}
}
```

#### 4. Data Analyst
- **所有敏感字段**：哈希处理

```json
{
  "username": "zhangsan",
  "email": "***HASHED***",
  "phone": "***HASHED***",
  "idCard": "***HASHED***",
  "realName": "***HASHED***"
}
```

#### 5. Agent
- **手机号、邮箱**：与客服相同程度脱敏

```json
{
  "username": "zhangsan",
  "email": "zha***@***",
  "phone": "***-****-8000"
}
```

### 设备信息脱敏

#### Operations Manager
- 可查看所有字段（包括内部信息）

```json
{
  "name": "Device-001",
  "ipAddress": "192.168.1.100",
  "internalIp": "10.0.0.100",         // 可见
  "nodeId": "node-001",                // 可见
  "containerId": "abc123"              // 可见
}
```

#### Enterprise User / Individual User
- 隐藏内部信息

```json
{
  "name": "Device-001",
  "ipAddress": "192.168.1.100",
  "internalIp": "HIDDEN",              // 隐藏
  "nodeId": "HIDDEN",                  // 隐藏
  "containerId": "HIDDEN"              // 隐藏
}
```

### 财务数据导出

**Finance Manager 导出时不脱敏**：
- 导出账单、订单、支付数据时显示完整信息
- 用于财务对账和审计

---

## 初始化步骤

### 1. 确保数据库已创建

```bash
# PostgreSQL 创建数据库
createdb cloudphone
```

### 2. 运行定制化初始化脚本

```bash
cd backend/user-service

# 运行定制化权限初始化
npm run init:permissions:custom
```

### 3. 查看初始化结果

预期输出：

```
🚀 开始初始化定制化权限系统...

业务场景：B2B + B2C + 代理商 + 开发者
组织架构：扁平化（无部门层级）
数据安全：分级脱敏

✅ 数据库连接成功

🔑 初始化权限...
  ✅ 创建权限: user:create
  ✅ 创建权限: user:read
  ... (100+ 权限)

📊 共创建/检查 100+ 个权限

👥 初始化角色...
  ✅ 创建角色: Super Admin
  ✅ 创建角色: Platform Admin
  ... (10 个角色)

📊 初始化数据范围配置...
  ✅ super_admin - device (ALL)
  ✅ platform_admin - device (TENANT)
  ... (40+ 配置)

🔒 初始化字段权限配置（分级脱敏）...
  ✅ super_admin - user - VIEW
  ✅ finance_manager - user - VIEW
  ... (10+ 配置)

👤 创建测试账号...
  ✅ admin / admin123 (Super Admin)
  ✅ platform_admin / platform123 (Platform Admin)
  ... (10 个账号)

============================================================
✅ 定制化权限系统初始化完成！
============================================================

📊 统计信息:
  - 权限数量: 100+
  - 角色数量: 10
  - 数据范围配置: 40+
  - 字段权限配置: 10+
  - 测试账号数: 10 个
```

---

## 测试账号

### 10 个预创建测试账号

| 序号 | 用户名 | 密码 | 角色 | 用途 |
|------|--------|------|------|------|
| 1 | `admin` | `admin123` | Super Admin | 超级管理员 |
| 2 | `platform_admin` | `platform123` | Platform Admin | 平台管理员 |
| 3 | `finance` | `finance123` | Finance Manager | 财务管理员 |
| 4 | `operations` | `ops123` | Operations Manager | 运维管理员 |
| 5 | `support` | `support123` | Customer Service | 客服人员 |
| 6 | `analyst` | `analyst123` | Data Analyst | 数据分析师 |
| 7 | `agent001` | `agent123` | Agent | 代理商 |
| 8 | `developer` | `dev123` | Developer | 开发者 |
| 9 | `enterprise_user` | `enterprise123` | Enterprise User | 企业用户 |
| 10 | `user` | `user123` | Individual User | 个人用户 |

⚠️ **安全提示**：
- 这些是测试账号，仅用于开发和测试环境
- **生产环境必须立即修改所有默认密码**
- 建议启用双因素认证（2FA）

---

## 使用示例

### 示例 1：财务管理员查看用户信息

**登录账号**：`finance` / `finance123`

**查看用户列表**：
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:30001/users
```

**返回数据（自动脱敏）**：
```json
{
  "data": [
    {
      "id": "user-001",
      "username": "zhangsan",
      "email": "zhangsan@example.com",
      "phone": "138****8000",           // 部分脱敏
      "idCard": "110101199001011234"    // 完整（财务需要）
    }
  ]
}
```

### 示例 2：客服查看用户信息

**登录账号**：`support` / `support123`

**查看同样的用户**：
```json
{
  "data": [
    {
      "id": "user-001",
      "username": "zhangsan",
      "email": "zha***@***",            // 更多脱敏
      "phone": "***-****-8000",         // 更多脱敏
      "idCard": "110101********1234"    // 脱敏
    }
  ]
}
```

### 示例 3：代理商查看客户

**登录账号**：`agent001` / `agent123`

**创建客户**：
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "customer001",
    "email": "customer@example.com",
    "phone": "13900139000"
  }' \
  http://localhost:30001/agent-customers
```

**查看自己的客户列表**：
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:30001/agent-customers
```

**只能看到自己创建的客户**：
```json
{
  "data": [
    {
      "id": "customer-001",
      "username": "customer001",
      "agentId": "agent001",           // 当前代理商ID
      "email": "cus***@***",           // 脱敏
      "phone": "***-****-9000"         // 脱敏
    }
  ]
}
```

### 示例 4：开发者使用 API

**登录账号**：`developer` / `dev123`

**创建 API 密钥**：
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API Key",
    "expiresAt": "2025-12-31"
  }' \
  http://localhost:30001/api-keys
```

**返回**：
```json
{
  "id": "key-001",
  "name": "My API Key",
  "apiKey": "pk_live_xxxxxxxxxxxxxxxxxx",
  "apiSecret": "sk_live_xxxxxxxxxxxxxxxxxx"
}
```

**通过 API 创建设备**：
```bash
curl -X POST \
  -H "X-API-Key: pk_live_xxxxxxxxxxxxxxxxxx" \
  -H "X-API-Secret: sk_live_xxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Device",
    "planId": "plan-001"
  }' \
  http://localhost:30001/devices
```

---

## 常见问题

### Q1: 如何修改测试账号密码？

**A**: 使用以下 API：

```bash
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "admin123",
    "newPassword": "NewSecurePassword123!"
  }' \
  http://localhost:30001/auth/change-password
```

### Q2: 代理商如何设置客户的价格？

**A**: 需要管理员先为代理商配置价格策略：

```bash
curl -X POST \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent001",
    "planId": "plan-001",
    "price": 98.00,
    "commission": 0.15
  }' \
  http://localhost:30001/agents/pricing
```

### Q3: 如何查看代理商的分润数据？

**A**:
- **代理商**：查看自己的分润
```bash
curl -H "Authorization: Bearer AGENT_TOKEN" \
  http://localhost:30001/commissions
```

- **财务管理员**：查看所有代理商分润
```bash
curl -H "Authorization: Bearer FINANCE_TOKEN" \
  http://localhost:30001/commissions/all
```

### Q4: 开发者如何配置 Webhook？

**A**:

```bash
curl -X POST \
  -H "Authorization: Bearer DEVELOPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/webhooks",
    "events": ["device.created", "device.started", "device.stopped"],
    "secret": "your_webhook_secret"
  }' \
  http://localhost:30001/webhooks
```

### Q5: 如何限制 API 调用次数？

**A**: 管理员为开发者设置配额：

```bash
curl -X PUT \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "developer-001",
    "dailyLimit": 10000,
    "hourlyLimit": 1000
  }' \
  http://localhost:30001/api-quotas
```

---

## 下一步

1. **测试权限系统**：使用不同账号登录，验证权限和数据范围
2. **定制化调整**：根据实际需要调整角色权限
3. **集成到业务代码**：在各个模块中应用权限控制
4. **监控和审计**：查看审计日志，确保权限系统正常运行

---

**文档版本**: v1.0.0
**最后更新**: 2025-10-21
**维护者**: Claude Code

如有问题，请查看完整使用指南：`/docs/PERMISSION_USAGE_GUIDE.md`
