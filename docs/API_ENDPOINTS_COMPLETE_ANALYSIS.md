# 后端服务 API 端点完整分析

## 概述
本文档分析了云手机平台所有6个后端服务的HTTP端点，按服务分组展示。所有端点都需要JWT认证，除非另有说明。

---

## 1. User Service (用户服务) - 基础路径: `/users`

### 1.1 用户管理

#### POST /users - 创建用户
- **权限**: `user.create`
- **认证**: 需要
- **参数**: Body: CreateUserDto
- **响应**: 201 Created

#### GET /users - 获取用户列表
- **权限**: `user.read`
- **认证**: 需要
- **参数**: 
  - Query: page (可选), limit (可选), tenantId (可选)
- **响应**: 200 OK

#### GET /users/cursor - 游标分页获取用户列表
- **权限**: `user.read`
- **认证**: 需要
- **参数**: 
  - Query: cursor (可选), limit (可选), tenantId (可选), includeRoles (可选)
- **响应**: 200 OK (支持nextCursor)

#### GET /users/filter - 高级过滤用户列表
- **权限**: `user.read`
- **认证**: 需要
- **参数**: Query (多条件筛选)
- **响应**: 200 OK

#### GET /users/stats - 获取用户统计
- **权限**: `user.read`
- **认证**: 需要
- **参数**: Query: tenantId (可选)
- **响应**: 200 OK

#### GET /users/roles - 获取角色列表
- **权限**: `role.read`
- **认证**: 需要
- **参数**: Query: page, pageSize, limit, tenantId (均可选)
- **响应**: 200 OK

#### GET /users/me - 获取当前用户信息
- **权限**: 无
- **认证**: 需要
- **参数**: 无
- **响应**: 200 OK

#### GET /users/:id - 获取用户详情
- **权限**: `user.read`
- **认证**: 需要
- **参数**: Path: id
- **数据权限**: SELF (用户只能查看自己)
- **响应**: 200 OK

#### PATCH /users/:id - 更新用户
- **权限**: `user.update`
- **认证**: 需要
- **参数**: Path: id, Body: UpdateUserDto
- **数据权限**: SELF (用户只能更新自己)
- **响应**: 200 OK

#### POST /users/:id/change-password - 修改密码
- **权限**: `user.update`
- **认证**: 需要
- **参数**: Path: id, Body: ChangePasswordDto
- **数据权限**: SELF (用户只能修改自己的密码)
- **响应**: 200 OK

#### PATCH /users/:id/preferences - 更新偏好设置
- **权限**: `user.update`
- **认证**: 需要
- **参数**: Path: id, Body: UpdatePreferencesDto
- **数据权限**: SELF
- **响应**: 200 OK

#### DELETE /users/:id - 删除用户
- **权限**: `user.delete`
- **认证**: 需要
- **参数**: Path: id
- **数据权限**: ALL (仅管理员)
- **响应**: 200 OK

---

### 1.2 认证相关

#### GET /auth/captcha - 获取验证码
- **权限**: 无
- **认证**: 否 (@Public)
- **限流**: 10次/60秒
- **参数**: 无
- **响应**: 200 OK

#### POST /auth/register - 用户注册
- **权限**: 无
- **认证**: 否 (@Public)
- **限流**: 3次/60秒
- **参数**: Body: RegisterDto
- **说明**: 使用Saga模式处理注册
- **响应**: 201 Created (返回sagaId)

#### GET /auth/register/saga/:sagaId - 查询注册Saga状态
- **权限**: 无
- **认证**: 否
- **参数**: Path: sagaId
- **响应**: 200 OK

#### POST /auth/login - 用户登录
- **权限**: 无
- **认证**: 否 (@Public)
- **限流**: 5次/60秒
- **参数**: Body: LoginDto (用户名、密码、验证码)
- **安全防护**: 时序攻击防护(200-400ms随机延迟)、账户锁定、失败次数限制
- **响应**: 200 OK (返回Token)

#### POST /auth/logout - 登出
- **权限**: 无
- **认证**: 需要
- **参数**: Headers: authorization (Bearer Token)
- **响应**: 200 OK (Token加入黑名单)

#### GET /auth/me - 获取当前用户信息
- **权限**: 无
- **认证**: 需要
- **参数**: 无
- **响应**: 200 OK

#### POST /auth/refresh - 刷新Token
- **权限**: 无
- **认证**: 需要
- **限流**: 10次/60秒
- **参数**: 无
- **响应**: 200 OK (返回新Token)

#### GET /auth/2fa/generate - 生成2FA密钥
- **权限**: 无
- **认证**: 需要
- **参数**: 无
- **响应**: 200 OK (返回密钥和二维码)

#### POST /auth/2fa/enable - 启用2FA
- **权限**: 无
- **认证**: 需要
- **参数**: Body: Enable2FADto (token验证码)
- **响应**: 200 OK

#### POST /auth/2fa/disable - 禁用2FA
- **权限**: 无
- **认证**: 需要
- **参数**: Body: Disable2FADto (token验证码)
- **响应**: 200 OK

---

### 1.3 角色管理

#### POST /roles - 创建角色
- **权限**: `role.create`
- **认证**: 需要
- **参数**: Body: CreateRoleDto
- **响应**: 201 Created

#### GET /roles - 获取角色列表
- **权限**: `role.read`
- **认证**: 需要
- **参数**: Query: page, limit, tenantId (均可选)
- **响应**: 200 OK

#### GET /roles/:id - 获取角色详情
- **权限**: `role.read`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### PATCH /roles/:id - 更新角色
- **权限**: `role.update`
- **认证**: 需要
- **参数**: Path: id, Body: UpdateRoleDto
- **响应**: 200 OK

