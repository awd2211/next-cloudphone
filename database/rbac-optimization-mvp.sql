-- ============================================
-- RBAC 优化 MVP 实施脚本
-- 包含3个核心优化：
-- 1. 资源所有权权限
-- 2. 批量操作权限
-- 3. 成本控制权限
-- Date: 2025-11-06
-- ============================================

BEGIN;

-- ============================================
-- 1. 资源所有权权限
-- ============================================

-- 设备所有权权限
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('30000000-0000-0000-0000-000000000100', 'device.read.own', '读取自己的设备', 'device', 'read', true),
('30000000-0000-0000-0000-000000000101', 'device.read.department', '读取本部门的设备', 'device', 'read', true),
('30000000-0000-0000-0000-000000000102', 'device.read.tenant', '读取本租户的设备', 'device', 'read', true),
('30000000-0000-0000-0000-000000000103', 'device.read.all', '读取所有设备', 'device', 'read', true),

('30000000-0000-0000-0000-000000000104', 'device.update.own', '更新自己的设备', 'device', 'update', true),
('30000000-0000-0000-0000-000000000105', 'device.update.all', '更新所有设备', 'device', 'update', true),

('30000000-0000-0000-0000-000000000106', 'device.delete.own', '删除自己的设备', 'device', 'delete', true),
('30000000-0000-0000-0000-000000000107', 'device.delete.department', '删除本部门的设备', 'device', 'delete', true),
('30000000-0000-0000-0000-000000000108', 'device.delete.all', '删除所有设备', 'device', 'delete', true);

-- 应用所有权权限
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('10000000-0000-0000-0000-000000000100', 'app.read.own', '查看自己上传的应用', 'app', 'read', true),
('10000000-0000-0000-0000-000000000101', 'app.read.approved', '查看已审核的应用', 'app', 'read', true),
('10000000-0000-0000-0000-000000000102', 'app.read.all', '查看所有应用', 'app', 'read', true),

('10000000-0000-0000-0000-000000000103', 'app.delete.own', '删除自己的应用', 'app', 'delete', true),
('10000000-0000-0000-0000-000000000104', 'app.delete.all', '删除所有应用', 'app', 'delete', true);

-- 代理所有权权限
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('50000000-0000-0000-0000-000000000100', 'proxy.use.shared', '使用共享代理池', 'proxy', 'use', true),
('50000000-0000-0000-0000-000000000101', 'proxy.use.dedicated', '使用专属代理池', 'proxy', 'use', true);

-- ============================================
-- 2. 批量操作权限
-- ============================================

-- 设备批量操作
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('30000000-0000-0000-0000-000000000110', 'device.delete.single', '删除单个设备', 'device', 'delete', true),
('30000000-0000-0000-0000-000000000111', 'device.delete.bulk', '批量删除设备（高风险）', 'device', 'delete', true),

('30000000-0000-0000-0000-000000000112', 'device.start.single', '启动单个设备', 'device', 'start', true),
('30000000-0000-0000-0000-000000000113', 'device.start.bulk', '批量启动设备', 'device', 'start', true),

('30000000-0000-0000-0000-000000000114', 'device.stop.single', '停止单个设备', 'device', 'stop', true),
('30000000-0000-0000-0000-000000000115', 'device.stop.bulk', '批量停止设备', 'device', 'stop', true),

('30000000-0000-0000-0000-000000000116', 'device.restart.single', '重启单个设备', 'device', 'restart', true),
('30000000-0000-0000-0000-000000000117', 'device.restart.bulk', '批量重启设备', 'device', 'restart', true);

-- 应用批量安装
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('10000000-0000-0000-0000-000000000110', 'app.install.single', '在单个设备安装应用', 'app', 'install', true),
('10000000-0000-0000-0000-000000000111', 'app.install.bulk', '批量设备安装应用', 'app', 'install', true),

('10000000-0000-0000-0000-000000000112', 'app.uninstall.single', '从单个设备卸载应用', 'app', 'uninstall', true),
('10000000-0000-0000-0000-000000000113', 'app.uninstall.bulk', '批量设备卸载应用', 'app', 'uninstall', true);

-- 短信批量发送
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('70000000-0000-0000-0000-000000000100', 'sms.send.single', '发送单条短信', 'sms', 'send', true),
('70000000-0000-0000-0000-000000000101', 'sms.send.bulk', '批量发送短信', 'sms', 'send', true);

-- ============================================
-- 3. 成本控制权限
-- ============================================

-- 按设备配置分级
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('30000000-0000-0000-0000-000000000120', 'device.create.low', '创建低配设备（1核2G）', 'device', 'create', true),
('30000000-0000-0000-0000-000000000121', 'device.create.medium', '创建中配设备（2核4G）', 'device', 'create', true),
('30000000-0000-0000-0000-000000000122', 'device.create.high', '创建高配设备（4核8G）', 'device', 'create', true),
('30000000-0000-0000-0000-000000000123', 'device.create.premium', '创建旗舰设备（8核16G+）', 'device', 'create', true);

