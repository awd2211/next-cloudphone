-- 完整的基线迁移脚本
-- 创建所有核心表
-- 优先级：0 (必须第一个执行)

-- 1. 创建 roles 表
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description VARCHAR(255),
  "tenantId" VARCHAR(255),
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_648e3f5447f725579d7d4ffdfb" ON roles (name);
CREATE INDEX IF NOT EXISTS "IDX_c954ae3b1156e075ccd4e9ce3e" ON roles ("tenantId");

-- 2. 创建 permissions 表
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description VARCHAR(255),
  resource VARCHAR(255),
  action VARCHAR(255),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_48ce552495d14eae9b187bb671" ON permissions (name);
CREATE INDEX IF NOT EXISTS "IDX_89456a09b598ce8915c702c528" ON permissions (resource);

-- 3. 创建 users 表
-- 创建枚举类型（如果不存在）
DO $$ BEGIN
  CREATE TYPE users_status_enum AS ENUM('active', 'inactive', 'suspended', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE users_datascope_enum AS ENUM('all', 'tenant', 'department', 'self');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  "fullName" VARCHAR(255),
  avatar VARCHAR(255),
  phone VARCHAR(255),
  status users_status_enum NOT NULL DEFAULT 'active',
  "tenantId" VARCHAR(255),
  "departmentId" VARCHAR(255),
  "dataScope" users_datascope_enum NOT NULL DEFAULT 'tenant',
  "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  "loginAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP,
  "lastLoginAt" TIMESTAMP,
  "lastLoginIp" VARCHAR(255),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_fe0bb3f6520ee0469504521e71" ON users (username);
CREATE INDEX IF NOT EXISTS "IDX_97672ac88f789774dd47f7c8be" ON users (email);
CREATE INDEX IF NOT EXISTS "IDX_c58f7e88c286e5e3478960a998" ON users ("tenantId");
CREATE INDEX IF NOT EXISTS "IDX_554d853741f2083faaa5794d2a" ON users ("departmentId");
CREATE INDEX IF NOT EXISTS "IDX_USER_LAST_LOGIN" ON users ("lastLoginAt");
CREATE INDEX IF NOT EXISTS "IDX_USER_USERNAME_STATUS" ON users (username, status);
CREATE INDEX IF NOT EXISTS "IDX_USER_EMAIL_STATUS" ON users (email, status);
CREATE INDEX IF NOT EXISTS "IDX_USER_TENANT_CREATED" ON users ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "IDX_USER_TENANT_STATUS" ON users ("tenantId", status);

-- 4. 创建关联表
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS "IDX_b36cb2e04bc353ca4ede00d87b" ON role_permissions (role_id);
CREATE INDEX IF NOT EXISTS "IDX_bfbc9e263d4cea6d7a8c9eb3ad" ON role_permissions (permission_id);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS "IDX_87b8888186ca9769c960e92687" ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS "IDX_b23c65e50a758245a33ee35fda" ON user_roles (role_id);

-- 5. 插入默认数据
-- 默认角色
INSERT INTO roles (id, name, description, "isSystem") VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', '系统管理员', true),
  ('00000000-0000-0000-0000-000000000002', 'user', '普通用户', true)
ON CONFLICT (name) DO NOTHING;

-- 默认管理员用户 (密码: admin123)
INSERT INTO users (id, username, email, password, status, "isSuperAdmin") VALUES
  ('10000000-0000-0000-0000-000000000001', 'admin', 'admin@cloudphone.com', '$2b$10$rDXJZKp.qYmJKYZ5YZnDOeK8vL3qJx7KqY1F2YvH3yP4xH5yH6yH7', 'active', true)
ON CONFLICT (username) DO NOTHING;

-- 关联管理员到 admin 角色
INSERT INTO user_roles (user_id, role_id) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- 完成
SELECT 'Baseline migration completed successfully' as status;