#### DELETE /roles/:id - 删除角色
- **权限**: `role.delete`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### POST /roles/:id/permissions - 为角色添加权限
- **权限**: `role.update`
- **认证**: 需要
- **参数**: Path: id, Body: permissionIds[]
- **响应**: 200 OK

#### DELETE /roles/:id/permissions - 移除角色权限
- **权限**: `role.update`
- **认证**: 需要
- **参数**: Path: id, Body: permissionIds[]
- **响应**: 200 OK

---

### 1.4 权限管理

#### POST /permissions - 创建权限
- **权限**: `permission.create`
- **认证**: 需要
- **参数**: Body: CreatePermissionDto
- **响应**: 201 Created

#### POST /permissions/bulk - 批量创建权限
- **权限**: `permission.create`
- **认证**: 需要
- **参数**: Body: CreatePermissionDto[]
- **响应**: 201 Created

#### GET /permissions - 获取权限列表
- **权限**: `permission.read`
- **认证**: 需要
- **参数**: Query: page, limit, resource (均可选)
- **响应**: 200 OK

#### GET /permissions/resource/:resource - 按资源获取权限
- **权限**: `permission.read`
- **认证**: 需要
- **参数**: Path: resource
- **响应**: 200 OK

#### GET /permissions/:id - 获取权限详情
- **权限**: `permission.read`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### PATCH /permissions/:id - 更新权限
- **权限**: `permission.update`
- **认证**: 需要
- **参数**: Path: id, Body: UpdatePermissionDto
- **响应**: 200 OK

#### DELETE /permissions/:id - 删除权限
- **权限**: `permission.delete`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

---

### 1.5 配额管理

#### POST /quotas - 创建配额
- **权限**: `admin角色`
- **认证**: 需要
- **参数**: Body: CreateQuotaDto
- **响应**: 201 Created

#### GET /quotas/user/:userId - 获取用户配额
- **权限**: 无
- **认证**: 需要
- **参数**: Path: userId
- **响应**: 200 OK

#### POST /quotas/check - 检查配额是否充足
- **权限**: 无
- **认证**: 需要
- **参数**: Body: CheckQuotaRequest
- **响应**: 200 OK

#### POST /quotas/deduct - 扣减配额
- **权限**: 无
- **认证**: 需要
- **参数**: Body: DeductQuotaRequest
- **响应**: 200 OK

#### POST /quotas/restore - 恢复配额
- **权限**: 无
- **认证**: 需要
- **参数**: Body: RestoreQuotaRequest
- **响应**: 200 OK

#### PUT /quotas/:id - 更新配额
- **权限**: `admin角色`
- **认证**: 需要
- **参数**: Path: id, Body: UpdateQuotaDto
- **响应**: 200 OK

#### POST /quotas/user/:userId/usage - 上报设备用量
- **权限**: 无
- **认证**: 需要
- **参数**: Path: userId, Body: 设备使用情况
- **说明**: 由device-service调用
- **响应**: 200 OK

#### GET /quotas/usage-stats/:userId - 获取用户使用统计
- **权限**: 无
- **认证**: 需要
- **参数**: Path: userId
- **响应**: 200 OK

#### POST /quotas/check/batch - 批量检查配额
- **权限**: 无
- **认证**: 需要
- **参数**: Body: CheckQuotaRequest[]
- **响应**: 200 OK

#### GET /quotas/alerts - 获取配额告警列表
- **权限**: `admin角色`
- **认证**: 需要
- **参数**: Query: threshold (可选, 默认80)
- **响应**: 200 OK

---

### 1.6 工单管理

#### POST /tickets - 创建工单
- **权限**: 无
- **认证**: 需要
- **参数**: Body: CreateTicketDto
- **响应**: 201 Created

#### GET /tickets/:id - 获取工单详情
- **权限**: 无
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### GET /tickets/user/:userId - 获取用户工单列表
- **权限**: 无
- **认证**: 需要
- **参数**: Path: userId, Query: status, category, priority, limit, offset (均可选)
- **响应**: 200 OK

#### GET /tickets - 获取所有工单 (管理员)
- **权限**: `admin`, `support角色`
- **认证**: 需要
- **参数**: Query: status, assignedTo, priority, category, limit, offset (均可选)
- **响应**: 200 OK

#### PUT /tickets/:id - 更新工单
- **权限**: `admin`, `support角色`
- **认证**: 需要
- **参数**: Path: id, Body: UpdateTicketDto
- **响应**: 200 OK

#### POST /tickets/:id/replies - 添加工单回复
- **权限**: 无
- **认证**: 需要
- **参数**: Path: id, Body: CreateReplyDto
- **响应**: 201 Created

#### GET /tickets/:id/replies - 获取工单回复列表
- **权限**: 无
- **认证**: 需要
- **参数**: Path: id, Query: includeInternal (可选)
- **响应**: 200 OK

#### POST /tickets/:id/rate - 工单评分
- **权限**: 无
- **认证**: 需要
- **参数**: Path: id, Body: { rating, feedback }
- **响应**: 200 OK

#### GET /tickets/statistics/overview - 获取工单统计
- **权限**: 无
- **认证**: 需要
- **参数**: Query: userId (可选)
- **响应**: 200 OK

---

### 1.7 审计日志

#### GET /audit-logs/user/:userId - 获取用户审计日志
- **权限**: 无
- **认证**: 需要
- **参数**: Path: userId, Query: action, resourceType, startDate, endDate, limit, offset (均可选)
- **响应**: 200 OK

#### GET /audit-logs/resource/:resourceType/:resourceId - 获取资源审计日志
- **权限**: 无
- **认证**: 需要
- **参数**: Path: resourceType, resourceId, Query: limit (可选)
- **响应**: 200 OK

