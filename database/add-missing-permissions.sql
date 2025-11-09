-- ============================================
-- 补充缺失的权限
-- Date: 2025-11-06
-- Total: 29 个缺失的权限
-- ============================================

BEGIN;

-- ============================================
-- 1. 管理员超级权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('90000000-0000-0000-0000-000000000001', 'admin:*:*', '管理员全部权限（通配符）', 'admin', '*', true),
('90000000-0000-0000-0000-000000000002', 'admin.full', '管理员完整权限', 'admin', 'full', true),
('90000000-0000-0000-0000-000000000003', 'admin:view', '查看管理员信息', 'admin', 'view', true);

-- ============================================
-- 2. 设备管理补充权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('30000000-0000-0000-0000-000000000020', 'device:*', '设备全部权限（通配符）', 'device', '*', true),
('30000000-0000-0000-0000-000000000021', 'device:create', '创建设备（兼容格式）', 'device', 'create', true);

-- ============================================
-- 3. 用户管理补充权限
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('80000000-0000-0000-0000-000000000020', 'user:create', '创建用户（兼容格式）', 'user', 'create', true),
('80000000-0000-0000-0000-000000000021', 'user:delete', '删除用户（兼容格式）', 'user', 'delete', true),
('80000000-0000-0000-0000-000000000022', 'user:update', '更新用户（兼容格式）', 'user', 'update', true),
('80000000-0000-0000-0000-000000000023', 'users.manage', '管理所有用户', 'users', 'manage', true),
('80000000-0000-0000-0000-000000000024', 'users.read', '查看所有用户', 'users', 'read', true),
('80000000-0000-0000-0000-000000000025', 'users.write', '编辑所有用户', 'users', 'write', true),
('80000000-0000-0000-0000-000000000026', 'system:user:list', '系统用户列表', 'user', 'list', true);

-- ============================================
-- 4. 字段级权限管理
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('80000000-0000-0000-0000-000000000030', 'field-permission:create', '创建字段权限', 'field-permission', 'create', true),
('80000000-0000-0000-0000-000000000031', 'field-permission:read', '查看字段权限', 'field-permission', 'read', true),
('80000000-0000-0000-0000-000000000032', 'field-permission:update', '更新字段权限', 'field-permission', 'update', true),
('80000000-0000-0000-0000-000000000033', 'field-permission:delete', '删除字段权限', 'field-permission', 'delete', true),
('80000000-0000-0000-0000-000000000034', 'field-permission:list', '列出字段权限', 'field-permission', 'list', true),
('80000000-0000-0000-0000-000000000035', 'field-permission:toggle', '切换字段权限状态', 'field-permission', 'toggle', true),
('80000000-0000-0000-0000-000000000036', 'field-permission:meta', '获取字段权限元数据', 'field-permission', 'meta', true);

-- ============================================
-- 5. 数据范围权限管理
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('80000000-0000-0000-0000-000000000040', 'permission:dataScope:create', '创建数据范围', 'data-scope', 'create', true),
('80000000-0000-0000-0000-000000000041', 'permission:dataScope:view', '查看数据范围', 'data-scope', 'view', true),
('80000000-0000-0000-0000-000000000042', 'permission:dataScope:update', '更新数据范围', 'data-scope', 'update', true),
('80000000-0000-0000-0000-000000000043', 'permission:dataScope:delete', '删除数据范围', 'data-scope', 'delete', true),
('80000000-0000-0000-0000-000000000044', 'permission:dataScope:list', '列出数据范围', 'data-scope', 'list', true);

-- ============================================
-- 6. 菜单权限管理
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('80000000-0000-0000-0000-000000000050', 'permission:menu:view', '查看菜单权限', 'menu', 'view', true),
('80000000-0000-0000-0000-000000000051', 'permission:menu:list', '列出菜单权限', 'menu', 'list', true);

-- ============================================
-- 7. 权限缓存管理
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('80000000-0000-0000-0000-000000000060', 'permission:cache:view', '查看权限缓存', 'permission-cache', 'view', true),
('80000000-0000-0000-0000-000000000061', 'permission:cache:manage', '管理权限缓存', 'permission-cache', 'manage', true);

-- ============================================
-- 8. 通用权限查看
-- ============================================
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('80000000-0000-0000-0000-000000000070', 'permission:view', '查看权限详情', 'permission', 'view', true);

-- ============================================
-- 为 admin 角色添加所有新权限
-- ============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id
FROM permissions
WHERE name IN (
  'admin:*:*', 'admin.full', 'admin:view',
  'device:*', 'device:create',
  'user:create', 'user:delete', 'user:update',
  'users.manage', 'users.read', 'users.write', 'system:user:list',
  'field-permission:create', 'field-permission:read', 'field-permission:update',
  'field-permission:delete', 'field-permission:list', 'field-permission:toggle', 'field-permission:meta',
  'permission:dataScope:create', 'permission:dataScope:view', 'permission:dataScope:update',
  'permission:dataScope:delete', 'permission:dataScope:list',
  'permission:menu:view', 'permission:menu:list',
  'permission:cache:view', 'permission:cache:manage',
  'permission:view'
);

-- ============================================
-- 为 tenant_admin 角色添加相关权限（排除超级管理员权限）
-- ============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id
FROM permissions
WHERE name IN (
  'admin:view',
  'device:create',
  'user:create', 'user:delete', 'user:update',
  'users.manage', 'users.read', 'users.write', 'system:user:list',
  'field-permission:create', 'field-permission:read', 'field-permission:update',
  'field-permission:delete', 'field-permission:list', 'field-permission:toggle', 'field-permission:meta',
  'permission:dataScope:create', 'permission:dataScope:view', 'permission:dataScope:update',
  'permission:dataScope:delete', 'permission:dataScope:list',
  'permission:menu:view', 'permission:menu:list',
  'permission:view'
);

COMMIT;

-- ============================================
-- 验证结果
-- ============================================
SELECT '权限总数：' as info, COUNT(*) as count FROM permissions;

SELECT '角色权限映射：' as info, r.name as role_name, COUNT(p.id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
GROUP BY r.id, r.name
ORDER BY permission_count DESC;
