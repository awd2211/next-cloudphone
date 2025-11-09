-- ============================================
-- RBAC 优化 - 审批工作流权限
-- 为敏感操作添加审批机制
-- Date: 2025-11-06
-- ============================================

BEGIN;

-- ============================================
-- 1. 审批工作流权限
-- ============================================

-- 设备审批权限
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 申请权限（普通用户可以发起申请）
('40000000-0000-0000-0000-000000000100', 'device.bulk-delete.request', '申请批量删除设备', 'device', 'request', true),
('40000000-0000-0000-0000-000000000101', 'device.premium-create.request', '申请创建旗舰设备', 'device', 'request', true),
('40000000-0000-0000-0000-000000000102', 'device.quota-increase.request', '申请提升设备配额', 'device', 'request', true),

-- 审批权限（管理员可以审批）
('40000000-0000-0000-0000-000000000110', 'device.bulk-delete.approve', '审批批量删除设备', 'device', 'approve', true),
('40000000-0000-0000-0000-000000000111', 'device.premium-create.approve', '审批创建旗舰设备', 'device', 'approve', true),
('40000000-0000-0000-0000-000000000112', 'device.quota-increase.approve', '审批提升设备配额', 'device', 'approve', true),

-- 直接执行权限（超级管理员可以跳过审批）
('40000000-0000-0000-0000-000000000120', 'device.bulk-delete.execute', '直接批量删除设备（无需审批）', 'device', 'execute', true),
('40000000-0000-0000-0000-000000000121', 'device.premium-create.execute', '直接创建旗舰设备（无需审批）', 'device', 'execute', true);

-- 应用审批权限
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 申请权限
('10000000-0000-0000-0000-000000000200', 'app.upload.request', '申请上传应用', 'app', 'request', true),
('10000000-0000-0000-0000-000000000201', 'app.bulk-install.request', '申请批量安装应用', 'app', 'request', true),

-- 审批权限
('10000000-0000-0000-0000-000000000210', 'app.upload.approve', '审批应用上传', 'app', 'approve', true),
('10000000-0000-0000-0000-000000000211', 'app.bulk-install.approve', '审批批量安装应用', 'app', 'approve', true),

-- 直接执行权限
('10000000-0000-0000-0000-000000000220', 'app.upload.execute', '直接上传应用（无需审批）', 'app', 'execute', true),
('10000000-0000-0000-0000-000000000221', 'app.bulk-install.execute', '直接批量安装应用（无需审批）', 'app', 'execute', true);

-- 代理审批权限
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 申请权限
('50000000-0000-0000-0000-000000000200', 'proxy.dedicated.request', '申请专属代理', 'proxy', 'request', true),
('50000000-0000-0000-0000-000000000201', 'proxy.high-budget.request', '申请高成本代理', 'proxy', 'request', true),

-- 审批权限
('50000000-0000-0000-0000-000000000210', 'proxy.dedicated.approve', '审批专属代理申请', 'proxy', 'approve', true),
('50000000-0000-0000-0000-000000000211', 'proxy.high-budget.approve', '审批高成本代理申请', 'proxy', 'approve', true),

-- 直接执行权限
('50000000-0000-0000-0000-000000000220', 'proxy.dedicated.execute', '直接使用专属代理（无需审批）', 'proxy', 'execute', true),
('50000000-0000-0000-0000-000000000221', 'proxy.high-budget.execute', '直接使用高成本代理（无需审批）', 'proxy', 'execute', true);

-- 短信审批权限
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 申请权限
('70000000-0000-0000-0000-000000000200', 'sms.bulk-send.request', '申请批量发送短信', 'sms', 'request', true),
('70000000-0000-0000-0000-000000000201', 'sms.quota-increase.request', '申请提升短信配额', 'sms', 'request', true),

-- 审批权限
('70000000-0000-0000-0000-000000000210', 'sms.bulk-send.approve', '审批批量发送短信', 'sms', 'approve', true),
('70000000-0000-0000-0000-000000000211', 'sms.quota-increase.approve', '审批提升短信配额', 'sms', 'approve', true),

