#!/bin/bash

# ========================================
# OTP 验证码功能测试脚本
# ========================================

set -e

BASE_URL="http://localhost:30006"
PHONE_NUMBER="+1234567890"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "  OTP Verification Code Testing"
echo "=========================================="
echo ""

# 测试 1: 发送注册验证码
echo -e "${BLUE}Test 1: Send Registration OTP${NC}"
echo "POST ${BASE_URL}/sms/otp/send"
RESPONSE=$(curl -s -X POST "${BASE_URL}/sms/otp/send" \
  -H "Content-Type: application/json" \
  -d "{
    \"phoneNumber\": \"${PHONE_NUMBER}\",
    \"type\": \"registration\"
  }")

echo "$RESPONSE" | jq '.'
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

if [ "$SUCCESS" = "true" ]; then
  echo -e "${GREEN}✓ OTP sent successfully${NC}"
else
  echo -e "${RED}✗ Failed to send OTP${NC}"
  echo "$RESPONSE" | jq -r '.error'
  exit 1
fi

echo ""
echo "=========================================="
echo ""

# 测试 2: 检查活跃的验证码
echo -e "${BLUE}Test 2: Check Active OTP${NC}"
echo "GET ${BASE_URL}/sms/otp/active?phoneNumber=${PHONE_NUMBER}&type=registration"
RESPONSE=$(curl -s -X GET "${BASE_URL}/sms/otp/active?phoneNumber=${PHONE_NUMBER}&type=registration")

echo "$RESPONSE" | jq '.'
HAS_ACTIVE=$(echo "$RESPONSE" | jq -r '.hasActive')

if [ "$HAS_ACTIVE" = "true" ]; then
  echo -e "${GREEN}✓ Active OTP found${NC}"
  REMAINING=$(echo "$RESPONSE" | jq -r '.remainingSeconds')
  echo "  Remaining TTL: ${REMAINING}s"
else
  echo -e "${RED}✗ No active OTP${NC}"
fi

echo ""
echo "=========================================="
echo ""

# 测试 3: 获取剩余重试次数
echo -e "${BLUE}Test 3: Get Remaining Retries${NC}"
echo "GET ${BASE_URL}/sms/otp/retries?phoneNumber=${PHONE_NUMBER}&type=registration"
RESPONSE=$(curl -s -X GET "${BASE_URL}/sms/otp/retries?phoneNumber=${PHONE_NUMBER}&type=registration")

echo "$RESPONSE" | jq '.'
RETRIES=$(echo "$RESPONSE" | jq -r '.remainingRetries')
echo "  Remaining retries: ${RETRIES}"

echo ""
echo "=========================================="
echo ""

# 测试 4: 验证错误的验证码
echo -e "${BLUE}Test 4: Verify Invalid OTP${NC}"
echo "POST ${BASE_URL}/sms/otp/verify"
RESPONSE=$(curl -s -X POST "${BASE_URL}/sms/otp/verify" \
  -H "Content-Type: application/json" \
  -d "{
    \"phoneNumber\": \"${PHONE_NUMBER}\",
    \"code\": \"000000\",
    \"type\": \"registration\"
  }")

echo "$RESPONSE" | jq '.'
VALID=$(echo "$RESPONSE" | jq -r '.valid')

if [ "$VALID" = "false" ]; then
  echo -e "${GREEN}✓ Correctly rejected invalid code${NC}"
  echo "$RESPONSE" | jq -r '.error'
else
  echo -e "${RED}✗ Should have rejected invalid code${NC}"
fi

echo ""
echo "=========================================="
echo ""

# 测试 5: 再次检查剩余重试次数（应该减少了）
echo -e "${BLUE}Test 5: Check Retries After Failed Attempt${NC}"
RESPONSE=$(curl -s -X GET "${BASE_URL}/sms/otp/retries?phoneNumber=${PHONE_NUMBER}&type=registration")

echo "$RESPONSE" | jq '.'
NEW_RETRIES=$(echo "$RESPONSE" | jq -r '.remainingRetries')
echo "  Remaining retries: ${NEW_RETRIES}"

if [ "$NEW_RETRIES" -lt "$RETRIES" ]; then
  echo -e "${GREEN}✓ Retry count decreased correctly${NC}"
