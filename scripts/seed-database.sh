#!/bin/bash

# 种子数据脚本
# 用于向数据库添加测试数据

set -e

echo "🌱 CloudPhone 数据库种子数据脚本"
echo "================================"
echo ""

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 加载环境变量
if [ -f ".env" ]; then
    echo "📄 加载 .env 文件..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# 设置默认环境变量
export DB_HOST=${DB_HOST:-localhost}
export DB_PORT=${DB_PORT:-5432}
export DB_USER=${DB_USER:-postgres}
export DB_PASSWORD=${DB_PASSWORD:-postgres}
export DB_NAME=${DB_NAME:-cloudphone}

echo "📊 数据库配置:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# 检查数据库连接
echo "🔍 检查数据库连接..."
if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c '\q' 2>/dev/null; then
    echo "❌ 无法连接到数据库"
    echo "请确保:"
    echo "  1. PostgreSQL 正在运行"
    echo "  2. 数据库 '$DB_NAME' 已创建"
    echo "  3. 数据库凭据正确"
    exit 1
fi
echo "✅ 数据库连接成功"
echo ""

# 询问是否继续
read -p "⚠️  这将向数据库添加测试数据。是否继续? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 0
fi

echo ""
echo "🚀 开始执行种子脚本..."
echo ""

# 运行 TypeScript 种子脚本
if [ -f "scripts/seed-database.ts" ]; then
    npx ts-node scripts/seed-database.ts
else
    echo "❌ 找不到 scripts/seed-database.ts"
    exit 1
fi

echo ""
echo "🎉 完成！"
