================================================================================
FRONTEND USER 应用 - API 服务调用完全分析
================================================================================

## 1. 认证相关 (auth.ts, twoFactor.ts)

认证模块负责用户身份验证、登录、注册、密码管理和两步验证。

### 1.1 基础认证
- [GET]  /auth/captcha
  功能: 获取图形验证码
  调用位置: useLogin.tsx:25
  参数: 无
  返回: { id: string, svg: string }

- [POST] /auth/register
  功能: 用户注册
  调用位置: useLogin.tsx:113
  参数: RegisterDto (username, email, password, etc.)
  返回: User

- [POST] /auth/login
  功能: 用户登录
  调用位置: useLogin.tsx:48
  参数: LoginDto (username, password, captcha, captchaId)
  返回: { token: string, user: User }

- [GET]  /auth/me
  功能: 获取当前登录用户信息
  调用位置: Profile.tsx
  参数: 无
  返回: User

- [POST] /auth/logout
  功能: 登出
  调用位置: 全局导航
  参数: 无
  返回: void

### 1.2 密码管理
- [POST] /auth/forgot-password
  功能: 忘记密码 - 发送重置链接
  调用位置: useForgotPassword.tsx
  参数: { type: 'email'|'phone', email?: string, phone?: string }
  返回: void

- [GET]  /auth/verify-reset-token/{token}
  功能: 验证重置密码令牌
  调用位置: useResetPassword.tsx
  参数: token (路径参数)
  返回: { valid: boolean }

- [POST] /auth/reset-password
  功能: 重置密码
  调用位置: useResetPassword.tsx
  参数: { token: string, password: string }
  返回: void

- [POST] /auth/change-password
  功能: 修改密码（已登录用户）
  调用位置: Profile.tsx, user.ts
  参数: { oldPassword: string, newPassword: string }
  返回: void

### 1.3 双因素认证 (2FA)
- [GET]  /auth/2fa/generate
  功能: 生成2FA密钥和二维码
  调用位置: twoFactor.ts
  参数: 无
  返回: { secret: string, qrCode: string, otpauthUrl: string }

- [POST] /auth/2fa/enable
  功能: 启用双因素认证
  调用位置: twoFactor.ts, auth.ts
  参数: { token: string }
  返回: { qrCode: string, secret: string }

- [POST] /auth/2fa/verify
  功能: 验证2FA代码
  调用位置: useLogin.tsx:90
  参数: { username, password, captcha, captchaId, twoFactorToken }
  返回: { token: string, user: any }

- [POST] /auth/2fa/disable
  功能: 禁用双因素认证
  调用位置: twoFactor.ts, auth.ts
  参数: { password: string } or { code: string }
  返回: void

### 1.4 会话管理
- [GET]  /auth/login-history
  功能: 获取登录历史
  调用位置: Security Center
  参数: { startDate?, endDate?, success? }
  返回: LoginHistory[]

- [GET]  /auth/sessions
  功能: 获取活跃会话列表
  调用位置: Security Center
  参数: 无
  返回: Session[]

- [DELETE] /auth/sessions/{sessionId}
  功能: 终止单个会话
  调用位置: Security Center
  参数: sessionId (路径参数)
  返回: void

- [DELETE] /auth/sessions/all
  功能: 终止所有其他会话
  调用位置: Security Center
  参数: 无
  返回: void

================================================================================

## 2. 用户管理 (user.ts)

用户信息管理，包括个人资料、余额和偏好设置。

- [GET]  /users/me
  功能: 获取当前用户信息
  调用位置: Profile.tsx:10
  参数: 无
  返回: User

- [PATCH] /users/profile
  功能: 更新用户个人资料
  调用位置: Profile.tsx
  参数: { email?: string, phone?: string }
  返回: User

- [POST] /users/change-password
  功能: 修改密码（通过用户服务）
  调用位置: Profile.tsx
  参数: { oldPassword: string, newPassword: string }
  返回: void

