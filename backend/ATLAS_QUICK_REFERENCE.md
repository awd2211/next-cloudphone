# Atlas 快速参考卡片

> 🚀 常用命令速查

---

## 📋 快速开始

```bash
# 1. 安装 Atlas
curl -sSf https://atlasgo.sh | sh

# 2. 初始化所有服务
cd backend && ./atlas-setup.sh

# 3. 检查状态
cd user-service && npm run migrate:status
```

---

## 🔄 日常命令

### 查看迁移状态
```bash
npm run migrate:status
```

### 生成新迁移
```bash
npm run migrate:diff <migration_name>
# 示例: npm run migrate:diff add_users_table
```

### 应用迁移
```bash
npm run migrate:apply
```

### 验证迁移安全性
```bash
npm run migrate:lint
```

### 导出当前 Schema
```bash
npm run schema:inspect
```

---

## 🎯 常见场景

### 添加新表
```bash
# 1. 修改代码添加 Entity
# 2. 生成迁移
npm run migrate:diff create_new_table

# 3. 验证
npm run migrate:lint

# 4. 应用
npm run migrate:apply
```

### 修改列
```bash
# 1. 修改 Entity
# 2. 生成迁移
npm run migrate:diff update_column_type

# 3. 检查警告
npm run migrate:lint

# 4. 应用
npm run migrate:apply
```

### 添加索引
```bash
npm run migrate:diff add_index_on_email
npm run migrate:apply
```

---

## 🔧 所有 npm 脚本

| 命令 | 说明 |
|------|------|
| `npm run migrate:status` | 查看迁移状态 |
| `npm run migrate:apply` | 应用迁移 |
| `npm run migrate:diff <name>` | 生成新迁移 |
| `npm run migrate:lint` | 检查迁移安全性 |
| `npm run migrate:validate` | 验证迁移完整性 |
| `npm run schema:inspect` | 导出数据库 Schema |
| `npm run schema:apply` | 应用 Schema（声明式） |

---

## 🐳 Docker Compose

### 运行所有迁移
```bash
docker-compose up \
  atlas-migrate-user \
  atlas-migrate-device \
  atlas-migrate-billing \
  atlas-migrate-app \
  atlas-migrate-notification
```

### 运行单个服务迁移
```bash
docker-compose up atlas-migrate-user
```

---

## 🚨 故障排查

### 数据库连接失败
```bash
# 检查数据库是否运行
docker ps | grep postgres

# 启动数据库
docker-compose up -d postgres
```

### 没有迁移可应用
```bash
# 检查迁移目录
ls -la migrations/

# 生成初始迁移
npm run migrate:diff initial_setup
```

### 破坏性变更警告
```bash
# 查看详情
npm run migrate:lint

# 如果确认安全
atlas migrate apply --env local --allow-dirty
```

---

## 📦 服务列表

- ✅ user-service
- ✅ device-service
- ✅ billing-service
- ✅ app-service
- ✅ notification-service

---

## 🔐 环境配置

### 本地开发
```bash
atlas migrate apply --env local
```

### Staging
```bash
DATABASE_URL="postgres://..." atlas migrate apply --env staging
```

### 生产（通过 GitHub Actions）
```
Actions → Atlas Production Migrations → Run workflow
```

---

## ⚠️ 重要提醒

1. ❌ **禁止修改已应用的迁移文件**
2. ✅ **所有迁移都要提交到 Git**
3. ⚠️ **生产环境迁移前先备份数据库**
4. ✅ **破坏性变更使用扩展-收缩模式**
5. ✅ **迁移前先在 staging 测试**

---

## 📚 更多信息

查看完整文档: [ATLAS_MIGRATION_GUIDE.md](./ATLAS_MIGRATION_GUIDE.md)

