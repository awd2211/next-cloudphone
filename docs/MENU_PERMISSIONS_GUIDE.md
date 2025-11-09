# 菜单权限控制实施指南

**日期**: 2025-11-06
**功能**: 每个角色只能看到自己有权限的页面

---

## 📊 概述

本系统实现了基于角色的动态菜单权限控制（Role-Based Menu Access Control），确保：
1. **每个角色只能看到自己有权限访问的菜单**
2. **动态渲染** - 前端根据用户角色动态获取和渲染菜单
3. **路由守卫** - 防止用户通过 URL 直接访问无权限的页面
4. **权限验证** - 后端 API 进行二次权限验证

---

## 🗄️ 数据库设计

### 1. 菜单表 (menus)

```sql
CREATE TABLE menus (
  id UUID PRIMARY KEY,
  code VARCHAR(255) NOT NULL UNIQUE,  -- 菜单代码（唯一标识）
  name VARCHAR(255) NOT NULL,          -- 菜单显示名称
  path VARCHAR(255) NOT NULL,          -- 路由路径
  icon VARCHAR(255),                   -- 图标名称
  "parentId" UUID,                     -- 父菜单ID
  sort INTEGER DEFAULT 0,              -- 排序号
  "isActive" BOOLEAN DEFAULT true,     -- 是否启用
  visible BOOLEAN DEFAULT true,        -- 是否可见
  "permissionCode" VARCHAR(255),       -- 关联的权限代码
  metadata JSONB,                      -- 额外元数据
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP
);
```

### 2. 菜单-角色关联表 (menu_roles)

```sql
CREATE TABLE menu_roles (
  "menuId" UUID REFERENCES menus(id),
  "roleId" UUID REFERENCES roles(id),
  PRIMARY KEY ("menuId", "roleId")
);
```

---

## 🎯 菜单数据

### 一级菜单 (11个)

| 代码 | 名称 | 路径 | 图标 | 权限要求 |
|------|------|------|------|---------|
| system | 系统管理 | /system | SettingOutlined | super_admin only |
| users | 用户管理 | /users | UserOutlined | user.read |
| devices | 设备管理 | /devices | MobileOutlined | device.read |
| apps | 应用管理 | /apps | AppstoreOutlined | app.read |
| proxy | 代理管理 | /proxy | GlobalOutlined | proxy.read |
| sms | 短信服务 | /sms | MessageOutlined | sms.read |
| billing | 计费管理 | /billing | MoneyCollectOutlined | billing:read |
| notifications | 通知中心 | /notifications | BellOutlined | notification.read |
| approvals | 审批中心 | /approvals | AuditOutlined | approval.view.own |
| monitoring | 监控运维 | /monitoring | DashboardOutlined | device.metrics.view |
| profile | 个人中心 | /profile | IdcardOutlined | 所有用户 |

### 二级菜单 (39个)

完整菜单列表见数据库脚本 `rbac-menu-permissions-v2.sql`

---

## 👥 角色菜单分配

### super_admin (50个菜单 / 11个一级)
- ✅ **所有菜单**（包括系统管理）

### admin (44个菜单 / 10个一级)
- ✅ 除系统管理外的所有菜单
- ❌ 系统管理（用户、角色、权限、菜单、审计）

### tenant_admin (38个菜单 / 9个一级)
- ✅ 用户管理、设备管理、应用管理、代理管理
- ✅ 短信服务、计费管理、通知中心、审批中心、个人中心
- ❌ 系统管理、监控运维
- ❌ 应用审核、代理成本分析

### department_admin (19个菜单 / 5个一级)
- ✅ 用户管理、设备管理、通知中心、审批中心、个人中心
- ❌ 用户配额、设备创建/模板/快照

### vip_user (35个菜单 / 8个一级)
- ✅ 设备管理、应用管理、代理管理、短信服务
- ✅ 计费管理、通知中心、审批中心、个人中心
- ❌ 系统管理、用户管理、监控运维
- ❌ 应用审核

### enterprise_user (18个菜单 / 5个一级)
- ✅ 设备管理、应用管理、计费管理、通知中心、个人中心
- ❌ 设备快照、应用上传/审核、API密钥

### user (20个菜单 / 6个一级)
- ✅ 设备管理、应用管理、计费管理、通知中心、审批中心、个人中心
- ❌ 设备模板/快照、应用上传、审批历史/统计、API密钥

### devops (10个菜单 / 3个一级)
- ✅ 监控运维、设备管理（列表/监控）、个人中心
- ❌ 其他所有菜单

---

## 🔧 后端实现

### 1. MenusService (`backend/user-service/src/menus/menus.service.ts`)

