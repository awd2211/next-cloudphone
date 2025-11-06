-- ========================================
-- 角色化通知模板种子数据
-- Date: 2025-11-03
-- Description: 为核心事件创建角色特定的通知模板
-- ========================================

-- 注意：运行此脚本前，请确保已运行 20251103_add_role_fields.sql

-- ========================================
-- 1. Device Events 角色化模板（7个事件 × 3个角色 = 21个模板）
-- ========================================

-- 1.1 device.created (设备创建) - 角色化模板
-- --------------------------------------

-- Super Admin 模板：显示系统级统计和技术细节
INSERT INTO notification_templates (
  code, name, type, title, body,
  channels, target_roles, priority, role_specific_data,
  is_active, description, language
) VALUES (
  'device.created.super_admin',
  '设备创建通知（超级管理员）',
  'device.created',
  '🚀 系统新增设备 - {{deviceName}}',
  '用户创建了新设备 {{deviceName}}。

📊 设备信息：
  • 设备ID: {{deviceId}}
  • 设备类型: {{deviceType}}
  • Provider: {{providerDisplayName}}
  • 配置: {{cpuCores}}核 / {{memoryMB}}MB / {{diskSizeGB}}GB

🔧 技术信息：
  • 创建时间: {{createdAt}}
  • 租户ID: {{tenantId}}
  • 用户ID: {{userId}}

📈 系统统计：
  • 当前在线设备: {{systemStats.onlineDevices}}
  • 今日新增设备: {{systemStats.todayCreated}}
  • 总设备数: {{systemStats.totalDevices}}

查看设备详情: {{deviceUrl}}
管理后台: {{adminDashboardUrl}}',
  ARRAY['websocket', 'email']::text[],
  ARRAY['super_admin']::text[],
  100,
  '{
    "showSystemStats": true,
    "showTechnicalDetails": true,
    "includeAllTenants": true,
    "adminDashboardUrl": "/admin/devices/statistics"
  }'::jsonb,
  true,
  '超级管理员专用：包含系统统计和所有技术细节',
  'zh-CN'
);

-- Tenant Admin 模板：显示租户范围的统计
INSERT INTO notification_templates (
  code, name, type, title, body,
  channels, target_roles, priority, role_specific_data,
  is_active, description, language
) VALUES (
  'device.created.tenant_admin',
  '设备创建通知（租户管理员）',
  'device.created',
  '✨ 租户新增设备 - {{deviceName}}',
  '用户在您的租户下创建了新设备 {{deviceName}}。

📊 设备信息：
  • 设备类型: {{deviceType}}
  • Provider: {{providerDisplayName}}
  • 配置: {{cpuCores}}核 / {{memoryMB}}MB RAM

📈 租户统计：
  • 租户设备总数: {{tenantStats.totalDevices}}
  • 今日新增: {{tenantStats.todayCreated}}
  • 在线设备数: {{tenantStats.onlineDevices}}
  • 配额使用: {{tenantStats.quotaUsage}}%

查看设备: {{deviceUrl}}
租户管理: {{tenantDashboardUrl}}',
  ARRAY['websocket', 'email']::text[],
  ARRAY['tenant_admin']::text[],
  90,
  '{
    "showTenantStats": true,
    "showQuotaInfo": true,
    "tenantScope": true,
    "tenantDashboardUrl": "/tenant/devices"
  }'::jsonb,
  true,
  '租户管理员专用：显示租户范围的统计信息',
  'zh-CN'
);

-- Admin 模板：显示管理视角
INSERT INTO notification_templates (
  code, name, type, title, body,
  channels, target_roles, priority, role_specific_data,
  is_active, description, language
) VALUES (
  'device.created.admin',
  '设备创建通知（管理员）',
  'device.created',
  '📱 新增设备 - {{deviceName}}',
  '用户创建了新设备 {{deviceName}}。

📊 设备信息：
  • 设备类型: {{deviceType}}
  • Provider: {{providerDisplayName}}
  • 配置: {{cpuCores}}核 / {{memoryMB}}MB

⚙️ 管理操作：
  • 查看设备详情: {{deviceUrl}}
  • 设备管理: {{adminDeviceUrl}}

💡 提示：新设备已自动启动配置检查。',
  ARRAY['websocket']::text[],
  ARRAY['admin']::text[],
  80,
  '{
    "showManagementLinks": true,
    "adminDeviceUrl": "/admin/devices"
  }'::jsonb,
  true,
  '管理员专用：提供管理视角和操作链接',
  'zh-CN'
);