-- 直接执行权限
('70000000-0000-0000-0000-000000000220', 'sms.bulk-send.execute', '直接批量发送短信（无需审批）', 'sms', 'execute', true);

-- 通用审批管理权限
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('80000000-0000-0000-0000-000000000100', 'approval.view.own', '查看自己的审批申请', 'approval', 'view', true),
('80000000-0000-0000-0000-000000000101', 'approval.view.department', '查看本部门的审批申请', 'approval', 'view', true),
('80000000-0000-0000-0000-000000000102', 'approval.view.tenant', '查看本租户的审批申请', 'approval', 'view', true),
('80000000-0000-0000-0000-000000000103', 'approval.view.all', '查看所有审批申请', 'approval', 'view', true),

('80000000-0000-0000-0000-000000000110', 'approval.cancel.own', '取消自己的审批申请', 'approval', 'cancel', true),
('80000000-0000-0000-0000-000000000111', 'approval.cancel.any', '取消任何审批申请', 'approval', 'cancel', true),

('80000000-0000-0000-0000-000000000120', 'approval.history.view', '查看审批历史', 'approval', 'history', true),
('80000000-0000-0000-0000-000000000121', 'approval.stats.view', '查看审批统计', 'approval', 'stats', true);

-- ============================================
-- 2. 为角色分配审批权限
-- ============================================

-- super_admin: 所有审批权限（包括直接执行权限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000000', id FROM permissions
WHERE id::text LIKE '40000000-0000-0000-0000-0000002%'
   OR id::text LIKE '10000000-0000-0000-0000-0000002%'
   OR id::text LIKE '50000000-0000-0000-0000-0000002%'
   OR id::text LIKE '70000000-0000-0000-0000-0000002%'
   OR id::text LIKE '80000000-0000-0000-0000-0000001%'
ON CONFLICT DO NOTHING;

-- admin: 审批权限 + 部分直接执行权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions
WHERE name IN (
  -- 设备审批
  'device.bulk-delete.approve', 'device.premium-create.approve', 'device.quota-increase.approve',
  -- 应用审批
  'app.upload.approve', 'app.bulk-install.approve',
  'app.upload.execute', 'app.bulk-install.execute',
  -- 代理审批
  'proxy.dedicated.approve', 'proxy.high-budget.approve',
  -- 短信审批
  'sms.bulk-send.approve', 'sms.quota-increase.approve',
  -- 审批管理
  'approval.view.all', 'approval.cancel.any', 'approval.history.view', 'approval.stats.view'
)
ON CONFLICT DO NOTHING;

-- tenant_admin: 租户级审批权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM permissions
WHERE name IN (
  -- 设备审批（租户级）
  'device.premium-create.approve', 'device.quota-increase.approve',
  -- 应用审批
  'app.upload.approve', 'app.bulk-install.approve',
  -- 代理审批
  'proxy.dedicated.approve',
  -- 短信审批
  'sms.bulk-send.approve',
  -- 审批管理
  'approval.view.tenant', 'approval.history.view'
)
ON CONFLICT DO NOTHING;

-- department_admin: 部门级审批权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'department_admin'), id FROM permissions
WHERE name IN (
  -- 设备审批（部门级）
  'device.quota-increase.approve',
  -- 应用审批
  'app.upload.approve',
  -- 审批管理
  'approval.view.department', 'approval.history.view'
)
ON CONFLICT DO NOTHING;

-- vip_user: 申请权限 + 部分直接执行权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'vip_user'), id FROM permissions
WHERE name IN (
  -- 设备申请
  'device.bulk-delete.request', 'device.premium-create.request', 'device.quota-increase.request',
  'device.premium-create.execute',  -- VIP 可以直接创建旗舰设备
  -- 应用申请
  'app.upload.request', 'app.bulk-install.request',
  'app.upload.execute',  -- VIP 可以直接上传应用
  -- 代理申请
  'proxy.dedicated.request', 'proxy.high-budget.request',
  'proxy.dedicated.execute',  -- VIP 可以直接使用专属代理
  -- 短信申请
  'sms.bulk-send.request', 'sms.quota-increase.request',
  -- 审批管理
  'approval.view.own', 'approval.cancel.own'
)
ON CONFLICT DO NOTHING;

