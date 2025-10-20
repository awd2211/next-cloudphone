#!/bin/bash

set -e

echo "🔧 配置 Docker 镜像加速器（海外镜像源）"
echo ""

# 检查是否有 sudo 权限
if [ "$EUID" -ne 0 ]; then
    echo "❌ 此脚本需要 root 权限"
    echo "请使用以下命令运行："
    echo "  sudo ./configure-docker-mirror.sh"
    exit 1
fi

# 创建 Docker 配置目录
echo "📁 创建 Docker 配置目录..."
mkdir -p /etc/docker

# 备份现有配置（如果存在）
if [ -f /etc/docker/daemon.json ]; then
    echo "💾 备份现有配置..."
    cp /etc/docker/daemon.json /etc/docker/daemon.json.backup.$(date +%Y%m%d_%H%M%S)
fi

# 写入新配置
echo "✍️  写入镜像加速器配置..."
cat > /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://dockerpull.com",
    "https://dockerhub.icu"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
EOF

echo "✅ 配置文件已写入"
echo ""
echo "📄 配置内容："
cat /etc/docker/daemon.json
echo ""

# 重启 Docker 服务
echo "🔄 重启 Docker 服务..."
systemctl restart docker

# 等待 Docker 启动
echo "⏳ 等待 Docker 启动..."
sleep 3

# 验证配置
echo ""
echo "✅ Docker 镜像加速器配置完成！"
echo ""
echo "📊 当前配置："
docker info | grep -A 10 "Registry Mirrors" || echo "无法获取镜像配置信息"
echo ""
echo "🎉 配置完成！现在可以运行 docker compose 命令了"