- [GET]  /users/balance
  功能: 获取账户余额
  调用位置: useAccountBalance.tsx
  参数: 无
  返回: { balance: number }

- [POST] /users/recharge
  功能: 账户充值
  调用位置: Recharge.tsx
  参数: { amount: number }
  返回: { transactionId: string }

- [PATCH] /users/{userId}/preferences
  功能: 更新用户偏好设置
  调用位置: ProfilePreferences.tsx
  参数: { language?, theme?, preferences? }
  返回: void

================================================================================

## 3. 设备管理 (device.ts)

云手机设备的生命周期管理、查询和批量操作。

### 3.1 设备查询
- [GET]  /devices/my
  功能: 获取用户的设备列表
  调用位置: useDeviceList.tsx:29, useMyDevices (React Query)
  参数: { page: number, pageSize: number }
  返回: { data: Device[], total: number }

- [GET]  /devices/{id}
  功能: 获取设备详情
  调用位置: useDeviceDetail.tsx:21, useDevice (React Query)
  参数: id (路径参数)
  返回: Device

- [GET]  /devices/my/stats
  功能: 获取用户设备统计
  调用位置: useDeviceList.tsx:41
  参数: 无
  返回: { total, running, stopped }

- [GET]  /devices/{id}/stats
  功能: 获取单个设备的资源统计
  调用位置: useDeviceMonitor.tsx
  参数: id (路径参数)
  返回: DeviceStats

### 3.2 设备操作
- [POST] /devices/{id}/start
  功能: 启动设备
  调用位置: useDeviceList.tsx:56, useDeviceDetail.tsx:41, useStartDevice (React Query)
  参数: id (路径参数)
  返回: void

- [POST] /devices/{id}/stop
  功能: 停止设备
  调用位置: useDeviceList.tsx:70, useDeviceDetail.tsx:53, useStopDevice (React Query)
  参数: id (路径参数)
  返回: void

- [POST] /devices/{id}/reboot
  功能: 重启设备
  调用位置: useDeviceList.tsx:84, useDeviceDetail.tsx:65, useRebootDevice (React Query)
  参数: id (路径参数)
  返回: void

### 3.3 设备创建
- [POST] /devices
  功能: 创建新设备
  调用位置: CreateDevice.tsx
  参数: CreateDeviceDto (name, description, type, cpuCores, memoryMB, etc.)
  返回: { sagaId: string, device: Device }

- [GET]  /devices/saga/{sagaId}
  功能: 查询设备创建进度（Saga状态）
  调用位置: CreateDevice.tsx (轮询)
  参数: sagaId (路径参数)
  返回: { status: 'pending'|'completed'|'failed', currentStep, device?, error? }

### 3.4 批量操作
- [POST] /devices/batch/start
  功能: 批量启动设备
  调用位置: useBatchDeviceOperation.tsx:83
  参数: { deviceIds: string[] }
  返回: { results: [{ deviceId, success, error? }] }

- [POST] /devices/batch/stop
  功能: 批量停止设备
  调用位置: useBatchDeviceOperation.tsx:135
  参数: { deviceIds: string[] }
  返回: { results: [{ deviceId, success, error? }] }

- [POST] /devices/batch/restart
  功能: 批量重启设备
  调用位置: useBatchDeviceOperation.tsx:184
  参数: { deviceIds: string[] }
  返回: { results: [{ deviceId, success, error? }] }

- [DELETE] /devices/batch
  功能: 批量删除设备
  调用位置: useBatchDeviceOperation.tsx:237
  参数: { deviceIds: string[] }
  返回: { results: [{ deviceId, success, error? }] }

- [POST] /devices/batch/install-app
  功能: 批量安装应用
  调用位置: useBatchDeviceOperation.tsx:295
  参数: { appId: string, deviceIds: string[] }
  返回: { results: [{ deviceId, success, error? }] }

================================================================================

## 4. 应用管理 (app.ts)

应用市场浏览、安装和卸载管理。

