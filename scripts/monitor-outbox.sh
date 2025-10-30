#!/bin/bash

# ========================================
# Outbox 实时监控脚本
# 用途：实时监控 event_outbox 表状态
# 执行：bash scripts/monitor-outbox.sh
# ========================================

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 清屏
clear

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Event Outbox 实时监控${NC}"
echo -e "${BLUE}   按 Ctrl+C 退出${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 无限循环，每 5 秒刷新一次
while true; do
    # 移动光标到第 6 行（保留标题）
    tput cup 5 0

    # 获取当前时间
    CURRENT_TIME=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${CYAN}刷新时间: ${CURRENT_TIME}${NC}"
    echo ""

    # ========================================
    # 1. 统计各状态事件数量
    # ========================================
    echo -e "${BLUE}【事件状态统计】${NC}"
    psql -U postgres -d cloudphone_device -c "
        SELECT
            status,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER(), 0), 2) as percentage
        FROM event_outbox
        GROUP BY status
        ORDER BY status;
    " 2>/dev/null || echo -e "${RED}✗ 无法连接到数据库${NC}"

    echo ""

    # ========================================
    # 2. 最近 10 条待发布事件
    # ========================================
    echo -e "${BLUE}【待发布事件（最近 10 条）】${NC}"
    psql -U postgres -d cloudphone_device -c "
        SELECT
            id,
            event_type,
            created_at,
            retry_count,
            EXTRACT(EPOCH FROM (NOW() - created_at))::INT as age_seconds
        FROM event_outbox
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 10;
    " 2>/dev/null || echo -e "${YELLOW}  无待发布事件${NC}"

    echo ""

    # ========================================
    # 3. 失败事件（如果有）
    # ========================================
    FAILED_COUNT=$(psql -U postgres -d cloudphone_device -t -c "SELECT COUNT(*) FROM event_outbox WHERE status = 'failed';" 2>/dev/null | xargs || echo "0")

    if [ "$FAILED_COUNT" -gt 0 ]; then
        echo -e "${RED}【失败事件（需要关注）】${NC}"
        psql -U postgres -d cloudphone_device -c "
            SELECT
                id,
                event_type,
                retry_count,
                error_message,
                last_error_at
            FROM event_outbox
            WHERE status = 'failed'
            ORDER BY last_error_at DESC
            LIMIT 5;
        " 2>/dev/null
        echo ""
    fi

    # ========================================
    # 4. 事件类型分布
    # ========================================
    echo -e "${BLUE}【事件类型分布（Top 5）】${NC}"
    psql -U postgres -d cloudphone_device -c "
        SELECT
            event_type,
            COUNT(*) as count
        FROM event_outbox
        GROUP BY event_type
        ORDER BY count DESC
        LIMIT 5;
    " 2>/dev/null || echo -e "${YELLOW}  无数据${NC}"

    echo ""

    # ========================================
    # 5. 健康指标
    # ========================================
    echo -e "${BLUE}【健康指标】${NC}"

    TOTAL=$(psql -U postgres -d cloudphone_device -t -c "SELECT COUNT(*) FROM event_outbox;" 2>/dev/null | xargs || echo "0")
    PENDING=$(psql -U postgres -d cloudphone_device -t -c "SELECT COUNT(*) FROM event_outbox WHERE status='pending';" 2>/dev/null | xargs || echo "0")
    PUBLISHED=$(psql -U postgres -d cloudphone_device -t -c "SELECT COUNT(*) FROM event_outbox WHERE status='published';" 2>/dev/null | xargs || echo "0")
    FAILED=$(psql -U postgres -d cloudphone_device -t -c "SELECT COUNT(*) FROM event_outbox WHERE status='failed';" 2>/dev/null | xargs || echo "0")

    # 计算发布率
    if [ "$TOTAL" -gt 0 ]; then
        PUBLISH_RATE=$(echo "scale=2; $PUBLISHED * 100 / $TOTAL" | bc)
    else
        PUBLISH_RATE="N/A"
    fi

    echo -e "  总事件数: ${CYAN}${TOTAL}${NC}"
    echo -e "  待发布: ${YELLOW}${PENDING}${NC}"
    echo -e "  已发布: ${GREEN}${PUBLISHED}${NC}"
    echo -e "  失败: ${RED}${FAILED}${NC}"
    echo -e "  发布率: ${CYAN}${PUBLISH_RATE}%${NC}"

    # 健康状态判断
    if [ "$PENDING" -gt 100 ]; then
        echo -e "  ${RED}⚠️  警告: 待发布事件过多！${NC}"
    fi

    if [ "$FAILED" -gt 10 ]; then
        echo -e "  ${RED}⚠️  警告: 失败事件过多！检查 RabbitMQ 连接${NC}"
    fi

    # 检查最老的待发布事件
    OLDEST_PENDING_AGE=$(psql -U postgres -d cloudphone_device -t -c "
        SELECT EXTRACT(EPOCH FROM (NOW() - MIN(created_at)))::INT
        FROM event_outbox
        WHERE status = 'pending';
    " 2>/dev/null | xargs || echo "0")

    if [ "$OLDEST_PENDING_AGE" -gt 60 ]; then
        echo -e "  ${YELLOW}⚠️  最老待发布事件: ${OLDEST_PENDING_AGE} 秒前${NC}"
    fi

    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "  下次刷新: 5 秒后..."
    echo -e "${BLUE}========================================${NC}"

    # 等待 5 秒
    sleep 5
done
