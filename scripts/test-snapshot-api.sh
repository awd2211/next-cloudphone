#!/bin/bash

##############################################
# 快照管理 API 测试脚本
# 测试设备快照的创建、列表、恢复、删除功能
##############################################

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# API 基础 URL
API_BASE="http://localhost:30000"
DEVICE_SERVICE_URL="http://localhost:30002"

# 从参数获取或使用默认token
TOKEN="${1:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBjbG91ZHBob25lLmNvbSIsInRlbmFudElkIjpudWxsLCJyb2xlcyI6WyJzdXBlcl9hZG1pbiJdLCJwZXJtaXNzaW9ucyI6WyJkZXZpY2U6c25hcHNob3Q6Y3JlYXRlIiwiZGV2aWNlOnNuYXBzaG90OnJlc3RvcmUiLCJkZXZpY2U6c25hcHNob3Q6ZGVsZXRlIiwiZGV2aWNlOnJlYWQiXSwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjk5OTk5OTk5OTl9.FAKE_TOKEN_FOR_TESTING}"

DEVICE_ID="${2}"

# 函数：打印分隔线
print_separator() {
  echo -e "${BLUE}========================================${NC}"
}

# 函数：打印成功消息
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# 函数：打印错误消息
print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# 函数：打印信息消息
print_info() {
  echo -e "${YELLOW}ℹ $1${NC}"
}

# 函数：执行 API 请求
api_request() {
  local method=$1
  local endpoint=$2
  local data=$3

  if [ -z "$data" ]; then
    curl -s -X $method \
      "$API_BASE$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json"
  else
    curl -s -X $method \
      "$API_BASE$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data"
  fi
}

# 检查设备ID
if [ -z "$DEVICE_ID" ]; then
  print_error "未提供设备 ID"
  echo ""
  echo "用法: $0 [TOKEN] <DEVICE_ID>"
  echo ""
  echo "示例:"
  echo "  $0 your-jwt-token device-123"
  echo ""
  exit 1
fi

print_separator
echo -e "${BLUE}快照管理 API 测试${NC}"
print_separator
echo ""

# 1. 检查设备是否存在
print_info "1. 检查设备是否存在..."
DEVICE_RESPONSE=$(api_request GET "/devices/$DEVICE_ID")

if echo "$DEVICE_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
  DEVICE_NAME=$(echo "$DEVICE_RESPONSE" | jq -r '.name')
  PROVIDER_TYPE=$(echo "$DEVICE_RESPONSE" | jq -r '.providerType')
  print_success "设备存在: $DEVICE_NAME (Provider: $PROVIDER_TYPE)"

  # 检查是否为阿里云设备
  if [ "$PROVIDER_TYPE" != "aliyun_ecp" ]; then
    print_error "设备不是阿里云 ECP 类型，快照功能仅支持阿里云"
    print_info "当前设备类型: $PROVIDER_TYPE"
    exit 1
  fi
else
  print_error "设备不存在或无法访问"
  echo "$DEVICE_RESPONSE" | jq '.'
  exit 1
fi

echo ""

# 2. 创建快照
print_info "2. 创建设备快照..."
SNAPSHOT_NAME="test-snapshot-$(date +%Y%m%d-%H%M%S)"
CREATE_RESPONSE=$(api_request POST "/devices/$DEVICE_ID/snapshots" '{
  "name": "'"$SNAPSHOT_NAME"'",
  "description": "自动化测试创建的快照"
}')

if echo "$CREATE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  SNAPSHOT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.snapshotId')
  print_success "快照创建成功: $SNAPSHOT_ID"
else
  print_error "快照创建失败"
  echo "$CREATE_RESPONSE" | jq '.'
  exit 1
fi

echo ""

