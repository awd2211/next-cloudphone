-- LiveChat Service Initial Schema
-- Version: 1.0.0
-- Description: 在线客服系统初始表结构

-- ========================================
-- 客服表
-- ========================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  name VARCHAR(255) NOT NULL,
  avatar VARCHAR(500),
  email VARCHAR(255),
  phone VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'offline',
  max_concurrent_chats INTEGER NOT NULL DEFAULT 5,
  current_chat_count INTEGER NOT NULL DEFAULT 0,
  skills TEXT[] DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_active_at TIMESTAMP,
  total_conversations INTEGER NOT NULL DEFAULT 0,
  total_messages INTEGER NOT NULL DEFAULT 0,
  avg_rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  avg_response_time INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_tenant_id ON agents(tenant_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_skills ON agents USING GIN(skills);

-- ========================================
-- 客服分组表
-- ========================================
CREATE TABLE IF NOT EXISTS agent_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  skills TEXT[] DEFAULT '{}',
  working_hours JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_groups_tenant_id ON agent_groups(tenant_id);

-- ========================================
-- 会话表
-- ========================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  user_id UUID NOT NULL,
  agent_id UUID,
  status VARCHAR(50) NOT NULL DEFAULT 'waiting',
  priority VARCHAR(50) NOT NULL DEFAULT 'normal',
  channel VARCHAR(50) NOT NULL DEFAULT 'web',
  subject VARCHAR(500),
  summary TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  assigned_at TIMESTAMP,
  first_response_at TIMESTAMP,
  last_message_at TIMESTAMP,
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,
  unread_count INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
);

CREATE INDEX idx_conversations_tenant_id ON conversations(tenant_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- ========================================
-- 消息表
-- ========================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  sender_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL DEFAULT 'text',
  encrypted BOOLEAN NOT NULL DEFAULT false,
  attachments JSONB,
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- ========================================
-- 队列配置表
-- ========================================
CREATE TABLE IF NOT EXISTS queue_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  routing_strategy VARCHAR(50) NOT NULL DEFAULT 'ROUND_ROBIN',
  max_wait_time INTEGER NOT NULL DEFAULT 300,
  priority INTEGER NOT NULL DEFAULT 0,
  skills TEXT[] DEFAULT '{}',
  working_hours JSONB,
  overflow_queue_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_queue_configs_tenant_id ON queue_configs(tenant_id);

-- ========================================
-- 队列项表
-- ========================================
CREATE TABLE IF NOT EXISTS queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  priority INTEGER NOT NULL DEFAULT 0,
  required_skills TEXT[] DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'waiting',
  position INTEGER NOT NULL DEFAULT 0,
  entered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  assigned_at TIMESTAMP,
  timeout_at TIMESTAMP,
  retry_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  FOREIGN KEY (queue_id) REFERENCES queue_configs(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_queue_items_queue_id ON queue_items(queue_id);
CREATE INDEX idx_queue_items_status ON queue_items(status);
CREATE INDEX idx_queue_items_tenant_id ON queue_items(tenant_id);

-- ========================================
-- 快捷回复表
-- ========================================
CREATE TABLE IF NOT EXISTS canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  agent_id UUID,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  shortcut VARCHAR(50),
  category VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  use_count INTEGER NOT NULL DEFAULT 0,
  is_global BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
);

CREATE INDEX idx_canned_responses_tenant_id ON canned_responses(tenant_id);
CREATE INDEX idx_canned_responses_agent_id ON canned_responses(agent_id);
CREATE INDEX idx_canned_responses_shortcut ON canned_responses(shortcut);

-- ========================================
-- 满意度评分表
-- ========================================
CREATE TABLE IF NOT EXISTS satisfaction_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_satisfaction_ratings_agent_id ON satisfaction_ratings(agent_id);
CREATE INDEX idx_satisfaction_ratings_tenant_id ON satisfaction_ratings(tenant_id);

-- ========================================
-- 质检评分表
-- ========================================
CREATE TABLE IF NOT EXISTS quality_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  criteria JSONB,
  comments TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_quality_reviews_agent_id ON quality_reviews(agent_id);
CREATE INDEX idx_quality_reviews_tenant_id ON quality_reviews(tenant_id);

-- ========================================
-- 敏感词表
-- ========================================
CREATE TABLE IF NOT EXISTS sensitive_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  word VARCHAR(255) NOT NULL,
  level VARCHAR(50) NOT NULL DEFAULT 'warning',
  category VARCHAR(100),
  action VARCHAR(50) NOT NULL DEFAULT 'flag',
  replacement VARCHAR(255),
  is_regex BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sensitive_words_tenant_id ON sensitive_words(tenant_id);
CREATE INDEX idx_sensitive_words_level ON sensitive_words(level);
CREATE UNIQUE INDEX idx_sensitive_words_unique ON sensitive_words(tenant_id, word);

-- ========================================
-- 消息归档表
-- ========================================
CREATE TABLE IF NOT EXISTS message_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  messages JSONB NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  archived_at TIMESTAMP NOT NULL DEFAULT NOW(),
  archived_by VARCHAR(255),
  storage_path VARCHAR(500),
  checksum VARCHAR(64)
);

CREATE INDEX idx_message_archives_conversation_id ON message_archives(conversation_id);
CREATE INDEX idx_message_archives_tenant_id ON message_archives(tenant_id);
CREATE INDEX idx_message_archives_archived_at ON message_archives(archived_at DESC);

-- ========================================
-- 客服与分组关联表
-- ========================================
CREATE TABLE IF NOT EXISTS agent_group_members (
  agent_id UUID NOT NULL,
  group_id UUID NOT NULL,
  PRIMARY KEY (agent_id, group_id),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES agent_groups(id) ON DELETE CASCADE
);

-- ========================================
-- 完成提示
-- ========================================
DO $$
BEGIN
  RAISE NOTICE 'LiveChat Service schema created successfully!';
  RAISE NOTICE 'Tables: agents, agent_groups, conversations, messages, queue_configs, queue_items, canned_responses, satisfaction_ratings, quality_reviews, sensitive_words, message_archives';
END $$;
