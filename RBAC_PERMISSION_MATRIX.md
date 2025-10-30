# RBAC 权限矩阵

## 角色定义

| 角色 | 名称 | 说明 |
|------|------|------|
| `super_admin` | 超级管理员 | 拥有所有权限，可跨租户操作 |
| `admin` | 管理员 | 拥有租户内所有权限，可管理用户、设备、应用等 |
| `user` | 普通用户 | 只能访问和管理自己的资源 |
| `guest` | 访客 | 只读权限，不能进行任何修改操作 |

## 数据范围说明

系统使用以下数据范围控制：

| 范围类型 | 说明 | 适用场景 |
|---------|------|----------|
| `ALL` | 所有数据 | 管理员查看所有用户/设备 |
| `TENANT` | 租户数据 | 同租户内数据共享 |
| `SELF` | 个人数据 | 用户只能访问自己的资源 |
| `CUSTOM` | 自定义 | 通过自定义函数判断 |

## 权限矩阵

### 用户管理 (User Service)

| 功能 | 路由 | super_admin | admin | user | guest | 数据范围 |
|------|------|-------------|-------|------|-------|----------|
| 获取当前用户信息 | `GET /users/me` | ✅ | ✅ | ✅ | ✅ | SELF |
| 获取用户列表 | `GET /users` | ✅ | ✅ | ❌ | ❌ | ALL |
| 获取用户详情 | `GET /users/:id` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 创建用户 | `POST /users` | ✅ | ✅ | ❌ | ❌ | ALL |
| 更新用户 | `PATCH /users/:id` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 删除用户 | `DELETE /users/:id` | ✅ | ✅ | ❌ | ❌ | ALL |
| 修改密码 | `POST /users/:id/change-password` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 获取用户统计 | `GET /users/stats` | ✅ | ✅ | ❌ | ❌ | ALL |

### 角色管理

| 功能 | 路由 | super_admin | admin | user | guest | 数据范围 |
|------|------|-------------|-------|------|-------|----------|
| 获取角色列表 | `GET /roles` | ✅ | ✅ | ✅ (只读) | ✅ (只读) | TENANT |
| 创建角色 | `POST /roles` | ✅ | ✅ | ❌ | ❌ | ALL |
| 更新角色 | `PATCH /roles/:id` | ✅ | ✅ | ❌ | ❌ | ALL |
| 删除角色 | `DELETE /roles/:id` | ✅ | ✅ | ❌ | ❌ | ALL |
| 分配权限 | `POST /roles/:id/permissions` | ✅ | ✅ | ❌ | ❌ | ALL |

### 权限管理

| 功能 | 路由 | super_admin | admin | user | guest | 数据范围 |
|------|------|-------------|-------|------|-------|----------|
| 获取权限列表 | `GET /permissions` | ✅ | ✅ | ✅ (只读) | ✅ (只读) | ALL |
| 创建权限 | `POST /permissions` | ✅ | ❌ | ❌ | ❌ | ALL |
| 更新权限 | `PATCH /permissions/:id` | ✅ | ❌ | ❌ | ❌ | ALL |
| 删除权限 | `DELETE /permissions/:id` | ✅ | ❌ | ❌ | ❌ | ALL |

### 菜单权限

| 功能 | 路由 | super_admin | admin | user | guest | 数据范围 |
|------|------|-------------|-------|------|-------|----------|
| 获取我的菜单 | `GET /menu-permissions/my-menus` | ✅ | ✅ | ✅ | ✅ | SELF |
| 获取我的权限 | `GET /menu-permissions/my-permissions` | ✅ | ✅ | ✅ | ✅ | SELF |
| 获取所有菜单 | `GET /menu-permissions/all-menus` | ✅ | ✅ | ❌ | ❌ | ALL |
| 检查菜单访问权限 | `GET /menu-permissions/check-menu-access` | ✅ | ✅ | ✅ | ✅ | SELF |

### 字段权限

| 功能 | 路由 | super_admin | admin | user | guest | 数据范围 |
|------|------|-------------|-------|------|-------|----------|
| 获取字段权限列表 | `GET /field-permissions` | ✅ | ✅ | ❌ | ❌ | ALL |
| 创建字段权限 | `POST /field-permissions` | ✅ | ✅ | ❌ | ❌ | ALL |
| 更新字段权限 | `PUT /field-permissions/:id` | ✅ | ✅ | ❌ | ❌ | ALL |
| 删除字段权限 | `DELETE /field-permissions/:id` | ✅ | ✅ | ❌ | ❌ | ALL |

### 数据范围管理

| 功能 | 路由 | super_admin | admin | user | guest | 数据范围 |
|------|------|-------------|-------|------|-------|----------|
| 获取数据范围列表 | `GET /data-scopes` | ✅ | ✅ | ❌ | ❌ | ALL |
| 创建数据范围 | `POST /data-scopes` | ✅ | ✅ | ❌ | ❌ | ALL |
| 更新数据范围 | `PUT /data-scopes/:id` | ✅ | ✅ | ❌ | ❌ | ALL |
| 删除数据范围 | `DELETE /data-scopes/:id` | ✅ | ✅ | ❌ | ❌ | ALL |

