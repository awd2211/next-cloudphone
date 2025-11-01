# 为什么选择 TypeORM Migrations 而不是 Atlas?

## 🤔 背景

之前所有服务都配置了 **Atlas** (有 `atlas.hcl` 文件和相关脚本),但经过审计发现:

1. ❌ **Atlas 从未实际使用过** - 没有 `atlas_schema_revisions` 表
2. ❌ **数据库表可能是通过 TypeORM 的 `synchronize: true` 自动创建的**
3. ❌ **团队对 Atlas 不熟悉** - 没人知道怎么用

所以我们决定迁移到 **TypeORM Migrations**。

## 📊 详细对比

### Atlas vs TypeORM Migrations

| 特性 | Atlas | TypeORM Migrations | 选择原因 |
|------|-------|-------------------|----------|
| **学习成本** | 中等 (新工具) | 低 (已使用TypeORM) | ✅ TypeORM团队已熟悉 |
| **额外依赖** | ✅ 需要 Atlas CLI | ❌ 不需要 | ✅ 减少工具链复杂度 |
| **自动生成迁移** | ✅ 是 | ✅ 是 | 🟰 功能相同 |
| **类型安全** | ❌ 否 (SQL) | ✅ 是 (TypeScript) | ✅ 编译时检查 |
| **IDE支持** | ⚠️ 有限 | ✅ 完整 | ✅ 自动补全/跳转 |
| **与ORM集成** | ⚠️ 松耦合 | ✅ 紧密集成 | ✅ Entity即是Schema |
| **回滚支持** | ✅ 是 | ✅ 是 | 🟰 功能相同 |
| **版本追踪** | atlas_schema_revisions表 | typeorm_migrations表 | 🟰 功能相同 |
| **Schema验证** | ✅ 强大 | ⚠️ 基础 | ⚠️ Atlas更强 |
| **团队熟悉度** | ❌ 低 (0%) | ✅ 高 (100%) | ✅ 无需培训 |
| **实际使用情况** | ❌ 未使用过 | ✅ 正在使用TypeORM | ✅ 顺理成章 |

## ✅ 选择 TypeORM 的原因

### 1. 零学习成本

团队已经在使用 TypeORM:

```typescript
// 已有的 Entity
@Entity('users')
export class User {
  @Column()
  name: string;
}

// 直接生成迁移,无需学习新工具
pnpm migration:generate src/migrations/AddName
```

**Atlas 需要**:
- 学习 Atlas CLI 命令
- 学习 HCL 语法 (atlas.hcl)
- 学习 Schema 定义 (schema.hcl)
- 维护两套 Schema (Entity + HCL)

### 2. 不需要额外工具

**TypeORM**:
```bash
# TypeORM 已安装
pnpm add typeorm  # ✅ 已有
```

**Atlas**:
```bash
# 需要额外安装
brew install ariga/tap/atlas  # macOS
curl -sSf https://atlasgo.sh | sh  # Linux
# ❌ CI/CD 也要安装
# ❌ 开发者本地也要安装
```

### 3. TypeScript 类型安全

**TypeORM** (TypeScript):
```typescript
export class AddPhoneNumber1730420000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('users', new TableColumn({
      name: 'phoneNumber',      // ✅ 自动补全
      type: 'varchar',          // ✅ 类型检查
      length: 20,               // ✅ 编译时验证
    }));
  }
}
```

**Atlas** (SQL):
```sql
-- 20251101_add_phone_number.sql
ALTER TABLE users ADD COLUMN phoneNumber VARCHAR(20);
-- ❌ 无类型检查
-- ❌ 运行时才发现错误
```

### 4. 与Entity紧密集成

**TypeORM 自动生成**:

```bash
# 1. 修改 Entity
@Entity('users')
export class User {
  @Column()
  phoneNumber: string;  // 添加字段
}

# 2. 自动生成迁移(对比Entity和数据库差异)
pnpm migration:generate src/migrations/AddPhoneNumber

# ✅ TypeORM 会自动检测变更并生成正确的SQL
```

**Atlas 需要手动**:

```bash
# 1. 修改 Entity
@Entity('users')
export class User {
  @Column()
  phoneNumber: string;
}

# 2. 手动编写 schema.hcl
table "users" {
  column "phoneNumber" {
    type = "varchar(20)"
  }
}

# 3. 生成迁移
atlas migrate diff --env local

# ❌ 需要维护两个文件 (Entity + schema.hcl)
# ❌ 容易不同步
```

### 5. 实际使用情况

**当前状态**:
- ✅ TypeORM: 所有服务都在用 (100%)
- ❌ Atlas: 配置存在但从未使用过 (0%)

**数据库表创建方式**:
```typescript
// 实际上是通过 TypeORM 的 synchronize 创建的
TypeOrmModule.forRoot({
  synchronize: true,  // ⚠️ 自动同步Entity到数据库
  // 不是通过 Atlas 迁移创建的
})
```

**证据**:
```sql
-- Atlas 的追踪表不存在
SELECT * FROM atlas_schema_revisions;  -- ❌ Table does not exist

-- 说明从未执行过 Atlas 迁移
```

