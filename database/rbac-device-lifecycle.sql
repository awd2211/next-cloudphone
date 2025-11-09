-- ============================================
-- RBAC 优化 - 设备生命周期权限
-- 细化设备状态转换控制
-- Date: 2025-11-06
-- ============================================

BEGIN;

-- ============================================
-- 1. 设备生命周期权限
-- ============================================

-- 设备创建和初始化
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('30000000-0000-0000-0000-000000000200', 'device.initialize', '初始化设备（创建后配置）', 'device', 'initialize', true),
('30000000-0000-0000-0000-000000000201', 'device.provision', '配置设备资源（CPU、内存、存储）', 'device', 'provision', true),
('30000000-0000-0000-0000-000000000202', 'device.clone', '克隆现有设备', 'device', 'clone', true);

-- 设备启动和运行
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('30000000-0000-0000-0000-000000000210', 'device.boot', '启动设备（从关机到开机）', 'device', 'boot', true),
('30000000-0000-0000-0000-000000000211', 'device.resume', '恢复设备（从暂停到运行）', 'device', 'resume', true),
('30000000-0000-0000-0000-000000000212', 'device.reboot', '重启设备', 'device', 'reboot', true);

-- 设备暂停和停止
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('30000000-0000-0000-0000-000000000220', 'device.pause', '暂停设备（保留内存状态）', 'device', 'pause', true),
('30000000-0000-0000-0000-000000000221', 'device.suspend', '挂起设备（休眠）', 'device', 'suspend', true),
('30000000-0000-0000-0000-000000000222', 'device.shutdown', '关闭设备（优雅停机）', 'device', 'shutdown', true),
('30000000-0000-0000-0000-000000000223', 'device.force-stop', '强制停止设备（可能丢失数据）', 'device', 'force-stop', true);

-- 设备维护和恢复
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('30000000-0000-0000-0000-000000000230', 'device.backup', '备份设备状态', 'device', 'backup', true),
('30000000-0000-0000-0000-000000000231', 'device.restore', '恢复设备状态', 'device', 'restore', true),
('30000000-0000-0000-0000-000000000232', 'device.migrate', '迁移设备到其他节点', 'device', 'migrate', true),
('30000000-0000-0000-0000-000000000233', 'device.reset', '重置设备到出厂状态', 'device', 'reset', true);

-- 设备归档和删除
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('30000000-0000-0000-0000-000000000240', 'device.archive', '归档设备（停用但保留数据）', 'device', 'archive', true),
('30000000-0000-0000-0000-000000000241', 'device.unarchive', '取消归档设备', 'device', 'unarchive', true),
('30000000-0000-0000-0000-000000000242', 'device.soft-delete', '软删除设备（可恢复）', 'device', 'soft-delete', true),
('30000000-0000-0000-0000-000000000243', 'device.hard-delete', '硬删除设备（不可恢复）', 'device', 'hard-delete', true),
('30000000-0000-0000-0000-000000000244', 'device.purge', '清除设备所有数据', 'device', 'purge', true);

-- 设备状态查询
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('30000000-0000-0000-0000-000000000250', 'device.status.view', '查看设备运行状态', 'device', 'view-status', true),
('30000000-0000-0000-0000-000000000251', 'device.metrics.view', '查看设备性能指标', 'device', 'view-metrics', true),
('30000000-0000-0000-0000-000000000252', 'device.logs.view', '查看设备日志', 'device', 'view-logs', true),
('30000000-0000-0000-0000-000000000253', 'device.events.view', '查看设备事件历史', 'device', 'view-events', true);

-- 设备配置管理
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('30000000-0000-0000-0000-000000000260', 'device.config.view', '查看设备配置', 'device', 'view-config', true),
('30000000-0000-0000-0000-000000000261', 'device.config.update', '更新设备配置', 'device', 'update-config', true),
('30000000-0000-0000-0000-000000000262', 'device.resources.scale', '调整设备资源（CPU、内存）', 'device', 'scale', true),
('30000000-0000-0000-0000-000000000263', 'device.network.config', '配置设备网络', 'device', 'config-network', true);

-- ============================================
-- 2. 应用生命周期权限
-- ============================================

INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('10000000-0000-0000-0000-000000000300', 'app.package', '打包应用', 'app', 'package', true),
('10000000-0000-0000-0000-000000000301', 'app.publish', '发布应用到市场', 'app', 'publish', true),
('10000000-0000-0000-0000-000000000302', 'app.unpublish', '下架应用', 'app', 'unpublish', true),
('10000000-0000-0000-0000-000000000303', 'app.deprecate', '标记应用为废弃', 'app', 'deprecate', true);

-- ============================================
-- 3. 为角色分配生命周期权限
-- ============================================

-- super_admin: 所有生命周期权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000000', id FROM permissions
WHERE id::text LIKE '30000000-0000-0000-0000-0000002%'
   OR id::text LIKE '10000000-0000-0000-0000-0000003%'
ON CONFLICT DO NOTHING;

-- admin: 大部分生命周期权限（排除危险操作）
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions
WHERE name IN (
  -- 设备创建和初始化
  'device.initialize', 'device.provision', 'device.clone',
  -- 设备启动和运行
  'device.boot', 'device.resume', 'device.reboot',
  -- 设备暂停和停止
  'device.pause', 'device.suspend', 'device.shutdown',
  -- 设备维护（不包括 migrate）
  'device.backup', 'device.restore', 'device.reset',
  -- 设备归档（不包括 hard-delete 和 purge）
  'device.archive', 'device.unarchive', 'device.soft-delete',
  -- 设备状态查询
  'device.status.view', 'device.metrics.view', 'device.logs.view', 'device.events.view',
  -- 设备配置管理
  'device.config.view', 'device.config.update', 'device.resources.scale', 'device.network.config',
  -- 应用生命周期
  'app.package', 'app.publish', 'app.unpublish', 'app.deprecate'
)
ON CONFLICT DO NOTHING;

-- tenant_admin: 租户级生命周期权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM permissions
WHERE name IN (
  -- 设备创建和初始化
  'device.initialize', 'device.provision', 'device.clone',
  -- 设备启动和运行
  'device.boot', 'device.resume', 'device.reboot',
  -- 设备暂停和停止
  'device.pause', 'device.suspend', 'device.shutdown',
  -- 设备维护
  'device.backup', 'device.restore',
  -- 设备归档
  'device.archive', 'device.unarchive', 'device.soft-delete',
  -- 设备状态查询
  'device.status.view', 'device.metrics.view', 'device.logs.view', 'device.events.view',
  -- 设备配置管理（受限）
  'device.config.view', 'device.config.update', 'device.resources.scale',
  -- 应用生命周期
  'app.package', 'app.publish', 'app.unpublish'
)
ON CONFLICT DO NOTHING;

-- department_admin: 部门级生命周期权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'department_admin'), id FROM permissions
WHERE name IN (
  -- 设备启动和运行
  'device.boot', 'device.resume', 'device.reboot',
  -- 设备暂停和停止
  'device.pause', 'device.suspend', 'device.shutdown',
  -- 设备维护（仅备份）
  'device.backup',
  -- 设备状态查询
  'device.status.view', 'device.metrics.view', 'device.logs.view',
  -- 设备配置管理（仅查看）
  'device.config.view'
)
ON CONFLICT DO NOTHING;

-- vip_user: VIP 用户生命周期权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'vip_user'), id FROM permissions
WHERE name IN (
  -- 设备创建和初始化
  'device.initialize', 'device.provision', 'device.clone',
  -- 设备启动和运行
  'device.boot', 'device.resume', 'device.reboot',
  -- 设备暂停和停止
  'device.pause', 'device.suspend', 'device.shutdown',
  -- 设备维护
  'device.backup', 'device.restore', 'device.reset',
  -- 设备归档
  'device.archive', 'device.soft-delete',
  -- 设备状态查询
  'device.status.view', 'device.metrics.view', 'device.logs.view', 'device.events.view',
  -- 设备配置管理
  'device.config.view', 'device.config.update', 'device.resources.scale',
  -- 应用生命周期
  'app.package'
)
ON CONFLICT DO NOTHING;

-- enterprise_user: 企业用户生命周期权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'enterprise_user'), id FROM permissions
WHERE name IN (
  -- 设备创建和初始化
  'device.initialize', 'device.clone',
  -- 设备启动和运行
  'device.boot', 'device.resume', 'device.reboot',
  -- 设备暂停和停止
  'device.pause', 'device.shutdown',
  -- 设备维护（仅备份）
  'device.backup', 'device.restore',
  -- 设备归档
  'device.soft-delete',
  -- 设备状态查询
  'device.status.view', 'device.metrics.view', 'device.logs.view',
  -- 设备配置管理（仅查看）
  'device.config.view'
)
ON CONFLICT DO NOTHING;

