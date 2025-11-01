# 🚀 数据库迁移系统 - 快速开始

## 当前状态

✅ **迁移系统已重建完成!**

- 已从 Atlas 迁移到 TypeORM Migrations
- 所有配置文件已创建
- 所有测试已通过
- **下一步: 执行基线迁移**

---

## 立即执行 (3分钟)

### 1. 执行基线迁移

```bash
# 方法1: 一键执行所有服务(推荐)
./scripts/migrate-all-services.sh

# 方法2: 手动执行
cd backend/user-service && pnpm migration:run
cd backend/device-service && pnpm migration:run
cd backend/app-service && pnpm migration:run
cd backend/billing-service && pnpm migration:run
cd backend/notification-service && pnpm migration:run
```

### 2. 验证成功

```bash
# 检查迁移状态
cd backend/user-service
pnpm migration:show

# 应该看到:
# [X] BaselineFromExisting1730419200000 (executed)

# 检查数据库
psql -U postgres -d cloudphone_user -c "SELECT * FROM typeorm_migrations;"
```

---

## 日常使用

### 创建新迁移

```bash
# 1. 修改 Entity
# src/entities/user.entity.ts
@Column()
phoneNumber: string;

# 2. 自动生成迁移
pnpm migration:generate src/migrations/AddPhoneNumber

# 3. 执行
pnpm migration:run
```

### 常用命令

```bash
pnpm migration:show      # 查看状态
pnpm migration:run       # 执行迁移
pnpm migration:revert    # 回滚
```

---

## 📚 完整文档

- [NEW_MIGRATION_SYSTEM.md](docs/NEW_MIGRATION_SYSTEM.md) - 详细使用指南
- [WHY_TYPEORM_NOT_ATLAS.md](docs/WHY_TYPEORM_NOT_ATLAS.md) - 为什么改用TypeORM
- [MIGRATION_REBUILD_COMPLETE.md](docs/MIGRATION_REBUILD_COMPLETE.md) - 完整报告

---

## ❓ 常见问题

**Q: 为什么不用 Atlas 了?**
A: Atlas从未实际使用,TypeORM更适合我们的项目。详见 [WHY_TYPEORM_NOT_ATLAS.md](docs/WHY_TYPEORM_NOT_ATLAS.md)

**Q: 旧的迁移文件在哪?**
A: 已备份在 `backup/migrations-old-*`

**Q: 如何创建迁移?**
A: `pnpm migration:generate src/migrations/MyChanges`

---

**立即行动**: 运行 `./scripts/migrate-all-services.sh`
