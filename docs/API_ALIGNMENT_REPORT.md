# 前后端API接口对齐分析报告

## 📊 统计摘要

- ✅ **已对齐接口**: 146 个
- ⚠️ **后端独有** (前端未调用): 61 个
- ❌ **前端独有** (后端未实现): 293 个

**前端覆盖率**: 70.5%

---

## 1️⃣ 后端独有接口 (前端未调用)

这些接口已在后端实现，但前端尚未调用。可能原因:
- 新功能尚未前端实现
- 内部服务间调用
- 管理功能未暴露

### 余额管理 (7 个)

- `[POST] /balance`
  - 创建用户余额账户
- `[POST] /balance/consume`
  - 余额消费
- `[POST] /balance/freeze`
  - 冻结余额
- `[GET] /balance/statistics/:userId`
  - 获取余额统计
- `[GET] /balance/transactions/:userId`
  - 获取交易记录
- `[POST] /balance/unfreeze`
  - 解冻余额
- `[GET] /balance/user/:userId`
  - 获取用户余额

### 其他 (4 个)

- `[GET] /circuit-breaker/stats`
  - 熔断器状态监控 (公开)
- `[GET] /events`
  - 获取事件列表
- `[GET] /health`
  - 聚合健康检查 (公开)
- `[GET] /metrics`
  - 获取Prometheus指标

### 应用服务 (6 个)

- `[GET] /apps/:id/audit-records`
  - 获取审核记录
- `[GET] /apps/audit-records/all`
  - 获取所有审核记录
- `[GET] /apps/install/saga/:sagaId`
  - 查询安装Saga状态
- `[GET] /apps/package/:packageName/latest`
  - 获取应用最新版本
- `[GET] /apps/package/:packageName/versions`
  - 获取应用所有版本
- `[GET] /apps/pending-review/list`
  - 获取待审核应用

### 模板管理 (5 个)

- `[POST] /templates/bulk`
  - 批量创建模板
- `[GET] /templates/by-code/:code`
  - 根据code查找模板
- `[POST] /templates/clear-cache`
  - 清除模板缓存
- `[POST] /templates/render`
  - 渲染模板
- `[POST] /templates/validate`
  - 验证模板语法

### 用户服务 (3 个)

- `[POST] /auth/refresh`
  - 刷新Token
- `[GET] /auth/register/saga/:sagaId`
  - 查询注册Saga状态
- `[GET] /users/filter`
  - 高级过滤用户列表

### 角色管理 (1 个)

- `[GET] /users/roles`
  - 获取角色列表

### 计费服务 (5 个)

- `[GET] /billing/usage/:userId`
  - 获取用户使用记录
- `[POST] /billing/usage/start`
  - 开始使用记录
- `[POST] /billing/usage/stop`
  - 停止使用记录
- `[POST] /payments/notify/alipay`
  - 支付宝支付回调
- `[POST] /payments/notify/wechat`
  - 微信支付回调

### 设备服务 (28 个)

- `[GET] /apps/:id/devices`
  - 获取应用安装设备
- `[POST] /devices/:id/apps/clear-data`
  - 清除应用数据
- `[POST] /devices/:id/apps/start`
  - 启动应用
- `[POST] /devices/:id/apps/stop`
  - 停止应用
- `[POST] /devices/:id/heartbeat`
  - 更新心跳
- `[POST] /devices/:id/request-sms`
  - 为设备请求虚拟SMS号码
- `[POST] /devices/:id/restart`
  - 重启设备
- `[GET] /devices/:id/screenshot`
  - 获取设备截图
- `[GET] /devices/:id/sms-messages`
  - 获取设备收到的SMS消息历史
- `[GET] /devices/:id/sms-number`
  - 获取设备的虚拟SMS号码信息
- `[DELETE] /devices/:id/sms-number`
  - 取消设备的虚拟SMS号码
- `[POST] /devices/:id/snapshots`
  - 创建设备快照
- `[GET] /devices/:id/snapshots`
  - 获取设备快照列表
- `[DELETE] /devices/:id/snapshots/:snapshotId`
  - 删除设备快照
- `[POST] /devices/:id/snapshots/restore`
  - 恢复设备快照
