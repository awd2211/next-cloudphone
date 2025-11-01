#!/bin/bash

# 快速修复 notification-service 的迁移配置
# 这是最紧急的问题

set -e

echo "🔧 修复 notification-service 迁移配置"
echo ""

SERVICE_DIR="backend/notification-service"

cd "$SERVICE_DIR"

echo "1️⃣  检查当前配置..."
if grep -q "migrate:apply" package.json; then
  echo "   ✅ 已存在迁移脚本"
else
  echo "   ❌ 缺失迁移脚本,准备添加..."

  # 创建临时文件
  TMP_FILE=$(mktemp)

  # 使用 jq 添加迁移脚本
  if command -v jq &> /dev/null; then
    echo "   使用 jq 更新 package.json..."
    jq '.scripts += {
      "migrate:status": "atlas migrate status --env local",
      "migrate:apply": "atlas migrate apply --env local",
      "migrate:diff": "atlas migrate diff --env local",
      "migrate:lint": "atlas migrate lint --env local",
      "migrate:validate": "atlas migrate validate --env local",
      "schema:inspect": "atlas schema inspect --url \"postgres://postgres:postgres@localhost:5432/cloudphone_notification?sslmode=disable\" --format '"'"'{{ sql . }}'"'"' > schema.sql",
      "schema:apply": "atlas schema apply --env local --auto-approve"
    }' package.json > "$TMP_FILE"
    mv "$TMP_FILE" package.json
    echo "   ✅ package.json 已更新"
  else
    echo "   ⚠️  jq 未安装,请手动添加以下脚本到 package.json:"
    echo ""
    cat << 'EOF'
    "migrate:status": "atlas migrate status --env local",
    "migrate:apply": "atlas migrate apply --env local",
    "migrate:diff": "atlas migrate diff --env local",
    "migrate:lint": "atlas migrate lint --env local",
    "migrate:validate": "atlas migrate validate --env local",
    "schema:inspect": "atlas schema inspect --url \"postgres://postgres:postgres@localhost:5432/cloudphone_notification?sslmode=disable\" --format '{{ sql . }}' > schema.sql",
    "schema:apply": "atlas schema apply --env local --auto-approve"
EOF
    echo ""
    exit 1
  fi
fi

echo ""
echo "2️⃣  创建 atlas.hcl 配置文件..."
if [ -f "atlas.hcl" ]; then
  echo "   ✅ atlas.hcl 已存在"
else
  cat > atlas.hcl << 'EOF'
# Atlas configuration for Notification Service
# 通知服务数据库迁移配置

env "local" {
  # 数据库连接 URL
  url = "postgres://postgres:postgres@localhost:5432/cloudphone_notification?sslmode=disable"

  # 开发数据库（用于生成迁移和验证）
  dev = "docker://postgres/15/dev"

  # 迁移文件目录
  migration {
    dir = "file://migrations"
  }

  # Schema 定义文件
  src = "file://schema.hcl"

  # 格式化配置
  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }

  # Lint 规则 - 检测破坏性变更
  lint {
    # 检测删除表
    destructive {
      error = true
    }
    # 检测数据丢失风险
    data_depend {
      error = false
    }
    # 检测向后兼容性
    incompatible {
      error = true
    }
  }
}

env "dev" {
  url = getenv("DATABASE_URL")
  dev = "docker://postgres/15/dev"
  migration {
    dir = "file://migrations"
  }
  src = "file://schema.hcl"
}

env "staging" {
  url = getenv("DATABASE_URL")
  dev = "docker://postgres/15/dev"
  migration {
    dir = "file://migrations"
    # 自动批准安全的迁移
    auto_approve = false
  }
  src = "file://schema.hcl"
}

env "production" {
  url = getenv("DATABASE_URL")
  dev = "docker://postgres/15/dev"
  migration {
    dir = "file://migrations"
    # 生产环境必须手动批准
    auto_approve = false
    # 执行前备份
    baseline = getenv("MIGRATION_BASELINE")
  }
  src = "file://schema.hcl"

  # 严格的 Lint 规则
  lint {
    destructive {
      error = true
    }
    data_depend {
      error = true
    }
    incompatible {
      error = true
    }
  }
}
EOF
  echo "   ✅ atlas.hcl 已创建"
fi

echo ""
echo "3️⃣  创建 README.md 文档..."
if [ -f "migrations/README.md" ]; then
  echo "   ✅ README.md 已存在"
else
  cat > migrations/README.md << 'EOF'
# Notification Service 数据库迁移

