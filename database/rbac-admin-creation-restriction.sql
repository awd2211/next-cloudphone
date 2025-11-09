-- ============================================
-- RBAC 优化 - 管理员创建权限限制
-- 只有 super_admin 可以创建管理员
-- Date: 2025-11-06
-- ============================================

BEGIN;

-- ============================================
-- 1. 细分用户创建权限
-- ============================================

-- 创建不同级别的用户创建权限
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
-- 普通用户创建权限
('20000000-0000-0000-0000-000000000300', 'user.create.regular', '创建普通用户（user）', 'user', 'create', true),
('20000000-0000-0000-0000-000000000301', 'user.create.readonly', '创建只读用户（readonly_user）', 'user', 'create', true),
('20000000-0000-0000-0000-000000000302', 'user.create.enterprise', '创建企业用户（enterprise_user）', 'user', 'create', true),
('20000000-0000-0000-0000-000000000303', 'user.create.vip', '创建VIP用户（vip_user）', 'user', 'create', true),

-- 管理员创建权限（仅 super_admin）
('20000000-0000-0000-0000-000000000310', 'user.create.department-admin', '创建部门管理员', 'user', 'create', true),
('20000000-0000-0000-0000-000000000311', 'user.create.tenant-admin', '创建租户管理员', 'user', 'create', true),
('20000000-0000-0000-0000-000000000312', 'user.create.admin', '创建业务管理员', 'user', 'create', true),
('20000000-0000-0000-0000-000000000313', 'user.create.super-admin', '创建超级管理员', 'user', 'create', true),

-- 专业角色创建权限
('20000000-0000-0000-0000-000000000320', 'user.create.devops', '创建运维工程师', 'user', 'create', true),
('20000000-0000-0000-0000-000000000321', 'user.create.billing-admin', '创建计费管理员', 'user', 'create', true),
('20000000-0000-0000-0000-000000000322', 'user.create.auditor', '创建审计员', 'user', 'create', true);

-- 角色分配管理权限
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('20000000-0000-0000-0000-000000000330', 'user.assign-role.regular', '分配普通角色', 'user', 'assign-role', true),
('20000000-0000-0000-0000-000000000331', 'user.assign-role.admin', '分配管理员角色', 'user', 'assign-role', true),
('20000000-0000-0000-0000-000000000332', 'user.revoke-role.regular', '撤销普通角色', 'user', 'revoke-role', true),
('20000000-0000-0000-0000-000000000333', 'user.revoke-role.admin', '撤销管理员角色', 'user', 'revoke-role', true);

-- ============================================
-- 2. 为角色分配细分的用户创建权限
-- ============================================

-- super_admin: 所有用户创建权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000000', id FROM permissions
WHERE name LIKE 'user.create.%' OR name LIKE 'user.assign-role.%' OR name LIKE 'user.revoke-role.%'
ON CONFLICT DO NOTHING;

-- admin: 只能创建普通用户，不能创建任何管理员
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions
WHERE name IN (
  'user.create.regular',
  'user.create.readonly',
  'user.create.enterprise',
  'user.create.vip',
  -- ❌ 不能创建管理员（department-admin, tenant-admin, admin, super-admin）
  'user.assign-role.regular',
  'user.revoke-role.regular'
)
ON CONFLICT DO NOTHING;

-- tenant_admin: 只能创建租户内的普通用户，不能创建管理员
-- 注意：如果需要 tenant_admin 可以创建 department_admin，取消下面的注释
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM permissions
WHERE name IN (
  'user.create.regular',
  'user.create.readonly',
  'user.create.enterprise',
  -- 'user.create.department-admin',  -- 可选：是否允许租户管理员创建部门管理员
  'user.assign-role.regular',
  'user.revoke-role.regular'
)
ON CONFLICT DO NOTHING;