#### GET /audit-logs/search - 搜索审计日志 (管理员)
- **权限**: `admin角色`
- **认证**: 需要
- **参数**: Query: userId, action, level, resourceType, resourceId, ipAddress, startDate, endDate, success, limit, offset (均可选)
- **响应**: 200 OK

#### GET /audit-logs/statistics - 获取审计日志统计 (管理员)
- **权限**: `admin角色`
- **认证**: 需要
- **参数**: Query: userId (可选)
- **响应**: 200 OK

---

### 1.8 API密钥管理

#### POST /api-keys - 创建API密钥
- **权限**: 无
- **认证**: 需要
- **参数**: Body: CreateApiKeyDto
- **说明**: 密钥仅返回一次
- **响应**: 201 Created

#### GET /api-keys/user/:userId - 获取用户的API密钥列表
- **权限**: 无
- **认证**: 需要
- **参数**: Path: userId
- **响应**: 200 OK

#### GET /api-keys/:id - 获取API密钥详情
- **权限**: 无
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### PUT /api-keys/:id - 更新API密钥
- **权限**: 无
- **认证**: 需要
- **参数**: Path: id, Body: { name, scopes, description, expiresAt }
- **响应**: 200 OK

#### POST /api-keys/:id/revoke - 撤销API密钥
- **权限**: 无
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### DELETE /api-keys/:id - 删除API密钥 (管理员)
- **权限**: `admin角色`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### GET /api-keys/statistics/:userId - 获取API密钥统计
- **权限**: 无
- **认证**: 需要
- **参数**: Path: userId
- **响应**: 200 OK

#### GET /api-keys/test/auth - 测试API密钥认证
- **权限**: 无 (使用API Key认证)
- **认证**: 否 (使用API Key)
- **参数**: Headers: API Key
- **响应**: 200 OK

---

### 1.9 缓存管理

#### GET /cache/stats - 获取缓存统计信息
- **权限**: 无
- **认证**: 否
- **参数**: 无
- **响应**: 200 OK

#### DELETE /cache/stats - 重置缓存统计
- **权限**: 无
- **认证**: 否
- **参数**: 无
- **响应**: 204 No Content

#### DELETE /cache/flush - 清空所有缓存
- **权限**: 无
- **认证**: 否
- **参数**: 无
- **响应**: 204 No Content

#### DELETE /cache - 删除指定键的缓存
- **权限**: 无
- **认证**: 否
- **参数**: Query: key (必需)
- **响应**: 204 No Content

#### DELETE /cache/pattern - 批量删除缓存 (支持通配符)
- **权限**: 无
- **认证**: 否
- **参数**: Query: pattern (必需)
- **响应**: 200 OK

#### GET /cache/exists - 检查键是否存在
- **权限**: 无
- **认证**: 否
- **参数**: Query: key (必需)
- **响应**: 200 OK

---

### 1.10 队列管理

#### (队列管理控制器存在，详细端点需单独查看)

---

### 1.11 事件溯源

#### GET /events - 获取事件列表
- **权限**: 无
- **认证**: 需要
- **参数**: Query: userId, eventType, page, limit
- **响应**: 200 OK

#### (事件溯源相关端点需单独查看)

---

### 1.12 设置管理

#### (设置管理控制器存在，详细端点需单独查看)

---

### 1.13 用户菜单权限

#### (菜单权限相关端点需单独查看)

---

### 1.14 数据作用域

#### (数据作用域相关端点需单独查看)

---

### 1.15 字段权限

#### (字段权限相关端点需单独查看)

---

### 1.16 指标

#### GET /metrics - 获取Prometheus指标
- **权限**: 无
- **认证**: 否 (@Public)
- **参数**: 无
- **响应**: 200 OK (Prometheus格式)

---

### 1.17 健康检查

#### GET /health - 健康检查
- **权限**: 无
- **认证**: 否
- **参数**: 无
- **响应**: 200 OK

---

## 2. Device Service (设备服务) - 基础路径: `/devices`

### 2.1 设备CRUD操作

#### POST /devices - 创建设备
- **权限**: `device.create`
- **认证**: 需要
- **配额检查**: 是 (需要检查配额)
- **参数**: Body: CreateDeviceDto
- **说明**: 使用Saga模式保证原子性
- **响应**: 201 Created (返回sagaId)

#### GET /devices - 获取设备列表
- **权限**: `device.read`
- **认证**: 需要
- **参数**: Query: page, limit, userId, tenantId, status (均可选)
- **响应**: 200 OK

#### GET /devices/cursor - 游标分页获取设备列表
- **权限**: `device.read`
- **认证**: 需要
- **参数**: Query: cursor, limit, userId, tenantId, status (均可选)
- **响应**: 200 OK (支持nextCursor)

#### GET /devices/stats - 获取设备统计信息
- **权限**: `device.read`
- **认证**: 需要
- **参数**: 无
- **响应**: 200 OK

#### GET /devices/available - 获取可用设备列表
- **权限**: `device.read`
- **认证**: 需要
- **参数**: 无
- **响应**: 200 OK (状态为IDLE的设备)

#### GET /devices/:id - 获取设备详情
- **权限**: `device.read`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### GET /devices/:id/stats - 获取设备统计
- **权限**: `device.read`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### PATCH /devices/:id - 更新设备
- **权限**: `device.update`
- **认证**: 需要
- **参数**: Path: id, Body: UpdateDeviceDto
- **响应**: 200 OK

#### DELETE /devices/:id - 删除设备
- **权限**: `device.delete`
- **认证**: 需要
- **参数**: Path: id
- **说明**: 使用Saga模式删除
- **响应**: 200 OK (返回sagaId)

#### GET /devices/deletion/saga/:sagaId - 查询设备删除Saga状态
- **权限**: `device.read`
- **认证**: 需要
- **参数**: Path: sagaId
- **响应**: 200 OK

