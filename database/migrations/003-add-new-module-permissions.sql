-- ============================================
-- P3 新模块权限 SQL 插入语句
-- 添加所有新增功能模块的权限
-- Date: 2025-11-22
-- 总计: 约 85 个新权限
-- ============================================

BEGIN;

-- ============================================
-- 1. GPU 资源管理权限 (8个)
-- 对应: device-service/src/gpu/*.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('gpu:allocate', 'gpu', 'allocate', '分配 GPU 资源'),
  ('gpu:release', 'gpu', 'release', '释放 GPU 资源'),
  ('gpu:read', 'gpu', 'read', '查看 GPU 信息'),
  ('gpu:list', 'gpu', 'list', 'GPU 资源列表'),
  ('gpu:usage', 'gpu', 'usage', 'GPU 使用情况'),
  ('gpu:pools', 'gpu', 'pools', 'GPU 池管理'),
  ('gpu:capabilities', 'gpu', 'capabilities', 'GPU 能力查询'),
  ('gpu:admin', 'gpu', 'admin', 'GPU 系统管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. 设备批量操作权限 (6个)
-- 对应: device-service/src/batch-operations.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('device:batch-create', 'device', 'batch-create', '批量创建设备'),
  ('device:batch-delete', 'device', 'batch-delete', '批量删除设备'),
  ('device:batch-start', 'device', 'batch-start', '批量启动设备'),
  ('device:batch-stop', 'device', 'batch-stop', '批量停止设备'),
  ('device:batch-restart', 'device', 'batch-restart', '批量重启设备'),
  ('device:batch-export', 'device', 'batch-export', '导出设备列表')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. 设备模板权限 (6个)
-- 对应: device-service/src/templates.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('device-template:create', 'device-template', 'create', '创建设备模板'),
  ('device-template:read', 'device-template', 'read', '查看设备模板'),
  ('device-template:update', 'device-template', 'update', '更新设备模板'),
  ('device-template:delete', 'device-template', 'delete', '删除设备模板'),
  ('device-template:list', 'device-template', 'list', '设备模板列表'),
  ('device-template:apply', 'device-template', 'apply', '应用设备模板')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 4. 设备策略权限 (5个)
-- 对应: device-service/src/strategy.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('device-strategy:create', 'device-strategy', 'create', '创建设备策略'),
  ('device-strategy:read', 'device-strategy', 'read', '查看设备策略'),
  ('device-strategy:update', 'device-strategy', 'update', '更新设备策略'),
  ('device-strategy:delete', 'device-strategy', 'delete', '删除设备策略'),
  ('device-strategy:apply', 'device-strategy', 'apply', '应用设备策略')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 5. 生命周期历史权限 (4个)
-- 对应: device-service/src/lifecycle/lifecycle-history.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('lifecycle:history-read', 'lifecycle', 'history-read', '查看生命周期历史'),
  ('lifecycle:history-list', 'lifecycle', 'history-list', '生命周期历史列表'),
  ('lifecycle:history-stats', 'lifecycle', 'history-stats', '生命周期历史统计'),
  ('lifecycle:history-export', 'lifecycle', 'history-export', '导出生命周期历史')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 6. 生命周期规则权限 (6个)
-- 对应: device-service/src/lifecycle/lifecycle-rules.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('lifecycle:rule-create', 'lifecycle', 'rule-create', '创建生命周期规则'),
  ('lifecycle:rule-read', 'lifecycle', 'rule-read', '查看生命周期规则'),
  ('lifecycle:rule-update', 'lifecycle', 'rule-update', '更新生命周期规则'),
  ('lifecycle:rule-delete', 'lifecycle', 'rule-delete', '删除生命周期规则'),
  ('lifecycle:rule-list', 'lifecycle', 'rule-list', '生命周期规则列表'),
  ('lifecycle:rule-execute', 'lifecycle', 'rule-execute', '执行生命周期规则')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 7. 提供商配置权限 (6个)
-- 对应: device-service/src/providers/*.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('provider:create', 'provider', 'create', '创建提供商配置'),
  ('provider:read', 'provider', 'read', '查看提供商配置'),
  ('provider:update', 'provider', 'update', '更新提供商配置'),
  ('provider:delete', 'provider', 'delete', '删除提供商配置'),
  ('provider:list', 'provider', 'list', '提供商列表'),
  ('provider:test', 'provider', 'test', '测试提供商连接')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 8. 数据范围权限管理 (6个)
-- 对应: user-service/src/permissions/controllers/data-scope.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('data-scope:create', 'data-scope', 'create', '创建数据范围规则'),
  ('data-scope:read', 'data-scope', 'read', '查看数据范围规则'),
  ('data-scope:update', 'data-scope', 'update', '更新数据范围规则'),
  ('data-scope:delete', 'data-scope', 'delete', '删除数据范围规则'),
  ('data-scope:assign', 'data-scope', 'assign', '分配数据范围'),
  ('data-scope:meta', 'data-scope', 'meta', '数据范围元信息')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 9. 字段权限管理 (6个)
-- 对应: user-service/src/permissions/controllers/field-permission.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('field-permission:create', 'field-permission', 'create', '创建字段权限规则'),
  ('field-permission:read', 'field-permission', 'read', '查看字段权限规则'),
  ('field-permission:update', 'field-permission', 'update', '更新字段权限规则'),
  ('field-permission:delete', 'field-permission', 'delete', '删除字段权限规则'),
  ('field-permission:preview', 'field-permission', 'preview', '预览字段权限效果'),
  ('field-permission:batch', 'field-permission', 'batch', '批量设置字段权限')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 10. 菜单权限管理 (7个)
-- 对应: user-service/src/permissions/controllers/menu-permission.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('menu:create', 'menu', 'create', '创建菜单'),
  ('menu:read', 'menu', 'read', '查看菜单'),
  ('menu:update', 'menu', 'update', '更新菜单'),
  ('menu:delete', 'menu', 'delete', '删除菜单'),
  ('menu:tree', 'menu', 'tree', '菜单树结构'),
  ('menu:sort', 'menu', 'sort', '菜单排序'),
  ('menu:assign', 'menu', 'assign', '分配菜单权限')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 11. 配额管理权限 (8个)
-- 对应: user-service/src/quotas/*.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('quota:create', 'quota', 'create', '创建配额规则'),
  ('quota:read', 'quota', 'read', '查看配额规则'),
  ('quota:update', 'quota', 'update', '更新配额规则'),
  ('quota:delete', 'quota', 'delete', '删除配额规则'),
  ('quota:check', 'quota', 'check', '检查配额使用'),
  ('quota:report', 'quota', 'report', '配额使用报告'),
  ('quota:override', 'quota', 'override', '覆盖用户配额'),
  ('quota:admin', 'quota', 'admin', '配额系统管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 12. API 密钥管理权限 (5个)
-- 对应: user-service/src/api-keys/api-keys.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('api-key:create', 'api-key', 'create', '创建 API 密钥'),
  ('api-key:read', 'api-key', 'read', '查看 API 密钥'),
  ('api-key:update', 'api-key', 'update', '更新 API 密钥'),
  ('api-key:delete', 'api-key', 'delete', '删除 API 密钥'),
  ('api-key:revoke', 'api-key', 'revoke', '撤销 API 密钥')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 13. 系统审计日志权限 (5个)
-- 对应: user-service/src/audit-logs/audit-logs.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('audit-log:read', 'audit-log', 'read', '查看审计日志'),
  ('audit-log:search', 'audit-log', 'search', '搜索审计日志'),
  ('audit-log:export', 'audit-log', 'export', '导出审计日志'),
  ('audit-log:stats', 'audit-log', 'stats', '审计日志统计'),
  ('audit-log:admin', 'audit-log', 'admin', '审计日志管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 14. 缓存管理权限 (5个)
-- 对应: user-service/src/cache/cache.controller.ts, api-gateway
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('cache:read', 'cache', 'read', '查看缓存'),
  ('cache:clear', 'cache', 'clear', '清除缓存'),
  ('cache:stats', 'cache', 'stats', '缓存统计'),
  ('cache:keys', 'cache', 'keys', '缓存键列表'),
  ('cache:admin', 'cache', 'admin', '缓存系统管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 15. 队列管理权限 (6个)
-- 对应: notification-service 队列管理
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('queue:read', 'queue', 'read', '查看队列'),
  ('queue:clear', 'queue', 'clear', '清空队列'),
  ('queue:retry', 'queue', 'retry', '重试队列任务'),
  ('queue:stats', 'queue', 'stats', '队列统计'),
  ('queue:dlq', 'queue', 'dlq', '死信队列管理'),
  ('queue:admin', 'queue', 'admin', '队列系统管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 16. 系统设置权限 (4个)
-- 对应: user-service/src/settings/settings.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('settings:read', 'settings', 'read', '查看系统设置'),
  ('settings:update', 'settings', 'update', '更新系统设置'),
  ('settings:reset', 'settings', 'reset', '重置系统设置'),
  ('settings:admin', 'settings', 'admin', '系统设置管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 17. 工单管理权限 (8个)
-- 对应: user-service/src/tickets/tickets.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('ticket:create', 'ticket', 'create', '创建工单'),
  ('ticket:read', 'ticket', 'read', '查看工单'),
  ('ticket:update', 'ticket', 'update', '更新工单'),
  ('ticket:delete', 'ticket', 'delete', '删除工单'),
  ('ticket:close', 'ticket', 'close', '关闭工单'),
  ('ticket:assign', 'ticket', 'assign', '分配工单'),
  ('ticket:stats', 'ticket', 'stats', '工单统计'),
  ('ticket:admin', 'ticket', 'admin', '工单系统管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 18. 事件溯源权限 (4个)
-- 对应: user-service/src/users/events/events.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('event:list', 'event', 'list', '事件列表'),
  ('event:replay', 'event', 'replay', '重放事件'),
  ('event:snapshot', 'event', 'snapshot', '事件快照'),
  ('event:admin', 'event', 'admin', '事件系统管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 19. 计量服务权限 (5个)
-- 对应: billing-service/src/metering/metering.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('metering:read', 'metering', 'read', '查看计量数据'),
  ('metering:record', 'metering', 'record', '记录计量数据'),
  ('metering:stats', 'metering', 'stats', '计量统计'),
  ('metering:export', 'metering', 'export', '导出计量数据'),
  ('metering:admin', 'metering', 'admin', '计量系统管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 20. 发票管理权限 (6个)
-- 对应: billing-service/src/invoices/invoices.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('invoice:create', 'invoice', 'create', '创建发票'),
  ('invoice:read', 'invoice', 'read', '查看发票'),
  ('invoice:update', 'invoice', 'update', '更新发票'),
  ('invoice:download', 'invoice', 'download', '下载发票'),
  ('invoice:send', 'invoice', 'send', '发送发票'),
  ('invoice:admin', 'invoice', 'admin', '发票系统管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 21. 优惠券管理权限 (6个)
-- 对应: billing-service/src/coupons/coupons.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('coupon:create', 'coupon', 'create', '创建优惠券'),
  ('coupon:read', 'coupon', 'read', '查看优惠券'),
  ('coupon:update', 'coupon', 'update', '更新优惠券'),
  ('coupon:delete', 'coupon', 'delete', '删除优惠券'),
  ('coupon:redeem', 'coupon', 'redeem', '兑换优惠券'),
  ('coupon:admin', 'coupon', 'admin', '优惠券系统管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 22. 推荐系统权限 (5个)
-- 对应: billing-service/src/referrals/referrals.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('referral:read', 'referral', 'read', '查看推荐信息'),
  ('referral:create', 'referral', 'create', '创建推荐码'),
  ('referral:stats', 'referral', 'stats', '推荐统计'),
  ('referral:config', 'referral', 'config', '推荐配置'),
  ('referral:admin', 'referral', 'admin', '推荐系统管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 23. 活动记录权限 (4个)
-- 对应: billing-service/src/activities/activities.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('activity:read', 'activity', 'read', '查看活动记录'),
  ('activity:list', 'activity', 'list', '活动记录列表'),
  ('activity:stats', 'activity', 'stats', '活动统计'),
  ('activity:admin', 'activity', 'admin', '活动系统管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 24. 余额管理权限 (6个)
-- 对应: billing-service/src/balance/balance.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('balance:read', 'balance', 'read', '查看余额'),
  ('balance:recharge', 'balance', 'recharge', '充值余额'),
  ('balance:deduct', 'balance', 'deduct', '扣减余额'),
  ('balance:history', 'balance', 'history', '余额历史'),
  ('balance:transfer', 'balance', 'transfer', '余额转账'),
  ('balance:admin', 'balance', 'admin', '余额系统管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 25. 支付管理权限 (6个)
-- 对应: billing-service/src/payments/*.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('payment:create', 'payment', 'create', '创建支付'),
  ('payment:read', 'payment', 'read', '查看支付'),
  ('payment:refund', 'payment', 'refund', '退款'),
  ('payment:methods', 'payment', 'methods', '支付方式管理'),
  ('payment:stats', 'payment', 'stats', '支付统计'),
  ('payment:admin', 'payment', 'admin', '支付系统管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 26. 报表管理权限 (5个)
-- 对应: billing-service/src/reports/reports.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('report:read', 'report', 'read', '查看报表'),
  ('report:create', 'report', 'create', '创建报表'),
  ('report:export', 'report', 'export', '导出报表'),
  ('report:schedule', 'report', 'schedule', '报表计划'),
  ('report:admin', 'report', 'admin', '报表系统管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 27. 虚拟号码管理权限 (6个)
-- 对应: sms-receive-service/src/controllers/numbers.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('virtual-number:request', 'virtual-number', 'request', '申请虚拟号码'),
  ('virtual-number:read', 'virtual-number', 'read', '查看虚拟号码'),
  ('virtual-number:release', 'virtual-number', 'release', '释放虚拟号码'),
  ('virtual-number:list', 'virtual-number', 'list', '虚拟号码列表'),
  ('virtual-number:stats', 'virtual-number', 'stats', '虚拟号码统计'),
  ('virtual-number:admin', 'virtual-number', 'admin', '虚拟号码管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 28. 代理智能推荐权限 (4个)
-- 对应: proxy-service/src/proxy/controllers/proxy-intelligence.controller.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('proxy:intelligence:recommend', 'proxy-intelligence', 'recommend', '智能代理推荐'),
  ('proxy:intelligence:analyze', 'proxy-intelligence', 'analyze', '代理分析'),
  ('proxy:intelligence:optimize', 'proxy-intelligence', 'optimize', '代理优化'),
  ('proxy:intelligence:admin', 'proxy-intelligence', 'admin', '智能推荐管理')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 29. 代理质量监控权限 (4个)
-- 对应: proxy-service/src/proxy/services/proxy-quality.service.ts
-- ============================================
INSERT INTO permissions (name, resource, action, description)
VALUES
  ('proxy:quality:read', 'proxy-quality', 'read', '查看代理质量'),
  ('proxy:quality:report', 'proxy-quality', 'report', '质量报告'),
  ('proxy:quality:threshold', 'proxy-quality', 'threshold', '质量阈值配置'),
  ('proxy:quality:admin', 'proxy-quality', 'admin', '质量监控管理')
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- ============================================
-- 为各角色分配新权限
-- ============================================

BEGIN;

-- 为 super_admin 分配所有新权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
AND p.resource IN (
  'gpu', 'device-template', 'device-strategy', 'provider',
  'data-scope', 'field-permission', 'menu', 'quota', 'api-key',
  'audit-log', 'cache', 'queue', 'settings', 'ticket', 'event',
  'metering', 'invoice', 'coupon', 'referral', 'activity',
  'balance', 'payment', 'report', 'virtual-number',
  'proxy-intelligence', 'proxy-quality'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 设备批量操作权限分配给 super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
AND p.name LIKE 'device:batch-%'
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 生命周期权限分配给 super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
AND p.name LIKE 'lifecycle:%'
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 为 tenant_admin 分配管理权限（排除系统级权限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'tenant_admin'
AND p.resource IN (
  'device-template', 'device-strategy', 'quota', 'ticket',
  'invoice', 'coupon', 'referral', 'activity', 'balance', 'payment',
  'virtual-number'
)
AND p.action NOT IN ('admin')
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 为 devops 分配运维相关权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'devops'
AND (
  p.resource IN ('gpu', 'cache', 'queue', 'audit-log', 'metering', 'proxy-quality')
  OR p.name LIKE 'lifecycle:%'
  OR p.name LIKE 'device:batch-%'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 为 finance 分配财务相关权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'finance'
AND p.resource IN ('invoice', 'balance', 'payment', 'report', 'metering')
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 为 customer_service 分配客服相关权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'customer_service'
AND p.resource IN ('ticket', 'activity')
AND p.action IN ('read', 'list', 'create', 'update')
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 为 vip_user 分配增强权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'vip_user'
AND (
  (p.resource IN ('device-template', 'coupon', 'referral', 'virtual-number')
   AND p.action IN ('read', 'list', 'create'))
  OR (p.resource = 'balance' AND p.action IN ('read', 'history'))
  OR (p.resource = 'invoice' AND p.action IN ('read', 'download'))
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 为普通用户分配基础权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'user'
AND (
  (p.resource = 'ticket' AND p.action IN ('create', 'read', 'update'))
  OR (p.resource = 'balance' AND p.action = 'read')
  OR (p.resource = 'invoice' AND p.action IN ('read', 'download'))
  OR (p.resource = 'coupon' AND p.action IN ('read', 'redeem'))
  OR (p.resource = 'referral' AND p.action IN ('read', 'create'))
  OR (p.resource = 'activity' AND p.action = 'read')
  OR (p.resource = 'virtual-number' AND p.action IN ('request', 'read', 'release'))
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 为 readonly_user 分配所有读取权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'readonly_user'
AND (p.action = 'read' OR p.action = 'list' OR p.action = 'stats')
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 为 data_analyst 分配统计和报表权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'data_analyst'
AND (
  p.action IN ('read', 'stats', 'export', 'list')
  OR p.resource = 'report'
  OR p.resource = 'metering'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

COMMIT;

-- ============================================
-- 验证查询
-- ============================================

-- 查看新增权限总数
SELECT 'P3 新增权限总数' as metric, COUNT(*) as value
FROM permissions
WHERE resource IN (
  'gpu', 'device-template', 'device-strategy', 'provider',
  'data-scope', 'field-permission', 'menu', 'quota', 'api-key',
  'audit-log', 'cache', 'queue', 'settings', 'ticket', 'event',
  'metering', 'invoice', 'coupon', 'referral', 'activity',
  'balance', 'payment', 'report', 'virtual-number',
  'proxy-intelligence', 'proxy-quality'
);

-- 查看总权限数
SELECT '系统总权限数' as metric, COUNT(*) as value FROM permissions;

-- 查看 super_admin 总权限数
SELECT
  'super_admin 权限数' as metric,
  COUNT(rp.permission_id) as value
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.name = 'super_admin';

-- 按资源查看新权限分布
SELECT
  resource,
  COUNT(*) as permission_count
FROM permissions
WHERE resource IN (
  'gpu', 'device-template', 'device-strategy', 'provider',
  'data-scope', 'field-permission', 'menu', 'quota', 'api-key',
  'audit-log', 'cache', 'queue', 'settings', 'ticket', 'event',
  'metering', 'invoice', 'coupon', 'referral', 'activity',
  'balance', 'payment', 'report', 'virtual-number',
  'proxy-intelligence', 'proxy-quality'
)
GROUP BY resource
ORDER BY permission_count DESC;

-- 查看各角色权限数量
SELECT
  r.name as role_name,
  r.description,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r."isSystem" = true
GROUP BY r.id, r.name, r.description
ORDER BY permission_count DESC;
