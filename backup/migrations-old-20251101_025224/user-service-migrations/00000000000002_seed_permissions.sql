-- 添加基础权限
-- 为系统创建必要的 RBAC 权限

-- 1. 用户管理权限
INSERT INTO permissions (id, name, description, resource, action, scope) VALUES
  ('10000000-0000-0000-0000-000000000001', 'user.read', '查看用户', 'user', 'read', 'tenant'),
  ('10000000-0000-0000-0000-000000000002', 'user.create', '创建用户', 'user', 'create', 'tenant'),
  ('10000000-0000-0000-0000-000000000003', 'user.update', '更新用户', 'user', 'update', 'tenant'),
  ('10000000-0000-0000-0000-000000000004', 'user.delete', '删除用户', 'user', 'delete', 'tenant')
ON CONFLICT (name) DO NOTHING;

-- 2. 角色管理权限
INSERT INTO permissions (id, name, description, resource, action, scope) VALUES
  ('10000000-0000-0000-0000-000000000005', 'role.read', '查看角色', 'role', 'read', 'tenant'),
  ('10000000-0000-0000-0000-000000000006', 'role.create', '创建角色', 'role', 'create', 'tenant'),
  ('10000000-0000-0000-0000-000000000007', 'role.update', '更新角色', 'role', 'update', 'tenant'),
  ('10000000-0000-0000-0000-000000000008', 'role.delete', '删除角色', 'role', 'delete', 'tenant')
ON CONFLICT (name) DO NOTHING;

-- 3. 权限管理权限
INSERT INTO permissions (id, name, description, resource, action, scope) VALUES
  ('10000000-0000-0000-0000-000000000009', 'permission.read', '查看权限', 'permission', 'read', 'all'),
  ('10000000-0000-0000-0000-000000000010', 'permission.create', '创建权限', 'permission', 'create', 'all'),
  ('10000000-0000-0000-0000-000000000011', 'permission.update', '更新权限', 'permission', 'update', 'all'),
  ('10000000-0000-0000-0000-000000000012', 'permission.delete', '删除权限', 'permission', 'delete', 'all')
ON CONFLICT (name) DO NOTHING;

-- 4. 设备管理权限
INSERT INTO permissions (id, name, description, resource, action, scope) VALUES
  ('10000000-0000-0000-0000-000000000013', 'device.read', '查看设备', 'device', 'read', 'tenant'),
  ('10000000-0000-0000-0000-000000000014', 'device.create', '创建设备', 'device', 'create', 'tenant'),
  ('10000000-0000-0000-0000-000000000015', 'device.update', '更新设备', 'device', 'update', 'tenant'),
  ('10000000-0000-0000-0000-000000000016', 'device.delete', '删除设备', 'device', 'delete', 'tenant'),
  ('10000000-0000-0000-0000-000000000017', 'device.control', '控制设备', 'device', 'control', 'tenant')
ON CONFLICT (name) DO NOTHING;

-- 5. 应用管理权限
INSERT INTO permissions (id, name, description, resource, action, scope) VALUES
  ('10000000-0000-0000-0000-000000000018', 'app.read', '查看应用', 'app', 'read', 'tenant'),
  ('10000000-0000-0000-0000-000000000019', 'app.create', '创建应用', 'app', 'create', 'tenant'),
  ('10000000-0000-0000-0000-000000000020', 'app.update', '更新应用', 'app', 'update', 'tenant'),
  ('10000000-0000-0000-0000-000000000021', 'app.delete', '删除应用', 'app', 'delete', 'tenant')
ON CONFLICT (name) DO NOTHING;

-- 6. 账单管理权限
INSERT INTO permissions (id, name, description, resource, action, scope) VALUES
  ('10000000-0000-0000-0000-000000000022', 'billing.read', '查看账单', 'billing', 'read', 'tenant'),
  ('10000000-0000-0000-0000-000000000023', 'billing.create', '创建账单', 'billing', 'create', 'tenant'),
  ('10000000-0000-0000-0000-000000000024', 'billing.update', '更新账单', 'billing', 'update', 'tenant'),
  ('10000000-0000-0000-0000-000000000025', 'billing.delete', '删除账单', 'billing', 'delete', 'tenant')
ON CONFLICT (name) DO NOTHING;

-- 7. 系统管理权限
INSERT INTO permissions (id, name, description, resource, action, scope) VALUES
  ('10000000-0000-0000-0000-000000000026', 'system.read', '查看系统信息', 'system', 'read', 'all'),
  ('10000000-0000-0000-0000-000000000027', 'system.manage', '管理系统', 'system', 'manage', 'all')
ON CONFLICT (name) DO NOTHING;

-- 8. 为 admin 角色分配所有权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id
FROM permissions
WHERE id::text LIKE '10000000-0000-0000-0000-0000000000%'
ON CONFLICT DO NOTHING;

-- 9. 为 user 角色分配基础读取权限
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'), -- user.read
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000013'), -- device.read
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000014'), -- device.create
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000017'), -- device.control
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000018'), -- app.read
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000022')  -- billing.read
ON CONFLICT DO NOTHING;

-- 完成
SELECT 'Permissions seeded successfully' as status;
