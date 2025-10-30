-- ============================================
-- 角色和权限种子数据
-- ============================================

-- 插入系统角色
INSERT INTO roles (id, name, description, level, "isSystem", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'super_admin', '超级管理员 - 拥有所有权限，可跨租户操作', 100, true, NOW(), NOW()),
  (gen_random_uuid(), 'admin', '管理员 - 拥有租户内所有权限', 80, true, NOW(), NOW()),
  (gen_random_uuid(), 'user', '普通用户 - 只能访问和管理自己的资源', 50, true, NOW(), NOW()),
  (gen_random_uuid(), 'guest', '访客 - 只读权限，不能进行任何修改操作', 10, true, NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  "updatedAt" = NOW();

-- 插入权限
INSERT INTO permissions (id, resource, action, description, "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  resource,
  action,
  description,
  NOW(),
  NOW()
FROM (
  VALUES
    -- 用户管理权限
    ('user', 'create', '创建用户'),
    ('user', 'read', '查看用户'),
    ('user', 'update', '更新用户'),
    ('user', 'delete', '删除用户'),
    ('user', 'list', '查看用户列表'),

    -- 角色管理权限
    ('role', 'create', '创建角色'),
    ('role', 'read', '查看角色'),
    ('role', 'update', '更新角色'),
    ('role', 'delete', '删除角色'),
    ('role', 'assign', '分配角色'),

    -- 权限管理
    ('permission', 'create', '创建权限'),
    ('permission', 'read', '查看权限'),
    ('permission', 'update', '更新权限'),
    ('permission', 'delete', '删除权限'),

    -- 设备管理权限
    ('device', 'create', '创建设备'),
    ('device', 'read', '查看设备'),
    ('device', 'update', '更新设备'),
    ('device', 'delete', '删除设备'),
    ('device', 'start', '启动设备'),
    ('device', 'stop', '停止设备'),
    ('device', 'restart', '重启设备'),
    ('device', 'reboot', '重启设备系统'),
    ('device', 'shell', '执行Shell命令'),
    ('device', 'screenshot', '截图'),
    ('device', 'push', '推送文件'),
    ('device', 'pull', '拉取文件'),
    ('device', 'install', '安装应用'),
    ('device', 'uninstall', '卸载应用'),
    ('device', 'logcat', '查看日志'),

    -- 应用管理权限
    ('app', 'create', '上传应用'),
    ('app', 'read', '查看应用'),
    ('app', 'update', '更新应用'),
    ('app', 'delete', '删除应用'),
    ('app', 'approve', '审核应用'),
    ('app', 'publish', '发布应用'),

    -- 计费管理权限
    ('billing', 'read', '查看账单'),
    ('billing', 'manage', '管理计费'),
    ('billing', 'recharge', '充值'),

    -- 配额管理权限
    ('quota', 'read', '查看配额'),
    ('quota', 'update', '更新配额'),

    -- 工单管理权限
    ('ticket', 'create', '创建工单'),
    ('ticket', 'read', '查看工单'),
    ('ticket', 'update', '更新工单'),
    ('ticket', 'close', '关闭工单'),

    -- 审计日志权限
    ('audit', 'read', '查看审计日志'),

    -- API密钥管理权限
    ('api-key', 'create', '创建API密钥'),
    ('api-key', 'read', '查看API密钥'),
    ('api-key', 'revoke', '撤销API密钥'),
    ('api-key', 'delete', '删除API密钥'),

    -- 缓存管理权限
    ('cache', 'read', '查看缓存'),
    ('cache', 'clear', '清除缓存'),

    -- 队列管理权限
    ('queue', 'read', '查看队列'),
    ('queue', 'manage', '管理队列'),

    -- 通知管理权限
    ('notification', 'read', '查看通知'),
    ('notification', 'send', '发送通知'),
    ('notification', 'manage', '管理通知')
) AS perms(resource, action, description)
ON CONFLICT (resource, action) DO UPDATE SET
  description = EXCLUDED.description,
  "updatedAt" = NOW();

-- 超级管理员：拥有所有权限
INSERT INTO role_permissions ("roleId", "permissionId", "createdAt")
SELECT
  r.id,
  p.id,
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- 管理员：拥有大部分权限（除了用户删除和权限管理）
INSERT INTO role_permissions ("roleId", "permissionId", "createdAt")
SELECT
  r.id,
  p.id,
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND NOT (
    (p.resource = 'user' AND p.action = 'delete') OR
    (p.resource = 'permission' AND p.action IN ('create', 'update', 'delete')) OR
    (p.resource = 'role' AND p.action = 'delete')
  )
ON CONFLICT DO NOTHING;

-- 普通用户：只能访问自己的资源
INSERT INTO role_permissions ("roleId", "permissionId", "createdAt")
SELECT
  r.id,
  p.id,
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'user'
  AND p.resource IN ('device', 'app', 'billing', 'quota', 'ticket', 'api-key', 'notification')
  AND p.action IN ('create', 'read', 'update', 'start', 'stop', 'restart', 'screenshot', 'install', 'uninstall', 'recharge')
ON CONFLICT DO NOTHING;

-- 访客：只读权限
INSERT INTO role_permissions ("roleId", "permissionId", "createdAt")
SELECT
  r.id,
  p.id,
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'guest'
  AND p.action = 'read'
  AND p.resource IN ('device', 'app', 'quota', 'notification')
ON CONFLICT DO NOTHING;

-- 打印统计信息
DO $$
DECLARE
  role_count INTEGER;
  permission_count INTEGER;
  mapping_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count FROM roles WHERE "isSystem" = true;
  SELECT COUNT(*) INTO permission_count FROM permissions;
  SELECT COUNT(*) INTO mapping_count FROM role_permissions;

  RAISE NOTICE '========================================';
  RAISE NOTICE '角色和权限初始化完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '系统角色数量: %', role_count;
  RAISE NOTICE '权限数量: %', permission_count;
  RAISE NOTICE '角色-权限映射数量: %', mapping_count;
  RAISE NOTICE '========================================';
END $$;
