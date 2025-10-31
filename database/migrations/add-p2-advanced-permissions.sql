-- ============================================
-- P2 高级功能权限 SQL 插入语句
-- 添加高级运维和管理功能的权限
-- 总计: 90 个新权限
-- ============================================

-- 1. SCHEDULER 调度器 (12个权限)
-- 设备调度和节点管理
INSERT INTO permissions (name, resource, action, description) VALUES
('scheduler:node-create', 'scheduler', 'node-create', '创建调度节点'),
('scheduler:node-read', 'scheduler', 'node-read', '查看调度节点'),
('scheduler:node-update', 'scheduler', 'node-update', '更新调度节点'),
('scheduler:node-delete', 'scheduler', 'node-delete', '删除调度节点'),
('scheduler:node-list', 'scheduler', 'node-list', '调度节点列表'),
('scheduler:node-maintenance', 'scheduler', 'node-maintenance', '节点维护模式'),
('scheduler:node-drain', 'scheduler', 'node-drain', '节点排空'),
('scheduler:node-taints', 'scheduler', 'node-taints', '节点污点管理'),
('scheduler:node-labels', 'scheduler', 'node-labels', '节点标签管理'),
('scheduler:node-stats', 'scheduler', 'node-stats', '节点统计'),
('scheduler:schedule', 'scheduler', 'schedule', '调度设备'),
('scheduler:strategy', 'scheduler', 'strategy', '调度策略');

-- 2. LIFECYCLE 生命周期管理 (12个权限)
-- 自动化生命周期管理
INSERT INTO permissions (name, resource, action, description) VALUES
('lifecycle:cleanup', 'lifecycle', 'cleanup', '清理资源'),
('lifecycle:cleanup-stats', 'lifecycle', 'cleanup-stats', '清理统计'),
('lifecycle:autoscaling-status', 'lifecycle', 'autoscaling-status', '自动扩缩容状态'),
('lifecycle:autoscaling-history', 'lifecycle', 'autoscaling-history', '扩缩容历史'),
('lifecycle:autoscaling-trigger', 'lifecycle', 'autoscaling-trigger', '触发扩缩容'),
('lifecycle:autoscaling-config', 'lifecycle', 'autoscaling-config', '扩缩容配置'),
('lifecycle:backup-config', 'lifecycle', 'backup-config', '备份配置'),
('lifecycle:backup-stats', 'lifecycle', 'backup-stats', '备份统计'),
('lifecycle:backup-trigger', 'lifecycle', 'backup-trigger', '触发备份'),
('lifecycle:backup-device', 'lifecycle', 'backup-device', '设备备份'),
('lifecycle:expiration-check', 'lifecycle', 'expiration-check', '过期检查'),
('lifecycle:backup-cleanup', 'lifecycle', 'backup-cleanup', '清理备份');

-- 3. FAILOVER 故障转移 (7个权限)
-- 故障检测和恢复
INSERT INTO permissions (name, resource, action, description) VALUES
('failover:config', 'failover', 'config', '故障转移配置'),
('failover:stats', 'failover', 'stats', '故障转移统计'),
('failover:history', 'failover', 'history', '故障历史'),
('failover:device-history', 'failover', 'device-history', '设备故障历史'),
('failover:migration-history', 'failover', 'migration-history', '迁移历史'),
('failover:detect', 'failover', 'detect', '故障检测'),
('failover:recover', 'failover', 'recover', '故障恢复');

-- 4. STATE-RECOVERY 状态恢复 (6个权限)
-- 状态一致性和恢复
INSERT INTO permissions (name, resource, action, description) VALUES
('state-recovery:config', 'state-recovery', 'config', '状态恢复配置'),
('state-recovery:stats', 'state-recovery', 'stats', '状态恢复统计'),
('state-recovery:inconsistencies', 'state-recovery', 'inconsistencies', '不一致列表'),
('state-recovery:operations', 'state-recovery', 'operations', '操作历史'),
('state-recovery:check', 'state-recovery', 'check', '状态检查'),
('state-recovery:rollback', 'state-recovery', 'rollback', '状态回滚');

