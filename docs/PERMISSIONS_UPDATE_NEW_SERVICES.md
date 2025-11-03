# 新增微服务权限配置

**日期**: 2025-11-02
**版本**: v1.0
**作者**: Claude
**状态**: ✅ 已完成

---

## 📋 概述

随着云手机平台的扩展，新增了 4 个微服务。本次更新为这些服务添加了完整的权限管理配置。

### 新增服务列表

1. **proxy-service** (端口: 30007) - 代理IP管理服务
2. **sms-receive-service** - 短信验证码接收服务
3. **notification-service** (端口: 30006) - 通知服务
4. **media-service** - 媒体流服务（WebRTC）

---

## 🔐 权限定义

### 1. Proxy Service - 代理管理服务

**资源名称**: `proxy`

| 权限代码 | 描述 | 适用角色 |
|---------|------|---------|
| `proxy:acquire` | 获取代理IP | Admin, Device Manager, User |
| `proxy:list` | 查看代理列表 | Admin, Device Manager |
| `proxy:read` | 查看代理详情 | Admin, Device Manager, User |
| `proxy:assign` | 分配代理 | Admin, Device Manager |
| `proxy:release` | 释放代理 | Admin, Device Manager |
| `proxy:report` | 报告代理状态 | Admin, Device Manager |
| `proxy:stats` | 查看代理统计 | Admin, Device Manager |
| `proxy:refresh` | 刷新代理池（管理员） | Admin |
| `proxy:strategy` | 设置代理策略（管理员） | Admin |
| `proxy:health` | 查看健康状态 | Admin |

**API 端点映射**:
- `POST /acquire` → `proxy:acquire`
- `GET /list` → `proxy:list`
- `GET /:proxyId` → `proxy:read`
- `POST /assign` → `proxy:assign`
- `POST /release/:proxyId` → `proxy:release`
- `POST /report-success/:proxyId`, `/report-failure/:proxyId` → `proxy:report`
- `GET /stats/pool`, `/stats/active` → `proxy:stats`
- `POST /admin/refresh-pool` → `proxy:refresh`
- `POST /strategy/:strategy` → `proxy:strategy`
- `GET /health` → `proxy:health`

---

### 2. SMS Receive Service - 短信验证码服务

**资源名称**: `sms`

| 权限代码 | 描述 | 适用角色 |
|---------|------|---------|
| `sms:request` | 请求虚拟号码 | Admin, User |
| `sms:read` | 查看号码信息 | Admin, User |
| `sms:cancel` | 取消号码 | Admin, User |
| `sms:batch` | 批量号码操作 | Admin |
| `sms:messages` | 查看验证码消息 | Admin, User |
| `sms:stats` | 查看SMS统计 | Admin |
| `sms:trigger-poll` | 触发轮询（管理员） | Admin |
| `sms:provider-stats` | 查看供应商统计 | Admin |

**API 端点映射**:
- `POST /` → `sms:request`
- `GET /:id` → `sms:read`
- `DELETE /:id` → `sms:cancel`
- `POST /batch` → `sms:batch`
- `GET /:id/messages` → `sms:messages`
- `GET /stats/polling` → `sms:stats`
- `GET /stats/providers` → `sms:provider-stats`
- `POST /poll/trigger` → `sms:trigger-poll`

---

### 3. Notification Service - 通知服务

**资源名称**: `notification`

#### 3.1 通知基础操作

| 权限代码 | 描述 | 适用角色 |
|---------|------|---------|
| `notification:create` | 创建通知 | Admin |
| `notification:broadcast` | 广播通知 | Admin |
| `notification:read` | 查看通知 | Admin, User |
| `notification:update` | 更新通知状态 | Admin, User |
| `notification:delete` | 删除通知 | Admin, User |
| `notification:batch-delete` | 批量删除通知 | Admin |
| `notification:stats` | 查看通知统计 | Admin |
| `notification:unread-count` | 查看未读数量 | Admin, User |

#### 3.2 通知偏好管理

| 权限代码 | 描述 | 适用角色 |
|---------|------|---------|
| `notification:preference:read` | 查看通知偏好 | Admin, User |
| `notification:preference:update` | 更新通知偏好 | Admin, User |
| `notification:preference:reset` | 重置通知偏好 | Admin |
| `notification:preference:batch` | 批量更新通知偏好 | Admin |

#### 3.3 通知模板管理（管理员功能）

