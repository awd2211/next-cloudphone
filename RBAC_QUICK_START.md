# RBAC 快速开始指南

本指南帮助你快速设置和测试云手机平台的RBAC（基于角色的访问控制）系统。

## 📋 前提条件

1. **服务已启动**
   ```bash
   # 启动基础设施
   docker compose -f docker-compose.dev.yml up -d

   # 启动后端服务
   pm2 start ecosystem.config.js

   # 启动前端（新终端）
   cd frontend/admin && pnpm dev
   ```

2. **数据库已初始化**
   ```bash
   # 初始化数据库
   docker compose -f docker-compose.dev.yml exec -T postgres \
     psql -U postgres < database/init-databases.sql

   # 初始化角色和权限
   docker compose -f docker-compose.dev.yml exec -T postgres \
     psql -U postgres -d cloudphone < database/seed-roles.sql
   ```

## 🚀 快速测试

### 1. 运行自动化测试

```bash
./scripts/test-frontend-rbac.sh
```

这个脚本会：
- ✅ 检查服务状态
- ✅ 测试不同角色的登录
- ✅ 验证API权限控制
- ✅ 提供手动测试清单

### 2. 创建测试用户

如果测试用户不存在，创建它们：

```bash
# 使用 psql 创建测试用户
docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d cloudphone_user <<'EOF'
-- 创建超级管理员（如果不存在）
INSERT INTO users (id, username, email, password, status, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'superadmin', 'superadmin@example.com',
   '$2b$10$XQjZ1VqYZ9Z8Z9Z8Z9Z8ZOqZ8Z9Z8Z9Z8Z9Z8Z9Z8Z9Z8Z9Z8Z',
   'active', NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- 创建管理员
INSERT INTO users (id, username, email, password, status, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'admin', 'admin@example.com',
   '$2b$10$XQjZ1VqYZ9Z8Z9Z8Z9Z8ZOqZ8Z9Z8Z9Z8Z9Z8Z9Z8Z9Z8Z9Z8Z',
   'active', NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- 创建普通用户
INSERT INTO users (id, username, email, password, status, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'user', 'user@example.com',
   '$2b$10$XQjZ1VqYZ9Z8Z9Z8Z9Z8ZOqZ8Z9Z8Z9Z8Z9Z8Z9Z8Z9Z8Z9Z8Z',
   'active', NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- 分配角色
INSERT INTO user_roles ("userId", "roleId", "createdAt")
SELECT u.id, r.id, NOW()
FROM users u
CROSS JOIN roles r
WHERE u.username = 'superadmin' AND r.name = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles ("userId", "roleId", "createdAt")
SELECT u.id, r.id, NOW()
FROM users u
CROSS JOIN roles r
WHERE u.username = 'admin' AND r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles ("userId", "roleId", "createdAt")
SELECT u.id, r.id, NOW()
FROM users u
CROSS JOIN roles r
WHERE u.username = 'user' AND r.name = 'user'
ON CONFLICT DO NOTHING;
EOF
```

**注意**: 密码是 `admin123` 或 `user123`（已加密）

### 3. 手动前端测试

#### 测试普通用户 (user/user123)

1. **登录**: http://localhost:5173/login
   - 用户名: `user`
   - 密码: `user123`

2. **仪表盘验证**:
   - ✅ 只显示设备统计（"我的设备"标签）
   - ✅ 设备状态分布图全宽显示
   - ❌ 不显示用户统计、应用统计
   - ❌ 不显示收入图表、订单统计
   - ✅ 角色标签显示"普通用户"（蓝色）

3. **路由测试**:
   - 访问 http://localhost:5173/users → 应该重定向或显示403
   - 访问 http://localhost:5173/roles → 应该重定向或显示403
   - 访问 http://localhost:5173/system/cache → 应该显示403

4. **设备列表**:
   - ✅ 可以查看设备列表
   - ✅ 可以启动/停止/重启设备
   - ❌ 没有删除按钮（单个和批量）

#### 测试管理员 (admin/admin123)

1. **登录**: http://localhost:5173/login
   - 用户名: `admin`
   - 密码: `admin123`

2. **仪表盘验证**:
   - ✅ 显示所有统计（设备、用户、应用）
   - ✅ 显示收入和订单统计
   - ✅ 显示所有图表
   - ✅ 角色标签显示"管理员"（橙色）

3. **路由测试**:
   - 访问 http://localhost:5173/users → ✅ 可以访问
   - 访问 http://localhost:5173/roles → ✅ 可以访问
   - 访问 http://localhost:5173/permissions → ✅ 可以访问
   - 访问 http://localhost:5173/system/cache → ❌ 显示403（只有超级管理员）

