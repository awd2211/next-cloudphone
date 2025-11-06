# 前端需要的所有后端API接口完整分析

## 概述
本文档列出了前端代码（admin 和 user 门户）中调用的所有后端 API 接口，按功能模块分类。

---

## 1. 认证与授权模块

### 1.1 登录/注册
- **方法**: POST
- **路径**: `/auth/login`
- **功能**: 用户登录
- **前端使用**: frontend/admin, frontend/user

- **方法**: GET
- **路径**: `/auth/captcha`
- **功能**: 获取验证码（图形）
- **前端使用**: frontend/admin, frontend/user

- **方法**: POST
- **路径**: `/auth/register`
- **功能**: 用户注册（仅user门户）
- **前端使用**: frontend/user

### 1.2 注销与会话
- **方法**: POST
- **路径**: `/auth/logout`
- **功能**: 注销登录
- **前端使用**: frontend/admin, frontend/user

- **方法**: GET
- **路径**: `/auth/me`
- **功能**: 获取当前用户信息
- **前端使用**: frontend/admin, frontend/user

### 1.3 密码管理
- **方法**: POST
- **路径**: `/auth/change-password`
- **功能**: 修改密码
- **前端使用**: frontend/admin, frontend/user

- **方法**: POST
- **路径**: `/auth/forgot-password`
- **功能**: 忘记密码 - 发送重置链接
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/auth/verify-reset-token/{token}`
- **功能**: 验证重置密码 token
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/auth/reset-password`
- **功能**: 重置密码
- **前端使用**: frontend/user

### 1.4 双因素认证 (2FA)
- **方法**: GET
- **路径**: `/auth/2fa/generate`
- **功能**: 生成2FA密钥和二维码
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/auth/2fa/enable`
- **功能**: 启用2FA
- **前端使用**: frontend/admin, frontend/user

- **方法**: POST
- **路径**: `/auth/2fa/disable`
- **功能**: 禁用2FA
- **前端使用**: frontend/admin, frontend/user

- **方法**: POST
- **路径**: `/auth/2fa/verify`
- **功能**: 2FA登录验证
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/auth/2fa/status`
- **功能**: 获取双因素认证状态
- **前端使用**: frontend/user

### 1.5 会话管理
- **方法**: GET
- **路径**: `/auth/login-history`
- **功能**: 获取登录历史
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/auth/sessions`
- **功能**: 获取活跃会话
- **前端使用**: frontend/user

- **方法**: DELETE
- **路径**: `/auth/sessions/{sessionId}`
- **功能**: 终止单个会话
- **前端使用**: frontend/user

- **方法**: DELETE
- **路径**: `/auth/sessions/all`
- **功能**: 终止所有其他会话
- **前端使用**: frontend/user

---

## 2. 用户管理模块

### 2.1 用户CRUD操作
- **方法**: GET
- **路径**: `/users`
- **功能**: 获取用户列表（分页）
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/users/cursor`
- **功能**: 获取用户列表（游标分页 - 高性能）
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/users/{id}`
- **功能**: 获取用户详情
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/users`
- **功能**: 创建用户
- **前端使用**: frontend/admin

- **方法**: PATCH
- **路径**: `/users/{id}`
- **功能**: 更新用户信息
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/users/{id}`
- **功能**: 删除用户
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/users/batch-delete`
- **功能**: 批量删除用户
- **前端使用**: frontend/admin

### 2.2 用户统计
- **方法**: GET
- **路径**: `/users/stats`
- **功能**: 用户统计（总数、活跃、非活跃、禁用）
- **前端使用**: frontend/admin

### 2.3 用户密码管理
- **方法**: POST
- **路径**: `/users/{userId}/change-password`
- **功能**: 修改密码
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/users/{userId}/reset-password`
- **功能**: 重置密码
- **前端使用**: frontend/admin

### 2.4 用户余额管理
- **方法**: POST
- **路径**: `/balance/recharge`
- **功能**: 充值余额
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/balance/adjust`
- **功能**: 扣减/调整余额
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/users/balance`
- **功能**: 获取用户余额
- **前端使用**: frontend/user

### 2.5 用户个人信息
- **方法**: GET
- **路径**: `/users/me`
- **功能**: 获取当前用户信息
- **前端使用**: frontend/user

- **方法**: PATCH
- **路径**: `/users/profile`
- **功能**: 更新用户资料（email、phone）
- **前端使用**: frontend/user

- **方法**: PATCH
- **路径**: `/users/{userId}/preferences`
- **功能**: 更新用户偏好设置
- **前端使用**: frontend/user

---

## 3. 设备管理模块

### 3.1 设备CRUD操作
- **方法**: GET
- **路径**: `/devices`
- **功能**: 获取设备列表（分页）
- **前端使用**: frontend/admin, frontend/user

- **方法**: GET
- **路径**: `/devices/cursor`
- **功能**: 获取设备列表（游标分页）
- **前端使用**: frontend/admin, frontend/user

- **方法**: GET
- **路径**: `/devices/{id}`
- **功能**: 获取设备详情
- **前端使用**: frontend/admin, frontend/user

- **方法**: POST
- **路径**: `/devices`
- **功能**: 创建设备
- **前端使用**: frontend/admin, frontend/user

- **方法**: PATCH
- **路径**: `/devices/{id}`
- **功能**: 更新设备
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/devices/{id}`
- **功能**: 删除设备
- **前端使用**: frontend/admin, frontend/user

### 3.2 设备生命周期操作
- **方法**: POST
- **路径**: `/devices/{id}/start`
- **功能**: 启动设备
- **前端使用**: frontend/admin, frontend/user

