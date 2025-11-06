#!/bin/bash

# ELK Stack 启动脚本
# 用于启动 Elasticsearch + Logstash + Kibana + Filebeat 日志聚合系统

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}ELK Stack 启动脚本${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}错误: Docker Compose 未安装${NC}"
    exit 1
fi

# 检查系统要求
echo -e "${YELLOW}[1/7] 检查系统要求...${NC}"

# 检查可用内存 (至少需要 4GB)
AVAILABLE_MEM=$(free -g | awk '/^Mem:/{print $7}')
if [ "$AVAILABLE_MEM" -lt 4 ]; then
    echo -e "${RED}警告: 可用内存不足 4GB (当前: ${AVAILABLE_MEM}GB)${NC}"
    echo -e "${YELLOW}ELK Stack 可能无法正常运行${NC}"
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 检查磁盘空间 (至少需要 10GB)
AVAILABLE_DISK=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$AVAILABLE_DISK" -lt 10 ]; then
    echo -e "${RED}警告: 可用磁盘空间不足 10GB (当前: ${AVAILABLE_DISK}GB)${NC}"
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✓ 系统要求检查完成${NC}"
echo ""

# 配置系统参数
echo -e "${YELLOW}[2/7] 配置系统参数...${NC}"

# 设置 vm.max_map_count (Elasticsearch 需要)
CURRENT_MAX_MAP_COUNT=$(sysctl -n vm.max_map_count)
if [ "$CURRENT_MAX_MAP_COUNT" -lt 262144 ]; then
    echo "设置 vm.max_map_count=262144..."
    sudo sysctl -w vm.max_map_count=262144

    # 永久保存
    if ! grep -q "vm.max_map_count=262144" /etc/sysctl.conf; then
        echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
    fi
fi

echo -e "${GREEN}✓ 系统参数配置完成${NC}"
echo ""

# 创建必要的目录
echo -e "${YELLOW}[3/7] 创建日志目录...${NC}"

BACKEND_DIR="../../backend"
SERVICES=(
    "api-gateway"
    "user-service"
    "device-service"
    "app-service"
    "billing-service"
    "notification-service"
    "sms-receive-service"
    "proxy-service"
)

for service in "${SERVICES[@]}"; do
    LOG_DIR="$BACKEND_DIR/$service/logs"
    if [ ! -d "$LOG_DIR" ]; then
        mkdir -p "$LOG_DIR"
        echo "创建目录: $LOG_DIR"
    fi
done

echo -e "${GREEN}✓ 日志目录创建完成${NC}"
echo ""

# 停止已存在的容器
echo -e "${YELLOW}[4/7] 清理旧容器...${NC}"
docker compose -f docker-compose.elk.yml down -v 2>/dev/null || true
echo -e "${GREEN}✓ 清理完成${NC}"
echo ""

# 启动 Elasticsearch
echo -e "${YELLOW}[5/7] 启动 Elasticsearch...${NC}"
docker compose -f docker-compose.elk.yml up -d elasticsearch

echo "等待 Elasticsearch 启动..."
for i in {1..60}; do
    if curl -s http://localhost:9200/_cluster/health &> /dev/null; then
        echo -e "${GREEN}✓ Elasticsearch 已启动${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}错误: Elasticsearch 启动超时${NC}"
        docker compose -f docker-compose.elk.yml logs elasticsearch
        exit 1
    fi
    echo -n "."
    sleep 2
done
echo ""

# 检查 Elasticsearch 健康状态
ES_HEALTH=$(curl -s http://localhost:9200/_cluster/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
echo "Elasticsearch 集群状态: $ES_HEALTH"
echo ""

# 启动 Logstash
echo -e "${YELLOW}[6/7] 启动 Logstash...${NC}"
docker compose -f docker-compose.elk.yml up -d logstash

echo "等待 Logstash 启动..."
for i in {1..60}; do
    if curl -s http://localhost:9600/_node/stats &> /dev/null; then
        echo -e "${GREEN}✓ Logstash 已启动${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}错误: Logstash 启动超时${NC}"
        docker compose -f docker-compose.elk.yml logs logstash
        exit 1
    fi
    echo -n "."
    sleep 2
done
echo ""

# 启动 Kibana 和 Filebeat
echo -e "${YELLOW}[7/7] 启动 Kibana 和 Filebeat...${NC}"
docker compose -f docker-compose.elk.yml up -d kibana filebeat

echo "等待 Kibana 启动..."
for i in {1..90}; do
    if curl -s http://localhost:5601/api/status | grep -q "available" &> /dev/null; then
        echo -e "${GREEN}✓ Kibana 已启动${NC}"
        break
    fi
    if [ $i -eq 90 ]; then
        echo -e "${YELLOW}警告: Kibana 启动超时，但容器可能仍在初始化中${NC}"
    fi
    echo -n "."
    sleep 2
done
echo ""

# 显示服务状态
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}ELK Stack 启动完成!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "服务访问地址:"
echo "  • Elasticsearch: http://localhost:9200"
echo "  • Logstash API:  http://localhost:9600"
echo "  • Kibana:        http://localhost:5601"
echo ""
echo "检查服务状态:"
docker compose -f docker-compose.elk.yml ps
echo ""

# 等待索引创建
echo -e "${YELLOW}等待日志索引创建...${NC}"
echo "这可能需要几分钟，取决于微服务是否正在运行并生成日志"
echo ""
sleep 5

# 检查是否有索引创建
INDICES=$(curl -s http://localhost:9200/_cat/indices?v 2>/dev/null | grep cloudphone-logs || true)
if [ -n "$INDICES" ]; then
    echo -e "${GREEN}已找到日志索引:${NC}"
    echo "$INDICES"
else
    echo -e "${YELLOW}尚未找到日志索引${NC}"
    echo "请确保微服务正在运行并生成日志"
fi
echo ""

echo -e "${GREEN}下一步操作:${NC}"
echo "1. 访问 Kibana: http://localhost:5601"
echo "2. 在 Kibana 中创建索引模式: cloudphone-logs-*"
echo "3. 开始探索日志数据"
echo ""
echo -e "${YELLOW}查看日志:${NC}"
echo "  docker compose -f docker-compose.elk.yml logs -f"
echo ""
echo -e "${YELLOW}停止服务:${NC}"
echo "  docker compose -f docker-compose.elk.yml down"
echo ""
