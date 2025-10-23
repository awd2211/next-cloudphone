#!/bin/bash

# Consul 集成检查脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "============================================"
echo "  Consul 集成状态检查"
echo "============================================"
echo ""

# 1. 检查 Consul 运行状态
echo -e "${BLUE}=== 1. Consul 服务器状态 ===${NC}"
if curl -s http://localhost:8500/v1/status/leader > /dev/null 2>&1; then
    leader=$(curl -s http://localhost:8500/v1/status/leader)
    echo -e "${GREEN}✅ Consul 运行正常${NC}"
    echo "   Leader: $leader"
else
    echo -e "${RED}❌ Consul 未运行或无法访问${NC}"
    exit 1
fi
echo ""

# 2. 检查微服务是否运行
echo -e "${BLUE}=== 2. 微服务运行状态 ===${NC}"

services=(
    "30000:api-gateway"
    "30001:user-service"
    "30002:device-service"
    "30003:app-service"
    "30005:billing-service"
    "30006:notification-service"
)

running_count=0
total_count=${#services[@]}

for service_info in "${services[@]}"; do
    port=$(echo $service_info | cut -d: -f1)
    service_name=$(echo $service_info | cut -d: -f2)
    
    if netstat -tln 2>/dev/null | grep -q ":$port "; then
        echo -e "${GREEN}✅${NC} $service_name (port $port)"
        running_count=$((running_count + 1))
    else
        echo -e "${RED}❌${NC} $service_name (port $port)"
    fi
done

echo ""
echo "运行统计: $running_count/$total_count 服务运行中"
echo ""

# 3. 检查 Consul 注册的服务
echo -e "${BLUE}=== 3. Consul 服务注册状态 ===${NC}"

registered_services=$(curl -s http://localhost:8500/v1/catalog/services | jq -r 'keys[]' | grep -v consul)

if [ -z "$registered_services" ]; then
    echo -e "${RED}❌ 没有服务注册到 Consul${NC}"
    echo ""
    echo -e "${YELLOW}可能原因：${NC}"
    echo "  1. 微服务刚启动，还未注册（等待几秒）"
    echo "  2. Consul 连接失败（检查网络）"
    echo "  3. 健康检查失败（服务状态 degraded）"
    echo "  4. 代码未包含注册逻辑"
    echo ""
else
    echo -e "${GREEN}已注册的服务：${NC}"
    echo "$registered_services" | while read service; do
        # 获取服务实例数
        instances=$(curl -s http://localhost:8500/v1/health/service/$service | jq length)
        
        # 获取健康状态
        passing=$(curl -s http://localhost:8500/v1/health/service/$service?passing | jq length)
        
        if [ "$passing" -gt 0 ]; then
            echo -e "  ${GREEN}✅${NC} $service ($instances 实例, $passing 健康)"
        else
            echo -e "  ${YELLOW}⚠️${NC} $service ($instances 实例, 0 健康)"
        fi
    done
fi
echo ""

# 4. 检查 API Gateway 的 Consul 配置
echo -e "${BLUE}=== 4. API Gateway Consul 配置 ===${NC}"

if [ -f "backend/api-gateway/.env" ]; then
    use_consul=$(grep "USE_CONSUL" backend/api-gateway/.env | cut -d= -f2)
    if [ "$use_consul" = "true" ]; then
        echo -e "${GREEN}✅ API Gateway Consul 服务发现已启用${NC}"
    else
        echo -e "${YELLOW}⚠️ API Gateway Consul 服务发现未启用${NC}"
        echo "   请设置: USE_CONSUL=true"
    fi
else
    echo -e "${YELLOW}⚠️ API Gateway .env 文件不存在${NC}"
fi
echo ""

# 5. 详细的服务健康检查
echo -e "${BLUE}=== 5. 服务健康检查详情 ===${NC}"

for service_info in "${services[@]}"; do
    port=$(echo $service_info | cut -d: -f1)
    service_name=$(echo $service_info | cut -d: -f2)
    
    health_response=$(curl -s http://localhost:$port/health 2>&1)
    
    if echo "$health_response" | jq . > /dev/null 2>&1; then
        status=$(echo "$health_response" | jq -r '.status')
        
        if [ "$status" = "healthy" ]; then
            echo -e "${GREEN}✅${NC} $service_name: 健康"
        elif [ "$status" = "degraded" ]; then
            echo -e "${YELLOW}⚠️${NC} $service_name: 降级（部分功能不可用）"
            
            # 显示具体问题
            db_status=$(echo "$health_response" | jq -r '.dependencies.database.status // empty')
            if [ "$db_status" = "unhealthy" ]; then
                db_message=$(echo "$health_response" | jq -r '.dependencies.database.message')
                echo "   ↳ 数据库: $db_message"
            fi
        else
            echo -e "${RED}❌${NC} $service_name: 不健康"
        fi
    else
        echo -e "${RED}❌${NC} $service_name: 无法访问健康检查接口"
    fi
done
echo ""

# 6. 给出建议
echo -e "${BLUE}=== 6. 建议 ===${NC}"

if [ -z "$registered_services" ]; then
    echo -e "${YELLOW}📌 需要重启微服务以注册到 Consul：${NC}"
    echo ""
    echo "   方法 1: 使用脚本重启"
    echo "   cd /home/eric/next-cloudphone"
    echo "   ./scripts/restart-all-services.sh"
    echo ""
    echo "   方法 2: 手动重启单个服务（已修复的）"
    echo "   cd backend/user-service && pnpm run dev"
    echo "   cd backend/notification-service && pnpm run dev"
    echo ""
else
    registered_count=$(echo "$registered_services" | wc -l)
    if [ $registered_count -lt $running_count ]; then
        echo -e "${YELLOW}📌 部分服务未注册到 Consul${NC}"
        echo "   运行中: $running_count 个服务"
        echo "   已注册: $registered_count 个服务"
        echo ""
        echo "   请重启未注册的服务"
    else
        echo -e "${GREEN}✅ 所有服务已成功注册到 Consul！${NC}"
        echo ""
        echo "   访问 Consul UI: http://localhost:8500/ui"
        echo "   查看服务列表: curl http://localhost:8500/v1/catalog/services"
    fi
fi

echo ""
echo "============================================"
echo ""







