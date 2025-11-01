# 数据库迁移优化实施方案

## 当前状况总结

### ✅ 好消息

通过实际检查数据库,发现:

1. **所有数据库都已创建** ✅
   - cloudphone_user (17张表)
   - cloudphone_device (6张表)
   - cloudphone_notification (4张表)
   - cloudphone_billing (10张表)
   - cloudphone_app (存在)
   - cloudphone_scheduler (存在)

2. **表结构已就绪** ✅
   - User Service: 包含分区表 (user_events_2025_05)
   - Device Service: 包含核心表和event_outbox
   - Notification Service: 包含templates和preferences
   - Billing Service: 包含saga_state

3. **现有迁移文件齐全** ✅
   - 共31个SQL迁移文件
   - 覆盖了所有关键功能

### ❌ 问题

1. **没有迁移追踪表**
   - ❌ 无 `atlas_schema_revisions` 表
   - ❌ 无 `migrations_history` 表
   - ❌ 无 `typeorm_migrations` 表

2. **迁移系统未实际使用**
   - Atlas配置存在但未执行过
   - 迁移文件存在但未被追踪
   - 表可能是通过TypeORM的`synchronize: true`创建的

3. **工具不统一**
   - notification-service 无迁移脚本配置
   - 命名规范不一致

---

## 优化方案

### 方案选择

经过分析,我们有**3个选项**:

#### 选项1: 继续使用Atlas (当前配置) ⚠️

**优点**:
- 已有配置文件
- 支持schema验证和lint

**缺点**:
- 需要额外安装Atlas CLI
- 需要维护schema.hcl文件(当前不存在)
- 学习曲线较陡

**适用**: 如果团队熟悉Atlas

#### 选项2: 迁移到TypeORM Migrations (推荐) ✅

**优点**:
- 无需额外工具(TypeORM已安装)
- TypeScript类型安全
- 从Entity自动生成迁移
- 团队熟悉度高(已用TypeORM)
- 内置版本追踪

**缺点**:
- 需要初始迁移工作
- 现有SQL文件需要转换

**适用**: 长期维护,团队不熟悉Atlas

#### 选项3: 混合方案 - 手动SQL + 追踪表 ⚠️

**优点**:
- 简单直接
- 保留现有SQL文件

**缺点**:
- 手动维护追踪表
- 容易出错
- 无法自动生成迁移

**适用**: 临时方案

---

## 推荐实施: TypeORM Migrations

### 阶段1: 准备工作 (1天)

#### 1.1 安装依赖(如需要)

```bash
cd backend/user-service
pnpm add -D ts-node  # 大多数服务已安装
```

#### 1.2 创建TypeORM配置文件

为每个服务创建 `src/config/typeorm-cli.config.ts`:

```typescript
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config(); // 加载 .env

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
});
```

#### 1.3 更新package.json

```json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs",
    "migration:generate": "npm run typeorm -- migration:generate -d src/config/typeorm-cli.config.ts",
    "migration:create": "npm run typeorm -- migration:create",
    "migration:run": "npm run typeorm -- migration:run -d src/config/typeorm-cli.config.ts",
    "migration:revert": "npm run typeorm -- migration:revert -d src/config/typeorm-cli.config.ts",
    "migration:show": "npm run typeorm -- migration:show -d src/config/typeorm-cli.config.ts"
  }
}
```

### 阶段2: 创建基线迁移 (2天)

#### 2.1 标记现有数据库为基线

为每个服务创建一个**空的基线迁移**,标记当前数据库状态:

```bash
cd backend/user-service

# 创建基线迁移
pnpm migration:create src/migrations/BaselineFromExisting
```

编辑生成的文件:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class BaselineFromExisting1730400000000 implements MigrationInterface {
  name = 'BaselineFromExisting1730400000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 空实现 - 数据库已经存在所有表
    // 这个迁移只是标记当前状态为基线
    console.log('✅ Baseline migration - all tables already exist');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 基线不回滚
    console.log('⚠️  Cannot revert baseline migration');
  }
}
```

#### 2.2 执行基线迁移

```bash
cd backend/user-service
pnpm migration:run