-- 1.2 device.started (设备启动) - 角色化模板
-- --------------------------------------

INSERT INTO notification_templates (
  code, name, type, title, body,
  channels, target_roles, priority, role_specific_data,
  is_active, description, language
) VALUES (
  'device.started.super_admin',
  '设备启动通知（超级管理员）',
  'device.started',
  '▶️ 系统设备启动 - {{deviceName}}',
  '设备 {{deviceName}} 已启动。

📊 设备信息：
  • 设备ID: {{deviceId}}
  • Provider: {{providerDisplayName}}
  • 启动时间: {{startedAt}}

🔧 技术状态：
  • 端口分配: {{portInfo}}
  • 容器状态: {{containerStatus}}
  • 资源分配: 已完成

📈 系统负载：
  • 当前在线: {{systemStats.onlineDevices}}
  • CPU使用: {{systemStats.cpuUsage}}%
  • 内存使用: {{systemStats.memoryUsage}}%',
  ARRAY['websocket']::text[],
  ARRAY['super_admin']::text[],
  100,
  '{
    "showSystemLoad": true,
    "showTechnicalStatus": true,
    "includePortInfo": true
  }'::jsonb,
  true,
  '超级管理员专用：包含系统负载和技术状态',
  'zh-CN'
),
(
  'device.started.tenant_admin',
  '设备启动通知（租户管理员）',
  'device.started',
  '▶️ 设备已启动 - {{deviceName}}',
  '设备 {{deviceName}} 已启动。

📊 设备信息：
  • Provider: {{providerDisplayName}}
  • 启动时间: {{startedAt}}

📈 租户状态：
  • 在线设备: {{tenantStats.onlineDevices}}
  • 资源使用: {{tenantStats.resourceUsage}}%',
  ARRAY['websocket']::text[],
  ARRAY['tenant_admin']::text[],
  90,
  '{
    "showTenantStats": true,
    "showResourceUsage": true
  }'::jsonb,
  true,
  '租户管理员专用：显示租户资源使用情况',
  'zh-CN'
);

-- 1.3 device.stopped (设备停止) - 角色化模板
-- --------------------------------------

INSERT INTO notification_templates (
  code, name, type, title, body,
  channels, target_roles, priority, role_specific_data,
  is_active, description, language
) VALUES (
  'device.stopped.super_admin',
  '设备停止通知（超级管理员）',
  'device.stopped',
  '⏸️ 系统设备停止 - {{deviceName}}',
  '设备 {{deviceName}} 已停止。

📊 设备信息：
  • 设备ID: {{deviceId}}
  • Provider: {{providerDisplayName}}
  • 停止时间: {{stoppedAt}}
  • 运行时长: {{duration}}秒

💰 计费信息：
  • 本次使用时长: {{formatDuration duration}}
  • 预估费用: ¥{{estimatedCost}}

🔧 停止原因: {{reason}}

📈 系统状态：
  • 当前在线: {{systemStats.onlineDevices}}
  • 可用资源: {{systemStats.availableResources}}',
  ARRAY['websocket', 'email']::text[],
  ARRAY['super_admin']::text[],
  100,
  '{
    "showBillingInfo": true,
    "showSystemStatus": true,
    "calculateCost": true
  }'::jsonb,
  true,
  '超级管理员专用：包含计费和系统资源信息',
  'zh-CN'
),
(
  'device.stopped.tenant_admin',
  '设备停止通知（租户管理员）',
  'device.stopped',
  '⏸️ 设备已停止 - {{deviceName}}',
  '设备 {{deviceName}} 已停止。

📊 设备信息：
  • 停止时间: {{stoppedAt}}
  • 运行时长: {{formatDuration duration}}

💰 费用信息：
  • 本次费用: ¥{{estimatedCost}}

📈 租户状态：
  • 在线设备: {{tenantStats.onlineDevices}}
  • 本月费用: ¥{{tenantStats.monthlySpending}}',
  ARRAY['websocket']::text[],
  ARRAY['tenant_admin']::text[],
  90,
  '{
    "showBillingInfo": true,
    "showTenantSpending": true
  }'::jsonb,
  true,
  '租户管理员专用：显示费用和租户开销',
  'zh-CN'
);

-- 1.4 device.deleted (设备删除) - 角色化模板
-- --------------------------------------