- **方法**: POST
- **路径**: `/devices/{id}/stop`
- **功能**: 停止设备
- **前端使用**: frontend/admin, frontend/user

- **方法**: POST
- **路径**: `/devices/{id}/reboot`
- **功能**: 重启设备
- **前端使用**: frontend/admin, frontend/user

### 3.3 批量设备操作
- **方法**: POST
- **路径**: `/devices/batch/start`
- **功能**: 批量启动设备
- **前端使用**: frontend/admin, frontend/user

- **方法**: POST
- **路径**: `/devices/batch/stop`
- **功能**: 批量停止设备
- **前端使用**: frontend/admin, frontend/user

- **方法**: POST
- **路径**: `/devices/batch/reboot`
- **功能**: 批量重启设备
- **前端使用**: frontend/admin, frontend/user

- **方法**: POST
- **路径**: `/devices/batch/delete`
- **功能**: 批量删除设备
- **前端使用**: frontend/admin, frontend/user

- **方法**: POST
- **路径**: `/devices/batch/restart`
- **功能**: 批量重启设备（user门户）
- **前端使用**: frontend/user

- **方法**: DELETE
- **路径**: `/devices/batch`
- **功能**: 批量删除设备
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/devices/batch/install-app`
- **功能**: 批量安装应用
- **前端使用**: frontend/user

### 3.4 设备统计
- **方法**: GET
- **路径**: `/devices/stats`
- **功能**: 设备统计
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/devices/my/stats`
- **功能**: 我的设备统计
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/devices/{id}/stats`
- **功能**: 单个设备资源统计
- **前端使用**: frontend/user

### 3.5 用户设备
- **方法**: GET
- **路径**: `/devices/my`
- **功能**: 获取我的设备列表
- **前端使用**: frontend/user

### 3.6 设备创建进度跟踪
- **方法**: GET
- **路径**: `/devices/saga/{sagaId}`
- **功能**: 查询设备创建进度（Saga状态）
- **前端使用**: frontend/user

### 3.7 ADB操作
- **方法**: POST
- **路径**: `/devices/{id}/shell`
- **功能**: 执行Shell命令
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/devices/{id}/screenshot`
- **功能**: 截图
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/devices/{id}/push`
- **功能**: 推送文件
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/devices/{id}/pull`
- **功能**: 拉取文件
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/devices/{id}/install`
- **功能**: 安装应用（APK文件）
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/devices/{id}/uninstall`
- **功能**: 卸载应用
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/devices/{id}/packages`
- **功能**: 获取已安装应用列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/devices/{id}/logcat`
- **功能**: 获取日志
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/devices/{id}/logcat/clear`
- **功能**: 清空日志
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/devices/{id}/properties`
- **功能**: 获取设备属性
- **前端使用**: frontend/admin

### 3.8 多提供商设备相关
- **方法**: GET
- **路径**: `/devices/{id}/connection`
- **功能**: 获取设备连接信息
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/devices/{id}/webrtc/token`
- **功能**: 获取WebRTC连接令牌
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/devices/{id}/cloud/refresh`
- **功能**: 刷新云设备状态
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/devices/physical`
- **功能**: 获取物理设备列表
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/devices/physical/scan`
- **功能**: 扫描网络设备
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/devices/physical/register`
- **功能**: 注册物理设备
- **前端使用**: frontend/admin

### 3.9 可用设备
- **方法**: GET
- **路径**: `/devices/available`
- **功能**: 获取可用设备列表
- **前端使用**: frontend/admin

---

## 4. 应用管理模块

### 4.1 应用CRUD
- **方法**: GET
- **路径**: `/apps`
- **功能**: 获取应用列表（分页）
- **前端使用**: frontend/admin, frontend/user

- **方法**: GET
- **路径**: `/apps/cursor`
- **功能**: 获取应用列表（游标分页）
- **前端使用**: frontend/admin, frontend/user

- **方法**: GET
- **路径**: `/apps/{id}`
- **功能**: 获取应用详情
- **前端使用**: frontend/admin, frontend/user

- **方法**: POST
- **路径**: `/apps/upload`
- **功能**: 上传应用（APK）
- **前端使用**: frontend/admin

- **方法**: PATCH
- **路径**: `/apps/{id}`
- **功能**: 更新应用
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/apps/{id}`
- **功能**: 删除应用
- **前端使用**: frontend/admin

### 4.2 应用发布
- **方法**: POST
- **路径**: `/apps/{id}/publish`
- **功能**: 发布应用
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/apps/{id}/unpublish`
- **功能**: 取消发布应用
- **前端使用**: frontend/admin

### 4.3 应用安装管理
- **方法**: POST
- **路径**: `/apps/install`
- **功能**: 安装应用到设备
- **前端使用**: frontend/admin, frontend/user

- **方法**: POST
- **路径**: `/apps/uninstall`
- **功能**: 卸载设备应用
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/apps/devices/{deviceId}/apps`
- **功能**: 获取设备已安装应用
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/devices/{deviceId}/installed-apps`
- **功能**: 获取设备已安装应用列表
- **前端使用**: frontend/user

- **方法**: DELETE
- **路径**: `/devices/{deviceId}/apps/{packageName}`
- **功能**: 卸载应用
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/devices/{deviceId}/apps/batch-uninstall`
- **功能**: 批量卸载应用
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/devices/{deviceId}/apps/{packageName}/update`
- **功能**: 更新应用
- **前端使用**: frontend/user

### 4.4 应用统计
- **方法**: GET
- **路径**: `/apps/stats`
- **功能**: 应用统计（总数、分类统计）
- **前端使用**: frontend/admin

### 4.5 应用审核
- **方法**: POST
- **路径**: `/apps/{id}/submit-review`
- **功能**: 提交应用审核
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/apps/{id}/approve`
- **功能**: 批准应用
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/apps/{id}/reject`
- **功能**: 拒绝应用
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/apps/{id}/request-changes`
- **功能**: 请求修改
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/apps/audit-records`
- **功能**: 获取审核记录列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/apps/{applicationId}/reviews`
- **功能**: 获取单个应用的审核记录
- **前端使用**: frontend/admin