- `[GET] /devices/:id/stream-info`
  - 获取设备流信息
- `[POST] /devices/batch/create`
  - 批量创建设备
- `[POST] /devices/batch/execute`
  - 批量执行命令
- `[POST] /devices/batch/execute-collect`
  - 批量执行命令并收集结果
- `[GET] /devices/batch/groups/:groupName/devices`
  - 获取分组设备列表
- `[GET] /devices/batch/groups/statistics`
  - 获取分组统计
- `[PATCH] /devices/batch/groups/update`
  - 更新设备分组
- `[POST] /devices/batch/install`
  - 批量安装应用
- `[POST] /devices/batch/operate`
  - 批量操作设备
- `[POST] /devices/batch/stats`
  - 批量获取设备统计信息
- `[POST] /devices/batch/status`
  - 批量获取设备状态
- `[POST] /devices/batch/uninstall`
  - 批量卸载应用
- `[GET] /devices/deletion/saga/:sagaId`
  - 查询设备删除Saga状态

### 通知服务 (2 个)

- `[PATCH] /notifications/:id/read`
  - 标记通知为已读
- `[POST] /notifications/broadcast`
  - 广播通知

---

## 2️⃣ 前端独有调用 (后端未实现) ⚠️ 需要修复

**这些API调用在前端中使用，但后端没有实现。需要紧急处理！**

### 其他 (152 个) - ADMIN

- `[GET] /admin/providers/{provider}/config`
  - 提供商配置
- `[PUT] /admin/providers/{provider}/config`
  - 更新配置
- `[POST] /admin/providers/{provider}/test`
  - 测试连接
- `[GET] /api/activities`
- `[GET] /api/activities/my/participations`
- `[GET] /api/activities/stats`
- `[POST] /api/activities/{activityId}/claim-coupon`
- `[GET] /api/activities/{id}`
- `[POST] /api/activities/{id}/participate`
- `[GET] /api/coupons/my`
- `[POST] /api/coupons/{couponId}/use`
- `[GET] /api/referral/config`
- `[GET] /api/referral/earnings`
- `[POST] /api/referral/generate-code`
- `[POST] /api/referral/generate-poster`
- `[GET] /api/referral/records`
- `[POST] /api/referral/share`
- `[GET] /api/referral/stats`
- `[POST] /api/referral/withdraw`
- `[GET] /api/referral/withdrawals`
- `[POST] /api/referral/withdrawals/{withdrawId}/cancel`
- `[GET] /data-scopes`
  - 数据范围列表
- `[POST] /data-scopes`
  - 创建数据范围
- `[POST] /data-scopes/batch`
  - 批量创建
- `[GET] /data-scopes/meta/scope-types`
  - 范围类型元数据
- `[GET] /data-scopes/role/{id}`
  - 角色数据范围
- `[GET] /data-scopes/{id}`
  - 数据范围详情
- `[PUT] /data-scopes/{id}`
  - 更新数据范围
- `[DELETE] /data-scopes/{id}`
  - 删除数据范围
- `[PUT] /data-scopes/{id}/toggle`
  - 启用/禁用
- `[GET] /events/recent`
  - 最近事件
- `[GET] /events/stats`
  - 事件统计
- `[GET] /events/user/{id}/history`
  - 事件历史
- `[GET] /events/user/{id}/replay`
  - 重放事件
- `[GET] /events/user/{id}/replay/timestamp`
  - 时间旅行
- `[GET] /events/user/{id}/replay/version/{v}`
  - 重放到版本
- `[GET] /export/data-types`
- `[POST] /export/estimate`
- `[GET] /export/stats`
- `[POST] /export/tasks`
- `[GET] /export/tasks`
- `[POST] /export/tasks/batch-delete`
- `[POST] /export/tasks/clear-completed`
- `[POST] /export/tasks/clear-failed`
- `[GET] /export/tasks/{id}`
- `[DELETE] /export/tasks/{id}`
- `[POST] /export/tasks/{id}/cancel`
- `[GET] /export/tasks/{id}/download`
- `[POST] /export/tasks/{id}/retry`
- `[GET] /field-permissions`
  - 字段权限列表
