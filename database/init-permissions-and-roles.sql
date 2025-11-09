-- ============================================
-- Cloud Phone Platform - 权限和角色初始化脚本
-- Version: 2.0
-- Date: 2025-11-06
-- ============================================

BEGIN;

-- ============================================
-- 1. 清理冗余和重复的角色
-- ============================================

-- 删除非系统角色（isSystem = false）
DELETE FROM user_roles
WHERE role_id IN (
  SELECT id FROM roles WHERE "isSystem" = false
);

DELETE FROM role_permissions
WHERE role_id IN (
  SELECT id FROM roles WHERE "isSystem" = false
);

DELETE FROM roles WHERE "isSystem" = false;

-- 删除重复的系统角色（保留原有的系统角色）
DELETE FROM user_roles
WHERE role_id IN (
  '73f24086-59f5-47c4-ac41-d0b0f1019d7e'  -- super_admin (重复的)
);

DELETE FROM role_permissions
WHERE role_id IN (
  '73f24086-59f5-47c4-ac41-d0b0f1019d7e'
);

DELETE FROM roles WHERE id = '73f24086-59f5-47c4-ac41-d0b0f1019d7e';

-- ============================================
-- 2. 清理旧权限
-- ============================================

-- 删除权限关联和旧权限（使用 CASCADE 自动清理关联）
TRUNCATE TABLE permissions CASCADE;

-- ============================================
-- 3. 插入所有权限
-- ============================================

-- 应用管理权限 (5)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('10000000-0000-0000-0000-000000000001', 'app.create', '上传和创建新的应用', 'app', 'create', true),
('10000000-0000-0000-0000-000000000002', 'app.read', '查看应用列表和详情', 'app', 'read', true),
('10000000-0000-0000-0000-000000000003', 'app.update', '修改应用信息', 'app', 'update', true),
('10000000-0000-0000-0000-000000000004', 'app.delete', '删除应用', 'app', 'delete', true),
('10000000-0000-0000-0000-000000000005', 'app.approve', '审核应用上架', 'app', 'approve', true);

-- 账单权限 (5)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('20000000-0000-0000-0000-000000000001', 'billing:create', '创建账单和订单', 'billing', 'create', true),
('20000000-0000-0000-0000-000000000002', 'billing:read', '查看账单和支付记录', 'billing', 'read', true),
('20000000-0000-0000-0000-000000000003', 'billing:update', '修改账单状态', 'billing', 'update', true),
('20000000-0000-0000-0000-000000000004', 'billing:delete', '删除账单记录', 'billing', 'delete', true),
('20000000-0000-0000-0000-000000000005', 'billing.read', '兼容旧版权限代码', 'billing', 'read', true);

-- 设备管理权限 (12)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('30000000-0000-0000-0000-000000000001', 'device.create', '创建云手机设备', 'device', 'create', true),
('30000000-0000-0000-0000-000000000002', 'device.read', '查看设备列表和详情', 'device', 'read', true),
('30000000-0000-0000-0000-000000000003', 'device:read', '兼容旧版权限代码', 'device', 'read', true),
('30000000-0000-0000-0000-000000000004', 'device.update', '修改设备配置', 'device', 'update', true),
('30000000-0000-0000-0000-000000000005', 'device.delete', '删除设备', 'device', 'delete', true),
('30000000-0000-0000-0000-000000000006', 'device.control', '远程控制设备（启动/停止/重启）', 'device', 'control', true),
('30000000-0000-0000-0000-000000000007', 'device.manage', '管理设备应用和数据', 'device', 'manage', true),
('30000000-0000-0000-0000-000000000008', 'device:app-operate', '在设备上安装/卸载应用', 'device', 'app-operate', true),
('30000000-0000-0000-0000-000000000009', 'device:snapshot-create', '创建设备快照', 'device', 'snapshot-create', true),
('30000000-0000-0000-0000-000000000010', 'device:snapshot-restore', '从快照恢复设备', 'device', 'snapshot-restore', true),
('30000000-0000-0000-0000-000000000011', 'device:snapshot-delete', '删除设备快照', 'device', 'snapshot-delete', true),
('30000000-0000-0000-0000-000000000012', 'device:sms:request', '为设备请求短信号码', 'device', 'sms-request', true),
('30000000-0000-0000-0000-000000000013', 'device:sms:cancel', '取消设备短信号码', 'device', 'sms-cancel', true);

