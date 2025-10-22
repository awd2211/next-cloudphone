#!/bin/bash

# PM2 微服务管理脚本

case "$1" in
  start)
    echo "🚀 启动所有微服务..."
    pm2 start ecosystem.config.js
    ;;
    
  stop)
    echo "🛑 停止所有微服务..."
    pm2 stop all
    ;;
    
  restart)
    echo "🔄 重启所有微服务..."
    pm2 restart all
    ;;
    
  status)
    echo "📊 查看服务状态..."
    pm2 status
    ;;
    
  logs)
    if [ -z "$2" ]; then
      echo "📝 查看所有服务日志..."
      pm2 logs
    else
      echo "📝 查看 $2 服务日志..."
      pm2 logs $2
    fi
    ;;
    
  monit)
    echo "📈 启动实时监控..."
    pm2 monit
    ;;
    
  rebuild)
    echo "🔨 重新编译并重启所有服务..."
    services=("api-gateway" "user-service" "device-service" "app-service" "billing-service" "notification-service")
    for service in "${services[@]}"; do
      echo "  编译 $service..."
      cd /home/eric/next-cloudphone/backend/$service
      pnpm run build > /dev/null 2>&1
    done
    cd /home/eric/next-cloudphone
    pm2 restart all
    echo "✅ 所有服务已重新编译并重启"
    ;;
    
  rebuild-one)
    if [ -z "$2" ]; then
      echo "❌ 请指定服务名称"
      echo "用法: $0 rebuild-one <service-name>"
      exit 1
    fi
    echo "🔨 重新编译 $2..."
    cd /home/eric/next-cloudphone/backend/$2
    pnpm run build
    pm2 restart $2
    echo "✅ $2 已重新编译并重启"
    ;;
    
  clean)
    echo "🧹 清理并重新启动..."
    pm2 delete all
    pm2 start ecosystem.config.js
    ;;
    
  save)
    echo "💾 保存当前 PM2 配置..."
    pm2 save
    echo "✅ 配置已保存"
    ;;
    
  *)
    echo "PM2 微服务管理脚本"
    echo ""
    echo "用法: $0 {start|stop|restart|status|logs|monit|rebuild|rebuild-one|clean|save}"
    echo ""
    echo "命令说明:"
    echo "  start       - 启动所有微服务"
    echo "  stop        - 停止所有微服务"
    echo "  restart     - 重启所有微服务"
    echo "  status      - 查看服务状态"
    echo "  logs [name] - 查看日志（可指定服务名）"
    echo "  monit       - 实时监控"
    echo "  rebuild     - 重新编译并重启所有服务"
    echo "  rebuild-one <name> - 重新编译并重启指定服务"
    echo "  clean       - 清理并重新启动"
    echo "  save        - 保存当前配置"
    echo ""
    echo "示例:"
    echo "  $0 status"
    echo "  $0 logs api-gateway"
    echo "  $0 rebuild-one user-service"
    exit 1
    ;;
esac