---

### 2.2 设备生命周期控制

#### POST /devices/:id/start - 启动设备
- **权限**: `device.update`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### POST /devices/:id/stop - 停止设备
- **权限**: `device.update`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### POST /devices/:id/restart - 重启设备
- **权限**: `device.update`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### POST /devices/:id/reboot - 重启设备 (别名)
- **权限**: `device.update`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### POST /devices/:id/heartbeat - 更新心跳
- **权限**: `device.update`
- **认证**: 需要
- **参数**: Path: id, Body: DeviceMetrics
- **响应**: 200 OK

---

### 2.3 ADB命令执行

#### POST /devices/:id/shell - 执行Shell命令
- **权限**: `device.control`
- **认证**: 需要
- **参数**: Path: id, Body: ShellCommandDto
- **响应**: 200 OK

#### POST /devices/:id/screenshot - 设备截图
- **权限**: `device.control`
- **认证**: 需要
- **参数**: Path: id
- **说明**: POST方式触发，返回图像路径
- **响应**: 200 OK

#### GET /devices/:id/screenshot - 获取设备截图
- **权限**: `device.read`
- **认证**: 需要
- **参数**: Path: id
- **说明**: 返回PNG格式截图
- **响应**: 200 OK (image/png)

#### POST /devices/:id/push - 推送文件
- **权限**: `device.control`
- **认证**: 需要
- **参数**: Path: id, Body: multipart (file + targetPath)
- **响应**: 200 OK

#### POST /devices/:id/pull - 拉取文件
- **权限**: `device.control`
- **认证**: 需要
- **参数**: Path: id, Body: PullFileDto (sourcePath)
- **响应**: 200 OK (文件下载)

#### POST /devices/:id/install - 安装应用
- **权限**: `device.control`
- **认证**: 需要
- **参数**: Path: id, Body: InstallApkDto
- **响应**: 200 OK

#### POST /devices/:id/uninstall - 卸载应用
- **权限**: `device.control`
- **认证**: 需要
- **参数**: Path: id, Body: UninstallApkDto
- **响应**: 200 OK

#### GET /devices/:id/packages - 获取已安装应用
- **权限**: `device.read`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### GET /devices/:id/logcat - 读取日志
- **权限**: `device.read`
- **认证**: 需要
- **参数**: Path: id, Query: filter, lines (均可选)
- **响应**: 200 OK

#### POST /devices/:id/logcat/clear - 清空日志
- **权限**: `device.control`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### GET /devices/:id/properties - 获取设备属性
- **权限**: `device.read`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### GET /devices/:id/stream-info - 获取设备流信息
- **权限**: `device.read`
- **认证**: 需要
- **参数**: Path: id
- **说明**: 供Media Service使用
- **响应**: 200 OK

---

### 2.4 应用操作 (阿里云ECP专属)

#### POST /devices/:id/apps/start - 启动应用
- **权限**: `device:app-operate`
- **认证**: 需要
- **参数**: Path: id, Body: StartAppDto
- **说明**: 仅阿里云ECP支持
- **响应**: 200 OK

#### POST /devices/:id/apps/stop - 停止应用
- **权限**: `device:app-operate`
- **认证**: 需要
- **参数**: Path: id, Body: StopAppDto
- **响应**: 200 OK

#### POST /devices/:id/apps/clear-data - 清除应用数据
- **权限**: `device:app-operate`
- **认证**: 需要
- **参数**: Path: id, Body: ClearAppDataDto
- **响应**: 200 OK

---

### 2.5 快照管理 (阿里云ECP专属)

#### POST /devices/:id/snapshots - 创建设备快照
- **权限**: `device:snapshot-create`
- **认证**: 需要
- **参数**: Path: id, Body: CreateSnapshotDto
- **响应**: 200 OK (返回snapshotId)

#### POST /devices/:id/snapshots/restore - 恢复设备快照
- **权限**: `device:snapshot-restore`
- **认证**: 需要
- **参数**: Path: id, Body: RestoreSnapshotDto
- **响应**: 200 OK

#### GET /devices/:id/snapshots - 获取设备快照列表
- **权限**: `device:read`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### DELETE /devices/:id/snapshots/:snapshotId - 删除设备快照
- **权限**: `device:snapshot-delete`
- **认证**: 需要
- **参数**: Path: id, snapshotId
- **响应**: 200 OK

---

### 2.6 SMS虚拟号码管理

#### POST /devices/:id/request-sms - 为设备请求虚拟SMS号码
- **权限**: `device:sms:request`
- **认证**: 需要
- **参数**: Path: id, Body: RequestSmsDto
- **说明**: 号码由SMS Receive Service管理
- **响应**: 200 OK

#### GET /devices/:id/sms-number - 获取设备的虚拟SMS号码信息
- **权限**: `device:read`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK 或 null

#### DELETE /devices/:id/sms-number - 取消设备的虚拟SMS号码
- **权限**: `device:sms:cancel`
- **认证**: 需要
- **参数**: Path: id, Body: CancelSmsDto (可选)
- **响应**: 200 OK

#### GET /devices/:id/sms-messages - 获取设备收到的SMS消息历史
- **权限**: `device:read`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK (SmsMessageDto[])

---

### 2.7 批量操作

#### POST /devices/batch/start - 批量启动设备
- **权限**: `device.update`
- **认证**: 需要
- **参数**: Body: { ids }
- **响应**: 200 OK

#### POST /devices/batch/stop - 批量停止设备
- **权限**: `device.update`
- **认证**: 需要
- **参数**: Body: { ids }
- **响应**: 200 OK

#### POST /devices/batch/reboot - 批量重启设备
- **权限**: `device.update`
- **认证**: 需要
- **参数**: Body: { ids }
- **响应**: 200 OK

