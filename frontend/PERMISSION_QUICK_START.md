# 前端权限系统快速启动指南

## 📋 访问权限管理页面

权限系统的前端页面已经添加到管理后台，您可以通过以下步骤访问：

### 1. 启动前端服务

```bash
cd frontend/admin
npm run dev
```

### 2. 登录管理后台

访问: `http://localhost:5173`

默认管理员账号：
- 用户名: `admin`
- 密码: `admin123`

### 3. 访问权限管理页面

登录后，在左侧菜单中找到：

```
系统管理
  ├─ 角色管理           (/roles)
  └─ 权限管理
      ├─ 权限列表       (/permissions)
      ├─ 数据范围配置    (/permissions/data-scope)
      └─ 字段权限配置    (/permissions/field-permission)
```

---

## 🎯 页面功能说明

### 1. 角色管理 (`/roles`)

**功能**：
- 创建、编辑、删除角色
- 为角色分配功能权限
- 支持树形视图和列表视图

**操作步骤**：
1. 点击「创建角色」创建新角色
2. 点击「配置权限」为角色分配权限
3. 在弹窗中选择权限（树形或列表视图）
4. 点击「确定」保存

### 2. 数据范围配置 (`/permissions/data-scope`)

**功能**：
- 配置角色对不同资源的数据访问范围
- 支持 6 种范围类型：全部、租户、部门、本人等
- 优先级管理
- 启用/禁用配置

**操作步骤**：
1. 选择筛选条件（角色、资源类型）
2. 点击「创建配置」
3. 填写表单：
   - 选择角色
   - 选择资源类型（设备、用户、应用等）
   - 选择范围类型
   - 如果是部门范围，填写部门ID
   - 如果是自定义范围，填写JSON过滤器
   - 设置优先级
4. 点击「确定」保存

**范围类型说明**：
- `ALL` - 全部数据（无限制）
- `TENANT` - 租户数据（当前租户的所有数据）
- `DEPARTMENT` - 部门数据（包含子部门）
- `DEPARTMENT_ONLY` - 仅本部门数据（不含子部门）
- `SELF` - 仅本人数据
- `CUSTOM` - 自定义过滤器（JSON格式）

### 3. 字段权限配置 (`/permissions/field-permission`)

**功能**：
- 配置角色对资源字段的访问权限
- 支持字段隐藏、只读、可写、必填
- 支持数据脱敏（手机号、邮箱、身份证等）
- 不同操作类型使用不同配置

**操作步骤**：
1. 选择筛选条件（角色、资源类型）
2. 点击「创建配置」
3. 填写表单：
   - 选择角色
   - 选择资源类型
   - 选择操作类型（创建、更新、查看、导出）
   - 配置字段规则：
     - **简单配置**：逗号分隔的字段列表
     - **高级配置**：JSON格式的精细控制
   - 设置优先级
4. 点击「查看示例」查看数据脱敏示例

**字段规则示例**：

**简单配置**：
```
隐藏字段: password, salt, twoFactorSecret
只读字段: id, email, createdAt, updatedAt
可写字段: name, phone, avatar
必填字段: name, email
```

**高级配置**：
```json
// 字段访问映射
{
  "phone": "read",
  "email": "write",
  "password": "hidden",
  "id": "read"
}

// 字段转换规则（数据脱敏）
{
  "phone": {
    "type": "mask",
    "pattern": "***-****-{4}"
  },
  "email": {
    "type": "mask",
    "pattern": "{3}***@***"
  },
  "idCard": {
    "type": "mask",
    "pattern": "{6}********{4}"
  }
}
```

---

## 🔧 故障排查

### 问题1: 页面空白或加载失败

**解决方案**：

1. 检查浏览器控制台是否有错误
2. 确认后端服务是否正常运行：
   ```bash
   # 检查 user-service 是否运行
   curl http://localhost:30001/health
   ```
3. 检查 API 网关是否正常：
   ```bash
   curl http://localhost:30000/api/health
   ```
4. 清除浏览器缓存并刷新

### 问题2: 数据无法加载

**解决方案**：

1. 确认已运行权限初始化脚本：
   ```bash
   cd backend/user-service
   npm run init:permissions
   ```
2. 检查数据库连接是否正常
3. 查看浏览器网络面板，检查 API 请求状态
4. 查看后端日志是否有错误

### 问题3: "未登录"或"权限不足"

**解决方案**：

1. 确认已登录（检查 localStorage 中是否有 token）
2. 使用默认管理员账号登录（admin / admin123）
3. 检查用户是否有相应权限：
   ```bash
   # 查看用户权限
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:30001/menu-permissions/my-permissions
   ```

### 问题4: TypeScript 编译错误

**解决方案**：

1. 确保所有依赖已安装：
   ```bash
   cd frontend/admin
   npm install
   ```
2. 重启开发服务器：
   ```bash
   npm run dev
   ```
