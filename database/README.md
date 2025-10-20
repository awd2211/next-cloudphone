# 云手机平台数据库管理

使用 TypeORM 和 TypeScript 管理数据库，无需手写 SQL 文件。

## 快速开始

### 1. 安装依赖

```bash
cd database
pnpm install
```

### 2. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=cloudphone
```

### 3. 初始化数据库

```bash
# 一键初始化（同步表结构 + 插入种子数据）
pnpm run init

# 或者分步执行
pnpm run schema:sync  # 同步表结构
pnpm run seed         # 插入种子数据
```

## 可用命令

### 表结构管理

```bash
# 同步表结构（根据 Entity 自动创建/更新表）
pnpm run schema:sync

# 删除所有表（⚠️ 危险操作）
pnpm run schema:drop

# 完全重置数据库（删除 + 重新创建 + 种子数据）
pnpm run reset
```

### 迁移管理（生产环境推荐）

```bash
# 生成迁移文件
pnpm run migration:generate -- migrations/MigrationName

# 运行迁移
pnpm run migration:run

# 回滚迁移
pnpm run migration:revert
```

### 种子数据

```bash
# 插入种子数据（权限、角色、用户、套餐）
pnpm run seed
```

## 初始化后的默认数据

### 管理员账号

```
用户名: admin
邮箱: admin@cloudphone.com
密码: admin123456
```

### 测试账号

```
用户名: testuser
邮箱: test@cloudphone.com
密码: test123456
```

### 默认角色

- **admin**: 超级管理员（所有权限）
- **user**: 普通用户（基础权限）

### 默认套餐

1. **免费版**: ¥0/月 - 1 个云手机
2. **基础版**: ¥29.9/月 - 5 个云手机
3. **专业版**: ¥99.9/月 - 20 个云手机
4. **企业版**: ¥499.9/月 - 100 个云手机

## 数据库表结构

所有表由 TypeORM Entity 自动生成，包括：

### 用户服务
- `users` - 用户表
- `roles` - 角色表
- `permissions` - 权限表
- `user_roles` - 用户角色关联
- `role_permissions` - 角色权限关联

### 设备服务
- `devices` - 设备表

### 应用服务
- `applications` - 应用表
- `device_applications` - 设备应用关联表

### 计费服务
- `orders` - 订单表
- `plans` - 套餐表
- `usage_records` - 使用记录表

## 开发 vs 生产

### 开发环境

使用 `synchronize: true` 自动同步表结构：

```typescript
{
  synchronize: true,  // 开发环境
}
```

### 生产环境

必须使用 Migration：

```typescript
{
  synchronize: false,  // 生产环境
  migrations: ['./migrations/*.ts'],
}
```

## 故障排查

### 连接失败

1. 检查 PostgreSQL 是否运行
2. 检查 `.env` 配置是否正确
3. 检查数据库是否存在

```bash
# 创建数据库
psql -U postgres -c "CREATE DATABASE cloudphone;"
```

### 权限问题

```bash
# 授权用户
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE cloudphone TO postgres;"
```

### 表已存在

```bash
# 完全重置
pnpm run reset
```

## 技术栈

- **TypeORM**: ORM 框架
- **PostgreSQL**: 数据库
- **TypeScript**: 开发语言
- **bcrypt**: 密码加密
- **dotenv**: 环境变量管理
