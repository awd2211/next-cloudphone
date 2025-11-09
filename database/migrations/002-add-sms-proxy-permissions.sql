-- ============================================================================
-- 添加 SMS 和 Proxy 服务权限
-- Migration: Add SMS and Proxy Service Permissions
-- Version: 1.0.0
-- Date: 2025-11-08
-- ============================================================================
--
-- 目标:
--   1. 为 SMS Receive Service 创建所需权限
--   2. 为 Proxy Service 创建所需权限
--   3. 为 super_admin 分配这些权限
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- 第一部分: 创建 SMS 权限
-- ============================================================================

-- SMS Verification Code 权限
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'sms.verification-code.read', '查看验证码记录', 'sms', 'verification-code.read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'sms.verification-code.validate', '验证验证码', 'sms', 'verification-code.validate', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'sms.verification-code.consume', '消费验证码', 'sms', 'verification-code.consume', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'sms.statistics.view', '查看SMS统计数据', 'sms', 'statistics.view', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 第二部分: 创建 Proxy 权限
-- ============================================================================

-- Proxy Report 权限
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'proxy.report.create', '创建代理报告', 'proxy', 'report.create', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.report.read', '查看代理报告', 'proxy', 'report.read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.report.delete', '删除代理报告', 'proxy', 'report.delete', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.report.export', '导出代理报告', 'proxy', 'report.export', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.report.stats', '查看报告统计', 'proxy', 'report.stats', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.report.download', '下载代理报告', 'proxy', 'report.download', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Proxy Report Schedule 权限
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'proxy.report.schedule.create', '创建报告计划', 'proxy', 'report.schedule.create', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.report.schedule.read', '查看报告计划', 'proxy', 'report.schedule.read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.report.schedule.update', '更新报告计划', 'proxy', 'report.schedule.update', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.report.schedule.delete', '删除报告计划', 'proxy', 'report.schedule.delete', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.report.schedule.execute', '执行报告计划', 'proxy', 'report.schedule.execute', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Proxy Session 权限
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'proxy.session.create', '创建代理会话', 'proxy', 'session.create', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.session.renew', '续期代理会话', 'proxy', 'session.renew', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.session.delete', '删除代理会话', 'proxy', 'session.delete', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.session.read', '查看代理会话', 'proxy', 'session.read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.session.stats', '查看会话统计', 'proxy', 'session.stats', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Proxy Provider 权限
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'proxy.provider.read', '查看代理提供商', 'proxy', 'provider.read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.provider.compare', '对比代理提供商', 'proxy', 'provider.compare', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.provider.admin', '管理代理提供商', 'proxy', 'provider.admin', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.provider.stats', '查看提供商统计', 'proxy', 'provider.stats', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Proxy 基础权限
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'proxy.recommend', '推荐代理', 'proxy', 'recommend', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.read', '查看代理信息', 'proxy', 'read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.stats', '查看代理统计', 'proxy', 'stats', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.admin', '管理代理', 'proxy', 'admin', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.config', '配置代理', 'proxy', 'config', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.failover', '代理故障转移', 'proxy', 'failover', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Proxy Geo 权限
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'proxy.geo.configure', '配置地理匹配', 'proxy', 'geo.configure', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.geo.read', '查看地理信息', 'proxy', 'geo.read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.geo.match', '地理匹配', 'proxy', 'geo.match', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.geo.recommend', '地理推荐', 'proxy', 'geo.recommend', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.geo.stats', '查看地理统计', 'proxy', 'geo.stats', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Proxy Device Group 权限
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'proxy.device-group.create', '创建设备组', 'proxy', 'device-group.create', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.device-group.read', '查看设备组', 'proxy', 'device-group.read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.device-group.update', '更新设备组', 'proxy', 'device-group.update', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.device-group.delete', '删除设备组', 'proxy', 'device-group.delete', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.device-group.manage-devices', '管理组内设备', 'proxy', 'device-group.manage-devices', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.device-group.admin', '管理设备组', 'proxy', 'device-group.admin', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.device-group.manage-proxies', '管理组内代理', 'proxy', 'device-group.manage-proxies', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Proxy Alert 权限
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'proxy.alert.acknowledge', '确认代理告警', 'proxy', 'alert.acknowledge', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.alert.resolve', '解决代理告警', 'proxy', 'alert.resolve', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.alert.stats', '查看告警统计', 'proxy', 'alert.stats', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Proxy Alert Channel 权限
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'proxy.alert.channel.create', '创建告警渠道', 'proxy', 'alert.channel.create', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.alert.channel.read', '查看告警渠道', 'proxy', 'alert.channel.read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.alert.channel.update', '更新告警渠道', 'proxy', 'alert.channel.update', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.alert.channel.delete', '删除告警渠道', 'proxy', 'alert.channel.delete', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.alert.channel.test', '测试告警渠道', 'proxy', 'alert.channel.test', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Proxy Alert Rule 权限
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'proxy.alert.rule.create', '创建告警规则', 'proxy', 'alert.rule.create', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.alert.rule.read', '查看告警规则', 'proxy', 'alert.rule.read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.alert.rule.update', '更新告警规则', 'proxy', 'alert.rule.update', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.alert.rule.delete', '删除告警规则', 'proxy', 'alert.rule.delete', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Proxy Alert History 权限
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'proxy.alert.history.read', '查看告警历史', 'proxy', 'alert.history.read', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Proxy Audit 权限
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'proxy.audit.create', '创建审计日志', 'proxy', 'audit.create', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.audit.read', '查看审计日志', 'proxy', 'audit.read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.audit.export', '导出审计日志', 'proxy', 'audit.export', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.audit.stats', '查看审计统计', 'proxy', 'audit.stats', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.audit.my-logs', '查看我的日志', 'proxy', 'audit.my-logs', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.audit.user-activity', '查看用户活动', 'proxy', 'audit.user-activity', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.audit.system-summary', '查看系统摘要', 'proxy', 'audit.system-summary', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Proxy Audit Sensitive 权限
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'proxy.audit.sensitive.read', '查看敏感审计信息', 'proxy', 'audit.sensitive.read', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.audit.sensitive.decrypt', '解密敏感数据', 'proxy', 'audit.sensitive.decrypt', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.audit.sensitive.approve', '批准敏感操作', 'proxy', 'audit.sensitive.approve', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Proxy Cost 权限
INSERT INTO permissions (id, name, description, resource, action, "isActive", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'proxy.cost.dashboard', '查看成本仪表板', 'proxy', 'cost.dashboard', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.cost.record', '记录成本', 'proxy', 'cost.record', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.cost.stats', '查看成本统计', 'proxy', 'cost.stats', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.cost.budget', '管理成本预算', 'proxy', 'cost.budget', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.cost.alerts', '查看成本告警', 'proxy', 'cost.alerts', TRUE, NOW(), NOW()),
  (uuid_generate_v4(), 'proxy.cost.optimize', '优化成本', 'proxy', 'cost.optimize', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 第三部分: 为 super_admin 分配 SMS 权限
-- ============================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
  AND p.name IN (
    'sms.verification-code.read',
    'sms.verification-code.validate',
    'sms.verification-code.consume',
    'sms.statistics.view'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 第四部分: 为 super_admin 分配 Proxy 权限
-- ============================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
  AND p.resource = 'proxy'
ON CONFLICT DO NOTHING;

COMMIT;

-- Verification
\echo '✅ SMS 和 Proxy 权限创建完成!'
\echo ''
\echo '📊 统计:'
SELECT
  '新增 SMS 权限' as metric,
  COUNT(*)::text as value
FROM permissions WHERE resource = 'sms'
UNION ALL
SELECT
  '新增 Proxy 权限',
  COUNT(*)::text
FROM permissions WHERE resource = 'proxy'
UNION ALL
SELECT
  'super_admin 权限总数',
  COUNT(*)::text
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'super_admin';

\echo ''
\echo '📝 SMS 权限列表:'
SELECT name, description FROM permissions WHERE resource = 'sms' ORDER BY name;

\echo ''
\echo '📝 Proxy 权限列表 (前 20 条):'
SELECT name, description FROM permissions WHERE resource = 'proxy' ORDER BY name LIMIT 20;
