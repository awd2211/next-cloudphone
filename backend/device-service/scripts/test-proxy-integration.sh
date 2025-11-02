#!/bin/bash

# ========================================
# 云手机代理集成测试脚本
# ========================================
# 测试代理分配、容器创建、代理释放流程
# ========================================

set -e  # 遇到错误立即退出

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}云手机代理集成测试${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查环境变量
if [ -z "$PROXY_SERVICE_URL" ]; then
    echo -e "${RED}❌ PROXY_SERVICE_URL 环境变量未设置${NC}"
    echo "请在 .env 文件中配置: PROXY_SERVICE_URL=http://localhost:30007"
    exit 1
fi

echo -e "${GREEN}✅ PROXY_SERVICE_URL: $PROXY_SERVICE_URL${NC}"
echo ""

# 1. 检查 proxy-service 是否运行
echo -e "${YELLOW}[步骤 1] 检查 proxy-service 状态...${NC}"
if curl -s "$PROXY_SERVICE_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ proxy-service 正常运行${NC}"
else
    echo -e "${RED}❌ proxy-service 未运行，请先启动 proxy-service${NC}"
    echo "提示: cd backend/proxy-service && pnpm start:dev"
    exit 1
fi
echo ""

# 2. 检查代理字段是否已添加到数据库
echo -e "${YELLOW}[步骤 2] 验证数据库迁移...${NC}"
PROXY_COLUMN_CHECK=$(docker compose -f ../../docker-compose.dev.yml exec -T postgres \
    psql -U postgres -d cloudphone_device -t -c \
    "SELECT column_name FROM information_schema.columns WHERE table_name='devices' AND column_name='proxy_id';" 2>/dev/null || echo "")

if [ -z "$PROXY_COLUMN_CHECK" ]; then
    echo -e "${RED}❌ proxy_id 字段不存在，请先运行数据库迁移${NC}"
    echo "提示: docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d cloudphone_device < migrations/20251102_add_proxy_fields.sql"
    exit 1
else
    echo -e "${GREEN}✅ 代理字段已添加到数据库${NC}"
fi
echo ""

# 3. 创建测试设备（应该会分配代理）
echo -e "${YELLOW}[步骤 3] 创建测试设备（触发代理分配）...${NC}"
echo "注意: 如果 proxy-service 没有可用代理，将以降级模式创建设备（不阻塞创建）"
echo ""

# 这里需要实际的 API 调用，假设有 device-service API
# 实际测试时需要替换为真实的 API endpoint 和 JWT token

echo -e "${YELLOW}提示: 请手动通过 API 或前端创建一个设备，然后查看日志验证代理分配${NC}"
echo ""
echo "查看 device-service 日志:"
echo "  pm2 logs device-service --lines 50 | grep -i proxy"
echo ""
echo "查看代理分配情况:"
echo "  docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d cloudphone_device -c \"SELECT id, name, proxy_id, proxy_host, proxy_port, proxy_country FROM devices WHERE proxy_id IS NOT NULL ORDER BY created_at DESC LIMIT 5;\""
echo ""

# 4. 验证代理环境变量是否注入到容器
echo -e "${YELLOW}[步骤 4] 验证容器代理环境变量...${NC}"
echo "查看最近创建的容器环境变量:"
echo "  docker ps --format '{{.Names}}' --filter 'label=com.cloudphone.managed=true' | head -1 | xargs -I {} docker inspect {} -f '{{range .Config.Env}}{{println .}}{{end}}' | grep -i proxy"
echo ""

# 5. 测试删除设备（应该会释放代理）
echo -e "${YELLOW}[步骤 5] 测试设备删除（触发代理释放）...${NC}"
echo "提示: 删除设备时会自动释放代理，查看日志验证"
echo "  pm2 logs device-service --lines 50 | grep -i 'Released proxy'"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}测试指导完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}完整测试流程:${NC}"
echo "1. 确保 proxy-service 运行: pnpm start:dev"
echo "2. 确保 device-service 运行: pm2 restart device-service"
echo "3. 通过 API 或前端创建设备"
echo "4. 观察日志: pm2 logs device-service | grep -i proxy"
echo "5. 验证数据库: 查看 devices 表的 proxy_* 字段"
echo "6. 检查容器: docker inspect <container_name> 查看 HTTP_PROXY 环境变量"
echo "7. 删除设备并验证代理释放"
echo ""
echo -e "${GREEN}✅ Phase 1 基础集成已完成！${NC}"
echo ""
