#!/bin/bash

# 云手机平台本地开发环境停止脚本

echo "🛑 停止云手机平台本地开发环境..."
echo ""

# 询问停止方式
echo "选择停止方式:"
echo "1) 停止所有容器（保留数据）"
echo "2) 停止并删除所有容器（保留数据卷）"
echo "3) 完全清理（删除容器和数据卷）"
read -p "请选择 (1/2/3): " -n 1 -r
echo ""

case $REPLY in
    1)
        echo "⏸️  停止所有容器..."
        docker-compose -f docker-compose.dev.yml stop
        ;;
    2)
        echo "🗑️  停止并删除容器..."
        docker-compose -f docker-compose.dev.yml down
        ;;
    3)
        echo "⚠️  警告: 这将删除所有数据！"
        read -p "确认要完全清理吗? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🗑️  完全清理..."
            docker-compose -f docker-compose.dev.yml down -v
            echo "✅ 清理完成"
        else
            echo "❌ 操作已取消"
            exit 0
        fi
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "✅ 操作完成"
echo ""
echo "重新启动: ./start-dev.sh"
echo ""
