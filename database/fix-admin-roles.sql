-- ============================================
-- 修正管理员角色层级
-- 创建超级管理员 super_admin，调整 admin 为普通管理员
-- Date: 2025-11-06
-- ============================================

BEGIN;

-- ============================================
-- 1. 创建超级管理员角色 (super_admin)
-- ============================================
INSERT INTO roles (id, name, description, "tenantId", "isSystem", metadata, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'super_admin',
  '超级管理员 - 拥有系统所有权限，可以管理所有资源、配置和系统设置',
  NULL,
  true,
  '{"level": "system", "priority": 0, "canManageRoles": true, "canManagePermissions": true, "canAccessSystemSettings": true}',
  NOW(),
  NOW()
);

-- ============================================
-- 2. 为 super_admin 分配所有权限
-- ============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000000', id
FROM permissions;

-- ============================================
-- 3. 更新 admin 角色为普通管理员
-- ============================================
UPDATE roles
SET
  description = '普通管理员 - 管理用户、设备、应用等业务资源，不包括系统级配置',
  metadata = '{"level": "business", "priority": 1, "canManageRoles": false, "canManagePermissions": false, "canAccessSystemSettings": false}'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- ============================================
-- 4. 调整 admin 角色的权限（排除系统级权限）
-- ============================================

-- 先删除 admin 的所有权限
DELETE FROM role_permissions
WHERE role_id = '00000000-0000-0000-0000-000000000001';

-- 为 admin 分配业务管理权限（排除超级管理员专属权限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id
FROM permissions
WHERE name NOT IN (
  -- 排除超级管理员专属权限
  'admin:*:*',           -- 超级管理员通配符权限
  'admin.full',          -- 超级管理员完整权限
  'permission.create',   -- 不能创建权限
  'permission.delete',   -- 不能删除权限
  'role.create',         -- 不能创建角色
  'role.delete',         -- 不能删除角色
  'permission:cache:manage',  -- 不能管理权限缓存
  'system:user:list'     -- 不能访问系统用户列表
);

COMMIT;

-- ============================================
-- 验证结果
-- ============================================
SELECT
  '角色信息：' as info,
  name as 角色名称,
  description as 描述,
  CASE WHEN "isSystem" = true THEN '是' ELSE '否' END as 系统角色
FROM roles
WHERE name IN ('super_admin', 'admin')
ORDER BY
  CASE
    WHEN name = 'super_admin' THEN 0
    WHEN name = 'admin' THEN 1
  END;

SELECT
  '权限统计：' as info,
  r.name as 角色名称,
  COUNT(p.id) as 权限数量
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.name IN ('super_admin', 'admin')
GROUP BY r.id, r.name
ORDER BY
  CASE
    WHEN r.name = 'super_admin' THEN 0
    WHEN r.name = 'admin' THEN 1
  END;
