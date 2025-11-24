-- ================================================================================
-- 为新增的9个系统角色配置权限、数据范围、字段权限和菜单
-- Date: 2025-11-24
-- Author: Claude Code
-- ================================================================================
--
-- 新增角色列表：
-- 1. live_chat_agent      (b1a2c3d4-e5f6-4789-abcd-111111111111) - 客服坐席
-- 2. live_chat_supervisor (b1a2c3d4-e5f6-4789-abcd-222222222222) - 客服主管
-- 3. proxy_manager        (b1a2c3d4-e5f6-4789-abcd-333333333333) - 代理管理员
-- 4. device_operator      (b1a2c3d4-e5f6-4789-abcd-444444444444) - 设备操作员
-- 5. scheduler_admin      (b1a2c3d4-e5f6-4789-abcd-555555555555) - 调度管理员
-- 6. content_editor       (b1a2c3d4-e5f6-4789-abcd-666666666666) - 内容编辑
-- 7. app_manager          (b1a2c3d4-e5f6-4789-abcd-777777777777) - 应用管理员
-- 8. partner              (b1a2c3d4-e5f6-4789-abcd-888888888888) - 合作伙伴
-- 9. api_user             (b1a2c3d4-e5f6-4789-abcd-999999999999) - API用户
-- ================================================================================

BEGIN;

-- ================================================================================
-- PART 1: 为新角色分配权限 (role_permissions)
-- ================================================================================

-- ============================================
-- 1. live_chat_agent (客服坐席)
-- ============================================
-- 权限范围：在线客服、工单处理、查看用户和设备基本信息
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  'b1a2c3d4-e5f6-4789-abcd-111111111111',
  id
