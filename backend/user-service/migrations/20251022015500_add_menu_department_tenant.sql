-- Create menus table
CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  path VARCHAR(255) NOT NULL,
  icon VARCHAR(255),
  "parentId" UUID,
  sort INTEGER DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  visible BOOLEAN DEFAULT true,
  "permissionCode" VARCHAR(255),
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_menus_code ON menus(code);
CREATE INDEX IF NOT EXISTS idx_menus_parent_id ON menus("parentId");

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  "parentId" UUID,
  description TEXT,
  "managerId" UUID,
  level INTEGER DEFAULT 0,
  path TEXT,
  sort INTEGER DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON departments("parentId");
CREATE INDEX IF NOT EXISTS idx_departments_path ON departments(path);

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  "contactName" VARCHAR(255),
  "contactEmail" VARCHAR(255),
  "contactPhone" VARCHAR(50),
  "maxUsers" INTEGER,
  "maxDevices" INTEGER,
  "expiresAt" TIMESTAMP,
  config JSONB,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_code ON tenants(code);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