-- 通知权限 (12)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('40000000-0000-0000-0000-000000000001', 'notification.create', '发送通知消息', 'notification', 'create', true),
('40000000-0000-0000-0000-000000000002', 'notification.read', '查看通知列表', 'notification', 'read', true),
('40000000-0000-0000-0000-000000000003', 'notification.update', '标记已读/删除通知', 'notification', 'update', true),
('40000000-0000-0000-0000-000000000004', 'notification.delete', '删除通知', 'notification', 'delete', true),
('40000000-0000-0000-0000-000000000005', 'notification.broadcast', '发送系统广播通知', 'notification', 'broadcast', true),
('40000000-0000-0000-0000-000000000006', 'notification.unread-count', '查看未读通知数量', 'notification', 'unread-count', true),
('40000000-0000-0000-0000-000000000007', 'notification.batch-delete', '批量删除通知', 'notification', 'batch-delete', true),
('40000000-0000-0000-0000-000000000008', 'notification.stats', '查看通知统计数据', 'notification', 'stats', true),
('40000000-0000-0000-0000-000000000009', 'notification.preference-read', '查看用户通知偏好设置', 'notification', 'preference-read', true),
('40000000-0000-0000-0000-000000000010', 'notification.preference-update', '修改通知偏好设置', 'notification', 'preference-update', true),
('40000000-0000-0000-0000-000000000011', 'notification.preference-batch', '批量设置通知偏好', 'notification', 'preference-batch', true),
('40000000-0000-0000-0000-000000000012', 'notification.preference-reset', '重置为默认设置', 'notification', 'preference-reset', true);

-- 通知模板权限 (6)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('41000000-0000-0000-0000-000000000001', 'notification.template-create', '创建通知模板', 'notification-template', 'create', true),
('41000000-0000-0000-0000-000000000002', 'notification.template-read', '查看通知模板', 'notification-template', 'read', true),
('41000000-0000-0000-0000-000000000003', 'notification.template-update', '修改通知模板', 'notification-template', 'update', true),
('41000000-0000-0000-0000-000000000004', 'notification.template-delete', '删除通知模板', 'notification-template', 'delete', true),
('41000000-0000-0000-0000-000000000005', 'notification.template-toggle', '切换模板状态', 'notification-template', 'toggle', true),
('41000000-0000-0000-0000-000000000006', 'notification.template-render', '渲染通知模板', 'notification-template', 'render', true);

-- 代理服务权限 (80+)
-- 基础代理操作 (11)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('50000000-0000-0000-0000-000000000001', 'proxy.acquire', '获取可用代理', 'proxy', 'acquire', true),
('50000000-0000-0000-0000-000000000002', 'proxy.list', '查看所有代理', 'proxy', 'list', true),
('50000000-0000-0000-0000-000000000003', 'proxy.assign', '为设备分配代理', 'proxy', 'assign', true),
('50000000-0000-0000-0000-000000000004', 'proxy.release', '释放代理资源', 'proxy', 'release', true),
('50000000-0000-0000-0000-000000000005', 'proxy.report', '查看代理使用报告', 'proxy', 'report', true),
('50000000-0000-0000-0000-000000000006', 'proxy.stats', '查看代理统计数据', 'proxy', 'stats', true),
('50000000-0000-0000-0000-000000000007', 'proxy:stats', '兼容旧版权限代码', 'proxy', 'stats', true),
('50000000-0000-0000-0000-000000000008', 'proxy.read', '查看代理详情', 'proxy', 'read', true),
('50000000-0000-0000-0000-000000000009', 'proxy:read', '兼容旧版权限代码', 'proxy', 'read', true),
('50000000-0000-0000-0000-000000000010', 'proxy.strategy', '配置代理策略', 'proxy', 'strategy', true),
('50000000-0000-0000-0000-000000000011', 'proxy.refresh', '刷新代理列表', 'proxy', 'refresh', true);