| 权限代码 | 描述 | 适用角色 |
|---------|------|---------|
| `notification:template:create` | 创建通知模板 | Admin |
| `notification:template:read` | 查看通知模板 | Admin |
| `notification:template:update` | 更新通知模板 | Admin |
| `notification:template:delete` | 删除通知模板 | Admin |
| `notification:template:toggle` | 启用/禁用模板 | Admin |
| `notification:template:render` | 渲染模板 | Admin |

**API 端点映射**:
- `POST /` → `notification:create`
- `POST /broadcast` → `notification:broadcast`
- `GET /user/:userId` → `notification:read`
- `PATCH /:id/read` → `notification:update`
- `DELETE /:id` → `notification:delete`
- `POST /batch/delete` → `notification:batch-delete`
- `GET /stats` → `notification:stats`
- `GET /unread/count` → `notification:unread-count`
- Preferences API → `notification:preference:*`
- Templates API → `notification:template:*`

---

### 4. Media Service - 媒体流服务

**资源名称**: `media`

#### 4.1 媒体流管理

| 权限代码 | 描述 | 适用角色 |
|---------|------|---------|
| `media:stream:create` | 创建媒体流 | Admin, Device Manager |
| `media:stream:view` | 查看媒体流 | Admin, Device Manager, User |
| `media:stream:control` | 控制媒体流 | Admin, Device Manager |
| `media:stream:close` | 关闭媒体流 | Admin |

#### 4.2 录制管理

| 权限代码 | 描述 | 适用角色 |
|---------|------|---------|
| `media:record:start` | 开始屏幕录制 | Admin, Device Manager, User |
| `media:record:stop` | 停止屏幕录制 | Admin, Device Manager, User |
| `media:record:list` | 查看录制列表 | Admin, Device Manager, User |
| `media:record:download` | 下载录制文件 | Admin |

#### 4.3 统计

| 权限代码 | 描述 | 适用角色 |
|---------|------|---------|
| `media:stats` | 查看媒体统计 | Admin |

**功能说明**: Media Service 基于 WebRTC 提供实时设备屏幕流和录制功能。

---

## 👥 角色权限矩阵

### Super Admin
- **权限**: `*` (所有权限)
- 拥有系统所有权限，包括所有新增服务的完整权限

### Admin
- **新增权限**:
  - Proxy: 全部 10 项权限
  - SMS: 全部 8 项权限
  - Notification: 全部 20 项权限（包括模板管理）
  - Media: 全部 9 项权限

### Device Manager
- **新增权限**:
  - Proxy: 基础使用权限（acquire, list, read, assign, release, stats）
  - Media: 流管理和录制权限（6 项）

### User Manager
- **新增权限**: 无（该角色专注于用户管理）

### Finance Manager
- **新增权限**: 无（该角色专注于财务管理）

### User (普通用户)
- **新增权限**:
  - Proxy: 基础使用权限（acquire, read）
  - SMS: 号码请求和消息查看（request, read, messages, cancel）
  - Notification: 个人通知管理（read, update, delete, unread-count, preference:read, preference:update）
  - Media: 个人设备流查看和录制（stream:view, record:start/stop/list）

**设计原则**:
- 普通用户只能操作自己的资源
- 管理员可以操作所有资源并配置系统
- Device Manager 专注于设备相关服务的管理

---

## 📁 修改文件

### 主要文件
- `backend/user-service/src/scripts/init-permissions.ts`

### 修改内容

#### 1. DEFAULT_PERMISSIONS 数组
在第 138-196 行添加了 59 个新权限定义：
- Proxy Service: 10 个权限
- SMS Receive Service: 8 个权限
- Notification Service: 20 个权限
- Media Service: 9 个权限

#### 2. ROLE_PERMISSIONS_MAP 对象
更新了 3 个角色的权限配置：
- **admin** (第 301-350 行): 添加所有新服务的全部权限
- **device_manager** (第 369-381 行): 添加 proxy 和 media 相关权限
- **user** (第 408-424 行): 添加基础使用权限

---

## 🚀 部署步骤

### 1. 数据库迁移

```bash
cd backend/user-service

# 运行权限初始化脚本
npm run init:permissions

# 或者使用 ts-node 直接运行
npx ts-node src/scripts/init-permissions.ts
```

### 2. 验证权限创建

