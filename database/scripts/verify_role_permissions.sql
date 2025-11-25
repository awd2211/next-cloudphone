-- ================================================================================
-- 角色权限验证脚本
-- 用于验证角色配置的完整性和正确性
-- ================================================================================

\echo '================================================'
\echo '角色权限配置验证脚本'
\echo '================================================'
\echo ''

-- ================================================================================
-- 1. 检查所有系统角色的配置完整性
-- ================================================================================

\echo '1. 所有系统角色配置统计'
\echo '------------------------------------------------'

WITH role_stats AS (
  SELECT
    r.id,
    r.name,
    r.description,
    (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id) as permission_count,
    (SELECT COUNT(*) FROM data_scopes ds WHERE ds."roleId" = r.id) as data_scope_count,
    (SELECT COUNT(*) FROM field_permissions fp WHERE fp."roleId" = r.id) as field_permission_count,
    (SELECT COUNT(*) FROM menu_roles mr WHERE mr."roleId" = r.id) as menu_count
  FROM roles r
  WHERE r."isSystem" = true
)
SELECT
  name as "角色名称",
  permission_count as "权限数",
  data_scope_count as "数据范围",
  field_permission_count as "字段权限",
  menu_count as "菜单数",
  (permission_count + data_scope_count + field_permission_count + menu_count) as "总配置数"
FROM role_stats
ORDER BY permission_count DESC, name;

\echo ''

-- ================================================================================
-- 2. 检查新角色（9个）的配置状态
-- ================================================================================

\echo '2. 新增角色详细配置'
\echo '------------------------------------------------'

WITH new_roles AS (
  SELECT id, name FROM roles
  WHERE id IN (
    'b1a2c3d4-e5f6-4789-abcd-111111111111',
    'b1a2c3d4-e5f6-4789-abcd-222222222222',
    'b1a2c3d4-e5f6-4789-abcd-333333333333',
    'b1a2c3d4-e5f6-4789-abcd-444444444444',
    'b1a2c3d4-e5f6-4789-abcd-555555555555',
    'b1a2c3d4-e5f6-4789-abcd-666666666666',
    'b1a2c3d4-e5f6-4789-abcd-777777777777',
    'b1a2c3d4-e5f6-4789-abcd-888888888888',
    'b1a2c3d4-e5f6-4789-abcd-999999999999'
  )
)
SELECT
  r.name as "角色名称",
  COUNT(DISTINCT rp.permission_id) as "权限数",
  COUNT(DISTINCT ds.id) as "数据范围",
  COUNT(DISTINCT fp.id) as "字段权限",
  COUNT(DISTINCT mr."menuId") as "菜单数",
  COUNT(DISTINCT ur.user_id) as "用户数"
FROM new_roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN data_scopes ds ON r.id = ds."roleId"
LEFT JOIN field_permissions fp ON r.id = fp."roleId"
LEFT JOIN menu_roles mr ON r.id = mr."roleId"
LEFT JOIN user_roles ur ON r.id = ur.role_id
GROUP BY r.id, r.name
ORDER BY r.name;

\echo ''

-- ================================================================================
-- 3. 检查缺少配置的角色（应该返回0行）
-- ================================================================================

\echo '3. 检查配置不完整的角色（应为空）'
\echo '------------------------------------------------'

WITH role_completeness AS (
  SELECT
    r.id,
    r.name,
    (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id) as permission_count,
    (SELECT COUNT(*) FROM data_scopes ds WHERE ds."roleId" = r.id) as data_scope_count
  FROM roles r
  WHERE r."isSystem" = true
)
SELECT
  name as "角色名称",
  permission_count as "权限数",
  data_scope_count as "数据范围数",
  CASE
    WHEN permission_count = 0 THEN '❌ 缺少权限配置'
    WHEN data_scope_count = 0 THEN '❌ 缺少数据范围配置'
    ELSE '✅ 配置完整'
  END as "状态"
FROM role_completeness
WHERE permission_count = 0 OR data_scope_count = 0
ORDER BY name;

\echo ''

-- ================================================================================
-- 4. 查看特定角色的详细权限（以 live_chat_agent 为例）
-- ================================================================================

\echo '4. live_chat_agent 角色详细权限'
\echo '------------------------------------------------'

SELECT
  p.resource as "资源",
  p.action as "操作",
  p.description as "描述"
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'live_chat_agent'
ORDER BY p.resource, p.action;

\echo ''