---

## 5. 计费与订单模块

### 5.1 订单管理
- **方法**: GET
- **路径**: `/billing/orders`
- **功能**: 获取订单列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/billing/orders/{id}`
- **功能**: 获取订单详情
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/billing/orders`
- **功能**: 创建订单
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/billing/orders/{id}/cancel`
- **功能**: 取消订单
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/billing/orders/batch/cancel`
- **功能**: 批量取消订单
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/billing/orders/stats`
- **功能**: 订单统计
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/billing/orders/{id}/refund`
- **功能**: 订单退款
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/billing/orders/{id}/confirm`
- **功能**: 确认订单
- **前端使用**: frontend/admin

### 5.2 支付管理
- **方法**: GET
- **路径**: `/payments`
- **功能**: 获取支付列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/payments/{id}`
- **功能**: 获取支付详情
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/payments`
- **功能**: 创建支付
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/payments/query`
- **功能**: 查询支付状态
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/payments/{id}/refund`
- **功能**: 申请退款
- **前端使用**: frontend/admin

### 5.3 使用记录与计量
- **方法**: GET
- **路径**: `/billing/usage`
- **功能**: 获取使用记录列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/metering/users/{userId}`
- **功能**: 用户使用统计
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/metering/devices/{deviceId}`
- **功能**: 设备使用统计
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/metering/overview`
- **功能**: 计量概览
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/metering/users`
- **功能**: 用户计量列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/metering/devices`
- **功能**: 设备计量列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/metering/trend`
- **功能**: 计量趋势数据
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/metering/resource-analysis`
- **功能**: 资源使用分析
- **前端使用**: frontend/admin

### 5.4 报表
- **方法**: GET
- **路径**: `/reports/bills/{userId}`
- **功能**: 用户账单
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/reports/revenue`
- **功能**: 收入统计
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/reports/usage-trend`
- **功能**: 使用趋势
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/reports/bills/{userId}/export`
- **功能**: 导出用户账单
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/reports/revenue/export`
- **功能**: 导出收入报表
- **前端使用**: frontend/admin

### 5.5 计费规则
- **方法**: GET
- **路径**: `/billing/rules`
- **功能**: 获取计费规则列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/billing/rules/{id}`
- **功能**: 获取计费规则详情
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/billing/rules`
- **功能**: 创建计费规则
- **前端使用**: frontend/admin

- **方法**: PUT
- **路径**: `/billing/rules/{id}`
- **功能**: 更新计费规则
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/billing/rules/{id}`
- **功能**: 删除计费规则
- **前端使用**: frontend/admin

- **方法**: PATCH
- **路径**: `/billing/rules/{id}/toggle`
- **功能**: 激活/停用计费规则
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/billing/rules/{ruleId}/test`
- **功能**: 测试计费规则
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/billing/rules/templates`
- **功能**: 获取计费规则模板
- **前端使用**: frontend/admin

### 5.6 套餐管理
- **方法**: GET
- **路径**: `/billing/plans`
- **功能**: 获取套餐列表
- **前端使用**: frontend/admin, frontend/user

- **方法**: GET
- **路径**: `/billing/plans/{id}`
- **功能**: 获取套餐详情
- **前端使用**: frontend/admin, frontend/user

- **方法**: POST
- **路径**: `/billing/plans`
- **功能**: 创建套餐
- **前端使用**: frontend/admin

- **方法**: PATCH
- **路径**: `/billing/plans/{id}`
- **功能**: 更新套餐
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/billing/plans/{id}`
- **功能**: 删除套餐
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/billing/plans/batch-delete`
- **功能**: 批量删除套餐
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/reports/plans/stats`
- **功能**: 套餐统计
- **前端使用**: frontend/admin

### 5.7 用户账单（user门户）
- **方法**: GET
- **路径**: `/billing/bills`
- **功能**: 获取账单列表
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/billing/bills/{id}`
- **功能**: 获取账单详情
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/billing/pay`
- **功能**: 支付账单
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/billing/bills/{id}/cancel`
- **功能**: 取消账单
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/billing/bills/{id}/refund`
- **功能**: 申请退款
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/billing/bills/{id}/download`
- **功能**: 下载账单
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/billing/stats`
- **功能**: 获取账单统计
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/billing/payment-methods`
- **功能**: 获取支付方式列表
- **前端使用**: frontend/user

### 5.8 发票管理（user门户）
- **方法**: POST
- **路径**: `/billing/invoices`
- **功能**: 申请发票
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/billing/invoices`
- **功能**: 获取发票列表
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/billing/invoices/{id}/download`
- **功能**: 下载发票
- **前端使用**: frontend/user

---

## 6. 支付管理模块（管理员）

### 6.1 支付统计
- **方法**: GET
- **路径**: `/admin/payments/statistics`
- **功能**: 获取支付统计数据
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/admin/payments/statistics/payment-methods`
- **功能**: 获取支付方式统计
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/admin/payments/statistics/daily`
- **功能**: 获取每日统计
- **前端使用**: frontend/admin

### 6.2 支付记录管理
- **方法**: GET
- **路径**: `/admin/payments`
- **功能**: 获取所有支付记录
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/admin/payments/{id}`
- **功能**: 获取支付详情
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/admin/payments/{paymentId}/refund`
- **功能**: 手动发起退款
- **前端使用**: frontend/admin

### 6.3 退款管理
- **方法**: GET
- **路径**: `/admin/payments/refunds/pending`
- **功能**: 获取待审核退款列表
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/admin/payments/refunds/{paymentId}/approve`
- **功能**: 批准退款
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/admin/payments/refunds/{paymentId}/reject`
- **功能**: 拒绝退款
- **前端使用**: frontend/admin

### 6.4 异常支付
- **方法**: GET
- **路径**: `/admin/payments/exceptions/list`
- **功能**: 获取异常支付列表
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/admin/payments/{paymentId}/sync`
- **功能**: 手动同步支付状态
- **前端使用**: frontend/admin

