# API 端点分析摘要

## 分析完成

已对云手机平台所有6个后端服务进行了全面的HTTP端点分析。详细分析文档已保存在 `API_ENDPOINTS_COMPLETE_ANALYSIS.md`。

---

## 快速统计

### 服务概览

| 服务 | 基础路径 | 端点数量 | 主要功能 |
|------|---------|--------|---------|
| **User Service** | `/users`, `/auth`, `/roles`, `/permissions`, etc. | 60+ | 用户认证、角色权限、配额管理、工单支持 |
| **Device Service** | `/devices`, `/snapshots` | 70+ | 设备生命周期、ADB控制、批量操作、快照管理 |
| **App Service** | `/apps` | 20+ | APK管理、应用安装、审核工作流 |
| **Billing Service** | `/billing`, `/balance`, `/payments` | 35+ | 计费管理、余额、支付、订单 |
| **Notification Service** | `/notifications`, `/templates` | 25+ | 通知管理、模板系统、多渠道推送 |
| **API Gateway** | 无固定路径 | 50+ | 路由代理、健康检查、熔断器监控 |

**总计**: 260+ 个端点

---

## 关键特性总结

### 认证与授权

- **JWT认证**: 绝大多数端点需要JWT Bearer Token
- **权限检查**: 使用@RequirePermission装饰器进行细粒度权限控制
- **角色支持**: 支持基于角色的访问控制（@Roles装饰器）
- **数据权限**: 支持数据范围限制（@DataScope装饰器）
  - SELF: 用户只能访问自己的数据
  - ALL: 管理员可访问所有数据
- **API Key认证**: 支持API Key方式认证

### 分页方案

- **偏移分页**: `page + limit` 标准方案
- **游标分页**: `cursor + limit` 性能优化方案（O(1)复杂度）
- 支持服务：user-service, device-service, app-service

### 限流机制

- **登录**: 5次/分钟
- **注册**: 3次/分钟
- **上传**: 20次/5分钟
- **支付**: 10次/5分钟（创建），5次/5分钟（退款）
- **验证码**: 10次/分钟
- **Token刷新**: 10次/分钟

### 高级模式

- **Saga模式**: 用于确保分布式事务的原子性
  - 设备创建/删除
  - 应用安装
  - 用户注册
- **事件溯源**: User Service 使用 CQRS + Event Sourcing
- **RBAC系统**: 完整的角色权限管理
- **多租户支持**: 租户隔离
- **多渠道通知**: WebSocket、Email、SMS

---

## User Service (用户服务)

### 核心端点分类

1. **用户管理** (12个)
   - CRUD操作、密码修改、偏好设置

2. **认证相关** (10个)
   - 登录、注册、登出、2FA双因素认证

3. **角色管理** (7个)
   - 角色CRUD、权限分配

4. **权限管理** (7个)
   - 权限CRUD、资源权限查询

5. **配额管理** (9个)
   - 配额检查、扣减、恢复、告警

6. **工单支持** (8个)
   - 工单CRUD、回复、评分、统计

7. **审计日志** (4个)
   - 用户日志、资源日志、搜索、统计

8. **API密钥** (7个)
   - 密钥创建、撤销、权限管理

### 特殊特性

- 事件溯源支持：用户操作可完整回放
- 密码安全：bcrypt加密、强密码检查
- 双因素认证：TOTP支持
- 时序攻击防护：200-400ms随机延迟
- 账户锁定：失败次数限制后自动锁定

---

## Device Service (设备服务)

### 核心端点分类

1. **设备CRUD** (10个)
   - 列表、详情、创建、更新、删除

2. **生命周期控制** (5个)
   - 启动、停止、重启、心跳

3. **ADB命令执行** (14个)
   - Shell命令、截图、文件操作、应用管理、日志读取

4. **快照管理** (4个)
   - 创建、恢复、列表、删除

5. **SMS虚拟号码** (4个)
   - 请求、查询、取消、消息历史

6. **批量操作** (15个)
   - 批量CRUD、命令执行、应用操作、分组管理

### 特殊特性

- **配额检查**: 创建设备时自动检查用户配额
- **Saga模式**: 设备创建/删除支持原子性操作
- **实时控制**: 支持实时Shell命令和文件传输
- **批量操作**: 支持并发限制的批量命令执行
- **云服务支持**: 支持阿里云ECP快照和应用操作

---

## App Service (应用服务)

### 核心端点分类

1. **应用管理** (9个)
   - 上传、列表、详情、版本管理

2. **安装/卸载** (4个)
   - Saga模式安装、状态查询、卸载

3. **审核工作流** (7个)
   - 提交审核、批准、拒绝、修改要求

### 特殊特性

- **Saga模式**: 应用安装使用Saga确保原子性
- **审核工作流**: 完整的应用审核流程
- **版本管理**: 支持应用多个版本
- **限流保护**: 上传限流20次/5分钟，防止滥用