#### POST /devices/batch/delete - 批量删除设备
- **权限**: `device.delete`
- **认证**: 需要
- **参数**: Body: { ids }
- **说明**: 使用Saga模式
- **响应**: 200 OK (返回sagaIds)

#### POST /devices/batch/stats - 批量获取设备统计信息
- **权限**: `device:read`
- **认证**: 需要
- **参数**: Body: { deviceIds } (最多200个)
- **响应**: 200 OK

---

### 2.8 独立批量操作控制器

#### POST /devices/batch/create - 批量创建设备
- **权限**: 无
- **认证**: 需要
- **参数**: Body: BatchCreateDeviceDto
- **说明**: 创建多个相同配置的设备
- **响应**: 201 Created

#### POST /devices/batch/operate - 批量操作设备
- **权限**: 无
- **认证**: 需要
- **参数**: Body: BatchOperationDto
- **响应**: 200 OK

#### POST /devices/batch/start - 批量启动设备
- **权限**: 无
- **认证**: 需要
- **参数**: Body: { deviceIds, groupName, userId, maxConcurrency }
- **响应**: 200 OK

#### POST /devices/batch/stop - 批量停止设备
- **权限**: 无
- **认证**: 需要
- **参数**: Body: { deviceIds, groupName, userId, maxConcurrency }
- **响应**: 200 OK

#### POST /devices/batch/restart - 批量重启设备
- **权限**: 无
- **认证**: 需要
- **参数**: Body: { deviceIds, groupName, userId, maxConcurrency }
- **响应**: 200 OK

#### POST /devices/batch/delete - 批量删除设备
- **权限**: 无
- **认证**: 需要
- **参数**: Body: { deviceIds, groupName, userId, maxConcurrency }
- **响应**: 200 OK

#### POST /devices/batch/execute - 批量执行命令
- **权限**: 无
- **认证**: 需要
- **参数**: Body: { deviceIds, groupName, command, maxConcurrency }
- **响应**: 200 OK

#### POST /devices/batch/install - 批量安装应用
- **权限**: 无
- **认证**: 需要
- **参数**: Body: { deviceIds, groupName, apkPath, maxConcurrency }
- **响应**: 200 OK

#### POST /devices/batch/uninstall - 批量卸载应用
- **权限**: 无
- **认证**: 需要
- **参数**: Body: { deviceIds, groupName, packageName, maxConcurrency }
- **响应**: 200 OK

#### GET /devices/batch/groups/statistics - 获取分组统计
- **权限**: 无
- **认证**: 需要
- **参数**: 无
- **响应**: 200 OK

#### GET /devices/batch/groups/:groupName/devices - 获取分组设备列表
- **权限**: 无
- **认证**: 需要
- **参数**: Query: groupName
- **响应**: 200 OK

#### PATCH /devices/batch/groups/update - 更新设备分组
- **权限**: 无
- **认证**: 需要
- **参数**: Body: { deviceIds, groupName }
- **响应**: 200 OK

#### POST /devices/batch/status - 批量获取设备状态
- **权限**: 无
- **认证**: 需要
- **参数**: Body: { deviceIds }
- **响应**: 200 OK

#### POST /devices/batch/execute-collect - 批量执行命令并收集结果
- **权限**: 无
- **认证**: 需要
- **参数**: Body: { deviceIds, command, maxConcurrency }
- **响应**: 200 OK

---

### 2.9 快照独立控制器

#### POST /snapshots/device/:deviceId - 为设备创建快照
- **权限**: 无
- **认证**: 需要
- **参数**: Path: deviceId, Body: CreateSnapshotDto
- **响应**: 200 OK

#### POST /snapshots/:id/restore - 从快照恢复设备
- **权限**: 无
- **认证**: 需要
- **参数**: Path: id, Body: RestoreSnapshotDto
- **响应**: 200 OK

#### POST /snapshots/:id/compress - 压缩快照
- **权限**: 无
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### DELETE /snapshots/:id - 删除快照
- **权限**: 无
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### GET /snapshots/:id - 获取单个快照详情
- **权限**: 无
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### GET /snapshots/device/:deviceId - 获取设备的所有快照
- **权限**: 无
- **认证**: 需要
- **参数**: Path: deviceId
- **响应**: 200 OK

#### GET /snapshots - 获取当前用户的所有快照
- **权限**: 无
- **认证**: 需要
- **参数**: 无
- **响应**: 200 OK

#### GET /snapshots/stats/summary - 获取快照统计信息
- **权限**: 无
- **认证**: 需要
- **参数**: 无
- **响应**: 200 OK

---

### 2.10 其他控制器

#### (GPU管理、生命周期管理、故障转移、状态恢复、物理设备、调度等控制器存在，详细端点需单独查看)

---

## 3. App Service (应用服务) - 基础路径: `/apps`

### 3.1 应用管理

#### POST /apps/upload - 上传APK
- **权限**: `app.create`
- **认证**: 需要
- **限流**: 20次/5分钟
- **参数**: Body: multipart (APK文件 + CreateAppDto)
- **说明**: 最大200MB
- **响应**: 201 Created

#### GET /apps - 获取应用列表
- **权限**: `app.read`
- **认证**: 需要
- **参数**: Query: page, limit, tenantId, category (均可选)
- **响应**: 200 OK

#### GET /apps/cursor - 游标分页获取应用列表
- **权限**: `app.read`
- **认证**: 需要
- **参数**: Query: cursor, limit, tenantId, category (均可选)
- **响应**: 200 OK

#### GET /apps/:id - 获取应用详情
- **权限**: `app.read`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### GET /apps/:id/devices - 获取应用安装设备
- **权限**: `app.read`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### GET /apps/package/:packageName/versions - 获取应用所有版本
- **权限**: `app.read`
- **认证**: 需要
- **参数**: Path: packageName
- **响应**: 200 OK