- `[POST] /field-permissions`
  - 创建字段权限
- `[POST] /field-permissions/batch`
  - 批量创建
- `[GET] /field-permissions/meta/access-levels`
  - 访问级别元数据
- `[GET] /field-permissions/meta/operation-types`
  - 操作类型元数据
- `[GET] /field-permissions/meta/transform-examples`
  - 转换示例
- `[GET] /field-permissions/role/{id}`
  - 角色字段权限
- `[GET] /field-permissions/{id}`
  - 字段权限详情
- `[PUT] /field-permissions/{id}`
  - 更新字段权限
- `[DELETE] /field-permissions/{id}`
  - 删除字段权限
- `[PUT] /field-permissions/{id}/toggle`
  - 启用/禁用
- `[GET] /help/articles`
- `[GET] /help/articles/latest`
- `[GET] /help/articles/popular`
- `[GET] /help/articles/{id}`
- `[POST] /help/articles/{id}/helpful`
- `[POST] /help/articles/{id}/like`
- `[GET] /help/articles/{id}/related`
- `[POST] /help/articles/{id}/view`
- `[GET] /help/categories`
- `[GET] /help/faqs`
- `[GET] /help/faqs/{id}`
- `[POST] /help/faqs/{id}/view`
- `[POST] /help/feedback`
- `[GET] /help/search`
- `[GET] /help/tags/popular`
- `[GET] /help/tutorials`
- `[GET] /help/tutorials/{id}`
- `[POST] /help/tutorials/{id}/like`
- `[POST] /help/tutorials/{id}/view`
- `[GET] /logs/audit`
  - 操作日志列表
- `[POST] /logs/audit/clean`
  - 清理日志
- `[GET] /logs/audit/export`
  - 导出日志
- `[GET] /logs/audit/{id}`
  - 日志详情
- `[POST] /media/sessions`
- `[POST] /media/sessions/answer`
- `[POST] /media/sessions/ice-candidate`
- `[GET] /media/sessions/{id}`
- `[DELETE] /media/sessions/{id}`
- `[GET] /media/stats`
- `[GET] /menu-permissions/all-menus`
  - 所有菜单
- `[GET] /menu-permissions/breadcrumb`
  - 获取面包屑
- `[GET] /menu-permissions/cache/clear-all`
  - 清空所有缓存
- `[GET] /menu-permissions/cache/export`
  - 导出缓存
- `[GET] /menu-permissions/cache/refresh/{id}`
  - 刷新用户缓存
- `[GET] /menu-permissions/cache/stats`
  - 缓存统计
- `[GET] /menu-permissions/cache/warmup`
  - 预热缓存
- `[GET] /menu-permissions/check-menu-access`
  - 检查菜单访问权限
- `[GET] /menu-permissions/my-menus`
  - 当前用户菜单
- `[GET] /menu-permissions/my-permissions`
  - 当前用户权限
- `[GET] /menu-permissions/user/{id}/menus`
  - 指定用户菜单
- `[GET] /queues/status`
  - 队列状态
- `[POST] /queues/test/send-email`
  - 测试邮件
- `[POST] /queues/test/send-sms`
  - 测试短信
- `[POST] /queues/test/start-device`
  - 测试启动
- `[POST] /queues/{name}/clean`
  - 清理队列
- `[DELETE] /queues/{name}/empty`
  - 清空队列
- `[GET] /queues/{name}/jobs`
  - 任务列表
- `[GET] /queues/{name}/jobs/{id}`
  - 任务详情
- `[DELETE] /queues/{name}/jobs/{id}`
  - 删除任务
- `[POST] /queues/{name}/jobs/{id}/retry`
  - 重试任务
- `[POST] /queues/{name}/pause`
  - 暂停队列
- `[POST] /queues/{name}/resume`
  - 恢复队列
- `[GET] /resources/gpu`
  - GPU 设备列表
- `[GET] /resources/gpu/allocations`
  - 分配记录
- `[GET] /resources/gpu/cluster-trend`
  - 集群趋势
- `[GET] /resources/gpu/driver/{id}`
  - 驱动信息
