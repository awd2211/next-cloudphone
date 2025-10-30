#!/bin/bash

# ========================================
# 架构修复验证脚本
# 用途：验证所有架构修复是否正确部署
# 执行：bash scripts/verify-architecture-fixes.sh
# ========================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 计数器
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   云手机平台架构修复验证${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ========================================
# 1. 验证数据库迁移
# ========================================
echo -e "${BLUE}[1/7] 验证数据库迁移...${NC}"

# 检查 event_outbox 表是否存在
if psql -U postgres -d cloudphone_device -c "\d event_outbox" &> /dev/null; then
    echo -e "${GREEN}✓ event_outbox 表已创建${NC}"
    PASSED=$((PASSED + 1))

    # 检查索引
    INDEXES=$(psql -U postgres -d cloudphone_device -c "SELECT indexname FROM pg_indexes WHERE tablename = 'event_outbox';" -t)
    INDEX_COUNT=$(echo "$INDEXES" | grep -c "idx_outbox" || true)

    if [ "$INDEX_COUNT" -ge 4 ]; then
        echo -e "${GREEN}✓ event_outbox 索引已创建 (${INDEX_COUNT} 个)${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ event_outbox 索引不完整 (只有 ${INDEX_COUNT} 个)${NC}"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${RED}✗ event_outbox 表不存在${NC}"
    echo -e "${YELLOW}  请运行: psql -U postgres -d cloudphone_device < database/migrations/20250129_add_event_outbox.sql${NC}"
    FAILED=$((FAILED + 1))
fi

# 检查 saga_state 索引
SAGA_INDEXES=$(psql -U postgres -d cloudphone_device -c "SELECT indexname FROM pg_indexes WHERE tablename = 'saga_state';" -t 2>/dev/null || echo "")
SAGA_INDEX_COUNT=$(echo "$SAGA_INDEXES" | grep -c "idx_saga" || true)

if [ "$SAGA_INDEX_COUNT" -ge 5 ]; then
    echo -e "${GREEN}✓ saga_state 索引已创建 (${SAGA_INDEX_COUNT} 个)${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ saga_state 索引未创建或不完整 (${SAGA_INDEX_COUNT} 个)${NC}"
    echo -e "${YELLOW}  请运行: psql -U postgres -d cloudphone_device < database/migrations/20250129_add_saga_indexes.sql${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ========================================
# 2. 验证 shared 模块构建
# ========================================
echo -e "${BLUE}[2/7] 验证 shared 模块构建...${NC}"

if [ -d "backend/shared/dist/outbox" ]; then
    echo -e "${GREEN}✓ Outbox 模块已编译${NC}"
    PASSED=$((PASSED + 1))

    # 检查导出
    if grep -q "EventOutboxService" backend/shared/dist/index.d.ts 2>/dev/null; then
        echo -e "${GREEN}✓ EventOutboxService 已导出${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ EventOutboxService 未导出${NC}"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${RED}✗ Outbox 模块未编译${NC}"
    echo -e "${YELLOW}  请运行: cd backend/shared && pnpm build${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""

# ========================================
# 3. 验证 device-service 构建
# ========================================
echo -e "${BLUE}[3/7] 验证 device-service 构建...${NC}"

if [ -d "backend/device-service/dist" ]; then
    echo -e "${GREEN}✓ device-service 已编译${NC}"
    PASSED=$((PASSED + 1))

    # 检查是否包含 Outbox 导入
    if grep -r "EventOutboxService" backend/device-service/dist 2>/dev/null | head -1 > /dev/null; then
        echo -e "${GREEN}✓ EventOutboxService 已集成${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}⚠ EventOutboxService 可能未正确集成${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi

    # 检查 QuotaCacheService
    if [ -f "backend/device-service/dist/quota/quota-cache.service.js" ]; then
        echo -e "${GREEN}✓ QuotaCacheService 已编译${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ QuotaCacheService 未编译${NC}"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${RED}✗ device-service 未编译${NC}"
    echo -e "${YELLOW}  请运行: cd backend/device-service && pnpm build${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""

# ========================================
# 4. 验证环境变量配置
# ========================================
echo -e "${BLUE}[4/7] 验证环境变量配置...${NC}"

if [ -f "backend/device-service/.env" ]; then
    if grep -q "QUOTA_ALLOW_ON_ERROR" backend/device-service/.env; then
        QUOTA_VALUE=$(grep "QUOTA_ALLOW_ON_ERROR" backend/device-service/.env | cut -d '=' -f 2)
        echo -e "${GREEN}✓ QUOTA_ALLOW_ON_ERROR 已配置: ${QUOTA_VALUE}${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}⚠ QUOTA_ALLOW_ON_ERROR 未配置${NC}"
        echo -e "${YELLOW}  建议添加: QUOTA_ALLOW_ON_ERROR=true${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠ .env 文件不存在${NC}"
    echo -e "${YELLOW}  请运行: cp backend/device-service/.env.example backend/device-service/.env${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ========================================
# 5. 验证服务运行状态
# ========================================
echo -e "${BLUE}[5/7] 验证服务运行状态...${NC}"

# 检查 device-service 是否运行
if pm2 describe device-service &> /dev/null; then
    STATUS=$(pm2 describe device-service | grep "status" | awk '{print $4}' | head -1)
    if [ "$STATUS" == "online" ]; then
        echo -e "${GREEN}✓ device-service 正在运行${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ device-service 状态: ${STATUS}${NC}"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${YELLOW}⚠ device-service 未通过 PM2 管理${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 检查服务端口
if nc -z localhost 30002 2>/dev/null; then
    echo -e "${GREEN}✓ device-service 端口 30002 可访问${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ device-service 端口 30002 不可访问${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""

# ========================================
# 6. 验证 Outbox 功能
# ========================================
echo -e "${BLUE}[6/7] 验证 Outbox 功能...${NC}"

# 检查 event_outbox 表是否有数据
OUTBOX_COUNT=$(psql -U postgres -d cloudphone_device -c "SELECT COUNT(*) FROM event_outbox;" -t 2>/dev/null | xargs || echo "0")

if [ "$OUTBOX_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ event_outbox 表有数据 (${OUTBOX_COUNT} 条记录)${NC}"
    PASSED=$((PASSED + 1))

    # 检查状态分布
    PENDING=$(psql -U postgres -d cloudphone_device -c "SELECT COUNT(*) FROM event_outbox WHERE status='pending';" -t 2>/dev/null | xargs || echo "0")
    PUBLISHED=$(psql -U postgres -d cloudphone_device -c "SELECT COUNT(*) FROM event_outbox WHERE status='published';" -t 2>/dev/null | xargs || echo "0")
    FAILED_EVENTS=$(psql -U postgres -d cloudphone_device -c "SELECT COUNT(*) FROM event_outbox WHERE status='failed';" -t 2>/dev/null | xargs || echo "0")

    echo -e "  Pending: ${PENDING}, Published: ${PUBLISHED}, Failed: ${FAILED_EVENTS}"

    if [ "$PENDING" -gt 100 ]; then
        echo -e "${YELLOW}⚠ 待发布事件过多 (${PENDING}), 检查 Outbox 发布器${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi

    if [ "$FAILED_EVENTS" -gt 10 ]; then
        echo -e "${RED}✗ 失败事件过多 (${FAILED_EVENTS}), 检查 RabbitMQ 连接${NC}"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${YELLOW}⚠ event_outbox 表为空 (尚未有设备操作)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ========================================
# 7. 验证 ADB 录屏修复
# ========================================
echo -e "${BLUE}[7/7] 验证 ADB 录屏修复...${NC}"

# 检查 adb.service.ts 是否包含 RecordingSession
if grep -q "RecordingSession" backend/device-service/src/adb/adb.service.ts; then
    echo -e "${GREEN}✓ ADB 录屏会话管理已实现${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ ADB 录屏会话管理未实现${NC}"
    FAILED=$((FAILED + 1))
fi

# 检查是否有 onModuleInit
if grep -q "onModuleInit" backend/device-service/src/adb/adb.service.ts; then
    echo -e "${GREEN}✓ ADB 孤儿进程清理已实现${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ ADB 孤儿进程清理未实现${NC}"
    FAILED=$((FAILED + 1))
fi

# 检查是否有活跃的 screenrecord 进程（应该为 0）
SCREENRECORD_COUNT=$(ps aux | grep -c "[s]creenrecord" || true)
if [ "$SCREENRECORD_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓ 无孤儿 screenrecord 进程${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ 发现 ${SCREENRECORD_COUNT} 个 screenrecord 进程${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ========================================
# 总结
# ========================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   验证结果总结${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}通过: ${PASSED}${NC}"
echo -e "${RED}失败: ${FAILED}${NC}"
echo -e "${YELLOW}警告: ${WARNINGS}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 所有验证通过！架构修复已成功部署！${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  验证基本通过，但有 ${WARNINGS} 个警告需要注意${NC}"
        exit 0
    fi
else
    echo -e "${RED}❌ 验证失败！有 ${FAILED} 个严重问题需要修复${NC}"
    exit 1
fi