### 4.1 应用查询
- [GET]  /apps
  功能: 获取应用列表
  调用位置: useAppMarket.tsx
  参数: { page?, pageSize?, category?, search? }
  返回: { items: Application[], total: number }

- [GET]  /apps/{id}
  功能: 获取应用详情
  调用位置: AppDetail.tsx
  参数: id (路径参数)
  返回: Application

### 4.2 应用安装
- [POST] /apps/install
  功能: 安装应用到设备
  调用位置: useAppMarket.tsx, AppDetail.tsx
  参数: { deviceId: string, appId: string }
  返回: void

### 4.3 已安装应用管理
- [GET]  /devices/{deviceId}/installed-apps
  功能: 获取设备已安装应用列表
  调用位置: useInstalledApps.tsx
  参数: deviceId (路径参数)
  返回: InstalledAppInfo[]

- [DELETE] /devices/{deviceId}/apps/{packageName}
  功能: 卸载应用
  调用位置: useInstalledApps.tsx
  参数: deviceId, packageName (路径参数)
  返回: void

- [POST] /devices/{deviceId}/apps/batch-uninstall
  功能: 批量卸载应用
  调用位置: useInstalledApps.tsx
  参数: deviceId (路径), { packageNames: string[] }
  返回: { results: [{ packageName, success, error? }] }

- [POST] /devices/{deviceId}/apps/{packageName}/update
  功能: 更新应用
  调用位置: useInstalledApps.tsx
  参数: deviceId, packageName (路径参数)
  返回: void

================================================================================

## 5. 账单和订单 (billing.ts, order.ts)

账单查询、支付管理和订单处理。

### 5.1 账单管理
- [GET]  /billing/bills
  功能: 获取账单列表
  调用位置: useBillList.tsx:42
  参数: { page?, pageSize?, type?, status?, startDate?, endDate?, minAmount?, maxAmount?, keyword? }
  返回: { items: Bill[], total, page, pageSize }

- [GET]  /billing/bills/{id}
  功能: 获取账单详情
  调用位置: useBillDetail.tsx
  参数: id (路径参数)
  返回: Bill

- [GET]  /billing/stats
  功能: 获取账单统计
  调用位置: useBillList.tsx:55
  参数: { startDate?, endDate? }
  返回: BillStats

- [POST] /billing/bills/{id}/cancel
  功能: 取消账单
  调用位置: useBillList.tsx
  参数: id (路径参数)
  返回: void

- [POST] /billing/bills/{id}/refund
  功能: 申请退款
  调用位置: useBillDetail.tsx
  参数: id (路径), { reason: string }
  返回: void

- [GET]  /billing/bills/{id}/download
  功能: 下载账单PDF
  调用位置: useBillList.tsx:152
  参数: id (路径参数)
  返回: Blob

### 5.2 支付管理
- [POST] /billing/pay
  功能: 支付账单
  调用位置: useBillList.tsx:111
  参数: { billId, paymentMethod, amount? }
  返回: { success, transactionId?, redirectUrl?, message? }

- [GET]  /billing/payment-methods
  功能: 获取支付方式列表
  调用位置: usePaymentMethods.tsx
  参数: 无
  返回: [{ method, enabled, icon, name }]

### 5.3 发票管理
- [POST] /billing/invoices
  功能: 申请发票
  调用位置: useInvoiceList.tsx
  参数: { billId, type, title, taxId?, email, address?, phone? }
  返回: Invoice

- [GET]  /billing/invoices
  功能: 获取发票列表
  调用位置: useInvoiceList.tsx
  参数: { page?, pageSize? }
  返回: { items: Invoice[], total }

- [GET]  /billing/invoices/{id}/download
  功能: 下载发票
  调用位置: useInvoiceList.tsx
  参数: id (路径参数)
  返回: Blob

### 5.4 订单管理
- [POST] /billing/orders
  功能: 创建订单
  调用位置: PlanPurchase.tsx, useCreateOrder (React Query)
  参数: CreateOrderDto
  返回: Order