INSERT INTO notification_templates (
  code, name, type, title, body,
  channels, target_roles, priority, role_specific_data,
  is_active, description, language
) VALUES (
  'device.deleted.super_admin',
  '设备删除通知（超级管理员）',
  'device.deleted',
  '🗑️ 系统设备已删除 - {{deviceName}}',
  '设备 {{deviceName}} 已从系统中删除。

📊 设备信息：
  • 设备ID: {{deviceId}}
  • Provider: {{providerDisplayName}}
  • 删除时间: {{deletedAt}}
  • 删除原因: {{reason}}

🔧 技术信息：
  • 容器清理: 已完成
  • 端口释放: 已完成
  • 数据备份: {{backupStatus}}

📈 系统统计：
  • 剩余设备: {{systemStats.remainingDevices}}
  • 可用资源: {{systemStats.availableResources}}',
  ARRAY['websocket', 'email']::text[],
  ARRAY['super_admin']::text[],
  100,
  '{
    "showCleanupStatus": true,
    "showSystemImpact": true,
    "includeBackupInfo": true
  }'::jsonb,
  true,
  '超级管理员专用：包含清理状态和系统影响',
  'zh-CN'
),
(
  'device.deleted.tenant_admin',
  '设备删除通知（租户管理员）',
  'device.deleted',
  '🗑️ 设备已删除 - {{deviceName}}',
  '设备 {{deviceName}} 已删除。

📊 删除信息：
  • 删除时间: {{deletedAt}}
  • 删除原因: {{reason}}

📈 租户状态：
  • 剩余设备: {{tenantStats.remainingDevices}}
  • 配额释放: {{tenantStats.quotaReleased}}',
  ARRAY['websocket']::text[],
  ARRAY['tenant_admin']::text[],
  90,
  '{
    "showQuotaImpact": true,
    "showTenantStats": true
  }'::jsonb,
  true,
  '租户管理员专用：显示配额释放情况',
  'zh-CN'
);

-- 1.5 device.error (设备故障) - 角色化模板
-- --------------------------------------

INSERT INTO notification_templates (
  code, name, type, title, body,
  channels, target_roles, priority, role_specific_data,
  is_active, description, language
) VALUES (
  'device.error.super_admin',
  '设备故障通知（超级管理员）',
  'device.error',
  '⚠️ 系统设备故障 - {{deviceName}}',
  '设备 {{deviceName}} 发生故障。

🔴 故障信息：
  • 错误类型: {{errorType}}
  • 错误代码: {{errorCode}}
  • 错误信息: {{errorMessage}}
  • 发生时间: {{occurredAt}}

🔧 技术细节：
  • 设备ID: {{deviceId}}
  • Provider: {{providerDisplayName}}
  • 容器状态: {{containerStatus}}
  • 日志链接: {{logsUrl}}

⚡ 处理建议：
  {{troubleshootingSteps}}

📊 影响范围：
  • 优先级: {{priority}}
  • 影响用户: {{affectedUsers}}',
  ARRAY['websocket', 'email', 'sms']::text[],
  ARRAY['super_admin']::text[],
  100,
  '{
    "showTechnicalDetails": true,
    "includeLogs": true,
    "showTroubleshooting": true,
    "autoCreateTicket": true
  }'::jsonb,
  true,
  '超级管理员专用：完整的故障信息和处理建议',
  'zh-CN'
),
(
  'device.error.tenant_admin',
  '设备故障通知（租户管理员）',
  'device.error',
  '⚠️ 设备故障 - {{deviceName}}',
  '设备 {{deviceName}} 发生故障。

🔴 故障信息：
  • 错误信息: {{errorMessage}}
  • 发生时间: {{occurredAt}}

📞 支持信息：
  • 已自动通知技术团队
  • 工单编号: {{ticketId}}
  • 预计恢复: {{estimatedRecovery}}',
  ARRAY['websocket', 'email']::text[],
  ARRAY['tenant_admin']::text[],
  90,
  '{
    "showSupportInfo": true,
    "autoCreateTicket": true,
    "showEstimatedRecovery": true
  }'::jsonb,
  true,
  '租户管理员专用：简化的故障信息和支持信息',
  'zh-CN'
);

-- 1.6 device.connection_lost (连接丢失) - 角色化模板
-- --------------------------------------

