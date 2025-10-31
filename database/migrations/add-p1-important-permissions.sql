-- ============================================
-- P1 重要权限 SQL 插入语句
-- 添加重要功能的权限
-- 总计: 71 个新权限
-- ============================================

-- 1. TICKET 工单系统 (7个权限)
-- 工单是客户服务的核心
INSERT INTO permissions (name, resource, action, description) VALUES
('ticket:create', 'ticket', 'create', '创建工单'),
('ticket:read', 'ticket', 'read', '查看工单'),
('ticket:update', 'ticket', 'update', '更新工单'),
('ticket:list', 'ticket', 'list', '工单列表'),
('ticket:reply', 'ticket', 'reply', '回复工单'),
('ticket:rate', 'ticket', 'rate', '评价工单'),
('ticket:stats', 'ticket', 'stats', '工单统计');

-- 2. API-KEY API密钥管理 (8个权限)
-- API密钥用于服务间认证和开放API
INSERT INTO permissions (name, resource, action, description) VALUES
('api-key:create', 'api-key', 'create', '创建API密钥'),
('api-key:read', 'api-key', 'read', '查看API密钥'),
('api-key:update', 'api-key', 'update', '更新API密钥'),
('api-key:delete', 'api-key', 'delete', '删除API密钥'),
('api-key:revoke', 'api-key', 'revoke', '撤销API密钥'),
('api-key:list', 'api-key', 'list', 'API密钥列表'),
('api-key:stats', 'api-key', 'stats', 'API密钥统计'),
('api-key:test', 'api-key', 'test', '测试API密钥');

-- 3. SNAPSHOT 设备快照 (8个权限)
-- 快照用于设备备份和恢复
INSERT INTO permissions (name, resource, action, description) VALUES
('snapshot:create', 'snapshot', 'create', '创建快照'),
('snapshot:restore', 'snapshot', 'restore', '恢复快照'),
('snapshot:compress', 'snapshot', 'compress', '压缩快照'),
('snapshot:delete', 'snapshot', 'delete', '删除快照'),
('snapshot:read', 'snapshot', 'read', '查看快照'),
('snapshot:list', 'snapshot', 'list', '快照列表'),
('snapshot:device-view', 'snapshot', 'device-view', '查看设备快照'),
('snapshot:stats', 'snapshot', 'stats', '快照统计');

-- 4. TEMPLATE 设备模板 (8个权限)
-- 模板用于快速创建标准化设备
INSERT INTO permissions (name, resource, action, description) VALUES
('template:create', 'template', 'create', '创建模板'),
('template:read', 'template', 'read', '查看模板'),
('template:update', 'template', 'update', '更新模板'),
('template:delete', 'template', 'delete', '删除模板'),
('template:search', 'template', 'search', '搜索模板'),
('template:popular', 'template', 'popular', '热门模板'),
('template:create-device', 'template', 'create-device', '从模板创建设备'),
('template:batch-create', 'template', 'batch-create', '批量创建设备');

-- 5. NOTIFICATION 通知管理扩展 (10个权限)
-- 扩展通知功能
INSERT INTO permissions (name, resource, action, description) VALUES
('notification:create', 'notification', 'create', '创建通知'),
('notification:broadcast', 'notification', 'broadcast', '广播通知'),
('notification:unread-count', 'notification', 'unread-count', '未读通知数'),
('notification:user-view', 'notification', 'user-view', '查看用户通知'),
('notification:read', 'notification', 'read', '标记已读'),
('notification:read-all', 'notification', 'read-all', '全部已读'),
('notification:delete', 'notification', 'delete', '删除通知'),
('notification:batch-delete', 'notification', 'batch-delete', '批量删除'),
('notification:stats', 'notification', 'stats', '通知统计'),
('notification:update', 'notification', 'update', '更新通知');

-- 6. BATCH-OPERATION 批量操作 (12个权限)
-- 批量操作用于提高效率
INSERT INTO permissions (name, resource, action, description) VALUES
('batch-operation:create', 'batch-operation', 'create', '创建批量操作'),
('batch-operation:operate', 'batch-operation', 'operate', '执行批量操作'),
('batch-operation:start', 'batch-operation', 'start', '批量启动'),
('batch-operation:stop', 'batch-operation', 'stop', '批量停止'),
('batch-operation:restart', 'batch-operation', 'restart', '批量重启'),
('batch-operation:delete', 'batch-operation', 'delete', '批量删除'),
('batch-operation:execute', 'batch-operation', 'execute', '批量执行命令'),
('batch-operation:install', 'batch-operation', 'install', '批量安装应用'),
('batch-operation:uninstall', 'batch-operation', 'uninstall', '批量卸载应用'),
('batch-operation:status', 'batch-operation', 'status', '批量状态查询'),
('batch-operation:group-stats', 'batch-operation', 'group-stats', '分组统计'),
('batch-operation:group-update', 'batch-operation', 'group-update', '更新分组');