-- 代理管理权限 (6)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('50100000-0000-0000-0000-000000000001', 'proxy:admin', '代理系统管理权限', 'proxy', 'admin', true),
('50100000-0000-0000-0000-000000000002', 'proxy:config', '配置代理系统参数', 'proxy', 'config', true),
('50100000-0000-0000-0000-000000000003', 'proxy:recommend', '获取代理推荐', 'proxy', 'recommend', true),
('50100000-0000-0000-0000-000000000004', 'proxy:failover', '配置故障转移', 'proxy', 'failover', true);

-- 代理报告权限 (9)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('51000000-0000-0000-0000-000000000001', 'proxy:report:create', '创建使用报告', 'proxy-report', 'create', true),
('51000000-0000-0000-0000-000000000002', 'proxy:report:read', '查看使用报告', 'proxy-report', 'read', true),
('51000000-0000-0000-0000-000000000003', 'proxy:report:delete', '删除使用报告', 'proxy-report', 'delete', true),
('51000000-0000-0000-0000-000000000004', 'proxy:report:export', '导出使用报告', 'proxy-report', 'export', true),
('51000000-0000-0000-0000-000000000005', 'proxy:report:stats', '查看报告统计', 'proxy-report', 'stats', true),
('51000000-0000-0000-0000-000000000006', 'proxy:report:download', '下载报告文件', 'proxy-report', 'download', true),
('51000000-0000-0000-0000-000000000007', 'proxy:report:schedule:create', '创建定时报告任务', 'proxy-report', 'schedule-create', true),
('51000000-0000-0000-0000-000000000008', 'proxy:report:schedule:read', '查看定时报告配置', 'proxy-report', 'schedule-read', true),
('51000000-0000-0000-0000-000000000009', 'proxy:report:schedule:update', '修改定时报告配置', 'proxy-report', 'schedule-update', true),
('51000000-0000-0000-0000-000000000010', 'proxy:report:schedule:delete', '删除定时报告任务', 'proxy-report', 'schedule-delete', true),
('51000000-0000-0000-0000-000000000011', 'proxy:report:schedule:execute', '手动执行定时报告', 'proxy-report', 'schedule-execute', true);

-- 代理会话权限 (5)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('52000000-0000-0000-0000-000000000001', 'proxy:session:create', '创建代理粘性会话', 'proxy-session', 'create', true),
('52000000-0000-0000-0000-000000000002', 'proxy:session:read', '查看代理会话', 'proxy-session', 'read', true),
('52000000-0000-0000-0000-000000000003', 'proxy:session:renew', '续期代理会话', 'proxy-session', 'renew', true),
('52000000-0000-0000-0000-000000000004', 'proxy:session:delete', '删除代理会话', 'proxy-session', 'delete', true),
('52000000-0000-0000-0000-000000000005', 'proxy:session:stats', '查看会话统计', 'proxy-session', 'stats', true);

-- 代理提供商权限 (4)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('53000000-0000-0000-0000-000000000001', 'proxy:provider:read', '查看代理提供商', 'proxy-provider', 'read', true),
('53000000-0000-0000-0000-000000000002', 'proxy:provider:compare', '对比提供商性能', 'proxy-provider', 'compare', true),
('53000000-0000-0000-0000-000000000003', 'proxy:provider:admin', '管理代理提供商', 'proxy-provider', 'admin', true),
('53000000-0000-0000-0000-000000000004', 'proxy:provider:stats', '查看提供商统计', 'proxy-provider', 'stats', true);

