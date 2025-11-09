-- ============================================
-- 补充缺失的核心功能菜单
-- Date: 2025-11-06
-- 说明：为已有权限但缺失菜单的模块添加菜单项
-- ============================================

BEGIN;

-- ============================================
-- 1. 添加数据范围管理菜单（在系统管理下）
-- ============================================
DO $$
DECLARE
  system_menu_id UUID;
  new_menu_id UUID;
BEGIN
  SELECT id INTO system_menu_id FROM menus WHERE code = 'system';

  INSERT INTO menus (
    code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode", metadata
  ) VALUES (
    'system-data-scopes',
    '数据范围',
    '/system/data-scopes',
    NULL,
    system_menu_id,
    7,
    true,
    true,
    'data-scope:read',
    '{"component": "system/DataScopeList"}'::jsonb
  ) RETURNING id INTO new_menu_id;

  -- 为 super_admin 和 admin 分配
  INSERT INTO menu_roles ("menuId", "roleId")
  SELECT new_menu_id, r.id FROM roles r WHERE r.name IN ('super_admin', 'admin')
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- 2. 添加系统设置菜单（在系统管理下）
-- ============================================
DO $$
DECLARE
  system_menu_id UUID;
  new_menu_id UUID;
BEGIN
  SELECT id INTO system_menu_id FROM menus WHERE code = 'system';

  INSERT INTO menus (
    code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode", metadata
  ) VALUES (
    'system-settings',
    '系统设置',
    '/system/settings',
    NULL,
    system_menu_id,
    8,
    true,
    true,
    'setting.read',
    '{"component": "system/SettingList"}'::jsonb
  ) RETURNING id INTO new_menu_id;

  -- 为 super_admin 分配
  INSERT INTO menu_roles ("menuId", "roleId")
  VALUES (new_menu_id, '00000000-0000-0000-0000-000000000000')
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- 3. 添加租户管理顶级菜单
-- ============================================
DO $$
DECLARE
  tenant_menu_id UUID;
  tenant_list_id UUID;
  tenant_config_id UUID;
BEGIN
  -- 插入租户管理顶级菜单
  INSERT INTO menus (
    code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode", metadata
  ) VALUES (
    'tenants',
    '租户管理',
    '/tenants',
    'TeamOutlined',
    NULL,
    12,
    true,
    true,
    'tenant.read',
    '{"component": "Layout"}'::jsonb
  ) RETURNING id INTO tenant_menu_id;

  -- 租户列表
  INSERT INTO menus (
    code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode", metadata
  ) VALUES (
    'tenants-list',
    '租户列表',
    '/tenants/list',
    NULL,
    tenant_menu_id,
    1,
    true,
    true,
    'tenant.read',
    '{"component": "tenants/TenantList"}'::jsonb
  ) RETURNING id INTO tenant_list_id;

  -- 租户配置
  INSERT INTO menus (
    code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode", metadata
  ) VALUES (
    'tenants-config',
    '租户配置',
    '/tenants/config',
    NULL,
    tenant_menu_id,
    2,
    true,
    true,
    'tenant.config',
    '{"component": "tenants/TenantConfig"}'::jsonb
  ) RETURNING id INTO tenant_config_id;

  -- 为 super_admin 分配所有租户菜单
  INSERT INTO menu_roles ("menuId", "roleId")
  SELECT unnest(ARRAY[tenant_menu_id, tenant_list_id, tenant_config_id]),
         '00000000-0000-0000-0000-000000000000'
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- 4. 添加部门管理菜单（在用户管理下）
-- ============================================
DO $$
DECLARE
  users_menu_id UUID;
  new_menu_id UUID;
BEGIN
  SELECT id INTO users_menu_id FROM menus WHERE code = 'users';

  INSERT INTO menus (
    code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode", metadata
  ) VALUES (
    'users-departments',
    '部门管理',
    '/users/departments',
    NULL,
    users_menu_id,
    2,
    true,
    true,
    'department.read',
    '{"component": "users/DepartmentList"}'::jsonb
  ) RETURNING id INTO new_menu_id;

  -- 为 super_admin, admin, tenant_admin 分配
  INSERT INTO menu_roles ("menuId", "roleId")
  SELECT new_menu_id, r.id
  FROM roles r
  WHERE r.name IN ('super_admin', 'admin', 'tenant_admin')
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- 5. 添加工单管理顶级菜单
-- ============================================
DO $$
DECLARE
  ticket_menu_id UUID;
  my_tickets_id UUID;
  all_tickets_id UUID;
BEGIN
  -- 插入工单管理顶级菜单
  INSERT INTO menus (
    code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode", metadata
  ) VALUES (
    'tickets',
    '工单中心',
    '/tickets',
    'CustomerServiceOutlined',
    NULL,
    13,
    true,
    true,
    'ticket.read',
    '{"component": "Layout"}'::jsonb
  ) RETURNING id INTO ticket_menu_id;

  -- 我的工单
  INSERT INTO menus (
    code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode", metadata
  ) VALUES (
    'tickets-my',
    '我的工单',
    '/tickets/my',
    NULL,
    ticket_menu_id,
    1,
    true,
    true,
    'ticket.read',
    '{"component": "tickets/MyTickets"}'::jsonb
  ) RETURNING id INTO my_tickets_id;

  -- 所有工单
  INSERT INTO menus (
    code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode", metadata
  ) VALUES (
    'tickets-all',
    '所有工单',
    '/tickets/all',
    NULL,
    ticket_menu_id,
    2,
    true,
    true,
    'ticket.list',
    '{"component": "tickets/AllTickets"}'::jsonb
  ) RETURNING id INTO all_tickets_id;

  -- 所有用户都能看到工单菜单和我的工单
  INSERT INTO menu_roles ("menuId", "roleId")
  SELECT unnest(ARRAY[ticket_menu_id, my_tickets_id]), r.id
  FROM roles r
  ON CONFLICT DO NOTHING;

  -- 只有管理员能看到所有工单
  INSERT INTO menu_roles ("menuId", "roleId")
  SELECT all_tickets_id, r.id
  FROM roles r
  WHERE r.name IN ('super_admin', 'admin', 'tenant_admin', 'department_admin')
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- 6. 添加缓存管理菜单（在监控运维下）
-- ============================================
DO $$
DECLARE
  monitoring_menu_id UUID;
  new_menu_id UUID;