4. **设备列表**:
   - ✅ 显示删除按钮
   - ✅ 批量删除按钮可见

5. **用户列表**:
   - ✅ 创建用户按钮可见
   - ✅ 充值/扣减按钮可见
   - ✅ 封禁/解封按钮可见
   - ✅ 删除按钮可见

#### 测试超级管理员 (superadmin/admin123)

1. **登录**: http://localhost:5173/login
   - 用户名: `superadmin`
   - 密码: `admin123`

2. **全部功能可用**:
   - ✅ 所有仪表盘统计
   - ✅ 所有管理页面
   - ✅ 系统管理页面（Cache, Queue, Events）
   - ✅ 角色标签显示"超级管理员"（红色）

3. **系统管理测试**:
   - 访问 http://localhost:5173/system/cache → ✅ 可以访问
   - 访问 http://localhost:5173/system/queue → ✅ 可以访问
   - 访问 http://localhost:5173/system/events → ✅ 可以访问

## 🔍 验证检查清单

### Backend API 权限

运行完整的RBAC测试：

```bash
./scripts/test-rbac.sh
```

### Frontend UI 权限

- [ ] 仪表盘按角色显示不同内容
- [ ] 路由保护正常工作（403或重定向）
- [ ] 设备列表删除按钮权限控制
- [ ] 用户列表操作按钮权限控制
- [ ] 角色标签正确显示

### 权限系统集成

- [ ] PermissionGuard 正确隐藏无权限的按钮
- [ ] RoleGuard 正确隐藏无权限的组件
- [ ] AdminRoute 正确保护路由
- [ ] 403 页面显示清晰的错误信息

## 🛠️ 故障排查

### 问题: 登录失败

**解决方案**:
1. 检查用户服务是否运行: `pm2 logs user-service`
2. 验证数据库连接: `docker compose -f docker-compose.dev.yml ps postgres`
3. 检查用户是否存在:
   ```bash
   docker compose -f docker-compose.dev.yml exec postgres \
     psql -U postgres -d cloudphone_user -c "SELECT username, status FROM users;"
   ```

### 问题: 权限检查不工作

**解决方案**:
1. 清除浏览器 localStorage
2. 重新登录获取新 token
3. 检查权限是否正确分配:
   ```bash
   docker compose -f docker-compose.dev.yml exec postgres \
     psql -U postgres -d cloudphone <<EOF
   SELECT u.username, r.name as role, p.resource, p.action
   FROM users u
   JOIN user_roles ur ON u.id = ur."userId"
   JOIN roles r ON ur."roleId" = r.id
   JOIN role_permissions rp ON r.id = rp."roleId"
   JOIN permissions p ON rp."permissionId" = p.id
   WHERE u.username = 'admin';
   EOF
   ```

### 问题: 前端路由保护不工作

**解决方案**:
1. 检查 `localStorage.getItem('user')` 是否包含 roles
2. 打开浏览器控制台查看错误
3. 验证 useRole hook 是否正确读取角色
4. 检查 AdminRoute 组件是否正确包裹路由

### 问题: 403 页面不显示

**解决方案**:
1. 确认 AdminRoute 的 `showForbidden` 属性为 `true`
2. 检查路由配置是否正确
3. 验证用户角色是否正确存储

## 📚 相关文档

- **完整实施指南**: `RBAC_IMPLEMENTATION_GUIDE.md`
- **权限矩阵**: `RBAC_PERMISSION_MATRIX.md`
- **前端集成报告**: `FRONTEND_RBAC_INTEGRATION_COMPLETE.md`
- **测试脚本**: `scripts/test-rbac.sh`, `scripts/test-frontend-rbac.sh`

## 🎯 下一步

1. **自定义权限**: 在 `database/seed-roles.sql` 中添加新权限
2. **创建新角色**: 添加业务特定的角色
3. **菜单权限**: 集成 `/menu-permissions` API 实现动态菜单
4. **字段权限**: 使用字段级权限隐藏敏感数据
5. **审计日志**: 集成审计系统记录权限相关操作

## ✅ 成功标志

当以下条件都满足时，RBAC系统已正确配置：

- ✅ 不同角色用户登录后看到不同的UI
- ✅ 普通用户无法访问管理页面
- ✅ 管理员无法访问超级管理员页面
- ✅ 操作按钮根据权限显示/隐藏
- ✅ 后端API正确拒绝无权限请求
- ✅ 403页面提供清晰的错误信息

**祝测试顺利！** 🎉