INSERT INTO notification_templates (
  code, name, type, title, body,
  channels, target_roles, priority, role_specific_data,
  is_active, description, language
) VALUES (
  'device.connection_lost.super_admin',
  '设备连接丢失通知（超级管理员）',
  'device.connection_lost',
  '📡 系统设备失联 - {{deviceName}}',
  '设备 {{deviceName}} 失去连接。

⚠️ 连接信息：
  • 设备ID: {{deviceId}}
  • Provider: {{providerDisplayName}}
  • 最后在线: {{lastSeenAt}}
  • 失联时长: {{formatDuration lostDuration}}

🔧 网络状态：
  • 端口状态: {{portStatus}}
  • 容器状态: {{containerStatus}}
  • 网络检测: {{networkCheck}}

⚡ 自动操作：
  • 重连尝试: {{retryAttempts}}/3
  • 下次重试: {{nextRetryAt}}

📊 影响评估：
  • 相同节点设备: {{affectedDevices}}
  • 可能原因: {{possibleCauses}}',
  ARRAY['websocket', 'email', 'sms']::text[],
  ARRAY['super_admin']::text[],
  100,
  '{
    "showNetworkStatus": true,
    "showRetryInfo": true,
    "showImpactAssessment": true,
    "autoRetry": true
  }'::jsonb,
  true,
  '超级管理员专用：详细的网络状态和影响评估',
  'zh-CN'
),
(
  'device.connection_lost.tenant_admin',
  '设备连接丢失通知（租户管理员）',
  'device.connection_lost',
  '📡 设备失联 - {{deviceName}}',
  '设备 {{deviceName}} 失去连接。

⚠️ 连接信息：
  • 最后在线: {{lastSeenAt}}
  • 失联时长: {{formatDuration lostDuration}}

🔄 恢复进度：
  • 系统正在尝试重新连接
  • 预计恢复: {{estimatedRecovery}}

💡 建议：
  如长时间未恢复，请联系技术支持。',
  ARRAY['websocket', 'email']::text[],
  ARRAY['tenant_admin']::text[],
  90,
  '{
    "showRecoveryStatus": true,
    "showEstimatedRecovery": true,
    "includeSupportLink": true
  }'::jsonb,
  true,
  '租户管理员专用：简化的连接状态和恢复信息',
  'zh-CN'
);

-- 1.7 device.creation_failed (创建失败) - 角色化模板
-- --------------------------------------

INSERT INTO notification_templates (
  code, name, type, title, body,
  channels, target_roles, priority, role_specific_data,
  is_active, description, language
) VALUES (
  'device.creation_failed.super_admin',
  '设备创建失败通知（超级管理员）',
  'device.creation_failed',
  '❌ 系统设备创建失败 - {{deviceName}}',
  '设备 {{deviceName}} 创建失败。

🔴 失败信息：
  • 失败原因: {{reason}}
  • 错误代码: {{errorCode}}
  • Provider: {{providerDisplayName}}
  • 失败时间: {{failedAt}}

🔧 技术细节：
  • 失败阶段: {{failedStage}}
  • 错误日志: {{errorLogs}}
  • 用户ID: {{userId}}

📊 系统分析：
  • 相同错误: {{similarErrors}}次/今日
  • 成功率: {{successRate}}%
  • 可能原因: {{rootCause}}

⚡ 处理建议：
  {{resolutionSteps}}',
  ARRAY['websocket', 'email']::text[],
  ARRAY['super_admin']::text[],
  100,
  '{
    "showTechnicalDetails": true,
    "showErrorAnalysis": true,
    "showResolution": true,
    "trackPattern": true
  }'::jsonb,
  true,
  '超级管理员专用：详细的失败分析和处理建议',
  'zh-CN'
),
(
  'device.creation_failed.tenant_admin',
  '设备创建失败通知（租户管理员）',
  'device.creation_failed',
  '❌ 设备创建失败 - {{deviceName}}',
  '设备 {{deviceName}} 创建失败。

🔴 失败信息：
  • 失败原因: {{reason}}
  • 失败时间: {{failedAt}}

📞 支持信息：
  • 已通知技术团队
  • 可能原因: {{possibleReason}}
  • 建议: {{suggestion}}',
  ARRAY['websocket', 'email']::text[],
  ARRAY['tenant_admin']::text[],
  90,
  '{
    "showUserFriendlyReason": true,
    "showSuggestion": true,
    "includeSupportLink": true
  }'::jsonb,
  true,
  '租户管理员专用：用户友好的失败原因和建议',
  'zh-CN'
);