-- 5. PHYSICAL-DEVICE 物理设备 (11个权限)
-- 物理Android设备管理
INSERT INTO permissions (name, resource, action, description) VALUES
('physical-device:scan', 'physical-device', 'scan', '扫描物理设备'),
('physical-device:create', 'physical-device', 'create', '注册物理设备'),
('physical-device:read', 'physical-device', 'read', '查看物理设备'),
('physical-device:update', 'physical-device', 'update', '更新物理设备'),
('physical-device:delete', 'physical-device', 'delete', '删除物理设备'),
('physical-device:list', 'physical-device', 'list', '物理设备列表'),
('physical-device:available', 'physical-device', 'available', '可用设备'),
('physical-device:health-check', 'physical-device', 'health-check', '健康检查'),
('physical-device:maintenance', 'physical-device', 'maintenance', '设备维护'),
('physical-device:restore', 'physical-device', 'restore', '恢复设备'),
('physical-device:stats', 'physical-device', 'stats', '设备统计');

-- 6. SMS 短信 (12个权限)
-- SMS短信服务
INSERT INTO permissions (name, resource, action, description) VALUES
('sms:send', 'sms', 'send', '发送短信'),
('sms:send-otp', 'sms', 'send-otp', '发送验证码'),
('sms:send-batch', 'sms', 'send-batch', '批量发送'),
('sms:stats', 'sms', 'stats', '短信统计'),
('sms:health', 'sms', 'health', '服务健康'),
('sms:validate', 'sms', 'validate', '验证配置'),
('sms:otp-send', 'sms', 'otp-send', 'OTP发送'),
('sms:otp-verify', 'sms', 'otp-verify', 'OTP验证'),
('sms:otp-active', 'sms', 'otp-active', '活跃OTP'),
('sms:otp-retries', 'sms', 'otp-retries', 'OTP重试'),
('sms:otp-stats', 'sms', 'otp-stats', 'OTP统计'),
('sms:otp-clear', 'sms', 'otp-clear', '清除OTP');

-- 7. PREFERENCE 通知偏好 (8个权限)
-- 用户通知偏好设置
INSERT INTO permissions (name, resource, action, description) VALUES
('preference:read', 'preference', 'read', '查看偏好'),
('preference:update', 'preference', 'update', '更新偏好'),
('preference:batch', 'preference', 'batch', '批量设置'),
('preference:reset', 'preference', 'reset', '重置偏好'),
('preference:types', 'preference', 'types', '偏好类型'),
('preference:stats', 'preference', 'stats', '偏好统计'),
('preference:check', 'preference', 'check', '检查偏好'),
('preference:channel', 'preference', 'channel', '通道偏好');

-- 8. BILLING-RULE 计费规则 (6个权限)
-- 计费规则管理
INSERT INTO permissions (name, resource, action, description) VALUES
('billing-rule:create', 'billing-rule', 'create', '创建计费规则'),
('billing-rule:read', 'billing-rule', 'read', '查看计费规则'),
('billing-rule:update', 'billing-rule', 'update', '更新计费规则'),
('billing-rule:delete', 'billing-rule', 'delete', '删除计费规则'),
('billing-rule:list', 'billing-rule', 'list', '计费规则列表'),
('billing-rule:calculate', 'billing-rule', 'calculate', '计算费用');

-- 9. STATS 统计仪表板 (10个权限)
-- 统计分析和仪表板
INSERT INTO permissions (name, resource, action, description) VALUES
('stats:dashboard', 'stats', 'dashboard', '仪表盘总览'),
('stats:device-online', 'stats', 'device-online', '在线设备统计'),
('stats:device-distribution', 'stats', 'device-distribution', '设备分布'),
('stats:user-today', 'stats', 'user-today', '今日用户'),
('stats:user-activity', 'stats', 'user-activity', '用户活跃度'),
('stats:user-growth', 'stats', 'user-growth', '用户增长'),
('stats:revenue-today', 'stats', 'revenue-today', '今日收入'),
('stats:revenue-month', 'stats', 'revenue-month', '本月收入'),
('stats:revenue-trend', 'stats', 'revenue-trend', '收入趋势'),
('stats:plan-distribution', 'stats', 'plan-distribution', '套餐分布');

