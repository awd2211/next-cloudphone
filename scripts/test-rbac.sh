#!/bin/bash

# RBAC 系统测试脚本
# 测试不同角色的权限控制

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:30000}"

echo "=========================================="
echo "  RBAC 系统测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果计数
PASSED=0
FAILED=0

# 测试函数
test_api() {
  local name="$1"
  local method="$2"
  local url="$3"
  local token="$4"
  local expected_status="$5"

  echo -n "测试: $name ... "

  response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE_URL$url" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json")

  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$status_code" == "$expected_status" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $status_code)"
    PASSED=$((PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAILED${NC} (Expected $expected_status, got $status_code)"
    echo "  Response: $body"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

# 1. 登录获取不同角色的 token
echo "================================================"
echo "步骤 1: 获取不同角色的认证 Token"
echo "================================================"
echo ""

# 超级管理员登录
echo "1.1 超级管理员登录..."
SUPER_ADMIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"admin123"}')

SUPER_ADMIN_TOKEN=$(echo "$SUPER_ADMIN_RESPONSE" | jq -r '.data.accessToken // empty')

if [ -z "$SUPER_ADMIN_TOKEN" ] || [ "$SUPER_ADMIN_TOKEN" == "null" ]; then
  echo -e "${YELLOW}⚠ 警告: 超级管理员账号不存在，跳过相关测试${NC}"
  SUPER_ADMIN_TOKEN=""
else
  echo -e "${GREEN}✓ 超级管理员登录成功${NC}"
fi

# 管理员登录
echo "1.2 管理员登录..."
ADMIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.data.accessToken // empty')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" == "null" ]; then
  echo -e "${YELLOW}⚠ 警告: 管理员账号不存在，跳过相关测试${NC}"
  ADMIN_TOKEN=""
else
  echo -e "${GREEN}✓ 管理员登录成功${NC}"
fi

# 普通用户登录
echo "1.3 普通用户登录..."
USER_RESPONSE=$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"user123"}')

USER_TOKEN=$(echo "$USER_RESPONSE" | jq -r '.data.accessToken // empty')
USER_ID=$(echo "$USER_RESPONSE" | jq -r '.data.user.id // empty')

if [ -z "$USER_TOKEN" ] || [ "$USER_TOKEN" == "null" ]; then
  echo -e "${YELLOW}⚠ 警告: 普通用户账号不存在，跳过相关测试${NC}"
  USER_TOKEN=""
else
  echo -e "${GREEN}✓ 普通用户登录成功 (ID: $USER_ID)${NC}"
fi

echo ""

# 2. 测试用户管理接口
echo "================================================"
echo "步骤 2: 测试用户管理接口权限"
echo "================================================"
echo ""

if [ -n "$USER_TOKEN" ]; then
  # 2.1 普通用户访问自己的信息（应该成功）
  test_api "普通用户访问自己的信息" "GET" "/users/me" "$USER_TOKEN" "200"

  # 2.2 普通用户访问其他用户信息（应该失败）
  if [ -n "$ADMIN_TOKEN" ]; then
    ADMIN_ID=$(echo "$ADMIN_RESPONSE" | jq -r '.data.user.id // empty')
    test_api "普通用户访问其他用户信息" "GET" "/users/$ADMIN_ID" "$USER_TOKEN" "403"
  fi

  # 2.3 普通用户获取用户列表（应该失败）
  test_api "普通用户获取用户列表" "GET" "/users" "$USER_TOKEN" "403"
fi

if [ -n "$ADMIN_TOKEN" ]; then
  # 2.4 管理员获取用户列表（应该成功）
  test_api "管理员获取用户列表" "GET" "/users" "$ADMIN_TOKEN" "200"

  # 2.5 管理员访问任意用户信息（应该成功）
  if [ -n "$USER_ID" ]; then
    test_api "管理员访问其他用户信息" "GET" "/users/$USER_ID" "$ADMIN_TOKEN" "200"
  fi
fi

echo ""

# 3. 测试设备管理接口
echo "================================================"
echo "步骤 3: 测试设备管理接口权限"
echo "================================================"
echo ""

if [ -n "$USER_TOKEN" ]; then
  # 3.1 普通用户查看自己的设备（应该成功）
  test_api "普通用户查看设备列表" "GET" "/devices" "$USER_TOKEN" "200"

  # 3.2 普通用户查看设备统计（如果有权限应该成功，但只看到自己的）
  test_api "普通用户查看设备统计" "GET" "/devices/stats" "$USER_TOKEN" "200"
fi

