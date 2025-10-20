#!/bin/bash

# 云手机平台 - 停止本地开发环境脚本

PROJECT_ROOT="/home/eric/next-cloudphone"
LOG_DIR="$PROJECT_ROOT/logs"

echo "🛑 停止云手机平台本地开发环境..."
echo ""

# 停止所有服务
services=("user-service" "device-service" "app-service" "billing-service" "api-gateway")

for service in "${services[@]}"; do
    pid_file="$LOG_DIR/${service}.pid"

    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "🛑 停止 $service (PID: $pid)..."
            kill "$pid"
            rm "$pid_file"
        else
            echo "⚠️  $service 未运行"
            rm "$pid_file"
        fi
    else
        echo "⚠️  找不到 $service 的 PID 文件"
    fi
done

# 强制停止所有 nest 进程
echo ""
echo "🔍 清理残留进程..."
pkill -f "nest start --watch" 2>/dev/null && echo "✅ 已清理 Nest 进程" || echo "ℹ️  无残留进程"

echo ""
echo "✅ 所有服务已停止"
echo ""
echo "提示："
echo "  - 查看日志: ls -lh $LOG_DIR/"
echo "  - 清理日志: rm $LOG_DIR/*.log"
echo "  - 重新启动: ./start-local-dev.sh"
