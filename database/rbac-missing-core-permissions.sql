-- ============================================
-- 补充缺失的核心模块权限
-- Date: 2025-11-06
-- 说明：添加系统中实际存在但权限表中缺失的模块权限
-- ============================================

BEGIN;

-- ============================================
-- 1. 配额管理 (Quota) - 15 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('50000000-0000-0000-0000-000000000100', 'quota.create', '创建配额规则', 'quota', 'create', true),
('50000000-0000-0000-0000-000000000101', 'quota.read', '查看配额信息', 'quota', 'read', true),
('50000000-0000-0000-0000-000000000102', 'quota.update', '更新配额规则', 'quota', 'update', true),
('50000000-0000-0000-0000-000000000103', 'quota.delete', '删除配额规则', 'quota', 'delete', true),

-- 配额操作
('50000000-0000-0000-0000-000000000104', 'quota.list', '列出所有配额', 'quota', 'list', true),
('50000000-0000-0000-0000-000000000105', 'quota.check', '检查配额使用情况', 'quota', 'check', true),
('50000000-0000-0000-0000-000000000106', 'quota.adjust', '调整用户配额', 'quota', 'adjust', true),
('50000000-0000-0000-0000-000000000107', 'quota.reset', '重置配额计数', 'quota', 'reset', true),
('50000000-0000-0000-0000-000000000108', 'quota.usage', '查看配额使用详情', 'quota', 'usage', true),

