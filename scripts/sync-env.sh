#!/bin/bash

# ========================================
# 环境变量同步脚本
# 将配置同步到各个服务
# ========================================

ENV_TYPE=${1:-development}
CONFIG_DIR="$(dirname "$0")/../config"
BACKEND_DIR="$(dirname "$0")/../backend"
FRONTEND_DIR="$(dirname "$0")/../frontend"

echo "🔄 同步环境变量配置: $ENV_TYPE"
echo "========================================"

# 检查配置文件是否存在
if [ ! -f "$CONFIG_DIR/.env.$ENV_TYPE" ]; then
    echo "❌ 配置文件不存在: $CONFIG_DIR/.env.$ENV_TYPE"
    echo "💡 请先创建配置文件，可以从 ENV_CONFIG_TEMPLATE.md 复制"
    exit 1
fi

# 同步到后端服务
echo ""
echo "📦 同步到后端服务..."
for service in api-gateway user-service device-service app-service billing-service notification-service; do
    if [ -d "$BACKEND_DIR/$service" ]; then
        cp "$CONFIG_DIR/.env.$ENV_TYPE" "$BACKEND_DIR/$service/.env"
        echo "  ✅ $service"
    fi
done

# 同步到前端
echo ""
echo "📦 同步到前端..."
for frontend in admin user; do
    if [ -d "$FRONTEND_DIR/$frontend" ]; then
        # 前端需要 VITE_ 前缀
        cat "$CONFIG_DIR/.env.$ENV_TYPE" | grep -E "^VITE_|^#" > "$FRONTEND_DIR/$frontend/.env"
        echo "VITE_API_BASE_URL=http://localhost:30000/api" >> "$FRONTEND_DIR/$frontend/.env"
        echo "  ✅ frontend-$frontend"
    fi
done

echo ""
echo "✅ 环境变量同步完成！"
echo ""
echo "📋 下一步操作:"
echo "  1. 检查各服务的 .env 文件"
echo "  2. 根据需要调整服务特定配置"
echo "  3. 重启服务使配置生效: pm2 restart all"

