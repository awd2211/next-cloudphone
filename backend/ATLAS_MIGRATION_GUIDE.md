# Atlas 数据库迁移指南

**版本**: v1.0  
**更新时间**: 2025-10-21

---

## 📚 目录

- [简介](#简介)
- [快速开始](#快速开始)
- [安装 Atlas](#安装-atlas)
- [初始化项目](#初始化项目)
- [日常工作流](#日常工作流)
- [命令参考](#命令参考)
- [最佳实践](#最佳实践)
- [故障排查](#故障排查)
- [CI/CD 集成](#cicd-集成)

---

## 🎯 简介

本项目使用 **Atlas** 作为数据库迁移工具，取代了之前的 TypeORM `synchronize: true` 方式。

### 为什么选择 Atlas？

✅ **声明式 + 版本化**: 结合两种模式的优点  
✅ **自动化安全检查**: 检测破坏性变更  
✅ **多环境支持**: dev/staging/prod 独立管理  
✅ **云原生**: 完美适配微服务架构  
✅ **可视化**: Atlas Cloud 提供 Schema 可视化  

### 架构概览

```
backend/
├── user-service/
│   ├── atlas.hcl          # Atlas 配置
│   ├── migrations/        # 迁移文件目录
│   └── schema.sql         # 导出的 Schema（可选）
├── device-service/
│   ├── atlas.hcl
│   ├── migrations/
│   └── schema.sql
├── billing-service/
│   ├── atlas.hcl
│   ├── migrations/
│   └── schema.sql
├── app-service/
│   ├── atlas.hcl
│   ├── migrations/
│   └── schema.sql
└── notification-service/
    ├── atlas.hcl
    ├── migrations/
    └── schema.sql
```

---

## 🚀 快速开始

### 1. 安装 Atlas CLI

#### macOS
```bash
brew install ariga/tap/atlas
```

#### Linux
```bash
curl -sSf https://atlasgo.sh | sh
```

#### 验证安装
```bash
atlas version
# 输出: atlas version v0.x.x
```

### 2. 初始化所有服务

运行初始化脚本，它会为所有服务从现有数据库导出 Schema 并创建基线迁移：

```bash
cd backend
./atlas-setup.sh
```

**脚本会自动完成：**
- ✅ 检查并安装 Atlas CLI
- ✅ 为每个服务导出当前数据库 Schema
- ✅ 创建基线迁移文件
- ✅ 初始化迁移目录

### 3. 验证设置

检查某个服务的迁移状态：

```bash
cd user-service
npm run migrate:status
```

---

## 📖 日常工作流

### 场景 1: 添加新表

假设你在 `user-service` 中添加了一个新的 Entity：

```typescript
// src/entities/user-session.entity.ts
@Entity('user_sessions')
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  userId: string;
  
  @Column()
  token: string;
  
  @CreateDateColumn()
  createdAt: Date;
}
```

#### 步骤：

```bash
cd backend/user-service

# 1. 生成迁移（Atlas 会自动检测变更）
npm run migrate:diff add_user_sessions

# 2. 查看生成的迁移文件
cat migrations/$(ls -t migrations/ | head -1)

# 3. 验证迁移
npm run migrate:lint

# 4. 应用到本地数据库
npm run migrate:apply

# 5. 确认状态
npm run migrate:status
```

### 场景 2: 修改现有列

假设要修改 `devices` 表的 `status` 列：

```bash
cd backend/device-service

# 1. 先修改 Entity 代码
# 例如: status: varchar(50) -> status: varchar(100)

# 2. 生成迁移
npm run migrate:diff update_device_status_length

# 3. 检查安全性（Atlas 会警告可能的数据丢失）
npm run migrate:lint

# 4. 如果安全，应用迁移
npm run migrate:apply
```

### 场景 3: 删除列（破坏性变更）

⚠️ **重要**: 删除列需要特别小心！

```bash
cd backend/billing-service

# 1. 生成迁移
npm run migrate:diff remove_old_column

# 2. Atlas 会警告这是破坏性变更
npm run migrate:lint
# 输出: ❌ Destructive changes detected...

# 3. 使用分阶段迁移策略（推荐）
# 阶段 1: 停止使用该列（部署代码）
# 阶段 2: 等待一段时间（确保无依赖）
# 阶段 3: 删除列（执行迁移）
```

### 场景 4: 回滚迁移

```bash
cd backend/app-service

# 查看迁移历史
npm run migrate:status

# 回滚到特定版本
atlas migrate down \
  --url "postgres://postgres:postgres@localhost:5432/cloudphone?sslmode=disable" \
  --dir "file://migrations" \
  --to-version 20241020000001

# ⚠️ 注意: 不是所有迁移都可以自动回滚
# 对于复杂的迁移，可能需要手动编写回滚脚本
```

---

## 🔧 命令参考

### 常用命令

#### 1. 查看迁移状态
```bash
npm run migrate:status
# 或
atlas migrate status --env local
```

**输出示例：**
```
Migration Status:
  Current Version: 20241020000002
  Pending Migrations: 1
    - 20241020000003_add_new_table.sql
```

#### 2. 应用迁移
```bash
npm run migrate:apply
# 或
atlas migrate apply --env local
```

#### 3. 生成新迁移
```bash
npm run migrate:diff <migration_name>
# 或
atlas migrate diff <migration_name> --env local
```

#### 4. 验证迁移
```bash
npm run migrate:validate
# 或
atlas migrate validate --env local
```

#### 5. 检查迁移安全性
```bash
npm run migrate:lint
# 或
atlas migrate lint --env local
```

#### 6. 导出当前数据库 Schema
```bash
npm run schema:inspect
# 或
atlas schema inspect \
  --url "postgres://postgres:postgres@localhost:5432/cloudphone?sslmode=disable" \
  --format '{{ sql . }}' > schema.sql
```

#### 7. 应用 Schema（声明式模式）
```bash
npm run schema:apply
# 或
atlas schema apply --env local --auto-approve
```

### 环境切换

Atlas 支持多环境配置（在 `atlas.hcl` 中定义）：

```bash
# 本地开发
atlas migrate apply --env local

# 开发环境
DATABASE_URL="postgres://..." atlas migrate apply --env dev

# Staging 环境
DATABASE_URL="postgres://..." atlas migrate apply --env staging

# 生产环境（需要手动批准）
DATABASE_URL="postgres://..." atlas migrate apply --env production
```

---

## 🎯 最佳实践

### 1. 迁移命名规范

使用描述性名称，遵循以下格式：

```bash
# ✅ 好的命名
atlas migrate diff create_users_table
atlas migrate diff add_email_to_users
atlas migrate diff add_index_on_user_email
atlas migrate diff remove_deprecated_status_column

# ❌ 不好的命名
atlas migrate diff migration1
atlas migrate diff update
atlas migrate diff fix
```

### 2. 每个迁移做一件事

```bash
# ✅ 好的做法
atlas migrate diff add_sessions_table
atlas migrate diff add_index_on_sessions

# ❌ 不好的做法
atlas migrate diff multiple_changes  # 包含了 10 个表的变更
```

### 3. 测试迁移

在应用到生产之前，务必：

```bash
# 1. 在本地测试
npm run migrate:apply

# 2. 检查 lint 警告
npm run migrate:lint

# 3. 在 staging 环境测试
DATABASE_URL="..." atlas migrate apply --env staging

# 4. 确认无误后再应用到生产
DATABASE_URL="..." atlas migrate apply --env production
```

### 4. 破坏性变更的处理

对于删除列、修改列类型等破坏性变更，使用**扩展-收缩模式**：

#### 示例：重命名列

```sql
-- ❌ 错误做法：直接重命名
ALTER TABLE users RENAME COLUMN old_name TO new_name;

-- ✅ 正确做法：分三步
-- 迁移 1: 添加新列
ALTER TABLE users ADD COLUMN new_name VARCHAR(255);

-- 部署应用：同时读写两个列
-- 数据迁移：将 old_name 数据复制到 new_name

-- 迁移 2: 删除旧列（等待一段时间后）
ALTER TABLE users DROP COLUMN old_name;
```

### 5. 使用事务

Atlas 默认在事务中执行迁移，但要注意：

```sql
-- ✅ 好的迁移：快速执行
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- ⚠️ 注意：某些操作不能在事务中执行
-- 例如: CREATE INDEX CONCURRENTLY
```

### 6. 备份策略

在生产环境应用迁移前：

```bash
# 1. 备份数据库
pg_dump cloudphone > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 测试迁移（dry-run）
atlas migrate apply --env production --dry-run

# 3. 应用迁移
atlas migrate apply --env production

# 4. 验证
atlas migrate status --env production
```

### 7. 版本控制

- ✅ **DO**: 将迁移文件提交到 Git
- ✅ **DO**: 在 PR 中 review 迁移文件
- ❌ **DON'T**: 修改已应用的迁移文件
- ❌ **DON'T**: 删除已应用的迁移文件

---

## 🐛 故障排查

### 问题 1: "No migrations to apply"

**原因**: 可能没有生成迁移文件，或迁移已应用。

**解决方案**:
```bash
# 检查迁移状态
npm run migrate:status

# 检查 migrations/ 目录
ls -la migrations/

# 如果没有迁移，生成一个
npm run migrate:diff initial_setup
```

### 问题 2: "Migration checksum mismatch"

**原因**: 迁移文件被修改。

**解决方案**:
```bash
# ❌ 不要修改已应用的迁移文件！

# 如果确实需要修改，创建新迁移
npm run migrate:diff fix_previous_migration
```

### 问题 3: "Connection refused"

**原因**: 数据库未运行或连接配置错误。

**解决方案**:
```bash
# 检查数据库是否运行
docker ps | grep postgres

# 启动数据库
docker-compose up -d postgres

# 测试连接
psql -h localhost -U postgres -d cloudphone
```

### 问题 4: "Destructive changes detected"

**原因**: 迁移包含破坏性变更（删除表/列）。

**解决方案**:
```bash
# 1. Review 变更
cat migrations/$(ls -t migrations/ | head -1)

# 2. 如果确认安全，使用 --allow-dirty
atlas migrate apply --env local --allow-dirty

# 3. 或者使用扩展-收缩模式重新设计迁移
```

### 问题 5: 多个服务共享一个数据库

**当前配置**: 所有服务共享 `cloudphone` 数据库。

**建议**:
```sql
-- 为每个服务使用独立的 schema
CREATE SCHEMA user_service;
CREATE SCHEMA device_service;
CREATE SCHEMA billing_service;

-- 修改 atlas.hcl 中的 URL
url = "postgres://postgres:postgres@localhost:5432/cloudphone?search_path=user_service&sslmode=disable"
```

---

## 🔄 CI/CD 集成

### GitHub Actions

项目已配置两个工作流：

#### 1. 自动迁移验证 (`.github/workflows/atlas-migrate.yml`)

- ✅ PR 时自动运行 lint
- ✅ 验证迁移安全性
- ✅ 生成迁移报告
- ✅ main 分支 push 时自动部署到 staging

#### 2. 生产环境迁移 (`.github/workflows/atlas-migrate-production.yml`)

- ⚠️ 手动触发
- ⚠️ 需要输入 "MIGRATE" 确认
- ✅ 支持 dry-run 预览
- ✅ 支持单个服务或所有服务

**使用方法**:

1. 前往 GitHub Actions
2. 选择 "Atlas Production Migrations"
3. 点击 "Run workflow"
4. 选择服务和选项
5. 输入 "MIGRATE" 确认
6. 点击 "Run"

### Docker Compose 集成

已在 `docker-compose.yml` 中添加了 Atlas 迁移服务：

```bash
# 运行所有迁移
docker-compose up \
  atlas-migrate-user \
  atlas-migrate-device \
  atlas-migrate-billing \
  atlas-migrate-app \
  atlas-migrate-notification

# 运行单个服务迁移
docker-compose up atlas-migrate-user
```

---

## 📊 监控和可观测性

### Atlas Cloud（可选）

注册 [Atlas Cloud](https://auth.atlasgo.cloud/signup) 可以获得：

- ✅ 可视化 Schema 管理
- ✅ 迁移历史记录
- ✅ 团队协作功能
- ✅ Slack/Discord 通知

**设置步骤**:

1. 创建账号并获取 Token
2. 设置环境变量:
   ```bash
   export ATLAS_CLOUD_TOKEN="aci_xxx"
   ```
3. 在 `atlas.hcl` 中启用云集成

### 本地监控

检查迁移状态脚本：

```bash
#!/bin/bash
# check-migrations.sh

for service in user-service device-service billing-service app-service notification-service; do
    echo "=== $service ==="
    cd backend/$service
    atlas migrate status --env local
    cd ../..
done
```

---

## 🔐 安全注意事项

### 1. 数据库凭证

- ❌ **绝不** 在 `atlas.hcl` 中硬编码密码
- ✅ 使用环境变量: `getenv("DATABASE_URL")`
- ✅ 使用 Secrets 管理工具

### 2. 生产环境访问

```hcl
env "production" {
  url = getenv("DATABASE_URL")
  
  migration {
    dir = "file://migrations"
    # 生产环境禁止自动批准
    auto_approve = false
  }
  
  lint {
    # 严格模式
    destructive {
      error = true
    }
  }
}
```

### 3. 权限控制

创建专门的迁移用户：

```sql
-- 创建迁移用户
CREATE USER atlas_migrate WITH PASSWORD 'secure_password';

-- 授予必要权限
GRANT CONNECT ON DATABASE cloudphone TO atlas_migrate;
GRANT USAGE ON SCHEMA public TO atlas_migrate;
GRANT CREATE ON SCHEMA public TO atlas_migrate;
GRANT ALL ON ALL TABLES IN SCHEMA public TO atlas_migrate;
```

---

## 📚 相关资源

- [Atlas 官方文档](https://atlasgo.io/docs)
- [Atlas CLI 参考](https://atlasgo.io/cli-reference)
- [Atlas Cloud](https://atlasgo.cloud)
- [GitHub - Atlas](https://github.com/ariga/atlas)

---

## 🆘 获取帮助

### 内部支持

- Slack: #database-migrations
- 联系 DBA 团队
- 查看本项目 Wiki

### 社区支持

- [Atlas Discord](https://discord.gg/zZ6sWVg6NT)
- [GitHub Discussions](https://github.com/ariga/atlas/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/atlas)

---

## 📝 变更日志

### v1.0 (2025-10-21)
- ✅ 初始版本
- ✅ 为所有 5 个微服务配置 Atlas
- ✅ 禁用 TypeORM `synchronize`
- ✅ 添加 CI/CD 集成
- ✅ 创建迁移指南

---

**Happy Migrating! 🚀**

