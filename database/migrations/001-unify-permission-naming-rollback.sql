-- ============================================================================
-- 权限命名规范统一迁移 - 回滚脚本
-- Migration Rollback: Unify Permission Naming Convention
-- Version: 1.0.0
-- Date: 2025-11-07
-- ============================================================================
--
-- 警告: 此脚本将撤销 001-unify-permission-naming.sql 所做的所有更改
--
-- 操作:
--   1. 删除所有新增的点号格式权限
--   2. 删除相关的角色权限绑定
--   3. 取消对旧权限的 deprecated 标记
--   4. 可选: 删除 isDeprecated 字段
--
-- ============================================================================

BEGIN;

RAISE NOTICE '⚠️  开始回滚权限命名规范统一迁移...';

-- ============================================================================
-- 第一部分: 删除新增的 billing.payment.* 权限
-- ============================================================================

RAISE NOTICE '📝 删除 billing.payment.* 权限...';

DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions WHERE name LIKE 'billing.payment.%'
);

DELETE FROM permissions WHERE name LIKE 'billing.payment.%';

-- ============================================================================
-- 第二部分: 删除新增的 billing.invoice.* 权限
-- ============================================================================

RAISE NOTICE '📝 删除 billing.invoice.* 权限（如果是新增的）...';

-- 注意: invoice 权限可能在迁移前已存在，此处只删除确定是新增的
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions
    WHERE name IN (
        'billing.invoice.generate',
        'billing.invoice.void'
    )
);

DELETE FROM permissions
WHERE name IN (
    'billing.invoice.generate',
    'billing.invoice.void'
);

-- ============================================================================
-- 第三部分: 删除新增的点号格式基础权限（如果有对应的冒号格式）
-- ============================================================================

RAISE NOTICE '📝 删除新增的点号格式权限...';

-- Billing 基础权限
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT p1.id FROM permissions p1
    WHERE p1.name IN ('billing.create', 'billing.read', 'billing.update', 'billing.delete')
    AND p1."isDeprecated" = FALSE
    AND EXISTS (
        SELECT 1 FROM permissions p2
        WHERE p2.resource = p1.resource
        AND p2.action = p1.action
        AND p2.name LIKE '%:%'
    )
);

DELETE FROM permissions
WHERE name IN ('billing.create', 'billing.read', 'billing.update', 'billing.delete')
AND "isDeprecated" = FALSE
AND EXISTS (
    SELECT 1 FROM permissions p2
    WHERE p2.resource = permissions.resource
    AND p2.action = permissions.action
    AND p2.name LIKE '%:%'
);

-- Device 权限
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions
    WHERE name IN (
        'device.create',
        'device.read',
        'device.update',
        'device.delete',
        'device.*',
        'device.sms.request',
        'device.sms.cancel',
        'device.snapshot.create',
        'device.snapshot.delete',
        'device.snapshot.restore'
    )
    AND "isDeprecated" = FALSE
);

DELETE FROM permissions
WHERE name IN (
    'device.create',
    'device.read',
    'device.update',
    'device.delete',
    'device.*',
    'device.sms.request',
    'device.sms.cancel',
    'device.snapshot.create',
    'device.snapshot.delete',
    'device.snapshot.restore'
)
AND "isDeprecated" = FALSE;

-- Permission 权限
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions
    WHERE name IN (
        'permission.data-scope.create',
        'permission.data-scope.read',
        'permission.data-scope.update',
        'permission.data-scope.delete',
        'permission.data-scope.list',
        'permission.data-scope.view',
        'permission.menu.list',
        'permission.menu.view'
    )
);

DELETE FROM permissions
WHERE name IN (
    'permission.data-scope.create',
    'permission.data-scope.read',
    'permission.data-scope.update',
    'permission.data-scope.delete',
    'permission.data-scope.list',
    'permission.data-scope.view',
    'permission.menu.list',
    'permission.menu.view'
);

-- Field Permission 权限
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions
    WHERE name IN (
        'field-permission.create',
        'field-permission.read',
        'field-permission.update',
        'field-permission.delete',
        'field-permission.list',
        'field-permission.toggle',
        'field-permission.meta'
    )
);

DELETE FROM permissions
WHERE name IN (
    'field-permission.create',
    'field-permission.read',
    'field-permission.update',
    'field-permission.delete',
    'field-permission.list',
    'field-permission.toggle',
    'field-permission.meta'
);

-- Admin 权限
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions WHERE name IN ('admin.full', 'admin.view')
);

DELETE FROM permissions WHERE name IN ('admin.full', 'admin.view');

-- ============================================================================
-- 第四部分: 取消旧权限的 deprecated 标记
-- ============================================================================

RAISE NOTICE '📝 取消旧权限的 deprecated 标记...';

UPDATE permissions
SET
    "isDeprecated" = FALSE,
    "updatedAt" = NOW()
WHERE
    "isDeprecated" = TRUE;

-- ============================================================================
-- 第五部分: 可选 - 删除 isDeprecated 字段
-- ============================================================================

-- 取消下面的注释以删除 isDeprecated 字段
-- ALTER TABLE permissions DROP COLUMN IF EXISTS "isDeprecated";

-- ============================================================================
-- 第六部分: 验证回滚结果
-- ============================================================================

RAISE NOTICE '📊 回滚统计信息:';
RAISE NOTICE '   - 剩余权限总数: %', (SELECT COUNT(*) FROM permissions);
RAISE NOTICE '   - 点号格式权限数: %', (SELECT COUNT(*) FROM permissions WHERE name LIKE '%.%');
RAISE NOTICE '   - 冒号格式权限数: %', (SELECT COUNT(*) FROM permissions WHERE name LIKE '%:%');
RAISE NOTICE '   - billing.payment.* 权限数: %', (SELECT COUNT(*) FROM permissions WHERE name LIKE 'billing.payment.%');
RAISE NOTICE '   - 废弃权限数: %', (SELECT COUNT(*) FROM permissions WHERE "isDeprecated" = TRUE);

COMMIT;

RAISE NOTICE '✅ 回滚完成！';
RAISE NOTICE '';
RAISE NOTICE '⚠️  注意事项:';
RAISE NOTICE '   1. 如果代码已更新为使用点号格式，需要改回冒号格式';
RAISE NOTICE '   2. 重启所有服务以清除缓存';
RAISE NOTICE '   3. 验证所有功能正常工作';
