#!/bin/bash

# 微服务健康检测脚本
# 用于批量检测所有微服务的健康状态

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 服务列表 (服务名:端口)
services=(
  "api-gateway:30000"
  "user-service:30001"
  "device-service:30002"
  "app-service:30003"
  "scheduler-service:30004"
  "billing-service:30005"
)

# 基础设施服务
infrastructure=(
  "postgres:5432"
  "redis:6379"
  "minio:9000"
)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   云手机平台 - 健康检测工具${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 计数器
total=0
healthy=0
unhealthy=0
unreachable=0

# 检查基础设施服务
echo -e "${YELLOW}📦 基础设施服务状态:${NC}"
echo ""

for service in "${infrastructure[@]}"; do
  name="${service%%:*}"
  port="${service##*:}"

  echo -n "  ├─ $name (port $port): "

  case $name in
    postgres)
      if docker exec cloudphone-postgres pg_isready -U postgres &>/dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
      else
        echo -e "${RED}✗ Unhealthy${NC}"
      fi
      ;;
    redis)
      if docker exec cloudphone-redis redis-cli ping &>/dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
      else
        echo -e "${RED}✗ Unhealthy${NC}"
      fi
      ;;
    minio)
      if curl -s -f http://localhost:9000/minio/health/live &>/dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
      else
        echo -e "${RED}✗ Unhealthy${NC}"
      fi
      ;;
  esac
done

echo ""
echo -e "${YELLOW}🚀 微服务健康检测:${NC}"
echo ""

# 检查微服务
for service in "${services[@]}"; do
  name="${service%%:*}"
  port="${service##*:}"

  ((total++))

  echo -n "  ├─ $name (port $port): "

  # 尝试请求健康检测端点
  if response=$(curl -s -f http://localhost:$port/health 2>/dev/null); then
    # 尝试解析 status 字段
    status=$(echo $response | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

    if [ "$status" = "ok" ]; then
      echo -e "${GREEN}✓ Healthy${NC}"
      ((healthy++))

      # 显示额外信息（如果有的话）
      timestamp=$(echo $response | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4)
      if [ -n "$timestamp" ]; then
        echo "  │   └─ Last check: $timestamp"
      fi
    else
      echo -e "${RED}✗ Unhealthy - status: $status${NC}"
      ((unhealthy++))
    fi
  else
    echo -e "${RED}✗ Unreachable${NC}"
    ((unreachable++))
  fi
done

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   检测结果统计${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "  总服务数: $total"
echo -e "  ${GREEN}健康服务: $healthy${NC}"
echo -e "  ${RED}不健康服务: $unhealthy${NC}"
echo -e "  ${RED}无法访问: $unreachable${NC}"
echo ""

# 检查 Docker 容器状态
echo -e "${YELLOW}🐳 Docker 容器健康状态:${NC}"
echo ""
docker compose -f docker-compose.dev.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || \
docker-compose -f docker-compose.dev.yml ps 2>/dev/null

# 返回状态码
if [ $unhealthy -gt 0 ] || [ $unreachable -gt 0 ]; then
  echo ""
  echo -e "${RED}⚠️  警告: 存在不健康或无法访问的服务！${NC}"
  exit 1
else
  echo ""
  echo -e "${GREEN}✅ 所有服务运行正常！${NC}"
  exit 0
fi