-- 代理地理位置权限 (5)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('54000000-0000-0000-0000-000000000001', 'proxy:geo:configure', '配置代理地理位置', 'proxy-geo', 'configure', true),
('54000000-0000-0000-0000-000000000002', 'proxy:geo:read', '查看地理位置配置', 'proxy-geo', 'read', true),
('54000000-0000-0000-0000-000000000003', 'proxy:geo:match', '进行地理位置匹配', 'proxy-geo', 'match', true),
('54000000-0000-0000-0000-000000000004', 'proxy:geo:recommend', '获取地理位置推荐', 'proxy-geo', 'recommend', true),
('54000000-0000-0000-0000-000000000005', 'proxy:geo:stats', '查看地理统计数据', 'proxy-geo', 'stats', true);

-- 代理设备组权限 (6)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('55000000-0000-0000-0000-000000000001', 'proxy:device-group:create', '创建代理设备组', 'proxy-device-group', 'create', true),
('55000000-0000-0000-0000-000000000002', 'proxy:device-group:read', '查看设备组信息', 'proxy-device-group', 'read', true),
('55000000-0000-0000-0000-000000000003', 'proxy:device-group:update', '修改设备组配置', 'proxy-device-group', 'update', true),
('55000000-0000-0000-0000-000000000004', 'proxy:device-group:delete', '删除设备组', 'proxy-device-group', 'delete', true),
('55000000-0000-0000-0000-000000000005', 'proxy:device-group:manage-devices', '管理设备组成员', 'proxy-device-group', 'manage-devices', true),
('55000000-0000-0000-0000-000000000006', 'proxy:device-group:manage-proxies', '管理设备组代理', 'proxy-device-group', 'manage-proxies', true),
('55000000-0000-0000-0000-000000000007', 'proxy:device-group:admin', '设备组高级管理', 'proxy-device-group', 'admin', true);

-- 代理成本监控权限 (6)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('56000000-0000-0000-0000-000000000001', 'proxy:cost:record', '记录代理使用成本', 'proxy-cost', 'record', true),
('56000000-0000-0000-0000-000000000002', 'proxy:cost:budget', '管理代理预算', 'proxy-cost', 'budget', true),
('56000000-0000-0000-0000-000000000003', 'proxy:cost:stats', '查看成本统计', 'proxy-cost', 'stats', true),
('56000000-0000-0000-0000-000000000004', 'proxy:cost:alerts', '管理成本告警', 'proxy-cost', 'alerts', true),
('56000000-0000-0000-0000-000000000005', 'proxy:cost:optimize', '优化代理成本', 'proxy-cost', 'optimize', true),
('56000000-0000-0000-0000-000000000006', 'proxy:cost:dashboard', '查看成本仪表板', 'proxy-cost', 'dashboard', true);

-- 代理审计权限 (9)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('57000000-0000-0000-0000-000000000001', 'proxy:audit:create', '创建代理审计日志', 'proxy-audit', 'create', true),
('57000000-0000-0000-0000-000000000002', 'proxy:audit:read', '查看代理审计日志', 'proxy-audit', 'read', true),
('57000000-0000-0000-0000-000000000003', 'proxy:audit:export', '导出审计日志', 'proxy-audit', 'export', true),
('57000000-0000-0000-0000-000000000004', 'proxy:audit:stats', '查看审计统计', 'proxy-audit', 'stats', true),
('57000000-0000-0000-0000-000000000005', 'proxy:audit:my-logs', '查看自己的审计日志', 'proxy-audit', 'my-logs', true),
('57000000-0000-0000-0000-000000000006', 'proxy:audit:sensitive:read', '查看敏感审计日志', 'proxy-audit', 'sensitive-read', true),
('57000000-0000-0000-0000-000000000007', 'proxy:audit:sensitive:decrypt', '解密敏感数据', 'proxy-audit', 'sensitive-decrypt', true),
('57000000-0000-0000-0000-000000000008', 'proxy:audit:sensitive:approve', '审批敏感数据访问', 'proxy-audit', 'sensitive-approve', true),
('57000000-0000-0000-0000-000000000009', 'proxy:audit:user-activity', '分析用户活动', 'proxy-audit', 'user-activity', true),
('57000000-0000-0000-0000-000000000010', 'proxy:audit:system-summary', '查看系统审计摘要', 'proxy-audit', 'system-summary', true);

