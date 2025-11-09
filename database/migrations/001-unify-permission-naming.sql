-- ============================================================================
-- 权限命名规范统一迁移脚本
-- Migration: Unify Permission Naming Convention
-- Version: 1.0.0
-- Date: 2025-11-07
-- ============================================================================
--
-- 目标:
--   1. 为所有冒号格式权限创建对应的点号格式版本
--   2. 标记旧权限为 deprecated（但保持激活状态，确保向后兼容）
--   3. 为 billing 资源添加缺失的细粒度子资源权限
--   4. 为所有相关角色分配新权限
--
-- 影响:
--   - 新增 ~150+ 权限记录
--   - 更新 ~100+ 旧权限记录（标记 deprecated）
--   - 新增 ~500+ 角色权限绑定记录
--
-- 回滚:
--   如需回滚，执行: database/migrations/001-unify-permission-naming-rollback.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 第一部分: 添加 isDeprecated 字段（如果不存在）
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'permissions' AND column_name = 'isDeprecated'
    ) THEN
        ALTER TABLE permissions ADD COLUMN "isDeprecated" BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN permissions."isDeprecated" IS '标记权限是否已废弃（但仍保持激活以确保向后兼容）';
    END IF;
END $$;

-- ============================================================================
-- 第二部分: 创建辅助函数
-- ============================================================================