# 这会创建 typeorm_migrations 表并记录基线
```

验证:

```sql
SELECT * FROM typeorm_migrations;
-- 应该看到 BaselineFromExisting1730400000000
```

#### 2.3 为所有服务执行

```bash
# user-service
cd backend/user-service
pnpm migration:create src/migrations/BaselineFromExisting
# 编辑文件
pnpm migration:run

# device-service
cd backend/device-service
pnpm migration:create src/migrations/BaselineFromExisting
# 编辑文件
pnpm migration:run

# 重复其他服务...
```

### 阶段3: 新迁移统一使用TypeORM (持续)

#### 3.1 修改Entity后自动生成迁移

```bash
cd backend/user-service

# 1. 修改 User Entity (例如添加字段)
# 2. 生成迁移
pnpm migration:generate src/migrations/AddPhoneNumberToUser

# 3. 检查生成的文件
cat src/migrations/*-AddPhoneNumberToUser.ts

# 4. 执行迁移
pnpm migration:run
```

#### 3.2 手动创建复杂迁移

```bash
# 创建空白迁移
pnpm migration:create src/migrations/AddCustomIndexes

# 编辑并添加自定义SQL
```

示例:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomIndexes1730400000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 使用 CONCURRENTLY 避免锁表
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active
      ON users(email) WHERE status = 'active';
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_user_created
      ON devices(userId, createdAt DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_users_email_active;
    `);

    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_devices_user_created;
    `);
  }
}
```

### 阶段4: CI/CD集成 (1天)

#### 4.1 创建统一迁移脚本

`scripts/run-all-migrations.sh`:

```bash
#!/bin/bash
set -e

SERVICES=(
  "user-service"
  "device-service"
  "app-service"
  "billing-service"
  "notification-service"
)

echo "🚀 开始执行所有服务的数据库迁移"
echo ""

for service in "${SERVICES[@]}"; do
  echo "📦 处理服务: $service"
  cd "backend/$service"

  if ! grep -q "migration:run" package.json; then
    echo "⚠️  跳过: 未配置迁移脚本"
    cd ../..
    continue
  fi

  echo "  ├─ 查看待执行迁移..."
  pnpm migration:show || true

  echo "  ├─ 执行迁移..."
  pnpm migration:run

  echo "  └─ ✅ 完成"
  echo ""
  cd ../..
done

echo "🎉 所有迁移执行完成!"
```

#### 4.2 添加到GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main, staging]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Run migrations
        env:
          DB_HOST: ${{ secrets.DB_HOST }}
          DB_PORT: ${{ secrets.DB_PORT }}
          DB_USERNAME: ${{ secrets.DB_USERNAME }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
        run: ./scripts/run-all-migrations.sh
```

---

## 迁移现有SQL文件(可选)

### 选项A: 保留为文档

将现有SQL文件移到 `migrations-archive/`:

```bash
mkdir -p backend/user-service/migrations-archive
mv backend/user-service/migrations/*.sql backend/user-service/migrations-archive/
```

优点:
- 简单快速
- 保留历史记录

缺点:
- 不能通过TypeORM重放

### 选项B: 转换为TypeScript

逐个转换重要的迁移文件:

```bash
# 1. 读取原始SQL
cat backend/user-service/migrations/20251029160000_add_optimized_indexes.sql

# 2. 创建TypeORM迁移
pnpm migration:create src/migrations/AddOptimizedIndexes

# 3. 将SQL复制到up()方法中
```

示例转换:

```typescript
// 原始: 20251029160000_add_optimized_indexes.sql
export class AddOptimizedIndexes1730400000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 从原SQL文件复制
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status_created
      ON users(status, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action
      ON audit_logs(user_id, action, created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_users_status_created;
    `);

    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_audit_logs_user_action;
    `);
  }
}
```

---

## 实施时间表

| 阶段 | 任务 | 预计时间 | 负责人 |
|------|------|----------|--------|
| **阶段1** | 准备TypeORM配置 | 0.5天 | 开发 |
| **阶段1** | 更新所有package.json | 0.5天 | 开发 |
| **阶段2** | 创建基线迁移(6个服务) | 1天 | 开发 |
| **阶段2** | 测试验证 | 0.5天 | QA |
| **阶段3** | 文档编写 | 0.5天 | 开发 |
| **阶段3** | 团队培训 | 0.5天 | 技术负责人 |
| **阶段4** | CI/CD集成 | 1天 | DevOps |
| **阶段4** | 生产部署测试 | 0.5天 | 全员 |
| **总计** | | **5天** | |

---

## 风险和缓解

### 风险1: 现有表结构与Entity不匹配

**影响**: 自动生成迁移可能创建重复的表

**缓解**:
1. 使用基线迁移标记当前状态
2. 第一次生成迁移前仔细检查
3. 在测试环境先验证

### 风险2: 团队不熟悉TypeORM迁移

**影响**: 错误的迁移导致数据丢失

**缓解**:
1. 培训session
2. 代码审查强制检查迁移
3. 在staging环境强制测试

### 风险3: 生产环境迁移失败

**影响**: 服务中断

**缓解**:
1. 所有迁移使用事务
2. 执行前数据库备份
3. 准备回滚脚本
4. 低峰期执行

---

## 检查清单

### 开发环境配置

- [ ] 所有服务安装了ts-node
- [ ] 创建了typeorm-cli.config.ts
- [ ] package.json添加了migration脚本
- [ ] 创建了基线迁移
- [ ] 执行基线迁移成功
- [ ] 验证typeorm_migrations表存在

### 测试

- [ ] 可以查看迁移状态: `pnpm migration:show`
- [ ] 可以生成新迁移: `pnpm migration:generate`
- [ ] 可以执行迁移: `pnpm migration:run`
- [ ] 可以回滚迁移: `pnpm migration:revert`
- [ ] 统一脚本测试通过: `./scripts/run-all-migrations.sh`

### 文档

- [ ] 更新CLAUDE.md
- [ ] 更新README.md
- [ ] 团队培训完成
- [ ] CI/CD文档更新

### 生产就绪

- [ ] Staging环境测试通过
- [ ] 生产备份策略确认
- [ ] 回滚方案准备
- [ ] 监控告警配置

---

## 快速开始指南

### 对于新开发者

```bash
# 1. 克隆项目
git clone ...

# 2. 安装依赖
pnpm install

# 3. 启动基础设施
docker compose -f docker-compose.dev.yml up -d

# 4. 运行所有迁移
./scripts/run-all-migrations.sh

# 5. 验证
pnpm --filter user-service migration:show
```

### 添加新功能时

```bash
# 1. 修改Entity
# src/entities/user.entity.ts
@Column({ nullable: true })
phoneNumber: string;

# 2. 生成迁移
cd backend/user-service
pnpm migration:generate src/migrations/AddPhoneNumber

# 3. 检查生成的迁移
cat src/migrations/*-AddPhoneNumber.ts

# 4. 执行
pnpm migration:run

# 5. 测试
pnpm test

# 6. 提交
git add .
git commit -m "feat: add phone number to user"
```

### 部署到生产

```bash
# 1. 在staging测试
ssh staging-server
cd /app
git pull
pnpm migration:run

# 2. 验证成功后,生产部署
ssh production-server
cd /app

# 3. 备份数据库
pg_dump ... > backup_$(date +%Y%m%d_%H%M%S).sql

# 4. 执行迁移
pnpm migration:run

# 5. 验证
pnpm migration:show
# 检查应用日志
pm2 logs
```

---

## 下一步行动

### 本周

1. [ ] 为user-service创建TypeORM配置
2. [ ] 创建并执行基线迁移
3. [ ] 验证迁移系统工作

### 下周

1. [ ] 推广到所有服务
2. [ ] 创建统一脚本
3. [ ] 团队培训

### 本月

1. [ ] CI/CD集成
2. [ ] 生产环境部署
3. [ ] 监控和优化

---

## 参考

- [TypeORM Migrations文档](https://typeorm.io/migrations)
- [PostgreSQL零停机迁移](https://www.braintreepayments.com/blog/safe-operations-for-high-volume-postgresql/)
- [DATABASE_MIGRATION_GUIDE.md](./DATABASE_MIGRATION_GUIDE.md) - 详细使用指南
- [DATABASE_MIGRATION_AUDIT.md](./DATABASE_MIGRATION_AUDIT.md) - 审计报告

---

**创建日期**: 2025-10-31
**更新日期**: 2025-10-31
**状态**: 待实施
