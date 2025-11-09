#!/bin/bash

# WebSocket 推送功能测试脚本

set -e

echo "🧪 WebSocket 推送功能测试"
echo "========================================"
echo ""

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置
NOTIFICATION_SERVICE_URL="http://localhost:30006"
USER_SERVICE_URL="http://localhost:30001"
DEVICE_SERVICE_URL="http://localhost:30002"

# 获取测试 token
get_test_token() {
    echo -e "${YELLOW}📝 获取测试 token...${NC}"

    TOKEN=$(curl -s -X POST "${USER_SERVICE_URL}/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "username": "admin",
            "password": "admin123"
        }' | jq -r '.data.access_token')

    if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
        echo -e "${RED}❌ 获取 token 失败${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Token 获取成功${NC}"
    echo ""
}

# 测试 WebSocket 连接
test_websocket_connection() {
    echo -e "${YELLOW}🔌 测试 WebSocket 连接...${NC}"

    # 检查 notification-service 是否运行
    if ! curl -s "${NOTIFICATION_SERVICE_URL}/health" > /dev/null 2>&1; then
        echo -e "${RED}❌ notification-service 未运行${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ WebSocket 服务正常运行${NC}"
    echo ""
}

# 测试配额事件推送
test_quota_events() {
    echo -e "${YELLOW}📊 测试配额事件推送...${NC}"

    # 模拟发送配额更新事件到 RabbitMQ
    echo "发送测试配额更新事件..."

    # 注意：这需要 rabbitmqadmin 工具
    if command -v rabbitmqadmin &> /dev/null; then
        rabbitmqadmin publish exchange=cloudphone.events routing_key=quota.updated payload='{
            "userId": "test-user-123",
            "quotaId": "quota-test-001",
            "type": "updated",
            "limits": {"devices": 10, "cpu": 16, "memory": 32768},
            "usage": {"devices": 5, "cpu": 8, "memory": 16384},
            "timestamp": "'$(date -Iseconds)'"
        }'
        echo -e "${GREEN}✅ 配额更新事件已发送${NC}"
    else
        echo -e "${YELLOW}⚠️ rabbitmqadmin 未安装，跳过事件发送测试${NC}"
    fi

    echo ""
}

# 测试设备事件推送
test_device_events() {
    echo -e "${YELLOW}🖥️ 测试设备事件推送...${NC}"

    echo "发送测试设备状态变更事件..."

    if command -v rabbitmqadmin &> /dev/null; then
        rabbitmqadmin publish exchange=cloudphone.events routing_key=device.started payload='{
            "deviceId": "device-test-001",
            "deviceName": "测试设备",
            "userId": "test-user-123",
            "userRole": "admin",
            "providerType": "redroid",
            "deviceType": "android",
            "startedAt": "'$(date -Iseconds)'",
            "timestamp": "'$(date -Iseconds)'"
        }'
        echo -e "${GREEN}✅ 设备启动事件已发送${NC}"
    else
        echo -e "${YELLOW}⚠️ rabbitmqadmin 未安装，跳过事件发送测试${NC}"
    fi

    echo ""
}

# 检查 RabbitMQ 队列
check_rabbitmq_queues() {
    echo -e "${YELLOW}🐰 检查 RabbitMQ 队列...${NC}"

    if command -v rabbitmqadmin &> /dev/null; then
        echo ""
        echo "配额相关队列:"
        rabbitmqadmin list queues name messages | grep -i quota || echo "无配额队列"

        echo ""
        echo "设备相关队列:"
        rabbitmqadmin list queues name messages | grep -i device || echo "无设备队列"
    else
        echo -e "${YELLOW}⚠️ rabbitmqadmin 未安装${NC}"
        echo ""
        echo "手动检查 RabbitMQ:"
        echo "1. 访问 http://localhost:15672"
        echo "2. 登录 (admin/admin123)"
        echo "3. 查看 Queues 标签"
    fi

    echo ""
}

# 检查 WebSocket 连接数
check_websocket_connections() {
    echo -e "${YELLOW}📡 检查 WebSocket 连接...${NC}"

    # 通过 Socket.IO 管理接口查询（如果有的话）
    # 这里只是一个示例
    echo "检查 notification-service 日志中的连接信息..."
    pm2 logs notification-service --lines 20 --nostream | grep -i "connected\|disconnected" | tail -5 || true

    echo ""
}

# 主测试流程
main() {
    echo -e "${GREEN}开始测试 WebSocket 推送功能${NC}"
    echo ""

    # 1. 获取 token
    # get_test_token

    # 2. 测试连接
    test_websocket_connection

    # 3. 检查队列
    check_rabbitmq_queues

    # 4. 测试配额事件
    test_quota_events

    # 5. 测试设备事件
    test_device_events

    # 6. 检查连接
    check_websocket_connections

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ 测试完成${NC}"
    echo ""
    echo "手动测试步骤:"
    echo "1. 打开浏览器控制台"
    echo "2. 登录管理后台 http://localhost:5173"
    echo "3. 查看控制台 WebSocket 连接日志"
    echo "4. 打开配额监控页面"
    echo "5. 触发配额变更操作，观察实时推送"
    echo ""
    echo "预期结果:"
    echo "- ✅ 控制台显示 WebSocket 连接成功"
    echo "- ✅ 控制台显示订阅成功消息"
    echo "- ✅ 配额变更时收到实时推送"
    echo "- ✅ 页面数据自动刷新"
    echo ""
}

main
