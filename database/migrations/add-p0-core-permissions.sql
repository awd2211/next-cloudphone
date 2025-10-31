-- ============================================
-- P0 核心权限 SQL 插入语句
-- 添加最关键的业务权限
-- 总计: 55 个新权限
-- ============================================

-- 1. QUOTA 配额管理 (9个权限)
-- 配额是多租户系统的核心,控制资源使用
INSERT INTO permissions (name, resource, action, description) VALUES
('quota:create', 'quota', 'create', '创建配额'),
('quota:read', 'quota', 'read', '查看配额'),
('quota:update', 'quota', 'update', '更新配额'),
('quota:check', 'quota', 'check', '检查配额'),
('quota:deduct', 'quota', 'deduct', '扣减配额'),
('quota:restore', 'quota', 'restore', '恢复配额'),
('quota:usage-view', 'quota', 'usage-view', '查看配额使用情况'),
('quota:alert-view', 'quota', 'alert-view', '查看配额告警'),
('quota:batch-check', 'quota', 'batch-check', '批量检查配额');

-- 2. DEVICE 设备控制扩展 (9个权限)
-- 设备的启停控制是核心操作
INSERT INTO permissions (name, resource, action, description) VALUES
('device:start', 'device', 'start', '启动设备'),
('device:stop', 'device', 'stop', '停止设备'),
('device:restart', 'device', 'restart', '重启设备'),
('device:reboot', 'device', 'reboot', '重启设备系统'),
('device:heartbeat', 'device', 'heartbeat', '设备心跳检测'),
('device:shell', 'device', 'shell', '设备Shell访问'),
('device:stats', 'device', 'stats', '查看设备统计'),
('device:available', 'device', 'available', '查看可用设备'),
('device:cursor', 'device', 'cursor', '设备游标查询');

-- 3. PAYMENT 支付管理 (20个权限)
-- 支付是计费系统的核心
INSERT INTO permissions (name, resource, action, description) VALUES
('payment:create', 'payment', 'create', '创建支付'),
('payment:read', 'payment', 'read', '查看支付'),
('payment:list', 'payment', 'list', '支付列表'),
('payment:query', 'payment', 'query', '查询支付状态'),
('payment:refund', 'payment', 'refund', '发起退款'),
('payment:notify', 'payment', 'notify', '支付回调处理'),
('payment:stats', 'payment', 'stats', '支付统计'),
('payment:daily-stats', 'payment', 'daily-stats', '每日支付统计'),
('payment:method-stats', 'payment', 'method-stats', '支付方式统计'),
('payment:refund-approve', 'payment', 'refund-approve', '批准退款'),
('payment:refund-reject', 'payment', 'refund-reject', '拒绝退款'),
('payment:refund-pending', 'payment', 'refund-pending', '待处理退款列表'),
('payment:exception-list', 'payment', 'exception-list', '异常支付列表'),
('payment:sync', 'payment', 'sync', '同步支付状态'),
('payment:export', 'payment', 'export', '导出支付数据'),
('payment:config', 'payment', 'config', '支付配置管理'),
('payment:test', 'payment', 'test', '测试支付接口'),
('payment:wechat-notify', 'payment', 'wechat-notify', '微信支付回调'),
('payment:alipay-notify', 'payment', 'alipay-notify', '支付宝回调'),
('payment:refunds', 'payment', 'refunds', '退款管理');

-- 4. INVOICE 发票管理 (8个权限)
-- 发票是财务合规的核心
INSERT INTO permissions (name, resource, action, description) VALUES
('invoice:create', 'invoice', 'create', '创建发票'),
('invoice:read', 'invoice', 'read', '查看发票'),
('invoice:publish', 'invoice', 'publish', '发布发票'),
('invoice:pay', 'invoice', 'pay', '支付发票'),
('invoice:cancel', 'invoice', 'cancel', '取消发票'),
('invoice:user-view', 'invoice', 'user-view', '查看用户发票'),
('invoice:stats', 'invoice', 'stats', '发票统计'),
('invoice:list', 'invoice', 'list', '发票列表');

-- 5. BALANCE 余额管理 (9个权限)
-- 余额管理是计费的核心
INSERT INTO permissions (name, resource, action, description) VALUES
('balance:create', 'balance', 'create', '创建余额账户'),
('balance:read', 'balance', 'read', '查看余额'),
('balance:recharge', 'balance', 'recharge', '充值'),
('balance:consume', 'balance', 'consume', '消费'),
('balance:freeze', 'balance', 'freeze', '冻结余额'),
('balance:unfreeze', 'balance', 'unfreeze', '解冻余额'),
('balance:adjust', 'balance', 'adjust', '调整余额'),
('balance:transactions', 'balance', 'transactions', '交易记录'),
('balance:stats', 'balance', 'stats', '余额统计');

-- ============================================
-- 为 super_admin 角色分配所有新增的 P0 权限
-- ============================================

-- 获取 super_admin 角色ID 和新增权限ID,然后插入 role_permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
AND p.resource IN ('quota', 'payment', 'invoice', 'balance')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 为 device 资源的新增权限也分配给 super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
AND p.resource = 'device'
AND p.action IN ('start', 'stop', 'restart', 'reboot', 'heartbeat', 'shell', 'stats', 'available', 'cursor')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- ============================================
-- 验证查询
-- ============================================

-- 查看新增的权限总数
SELECT COUNT(*) as new_permissions_count
FROM permissions
WHERE resource IN ('quota', 'payment', 'invoice', 'balance')
   OR (resource = 'device' AND action IN ('start', 'stop', 'restart', 'reboot', 'heartbeat', 'shell', 'stats', 'available', 'cursor'));

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
    COUNT(*) as count,
    string_agg(action, ', ' ORDER BY action) as actions
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
    WHERE resource IN ('quota', 'payment', 'invoice', 'balance')
       OR (resource = 'device' AND action IN ('start', 'stop', 'restart', 'reboot', 'heartbeat', 'shell', 'stats', 'available', 'cursor'))
);

-- 删除新增的权限
DELETE FROM permissions
WHERE resource IN ('quota', 'payment', 'invoice', 'balance')
   OR (resource = 'device' AND action IN ('start', 'stop', 'restart', 'reboot', 'heartbeat', 'shell', 'stats', 'available', 'cursor'));
*/
