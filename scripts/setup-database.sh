#!/bin/bash

# 数据库初始化脚本

echo "====================================="
echo "   云手机平台 - 数据库初始化"
echo "====================================="
echo ""

# 检查 PostgreSQL 是否运行
if ! docker ps | grep cloudphone-postgres > /dev/null 2>&1; then
    echo "❌ PostgreSQL 容器未运行"
    echo "💡 请先运行: docker-compose up -d postgres"
    exit 1
fi

echo "✅ PostgreSQL 容器运行中"
echo ""

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQL_FILE="$SCRIPT_DIR/init-database.sql"

# 执行 SQL 脚本
echo "📝 执行数据库初始化脚本..."
docker exec -i cloudphone-postgres psql -U postgres < "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 数据库初始化成功！"
    echo ""
    echo "📌 默认账号:"
    echo "   用户名: admin"
    echo "   密码: admin123 (首次使用请修改)"
    echo ""
else
    echo ""
    echo "❌ 数据库初始化失败"
    exit 1
fi