- [GET]  /billing/orders/my
  功能: 获取我的订单列表
  调用位置: MyOrders.tsx, useMyOrders (React Query)
  参数: { page?, pageSize? }
  返回: { items: Order[], total }

- [GET]  /billing/orders/{id}
  功能: 获取订单详情
  调用位置: useOrder (React Query)
  参数: id (路径参数)
  返回: Order

- [POST] /billing/orders/{id}/cancel
  功能: 取消订单
  调用位置: MyOrders.tsx, useCancelOrder (React Query)
  参数: id (路径参数)
  返回: void

### 5.5 套餐和使用记录
- [GET]  /billing/plans
  功能: 获取套餐列表
  调用位置: useHome.tsx, PlanPurchase.tsx
  参数: { page?, pageSize? }
  返回: { data: Plan[], total, page, pageSize }

- [GET]  /billing/usage/my
  功能: 获取使用记录
  调用位置: UsageRecords.tsx
  参数: { page?, pageSize?, startDate?, endDate? }
  返回: PaginatedResponse<UsageRecord>

### 5.6 支付相关
- [POST] /payments
  功能: 创建支付
  调用位置: PlanPurchase.tsx, Recharge.tsx
  参数: CreatePaymentDto
  返回: Payment

- [POST] /payments/query
  功能: 查询支付状态
  调用位置: PlanPurchase.tsx, Recharge.tsx
  参数: { paymentNo: string }
  返回: Payment

- [GET]  /payments/{id}
  功能: 获取支付详情
  调用位置: 支付确认页面
  参数: id (路径参数)
  返回: Payment

================================================================================

## 6. 快照管理 (snapshot.ts)

设备快照备份和恢复功能。

- [GET]  /snapshots/device/{deviceId}
  功能: 获取设备的所有快照
  调用位置: useDeviceSnapshots.tsx
  参数: deviceId (路径参数)
  返回: Snapshot[]

- [POST] /snapshots/device/{deviceId}
  功能: 创建快照
  调用位置: useDeviceSnapshots.tsx
  参数: deviceId (路径), { name: string, description?: string }
  返回: Snapshot

- [POST] /snapshots/{snapshotId}/restore
  功能: 恢复快照
  调用位置: useDeviceSnapshots.tsx
  参数: snapshotId (路径参数)
  返回: void

- [DELETE] /snapshots/{snapshotId}
  功能: 删除快照
  调用位置: useDeviceSnapshots.tsx
  参数: snapshotId (路径参数)
  返回: void

- [GET]  /snapshots/{snapshotId}
  功能: 获取快照详情
  调用位置: useDeviceSnapshots.tsx
  参数: snapshotId (路径参数)
  返回: Snapshot

- [GET]  /snapshots
  功能: 获取用户的所有快照
  调用位置: useDeviceSnapshots.tsx
  参数: 无
  返回: Snapshot[]

================================================================================

## 7. 工单管理 (ticket.ts)

技术支持工单系统。

- [GET]  /tickets
  功能: 获取工单列表
  调用位置: useTicketList.tsx:50
  参数: { page?, pageSize?, status?, type?, priority?, keyword?, sortBy?, sortOrder? }
  返回: { items: Ticket[], total, page, pageSize }

- [GET]  /tickets/{id}
  功能: 获取工单详情
  调用位置: useTicketDetail.tsx
  参数: id (路径参数)
  返回: Ticket

- [POST] /tickets
  功能: 创建工单
  调用位置: TicketCreate.tsx
  参数: { title, type, priority, description, tags?, attachmentIds? }
  返回: Ticket

- [PUT]  /tickets/{id}
  功能: 更新工单
  调用位置: useTicketDetail.tsx
  参数: id (路径), Partial<CreateTicketDto>
  返回: Ticket

- [POST] /tickets/{id}/close
  功能: 关闭工单
  调用位置: useTicketDetail.tsx
  参数: id (路径参数)
  返回: void

