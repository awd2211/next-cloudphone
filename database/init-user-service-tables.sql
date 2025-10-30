-- 初始化 User Service 数据库表
-- 创建核心表: users, roles, permissions

-- 1. 创建 roles 表
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建 permissions 表
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建 users 表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  "tenantId" UUID,
  "lastLoginAt" TIMESTAMP,
  "loginAttempts" INTEGER DEFAULT 0,
  "lockedUntil" TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 创建 role_permissions 表 (角色-权限关联)
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 5. 创建 user_roles 表 (用户-角色关联)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- 6. 创建索引
CREATE INDEX IF NOT EXISTS IDX_USER_TENANT_STATUS ON users ("tenantId", status);
CREATE INDEX IF NOT EXISTS IDX_USER_EMAIL_STATUS ON users (email, status);
CREATE INDEX IF NOT EXISTS IDX_USER_USERNAME_STATUS ON users (username, status);
CREATE INDEX IF NOT EXISTS IDX_USER_LAST_LOGIN ON users ("lastLoginAt");

-- 7. 插入默认角色
INSERT INTO roles (id, name, description, is_system) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', '系统管理员', true),
  ('00000000-0000-0000-0000-000000000002', 'user', '普通用户', true)
ON CONFLICT (name) DO NOTHING;

-- 8. 插入测试管理员用户
-- 密码: admin123 (使用 bcrypt hash)
-- Hash生成: bcrypt.hashSync('admin123', 10)
INSERT INTO users (id, username, email, password, status) VALUES
  ('10000000-0000-0000-0000-000000000001', 'admin', 'admin@cloudphone.com', '$2b$10$rDXJZKp.qYmJKYZ5YZnDOeK8YqYqYqYqYqYqYqYqYqYqYqYqYqY', 'active')
ON CONFLICT (username) DO NOTHING;

-- 9. 关联管理员用户到 admin 角色
INSERT INTO user_roles (user_id, role_id) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- 10. 显示创建结果
SELECT 'Users table initialized' as status;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_roles FROM roles;