BEGIN
  SELECT id INTO monitoring_menu_id FROM menus WHERE code = 'monitoring';

  INSERT INTO menus (
    code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode", metadata
  ) VALUES (
    'monitoring-cache',
    '缓存管理',
    '/monitoring/cache',
    NULL,
    monitoring_menu_id,
    3,
    true,
    true,
    'cache.read',
    '{"component": "monitoring/CacheManagement"}'::jsonb
  ) RETURNING id INTO new_menu_id;

  -- 为 super_admin, admin, devops 分配
  INSERT INTO menu_roles ("menuId", "roleId")
  SELECT new_menu_id, r.id
  FROM roles r
  WHERE r.name IN ('super_admin', 'admin', 'devops')
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- 7. 添加队列管理菜单（在监控运维下）
-- ============================================
DO $$
DECLARE
  monitoring_menu_id UUID;
  new_menu_id UUID;
BEGIN
  SELECT id INTO monitoring_menu_id FROM menus WHERE code = 'monitoring';

  INSERT INTO menus (
    code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode", metadata
  ) VALUES (
    'monitoring-queues',
    '队列管理',
    '/monitoring/queues',
    NULL,
    monitoring_menu_id,
    4,
    true,
    true,
    'queue.read',
    '{"component": "monitoring/QueueManagement"}'::jsonb
  ) RETURNING id INTO new_menu_id;

  -- 为 super_admin, admin, devops 分配
  INSERT INTO menu_roles ("menuId", "roleId")
  SELECT new_menu_id, r.id
  FROM roles r
  WHERE r.name IN ('super_admin', 'admin', 'devops')
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- 8. 添加 Webhook 管理菜单（在系统管理下）
-- ============================================
DO $$
DECLARE
  system_menu_id UUID;
  new_menu_id UUID;
BEGIN
  SELECT id INTO system_menu_id FROM menus WHERE code = 'system';

  INSERT INTO menus (
    code, name, path, icon, "parentId", sort, "isActive", visible, "permissionCode", metadata
  ) VALUES (
    'system-webhooks',
    'Webhook管理',
    '/system/webhooks',
    NULL,
    system_menu_id,
    9,
    true,
    true,
    'webhook.read',
    '{"component": "system/WebhookList"}'::jsonb
  ) RETURNING id INTO new_menu_id;

  -- 为 super_admin, admin 分配
  INSERT INTO menu_roles ("menuId", "roleId")
  SELECT new_menu_id, r.id
  FROM roles r
  WHERE r.name IN ('super_admin', 'admin')
  ON CONFLICT DO NOTHING;
END $$;

COMMIT;

-- ============================================
-- 验证添加结果
-- ============================================
SELECT
  '=== 新增菜单统计 ===' as info;

-- 统计新增的菜单数量
SELECT
  '新增菜单总数' as 类型,
  COUNT(*)::text as 数量
FROM menus
WHERE code IN (
  'system-data-scopes',
  'system-settings',
  'tenants',
  'tenants-list',
  'tenants-config',
  'users-departments',
  'tickets',
  'tickets-my',
  'tickets-all',
  'monitoring-cache',
  'monitoring-queues',
  'system-webhooks'
);

SELECT
  '菜单总数' as 类型,
  COUNT(*)::text as 数量
FROM menus;

-- 显示所有顶级菜单
SELECT
  '=== 顶级菜单列表 ===' as info;

SELECT
  sort as 序号,
  code as 代码,
  name as 名称,
  path as 路径,
  icon as 图标
FROM menus
WHERE "parentId" IS NULL
ORDER BY sort;

-- 检查资源菜单覆盖情况
SELECT
  '=== 资源菜单覆盖检查 ===' as info;

WITH important_resources AS (
  SELECT unnest(ARRAY[
    'data-scope', 'api-key', 'quota', 'ticket', 'setting',
    'cache', 'queue', 'monitor', 'webhook', 'tenant', 'department'
  ]) as resource_name
)
SELECT
  ir.resource_name as 资源类型,
  COUNT(DISTINCT p.id) as 权限数,
  COUNT(DISTINCT m.id) as 菜单数,
  CASE
    WHEN COUNT(DISTINCT m.id) = 0 THEN '❌ 缺失'
    ELSE '✅ 已有'
  END as 状态
FROM important_resources ir
LEFT JOIN permissions p ON p.resource = ir.resource_name OR p.resource LIKE ir.resource_name || '%'
LEFT JOIN menus m ON m.path LIKE '%' || REPLACE(ir.resource_name, '-', '%') || '%'
  OR m.code LIKE '%' || REPLACE(ir.resource_name, '-', '%') || '%'
GROUP BY ir.resource_name
ORDER BY COUNT(DISTINCT m.id) ASC, ir.resource_name;