### 6.5 支付导出与配置
- **方法**: GET
- **路径**: `/admin/payments/export/excel`
- **功能**: 导出支付数据为 Excel
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/admin/payments/config/all`
- **功能**: 获取支付配置
- **前端使用**: frontend/admin

- **方法**: PUT
- **路径**: `/admin/payments/config`
- **功能**: 更新支付配置
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/admin/payments/config/test/{provider}`
- **功能**: 测试支付提供商连接
- **前端使用**: frontend/admin

### 6.6 Webhook日志
- **方法**: GET
- **路径**: `/admin/payments/webhooks/logs`
- **功能**: 获取Webhook日志
- **前端使用**: frontend/admin

---

## 7. 通知模块

### 7.1 通知列表与管理（管理员）
- **方法**: GET
- **路径**: `/notifications/user/{userId}`
- **功能**: 获取用户通知列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/notifications/unread/count`
- **功能**: 获取未读通知数量
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/notifications`
- **功能**: 创建通知
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/notifications/{id}/read`
- **功能**: 标记为已读
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/notifications/read-all`
- **功能**: 批量标记为已读
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/notifications/{id}`
- **功能**: 删除通知
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/notifications/batch/delete`
- **功能**: 批量删除通知
- **前端使用**: frontend/admin

### 7.2 通知列表与管理（用户门户）
- **方法**: GET
- **路径**: `/notifications`
- **功能**: 获取消息列表
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/notifications/{id}`
- **功能**: 获取消息详情
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/notifications/unread-count`
- **功能**: 获取未读消息数量
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/notifications/mark-read`
- **功能**: 标记消息为已读
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/notifications/mark-all-read`
- **功能**: 标记所有消息为已读
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/notifications/delete`
- **功能**: 删除消息
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/notifications/clear-read`
- **功能**: 清空所有已读消息
- **前端使用**: frontend/user

### 7.3 通知设置（用户门户）
- **方法**: GET
- **路径**: `/notifications/settings`
- **功能**: 获取通知设置
- **前端使用**: frontend/user

- **方法**: PUT
- **路径**: `/notifications/settings`
- **功能**: 更新通知设置
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/notifications/stats`
- **功能**: 获取通知统计
- **前端使用**: frontend/user

---

## 8. 通知模板模块

### 8.1 模板管理
- **方法**: GET
- **路径**: `/templates`
- **功能**: 获取模板列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/templates/{id}`
- **功能**: 获取模板详情
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/templates`
- **功能**: 创建模板
- **前端使用**: frontend/admin

- **方法**: PUT
- **路径**: `/templates/{id}`
- **功能**: 更新模板
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/templates/{id}`
- **功能**: 删除模板
- **前端使用**: frontend/admin

- **方法**: PATCH
- **路径**: `/templates/{id}/toggle`
- **功能**: 激活/停用模板
- **前端使用**: frontend/admin

### 8.2 版本管理
- **方法**: GET
- **路径**: `/templates/{templateId}/versions`
- **功能**: 获取模板版本历史
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/templates/{templateId}/revert`
- **功能**: 回滚到指定版本
- **前端使用**: frontend/admin

### 8.3 测试与预览
- **方法**: POST
- **路径**: `/templates/test`
- **功能**: 测试模板
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/templates/variables`
- **功能**: 获取可用变量
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/templates/{templateId}/preview`
- **功能**: 预览模板渲染结果
- **前端使用**: frontend/admin

---

## 9. 角色与权限模块

### 9.1 角色管理
- **方法**: GET
- **路径**: `/roles`
- **功能**: 获取角色列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/roles/{id}`
- **功能**: 获取角色详情
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/roles`
- **功能**: 创建角色
- **前端使用**: frontend/admin

- **方法**: PATCH
- **路径**: `/roles/{id}`
- **功能**: 更新角色
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/roles/{id}`
- **功能**: 删除角色
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/roles/batch-delete`
- **功能**: 批量删除角色
- **前端使用**: frontend/admin

### 9.2 权限管理
- **方法**: GET
- **路径**: `/permissions`
- **功能**: 获取所有权限
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/permissions/{id}`
- **功能**: 获取单个权限详情
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/permissions`
- **功能**: 创建权限
- **前端使用**: frontend/admin

- **方法**: PATCH
- **路径**: `/permissions/{id}`
- **功能**: 更新权限
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/permissions/{id}`
- **功能**: 删除权限
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/permissions/resource/{resource}`
- **功能**: 按资源获取权限
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/permissions/bulk`
- **功能**: 批量创建权限
- **前端使用**: frontend/admin

### 9.3 角色权限分配
- **方法**: POST
- **路径**: `/roles/{roleId}/permissions`
- **功能**: 为角色分配权限
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/roles/{roleId}/permissions`
- **功能**: 从角色移除权限
- **前端使用**: frontend/admin

---

## 10. 菜单与权限缓存模块

### 10.1 菜单权限
- **方法**: GET
- **路径**: `/menu-permissions/all-menus`
- **功能**: 获取所有菜单（管理员）
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/menu-permissions/my-menus`
- **功能**: 获取当前用户的菜单树
- **前端使用**: frontend/admin, frontend/user

