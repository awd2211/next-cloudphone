-- 添加权限系统所需的字段和表

-- 1. 扩展 permissions 表
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS scope VARCHAR(50) DEFAULT 'tenant';
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS "dataFilter" JSONB;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS "fieldRules" JSONB;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

-- 2. 创建数据范围表
CREATE TABLE IF NOT EXISTS data_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roleId" UUID NOT NULL,
    "resourceType" VARCHAR(255) NOT NULL,
    "scopeType" VARCHAR(50) NOT NULL DEFAULT 'tenant',
    filter JSONB,
    "departmentIds" TEXT[],
    "includeSubDepartments" BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,
    "isActive" BOOLEAN DEFAULT true,
    description TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("roleId", "resourceType")
);

-- 3. 创建字段权限表
CREATE TABLE IF NOT EXISTS field_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roleId" UUID NOT NULL,
    "resourceType" VARCHAR(255) NOT NULL,
    operation VARCHAR(50) NOT NULL,
    "hiddenFields" TEXT[],
    "readOnlyFields" TEXT[],
    "writableFields" TEXT[],
    "requiredFields" TEXT[],
    "fieldAccessMap" JSONB,
    "fieldTransforms" JSONB,
    description TEXT,
    priority INTEGER DEFAULT 100,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("roleId", "resourceType", operation)
);

-- 4. 扩展 users 表
ALTER TABLE users ADD COLUMN IF NOT EXISTS "departmentId" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "dataScope" VARCHAR(50) DEFAULT 'tenant';
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN DEFAULT false;

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS idx_data_scopes_role ON data_scopes("roleId");
CREATE INDEX IF NOT EXISTS idx_data_scopes_resource ON data_scopes("resourceType");
CREATE INDEX IF NOT EXISTS idx_field_permissions_role ON field_permissions("roleId");
CREATE INDEX IF NOT EXISTS idx_field_permissions_resource ON field_permissions("resourceType");
CREATE INDEX IF NOT EXISTS idx_users_department ON users("departmentId");
CREATE INDEX IF NOT EXISTS idx_users_super_admin ON users("isSuperAdmin");

-- 6. 添加注释
COMMENT ON TABLE data_scopes IS '数据范围配置表';
COMMENT ON TABLE field_permissions IS '字段权限配置表';
COMMENT ON COLUMN permissions.scope IS '数据范围类型';
COMMENT ON COLUMN permissions."dataFilter" IS '数据过滤器（JSONB）';
COMMENT ON COLUMN permissions."fieldRules" IS '字段规则（JSONB）';
COMMENT ON COLUMN permissions.metadata IS '元数据（JSONB）';
COMMENT ON COLUMN users."departmentId" IS '部门ID';
COMMENT ON COLUMN users."dataScope" IS '数据范围';
COMMENT ON COLUMN users."isSuperAdmin" IS '是否超级管理员';
