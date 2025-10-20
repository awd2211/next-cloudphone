#!/bin/bash

set -e

echo "🔧 重置 Docker 配置为官方源"
echo ""

# 检查是否有 sudo 权限
if [ "$EUID" -ne 0 ]; then
    echo "❌ 此脚本需要 root 权限"
    echo "请使用以下命令运行："
    echo "  sudo ./reset-docker-config.sh"
    exit 1
fi

# 备份现有配置
if [ -f /etc/docker/daemon.json ]; then
    echo "💾 备份现有配置..."
    cp /etc/docker/daemon.json /etc/docker/daemon.json.backup.$(date +%Y%m%d_%H%M%S)
fi

# 写入新配置（移除镜像加速器）
echo "✍️  写入新配置（使用 Docker Hub 官方源）..."
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
EOF

echo "✅ 配置文件已更新"
echo ""

# 重启 Docker 服务
echo "🔄 重启 Docker 服务..."
systemctl restart docker

# 等待 Docker 启动
echo "⏳ 等待 Docker 启动..."
sleep 3

echo ""
echo "✅ Docker 配置已重置！现在使用官方源"
echo ""
echo "📊 当前配置："
docker info | grep -A 5 "Registry" || echo "使用默认官方源"
echo ""
echo "🎉 配置完成！可以重新运行 docker compose 命令了"