- [POST] /tickets/{id}/reopen
  功能: 重新打开工单
  调用位置: useTicketDetail.tsx
  参数: id (路径参数)
  返回: void

- [GET]  /tickets/{ticketId}/replies
  功能: 获取工单回复列表
  调用位置: useTicketDetail.tsx
  参数: ticketId (路径参数)
  返回: TicketReply[]

- [POST] /tickets/{ticketId}/replies
  功能: 添加工单回复
  调用位置: useTicketDetail.tsx
  参数: ticketId (路径), { content: string, attachmentIds?: string[] }
  返回: TicketReply

- [POST] /tickets/attachments/upload
  功能: 上传附件
  调用位置: useTicketDetail.tsx
  参数: FormData { file }
  返回: Attachment

- [DELETE] /tickets/attachments/{id}
  功能: 删除附件
  调用位置: useTicketDetail.tsx
  参数: id (路径参数)
  返回: void

- [GET]  /tickets/stats
  功能: 获取工单统计
  调用位置: useTicketList.tsx:65
  参数: 无
  返回: TicketStats

================================================================================

## 8. 通知和消息 (notification.ts)

系统通知、消息管理和偏好设置。

### 8.1 消息查询
- [GET]  /notifications
  功能: 获取消息列表
  调用位置: useMessageList.tsx:42
  参数: { page?, pageSize?, status?, type?, priority?, startDate?, endDate? }
  返回: { items: Notification[], total, unreadCount, page, pageSize }

- [GET]  /notifications/{id}
  功能: 获取消息详情
  调用位置: useMessageList.tsx
  参数: id (路径参数)
  返回: Notification

- [GET]  /notifications/unread-count
  功能: 获取未读消息数
  调用位置: 全局导航/头部
  参数: 无
  返回: { count: number }

### 8.2 消息操作
- [POST] /notifications/mark-read
  功能: 标记消息为已读
  调用位置: useMessageList.tsx:120
  参数: { ids: string[] }
  返回: void

- [POST] /notifications/mark-all-read
  功能: 标记所有消息为已读
  调用位置: useMessageList.tsx:136
  参数: 无
  返回: void

- [POST] /notifications/delete
  功能: 删除消息
  调用位置: useMessageList.tsx:158
  参数: { ids: string[] }
  返回: void

- [POST] /notifications/clear-read
  功能: 清空所有已读消息
  调用位置: useMessageList.tsx:177
  参数: 无
  返回: void

### 8.3 通知统计和设置
- [GET]  /notifications/stats
  功能: 获取通知统计
  调用位置: useMessageList.tsx:55
  参数: 无
  返回: NotificationStats

- [GET]  /notifications/settings
  功能: 获取通知设置
  调用位置: useMessageSettings.tsx
  参数: 无
  返回: NotificationSettings

- [PUT]  /notifications/settings
  功能: 更新通知设置
  调用位置: useMessageSettings.tsx
  参数: Partial<NotificationSettings>
  返回: NotificationSettings