```typescript
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class MenusService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  /**
   * 获取用户的菜单树
   */
  async getUserMenus(userId: string): Promise<MenuItem[]> {
    // 通过用户角色查询菜单，返回树形结构
  }

  /**
   * 检查用户是否有访问某个菜单路径的权限
   */
  async canAccessMenu(userId: string, menuPath: string): Promise<boolean> {
    // 验证用户是否有权限访问指定路径
  }

  /**
   * 获取用户所有可访问的菜单路径列表
   */
  async getUserMenuPaths(userId: string): Promise<string[]> {
    // 返回用户所有可访问的路径（用于路由守卫）
  }
}
```

### 2. MenusController (`backend/user-service/src/menus/menus.controller.ts`)

```typescript
import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MenusService } from './menus.service';

@Controller('menus')
@UseGuards(JwtAuthGuard)
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  /**
   * GET /api/menus
   * 获取当前用户的菜单树
   */
  @Get()
  async getUserMenus(@Req() req: any) {
    const userId = req.user.userId;
    return this.menusService.getUserMenus(userId);
  }

  /**
   * GET /api/menus/check-access?path=/devices/list
   * 检查用户是否有访问某个路由的权限
   */
  @Get('check-access')
  async checkAccess(@Req() req: any, @Query('path') path: string) {
    const userId = req.user.userId;
    return this.menusService.canAccessMenu(userId, path);
  }
}
```

### 3. 添加到 AppModule

```typescript
// backend/user-service/src/app.module.ts
import { MenusModule } from './menus/menus.module';

@Module({
  imports: [
    // ... 其他模块
    MenusModule,
  ],
})
export class AppModule {}
```

---

## 💻 前端实现

### 1. 路由守卫 (`frontend/admin/src/utils/route-guard.ts`)

```typescript
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { message } from 'antd';

/**
 * 路由守卫 Hook
 */
export function useRouteGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      // 检查是否登录
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('请先登录');
        navigate('/login');
        return;
      }

      // 获取用户菜单
      const menus = await fetchUserMenus();
      const allowedPaths = extractMenuPaths(menus);

      // 检查当前路径是否在允许的路径列表中
      const canAccess = canAccessPath(location.pathname, allowedPaths);

      if (!canAccess) {
        message.error('您没有权限访问此页面');
        navigate('/403');
      } else {
        setHasAccess(true);
      }

      setLoading(false);
    }

    checkAccess();
  }, [location.pathname, navigate]);

  return { loading, hasAccess };
}
```

### 2. 动态菜单组件 (`frontend/admin/src/components/DynamicMenu/index.tsx`)

```typescript
import React, { useEffect, useState } from 'react';
import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import * as Icons from '@ant-design/icons';
import { fetchUserMenus, type MenuItem } from '../../utils/route-guard';

export const DynamicMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuItems, setMenuItems] = useState([]);

  // 加载菜单数据
  useEffect(() => {
    async function loadMenus() {
      const menus = await fetchUserMenus();
      const items = transformMenuItems(menus);
      setMenuItems(items);
    }
    loadMenus();
  }, []);

  return (
    <Menu
      mode="inline"
      theme="dark"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={({ key }) => navigate(key)}
    />
  );
};
```

### 3. 在 Layout 中使用动态菜单

```typescript
// frontend/admin/src/layouts/BasicLayout.tsx
import { DynamicMenu } from '../components/DynamicMenu';

export const BasicLayout: React.FC = ({ children }) => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider>
        <div className="logo" />
        <DynamicMenu />
      </Sider>
      <Layout>
        <Header />
        <Content style={{ margin: '24px 16px', padding: 24 }}>
          {children}
        </Content>
        <Footer />
      </Layout>
    </Layout>
  );
};
```

### 4. 在受保护的页面使用路由守卫

```typescript
// frontend/admin/src/pages/Devices/List.tsx
import { useRouteGuard } from '../../utils/route-guard';

export const DeviceListPage: React.FC = () => {
  const { loading, hasAccess } = useRouteGuard();

  if (loading) {
    return <Spin size="large" />;
  }

  if (!hasAccess) {
    return null; // 会被路由守卫重定向到 403 页面
  }

  return (
    <div>
      {/* 设备列表页面内容 */}
    </div>
  );
};
```

---

## 🚀 使用流程

### 1. 用户登录
```
POST /api/auth/login
{
  "username": "admin",
  "password": "password"
}

响应：
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "roles": ["admin"]
  }
}
```

### 2. 获取用户菜单
```
GET /api/menus
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

响应：
[
  {
    "id": "uuid",
    "name": "devices",
    "title": "设备管理",
    "icon": "MobileOutlined",
    "path": "/devices",
    "orderNum": 3,
    "children": [
      {
        "id": "uuid",
        "name": "devices-list",
        "title": "设备列表",
        "path": "/devices/list",
        "orderNum": 1,
        "permissionCode": "device.read.own"
      }
    ]
  }
]
```

### 3. 前端渲染菜单
- 根据返回的菜单数据动态渲染侧边栏
- 只显示用户有权限访问的菜单项

### 4. 路由守卫验证
- 用户访问某个页面时，检查该路径是否在允许的菜单列表中
- 如果无权限，重定向到 403 页面