-- 10. GPU GPU管理 (4个权限)
-- GPU资源管理
INSERT INTO permissions (name, resource, action, description) VALUES
('gpu:info', 'gpu', 'info', 'GPU信息'),
('gpu:diagnostics', 'gpu', 'diagnostics', 'GPU诊断'),
('gpu:recommended-config', 'gpu', 'recommended-config', '推荐配置'),
('gpu:stats', 'gpu', 'stats', 'GPU统计');

-- 11. RETRY 重试机制 (3个权限)
-- 重试统计和管理
INSERT INTO permissions (name, resource, action, description) VALUES
('retry:stats', 'retry', 'stats', '重试统计'),
('retry:summary', 'retry', 'summary', '重试摘要'),
('retry:reset', 'retry', 'reset', '重置重试');

-- 12. BILLING 账单管理扩展 (5个权限)
-- 扩展账单管理功能
INSERT INTO permissions (name, resource, action, description) VALUES
('billing:stats', 'billing', 'stats', '账单统计'),
('billing:orders', 'billing', 'orders', '订单管理'),
('billing:order-cancel', 'billing', 'order-cancel', '取消订单'),
('billing:usage-view', 'billing', 'usage-view', '查看使用量'),
('billing:usage-start', 'billing', 'usage-start', '开始计量');

-- ============================================
-- 为 super_admin 角色分配所有新增的 P2 权限
-- ============================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
AND p.resource IN (
    'scheduler', 'lifecycle', 'failover', 'state-recovery',
    'physical-device', 'sms', 'preference', 'billing-rule',
    'stats', 'gpu', 'retry'
)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 为 billing 的新增权限也分配给 super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
AND p.resource = 'billing'
AND p.action IN ('stats', 'orders', 'order-cancel', 'usage-view', 'usage-start')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- ============================================
-- 验证查询
-- ============================================

-- 查看新增的权限总数
SELECT COUNT(*) as p2_permissions_count
FROM permissions
WHERE resource IN (
    'scheduler', 'lifecycle', 'failover', 'state-recovery',
    'physical-device', 'sms', 'preference', 'billing-rule',
    'stats', 'gpu', 'retry'
)
OR (resource = 'billing' AND action IN ('stats', 'orders', 'order-cancel', 'usage-view', 'usage-start'));

-- 查看总权限数
SELECT COUNT(*) as total_permissions FROM permissions;

-- 查看 super_admin 角色的总权限数
SELECT
    r.name as role_name,
    COUNT(rp.permission_id) as total_permissions
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.name = 'super_admin'
GROUP BY r.name;

-- 按资源查看权限分布
SELECT
    resource,
    COUNT(*) as count
FROM permissions
GROUP BY resource
ORDER BY count DESC, resource;

-- ============================================
-- 回滚脚本 (如果需要撤销)
-- ============================================

/*
-- 删除 role_permissions 中的关联
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions
    WHERE resource IN (
        'scheduler', 'lifecycle', 'failover', 'state-recovery',
        'physical-device', 'sms', 'preference', 'billing-rule',
        'stats', 'gpu', 'retry'
    )
    OR (resource = 'billing' AND action IN ('stats', 'orders', 'order-cancel', 'usage-view', 'usage-start'))
);

-- 删除新增的权限
DELETE FROM permissions
WHERE resource IN (
    'scheduler', 'lifecycle', 'failover', 'state-recovery',
    'physical-device', 'sms', 'preference', 'billing-rule',
    'stats', 'gpu', 'retry'
)
OR (resource = 'billing' AND action IN ('stats', 'orders', 'order-cancel', 'usage-view', 'usage-start'));
*/
