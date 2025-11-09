-- ============================================
-- 修复 super_admin 权限
-- 确保 super_admin 拥有所有权限
-- Date: 2025-11-06
-- ============================================

BEGIN;

-- ============================================
-- 为 super_admin 添加所有缺失的权限
-- ============================================

-- 方法1: 直接插入所有权限（最简单）
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000000', p.id
FROM permissions p
WHERE p.id NOT IN (
  SELECT permission_id
  FROM role_permissions
  WHERE role_id = '00000000-0000-0000-0000-000000000000'
)
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================
-- 验证结果
-- ============================================

-- 统计权限数量
SELECT
  '权限统计' as 类型,
  COUNT(*) FILTER (WHERE name = '总权限数') as 总权限数,
  COUNT(*) FILTER (WHERE name = 'super_admin') as super_admin权限数,
  COUNT(*) FILTER (WHERE name = 'admin') as admin权限数
FROM (
  SELECT '总权限数' as name, COUNT(*) as count FROM permissions
  UNION ALL
  SELECT 'super_admin' as name, COUNT(*) FROM role_permissions WHERE role_id = '00000000-0000-0000-0000-000000000000'
  UNION ALL
  SELECT 'admin' as name, COUNT(*) FROM role_permissions WHERE role_id = '00000000-0000-0000-0000-000000000001'
) subquery;

-- 详细统计
SELECT
  '角色权限对比' as info,
  r.name as 角色,
  COUNT(DISTINCT rp.permission_id) as 权限数量,
  ROUND(COUNT(DISTINCT rp.permission_id) * 100.0 / (SELECT COUNT(*) FROM permissions), 2) as 覆盖率
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.name IN ('super_admin', 'admin', 'tenant_admin', 'vip_user', 'user')
GROUP BY r.name
ORDER BY COUNT(DISTINCT rp.permission_id) DESC;

-- 检查是否还有缺失
SELECT
  '缺失权限检查' as info,
  COUNT(*) as 缺失数量
FROM permissions p
WHERE p.id NOT IN (
  SELECT permission_id
  FROM role_permissions
  WHERE role_id = '00000000-0000-0000-0000-000000000000'
);