-- 代理告警权限 (10)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('58000000-0000-0000-0000-000000000001', 'proxy:alert:channel:create', '创建告警通道', 'proxy-alert-channel', 'create', true),
('58000000-0000-0000-0000-000000000002', 'proxy:alert:channel:read', '查看告警通道', 'proxy-alert-channel', 'read', true),
('58000000-0000-0000-0000-000000000003', 'proxy:alert:channel:update', '修改告警通道', 'proxy-alert-channel', 'update', true),
('58000000-0000-0000-0000-000000000004', 'proxy:alert:channel:delete', '删除告警通道', 'proxy-alert-channel', 'delete', true),
('58000000-0000-0000-0000-000000000005', 'proxy:alert:channel:test', '测试告警通道', 'proxy-alert-channel', 'test', true),
('58000000-0000-0000-0000-000000000006', 'proxy:alert:rule:create', '创建告警规则', 'proxy-alert-rule', 'create', true),
('58000000-0000-0000-0000-000000000007', 'proxy:alert:rule:read', '查看告警规则', 'proxy-alert-rule', 'read', true),
('58000000-0000-0000-0000-000000000008', 'proxy:alert:rule:update', '修改告警规则', 'proxy-alert-rule', 'update', true),
('58000000-0000-0000-0000-000000000009', 'proxy:alert:rule:delete', '删除告警规则', 'proxy-alert-rule', 'delete', true),
('58000000-0000-0000-0000-000000000010', 'proxy:alert:history:read', '查看告警历史记录', 'proxy-alert-history', 'read', true),
('58000000-0000-0000-0000-000000000011', 'proxy:alert:acknowledge', '确认告警', 'proxy-alert', 'acknowledge', true),
('58000000-0000-0000-0000-000000000012', 'proxy:alert:resolve', '解决告警', 'proxy-alert', 'resolve', true),
('58000000-0000-0000-0000-000000000013', 'proxy:alert:stats', '查看告警统计', 'proxy-alert', 'stats', true);

-- 短信服务权限 (18)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('60000000-0000-0000-0000-000000000001', 'sms.request', '请求临时短信号码', 'sms', 'request', true),
('60000000-0000-0000-0000-000000000002', 'sms.read', '查看短信记录', 'sms', 'read', true),
('60000000-0000-0000-0000-000000000003', 'sms.cancel', '释放短信号码', 'sms', 'cancel', true),
('60000000-0000-0000-0000-000000000004', 'sms.batch', '批量请求/取消号码', 'sms', 'batch', true),
('60000000-0000-0000-0000-000000000005', 'sms.messages', '查看短信消息', 'sms', 'messages', true),
('60000000-0000-0000-0000-000000000006', 'sms.stats', '查看短信统计', 'sms', 'stats', true),
('60000000-0000-0000-0000-000000000007', 'sms.provider-stats', '查看提供商统计', 'sms', 'provider-stats', true),
('60000000-0000-0000-0000-000000000008', 'sms.trigger-poll', '手动触发消息轮询', 'sms', 'trigger-poll', true),
('60000000-0000-0000-0000-000000000009', 'sms.validate', '验证短信内容', 'sms', 'validate', true),
('60000000-0000-0000-0000-000000000010', 'sms.send', '发送短信消息', 'sms', 'send', true),
('60000000-0000-0000-0000-000000000011', 'sms.send-batch', '批量发送短信', 'sms', 'send-batch', true),
('60000000-0000-0000-0000-000000000012', 'sms:statistics:view', '查看短信系统统计', 'sms', 'statistics-view', true),
('60000000-0000-0000-0000-000000000013', 'sms:verification-code:read', '查看验证码记录', 'sms-verification', 'read', true),
('60000000-0000-0000-0000-000000000014', 'sms:verification-code:validate', '验证短信验证码', 'sms-verification', 'validate', true),
('60000000-0000-0000-0000-000000000015', 'sms:verification-code:consume', '消费使用验证码', 'sms-verification', 'consume', true),
('60000000-0000-0000-0000-000000000016', 'sms.otp-send', '发送一次性密码', 'sms-otp', 'send', true),
('60000000-0000-0000-0000-000000000017', 'sms.otp-verify', '验证一次性密码', 'sms-otp', 'verify', true),
('60000000-0000-0000-0000-000000000018', 'sms.otp-retries', '查看OTP重试次数', 'sms-otp', 'retries', true),
('60000000-0000-0000-0000-000000000019', 'sms.otp-active', '查看活跃的OTP', 'sms-otp', 'active', true),
('60000000-0000-0000-0000-000000000020', 'sms.otp-clear', '清理过期OTP', 'sms-otp', 'clear', true),
('60000000-0000-0000-0000-000000000021', 'sms.otp-stats', '查看OTP统计', 'sms-otp', 'stats', true);