-- department_admin: 只能创建本部门的普通用户
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'department_admin'), id FROM permissions
WHERE name IN (
  'user.create.regular',
  'user.create.readonly'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. 移除旧的宽泛权限（保持向后兼容）
-- ============================================

-- 注意：这里我们保留旧权限，只是不再为新角色分配
-- 如果要完全移除，需要先确保所有代码都使用新权限

-- ============================================
-- 4. 创建权限检查函数（用于业务逻辑）
-- ============================================

-- 检查用户是否可以创建指定角色的用户
CREATE OR REPLACE FUNCTION can_create_user_with_role(
  creator_role_name TEXT,
  target_role_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  -- 定义管理员角色列表
  admin_roles TEXT[] := ARRAY['super_admin', 'admin', 'tenant_admin', 'department_admin', 'devops', 'billing_admin', 'auditor'];
  -- 定义普通用户角色列表
  regular_roles TEXT[] := ARRAY['user', 'readonly_user', 'enterprise_user', 'vip_user'];
BEGIN
  -- super_admin 可以创建任何角色（包括其他 super_admin）
  IF creator_role_name = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  -- admin 只能创建普通用户，不能创建任何管理员
  IF creator_role_name = 'admin' AND target_role_name = ANY(regular_roles) THEN
    RETURN TRUE;
  END IF;

  -- tenant_admin 只能创建普通用户（不包括部门管理员）
  -- 如果需要允许 tenant_admin 创建 department_admin，修改下面的条件
  IF creator_role_name = 'tenant_admin' AND target_role_name = ANY(regular_roles) THEN
    RETURN TRUE;
  END IF;

  -- department_admin 只能创建普通用户
  IF creator_role_name = 'department_admin' AND target_role_name IN ('user', 'readonly_user') THEN
    RETURN TRUE;
  END IF;

  -- 默认不允许
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- 验证结果
-- ============================================

-- 统计用户创建权限
SELECT
  '用户创建权限统计' as info,
  CASE
    WHEN name LIKE 'user.create.regular' OR name LIKE 'user.create.readonly' OR name LIKE 'user.create.enterprise' OR name LIKE 'user.create.vip' THEN '1. 普通用户创建'
    WHEN name LIKE 'user.create.%admin' THEN '2. 管理员创建'
    WHEN name LIKE 'user.create.devops' OR name LIKE 'user.create.billing-admin' OR name LIKE 'user.create.auditor' THEN '3. 专业角色创建'
    WHEN name LIKE 'user.assign-role.%' OR name LIKE 'user.revoke-role.%' THEN '4. 角色分配管理'
  END as category,
  COUNT(*) as count
FROM permissions
WHERE name LIKE 'user.create.%' OR name LIKE 'user.assign-role.%' OR name LIKE 'user.revoke-role.%'
GROUP BY category
ORDER BY category;

-- 查看各角色的用户创建权限
SELECT
  '角色用户创建权限' as info,
  r.name as role_name,
  STRING_AGG(p.name, ', ' ORDER BY p.name) as permissions
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE (p.name LIKE 'user.create.%' OR p.name LIKE 'user.assign-role.%')
  AND r.name IN ('super_admin', 'admin', 'tenant_admin', 'department_admin')
GROUP BY r.name
ORDER BY
  CASE r.name
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'tenant_admin' THEN 3
    WHEN 'department_admin' THEN 4
  END;

-- 测试权限检查函数
SELECT
  '权限检查测试' as info,
  creator as 创建者角色,
  target as 目标角色,
  CASE WHEN can_create_user_with_role(creator, target) THEN '✓ 允许' ELSE '✗ 禁止' END as 是否允许,
  CASE
    WHEN creator = 'super_admin' THEN '可创建任何角色'
    WHEN creator = 'admin' AND target IN ('user', 'readonly_user', 'enterprise_user', 'vip_user') THEN '可创建普通用户'
    WHEN creator = 'admin' THEN '❌ 不能创建管理员'
    WHEN creator = 'tenant_admin' AND target IN ('user', 'readonly_user', 'enterprise_user', 'vip_user') THEN '可创建普通用户'
    WHEN creator = 'tenant_admin' THEN '❌ 不能创建管理员'
    WHEN creator = 'department_admin' AND target IN ('user', 'readonly_user') THEN '可创建基础用户'
    WHEN creator = 'department_admin' THEN '❌ 不能创建其他角色'
    ELSE '无权限'
  END as 说明
FROM (VALUES
  -- super_admin 测试
  ('super_admin', 'super_admin'),
  ('super_admin', 'admin'),
  ('super_admin', 'tenant_admin'),
  ('super_admin', 'department_admin'),
  ('super_admin', 'vip_user'),
  ('super_admin', 'user'),
  -- admin 测试
  ('admin', 'admin'),
  ('admin', 'tenant_admin'),
  ('admin', 'department_admin'),
  ('admin', 'vip_user'),
  ('admin', 'enterprise_user'),
  ('admin', 'user'),
  -- tenant_admin 测试
  ('tenant_admin', 'admin'),
  ('tenant_admin', 'department_admin'),
  ('tenant_admin', 'enterprise_user'),
  ('tenant_admin', 'user'),
  -- department_admin 测试
  ('department_admin', 'department_admin'),
  ('department_admin', 'vip_user'),
  ('department_admin', 'user'),
  ('department_admin', 'readonly_user')
) AS t(creator, target)
ORDER BY
  CASE creator
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'tenant_admin' THEN 3
    WHEN 'department_admin' THEN 4
  END,
  target;
