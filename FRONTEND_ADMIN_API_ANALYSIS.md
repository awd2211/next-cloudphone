# Frontend Admin 完整 API 分析报告

分析时间: 2025-11-03
项目: Cloud Phone Platform - Admin Frontend
分析范围: frontend/admin/src 目录下所有 API 调用

---

## 目录结构

```
frontend/admin/src/
├── services/     (32个 API 服务文件)
├── hooks/        (68个 React hooks 用于数据管理)
├── pages/        (页面组件调用 API)
└── components/   (UI 组件中的 API 调用)
```

---

## 1. 认证服务 (Authentication Service)

**文件**: `services/auth.ts`
**基础 URL**: `/auth`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/auth/captcha` | 获取验证码 | - | `{ id: string, svg: string }` |
| POST | `/auth/login` | 用户登录 | `{ username, password, captcha, captchaId }` | `{ token, user }` |
| POST | `/auth/logout` | 用户登出 | - | - |
| GET | `/auth/me` | 获取当前用户信息 | - | `User` |

**使用位置**:
- `pages/Login/index.tsx` - 登录页面
- 状态管理中的认证逻辑

---

## 2. 用户管理 (User Management)

**文件**: `services/user.ts`
**基础 URL**: `/users`

### API 列表

| 方法 | 路径 | 功能 | 参数类型 | 返回值 |
|------|------|------|---------|--------|
| GET | `/users` | 用户列表（偏移分页） | `PaginationParams` | `PaginatedResponse<User>` |
| GET | `/users/cursor` | 用户列表（游标分页） | `CursorPaginationParams` | `CursorPaginatedResponse<User>` |
| GET | `/users/{id}` | 用户详情 | `id: string` | `User` |
| POST | `/users` | 创建用户 | `CreateUserDto` | `User` |
| PATCH | `/users/{id}` | 更新用户 | `UpdateUserDto` | `User` |
| DELETE | `/users/{id}` | 删除用户 | `id: string` | - |
| GET | `/users/stats` | 用户统计 | - | `{ total, active, inactive, banned }` |
| POST | `/balance/recharge` | 充值余额 | `{ userId, amount, reason }` | - |
| POST | `/balance/adjust` | 调整余额 | `{ userId, amount, reason }` | - |
| POST | `/users/{id}/change-password` | 修改密码 | `{ oldPassword, newPassword }` | - |
| POST | `/users/{id}/reset-password` | 重置密码 | `{ newPassword }` | - |
| POST | `/users/batch-delete` | 批量删除用户 | `{ userIds }` | - |

**Hooks**:
- `useUsers()` - 获取用户列表
- `useUser(id)` - 获取用户详情
- `useUserStats()` - 获取用户统计
- `useCreateUser()` - 创建用户
- `useUpdateUser()` - 更新用户
- `useDeleteUser()` - 删除用户
- `useToggleUserStatus()` - 切换用户状态
- `useResetPassword()` - 重置密码
- `useBatchDeleteUsers()` - 批量删除用户

**使用位置**:
- `pages/User/List.tsx` - 用户列表页面
- `pages/Profile/index.tsx` - 个人资料页面
- `components/User/*` - 用户相关组件

---

## 3. 设备管理 (Device Management)

**文件**: `services/device.ts`
**基础 URL**: `/devices`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/devices` | 设备列表（偏移分页） | `PaginationParams` | `PaginatedResponse<Device>` |
| GET | `/devices/cursor` | 设备列表（游标分页） | `CursorPaginationParams` | `CursorPaginatedResponse<Device>` |
| GET | `/devices/{id}` | 设备详情 | `id: string` | `Device` |
| POST | `/devices` | 创建设备 | `CreateDeviceDto` | `Device` |
| PATCH | `/devices/{id}` | 更新设备 | `UpdateDeviceDto` | `Device` |
| DELETE | `/devices/{id}` | 删除设备 | `id: string` | - |
| POST | `/devices/{id}/start` | 启动设备 | `id: string` | - |
| POST | `/devices/{id}/stop` | 停止设备 | `id: string` | - |
| POST | `/devices/{id}/reboot` | 重启设备 | `id: string` | - |
| GET | `/devices/available` | 可用设备列表 | - | `Device[]` |
| GET | `/devices/stats` | 设备统计 | - | `DeviceStats` |
| POST | `/devices/{id}/shell` | 执行 Shell 命令 | `ShellCommandDto` | `ShellCommandResult` |
| POST | `/devices/{id}/screenshot` | 截图 | - | `Blob` |
| POST | `/devices/{id}/push` | 推送文件 | `{ localPath, remotePath }` | - |
| POST | `/devices/{id}/pull` | 拉取文件 | `{ remotePath, localPath }` | - |
| POST | `/devices/{id}/install` | 安装应用 | `File` (FormData) | - |
| POST | `/devices/{id}/uninstall` | 卸载应用 | `{ packageName }` | - |
| GET | `/devices/{id}/packages` | 获取已安装应用 | `id: string` | `DevicePackage[]` |
| GET | `/devices/{id}/logcat` | 获取日志 | `{ lines? }` | `string` |
| POST | `/devices/{id}/logcat/clear` | 清空日志 | - | - |
| GET | `/devices/{id}/properties` | 获取设备属性 | `id: string` | `DeviceProperties` |
| POST | `/devices/batch/start` | 批量启动 | `{ ids }` | - |
| POST | `/devices/batch/stop` | 批量停止 | `{ ids }` | - |
| POST | `/devices/batch/reboot` | 批量重启 | `{ ids }` | - |
| POST | `/devices/batch/delete` | 批量删除 | `{ ids }` | - |
| GET | `/devices/{id}/connection` | 连接信息 | `id: string` | `any` |
| POST | `/devices/{id}/webrtc/token` | WebRTC 令牌 | `id: string` | `{ token, connectionInfo }` |
| POST | `/devices/{id}/cloud/refresh` | 刷新云设备 | `id: string` | - |
| GET | `/devices/physical` | 物理设备列表 | `{ page?, pageSize? }` | - |
| POST | `/devices/physical/scan` | 扫描物理设备 | `{ subnet }` | - |
| POST | `/devices/physical/register` | 注册物理设备 | `{ serialNumber, name? }` | - |

**Hooks**:
- `useDevices()` - 获取设备列表
- `useDevice()` - 获取设备详情
- `useDeviceStats()` - 设备统计
- `useCreateDevice()` - 创建设备
- `useStartDevice()` - 启动设备
- `useStopDevice()` - 停止设备
- `useRebootDevice()` - 重启设备
- `useDeleteDevice()` - 删除设备
- `useDeviceList()` - 设备列表（高级）

**使用位置**:
- `pages/Device/List.tsx` - 设备列表页面
- `pages/Device/Detail.tsx` - 设备详情页面
- `components/Device/*` - 设备相关组件
- `components/ADBConsole.tsx` - ADB 控制台
- `components/WebRTCPlayer.tsx` - WebRTC 播放器

---

## 4. 应用管理 (Application Management)

**文件**: `services/app.ts`
**基础 URL**: `/apps`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/apps` | 应用列表（偏移分页） | `PaginationParams` | `PaginatedResponse<Application>` |
| GET | `/apps/cursor` | 应用列表（游标分页） | `CursorPaginationParams` | `CursorPaginatedResponse<Application>` |
| GET | `/apps/{id}` | 应用详情 | `id: string` | `Application` |
| POST | `/apps/upload` | 上传应用 | `File` (FormData) | `Application` |
| PATCH | `/apps/{id}` | 更新应用 | `Partial<Application>` | `Application` |
| DELETE | `/apps/{id}` | 删除应用 | `id: string` | - |
| POST | `/apps/{id}/publish` | 发布应用 | `id: string` | - |
| POST | `/apps/{id}/unpublish` | 取消发布 | `id: string` | - |
| POST | `/apps/install` | 安装应用到设备 | `InstallAppDto` | `DeviceApplication` |
| POST | `/apps/uninstall` | 卸载应用 | `{ deviceId, applicationId }` | - |
| GET | `/apps/devices/{id}/apps` | 设备应用列表 | `deviceId: string` | `DeviceApplication[]` |
| GET | `/apps/stats` | 应用统计 | - | `{ total, categories }` |
| GET | `/apps` (filter) | 待审核应用 | `{ reviewStatus: 'pending' }` | `PaginatedResponse<Application>` |
| POST | `/apps/{id}/submit-review` | 提交审核 | `id: string` | - |
| POST | `/apps/{id}/approve` | 批准应用 | `ApproveAppDto` | - |
| POST | `/apps/{id}/reject` | 拒绝应用 | `RejectAppDto` | - |
| POST | `/apps/{id}/request-changes` | 请求修改 | `RequestChangesDto` | - |
| GET | `/apps/audit-records` | 审核记录列表 | `PaginationParams` | `PaginatedResponse<AppReviewRecord>` |
| GET | `/apps/{id}/reviews` | 应用审核历史 | `applicationId: string` | `AppReviewRecord[]` |

**Hooks**:
- `useApps()` - 应用列表
- `useInfiniteApps()` - 无限滚动应用列表
- `useAppReviewList()` - 审核列表
- `useAppReview()` - 应用审核

**使用位置**:
- `pages/App/List.tsx` - 应用列表
- `pages/AppReview/ReviewList.tsx` - 审核列表
- `pages/AppReview/ReviewDetail.tsx` - 审核详情
- `components/AppReview/*` - 应用审核组件

---

## 5. 计费管理 (Billing Management)

**文件**: `services/billing.ts`, `services/order.ts`, `services/plan.ts`, `services/payment-admin.ts`
**基础 URL**: `/billing`, `/payments`, `/admin/payments`, `/orders`, `/reports`

### 订单管理

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/billing/orders` | 订单列表 | `PaginationParams` | `PaginatedResponse<Order>` |
| GET | `/billing/orders/{id}` | 订单详情 | `id: string` | `Order` |
| POST | `/billing/orders` | 创建订单 | `CreateOrderDto` | `Order` |
| POST | `/billing/orders/{id}/cancel` | 取消订单 | `{ reason? }` | - |
| POST | `/billing/orders/batch/cancel` | 批量取消 | `{ ids, reason? }` | - |
| GET | `/billing/orders/stats` | 订单统计 | - | `{ total, pending, paid, cancelled, refunded }` |

### 支付管理

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/payments` | 支付列表 | `PaginationParams` | `PaginatedResponse<Payment>` |
| GET | `/payments/{id}` | 支付详情 | `id: string` | `Payment` |
| POST | `/payments` | 创建支付 | `CreatePaymentDto` | `Payment` |
| POST | `/payments/query` | 查询支付状态 | `{ paymentNo }` | `Payment` |
| POST | `/payments/{id}/refund` | 申请退款 | `{ amount, reason }` | - |
| POST | `/billing/orders/{id}/refund` | 订单退款 | `{ amount, reason }` | - |

### 计量相关

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/billing/usage` | 使用记录列表 | `PaginationParams` | `PaginatedResponse<UsageRecord>` |
| GET | `/metering/users/{id}` | 用户使用统计 | `{ startDate?, endDate? }` | - |
| GET | `/metering/devices/{id}` | 设备使用统计 | `{ startDate?, endDate? }` | - |
| GET | `/metering/overview` | 计量概览 | - | - |
| GET | `/metering/users` | 用户计量列表 | `PaginationParams` | - |
| GET | `/metering/devices` | 设备计量列表 | `PaginationParams` | - |
| GET | `/metering/trend` | 计量趋势 | `{ type, startDate?, endDate? }` | - |
| GET | `/metering/resource-analysis` | 资源分析 | `{ resourceType? }` | - |

### 报表相关

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/reports/bills/{id}` | 用户账单 | `{ startDate, endDate }` | `UserBill` |
| GET | `/reports/revenue` | 收入统计 | `{ startDate, endDate }` | `{ totalRevenue, ... }` |
| GET | `/reports/usage-trend` | 使用趋势 | `{ startDate, endDate }` | - |
| GET | `/reports/bills/{id}/export` | 导出账单 | `{ startDate, endDate, format }` | `Blob` |
| GET | `/reports/revenue/export` | 导出收入 | `{ startDate, endDate, format }` | `Blob` |

### 套餐管理

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/billing/plans` | 套餐列表 | `PaginationParams` | `PaginatedResponse<Plan>` |
| GET | `/billing/plans/{id}` | 套餐详情 | `id: string` | `Plan` |
| POST | `/billing/plans` | 创建套餐 | `CreatePlanDto` | `Plan` |
| PATCH | `/billing/plans/{id}` | 更新套餐 | `Partial<CreatePlanDto>` | `Plan` |
| DELETE | `/billing/plans/{id}` | 删除套餐 | `id: string` | - |
| POST | `/billing/plans/batch-delete` | 批量删除 | `{ planIds }` | - |
| GET | `/reports/plans/stats` | 套餐统计 | - | - |

### 计费规则

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/billing/rules` | 规则列表 | `PaginationParams` | - |
| GET | `/billing/rules/{id}` | 规则详情 | `id: string` | - |
| POST | `/billing/rules` | 创建规则 | `any` | - |
| PUT | `/billing/rules/{id}` | 更新规则 | `any` | - |
| DELETE | `/billing/rules/{id}` | 删除规则 | `id: string` | - |
| PATCH | `/billing/rules/{id}/toggle` | 切换状态 | `{ isActive }` | - |
| POST | `/billing/rules/{id}/test` | 测试规则 | `any` | - |
| GET | `/billing/rules/templates` | 规则模板 | - | - |

### 支付管理（管理员）

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/admin/payments/statistics` | 支付统计 | `{ startDate?, endDate? }` | `PaymentStatistics` |
| GET | `/admin/payments/statistics/payment-methods` | 支付方式统计 | `{ startDate?, endDate? }` | `PaymentMethodStat[]` |
| GET | `/admin/payments/statistics/daily` | 每日统计 | `{ days }` | `DailyStat[]` |
| GET | `/admin/payments` | 支付列表（管理员） | `PaymentListParams` | `PaginatedResponse<PaymentDetail>` |
| GET | `/admin/payments/{id}` | 支付详情（管理员） | `id: string` | `PaymentDetail` |
| POST | `/admin/payments/{id}/refund` | 手动退款 | `RefundRequest` | - |
| GET | `/admin/payments/refunds/pending` | 待审核退款 | - | `PaymentDetail[]` |
| POST | `/admin/payments/refunds/{id}/approve` | 批准退款 | `{ adminNote? }` | - |
| POST | `/admin/payments/refunds/{id}/reject` | 拒绝退款 | `{ reason, adminNote? }` | - |
| GET | `/admin/payments/exceptions/list` | 异常支付 | `{ page, limit }` | `PaginatedResponse<PaymentDetail>` |
| POST | `/admin/payments/{id}/sync` | 同步支付状态 | `id: string` | - |
| GET | `/admin/payments/export/excel` | 导出 Excel | `{ startDate?, endDate?, status?, method? }` | `Blob` |
| GET | `/admin/payments/config/all` | 支付配置 | - | `PaymentConfig` |
| PUT | `/admin/payments/config` | 更新配置 | `Partial<PaymentConfig>` | - |
| POST | `/admin/payments/config/test/{provider}` | 测试连接 | `provider: string` | - |
| GET | `/admin/payments/webhooks/logs` | Webhook 日志 | `{ page?, limit?, provider? }` | - |

**Hooks**:
- `usePlans()` - 套餐列表
- `usePlanList()` - 套餐列表高级
- `useOrders()` - 订单列表
- `useBillingRules()` - 计费规则
- `useBillingRuleList()` - 计费规则列表
- `useMeteringDashboard()` - 计量仪表板
- `usePaymentDashboard()` - 支付仪表板
- `usePaymentConfig()` - 支付配置
- `useExceptionPayments()` - 异常支付
- `useRefundManagement()` - 退款管理
- `useWebhookLogs()` - Webhook 日志
- `useRevenueReport()` - 收入报告
- `useTransactionHistory()` - 交易历史
- `useInvoiceList()` - 发票列表
- `useBalanceOverview()` - 余额概览
- `usePayments()` - 支付列表
- `usePaymentConfig()` - 支付配置

**使用位置**:
- `pages/Billing/*` - 计费相关页面
- `pages/Payment/*` - 支付管理页面
- `pages/Plan/List.tsx` - 套餐列表
- `pages/BillingRules/List.tsx` - 计费规则

---

## 6. 配额管理 (Quota Management)

**文件**: `services/quota.ts`
**基础 URL**: `/quotas`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| POST | `/quotas` | 创建配额 | `CreateQuotaDto` | `{ success, data: Quota }` |
| GET | `/quotas/user/{id}` | 获取用户配额 | `userId: string` | `{ success, data: Quota }` |
| POST | `/quotas/check` | 检查配额 | `CheckQuotaRequest` | `{ success, data: { allowed, ... } }` |
| POST | `/quotas/deduct` | 扣减配额 | `DeductQuotaRequest` | `{ success, data: Quota }` |
| POST | `/quotas/restore` | 恢复配额 | `RestoreQuotaRequest` | `{ success, data: Quota }` |
| PUT | `/quotas/{id}` | 更新配额 | `UpdateQuotaDto` | `{ success, data: Quota }` |
| POST | `/quotas/user/{id}/usage` | 上报用量 | `usageReport` | `{ success, data: Quota }` |
| GET | `/quotas/usage-stats/{id}` | 使用统计 | `userId: string` | `{ success, data: QuotaStatistics }` |
| POST | `/quotas/check/batch` | 批量检查 | `CheckQuotaRequest[]` | `{ success, data: { ... } }` |
| GET | `/quotas/alerts` | 配额告警 | `{ threshold }` | `{ success, data: QuotaAlert[] }` |

**Hooks**:
- `useQuotaList()` - 配额列表
- `useQuotaDetail()` - 配额详情

**使用位置**:
- `pages/Quota/QuotaList.tsx` - 配额列表页面
- `components/Quota/*` - 配额相关组件

---

## 7. 角色和权限管理 (Role & Permission Management)

**文件**: `services/role.ts`, `services/fieldPermission.ts`, `services/dataScope.ts`
**基础 URL**: `/roles`, `/permissions`, `/field-permissions`, `/data-scopes`

### 角色管理

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/roles` | 角色列表 | `PaginationParams` | `PaginatedResponse<Role>` |
| GET | `/roles/{id}` | 角色详情 | `id: string` | `Role` |
| POST | `/roles` | 创建角色 | `{ name, description?, permissionIds }` | `Role` |
| PATCH | `/roles/{id}` | 更新角色 | `{ name?, description?, permissionIds? }` | `Role` |
| DELETE | `/roles/{id}` | 删除角色 | `id: string` | - |
| POST | `/roles/batch-delete` | 批量删除 | `{ roleIds }` | - |
| GET | `/permissions` | 权限列表 | `{ page, limit }` | `Permission[]` |
| POST | `/permissions` | 创建权限 | `{ resource, action, description? }` | `Permission` |
| PATCH | `/permissions/{id}` | 更新权限 | `{ resource?, action?, description? }` | `Permission` |
| DELETE | `/permissions/{id}` | 删除权限 | `id: string` | - |
| POST | `/roles/{id}/permissions` | 分配权限 | `{ permissionIds }` | - |
| DELETE | `/roles/{id}/permissions` | 移除权限 | `{ permissionIds }` | - |
| GET | `/permissions/{id}` | 权限详情 | `id: string` | `Permission` |
| GET | `/permissions/resource/{type}` | 按资源查询权限 | `resource: string` | `Permission[]` |
| POST | `/permissions/bulk` | 批量创建权限 | `Array<{...}>` | `Permission[]` |

### 字段权限管理

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/field-permissions/meta/access-levels` | 访问级别元数据 | - | `{ success, data: [...] }` |
| GET | `/field-permissions/meta/operation-types` | 操作类型元数据 | - | `{ success, data: [...] }` |
| GET | `/field-permissions` | 字段权限列表 | `{ roleId?, resourceType?, operation?, isActive? }` | `{ success, data, total }` |
| GET | `/field-permissions/{id}` | 字段权限详情 | `id: string` | `{ success, data: FieldPermission }` |
| GET | `/field-permissions/role/{id}` | 角色字段权限 | `roleId: string` | `{ success, data: {...}, total }` |
| POST | `/field-permissions` | 创建字段权限 | `CreateFieldPermissionDto` | `{ success, data: FieldPermission }` |
| PUT | `/field-permissions/{id}` | 更新字段权限 | `UpdateFieldPermissionDto` | `{ success, data: FieldPermission }` |
| DELETE | `/field-permissions/{id}` | 删除字段权限 | `id: string` | `{ success }` |
| POST | `/field-permissions/batch` | 批量创建 | `CreateFieldPermissionDto[]` | `{ success, data: FieldPermission[] }` |
| PUT | `/field-permissions/{id}/toggle` | 启用/禁用 | `id: string` | `{ success, data: FieldPermission }` |
| GET | `/field-permissions/meta/transform-examples` | 转换示例 | - | `{ success, data: {...} }` |

### 数据范围管理

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/data-scopes/meta/scope-types` | 范围类型元数据 | - | `{ success, data: [...] }` |
| GET | `/data-scopes` | 数据范围列表 | `{ roleId?, resourceType?, isActive? }` | `{ success, data, total }` |
| GET | `/data-scopes/{id}` | 数据范围详情 | `id: string` | `{ success, data: DataScope }` |
| GET | `/data-scopes/role/{id}` | 角色数据范围 | `roleId: string` | `{ success, data: {...}, total }` |
| POST | `/data-scopes` | 创建数据范围 | `CreateDataScopeDto` | `{ success, data: DataScope }` |
| PUT | `/data-scopes/{id}` | 更新数据范围 | `UpdateDataScopeDto` | `{ success, data: DataScope }` |
| DELETE | `/data-scopes/{id}` | 删除数据范围 | `id: string` | `{ success }` |
| POST | `/data-scopes/batch` | 批量创建 | `CreateDataScopeDto[]` | `{ success, data: DataScope[] }` |
| PUT | `/data-scopes/{id}/toggle` | 启用/禁用 | `id: string` | `{ success, data: DataScope }` |

**Hooks**:
- `useRoles()` - 角色列表
- `useFieldPermission()` - 字段权限
- `useDataScope()` - 数据范围
- `useDataScopeManagement()` - 数据范围管理
- `useDataScopeConfig()` - 数据范围配置

**使用位置**:
- `pages/Role/List.tsx` - 角色列表
- `pages/Permission/FieldPermission.tsx` - 字段权限
- `pages/Permission/DataScope.tsx` - 数据范围
- `pages/Permission/MenuPermission.tsx` - 菜单权限

---

## 8. 菜单权限管理 (Menu Permission)

**文件**: `services/menu.ts`
**基础 URL**: `/menu-permissions`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/menu-permissions/all-menus` | 所有菜单 | - | `MenuItem[]` |
| GET | `/menu-permissions/my-menus` | 当前用户菜单 | - | `MenuItem[]` |
| GET | `/menu-permissions/my-permissions` | 当前用户权限 | - | `string[]` |
| GET | `/menu-permissions/user/{id}/menus` | 指定用户菜单 | `userId: string` | `MenuItem[]` |
| GET | `/menu-permissions/user/{id}/permissions` | 指定用户权限 | `userId: string` | `string[]` |
| GET | `/menu-permissions/check-menu-access` | 检查菜单访问权限 | `{ path }` | `{ hasAccess, reason? }` |
| GET | `/menu-permissions/breadcrumb` | 获取面包屑 | `{ path }` | `Array<{name, path}>` |
| GET | `/menu-permissions/cache/stats` | 缓存统计 | - | `MenuCacheStats` |
| GET | `/menu-permissions/cache/refresh/{id}` | 刷新用户缓存 | `userId: string` | `{ success, message }` |
| GET | `/menu-permissions/cache/clear-all` | 清空所有缓存 | - | `{ success, message, clearedCount }` |
| GET | `/menu-permissions/cache/warmup` | 预热缓存 | `{ limit? }` | `{ success, message, warmedUpCount }` |
| GET | `/menu-permissions/cache/export` | 导出缓存 | - | `Record<string, any>` |

**Hooks**:
- 无直接 hooks，一般由导航组件使用

**使用位置**:
- 导航菜单和权限检查
- 路由保护

---

## 9. 快照管理 (Snapshot Management)

**文件**: `services/snapshot.ts`
**基础 URL**: `/snapshots`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/snapshots` | 快照列表 | `PaginationParams` | `PaginatedResponse<DeviceSnapshot>` |
| GET | `/snapshots/device/{id}` | 设备快照列表 | `deviceId: string` | `DeviceSnapshot[]` |
| GET | `/snapshots/{id}` | 快照详情 | `id: string` | `DeviceSnapshot` |
| POST | `/snapshots/device/{id}` | 创建快照 | `{ name, description? }` | `DeviceSnapshot` |
| POST | `/snapshots/{id}/restore` | 恢复快照 | `id: string` | - |
| POST | `/snapshots/{id}/compress` | 压缩快照 | `id: string` | - |
| DELETE | `/snapshots/{id}` | 删除快照 | `id: string` | - |
| POST | `/snapshots/batch-delete` | 批量删除 | `{ snapshotIds }` | - |
| GET | `/snapshots/stats/summary` | 快照统计 | - | `SnapshotStats` |

**Hooks**:
- `useSnapshots()` - 快照列表

**使用位置**:
- `pages/Snapshot/List.tsx` - 快照列表页面

---

## 10. 生命周期管理 (Device Lifecycle)

**文件**: `services/lifecycle.ts`
**基础 URL**: `/devices/lifecycle`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/devices/lifecycle/rules` | 规则列表 | `PaginationParams` | `PaginatedResponse<LifecycleRule>` |
| GET | `/devices/lifecycle/rules/{id}` | 规则详情 | `id: string` | `LifecycleRule` |
| POST | `/devices/lifecycle/rules` | 创建规则 | `CreateLifecycleRuleDto` | `LifecycleRule` |
| PUT | `/devices/lifecycle/rules/{id}` | 更新规则 | `UpdateLifecycleRuleDto` | `LifecycleRule` |
| DELETE | `/devices/lifecycle/rules/{id}` | 删除规则 | `id: string` | - |
| PATCH | `/devices/lifecycle/rules/{id}/toggle` | 切换规则 | `{ enabled }` | - |
| POST | `/devices/lifecycle/rules/{id}/execute` | 执行规则 | `id: string` | `LifecycleExecutionHistory` |
| POST | `/devices/lifecycle/rules/{id}/test` | 测试规则 | `{ dryRun }` | - |
| GET | `/devices/lifecycle/history` | 执行历史 | `PaginationParams` | `PaginatedResponse<LifecycleExecutionHistory>` |
| GET | `/devices/lifecycle/history/{id}` | 执行详情 | `id: string` | `LifecycleExecutionHistory` |
| GET | `/devices/lifecycle/stats` | 统计信息 | - | `LifecycleStats` |
| GET | `/devices/lifecycle/execution-trend` | 执行趋势 | `{ type?, days }` | - |
| GET | `/devices/lifecycle/templates` | 规则模板 | - | - |
| POST | `/devices/lifecycle/templates/{id}/create` | 从模板创建 | `{ config? }` | `LifecycleRule` |

**使用位置**:
- `pages/DeviceLifecycle/Dashboard.tsx` - 生命周期仪表板
- `components/DeviceLifecycle/*` - 生命周期相关组件

---

## 11. 审计日志 (Audit Log)

**文件**: `services/auditLog.ts`, `services/log.ts`
**基础 URL**: `/audit-logs`, `/logs/audit`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/audit-logs/user/{id}` | 用户审计日志 | `{ action?, resourceType?, startDate?, endDate?, limit?, offset? }` | `{ success, data: AuditLog[] }` |
| GET | `/audit-logs/resource/{type}/{id}` | 资源审计日志 | `{ limit? }` | `{ success, data: AuditLog[] }` |
| GET | `/audit-logs/search` | 搜索审计日志 | `{ userId?, action?, level?, ... }` | `{ success, data: AuditLog[] }` |
| GET | `/audit-logs/statistics` | 审计统计 | `{ userId? }` | `{ success, data: AuditLogStatistics }` |
| GET | `/logs/audit` | 操作日志列表 | `LogParams` | `PaginatedResponse<AuditLog>` |
| GET | `/logs/audit/{id}` | 日志详情 | `id: string` | `AuditLog` |
| GET | `/logs/audit/export` | 导出日志 | `LogParams` | `Blob` |
| POST | `/logs/audit/clean` | 清理日志 | `{ days }` | - |

**Hooks**:
- `useAuditLogs()` - 审计日志
- `useAuditLogVirtual()` - 虚拟审计日志
- `useLogsAudit()` - 操作日志

**使用位置**:
- `pages/Audit/AuditLogList.tsx` - 审计日志列表
- `pages/Logs/Audit.tsx` - 操作日志

---

## 12. 通知管理 (Notification)

**文件**: `services/notification.ts`, `services/notificationTemplate.ts`
**基础 URL**: `/notifications`, `/templates`

### 通知 API

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/notifications/user/{id}` | 通知列表 | `PaginationParams` | `PaginatedResponse<Notification>` |
| GET | `/notifications/unread/count` | 未读数量 | - | `{ count }` |
| POST | `/notifications` | 创建通知 | `CreateNotificationDto` | `Notification` |
| POST | `/notifications/{id}/read` | 标记已读 | `id: string` | - |
| POST | `/notifications/read-all` | 全部已读 | `{ userId? }` | - |
| DELETE | `/notifications/{id}` | 删除通知 | `id: string` | - |
| POST | `/notifications/batch/delete` | 批量删除 | `{ ids }` | - |

### 通知模板 API

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/templates` | 模板列表 | `PaginationParams` | `PaginatedResponse<NotificationTemplate>` |
| GET | `/templates/{id}` | 模板详情 | `id: string` | `NotificationTemplate` |
| POST | `/templates` | 创建模板 | `CreateNotificationTemplateDto` | `NotificationTemplate` |
| PUT | `/templates/{id}` | 更新模板 | `UpdateNotificationTemplateDto` | `NotificationTemplate` |
| DELETE | `/templates/{id}` | 删除模板 | `id: string` | - |
| PATCH | `/templates/{id}/toggle` | 启用/禁用 | `{ isActive }` | - |
| GET | `/templates/{id}/versions` | 版本历史 | `templateId: string` | `NotificationTemplateVersion[]` |
| POST | `/templates/{id}/revert` | 回滚版本 | `{ versionId }` | - |
| POST | `/templates/test` | 测试模板 | `TemplateTestRequest` | - |
| GET | `/templates/variables` | 可用变量 | `{ type? }` | - |
| POST | `/templates/{id}/preview` | 预览模板 | `{ variables }` | - |

**Hooks**:
- `useNotificationTemplates()` - 通知模板列表
- `useNotificationTemplateEditor()` - 模板编辑器
- `useNotificationCenter()` - 通知中心

**使用位置**:
- `pages/NotificationTemplates/List.tsx` - 模板列表
- `pages/NotificationTemplates/Editor.tsx` - 模板编辑
- `pages/Notifications/index.tsx` - 通知页面

---

## 13. 调度器管理 (Scheduler)

**文件**: `services/scheduler.ts`
**基础 URL**: `/scheduler`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/scheduler/nodes` | 节点列表 | `PaginationParams` | `PaginatedResponse<SchedulerNode>` |
| GET | `/scheduler/nodes/{id}` | 节点详情 | `id: string` | `SchedulerNode` |
| POST | `/scheduler/nodes` | 创建节点 | `CreateNodeDto` | `SchedulerNode` |
| PUT | `/scheduler/nodes/{id}` | 更新节点 | `UpdateNodeDto` | `SchedulerNode` |
| DELETE | `/scheduler/nodes/{id}` | 删除节点 | `id: string` | - |
| POST | `/scheduler/nodes/{id}/maintenance` | 维护模式 | `{ enable }` | - |
| POST | `/scheduler/nodes/{id}/drain` | 排空节点 | `id: string` | - |
| GET | `/scheduler/strategies` | 策略列表 | - | `SchedulingStrategy[]` |
| GET | `/scheduler/strategies/active` | 激活策略 | - | `SchedulingStrategy` |
| POST | `/scheduler/strategies/{id}/activate` | 激活策略 | `id: string` | - |
| POST | `/scheduler/strategies` | 创建策略 | `Partial<SchedulingStrategy>` | `SchedulingStrategy` |
| PUT | `/scheduler/strategies/{id}` | 更新策略 | `Partial<SchedulingStrategy>` | `SchedulingStrategy` |
| DELETE | `/scheduler/strategies/{id}` | 删除策略 | `id: string` | - |
| GET | `/scheduler/tasks` | 任务列表 | `PaginationParams` | `PaginatedResponse<SchedulingTask>` |
| POST | `/scheduler/schedule` | 手动调度 | `{ deviceId, nodeId? }` | - |
| POST | `/scheduler/reschedule/{id}` | 重新调度 | `deviceId: string` | - |
| GET | `/scheduler/stats` | 集群统计 | - | `ClusterStats` |
| GET | `/scheduler/nodes/{id}/usage-trend` | 节点趋势 | `{ startDate?, endDate? }` | - |
| GET | `/scheduler/cluster/usage-trend` | 集群趋势 | `{ startDate?, endDate? }` | - |

**使用位置**:
- `pages/Scheduler/Dashboard.tsx` - 调度器仪表板

---

## 14. 事件溯源 (Event Sourcing)

**文件**: `services/events.ts`
**基础 URL**: `/events`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/events/user/{id}/history` | 事件历史 | `userId: string` | `{ success, data: EventHistory }` |
| GET | `/events/user/{id}/replay` | 重放事件 | `userId: string` | `{ success, data: any }` |
| GET | `/events/user/{id}/replay/version/{v}` | 重放到版本 | `{ userId, version }` | `{ success, data: any }` |
| GET | `/events/user/{id}/replay/timestamp` | 时间旅行 | `{ timestamp }` | `{ success, data: any }` |
| GET | `/events/stats` | 事件统计 | `{ eventType? }` | `{ success, data: EventStats }` |
| GET | `/events/recent` | 最近事件 | `{ eventType?, limit }` | `{ success, data: UserEvent[] }` |

**使用位置**:
- `pages/System/EventSourcingViewer.tsx` - 事件溯源查看器

---

## 15. 设备模板 (Device Template)

**文件**: `services/template.ts`
**基础 URL**: `/templates`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/templates` | 模板列表 | `PaginationParams` | `PaginatedResponse<DeviceTemplate>` |
| GET | `/templates/popular` | 热门模板 | - | `DeviceTemplate[]` |
| GET | `/templates/search` | 搜索模板 | `{ keyword, ...params }` | `PaginatedResponse<DeviceTemplate>` |
| GET | `/templates/{id}` | 模板详情 | `id: string` | `DeviceTemplate` |
| POST | `/templates` | 创建模板 | `CreateTemplateDto` | `DeviceTemplate` |
| POST | `/templates/from-device/{id}` | 从设备创建 | `CreateTemplateDto` | `DeviceTemplate` |
| PATCH | `/templates/{id}` | 更新模板 | `UpdateTemplateDto` | `DeviceTemplate` |
| DELETE | `/templates/{id}` | 删除模板 | `id: string` | - |
| POST | `/templates/{id}/create-device` | 创建设备 | `CreateDeviceFromTemplateDto` | `Device` |
| POST | `/templates/{id}/batch-create` | 批量创建 | `{ ...dto, count }` | `Device[]` |
| GET | `/templates/stats` | 模板统计 | - | `{ totalTemplates, ... }` |

**Hooks**:
- `useTemplateList()` - 模板列表

**使用位置**:
- `pages/Template/List.tsx` - 模板列表
- `components/Template/*` - 模板相关组件

---

## 16. API 密钥管理 (API Key Management)

**文件**: `services/apiKey.ts`
**基础 URL**: `/api-keys`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| POST | `/api-keys` | 创建密钥 | `CreateApiKeyDto` | `{ success, data: ApiKey }` |
| GET | `/api-keys/user/{id}` | 用户密钥列表 | `userId: string` | `{ success, data: ApiKey[] }` |
| GET | `/api-keys/{id}` | 密钥详情 | `id: string` | `{ success, data: ApiKey }` |
| PUT | `/api-keys/{id}` | 更新密钥 | `UpdateApiKeyDto` | `{ success, data: ApiKey }` |
| POST | `/api-keys/{id}/revoke` | 撤销密钥 | `id: string` | `{ success, data: ApiKey }` |
| DELETE | `/api-keys/{id}` | 删除密钥 | `id: string` | `{ success }` |
| GET | `/api-keys/statistics/{id}` | 密钥统计 | `userId: string` | `{ success, data: ApiKeyStatistics }` |
| GET | `/api-keys/test/auth` | 测试认证 | `{ 'X-API-Key': key }` | `{ message, timestamp }` |

**Hooks**:
- `useApiKeyManagement()` - API 密钥管理

**使用位置**:
- `pages/ApiKey/ApiKeyList.tsx` - API 密钥列表

---

## 17. 缓存管理 (Cache Management)

**文件**: `services/cache.ts`
**基础 URL**: `/cache`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/cache/stats` | 缓存统计 | - | `{ success, data: CacheStats }` |
| DELETE | `/cache/stats` | 重置统计 | - | - |
| DELETE | `/cache/flush` | 清空缓存 | - | - |
| DELETE | `/cache` | 删除单个缓存 | `{ key }` | - |
| DELETE | `/cache/pattern` | 按模式删除 | `{ pattern }` | `{ success, data: {...} }` |
| GET | `/cache/exists` | 检查缓存 | `{ key }` | `{ success, data: {...} }` |

**Hooks**:
- `useCacheManagement()` - 缓存管理

**使用位置**:
- `pages/System/CacheManagement.tsx` - 缓存管理页面

---

## 18. 队列管理 (Queue Management)

**文件**: `services/queue.ts`
**基础 URL**: `/queues`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/queues/status` | 队列状态 | - | `{ timestamp, queues, summary }` |
| GET | `/queues/{name}/jobs` | 任务列表 | `{ status, start, end }` | `{ queueName, status, jobs, pagination }` |
| GET | `/queues/{name}/jobs/{id}` | 任务详情 | `{ queueName, jobId }` | `QueueJobDetail` |
| POST | `/queues/{name}/jobs/{id}/retry` | 重试任务 | `{ queueName, jobId }` | `{ message }` |
| DELETE | `/queues/{name}/jobs/{id}` | 删除任务 | `{ queueName, jobId }` | `{ message }` |
| POST | `/queues/{name}/pause` | 暂停队列 | `queueName: string` | `{ message }` |
| POST | `/queues/{name}/resume` | 恢复队列 | `queueName: string` | `{ message }` |
| DELETE | `/queues/{name}/empty` | 清空队列 | `queueName: string` | `{ message }` |
| POST | `/queues/{name}/clean` | 清理队列 | `{ grace, type }` | `{ message }` |
| POST | `/queues/test/send-email` | 测试邮件 | `{ to, subject, html }` | `{ message, jobId }` |
| POST | `/queues/test/send-sms` | 测试短信 | `{ phone, message }` | `{ message, jobId }` |
| POST | `/queues/test/start-device` | 测试启动 | `{ deviceId, userId? }` | `{ message, jobId }` |

**Hooks**:
- `useQueueManagement()` - 队列管理

**使用位置**:
- `pages/System/QueueManagement.tsx` - 队列管理页面

---

## 19. 工单系统 (Ticket System)

**文件**: `services/ticket.ts`
**基础 URL**: `/tickets`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| POST | `/tickets` | 创建工单 | `CreateTicketDto` | `{ success, data: Ticket }` |
| GET | `/tickets/{id}` | 工单详情 | `id: string` | `{ success, data: Ticket }` |
| GET | `/tickets/user/{id}` | 用户工单列表 | `{ status?, category?, priority?, ... }` | `{ success, data: Ticket[] }` |
| GET | `/tickets` | 所有工单（管理员） | `{ status?, assignedTo?, priority?, ... }` | `{ success, data: Ticket[] }` |
| PUT | `/tickets/{id}` | 更新工单 | `UpdateTicketDto` | `{ success, data: Ticket }` |
| POST | `/tickets/{id}/replies` | 添加回复 | `CreateReplyDto` | `{ success, data: TicketReply }` |
| GET | `/tickets/{id}/replies` | 回复列表 | `{ includeInternal? }` | `{ success, data: TicketReply[] }` |
| POST | `/tickets/{id}/rate` | 评分工单 | `{ rating, feedback? }` | `{ success, data: Ticket }` |
| GET | `/tickets/statistics/overview` | 工单统计 | `{ userId? }` | `{ success, data: TicketStatistics }` |

**Hooks**:
- `useTicketList()` - 工单列表
- `useTicketDetail()` - 工单详情

**使用位置**:
- `pages/Ticket/TicketList.tsx` - 工单列表
- `pages/Ticket/TicketDetail.tsx` - 工单详情

---

## 20. 统计和报表 (Statistics & Reports)

**文件**: `services/stats.ts`
**基础 URL**: `/stats`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/stats/dashboard` | 仪表板统计 | - | `DashboardStats` |
| GET | `/stats/devices/online` | 在线设备数 | - | `{ count }` |
| GET | `/stats/users/today` | 今日新增用户 | - | `{ count }` |
| GET | `/stats/revenue/today` | 今日收入 | - | `{ revenue }` |
| GET | `/stats/revenue/month` | 本月收入 | - | `{ revenue }` |
| GET | `/stats/devices/distribution` | 设备状态分布 | - | `{ idle, running, stopped, error }` |
| GET | `/stats/users/activity` | 用户活跃度 | `{ days }` | `[{ date, activeUsers, newUsers }]` |
| GET | `/stats/revenue/trend` | 收入趋势 | `{ days }` | `[{ date, revenue, orders }]` |
| GET | `/stats/users/growth` | 用户增长 | `{ days }` | `[{ date, newUsers, totalUsers }]` |
| GET | `/stats/plans/distribution` | 套餐分布 | - | `[{ planName, userCount, revenue }]` |

**Hooks**:
- `useDashboard()` - 仪表板数据
- `useStatsDashboard()` - 统计仪表板
- `useReportAnalytics()` - 报表分析

**使用位置**:
- `pages/Dashboard/index.tsx` - 仪表板
- `pages/Stats/Dashboard.tsx` - 统计仪表板
- `pages/Analytics/Dashboard.tsx` - 分析仪表板

---

## 21. 提供商配置 (Provider Configuration)

**文件**: `services/provider.ts`
**基础 URL**: `/devices/providers`, `/admin/providers`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/devices/providers/specs` | 所有提供商规格 | - | `{ data: ProviderSpec[] }` |
| GET | `/devices/providers/{provider}/specs` | 提供商规格 | `provider: string` | `{ data: ProviderSpec[] }` |
| GET | `/devices/cloud/sync-status` | 云设备同步状态 | `{ provider?, page?, pageSize? }` | `{ data, total }` |
| POST | `/devices/cloud/sync` | 触发云同步 | `{ provider? }` | - |
| GET | `/devices/providers/health` | 提供商健康状态 | - | `{ data: [...] }` |
| GET | `/admin/providers/{provider}/config` | 提供商配置 | `provider: string` | - |
| PUT | `/admin/providers/{provider}/config` | 更新配置 | `config: any` | - |
| POST | `/admin/providers/{provider}/test` | 测试连接 | `provider: string` | - |
| GET | `/admin/billing/cloud-reconciliation` | 云账单对账 | `{ provider, startDate, endDate }` | - |

**使用位置**:
- `pages/Provider/Configuration.tsx` - 提供商配置

---

## 22. GPU 管理 (GPU Management)

**文件**: `services/gpu.ts`
**基础 URL**: `/resources/gpu`

### API 列表

| 方法 | 路径 | 功能 | 参数 | 返回值 |
|------|------|------|------|--------|
| GET | `/resources/gpu` | GPU 设备列表 | `PaginationParams` | `PaginatedResponse<GPUDevice>` |
| GET | `/resources/gpu/{id}` | GPU 详情 | `id: string` | `GPUDevice` |
| GET | `/resources/gpu/{id}/status` | GPU 实时状态 | `id: string` | - |
| POST | `/resources/gpu/{id}/allocate` | 分配 GPU | `{ deviceId, mode }` | `GPUAllocation` |
| DELETE | `/resources/gpu/{id}/deallocate` | 释放 GPU | `{ deviceId? }` | - |
| GET | `/resources/gpu/allocations` | 分配记录 | `PaginationParams` | `PaginatedResponse<GPUAllocation>` |
| GET | `/resources/gpu/stats` | GPU 统计 | - | `GPUStats` |
| GET | `/resources/gpu/{id}/usage-trend` | 使用趋势 | `{ startDate?, endDate? }` | `GPUUsageTrend[]` |
| GET | `/resources/gpu/cluster-trend` | 集群趋势 | `{ startDate?, endDate? }` | - |
| GET | `/resources/gpu/{id}/performance` | 性能分析 | `id: string` | - |
| GET | `/resources/gpu/driver/{id}` | 驱动信息 | `nodeId: string` | - |
| POST | `/resources/gpu/driver/{id}/update` | 更新驱动 | `{ driverVersion }` | - |

**使用位置**:
- `pages/GPU/Dashboard.tsx` - GPU 仪表板

---

## 23. 故障转移管理 (Failover Management)

**文件**: 无独立服务文件（可能集成到其他服务）
**基础 URL**: 待定

**使用位置**:
- `pages/Failover/Management.tsx` - 故障转移管理

---

## 24. 状态恢复管理 (State Recovery)

**文件**: 无独立服务文件
**基础 URL**: 待定

**使用位置**:
- `pages/StateRecovery/Management.tsx` - 状态恢复管理

---

## 25. 网络策略管理 (Network Policy)

**文件**: `services/` 中可能有（未找到）
**基础 URL**: 待定

**使用位置**:
- `pages/NetworkPolicy/Configuration.tsx` - 网络策略配置

---

## 26. 物理设备管理 (Physical Device)

**文件**: `services/device.ts` 中的部分 API
**基础 URL**: `/devices/physical`

**使用位置**:
- `pages/PhysicalDevice/List.tsx` - 物理设备列表

---

## 27. 设备分组管理 (Device Groups)

**文件**: 无独立服务文件
**基础 URL**: 待定

**使用位置**:
- `pages/DeviceGroups/Management.tsx` - 设备分组管理

---

## 28. SMS 管理

**文件**: 无独立服务文件
**基础 URL**: 待定

**使用位置**:
- `pages/SMS/Management.tsx` - SMS 管理

---

## 29. 使用情况统计 (Usage)

**文件**: `services/billing.ts` 中的部分 API
**基础 URL**: `/metering`

**使用位置**:
- `pages/Usage/List.tsx` - 使用列表
- `pages/Metering/Dashboard.tsx` - 计量仪表板

---

## 总体 API 统计

### 服务文件统计
- **认证服务**: 1 个文件
- **用户管理**: 1 个文件
- **设备管理**: 1 个文件
- **应用管理**: 1 个文件
- **计费管理**: 4 个文件 (billing, order, plan, payment-admin)
- **配额管理**: 1 个文件
- **权限管理**: 3 个文件 (role, fieldPermission, dataScope)
- **菜单管理**: 1 个文件
- **快照管理**: 1 个文件
- **生命周期管理**: 1 个文件
- **审计日志**: 2 个文件 (auditLog, log)
- **通知管理**: 2 个文件 (notification, notificationTemplate)
- **调度器**: 1 个文件
- **事件溯源**: 1 个文件
- **模板管理**: 1 个文件
- **API 密钥**: 1 个文件
- **缓存管理**: 1 个文件
- **队列管理**: 1 个文件
- **工单系统**: 1 个文件
- **统计报表**: 1 个文件
- **提供商**: 1 个文件
- **GPU 管理**: 1 个文件
- **其他**: 7 个文件

**总计**: 32 个服务文件

### API 端点统计
- **总计**: 300+ 个 API 端点
- **最多的服务**: 设备管理 (30+ 个端点)
- **计费相关**: 60+ 个端点

### Hooks 统计
- **总计**: 68 个 React hooks
- **主要 hooks**:
  - 数据查询 hooks (useQuery)
  - 数据修改 hooks (useMutation)
  - 自定义业务 hooks

### 页面组件统计
- **总计**: 40+ 个页面文件
- **主要页面**:
  - 用户管理
  - 设备管理
  - 应用管理
  - 计费和支付
  - 权限管理
  - 系统管理

---

## 技术栈

### HTTP 客户端
- **库**: axios（自定义 request 包装）
- **文件**: `src/utils/request.ts`
- **特性**: 
  - 统一错误处理
  - 自动添加认证 token
  - 请求拦截器
  - 响应拦截器

### 状态管理
- **库**: React Query (TanStack Query)
- **特性**:
  - 自动缓存管理
  - 背景同步
  - 乐观更新
  - 请求去重
  - 分层查询键

### 数据类型
- **文件**: `src/types/`
- **包含**:
  - 请求 DTOs
  - 响应类型
  - 分页参数
  - 业务模型

---

## 认证和授权

### 认证方式
- **JWT**: 使用 token 在 localStorage 中存储
- **登录流程**: 
  1. 获取验证码 (`getCaptcha`)
  2. 用户输入用户名、密码、验证码
  3. 提交登录 (`login`)
  4. 获取 token 和用户信息
  5. 存储 token 用于后续请求

### 授权机制
- **菜单权限**: 动态菜单和路由权限
- **字段权限**: 字段级别的读写限制
- **数据范围**: 用户数据可见范围限制
- **RBAC**: 基于角色的访问控制

---

## 分页方式

### 偏移分页
- **参数**: `page`, `pageSize` 或 `limit`, `offset`
- **返回**: `PaginatedResponse<T>`
- **用途**: 传统分页

### 游标分页
- **参数**: `cursor`, `pageSize`
- **返回**: `CursorPaginatedResponse<T>`
- **优势**: 高性能，适合大数据量

---

## 错误处理

### 错误响应格式
```json
{
  "success": false,
  "message": "错误信息",
  "data": null
}
```

### 常见错误码
- `401`: 未认证
- `403`: 禁止访问
- `404`: 资源不存在
- `422`: 验证失败
- `500`: 服务器错误

---

## 缓存策略

### React Query 缓存配置
- **默认 staleTime**: 30 秒到 60 秒
- **默认 cacheTime**: 5 分钟
- **刷新触发**: 窗口获得焦点、网络恢复

### Redis 缓存（后端）
- **菜单权限缓存**: 用户权限树缓存
- **缓存预热**: 支持主动预热
- **缓存失效**: 用户权限变更时自动失效

---

## 关键业务流程

### 用户创建流程
1. 调用 `createUser()` API
2. 后端验证数据
3. 自动失效 `userKeys.lists()` 和 `userKeys.stats()` 缓存
4. 前端显示成功消息

### 设备创建流程
1. 调用 `createDevice()` API
2. 检查用户配额 (QuotaCheck decorator)
3. 创建 Docker 容器
4. 自动失效设备相关缓存

### 支付流程
1. 创建订单 (`createOrder`)
2. 创建支付 (`createPayment`)
3. 用户完成支付
4. Webhook 通知后端
5. 自动失效相关缓存

---

## API 调用最佳实践

### 1. 使用 Hooks
```typescript
const { data, isLoading, error } = useUsers({ page: 1, pageSize: 10 });
```

### 2. 自动缓存管理
```typescript
const createUser = useCreateUser();
await createUser.mutateAsync(userData);
// 缓存自动失效，无需手动调用
```

### 3. 乐观更新
```typescript
// 设备启动时立即更新 UI，失败时回滚
const startDevice = useStartDevice();
```

### 4. 错误处理
```typescript
// 所有 mutations 都有 onError 处理
onError: (error: any) => {
  message.error(`操作失败: ${error.response?.data?.message}`);
}
```

---

## 性能优化

### 1. 代码分割
- 组件级代码分割：`useComponents()`
- LazyImage 组件实现图片懒加载

### 2. 虚拟滚动
- `useAuditLogVirtual()` 用于大列表

### 3. 无限滚动
- `useInfiniteUsers()`, `useInfiniteDevices()`, `useInfiniteApps()`

### 4. 请求去重
- React Query 自动去重
- 同时多个相同请求只发送一次

---

## 安全考虑

### 1. SQL 注入防护
- 后端有 `SqlInjectionGuard`
- 前端输入验证

### 2. XSS 防护
- HTML 清理（`SanitizationPipe`）
- React 自动转义

### 3. CSRF 防护
- 后端使用 CSRF token
- 自动添加到请求头

### 4. 敏感数据
- API 密钥仅在创建时返回明文
- 密码都经过加密存储

---

## 总结

本 Admin Frontend 实现了一个完整的企业级应用，包括：
- **30+ 个服务模块**
- **300+ 个 API 端点**
- **68 个 React hooks**
- **4 种权限管理机制**
- **完整的错误处理和缓存策略**
- **高性能的数据加载优化**
- **安全的认证和授权系统**

所有 API 都采用了最佳实践，包括：
- 类型安全（TypeScript）
- 自动缓存管理（React Query）
- 统一错误处理
- 分页支持（偏移和游标）
- 批量操作支持
- WebSocket 实时通知

