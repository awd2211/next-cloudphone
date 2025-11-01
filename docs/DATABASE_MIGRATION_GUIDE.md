# 数据库迁移统一方案

## 概述

本项目采用 **TypeORM Migrations** 作为统一的数据库迁移方案。

## 为什么选择 TypeORM Migrations?

1. **原生集成**: 所有服务已使用 TypeORM,无需额外依赖
2. **类型安全**: TypeScript 编写,编译时检查错误
3. **自动生成**: 可从 Entity 变更自动生成迁移
4. **版本控制**: 内置 `migrations` 表追踪执行历史
5. **事务安全**: 默认在事务中执行,失败自动回滚
6. **易于维护**: 统一工具链,降低学习成本

## 配置

### 1. 更新 TypeORM 配置

每个服务的 `src/config/typeorm.config.ts`:

```typescript
import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export const createTypeOrmConfig = (configService: ConfigService): DataSourceOptions => {
  return {
    type: 'postgres',
    host: configService.get('DB_HOST'),
    port: configService.get('DB_PORT'),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_DATABASE'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsTableName: 'migrations_history',
    synchronize: false, // 生产环境必须为 false
    logging: configService.get('NODE_ENV') === 'development',
  };
};

// DataSource 用于 CLI 命令
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'cloudphone',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations_history',
});
```

### 2. 更新 package.json 脚本

在每个服务的 `package.json` 中添加:

```json
{
  "scripts": {
    "migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/config/typeorm.config.ts",
    "migration:create": "typeorm-ts-node-commonjs migration:create",
    "migration:run": "typeorm-ts-node-commonjs migration:run -d src/config/typeorm.config.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/config/typeorm.config.ts",
    "migration:show": "typeorm-ts-node-commonjs migration:show -d src/config/typeorm.config.ts"
  }
}
```

### 3. 安装依赖

如果还没安装 ts-node:

```bash
pnpm add -D ts-node
```

## 使用方法

### 创建新迁移

#### 方法 1: 自动生成(推荐)

当你修改了 Entity 后:

```bash
cd backend/user-service

# 生成迁移文件(会对比 Entity 和数据库的差异)
pnpm migration:generate src/migrations/AddUserProfile

# 生成的文件类似: src/migrations/1698765432100-AddUserProfile.ts
```

#### 方法 2: 手动创建

当你需要执行自定义 SQL:

```bash
cd backend/user-service

# 创建空白迁移文件
pnpm migration:create src/migrations/AddCustomIndex

# 然后编辑生成的文件
```

