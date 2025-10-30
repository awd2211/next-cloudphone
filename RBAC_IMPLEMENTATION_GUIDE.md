# RBAC 实施指南

## 📋 已完成的工作

### ✅ 1. 核心RBAC系统（Backend Shared Module）

已实现以下功能：

#### 角色定义 (`backend/shared/src/constants/roles.ts`)
```typescript
enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}
```

#### 数据范围装饰器 (`@DataScope`)
```typescript
@DataScope(DataScopeType.SELF)   // 用户只能访问自己的数据
@DataScope(DataScopeType.ALL)    // 只有管理员可以访问
@DataScope(DataScopeType.TENANT) // 租户内可见
@DataScope(DataScopeType.CUSTOM) // 自定义过滤逻辑
```

#### 数据范围守卫 (`DataScopeGuard`)
- 自动验证用户是否有权访问资源
- 超级管理员跳过所有检查
- 管理员可访问所有租户数据
- 普通用户只能访问自己的资源

### ✅ 2. User Service 集成

已在 `backend/user-service/src/users/users.controller.ts` 添加数据范围保护：

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard, DataScopeGuard)
export class UsersController {

  // 新增：获取当前用户信息
  @Get('me')
  async getMe(@Request() req) { }

  // 保护：查看用户详情
  @Get(':id')
  @DataScope(DataScopeType.SELF)
  async findOne(@Param('id') id: string) { }

  // 保护：更新用户
  @Patch(':id')
  @DataScope(DataScopeType.SELF)
  async update(@Param('id') id: string) { }

  // 保护：修改密码
  @Post(':id/change-password')
  @DataScope(DataScopeType.SELF)
  async changePassword(@Param('id') id: string) { }

  // 保护：删除用户（只有管理员）
  @Delete(':id')
  @DataScope(DataScopeType.ALL)
  async remove(@Param('id') id: string) { }
}
```

### ✅ 3. Device Service 访问控制服务

创建了 `DevicesAccessService` 用于在 Service 层进行权限验证：

```typescript
// 验证单个设备访问权限
const device = await devicesAccessService.validateDeviceAccess(deviceId, req.user);

// 批量验证设备访问权限
const devices = await devicesAccessService.validateBatchDeviceAccess(deviceIds, req.user);

// 检查是否为设备所有者或管理员
const canAccess = await devicesAccessService.isDeviceOwnerOrAdmin(deviceId, req.user);

// 构建用户范围过滤条件
const filter = devicesAccessService.buildUserScopeFilter(req.user);
```

### ✅ 4. 权限矩阵文档

完整的权限矩阵文档：`RBAC_PERMISSION_MATRIX.md`

## 🎯 如何在其他服务中应用RBAC

### 步骤 1: 在 Controller 添加守卫

```typescript
import { DataScopeGuard, DataScope, DataScopeType } from '@cloudphone/shared';

@Controller('your-resource')
@UseGuards(JwtAuthGuard, PermissionsGuard, DataScopeGuard) // 添加 DataScopeGuard
export class YourController {

  // 示例：获取资源详情
  @Get(':id')
  @RequirePermission('resource.read')
  @DataScope(DataScopeType.SELF) // 添加数据范围装饰器
  async findOne(@Param('id') id: string) {
    // DataScopeGuard 会自动验证：
    // 1. 从 params.id 提取资源ID
    // 2. 查询资源的 userId
    // 3. 验证 resource.userId === req.user.id
    // 4. 管理员自动通过
  }
}
```

### 步骤 2: 确保实体有 userId 字段

```typescript
@Entity()
export class YourResource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string; // 重要：必须有此字段

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
```

### 步骤 3: Service 层添加过滤（可选）

```typescript
async findAll(userId?: string) {
  const query = this.repository.createQueryBuilder('resource');

  // 如果提供了 userId，只返回该用户的资源
  if (userId) {
    query.andWhere('resource.userId = :userId', { userId });
  }

  return query.getMany();
}
```

## 🔧 前端集成

### 步骤 1: 创建角色工具函数

创建 `frontend/admin/src/utils/role.ts`:

```typescript
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

