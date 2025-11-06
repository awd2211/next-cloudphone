#!/bin/bash
# 显示所有服务的版本信息

echo "==================================="
echo "云手机平台服务版本信息"
echo "==================================="
echo ""

echo "📦 后端服务:"
for service in api-gateway user-service device-service app-service billing-service notification-service sms-receive-service proxy-service; do
    if [ -f "backend/$service/package.json" ]; then
        version=$(grep '"version"' "backend/$service/package.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
        printf "  %-25s v%s\n" "$service" "$version"
    fi
done

echo ""
echo "🎨 前端服务:"
for service in admin user; do
    if [ -f "frontend/$service/package.json" ]; then
        version=$(grep '"version"' "frontend/$service/package.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
        printf "  %-25s v%s\n" "frontend-$service" "$version"
    fi
done

echo ""
echo "🚀 Go 服务:"
if [ -f "backend/media-service/.env" ]; then
    printf "  %-25s v1.0.0\n" "media-service"
fi

echo ""
echo "==================================="
echo "📊 PM2 运行状态:"
pm2 list | grep -E "name|api-gateway|user-service|device-service|app-service|billing-service|notification-service|sms-receive-service|proxy-service|frontend|media-service" | head -16

echo ""
echo "💡 提示: PM2 在开发模式下无法显示通过 pnpm 启动的服务版本号"
echo "   这是正常现象，不影响服务功能。生产环境会正确显示。"