### 迁移文件示例

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class AddUserProfile1698765432100 implements MigrationInterface {
  name = 'AddUserProfile1698765432100'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建表
    await queryRunner.createTable(
      new Table({
        name: "user_profiles",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "uuid_generate_v4()",
          },
          {
            name: "userId",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "avatar",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "bio",
            type: "text",
            isNullable: true,
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
      true
    );

    // 创建索引
    await queryRunner.createIndex(
      "user_profiles",
      new TableIndex({
        name: "IDX_USER_PROFILES_USER_ID",
        columnNames: ["userId"],
      })
    );

    // 或者执行原始 SQL
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_created
      ON user_profiles(createdAt DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("user_profiles", "IDX_USER_PROFILES_USER_ID");
    await queryRunner.dropTable("user_profiles");
  }
}
```

### 执行迁移

```bash
cd backend/user-service

# 查看待执行的迁移
pnpm migration:show

# 执行所有待执行的迁移
pnpm migration:run

# 回滚最后一次迁移
pnpm migration:revert
```

### 生产环境部署

```bash
# 在 CI/CD 或部署脚本中
cd backend/user-service
pnpm migration:run --transaction all

# 或者使用 Docker
docker compose exec user-service pnpm migration:run
```

## 迁移策略

### 开发环境

```bash
# 1. 修改 Entity
# 2. 生成迁移
pnpm migration:generate src/migrations/YourChanges

# 3. 检查生成的迁移文件
# 4. 执行迁移
pnpm migration:run

# 5. 测试验证
# 6. 提交到 Git
```

### 生产环境

```bash
# 1. 在测试环境先验证
pnpm migration:show  # 查看待执行的迁移
pnpm migration:run   # 执行迁移

# 2. 数据库备份
pg_dump -h localhost -U postgres cloudphone_user > backup.sql

# 3. 执行迁移
pnpm migration:run

# 4. 验证数据完整性

# 5. 如有问题,回滚
pnpm migration:revert
```

## 最佳实践

### 1. 命名规范

```
✅ Good:
- AddUserEmailIndex
- CreateOrdersTable
- AlterUserAddPhoneNumber
- RemoveDeprecatedColumns

❌ Bad:
- migration1
- fix
- update
```

### 2. 迁移粒度

- **每个迁移做一件事**: 便于回滚和理解
- **相关变更可以组合**: 如添加表和索引
- **不要修改已执行的迁移**: 创建新的迁移

### 3. 向后兼容

```typescript
// ❌ 不安全: 直接删除列
await queryRunner.dropColumn('users', 'oldColumn');

// ✅ 安全: 分步骤
// 迁移 1: 添加新列
await queryRunner.addColumn('users', new TableColumn({
  name: 'newColumn',
  type: 'varchar',
}));

// 迁移 2: 迁移数据
await queryRunner.query(`
  UPDATE users SET newColumn = oldColumn;
`);

// 迁移 3: 删除旧列(新版本部署后)
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
await queryRunner.query(`
  UPDATE users
  SET status = 'active'
  WHERE id IN (
    SELECT id FROM users WHERE status IS NULL LIMIT 1000
  );
`);
```

### 5. 事务控制

```typescript
export class ComplexMigration1698765432100 implements MigrationInterface {
  // 禁用事务(用于 CREATE INDEX CONCURRENTLY)
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 手动控制事务
    await queryRunner.startTransaction();
    try {
      // 操作...
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    }
  }
}
```

## 迁移现有 SQL 文件

### 步骤

1. **创建基线迁移**:

```bash
# 为每个服务创建初始迁移
cd backend/user-service
pnpm migration:create src/migrations/InitialSchema
```

2. **复制现有 SQL**:

```typescript
// src/migrations/xxx-InitialSchema.ts
export class InitialSchema1698765432100 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 复制现有的 baseline SQL
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        -- 从现有 SQL 复制
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE;`);
  }
}
```

3. **执行基线迁移**:

```bash
pnpm migration:run
```

4. **后续使用自动生成**

## 故障排除

### 问题 1: "No migrations are pending"

```bash
# 检查迁移历史
pnpm migration:show

# 如果表不存在,手动创建
psql -d cloudphone_user -c "CREATE TABLE migrations_history ..."
```

### 问题 2: 迁移失败

```bash
# 查看错误日志
pnpm migration:run

# 如果需要,手动修复数据库
psql -d cloudphone_user

# 删除失败的迁移记录
DELETE FROM migrations_history WHERE name = 'FailedMigration...';

# 修复后重新执行
pnpm migration:run
```

### 问题 3: 迁移冲突

```bash
# 查看当前状态
pnpm migration:show

# 回滚到冲突前
pnpm migration:revert

# 重新生成迁移
pnpm migration:generate src/migrations/Fixed
```

## 参考资源

- [TypeORM Migrations 官方文档](https://typeorm.io/migrations)
- [PostgreSQL 索引最佳实践](https://www.postgresql.org/docs/current/indexes.html)
- [零停机部署数据库变更](https://www.braintreepayments.com/blog/safe-operations-for-high-volume-postgresql/)

## 检查清单

### 开发阶段
- [ ] Entity 变更已完成
- [ ] 生成迁移文件
- [ ] 检查生成的 SQL
- [ ] 本地执行并测试
- [ ] 编写回滚逻辑
- [ ] 提交到 Git

### 生产部署
- [ ] 在测试环境验证
- [ ] 备份生产数据库
- [ ] 检查待执行迁移
- [ ] 执行迁移
- [ ] 验证数据完整性
- [ ] 监控应用运行
- [ ] 准备回滚方案