- **方法**: GET
- **路径**: `/menu-permissions/my-permissions`
- **功能**: 获取当前用户的所有权限
- **前端使用**: frontend/admin, frontend/user

- **方法**: GET
- **路径**: `/menu-permissions/user/{userId}/menus`
- **功能**: 获取指定用户的菜单
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/menu-permissions/user/{userId}/permissions`
- **功能**: 获取指定用户的权限列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/menu-permissions/check-menu-access`
- **功能**: 检查菜单访问权限
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/menu-permissions/breadcrumb`
- **功能**: 获取面包屑导航
- **前端使用**: frontend/admin

### 10.2 缓存管理
- **方法**: GET
- **路径**: `/menu-permissions/cache/stats`
- **功能**: 获取缓存统计信息
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/menu-permissions/cache/refresh/{userId}`
- **功能**: 刷新指定用户的权限缓存
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/menu-permissions/cache/clear-all`
- **功能**: 清空所有权限缓存
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/menu-permissions/cache/warmup`
- **功能**: 预热缓存
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/menu-permissions/cache/export`
- **功能**: 导出缓存数据
- **前端使用**: frontend/admin

---

## 11. 字段权限与数据范围模块

### 11.1 字段权限
- **方法**: GET
- **路径**: `/field-permissions/meta/access-levels`
- **功能**: 获取访问级别元数据
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/field-permissions/meta/operation-types`
- **功能**: 获取操作类型元数据
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/field-permissions`
- **功能**: 获取所有字段权限配置
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/field-permissions/{id}`
- **功能**: 获取单个字段权限配置
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/field-permissions/role/{roleId}`
- **功能**: 获取角色的字段权限配置
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/field-permissions`
- **功能**: 创建字段权限配置
- **前端使用**: frontend/admin

- **方法**: PUT
- **路径**: `/field-permissions/{id}`
- **功能**: 更新字段权限配置
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/field-permissions/{id}`
- **功能**: 删除字段权限配置
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/field-permissions/batch`
- **功能**: 批量创建字段权限配置
- **前端使用**: frontend/admin

- **方法**: PUT
- **路径**: `/field-permissions/{id}/toggle`
- **功能**: 启用/禁用字段权限配置
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/field-permissions/meta/transform-examples`
- **功能**: 获取字段转换规则示例
- **前端使用**: frontend/admin

### 11.2 数据范围
- **方法**: GET
- **路径**: `/data-scopes/meta/scope-types`
- **功能**: 获取范围类型元数据
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/data-scopes`
- **功能**: 获取所有数据范围配置
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/data-scopes/{id}`
- **功能**: 获取单个数据范围配置
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/data-scopes/role/{roleId}`
- **功能**: 获取角色的数据范围配置
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/data-scopes`
- **功能**: 创建数据范围配置
- **前端使用**: frontend/admin

- **方法**: PUT
- **路径**: `/data-scopes/{id}`
- **功能**: 更新数据范围配置
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/data-scopes/{id}`
- **功能**: 删除数据范围配置
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/data-scopes/batch`
- **功能**: 批量创建数据范围配置
- **前端使用**: frontend/admin

- **方法**: PUT
- **路径**: `/data-scopes/{id}/toggle`
- **功能**: 启用/禁用数据范围配置
- **前端使用**: frontend/admin

---

## 12. API密钥管理模块

### 12.1 API密钥CRUD
- **方法**: GET
- **路径**: `/api-keys`
- **功能**: 获取API密钥列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/api-keys/{id}`
- **功能**: 获取API密钥详情
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/api-keys`
- **功能**: 创建API密钥
- **前端使用**: frontend/admin

- **方法**: PATCH
- **路径**: `/api-keys/{id}`
- **功能**: 更新API密钥
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/api-keys/{id}`
- **功能**: 删除API密钥
- **前端使用**: frontend/admin

### 12.2 API密钥操作
- **方法**: POST
- **路径**: `/api-keys/{id}/toggle`
- **功能**: 激活/禁用API密钥
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/api-keys/{id}/rotate`
- **功能**: 轮换API密钥
- **前端使用**: frontend/admin

### 12.3 API密钥统计
- **方法**: GET
- **路径**: `/api-keys/{id}/usage`
- **功能**: 获取API密钥使用统计
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/api-keys/scopes`
- **功能**: 获取可用的权限范围列表
- **前端使用**: frontend/admin

---

## 13. 审计日志模块

### 13.1 审计日志查询（audit.ts）
- **方法**: GET
- **路径**: `/audit-logs`
- **功能**: 获取审计日志列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/audit-logs/{id}`
- **功能**: 获取审计日志详情
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/audit-logs/user/{userId}`
- **功能**: 获取用户操作历史
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/audit-logs/resource/{resourceType}/{resourceId}`
- **功能**: 获取资源操作历史
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/audit-logs/export`
- **功能**: 导出审计日志
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/audit-logs/stats`
- **功能**: 获取审计日志统计
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/audit-logs/cleanup`
- **功能**: 清理旧日志
- **前端使用**: frontend/admin

### 13.2 审计日志查询（auditLog.ts）
- **方法**: GET
- **路径**: `/audit-logs/user/{userId}`
- **功能**: 获取用户审计日志
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/audit-logs/resource/{resourceType}/{resourceId}`
- **功能**: 获取资源的审计日志
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/audit-logs/search`
- **功能**: 搜索审计日志
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/audit-logs/statistics`
- **功能**: 获取审计日志统计
- **前端使用**: frontend/admin

### 13.3 操作日志（log.ts）
- **方法**: GET
- **路径**: `/logs/audit`
- **功能**: 获取操作日志列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/logs/audit/{id}`
- **功能**: 获取日志详情
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/logs/audit/export`
- **功能**: 导出日志
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/logs/audit/clean`
- **功能**: 清理过期日志
- **前端使用**: frontend/admin