-- 代理使用成本控制
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('50000000-0000-0000-0000-000000000110', 'proxy.use.budget.low', '使用低成本代理（<$10/day）', 'proxy', 'use', true),
('50000000-0000-0000-0000-000000000111', 'proxy.use.budget.medium', '使用中等代理（$10-50/day）', 'proxy', 'use', true),
('50000000-0000-0000-0000-000000000112', 'proxy.use.budget.high', '使用高成本代理（>$50/day）', 'proxy', 'use', true);

-- 短信成本限制
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('70000000-0000-0000-0000-000000000110', 'sms.send.limit.100', '每天最多发送100条短信', 'sms', 'send', true),
('70000000-0000-0000-0000-000000000111', 'sms.send.limit.1000', '每天最多发送1000条短信', 'sms', 'send', true),
('70000000-0000-0000-0000-000000000112', 'sms.send.limit.unlimited', '无限制发送短信', 'sms', 'send', true);

-- ============================================
-- 4. 为角色分配新权限
-- ============================================

-- super_admin: 所有权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000000', id FROM permissions
WHERE id::text LIKE '30000000-0000-0000-0000-0000001%'
   OR id::text LIKE '10000000-0000-0000-0000-0000001%'
   OR id::text LIKE '50000000-0000-0000-0000-0000001%'
   OR id::text LIKE '70000000-0000-0000-0000-0000001%'
ON CONFLICT DO NOTHING;

-- admin: 业务管理权限（排除部分敏感权限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions
WHERE name IN (
  -- 设备所有权
  'device.read.all', 'device.update.all', 'device.delete.all',
  -- 设备批量操作
  'device.delete.single', 'device.delete.bulk',
  'device.start.single', 'device.start.bulk',
  'device.stop.single', 'device.stop.bulk',
  'device.restart.single', 'device.restart.bulk',
  -- 应用所有权
  'app.read.all', 'app.delete.all',
  -- 应用批量操作
  'app.install.single', 'app.install.bulk',
  'app.uninstall.single', 'app.uninstall.bulk',
  -- 代理
  'proxy.use.shared', 'proxy.use.dedicated',
  'proxy.use.budget.low', 'proxy.use.budget.medium', 'proxy.use.budget.high',
  -- 短信
  'sms.send.single', 'sms.send.bulk',
  'sms.send.limit.unlimited',
  -- 设备配置
  'device.create.low', 'device.create.medium', 'device.create.high', 'device.create.premium'
)
ON CONFLICT DO NOTHING;

-- tenant_admin: 租户级权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM permissions
WHERE name IN (
  -- 设备所有权（租户级）
  'device.read.tenant', 'device.update.own', 'device.delete.own',
  -- 设备批量操作（受限）
  'device.delete.single', 'device.start.single', 'device.start.bulk',
  'device.stop.single', 'device.stop.bulk', 'device.restart.single', 'device.restart.bulk',
  -- 应用所有权
  'app.read.approved', 'app.read.own', 'app.delete.own',
  -- 应用批量操作
  'app.install.single', 'app.install.bulk',
  -- 代理
  'proxy.use.shared', 'proxy.use.budget.low', 'proxy.use.budget.medium',
  -- 短信
  'sms.send.single', 'sms.send.limit.1000',
  -- 设备配置
  'device.create.low', 'device.create.medium', 'device.create.high'
)
ON CONFLICT DO NOTHING;

-- department_admin: 部门级权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'department_admin'), id FROM permissions
WHERE name IN (
  -- 设备所有权（部门级）
  'device.read.department', 'device.delete.department',
  -- 设备批量操作（受限）
  'device.delete.single', 'device.start.single', 'device.stop.single', 'device.restart.single',
  -- 应用所有权
  'app.read.approved', 'app.read.own',
  -- 应用批量操作
  'app.install.single',
  -- 代理
  'proxy.use.shared', 'proxy.use.budget.low',
  -- 短信
  'sms.send.single', 'sms.send.limit.100',
  -- 设备配置
  'device.create.low', 'device.create.medium'
)
ON CONFLICT DO NOTHING;

