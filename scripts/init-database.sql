-- 云手机平台数据库初始化脚本
-- PostgreSQL 14+

-- 创建数据库（如果不存在）
-- CREATE DATABASE cloudphone;

-- 连接到数据库
\c cloudphone

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- 用于文本搜索

-- =====================================================
-- 租户表 (多租户支持)
-- =====================================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    plan VARCHAR(50) DEFAULT 'free', -- 'free' | 'basic' | 'premium' | 'enterprise'
    status VARCHAR(20) DEFAULT 'active', -- 'active' | 'suspended' | 'cancelled'
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 用户表
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user', -- 'admin' | 'user' | 'operator'
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active', -- 'active' | 'inactive' | 'banned'
    avatar_url TEXT,
    metadata JSONB DEFAULT '{}',
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- 设备表
-- =====================================================
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'offline', -- 'online' | 'offline' | 'busy' | 'error' | 'maintenance'
    android_version VARCHAR(20),
    cpu VARCHAR(50),
    memory VARCHAR(20),
    storage VARCHAR(20),
    ip_address INET,
    port INTEGER,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    current_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    node_id VARCHAR(100), -- Kubernetes 节点 ID
    container_id VARCHAR(100), -- 容器 ID
    specs JSONB DEFAULT '{}', -- 其他规格信息
    metadata JSONB DEFAULT '{}',
    last_heartbeat_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_devices_tenant_id ON devices(tenant_id);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_current_user_id ON devices(current_user_id);

-- =====================================================
-- 应用表
-- =====================================================
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    package_name VARCHAR(200) UNIQUE NOT NULL,
    version VARCHAR(20),
    icon_url TEXT,
    apk_url TEXT NOT NULL,
    size BIGINT, -- 文件大小（字节）
    downloads INTEGER DEFAULT 0,
    category VARCHAR(50), -- 应用分类
    description TEXT,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false, -- 是否公开（应用市场）
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_applications_tenant_id ON applications(tenant_id);
CREATE INDEX idx_applications_package_name ON applications(package_name);
CREATE INDEX idx_applications_category ON applications(category);

-- =====================================================
-- 设备应用关联表（已安装的应用）
-- =====================================================
CREATE TABLE IF NOT EXISTS device_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'installed', -- 'installed' | 'uninstalled' | 'failed'
    installed_at TIMESTAMP DEFAULT NOW(),
    uninstalled_at TIMESTAMP,
    UNIQUE(device_id, application_id)
);

CREATE INDEX idx_device_apps_device_id ON device_applications(device_id);
CREATE INDEX idx_device_apps_app_id ON device_applications(application_id);

-- =====================================================
-- 计费套餐表
-- =====================================================
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'hourly' | 'daily' | 'monthly' | 'yearly'
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 订单表
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'paid' | 'cancelled' | 'refunded'
    payment_method VARCHAR(50), -- 'alipay' | 'wechat' | 'stripe' | etc.
    transaction_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_orders_status ON orders(status);

-- =====================================================
-- 使用记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration INTEGER DEFAULT 0, -- 使用时长（秒）
    cost DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- 'active' | 'completed'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX idx_usage_records_device_id ON usage_records(device_id);
CREATE INDEX idx_usage_records_tenant_id ON usage_records(tenant_id);
CREATE INDEX idx_usage_records_start_time ON usage_records(start_time);

-- =====================================================
-- 审计日志表
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'create' | 'update' | 'delete' | 'login' | etc.
    resource_type VARCHAR(50), -- 'device' | 'app' | 'user' | etc.
    resource_id UUID,
    changes JSONB, -- 变更内容
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- =====================================================
-- 插入初始数据
-- =====================================================

-- 创建默认租户
INSERT INTO tenants (id, name, plan, status) VALUES
('00000000-0000-0000-0000-000000000001', '默认租户', 'enterprise', 'active')
ON CONFLICT DO NOTHING;

-- 创建管理员用户（密码: admin123，需要使用 bcrypt 加密）
-- 注意：这里的密码 hash 仅用于演示，实际应用中应该通过 API 注册
INSERT INTO users (username, email, password_hash, role, tenant_id) VALUES
('admin', 'admin@cloudphone.com', '$2b$10$YourBcryptHashHere', 'admin', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (username) DO NOTHING;

-- 创建默认计费套餐
INSERT INTO plans (name, description, price, billing_cycle, features, is_active) VALUES
('免费套餐', '每月 10 小时免费使用', 0, 'monthly', '{"hours": 10, "devices": 1}', true),
('基础套餐', '每月 100 小时使用时长', 99, 'monthly', '{"hours": 100, "devices": 2}', true),
('专业套餐', '每月 500 小时使用时长', 399, 'monthly', '{"hours": 500, "devices": 5}', true),
('企业套餐', '不限时长，专属支持', 999, 'monthly', '{"hours": -1, "devices": 20}', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 创建更新时间触发器
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有包含 updated_at 的表创建触发器
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 完成
-- =====================================================
\echo '数据库初始化完成！'