---

## 14. 事件溯源模块

### 14.1 用户事件
- **方法**: GET
- **路径**: `/events/user/{userId}/history`
- **功能**: 获取用户事件历史
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/events/user/{userId}/replay`
- **功能**: 重放用户事件
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/events/user/{userId}/replay/version/{version}`
- **功能**: 重放到特定版本
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/events/user/{userId}/replay/timestamp`
- **功能**: 时间旅行
- **前端使用**: frontend/admin

### 14.2 事件统计
- **方法**: GET
- **路径**: `/events/stats`
- **功能**: 获取事件统计信息
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/events/recent`
- **功能**: 获取最近的事件列表
- **前端使用**: frontend/admin

---

## 15. 缓存管理模块

### 15.1 缓存操作
- **方法**: GET
- **路径**: `/cache/stats`
- **功能**: 获取缓存统计信息
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/cache/stats`
- **功能**: 重置缓存统计信息
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/cache/flush`
- **功能**: 清空所有缓存
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/cache`
- **功能**: 删除指定key的缓存
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/cache/pattern`
- **功能**: 按模式删除缓存
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/cache/exists`
- **功能**: 检查缓存key是否存在
- **前端使用**: frontend/admin

---

## 16. 队列管理模块

### 16.1 队列状态
- **方法**: GET
- **路径**: `/queues/status`
- **功能**: 获取所有队列状态
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/queues/{queueName}/jobs`
- **功能**: 获取指定队列的任务列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/queues/{queueName}/jobs/{jobId}`
- **功能**: 获取任务详情
- **前端使用**: frontend/admin

### 16.2 任务操作
- **方法**: POST
- **路径**: `/queues/{queueName}/jobs/{jobId}/retry`
- **功能**: 重试失败的任务
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/queues/{queueName}/jobs/{jobId}`
- **功能**: 删除任务
- **前端使用**: frontend/admin

### 16.3 队列操作
- **方法**: POST
- **路径**: `/queues/{queueName}/pause`
- **功能**: 暂停队列
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/queues/{queueName}/resume`
- **功能**: 恢复队列
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/queues/{queueName}/empty`
- **功能**: 清空队列
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/queues/{queueName}/clean`
- **功能**: 清理已完成的任务
- **前端使用**: frontend/admin

### 16.4 测试功能
- **方法**: POST
- **路径**: `/queues/test/send-email`
- **功能**: 测试：发送邮件任务
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/queues/test/send-sms`
- **功能**: 测试：发送短信任务
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/queues/test/start-device`
- **功能**: 测试：启动设备任务
- **前端使用**: frontend/admin

---

## 17. 配额管理模块

### 17.1 配额操作
- **方法**: POST
- **路径**: `/quotas`
- **功能**: 创建用户配额
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/quotas/user/{userId}`
- **功能**: 获取用户配额
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/quotas/check`
- **功能**: 检查配额是否充足
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/quotas/deduct`
- **功能**: 扣减配额
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/quotas/restore`
- **功能**: 恢复配额
- **前端使用**: frontend/admin

- **方法**: PUT
- **路径**: `/quotas/{id}`
- **功能**: 更新配额
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/quotas/user/{userId}/usage`
- **功能**: 上报设备用量
- **前端使用**: frontend/admin

### 17.2 配额统计与告警
- **方法**: GET
- **路径**: `/quotas/usage-stats/{userId}`
- **功能**: 获取用户使用统计
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/quotas/check/batch`
- **功能**: 批量检查配额
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/quotas/alerts`
- **功能**: 获取配额告警列表
- **前端使用**: frontend/admin

---

## 18. 快照管理模块

### 18.1 快照CRUD
- **方法**: GET
- **路径**: `/snapshots`
- **功能**: 获取快照列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/snapshots/device/{deviceId}`
- **功能**: 获取设备的所有快照
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/snapshots/{id}`
- **功能**: 获取快照详情
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/snapshots/device/{deviceId}`
- **功能**: 创建快照
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/snapshots/{id}/restore`
- **功能**: 恢复快照
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/snapshots/{id}/compress`
- **功能**: 压缩快照
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/snapshots/{id}`
- **功能**: 删除快照
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/snapshots/batch-delete`
- **功能**: 批量删除快照
- **前端使用**: frontend/admin

### 18.2 快照统计
- **方法**: GET
- **路径**: `/snapshots/stats/summary`
- **功能**: 获取快照统计
- **前端使用**: frontend/admin

### 18.3 快照（user门户）
- **方法**: GET
- **路径**: `/snapshots`
- **功能**: 获取快照列表
- **前端使用**: frontend/user

---

## 19. 生命周期规则管理

### 19.1 规则CRUD
- **方法**: GET
- **路径**: `/devices/lifecycle/rules`
- **功能**: 获取规则列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/devices/lifecycle/rules/{id}`
- **功能**: 获取规则详情
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/devices/lifecycle/rules`
- **功能**: 创建规则
- **前端使用**: frontend/admin

- **方法**: PUT
- **路径**: `/devices/lifecycle/rules/{id}`
- **功能**: 更新规则
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/devices/lifecycle/rules/{id}`
- **功能**: 删除规则
- **前端使用**: frontend/admin

- **方法**: PATCH
- **路径**: `/devices/lifecycle/rules/{id}/toggle`
- **功能**: 启用/禁用规则
- **前端使用**: frontend/admin