### 8.4 WebSocket 连接
- WebSocket 事件: notification, unread-count
  连接URL: import.meta.env.VITE_NOTIFICATION_WS_URL (默认: http://localhost:30006)
  认证: 通过query参数 ?userId=xxx
  调用位置: notification.ts:NotificationWebSocket

================================================================================

## 9. 帮助中心 (help.ts)

知识库、FAQ和教程管理。

### 9.1 分类和文章
- [GET]  /help/categories
  功能: 获取帮助分类列表
  调用位置: useHelpCenter.tsx
  参数: 无
  返回: HelpCategory[]

- [GET]  /help/articles
  功能: 获取文章列表
  调用位置: useHelpCenter.tsx
  参数: { categoryId?, keyword?, tags?, page?, pageSize?, sortBy?, sortOrder? }
  返回: { items: HelpArticle[], total, page, pageSize }

- [GET]  /help/articles/{id}
  功能: 获取文章详情
  调用位置: HelpCenter.tsx
  参数: id (路径参数)
  返回: HelpArticle

- [GET]  /help/articles/popular
  功能: 获取热门文章
  调用位置: useHelpCenter.tsx
  参数: { limit?: number }
  返回: HelpArticle[]

- [GET]  /help/articles/latest
  功能: 获取最新文章
  调用位置: useHelpCenter.tsx
  参数: { limit?: number }
  返回: HelpArticle[]

- [GET]  /help/articles/{id}/related
  功能: 获取相关文章
  调用位置: HelpCenter.tsx
  参数: id (路径参数)
  返回: HelpArticle[]

### 9.2 FAQ
- [GET]  /help/faqs
  功能: 获取FAQ列表
  调用位置: FAQList.tsx
  参数: { category?, keyword?, page?, pageSize? }
  返回: { items: FAQ[], total, page, pageSize }

- [GET]  /help/faqs/{id}
  功能: 获取FAQ详情
  调用位置: FAQList.tsx
  参数: id (路径参数)
  返回: FAQ

### 9.3 教程
- [GET]  /help/tutorials
  功能: 获取教程列表
  调用位置: TutorialList.tsx
  参数: { difficulty?, keyword?, tags?, page?, pageSize? }
  返回: { items: Tutorial[], total, page, pageSize }

- [GET]  /help/tutorials/{id}
  功能: 获取教程详情
  调用位置: TutorialDetail.tsx
  参数: id (路径参数)
  返回: Tutorial

### 9.4 搜索和互动
- [GET]  /help/search
  功能: 搜索帮助内容
  调用位置: useHelpCenter.tsx
  参数: { keyword: string }
  返回: { articles: [], faqs: [], tutorials: [] }

- [POST] /help/articles/{id}/helpful
  功能: 标记文章有帮助
  调用位置: HelpCenter.tsx
  参数: id (路径参数)
  返回: void

- [POST] /help/articles/{id}/view
  功能: 记录文章浏览
  调用位置: HelpCenter.tsx
  参数: id (路径参数)
  返回: void

- [POST] /help/faqs/{id}/view
  功能: 记录FAQ浏览
  调用位置: FAQList.tsx
  参数: id (路径参数)
  返回: void

- [POST] /help/tutorials/{id}/view
  功能: 记录教程浏览
  调用位置: TutorialDetail.tsx
  参数: id (路径参数)
  返回: void

- [POST] /help/articles/{id}/like
  功能: 点赞文章
  调用位置: HelpCenter.tsx
  参数: id (路径参数)
  返回: void

- [POST] /help/tutorials/{id}/like
  功能: 点赞教程
  调用位置: TutorialDetail.tsx
  参数: id (路径参数)
  返回: void

- [POST] /help/feedback
  功能: 提交反馈
  调用位置: HelpCenter.tsx
  参数: { type, relatedId?, relatedType?, content?, contact? }
  返回: void

- [GET]  /help/tags/popular
  功能: 获取热门标签
  调用位置: useHelpCenter.tsx
  参数: 无
  返回: PopularTag[]

================================================================================

## 10. 数据导出 (export.ts)

用户数据导出管理。

- [POST] /export/tasks
  功能: 创建导出任务
  调用位置: useExportCenter.tsx:101
  参数: { dataType, format, startDate?, endDate?, filters?, columns? }
  返回: ExportTask

- [GET]  /export/tasks
  功能: 获取导出任务列表
  调用位置: useExportCenter.tsx:47
  参数: { page?, pageSize?, dataType?, status?, startDate?, endDate? }
  返回: { items: ExportTask[], total, page, pageSize }

- [GET]  /export/tasks/{id}
  功能: 获取导出任务详情
  调用位置: useExportCenter.tsx
  参数: id (路径参数)
  返回: ExportTask

- [DELETE] /export/tasks/{id}
  功能: 删除导出任务
  调用位置: useExportCenter.tsx:131
  参数: id (路径参数)
  返回: void

- [POST] /export/tasks/batch-delete
  功能: 批量删除导出任务
  调用位置: useExportCenter.tsx:143
  参数: { ids: string[] }
  返回: void

- [POST] /export/tasks/{id}/retry
  功能: 重试失败的导出任务
  调用位置: useExportCenter.tsx:156
  参数: id (路径参数)
  返回: ExportTask

- [POST] /export/tasks/{id}/cancel
  功能: 取消导出任务
  调用位置: useExportCenter.tsx
  参数: id (路径参数)
  返回: void

- [GET]  /export/tasks/{id}/download
  功能: 下载导出文件
  调用位置: useExportCenter.tsx:120
  参数: id (路径参数)
  返回: Blob

- [GET]  /export/stats
  功能: 获取导出统计
  调用位置: useExportCenter.tsx:60
  参数: 无
  返回: ExportStats

- [GET]  /export/data-types
  功能: 获取数据类型配置
  调用位置: useExportCenter.tsx
  参数: 无
  返回: Record<ExportDataType, DataTypeConfig>

- [POST] /export/tasks/clear-completed
  功能: 清空已完成的导出任务
  调用位置: useExportCenter.tsx:167
  参数: 无
  返回: void

- [POST] /export/tasks/clear-failed
  功能: 清空已失败的导出任务
  调用位置: useExportCenter.tsx:179
  参数: 无
  返回: void

- [POST] /export/estimate
  功能: 获取预估导出记录数
  调用位置: useExportCenter.tsx
  参数: { dataType, startDate?, endDate?, filters? }
  返回: { count: number, estimatedSize: string }

================================================================================

## 11. 活动和优惠券 (activity.ts)

营销活动管理、优惠券和奖励。

- [GET]  /api/activities
  功能: 获取活动列表
  调用位置: useActivityCenter.tsx
  参数: { type?, status?, page?, pageSize? }
  返回: { data: Activity[], total, page, pageSize }

- [GET]  /api/activities/{id}
  功能: 获取活动详情
  调用位置: useActivityDetail.tsx
  参数: id (路径参数)
  返回: Activity

- [POST] /api/activities/{id}/participate
  功能: 参与活动
  调用位置: useActivityCenter.tsx
  参数: id (路径参数)
  返回: { participation, rewards, message }

- [GET]  /api/activities/my/participations
  功能: 获取我的参与记录
  调用位置: useActivityCenter.tsx
  参数: { activityId?, page?, pageSize? }
  返回: { data: Participation[], total, page, pageSize }

- [GET]  /api/coupons/my
  功能: 获取我的优惠券
  调用位置: useMyCoupons.tsx
  参数: { status?, page?, pageSize? }
  返回: { data: Coupon[], total, page, pageSize }

- [POST] /api/coupons/{couponId}/use
  功能: 使用优惠券
  调用位置: useMyCoupons.tsx
  参数: couponId (路径), { orderId }
  返回: { success, message, discount }

- [POST] /api/activities/{activityId}/claim-coupon
  功能: 领取优惠券
  调用位置: useActivityCenter.tsx
  参数: activityId (路径参数)
  返回: { coupon, message }

- [GET]  /api/activities/stats
  功能: 获取活动统计
  调用位置: useActivityCenter.tsx
  参数: 无
  返回: { totalActivities, ongoingActivities, myCoupons, availableCoupons, ... }

================================================================================

## 12. 邀请返利 (referral.ts)

邀请返利系统和提现管理。

- [GET]  /api/referral/config
  功能: 获取邀请配置
  调用位置: useReferralCenter.tsx
  参数: 无
  返回: ReferralConfig

- [POST] /api/referral/generate-code
  功能: 生成邀请码
  调用位置: useReferralCenter.tsx
  参数: 无
  返回: { code, link, qrCodeUrl }

- [GET]  /api/referral/stats
  功能: 获取邀请统计
  调用位置: useReferralCenter.tsx
  参数: 无
  返回: ReferralStats

- [GET]  /api/referral/records
  功能: 获取邀请记录
  调用位置: ReferralRecords.tsx
  参数: { status?, page?, pageSize?, startDate?, endDate? }
  返回: { data: ReferralRecord[], total, page, pageSize }

- [GET]  /api/referral/withdrawals
  功能: 获取提现记录
  调用位置: ReferralRecords.tsx
  参数: { status?, page?, pageSize? }
  返回: { data: WithdrawRecord[], total, page, pageSize }

- [POST] /api/referral/withdraw
  功能: 申请提现
  调用位置: useReferralCenter.tsx
  参数: { amount, method, account, accountName?, remark? }
  返回: { withdrawId, message, estimatedArrival }

- [POST] /api/referral/withdrawals/{withdrawId}/cancel
  功能: 取消提现
  调用位置: useReferralCenter.tsx
  参数: withdrawId (路径参数)
  返回: { success, message }

- [POST] /api/referral/generate-poster
  功能: 生成邀请海报
  调用位置: useReferralCenter.tsx
  参数: 无
  返回: { posterUrl }

- [GET]  /api/referral/earnings
  功能: 获取收益明细
  调用位置: useReferralCenter.tsx
  参数: { type?, page?, pageSize?, startDate?, endDate? }
  返回: { data: EarningRecord[], total, page, pageSize }

- [POST] /api/referral/share
  功能: 分享到社交平台
  调用位置: useReferralCenter.tsx
  参数: { platform: 'wechat'|'qq'|'weibo'|'link', inviteCode }
  返回: { shareUrl, shareText }

================================================================================

## 13. 媒体和WebRTC (media.ts)

实时媒体流和WebRTC会话管理。

- [POST] /media/sessions
  功能: 创建WebRTC会话
  调用位置: useWebRTC.tsx
  参数: { deviceId, offer }
  返回: WebRTCSession

- [POST] /media/sessions/answer
  功能: 设置WebRTC answer
  调用位置: useWebRTC.tsx
  参数: { sessionId, answer }
  返回: void

- [POST] /media/sessions/ice-candidate
  功能: 添加ICE候选
  调用位置: useWebRTC.tsx
  参数: { sessionId, candidate: RTCIceCandidateInit }
  返回: void

- [GET]  /media/sessions/{id}
  功能: 获取WebRTC会话
  调用位置: useWebRTC.tsx
  参数: id (路径参数)
  返回: WebRTCSession

- [DELETE] /media/sessions/{id}
  功能: 关闭WebRTC会话
  调用位置: useWebRTC.tsx
  参数: id (路径参数)
  返回: void

- [GET]  /media/stats
  功能: 获取媒体统计信息
  调用位置: useWebRTC.tsx
  参数: 无
  返回: MediaStats

================================================================================

## API 端点统计

总计：110+ 个 API 端点

按模块分类：
- 认证和会话: 20 个
- 用户管理: 6 个
- 设备管理: 19 个
- 应用管理: 8 个
- 账单和订单: 15 个
- 快照管理: 6 个
- 工单管理: 10 个
- 通知和消息: 8 个
- 帮助中心: 18 个
- 数据导出: 11 个
- 活动和优惠券: 8 个
- 邀请返利: 10 个
- 媒体和WebRTC: 6 个

================================================================================

## 关键技术细节

### HTTP方法分布
- GET:   45+ 个
- POST:  50+ 个
- PUT:   1 个
- PATCH: 2 个
- DELETE: 7+ 个

### 认证方式
- JWT Token (localStorage)
- 存储位置: localStorage.token

### 基础URL
- API Gateway: 由 VITE_API_URL 环境变量配置（默认: http://localhost:30000）
- WebSocket: 由 VITE_NOTIFICATION_WS_URL 配置（默认: http://localhost:30006）

### 请求库
- axios 包装的 request 工具
- 统一的错误处理和拦截器

### 状态管理
- React Query (@tanstack/react-query) 用于 device 和 order 查询
- useState + useCallback 用于本地状态

================================================================================