---

## Billing Service (计费服务)

### 核心端点分类

1. **计费管理** (6个)
   - 套餐CRUD、统计

2. **订单管理** (3个)
   - 创建、查询、取消

3. **使用记录** (3个)
   - 开始、停止、查询

4. **余额管理** (8个)
   - 创建、充值、消费、冻结、调整

5. **支付管理** (7个)
   - 创建订单、查询、退款、支付回调

### 特殊特性

- **支付集成**: 微信、支付宝支付回调支持
- **余额系统**: 完整的余额冻结和调整机制
- **交易记录**: 详细的交易历史和统计
- **限流保护**: 防止恶意支付请求

---

## Notification Service (通知服务)

### 核心端点分类

1. **通知管理** (9个)
   - CRUD、广播、已读状态、统计

2. **模板管理** (11个)
   - 模板CRUD、渲染、验证、缓存管理

### 特殊特性

- **多渠道**: WebSocket、Email、SMS
- **模板系统**: Handlebars模板支持
- **国际化**: 多语言模板支持
- **消息队列**: RabbitMQ异步处理
- **死信队列**: DLX处理失败消息

---

## API Gateway (API网关)

### 核心功能

1. **路由代理** (50+)
   - 代理所有6个微服务的请求

2. **聚合健康检查** (1个)
   - 返回所有微服务的健康状态

3. **熔断器监控** (1个)
   - 监控服务熔断状态

4. **缓存管理** (1个)
   - 服务URL缓存清除

### 服务映射

```
/auth              → user-service (公开)
/users/*           → user-service
/roles/*           → user-service
/permissions/*     → user-service
/quotas/*          → user-service
/devices/*         → device-service
/snapshots/*       → device-service
/apps/*            → app-service
/billing/*         → billing-service
/balance/*         → billing-service
/payments/*        → billing-service
/notifications/*   → notification-service
/templates/*       → notification-service
/health            → 聚合检查 (公开)
```

---

## 常见模式

### 响应格式

**成功响应**:
```json
{
  "success": true,
  "data": { /* ... */ },
  "message": "操作成功"
}
```

**分页响应**:
```json
{
  "success": true,
  "data": [ /* ... */ ],
  "page": 1,
  "total": 100,
  "limit": 10,
  "totalPages": 10
}
```

**游标分页**:
```json
{
  "success": true,
  "data": [ /* ... */ ],
  "nextCursor": "base64...",
  "hasMore": true,
  "count": 20
}
```

### 错误代码

| 代码 | 含义 |
|------|------|
| 400 | 参数验证失败 |
| 401 | 认证失败 |
| 403 | 权限不足 / 配额超限 |
| 404 | 资源不存在 |
| 429 | 限流触发 |
| 500 | 服务器错误 |

---

## 权限命名规范

### 格式: `resource.action`

#### User Service
- `user.create`, `user.read`, `user.update`, `user.delete`
- `role.create`, `role.read`, `role.update`, `role.delete`
- `permission.create`, `permission.read`, `permission.update`, `permission.delete`

#### Device Service
- `device.create`, `device.read`, `device.update`, `device.delete`
- `device.control` (Shell、截图等)
- `device:sms:request`, `device:sms:cancel`
- `device:snapshot-create`, `device:snapshot-restore`, `device:snapshot-delete`

#### App Service
- `app.create`, `app.read`, `app.update`, `app.delete`
- `app.approve` (审核权限)

#### Billing Service
- `billing:read`, `billing:create`, `billing:update`, `billing:delete`

#### Notification Service
- `notification.create`, `notification.read`, `notification.update`, `notification.delete`
- `notification.broadcast`
- `notification.template-*`

---

## 安全特性

1. **JWT认证**: 所有受保护端点都需要有效的JWT Token
2. **HTTPS**: 生产环境强制HTTPS
3. **CORS**: 配置化的跨域支持
4. **速率限制**: 多层级的限流保护
5. **SQL注入防护**: SqlInjectionGuard
6. **XSS防护**: HTML净化
7. **CSRF保护**: csurf中间件
8. **密钥管理**: API密钥轮换机制
9. **审计日志**: 所有重要操作都有记录
10. **数据权限**: 细粒度的数据访问控制

---

## 性能优化

1. **游标分页**: O(1)复杂度的分页查询
2. **缓存**: Redis缓存常用数据
3. **异步处理**: RabbitMQ异步任务队列
4. **熔断器**: 防止级联故障
5. **连接池**: 数据库连接复用
6. **批量操作**: 支持批量CRUD减少网络往返

---

## 查看完整文档

详细的端点信息请查看: `/home/eric/next-cloudphone/docs/API_ENDPOINTS_COMPLETE_ANALYSIS.md`

该文档包含:
- 所有端点的完整列表
- 每个端点的认证、权限、参数要求
- 响应格式和错误处理
- 限流信息和特殊说明