-- 用户和权限管理 (8)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('70000000-0000-0000-0000-000000000001', 'user.create', '创建新用户', 'user', 'create', true),
('70000000-0000-0000-0000-000000000002', 'user.read', '查看用户信息', 'user', 'read', true),
('70000000-0000-0000-0000-000000000003', 'user.update', '修改用户信息', 'user', 'update', true),
('70000000-0000-0000-0000-000000000004', 'user.delete', '删除用户', 'user', 'delete', true),
('70000000-0000-0000-0000-000000000005', 'role.create', '创建新角色', 'role', 'create', true),
('70000000-0000-0000-0000-000000000006', 'role.read', '查看角色信息', 'role', 'read', true),
('70000000-0000-0000-0000-000000000007', 'role.update', '修改角色信息', 'role', 'update', true),
('70000000-0000-0000-0000-000000000008', 'role.delete', '删除角色', 'role', 'delete', true),
('70000000-0000-0000-0000-000000000009', 'permission.create', '创建新权限', 'permission', 'create', true),
('70000000-0000-0000-0000-000000000010', 'permission.read', '查看权限信息', 'permission', 'read', true),
('70000000-0000-0000-0000-000000000011', 'permission.update', '修改权限信息', 'permission', 'update', true),
('70000000-0000-0000-0000-000000000012', 'permission.delete', '删除权限', 'permission', 'delete', true);

-- 事件查看权限 (1)
INSERT INTO permissions (id, name, description, resource, action, "isActive") VALUES
('80000000-0000-0000-0000-000000000001', 'event.read', '查看系统事件', 'event', 'read', true);

-- ============================================
-- 4. 配置角色权限
-- ============================================

-- 超级管理员 (admin) - 拥有所有权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions;

-- 普通用户 (user) - 基础权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions
WHERE name IN (
  -- 设备基础权限
  'device.create', 'device.read', 'device:read', 'device.update', 'device.delete', 'device.control',
  'device:app-operate', 'device:snapshot-create', 'device:snapshot-restore',
  -- 应用基础权限
  'app.read',
  -- 通知权限
  'notification.read', 'notification.update', 'notification.unread-count',
  'notification.preference-read', 'notification.preference-update',
  -- 代理基础权限
  'proxy.acquire', 'proxy.read', 'proxy:read', 'proxy.list', 'proxy.release',
  'proxy.stats', 'proxy:stats', 'proxy:session:create', 'proxy:session:read',
  'proxy:audit:my-logs',
  -- 短信基础权限
  'device:sms:request', 'device:sms:cancel', 'sms.request', 'sms.read', 'sms.cancel',
  -- 账单查看
  'billing:read', 'billing.read'
);

-- 租户管理员 (tenant_admin) - 租户内所有管理权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM permissions
WHERE name NOT IN (
  -- 排除系统级权限
  'permission.create', 'permission.update', 'permission.delete',
  'proxy:audit:sensitive:decrypt', 'proxy:audit:system-summary'
);