### 19.2 规则执行
- **方法**: POST
- **路径**: `/devices/lifecycle/rules/{id}/execute`
- **功能**: 手动执行规则
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/devices/lifecycle/rules/{id}/test`
- **功能**: 测试规则
- **前端使用**: frontend/admin

### 19.3 执行历史
- **方法**: GET
- **路径**: `/devices/lifecycle/history`
- **功能**: 获取执行历史
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/devices/lifecycle/history/{id}`
- **功能**: 获取执行详情
- **前端使用**: frontend/admin

### 19.4 统计与模板
- **方法**: GET
- **路径**: `/devices/lifecycle/stats`
- **功能**: 获取生命周期统计
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/devices/lifecycle/execution-trend`
- **功能**: 获取规则执行趋势
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/devices/lifecycle/templates`
- **功能**: 获取规则模板
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/devices/lifecycle/templates/{templateId}/create`
- **功能**: 从模板创建规则
- **前端使用**: frontend/admin

---

## 20. GPU资源管理

### 20.1 GPU设备
- **方法**: GET
- **路径**: `/resources/gpu`
- **功能**: 获取GPU设备列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/resources/gpu/{id}`
- **功能**: 获取GPU设备详情
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/resources/gpu/{id}/status`
- **功能**: 获取GPU实时状态
- **前端使用**: frontend/admin

### 20.2 GPU分配
- **方法**: POST
- **路径**: `/resources/gpu/{gpuId}/allocate`
- **功能**: 分配GPU到设备
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/resources/gpu/{gpuId}/deallocate`
- **功能**: 释放GPU分配
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/resources/gpu/allocations`
- **功能**: 获取分配记录
- **前端使用**: frontend/admin

### 20.3 GPU监控统计
- **方法**: GET
- **路径**: `/resources/gpu/stats`
- **功能**: 获取GPU统计信息
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/resources/gpu/{gpuId}/usage-trend`
- **功能**: 获取GPU使用趋势
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/resources/gpu/cluster-trend`
- **功能**: 获取集群GPU使用趋势
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/resources/gpu/{gpuId}/performance`
- **功能**: 获取GPU性能分析
- **前端使用**: frontend/admin

### 20.4 GPU驱动管理
- **方法**: GET
- **路径**: `/resources/gpu/driver/{nodeId}`
- **功能**: 获取驱动信息
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/resources/gpu/driver/{nodeId}/update`
- **功能**: 更新驱动
- **前端使用**: frontend/admin

---

## 21. 调度器与节点管理

### 21.1 节点管理
- **方法**: GET
- **路径**: `/scheduler/nodes`
- **功能**: 获取节点列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/scheduler/nodes/{id}`
- **功能**: 获取节点详情
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/scheduler/nodes`
- **功能**: 创建节点
- **前端使用**: frontend/admin

- **方法**: PUT
- **路径**: `/scheduler/nodes/{id}`
- **功能**: 更新节点
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/scheduler/nodes/{id}`
- **功能**: 删除节点
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/scheduler/nodes/{id}/maintenance`
- **功能**: 节点进入维护模式
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/scheduler/nodes/{id}/drain`
- **功能**: 排空节点
- **前端使用**: frontend/admin

### 21.2 调度策略
- **方法**: GET
- **路径**: `/scheduler/strategies`
- **功能**: 获取调度策略
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/scheduler/strategies/active`
- **功能**: 获取当前激活的策略
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/scheduler/strategies/{id}/activate`
- **功能**: 设置激活的策略
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/scheduler/strategies`
- **功能**: 创建策略
- **前端使用**: frontend/admin

- **方法**: PUT
- **路径**: `/scheduler/strategies/{id}`
- **功能**: 更新策略
- **前端使用**: frontend/admin

- **方法**: DELETE
- **路径**: `/scheduler/strategies/{id}`
- **功能**: 删除策略
- **前端使用**: frontend/admin

### 21.3 调度任务
- **方法**: GET
- **路径**: `/scheduler/tasks`
- **功能**: 获取调度任务列表
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/scheduler/schedule`
- **功能**: 手动调度设备
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/scheduler/reschedule/{deviceId}`
- **功能**: 重新调度
- **前端使用**: frontend/admin

### 21.4 集群统计
- **方法**: GET
- **路径**: `/scheduler/stats`
- **功能**: 获取集群统计
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/scheduler/nodes/{nodeId}/usage-trend`
- **功能**: 获取节点资源使用趋势
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/scheduler/cluster/usage-trend`
- **功能**: 获取集群资源使用趋势
- **前端使用**: frontend/admin

---

## 22. 提供商管理

### 22.1 提供商配置
- **方法**: GET
- **路径**: `/devices/providers/specs`
- **功能**: 获取所有提供商规格
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/devices/providers/{provider}/specs`
- **功能**: 获取指定提供商的规格列表
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/devices/cloud/sync-status`
- **功能**: 获取云设备同步状态
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/devices/cloud/sync`
- **功能**: 手动触发云设备同步
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/devices/providers/health`
- **功能**: 获取提供商健康状态
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/admin/providers/{provider}/config`
- **功能**: 获取提供商配置
- **前端使用**: frontend/admin

- **方法**: PUT
- **路径**: `/admin/providers/{provider}/config`
- **功能**: 更新提供商配置
- **前端使用**: frontend/admin

- **方法**: POST
- **路径**: `/admin/providers/{provider}/test`
- **功能**: 测试提供商连接
- **前端使用**: frontend/admin

- **方法**: GET
- **路径**: `/admin/billing/cloud-reconciliation`
- **功能**: 获取云账单对账数据
- **前端使用**: frontend/admin

