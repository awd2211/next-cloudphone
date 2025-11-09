-- ============================================================================
-- 权限命名规范统一迁移脚本 (简化版)
-- Migration: Unify Permission Naming Convention (Simplified)
-- ============================================================================

BEGIN;

-- Step 1: Add isDeprecated column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'permissions' AND column_name = 'isDeprecated'
    ) THEN
        ALTER TABLE permissions ADD COLUMN "isDeprecated" BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Step 2: Mark old colon-format permissions as deprecated
UPDATE permissions
SET "isDeprecated" = TRUE, "updatedAt" = NOW()
WHERE name LIKE '%:%' AND "isDeprecated" = FALSE;

-- Step 3: Create billing.payment.* permissions (解决用户的权限问题)
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'billing.payment.create', '创建支付订单', 'billing', 'payment.create', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'billing.payment.read', '查看支付记录', 'billing', 'payment.read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'billing.payment.update', '更新支付状态', 'billing', 'payment.update', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'billing.payment.delete', '删除支付记录', 'billing', 'payment.delete', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'billing.payment.refund', '执行退款操作', 'billing', 'payment.refund', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'billing.payment.verify', '验证支付结果', 'billing', 'payment.verify', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'billing.payment.cancel', '取消支付订单', 'billing', 'payment.cancel', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'billing.payment.list', '列出支付记录', 'billing', 'payment.list', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'billing.payment.export', '导出支付数据', 'billing', 'payment.export', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'billing.payment.stats', '查看支付统计', 'billing', 'payment.stats', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Step 4: Create billing.invoice.* permissions
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'billing.invoice.generate', '生成发票', 'billing', 'invoice.generate', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'billing.invoice.void', '作废发票', 'billing', 'invoice.void', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Step 5: Create other dot-format permissions
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'billing.create', '创建账单和订单', 'billing', 'create', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'billing.read', '查看账单和支付记录', 'billing', 'read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'billing.update', '修改账单状态', 'billing', 'update', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'billing.delete', '删除账单记录', 'billing', 'delete', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'device.create', '创建云手机设备', 'device', 'create', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'device.read', '查看设备信息', 'device', 'read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'device.update', '更新设备配置', 'device', 'update', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'device.delete', '删除设备', 'device', 'delete', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'device.*', '设备所有操作权限', 'device', '*', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'device.sms.request', '请求设备 SMS 号码', 'device', 'sms.request', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'device.sms.cancel', '取消设备 SMS 号码', 'device', 'sms.cancel', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'device.snapshot.create', '创建设备快照', 'device', 'snapshot.create', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'device.snapshot.delete', '删除设备快照', 'device', 'snapshot.delete', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'device.snapshot.restore', '恢复设备快照', 'device', 'snapshot.restore', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'permission.data-scope.create', '创建数据范围权限', 'permission', 'data-scope.create', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'permission.data-scope.read', '查看数据范围权限', 'permission', 'data-scope.read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'permission.data-scope.update', '更新数据范围权限', 'permission', 'data-scope.update', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'permission.data-scope.delete', '删除数据范围权限', 'permission', 'data-scope.delete', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'permission.data-scope.list', '列出数据范围权限', 'permission', 'data-scope.list', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'permission.data-scope.view', '查看数据范围详情', 'permission', 'data-scope.view', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'permission.menu.list', '列出菜单权限', 'permission', 'menu.list', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'permission.menu.view', '查看菜单权限详情', 'permission', 'menu.view', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'field-permission.create', '创建字段权限', 'field-permission', 'create', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'field-permission.read', '查看字段权限', 'field-permission', 'read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'field-permission.update', '更新字段权限', 'field-permission', 'update', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'field-permission.delete', '删除字段权限', 'field-permission', 'delete', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'field-permission.list', '列出字段权限', 'field-permission', 'list', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'field-permission.toggle', '切换字段权限状态', 'field-permission', 'toggle', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'field-permission.meta', '获取字段元数据', 'field-permission', 'meta', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'admin.full', '完全管理员权限', 'admin', 'full', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'admin.view', '管理员视图权限', 'admin', 'view', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Step 6: Assign billing.payment.* permissions to super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
  AND p.name IN (
    'billing.payment.create',
    'billing.payment.read',
    'billing.payment.update',
    'billing.payment.delete',
    'billing.payment.refund',
    'billing.payment.verify',
    'billing.payment.cancel',
    'billing.payment.list',
    'billing.payment.export',
    'billing.payment.stats'
  )
ON CONFLICT DO NOTHING;

-- Step 7: Assign other new permissions to super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
  AND p.name IN (
    'billing.create', 'billing.read', 'billing.update', 'billing.delete',
    'billing.invoice.generate', 'billing.invoice.void',
    'device.create', 'device.read', 'device.update', 'device.delete', 'device.*',
    'device.sms.request', 'device.sms.cancel',
    'device.snapshot.create', 'device.snapshot.delete', 'device.snapshot.restore',
    'permission.data-scope.create', 'permission.data-scope.read', 'permission.data-scope.update',
    'permission.data-scope.delete', 'permission.data-scope.list', 'permission.data-scope.view',
    'permission.menu.list', 'permission.menu.view',
    'field-permission.create', 'field-permission.read', 'field-permission.update',
    'field-permission.delete', 'field-permission.list', 'field-permission.toggle', 'field-permission.meta',
    'admin.full', 'admin.view'
  )
ON CONFLICT DO NOTHING;

-- Step 8: Assign some permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
  AND p.name IN (
    'billing.read', 'billing.create',
    'billing.payment.read', 'billing.payment.create', 'billing.payment.list', 'billing.payment.stats',
    'device.create', 'device.read', 'device.update', 'device.delete',
    'admin.view'
  )
ON CONFLICT DO NOTHING;

COMMIT;

-- Verification queries
\echo '✅ Migration completed successfully!'
\echo ''
\echo '📊 Statistics:'
SELECT
  '总权限数' as metric,
  COUNT(*)::text as value
FROM permissions
UNION ALL
SELECT
  '点号格式权限',
  COUNT(*)::text
FROM permissions WHERE name LIKE '%.%'
UNION ALL
SELECT
  'billing.payment.* 权限',
  COUNT(*)::text
FROM permissions WHERE name LIKE 'billing.payment.%'
UNION ALL
SELECT
  'super_admin 权限总数',
  COUNT(*)::text
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'super_admin';

\echo ''
\echo '📝 查看新增的 billing.payment.* 权限:'
SELECT name, description FROM permissions WHERE name LIKE 'billing.payment.%' ORDER BY name;