-- 部门管理员 (department_admin) - 部门级管理权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000004', id FROM permissions
WHERE name IN (
  -- 用户管理
  'user.create', 'user.read', 'user.update',
  -- 设备管理
  'device.create', 'device.read', 'device:read', 'device.update', 'device.delete',
  'device.control', 'device.manage', 'device:app-operate',
  'device:snapshot-create', 'device:snapshot-restore', 'device:snapshot-delete',
  -- 应用管理
  'app.read', 'app.create', 'app.update',
  -- 代理管理
  'proxy.acquire', 'proxy.assign', 'proxy.release', 'proxy.list', 'proxy.read', 'proxy:read',
  'proxy.stats', 'proxy:stats', 'proxy:device-group:create', 'proxy:device-group:read',
  'proxy:device-group:update', 'proxy:device-group:manage-devices',
  -- 报告查看
  'proxy:report:read', 'billing:read', 'billing.read',
  -- 审计日志
  'proxy:audit:read', 'proxy:audit:stats'
);

-- 运维工程师 (devops) - 系统运维权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000005', id FROM permissions
WHERE name IN (
  -- 查看所有资源
  'device.read', 'device:read', 'app.read', 'user.read', 'role.read', 'permission.read',
  -- 系统配置
  'proxy:config', 'proxy:admin', 'proxy:failover',
  -- 监控和统计
  'proxy.stats', 'proxy:stats', 'proxy:provider:stats', 'proxy:cost:stats',
  'proxy:audit:stats', 'proxy:audit:system-summary',
  -- 告警管理
  'proxy:alert:channel:create', 'proxy:alert:channel:read', 'proxy:alert:channel:update',
  'proxy:alert:rule:create', 'proxy:alert:rule:read', 'proxy:alert:rule:update',
  'proxy:alert:history:read', 'proxy:alert:acknowledge', 'proxy:alert:resolve', 'proxy:alert:stats',
  -- 审计
  'proxy:audit:read', 'proxy:audit:export', 'proxy:audit:user-activity',
  -- 短信系统
  'sms.provider-stats', 'sms.trigger-poll', 'sms:statistics:view'
);

-- 客服专员 (customer_service) - 客户支持权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000006', id FROM permissions
WHERE name IN (
  -- 查看权限
  'user.read', 'device.read', 'device:read', 'app.read',
  -- 基础操作
  'device.control', 'notification.create', 'notification.broadcast',
  -- 查看统计
  'billing:read', 'billing.read', 'proxy:audit:read'
);

-- 审核专员 (auditor) - 内容审核权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000007', id FROM permissions
WHERE name IN (
  -- 应用审核
  'app.read', 'app.approve', 'app.update',
  -- 审计查看
  'proxy:audit:read', 'proxy:audit:user-activity', 'proxy:audit:sensitive:read',
  'proxy:audit:sensitive:approve',
  -- 查看权限
  'user.read', 'device.read', 'device:read'
);

-- 财务专员 (finance) - 财务管理权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000008', id FROM permissions
WHERE name IN (
  -- 账单管理
  'billing:create', 'billing:read', 'billing:update', 'billing:delete', 'billing.read',
  -- 成本管理
  'proxy:cost:record', 'proxy:cost:budget', 'proxy:cost:stats', 'proxy:cost:alerts',
  'proxy:cost:optimize', 'proxy:cost:dashboard',
  -- 查看权限
  'user.read', 'device.read', 'device:read',
  -- 报告
  'proxy:report:read', 'proxy:report:export'
);

-- 会计 (accountant) - 财务查看权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000009', id FROM permissions
WHERE name IN (
  -- 查看账单
  'billing:read', 'billing.read',
  -- 查看成本
  'proxy:cost:stats', 'proxy:cost:dashboard',
  -- 查看报告
  'proxy:report:read'
);