- `[POST] /resources/gpu/driver/{id}/update`
  - 更新驱动
- `[GET] /resources/gpu/stats`
  - GPU 统计
- `[GET] /resources/gpu/{id}`
  - GPU 详情
- `[POST] /resources/gpu/{id}/allocate`
  - 分配 GPU
- `[DELETE] /resources/gpu/{id}/deallocate`
  - 释放 GPU
- `[GET] /resources/gpu/{id}/performance`
  - 性能分析
- `[GET] /resources/gpu/{id}/status`
  - GPU 实时状态
- `[GET] /resources/gpu/{id}/usage-trend`
  - 使用趋势
- `[GET] /scheduler/cluster/usage-trend`
  - 集群趋势
- `[GET] /scheduler/nodes`
  - 节点列表
- `[POST] /scheduler/nodes`
  - 创建节点
- `[GET] /scheduler/nodes/{id}`
  - 节点详情
- `[PUT] /scheduler/nodes/{id}`
  - 更新节点
- `[DELETE] /scheduler/nodes/{id}`
  - 删除节点
- `[POST] /scheduler/nodes/{id}/drain`
  - 排空节点
- `[POST] /scheduler/nodes/{id}/maintenance`
  - 维护模式
- `[GET] /scheduler/nodes/{id}/usage-trend`
  - 节点趋势
- `[POST] /scheduler/reschedule/{id}`
  - 重新调度
- `[POST] /scheduler/schedule`
  - 手动调度
- `[GET] /scheduler/stats`
  - 集群统计
- `[GET] /scheduler/strategies`
  - 策略列表
- `[POST] /scheduler/strategies`
  - 创建策略
- `[GET] /scheduler/strategies/active`
  - 激活策略
- `[PUT] /scheduler/strategies/{id}`
  - 更新策略
- `[DELETE] /scheduler/strategies/{id}`
  - 删除策略
- `[POST] /scheduler/strategies/{id}/activate`
  - 激活策略
- `[GET] /scheduler/tasks`
  - 任务列表
- `[GET] /stats/dashboard`
  - 仪表板统计
- `[GET] /stats/revenue/month`
  - 本月收入
- `[GET] /stats/revenue/today`
  - 今日收入
- `[GET] /stats/revenue/trend`
  - 收入趋势
- `[POST] /tickets/attachments/upload`
- `[DELETE] /tickets/attachments/{id}`
- `[GET] /tickets/stats`
- `[POST] /tickets/{id}/close`
- `[POST] /tickets/{id}/reopen`

### 套餐管理 (1 个) - ADMIN

- `[GET] /stats/plans/distribution`
  - 套餐分布

### 应用服务 (5 个) - ADMIN

- `[GET] /apps/audit-records`
  - 审核记录列表
- `[GET] /apps/stats`
  - 应用统计
- `[POST] /apps/{id}/publish`
  - 发布应用
- `[GET] /apps/{id}/reviews`
  - 应用审核历史
- `[POST] /apps/{id}/unpublish`
  - 取消发布

### 快照管理 (1 个) - ADMIN

- `[POST] /snapshots/batch-delete`
  - 批量删除

### 报表计量 (9 个) - ADMIN

- `[GET] /metering/overview`
  - 计量概览
- `[GET] /metering/resource-analysis`
  - 资源分析
- `[GET] /metering/trend`
  - 计量趋势
- `[GET] /reports/bills/{id}`
  - 用户账单
- `[GET] /reports/bills/{id}/export`
  - 导出账单
- `[GET] /reports/plans/stats`
  - 套餐统计
- `[GET] /reports/revenue`
  - 收入统计
- `[GET] /reports/revenue/export`
  - 导出收入
- `[GET] /reports/usage-trend`
  - 使用趋势

### 模板管理 (12 个) - ADMIN

- `[POST] /templates/from-device/{id}`
  - 从设备创建
- `[GET] /templates/popular`
  - 热门模板
- `[GET] /templates/search`
  - 搜索模板
- `[GET] /templates/stats`
  - 模板统计
- `[POST] /templates/test`
  - 测试模板
- `[GET] /templates/variables`
  - 可用变量
- `[PUT] /templates/{id}`
  - 更新模板