-- 7. METERING 计量 (3个权限)
-- 资源使用计量
INSERT INTO permissions (name, resource, action, description) VALUES
('metering:user-view', 'metering', 'user-view', '查看用户计量'),
('metering:device-view', 'metering', 'device-view', '查看设备计量'),
('metering:tenant-view', 'metering', 'tenant-view', '查看租户计量');

-- 8. REPORT 报表 (6个权限)
-- 数据报表和导出
INSERT INTO permissions (name, resource, action, description) VALUES
('report:bills', 'report', 'bills', '账单报表'),
('report:revenue', 'report', 'revenue', '收入报表'),
('report:usage-trend', 'report', 'usage-trend', '使用趋势报表'),
('report:bills-export', 'report', 'bills-export', '导出账单'),
('report:revenue-export', 'report', 'revenue-export', '导出收入'),
('report:plan-stats', 'report', 'plan-stats', '套餐统计报表');

-- 9. AUDIT-LOG 审计日志扩展 (4个权限)
-- 扩展审计日志功能 (system.audit 已存在)
INSERT INTO permissions (name, resource, action, description) VALUES
('audit-log:search', 'audit-log', 'search', '搜索审计日志'),
('audit-log:user-view', 'audit-log', 'user-view', '查看用户日志'),
('audit-log:resource-view', 'audit-log', 'resource-view', '查看资源日志'),
('audit-log:stats', 'audit-log', 'stats', '审计统计');

-- 10. APP 应用管理扩展 (5个权限)
-- 扩展应用管理功能
INSERT INTO permissions (name, resource, action, description) VALUES
('app:upload', 'app', 'upload', '上传应用'),
('app:install', 'app', 'install', '安装应用'),
('app:uninstall', 'app', 'uninstall', '卸载应用'),
('app:approve', 'app', 'approve', '审批应用'),
('app:reject', 'app', 'reject', '拒绝应用');

-- ============================================
-- 为 super_admin 角色分配所有新增的 P1 权限
-- ============================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
AND p.resource IN (
    'ticket', 'api-key', 'snapshot', 'template',
    'batch-operation', 'metering', 'report', 'audit-log'
)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 为 notification 和 app 的新增权限也分配给 super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
AND (
    (p.resource = 'notification' AND p.action IN ('create', 'broadcast', 'unread-count', 'user-view', 'read', 'read-all', 'delete', 'batch-delete', 'stats', 'update'))
    OR
    (p.resource = 'app' AND p.action IN ('upload', 'install', 'uninstall', 'approve', 'reject'))
)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- ============================================
-- 验证查询
-- ============================================

-- 查看新增的权限总数
SELECT COUNT(*) as p1_permissions_count
FROM permissions
WHERE resource IN (
    'ticket', 'api-key', 'snapshot', 'template',
    'batch-operation', 'metering', 'report', 'audit-log'
)
OR (resource = 'notification' AND action IN ('create', 'broadcast', 'unread-count', 'user-view', 'read', 'read-all', 'delete', 'batch-delete', 'stats', 'update'))
OR (resource = 'app' AND action IN ('upload', 'install', 'uninstall', 'approve', 'reject'));

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
ORDER BY resource;

-- ============================================
-- 回滚脚本 (如果需要撤销)
-- ============================================

/*
-- 删除 role_permissions 中的关联
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions
    WHERE resource IN (
        'ticket', 'api-key', 'snapshot', 'template',
        'batch-operation', 'metering', 'report', 'audit-log'
    )
    OR (resource = 'notification' AND action IN ('create', 'broadcast', 'unread-count', 'user-view', 'read', 'read-all', 'delete', 'batch-delete', 'stats', 'update'))
    OR (resource = 'app' AND action IN ('upload', 'install', 'uninstall', 'approve', 'reject'))
);

-- 删除新增的权限
DELETE FROM permissions
WHERE resource IN (
    'ticket', 'api-key', 'snapshot', 'template',
    'batch-operation', 'metering', 'report', 'audit-log'
)
OR (resource = 'notification' AND action IN ('create', 'broadcast', 'unread-count', 'user-view', 'read', 'read-all', 'delete', 'batch-delete', 'stats', 'update'))
OR (resource = 'app' AND action IN ('upload', 'install', 'uninstall', 'approve', 'reject'));
*/