else
  echo -e "${YELLOW}⚠ Retry count did not decrease${NC}"
fi

echo ""
echo "=========================================="
echo ""

# 测试 6: 测试速率限制（尝试立即重新发送）
echo -e "${BLUE}Test 6: Test Resend Cooldown${NC}"
echo "POST ${BASE_URL}/sms/otp/send (should fail due to cooldown)"
RESPONSE=$(curl -s -X POST "${BASE_URL}/sms/otp/send" \
  -H "Content-Type: application/json" \
  -d "{
    \"phoneNumber\": \"${PHONE_NUMBER}\",
    \"type\": \"registration\"
  }")

echo "$RESPONSE" | jq '.'
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

if [ "$SUCCESS" = "false" ]; then
  echo -e "${GREEN}✓ Cooldown is working${NC}"
  echo "$RESPONSE" | jq -r '.error'
else
  echo -e "${YELLOW}⚠ Cooldown may not be enforced${NC}"
fi

echo ""
echo "=========================================="
echo ""

# 测试 7: 获取 OTP 统计信息
echo -e "${BLUE}Test 7: Get OTP Statistics${NC}"
echo "GET ${BASE_URL}/sms/otp/stats"
RESPONSE=$(curl -s -X GET "${BASE_URL}/sms/otp/stats")

echo "$RESPONSE" | jq '.'
TOTAL=$(echo "$RESPONSE" | jq -r '.totalActive')
echo "  Total active OTPs: ${TOTAL}"

echo ""
echo "=========================================="
echo ""

# 测试 8: 发送不同类型的验证码
echo -e "${BLUE}Test 8: Send Different OTP Types${NC}"

# 登录验证码
echo "  - Login OTP"
curl -s -X POST "${BASE_URL}/sms/otp/send" \
  -H "Content-Type: application/json" \
  -d "{
    \"phoneNumber\": \"+19876543210\",
    \"type\": \"login\"
  }" | jq '.'

# 支付验证码
echo "  - Payment OTP"
curl -s -X POST "${BASE_URL}/sms/otp/send" \
  -H "Content-Type: application/json" \
  -d "{
    \"phoneNumber\": \"+15555551234\",
    \"type\": \"payment\"
  }" | jq '.'

echo ""
echo "=========================================="
echo ""

# 测试 9: 清除验证码（测试用）
echo -e "${BLUE}Test 9: Clear OTP${NC}"
echo "POST ${BASE_URL}/sms/otp/clear"
RESPONSE=$(curl -s -X POST "${BASE_URL}/sms/otp/clear" \
  -H "Content-Type: application/json" \
  -d "{
    \"phoneNumber\": \"${PHONE_NUMBER}\",
    \"type\": \"registration\"
  }")

echo "$RESPONSE" | jq '.'
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

if [ "$SUCCESS" = "true" ]; then
  echo -e "${GREEN}✓ OTP cleared successfully${NC}"
else
  echo -e "${RED}✗ Failed to clear OTP${NC}"
fi

echo ""
echo "=========================================="
echo ""

# 测试 10: 验证已清除的验证码
echo -e "${BLUE}Test 10: Verify OTP After Clearing${NC}"
RESPONSE=$(curl -s -X GET "${BASE_URL}/sms/otp/active?phoneNumber=${PHONE_NUMBER}&type=registration")

echo "$RESPONSE" | jq '.'
HAS_ACTIVE=$(echo "$RESPONSE" | jq -r '.hasActive')

if [ "$HAS_ACTIVE" = "false" ]; then
  echo -e "${GREEN}✓ OTP successfully cleared${NC}"
else
  echo -e "${RED}✗ OTP still active after clearing${NC}"
fi

echo ""
echo "=========================================="
echo "  All Tests Completed!"
echo "=========================================="
echo ""

# 提示信息
echo -e "${YELLOW}Note:${NC}"
echo "  • 实际生产环境中，验证码会通过 SMS 发送到手机"
echo "  • 测试环境可以在日志中查看生成的验证码"
echo "  • 查看日志: pm2 logs notification-service | grep 'OTP'"
echo ""