### 配额管理

| 功能 | 路由 | super_admin | admin | user | guest | 数据范围 |
|------|------|-------------|-------|------|-------|----------|
| 获取我的配额 | `GET /quotas/user/:userId` | ✅ | ✅ | ✅ (仅自己) | ✅ (只读) | SELF |
| 创建配额 | `POST /quotas` | ✅ | ✅ | ❌ | ❌ | ALL |
| 更新配额 | `PUT /quotas/:id` | ✅ | ✅ | ❌ | ❌ | ALL |
| 配额检查 | `POST /quotas/check` | ✅ | ✅ | ✅ | ❌ | SELF |
| 配额统计 | `GET /quotas/usage-stats/:userId` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |

### 工单管理

| 功能 | 路由 | super_admin | admin | user | guest | 数据范围 |
|------|------|-------------|-------|------|-------|----------|
| 创建工单 | `POST /tickets` | ✅ | ✅ | ✅ | ❌ | SELF |
| 获取我的工单 | `GET /tickets/user/:userId` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 获取所有工单 | `GET /tickets` | ✅ | ✅ | ❌ | ❌ | ALL |
| 更新工单 | `PUT /tickets/:id` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 回复工单 | `POST /tickets/:id/replies` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 工单评分 | `POST /tickets/:id/rate` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 工单统计 | `GET /tickets/statistics/overview` | ✅ | ✅ | ❌ | ❌ | ALL |

### 审计日志

| 功能 | 路由 | super_admin | admin | user | guest | 数据范围 |
|------|------|-------------|-------|------|-------|----------|
| 获取用户审计日志 | `GET /audit-logs/user/:userId` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 获取资源审计日志 | `GET /audit-logs/resource/:type/:id` | ✅ | ✅ | ❌ | ❌ | ALL |
| 搜索审计日志 | `GET /audit-logs/search` | ✅ | ✅ | ❌ | ❌ | ALL |
| 审计日志统计 | `GET /audit-logs/statistics` | ✅ | ✅ | ❌ | ❌ | ALL |

### API密钥管理

| 功能 | 路由 | super_admin | admin | user | guest | 数据范围 |
|------|------|-------------|-------|------|-------|----------|
| 创建API密钥 | `POST /api-keys` | ✅ | ✅ | ✅ | ❌ | SELF |
| 获取我的API密钥 | `GET /api-keys/user/:userId` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 撤销API密钥 | `POST /api-keys/:id/revoke` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 删除API密钥 | `DELETE /api-keys/:id` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| API密钥统计 | `GET /api-keys/statistics/:userId` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |

### 缓存管理

| 功能 | 路由 | super_admin | admin | user | guest | 数据范围 |
|------|------|-------------|-------|------|-------|----------|
| 获取缓存统计 | `GET /cache/stats` | ✅ | ✅ | ❌ | ❌ | ALL |
| 清除缓存 | `DELETE /cache` | ✅ | ✅ | ❌ | ❌ | ALL |
| 清除指定key | `DELETE /cache/pattern` | ✅ | ✅ | ❌ | ❌ | ALL |
| 检查缓存是否存在 | `GET /cache/exists` | ✅ | ✅ | ❌ | ❌ | ALL |

### 队列管理

| 功能 | 路由 | super_admin | admin | user | guest | 数据范围 |
|------|------|-------------|-------|------|-------|----------|
| 获取队列状态 | `GET /queues/status` | ✅ | ✅ | ❌ | ❌ | ALL |
| 获取队列任务 | `GET /queues/:name/jobs` | ✅ | ✅ | ❌ | ❌ | ALL |
| 重试任务 | `POST /queues/:name/jobs/:id/retry` | ✅ | ✅ | ❌ | ❌ | ALL |
| 删除任务 | `DELETE /queues/:name/jobs/:id` | ✅ | ✅ | ❌ | ❌ | ALL |
| 暂停队列 | `POST /queues/:name/pause` | ✅ | ✅ | ❌ | ❌ | ALL |
| 恢复队列 | `POST /queues/:name/resume` | ✅ | ✅ | ❌ | ❌ | ALL |

### 事件溯源

| 功能 | 路由 | super_admin | admin | user | guest | 数据范围 |
|------|------|-------------|-------|------|-------|----------|
| 获取用户事件历史 | `GET /events/user/:userId/history` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 回放用户状态 | `GET /events/user/:userId/replay` | ✅ | ✅ | ❌ | ❌ | ALL |
| 获取事件统计 | `GET /events/stats` | ✅ | ✅ | ❌ | ❌ | ALL |
| 获取最近事件 | `GET /events/recent` | ✅ | ✅ | ❌ | ❌ | ALL |

### 设备管理 (Device Service)