-- user: 普通用户生命周期权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions
WHERE name IN (
  -- 设备启动和运行
  'device.boot', 'device.resume', 'device.reboot',
  -- 设备暂停和停止
  'device.pause', 'device.shutdown',
  -- 设备维护（仅备份）
  'device.backup', 'device.restore',
  -- 设备归档
  'device.soft-delete',
  -- 设备状态查询
  'device.status.view', 'device.metrics.view', 'device.logs.view',
  -- 设备配置管理（仅查看）
  'device.config.view'
)
ON CONFLICT DO NOTHING;

-- devops: 运维工程师生命周期权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'devops'), id FROM permissions
WHERE name IN (
  -- 设备启动和运行（包括强制操作）
  'device.boot', 'device.resume', 'device.reboot',
  -- 设备暂停和停止（包括强制停止）
  'device.pause', 'device.suspend', 'device.shutdown', 'device.force-stop',
  -- 设备维护（包括迁移）
  'device.backup', 'device.restore', 'device.migrate', 'device.reset',
  -- 设备状态查询（全部）
  'device.status.view', 'device.metrics.view', 'device.logs.view', 'device.events.view',
  -- 设备配置管理（全部）
  'device.config.view', 'device.config.update', 'device.resources.scale', 'device.network.config'
)
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================
-- 验证结果
-- ============================================

-- 统计生命周期权限数量
SELECT
  '生命周期权限统计' as info,
  CASE
    WHEN name LIKE 'device.initialize' OR name LIKE 'device.provision' OR name LIKE 'device.clone' THEN '1. 创建和初始化'
    WHEN name LIKE 'device.boot' OR name LIKE 'device.resume' OR name LIKE 'device.reboot' THEN '2. 启动和运行'
    WHEN name LIKE 'device.pause' OR name LIKE 'device.suspend' OR name LIKE 'device.shutdown' OR name LIKE 'device.force-stop' THEN '3. 暂停和停止'
    WHEN name LIKE 'device.backup' OR name LIKE 'device.restore' OR name LIKE 'device.migrate' OR name LIKE 'device.reset' THEN '4. 维护和恢复'
    WHEN name LIKE 'device.archive' OR name LIKE 'device.unarchive' OR name LIKE 'device.soft-delete' OR name LIKE 'device.hard-delete' OR name LIKE 'device.purge' THEN '5. 归档和删除'
    WHEN name LIKE 'device.status%' OR name LIKE 'device.metrics%' OR name LIKE 'device.logs%' OR name LIKE 'device.events%' THEN '6. 状态查询'
    WHEN name LIKE 'device.config%' OR name LIKE 'device.resources%' OR name LIKE 'device.network%' THEN '7. 配置管理'
    WHEN resource = 'app' AND (name LIKE 'app.package' OR name LIKE 'app.publish' OR name LIKE 'app.unpublish' OR name LIKE 'app.deprecate') THEN '8. 应用生命周期'
  END as category,
  COUNT(*) as count
FROM permissions
WHERE id::text LIKE '30000000-0000-0000-0000-0000002%'
   OR id::text LIKE '10000000-0000-0000-0000-0000003%'
GROUP BY category
ORDER BY category;

-- 查看各角色的生命周期权限数量
SELECT
  '角色生命周期权限' as info,
  r.name as role_name,
  COUNT(p.id) as lifecycle_permissions
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE (p.id::text LIKE '30000000-0000-0000-0000-0000002%'
   OR p.id::text LIKE '10000000-0000-0000-0000-0000003%')
  AND r.name IN ('super_admin', 'admin', 'tenant_admin', 'department_admin', 'vip_user', 'user', 'enterprise_user', 'devops')
GROUP BY r.name
ORDER BY lifecycle_permissions DESC;

-- 展示生命周期权限示例
SELECT
  '生命周期权限示例' as 示例,
  name as 权限名称,
  description as 描述,
  action as 操作类型
FROM permissions
WHERE name IN (
  'device.boot', 'device.pause', 'device.shutdown', 'device.force-stop',
  'device.backup', 'device.restore', 'device.migrate',
  'device.soft-delete', 'device.hard-delete', 'device.purge'
)
ORDER BY name;
