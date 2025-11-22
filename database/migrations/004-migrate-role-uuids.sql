-- 迁移脚本：将系统角色的假 UUID 转换为真实 UUID
-- 注意：此脚本会更新 roles 表和所有关联表

BEGIN;

-- 创建临时映射表
CREATE TEMP TABLE role_uuid_mapping (
    old_id UUID,
    new_id UUID,
    name VARCHAR(255)
);

-- 生成新的真实 UUID 并插入映射表
INSERT INTO role_uuid_mapping (old_id, new_id, name) VALUES
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'super_admin'),
    ('00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'admin'),
    ('00000000-0000-0000-0000-000000000002', gen_random_uuid(), 'user'),
    ('00000000-0000-0000-0000-000000000003', gen_random_uuid(), 'tenant_admin'),
    ('00000000-0000-0000-0000-000000000004', gen_random_uuid(), 'department_admin'),
    ('00000000-0000-0000-0000-000000000005', gen_random_uuid(), 'devops'),
    ('00000000-0000-0000-0000-000000000006', gen_random_uuid(), 'customer_service'),
    ('00000000-0000-0000-0000-000000000007', gen_random_uuid(), 'auditor'),
    ('00000000-0000-0000-0000-000000000008', gen_random_uuid(), 'finance'),
    ('00000000-0000-0000-0000-000000000009', gen_random_uuid(), 'accountant'),
    ('00000000-0000-0000-0000-000000000010', gen_random_uuid(), 'vip_user'),
    ('00000000-0000-0000-0000-000000000011', gen_random_uuid(), 'enterprise_user'),
    ('00000000-0000-0000-0000-000000000012', gen_random_uuid(), 'developer'),
    ('00000000-0000-0000-0000-000000000013', gen_random_uuid(), 'test_user'),
    ('00000000-0000-0000-0000-000000000014', gen_random_uuid(), 'readonly_user'),
    ('00000000-0000-0000-0000-000000000015', gen_random_uuid(), 'guest'),
    ('00000000-0000-0000-0000-000000000016', gen_random_uuid(), 'data_analyst');

-- 显示映射关系
SELECT 'UUID Mapping:' as info;
SELECT old_id, new_id, name FROM role_uuid_mapping ORDER BY name;

-- 1. 临时禁用所有外键约束
ALTER TABLE field_permissions DROP CONSTRAINT IF EXISTS fk_field_permissions_role;
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_id_fkey;
ALTER TABLE data_scopes DROP CONSTRAINT IF EXISTS fk_data_scopes_role;
ALTER TABLE menu_roles DROP CONSTRAINT IF EXISTS "menu_roles_roleId_fkey";
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;

-- 2. 更新 roles 表的 id（主表）
UPDATE roles r
SET id = m.new_id
FROM role_uuid_mapping m
WHERE r.id = m.old_id;

-- 3. 更新所有关联表
-- 更新 role_permissions
UPDATE role_permissions rp
SET role_id = m.new_id
FROM role_uuid_mapping m
WHERE rp.role_id = m.old_id;

-- 更新 field_permissions (使用 roleId 列名)
UPDATE field_permissions fp
SET "roleId" = m.new_id
FROM role_uuid_mapping m
WHERE fp."roleId" = m.old_id;

-- 更新 data_scopes (使用 roleId 列名)
UPDATE data_scopes ds
SET "roleId" = m.new_id
FROM role_uuid_mapping m
WHERE ds."roleId" = m.old_id;

-- 更新 menu_roles
UPDATE menu_roles mr
SET "roleId" = m.new_id
FROM role_uuid_mapping m
WHERE mr."roleId" = m.old_id;

-- 更新 user_roles
UPDATE user_roles ur
SET role_id = m.new_id
FROM role_uuid_mapping m
WHERE ur.role_id = m.old_id;

-- 4. 重新添加所有外键约束
ALTER TABLE field_permissions
ADD CONSTRAINT fk_field_permissions_role
FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE role_permissions
ADD CONSTRAINT role_permissions_role_id_fkey
FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE data_scopes
ADD CONSTRAINT fk_data_scopes_role
FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE menu_roles
ADD CONSTRAINT "menu_roles_roleId_fkey"
FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE user_roles
ADD CONSTRAINT user_roles_role_id_fkey
FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

-- 验证更新结果
SELECT 'Updated roles:' as info;
SELECT id, name, "isSystem" FROM roles WHERE "isSystem" = true ORDER BY name;

-- 验证 role_permissions 关联
SELECT 'Role permission counts after migration:' as info;
SELECT r.name, COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r."isSystem" = true
GROUP BY r.name
ORDER BY r.name;

COMMIT;