#### GET /apps/package/:packageName/latest - 获取应用最新版本
- **权限**: `app.read`
- **认证**: 需要
- **参数**: Path: packageName
- **响应**: 200 OK

#### PATCH /apps/:id - 更新应用
- **权限**: `app.update`
- **认证**: 需要
- **参数**: Path: id, Body: UpdateAppDto
- **响应**: 200 OK

#### DELETE /apps/:id - 删除应用
- **权限**: `app.delete`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

---

### 3.2 应用安装/卸载

#### POST /apps/install - 安装应用 (Saga模式)
- **权限**: `app.create`
- **认证**: 需要
- **参数**: Body: InstallAppDto
- **说明**: 使用Saga模式确保原子性
- **响应**: 201 Created (返回sagaIds)

#### GET /apps/install/saga/:sagaId - 查询安装Saga状态
- **权限**: `app.read`
- **认证**: 需要
- **参数**: Path: sagaId
- **响应**: 200 OK

#### POST /apps/uninstall - 卸载应用
- **权限**: `app.delete`
- **认证**: 需要
- **参数**: Body: UninstallAppDto
- **响应**: 200 OK

#### GET /apps/devices/:deviceId/apps - 获取设备应用
- **权限**: `app.read`
- **认证**: 需要
- **参数**: Path: deviceId
- **响应**: 200 OK

---

### 3.3 应用审核

#### POST /apps/:id/submit-review - 提交应用审核
- **权限**: `app.create`
- **认证**: 需要
- **参数**: Path: id, Body: SubmitReviewDto
- **响应**: 200 OK

#### POST /apps/:id/approve - 批准应用
- **权限**: `app.approve`
- **认证**: 需要
- **参数**: Path: id, Body: ApproveAppDto
- **响应**: 200 OK

#### POST /apps/:id/reject - 拒绝应用
- **权限**: `app.approve`
- **认证**: 需要
- **参数**: Path: id, Body: RejectAppDto
- **响应**: 200 OK

#### POST /apps/:id/request-changes - 要求修改
- **权限**: `app.approve`
- **认证**: 需要
- **参数**: Path: id, Body: RequestChangesDto
- **响应**: 200 OK

#### GET /apps/:id/audit-records - 获取审核记录
- **权限**: `app.read`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### GET /apps/pending-review/list - 获取待审核应用
- **权限**: `app.approve`
- **认证**: 需要
- **参数**: Query: page, limit (均可选)
- **响应**: 200 OK

#### GET /apps/audit-records/all - 获取所有审核记录
- **权限**: `app.approve`
- **认证**: 需要
- **参数**: Query: page, limit, applicationId, reviewerId, action (均可选)
- **响应**: 200 OK

---

### 3.4 健康检查

#### GET /health - 健康检查
- **权限**: 无
- **认证**: 否
- **参数**: 无
- **响应**: 200 OK

---

## 4. Billing Service (计费服务) - 基础路径: `/billing`等

### 4.1 计费管理

#### GET /billing/stats - 获取计费统计
- **权限**: `billing:read`
- **认证**: 需要
- **参数**: Query: tenantId (可选)
- **响应**: 200 OK

#### GET /billing/plans - 获取套餐列表
- **权限**: `billing:read`
- **认证**: 需要
- **参数**: Query: page, pageSize (均可选)
- **响应**: 200 OK

#### GET /billing/plans/:id - 获取套餐详情
- **权限**: `billing:read`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### POST /billing/plans - 创建套餐
- **权限**: `billing:create`
- **认证**: 需要
- **参数**: Body: 套餐数据
- **响应**: 201 Created

#### PATCH /billing/plans/:id - 更新套餐
- **权限**: `billing:update`
- **认证**: 需要
- **参数**: Path: id, Body: 套餐数据
- **响应**: 200 OK

#### DELETE /billing/plans/:id - 删除套餐
- **权限**: `billing:delete`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

---

### 4.2 订单管理

#### POST /billing/orders - 创建订单
- **权限**: `billing:create`
- **认证**: 需要
- **参数**: Body: { userId, planId, tenantId }
- **响应**: 201 Created

#### GET /billing/orders/:userId - 获取用户订单
- **权限**: `billing:read`
- **认证**: 需要
- **参数**: Path: userId
- **响应**: 200 OK

#### POST /billing/orders/:orderId/cancel - 取消订单
- **权限**: `billing:update`
- **认证**: 需要
- **参数**: Path: orderId, Body: { reason } (可选)
- **响应**: 200 OK

---

### 4.3 使用记录

#### GET /billing/usage/:userId - 获取用户使用记录
- **权限**: `billing:read`
- **认证**: 需要
- **参数**: Path: userId, Query: startDate, endDate (均可选)
- **响应**: 200 OK

#### POST /billing/usage/start - 开始使用记录
- **权限**: `billing:create`
- **认证**: 需要
- **参数**: Body: { userId, deviceId, tenantId }
- **响应**: 201 Created

#### POST /billing/usage/stop - 停止使用记录
- **权限**: `billing:update`
- **认证**: 需要
- **参数**: Body: { recordId }
- **响应**: 200 OK

---

### 4.4 余额管理

#### POST /balance - 创建用户余额账户
- **权限**: `admin角色`
- **认证**: 需要
- **参数**: Body: CreateBalanceDto
- **响应**: 201 Created

#### GET /balance/user/:userId - 获取用户余额
- **权限**: 无
- **认证**: 需要
- **参数**: Path: userId
- **响应**: 200 OK

#### POST /balance/recharge - 余额充值
- **权限**: 无
- **认证**: 需要
- **参数**: Body: RechargeBalanceDto
- **响应**: 200 OK

