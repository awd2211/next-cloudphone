-- ================================================
-- 数据库索引优化脚本
-- 优化常用查询的性能
-- ================================================

-- ================================================
-- User Service 数据库优化
-- ================================================

\c cloudphone_user;

-- 用户表优化
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- 角色权限关联表
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_perm ON role_permissions(permission_id);

-- 权限表优化
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

-- 数据范围配置优化
CREATE INDEX IF NOT EXISTS idx_data_scopes_role ON data_scopes("roleId");
CREATE INDEX IF NOT EXISTS idx_data_scopes_resource ON data_scopes("resourceType");
CREATE INDEX IF NOT EXISTS idx_data_scopes_active ON data_scopes("isActive") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS idx_data_scopes_role_resource ON data_scopes("roleId", "resourceType");

-- 字段权限配置优化
CREATE INDEX IF NOT EXISTS idx_field_perms_role ON field_permissions("roleId");
CREATE INDEX IF NOT EXISTS idx_field_perms_resource ON field_permissions("resourceType");
CREATE INDEX IF NOT EXISTS idx_field_perms_operation ON field_permissions(operation);
CREATE INDEX IF NOT EXISTS idx_field_perms_active ON field_permissions("isActive") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS idx_field_perms_composite ON field_permissions("roleId", "resourceType", operation);

-- 审计日志优化
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_logs(user_id, created_at DESC);

-- API Keys 优化
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at DESC);

-- ================================================
-- Device Service 数据库优化
-- ================================================

\c cloudphone_device;

-- 设备表优化
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_user_status ON devices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_devices_node ON devices(node_id) WHERE node_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_created_at ON devices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devices_last_active ON devices(last_active_at DESC) WHERE last_active_at IS NOT NULL;

-- 设备模板优化
CREATE INDEX IF NOT EXISTS idx_templates_user ON device_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON device_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_templates_usage_count ON device_templates(usage_count DESC);

-- 快照优化
CREATE INDEX IF NOT EXISTS idx_snapshots_device ON device_snapshots(device_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_user ON device_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON device_snapshots(created_at DESC);

-- 节点优化
CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_nodes_capacity ON nodes(available_cpu_cores, available_memory_mb);

-- ================================================
-- App Service 数据库优化
-- ================================================

\c cloudphone_app;

-- 应用表优化
CREATE INDEX IF NOT EXISTS idx_apps_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_apps_package ON applications(package_name);
CREATE INDEX IF NOT EXISTS idx_apps_category ON applications(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apps_created_at ON applications(created_at DESC);

-- 应用安装记录优化
CREATE INDEX IF NOT EXISTS idx_app_installs_device ON application_installs(device_id);
CREATE INDEX IF NOT EXISTS idx_app_installs_app ON application_installs(application_id);
CREATE INDEX IF NOT EXISTS idx_app_installs_status ON application_installs(status);

-- ================================================
-- Billing Service 数据库优化
-- ================================================

\c cloudphone_billing;

-- 订单表优化
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);

-- 账单表优化
CREATE INDEX IF NOT EXISTS idx_billing_user ON billing_records(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_device ON billing_records(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_period ON billing_records(billing_period);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing_records(status);
CREATE INDEX IF NOT EXISTS idx_billing_user_period ON billing_records(user_id, billing_period DESC);

-- 支付记录优化
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- 计量记录优化
CREATE INDEX IF NOT EXISTS idx_metering_device ON metering_records(device_id);
CREATE INDEX IF NOT EXISTS idx_metering_user ON metering_records(user_id);
CREATE INDEX IF NOT EXISTS idx_metering_time ON metering_records(start_time DESC, end_time DESC);
CREATE INDEX IF NOT EXISTS idx_metering_device_time ON metering_records(device_id, start_time DESC);

-- 套餐表优化
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_plans_price ON plans(price);

-- ================================================
-- 分析和统计
-- ================================================

-- 查看表大小
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- 查看索引使用情况
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 20;

-- 查看缺少索引的表（慢查询）
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / seq_scan as avg_seq_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_scan DESC
LIMIT 10;