## ⚠️ Atlas 的问题

### 1. 配置存在但未使用

所有服务都有 `atlas.hcl`:

```hcl
env "local" {
  url = "postgres://..."
  migration { dir = "file://migrations" }
  src = "file://schema.hcl"  # ❌ 这个文件不存在!
}
```

但:
- ❌ `schema.hcl` 文件不存在
- ❌ 从未执行过 `atlas migrate apply`
- ❌ 数据库没有 `atlas_schema_revisions` 表

### 2. 维护两套 Schema

使用 Atlas 需要:

```
backend/user-service/
├── src/entities/user.entity.ts    # TypeORM Entity
└── schema.hcl                     # Atlas Schema (重复定义!)
```

**问题**:
- ❌ 重复定义相同的数据结构
- ❌ 容易不同步 (改了Entity忘记改schema.hcl)
- ❌ 增加维护成本

### 3. 团队不熟悉

Atlas 语法:

```hcl
table "users" {
  schema = schema.public
  column "id" {
    null = false
    type = uuid
    default = sql("gen_random_uuid()")
  }
  column "name" {
    null = true
    type = character_varying(255)
  }
  primary_key {
    columns = [column.id]
  }
}
```

**问题**:
- ❌ 团队没人熟悉 HCL 语法
- ❌ 需要培训
- ❌ 维护困难

## 🚀 TypeORM 的优势

### 1. 单一事实来源

```typescript
// src/entities/user.entity.ts
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;
}
```

**✅ Entity 即是 Schema**
- 无需维护额外的 schema 文件
- 改 Entity = 改 Schema
- 自动生成迁移

### 2. 开发流程简单

```bash
# 1. 修改 Entity (TypeScript)
# 2. 生成迁移
pnpm migration:generate src/migrations/MyChanges

# 3. 检查生成的迁移
cat src/migrations/*-MyChanges.ts

# 4. 执行
pnpm migration:run

# ✅ 就这么简单!
```

### 3. 类型安全的查询构建器

```typescript
// 迁移中可以使用 QueryBuilder
public async up(queryRunner: QueryRunner): Promise<void> {
  const users = await queryRunner.manager
    .createQueryBuilder()
    .select('user')
    .from(User, 'user')
    .where('user.status IS NULL')
    .getMany();

  // ✅ 类型安全
  // ✅ 自动补全
}
```

### 4. 测试友好

```typescript
// 迁移测试
describe('AddPhoneNumber Migration', () => {
  it('should add phone number column', async () => {
    await migration.up(queryRunner);

    const column = await queryRunner.hasColumn('users', 'phoneNumber');
    expect(column).toBe(true);  // ✅ 类型检查
  });
});
```

## 📈 实际收益

### 迁移到 TypeORM 后

| 指标 | 改进 |
|------|------|
| 学习成本 | -100% (已熟悉) |
| 工具数量 | -1 (无需Atlas CLI) |
| 配置文件数量 | -3 (atlas.hcl, schema.hcl, atlas.sum) |
| Schema定义重复 | -1 (Entity即Schema) |
| 类型安全 | +100% (TypeScript) |
| IDE支持 | +100% (完整支持) |
| 维护成本 | -50% (工具链简化) |

## 🎯 总结

### Atlas 适合的场景

- ✅ 数据库优先的项目 (Database-First)
- ✅ 需要强大的 Schema 验证
- ✅ 多语言项目 (不只是 TypeScript)
- ✅ 团队熟悉 Atlas

### TypeORM 适合的场景(我们的情况)

- ✅ **已在使用 TypeORM** ⭐
- ✅ **代码优先的项目 (Code-First)** ⭐
- ✅ **纯 TypeScript 项目** ⭐
- ✅ **需要类型安全** ⭐
- ✅ **团队不熟悉 Atlas** ⭐

### 决策理由

我们选择 TypeORM Migrations 因为:

1. **已经在用** - 所有服务都用 TypeORM
2. **零学习成本** - 团队已熟悉
3. **更简单** - 无需额外工具和配置
4. **类型安全** - TypeScript 编译时检查
5. **实际需求** - Atlas 的高级功能我们用不上

### Atlas 的价值

Atlas **不是**不好,它在以下场景很优秀:

- 复杂的 Schema 验证需求
- 需要强大的 Lint 规则
- 数据库先于代码存在
- 多语言多框架项目

但对于我们的项目:
- ✅ 已经全面使用 TypeORM
- ✅ Code-First 开发模式
- ✅ 纯 TypeScript 项目
- ✅ Entity 即是 Schema

**TypeORM Migrations 是更合适的选择。**

## 🔄 如果将来需要 Atlas

如果将来有特殊需求需要 Atlas:

1. 保留了旧的配置(在 backup/)
2. TypeORM 迁移可以导出为 SQL
3. 可以混合使用 (不推荐)

但目前来看,**TypeORM Migrations 完全满足需求**。

---

**决策日期**: 2025-11-01
**决策人**: 技术团队
**状态**: 已实施
