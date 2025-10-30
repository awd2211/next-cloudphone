#!/bin/bash

# ========================================
# 架构修复部署脚本
# 用途：一键部署所有架构修复
# 执行：bash scripts/deploy-architecture-fixes.sh
# ========================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   云手机平台架构修复部署${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ========================================
# Step 1: 应用数据库迁移
# ========================================
echo -e "${BLUE}[1/6] 应用数据库迁移...${NC}"

# 检查数据库连接
if ! psql -U postgres -d cloudphone_device -c "SELECT 1;" &> /dev/null; then
    echo -e "${RED}✗ 无法连接到 cloudphone_device 数据库${NC}"
    echo -e "${YELLOW}  请确保 PostgreSQL 正在运行并且数据库已创建${NC}"
    exit 1
fi

# 应用 event_outbox 表迁移
echo -e "  应用 event_outbox 表迁移..."
if psql -U postgres -d cloudphone_device -c "\d event_outbox" &> /dev/null; then
    echo -e "${YELLOW}  event_outbox 表已存在，跳过${NC}"
else
    psql -U postgres -d cloudphone_device < database/migrations/20250129_add_event_outbox.sql
    echo -e "${GREEN}✓ event_outbox 表创建成功${NC}"
fi

# 应用 saga_state 索引迁移
echo -e "  应用 saga_state 索引迁移..."
psql -U postgres -d cloudphone_device < database/migrations/20250129_add_saga_indexes.sql 2>&1 | grep -v "already exists" || true
echo -e "${GREEN}✓ saga_state 索引创建成功${NC}"

echo ""

# ========================================
# Step 2: 重新构建 shared 模块
# ========================================
echo -e "${BLUE}[2/6] 重新构建 shared 模块...${NC}"

cd backend/shared
echo -e "  清理旧构建..."
rm -rf dist

echo -e "  安装依赖..."
pnpm install --frozen-lockfile

echo -e "  构建模块..."
pnpm build

if [ -d "dist/outbox" ]; then
    echo -e "${GREEN}✓ shared 模块构建成功${NC}"
else
    echo -e "${RED}✗ shared 模块构建失败${NC}"
    exit 1
fi

cd ../..
echo ""

# ========================================
# Step 3: 重新构建 device-service
# ========================================
echo -e "${BLUE}[3/6] 重新构建 device-service...${NC}"

cd backend/device-service
echo -e "  清理旧构建..."
rm -rf dist

echo -e "  安装依赖..."
pnpm install --frozen-lockfile

echo -e "  构建服务..."
pnpm build

if [ -f "dist/main.js" ]; then
    echo -e "${GREEN}✓ device-service 构建成功${NC}"
else
    echo -e "${RED}✗ device-service 构建失败${NC}"
    exit 1
fi

cd ../..
echo ""

# ========================================
# Step 4: 更新环境变量
# ========================================
echo -e "${BLUE}[4/6] 更新环境变量...${NC}"

if [ -f "backend/device-service/.env" ]; then
    # 检查是否已有 QUOTA_ALLOW_ON_ERROR
    if grep -q "QUOTA_ALLOW_ON_ERROR" backend/device-service/.env; then
        echo -e "${YELLOW}  QUOTA_ALLOW_ON_ERROR 已存在，跳过${NC}"
    else
        echo "" >> backend/device-service/.env
        echo "# 配额降级策略（2025-01-29 添加）" >> backend/device-service/.env
        echo "QUOTA_ALLOW_ON_ERROR=true" >> backend/device-service/.env
        echo -e "${GREEN}✓ 已添加 QUOTA_ALLOW_ON_ERROR=true${NC}"
    fi
else
    echo -e "${YELLOW}  .env 文件不存在，从 .env.example 复制...${NC}"
    cp backend/device-service/.env.example backend/device-service/.env
    echo -e "${GREEN}✓ 已创建 .env 文件${NC}"
fi

echo ""

# ========================================
# Step 5: 重启服务
# ========================================
echo -e "${BLUE}[5/6] 重启服务...${NC}"

# 检查是否使用 PM2
if command -v pm2 &> /dev/null; then
    if pm2 describe device-service &> /dev/null; then
        echo -e "  停止旧服务..."
        pm2 stop device-service || true

        echo -e "  启动新服务..."
        pm2 restart device-service || pm2 start backend/device-service/dist/main.js --name device-service

        echo -e "  等待服务启动..."
        sleep 5

        echo -e "${GREEN}✓ 服务已重启 (PM2)${NC}"

        echo -e "\n${YELLOW}查看日志:${NC}"
        echo -e "  pm2 logs device-service --lines 50"
    else
        echo -e "${YELLOW}  device-service 不在 PM2 中，请手动启动${NC}"
        echo -e "  命令: pm2 start backend/device-service/dist/main.js --name device-service"
    fi
elif [ -f "docker-compose.dev.yml" ]; then
    echo -e "  使用 Docker Compose 重启..."
    docker compose -f docker-compose.dev.yml restart device-service
    echo -e "${GREEN}✓ 服务已重启 (Docker Compose)${NC}"
else
    echo -e "${YELLOW}  未检测到 PM2 或 Docker Compose，请手动启动服务${NC}"
fi

echo ""

# ========================================
# Step 6: 验证部署
# ========================================
echo -e "${BLUE}[6/6] 验证部署...${NC}"

echo -e "  等待服务完全启动..."
sleep 3

# 检查端口
if nc -z localhost 30002 2>/dev/null; then
    echo -e "${GREEN}✓ device-service 端口 30002 可访问${NC}"
else
    echo -e "${RED}✗ device-service 端口 30002 不可访问${NC}"
    echo -e "${YELLOW}  请检查服务日志: pm2 logs device-service${NC}"
    exit 1
fi

# 检查健康端点
if curl -s http://localhost:30002/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 健康检查通过${NC}"
else
    echo -e "${YELLOW}⚠ 健康检查失败或端点不存在${NC}"
fi

echo ""

# ========================================
# 完成
# ========================================
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}后续步骤:${NC}"
echo -e "1. 运行验证脚本:"
echo -e "   ${BLUE}bash scripts/verify-architecture-fixes.sh${NC}"
echo -e ""
echo -e "2. 查看服务日志:"
echo -e "   ${BLUE}pm2 logs device-service --lines 50${NC}"
echo -e ""
echo -e "3. 监控 Outbox 表:"
echo -e "   ${BLUE}psql -U postgres -d cloudphone_device -c \"SELECT status, COUNT(*) FROM event_outbox GROUP BY status;\"${NC}"
echo -e ""
echo -e "4. 测试设备创建:"
echo -e "   ${BLUE}# 创建设备后检查 event_outbox 表是否有 device.created 事件${NC}"
echo -e ""

echo -e "${GREEN}✅ 所有步骤已完成！${NC}"