| 功能 | 路由 | super_admin | admin | user | guest | 数据范围 |
|------|------|-------------|-------|------|-------|----------|
| 获取所有设备 | `GET /devices` | ✅ | ✅ | ❌ | ❌ | ALL |
| 获取我的设备 | `GET /devices/user/:userId` | ✅ | ✅ | ✅ (仅自己) | ✅ (只读) | SELF |
| 获取设备详情 | `GET /devices/:id` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 创建设备 | `POST /devices` | ✅ | ✅ | ✅ | ❌ | SELF |
| 启动设备 | `POST /devices/:id/start` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 停止设备 | `POST /devices/:id/stop` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 删除设备 | `DELETE /devices/:id` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 设备快照 | `POST /devices/:id/snapshot` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 设备监控 | `GET /devices/:id/metrics` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |

### 应用管理 (App Service)

| 功能 | 路由 | super_admin | admin | user | guest | 数据范围 |
|------|------|-------------|-------|------|-------|----------|
| 获取应用列表 | `GET /apps` | ✅ | ✅ | ✅ | ✅ (只读) | ALL |
| 上传应用 | `POST /apps` | ✅ | ✅ | ✅ | ❌ | SELF |
| 审核应用 | `POST /apps/:id/review` | ✅ | ✅ | ❌ | ❌ | ALL |
| 安装应用 | `POST /devices/:deviceId/apps/:appId` | ✅ | ✅ | ✅ (仅自己设备) | ❌ | SELF |
| 卸载应用 | `DELETE /devices/:deviceId/apps/:appId` | ✅ | ✅ | ✅ (仅自己设备) | ❌ | SELF |

### 计费管理 (Billing Service)

| 功能 | 路由 | super_admin | admin | user | guest | 数据范围 |
|------|------|-------------|-------|------|-------|----------|
| 获取我的账单 | `GET /billing/user/:userId` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 获取所有账单 | `GET /billing` | ✅ | ✅ | ❌ | ❌ | ALL |
| 创建支付 | `POST /payments` | ✅ | ✅ | ✅ | ❌ | SELF |
| 获取余额 | `GET /balance/:userId` | ✅ | ✅ | ✅ (仅自己) | ✅ (只读) | SELF |
| 充值 | `POST /balance/recharge` | ✅ | ✅ | ✅ | ❌ | SELF |
| 使用统计 | `GET /metering/:userId` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 账单统计 | `GET /billing/statistics` | ✅ | ✅ | ❌ | ❌ | ALL |

### 通知管理 (Notification Service)

| 功能 | 路由 | super_admin | admin | user | guest | 数据范围 |
|------|------|-------------|-------|------|-------|----------|
| 获取我的通知 | `GET /notifications/user/:userId` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 标记已读 | `PATCH /notifications/:id/read` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 删除通知 | `DELETE /notifications/:id` | ✅ | ✅ | ✅ (仅自己) | ❌ | SELF |
| 通知偏好设置 | `PUT /notifications/preferences` | ✅ | ✅ | ✅ | ❌ | SELF |
| 发送系统通知 | `POST /notifications/system` | ✅ | ✅ | ❌ | ❌ | ALL |

## 使用示例

### 1. Controller 层添加数据范围守卫

```typescript
import { DataScopeGuard, DataScope, DataScopeType } from '@cloudphone/shared';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard, DataScopeGuard)
export class UsersController {

  // 管理员可查看所有，用户只能查看自己
  @Get(':id')
  @RequirePermission('user.read')
  @DataScope(DataScopeType.SELF)
  async findOne(@Param('id') id: string) {
    // ...
  }

  // 只有管理员可以访问
  @Delete(':id')
  @RequirePermission('user.delete')
  @DataScope(DataScopeType.ALL)
  async remove(@Param('id') id: string) {
    // ...
  }
}
```

### 2. 前端根据角色显示功能

```typescript
// admin 前端
const userRole = user.roles[0].name;

if (isAdminRole(userRole)) {
  // 显示所有管理功能
  return <AdminDashboard />;
} else {
  // 只显示用户功能
  return <UserDashboard />;
}
```

## 权限验证流程

```
用户请求 → JWT认证 → 角色守卫 → 权限守卫 → 数据范围守卫 → 业务逻辑
         ↓          ↓          ↓          ↓
      验证Token   检查角色   检查权限   过滤数据
```

## 注意事项

1. **守卫顺序**：`JwtAuthGuard` → `PermissionsGuard` → `DataScopeGuard`
2. **超级管理员**：自动跳过所有数据范围检查
3. **管理员**：根据数据范围类型决定是否可访问
4. **普通用户**：严格的数据范围限制
5. **租户隔离**：自动通过 `tenantId` 过滤数据

## 最佳实践

1. 使用 `@DataScope(DataScopeType.SELF)` 保护用户个人数据
2. 使用 `@DataScope(DataScopeType.ALL)` 限制管理员功能
3. 使用 `@DataScope(DataScopeType.TENANT)` 实现租户隔离
4. 添加 `GET /me` 接口让用户快速获取自己的信息
5. Service 层添加自动过滤逻辑，根据用户角色返回不同数据