---

## 🔒 安全机制

### 1. 多层权限验证

```
用户访问 /devices/create
    ↓
前端路由守卫 → 检查菜单权限 → 允许/拒绝
    ↓（允许）
前端发起 API 请求
    ↓
后端 API → JwtAuthGuard → 验证 token
    ↓
后端 API → PermissionGuard → 验证权限
    ↓
后端业务逻辑 → 处理请求
```

### 2. 权限粒度

- **菜单级权限**: 控制菜单显示（`menu_roles` 表）
- **功能级权限**: 控制按钮操作（`permissions` 表 + `role_permissions` 表）
- **数据级权限**: 控制数据访问范围（`device.read.own` vs `device.read.all`）

### 3. 防止直接 URL 访问

即使用户知道某个页面的 URL，前端路由守卫也会拦截无权限的访问：

```typescript
// 用户尝试访问 /system/users
useRouteGuard() → 检查菜单权限 → 无权限 → 重定向到 /403
```

---

## 📝 权限代码说明

每个菜单项都可以关联一个权限代码 (`permissionCode`)，用于细粒度控制：

| 菜单 | 权限代码 | 说明 |
|------|---------|------|
| 设备列表 | device.read.own | 只能查看自己的设备 |
| 创建设备 | device.create.low | 只能创建低配设备 |
| 设备快照 | device.backup | 需要备份权限 |
| 用户创建 | user.create.regular | 只能创建普通用户 |
| 应用审核 | app.approve | 需要应用审核权限 |

---

## 🎯 最佳实践

### 1. 菜单设计原则
- ✅ **最小权限原则**: 默认隐藏，只显示有权限的菜单
- ✅ **层级清晰**: 一级菜单为模块，二级菜单为具体功能
- ✅ **命名规范**: code 使用 kebab-case，如 `devices-list`

### 2. 权限分配建议
- ✅ 使用角色继承思想：user → enterprise_user → vip_user
- ✅ 定期审核角色权限，移除不必要的菜单访问权限
- ✅ 敏感菜单（如系统管理）仅分配给 super_admin

### 3. 前端开发建议
- ✅ 使用动态菜单组件，避免硬编码菜单
- ✅ 在受保护的页面使用 `useRouteGuard()`
- ✅ 显示加载状态，提升用户体验

### 4. 后端开发建议
- ✅ API 端点必须有权限验证（`@UseGuards(JwtAuthGuard, PermissionGuard)`）
- ✅ 菜单权限和功能权限分开管理
- ✅ 提供菜单权限查询 API（`/api/menus`）

---

## 🐛 故障排查

### 问题 1: 菜单不显示

**原因**:
- 用户没有分配角色
- 角色没有分配菜单权限

**解决**:
```sql
-- 检查用户角色
SELECT * FROM user_roles WHERE user_id = 'user-uuid';

-- 检查角色菜单
SELECT * FROM menu_roles WHERE "roleId" = 'role-uuid';

-- 为角色分配菜单
INSERT INTO menu_roles ("menuId", "roleId") VALUES ('menu-uuid', 'role-uuid');
```

### 问题 2: 访问页面提示无权限

**原因**:
- 前端路由守卫检测到该路径不在允许的菜单列表中

**解决**:
1. 确认该菜单是否存在于数据库
2. 确认用户角色是否有该菜单权限
3. 检查前端 `canAccessPath()` 逻辑

### 问题 3: API 返回 403

**原因**:
- 后端权限验证失败

**解决**:
1. 检查 JWT token 是否有效
2. 检查用户是否有相应的功能权限（不是菜单权限）
3. 查看后端日志

---

## 📦 相关文件

### 数据库脚本
- `/database/rbac-menu-permissions-v2.sql` - 菜单权限初始化脚本

### 后端代码
- `/backend/user-service/src/menus/menus.module.ts`
- `/backend/user-service/src/menus/menus.controller.ts`
- `/backend/user-service/src/menus/menus.service.ts`

### 前端代码
- `/frontend/admin/src/utils/route-guard.ts`
- `/frontend/admin/src/components/DynamicMenu/index.tsx`

### 文档
- `/docs/MENU_PERMISSIONS_GUIDE.md` - 本文档
- `/docs/RBAC_OPTIMIZATION_RESULTS.md` - RBAC 优化成果报告

---

## ✅ 验证清单

- [x] 数据库表创建 (`menus`, `menu_roles`)
- [x] 菜单数据初始化 (50个菜单)
- [x] 角色菜单权限分配 (8个角色)
- [x] 后端 API 实现 (`/api/menus`)
- [x] 前端路由守卫实现
- [x] 前端动态菜单组件实现
- [ ] 集成到 user-service 的 AppModule
- [ ] 前端集成到主 Layout
- [ ] 创建 403 无权限页面
- [ ] E2E 测试

---

**维护者**: Claude Code
**最后更新**: 2025-11-06
**版本**: 1.0
