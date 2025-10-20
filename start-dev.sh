#!/bin/bash

# 云手机平台本地开发环境启动脚本

set -e

echo "🚀 启动云手机平台本地开发环境..."
echo ""

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未安装 Docker"
    echo "请访问 https://docs.docker.com/get-docker/ 安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo "❌ 错误: 未安装 Docker Compose"
    echo "请访问 https://docs.docker.com/compose/install/ 安装 Docker Compose"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，从 .env.example 创建..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env 文件创建成功"
    else
        echo "❌ 错误: 未找到 .env.example 文件"
        exit 1
    fi
fi

# 询问是否重新构建镜像
echo ""
echo "选择启动模式:"
echo "1) 快速启动（使用已有镜像）"
echo "2) 完全重建（重新构建所有镜像）"
echo "3) 仅启动基础设施（PostgreSQL, Redis, MinIO）"
read -p "请选择 (1/2/3): " -n 1 -r
echo ""

case $REPLY in
    1)
        echo "📦 快速启动模式..."
        docker-compose -f docker-compose.dev.yml up -d
        ;;
    2)
        echo "🔨 完全重建模式..."
        docker-compose -f docker-compose.dev.yml up -d --build --force-recreate
        ;;
    3)
        echo "🏗️  仅启动基础设施..."
        docker-compose -f docker-compose.dev.yml up -d postgres redis minio
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "📊 服务状态:"
docker-compose -f docker-compose.dev.yml ps

# 等待数据库就绪
echo ""
echo "⏳ 等待数据库就绪..."
for i in {1..30}; do
    if docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ 数据库已就绪"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ 数据库启动超时"
        exit 1
    fi
    echo "⏳ 等待数据库启动... ($i/30)"
    sleep 2
done

# 询问是否初始化数据库
echo ""
read -p "是否需要初始化数据库? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗄️  初始化数据库..."
    cd database
    if [ ! -d "node_modules" ]; then
        echo "📦 安装数据库脚本依赖..."
        pnpm install
    fi
    pnpm run init
    cd ..
    echo "✅ 数据库初始化完成"
fi

echo ""
echo "✅ 开发环境启动完成！"
echo ""
echo "===== 服务访问地址 ====="
echo "API 网关:        http://localhost:3000"
echo "用户服务:        http://localhost:3001"
echo "设备服务:        http://localhost:3002"
echo "应用服务:        http://localhost:3003"
echo "调度服务:        http://localhost:3004"
echo "计费服务:        http://localhost:3005"
echo "流媒体服务:      http://localhost:3006"
echo ""
echo "管理后台:        http://localhost:5173"
echo "用户端:          http://localhost:5174"
echo ""
echo "PostgreSQL:      localhost:5432"
echo "Redis:           localhost:6379"
echo "MinIO API:       http://localhost:9000"
echo "MinIO Console:   http://localhost:9001"
echo "========================"
echo ""
echo "查看日志: docker-compose -f docker-compose.dev.yml logs -f [服务名]"
echo "停止服务: ./stop-dev.sh"
echo ""