---

## 23. 工单管理（user门户）

### 23.1 工单CRUD
- **方法**: GET
- **路径**: `/tickets`
- **功能**: 获取工单列表
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/tickets/{id}`
- **功能**: 获取工单详情
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/tickets`
- **功能**: 创建工单
- **前端使用**: frontend/user

- **方法**: PUT
- **路径**: `/tickets/{id}`
- **功能**: 更新工单
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/tickets/{id}/close`
- **功能**: 关闭工单
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/tickets/{id}/reopen`
- **功能**: 重新打开工单
- **前端使用**: frontend/user

### 23.2 工单回复
- **方法**: GET
- **路径**: `/tickets/{ticketId}/replies`
- **功能**: 获取工单回复列表
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/tickets/{ticketId}/replies`
- **功能**: 添加工单回复
- **前端使用**: frontend/user

### 23.3 附件管理
- **方法**: POST
- **路径**: `/tickets/attachments/upload`
- **功能**: 上传附件
- **前端使用**: frontend/user

- **方法**: DELETE
- **路径**: `/tickets/attachments/{id}`
- **功能**: 删除附件
- **前端使用**: frontend/user

### 23.4 工单统计
- **方法**: GET
- **路径**: `/tickets/stats`
- **功能**: 获取工单统计
- **前端使用**: frontend/user

---

## 24. 帮助系统（user门户）

### 24.1 帮助分类与文章
- **方法**: GET
- **路径**: `/help/categories`
- **功能**: 获取帮助分类列表
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/help/articles`
- **功能**: 获取文章列表
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/help/articles/{id}`
- **功能**: 获取文章详情
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/help/articles/popular`
- **功能**: 获取热门文章
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/help/articles/latest`
- **功能**: 获取最新文章
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/help/articles/{id}/related`
- **功能**: 获取相关文章
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/help/articles/{id}/view`
- **功能**: 记录文章浏览
- **前端使用**: frontend/user

### 24.2 FAQ
- **方法**: GET
- **路径**: `/help/faqs`
- **功能**: 获取FAQ列表
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/help/faqs/{id}`
- **功能**: 获取FAQ详情
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/help/faqs/{id}/view`
- **功能**: 记录FAQ浏览
- **前端使用**: frontend/user

### 24.3 教程
- **方法**: GET
- **路径**: `/help/tutorials`
- **功能**: 获取教程列表
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/help/tutorials/{id}`
- **功能**: 获取教程详情
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/help/tutorials/{id}/view`
- **功能**: 记录教程浏览
- **前端使用**: frontend/user

### 24.4 搜索与交互
- **方法**: GET
- **路径**: `/help/search`
- **功能**: 搜索帮助内容
- **前端使用**: frontend/user

- **方法**: GET
- **路径**: `/help/tags/popular`
- **功能**: 获取热门标签
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/help/{type}s/{id}/helpful`
- **功能**: 标记为有帮助
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/help/{type}s/{id}/like`
- **功能**: 点赞
- **前端使用**: frontend/user

- **方法**: POST
- **路径**: `/help/feedback`
- **功能**: 提交反馈
- **前端使用**: frontend/user

---

## 25. 其他功能模块

### 25.1 媒体服务
- **WebRTC流媒体**：用于设备屏幕实时查看

### 25.2 提供者（provider.ts admin版本）
- 已在第22章提供商管理中涵盖

### 25.3 工单管理（admin版本）

参考 audit-logs 中的相关API

---

## API 统计汇总

**总计约 450+ 个 API 端点**

### 按模块分类统计：
1. **认证与授权**: 20+ 个接口
2. **用户管理**: 25+ 个接口
3. **设备管理**: 45+ 个接口
4. **应用管理**: 40+ 个接口
5. **计费与订单**: 70+ 个接口
6. **支付管理**: 20+ 个接口
7. **通知模块**: 25+ 个接口
8. **通知模板**: 10+ 个接口
9. **角色与权限**: 30+ 个接口
10. **菜单与权限缓存**: 15+ 个接口
11. **字段权限与数据范围**: 25+ 个接口
12. **API密钥管理**: 10+ 个接口
13. **审计日志**: 20+ 个接口
14. **事件溯源**: 10+ 个接口
15. **缓存管理**: 6 个接口
16. **队列管理**: 15+ 个接口
17. **配额管理**: 15+ 个接口
18. **快照管理**: 12+ 个接口
19. **生命周期规则**: 20+ 个接口
20. **GPU资源管理**: 15+ 个接口
21. **调度器**: 25+ 个接口
22. **提供商管理**: 10+ 个接口
23. **工单管理**: 15+ 个接口
24. **帮助系统**: 20+ 个接口

---

## 关键注意事项

1. **WebSocket连接**：
   - 通知服务使用 Socket.IO 连接到 `localhost:30006`
   - 用于实时推送通知、设备状态更新等

2. **文件上传**：
   - `/apps/upload` - APK上传
   - `/tickets/attachments/upload` - 工单附件上传
   - 需要 `Content-Type: multipart/form-data`

3. **文件下载**：
   - `/billing/bills/{id}/download` - 账单下载
   - `/billing/invoices/{id}/download` - 发票下载
   - `/reports/bills/{userId}/export` - 导出账单
   - `/admin/payments/export/excel` - 导出支付数据
   - 响应类型为 `blob`

4. **分页方式**：
   - 传统分页：`page`, `pageSize` (limit)
   - 游标分页：`cursor`, `pageSize` (高性能)

5. **鉴权**：
   - 大多数API需要 JWT token（除了登录、注册、忘记密码等）
   - 某些管理员端点需要特定权限

