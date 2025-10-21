-- 数据库表迁移脚本
-- 从 cloudphone_core 迁移到各个独立数据库

-- ========================================
-- 1. 迁移 User Service 数据
-- ========================================
\c cloudphone_user

-- 复制表结构和数据
CREATE TABLE users AS TABLE cloudphone_core.users WITH DATA;
CREATE TABLE roles AS TABLE cloudphone_core.roles WITH DATA;
CREATE TABLE permissions AS TABLE cloudphone_core.permissions WITH DATA;
CREATE TABLE user_roles AS TABLE cloudphone_core.user_roles WITH DATA;
CREATE TABLE role_permissions AS TABLE cloudphone_core.role_permissions WITH DATA;
CREATE TABLE data_scopes AS TABLE cloudphone_core.data_scopes WITH DATA;
CREATE TABLE field_permissions AS TABLE cloudphone_core.field_permissions WITH DATA;
CREATE TABLE api_keys AS TABLE cloudphone_core.api_keys WITH DATA;
CREATE TABLE audit_logs AS TABLE cloudphone_core.audit_logs WITH DATA;
CREATE TABLE quotas AS TABLE cloudphone_core.quotas WITH DATA;
CREATE TABLE tickets AS TABLE cloudphone_core.tickets WITH DATA;
CREATE TABLE ticket_replies AS TABLE cloudphone_core.ticket_replies WITH DATA;

\echo '✅ User Service 表迁移完成'

-- ========================================
-- 2. 迁移 Device Service 数据  
-- ========================================
\c cloudphone_device

CREATE TABLE devices AS TABLE cloudphone_core.devices WITH DATA;
CREATE TABLE nodes AS TABLE cloudphone_core.nodes WITH DATA;
CREATE TABLE device_templates AS TABLE cloudphone_core.device_templates WITH DATA;
CREATE TABLE device_snapshots AS TABLE cloudphone_core.device_snapshots WITH DATA;

\echo '✅ Device Service 表迁移完成'

-- ========================================
-- 3. 迁移 App Service 数据
-- ========================================
\c cloudphone_app

CREATE TABLE applications AS TABLE cloudphone_core.applications WITH DATA;
CREATE TABLE device_applications AS TABLE cloudphone_core.device_applications WITH DATA;

\echo '✅ App Service 表迁移完成'

-- ========================================
-- 4. 迁移 Notification Service 数据
-- ========================================
\c cloudphone_notification

CREATE TABLE notifications AS TABLE cloudphone_core.notifications WITH DATA;

\echo '✅ Notification Service 表迁移完成'

-- ========================================
-- 注意事项
-- ========================================
-- 1. 这个脚本只复制表结构和数据
-- 2. 索引、约束、序列需要单独处理
-- 3. 外键约束暂不创建（微服务模式）
-- 4. cloudphone_core 保留作为备份
-- 5. cloudphone_billing 不需要迁移（已独立）

