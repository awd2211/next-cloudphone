-- =============================================
-- SMS Receive Service Database Initialization
-- =============================================

-- Create database if not exists
SELECT 'CREATE DATABASE cloudphone_sms'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloudphone_sms');

-- Connect to the database
\c cloudphone_sms

-- =============================================
-- Table 1: Virtual Numbers
-- =============================================
CREATE TABLE IF NOT EXISTS virtual_numbers (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provider Information
  provider VARCHAR(50) NOT NULL,
  provider_activation_id VARCHAR(100) NOT NULL,

  -- Phone Number Information
  phone_number VARCHAR(20) NOT NULL,
  country_code VARCHAR(5) NOT NULL,
  country_name VARCHAR(100),

  -- Service Information
  service_code VARCHAR(50) NOT NULL,
  service_name VARCHAR(100),

  -- Status Management
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  -- active, waiting_sms, received, completed, cancelled, expired

  -- Cost Information
  cost DECIMAL(10, 4) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',

  -- Device Association
  device_id UUID,
  user_id UUID,

  -- Rental Support
  rental_type VARCHAR(20) DEFAULT 'one_time',
  rental_start TIMESTAMP,
  rental_end TIMESTAMP,
  rental_sms_count INT DEFAULT 0,

  -- Number Pool Association
  from_pool BOOLEAN DEFAULT FALSE,
  pool_id UUID,

  -- Smart Routing Information
  selected_by_algorithm VARCHAR(50),
  fallback_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  activated_at TIMESTAMP,
  sms_received_at TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Metadata
  metadata JSONB,

  -- Constraints
  CONSTRAINT unique_provider_activation UNIQUE(provider, provider_activation_id)
);

-- Indexes for virtual_numbers
CREATE INDEX IF NOT EXISTS idx_virtual_numbers_status ON virtual_numbers(status);
CREATE INDEX IF NOT EXISTS idx_virtual_numbers_device_id ON virtual_numbers(device_id);
CREATE INDEX IF NOT EXISTS idx_virtual_numbers_created_at ON virtual_numbers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_virtual_numbers_expires_at ON virtual_numbers(expires_at);
CREATE INDEX IF NOT EXISTS idx_virtual_numbers_rental_type ON virtual_numbers(rental_type);

-- =============================================
-- Table 2: SMS Messages
-- =============================================
CREATE TABLE IF NOT EXISTS sms_messages (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Key
  virtual_number_id UUID NOT NULL REFERENCES virtual_numbers(id) ON DELETE CASCADE,

  -- SMS Content
  message_text TEXT,
  verification_code VARCHAR(20),
  sender VARCHAR(50),

  -- Delivery Status
  delivered_to_device BOOLEAN DEFAULT FALSE,

  -- Timestamps
  received_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP
);

-- Indexes for sms_messages
CREATE INDEX IF NOT EXISTS idx_sms_messages_virtual_number_id ON sms_messages(virtual_number_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_received_at ON sms_messages(received_at DESC);

-- =============================================
-- Table 3: Provider Configs
-- =============================================
CREATE TABLE IF NOT EXISTS provider_configs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Platform Information
  provider VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),

  -- API Configuration
  api_endpoint VARCHAR(255) NOT NULL,
  api_key TEXT NOT NULL,
  api_key_encrypted BOOLEAN DEFAULT TRUE,

  -- Balance Information
  balance DECIMAL(10, 2),
  balance_threshold DECIMAL(10, 2) DEFAULT 10.00,
  last_balance_check TIMESTAMP,

  -- Priority and Rate Limiting
  priority INT DEFAULT 1,
  rate_limit_per_minute INT DEFAULT 60,
  rate_limit_per_second INT DEFAULT 10,
  concurrent_requests_limit INT DEFAULT 50,

  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  health_status VARCHAR(20) DEFAULT 'healthy',
  last_health_check TIMESTAMP,

  -- Statistics
  total_requests BIGINT DEFAULT 0,
  total_success BIGINT DEFAULT 0,
  total_failures BIGINT DEFAULT 0,

  -- Smart Routing Weights
  cost_weight DECIMAL(3, 2) DEFAULT 0.4,
  speed_weight DECIMAL(3, 2) DEFAULT 0.3,
  success_rate_weight DECIMAL(3, 2) DEFAULT 0.3,

  -- Alert Configuration
  alert_enabled BOOLEAN DEFAULT TRUE,
  alert_channels JSONB,
  alert_recipients JSONB,

  -- Performance Metrics
  avg_sms_receive_time INT,
  p95_sms_receive_time INT,
  last_success_rate DECIMAL(5, 2),

  -- WebHook Support
  webhook_enabled BOOLEAN DEFAULT FALSE,
  webhook_url VARCHAR(255),
  webhook_secret VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Metadata
  metadata JSONB
);

