-- ============================================
-- RBAC 优化 - 菜单权限控制 V2
-- 适配现有 menus 表结构
-- 每个角色只能看到自己有权限的页面
-- Date: 2025-11-06
-- ============================================

BEGIN;

-- ============================================
-- 1. 创建菜单-角色关联表
-- ============================================

CREATE TABLE IF NOT EXISTS menu_roles (
  "menuId" UUID REFERENCES menus(id) ON DELETE CASCADE,
  "roleId" UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY ("menuId", "roleId")
);

CREATE INDEX IF NOT EXISTS idx_menu_roles_menu_id ON menu_roles("menuId");
CREATE INDEX IF NOT EXISTS idx_menu_roles_role_id ON menu_roles("roleId");

-- ============================================
-- 2. 清空并插入菜单数据
-- ============================================

-- 清空现有菜单数据
TRUNCATE TABLE menus CASCADE;

-- 插入一级菜单
INSERT INTO menus (id, code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode", metadata) VALUES
-- 系统管理
('10000000-0000-0000-0000-000000000001', 'system', '系统管理', '/system', 'SettingOutlined', NULL, 1, true, true, NULL, '{"component": "Layout"}'),
-- 用户管理
('10000000-0000-0000-0000-000000000002', 'users', '用户管理', '/users', 'UserOutlined', NULL, 2, true, true, 'user.read', '{"component": "Layout"}'),
-- 设备管理
('10000000-0000-0000-0000-000000000003', 'devices', '设备管理', '/devices', 'MobileOutlined', NULL, 3, true, true, 'device.read', '{"component": "Layout"}'),
-- 应用管理
('10000000-0000-0000-0000-000000000004', 'apps', '应用管理', '/apps', 'AppstoreOutlined', NULL, 4, true, true, 'app.read', '{"component": "Layout"}'),
-- 代理管理
('10000000-0000-0000-0000-000000000005', 'proxy', '代理管理', '/proxy', 'GlobalOutlined', NULL, 5, true, true, 'proxy.read', '{"component": "Layout"}'),
-- 短信服务
('10000000-0000-0000-0000-000000000006', 'sms', '短信服务', '/sms', 'MessageOutlined', NULL, 6, true, true, 'sms.read', '{"component": "Layout"}'),
-- 计费管理
('10000000-0000-0000-0000-000000000007', 'billing', '计费管理', '/billing', 'MoneyCollectOutlined', NULL, 7, true, true, 'billing:read', '{"component": "Layout"}'),
-- 通知中心
('10000000-0000-0000-0000-000000000008', 'notifications', '通知中心', '/notifications', 'BellOutlined', NULL, 8, true, true, 'notification.read', '{"component": "Layout"}'),
-- 审批中心
('10000000-0000-0000-0000-000000000009', 'approvals', '审批中心', '/approvals', 'AuditOutlined', NULL, 9, true, true, 'approval.view.own', '{"component": "Layout"}'),
-- 监控运维
('10000000-0000-0000-0000-000000000010', 'monitoring', '监控运维', '/monitoring', 'DashboardOutlined', NULL, 10, true, true, 'device.metrics.view', '{"component": "Layout"}'),
-- 个人中心
('10000000-0000-0000-0000-000000000011', 'profile', '个人中心', '/profile', 'IdcardOutlined', NULL, 11, true, true, NULL, '{"component": "Layout"}');

-- 二级菜单 - 系统管理
INSERT INTO menus (id, code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode") VALUES
('20000000-0000-0000-0000-000000000001', 'system-users', '用户列表', '/system/users', NULL, '10000000-0000-0000-0000-000000000001', 1, true, true, 'user.read'),
('20000000-0000-0000-0000-000000000002', 'system-roles', '角色管理', '/system/roles', NULL, '10000000-0000-0000-0000-000000000001', 2, true, true, 'role.read'),
('20000000-0000-0000-0000-000000000003', 'system-permissions', '权限管理', '/system/permissions', NULL, '10000000-0000-0000-0000-000000000001', 3, true, true, 'permission.read'),
('20000000-0000-0000-0000-000000000004', 'system-menus', '菜单管理', '/system/menus', NULL, '10000000-0000-0000-0000-000000000001', 4, true, true, 'permission:menu:list'),
('20000000-0000-0000-0000-000000000005', 'system-audit', '审计日志', '/system/audit', NULL, '10000000-0000-0000-0000-000000000001', 5, true, true, 'admin:view');

-- 二级菜单 - 用户管理
INSERT INTO menus (id, code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode") VALUES
('20000000-0000-0000-0000-000000000010', 'users-list', '用户列表', '/users/list', NULL, '10000000-0000-0000-0000-000000000002', 1, true, true, 'user.read'),
('20000000-0000-0000-0000-000000000011', 'users-create', '创建用户', '/users/create', NULL, '10000000-0000-0000-0000-000000000002', 2, true, true, 'user.create.regular'),
('20000000-0000-0000-0000-000000000012', 'users-quotas', '配额管理', '/users/quotas', NULL, '10000000-0000-0000-0000-000000000002', 3, true, true, 'user.read');

-- 二级菜单 - 设备管理
INSERT INTO menus (id, code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode") VALUES
('20000000-0000-0000-0000-000000000020', 'devices-list', '设备列表', '/devices/list', NULL, '10000000-0000-0000-0000-000000000003', 1, true, true, 'device.read.own'),
('20000000-0000-0000-0000-000000000021', 'devices-create', '创建设备', '/devices/create', NULL, '10000000-0000-0000-0000-000000000003', 2, true, true, 'device.create.low'),
('20000000-0000-0000-0000-000000000022', 'devices-templates', '设备模板', '/devices/templates', NULL, '10000000-0000-0000-0000-000000000003', 3, true, true, 'device.read'),
('20000000-0000-0000-0000-000000000023', 'devices-monitoring', '设备监控', '/devices/monitoring', NULL, '10000000-0000-0000-0000-000000000003', 4, true, true, 'device.status.view'),
('20000000-0000-0000-0000-000000000024', 'devices-snapshots', '快照管理', '/devices/snapshots', NULL, '10000000-0000-0000-0000-000000000003', 5, true, true, 'device.backup');

-- 二级菜单 - 应用管理
INSERT INTO menus (id, code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode") VALUES
('20000000-0000-0000-0000-000000000030', 'apps-market', '应用市场', '/apps/market', NULL, '10000000-0000-0000-0000-000000000004', 1, true, true, 'app.read.approved'),
('20000000-0000-0000-0000-000000000031', 'apps-upload', '上传应用', '/apps/upload', NULL, '10000000-0000-0000-0000-000000000004', 2, true, true, 'app.create'),
('20000000-0000-0000-0000-000000000032', 'apps-approval', '应用审核', '/apps/approval', NULL, '10000000-0000-0000-0000-000000000004', 3, true, true, 'app.approve');

-- 二级菜单 - 代理管理
INSERT INTO menus (id, code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode") VALUES
('20000000-0000-0000-0000-000000000040', 'proxy-list', '代理列表', '/proxy/list', NULL, '10000000-0000-0000-0000-000000000005', 1, true, true, 'proxy.read'),
('20000000-0000-0000-0000-000000000041', 'proxy-sessions', '会话管理', '/proxy/sessions', NULL, '10000000-0000-0000-0000-000000000005', 2, true, true, 'proxy:session:read'),
('20000000-0000-0000-0000-000000000042', 'proxy-stats', '使用统计', '/proxy/stats', NULL, '10000000-0000-0000-0000-000000000005', 3, true, true, 'proxy:stats'),
('20000000-0000-0000-0000-000000000043', 'proxy-cost', '成本分析', '/proxy/cost', NULL, '10000000-0000-0000-0000-000000000005', 4, true, true, 'proxy:cost:dashboard');

-- 二级菜单 - 短信服务
INSERT INTO menus (id, code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode") VALUES
('20000000-0000-0000-0000-000000000050', 'sms-messages', '短信列表', '/sms/messages', NULL, '10000000-0000-0000-0000-000000000006', 1, true, true, 'sms.read'),
('20000000-0000-0000-0000-000000000051', 'sms-send', '发送短信', '/sms/send', NULL, '10000000-0000-0000-0000-000000000006', 2, true, true, 'sms.send.single'),
('20000000-0000-0000-0000-000000000052', 'sms-stats', '统计报表', '/sms/stats', NULL, '10000000-0000-0000-0000-000000000006', 3, true, true, 'sms.stats');

-- 二级菜单 - 计费管理
INSERT INTO menus (id, code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode") VALUES
('20000000-0000-0000-0000-000000000060', 'billing-invoices', '账单列表', '/billing/invoices', NULL, '10000000-0000-0000-0000-000000000007', 1, true, true, 'billing:read'),
('20000000-0000-0000-0000-000000000061', 'billing-payments', '支付记录', '/billing/payments', NULL, '10000000-0000-0000-0000-000000000007', 2, true, true, 'billing:read'),
('20000000-0000-0000-0000-000000000062', 'billing-balance', '余额管理', '/billing/balance', NULL, '10000000-0000-0000-0000-000000000007', 3, true, true, 'billing:read');

-- 二级菜单 - 通知中心
INSERT INTO menus (id, code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode") VALUES
('20000000-0000-0000-0000-000000000070', 'notifications-list', '通知列表', '/notifications/list', NULL, '10000000-0000-0000-0000-000000000008', 1, true, true, 'notification.read'),
('20000000-0000-0000-0000-000000000071', 'notifications-templates', '模板管理', '/notifications/templates', NULL, '10000000-0000-0000-0000-000000000008', 2, true, true, 'notification.template-read'),
('20000000-0000-0000-0000-000000000072', 'notifications-preferences', '偏好设置', '/notifications/preferences', NULL, '10000000-0000-0000-0000-000000000008', 3, true, true, 'notification.preference-read');

-- 二级菜单 - 审批中心
INSERT INTO menus (id, code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode") VALUES
('20000000-0000-0000-0000-000000000080', 'approvals-pending', '待审批', '/approvals/pending', NULL, '10000000-0000-0000-0000-000000000009', 1, true, true, 'approval.view.own'),
('20000000-0000-0000-0000-000000000081', 'approvals-my-requests', '我的申请', '/approvals/my-requests', NULL, '10000000-0000-0000-0000-000000000009', 2, true, true, 'approval.view.own'),
('20000000-0000-0000-0000-000000000082', 'approvals-history', '审批历史', '/approvals/history', NULL, '10000000-0000-0000-0000-000000000009', 3, true, true, 'approval.history.view'),
('20000000-0000-0000-0000-000000000083', 'approvals-stats', '审批统计', '/approvals/stats', NULL, '10000000-0000-0000-0000-000000000009', 4, true, true, 'approval.stats.view');

-- 二级菜单 - 监控运维
INSERT INTO menus (id, code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode") VALUES
('20000000-0000-0000-0000-000000000090', 'monitoring-dashboard', '监控面板', '/monitoring/dashboard', NULL, '10000000-0000-0000-0000-000000000010', 1, true, true, 'device.metrics.view'),
('20000000-0000-0000-0000-000000000091', 'monitoring-logs', '系统日志', '/monitoring/logs', NULL, '10000000-0000-0000-0000-000000000010', 2, true, true, 'device.logs.view'),
('20000000-0000-0000-0000-000000000092', 'monitoring-alerts', '告警管理', '/monitoring/alerts', NULL, '10000000-0000-0000-0000-000000000010', 3, true, true, 'proxy:alert:read');

-- 二级菜单 - 个人中心
INSERT INTO menus (id, code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode") VALUES
('20000000-0000-0000-0000-000000000100', 'profile-info', '基本信息', '/profile/info', NULL, '10000000-0000-0000-0000-000000000011', 1, true, true, NULL),
('20000000-0000-0000-0000-000000000101', 'profile-security', '安全设置', '/profile/security', NULL, '10000000-0000-0000-0000-000000000011', 2, true, true, NULL),
('20000000-0000-0000-0000-000000000102', 'profile-api-keys', 'API密钥', '/profile/api-keys', NULL, '10000000-0000-0000-0000-000000000011', 3, true, true, NULL);

-- ============================================
-- 3. 为角色分配菜单权限
-- ============================================

-- super_admin: 所有菜单
INSERT INTO menu_roles ("menuId", "roleId")
SELECT m.id, '00000000-0000-0000-0000-000000000000'
FROM menus m
ON CONFLICT DO NOTHING;

-- admin: 除系统管理外的所有菜单
INSERT INTO menu_roles ("menuId", "roleId")
SELECT m.id, '00000000-0000-0000-0000-000000000001'
FROM menus m
WHERE m.code NOT IN ('system', 'system-users', 'system-roles', 'system-permissions', 'system-menus', 'system-audit')
ON CONFLICT DO NOTHING;

-- tenant_admin: 用户、设备、应用、代理、短信、计费、通知、审批、个人中心
INSERT INTO menu_roles ("menuId", "roleId")
SELECT m.id, '00000000-0000-0000-0000-000000000003'
FROM menus m
WHERE m.code ~ '^(users|devices|apps|proxy|sms|billing|notifications|approvals|profile)'
  AND m.code NOT IN ('apps-approval', 'proxy-cost')
ON CONFLICT DO NOTHING;

-- department_admin: 用户、设备、通知、审批、个人中心
INSERT INTO menu_roles ("menuId", "roleId")
SELECT m.id, (SELECT id FROM roles WHERE name = 'department_admin')
FROM menus m
WHERE m.code ~ '^(users|devices|notifications|approvals|profile)'
  AND m.code NOT IN ('users-quotas', 'devices-create', 'devices-templates', 'devices-snapshots')
ON CONFLICT DO NOTHING;

-- vip_user: 设备、应用、代理、短信、计费、通知、审批、个人中心
INSERT INTO menu_roles ("menuId", "roleId")
SELECT m.id, (SELECT id FROM roles WHERE name = 'vip_user')
FROM menus m
WHERE m.code ~ '^(devices|apps|proxy|sms|billing|notifications|approvals|profile)'
  AND m.code NOT IN ('apps-approval')
ON CONFLICT DO NOTHING;

-- user: 设备、应用、计费、通知、审批、个人中心
INSERT INTO menu_roles ("menuId", "roleId")
SELECT m.id, '00000000-0000-0000-0000-000000000002'
FROM menus m
WHERE m.code ~ '^(devices|apps|billing|notifications|approvals|profile)'
  AND m.code NOT IN ('devices-templates', 'devices-snapshots', 'apps-upload', 'apps-approval', 'approvals-history', 'approvals-stats', 'profile-api-keys')
ON CONFLICT DO NOTHING;

-- enterprise_user: 设备、应用、计费、通知、个人中心
INSERT INTO menu_roles ("menuId", "roleId")
SELECT m.id, (SELECT id FROM roles WHERE name = 'enterprise_user')
FROM menus m
WHERE m.code ~ '^(devices|apps|billing|notifications|profile)'
  AND m.code NOT IN ('devices-snapshots', 'apps-upload', 'apps-approval', 'profile-api-keys')
ON CONFLICT DO NOTHING;

-- devops: 监控运维、设备、个人中心
INSERT INTO menu_roles ("menuId", "roleId")
SELECT m.id, (SELECT id FROM roles WHERE name = 'devops')
FROM menus m
WHERE m.code ~ '^(monitoring|devices|profile)'
  AND m.code IN ('monitoring', 'monitoring-dashboard', 'monitoring-logs', 'monitoring-alerts',
                 'devices', 'devices-list', 'devices-monitoring',
                 'profile', 'profile-info', 'profile-security')
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================
-- 验证结果
-- ============================================

-- 统计菜单数量
SELECT
  '菜单统计' as info,
  COUNT(*) as 菜单总数,
  COUNT(CASE WHEN "parentId" IS NULL THEN 1 END) as 一级菜单,
  COUNT(CASE WHEN "parentId" IS NOT NULL THEN 1 END) as 二级菜单
FROM menus;

-- 查看各角色的菜单数量
SELECT
  '角色菜单统计' as info,
  r.name as 角色,
  COUNT(DISTINCT mr."menuId") as 菜单总数,
  COUNT(DISTINCT CASE WHEN m."parentId" IS NULL THEN m.id END) as 一级菜单数
FROM roles r
LEFT JOIN menu_roles mr ON r.id = mr."roleId"
LEFT JOIN menus m ON mr."menuId" = m.id
WHERE r.name IN ('super_admin', 'admin', 'tenant_admin', 'department_admin', 'vip_user', 'user', 'enterprise_user', 'devops')
GROUP BY r.name
ORDER BY COUNT(DISTINCT mr."menuId") DESC;

-- 展示各角色的一级菜单
SELECT
  '角色一级菜单' as info,
  r.name as 角色,
  STRING_AGG(m.name, ', ' ORDER BY m.sort) as 菜单列表
FROM roles r
JOIN menu_roles mr ON r.id = mr."roleId"
JOIN menus m ON mr."menuId" = m.id
WHERE m."parentId" IS NULL
  AND r.name IN ('super_admin', 'admin', 'tenant_admin', 'department_admin', 'vip_user', 'user', 'enterprise_user', 'devops')
GROUP BY r.name
ORDER BY
  CASE r.name
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'tenant_admin' THEN 3
    WHEN 'department_admin' THEN 4
    WHEN 'vip_user' THEN 5
    WHEN 'enterprise_user' THEN 6
    WHEN 'user' THEN 7
    WHEN 'devops' THEN 8
  END;
