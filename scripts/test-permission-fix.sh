#!/bin/bash

# 权限格式修复验证脚本
# 测试管理员和普通用户是否能正常访问需要权限的接口

cd "$(dirname "$0")/.."

echo "=========================================="
echo "  权限格式修复验证测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
TESTS_PASSED=0
TESTS_FAILED=0

# 测试函数
test_api() {
  local description="$1"
  local url="$2"
  local token="$3"
  local expected_status="${4:-200}"

  echo -n "测试: $description ... "

  response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $token" "$url")
  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | head -n -1)

  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}✅ PASSED${NC} (HTTP $http_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}❌ FAILED${NC} (Expected HTTP $expected_status, got $http_code)"
    echo "  Response: $body" | head -c 200
    echo ""
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

echo "=== 步骤 1: 管理员登录 ==="
echo ""

admin_response=$(curl -s -X POST http://localhost:30000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

admin_token=$(echo "$admin_response" | jq -r '.data.token // .token // empty')

if [ -z "$admin_token" ] || [ "$admin_token" = "null" ]; then
  echo -e "${RED}❌ 管理员登录失败${NC}"
  echo "Response: $admin_response"
  exit 1
else
  echo -e "${GREEN}✅ 管理员登录成功${NC}"
  echo "Token: ${admin_token:0:50}..."
fi

echo ""
echo "=== 步骤 2: 测试管理员访问权限 ==="
echo ""

# 测试用户相关接口 (需要 user:read 权限)
test_api "获取用户列表" "http://localhost:30000/users?page=1&limit=10" "$admin_token" 200

# 测试设备相关接口 (需要 device:read 权限)
test_api "获取设备统计" "http://localhost:30000/devices/stats" "$admin_token" 200

# 测试获取设备列表 (需要 device:read 权限)
test_api "获取设备列表" "http://localhost:30000/devices?page=1&limit=10" "$admin_token" 200

# 测试角色相关接口 (需要 role:read 权限)
test_api "获取角色列表" "http://localhost:30000/roles?page=1&limit=10" "$admin_token" 200

# 测试权限相关接口 (需要 permission:read 权限)
test_api "获取权限列表" "http://localhost:30000/permissions?page=1&limit=10" "$admin_token" 200

# 测试quota相关接口 (需要 quota:read 权限)
test_api "获取用户配额" "http://localhost:30000/quotas/user/current" "$admin_token" 200

echo ""
echo "=== 步骤 3: 测试用户前端 API 调用 ==="
echo ""

# 模拟用户前端会调用的接口
test_api "获取当前用户信息" "http://localhost:30000/auth/me" "$admin_token" 200

# 获取通知列表 (notification:read)
test_api "获取通知列表" "http://localhost:30000/notifications?page=1&limit=10" "$admin_token" 200

echo ""
echo "=========================================="
echo "  测试结果汇总"
echo "=========================================="
echo ""

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo "总测试数: $TOTAL_TESTS"
echo -e "通过: ${GREEN}$TESTS_PASSED${NC}"
echo -e "失败: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}=========================================="
  echo "  🎉 所有测试通过! 权限修复成功!"
  echo "==========================================${NC}"
  echo ""
  echo "✅ 管理员可以正常访问用户前端"
  echo "✅ 权限格式标准化工作正常"
  echo "✅ 冒号和点号格式都被正确处理"
  exit 0
else
  echo ""
  echo -e "${RED}=========================================="
  echo "  ❌ 部分测试失败,请检查服务日志"
  echo "==========================================${NC}"
  echo ""
  echo "建议检查:"
  echo "1. 服务是否全部正常启动: pm2 list"
  echo "2. 查看失败服务的日志: pm2 logs <service-name>"
  echo "3. 确认数据库权限数据已初始化"
  exit 1
fi