-- ========================================
-- 2. Billing Events 角色化模板（3个事件 × 2个角色 = 6个模板）
-- ========================================

-- 2.1 billing.low_balance (余额不足) - 角色化模板
-- --------------------------------------

INSERT INTO notification_templates (
  code, name, type, title, body,
  channels, target_roles, priority, role_specific_data,
  is_active, description, language
) VALUES (
  'billing.low_balance.tenant_admin',
  '余额不足警告（租户管理员）',
  'billing.low_balance',
  '💰 租户余额不足警告',
  '您的租户账户余额不足。

💰 账户信息：
  • 当前余额: ¥{{balance}}
  • 预警阈值: ¥{{threshold}}
  • 预计可用: {{daysRemaining}}天

📊 使用情况：
  • 本月消费: ¥{{monthlySpending}}
  • 日均消费: ¥{{dailyAverage}}
  • 活跃设备: {{activeDevices}}台

⚡ 建议操作：
  • 立即充值: {{rechargeUrl}}
  • 查看账单: {{billingUrl}}
  • 调整配额: {{quotaUrl}}',
  ARRAY['websocket', 'email', 'sms']::text[],
  ARRAY['tenant_admin']::text[],
  100,
  '{
    "showSpendingAnalysis": true,
    "showActionLinks": true,
    "includeRecommendations": true
  }'::jsonb,
  true,
  '租户管理员专用：详细的消费分析和操作建议',
  'zh-CN'
),
(
  'billing.low_balance.super_admin',
  '余额不足警告（超级管理员）',
  'billing.low_balance',
  '💰 系统余额预警 - 租户 {{tenantName}}',
  '租户 {{tenantName}} 余额不足。

💰 账户信息：
  • 租户ID: {{tenantId}}
  • 当前余额: ¥{{balance}}
  • 预警阈值: ¥{{threshold}}

📊 租户分析：
  • 注册时长: {{tenantAge}}天
  • 总消费: ¥{{totalSpending}}
  • 月均消费: ¥{{monthlyAverage}}
  • 付费状态: {{paymentStatus}}

⚠️ 风险评估：
  • 欠费风险: {{riskLevel}}
  • 可能影响: {{potentialImpact}}

📞 联系信息：
  • 管理员: {{adminContact}}',
  ARRAY['websocket', 'email']::text[],
  ARRAY['super_admin']::text[],
  95,
  '{
    "showTenantAnalysis": true,
    "showRiskAssessment": true,
    "includeContactInfo": true
  }'::jsonb,
  true,
  '超级管理员专用：租户财务风险评估',
  'zh-CN'
);

-- 2.2 billing.payment_success (支付成功) - 角色化模板
-- --------------------------------------

INSERT INTO notification_templates (
  code, name, type, title, body,
  channels, target_roles, priority, role_specific_data,
  is_active, description, language
) VALUES (
  'billing.payment_success.tenant_admin',
  '充值成功通知（租户管理员）',
  'billing.payment_success',
  '✅ 充值成功',
  '您的账户充值已成功。

💰 交易信息：
  • 充值金额: ¥{{amount}}
  • 订单号: {{orderId}}
  • 支付方式: {{paymentMethod}}
  • 交易时间: {{paidAt}}

📊 账户状态：
  • 当前余额: ¥{{newBalance}}
  • 预计可用: {{estimatedDays}}天
  • 月度限额: {{quotaRemaining}}

📄 发票信息：
  • 查看发票: {{invoiceUrl}}
  • 下载凭证: {{receiptUrl}}',
  ARRAY['websocket', 'email']::text[],
  ARRAY['tenant_admin']::text[],
  80,
  '{
    "showAccountStatus": true,
    "showInvoiceLinks": true,
    "calculateEstimatedDays": true
  }'::jsonb,
  true,
  '租户管理员专用：详细的交易和账户信息',
  'zh-CN'
),
(
  'billing.payment_success.super_admin',
  '充值成功通知（超级管理员）',
  'billing.payment_success',
  '✅ 系统收款 - 租户 {{tenantName}}',
  '收到租户 {{tenantName}} 的充值。

💰 交易信息：
  • 租户ID: {{tenantId}}
  • 充值金额: ¥{{amount}}
  • 支付方式: {{paymentMethod}}
  • 订单号: {{orderId}}

📊 财务统计：
  • 今日收款: ¥{{todayRevenue}}
  • 本月收款: ¥{{monthlyRevenue}}
  • 租户总充值: ¥{{tenantTotalPayment}}

📈 趋势分析：
  • 充值频率: {{paymentFrequency}}
  • 平均金额: ¥{{averageAmount}}
  • 付费等级: {{paymentTier}}',
  ARRAY['websocket']::text[],
  ARRAY['super_admin']::text[],
  90,
  '{
    "showRevenueStats": true,
    "showTrendAnalysis": true,
    "aggregatePayments": true
  }'::jsonb,
  true,
  '超级管理员专用：收入统计和趋势分析',
  'zh-CN'
);

