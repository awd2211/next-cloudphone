-- ========================================
-- 数据库拆分脚本
-- 创建日期: 2025-10-21
-- 目的: 将单一数据库拆分为多个独立数据库
-- ========================================

-- 创建核心业务数据库
CREATE DATABASE cloudphone_core;

-- 创建计费数据库
CREATE DATABASE cloudphone_billing;

-- 创建分析数据库（未来使用）
CREATE DATABASE cloudphone_analytics;

-- 连接到核心数据库
\c cloudphone_core

-- 从原数据库复制核心业务表
-- Users
CREATE TABLE users AS SELECT * FROM cloudphone.users;
CREATE TABLE roles AS SELECT * FROM cloudphone.roles;
CREATE TABLE permissions AS SELECT * FROM cloudphone.permissions;
CREATE TABLE role_permissions AS SELECT * FROM cloudphone.role_permissions;
CREATE TABLE user_roles AS SELECT * FROM cloudphone.user_roles;

-- Devices
CREATE TABLE devices AS SELECT * FROM cloudphone.devices;
CREATE TABLE device_templates AS SELECT * FROM cloudphone.device_templates WHERE 1=0; -- 仅结构
CREATE TABLE device_snapshots AS SELECT * FROM cloudphone.device_snapshots WHERE 1=0;

-- Applications
CREATE TABLE applications AS SELECT * FROM cloudphone.applications;
CREATE TABLE device_applications AS SELECT * FROM cloudphone.device_applications;

-- Notifications
CREATE TABLE notifications AS SELECT * FROM cloudphone.notifications WHERE 1=0;

-- 连接到计费数据库
\c cloudphone_billing

-- 从原数据库复制计费相关表
CREATE TABLE plans AS SELECT * FROM cloudphone.plans;
CREATE TABLE orders AS SELECT * FROM cloudphone.orders;
CREATE TABLE usage_records AS SELECT * FROM cloudphone.usage_records;
CREATE TABLE payments AS SELECT * FROM cloudphone.payments;
CREATE TABLE invoices AS SELECT * FROM cloudphone.invoices WHERE 1=0;
CREATE TABLE billing_rules AS SELECT * FROM cloudphone.billing_rules WHERE 1=0;
CREATE TABLE user_balances AS SELECT * FROM cloudphone.user_balances WHERE 1=0;

-- 连接到分析数据库
\c cloudphone_analytics

-- 创建分析表结构（暂时为空）
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  user_id UUID,
  device_id UUID,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_device ON analytics_events(device_id);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);

COMMENT ON DATABASE cloudphone_core IS '核心业务数据库 - 用户、设备、应用';
COMMENT ON DATABASE cloudphone_billing IS '计费数据库 - 订单、支付、计量';
COMMENT ON DATABASE cloudphone_analytics IS '数据分析库 - 事件追踪、报表';

