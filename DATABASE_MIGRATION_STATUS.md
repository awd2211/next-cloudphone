# 数据库迁移状态报告

**时间**: 2025-10-21 18:15  
**数据库**: cloudphone_core, cloudphone_billing

---

## 📊 迁移执行结果

### Atlas 配置更新 ✅

所有服务的 `atlas.hcl` 已更新为正确的数据库：

1. **api-gateway** → `cloudphone_core` ✅
2. **user-service** → `cloudphone_core` ✅  
3. **device-service** → `cloudphone_core` ✅
4. **app-service** → `cloudphone_core` ✅
5. **billing-service** → `cloudphone_billing` ✅
6. **notification-service** → `cloudphone_core` ✅

---

## 📈 迁移状态

### cloudphone_core 数据库

| 服务 | 迁移状态 | 实体数量 | 说明 |
|------|----------|----------|------|
| api-gateway | ✅ Applied | 2 | Baseline 迁移完成 |
| user-service | ⏳ Pending | 11 | 需要创建表 |
| device-service | ⏳ Pending | 4 | 需要创建表 |
| app-service | ⏳ Pending | 2 | 需要创建表 |
| notification-service | ⏳ Pending | ? | 需要创建表 |

### cloudphone_billing 数据库

| 服务 | 迁移状态 | 实体数量 | 说明 |
|------|----------|----------|------|
| billing-service | ✅ Applied | 8 | Baseline 迁移完成 |

---

## 🔍 当前问题

### 表结构未创建

**现象**:
- 数据库已创建
- 基线迁移已应用
- 但实际的表结构还未创建

**原因**:
- Atlas 迁移文件只包含空的 baseline
- 需要从 TypeORM 实体生成实际的表结构

---

## 💡 解决方案

### 方案 1: 临时启用 TypeORM Synchronize (推荐)

临时修改配置，让 TypeORM 自动创建表：

```typescript
// 在 app.module.ts 中
TypeOrmModule.forRoot({
  // ...
  synchronize: true,  // 临时启用
})
```

**步骤**:
1. 修改所有服务的 `synchronize: false` → `synchronize: true`
2. 重启服务（TypeORM 会自动创建表）
3. 从数据库生成 Atlas 迁移文件
4. 改回 `synchronize: false`

### 方案 2: 手动创建 SQL 迁移文件

为每个服务创建完整的 CREATE TABLE 语句：

```sql
-- 基于 TypeORM 实体手动编写
CREATE TABLE users (...);
CREATE TABLE roles (...);
-- etc
```

### 方案 3: 使用 TypeORM CLI 生成迁移

```bash
# 使用 TypeORM CLI
npx typeorm migration:generate -n InitialSchema
```

---

## 🚀 推荐执行步骤

###  1. 启用自动同步

```bash
# 临时修改配置
cd /home/eric/next-cloudphone/backend

# user-service
sed -i.bak 's/synchronize: false/synchronize: true/g' user-service/src/**/*.module.ts

# device-service
sed -i.bak 's/synchronize: false/synchronize: true/g' device-service/src/**/*.module.ts

# app-service
sed -i.bak 's/synchronize: false/synchronize: true/g' app-service/src/**/*.module.ts

# billing-service
sed -i.bak 's/synchronize: false/synchronize: true/g' billing-service/src/**/*.module.ts
```

### 2. 重启服务

```bash
pkill -f "pnpm run dev"
./start-all-services.sh
```

### 3. 验证表创建

```bash
# 检查 cloudphone_core
docker exec cloudphone-postgres psql -U postgres -d cloudphone_core -c "\dt"

# 检查 cloudphone_billing
docker exec cloudphone-postgres psql -U postgres -d cloudphone_billing -c "\dt"
```

### 4. 生成 Atlas 迁移（可选）

```bash
cd backend/user-service
atlas schema inspect --env local > schema.sql
atlas migrate diff --env local
```

### 5. 恢复配置

```bash
# 改回 synchronize: false
sed -i 's/synchronize: true/synchronize: false/g' */src/**/*.module.ts
```

---

## 📝 注意事项

### ⚠️ 生产环境警告

**切勿在生产环境使用 `synchronize: true`**

- ❌ 可能导致数据丢失
- ❌ 无法版本控制
- ❌ 无法回滚

**生产环境必须使用 Atlas 迁移**:
- ✅ 版本化的迁移文件
- ✅ 可回滚
- ✅ 可审计
- ✅ 安全可控

### 开发环境可选方案

**选项 A**: 使用 synchronize (快速原型)
```typescript
synchronize: process.env.NODE_ENV === 'development'
```

**选项 B**: 严格使用迁移 (更接近生产)
```typescript
synchronize: false  // 始终使用迁移
```

---

## 🎯 当前状态

- ✅ 所有服务正常运行 (5/5)
- ✅ 数据库已创建
- ✅ Atlas 配置已更新
- ✅ Baseline 迁移已应用
- ⏳ 需要创建表结构

---

## 📚 相关文档

- Atlas 文档: https://atlasgo.io/
- TypeORM 迁移: https://typeorm.io/migrations
- NestJS TypeORM: https://docs.nestjs.com/techniques/database

---

**下一步**: 选择上述方案之一创建数据库表结构