-- 2.3 billing.invoice_generated (账单生成) - 角色化模板
-- --------------------------------------

INSERT INTO notification_templates (
  code, name, type, title, body,
  channels, target_roles, priority, role_specific_data,
  is_active, description, language
) VALUES (
  'billing.invoice_generated.tenant_admin',
  '账单生成通知（租户管理员）',
  'billing.invoice_generated',
  '📄 账单已生成 - {{month}}',
  '您的{{month}}账单已生成。

📊 账单信息：
  • 账单号: {{invoiceId}}
  • 账单金额: ¥{{totalAmount}}
  • 到期日期: {{dueDate}}
  • 生成时间: {{generatedAt}}

💰 费用明细：
  • 设备使用费: ¥{{deviceFee}}
  • 流量费用: ¥{{trafficFee}}
  • 存储费用: ¥{{storageFee}}
  • 其他费用: ¥{{otherFee}}

📋 操作：
  • 查看账单: {{invoiceUrl}}
  • 立即支付: {{paymentUrl}}
  • 下载PDF: {{pdfUrl}}

💡 提示：请在到期前完成支付，避免服务中断。',
  ARRAY['websocket', 'email']::text[],
  ARRAY['tenant_admin']::text[],
  80,
  '{
    "showDetailedBreakdown": true,
    "showActionLinks": true,
    "includeDueReminder": true
  }'::jsonb,
  true,
  '租户管理员专用：详细的费用明细和操作链接',
  'zh-CN'
),
(
  'billing.invoice_generated.super_admin',
  '账单生成通知（超级管理员）',
  'billing.invoice_generated',
  '📄 系统账单生成 - 租户 {{tenantName}}',
  '租户 {{tenantName}} 的账单已生成。

📊 账单信息：
  • 租户ID: {{tenantId}}
  • 账单号: {{invoiceId}}
  • 账单金额: ¥{{totalAmount}}
  • 生成时间: {{generatedAt}}

📈 系统统计：
  • 本月账单: {{monthlyInvoices}}笔
  • 总金额: ¥{{totalMonthlyAmount}}
  • 已支付: {{paidInvoices}}笔
  • 待支付: {{unpaidInvoices}}笔

📊 租户历史：
  • 平均账单: ¥{{averageInvoice}}
  • 支付记录: {{paymentHistory}}
  • 信用等级: {{creditRating}}',
  ARRAY['websocket']::text[],
  ARRAY['super_admin']::text[],
  85,
  '{
    "showSystemStats": true,
    "showTenantHistory": true,
    "calculateTrends": true
  }'::jsonb,
  true,
  '超级管理员专用：系统财务统计和租户历史',
  'zh-CN'
);

-- ========================================
-- 3. User Events 角色化模板（选择性创建 - 2个重要事件）
-- ========================================

-- 3.1 user.login_failed (登录失败) - 仅管理员模板
-- --------------------------------------

INSERT INTO notification_templates (
  code, name, type, title, body,
  channels, target_roles, priority, role_specific_data,
  is_active, description, language
) VALUES (
  'user.login_failed.super_admin',
  '登录失败警告（超级管理员）',
  'user.login',
  '⚠️ 系统安全警报 - 异常登录尝试',
  '检测到用户 {{username}} 的异常登录尝试。

🔴 警报信息：
  • 用户ID: {{userId}}
  • 失败次数: {{failureCount}}
  • IP地址: {{ipAddress}}
  • 地理位置: {{location}}
  • 时间: {{attemptTime}}

🔍 安全分析：
  • 风险等级: {{riskLevel}}
  • 是否列入黑名单: {{isBlacklisted}}
  • 相同IP其他尝试: {{sameIpAttempts}}

⚡ 自动处理：
  • IP封禁: {{autoBlocked}}
  • 账户锁定: {{accountLocked}}
  • 通知用户: {{userNotified}}',
  ARRAY['websocket', 'email', 'sms']::text[],
  ARRAY['super_admin']::text[],
  100,
  '{
    "showSecurityAnalysis": true,
    "showAutoActions": true,
    "trackSecurity": true
  }'::jsonb,
  true,
  '超级管理员专用：完整的安全分析和自动处理信息',
  'zh-CN'
);

