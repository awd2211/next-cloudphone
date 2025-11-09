-- ============================================
-- 补充缺失的核心模块权限 v2
-- Date: 2025-11-06
-- 说明：使用自动生成的 UUID，添加系统中实际存在但权限表中缺失的模块权限
-- ============================================

BEGIN;

-- ============================================
-- 1. 配额管理 (Quota) - 15 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('quota.create', '创建配额规则', 'quota', 'create', true),
('quota.read', '查看配额信息', 'quota', 'read', true),
('quota.update', '更新配额规则', 'quota', 'update', true),
('quota.delete', '删除配额规则', 'quota', 'delete', true),

-- 配额操作
('quota.list', '列出所有配额', 'quota', 'list', true),
('quota.check', '检查配额使用情况', 'quota', 'check', true),
('quota.adjust', '调整用户配额', 'quota', 'adjust', true),
('quota.reset', '重置配额计数', 'quota', 'reset', true),
('quota.usage', '查看配额使用详情', 'quota', 'usage', true),

-- 高级功能
('quota.history', '查看配额变更历史', 'quota', 'history', true),
('quota.report', '生成配额报告', 'quota', 'report', true),
('quota.export', '导出配额数据', 'quota', 'export', true),
('quota.template', '管理配额模板', 'quota', 'template', true),
('quota.alert', '配额告警管理', 'quota', 'alert', true),
('quota.enforce', '强制配额限制', 'quota', 'enforce', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. 工单管理 (Ticket) - 12 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('ticket.create', '创建工单', 'ticket', 'create', true),
('ticket.read', '查看工单详情', 'ticket', 'read', true),
('ticket.update', '更新工单信息', 'ticket', 'update', true),
('ticket.delete', '删除工单', 'ticket', 'delete', true),

-- 工单操作
('ticket.list', '列出工单', 'ticket', 'list', true),
('ticket.assign', '分配工单', 'ticket', 'assign', true),
('ticket.resolve', '解决工单', 'ticket', 'resolve', true),
('ticket.close', '关闭工单', 'ticket', 'close', true),
('ticket.reopen', '重新打开工单', 'ticket', 'reopen', true),

-- 高级功能
('ticket.comment', '添加工单评论', 'ticket', 'comment', true),
('ticket.escalate', '升级工单优先级', 'ticket', 'escalate', true),
('ticket.stats', '查看工单统计', 'ticket', 'stats', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. 审计日志 (Audit Log) - 10 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础操作
('audit-log.read', '查看审计日志', 'audit-log', 'read', true),
('audit-log.list', '列出审计日志', 'audit-log', 'list', true),
('audit-log.search', '搜索审计日志', 'audit-log', 'search', true),
('audit-log.filter', '过滤审计日志', 'audit-log', 'filter', true),

-- 高级功能
('audit-log.export', '导出审计日志', 'audit-log', 'export', true),
('audit-log.stats', '审计统计分析', 'audit-log', 'stats', true),
('audit-log.archive', '归档审计日志', 'audit-log', 'archive', true),
('audit-log.cleanup', '清理旧日志', 'audit-log', 'cleanup', true),

-- 敏感操作
('audit-log.sensitive-read', '查看敏感操作日志', 'audit-log', 'sensitive-read', true),
('audit-log.user-activity', '查看用户活动日志', 'audit-log', 'user-activity', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 4. API 密钥管理 (API Key) - 10 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('api-key.create', '创建 API 密钥', 'api-key', 'create', true),
('api-key.read', '查看 API 密钥', 'api-key', 'read', true),
('api-key.update', '更新 API 密钥', 'api-key', 'update', true),
('api-key.delete', '删除 API 密钥', 'api-key', 'delete', true),

-- API 密钥操作
('api-key.list', '列出 API 密钥', 'api-key', 'list', true),
('api-key.revoke', '撤销 API 密钥', 'api-key', 'revoke', true),
('api-key.renew', '续期 API 密钥', 'api-key', 'renew', true),
('api-key.rotate', '轮换 API 密钥', 'api-key', 'rotate', true),

-- 高级功能
('api-key.usage', '查看 API 使用情况', 'api-key', 'usage', true),
('api-key.rate-limit', '设置 API 速率限制', 'api-key', 'rate-limit', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 5. 设备模板 (Template) - 12 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('template.create', '创建设备模板', 'template', 'create', true),
('template.read', '查看设备模板', 'template', 'read', true),
('template.update', '更新设备模板', 'template', 'update', true),
('template.delete', '删除设备模板', 'template', 'delete', true),

-- 模板操作
('template.list', '列出所有模板', 'template', 'list', true),
('template.clone', '克隆设备模板', 'template', 'clone', true),
('template.publish', '发布模板', 'template', 'publish', true),
('template.unpublish', '取消发布模板', 'template', 'unpublish', true),

-- 高级功能
('template.import', '导入模板', 'template', 'import', true),
('template.export', '导出模板', 'template', 'export', true),
('template.version', '管理模板版本', 'template', 'version', true),
('template.default', '设置默认模板', 'template', 'default', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 6. 设备快照 (Snapshot) - 10 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('snapshot.create', '创建设备快照', 'snapshot', 'create', true),
('snapshot.read', '查看快照详情', 'snapshot', 'read', true),
('snapshot.update', '更新快照信息', 'snapshot', 'update', true),
('snapshot.delete', '删除设备快照', 'snapshot', 'delete', true),

-- 快照操作
('snapshot.list', '列出设备快照', 'snapshot', 'list', true),
('snapshot.restore', '从快照恢复设备', 'snapshot', 'restore', true),
('snapshot.compare', '比较快照差异', 'snapshot', 'compare', true),

-- 高级功能
('snapshot.download', '下载快照文件', 'snapshot', 'download', true),
('snapshot.schedule', '定时快照管理', 'snapshot', 'schedule', true),
('snapshot.cleanup', '清理旧快照', 'snapshot', 'cleanup', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 7. 物理设备 (Physical Device) - 10 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('physical-device.create', '添加物理设备', 'physical-device', 'create', true),
('physical-device.read', '查看物理设备', 'physical-device', 'read', true),
('physical-device.update', '更新物理设备', 'physical-device', 'update', true),
('physical-device.delete', '删除物理设备', 'physical-device', 'delete', true),

-- 设备操作
('physical-device.list', '列出物理设备', 'physical-device', 'list', true),
('physical-device.assign', '分配物理设备', 'physical-device', 'assign', true),
('physical-device.unassign', '释放物理设备', 'physical-device', 'unassign', true),

-- 高级功能
('physical-device.monitor', '监控设备状态', 'physical-device', 'monitor', true),
('physical-device.maintain', '设备维护管理', 'physical-device', 'maintain', true),
('physical-device.stats', '设备统计数据', 'physical-device', 'stats', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 8. 支付管理 (Payment) - 12 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('payment.create', '创建支付订单', 'payment', 'create', true),
('payment.read', '查看支付详情', 'payment', 'read', true),
('payment.update', '更新支付信息', 'payment', 'update', true),
('payment.delete', '删除支付记录', 'payment', 'delete', true),

-- 支付操作
('payment.list', '列出支付记录', 'payment', 'list', true),
('payment.refund', '退款处理', 'payment', 'refund', true),
('payment.cancel', '取消支付', 'payment', 'cancel', true),
('payment.verify', '验证支付状态', 'payment', 'verify', true),

-- 高级功能
('payment.stats', '支付统计报表', 'payment', 'stats', true),
('payment.reconcile', '支付对账', 'payment', 'reconcile', true),
('payment.export', '导出支付数据', 'payment', 'export', true),
('payment.method', '管理支付方式', 'payment', 'method', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 9. 发票管理 (Invoice) - 12 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('invoice.create', '创建发票', 'invoice', 'create', true),
('invoice.read', '查看发票详情', 'invoice', 'read', true),
('invoice.update', '更新发票信息', 'invoice', 'update', true),
('invoice.delete', '删除发票', 'invoice', 'delete', true),

-- 发票操作
('invoice.list', '列出发票列表', 'invoice', 'list', true),
('invoice.send', '发送发票', 'invoice', 'send', true),
('invoice.void', '作废发票', 'invoice', 'void', true),
('invoice.download', '下载发票', 'invoice', 'download', true),

-- 高级功能
('invoice.generate', '自动生成发票', 'invoice', 'generate', true),
('invoice.export', '导出发票数据', 'invoice', 'export', true),
('invoice.stats', '发票统计报表', 'invoice', 'stats', true),
('invoice.template', '管理发票模板', 'invoice', 'template', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 10. 订阅管理 (Subscription) - 12 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('subscription.create', '创建订阅', 'subscription', 'create', true),
('subscription.read', '查看订阅详情', 'subscription', 'read', true),
('subscription.update', '更新订阅信息', 'subscription', 'update', true),
('subscription.delete', '删除订阅', 'subscription', 'delete', true),

-- 订阅操作
('subscription.list', '列出订阅列表', 'subscription', 'list', true),
('subscription.cancel', '取消订阅', 'subscription', 'cancel', true),
('subscription.renew', '续订', 'subscription', 'renew', true),
('subscription.upgrade', '升级订阅', 'subscription', 'upgrade', true),
('subscription.downgrade', '降级订阅', 'subscription', 'downgrade', true),

-- 高级功能
('subscription.stats', '订阅统计分析', 'subscription', 'stats', true),
('subscription.trial', '管理试用期', 'subscription', 'trial', true),
('subscription.addon', '管理附加服务', 'subscription', 'addon', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 11. 套餐计划 (Plan) - 10 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('plan.create', '创建套餐计划', 'plan', 'create', true),
('plan.read', '查看套餐详情', 'plan', 'read', true),
('plan.update', '更新套餐信息', 'plan', 'update', true),
('plan.delete', '删除套餐计划', 'plan', 'delete', true),

-- 套餐操作
('plan.list', '列出套餐列表', 'plan', 'list', true),
('plan.publish', '发布套餐', 'plan', 'publish', true),
('plan.archive', '归档套餐', 'plan', 'archive', true),

-- 高级功能
('plan.compare', '套餐对比', 'plan', 'compare', true),
('plan.recommend', '推荐套餐', 'plan', 'recommend', true),
('plan.pricing', '管理定价策略', 'plan', 'pricing', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 12. 余额管理 (Balance) - 10 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础操作
('balance.read', '查看余额', 'balance', 'read', true),
('balance.list', '列出余额记录', 'balance', 'list', true),

-- 余额操作
('balance.recharge', '充值', 'balance', 'recharge', true),
('balance.deduct', '扣费', 'balance', 'deduct', true),
('balance.refund', '退款', 'balance', 'refund', true),
('balance.transfer', '转账', 'balance', 'transfer', true),
('balance.freeze', '冻结余额', 'balance', 'freeze', true),
('balance.unfreeze', '解冻余额', 'balance', 'unfreeze', true),

-- 高级功能
('balance.history', '余额变动历史', 'balance', 'history', true),
('balance.stats', '余额统计报表', 'balance', 'stats', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 13. 使用量管理 (Usage) - 8 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础操作
('usage.read', '查看使用量', 'usage', 'read', true),
('usage.list', '列出使用记录', 'usage', 'list', true),
('usage.record', '记录使用量', 'usage', 'record', true),

-- 高级功能
('usage.stats', '使用量统计', 'usage', 'stats', true),
('usage.report', '生成使用报告', 'usage', 'report', true),
('usage.export', '导出使用数据', 'usage', 'export', true),
('usage.analyze', '使用量分析', 'usage', 'analyze', true),
('usage.forecast', '使用量预测', 'usage', 'forecast', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 14. 部门管理 (Department) - 10 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('department.create', '创建部门', 'department', 'create', true),
('department.read', '查看部门信息', 'department', 'read', true),
('department.update', '更新部门信息', 'department', 'update', true),
('department.delete', '删除部门', 'department', 'delete', true),

-- 部门操作
('department.list', '列出部门列表', 'department', 'list', true),
('department.tree', '查看部门树', 'department', 'tree', true),
('department.move', '移动部门', 'department', 'move', true),

-- 成员管理
('department.add-member', '添加部门成员', 'department', 'add-member', true),
('department.remove-member', '移除部门成员', 'department', 'remove-member', true),
('department.member-list', '查看部门成员', 'department', 'member-list', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 15. 租户管理 (Tenant) - 12 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('tenant.create', '创建租户', 'tenant', 'create', true),
('tenant.read', '查看租户信息', 'tenant', 'read', true),
('tenant.update', '更新租户信息', 'tenant', 'update', true),
('tenant.delete', '删除租户', 'tenant', 'delete', true),

-- 租户操作
('tenant.list', '列出租户列表', 'tenant', 'list', true),
('tenant.activate', '激活租户', 'tenant', 'activate', true),
('tenant.suspend', '暂停租户', 'tenant', 'suspend', true),
('tenant.config', '配置租户', 'tenant', 'config', true),

-- 高级功能
('tenant.stats', '租户统计数据', 'tenant', 'stats', true),
('tenant.quota', '管理租户配额', 'tenant', 'quota', true),
('tenant.billing', '租户计费管理', 'tenant', 'billing', true),
('tenant.isolation', '租户数据隔离', 'tenant', 'isolation', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 16. 系统设置 (Setting) - 10 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础操作
('setting.read', '查看系统设置', 'setting', 'read', true),
('setting.update', '更新系统设置', 'setting', 'update', true),
('setting.list', '列出所有设置', 'setting', 'list', true),

-- 配置管理
('setting.import', '导入配置', 'setting', 'import', true),
('setting.export', '导出配置', 'setting', 'export', true),
('setting.reset', '重置设置', 'setting', 'reset', true),
('setting.backup', '备份配置', 'setting', 'backup', true),
('setting.restore', '恢复配置', 'setting', 'restore', true),

-- 高级功能
('setting.encrypt', '加密敏感配置', 'setting', 'encrypt', true),
('setting.validate', '验证配置有效性', 'setting', 'validate', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 17. 缓存管理 (Cache) - 10 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础操作
('cache.read', '查看缓存数据', 'cache', 'read', true),
('cache.write', '写入缓存', 'cache', 'write', true),
('cache.delete', '删除缓存', 'cache', 'delete', true),
('cache.clear', '清空缓存', 'cache', 'clear', true),

-- 缓存管理
('cache.list', '列出缓存键', 'cache', 'list', true),
('cache.stats', '缓存统计', 'cache', 'stats', true),
('cache.warmup', '预热缓存', 'cache', 'warmup', true),

-- 高级功能
('cache.invalidate', '失效缓存', 'cache', 'invalidate', true),
('cache.pattern-clear', '按模式清理', 'cache', 'pattern-clear', true),
('cache.config', '配置缓存策略', 'cache', 'config', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 18. 队列管理 (Queue) - 10 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础操作
('queue.read', '查看队列信息', 'queue', 'read', true),
('queue.list', '列出所有队列', 'queue', 'list', true),
('queue.create', '创建队列', 'queue', 'create', true),
('queue.delete', '删除队列', 'queue', 'delete', true),

-- 队列操作
('queue.push', '推送消息', 'queue', 'push', true),
('queue.pop', '消费消息', 'queue', 'pop', true),
('queue.purge', '清空队列', 'queue', 'purge', true),
('queue.pause', '暂停队列', 'queue', 'pause', true),
('queue.resume', '恢复队列', 'queue', 'resume', true),
('queue.stats', '队列统计', 'queue', 'stats', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 19. 监控管理 (Monitor) - 10 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础操作
('monitor.read', '查看监控数据', 'monitor', 'read', true),
('monitor.dashboard', '查看监控面板', 'monitor', 'dashboard', true),
('monitor.metrics', '查看指标数据', 'monitor', 'metrics', true),

-- 告警管理
('monitor.alert', '查看告警', 'monitor', 'alert', true),
('monitor.alert-config', '配置告警规则', 'monitor', 'alert-config', true),
('monitor.alert-silence', '静默告警', 'monitor', 'alert-silence', true),

-- 高级功能
('monitor.trace', '查看调用链追踪', 'monitor', 'trace', true),
('monitor.log', '查看监控日志', 'monitor', 'log', true),
('monitor.export', '导出监控数据', 'monitor', 'export', true),
('monitor.analyze', '监控数据分析', 'monitor', 'analyze', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 20. Webhook 管理 - 10 个权限
-- ============================================
INSERT INTO permissions (name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('webhook.create', '创建 Webhook', 'webhook', 'create', true),
('webhook.read', '查看 Webhook', 'webhook', 'read', true),
('webhook.update', '更新 Webhook', 'webhook', 'update', true),
('webhook.delete', '删除 Webhook', 'webhook', 'delete', true),

-- Webhook 操作
('webhook.list', '列出 Webhook', 'webhook', 'list', true),
('webhook.test', '测试 Webhook', 'webhook', 'test', true),
('webhook.trigger', '手动触发', 'webhook', 'trigger', true),
('webhook.history', '查看调用历史', 'webhook', 'history', true),

-- 高级功能
('webhook.retry', '重试失败请求', 'webhook', 'retry', true),
('webhook.stats', 'Webhook 统计', 'webhook', 'stats', true)
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- ============================================
-- 统计新增权限
-- ============================================
SELECT
  '=== 权限补充统计 ===' as info;

SELECT
  '新增权限数量' as 类型,
  COUNT(*) as 数量
FROM permissions
WHERE resource IN (
  'quota', 'ticket', 'audit-log', 'api-key', 'template', 'snapshot',
  'physical-device', 'payment', 'invoice', 'subscription', 'plan', 'balance',
  'usage', 'department', 'tenant', 'setting', 'cache', 'queue', 'monitor', 'webhook'
);

SELECT
  '系统权限总数' as 类型,
  COUNT(*) as 数量
FROM permissions;

-- 按资源统计新增权限
SELECT
  '新增权限按资源统计' as 检查项,
  resource as 资源类型,
  COUNT(*) as 权限数量
FROM permissions
WHERE resource IN (
  'quota', 'ticket', 'audit-log', 'api-key', 'template', 'snapshot',
  'physical-device', 'payment', 'invoice', 'subscription', 'plan', 'balance',
  'usage', 'department', 'tenant', 'setting', 'cache', 'queue', 'monitor', 'webhook'
)
GROUP BY resource
ORDER BY COUNT(*) DESC;
