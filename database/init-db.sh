#!/bin/bash

# 云手机平台数据库一键初始化脚本

set -e  # 遇到错误立即退出

echo "🚀 开始初始化云手机平台数据库..."
echo ""

# 检查 Node.js 和 pnpm
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ 错误: 未安装 pnpm"
    echo "请运行: npm install -g pnpm"
    exit 1
fi

# 检查 PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  警告: 未安装 psql 命令行工具"
    echo "请确保 PostgreSQL 已安装并运行"
fi

# 加载环境变量
if [ -f ../.env ]; then
    echo "✅ 找到环境变量文件"
    source ../.env
else
    echo "⚠️  未找到 .env 文件，使用默认配置"
    export DB_HOST=localhost
    export DB_PORT=5432
    export DB_USERNAME=postgres
    export DB_PASSWORD=postgres
    export DB_DATABASE=cloudphone
fi

echo ""
echo "数据库配置:"
echo "  主机: ${DB_HOST}"
echo "  端口: ${DB_PORT}"
echo "  用户: ${DB_USERNAME}"
echo "  数据库: ${DB_DATABASE}"
echo ""

# 询问用户
read -p "是否继续? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 用户取消操作"
    exit 1
fi

# 创建数据库（如果不存在）
echo "📦 检查数据库是否存在..."
if command -v psql &> /dev/null; then
    PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USERNAME} -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_DATABASE}'" | grep -q 1 || \
    PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USERNAME} -c "CREATE DATABASE ${DB_DATABASE};"

    if [ $? -eq 0 ]; then
        echo "✅ 数据库已就绪"
    else
        echo "⚠️  无法自动创建数据库，请手动创建"
    fi
fi

# 安装依赖
echo ""
echo "📦 安装依赖..."
pnpm install

# 同步表结构
echo ""
echo "🔧 同步表结构..."
pnpm run schema:sync

# 插入种子数据
echo ""
echo "🌱 插入种子数据..."
pnpm run seed

echo ""
echo "✅ 数据库初始化完成！"
echo ""
echo "===== 登录信息 ====="
echo "管理员账号:"
echo "  用户名: admin"
echo "  邮箱: admin@cloudphone.run"
echo "  密码: admin123456"
echo ""
echo "测试账号:"
echo "  用户名: testuser"
echo "  邮箱: test@cloudphone.run"
echo "  密码: test123456"
echo "===================="
echo ""
echo "下一步: 启动服务"
echo "  cd ../backend/api-gateway && pnpm run dev"
echo ""