- `[POST] /templates/{id}/batch-create`
  - 批量创建
- `[POST] /templates/{id}/create-device`
  - 创建设备
- `[POST] /templates/{id}/preview`
  - 预览模板
- `[POST] /templates/{id}/revert`
  - 回滚版本
- `[GET] /templates/{id}/versions`
  - 版本历史

### 物理设备 (3 个) - ADMIN

- `[GET] /devices/physical`
  - 物理设备列表
- `[POST] /devices/physical/register`
  - 注册物理设备
- `[POST] /devices/physical/scan`
  - 扫描物理设备

### 用户服务 (20 个) - ADMIN

- `[POST] /auth/2fa/verify`
- `[POST] /auth/change-password`
- `[POST] /auth/forgot-password`
- `[GET] /auth/login-history`
- `[POST] /auth/reset-password`
- `[GET] /auth/sessions`
- `[DELETE] /auth/sessions/all`
- `[DELETE] /auth/sessions/{sessionId}`
- `[GET] /auth/verify-reset-token/{token}`
- `[GET] /metering/users`
  - 用户计量列表
- `[GET] /metering/users/{id}`
  - 用户使用统计
- `[GET] /stats/users/activity`
  - 用户活跃度
- `[GET] /stats/users/growth`
  - 用户增长
- `[GET] /stats/users/today`
  - 今日新增用户
- `[GET] /users/balance`
- `[POST] /users/batch-delete`
  - 批量删除用户
- `[POST] /users/change-password`
- `[PATCH] /users/profile`
- `[POST] /users/recharge`
- `[POST] /users/{id}/reset-password`
  - 重置密码

### 菜单权限服务 (1 个) - ADMIN

- `[GET] /menu-permissions/user/{id}/permissions`
  - 指定用户权限

### 角色管理 (1 个) - ADMIN

- `[POST] /roles/batch-delete`
  - 批量删除

### 计费服务 (43 个) - ADMIN

- `[GET] /admin/billing/cloud-reconciliation`
  - 云账单对账
- `[GET] /admin/payments`
  - 支付列表（管理员）
- `[PUT] /admin/payments/config`
  - 更新配置
- `[GET] /admin/payments/config/all`
  - 支付配置
- `[POST] /admin/payments/config/test/{provider}`
  - 测试连接
- `[GET] /admin/payments/exceptions/list`
  - 异常支付
- `[GET] /admin/payments/export/excel`
  - 导出 Excel
- `[GET] /admin/payments/refunds/pending`
  - 待审核退款
- `[POST] /admin/payments/refunds/{id}/approve`
  - 批准退款
- `[POST] /admin/payments/refunds/{id}/reject`
  - 拒绝退款
- `[GET] /admin/payments/statistics`
  - 支付统计
- `[GET] /admin/payments/statistics/daily`
  - 每日统计
- `[GET] /admin/payments/statistics/payment-methods`
  - 支付方式统计
- `[GET] /admin/payments/webhooks/logs`
  - Webhook 日志
- `[GET] /admin/payments/{id}`
  - 支付详情（管理员）
- `[POST] /admin/payments/{id}/refund`
  - 手动退款
- `[POST] /admin/payments/{id}/sync`
  - 同步支付状态
- `[GET] /billing/bills`
- `[GET] /billing/bills/{id}`
- `[POST] /billing/bills/{id}/cancel`
- `[GET] /billing/bills/{id}/download`
- `[POST] /billing/bills/{id}/refund`
- `[POST] /billing/invoices`
- `[GET] /billing/invoices`
- `[GET] /billing/invoices/{id}/download`
- `[GET] /billing/orders`
  - 订单列表
- `[POST] /billing/orders/batch/cancel`
  - 批量取消
- `[GET] /billing/orders/my`
- `[GET] /billing/orders/stats`
  - 订单统计
- `[POST] /billing/orders/{id}/refund`
  - 订单退款
- `[POST] /billing/pay`
- `[GET] /billing/payment-methods`
- `[POST] /billing/plans/batch-delete`
  - 批量删除
- `[GET] /billing/rules`
  - 规则列表
- `[POST] /billing/rules`
  - 创建规则
