-- ================================================================================
-- 导出角色权限配置为JSON格式
-- 用于前端或文档生成
-- ================================================================================

\echo '导出角色权限配置...'
\echo ''

-- ================================================================================
-- 1. 导出所有角色的基本信息和统计
-- ================================================================================

\echo '=== 角色基本信息和统计 ==='

SELECT jsonb_pretty(
  jsonb_build_object(
    'roles',
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'description', r.description,
        'isSystem', r."isSystem",
        'stats', jsonb_build_object(
          'permissions', (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id),
          'dataScopes', (SELECT COUNT(*) FROM data_scopes ds WHERE ds."roleId" = r.id),
          'fieldPermissions', (SELECT COUNT(*) FROM field_permissions fp WHERE fp."roleId" = r.id),
          'menus', (SELECT COUNT(*) FROM menu_roles mr WHERE mr."roleId" = r.id),
          'users', (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.id)
        )
      )
    )
  )
) as json_output
FROM roles r
WHERE r."isSystem" = true
ORDER BY r.name;

\echo ''

-- ================================================================================
-- 2. 导出新角色的完整配置
-- ================================================================================

\echo '=== 新角色完整配置 ==='

WITH new_role_configs AS (
  SELECT
    r.id,
    r.name,
    r.description,
    -- 权限列表
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', p.name,
          'resource', p.resource,
          'action', p.action,
          'description', p.description
        )
      )
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = r.id
    ) as permissions,
    -- 数据范围列表
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'resourceType', ds."resourceType",
          'scopeType', ds."scopeType",
          'description', ds.description
        )
      )
      FROM data_scopes ds
      WHERE ds."roleId" = r.id
    ) as data_scopes,
    -- 字段权限列表
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'resourceType', fp."resourceType",
          'operation', fp.operation,
          'hiddenFields', fp."hiddenFields",
          'readOnlyFields', fp."readOnlyFields",
          'writableFields', fp."writableFields"
        )
      )
      FROM field_permissions fp
      WHERE fp."roleId" = r.id
    ) as field_permissions,
    -- 菜单列表
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'code', m.code,
          'name', m.name,
          'path', m.path,
          'icon', m.icon
        )
      )
      FROM menu_roles mr
      JOIN menus m ON mr."menuId" = m.id
      WHERE mr."roleId" = r.id
    ) as menus
  FROM roles r
  WHERE r.id IN (
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
SELECT jsonb_pretty(
  jsonb_build_object(
    'exportDate', CURRENT_TIMESTAMP,
    'roles', jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'description', description,
        'permissions', COALESCE(permissions, '[]'::jsonb),
        'dataScopes', COALESCE(data_scopes, '[]'::jsonb),
        'fieldPermissions', COALESCE(field_permissions, '[]'::jsonb),
        'menus', COALESCE(menus, '[]'::jsonb)
      )
    )
  )
) as json_output
FROM new_role_configs
ORDER BY name;

\echo ''

-- ================================================================================
-- 3. 导出角色权限对照表（Markdown格式）
-- ================================================================================

\echo '=== 角色权限对照表（Markdown） ==='
\echo ''

\echo '| 角色名称 | 描述 | 权限数 | 数据范围 | 字段权限 | 菜单数 | 用户数 |'
\echo '|---------|------|--------|----------|----------|--------|--------|'

SELECT
  '| ' || r.name ||
  ' | ' || COALESCE(r.description, '') ||
  ' | ' || (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id)::text ||
  ' | ' || (SELECT COUNT(*) FROM data_scopes ds WHERE ds."roleId" = r.id)::text ||
  ' | ' || (SELECT COUNT(*) FROM field_permissions fp WHERE fp."roleId" = r.id)::text ||
  ' | ' || (SELECT COUNT(*) FROM menu_roles mr WHERE mr."roleId" = r.id)::text ||
  ' | ' || (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.id)::text ||
  ' |' as markdown_row
FROM roles r
WHERE r."isSystem" = true
  AND r.id IN (
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
ORDER BY r.name;

\echo ''

-- ================================================================================
-- 4. 导出权限资源分类统计
-- ================================================================================

\echo '=== 权限资源分类统计 ==='

SELECT
  r.name as "角色",
  p.resource as "资源",
  COUNT(*) as "操作数",
  STRING_AGG(p.action, ', ' ORDER BY p.action) as "操作列表"
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
ORDER BY r.name, p.resource;

\echo ''
\echo '导出完成！'