# 3. 等待快照创建完成（阿里云创建快照是异步的）
print_info "3. 等待快照创建完成 (最多等待60秒)..."
for i in {1..12}; do
  sleep 5
  LIST_RESPONSE=$(api_request GET "/devices/$DEVICE_ID/snapshots")

  if echo "$LIST_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    SNAPSHOT_STATUS=$(echo "$LIST_RESPONSE" | jq -r ".data[] | select(.id == \"$SNAPSHOT_ID\") | .status")

    if [ "$SNAPSHOT_STATUS" == "available" ]; then
      print_success "快照已创建完成"
      break
    elif [ "$SNAPSHOT_STATUS" == "error" ]; then
      print_error "快照创建失败"
      exit 1
    else
      echo -ne "\r   等待中... (${i}0秒) 状态: $SNAPSHOT_STATUS"
    fi
  fi
done

echo ""
echo ""

# 4. 获取快照列表
print_info "4. 获取设备快照列表..."
LIST_RESPONSE=$(api_request GET "/devices/$DEVICE_ID/snapshots")

if echo "$LIST_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  SNAPSHOT_COUNT=$(echo "$LIST_RESPONSE" | jq -r '.data | length')
  print_success "获取到 $SNAPSHOT_COUNT 个快照"

  echo ""
  echo "快照列表:"
  echo "$LIST_RESPONSE" | jq -r '.data[] | "  - ID: \(.id)\n    名称: \(.name)\n    状态: \(.status)\n    创建时间: \(.createdAt)\n"'
else
  print_error "获取快照列表失败"
  echo "$LIST_RESPONSE" | jq '.'
fi

echo ""

# 5. 测试快照恢复（可选，会重启设备）
read -p "是否测试快照恢复功能？这会重启设备 (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  print_info "5. 恢复快照..."
  RESTORE_RESPONSE=$(api_request POST "/devices/$DEVICE_ID/snapshots/restore" '{
    "snapshotId": "'"$SNAPSHOT_ID"'"
  }')

  if echo "$RESTORE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "快照恢复成功，设备将重启"
  else
    print_error "快照恢复失败"
    echo "$RESTORE_RESPONSE" | jq '.'
  fi

  echo ""
fi

# 6. 删除测试快照
print_info "6. 删除测试快照..."
DELETE_RESPONSE=$(api_request DELETE "/devices/$DEVICE_ID/snapshots/$SNAPSHOT_ID")

if echo "$DELETE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  print_success "快照删除成功"
else
  print_error "快照删除失败"
  echo "$DELETE_RESPONSE" | jq '.'
fi

echo ""

# 7. 验证快照已删除
print_info "7. 验证快照已删除..."
sleep 2
LIST_AFTER_DELETE=$(api_request GET "/devices/$DEVICE_ID/snapshots")

if echo "$LIST_AFTER_DELETE" | jq -e ".data[] | select(.id == \"$SNAPSHOT_ID\")" > /dev/null 2>&1; then
  print_error "快照仍然存在，删除可能未成功"
else
  print_success "快照已成功删除"
fi

echo ""
print_separator
print_success "快照管理 API 测试完成！"
print_separator
echo ""

# 测试总结
echo -e "${BLUE}测试总结:${NC}"
echo "  设备ID: $DEVICE_ID"
echo "  设备名称: $DEVICE_NAME"
echo "  快照ID: $SNAPSHOT_ID"
echo "  快照名称: $SNAPSHOT_NAME"
echo ""
echo "  ✓ 设备检查"
echo "  ✓ 创建快照"
echo "  ✓ 获取快照列表"
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "  ✓ 恢复快照"
fi
echo "  ✓ 删除快照"
echo "  ✓ 验证删除"
echo ""

print_info "所有API端点:"
echo "  POST   /devices/:id/snapshots          - 创建快照"
echo "  GET    /devices/:id/snapshots          - 获取快照列表"
echo "  POST   /devices/:id/snapshots/restore  - 恢复快照"
echo "  DELETE /devices/:id/snapshots/:sid     - 删除快照"
echo ""