-- vip_user: VIP用户权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'vip_user'), id FROM permissions
WHERE name IN (
  -- 设备所有权
  'device.read.own', 'device.update.own', 'device.delete.own',
  -- 设备批量操作（部分）
  'device.delete.single', 'device.start.single', 'device.start.bulk',
  'device.stop.single', 'device.stop.bulk', 'device.restart.single',
  -- 应用所有权
  'app.read.approved', 'app.read.own', 'app.delete.own',
  -- 应用批量操作
  'app.install.single', 'app.install.bulk',
  -- 代理
  'proxy.use.shared', 'proxy.use.dedicated',
  'proxy.use.budget.low', 'proxy.use.budget.medium', 'proxy.use.budget.high',
  -- 短信
  'sms.send.single', 'sms.send.bulk', 'sms.send.limit.1000',
  -- 设备配置（可创建高配）
  'device.create.low', 'device.create.medium', 'device.create.high'
)
ON CONFLICT DO NOTHING;

-- user: 普通用户权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions
WHERE name IN (
  -- 设备所有权（仅自己的）
  'device.read.own', 'device.update.own', 'device.delete.own',
  -- 设备单个操作
  'device.delete.single', 'device.start.single', 'device.stop.single', 'device.restart.single',
  -- 应用所有权
  'app.read.approved', 'app.read.own', 'app.delete.own',
  -- 应用单个操作
  'app.install.single', 'app.uninstall.single',
  -- 代理
  'proxy.use.shared', 'proxy.use.budget.low',
  -- 短信
  'sms.send.single', 'sms.send.limit.100',
  -- 设备配置（仅低配和中配）
  'device.create.low', 'device.create.medium'
)
ON CONFLICT DO NOTHING;

-- enterprise_user: 企业用户权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'enterprise_user'), id FROM permissions
WHERE name IN (
  -- 设备所有权
  'device.read.own', 'device.update.own', 'device.delete.own',
  -- 设备操作
  'device.delete.single', 'device.start.single', 'device.start.bulk',
  'device.stop.single', 'device.stop.bulk', 'device.restart.single',
  -- 应用所有权
  'app.read.approved', 'app.read.own',
  -- 应用操作
  'app.install.single', 'app.install.bulk',
  -- 代理
  'proxy.use.shared', 'proxy.use.budget.low', 'proxy.use.budget.medium',
  -- 短信
  'sms.send.single', 'sms.send.limit.1000',
  -- 设备配置
  'device.create.low', 'device.create.medium', 'device.create.high'
)
ON CONFLICT DO NOTHING;

-- devops: 运维工程师权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'devops'), id FROM permissions
WHERE name IN (
  -- 设备所有权（全部查看）
  'device.read.all',
  -- 设备操作（包括批量）
  'device.start.single', 'device.start.bulk',
  'device.stop.single', 'device.stop.bulk',
  'device.restart.single', 'device.restart.bulk',
  -- 应用所有权
  'app.read.all',
  -- 代理
  'proxy.use.shared', 'proxy.use.dedicated',
  'proxy.use.budget.low', 'proxy.use.budget.medium', 'proxy.use.budget.high',
  -- 设备配置（不能创建设备，只能管理）
  'device.create.low', 'device.create.medium'
)
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================
-- 验证结果
-- ============================================

-- 统计新增权限数量
SELECT '新增权限统计' as info, COUNT(*) as total_new_permissions
FROM permissions
WHERE id::text LIKE '30000000-0000-0000-0000-0000001%'
   OR id::text LIKE '10000000-0000-0000-0000-0000001%'
   OR id::text LIKE '50000000-0000-0000-0000-0000001%'
   OR id::text LIKE '70000000-0000-0000-0000-0000001%';

-- 按类别统计新增权限
SELECT
  '新增权限分类' as info,
  CASE
    WHEN name LIKE 'device.%.own' OR name LIKE 'device.%.department' OR name LIKE 'device.%.tenant' OR name LIKE 'device.%.all' THEN '1. 设备所有权'
    WHEN name LIKE 'app.%.own' OR name LIKE 'app.%.approved' OR name LIKE 'app.%.all' THEN '1. 应用所有权'
    WHEN name LIKE 'proxy.use.%' THEN '1. 代理所有权'
    WHEN name LIKE '%.single' OR name LIKE '%.bulk' THEN '2. 批量操作'
    WHEN name LIKE '%.create.%' OR name LIKE '%.budget.%' OR name LIKE '%.limit.%' THEN '3. 成本控制'
  END as category,
  COUNT(*) as count
FROM permissions
WHERE id::text LIKE '30000000-0000-0000-0000-0000001%'
   OR id::text LIKE '10000000-0000-0000-0000-0000001%'
   OR id::text LIKE '50000000-0000-0000-0000-0000001%'
   OR id::text LIKE '70000000-0000-0000-0000-0000001%'
GROUP BY category
ORDER BY category;

-- 查看关键角色的权限总数
SELECT
  '角色权限更新' as info,
  r.name as role_name,
  COUNT(p.id) as total_permissions
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.name IN ('super_admin', 'admin', 'tenant_admin', 'vip_user', 'user', 'devops')
GROUP BY r.name
ORDER BY total_permissions DESC;
