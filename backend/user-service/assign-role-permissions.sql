-- ================================================================================
-- 为新角色分配权限
-- ================================================================================

-- 先清理可能存在的旧权限分配（新角色）
DELETE FROM role_permissions
WHERE role_id NOT IN (
  '00000000-0000-0000-0000-000000000001',  -- admin
  '00000000-0000-0000-0000-000000000002'   -- user
);

-- ================================================================================
-- 1. 租户管理员 (tenant_admin) - 管理本租户资源
-- ================================================================================

-- 租户管理员权限：用户管理、设备管理、应用管理、查看账单
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  '00000000-0000-0000-0000-000000000003',  -- tenant_admin
  id
FROM permissions
WHERE name IN (
  -- 用户管理（租户内）
  'user:read', 'user:create', 'user:update', 'user:list',
  -- 角色管理（租户内，不能创建/删除角色）
  'role:read', 'role:list',
  -- 设备管理（租户内）
  'device:read', 'device:create', 'device:update', 'device:delete', 'device:control',
  'device:list', 'device:template:list', 'device:group:list',
  -- 应用管理（租户内）
  'app:read', 'app:create', 'app:update', 'app:delete',
  'app:list', 'app:market:view',
  -- 账单查看（租户内）
  'billing:read', 'billing:overview', 'billing:plan:list',
  'billing:transaction:list', 'billing:invoice:list',
  -- 通知查看
  'notification:list',
  -- 仪表板
  'system:dashboard:view'
);

-- ================================================================================
-- 2. 部门管理员 (department_admin) - 管理本部门资源
-- ================================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
  '00000000-0000-0000-0000-000000000004',  -- department_admin
  id
FROM permissions
WHERE name IN (
  -- 用户管理（部门内）
  'user:read', 'user:list',
  -- 设备管理（部门内）
  'device:read', 'device:create', 'device:update', 'device:control',
  'device:list', 'device:template:list',
  -- 应用查看
  'app:read', 'app:list', 'app:market:view',
  -- 仪表板
  'system:dashboard:view'
);

-- ================================================================================
-- 3. 运维工程师 (devops) - 系统运维和监控
-- ================================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
  '00000000-0000-0000-0000-000000000005',  -- devops
  id
FROM permissions
WHERE name IN (
  -- 设备管理（所有设备）
  'device:read', 'device:update', 'device:control', 'device:delete',
  'device:list', 'device:template:list', 'device:group:list',
  -- 系统管理
  'system:read', 'system:view', 'system:logs:view', 'system:audit:view',
  'system:dashboard:view',
  -- 应用查看
  'app:read', 'app:list',
  -- 用户查看（不含敏感信息）
  'user:read', 'user:list',
  -- 通知管理
  'notification:list', 'notification:template:manage'
);

-- ================================================================================
-- 4. 客服专员 (customer_service) - 客户支持
-- ================================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
  '00000000-0000-0000-0000-000000000006',  -- customer_service
  id
FROM permissions
WHERE name IN (
  -- 用户查看（租户内）
  'user:read', 'user:list',
  -- 设备查看（租户内）
  'device:read', 'device:list',
  -- 应用查看
  'app:read', 'app:list', 'app:market:view',
  -- 账单查看（租户内）
  'billing:read', 'billing:overview', 'billing:transaction:list',
  -- 通知查看
  'notification:list'
);

-- ================================================================================
-- 5. 审核专员 (auditor) - 应用和内容审核
-- ================================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
  '00000000-0000-0000-0000-000000000007',  -- auditor
  id
FROM permissions
WHERE name IN (
  -- 应用管理（审核）
  'app:read', 'app:update', 'app:list', 'app:market:view',
  -- 用户查看
  'user:read', 'user:list',
  -- 审计日志
  'system:audit:view', 'system:logs:view'
);

-- ================================================================================
-- 6. 财务专员 (finance) - 财务管理
-- ================================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
  '00000000-0000-0000-0000-000000000008',  -- finance
  id
FROM permissions
WHERE name IN (
  -- 账单管理（所有）
  'billing:read', 'billing:create', 'billing:update', 'billing:delete',
  'billing:overview', 'billing:plan:list', 'billing:transaction:list', 'billing:invoice:list',
  -- 用户查看（用于对账）
  'user:read', 'user:list',
  -- 审计日志
  'system:audit:view'
);

-- ================================================================================
-- 7. 会计 (accountant) - 财务数据查看
-- ================================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
  '00000000-0000-0000-0000-000000000009',  -- accountant
  id
FROM permissions
WHERE name IN (
  -- 账单查看（所有，只读）
  'billing:read', 'billing:overview', 'billing:plan:list',
  'billing:transaction:list', 'billing:invoice:list',
  -- 用户查看
  'user:read', 'user:list'
);

-- ================================================================================
-- 8. VIP用户 (vip_user) - 高级用户权限
-- ================================================================================