- `[GET] /billing/rules/templates`
  - 规则模板
- `[GET] /billing/rules/{id}`
  - 规则详情
- `[PUT] /billing/rules/{id}`
  - 更新规则
- `[DELETE] /billing/rules/{id}`
  - 删除规则
- `[POST] /billing/rules/{id}/test`
  - 测试规则
- `[PATCH] /billing/rules/{id}/toggle`
  - 切换状态
- `[GET] /billing/usage`
  - 使用记录列表
- `[GET] /billing/usage/my`

### 设备服务 (21 个) - ADMIN

- `[DELETE] /devices/batch`
- `[POST] /devices/batch/install-app`
- `[POST] /devices/cloud/sync`
  - 触发云同步
- `[GET] /devices/cloud/sync-status`
  - 云设备同步状态
- `[GET] /devices/my`
- `[GET] /devices/my/stats`
- `[GET] /devices/providers/health`
  - 提供商健康状态
- `[GET] /devices/providers/specs`
  - 所有提供商规格
- `[GET] /devices/providers/{provider}/specs`
  - 提供商规格
- `[GET] /devices/saga/{sagaId}`
- `[POST] /devices/{deviceId}/apps/batch-uninstall`
- `[DELETE] /devices/{deviceId}/apps/{packageName}`
- `[POST] /devices/{deviceId}/apps/{packageName}/update`
- `[GET] /devices/{deviceId}/installed-apps`
- `[POST] /devices/{id}/cloud/refresh`
  - 刷新云设备
- `[GET] /devices/{id}/connection`
  - 连接信息
- `[POST] /devices/{id}/webrtc/token`
  - WebRTC 令牌
- `[GET] /metering/devices`
  - 设备计量列表
- `[GET] /metering/devices/{id}`
  - 设备使用统计
- `[GET] /stats/devices/distribution`
  - 设备状态分布
- `[GET] /stats/devices/online`
  - 在线设备数

### 设备生命周期 (14 个) - ADMIN

- `[GET] /devices/lifecycle/execution-trend`
  - 执行趋势
- `[GET] /devices/lifecycle/history`
  - 执行历史
- `[GET] /devices/lifecycle/history/{id}`
  - 执行详情
- `[GET] /devices/lifecycle/rules`
  - 规则列表
- `[POST] /devices/lifecycle/rules`
  - 创建规则
- `[GET] /devices/lifecycle/rules/{id}`
  - 规则详情
- `[PUT] /devices/lifecycle/rules/{id}`
  - 更新规则
- `[DELETE] /devices/lifecycle/rules/{id}`
  - 删除规则
- `[POST] /devices/lifecycle/rules/{id}/execute`
  - 执行规则
- `[POST] /devices/lifecycle/rules/{id}/test`
  - 测试规则
- `[PATCH] /devices/lifecycle/rules/{id}/toggle`
  - 切换规则
- `[GET] /devices/lifecycle/stats`
  - 统计信息
- `[GET] /devices/lifecycle/templates`
  - 规则模板
- `[POST] /devices/lifecycle/templates/{id}/create`
  - 从模板创建

### 通知服务 (10 个) - ADMIN

- `[GET] /notifications`
- `[POST] /notifications/clear-read`
- `[POST] /notifications/delete`
- `[POST] /notifications/mark-all-read`
- `[POST] /notifications/mark-read`
- `[GET] /notifications/settings`
- `[PUT] /notifications/settings`
- `[GET] /notifications/unread-count`
- `[GET] /notifications/{id}`
- `[POST] /notifications/{id}/read`
  - 标记已读

---

## 3️⃣ 已对齐接口 (✅ 工作正常)

- **API密钥**: 1 个接口
- **余额管理**: 2 个接口
- **其他**: 36 个接口
- **应用服务**: 12 个接口
- **快照管理**: 8 个接口
- **权限管理**: 7 个接口
- **模板管理**: 6 个接口
- **用户服务**: 18 个接口
- **角色管理**: 7 个接口
- **计费服务**: 14 个接口
- **设备服务**: 28 个接口
- **通知服务**: 7 个接口

总计: 146 个接口前后端完全对齐