-- enterprise_user: 申请权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'enterprise_user'), id FROM permissions
WHERE name IN (
  -- 设备申请
  'device.bulk-delete.request', 'device.premium-create.request', 'device.quota-increase.request',
  -- 应用申请
  'app.upload.request', 'app.bulk-install.request',
  -- 代理申请
  'proxy.dedicated.request', 'proxy.high-budget.request',
  -- 短信申请
  'sms.bulk-send.request', 'sms.quota-increase.request',
  -- 审批管理
  'approval.view.own', 'approval.cancel.own'
)
ON CONFLICT DO NOTHING;

-- user: 基础申请权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions
WHERE name IN (
  -- 设备申请
  'device.quota-increase.request',
  -- 应用申请
  'app.upload.request',
  -- 代理申请
  'proxy.dedicated.request',
  -- 短信申请
  'sms.quota-increase.request',
  -- 审批管理
  'approval.view.own', 'approval.cancel.own'
)
ON CONFLICT DO NOTHING;

-- devops: 查看审批权限（不参与审批流程）
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'devops'), id FROM permissions
WHERE name IN (
  'approval.view.all', 'approval.history.view', 'approval.stats.view'
)
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================
-- 验证结果
-- ============================================

-- 统计审批权限数量
SELECT
  '审批权限统计' as info,
  CASE
    WHEN action = 'request' THEN '申请权限'
    WHEN action = 'approve' THEN '审批权限'
    WHEN action = 'execute' THEN '直接执行权限'
    ELSE '管理权限'
  END as permission_type,
  COUNT(*) as count
FROM permissions
WHERE id::text LIKE '40000000-0000-0000-0000-0000002%'
   OR id::text LIKE '10000000-0000-0000-0000-0000002%'
   OR id::text LIKE '50000000-0000-0000-0000-0000002%'
   OR id::text LIKE '70000000-0000-0000-0000-0000002%'
   OR id::text LIKE '80000000-0000-0000-0000-0000001%'
GROUP BY permission_type
ORDER BY
  CASE permission_type
    WHEN '申请权限' THEN 1
    WHEN '审批权限' THEN 2
    WHEN '直接执行权限' THEN 3
    ELSE 4
  END;

-- 按资源分类统计
SELECT
  '审批权限按资源分类' as info,
  resource as 资源类型,
  COUNT(*) as 权限数量
FROM permissions
WHERE id::text LIKE '40000000-0000-0000-0000-0000002%'
   OR id::text LIKE '10000000-0000-0000-0000-0000002%'
   OR id::text LIKE '50000000-0000-0000-0000-0000002%'
   OR id::text LIKE '70000000-0000-0000-0000-0000002%'
   OR id::text LIKE '80000000-0000-0000-0000-0000001%'
GROUP BY resource
ORDER BY COUNT(*) DESC;

-- 查看关键角色的总权限数
SELECT
  '角色权限更新' as info,
  r.name as role_name,
  COUNT(p.id) as total_permissions
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.name IN ('super_admin', 'admin', 'tenant_admin', 'department_admin', 'vip_user', 'user', 'enterprise_user', 'devops')
GROUP BY r.name
ORDER BY total_permissions DESC;

-- 展示审批权限示例
SELECT
  '审批权限示例' as 示例,
  name as 权限名称,
  description as 描述,
  resource as 资源,
  action as 操作
FROM permissions
WHERE name IN (
  'device.bulk-delete.request', 'device.bulk-delete.approve', 'device.bulk-delete.execute',
  'app.upload.request', 'app.upload.approve', 'app.upload.execute',
  'approval.view.own', 'approval.view.all'
)
ORDER BY resource, name;
