#!/bin/bash

# ========================================
# SMS 验证码端到端集成测试
# ========================================
# 测试完整流程：
# 1. Device Service 请求虚拟号码
# 2. 模拟 SMS Service 接收到验证码
# 3. 发布 RabbitMQ 事件
# 4. Device Service 消费事件并通过 ADB 推送
# 5. Android 应用接收并显示验证码
# ========================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置
DEVICE_SERVICE_URL="${DEVICE_SERVICE_URL:-http://localhost:30002}"
RABBITMQ_API_URL="${RABBITMQ_API_URL:-http://localhost:15672/api}"
RABBITMQ_USER="${RABBITMQ_USER:-admin}"
RABBITMQ_PASS="${RABBITMQ_PASS:-admin123}"
DEVICE_ID="${1:-}"
TOKEN="${JWT_TOKEN:-}"

echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        SMS 验证码端到端集成测试                                ║
║        CloudPhone Platform - E2E Integration Test            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# 检查依赖
echo -e "${BLUE}[步骤 0/6] 检查测试环境${NC}"
echo ""

# 检查 jq
if ! command -v jq &> /dev/null; then
    echo -e "${RED}✗ 未找到 jq 工具${NC}"
    echo "  安装: sudo yum install jq"
    exit 1
fi
echo -e "${GREEN}✓ jq 已安装${NC}"

# 检查 curl
if ! command -v curl &> /dev/null; then
    echo -e "${RED}✗ 未找到 curl 工具${NC}"
    exit 1
fi
echo -e "${GREEN}✓ curl 已安装${NC}"

# 检查 adb
if ! command -v adb &> /dev/null; then
    echo -e "${YELLOW}⚠ 未找到 adb 工具（可选）${NC}"
    HAS_ADB=false
else
    echo -e "${GREEN}✓ adb 已安装${NC}"
    HAS_ADB=true
fi

echo ""

# 选择设备
if [ -z "$DEVICE_ID" ]; then
    echo -e "${YELLOW}未指定设备ID，尝试获取第一个可用设备...${NC}"

    if [ "$HAS_ADB" = true ]; then
        DEVICE_ID=$(adb devices | grep -v "List" | grep "device$" | head -1 | cut -f1)
    fi

    if [ -z "$DEVICE_ID" ]; then
        echo -e "${RED}✗ 未找到可用设备${NC}"
        echo ""
        echo "用法："
        echo "  $0 <device-id>"
        echo ""
        echo "示例："
        echo "  $0 device-123456"
        exit 1
    fi
fi

echo -e "${GREEN}✓ 测试设备: ${YELLOW}$DEVICE_ID${NC}"
echo ""

# 步骤 1: 检查设备状态
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}[步骤 1/6] 检查设备状态${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -n "$TOKEN" ]; then
    DEVICE_INFO=$(curl -s -H "Authorization: Bearer $TOKEN" "$DEVICE_SERVICE_URL/devices/$DEVICE_ID")

    if echo "$DEVICE_INFO" | jq -e . >/dev/null 2>&1; then
        DEVICE_STATUS=$(echo "$DEVICE_INFO" | jq -r '.status // .data.status // "unknown"')
        echo -e "  设备状态: ${YELLOW}$DEVICE_STATUS${NC}"

        if [ "$DEVICE_STATUS" != "RUNNING" ] && [ "$DEVICE_STATUS" != "running" ]; then
            echo -e "${YELLOW}  ⚠ 警告: 设备未运行，SMS 推送可能失败${NC}"
        else
            echo -e "${GREEN}  ✓ 设备正常运行${NC}"
        fi
    else
        echo -e "${YELLOW}  ⚠ 无法获取设备信息（将继续测试）${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠ 未提供 JWT Token，跳过设备状态检查${NC}"
fi

echo ""

