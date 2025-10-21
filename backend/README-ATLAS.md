# Atlas 数据库迁移 - 项目概览

> 🎯 本项目已从 TypeORM `synchronize: true` 迁移到 **Atlas** 进行数据库版本管理

---

## ✅ 已完成的工作

### 1. Atlas 配置
- ✅ 为 5 个微服务创建了 `atlas.hcl` 配置文件
- ✅ 配置了多环境支持 (local/dev/staging/production)
- ✅ 启用了安全检查和 lint 规则

### 2. 迁移目录结构
```
backend/
├── user-service/
│   ├── atlas.hcl
│   ├── migrations/
│   └── .atlas/
├── device-service/
│   ├── atlas.hcl
│   ├── migrations/
│   └── .atlas/
├── billing-service/
│   ├── atlas.hcl
│   ├── migrations/
│   └── .atlas/
├── app-service/
│   ├── atlas.hcl
│   ├── migrations/
│   └── .atlas/
└── notification-service/
    ├── atlas.hcl
    ├── migrations/
    └── .atlas/
```

### 3. package.json 脚本
每个服务都添加了以下脚本：
- `migrate:status` - 查看迁移状态
- `migrate:apply` - 应用迁移
- `migrate:diff` - 生成新迁移
- `migrate:lint` - 检查迁移安全性
- `migrate:validate` - 验证迁移
- `schema:inspect` - 导出 Schema
- `schema:apply` - 应用 Schema

### 4. TypeORM synchronize 已禁用
所有服务的 `synchronize` 已设置为 `false`，包括：
- ✅ user-service
- ✅ device-service
- ✅ billing-service
- ✅ app-service
- ✅ notification-service
- ✅ api-gateway

### 5. Docker Compose 集成
添加了 5 个 Atlas 迁移服务：
- `atlas-migrate-user`
- `atlas-migrate-device`
- `atlas-migrate-billing`
- `atlas-migrate-app`
- `atlas-migrate-notification`

### 6. CI/CD 配置
创建了两个 GitHub Actions 工作流：
- `.github/workflows/atlas-migrate.yml` - 自动验证和 staging 部署
- `.github/workflows/atlas-migrate-production.yml` - 手动生产环境迁移

### 7. 文档
- ✅ `ATLAS_MIGRATION_GUIDE.md` - 完整使用指南
- ✅ `ATLAS_QUICK_REFERENCE.md` - 快速参考
- ✅ `README-ATLAS.md` - 项目概览（本文件）

---

## 🚀 下一步操作

### 1. 安装 Atlas CLI
```bash
# macOS
brew install ariga/tap/atlas

# Linux
curl -sSf https://atlasgo.sh | sh
```

### 2. 初始化项目
```bash
cd backend
./atlas-setup.sh
```

这个脚本会：
- 检查并安装 Atlas（如果需要）
- 从现有数据库导出 Schema
- 为每个服务创建基线迁移

### 3. 验证设置
```bash
cd user-service
npm run migrate:status
```

### 4. 开始使用
从现在开始，当你需要修改数据库时：

```bash
# 1. 修改 Entity 代码
# 2. 生成迁移
npm run migrate:diff <migration_name>

# 3. 验证迁移
npm run migrate:lint

# 4. 应用迁移
npm run migrate:apply
```

---

## 📚 文档索引

### 新手入门
👉 先阅读 [ATLAS_QUICK_REFERENCE.md](./ATLAS_QUICK_REFERENCE.md)

### 详细指南
👉 查看 [ATLAS_MIGRATION_GUIDE.md](./ATLAS_MIGRATION_GUIDE.md)

包含内容：
- 安装和设置
- 日常工作流
- 命令参考
- 最佳实践
- 故障排查
- CI/CD 集成

---

## 🎯 关键变化

### 之前（TypeORM synchronize）
```typescript
TypeOrmModule.forRoot({
  // ...
  synchronize: true, // ❌ 自动同步 Schema
})
```

**问题：**
- ⚠️ 生产环境不安全
- ⚠️ 可能丢失数据
- ⚠️ 无法回滚
- ⚠️ 无版本控制

### 现在（Atlas 迁移）
```typescript
TypeOrmModule.forRoot({
  // ...
  synchronize: false, // ✅ 禁用自动同步
})
```

**优势：**
- ✅ 版本化迁移
- ✅ 安全检查
- ✅ 可回滚
- ✅ 团队协作
- ✅ CI/CD 集成

---

## 🔧 常用命令速查

```bash
# 查看状态
npm run migrate:status

# 生成迁移
npm run migrate:diff add_new_table

# 检查安全性
npm run migrate:lint

# 应用迁移
npm run migrate:apply

# Docker 方式运行
docker-compose up atlas-migrate-user
```

---

## 🚨 重要注意事项

### ⚠️ 禁止操作
1. ❌ 不要修改已应用的迁移文件
2. ❌ 不要删除已应用的迁移文件
3. ❌ 不要在生产环境使用 `synchronize: true`
4. ❌ 不要跳过迁移验证

### ✅ 推荐做法
1. ✅ 所有迁移提交到 Git
2. ✅ PR 中 review 迁移文件
3. ✅ 在 staging 测试后再部署生产
4. ✅ 生产迁移前先备份数据库
5. ✅ 使用描述性的迁移名称

---

## 📊 项目状态

| 服务 | Atlas 配置 | 迁移目录 | package.json | TypeORM sync | 状态 |
|------|-----------|----------|--------------|--------------|------|
| user-service | ✅ | ✅ | ✅ | ❌ disabled | ✅ 完成 |
| device-service | ✅ | ✅ | ✅ | ❌ disabled | ✅ 完成 |
| billing-service | ✅ | ✅ | ✅ | ❌ disabled | ✅ 完成 |
| app-service | ✅ | ✅ | ✅ | ❌ disabled | ✅ 完成 |
| notification-service | ✅ | ✅ | ✅ | ❌ disabled | ✅ 完成 |

---

## 🆘 获取帮助

### 快速问题
查看 [ATLAS_QUICK_REFERENCE.md](./ATLAS_QUICK_REFERENCE.md)

### 详细问题
查看 [ATLAS_MIGRATION_GUIDE.md](./ATLAS_MIGRATION_GUIDE.md)

### 紧急问题
1. 检查 GitHub Actions 日志
2. 查看 Atlas 官方文档: https://atlasgo.io/docs
3. 联系 DBA 团队

---

## 🔗 相关链接

- [Atlas 官网](https://atlasgo.io)
- [Atlas 文档](https://atlasgo.io/docs)
- [Atlas CLI 参考](https://atlasgo.io/cli-reference)
- [Atlas GitHub](https://github.com/ariga/atlas)
- [Atlas Cloud](https://atlasgo.cloud)

---

**版本**: v1.0  
**更新时间**: 2025-10-21  
**维护者**: DevOps Team

---

Happy Migrating! 🚀

