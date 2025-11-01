# 新的数据库迁移系统

## 🎉 已完成迁移重构

我们已经将所有后端服务从 **Atlas** 迁移到 **TypeORM Migrations**,建立了统一的数据库迁移管理系统。

## 📊 变更总结

### 删除的内容

- ❌ 旧的 `migrations/` 目录(已备份到 `backup/migrations-old-*`)
- ❌ Atlas 配置文件(`atlas.hcl`, `atlas.sum`, `schema.hcl`)
- ❌ Atlas 相关的 npm 脚本

### 新增的内容

- ✅ TypeORM CLI 配置文件: `src/config/typeorm-cli.config.ts`
- ✅ 基线迁移文件: `src/migrations/1730419200000-BaselineFromExisting.ts`
- ✅ 统一的 npm 脚本: `migration:*`

## 🚀 快速开始

### 1. 执行基线迁移

首先为所有服务执行基线迁移,建立迁移追踪:

```bash
# User Service
cd backend/user-service
pnpm migration:run

# Device Service
cd ../device-service
pnpm migration:run

# App Service
cd ../app-service
pnpm migration:run

# Billing Service
cd ../billing-service
pnpm migration:run

# Notification Service
cd ../notification-service
pnpm migration:run
```

或者使用脚本一键执行:

```bash
./scripts/migrate-all-services.sh
```

### 2. 验证迁移系统

```bash
cd backend/user-service

# 查看迁移状态
pnpm migration:show

# 应该看到:
# [ ] BaselineFromExisting1730419200000 (executed)
```

检查数据库:

```sql
-- 连接到数据库
psql -U postgres -d cloudphone_user

-- 查看迁移历史表
SELECT * FROM typeorm_migrations;

-- 应该看到一条 BaselineFromExisting1730419200000 的记录
```

## 📖 日常使用

### 创建新迁移

#### 方法1: 自动生成(推荐)

当你修改了 Entity 后:

```bash
cd backend/user-service

# 生成迁移(TypeORM会对比Entity和数据库差异)
pnpm migration:generate src/migrations/AddPhoneNumber

# 查看生成的文件
cat src/migrations/*-AddPhoneNumber.ts

# 执行迁移
pnpm migration:run
```

#### 方法2: 手动创建

当需要执行自定义SQL:

```bash
# 创建空白迁移
pnpm migration:create src/migrations/AddCustomIndexes

# 编辑生成的文件,添加SQL
```

示例:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomIndexes1730420000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 使用 CONCURRENTLY 避免锁表
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active
      ON users(email) WHERE status = 'active';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_users_email_active;
    `);
  }
}
```

### 查看迁移状态

```bash
pnpm migration:show
```

### 执行待处理迁移

```bash
pnpm migration:run
```

### 回滚最后一次迁移

```bash
pnpm migration:revert
```

## 🔧 可用命令

所有服务现在都有统一的迁移命令:

```json
{
  "migration:generate": "自动生成迁移(从Entity变更)",
  "migration:create": "手动创建迁移",
  "migration:run": "执行所有待处理迁移",
  "migration:revert": "回滚最后一次迁移",
  "migration:show": "查看迁移状态"
}
```

## 📁 新的文件结构

```
backend/
├── user-service/
│   ├── src/
│   │   ├── config/
│   │   │   └── typeorm-cli.config.ts    # TypeORM CLI配置
│   │   └── migrations/                   # 迁移文件目录
│   │       └── 1730419200000-BaselineFromExisting.ts
│   └── package.json                      # 包含migration脚本
│
├── device-service/
│   ├── src/
│   │   ├── config/
│   │   │   └── typeorm-cli.config.ts
│   │   └── migrations/
│   │       └── 1730419200000-BaselineFromExisting.ts
│   └── package.json
│
└── ...其他服务(结构相同)
```

## 🎯 最佳实践

### 1. 命名规范

TypeORM自动生成的命名格式: `{timestamp}-{description}.ts`

示例:
```
✅ 1730420000000-AddUserPhoneNumber.ts
✅ 1730420100000-CreateOrdersTable.ts
✅ 1730420200000-AddIndexToDevices.ts
```

### 2. 迁移粒度

- ✅ **每个迁移做一件事** - 便于回滚和理解
- ✅ **相关变更可以组合** - 如添加表和相关索引
- ❌ **不要修改已执行的迁移** - 创建新的迁移

### 3. 向后兼容