#### POST /balance/consume - 余额消费
- **权限**: 无
- **认证**: 需要
- **参数**: Body: ConsumeBalanceDto
- **响应**: 200 OK

#### POST /balance/freeze - 冻结余额
- **权限**: `admin角色`
- **认证**: 需要
- **参数**: Body: FreezeBalanceDto
- **响应**: 200 OK

#### POST /balance/unfreeze - 解冻余额
- **权限**: `admin角色`
- **认证**: 需要
- **参数**: Body: { userId, amount, reason }
- **响应**: 200 OK

#### POST /balance/adjust - 余额调整
- **权限**: `admin角色`
- **认证**: 需要
- **参数**: Body: AdjustBalanceDto
- **响应**: 200 OK

#### GET /balance/transactions/:userId - 获取交易记录
- **权限**: 无
- **认证**: 需要
- **参数**: Path: userId, Query: type, status, limit, offset (均可选)
- **响应**: 200 OK

#### GET /balance/statistics/:userId - 获取余额统计
- **权限**: 无
- **认证**: 需要
- **参数**: Path: userId
- **响应**: 200 OK

---

### 4.5 支付管理

#### POST /payments - 创建支付订单
- **权限**: 无
- **认证**: 需要
- **限流**: 10次/5分钟
- **参数**: Body: CreatePaymentDto
- **响应**: 201 Created

#### GET /payments - 获取支付列表
- **权限**: 无
- **认证**: 需要
- **参数**: Headers: user-id (可选)
- **响应**: 200 OK

#### GET /payments/:id - 获取支付详情
- **权限**: 无
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### POST /payments/query - 查询支付状态
- **权限**: 无
- **认证**: 需要
- **参数**: Body: QueryPaymentDto
- **响应**: 200 OK

#### POST /payments/:id/refund - 申请退款
- **权限**: 无
- **认证**: 需要
- **限流**: 5次/5分钟
- **参数**: Path: id, Body: RefundPaymentDto
- **响应**: 200 OK

#### POST /payments/notify/wechat - 微信支付回调
- **权限**: 无
- **认证**: 否
- **参数**: Body: 微信回调数据
- **响应**: 200 OK

#### POST /payments/notify/alipay - 支付宝支付回调
- **权限**: 无
- **认证**: 否
- **参数**: Body: 支付宝回调数据
- **响应**: 200 OK

---

### 4.6 其他控制器

#### (计费规则、计量、报表、统计等控制器存在，详细端点需单独查看)

---

## 5. Notification Service (通知服务) - 基础路径: `/notifications` 和 `/templates`

### 5.1 通知管理

#### POST /notifications - 创建并发送通知
- **权限**: `notification.create`
- **认证**: 需要
- **参数**: Body: CreateNotificationDto
- **响应**: 201 Created

#### POST /notifications/broadcast - 广播通知
- **权限**: `notification.broadcast`
- **认证**: 需要
- **参数**: Body: { title, message, data }
- **响应**: 200 OK

#### GET /notifications/unread/count - 获取未读通知数量
- **权限**: `notification.unread-count`
- **认证**: 需要
- **参数**: Query: userId (可选)
- **响应**: 200 OK

#### GET /notifications/user/:userId - 获取用户的通知列表
- **权限**: `notification.read`
- **认证**: 需要
- **参数**: Path: userId, Query: unreadOnly (可选)
- **响应**: 200 OK

#### PATCH /notifications/:id/read - 标记通知为已读
- **权限**: `notification.update`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### POST /notifications/read-all - 标记所有通知为已读
- **权限**: `notification.update`
- **认证**: 需要
- **参数**: Body: { userId }
- **响应**: 200 OK

#### DELETE /notifications/:id - 删除通知
- **权限**: `notification.delete`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### POST /notifications/batch/delete - 批量删除通知
- **权限**: `notification.batch-delete`
- **认证**: 需要
- **参数**: Body: { ids }
- **响应**: 200 OK

#### GET /notifications/stats - 获取统计信息
- **权限**: `notification.stats`
- **认证**: 需要
- **参数**: 无
- **响应**: 200 OK

---

### 5.2 通知模板管理

#### POST /templates - 创建模板
- **权限**: `notification.template-create`
- **认证**: 需要
- **参数**: Body: CreateTemplateDto
- **响应**: 201 Created

#### GET /templates - 查询模板列表
- **权限**: `notification.template-read`
- **认证**: 需要
- **参数**: Query: type, language, page, limit (均可选)
- **响应**: 200 OK

#### GET /templates/:id - 根据ID查找模板
- **权限**: `notification.template-read`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### PATCH /templates/:id - 更新模板
- **权限**: `notification.template-update`
- **认证**: 需要
- **参数**: Path: id, Body: UpdateTemplateDto
- **响应**: 200 OK

#### DELETE /templates/:id - 删除模板
- **权限**: `notification.template-delete`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 204 No Content

#### PATCH /templates/:id/toggle - 激活/停用模板
- **权限**: `notification.template-toggle`
- **认证**: 需要
- **参数**: Path: id
- **响应**: 200 OK

#### GET /templates/by-code/:code - 根据code查找模板
- **权限**: `notification.template-read`
- **认证**: 需要
- **参数**: Path: code, Query: language (可选)
- **响应**: 200 OK

#### POST /templates/render - 渲染模板
- **权限**: `notification.template-render`
- **认证**: 需要
- **参数**: Body: RenderTemplateDto
- **响应**: 200 OK

#### POST /templates/validate - 验证模板语法
- **权限**: `notification.template-update`
- **认证**: 需要
- **参数**: Body: { template }
- **响应**: 200 OK

#### POST /templates/bulk - 批量创建模板
- **权限**: `notification.template-create`
- **认证**: 需要
- **参数**: Body: { templates }
- **响应**: 201 Created