-- =============================================
-- Table 4: Number Pool
-- =============================================
CREATE TABLE IF NOT EXISTS number_pool (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provider Information
  provider VARCHAR(50) NOT NULL,
  provider_activation_id VARCHAR(100) NOT NULL,

  -- Phone Number Information
  phone_number VARCHAR(20) NOT NULL,
  country_code VARCHAR(5) NOT NULL,
  service_code VARCHAR(50) NOT NULL,

  -- Cost
  cost DECIMAL(10, 4) NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'available',
  reserved_by_device UUID,
  reserved_at TIMESTAMP,

  -- Preheat Strategy
  preheated BOOLEAN DEFAULT FALSE,
  preheated_at TIMESTAMP,
  priority INT DEFAULT 0,

  -- Usage Statistics
  reserved_count INT DEFAULT 0,
  used_count INT DEFAULT 0,

  -- Cost Optimization
  bulk_purchased BOOLEAN DEFAULT FALSE,
  discount_rate DECIMAL(5, 2) DEFAULT 0.00,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

-- Indexes for number_pool
CREATE INDEX IF NOT EXISTS idx_number_pool_status_service ON number_pool(status, service_code);
CREATE INDEX IF NOT EXISTS idx_number_pool_expires_at ON number_pool(expires_at);

-- =============================================
-- Initial Data: Provider Configs
-- =============================================
INSERT INTO provider_configs (
  provider, display_name, api_endpoint, api_key, priority, enabled
) VALUES
  ('sms-activate', 'SMS-Activate', 'https://api.sms-activate.io/stubs/handler_api.php', '', 1, TRUE),
  ('5sim', '5sim', 'https://5sim.net/v1', '', 2, FALSE),
  ('smspool', 'SMSPool', 'https://api.smspool.net', '', 3, FALSE)
ON CONFLICT (provider) DO NOTHING;

-- =============================================
-- Views and Functions
-- =============================================

-- View: Active numbers summary
CREATE OR REPLACE VIEW active_numbers_summary AS
SELECT
  provider,
  country_code,
  service_code,
  COUNT(*) as total_count,
  SUM(CASE WHEN status = 'waiting_sms' THEN 1 ELSE 0 END) as waiting_count,
  SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as received_count,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
  SUM(cost) as total_cost,
  AVG(EXTRACT(EPOCH FROM (sms_received_at - activated_at))) as avg_receive_time_seconds
FROM virtual_numbers
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY provider, country_code, service_code;

-- Function: Update provider statistics on number completion
CREATE OR REPLACE FUNCTION update_provider_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE provider_configs
    SET
      total_success = total_success + 1,
      total_requests = total_requests + 1,
      last_success_rate = (
        SELECT CAST(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS DECIMAL) /
               NULLIF(COUNT(*), 0) * 100
        FROM virtual_numbers
        WHERE provider = NEW.provider
          AND created_at > NOW() - INTERVAL '24 hours'
      )
    WHERE provider = NEW.provider;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update provider stats
DROP TRIGGER IF EXISTS trigger_update_provider_stats ON virtual_numbers;
CREATE TRIGGER trigger_update_provider_stats
AFTER UPDATE OF status ON virtual_numbers
FOR EACH ROW
EXECUTE FUNCTION update_provider_stats();

-- =============================================
-- Completion Message
-- =============================================
SELECT 'SMS Receive Service database initialized successfully!' as message;