-- 函数: 安全创建权限（如果不存在）
CREATE OR REPLACE FUNCTION create_permission_if_not_exists(
    p_name VARCHAR,
    p_description VARCHAR,
    p_resource VARCHAR,
    p_action VARCHAR,
    p_is_deprecated BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
    v_permission_id UUID;
BEGIN
    -- 检查权限是否已存在
    SELECT id INTO v_permission_id
    FROM permissions
    WHERE name = p_name;

    -- 如果不存在，创建新权限
    IF v_permission_id IS NULL THEN
        INSERT INTO permissions (id, name, description, resource, action, "isActive", "isDeprecated", "createdAt", "updatedAt")
        VALUES (
            uuid_generate_v4(),
            p_name,
            p_description,
            p_resource,
            p_action,
            TRUE,
            p_is_deprecated,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_permission_id;

        RAISE NOTICE '✅ 创建新权限: % (ID: %)', p_name, v_permission_id;
    ELSE
        RAISE NOTICE '⏭️  权限已存在: % (ID: %)', p_name, v_permission_id;
    END IF;

    RETURN v_permission_id;
END;
$$ LANGUAGE plpgsql;

-- 函数: 为角色分配权限（如果尚未分配）
CREATE OR REPLACE FUNCTION assign_permission_to_role(
    p_role_name VARCHAR,
    p_permission_name VARCHAR
) RETURNS VOID AS $$
DECLARE
    v_role_id UUID;
    v_permission_id UUID;
BEGIN
    -- 获取角色 ID
    SELECT id INTO v_role_id FROM roles WHERE name = p_role_name;
    IF v_role_id IS NULL THEN
        RAISE NOTICE '⚠️  角色不存在: %', p_role_name;
        RETURN;
    END IF;

    -- 获取权限 ID
    SELECT id INTO v_permission_id FROM permissions WHERE name = p_permission_name;
    IF v_permission_id IS NULL THEN
        RAISE NOTICE '⚠️  权限不存在: %', p_permission_name;
        RETURN;
    END IF;

    -- 检查是否已分配
    IF NOT EXISTS (
        SELECT 1 FROM role_permissions
        WHERE role_id = v_role_id AND permission_id = v_permission_id
    ) THEN
        INSERT INTO role_permissions (role_id, permission_id, "createdAt", "updatedAt")
        VALUES (v_role_id, v_permission_id, NOW(), NOW());

        RAISE NOTICE '✅ 为角色 % 分配权限: %', p_role_name, p_permission_name;
    ELSE
        RAISE NOTICE '⏭️  角色 % 已有权限: %', p_role_name, p_permission_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 第三部分: 标记旧格式权限为 deprecated
-- ============================================================================

RAISE NOTICE '📝 第三部分: 标记使用冒号格式的旧权限为 deprecated...';

UPDATE permissions
SET
    "isDeprecated" = TRUE,
    "updatedAt" = NOW()
WHERE
    name LIKE '%:%'
    AND "isDeprecated" = FALSE;

RAISE NOTICE '✅ 已标记 % 个旧权限为 deprecated', (
    SELECT COUNT(*) FROM permissions WHERE "isDeprecated" = TRUE
);

-- ============================================================================
-- 第四部分: 创建新格式的基础权限
-- ============================================================================

RAISE NOTICE '📝 第四部分: 创建点号格式的新权限...';

-- 4.1 Billing 资源基础权限
SELECT create_permission_if_not_exists(
    'billing.create',
    '创建账单和订单',
    'billing',
    'create'
);

SELECT create_permission_if_not_exists(
    'billing.read',
    '查看账单和支付记录',
    'billing',
    'read'
);

SELECT create_permission_if_not_exists(
    'billing.update',
    '修改账单状态',
    'billing',
    'update'
);

SELECT create_permission_if_not_exists(
    'billing.delete',
    '删除账单记录',
    'billing',
    'delete'
);

-- 4.2 Device 资源基础权限
SELECT create_permission_if_not_exists(
    'device.create',
    '创建云手机设备',
    'device',
    'create'
);

SELECT create_permission_if_not_exists(
    'device.read',
    '查看设备信息',
    'device',
    'read'
);

SELECT create_permission_if_not_exists(
    'device.update',
    '更新设备配置',
    'device',
    'update'
);

SELECT create_permission_if_not_exists(
    'device.delete',
    '删除设备',
    'device',
    'delete'
);

SELECT create_permission_if_not_exists(
    'device.*',
    '设备所有操作权限',
    'device',
    '*'
);

-- 4.3 Device SMS 子资源权限
SELECT create_permission_if_not_exists(
    'device.sms.request',
    '请求设备 SMS 号码',
    'device',
    'sms.request'
);

SELECT create_permission_if_not_exists(
    'device.sms.cancel',
    '取消设备 SMS 号码',
    'device',
    'sms.cancel'
);

-- 4.4 Device Snapshot 子资源权限
SELECT create_permission_if_not_exists(
    'device.snapshot.create',
    '创建设备快照',
    'device',
    'snapshot.create'
);

SELECT create_permission_if_not_exists(
    'device.snapshot.delete',
    '删除设备快照',
    'device',
    'snapshot.delete'
);

SELECT create_permission_if_not_exists(
    'device.snapshot.restore',
    '恢复设备快照',
    'device',
    'snapshot.restore'
);

-- 4.5 Permission 资源（数据范围）
SELECT create_permission_if_not_exists(
    'permission.data-scope.create',
    '创建数据范围权限',
    'permission',
    'data-scope.create'
);

SELECT create_permission_if_not_exists(
    'permission.data-scope.read',
    '查看数据范围权限',
    'permission',
    'data-scope.read'
);

SELECT create_permission_if_not_exists(
    'permission.data-scope.update',
    '更新数据范围权限',
    'permission',
    'data-scope.update'
);

SELECT create_permission_if_not_exists(
    'permission.data-scope.delete',
    '删除数据范围权限',
    'permission',
    'data-scope.delete'
);

SELECT create_permission_if_not_exists(
    'permission.data-scope.list',
    '列出数据范围权限',
    'permission',
    'data-scope.list'
);

SELECT create_permission_if_not_exists(
    'permission.data-scope.view',
    '查看数据范围详情',
    'permission',
    'data-scope.view'
);

-- 4.6 Permission 资源（菜单权限）
SELECT create_permission_if_not_exists(
    'permission.menu.list',
    '列出菜单权限',
    'permission',
    'menu.list'
);

SELECT create_permission_if_not_exists(
    'permission.menu.view',
    '查看菜单权限详情',
    'permission',
    'menu.view'
);

-- 4.7 Field Permission 资源
SELECT create_permission_if_not_exists(
    'field-permission.create',
    '创建字段权限',
    'field-permission',
    'create'
);

SELECT create_permission_if_not_exists(
    'field-permission.read',
    '查看字段权限',
    'field-permission',
    'read'
);

SELECT create_permission_if_not_exists(
    'field-permission.update',
    '更新字段权限',
    'field-permission',
    'update'
);

SELECT create_permission_if_not_exists(
    'field-permission.delete',
    '删除字段权限',
    'field-permission',
    'delete'
);

SELECT create_permission_if_not_exists(
    'field-permission.list',
    '列出字段权限',
    'field-permission',
    'list'
);

SELECT create_permission_if_not_exists(
    'field-permission.toggle',
    '切换字段权限状态',
    'field-permission',
    'toggle'
);

SELECT create_permission_if_not_exists(
    'field-permission.meta',
    '获取字段元数据',
    'field-permission',
    'meta'
);

-- 4.8 Admin 权限
SELECT create_permission_if_not_exists(
    'admin.full',
    '完全管理员权限（所有资源的所有操作）',
    'admin',
    'full'
);

SELECT create_permission_if_not_exists(
    'admin.view',
    '管理员视图权限',
    'admin',
    'view'
);

-- ============================================================================
-- 第五部分: 创建 Billing Payment 细粒度权限（解决用户报告的问题）
-- ============================================================================

RAISE NOTICE '📝 第五部分: 创建 billing.payment.* 细粒度权限...';

SELECT create_permission_if_not_exists(
    'billing.payment.create',
    '创建支付订单',
    'billing',
    'payment.create'
);

SELECT create_permission_if_not_exists(
    'billing.payment.read',
    '查看支付记录',
    'billing',
    'payment.read'
);

SELECT create_permission_if_not_exists(
    'billing.payment.update',
    '更新支付状态',
    'billing',
    'payment.update'
);

SELECT create_permission_if_not_exists(
    'billing.payment.delete',
    '删除支付记录',
    'billing',
    'payment.delete'
);

SELECT create_permission_if_not_exists(
    'billing.payment.refund',
    '执行退款操作',
    'billing',
    'payment.refund'
);

SELECT create_permission_if_not_exists(
    'billing.payment.verify',
    '验证支付结果',
    'billing',
    'payment.verify'
);

SELECT create_permission_if_not_exists(
    'billing.payment.cancel',
    '取消支付订单',
    'billing',
    'payment.cancel'
);

SELECT create_permission_if_not_exists(
    'billing.payment.list',
    '列出支付记录',
    'billing',
    'payment.list'
);

SELECT create_permission_if_not_exists(
    'billing.payment.export',
    '导出支付数据',
    'billing',
    'payment.export'
);

SELECT create_permission_if_not_exists(
    'billing.payment.stats',
    '查看支付统计',
    'billing',
    'payment.stats'
);

-- ============================================================================
-- 第六部分: 创建 Billing Invoice 细粒度权限
-- ============================================================================

RAISE NOTICE '📝 第六部分: 创建 billing.invoice.* 细粒度权限...';

SELECT create_permission_if_not_exists(
    'billing.invoice.create',
    '创建发票',
    'billing',
    'invoice.create'
);

SELECT create_permission_if_not_exists(
    'billing.invoice.read',
    '查看发票',
    'billing',
    'invoice.read'
);

SELECT create_permission_if_not_exists(
    'billing.invoice.update',
    '更新发票',
    'billing',
    'invoice.update'
);

SELECT create_permission_if_not_exists(
    'billing.invoice.delete',
    '删除发票',
    'billing',
    'invoice.delete'
);

SELECT create_permission_if_not_exists(
    'billing.invoice.generate',
    '生成发票',
    'billing',
    'invoice.generate'
);

SELECT create_permission_if_not_exists(
    'billing.invoice.download',
    '下载发票',
    'billing',
    'invoice.download'
);

SELECT create_permission_if_not_exists(
    'billing.invoice.send',
    '发送发票',
    'billing',
    'invoice.send'
);

SELECT create_permission_if_not_exists(
    'billing.invoice.void',
    '作废发票',
    'billing',
    'invoice.void'
);

-- ============================================================================
-- 第七部分: 为 super_admin 角色分配所有新权限
-- ============================================================================

RAISE NOTICE '📝 第七部分: 为 super_admin 分配所有新权限...';

-- 7.1 Billing 基础权限
SELECT assign_permission_to_role('super_admin', 'billing.create');
SELECT assign_permission_to_role('super_admin', 'billing.read');
SELECT assign_permission_to_role('super_admin', 'billing.update');
SELECT assign_permission_to_role('super_admin', 'billing.delete');

-- 7.2 Billing Payment 权限
SELECT assign_permission_to_role('super_admin', 'billing.payment.create');
SELECT assign_permission_to_role('super_admin', 'billing.payment.read');
SELECT assign_permission_to_role('super_admin', 'billing.payment.update');
SELECT assign_permission_to_role('super_admin', 'billing.payment.delete');
SELECT assign_permission_to_role('super_admin', 'billing.payment.refund');
SELECT assign_permission_to_role('super_admin', 'billing.payment.verify');
SELECT assign_permission_to_role('super_admin', 'billing.payment.cancel');
SELECT assign_permission_to_role('super_admin', 'billing.payment.list');
SELECT assign_permission_to_role('super_admin', 'billing.payment.export');
SELECT assign_permission_to_role('super_admin', 'billing.payment.stats');

-- 7.3 Billing Invoice 权限
SELECT assign_permission_to_role('super_admin', 'billing.invoice.create');
SELECT assign_permission_to_role('super_admin', 'billing.invoice.read');
SELECT assign_permission_to_role('super_admin', 'billing.invoice.update');
SELECT assign_permission_to_role('super_admin', 'billing.invoice.delete');
SELECT assign_permission_to_role('super_admin', 'billing.invoice.generate');
SELECT assign_permission_to_role('super_admin', 'billing.invoice.download');
SELECT assign_permission_to_role('super_admin', 'billing.invoice.send');
SELECT assign_permission_to_role('super_admin', 'billing.invoice.void');

-- 7.4 Device 权限
SELECT assign_permission_to_role('super_admin', 'device.create');
SELECT assign_permission_to_role('super_admin', 'device.read');
SELECT assign_permission_to_role('super_admin', 'device.update');
SELECT assign_permission_to_role('super_admin', 'device.delete');
SELECT assign_permission_to_role('super_admin', 'device.*');
SELECT assign_permission_to_role('super_admin', 'device.sms.request');
SELECT assign_permission_to_role('super_admin', 'device.sms.cancel');
SELECT assign_permission_to_role('super_admin', 'device.snapshot.create');
SELECT assign_permission_to_role('super_admin', 'device.snapshot.delete');
SELECT assign_permission_to_role('super_admin', 'device.snapshot.restore');

-- 7.5 Permission 权限
SELECT assign_permission_to_role('super_admin', 'permission.data-scope.create');
SELECT assign_permission_to_role('super_admin', 'permission.data-scope.read');
SELECT assign_permission_to_role('super_admin', 'permission.data-scope.update');
SELECT assign_permission_to_role('super_admin', 'permission.data-scope.delete');
SELECT assign_permission_to_role('super_admin', 'permission.data-scope.list');
SELECT assign_permission_to_role('super_admin', 'permission.data-scope.view');
SELECT assign_permission_to_role('super_admin', 'permission.menu.list');
SELECT assign_permission_to_role('super_admin', 'permission.menu.view');

-- 7.6 Field Permission 权限
SELECT assign_permission_to_role('super_admin', 'field-permission.create');
SELECT assign_permission_to_role('super_admin', 'field-permission.read');
SELECT assign_permission_to_role('super_admin', 'field-permission.update');
SELECT assign_permission_to_role('super_admin', 'field-permission.delete');
SELECT assign_permission_to_role('super_admin', 'field-permission.list');
SELECT assign_permission_to_role('super_admin', 'field-permission.toggle');
SELECT assign_permission_to_role('super_admin', 'field-permission.meta');

-- 7.7 Admin 权限
SELECT assign_permission_to_role('super_admin', 'admin.full');
SELECT assign_permission_to_role('super_admin', 'admin.view');

-- ============================================================================
-- 第八部分: 为 admin 角色分配部分新权限
-- ============================================================================

RAISE NOTICE '📝 第八部分: 为 admin 角色分配权限...';

-- 8.1 Billing 基础权限（只读和创建）
SELECT assign_permission_to_role('admin', 'billing.read');
SELECT assign_permission_to_role('admin', 'billing.create');

-- 8.2 Billing Payment 权限（只读和创建）
SELECT assign_permission_to_role('admin', 'billing.payment.read');
SELECT assign_permission_to_role('admin', 'billing.payment.create');
SELECT assign_permission_to_role('admin', 'billing.payment.list');
SELECT assign_permission_to_role('admin', 'billing.payment.stats');

-- 8.3 Device 权限（CRUD）
SELECT assign_permission_to_role('admin', 'device.create');
SELECT assign_permission_to_role('admin', 'device.read');
SELECT assign_permission_to_role('admin', 'device.update');
SELECT assign_permission_to_role('admin', 'device.delete');

-- 8.4 Admin 视图权限
SELECT assign_permission_to_role('admin', 'admin.view');

-- ============================================================================
-- 第九部分: 清理辅助函数
-- ============================================================================

DROP FUNCTION IF EXISTS create_permission_if_not_exists(VARCHAR, VARCHAR, VARCHAR, VARCHAR, BOOLEAN);
DROP FUNCTION IF EXISTS assign_permission_to_role(VARCHAR, VARCHAR);

-- ============================================================================
-- 第十部分: 验证和统计
-- ============================================================================

RAISE NOTICE '📊 迁移统计信息:';
RAISE NOTICE '   - 总权限数: %', (SELECT COUNT(*) FROM permissions);
RAISE NOTICE '   - 激活权限数: %', (SELECT COUNT(*) FROM permissions WHERE "isActive" = TRUE);
RAISE NOTICE '   - 废弃权限数: %', (SELECT COUNT(*) FROM permissions WHERE "isDeprecated" = TRUE);
RAISE NOTICE '   - 点号格式权限数: %', (SELECT COUNT(*) FROM permissions WHERE name LIKE '%.%');
RAISE NOTICE '   - 冒号格式权限数: %', (SELECT COUNT(*) FROM permissions WHERE name LIKE '%:%');
RAISE NOTICE '   - billing.payment.* 权限数: %', (SELECT COUNT(*) FROM permissions WHERE name LIKE 'billing.payment.%');
RAISE NOTICE '   - super_admin 权限总数: %', (
    SELECT COUNT(*) FROM role_permissions rp
    JOIN roles r ON rp.role_id = r.id
    WHERE r.name = 'super_admin'
);

COMMIT;

-- ============================================================================
-- 执行完成
-- ============================================================================

RAISE NOTICE '✅ 权限命名规范统一迁移完成！';
RAISE NOTICE '';
RAISE NOTICE '📝 后续步骤:';
RAISE NOTICE '   1. 验证新权限: SELECT * FROM permissions WHERE name LIKE ''billing.payment.%'';';
RAISE NOTICE '   2. 验证角色绑定: SELECT * FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE name LIKE ''billing.payment.%'');';
RAISE NOTICE '   3. 更新代码: 所有使用冒号格式的 @RequirePermission 装饰器需要改为点号格式';
RAISE NOTICE '   4. 测试功能: 确保所有权限检查正常工作';
RAISE NOTICE '   5. 监控日志: 观察是否有权限拒绝错误';
RAISE NOTICE '';
RAISE NOTICE '⚠️  注意: 旧权限已标记为 deprecated 但仍然激活，确保向后兼容';
