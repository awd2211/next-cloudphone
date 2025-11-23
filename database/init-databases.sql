-- CloudPhone Platform Database Initialization
-- 云手机平台数据库初始化脚本
-- 为每个微服务创建独立的数据库

-- 创建用户服务数据库
SELECT 'CREATE DATABASE cloudphone_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloudphone_user')\gexec

-- 创建设备服务数据库
SELECT 'CREATE DATABASE cloudphone_device'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloudphone_device')\gexec

-- 创建应用服务数据库
SELECT 'CREATE DATABASE cloudphone_app'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloudphone_app')\gexec

-- 创建计费服务数据库
SELECT 'CREATE DATABASE cloudphone_billing'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloudphone_billing')\gexec

-- 创建通知服务数据库
SELECT 'CREATE DATABASE cloudphone_notification'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloudphone_notification')\gexec

-- 创建调度服务数据库
SELECT 'CREATE DATABASE cloudphone_scheduler'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloudphone_scheduler')\gexec

-- 创建SMS接收服务数据库
SELECT 'CREATE DATABASE cloudphone_sms'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloudphone_sms')\gexec

-- 创建代理服务数据库
SELECT 'CREATE DATABASE cloudphone_proxy'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloudphone_proxy')\gexec

-- 创建在线客服服务数据库
SELECT 'CREATE DATABASE cloudphone_livechat'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloudphone_livechat')\gexec

-- 输出创建结果
\echo '================================'
\echo 'Database initialization complete'
\echo '================================'
\echo 'Created databases:'
\echo '  - cloudphone_user (User Service)'
\echo '  - cloudphone_device (Device Service)'
\echo '  - cloudphone_app (App Service)'
\echo '  - cloudphone_billing (Billing Service)'
\echo '  - cloudphone_notification (Notification Service)'
\echo '  - cloudphone_scheduler (Scheduler Service)'
\echo '  - cloudphone_sms (SMS Receive Service)'
\echo '  - cloudphone_proxy (Proxy Service)'
\echo '  - cloudphone_livechat (LiveChat Service)'
\echo '================================'