3. 如果有类型错误，检查导入路径是否正确

---

## 📊 测试流程

### 完整测试步骤：

#### 1. 初始化权限数据

```bash
cd backend/user-service
npm run init:permissions
```

预期输出：
```
✅ 数据库连接成功
🔑 初始化权限...
  ✅ 创建权限: user:create
  ✅ 创建权限: device:read
  ... (更多权限)

👥 初始化角色...
  ✅ 创建角色: Super Admin
  ✅ 创建角色: Admin
  ... (更多角色)

📊 初始化数据范围配置...
  ✅ 创建数据范围: super_admin - device
  ... (更多配置)

🔒 初始化字段权限配置...
  ✅ 创建字段权限: user - user - VIEW
  ... (更多配置)

✅ 权限系统初始化完成！

📊 统计信息:
  - 权限数量: 50+
  - 角色数量: 6
  - 数据范围配置: 12
  - 字段权限配置: 5
```

#### 2. 启动服务

```bash
# 启动后端服务（如果未启动）
cd backend/user-service
npm run dev

# 启动前端服务
cd frontend/admin
npm run dev
```

#### 3. 登录测试

访问 `http://localhost:5173`，使用默认管理员账号登录：
- 用户名: `admin`
- 密码: `admin123`

#### 4. 功能测试

**A. 角色管理测试**：
1. 访问 `/roles` 页面
2. 创建一个新角色「测试角色」
3. 点击「配置权限」，分配一些权限
4. 保存并查看角色列表

**B. 数据范围配置测试**：
1. 访问 `/permissions/data-scope` 页面
2. 创建一个数据范围配置：
   - 角色: 测试角色
   - 资源类型: device
   - 范围类型: SELF
3. 保存并查看列表
4. 尝试编辑、启用/禁用、查看详情

**C. 字段权限配置测试**：
1. 访问 `/permissions/field-permission` 页面
2. 创建一个字段权限配置：
   - 角色: 测试角色
   - 资源类型: user
   - 操作类型: VIEW
   - 隐藏字段: password, salt
   - 只读字段: id, createdAt
3. 点击「查看示例」查看脱敏示例
4. 保存并查看列表

---

## 🎨 UI 预览

### 菜单结构
```
系统管理
  ├─ 角色管理
  └─ 权限管理
      ├─ 权限列表          (已有页面)
      ├─ 数据范围配置      (新增页面) ✨
      └─ 字段权限配置      (新增页面) ✨
```

### 页面特性

**数据范围配置页面**：
- ✅ 筛选功能（角色、资源类型）
- ✅ 表格展示（范围类型、优先级、状态等）
- ✅ 启用/禁用开关
- ✅ 创建/编辑对话框（表单验证）
- ✅ 详情查看（完整信息展示）

**字段权限配置页面**：
- ✅ 筛选功能（角色、资源类型）
- ✅ 表格展示（字段规则、操作类型等）
- ✅ 简单/高级配置切换（Tab）
- ✅ 脱敏示例展示（折叠面板）
- ✅ 字段规则可视化（Tag 展示）

---

## 💡 提示

### 开发建议

1. **使用浏览器开发者工具**：
   - 打开 Network 面板查看 API 请求
   - 查看 Console 查看日志和错误
   - 使用 React DevTools 调试组件

2. **API 测试**：
   ```bash
   # 测试权限 API
   curl http://localhost:30001/permissions

   # 测试数据范围 API
   curl http://localhost:30001/data-scopes

   # 测试字段权限 API
   curl http://localhost:30001/field-permissions

   # 测试菜单权限 API
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:30001/menu-permissions/my-menus
   ```

3. **日志查看**：
   ```bash
   # 查看后端日志
   cd backend/user-service
   npm run dev  # 查看控制台输出

   # 查看 Docker 日志（如果使用 Docker）
   docker logs cloudphone-user-service --tail 50 -f
   ```

---

## 📚 更多资源

- **完整使用指南**: `/home/eric/next-cloudphone/docs/PERMISSION_USAGE_GUIDE.md`
- **后端系统文档**: `/home/eric/next-cloudphone/backend/user-service/PERMISSION_SYSTEM_README.md`
- **API 文档**: 访问 `http://localhost:30001/api-docs`（如果配置了 Swagger）

---

## ✅ 检查清单

在开始使用前，请确认以下项目：

- [ ] 后端服务已启动（user-service）
- [ ] 数据库已创建并可连接
- [ ] 已运行权限初始化脚本 (`npm run init:permissions`)
- [ ] 前端服务已启动
- [ ] 能够正常登录管理后台
- [ ] 左侧菜单中能看到「权限管理」子菜单
- [ ] 能够访问数据范围配置页面
- [ ] 能够访问字段权限配置页面

---

**文档版本**: v1.0.0
**最后更新**: 2025-10-21
**维护者**: Claude Code

如有问题，请查看故障排查章节或联系技术支持。