FROM permissions
WHERE name IN (
  -- 用户查看（基本信息）
  'user.read', 'user:read',
  -- 设备查看和基本控制
  'device.read', 'device:read', 'device.control',
  -- 应用查看
  'app.read',
  -- 工单管理（完整权限）
  'ticket.create', 'ticket:create', 'ticket.read', 'ticket:read',
  'ticket.update', 'ticket:update', 'ticket.list',
  -- LiveChat 权限
  'livechat:session:read', 'livechat:session:create', 'livechat:session:update',
  'livechat:message:read', 'livechat:message:create',
  'livechat:queue:read',
  -- 通知权限
  'notification.read', 'notification.create',
  -- 账单查看（只读）
  'billing:read', 'billing.read',
  -- 审计日志查看
  'activity:read', 'activity:list',
  -- 代理审计查看
  'proxy:audit:read'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. live_chat_supervisor (客服主管)
-- ============================================
-- 权限范围：客服团队管理、质检评分、工单审批
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  'b1a2c3d4-e5f6-4789-abcd-222222222222',
  id
FROM permissions
WHERE name IN (
  -- 继承客服坐席的所有权限
  'user.read', 'user:read', 'user:list',
  'device.read', 'device:read', 'device.control', 'device:list',
  'app.read', 'app:list',
  'ticket.create', 'ticket:create', 'ticket.read', 'ticket:read',
  'ticket.update', 'ticket:update', 'ticket.list', 'ticket:delete',
  -- LiveChat 完整管理权限
  'livechat:session:read', 'livechat:session:create', 'livechat:session:update', 'livechat:session:delete',
  'livechat:session:list', 'livechat:session:transfer', 'livechat:session:close',
  'livechat:message:read', 'livechat:message:create', 'livechat:message:delete',
  'livechat:queue:read', 'livechat:queue:manage',
  'livechat:agent:read', 'livechat:agent:update', 'livechat:agent:list',
  'livechat:rating:read', 'livechat:rating:create',
  'livechat:stats:read',
  -- 通知管理
  'notification.read', 'notification.create', 'notification.broadcast',
  -- 账单查看
  'billing:read', 'billing.read',
  -- 审计日志
  'activity:read', 'activity:list',
  'audit:read',
  -- 数据分析
  'stats:view', 'report:view'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. proxy_manager (代理管理员)
-- ============================================
-- 权限范围：代理服务器资源管理、配置、监控
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  'b1a2c3d4-e5f6-4789-abcd-333333333333',
  id
FROM permissions
WHERE name IN (
  -- 代理管理（完整权限）
  'proxy:read', 'proxy:create', 'proxy:update', 'proxy:delete',
  'proxy:list', 'proxy:test', 'proxy:stats',
  -- 代理提供商管理
  'proxy:provider:read', 'proxy:provider:create', 'proxy:provider:update',
  'proxy:provider:delete', 'proxy:provider:list',
  -- 代理会话管理
  'proxy:session:read', 'proxy:session:list', 'proxy:session:terminate',
  -- 代理审计
  'proxy:audit:read', 'proxy:audit:list',
  -- 代理成本监控
  'proxy:cost:read', 'proxy:cost:stats',
  -- 设备查看（需要了解代理使用情况）
  'device.read', 'device:read', 'device:list',
  -- 用户查看（基本信息）
  'user.read', 'user:read',
  -- 通知
  'notification.read', 'notification.create',
  -- 审计
  'activity:read', 'activity:list',
  -- 系统监控
  'system:dashboard:view', 'system:logs:view'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. device_operator (设备操作员)
-- ============================================
-- 权限范围：设备日常运维操作（启动、停止、重启、监控）
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  'b1a2c3d4-e5f6-4789-abcd-444444444444',
  id
FROM permissions
WHERE name IN (
  -- 设备基本操作
  'device.read', 'device:read', 'device:list',
  'device.control', 'device:control',
  'device.update',  -- 仅限状态更新，无配置修改
  -- 设备应用操作
  'device:app-operate',
  -- 设备快照（只能创建和恢复，不能删除）
  'device:snapshot-create', 'device:snapshot-restore',
  -- 设备组查看
  'device:group:list', 'device:group:read',
  -- 应用查看
  'app.read', 'app:list',
  -- 用户查看（基本信息）
  'user.read', 'user:read',
  -- 通知
  'notification.read',
  -- 审计日志
  'activity:read', 'activity:list',
  -- 系统监控（只读）
  'system:dashboard:view', 'system:logs:view'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. scheduler_admin (调度管理员)
-- ============================================
-- 权限范围：集群调度、资源分配、容量规划
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  'b1a2c3d4-e5f6-4789-abcd-555555555555',
  id
FROM permissions
WHERE name IN (
  -- 设备完整管理（除删除外）
  'device.read', 'device:read', 'device.create', 'device.update',
  'device.control', 'device:list',
  'device:group:read', 'device:group:create', 'device:group:update', 'device:group:list',
  'device:template:read', 'device:template:list',
  -- 调度相关
  'scheduler:read', 'scheduler:create', 'scheduler:update', 'scheduler:delete',
  'scheduler:job:read', 'scheduler:job:list', 'scheduler:job:trigger',
  -- 资源分配
  'resource:read', 'resource:allocate', 'resource:stats',
  -- 用户和租户查看
  'user.read', 'user:read', 'user:list',
  'tenant:read', 'tenant:list',
  -- 应用查看
  'app.read', 'app:list',
  -- 账单查看（了解资源成本）
  'billing:read', 'billing.read',
  -- 通知管理
  'notification.read', 'notification.create',
  -- 系统管理
  'system:read', 'system:dashboard:view', 'system:logs:view',
  'system:audit:view',
  -- 审计
  'activity:read', 'activity:list', 'audit:read'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. content_editor (内容编辑)
-- ============================================
-- 权限范围：CMS内容管理、营销活动、通知模板
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  'b1a2c3d4-e5f6-4789-abcd-666666666666',
  id
FROM permissions
WHERE name IN (
  -- CMS内容管理
  'cms:read', 'cms:create', 'cms:update', 'cms:delete',
  'cms:list', 'cms:publish',
  -- 营销活动
  'campaign:read', 'campaign:create', 'campaign:update', 'campaign:list',
  -- 通知模板管理
  'notification.template-read', 'notification.template-create',
  'notification.template-update', 'notification.template-delete',
  'notification.template-list',
  -- 通知发送
  'notification.create', 'notification.broadcast',
  -- 用户查看（了解目标受众）
  'user.read', 'user:read', 'user:list',
  -- 审计
  'activity:read', 'activity:list',
  -- 系统仪表板
  'system:dashboard:view'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. app_manager (应用管理员)
-- ============================================
-- 权限范围：应用商店管理、APK上传、审核
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  'b1a2c3d4-e5f6-4789-abcd-777777777777',
  id
FROM permissions
WHERE name IN (
  -- 应用完整管理
  'app.create', 'app.read', 'app.update', 'app.delete',
  'app:list', 'app:upload', 'app:download',
  'app.approve', 'app:market:manage',
  -- 应用分类管理
  'app:category:read', 'app:category:create', 'app:category:update',
  'app:category:delete', 'app:category:list',
  -- 应用版本管理
  'app:version:read', 'app:version:create', 'app:version:list',
  -- 设备应用操作（测试用）
  'device:app-operate', 'device.read', 'device:read',
  -- 用户查看（了解开发者）
  'user.read', 'user:read', 'developer:read',
  -- 通知
  'notification.read', 'notification.create',
  -- 审计
  'activity:read', 'activity:list',
  'audit:read', 'audit:list',
  -- 系统仪表板
  'system:dashboard:view'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. partner (合作伙伴)
-- ============================================
-- 权限范围：渠道分销、资源查看、账单查询
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  'b1a2c3d4-e5f6-4789-abcd-888888888888',
  id
FROM permissions
WHERE name IN (
  -- 设备查看（租户范围）
  'device.read', 'device:read', 'device:list',
  -- 用户查看（租户范围）
  'user.read', 'user:read', 'user:list',
  -- 应用查看
  'app.read', 'app:list', 'app:market:view',
  -- 账单和订单（租户范围）
  'billing:read', 'billing.read', 'billing:overview',
  'billing:plan:list', 'billing:transaction:list',
  'order:read', 'order:list',
  -- 合作伙伴特定权限
  'partner:commission:read', 'partner:stats:view',
  'partner:customer:read', 'partner:customer:list',
  -- 通知
  'notification.read',
  -- 系统仪表板
  'system:dashboard:view'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. api_user (API用户)
-- ============================================
-- 权限范围：API集成、自动化操作
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  'b1a2c3d4-e5f6-4789-abcd-999999999999',
  id
FROM permissions
WHERE name IN (
  -- API Key 管理
  'api-key:read', 'api-key:create', 'api-key:revoke',
  -- 设备基本操作
  'device.read', 'device:read', 'device.create', 'device.control',
  'device:list',
  -- 应用操作
  'app.read', 'app:list',
  'device:app-operate',
  -- 用户基本信息
  'user.read', 'user:read',
  -- 通知
  'notification.read', 'notification.create',
  -- 账单查询
  'billing:read', 'billing.read',
  -- Webhook 管理
  'webhook:read', 'webhook:create', 'webhook:update', 'webhook:delete',
  -- 审计日志
  'activity:read', 'activity:list'
)
ON CONFLICT DO NOTHING;

-- ================================================================================
-- PART 2: 为新角色配置数据范围 (data_scopes)
-- ================================================================================

-- 定义标准的7种资源类型的数据范围
-- resource types: user, device, app, billing, order, payment, audit_log

-- ============================================
-- 1. live_chat_agent (客服坐席) - 租户范围
-- ============================================
INSERT INTO data_scopes ("roleId", "resourceType", "scopeType", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-111111111111', 'user', 'tenant', '客服坐席可查看本租户用户', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-111111111111', 'device', 'tenant', '客服坐席可查看本租户设备', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-111111111111', 'app', 'tenant', '客服坐席可查看本租户应用', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-111111111111', 'billing', 'tenant', '客服坐席可查看本租户账单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-111111111111', 'order', 'tenant', '客服坐席可查看本租户订单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-111111111111', 'payment', 'tenant', '客服坐席可查看本租户支付', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-111111111111', 'audit_log', 'tenant', '客服坐席可查看本租户审计日志', true, 100)
ON CONFLICT ("roleId", "resourceType") DO NOTHING;

-- ============================================
-- 2. live_chat_supervisor (客服主管) - 租户范围
-- ============================================
INSERT INTO data_scopes ("roleId", "resourceType", "scopeType", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-222222222222', 'user', 'tenant', '客服主管可查看本租户用户', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-222222222222', 'device', 'tenant', '客服主管可查看本租户设备', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-222222222222', 'app', 'tenant', '客服主管可查看本租户应用', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-222222222222', 'billing', 'tenant', '客服主管可查看本租户账单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-222222222222', 'order', 'tenant', '客服主管可查看本租户订单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-222222222222', 'payment', 'tenant', '客服主管可查看本租户支付', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-222222222222', 'audit_log', 'tenant', '客服主管可查看本租户审计日志', true, 100)
ON CONFLICT ("roleId", "resourceType") DO NOTHING;

-- ============================================
-- 3. proxy_manager (代理管理员) - 全部数据
-- ============================================
INSERT INTO data_scopes ("roleId", "resourceType", "scopeType", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-333333333333', 'user', 'all', '代理管理员可查看所有用户', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-333333333333', 'device', 'all', '代理管理员可查看所有设备', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-333333333333', 'app', 'all', '代理管理员可查看所有应用', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-333333333333', 'billing', 'all', '代理管理员可查看所有账单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-333333333333', 'order', 'all', '代理管理员可查看所有订单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-333333333333', 'payment', 'all', '代理管理员可查看所有支付', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-333333333333', 'audit_log', 'all', '代理管理员可查看所有审计日志', true, 100)
ON CONFLICT ("roleId", "resourceType") DO NOTHING;

-- ============================================
-- 4. device_operator (设备操作员) - 全部数据
-- ============================================
INSERT INTO data_scopes ("roleId", "resourceType", "scopeType", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-444444444444', 'user', 'all', '设备操作员可查看所有用户', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-444444444444', 'device', 'all', '设备操作员可管理所有设备', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-444444444444', 'app', 'all', '设备操作员可查看所有应用', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-444444444444', 'billing', 'tenant', '设备操作员只能查看本租户账单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-444444444444', 'order', 'tenant', '设备操作员只能查看本租户订单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-444444444444', 'payment', 'tenant', '设备操作员只能查看本租户支付', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-444444444444', 'audit_log', 'all', '设备操作员可查看所有审计日志', true, 100)
ON CONFLICT ("roleId", "resourceType") DO NOTHING;

-- ============================================
-- 5. scheduler_admin (调度管理员) - 全部数据
-- ============================================
INSERT INTO data_scopes ("roleId", "resourceType", "scopeType", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-555555555555', 'user', 'all', '调度管理员可查看所有用户', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-555555555555', 'device', 'all', '调度管理员可管理所有设备', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-555555555555', 'app', 'all', '调度管理员可查看所有应用', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-555555555555', 'billing', 'all', '调度管理员可查看所有账单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-555555555555', 'order', 'all', '调度管理员可查看所有订单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-555555555555', 'payment', 'all', '调度管理员可查看所有支付', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-555555555555', 'audit_log', 'all', '调度管理员可查看所有审计日志', true, 100)
ON CONFLICT ("roleId", "resourceType") DO NOTHING;

-- ============================================
-- 6. content_editor (内容编辑) - 租户范围
-- ============================================
INSERT INTO data_scopes ("roleId", "resourceType", "scopeType", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-666666666666', 'user', 'tenant', '内容编辑可查看本租户用户', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-666666666666', 'device', 'tenant', '内容编辑可查看本租户设备', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-666666666666', 'app', 'tenant', '内容编辑可查看本租户应用', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-666666666666', 'billing', 'tenant', '内容编辑可查看本租户账单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-666666666666', 'order', 'tenant', '内容编辑可查看本租户订单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-666666666666', 'payment', 'tenant', '内容编辑可查看本租户支付', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-666666666666', 'audit_log', 'tenant', '内容编辑可查看本租户审计日志', true, 100)
ON CONFLICT ("roleId", "resourceType") DO NOTHING;

-- ============================================
-- 7. app_manager (应用管理员) - 全部数据
-- ============================================
INSERT INTO data_scopes ("roleId", "resourceType", "scopeType", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-777777777777', 'user', 'all', '应用管理员可查看所有用户', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-777777777777', 'device', 'all', '应用管理员可查看所有设备', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-777777777777', 'app', 'all', '应用管理员可管理所有应用', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-777777777777', 'billing', 'tenant', '应用管理员只能查看本租户账单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-777777777777', 'order', 'tenant', '应用管理员只能查看本租户订单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-777777777777', 'payment', 'tenant', '应用管理员只能查看本租户支付', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-777777777777', 'audit_log', 'all', '应用管理员可查看所有审计日志', true, 100)
ON CONFLICT ("roleId", "resourceType") DO NOTHING;

-- ============================================
-- 8. partner (合作伙伴) - 租户范围
-- ============================================
INSERT INTO data_scopes ("roleId", "resourceType", "scopeType", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-888888888888', 'user', 'tenant', '合作伙伴可查看本租户用户', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-888888888888', 'device', 'tenant', '合作伙伴可查看本租户设备', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-888888888888', 'app', 'tenant', '合作伙伴可查看本租户应用', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-888888888888', 'billing', 'tenant', '合作伙伴可查看本租户账单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-888888888888', 'order', 'tenant', '合作伙伴可查看本租户订单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-888888888888', 'payment', 'tenant', '合作伙伴可查看本租户支付', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-888888888888', 'audit_log', 'tenant', '合作伙伴可查看本租户审计日志', true, 100)
ON CONFLICT ("roleId", "resourceType") DO NOTHING;

-- ============================================
-- 9. api_user (API用户) - 本人数据
-- ============================================
INSERT INTO data_scopes ("roleId", "resourceType", "scopeType", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-999999999999', 'user', 'self', 'API用户只能查看自己的用户信息', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-999999999999', 'device', 'self', 'API用户只能管理自己的设备', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-999999999999', 'app', 'tenant', 'API用户可查看本租户应用', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-999999999999', 'billing', 'self', 'API用户只能查看自己的账单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-999999999999', 'order', 'self', 'API用户只能查看自己的订单', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-999999999999', 'payment', 'self', 'API用户只能查看自己的支付', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-999999999999', 'audit_log', 'self', 'API用户只能查看自己的审计日志', true, 100)
ON CONFLICT ("roleId", "resourceType") DO NOTHING;

-- ================================================================================
-- PART 3: 为新角色配置字段权限 (field_permissions)
-- ================================================================================

-- 定义关键资源的字段级权限
-- Operations: view, create, update, export

-- ============================================
-- 1. live_chat_agent (客服坐席)
-- ============================================
-- 用户字段权限 - 隐藏敏感信息
INSERT INTO field_permissions ("roleId", "resourceType", operation, "hiddenFields", "readOnlyFields", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-111111111111', 'user', 'view',
   'password,apiKey,roles',
   'id,username,email,status',
   '客服坐席查看用户时隐藏密码和API密钥', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-111111111111', 'user', 'update',
   'password,apiKey,roles,status',
   'id,username,createdAt',
   '客服坐席更新用户时不能修改敏感字段', true, 100)
ON CONFLICT DO NOTHING;

-- 设备字段权限
INSERT INTO field_permissions ("roleId", "resourceType", operation, "hiddenFields", "readOnlyFields", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-111111111111', 'device', 'view',
   'ip,internalConfig,adbKey',
   'id,name,status,userId,spec',
   '客服坐席查看设备时隐藏内部配置', true, 100)
ON CONFLICT DO NOTHING;

-- 账单字段权限
INSERT INTO field_permissions ("roleId", "resourceType", operation, "hiddenFields", "readOnlyFields", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-111111111111', 'billing', 'view',
   'paymentDetails,internalNotes',
   'id,amount,status,createdAt',
   '客服坐席查看账单时隐藏支付详情', true, 100)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. live_chat_supervisor (客服主管)
-- ============================================
INSERT INTO field_permissions ("roleId", "resourceType", operation, "hiddenFields", "readOnlyFields", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-222222222222', 'user', 'view',
   'password,apiKey',
   'id,username,email',
   '客服主管可查看更多用户信息', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-222222222222', 'device', 'view',
   'adbKey,internalConfig',
   'id,name,status',
   '客服主管可查看设备详情', true, 100)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. proxy_manager (代理管理员)
-- ============================================
INSERT INTO field_permissions ("roleId", "resourceType", operation, "hiddenFields", "readOnlyFields", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-333333333333', 'user', 'view',
   'password,apiKey',
   'id,username,email',
   '代理管理员查看用户基本信息', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-333333333333', 'device', 'view',
   '',
   'id,userId',
   '代理管理员可查看所有设备字段', true, 100)
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. device_operator (设备操作员)
-- ============================================
INSERT INTO field_permissions ("roleId", "resourceType", operation, "hiddenFields", "readOnlyFields", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-444444444444', 'device', 'view',
   'adbKey',
   'id,userId,spec',
   '设备操作员查看设备时隐藏ADB密钥', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-444444444444', 'device', 'update',
   'userId,spec,adbKey',
   'id,createdAt',
   '设备操作员不能修改设备配置', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-444444444444', 'user', 'view',
   'password,apiKey,email,phone',
   'id,username,status',
   '设备操作员只能查看用户基本信息', true, 100)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. scheduler_admin (调度管理员)
-- ============================================
INSERT INTO field_permissions ("roleId", "resourceType", operation, "hiddenFields", "readOnlyFields", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-555555555555', 'device', 'view',
   '',
   'id',
   '调度管理员可查看所有设备字段', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-555555555555', 'user', 'view',
   'password,apiKey',
   'id,username',
   '调度管理员查看用户时隐藏认证信息', true, 100)
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. content_editor (内容编辑)
-- ============================================
INSERT INTO field_permissions ("roleId", "resourceType", operation, "hiddenFields", "readOnlyFields", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-666666666666', 'user', 'view',
   'password,apiKey,balance,phone',
   'id,username,email,status',
   '内容编辑查看用户时隐藏敏感信息', true, 100)
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. app_manager (应用管理员)
-- ============================================
INSERT INTO field_permissions ("roleId", "resourceType", operation, "hiddenFields", "readOnlyFields", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-777777777777', 'app', 'view',
   '',
   'id,uploaderId',
   '应用管理员可查看所有应用字段', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-777777777777', 'app', 'update',
   '',
   'id,uploaderId,createdAt',
   '应用管理员可编辑应用信息', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-777777777777', 'user', 'view',
   'password,apiKey',
   'id,username,email',
   '应用管理员查看开发者信息', true, 100)
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. partner (合作伙伴)
-- ============================================
INSERT INTO field_permissions ("roleId", "resourceType", operation, "hiddenFields", "readOnlyFields", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-888888888888', 'user', 'view',
   'password,apiKey,phone,email',
   'id,username,status',
   '合作伙伴只能查看用户基本信息', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-888888888888', 'device', 'view',
   'ip,adbKey,internalConfig',
   'id,name,status,spec',
   '合作伙伴查看设备时隐藏技术细节', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-888888888888', 'billing', 'view',
   'paymentDetails',
   'id,amount,status',
   '合作伙伴可查看账单但隐藏支付详情', true, 100)
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. api_user (API用户)
-- ============================================
INSERT INTO field_permissions ("roleId", "resourceType", operation, "hiddenFields", "readOnlyFields", description, "isActive", priority)
VALUES
  ('b1a2c3d4-e5f6-4789-abcd-999999999999', 'user', 'view',
   'password,roles',
   'id,username,email',
   'API用户查看自己的用户信息', true, 100),
  ('b1a2c3d4-e5f6-4789-abcd-999999999999', 'device', 'view',
   'adbKey,internalConfig',
   'id,userId,spec',
   'API用户查看自己的设备', true, 100)
ON CONFLICT DO NOTHING;

-- ================================================================================
-- PART 4: 为新角色分配菜单权限 (menu_roles)
-- ================================================================================

-- ============================================
-- 1. live_chat_agent (客服坐席)
-- ============================================
-- 基础菜单：工单、LiveChat、通知
INSERT INTO menu_roles ("menuId", "roleId")
SELECT m.id, 'b1a2c3d4-e5f6-4789-abcd-111111111111'
FROM menus m
WHERE m.code IN (
  -- 工单管理
  'tickets-my', 'tickets-all',
  -- LiveChat
  'livechat-sessions', 'livechat-my-sessions',
  -- 用户查看
  'users-list', 'users-detail',
  -- 设备查看
  'devices-list', 'devices-detail',
  -- 通知
  'notifications-list',
  -- 个人中心
  'profile-info', 'profile-security',
  -- 首页
  'dashboard'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. live_chat_supervisor (客服主管)
-- ============================================
-- 完整的客服管理菜单
INSERT INTO menu_roles ("menuId", "roleId")
SELECT m.id, 'b1a2c3d4-e5f6-4789-abcd-222222222222'
FROM menus m
WHERE m.code IN (
  -- 继承客服坐席的菜单
  'tickets-my', 'tickets-all',
  'livechat-sessions', 'livechat-my-sessions',
  'users-list', 'users-detail',
  'devices-list', 'devices-detail',
  'notifications-list',
  'profile-info', 'profile-security',
  'dashboard',
  -- 额外的管理菜单
  'livechat-queue', 'livechat-agents', 'livechat-stats',
  'livechat-ratings', 'livechat-reports',
  'system-logs', 'monitoring-dashboard'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. proxy_manager (代理管理员)
-- ============================================
INSERT INTO menu_roles ("menuId", "roleId")
SELECT m.id, 'b1a2c3d4-e5f6-4789-abcd-333333333333'
FROM menus m
WHERE m.code IN (
  -- 代理管理
  'proxy-list', 'proxy-providers', 'proxy-sessions',
  'proxy-stats', 'proxy-audit', 'proxy-cost',
  -- 设备查看（了解代理使用）
  'devices-list', 'devices-detail',
  -- 用户查看
  'users-list',
  -- 系统监控
  'monitoring-dashboard', 'system-logs',
  -- 通知
  'notifications-list',
  -- 个人中心
  'profile-info', 'profile-security',
  'dashboard'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. device_operator (设备操作员)
-- ============================================
INSERT INTO menu_roles ("menuId", "roleId")
SELECT m.id, 'b1a2c3d4-e5f6-4789-abcd-444444444444'
FROM menus m
WHERE m.code IN (
  -- 设备管理
  'devices-list', 'devices-detail', 'devices-control',
  'devices-groups', 'devices-snapshots',
  -- 应用操作
  'apps-market', 'apps-list',
  -- 系统监控
  'monitoring-dashboard', 'monitoring-devices',
  'system-logs',
  -- 通知
  'notifications-list',
  -- 个人中心
  'profile-info', 'profile-security',
  'dashboard'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. scheduler_admin (调度管理员)
-- ============================================
INSERT INTO menu_roles ("menuId", "roleId")
SELECT m.id, 'b1a2c3d4-e5f6-4789-abcd-555555555555'
FROM menus m
WHERE m.code IN (
  -- 设备管理
  'devices-list', 'devices-create', 'devices-detail',
  'devices-groups', 'devices-templates',
  -- 调度管理
  'scheduler-jobs', 'scheduler-tasks', 'scheduler-cron',
  -- 资源管理
  'resources-overview', 'resources-allocation',
  -- 用户和租户
  'users-list', 'tenants-list',
  -- 系统管理
  'system', 'system-logs', 'system-audit',
  'monitoring-dashboard', 'monitoring-resources',
  -- 通知
  'notifications-list',
  -- 个人中心
  'profile-info', 'profile-security',
  'dashboard'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. content_editor (内容编辑)
-- ============================================
INSERT INTO menu_roles ("menuId", "roleId")
SELECT m.id, 'b1a2c3d4-e5f6-4789-abcd-666666666666'
FROM menus m
WHERE m.code IN (
  -- CMS内容管理
  'cms-articles', 'cms-pages', 'cms-categories',
  'cms-media', 'cms-publish',
  -- 营销活动
  'campaigns-list', 'campaigns-create', 'campaigns-stats',
  -- 通知模板
  'notifications-templates', 'notifications-send',
  -- 用户查看（目标受众分析）
  'users-list',
  -- 系统
  'dashboard', 'system-logs',
  -- 个人中心
  'profile-info', 'profile-security'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. app_manager (应用管理员)
-- ============================================
INSERT INTO menu_roles ("menuId", "roleId")
SELECT m.id, 'b1a2c3d4-e5f6-4789-abcd-777777777777'
FROM menus m
WHERE m.code IN (
  -- 应用管理
  'apps-market', 'apps-list', 'apps-upload',
  'apps-categories', 'apps-versions', 'apps-audit',
  -- 审核管理
  'approvals-pending', 'approvals-my-requests',
  -- 设备查看（测试用）
  'devices-list', 'devices-detail',
  -- 用户查看（开发者）
  'users-list', 'developers-list',
  -- 系统
  'dashboard', 'system-logs', 'monitoring-dashboard',
  -- 通知
  'notifications-list',
  -- 个人中心
  'profile-info', 'profile-security'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. partner (合作伙伴)
-- ============================================
INSERT INTO menu_roles ("menuId", "roleId")
SELECT m.id, 'b1a2c3d4-e5f6-4789-abcd-888888888888'
FROM menus m
WHERE m.code IN (
  -- 设备查看
  'devices-list', 'devices-detail',
  -- 用户查看
  'users-list',
  -- 应用市场
  'apps-market',
  -- 账单和订单
  'billing-invoices', 'billing-payments', 'billing-overview',
  'orders-list',
  -- 合作伙伴专属
  'partner-dashboard', 'partner-commission', 'partner-customers',
  'partner-stats',
  -- 通知
  'notifications-list',
  -- 个人中心
  'profile-info', 'profile-security',
  'dashboard'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. api_user (API用户)
-- ============================================
INSERT INTO menu_roles ("menuId", "roleId")
SELECT m.id, 'b1a2c3d4-e5f6-4789-abcd-999999999999'
FROM menus m
WHERE m.code IN (
  -- API管理
  'api-keys', 'api-docs', 'api-logs',
  -- 设备管理
  'devices-list', 'devices-create', 'devices-detail',
  -- 应用查看
  'apps-market', 'apps-list',
  -- Webhook
  'webhooks-list', 'webhooks-create',
  -- 账单查看
  'billing-invoices', 'billing-overview',
  -- 通知
  'notifications-list',
  -- 个人中心
  'profile-info', 'profile-security',
  'dashboard'
)
ON CONFLICT DO NOTHING;

-- ================================================================================
-- COMMIT TRANSACTION
-- ================================================================================

COMMIT;

-- ================================================================================
-- 验证脚本
-- ================================================================================

-- 查看每个新角色的权限数量
SELECT
  r.name as role_name,
  COUNT(DISTINCT rp.permission_id) as permission_count,
  COUNT(DISTINCT ds.id) as data_scope_count,
  COUNT(DISTINCT fp.id) as field_permission_count,
  COUNT(DISTINCT mr."menuId") as menu_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN data_scopes ds ON r.id = ds."roleId"
LEFT JOIN field_permissions fp ON r.id = fp."roleId"
LEFT JOIN menu_roles mr ON r.id = mr."roleId"
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
GROUP BY r.id, r.name
ORDER BY r.name;
