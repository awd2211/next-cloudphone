-- ========================================
-- 迁移: 为设备表添加代理字段
-- ========================================
-- 日期: 2025-11-02
-- 目的: 为每台云手机分配独立的家宽代理 IP
-- 服务: device-service
-- ========================================

-- 添加代理相关字段
ALTER TABLE devices ADD COLUMN IF NOT EXISTS proxy_id VARCHAR(255);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS proxy_host VARCHAR(255);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS proxy_port INTEGER;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS proxy_type VARCHAR(50) DEFAULT 'HTTP';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS proxy_username VARCHAR(255);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS proxy_password VARCHAR(255);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS proxy_country VARCHAR(2);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS proxy_assigned_at TIMESTAMP;

-- 创建索引（优化代理 ID 查询）
CREATE INDEX IF NOT EXISTS idx_devices_proxy_id ON devices(proxy_id);

-- 添加字段注释（文档化）
COMMENT ON COLUMN devices.proxy_id IS '代理 ID（proxy-service 分配）';
COMMENT ON COLUMN devices.proxy_host IS '代理主机地址';
COMMENT ON COLUMN devices.proxy_port IS '代理端口';
COMMENT ON COLUMN devices.proxy_type IS '代理类型 (HTTP/SOCKS5)';
COMMENT ON COLUMN devices.proxy_username IS '代理用户名（可选）';
COMMENT ON COLUMN devices.proxy_password IS '代理密码（加密存储）';
COMMENT ON COLUMN devices.proxy_country IS '代理国家代码 (如 US, CN, JP)';
COMMENT ON COLUMN devices.proxy_assigned_at IS '代理分配时间';

-- ========================================
-- 回滚脚本（如需回滚，单独执行）
-- ========================================
/*
-- 删除索引
DROP INDEX IF EXISTS idx_devices_proxy_id;

-- 删除字段
ALTER TABLE devices DROP COLUMN IF EXISTS proxy_id;
ALTER TABLE devices DROP COLUMN IF EXISTS proxy_host;
ALTER TABLE devices DROP COLUMN IF EXISTS proxy_port;
ALTER TABLE devices DROP COLUMN IF EXISTS proxy_type;
ALTER TABLE devices DROP COLUMN IF EXISTS proxy_username;
ALTER TABLE devices DROP COLUMN IF EXISTS proxy_password;
ALTER TABLE devices DROP COLUMN IF EXISTS proxy_country;
ALTER TABLE devices DROP COLUMN IF EXISTS proxy_assigned_at;
*/