-- ================================================================================
-- 5. 查看角色的数据范围配置
-- ================================================================================

\echo '5. 新角色的数据范围配置'
\echo '------------------------------------------------'

SELECT
  r.name as "角色名称",
  ds."resourceType" as "资源类型",
  ds."scopeType" as "范围类型",
  ds.description as "描述"
FROM roles r
JOIN data_scopes ds ON r.id = ds."roleId"
WHERE r.id IN (
  'b1a2c3d4-e5f6-4789-abcd-111111111111',
  'b1a2c3d4-e5f6-4789-abcd-222222222222',
  'b1a2c3d4-e5f6-4789-abcd-333333333333'
)
ORDER BY r.name, ds."resourceType";

\echo ''

-- ================================================================================
-- 6. 查看角色的字段权限配置
-- ================================================================================

\echo '6. 新角色的字段权限配置'
\echo '------------------------------------------------'

SELECT
  r.name as "角色名称",
  fp."resourceType" as "资源类型",
  fp.operation as "操作",
  fp."hiddenFields" as "隐藏字段",
  fp."readOnlyFields" as "只读字段"
FROM roles r
JOIN field_permissions fp ON r.id = fp."roleId"
WHERE r.id IN (
  'b1a2c3d4-e5f6-4789-abcd-111111111111',
  'b1a2c3d4-e5f6-4789-abcd-222222222222',
  'b1a2c3d4-e5f6-4789-abcd-333333333333'
)
ORDER BY r.name, fp."resourceType", fp.operation;

\echo ''

-- ================================================================================
-- 7. 检查权限重复和冲突
-- ================================================================================

\echo '7. 检查权限配置冲突（应为空）'
\echo '------------------------------------------------'

-- 检查同一角色是否有重复的权限
SELECT
  r.name as "角色名称",
  p.name as "权限名称",
  COUNT(*) as "重复次数"
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
GROUP BY r.id, r.name, p.id, p.name
HAVING COUNT(*) > 1
ORDER BY r.name, p.name;

\echo ''

-- ================================================================================
-- 8. 检查数据范围配置冲突
-- ================================================================================

\echo '8. 检查数据范围配置冲突（应为空）'
\echo '------------------------------------------------'

-- 检查同一角色对同一资源是否有多个数据范围配置
SELECT
  r.name as "角色名称",
  ds."resourceType" as "资源类型",
  COUNT(*) as "配置数量",
  STRING_AGG(ds."scopeType", ', ') as "范围类型"
FROM roles r
JOIN data_scopes ds ON r.id = ds."roleId"
GROUP BY r.id, r.name, ds."resourceType"
HAVING COUNT(*) > 1
ORDER BY r.name, ds."resourceType";

\echo ''

-- ================================================================================
-- 9. 角色分配统计
-- ================================================================================

\echo '9. 角色分配给用户的统计'
\echo '------------------------------------------------'

SELECT
  r.name as "角色名称",
  COUNT(ur.user_id) as "已分配用户数",
  CASE
    WHEN COUNT(ur.user_id) = 0 THEN '未使用'
    WHEN COUNT(ur.user_id) < 5 THEN '少量使用'
    WHEN COUNT(ur.user_id) < 20 THEN '中等使用'
    ELSE '广泛使用'
  END as "使用状态"
FROM roles r
LEFT JOIN user_roles ur ON r.id = ur.role_id
WHERE r."isSystem" = true
GROUP BY r.id, r.name
ORDER BY COUNT(ur.user_id) DESC, r.name;

\echo ''

-- ================================================================================
-- 10. 权限覆盖率分析
-- ================================================================================

\echo '10. 权限资源覆盖率分析'
\echo '------------------------------------------------'

WITH resource_coverage AS (
  SELECT
    r.name as role_name,
    p.resource,
    COUNT(DISTINCT p.action) as action_count
  FROM roles r
  JOIN role_permissions rp ON r.id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE r.id IN (
    'b1a2c3d4-e5f6-4789-abcd-111111111111',
    'b1a2c3d4-e5f6-4789-abcd-222222222222',
    'b1a2c3d4-e5f6-4789-abcd-333333333333',
    'b1a2c3d4-e5f6-4789-abcd-777777777777'
  )
  GROUP BY r.id, r.name, p.resource
)
SELECT
  role_name as "角色名称",
  resource as "资源",
  action_count as "操作数"
FROM resource_coverage
ORDER BY role_name, resource;

\echo ''
\echo '================================================'
\echo '验证完成'
\echo '================================================'