-- 高级功能
('50000000-0000-0000-0000-000000000109', 'quota.history', '查看配额变更历史', 'quota', 'history', true),
('50000000-0000-0000-0000-000000000110', 'quota.report', '生成配额报告', 'quota', 'report', true),
('50000000-0000-0000-0000-000000000111', 'quota.export', '导出配额数据', 'quota', 'export', true),
('50000000-0000-0000-0000-000000000112', 'quota.template', '管理配额模板', 'quota', 'template', true),
('50000000-0000-0000-0000-000000000113', 'quota.alert', '配额告警管理', 'quota', 'alert', true),
('50000000-0000-0000-0000-000000000114', 'quota.enforce', '强制配额限制', 'quota', 'enforce', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. 工单管理 (Ticket) - 12 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('51000000-0000-0000-0000-000000000100', 'ticket.create', '创建工单', 'ticket', 'create', true),
('51000000-0000-0000-0000-000000000101', 'ticket.read', '查看工单详情', 'ticket', 'read', true),
('51000000-0000-0000-0000-000000000102', 'ticket.update', '更新工单信息', 'ticket', 'update', true),
('51000000-0000-0000-0000-000000000103', 'ticket.delete', '删除工单', 'ticket', 'delete', true),

-- 工单操作
('51000000-0000-0000-0000-000000000104', 'ticket.list', '列出工单', 'ticket', 'list', true),
('51000000-0000-0000-0000-000000000105', 'ticket.assign', '分配工单', 'ticket', 'assign', true),
('51000000-0000-0000-0000-000000000106', 'ticket.resolve', '解决工单', 'ticket', 'resolve', true),
('51000000-0000-0000-0000-000000000107', 'ticket.close', '关闭工单', 'ticket', 'close', true),
('51000000-0000-0000-0000-000000000108', 'ticket.reopen', '重新打开工单', 'ticket', 'reopen', true),

-- 高级功能
('51000000-0000-0000-0000-000000000109', 'ticket.comment', '添加工单评论', 'ticket', 'comment', true),
('51000000-0000-0000-0000-000000000110', 'ticket.escalate', '升级工单优先级', 'ticket', 'escalate', true),
('51000000-0000-0000-0000-000000000111', 'ticket.stats', '查看工单统计', 'ticket', 'stats', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. 审计日志 (Audit Log) - 10 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础操作
('52000000-0000-0000-0000-000000000100', 'audit-log.read', '查看审计日志', 'audit-log', 'read', true),
('52000000-0000-0000-0000-000000000101', 'audit-log.list', '列出审计日志', 'audit-log', 'list', true),
('52000000-0000-0000-0000-000000000102', 'audit-log.search', '搜索审计日志', 'audit-log', 'search', true),
('52000000-0000-0000-0000-000000000103', 'audit-log.filter', '过滤审计日志', 'audit-log', 'filter', true),

-- 高级功能
('52000000-0000-0000-0000-000000000104', 'audit-log.export', '导出审计日志', 'audit-log', 'export', true),
('52000000-0000-0000-0000-000000000105', 'audit-log.stats', '审计统计分析', 'audit-log', 'stats', true),
('52000000-0000-0000-0000-000000000106', 'audit-log.archive', '归档审计日志', 'audit-log', 'archive', true),
('52000000-0000-0000-0000-000000000107', 'audit-log.cleanup', '清理旧日志', 'audit-log', 'cleanup', true),

-- 敏感操作
('52000000-0000-0000-0000-000000000108', 'audit-log.sensitive-read', '查看敏感操作日志', 'audit-log', 'sensitive-read', true),
('52000000-0000-0000-0000-000000000109', 'audit-log.user-activity', '查看用户活动日志', 'audit-log', 'user-activity', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 4. API 密钥管理 (API Key) - 10 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('53000000-0000-0000-0000-000000000100', 'api-key.create', '创建 API 密钥', 'api-key', 'create', true),
('53000000-0000-0000-0000-000000000101', 'api-key.read', '查看 API 密钥', 'api-key', 'read', true),
('53000000-0000-0000-0000-000000000102', 'api-key.update', '更新 API 密钥', 'api-key', 'update', true),
('53000000-0000-0000-0000-000000000103', 'api-key.delete', '删除 API 密钥', 'api-key', 'delete', true),

-- API 密钥操作
('53000000-0000-0000-0000-000000000104', 'api-key.list', '列出 API 密钥', 'api-key', 'list', true),
('53000000-0000-0000-0000-000000000105', 'api-key.revoke', '撤销 API 密钥', 'api-key', 'revoke', true),
('53000000-0000-0000-0000-000000000106', 'api-key.renew', '续期 API 密钥', 'api-key', 'renew', true),
('53000000-0000-0000-0000-000000000107', 'api-key.rotate', '轮换 API 密钥', 'api-key', 'rotate', true),

-- 高级功能
('53000000-0000-0000-0000-000000000108', 'api-key.usage', '查看 API 使用情况', 'api-key', 'usage', true),
('53000000-0000-0000-0000-000000000109', 'api-key.rate-limit', '设置 API 速率限制', 'api-key', 'rate-limit', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 5. 设备模板 (Template) - 12 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('54000000-0000-0000-0000-000000000100', 'template.create', '创建设备模板', 'template', 'create', true),
('54000000-0000-0000-0000-000000000101', 'template.read', '查看设备模板', 'template', 'read', true),
('54000000-0000-0000-0000-000000000102', 'template.update', '更新设备模板', 'template', 'update', true),
('54000000-0000-0000-0000-000000000103', 'template.delete', '删除设备模板', 'template', 'delete', true),

-- 模板操作
('54000000-0000-0000-0000-000000000104', 'template.list', '列出所有模板', 'template', 'list', true),
('54000000-0000-0000-0000-000000000105', 'template.clone', '克隆设备模板', 'template', 'clone', true),
('54000000-0000-0000-0000-000000000106', 'template.publish', '发布模板', 'template', 'publish', true),
('54000000-0000-0000-0000-000000000107', 'template.unpublish', '取消发布模板', 'template', 'unpublish', true),

-- 高级功能
('54000000-0000-0000-0000-000000000108', 'template.import', '导入模板', 'template', 'import', true),
('54000000-0000-0000-0000-000000000109', 'template.export', '导出模板', 'template', 'export', true),
('54000000-0000-0000-0000-000000000110', 'template.version', '管理模板版本', 'template', 'version', true),
('54000000-0000-0000-0000-000000000111', 'template.default', '设置默认模板', 'template', 'default', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 6. 设备快照 (Snapshot) - 10 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('55000000-0000-0000-0000-000000000100', 'snapshot.create', '创建设备快照', 'snapshot', 'create', true),
('55000000-0000-0000-0000-000000000101', 'snapshot.read', '查看快照详情', 'snapshot', 'read', true),
('55000000-0000-0000-0000-000000000102', 'snapshot.update', '更新快照信息', 'snapshot', 'update', true),
('55000000-0000-0000-0000-000000000103', 'snapshot.delete', '删除设备快照', 'snapshot', 'delete', true),

-- 快照操作
('55000000-0000-0000-0000-000000000104', 'snapshot.list', '列出设备快照', 'snapshot', 'list', true),
('55000000-0000-0000-0000-000000000105', 'snapshot.restore', '从快照恢复设备', 'snapshot', 'restore', true),
('55000000-0000-0000-0000-000000000106', 'snapshot.compare', '比较快照差异', 'snapshot', 'compare', true),

-- 高级功能
('55000000-0000-0000-0000-000000000107', 'snapshot.download', '下载快照文件', 'snapshot', 'download', true),
('55000000-0000-0000-0000-000000000108', 'snapshot.schedule', '定时快照管理', 'snapshot', 'schedule', true),
('55000000-0000-0000-0000-000000000109', 'snapshot.cleanup', '清理旧快照', 'snapshot', 'cleanup', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 7. 物理设备 (Physical Device) - 10 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('56000000-0000-0000-0000-000000000100', 'physical-device.create', '添加物理设备', 'physical-device', 'create', true),
('56000000-0000-0000-0000-000000000101', 'physical-device.read', '查看物理设备', 'physical-device', 'read', true),
('56000000-0000-0000-0000-000000000102', 'physical-device.update', '更新物理设备', 'physical-device', 'update', true),
('56000000-0000-0000-0000-000000000103', 'physical-device.delete', '删除物理设备', 'physical-device', 'delete', true),

-- 设备操作
('56000000-0000-0000-0000-000000000104', 'physical-device.list', '列出物理设备', 'physical-device', 'list', true),
('56000000-0000-0000-0000-000000000105', 'physical-device.assign', '分配物理设备', 'physical-device', 'assign', true),
('56000000-0000-0000-0000-000000000106', 'physical-device.unassign', '释放物理设备', 'physical-device', 'unassign', true),

-- 高级功能
('56000000-0000-0000-0000-000000000107', 'physical-device.monitor', '监控设备状态', 'physical-device', 'monitor', true),
('56000000-0000-0000-0000-000000000108', 'physical-device.maintain', '设备维护管理', 'physical-device', 'maintain', true),
('56000000-0000-0000-0000-000000000109', 'physical-device.stats', '设备统计数据', 'physical-device', 'stats', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 8. 支付管理 (Payment) - 12 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('57000000-0000-0000-0000-000000000100', 'payment.create', '创建支付订单', 'payment', 'create', true),
('57000000-0000-0000-0000-000000000101', 'payment.read', '查看支付详情', 'payment', 'read', true),
('57000000-0000-0000-0000-000000000102', 'payment.update', '更新支付信息', 'payment', 'update', true),
('57000000-0000-0000-0000-000000000103', 'payment.delete', '删除支付记录', 'payment', 'delete', true),

-- 支付操作
('57000000-0000-0000-0000-000000000104', 'payment.list', '列出支付记录', 'payment', 'list', true),
('57000000-0000-0000-0000-000000000105', 'payment.refund', '退款处理', 'payment', 'refund', true),
('57000000-0000-0000-0000-000000000106', 'payment.cancel', '取消支付', 'payment', 'cancel', true),
('57000000-0000-0000-0000-000000000107', 'payment.verify', '验证支付状态', 'payment', 'verify', true),

-- 高级功能
('57000000-0000-0000-0000-000000000108', 'payment.stats', '支付统计报表', 'payment', 'stats', true),
('57000000-0000-0000-0000-000000000109', 'payment.reconcile', '支付对账', 'payment', 'reconcile', true),
('57000000-0000-0000-0000-000000000110', 'payment.export', '导出支付数据', 'payment', 'export', true),
('57000000-0000-0000-0000-000000000111', 'payment.method', '管理支付方式', 'payment', 'method', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 9. 发票管理 (Invoice) - 12 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('58000000-0000-0000-0000-000000000100', 'invoice.create', '创建发票', 'invoice', 'create', true),
('58000000-0000-0000-0000-000000000101', 'invoice.read', '查看发票详情', 'invoice', 'read', true),
('58000000-0000-0000-0000-000000000102', 'invoice.update', '更新发票信息', 'invoice', 'update', true),
('58000000-0000-0000-0000-000000000103', 'invoice.delete', '删除发票', 'invoice', 'delete', true),

-- 发票操作
('58000000-0000-0000-0000-000000000104', 'invoice.list', '列出发票列表', 'invoice', 'list', true),
('58000000-0000-0000-0000-000000000105', 'invoice.send', '发送发票', 'invoice', 'send', true),
('58000000-0000-0000-0000-000000000106', 'invoice.void', '作废发票', 'invoice', 'void', true),
('58000000-0000-0000-0000-000000000107', 'invoice.download', '下载发票', 'invoice', 'download', true),

-- 高级功能
('58000000-0000-0000-0000-000000000108', 'invoice.generate', '自动生成发票', 'invoice', 'generate', true),
('58000000-0000-0000-0000-000000000109', 'invoice.export', '导出发票数据', 'invoice', 'export', true),
('58000000-0000-0000-0000-000000000110', 'invoice.stats', '发票统计报表', 'invoice', 'stats', true),
('58000000-0000-0000-0000-000000000111', 'invoice.template', '管理发票模板', 'invoice', 'template', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 10. 订阅管理 (Subscription) - 12 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('59000000-0000-0000-0000-000000000100', 'subscription.create', '创建订阅', 'subscription', 'create', true),
('59000000-0000-0000-0000-000000000101', 'subscription.read', '查看订阅详情', 'subscription', 'read', true),
('59000000-0000-0000-0000-000000000102', 'subscription.update', '更新订阅信息', 'subscription', 'update', true),
('59000000-0000-0000-0000-000000000103', 'subscription.delete', '删除订阅', 'subscription', 'delete', true),

-- 订阅操作
('59000000-0000-0000-0000-000000000104', 'subscription.list', '列出订阅列表', 'subscription', 'list', true),
('59000000-0000-0000-0000-000000000105', 'subscription.cancel', '取消订阅', 'subscription', 'cancel', true),
('59000000-0000-0000-0000-000000000106', 'subscription.renew', '续订', 'subscription', 'renew', true),
('59000000-0000-0000-0000-000000000107', 'subscription.upgrade', '升级订阅', 'subscription', 'upgrade', true),
('59000000-0000-0000-0000-000000000108', 'subscription.downgrade', '降级订阅', 'subscription', 'downgrade', true),

-- 高级功能
('59000000-0000-0000-0000-000000000109', 'subscription.stats', '订阅统计分析', 'subscription', 'stats', true),
('59000000-0000-0000-0000-000000000110', 'subscription.trial', '管理试用期', 'subscription', 'trial', true),
('59000000-0000-0000-0000-000000000111', 'subscription.addon', '管理附加服务', 'subscription', 'addon', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 11. 套餐计划 (Plan) - 10 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('60000000-0000-0000-0000-000000000100', 'plan.create', '创建套餐计划', 'plan', 'create', true),
('60000000-0000-0000-0000-000000000101', 'plan.read', '查看套餐详情', 'plan', 'read', true),
('60000000-0000-0000-0000-000000000102', 'plan.update', '更新套餐信息', 'plan', 'update', true),
('60000000-0000-0000-0000-000000000103', 'plan.delete', '删除套餐计划', 'plan', 'delete', true),

-- 套餐操作
('60000000-0000-0000-0000-000000000104', 'plan.list', '列出套餐列表', 'plan', 'list', true),
('60000000-0000-0000-0000-000000000105', 'plan.publish', '发布套餐', 'plan', 'publish', true),
('60000000-0000-0000-0000-000000000106', 'plan.archive', '归档套餐', 'plan', 'archive', true),

-- 高级功能
('60000000-0000-0000-0000-000000000107', 'plan.compare', '套餐对比', 'plan', 'compare', true),
('60000000-0000-0000-0000-000000000108', 'plan.recommend', '推荐套餐', 'plan', 'recommend', true),
('60000000-0000-0000-0000-000000000109', 'plan.pricing', '管理定价策略', 'plan', 'pricing', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 12. 余额管理 (Balance) - 10 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础操作
('61000000-0000-0000-0000-000000000100', 'balance.read', '查看余额', 'balance', 'read', true),
('61000000-0000-0000-0000-000000000101', 'balance.list', '列出余额记录', 'balance', 'list', true),

-- 余额操作
('61000000-0000-0000-0000-000000000102', 'balance.recharge', '充值', 'balance', 'recharge', true),
('61000000-0000-0000-0000-000000000103', 'balance.deduct', '扣费', 'balance', 'deduct', true),
('61000000-0000-0000-0000-000000000104', 'balance.refund', '退款', 'balance', 'refund', true),
('61000000-0000-0000-0000-000000000105', 'balance.transfer', '转账', 'balance', 'transfer', true),
('61000000-0000-0000-0000-000000000106', 'balance.freeze', '冻结余额', 'balance', 'freeze', true),
('61000000-0000-0000-0000-000000000107', 'balance.unfreeze', '解冻余额', 'balance', 'unfreeze', true),

-- 高级功能
('61000000-0000-0000-0000-000000000108', 'balance.history', '余额变动历史', 'balance', 'history', true),
('61000000-0000-0000-0000-000000000109', 'balance.stats', '余额统计报表', 'balance', 'stats', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 13. 使用量管理 (Usage) - 8 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础操作
('62000000-0000-0000-0000-000000000100', 'usage.read', '查看使用量', 'usage', 'read', true),
('62000000-0000-0000-0000-000000000101', 'usage.list', '列出使用记录', 'usage', 'list', true),
('62000000-0000-0000-0000-000000000102', 'usage.record', '记录使用量', 'usage', 'record', true),

-- 高级功能
('62000000-0000-0000-0000-000000000103', 'usage.stats', '使用量统计', 'usage', 'stats', true),
('62000000-0000-0000-0000-000000000104', 'usage.report', '生成使用报告', 'usage', 'report', true),
('62000000-0000-0000-0000-000000000105', 'usage.export', '导出使用数据', 'usage', 'export', true),
('62000000-0000-0000-0000-000000000106', 'usage.analyze', '使用量分析', 'usage', 'analyze', true),
('62000000-0000-0000-0000-000000000107', 'usage.forecast', '使用量预测', 'usage', 'forecast', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 14. 部门管理 (Department) - 10 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('63000000-0000-0000-0000-000000000100', 'department.create', '创建部门', 'department', 'create', true),
('63000000-0000-0000-0000-000000000101', 'department.read', '查看部门信息', 'department', 'read', true),
('63000000-0000-0000-0000-000000000102', 'department.update', '更新部门信息', 'department', 'update', true),
('63000000-0000-0000-0000-000000000103', 'department.delete', '删除部门', 'department', 'delete', true),

-- 部门操作
('63000000-0000-0000-0000-000000000104', 'department.list', '列出部门列表', 'department', 'list', true),
('63000000-0000-0000-0000-000000000105', 'department.tree', '查看部门树', 'department', 'tree', true),
('63000000-0000-0000-0000-000000000106', 'department.move', '移动部门', 'department', 'move', true),

-- 成员管理
('63000000-0000-0000-0000-000000000107', 'department.add-member', '添加部门成员', 'department', 'add-member', true),
('63000000-0000-0000-0000-000000000108', 'department.remove-member', '移除部门成员', 'department', 'remove-member', true),
('63000000-0000-0000-0000-000000000109', 'department.member-list', '查看部门成员', 'department', 'member-list', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 15. 租户管理 (Tenant) - 12 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('64000000-0000-0000-0000-000000000100', 'tenant.create', '创建租户', 'tenant', 'create', true),
('64000000-0000-0000-0000-000000000101', 'tenant.read', '查看租户信息', 'tenant', 'read', true),
('64000000-0000-0000-0000-000000000102', 'tenant.update', '更新租户信息', 'tenant', 'update', true),
('64000000-0000-0000-0000-000000000103', 'tenant.delete', '删除租户', 'tenant', 'delete', true),

-- 租户操作
('64000000-0000-0000-0000-000000000104', 'tenant.list', '列出租户列表', 'tenant', 'list', true),
('64000000-0000-0000-0000-000000000105', 'tenant.activate', '激活租户', 'tenant', 'activate', true),
('64000000-0000-0000-0000-000000000106', 'tenant.suspend', '暂停租户', 'tenant', 'suspend', true),
('64000000-0000-0000-0000-000000000107', 'tenant.config', '配置租户', 'tenant', 'config', true),

-- 高级功能
('64000000-0000-0000-0000-000000000108', 'tenant.stats', '租户统计数据', 'tenant', 'stats', true),
('64000000-0000-0000-0000-000000000109', 'tenant.quota', '管理租户配额', 'tenant', 'quota', true),
('64000000-0000-0000-0000-000000000110', 'tenant.billing', '租户计费管理', 'tenant', 'billing', true),
('64000000-0000-0000-0000-000000000111', 'tenant.isolation', '租户数据隔离', 'tenant', 'isolation', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 16. 系统设置 (Setting) - 10 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础操作
('65000000-0000-0000-0000-000000000100', 'setting.read', '查看系统设置', 'setting', 'read', true),
('65000000-0000-0000-0000-000000000101', 'setting.update', '更新系统设置', 'setting', 'update', true),
('65000000-0000-0000-0000-000000000102', 'setting.list', '列出所有设置', 'setting', 'list', true),

-- 配置管理
('65000000-0000-0000-0000-000000000103', 'setting.import', '导入配置', 'setting', 'import', true),
('65000000-0000-0000-0000-000000000104', 'setting.export', '导出配置', 'setting', 'export', true),
('65000000-0000-0000-0000-000000000105', 'setting.reset', '重置设置', 'setting', 'reset', true),
('65000000-0000-0000-0000-000000000106', 'setting.backup', '备份配置', 'setting', 'backup', true),
('65000000-0000-0000-0000-000000000107', 'setting.restore', '恢复配置', 'setting', 'restore', true),

-- 高级功能
('65000000-0000-0000-0000-000000000108', 'setting.encrypt', '加密敏感配置', 'setting', 'encrypt', true),
('65000000-0000-0000-0000-000000000109', 'setting.validate', '验证配置有效性', 'setting', 'validate', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 17. 缓存管理 (Cache) - 10 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础操作
('66000000-0000-0000-0000-000000000100', 'cache.read', '查看缓存数据', 'cache', 'read', true),
('66000000-0000-0000-0000-000000000101', 'cache.write', '写入缓存', 'cache', 'write', true),
('66000000-0000-0000-0000-000000000102', 'cache.delete', '删除缓存', 'cache', 'delete', true),
('66000000-0000-0000-0000-000000000103', 'cache.clear', '清空缓存', 'cache', 'clear', true),

-- 缓存管理
('66000000-0000-0000-0000-000000000104', 'cache.list', '列出缓存键', 'cache', 'list', true),
('66000000-0000-0000-0000-000000000105', 'cache.stats', '缓存统计', 'cache', 'stats', true),
('66000000-0000-0000-0000-000000000106', 'cache.warmup', '预热缓存', 'cache', 'warmup', true),

-- 高级功能
('66000000-0000-0000-0000-000000000107', 'cache.invalidate', '失效缓存', 'cache', 'invalidate', true),
('66000000-0000-0000-0000-000000000108', 'cache.pattern-clear', '按模式清理', 'cache', 'pattern-clear', true),
('66000000-0000-0000-0000-000000000109', 'cache.config', '配置缓存策略', 'cache', 'config', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 18. 队列管理 (Queue) - 10 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础操作
('67000000-0000-0000-0000-000000000100', 'queue.read', '查看队列信息', 'queue', 'read', true),
('67000000-0000-0000-0000-000000000101', 'queue.list', '列出所有队列', 'queue', 'list', true),
('67000000-0000-0000-0000-000000000102', 'queue.create', '创建队列', 'queue', 'create', true),
('67000000-0000-0000-0000-000000000103', 'queue.delete', '删除队列', 'queue', 'delete', true),

-- 队列操作
('67000000-0000-0000-0000-000000000104', 'queue.push', '推送消息', 'queue', 'push', true),
('67000000-0000-0000-0000-000000000105', 'queue.pop', '消费消息', 'queue', 'pop', true),
('67000000-0000-0000-0000-000000000106', 'queue.purge', '清空队列', 'queue', 'purge', true),
('67000000-0000-0000-0000-000000000107', 'queue.pause', '暂停队列', 'queue', 'pause', true),
('67000000-0000-0000-0000-000000000108', 'queue.resume', '恢复队列', 'queue', 'resume', true),
('67000000-0000-0000-0000-000000000109', 'queue.stats', '队列统计', 'queue', 'stats', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 19. 监控管理 (Monitor) - 10 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础操作
('68000000-0000-0000-0000-000000000100', 'monitor.read', '查看监控数据', 'monitor', 'read', true),
('68000000-0000-0000-0000-000000000101', 'monitor.dashboard', '查看监控面板', 'monitor', 'dashboard', true),
('68000000-0000-0000-0000-000000000102', 'monitor.metrics', '查看指标数据', 'monitor', 'metrics', true),

-- 告警管理
('68000000-0000-0000-0000-000000000103', 'monitor.alert', '查看告警', 'monitor', 'alert', true),
('68000000-0000-0000-0000-000000000104', 'monitor.alert-config', '配置告警规则', 'monitor', 'alert-config', true),
('68000000-0000-0000-0000-000000000105', 'monitor.alert-silence', '静默告警', 'monitor', 'alert-silence', true),

-- 高级功能
('68000000-0000-0000-0000-000000000106', 'monitor.trace', '查看调用链追踪', 'monitor', 'trace', true),
('68000000-0000-0000-0000-000000000107', 'monitor.log', '查看监控日志', 'monitor', 'log', true),
('68000000-0000-0000-0000-000000000108', 'monitor.export', '导出监控数据', 'monitor', 'export', true),
('68000000-0000-0000-0000-000000000109', 'monitor.analyze', '监控数据分析', 'monitor', 'analyze', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 20. Webhook 管理 - 10 个权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 基础 CRUD
('69000000-0000-0000-0000-000000000100', 'webhook.create', '创建 Webhook', 'webhook', 'create', true),
('69000000-0000-0000-0000-000000000101', 'webhook.read', '查看 Webhook', 'webhook', 'read', true),
('69000000-0000-0000-0000-000000000102', 'webhook.update', '更新 Webhook', 'webhook', 'update', true),
('69000000-0000-0000-0000-000000000103', 'webhook.delete', '删除 Webhook', 'webhook', 'delete', true),

-- Webhook 操作
('69000000-0000-0000-0000-000000000104', 'webhook.list', '列出 Webhook', 'webhook', 'list', true),
('69000000-0000-0000-0000-000000000105', 'webhook.test', '测试 Webhook', 'webhook', 'test', true),
('69000000-0000-0000-0000-000000000106', 'webhook.trigger', '手动触发', 'webhook', 'trigger', true),
('69000000-0000-0000-0000-000000000107', 'webhook.history', '查看调用历史', 'webhook', 'history', true),

-- 高级功能
('69000000-0000-0000-0000-000000000108', 'webhook.retry', '重试失败请求', 'webhook', 'retry', true),
('69000000-0000-0000-0000-000000000109', 'webhook.stats', 'Webhook 统计', 'webhook', 'stats', true)
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- ============================================
-- 统计新增权限
-- ============================================
SELECT
  '=== 权限补充统计 ===' as info;

SELECT
  '新权限总数' as 类型,
  COUNT(*) as 数量
FROM permissions
WHERE id >= '50000000-0000-0000-0000-000000000000';

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
WHERE id >= '50000000-0000-0000-0000-000000000000'
GROUP BY resource
ORDER BY COUNT(*) DESC;