```typescript
// ❌ 不安全: 直接删除列
await queryRunner.dropColumn('users', 'oldColumn');

// ✅ 安全: 分步骤
// 迁移1: 添加新列
await queryRunner.addColumn('users', new TableColumn({
  name: 'newColumn',
  type: 'varchar',
  isNullable: true  // 先设为可空
}));

// 迁移2: 迁移数据
await queryRunner.query(`UPDATE users SET newColumn = oldColumn;`);

// 迁移3: 设为非空
await queryRunner.query(`ALTER TABLE users ALTER COLUMN newColumn SET NOT NULL;`);

// 迁移4: 删除旧列(新版本部署后)
await queryRunner.dropColumn('users', 'oldColumn');
```

### 4. 大表变更

```typescript
// 使用 CONCURRENTLY 避免锁表
await queryRunner.query(`
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
  ON users(email);
`);

// 分批更新数据
const batchSize = 1000;
await queryRunner.query(`
  UPDATE users
  SET status = 'active'
  WHERE id IN (
    SELECT id FROM users WHERE status IS NULL LIMIT ${batchSize}
  );
`);
```

### 5. 事务控制

```typescript
export class ComplexMigration1730420000000 implements MigrationInterface {
  // 如果需要使用 CONCURRENTLY,必须禁用事务
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // CREATE INDEX CONCURRENTLY 不能在事务中执行
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
      ON users(email);
    `);
  }
}
```

## 🔍 故障排除

### 问题1: "No migrations are pending"

```bash
# 检查迁移状态
pnpm migration:show

# 如果表不存在,运行基线迁移
pnpm migration:run
```

### 问题2: 迁移失败

```bash
# 查看错误日志
pnpm migration:run

# 如果需要,手动修复数据库
psql -d cloudphone_user

# 删除失败的迁移记录
DELETE FROM typeorm_migrations WHERE name = 'FailedMigration...';

# 修复后重新执行
pnpm migration:run
```

### 问题3: Entity 和数据库不一致

```bash
# 生成迁移前,先检查当前状态
pnpm migration:show

# 生成迁移
pnpm migration:generate src/migrations/SyncChanges

# 检查生成的迁移是否符合预期
cat src/migrations/*-SyncChanges.ts

# 如果不对,删除并重新生成
rm src/migrations/*-SyncChanges.ts
```

## 🎓 示例: 完整的迁移流程

### 场景: 为 User 添加手机号字段

#### 1. 修改 Entity

```typescript
// src/entities/user.entity.ts
@Entity('users')
export class User {
  // ... 其他字段

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber: string;
}
```

#### 2. 生成迁移

```bash
cd backend/user-service
pnpm migration:generate src/migrations/AddUserPhoneNumber
```

#### 3. 检查生成的迁移

```bash
cat src/migrations/*-AddUserPhoneNumber.ts
```

TypeORM会生成类似:

```typescript
export class AddUserPhoneNumber1730420000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "phoneNumber" character varying(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "phoneNumber"
    `);
  }
}
```

#### 4. 执行迁移

```bash
# 先在开发环境测试
pnpm migration:run

# 验证
psql -d cloudphone_user -c "\d users"
```

#### 5. 测试

```bash
pnpm test
```

#### 6. 提交

```bash
git add .
git commit -m "feat(user): add phone number field"
```

## 📚 参考资源

- [TypeORM Migrations 官方文档](https://typeorm.io/migrations)
- [DATABASE_MIGRATION_GUIDE.md](./DATABASE_MIGRATION_GUIDE.md) - 详细使用指南
- [DATABASE_MIGRATION_AUDIT.md](./DATABASE_MIGRATION_AUDIT.md) - 审计报告

## 🔗 相关文件

- `scripts/migrate-all-services.sh` - 批量执行迁移
- `backend/*/src/config/typeorm-cli.config.ts` - TypeORM配置
- `backend/*/src/migrations/` - 迁移文件目录

## ✅ 检查清单

完成迁移系统迁移后,请确认:

- [ ] 所有服务都执行了基线迁移
- [ ] `typeorm_migrations` 表已创建
- [ ] 可以通过 `pnpm migration:show` 查看状态
- [ ] 可以生成新迁移: `pnpm migration:generate`
- [ ] 旧的 Atlas 配置已删除
- [ ] 旧的迁移文件已备份

---

**迁移完成日期**: 2025-11-01
**系统版本**: TypeORM 0.3.27
**状态**: ✅ 生产就绪