-- VIP用户 (vip_user) - 增强的用户权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000010', id FROM permissions
WHERE name IN (
  -- 设备权限（包含快照）
  'device.create', 'device.read', 'device:read', 'device.update', 'device.delete',
  'device.control', 'device.manage', 'device:app-operate',
  'device:snapshot-create', 'device:snapshot-restore', 'device:snapshot-delete',
  -- 应用权限
  'app.read', 'app.create', 'app.update',
  -- 代理增强权限
  'proxy.acquire', 'proxy.assign', 'proxy.release', 'proxy.read', 'proxy:read',
  'proxy.list', 'proxy.stats', 'proxy:stats', 'proxy:recommend',
  'proxy:session:create', 'proxy:session:read', 'proxy:session:renew',
  'proxy:geo:configure', 'proxy:geo:read', 'proxy:geo:match', 'proxy:geo:recommend',
  -- 报告权限
  'proxy:report:create', 'proxy:report:read', 'proxy:report:download',
  -- 短信权限
  'device:sms:request', 'device:sms:cancel', 'sms.request', 'sms.read', 'sms.cancel',
  'sms.batch', 'sms.messages',
  -- 通知权限
  'notification.read', 'notification.update', 'notification.preference-read',
  'notification.preference-update', 'notification.unread-count',
  -- 账单查看
  'billing:read', 'billing.read'
);

-- 企业用户 (enterprise_user) - 企业级权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000011', id FROM permissions
WHERE name IN (
  -- 设备管理
  'device.create', 'device.read', 'device:read', 'device.update', 'device.delete',
  'device.control', 'device.manage', 'device:app-operate',
  'device:snapshot-create', 'device:snapshot-restore',
  -- 应用权限
  'app.read', 'app.create',
  -- 代理权限
  'proxy.acquire', 'proxy.assign', 'proxy.release', 'proxy.read', 'proxy:read',
  'proxy.list', 'proxy:device-group:create', 'proxy:device-group:read',
  'proxy:device-group:manage-devices',
  -- 短信权限
  'device:sms:request', 'device:sms:cancel', 'sms.request', 'sms.read',
  -- 通知权限
  'notification.read', 'notification.update', 'notification.preference-read',
  'notification.preference-update',
  -- 账单查看
  'billing:read', 'billing.read'
);

-- 开发者 (developer) - 应用开发权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000012', id FROM permissions
WHERE name IN (
  -- 应用完整权限
  'app.create', 'app.read', 'app.update', 'app.delete',
  -- 设备基础权限
  'device.create', 'device.read', 'device:read', 'device.control', 'device:app-operate',
  -- 通知权限
  'notification.read', 'notification.create',
  -- 查看统计
  'proxy.stats', 'proxy:stats'
);

-- 测试用户 (test_user) - 测试环境权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000013', id FROM permissions
WHERE name IN (
  -- 设备基础权限
  'device.create', 'device.read', 'device:read', 'device.control', 'device.delete',
  -- 应用查看
  'app.read',
  -- 代理基础权限
  'proxy.acquire', 'proxy.read', 'proxy:read', 'proxy.release'
);

-- 只读用户 (readonly_user) - 只读权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000014', id FROM permissions
WHERE name LIKE '%.read' OR name LIKE '%:read' OR name LIKE '%.stats' OR name LIKE '%:stats';

-- 访客 (guest) - 最低权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000015', id FROM permissions
WHERE name IN (
  'app.read',
  'notification.read'
);

-- 数据分析师 (data_analyst) - 数据分析权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000016', id FROM permissions
WHERE name IN (
  -- 查看所有统计
  'device.read', 'device:read', 'app.read', 'user.read',
  'billing:read', 'billing.read',
  'proxy.stats', 'proxy:stats', 'proxy:provider:stats', 'proxy:cost:stats',
  'proxy:audit:stats', 'proxy:audit:user-activity',
  'proxy:report:read', 'proxy:report:stats', 'proxy:report:create', 'proxy:report:export',
  'sms.stats', 'sms.provider-stats', 'sms:statistics:view',
  'notification.stats'
);

COMMIT;

-- ============================================
-- 验证脚本执行结果
-- ============================================

-- 检查权限数量
SELECT '权限总数：' as info, COUNT(*) as count FROM permissions;

-- 检查角色数量
SELECT '角色总数：' as info, COUNT(*) as count FROM roles;

-- 检查角色权限分配
SELECT
  r.name as role_name,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r."isSystem" = true
GROUP BY r.name
ORDER BY permission_count DESC;
