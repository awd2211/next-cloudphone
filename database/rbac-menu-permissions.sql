-- ============================================
-- RBAC 优化 - 菜单权限控制
-- 每个角色只能看到自己有权限的页面
-- Date: 2025-11-06
-- ============================================

BEGIN;

-- ============================================
-- 1. 创建菜单表（如果不存在）
-- ============================================

CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  icon VARCHAR(50),
  path VARCHAR(200),
  component VARCHAR(200),
  parent_id UUID REFERENCES menus(id) ON DELETE CASCADE,
  order_num INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建菜单-角色关联表
CREATE TABLE IF NOT EXISTS menu_roles (
  menu_id UUID REFERENCES menus(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_id, role_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_menus_parent_id ON menus(parent_id);
CREATE INDEX IF NOT EXISTS idx_menus_order_num ON menus(order_num);
CREATE INDEX IF NOT EXISTS idx_menu_roles_menu_id ON menu_roles(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_roles_role_id ON menu_roles(role_id);

-- ============================================
-- 2. 插入菜单数据
-- ============================================

-- 一级菜单
INSERT INTO menus (id, name, title, icon, path, component, parent_id, order_num, metadata) VALUES
-- 系统管理
('10000000-0000-0000-0000-000000000001', 'system', '系统管理', 'SettingOutlined', '/system', 'Layout', NULL, 1, '{"requiresAuth": true, "hideInBreadcrumb": false}'),
-- 用户管理
('10000000-0000-0000-0000-000000000002', 'users', '用户管理', 'UserOutlined', '/users', 'Layout', NULL, 2, '{"requiresAuth": true}'),
-- 设备管理
('10000000-0000-0000-0000-000000000003', 'devices', '设备管理', 'MobileOutlined', '/devices', 'Layout', NULL, 3, '{"requiresAuth": true}'),
-- 应用管理
('10000000-0000-0000-0000-000000000004', 'apps', '应用管理', 'AppstoreOutlined', '/apps', 'Layout', NULL, 4, '{"requiresAuth": true}'),
-- 代理管理
('10000000-0000-0000-0000-000000000005', 'proxy', '代理管理', 'GlobalOutlined', '/proxy', 'Layout', NULL, 5, '{"requiresAuth": true}'),
-- 短信服务
('10000000-0000-0000-0000-000000000006', 'sms', '短信服务', 'MessageOutlined', '/sms', 'Layout', NULL, 6, '{"requiresAuth': true}'),
-- 计费管理
('10000000-0000-0000-0000-000000000007', 'billing', '计费管理', 'MoneyCollectOutlined', '/billing', 'Layout', NULL, 7, '{"requiresAuth": true}'),
-- 通知中心
('10000000-0000-0000-0000-000000000008', 'notifications', '通知中心', 'BellOutlined', '/notifications', 'Layout', NULL, 8, '{"requiresAuth": true}'),
-- 审批中心
('10000000-0000-0000-0000-000000000009', 'approvals', '审批中心', 'AuditOutlined', '/approvals', 'Layout', NULL, 9, '{"requiresAuth": true}'),
-- 监控运维
('10000000-0000-0000-0000-000000000010', 'monitoring', '监控运维', 'DashboardOutlined', '/monitoring', 'Layout', NULL, 10, '{"requiresAuth": true}'),
-- 个人中心
('10000000-0000-0000-0000-000000000011', 'profile', '个人中心', 'IdcardOutlined', '/profile', 'Layout', NULL, 11, '{"requiresAuth": true}')
ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  icon = EXCLUDED.icon,
  path = EXCLUDED.path,
  updated_at = NOW();

-- 二级菜单 - 系统管理
INSERT INTO menus (id, name, title, icon, path, component, parent_id, order_num, metadata) VALUES
('20000000-0000-0000-0000-000000000001', 'system-users', '用户列表', NULL, '/system/users', 'pages/System/Users', '10000000-0000-0000-0000-000000000001', 1, '{"permission": "user.read"}'),
('20000000-0000-0000-0000-000000000002', 'system-roles', '角色管理', NULL, '/system/roles', 'pages/System/Roles', '10000000-0000-0000-0000-000000000001', 2, '{"permission": "role.read"}'),
('20000000-0000-0000-0000-000000000003', 'system-permissions', '权限管理', NULL, '/system/permissions', 'pages/System/Permissions', '10000000-0000-0000-0000-000000000001', 3, '{"permission": "permission.read"}'),
('20000000-0000-0000-0000-000000000004', 'system-menus', '菜单管理', NULL, '/system/menus', 'pages/System/Menus', '10000000-0000-0000-0000-000000000001', 4, '{"permission": "permission:menu:list"}'),
('20000000-0000-0000-0000-000000000005', 'system-audit', '审计日志', NULL, '/system/audit', 'pages/System/Audit', '10000000-0000-0000-0000-000000000001', 5, '{"permission": "admin:view"}')
ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  path = EXCLUDED.path,
  parent_id = EXCLUDED.parent_id,
  updated_at = NOW();

-- 二级菜单 - 用户管理
INSERT INTO menus (id, name, title, icon, path, component, parent_id, order_num, metadata) VALUES
('20000000-0000-0000-0000-000000000010', 'users-list', '用户列表', NULL, '/users/list', 'pages/Users/List', '10000000-0000-0000-0000-000000000002', 1, '{"permission": "user.read"}'),
('20000000-0000-0000-0000-000000000011', 'users-create', '创建用户', NULL, '/users/create', 'pages/Users/Create', '10000000-0000-0000-0000-000000000002', 2, '{"permission": "user.create"}'),
('20000000-0000-0000-0000-000000000012', 'users-quotas', '配额管理', NULL, '/users/quotas', 'pages/Users/Quotas', '10000000-0000-0000-0000-000000000002', 3, '{"permission": "user.read"}')
ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  path = EXCLUDED.path,
  parent_id = EXCLUDED.parent_id,
  updated_at = NOW();

-- 二级菜单 - 设备管理
INSERT INTO menus (id, name, title, icon, path, component, parent_id, order_num, metadata) VALUES
('20000000-0000-0000-0000-000000000020', 'devices-list', '设备列表', NULL, '/devices/list', 'pages/Devices/List', '10000000-0000-0000-0000-000000000003', 1, '{"permission": "device.read"}'),
('20000000-0000-0000-0000-000000000021', 'devices-create', '创建设备', NULL, '/devices/create', 'pages/Devices/Create', '10000000-0000-0000-0000-000000000003', 2, '{"permission": "device.create"}'),
('20000000-0000-0000-0000-000000000022', 'devices-templates', '设备模板', NULL, '/devices/templates', 'pages/Devices/Templates', '10000000-0000-0000-0000-000000000003', 3, '{"permission": "device.read"}'),
('20000000-0000-0000-0000-000000000023', 'devices-monitoring', '设备监控', NULL, '/devices/monitoring', 'pages/Devices/Monitoring', '10000000-0000-0000-0000-000000000003', 4, '{"permission": "device.read"}'),
('20000000-0000-0000-0000-000000000024', 'devices-snapshots', '快照管理', NULL, '/devices/snapshots', 'pages/Devices/Snapshots', '10000000-0000-0000-0000-000000000003', 5, '{"permission": "device.backup"}')
ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  path = EXCLUDED.path,
  parent_id = EXCLUDED.parent_id,
  updated_at = NOW();

-- 二级菜单 - 应用管理
INSERT INTO menus (id, name, title, icon, path, component, parent_id, order_num, metadata) VALUES
('20000000-0000-0000-0000-000000000030', 'apps-market', '应用市场', NULL, '/apps/market', 'pages/Apps/Market', '10000000-0000-0000-0000-000000000004', 1, '{"permission": "app.read"}'),
('20000000-0000-0000-0000-000000000031', 'apps-upload', '上传应用', NULL, '/apps/upload', 'pages/Apps/Upload', '10000000-0000-0000-0000-000000000004', 2, '{"permission": "app.create"}'),
('20000000-0000-0000-0000-000000000032', 'apps-approval', '应用审核', NULL, '/apps/approval', 'pages/Apps/Approval', '10000000-0000-0000-0000-000000000004', 3, '{"permission": "app.approve"}')
ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  path = EXCLUDED.path,
  parent_id = EXCLUDED.parent_id,
  updated_at = NOW();

-- 二级菜单 - 代理管理
INSERT INTO menus (id, name, title, icon, path, component, parent_id, order_num, metadata) VALUES
('20000000-0000-0000-0000-000000000040', 'proxy-list', '代理列表', NULL, '/proxy/list', 'pages/Proxy/List', '10000000-0000-0000-0000-000000000005', 1, '{"permission": "proxy.read"}'),
('20000000-0000-0000-0000-000000000041', 'proxy-sessions', '会话管理', NULL, '/proxy/sessions', 'pages/Proxy/Sessions', '10000000-0000-0000-0000-000000000005', 2, '{"permission": "proxy:session:read"}'),
('20000000-0000-0000-0000-000000000042', 'proxy-stats', '使用统计', NULL, '/proxy/stats', 'pages/Proxy/Stats', '10000000-0000-0000-0000-000000000005', 3, '{"permission": "proxy:stats"}'),
('20000000-0000-0000-0000-000000000043', 'proxy-cost', '成本分析', NULL, '/proxy/cost', 'pages/Proxy/Cost', '10000000-0000-0000-0000-000000000005', 4, '{"permission": "proxy:cost:dashboard"}')
ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  path = EXCLUDED.path,
  parent_id = EXCLUDED.parent_id,
  updated_at = NOW();

-- 二级菜单 - 短信服务
INSERT INTO menus (id, name, title, icon, path, component, parent_id, order_num, metadata) VALUES
('20000000-0000-0000-0000-000000000050', 'sms-messages', '短信列表', NULL, '/sms/messages', 'pages/SMS/Messages', '10000000-0000-0000-0000-000000000006', 1, '{"permission": "sms.read"}'),
('20000000-0000-0000-0000-000000000051', 'sms-send', '发送短信', NULL, '/sms/send', 'pages/SMS/Send', '10000000-0000-0000-0000-000000000006', 2, '{"permission": "sms.send"}'),
('20000000-0000-0000-0000-000000000052', 'sms-stats', '统计报表', NULL, '/sms/stats', 'pages/SMS/Stats', '10000000-0000-0000-0000-000000000006', 3, '{"permission": "sms.stats"}')
ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  path = EXCLUDED.path,
  parent_id = EXCLUDED.parent_id,
  updated_at = NOW();

-- 二级菜单 - 计费管理
INSERT INTO menus (id, name, title, icon, path, component, parent_id, order_num, metadata) VALUES
('20000000-0000-0000-0000-000000000060', 'billing-invoices', '账单列表', NULL, '/billing/invoices', 'pages/Billing/Invoices', '10000000-0000-0000-0000-000000000007', 1, '{"permission": "billing:read"}'),
('20000000-0000-0000-0000-000000000061', 'billing-payments', '支付记录', NULL, '/billing/payments', 'pages/Billing/Payments', '10000000-0000-0000-0000-000000000007', 2, '{"permission": "billing:read"}'),
('20000000-0000-0000-0000-000000000062', 'billing-balance', '余额管理', NULL, '/billing/balance', 'pages/Billing/Balance', '10000000-0000-0000-0000-000000000007', 3, '{"permission": "billing:read"}')
ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  path = EXCLUDED.path,
  parent_id = EXCLUDED.parent_id,
  updated_at = NOW();

-- 二级菜单 - 通知中心
INSERT INTO menus (id, name, title, icon, path, component, parent_id, order_num, metadata) VALUES
('20000000-0000-0000-0000-000000000070', 'notifications-list', '通知列表', NULL, '/notifications/list', 'pages/Notifications/List', '10000000-0000-0000-0000-000000000008', 1, '{"permission": "notification.read"}'),
('20000000-0000-0000-0000-000000000071', 'notifications-templates', '模板管理', NULL, '/notifications/templates', 'pages/Notifications/Templates', '10000000-0000-0000-0000-000000000008', 2, '{"permission": "notification.template-read"}'),
('20000000-0000-0000-0000-000000000072', 'notifications-preferences', '偏好设置', NULL, '/notifications/preferences', 'pages/Notifications/Preferences', '10000000-0000-0000-0000-000000000008', 3, '{"permission": "notification.preference-read"}')
ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  path = EXCLUDED.path,
  parent_id = EXCLUDED.parent_id,
  updated_at = NOW();

-- 二级菜单 - 审批中心
INSERT INTO menus (id, name, title, icon, path, component, parent_id, order_num, metadata) VALUES
('20000000-0000-0000-0000-000000000080', 'approvals-pending', '待审批', NULL, '/approvals/pending', 'pages/Approvals/Pending', '10000000-0000-0000-0000-000000000009', 1, '{"permission": "approval.view.own"}'),
('20000000-0000-0000-0000-000000000081', 'approvals-my-requests', '我的申请', NULL, '/approvals/my-requests', 'pages/Approvals/MyRequests', '10000000-0000-0000-0000-000000000009', 2, '{"permission": "approval.view.own"}'),
('20000000-0000-0000-0000-000000000082', 'approvals-history', '审批历史', NULL, '/approvals/history', 'pages/Approvals/History', '10000000-0000-0000-0000-000000000009', 3, '{"permission": "approval.history.view"}'),
('20000000-0000-0000-0000-000000000083', 'approvals-stats', '审批统计', NULL, '/approvals/stats', 'pages/Approvals/Stats', '10000000-0000-0000-0000-000000000009', 4, '{"permission": "approval.stats.view"}')
ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  path = EXCLUDED.path,
  parent_id = EXCLUDED.parent_id,
  updated_at = NOW();

-- 二级菜单 - 监控运维
INSERT INTO menus (id, name, title, icon, path, component, parent_id, order_num, metadata) VALUES
('20000000-0000-0000-0000-000000000090', 'monitoring-dashboard', '监控面板', NULL, '/monitoring/dashboard', 'pages/Monitoring/Dashboard', '10000000-0000-0000-0000-000000000010', 1, '{"permission": "device.metrics.view"}'),
('20000000-0000-0000-0000-000000000091', 'monitoring-logs', '系统日志', NULL, '/monitoring/logs', 'pages/Monitoring/Logs', '10000000-0000-0000-0000-000000000010', 2, '{"permission": "device.logs.view"}'),
('20000000-0000-0000-0000-000000000092', 'monitoring-alerts', '告警管理', NULL, '/monitoring/alerts', 'pages/Monitoring/Alerts', '10000000-0000-0000-0000-000000000010', 3, '{"permission": "proxy:alert:read"}')
ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  path = EXCLUDED.path,
  parent_id = EXCLUDED.parent_id,
  updated_at = NOW();

-- 二级菜单 - 个人中心
INSERT INTO menus (id, name, title, icon, path, component, parent_id, order_num, metadata) VALUES
('20000000-0000-0000-0000-000000000100', 'profile-info', '基本信息', NULL, '/profile/info', 'pages/Profile/Info', '10000000-0000-0000-0000-000000000011', 1, '{}'),
('20000000-0000-0000-0000-000000000101', 'profile-security', '安全设置', NULL, '/profile/security', 'pages/Profile/Security', '10000000-0000-0000-0000-000000000011', 2, '{}'),
('20000000-0000-0000-0000-000000000102', 'profile-api-keys', 'API密钥', NULL, '/profile/api-keys', 'pages/Profile/ApiKeys', '10000000-0000-0000-0000-000000000011', 3, '{}')
ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  path = EXCLUDED.path,
  parent_id = EXCLUDED.parent_id,
  updated_at = NOW();

-- ============================================
-- 3. 为角色分配菜单权限
-- ============================================

-- super_admin: 所有菜单
INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, '00000000-0000-0000-0000-000000000000'
FROM menus m
ON CONFLICT DO NOTHING;

-- admin: 除系统管理外的所有菜单
INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, '00000000-0000-0000-0000-000000000001'
FROM menus m
WHERE m.name NOT IN ('system', 'system-users', 'system-roles', 'system-permissions', 'system-menus', 'system-audit')
   OR m.name IN ('users', 'devices', 'apps', 'proxy', 'sms', 'billing', 'notifications', 'approvals', 'monitoring', 'profile')
ON CONFLICT DO NOTHING;

-- tenant_admin: 用户、设备、应用、代理、短信、计费、通知、审批、个人中心
INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, '00000000-0000-0000-0000-000000000003'
FROM menus m
WHERE m.name IN (
  'users', 'users-list', 'users-create', 'users-quotas',
  'devices', 'devices-list', 'devices-create', 'devices-templates', 'devices-monitoring', 'devices-snapshots',
  'apps', 'apps-market', 'apps-upload', 'apps-approval',
  'proxy', 'proxy-list', 'proxy-sessions', 'proxy-stats',
  'sms', 'sms-messages', 'sms-send', 'sms-stats',
  'billing', 'billing-invoices', 'billing-payments', 'billing-balance',
  'notifications', 'notifications-list', 'notifications-preferences',
  'approvals', 'approvals-pending', 'approvals-my-requests', 'approvals-history',
  'profile', 'profile-info', 'profile-security', 'profile-api-keys'
)
ON CONFLICT DO NOTHING;

-- department_admin: 用户、设备、通知、审批、个人中心
INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, (SELECT id FROM roles WHERE name = 'department_admin')
FROM menus m
WHERE m.name IN (
  'users', 'users-list', 'users-create',
  'devices', 'devices-list', 'devices-monitoring',
  'notifications', 'notifications-list', 'notifications-preferences',
  'approvals', 'approvals-pending', 'approvals-my-requests',
  'profile', 'profile-info', 'profile-security'
)
ON CONFLICT DO NOTHING;

-- vip_user: 设备、应用、代理、短信、计费、通知、审批、个人中心
INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, (SELECT id FROM roles WHERE name = 'vip_user')
FROM menus m
WHERE m.name IN (
  'devices', 'devices-list', 'devices-create', 'devices-templates', 'devices-monitoring', 'devices-snapshots',
  'apps', 'apps-market', 'apps-upload',
  'proxy', 'proxy-list', 'proxy-sessions', 'proxy-stats', 'proxy-cost',
  'sms', 'sms-messages', 'sms-send',
  'billing', 'billing-invoices', 'billing-payments', 'billing-balance',
  'notifications', 'notifications-list', 'notifications-preferences',
  'approvals', 'approvals-my-requests',
  'profile', 'profile-info', 'profile-security', 'profile-api-keys'
)
ON CONFLICT DO NOTHING;

-- user: 设备、应用、通知、审批、个人中心
INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, '00000000-0000-0000-0000-000000000002'
FROM menus m
WHERE m.name IN (
  'devices', 'devices-list', 'devices-create', 'devices-monitoring',
  'apps', 'apps-market',
  'billing', 'billing-invoices', 'billing-balance',
  'notifications', 'notifications-list', 'notifications-preferences',
  'approvals', 'approvals-my-requests',
  'profile', 'profile-info', 'profile-security'
)
ON CONFLICT DO NOTHING;

-- devops: 监控运维、设备、系统日志、个人中心
INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, (SELECT id FROM roles WHERE name = 'devops')
FROM menus m
WHERE m.name IN (
  'devices', 'devices-list', 'devices-monitoring',
  'monitoring', 'monitoring-dashboard', 'monitoring-logs', 'monitoring-alerts',
  'profile', 'profile-info', 'profile-security'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. 创建获取用户菜单的函数
-- ============================================

-- 获取用户的菜单树
CREATE OR REPLACE FUNCTION get_user_menus(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH user_menu_ids AS (
    -- 获取用户所有角色的菜单ID
    SELECT DISTINCT m.id
    FROM menus m
    JOIN menu_roles mr ON m.id = mr.menu_id
    JOIN user_roles ur ON mr.role_id = ur.role_id
    WHERE ur.user_id = user_id_param
      AND m.is_visible = true
      AND m.is_active = true
  ),
  menu_tree AS (
    -- 获取完整的菜单树（包括父菜单）
    SELECT DISTINCT m.*
    FROM menus m
    WHERE m.id IN (SELECT id FROM user_menu_ids)
       OR m.id IN (
         SELECT DISTINCT parent_id
         FROM menus
         WHERE id IN (SELECT id FROM user_menu_ids)
           AND parent_id IS NOT NULL
       )
  )
  SELECT json_agg(
    json_build_object(
      'id', m.id,
      'name', m.name,
      'title', m.title,
      'icon', m.icon,
      'path', m.path,
      'component', m.component,
      'orderNum', m.order_num,
      'metadata', m.metadata,
      'children', (
        SELECT json_agg(
          json_build_object(
            'id', child.id,
            'name', child.name,
            'title', child.title,
            'icon', child.icon,
            'path', child.path,
            'component', child.component,
            'orderNum', child.order_num,
            'metadata', child.metadata
          )
          ORDER BY child.order_num
        )
        FROM menu_tree child
        WHERE child.parent_id = m.id
      )
    )
    ORDER BY m.order_num
  ) INTO result
  FROM menu_tree m
  WHERE m.parent_id IS NULL;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- 检查用户是否有访问某个菜单的权限
CREATE OR REPLACE FUNCTION can_access_menu(
  user_id_param UUID,
  menu_path_param VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM menus m
    JOIN menu_roles mr ON m.id = mr.menu_id
    JOIN user_roles ur ON mr.role_id = ur.role_id
    WHERE ur.user_id = user_id_param
      AND m.path = menu_path_param
      AND m.is_visible = true
      AND m.is_active = true
  ) INTO has_access;

  RETURN has_access;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- 验证结果
-- ============================================

-- 统计菜单数量
SELECT
  '菜单统计' as info,
  COUNT(*) as total_menus,
  COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as top_level_menus,
  COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as sub_menus
FROM menus;

-- 查看各角色的菜单数量
SELECT
  '角色菜单统计' as info,
  r.name as role_name,
  COUNT(DISTINCT mr.menu_id) as menu_count,
  COUNT(DISTINCT CASE WHEN m.parent_id IS NULL THEN m.id END) as top_level_count
FROM roles r
LEFT JOIN menu_roles mr ON r.id = mr.role_id
LEFT JOIN menus m ON mr.menu_id = m.id
WHERE r.name IN ('super_admin', 'admin', 'tenant_admin', 'department_admin', 'vip_user', 'user', 'devops')
GROUP BY r.name
ORDER BY COUNT(DISTINCT mr.menu_id) DESC;

-- 展示各角色的一级菜单
SELECT
  '角色一级菜单' as info,
  r.name as role_name,
  STRING_AGG(m.title, ', ' ORDER BY m.order_num) as menus
FROM roles r
JOIN menu_roles mr ON r.id = mr.role_id
JOIN menus m ON mr.menu_id = m.id
WHERE m.parent_id IS NULL
  AND r.name IN ('super_admin', 'admin', 'tenant_admin', 'department_admin', 'vip_user', 'user', 'devops')
GROUP BY r.name
ORDER BY
  CASE r.name
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'tenant_admin' THEN 3
    WHEN 'department_admin' THEN 4
    WHEN 'vip_user' THEN 5
    WHEN 'user' THEN 6
    WHEN 'devops' THEN 7
  END;
