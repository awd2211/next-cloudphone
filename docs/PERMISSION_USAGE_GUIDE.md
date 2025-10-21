# 企业级权限系统使用指南

本指南详细介绍如何使用云手机平台的企业级权限系统，包括 RBAC 权限控制、数据范围管理、字段级权限等功能。

---

## 📖 目录

1. [系统概述](#系统概述)
2. [快速开始](#快速开始)
3. [权限系统架构](#权限系统架构)
4. [初始化权限数据](#初始化权限数据)
5. [后端使用指南](#后端使用指南)
6. [前端使用指南](#前端使用指南)
7. [权限配置管理](#权限配置管理)
8. [最佳实践](#最佳实践)
9. [常见问题](#常见问题)

---

## 系统概述

### 核心特性

- ✅ **4 层权限控制**：功能、操作、数据、字段
- ✅ **RBAC 模型**：基于角色的访问控制
- ✅ **多租户隔离**：支持平台级和租户级权限管理
- ✅ **数据范围控制**：6 种数据范围类型（全部、租户、部门、本人等）
- ✅ **字段级权限**：支持字段隐藏、只读、可写、必填、脱敏
- ✅ **权限缓存**：高性能权限检查（5 分钟缓存）
- ✅ **审计日志**：自动记录权限相关操作

### 权限层级

```
1. 功能层 (Function)   - 菜单/页面访问权限
2. 操作层 (Operation)   - CRUD 操作权限 (user:create, device:read)
3. 数据层 (Data)        - 行级数据范围控制
4. 字段层 (Field)       - 列级字段访问控制
```

---

## 快速开始

### 1. 初始化权限数据

首次部署时需要初始化权限系统：

```bash
# 进入 user-service 目录
cd backend/user-service

# 运行初始化脚本
npm run init:permissions
```

这将创建：
- ✅ 6 个默认角色（Super Admin, Admin, Device Manager, User Manager, Finance Manager, User）
- ✅ 50+ 默认权限（用户、设备、应用、订单、账单等）
- ✅ 数据范围配置（全部/租户/部门/本人）
- ✅ 字段权限配置（隐藏/只读/可写/必填）
- ✅ 默认管理员账号（username: `admin`, password: `admin123`）

⚠️ **生产环境请立即修改默认密码！**

### 2. 登录管理后台

```
URL: http://localhost:5173
用户名: admin
密码: admin123
```

### 3. 配置权限

访问 **系统管理 > 权限管理** 进行配置：
- **角色权限配置**：为角色分配功能权限
- **数据范围配置**：配置角色的数据访问范围
- **字段权限配置**：配置字段级访问控制

---

## 权限系统架构

### 数据模型

```
┌──────────────┐       ┌──────────────┐
│     User     │──────<│     Role     │
└──────────────┘       └──────────────┘
                              │
                              │ N:M
                              │
                       ┌──────────────┐
                       │  Permission  │
                       └──────────────┘

┌──────────────┐       ┌──────────────────────┐
│     Role     │──────<│     DataScope        │
└──────────────┘       └──────────────────────┘

┌──────────────┐       ┌──────────────────────┐
│     Role     │──────<│  FieldPermission     │
└──────────────┘       └──────────────────────┘
```

### 核心实体

**Permission** (权限)
```typescript
{
  id: string;
  name: string;           // user:create
  resource: string;       // user
  action: string;         // create
  scope: DataScopeType;   // tenant
  description: string;
}
```

**DataScope** (数据范围)
```typescript
{
  roleId: string;
  resourceType: string;   // device
  scopeType: ScopeType;   // DEPARTMENT
  filter?: object;        // 自定义过滤器
  departmentIds?: string[];
  includeSubDepartments: boolean;
}
```

**FieldPermission** (字段权限)
```typescript
{
  roleId: string;
  resourceType: string;   // user
  operation: OperationType; // VIEW
  hiddenFields: string[];
  readOnlyFields: string[];
  writableFields: string[];
  requiredFields: string[];
  fieldTransforms?: object; // 数据脱敏
}
```

---

## 初始化权限数据

### 默认角色说明

| 角色 | 代码 | 说明 | 数据范围 |
|------|------|------|----------|
| Super Admin | `super_admin` | 超级管理员，拥有所有权限 | 全部数据 |
| Admin | `admin` | 管理员，拥有大部分管理权限 | 租户数据 |
| Device Manager | `device_manager` | 设备管理员 | 部门及子部门 |
| User Manager | `user_manager` | 用户管理员 | 部门及子部门 |
| Finance Manager | `finance_manager` | 财务管理员 | 租户数据 |
| User | `user` | 普通用户 | 仅本人数据 |

### 默认权限列表

**用户管理** (user:*)
- `user:create` - 创建用户
- `user:read` - 查看用户
- `user:update` - 更新用户
- `user:delete` - 删除用户
- `user:export` - 导出用户数据

**设备管理** (device:*)
- `device:create` - 创建设备
- `device:read` - 查看设备
- `device:update` - 更新设备
- `device:delete` - 删除设备
- `device:control` - 控制设备
- `device:export` - 导出设备数据

**应用管理** (app:*)
- `app:create` - 创建应用
- `app:read` - 查看应用
- `app:update` - 更新应用
- `app:delete` - 删除应用
- `app:install` - 安装应用
- `app:uninstall` - 卸载应用

...(更多权限请查看初始化脚本)

---

## 后端使用指南

### 1. 使用装饰器保护接口

#### 功能权限控制

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { EnhancedPermissionsGuard } from './permissions/guards/enhanced-permissions.guard';
import { RequirePermissions, RequireSuperAdmin, SkipPermission } from './permissions/decorators';

@Controller('users')
@UseGuards(EnhancedPermissionsGuard)
export class UsersController {

  // 需要 user:create 权限
  @Post()
  @RequirePermissions('user:create')
  createUser() {
    // ...
  }

  // 需要 user:read 或 user:update 任一权限
  @Get()
  @RequirePermissions('user:read', 'user:update')
  getUsers() {
    // ...
  }

  // 需要超级管理员权限
  @Delete(':id')
  @RequireSuperAdmin()
  deleteUser() {
    // ...
  }

  // 跳过权限检查（公开接口）
  @Get('public')
  @SkipPermission()
  getPublicInfo() {
    // ...
  }
}
```

#### 数据范围控制

```typescript
import { DataScopeResource, ViewDataControl } from './permissions/decorators';
import { DataScopeInterceptor } from './permissions/interceptors/data-scope.interceptor';

@Controller('devices')
@UseGuards(EnhancedPermissionsGuard)
@UseInterceptors(DataScopeInterceptor)
export class DevicesController {

  // 自动应用数据范围过滤
  @Get()
  @DataScopeResource('device')
  async getDevices(@Request() req) {
    // req.dataScopeFilter 包含当前用户的数据范围过滤条件
    const filter = req.dataScopeFilter;

    // 应用到查询
    const devices = await this.deviceService.find(filter);
    return devices;
  }

  // 使用快捷装饰器
  @Get('list')
  @ViewDataControl('device')
  async listDevices(@Request() req) {
    // 等同于 @DataScopeResource('device')
  }
}
```

#### 字段权限控制

```typescript
import { FieldFilterResource } from './permissions/decorators';
import { FieldFilterInterceptor } from './permissions/interceptors/field-filter.interceptor';

@Controller('users')
@UseGuards(EnhancedPermissionsGuard)
@UseInterceptors(FieldFilterInterceptor)
export class UsersController {

  // 自动过滤响应字段
  @Get(':id')
  @FieldFilterResource('user', OperationType.VIEW)
  async getUser(@Param('id') id: string) {
    const user = await this.userService.findOne(id);
    // 返回的数据会自动根据字段权限过滤
    // 例如：隐藏 password、脱敏 phone/email 等
    return user;
  }

  // 导出时使用不同的字段权限
  @Get('export')
  @FieldFilterResource('user', OperationType.EXPORT)
  async exportUsers() {
    // ...
  }
}
```

#### 租户隔离

```typescript
import { AutoSetTenant, SkipTenantIsolation } from './permissions/decorators';
import { TenantInterceptor } from './permissions/interceptors/tenant.interceptor';

@Controller('devices')
@UseGuards(EnhancedPermissionsGuard)
@UseInterceptors(TenantInterceptor)
export class DevicesController {

  // 自动设置租户ID
  @Post()
  @AutoSetTenant()
  async createDevice(@Body() dto: CreateDeviceDto, @Request() req) {
    // dto.tenantId 会自动设置为当前用户的 tenantId
    return this.deviceService.create(dto);
  }

  // 跳过租户隔离（仅超级管理员）
  @Get('all')
  @RequireSuperAdmin()
  @SkipTenantIsolation()
  async getAllDevices() {
    // 可以查询所有租户的设备
  }
}
```

#### 审计日志

```typescript
import { AuditCreate, AuditDelete, AuditPermission } from './permissions/decorators';
import { AuditPermissionInterceptor } from './permissions/interceptors/audit-permission.interceptor';

@Controller('users')
@UseGuards(EnhancedPermissionsGuard)
@UseInterceptors(AuditPermissionInterceptor)
export class UsersController {

  // 自动记录创建操作
  @Post()
  @AuditCreate('user')
  createUser(@Body() dto: CreateUserDto) {
    // 操作会被自动记录到审计日志
  }

  // 自动记录删除操作
  @Delete(':id')
  @AuditDelete('user')
  deleteUser(@Param('id') id: string) {
    // 删除操作会被记录，包括删除的资源ID
  }

  // 自定义审计
  @Post('batch-import')
  @AuditPermission({ resource: 'user', action: 'import', level: 'CRITICAL' })
  importUsers(@Body() data: any[]) {
    // 批量导入会被记录为 CRITICAL 级别
  }
}
```

### 2. 在 Service 中检查权限

```typescript
import { Injectable } from '@nestjs/common';
import { PermissionCheckerService } from './permissions/permission-checker.service';
import { DataScopeService } from './permissions/data-scope.service';
import { FieldFilterService } from './permissions/field-filter.service';

@Injectable()
export class DeviceService {
  constructor(
    private permissionChecker: PermissionCheckerService,
    private dataScopeService: DataScopeService,
    private fieldFilterService: FieldFilterService,
  ) {}

  async getDevices(userId: string) {
    // 1. 检查功能权限
    const hasPermission = await this.permissionChecker.checkFunctionPermission(
      userId,
      'device:read',
    );
    if (!hasPermission) {
      throw new ForbiddenException('无权访问设备列表');
    }

    // 2. 获取数据范围过滤器
    const filter = await this.dataScopeService.getDataScopeFilter(userId, 'device');

    // 3. 查询数据
    const devices = await this.deviceRepo.find({ where: filter });

    // 4. 过滤字段
    const filteredDevices = await this.fieldFilterService.filterFieldsArray(
      userId,
      'device',
      devices,
      OperationType.VIEW,
    );

    return filteredDevices;
  }

  async updateDevice(userId: string, deviceId: string, updates: any) {
    // 检查操作权限
    const result = await this.permissionChecker.checkOperationPermission(
      userId,
      'device',
      'update',
    );
    if (!result.allowed) {
      throw new ForbiddenException(result.reason);
    }

    // 检查数据权限
    const device = await this.deviceRepo.findOne({ where: { id: deviceId } });
    const hasDataAccess = await this.permissionChecker.checkDataPermission(
      userId,
      'device',
      device,
    );
    if (!hasDataAccess) {
      throw new ForbiddenException('无权修改此设备');
    }

    // 执行更新
    return this.deviceRepo.update(deviceId, updates);
  }
}
```

### 3. 使用 TypeORM QueryBuilder

```typescript
async getDevicesWithScope(userId: string) {
  const queryBuilder = this.deviceRepo.createQueryBuilder('device');

  // 自动应用数据范围过滤
  await this.dataScopeService.applyScopeToQuery(
    queryBuilder,
    userId,
    'device',
    'device', // alias
  );

  const devices = await queryBuilder.getMany();
  return devices;
}
```

---

## 前端使用指南

### 1. 使用权限 Hooks

#### usePermission - 功能权限

```typescript
import { usePermission, PermissionGuard } from '@/hooks/usePermission';

function DeviceList() {
  const { hasPermission, hasAnyPermission, isSuperAdmin, loading } = usePermission();

  if (loading) return <Spin />;

  return (
    <div>
      {/* 条件渲染 */}
      {hasPermission('device:create') && (
        <Button onClick={handleCreate}>创建设备</Button>
      )}

      {/* 使用 Guard 组件 */}
      <PermissionGuard permission="device:delete">
        <Button danger onClick={handleDelete}>删除设备</Button>
      </PermissionGuard>

      {/* 任一权限 */}
      <PermissionGuard anyOf={['device:create', 'device:update']}>
        <Button>编辑</Button>
      </PermissionGuard>

      {/* 所有权限 */}
      <PermissionGuard allOf={['device:delete', 'admin:access']}>
        <Button>高级操作</Button>
      </PermissionGuard>

      {/* 超级管理员 */}
      {isSuperAdmin && <AdminPanel />}
    </div>
  );
}
```

#### useMenu - 菜单权限

```typescript
import { useMenu, MenuGuard } from '@/hooks/useMenu';

function Sidebar() {
  const { menus, visibleMenus, checkMenuAccess, getBreadcrumb } = useMenu();

  // 渲染菜单
  return (
    <Menu>
      {visibleMenus.map(menu => (
        <Menu.Item key={menu.key} icon={menu.icon}>
          <Link to={menu.path}>{menu.label}</Link>
        </Menu.Item>
      ))}
    </Menu>
  );
}

function ProtectedPage() {
  return (
    <MenuGuard path="/devices/create" fallback={<Redirect to="/403" />}>
      <DeviceCreateForm />
    </MenuGuard>
  );
}
```

#### useDataScope - 数据范围管理

```typescript
import { useDataScope, ScopeType } from '@/hooks/useDataScope';

function DataScopeConfigPage() {
  const {
    dataScopes,
    loading,
    createDataScope,
    updateDataScope,
    deleteDataScope,
    getScopeTypes,
  } = useDataScope();

  const handleCreate = async () => {
    await createDataScope({
      roleId: 'role-xxx',
      resourceType: 'device',
      scopeType: ScopeType.DEPARTMENT,
      includeSubDepartments: true,
      description: '设备管理员可访问本部门及子部门设备',
    });
  };

  return <DataScopeTable dataScopes={dataScopes} />;
}
```

#### useFieldPermission - 字段权限管理

```typescript
import { useFieldPermission, OperationType } from '@/hooks/useFieldPermission';

function FieldPermissionConfigPage() {
  const {
    fieldPermissions,
    loading,
    createFieldPermission,
    getTransformExamples,
  } = useFieldPermission();

  const handleCreate = async () => {
    await createFieldPermission({
      roleId: 'role-xxx',
      resourceType: 'user',
      operation: OperationType.VIEW,
      hiddenFields: ['password', 'salt'],
      readOnlyFields: ['id', 'createdAt'],
      fieldTransforms: {
        phone: { type: 'mask', pattern: '***-****-{4}' },
        email: { type: 'mask', pattern: '{3}***@***' },
      },
    });
  };

  return <FieldPermissionTable fieldPermissions={fieldPermissions} />;
}
```

### 2. 在路由中使用权限

```typescript
import { Navigate } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';

function ProtectedRoute({ children, permission }) {
  const { hasPermission, loading } = usePermission();

  if (loading) return <Spin />;
  if (!hasPermission(permission)) return <Navigate to="/403" />;

  return children;
}

// 使用
<Route
  path="/devices/create"
  element={
    <ProtectedRoute permission="device:create">
      <DeviceCreatePage />
    </ProtectedRoute>
  }
/>
```

---

## 权限配置管理

### 1. 角色权限配置

访问 **系统管理 > 角色管理**：

1. 创建角色
2. 点击「配置权限」
3. 选择功能权限（树形或列表视图）
4. 保存

### 2. 数据范围配置

访问 **系统管理 > 数据范围配置**：

**配置示例**：

```yaml
角色: Device Manager
资源类型: device
范围类型: DEPARTMENT (部门及子部门)
部门ID: ['dept-001', 'dept-002']
包含子部门: 是
优先级: 100
```

**范围类型说明**：

- `ALL` - 全部数据（无限制）
- `TENANT` - 租户数据（当前租户的所有数据）
- `DEPARTMENT` - 部门数据（包含子部门）
- `DEPARTMENT_ONLY` - 仅本部门数据（不含子部门）
- `SELF` - 仅本人数据
- `CUSTOM` - 自定义过滤器（JSON 格式）

### 3. 字段权限配置

访问 **系统管理 > 字段权限配置**：

**配置示例**：

```yaml
角色: User
资源类型: user
操作类型: VIEW (查看)

字段规则:
  隐藏字段: password, salt, twoFactorSecret
  只读字段: id, email, createdAt, updatedAt
  可写字段: name, phone, avatar
  必填字段: -

字段转换:
  phone:
    type: mask
    pattern: "***-****-{4}"
  email:
    type: mask
    pattern: "{3}***@***"
```

**字段访问级别**：

- `HIDDEN` - 完全隐藏，用户无法看到
- `READ` - 只读，可查看但不能修改
- `WRITE` - 可写，可查看和修改
- `REQUIRED` - 必填，创建/更新时必须提供

**数据脱敏模式**：

```json
// 手机号脱敏
{
  "phone": {
    "type": "mask",
    "pattern": "***-****-{4}"
  }
}
// 138-1234-5678 → ***-****-5678

// 邮箱脱敏
{
  "email": {
    "type": "mask",
    "pattern": "{3}***@***"
  }
}
// user@example.com → use***@***

// 身份证脱敏
{
  "idCard": {
    "type": "mask",
    "pattern": "{6}********{4}"
  }
}
// 110101199001011234 → 110101********1234

// 哈希替换
{
  "secret": { "type": "hash" }
}
// original_value → ***HASHED***

// 完全移除
{
  "internalData": { "type": "remove" }
}
// 字段被删除

// 固定值替换
{
  "sensitiveInfo": {
    "type": "replace",
    "value": "***"
  }
}
// original_value → ***
```

---

## 最佳实践

### 1. 权限设计原则

✅ **最小权限原则**
- 默认拒绝，显式授权
- 只授予完成任务所需的最小权限

✅ **职责分离**
- 不同角色负责不同职能
- 避免单一角色拥有过多权限

✅ **定期审查**
- 定期检查权限分配是否合理
- 清理不再需要的权限

### 2. 数据范围配置建议

```yaml
# 推荐的数据范围配置层次

Super Admin:
  所有资源: ALL (全部数据)

Admin:
  所有资源: TENANT (租户数据)

Manager:
  管辖资源: DEPARTMENT (部门及子部门)

User:
  个人资源: SELF (仅本人)
```

### 3. 字段权限配置建议

**敏感字段处理**：

```typescript
// 推荐：不同操作使用不同字段权限
{
  role: 'user',
  resource: 'user',
  operation: 'VIEW',
  hiddenFields: ['password', 'salt', 'twoFactorSecret'],
  fieldTransforms: {
    phone: { type: 'mask', pattern: '***-****-{4}' },
    email: { type: 'mask', pattern: '{3}***@***' }
  }
}

{
  role: 'user',
  resource: 'user',
  operation: 'EXPORT',
  hiddenFields: ['password', 'salt', 'twoFactorSecret'],
  // 导出时完全隐藏，不脱敏
}

{
  role: 'admin',
  resource: 'user',
  operation: 'VIEW',
  hiddenFields: ['password', 'salt'],
  // 管理员可以看到更多字段
}
```

### 4. 性能优化

**权限缓存**：
- 权限数据自动缓存 5 分钟
- 修改权限后自动失效
- 支持手动刷新缓存

**批量检查**：
```typescript
// 好 ✅ - 一次检查多个权限
const hasAny = await permissionChecker.hasAnyPermission(userId, [
  'device:create',
  'device:update'
]);

// 不好 ❌ - 多次调用
const has1 = await permissionChecker.checkFunctionPermission(userId, 'device:create');
const has2 = await permissionChecker.checkFunctionPermission(userId, 'device:update');
```

**数据范围查询优化**：
```typescript
// 好 ✅ - 使用 QueryBuilder
const qb = repo.createQueryBuilder('device');
await dataScopeService.applyScopeToQuery(qb, userId, 'device');
const devices = await qb.getMany();

// 不好 ❌ - 查询后过滤
const allDevices = await repo.find();
const filtered = allDevices.filter(d => checkAccess(userId, d));
```

---

## 常见问题

### Q1: 如何创建自定义权限？

**A**: 访问 **系统管理 > 权限管理** > 创建权限

```typescript
资源: my_resource
操作: custom_action
描述: 自定义操作说明

// 生成权限标识: my_resource:custom_action
```

### Q2: 如何让某个用户拥有跨租户访问权限？

**A**: 将用户的 `isSuperAdmin` 字段设置为 `true`，或为该用户分配 Super Admin 角色。

```typescript
// 方式1: 更新用户
await userRepo.update(userId, { isSuperAdmin: true });

// 方式2: 分配 Super Admin 角色
const superAdminRole = await roleRepo.findOne({ where: { name: 'Super Admin' } });
user.roles = [superAdminRole];
await userRepo.save(user);
```

### Q3: 如何配置自定义数据过滤器？

**A**: 使用 `CUSTOM` 范围类型，配置 JSON 过滤器

```json
{
  "scopeType": "CUSTOM",
  "filter": {
    "status": { "$in": ["active", "pending"] },
    "region": "cn-north",
    "createdAt": { "$gte": "2024-01-01" }
  }
}
```

支持的运算符：`$eq`, `$ne`, `$in`, `$nin`, `$gt`, `$gte`, `$lt`, `$lte`, `$like`

### Q4: 如何刷新用户的权限缓存？

**A**: 通过 API 或管理界面刷新

```bash
# API 方式
curl -X GET "http://localhost:30001/menu-permissions/cache/refresh/{userId}"

# 清空所有缓存
curl -X GET "http://localhost:30001/menu-permissions/cache/clear-all"
```

或访问 **系统管理 > 权限管理 > 缓存管理**

### Q5: 字段权限优先级如何确定？

**A**: 当用户拥有多个角色时：

1. 按 `priority` 字段排序（数值越小优先级越高）
2. 合并所有角色的字段权限
3. 取最宽松的权限（例如：一个角色隐藏，另一个允许查看，则允许查看）

### Q6: 如何调试权限问题？

**A**: 使用以下方法：

1. **查看审计日志**：`/audit-logs` 查看权限检查记录
2. **查看缓存状态**：`GET /menu-permissions/cache/stats`
3. **导出缓存数据**：`GET /menu-permissions/cache/export`
4. **启用调试日志**：设置环境变量 `LOG_LEVEL=debug`

```typescript
// 后端调试
console.log('User permissions:', await permissionChecker.getUserPermissions(userId));
console.log('Data scope:', await dataScopeService.getDataScopeFilter(userId, 'device'));

// 前端调试
const { permissions, isSuperAdmin } = usePermission();
console.log('Current permissions:', permissions);
```

---

## 附录

### API 端点列表

**权限管理**
- `GET /permissions` - 获取权限列表
- `POST /permissions` - 创建权限
- `PUT /permissions/:id` - 更新权限
- `DELETE /permissions/:id` - 删除权限

**数据范围**
- `GET /data-scopes` - 获取数据范围列表
- `POST /data-scopes` - 创建数据范围
- `PUT /data-scopes/:id` - 更新数据范围
- `DELETE /data-scopes/:id` - 删除数据范围
- `GET /data-scopes/meta/scope-types` - 获取范围类型

**字段权限**
- `GET /field-permissions` - 获取字段权限列表
- `POST /field-permissions` - 创建字段权限
- `PUT /field-permissions/:id` - 更新字段权限
- `DELETE /field-permissions/:id` - 删除字段权限
- `GET /field-permissions/meta/access-levels` - 获取访问级别
- `GET /field-permissions/meta/transform-examples` - 获取脱敏示例

**菜单权限**
- `GET /menu-permissions/my-menus` - 获取当前用户菜单
- `GET /menu-permissions/my-permissions` - 获取当前用户权限
- `GET /menu-permissions/check-menu-access?path=xxx` - 检查菜单访问权限
- `GET /menu-permissions/cache/refresh/:userId` - 刷新缓存
- `GET /menu-permissions/cache/stats` - 缓存统计

### 环境变量配置

```bash
# 权限缓存配置
PERMISSION_CACHE_TTL=300000  # 5分钟
PERMISSION_CACHE_MAX=10000   # 最大缓存条数

# 审计日志配置
AUDIT_LOG_ENABLED=true
AUDIT_LOG_LEVEL=INFO  # INFO, WARN, ERROR, CRITICAL

# 超级管理员配置
SUPER_ADMIN_BYPASS_TENANT=true  # 超级管理员跳过租户隔离
```

---

**文档版本**: v1.0.0
**最后更新**: 2025-10-21
**维护者**: Claude Code

如有问题或建议，请联系技术支持团队。