-- VIP用户权限 = 普通用户权限 + 高级功能
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  '00000000-0000-0000-0000-000000000010',  -- vip_user
  id
FROM permissions
WHERE name IN (
  -- 设备管理（个人）
  'device:read', 'device:create', 'device:update', 'device:delete', 'device:control',
  'device:list', 'device:template:list', 'device:group:list',
  -- 应用管理（个人）
  'app:read', 'app:list', 'app:market:view',
  -- 账单查看（个人）
  'billing:read', 'billing:overview', 'billing:plan:list',
  'billing:transaction:list', 'billing:invoice:list',
  -- 通知
  'notification:list',
  -- 仪表板
  'system:dashboard:view',
  -- 高级功能
  'analytics:view'
);

-- ================================================================================
-- 9. 企业用户 (enterprise_user) - 企业员工权限
-- ================================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
  '00000000-0000-0000-0000-000000000011',  -- enterprise_user
  id
FROM permissions
WHERE name IN (
  -- 设备管理（个人+租户共享）
  'device:read', 'device:create', 'device:update', 'device:delete', 'device:control',
  'device:list', 'device:template:list', 'device:group:list',
  -- 应用管理（租户共享）
  'app:read', 'app:list', 'app:market:view',
  -- 账单查看（个人）
  'billing:read', 'billing:overview', 'billing:plan:list',
  -- 通知
  'notification:list',
  -- 仪表板
  'system:dashboard:view'
);

-- ================================================================================
-- 10. 开发者 (developer) - 应用开发者权限
-- ================================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
  '00000000-0000-0000-0000-000000000012',  -- developer
  id
FROM permissions
WHERE name IN (
  -- 设备管理（个人）
  'device:read', 'device:create', 'device:update', 'device:delete', 'device:control',
  'device:list', 'device:template:list',
  -- 应用管理（创建、上传、管理）
  'app:read', 'app:create', 'app:update', 'app:delete',
  'app:list', 'app:market:view',
  -- 账单查看
  'billing:read', 'billing:overview', 'billing:transaction:list',
  -- 通知
  'notification:list',
  -- 仪表板
  'system:dashboard:view',
  -- 高级功能
  'analytics:view'
);

-- ================================================================================
-- 11. 测试用户 (test_user) - 测试环境权限
-- ================================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
  '00000000-0000-0000-0000-000000000013',  -- test_user
  id
FROM permissions
WHERE name IN (
  -- 设备管理（测试设备）
  'device:read', 'device:create', 'device:update', 'device:delete', 'device:control',
  'device:list',
  -- 应用查看
  'app:read', 'app:list'
);

-- ================================================================================
-- 12. 只读用户 (readonly_user) - 只读权限
-- ================================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
  '00000000-0000-0000-0000-000000000014',  -- readonly_user
  id
FROM permissions
WHERE name IN (
  -- 所有查看权限，无修改权限
  'user:read', 'user:list',
  'device:read', 'device:list', 'device:template:list', 'device:group:list',
  'app:read', 'app:list', 'app:market:view',
  'billing:read', 'billing:overview', 'billing:plan:list',
  'billing:transaction:list', 'billing:invoice:list',
  'role:read', 'role:list',
  'notification:list',
  'system:dashboard:view', 'system:view'
);

-- ================================================================================
-- 13. 访客 (guest) - 最小权限
-- ================================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
  '00000000-0000-0000-0000-000000000015',  -- guest
  id
FROM permissions
WHERE name IN (
  -- 仅公开查看权限
  'app:list', 'app:market:view',
  'billing:plan:list'
);

-- ================================================================================
-- 14. 数据分析师 (data_analyst) - 数据分析权限
-- ================================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
  '00000000-0000-0000-0000-000000000016',  -- data_analyst
  id
FROM permissions
WHERE name IN (
  -- 所有查看权限（用于数据分析）
  'user:read', 'user:list',
  'device:read', 'device:list', 'device:template:list', 'device:group:list',
  'app:read', 'app:list', 'app:market:view',
  'billing:read', 'billing:overview', 'billing:plan:list',
  'billing:transaction:list', 'billing:invoice:list',
  'notification:list',
  -- 分析和报表
  'analytics:view',
  'system:dashboard:view', 'system:view',
  -- 审计日志
  'system:audit:view', 'system:logs:view'
);

-- ================================================================================
-- 统计信息
-- ================================================================================

-- 统计各角色的权限数量
SELECT
  r.name as "角色名",
  COUNT(rp.permission_id) as "权限数量",
  r.description as "描述"
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name, r.description
ORDER BY COUNT(rp.permission_id) DESC;

-- 显示部分角色的详细权限
SELECT
  r.name as "角色",
  string_agg(p.name, ', ' ORDER BY p.name) as "权限列表"
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.name IN ('tenant_admin', 'devops', 'customer_service', 'vip_user', 'developer')
GROUP BY r.id, r.name
ORDER BY r.name;