export function isAdminRole(role: string): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
}

export function hasAdminRole(roles: any[]): boolean {
  if (!roles || roles.length === 0) {
    return false;
  }
  const roleNames = roles.map(r => typeof r === 'string' ? r : r.name);
  return roleNames.some(name => isAdminRole(name));
}

export function isSuperAdmin(roles: any[]): boolean {
  if (!roles || roles.length === 0) {
    return false;
  }
  const roleNames = roles.map(r => typeof r === 'string' ? r : r.name);
  return roleNames.includes(UserRole.SUPER_ADMIN);
}
```

### 步骤 2: 在组件中使用

```typescript
import { hasAdminRole } from '@/utils/role';
import { useAuth } from '@/hooks/useAuth';

export const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = hasAdminRole(user.roles);

  return (
    <div>
      {/* 所有用户可见 */}
      <UserProfile user={user} />

      {/* 只有管理员可见 */}
      {isAdmin && (
        <AdminPanel>
          <UserManagement />
          <SystemSettings />
        </AdminPanel>
      )}
    </div>
  );
};
```

### 步骤 3: 路由权限控制

```typescript
// router/index.tsx
import { hasAdminRole } from '@/utils/role';

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  if (!hasAdminRole(user.roles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// 使用
<Route path="/admin/*" element={
  <AdminRoute>
    <AdminLayout />
  </AdminRoute>
} />
```

## 📊 数据库角色配置

### 步骤 1: 创建角色种子数据

创建 `database/seed-roles.sql`:

```sql
-- 插入系统角色
INSERT INTO roles (id, name, description, level, "isSystem", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'super_admin', '超级管理员 - 拥有所有权限', 100, true, NOW(), NOW()),
  (gen_random_uuid(), 'admin', '管理员 - 拥有租户内所有权限', 80, true, NOW(), NOW()),
  (gen_random_uuid(), 'user', '普通用户 - 只能访问自己的资源', 50, true, NOW(), NOW()),
  (gen_random_uuid(), 'guest', '访客 - 只读权限', 10, true, NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  "updatedAt" = NOW();

-- 为超级管理员创建所有权限
INSERT INTO permissions (id, resource, action, description, "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  resource,
  action,
  description,
  NOW(),
  NOW()
FROM (
  VALUES
    ('user', 'create', '创建用户'),
    ('user', 'read', '查看用户'),
    ('user', 'update', '更新用户'),
    ('user', 'delete', '删除用户'),
    ('device', 'create', '创建设备'),
    ('device', 'read', '查看设备'),
    ('device', 'update', '更新设备'),
    ('device', 'delete', '删除设备'),
    ('device', 'start', '启动设备'),
    ('device', 'stop', '停止设备'),
    ('app', 'create', '上传应用'),
    ('app', 'read', '查看应用'),
    ('app', 'approve', '审核应用'),
    ('billing', 'read', '查看账单'),
    ('billing', 'manage', '管理计费')
) AS perms(resource, action, description)
ON CONFLICT (resource, action) DO NOTHING;

-- 将权限分配给角色
INSERT INTO role_permissions ("roleId", "permissionId", "createdAt")
SELECT
  r.id,
  p.id,
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- 管理员权限（除了用户删除）
INSERT INTO role_permissions ("roleId", "permissionId", "createdAt")
SELECT
  r.id,
  p.id,
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND NOT (p.resource = 'user' AND p.action = 'delete')
ON CONFLICT DO NOTHING;

-- 普通用户权限
INSERT INTO role_permissions ("roleId", "permissionId", "createdAt")
SELECT
  r.id,
  p.id,
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'user'
  AND p.resource IN ('device', 'app', 'billing')
  AND p.action IN ('create', 'read', 'update', 'start', 'stop')
ON CONFLICT DO NOTHING;

-- 访客权限（只读）
INSERT INTO role_permissions ("roleId", "permissionId", "createdAt")
SELECT
  r.id,
  p.id,
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'guest'
  AND p.action = 'read'
ON CONFLICT DO NOTHING;
```

### 步骤 2: 执行种子数据

```bash
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone < database/seed-roles.sql
```

## 🧪 测试RBAC系统

### 测试用例

创建 `scripts/test-rbac.sh`:

```bash
#!/bin/bash

# 获取超级管理员token
SUPER_ADMIN_TOKEN=$(curl -s -X POST http://localhost:30000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"admin123"}' | jq -r '.data.accessToken')

# 获取普通用户token
USER_TOKEN=$(curl -s -X POST http://localhost:30000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"user123"}' | jq -r '.data.accessToken')

echo "=== 测试1: 普通用户访问自己的信息 (应该成功) ==="
curl -s -X GET "http://localhost:30000/users/me" \
  -H "Authorization: Bearer $USER_TOKEN" | jq

echo -e "\n=== 测试2: 普通用户访问其他用户信息 (应该失败) ==="
curl -s -X GET "http://localhost:30000/users/other-user-id" \
  -H "Authorization: Bearer $USER_TOKEN" | jq

echo -e "\n=== 测试3: 管理员访问所有用户 (应该成功) ==="
curl -s -X GET "http://localhost:30000/users" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" | jq

echo -e "\n=== 测试4: 普通用户访问所有用户 (应该失败) ==="
curl -s -X GET "http://localhost:30000/users" \
  -H "Authorization: Bearer $USER_TOKEN" | jq

echo -e "\n=== 测试5: 普通用户删除用户 (应该失败) ==="
curl -s -X DELETE "http://localhost:30000/users/some-user-id" \
  -H "Authorization: Bearer $USER_TOKEN" | jq

echo -e "\n=== 测试6: 管理员删除用户 (应该成功) ==="
curl -s -X DELETE "http://localhost:30000/users/some-user-id" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" | jq
```

## 📝 最佳实践

### 1. Controller 层

- **总是添加三个守卫**：`JwtAuthGuard`, `PermissionsGuard`, `DataScopeGuard`
- **为每个操作添加权限检查**：`@RequirePermission('resource.action')`
- **为涉及特定资源的操作添加数据范围**：`@DataScope(...)`

### 2. Service 层

- **提供带 userId 参数的查询方法**
- **在返回数据前验证所有权**
- **使用 `buildUserScopeFilter` 自动构建过滤条件**

### 3. 前端

- **根据角色显示/隐藏功能**
- **在路由层进行权限检查**
- **API 调用失败时显示友好的错误信息**

### 4. 数据库

- **所有资源表必须有 userId 字段**
- **使用外键关联 users 表**
- **创建索引优化查询性能**: `CREATE INDEX idx_resource_user ON resource(userId)`

## 🚀 下一步

1. **为其他服务添加 RBAC**：
   - device-service
   - app-service
   - billing-service
   - notification-service

2. **完善前端权限控制**：
   - 根据角色显示菜单
   - 根据权限禁用按钮
   - 添加权限不足提示

3. **测试覆盖**：
   - 单元测试权限守卫
   - E2E测试不同角色的访问
   - 性能测试大量用户场景

4. **文档完善**：
   - API 文档标注权限要求
   - 添加权限配置示例
   - 创建故障排查指南

## 📚 相关文档

- **权限矩阵**：`RBAC_PERMISSION_MATRIX.md`
- **Device Service 数据范围更新**：`backend/device-service/DATA_SCOPE_UPDATES.md`
- **Shared Module 源码**：
  - `backend/shared/src/constants/roles.ts`
  - `backend/shared/src/decorators/data-scope.decorator.ts`
  - `backend/shared/src/guards/data-scope.guard.ts`
