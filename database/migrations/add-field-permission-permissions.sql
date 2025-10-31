-- ============================================
-- 字段权限管理 - 权限添加
-- 字段权限是对资源字段级别的访问控制
-- 总计: 7 个权限
-- ============================================

-- FIELD-PERMISSION 字段权限管理 (7个权限)
INSERT INTO permissions (name, resource, action, description) VALUES
('field-permission:create', 'field-permission', 'create', '创建字段权限配置'),
('field-permission:read', 'field-permission', 'read', '查看字段权限配置'),
('field-permission:update', 'field-permission', 'update', '更新字段权限配置'),
('field-permission:delete', 'field-permission', 'delete', '删除字段权限配置'),
('field-permission:list', 'field-permission', 'list', '字段权限列表'),
('field-permission:toggle', 'field-permission', 'toggle', '启用/禁用字段权限'),
('field-permission:meta', 'field-permission', 'meta', '查看字段权限元数据');

-- ============================================
-- 为 super_admin 角色分配字段权限管理权限
-- ============================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
AND p.resource = 'field-permission'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- ============================================
-- 验证查询
-- ============================================

-- 查看新增的权限
SELECT name, resource, action, description
FROM permissions
WHERE resource = 'field-permission'
ORDER BY action;

-- 查看总权限数
SELECT COUNT(*) as total_permissions FROM permissions;

-- 查看 super_admin 角色的总权限数
SELECT
    r.name as role_name,
    COUNT(rp.permission_id) as total_permissions
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.name = 'super_admin'
GROUP BY r.name;

-- ============================================
-- 回滚脚本 (如果需要撤销)
-- ============================================

/*
-- 删除 role_permissions 中的关联
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions WHERE resource = 'field-permission'
);

-- 删除新增的权限
DELETE FROM permissions WHERE resource = 'field-permission';
*/
