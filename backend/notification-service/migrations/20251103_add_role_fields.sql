-- Migration: Add role-based notification fields
-- Date: 2025-11-03
-- Description: Add target_roles, exclude_roles, priority, and role_specific_data columns to notification_templates

-- Add target_roles column (array of role names that should receive this template)
ALTER TABLE notification_templates
ADD COLUMN IF NOT EXISTS target_roles TEXT[] DEFAULT '{}';

-- Add exclude_roles column (array of role names that should NOT receive this template)
ALTER TABLE notification_templates
ADD COLUMN IF NOT EXISTS exclude_roles TEXT[] DEFAULT '{}';

-- Add priority column (higher priority templates are selected first when multiple match)
ALTER TABLE notification_templates
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- Add role_specific_data column (JSON data for role-specific template variables)
ALTER TABLE notification_templates
ADD COLUMN IF NOT EXISTS role_specific_data JSONB;

-- Create GIN index on target_roles for efficient role-based lookups
CREATE INDEX IF NOT EXISTS idx_notification_templates_target_roles
ON notification_templates USING GIN (target_roles);

-- Create index on exclude_roles for efficient filtering
CREATE INDEX IF NOT EXISTS idx_notification_templates_exclude_roles
ON notification_templates USING GIN (exclude_roles);

-- Create index on priority for efficient sorting
CREATE INDEX IF NOT EXISTS idx_notification_templates_priority
ON notification_templates (priority DESC);

-- Create composite index for type + priority (common query pattern)
CREATE INDEX IF NOT EXISTS idx_notification_templates_type_priority
ON notification_templates (type, priority DESC)
WHERE is_active = true;

-- Add comment to document the purpose of new columns
COMMENT ON COLUMN notification_templates.target_roles IS '目标角色列表：只有这些角色会收到此模板的通知。空数组表示所有角色都可以收到';
COMMENT ON COLUMN notification_templates.exclude_roles IS '排除角色列表：这些角色不会收到此模板的通知，优先级高于 target_roles';
COMMENT ON COLUMN notification_templates.priority IS '模板优先级：当多个模板匹配时，选择优先级最高的。默认 0，建议范围 0-100';
COMMENT ON COLUMN notification_templates.role_specific_data IS '角色专属数据：用于存储不同角色需要的特定变量和配置';

-- Example role-specific template data structure:
-- {
--   "super_admin": {
--     "showSystemStats": true,
--     "showTechnicalDetails": true,
--     "includeAllTenants": true
--   },
--   "tenant_admin": {
--     "showTenantStats": true,
--     "showTechnicalDetails": false,
--     "tenantScope": true
--   },
--   "user": {
--     "showSimplifiedView": true,
--     "hideSystemDetails": true
--   }
-- }