```bash
# 连接到数据库
psql -U postgres -d cloudphone

# 查看新增权限
SELECT resource, action, description
FROM permissions
WHERE resource IN ('proxy', 'sms', 'notification', 'media')
ORDER BY resource, action;

# 查看角色权限数量
SELECT r.name, COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.name
ORDER BY permission_count DESC;
```

### 3. 验证角色权限

```bash
# 查看 admin 角色的新权限
SELECT p.resource, p.action, p.description
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN roles r ON r.id = rp.role_id
WHERE r.code = 'admin'
  AND p.resource IN ('proxy', 'sms', 'notification', 'media')
ORDER BY p.resource, p.action;
```

### 4. 重启 User Service

```bash
# 使用 PM2
pm2 restart user-service

# 或直接运行
cd backend/user-service
pnpm start:dev
```

---

## 🧪 测试指南

### 1. 测试权限检查

在各个微服务的 Controller 中添加权限守卫：

```typescript
// proxy-service example
import { RequirePermission } from '@cloudphone/shared';

@Controller('proxy')
export class ProxyController {

  @Post('acquire')
  @RequirePermission('proxy:acquire')
  async acquireProxy(@Body() dto: AcquireProxyDto) {
    // ...
  }

  @Get('stats/pool')
  @RequirePermission('proxy:stats')
  async getPoolStats() {
    // ...
  }
}
```

### 2. 测试用户权限

```bash
# 1. 以 admin 身份登录
curl -X POST http://localhost:30001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# 2. 使用返回的 token 测试 proxy 权限
TOKEN="your-jwt-token"

curl -X POST http://localhost:30007/acquire \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location": "US", "proxyType": "residential"}'

# 3. 测试 SMS 权限
curl -X POST http://localhost:30008/numbers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"country": "US", "service": "gmail"}'

# 4. 测试 Notification 权限
curl -X GET http://localhost:30006/notifications/user/USER_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 3. 测试权限拒绝

```bash
# 以普通用户身份尝试管理员操作（应该被拒绝）
curl -X POST http://localhost:30007/admin/refresh-pool \
  -H "Authorization: Bearer $USER_TOKEN"

# 预期结果: 403 Forbidden
```

---

## 📊 权限统计

### 总计
- **新增权限总数**: 59 个
- **涉及资源**: 4 个 (proxy, sms, notification, media)
- **更新角色**: 3 个 (admin, device_manager, user)

### 分布
| 服务 | 权限数 | 管理员专用 | 用户可用 |
|-----|-------|-----------|---------|
| Proxy Service | 10 | 2 | 2 |
| SMS Receive Service | 8 | 2 | 4 |
| Notification Service | 20 | 9 | 6 |
| Media Service | 9 | 3 | 4 |
| **合计** | **59** | **16** | **16** |

---

## 🎯 下一步

### 建议工作

1. **在各微服务中应用权限守卫**
   - 为所有 API 端点添加 `@RequirePermission()` 装饰器
   - 确保权限检查逻辑正确

2. **更新前端权限控制**
   - 根据用户权限显示/隐藏菜单项
   - 实现按钮级别的权限控制

3. **编写权限测试用例**
   - E2E 测试覆盖所有权限场景
   - 测试权限继承和组合

4. **更新文档**
   - API 文档添加权限要求说明
   - 用户手册更新角色权限说明

---

## 📝 注意事项

### 安全建议

1. **最小权限原则**: 普通用户只分配必要的权限
2. **权限审计**: 定期审查用户权限分配
3. **敏感操作**: 管理员操作需要额外验证（如 2FA）

### 常见问题

**Q: 如何为特定用户添加额外权限？**
A: 使用数据范围（Data Scope）或创建自定义角色

**Q: 权限更新后用户需要重新登录吗？**
A: 是的，权限缓存在 JWT Token 中，更新后需要重新获取 Token

**Q: 如何撤销某个角色的特定权限？**
A: 从 `role_permissions` 表中删除对应的记录，或更新 `init-permissions.ts` 后重新初始化

---

## 📚 相关文档

- [RBAC 权限系统设计](./RBAC_DESIGN.md)
- [User Service 文档](../backend/user-service/README.md)
- [权限缓存策略](./PERMISSION_CACHE.md)
- [API 认证指南](./API_AUTHENTICATION.md)

---

**最后更新**: 2025-11-02
**文档版本**: v1.0
**维护者**: 系统架构组
