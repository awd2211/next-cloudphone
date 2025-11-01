-- 添加 permissions 表缺失的列
-- 修复 TypeORM 实体与数据库架构不匹配的问题

-- 1. 添加 conditions 列（JSONB，用于存储权限条件）
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS conditions JSONB;

-- 2. 添加 scope 列（数据权限范围）
DO $$ BEGIN
  CREATE TYPE datascope_type_enum AS ENUM('all', 'tenant', 'department', 'self', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE permissions ADD COLUMN IF NOT EXISTS scope datascope_type_enum DEFAULT 'tenant';

-- 3. 添加 dataFilter 列（自定义数据过滤规则）
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS "dataFilter" JSONB;

-- 4. 添加 fieldRules 列（字段级权限规则）
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS "fieldRules" JSONB;

-- 5. 添加 metadata 列（扩展元数据）
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 6. 添加 isActive 列（是否激活）
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

-- 完成
SELECT 'Permission columns migration completed successfully' as status;