## 概述

Notification Service 使用 SQL 迁移文件管理数据库 schema 变更。

## 现有迁移文件

### 00000000000000_init_baseline.sql

**目的**: 初始化基线数据库结构

**包含**:
- `notifications` 表 - 通知记录
- `notification_templates` 表 - 通知模板
- `notification_preferences` 表 - 用户通知偏好设置
- `sms_records` 表 - 短信发送记录

### 20251029000000_create_notification_preferences.sql

**目的**: 创建通知偏好设置表

**特性**:
- 用户级别的通知开关
- 按通知类型配置
- 按渠道配置(email, sms, push, in-app)

### 001_create_sms_records.sql

**目的**: 创建短信记录表

**特性**:
- 短信发送历史
- 状态追踪
- 供应商记录

## 应用迁移

### 方法 1: 使用 Atlas CLI（推荐）

```bash
# 确保 PostgreSQL 正在运行
docker compose -f docker-compose.dev.yml ps postgres

# 查看迁移状态
pnpm migrate:status

# 应用所有待执行迁移
pnpm migrate:apply

# 验证迁移
pnpm migrate:validate
```

### 方法 2: 直接执行 SQL

```bash
# 应用特定迁移
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_notification < migrations/xxx.sql
```

### 方法 3: 使用 psql 客户端

```bash
# 连接到数据库
psql -h localhost -U postgres -d cloudphone_notification

# 在 psql 中执行
\i migrations/xxx.sql
```

## 创建新迁移

### 自动生成（从 Entity 变更）

```bash
# 修改 Entity 后
pnpm migrate:diff migrations/add_new_feature
```

### 手动创建

```bash
# 在 migrations/ 目录创建新文件
# 命名格式: YYYYMMDDHHMMSS_description.sql
touch migrations/20251101120000_add_notification_channels.sql
```

## 验证迁移

```sql
-- 查看所有表
\dt

-- 查看特定表结构
\d notifications
\d notification_templates
\d notification_preferences
\d sms_records

-- 验证数据
SELECT COUNT(*) FROM notification_templates;
```

## 回滚

Atlas 不直接支持回滚,需要手动创建回滚迁移:

```sql
-- 例如: 20251101120001_rollback_add_notification_channels.sql
DROP TABLE IF EXISTS notification_channels CASCADE;
```

## 最佳实践

1. **命名规范**: `YYYYMMDDHHMMSS_description.sql`
2. **幂等性**: 使用 `IF NOT EXISTS` / `IF EXISTS`
3. **事务**: 重要迁移使用 `BEGIN; ... COMMIT;`
4. **索引**: 大表使用 `CONCURRENTLY` 避免锁表
5. **测试**: 先在开发环境测试
6. **文档**: 在迁移文件顶部注释说明目的

## 故障排除

### 问题: "relation does not exist"

确保按顺序执行迁移:
```bash
ls -1 migrations/*.sql | sort | while read f; do
  echo "Applying: $f"
  psql ... < "$f"
done
```

### 问题: Atlas 命令找不到

安装 Atlas CLI:
```bash
# macOS
brew install ariga/tap/atlas

# Linux
curl -sSf https://atlasgo.sh | sh
```

### 问题: 迁移已执行但未追踪

手动标记为已执行(谨慎使用):
```bash
atlas migrate hash --env local
atlas migrate set 20251101120000 --env local
```
EOF
  echo "   ✅ README.md 已创建"
fi

echo ""
echo "4️⃣  更新 atlas.sum 文件..."
if [ -f "migrations/atlas.sum" ]; then
  echo "   ⚠️  atlas.sum 已存在,可能需要重新生成"
  echo "   运行: pnpm migrate:validate"
else
  # 创建基础 atlas.sum
  cat > migrations/atlas.sum << 'EOF'
h1:NewMigrationHashHere=
00000000000000_init_baseline.sql h1:placeholder=
001_create_sms_records.sql h1:placeholder=
20251029000000_create_notification_preferences.sql h1:placeholder=
EOF
  echo "   ✅ atlas.sum 已创建 (需要运行 migrate:validate 更新hash)"
fi

cd ../..

echo ""
echo "✅ 修复完成!"
echo ""
echo "下一步操作:"
echo "  1. cd backend/notification-service"
echo "  2. pnpm migrate:validate  # 验证迁移文件"
echo "  3. pnpm migrate:status    # 查看迁移状态"
echo "  4. pnpm migrate:apply     # 应用迁移(如需要)"
echo ""