# 步骤 2: 检查 RabbitMQ 连接
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}[步骤 2/6] 检查 RabbitMQ 连接${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

RABBITMQ_OVERVIEW=$(curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" "$RABBITMQ_API_URL/overview")

if echo "$RABBITMQ_OVERVIEW" | jq -e . >/dev/null 2>&1; then
    echo -e "${GREEN}✓ RabbitMQ 连接正常${NC}"

    # 检查队列是否存在
    QUEUE_NAME="device-service.sms.message-received"
    QUEUE_INFO=$(curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" "$RABBITMQ_API_URL/queues/cloudphone/$QUEUE_NAME")

    if echo "$QUEUE_INFO" | jq -e . >/dev/null 2>&1; then
        MESSAGES=$(echo "$QUEUE_INFO" | jq -r '.messages // 0')
        CONSUMERS=$(echo "$QUEUE_INFO" | jq -r '.consumers // 0')
        echo -e "  队列: ${YELLOW}$QUEUE_NAME${NC}"
        echo -e "  消息数: ${YELLOW}$MESSAGES${NC}"
        echo -e "  消费者: ${YELLOW}$CONSUMERS${NC}"

        if [ "$CONSUMERS" -eq 0 ]; then
            echo -e "${YELLOW}  ⚠ 警告: 没有消费者在监听此队列${NC}"
            echo -e "${YELLOW}  请确保 Device Service 已启动${NC}"
        else
            echo -e "${GREEN}  ✓ 消费者正常${NC}"
        fi
    else
        echo -e "${YELLOW}  ⚠ 队列不存在，将在第一次消息发布时自动创建${NC}"
    fi
else
    echo -e "${RED}✗ 无法连接到 RabbitMQ${NC}"
    echo "  请检查 RabbitMQ 是否运行: docker compose -f docker-compose.dev.yml ps rabbitmq"
    exit 1
fi

echo ""

# 步骤 3: 生成测试数据
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}[步骤 3/6] 生成测试数据${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 生成随机验证码
TEST_CODE=$(printf "%06d" $((100000 + RANDOM % 900000)))
TEST_PHONE="+79$(printf "%09d" $((100000000 + RANDOM % 900000000)))"
TEST_SERVICE="telegram"
TEST_MESSAGE_ID="test-msg-$(date +%s)-$RANDOM"

echo -e "  验证码: ${GREEN}$TEST_CODE${NC}"
echo -e "  手机号: ${GREEN}$TEST_PHONE${NC}"
echo -e "  服务: ${GREEN}$TEST_SERVICE${NC}"
echo -e "  消息ID: ${GREEN}$TEST_MESSAGE_ID${NC}"

echo ""

# 步骤 4: 发布 RabbitMQ 事件
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}[步骤 4/6] 发布 RabbitMQ 事件${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 构建事件 payload
EVENT_PAYLOAD=$(cat <<EOF
{
  "messageId": "$TEST_MESSAGE_ID",
  "deviceId": "$DEVICE_ID",
  "phoneNumber": "$TEST_PHONE",
  "verificationCode": "$TEST_CODE",
  "service": "$TEST_SERVICE",
  "receivedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "userId": "test-user-$(date +%s)"
}
EOF
)

echo "  发布事件到: ${YELLOW}cloudphone.events${NC}"
echo "  路由键: ${YELLOW}sms.message.received${NC}"
echo ""

# 发布事件
PUBLISH_RESULT=$(curl -s -X POST \
  -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
  -H "Content-Type: application/json" \
  "$RABBITMQ_API_URL/exchanges/cloudphone/cloudphone.events/publish" \
  -d "{
    \"routing_key\": \"sms.message.received\",
    \"payload\": $(echo "$EVENT_PAYLOAD" | jq -c .),
    \"payload_encoding\": \"string\",
    \"properties\": {
      \"delivery_mode\": 2,
      \"content_type\": \"application/json\"
    }
  }")

if echo "$PUBLISH_RESULT" | jq -e '.routed == true' >/dev/null 2>&1; then
    echo -e "${GREEN}✓ 事件发布成功${NC}"
    echo ""
    echo "  Payload:"
    echo "$EVENT_PAYLOAD" | jq .
else
    echo -e "${RED}✗ 事件发布失败${NC}"
    echo "$PUBLISH_RESULT" | jq .
    exit 1
fi

echo ""

# 步骤 5: 等待消息处理
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}[步骤 5/6] 等待消息处理${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "  等待 Device Service 消费事件..."
for i in {1..5}; do
    echo -n "."
    sleep 1
done
echo ""

echo -e "${GREEN}✓ 等待完成${NC}"
echo ""

# 步骤 6: 验证结果
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}[步骤 6/6] 验证测试结果${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 检查 ADB 日志
if [ "$HAS_ADB" = true ]; then
    echo "  → 检查设备日志..."
    ADB_LOG=$(adb -s "$DEVICE_ID" logcat -d -s SmsReceiver:I 2>&1 | tail -20)

    if echo "$ADB_LOG" | grep -q "$TEST_CODE"; then
        echo -e "${GREEN}  ✓ 在设备日志中找到验证码${NC}"
        echo ""
        echo "  最近日志:"
        echo "$ADB_LOG" | tail -5 | sed 's/^/    /'
    else
        echo -e "${YELLOW}  ⚠ 未在设备日志中找到验证码${NC}"
        echo "  这可能是因为："
        echo "    1. SMS Helper APK 未安装"
        echo "    2. 设备未运行"
        echo "    3. Device Service 未启动"
    fi
fi

echo ""

# 检查 Device Service 日志（如果可用）
echo "  → 检查 Device Service 日志..."
if command -v pm2 &> /dev/null; then
    PM2_LOG=$(pm2 logs device-service --lines 20 --nostream 2>&1 | grep -i "sms\|broadcast" | tail -10)

    if [ -n "$PM2_LOG" ]; then
        echo ""
        echo "  Device Service 日志:"
        echo "$PM2_LOG" | sed 's/^/    /'
    fi
fi

echo ""

# 测试总结
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║                       测试完成                                 ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo -e "${BLUE}测试摘要:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  设备ID: ${YELLOW}$DEVICE_ID${NC}"
echo -e "  验证码: ${GREEN}$TEST_CODE${NC}"
echo -e "  手机号: ${GREEN}$TEST_PHONE${NC}"
echo -e "  服务: ${GREEN}$TEST_SERVICE${NC}"
echo ""
echo -e "${BLUE}验证步骤:${NC}"
echo ""
echo "1. 在设备上打开任意输入框"
echo "2. 长按输入框，选择\"粘贴\""
echo "3. 应该看到验证码: ${GREEN}$TEST_CODE${NC}"
echo ""
echo "4. 如果安装了 SMS Helper APK 并授权悬浮窗："
echo "   应该看到验证码悬浮窗"
echo ""
echo "5. 如果启用了辅助功能："
echo "   验证码应该自动填充到输入框"
echo ""

echo -e "${BLUE}调试命令:${NC}"
echo ""
echo "  # 查看 RabbitMQ 队列状态"
echo "  curl -u admin:admin123 http://localhost:15672/api/queues/cloudphone/device-service.sms.message-received | jq ."
echo ""
echo "  # 查看设备日志"
echo "  adb -s $DEVICE_ID logcat | grep -i sms"
echo ""
echo "  # 查看 Device Service 日志"
echo "  pm2 logs device-service --lines 50 | grep -i sms"
echo ""

echo -e "${GREEN}✅ 端到端测试完成${NC}"
echo ""