if [ -n "$ADMIN_TOKEN" ]; then
  # 3.3 管理员查看所有设备（应该成功）
  test_api "管理员查看设备列表" "GET" "/devices" "$ADMIN_TOKEN" "200"

  # 3.4 管理员查看设备统计（应该成功）
  test_api "管理员查看设备统计" "GET" "/devices/stats" "$ADMIN_TOKEN" "200"
fi

echo ""

# 4. 测试配额管理接口
echo "================================================"
echo "步骤 4: 测试配额管理接口权限"
echo "================================================"
echo ""

if [ -n "$USER_TOKEN" ] && [ -n "$USER_ID" ]; then
  # 4.1 普通用户查看自己的配额（应该成功）
  test_api "普通用户查看自己的配额" "GET" "/quotas/user/$USER_ID" "$USER_TOKEN" "200"
fi

if [ -n "$ADMIN_TOKEN" ]; then
  # 4.2 管理员查看配额告警（应该成功）
  test_api "管理员查看配额告警" "GET" "/quotas/alerts" "$ADMIN_TOKEN" "200"
fi

echo ""

# 5. 测试系统管理接口
echo "================================================"
echo "步骤 5: 测试系统管理接口权限"
echo "================================================"
echo ""

if [ -n "$USER_TOKEN" ]; then
  # 5.1 普通用户访问缓存管理（应该失败）
  test_api "普通用户访问缓存统计" "GET" "/cache/stats" "$USER_TOKEN" "403"

  # 5.2 普通用户访问队列管理（应该失败）
  test_api "普通用户访问队列状态" "GET" "/queues/status" "$USER_TOKEN" "403"

  # 5.3 普通用户访问审计日志（只能看自己的）
  if [ -n "$USER_ID" ]; then
    test_api "普通用户查看自己的审计日志" "GET" "/audit-logs/user/$USER_ID" "$USER_TOKEN" "200"
  fi
fi

if [ -n "$ADMIN_TOKEN" ]; then
  # 5.4 管理员访问缓存管理（应该成功）
  test_api "管理员访问缓存统计" "GET" "/cache/stats" "$ADMIN_TOKEN" "200"

  # 5.5 管理员访问队列管理（应该成功）
  test_api "管理员访问队列状态" "GET" "/queues/status" "$ADMIN_TOKEN" "200"

  # 5.6 管理员访问审计日志统计（应该成功）
  test_api "管理员查看审计日志统计" "GET" "/audit-logs/statistics" "$ADMIN_TOKEN" "200"
fi

echo ""

# 6. 测试角色和权限管理
echo "================================================"
echo "步骤 6: 测试角色和权限管理接口"
echo "================================================"
echo ""

if [ -n "$USER_TOKEN" ]; then
  # 6.1 普通用户查看角色列表（应该成功，只读）
  test_api "普通用户查看角色列表" "GET" "/roles" "$USER_TOKEN" "200"

  # 6.2 普通用户查看权限列表（应该成功，只读）
  test_api "普通用户查看权限列表" "GET" "/permissions" "$USER_TOKEN" "200"
fi

if [ -n "$ADMIN_TOKEN" ]; then
  # 6.3 管理员查看角色列表（应该成功）
  test_api "管理员查看角色列表" "GET" "/roles" "$ADMIN_TOKEN" "200"

  # 6.4 管理员查看权限列表（应该成功）
  test_api "管理员查看权限列表" "GET" "/permissions" "$ADMIN_TOKEN" "200"
fi

echo ""

# 7. 测试菜单权限
echo "================================================"
echo "步骤 7: 测试菜单权限接口"
echo "================================================"
echo ""

if [ -n "$USER_TOKEN" ]; then
  # 7.1 普通用户获取自己的菜单（应该成功）
  test_api "普通用户获取自己的菜单" "GET" "/menu-permissions/my-menus" "$USER_TOKEN" "200"

  # 7.2 普通用户获取自己的权限（应该成功）
  test_api "普通用户获取自己的权限" "GET" "/menu-permissions/my-permissions" "$USER_TOKEN" "200"
fi

if [ -n "$ADMIN_TOKEN" ]; then
  # 7.3 管理员获取所有菜单（应该成功）
  test_api "管理员获取所有菜单" "GET" "/menu-permissions/all-menus" "$ADMIN_TOKEN" "200"
fi

echo ""

# 打印测试结果
echo "=========================================="
echo "  测试结果汇总"
echo "=========================================="
echo -e "${GREEN}通过: $PASSED${NC}"
echo -e "${RED}失败: $FAILED${NC}"
echo "总计: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ 所有测试通过！${NC}"
  exit 0
else
  echo -e "${RED}✗ 部分测试失败${NC}"
  exit 1
fi