#### POST /templates/clear-cache - 清除模板缓存
- **权限**: `notification.template-update`
- **认证**: 需要
- **参数**: 无
- **响应**: 204 No Content

---

### 5.3 其他控制器

#### (SMS管理、用户偏好设置、健康检查等控制器存在，详细端点需单独查看)

---

## 6. API Gateway (API网关) - 无固定基础路径

### 6.1 健康检查和监控

#### GET /health - 聚合健康检查 (公开)
- **权限**: 无
- **认证**: 否 (@Public)
- **参数**: 无
- **说明**: 返回所有微服务的健康状态
- **响应**: 200 OK

#### GET /circuit-breaker/stats - 熔断器状态监控 (公开)
- **权限**: 无
- **认证**: 否 (@Public)
- **参数**: 无
- **响应**: 200 OK

#### ALL /service-cache/clear - 清除服务URL缓存 (公开)
- **权限**: 无
- **认证**: 否 (@Public)
- **参数**: Query: service (可选)
- **响应**: 200 OK

---

### 6.2 路由代理

网关以下列方式代理到各服务（都需要JWT认证，除非标记为@Public）：

**认证服务路由** (公开):
- `GET|POST /auth` → user-service
- `GET|POST /auth/*path` → user-service

**用户服务路由** (需认证):
- `GET|POST /users`, `GET|POST /users/*path` → user-service
- `GET|POST /roles`, `GET|POST /roles/*path` → user-service
- `GET|POST /permissions`, `GET|POST /permissions/*path` → user-service
- `GET|POST /data-scopes`, `GET|POST /data-scopes/*path` → user-service
- `GET|POST /field-permissions`, `GET|POST /field-permissions/*path` → user-service
- `GET|POST /menu-permissions`, `GET|POST /menu-permissions/*path` → user-service
- `GET|POST /quotas`, `GET|POST /quotas/*path` → user-service
- `GET|POST /tickets`, `GET|POST /tickets/*path` → user-service
- `GET|POST /audit-logs`, `GET|POST /audit-logs/*path` → user-service
- `GET|POST /api-keys`, `GET|POST /api-keys/*path` → user-service
- `GET|POST /cache`, `GET|POST /cache/*path` → user-service
- `GET|POST /queues`, `GET|POST /queues/*path` → user-service
- `GET|POST /events`, `GET|POST /events/*path` → user-service
- `GET|POST /settings`, `GET|POST /settings/*path` → user-service

**设备服务路由** (需认证):
- `GET|POST /devices`, `GET|POST /devices/*path` → device-service
- `GET|POST /snapshots`, `GET|POST /snapshots/*path` → device-service
- `GET|POST /gpu`, `GET|POST /gpu/*path` → device-service
- `GET|POST /lifecycle`, `GET|POST /lifecycle/*path` → device-service
- `GET|POST /failover`, `GET|POST /failover/*path` → device-service
- `GET|POST /state-recovery`, `GET|POST /state-recovery/*path` → device-service
- `GET|POST /admin/physical-devices`, `GET|POST /admin/physical-devices/*path` → device-service

**应用服务路由** (需认证):
- `GET|POST /apps`, `GET|POST /apps/*path` → app-service

**通知服务路由** (需认证):
- `GET|POST /notifications`, `GET|POST /notifications/*path` → notifications
- `GET|POST /templates`, `GET|POST /templates/*path` → notifications
- `GET|POST /sms`, `GET|POST /sms/*path` → notifications

**计费服务路由** (需认证):
- `GET|POST /billing`, `GET|POST /billing/*path` → billing
- `GET|POST /balance`, `GET|POST /balance/*path` → billing
- `GET|POST /payments`, `GET|POST /payments/*path` → billing
- `GET|POST /orders`, `GET|POST /orders/*path` → billing
- `GET|POST /plans`, `GET|POST /plans/*path` → billing
- `GET|POST /invoices`, `GET|POST /invoices/*path` → billing
- `GET|POST /metering`, `GET|POST /metering/*path` → billing
- `GET|POST /billing-rules`, `GET|POST /billing-rules/*path` → billing
- `GET|POST /reports`, `GET|POST /reports/*path` → billing
- `GET|POST /stats`, `GET|POST /stats/*path` → billing
- `GET|POST /usage`, `GET|POST /usage/*path` → billing
- `GET|POST /admin/payments`, `GET|POST /admin/payments/*path` → billing

**其他服务路由**:
- `GET|POST /scheduler/*path` → scheduler (需认证)
- `GET|POST /media/*path` → media (需认证)
- `GET|POST /sms-numbers/*path` → sms-receive-service (需认证)

---

## 通用特性总结

### 认证
- 所有服务端点默认需要JWT Bearer Token认证
- 部分公开端点标记@Public (登录、注册、健康检查等)
- 支持API Key认证 (仅api-keys控制器)

### 权限
- 使用@RequirePermission装饰器进行权限检查
- 权限格式: `resource.action` (如: `user.create`, `device.read`)
- 支持角色级权限 (如: @Roles('admin', 'support'))

### 数据权限
- 使用@DataScope装饰器进行数据范围限制
- 类型: SELF (仅自己), ALL (全部)

### 限流
- 使用@Throttle装饰器
- 常见限流: 登录5次/分钟, 上传20次/5分钟, 创建订单10次/5分钟

### 分页
- 支持偏移分页: page + limit
- 支持游标分页: cursor + limit (性能更优)

### 响应格式
- 标准响应: { success, data, message }
- 分页响应: { success, data, page, total, limit, totalPages }
- 游标分页: { success, data, nextCursor, hasMore, count }

### 错误处理
- 404: 资源不存在
- 403: 权限不足 / 配额超限
- 400: 参数验证失败
- 429: 限流触发
- 500: 服务器错误