-- 3.2 user.password_changed (密码修改) - 仅管理员模板
-- --------------------------------------

INSERT INTO notification_templates (
  code, name, type, title, body,
  channels, target_roles, priority, role_specific_data,
  is_active, description, language
) VALUES (
  'user.password_changed.super_admin',
  '密码修改通知（超级管理员）',
  'user.password_changed',
  '🔐 用户密码修改 - {{username}}',
  '用户 {{username}} 修改了密码。

👤 用户信息：
  • 用户ID: {{userId}}
  • 用户名: {{username}}
  • 邮箱: {{email}}
  • 修改时间: {{changedAt}}

🔍 安全检查：
  • 修改方式: {{changeMethod}}
  • IP地址: {{ipAddress}}
  • 设备信息: {{deviceInfo}}
  • 验证方式: {{verificationMethod}}

📊 安全统计：
  • 最近修改: {{recentChanges}}次/30天
  • 上次修改: {{lastChange}}
  • 密码强度: {{passwordStrength}}',
  ARRAY['websocket']::text[],
  ARRAY['super_admin']::text[],
  70,
  '{
    "showSecurityContext": true,
    "trackPasswordHistory": true,
    "monitorSecurity": true
  }'::jsonb,
  true,
  '超级管理员专用：用户密码修改的安全监控',
  'zh-CN'
);

-- ========================================
-- 4. App Events 角色化模板（选择性创建 - 1个重要事件）
-- ========================================

-- 4.1 app.install_failed (应用安装失败) - 管理员模板
-- --------------------------------------

INSERT INTO notification_templates (
  code, name, type, title, body,
  channels, target_roles, priority, role_specific_data,
  is_active, description, language
) VALUES (
  'app.install_failed.super_admin',
  '应用安装失败通知（超级管理员）',
  'app.install_failed',
  '❌ 应用安装失败 - {{appName}}',
  '应用 {{appName}} 安装到设备 {{deviceName}} 失败。

🔴 失败信息：
  • 应用ID: {{appId}}
  • 设备ID: {{deviceId}}
  • 失败原因: {{reason}}
  • 失败时间: {{failedAt}}

🔧 技术分析：
  • 错误类型: {{errorType}}
  • 设备状态: {{deviceStatus}}
  • 存储空间: {{storageAvailable}}
  • APK版本: {{apkVersion}}

📊 问题追踪：
  • 相同错误: {{similarErrors}}次
  • 成功率: {{successRate}}%
  • 影响设备: {{affectedDevices}}

⚡ 建议处理：
  {{resolutionSteps}}',
  ARRAY['websocket', 'email']::text[],
  ARRAY['super_admin']::text[],
  90,
  '{
    "showTechnicalAnalysis": true,
    "trackErrorPattern": true,
    "showResolution": true
  }'::jsonb,
  true,
  '超级管理员专用：应用安装失败的技术分析',
  'zh-CN'
);

-- ========================================
-- 完成标记
-- ========================================

-- 添加迁移完成记录
INSERT INTO notification_templates (
  code, name, type, title, body,
  channels, is_active, description, language
) VALUES (
  '_migration.role_based_templates',
  '角色化模板迁移标记',
  'system.maintenance',
  '系统迁移完成',
  '角色化通知模板已成功导入',
  ARRAY['websocket']::text[],
  false,
  '用于标记角色化模板迁移完成，不会实际使用',
  'zh-CN'
);

-- 查询导入结果
SELECT
  '角色化模板导入完成' as status,
  COUNT(*) as total_templates,
  COUNT(CASE WHEN target_roles != '{}' THEN 1 END) as role_specific_templates,
  COUNT(CASE WHEN target_roles = '{}' THEN 1 END) as universal_templates
FROM notification_templates
WHERE code LIKE '%.super_admin'
   OR code LIKE '%.tenant_admin'
   OR code LIKE '%.admin';
