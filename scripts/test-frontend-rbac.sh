#!/bin/bash

# Frontend RBAC 测试脚本
# 验证前端角色和权限控制是否正常工作

set -e

echo "=========================================="
echo "  Frontend RBAC 测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试结果计数
PASSED=0
FAILED=0

# API 基础 URL
API_BASE_URL="${API_BASE_URL:-http://localhost:30000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

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
    -H "Content-Type: application/json" 2>/dev/null || echo "000")

  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$status_code" == "$expected_status" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $status_code)"
    PASSED=$((PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAILED${NC} (Expected $expected_status, got $status_code)"
    if [ -n "$body" ]; then
      echo "  Response: $(echo "$body" | head -c 200)"
    fi
    FAILED=$((FAILED + 1))
    return 1
  fi
}

# 检查服务是否运行
echo -e "${BLUE}=== 步骤 1: 检查服务状态 ===${NC}"
echo ""

if ! curl -s "$API_BASE_URL/health" > /dev/null 2>&1; then
  echo -e "${RED}✗ API Gateway 未运行 ($API_BASE_URL)${NC}"
  echo "请先启动服务: pm2 start ecosystem.config.js"
  exit 1
fi
echo -e "${GREEN}✓ API Gateway 运行正常${NC}"

if ! curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠ Frontend 未运行 ($FRONTEND_URL)${NC}"
  echo "提示: 启动前端 - cd frontend/admin && pnpm dev"
else
  echo -e "${GREEN}✓ Frontend 运行正常${NC}"
fi

echo ""

# 登录获取不同角色的 token
echo -e "${BLUE}=== 步骤 2: 获取不同角色的认证 Token ===${NC}"
echo ""

# 超级管理员登录
echo "2.1 尝试超级管理员登录..."
SUPER_ADMIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"admin123"}' 2>/dev/null || echo '{}')

SUPER_ADMIN_TOKEN=$(echo "$SUPER_ADMIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SUPER_ADMIN_TOKEN" ] || [ "$SUPER_ADMIN_TOKEN" == "null" ]; then
  echo -e "${YELLOW}⚠ 超级管理员账号不存在或密码错误${NC}"
  SUPER_ADMIN_TOKEN=""
else
  echo -e "${GREEN}✓ 超级管理员登录成功${NC}"
fi

# 管理员登录
echo "2.2 尝试管理员登录..."
ADMIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>/dev/null || echo '{}')

ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" == "null" ]; then
  echo -e "${YELLOW}⚠ 管理员账号不存在或密码错误${NC}"
  ADMIN_TOKEN=""
else
  echo -e "${GREEN}✓ 管理员登录成功${NC}"
fi

# 普通用户登录
echo "2.3 尝试普通用户登录..."
USER_RESPONSE=$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"user123"}' 2>/dev/null || echo '{}')

USER_TOKEN=$(echo "$USER_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_TOKEN" ] || [ "$USER_TOKEN" == "null" ]; then
  echo -e "${YELLOW}⚠ 普通用户账号不存在或密码错误${NC}"
  echo -e "${YELLOW}提示: 请创建测试用户${NC}"
  USER_TOKEN=""
else
  echo -e "${GREEN}✓ 普通用户登录成功 (ID: ${USER_ID:0:8}...)${NC}"
fi

echo ""

# 测试菜单权限接口
echo -e "${BLUE}=== 步骤 3: 测试菜单权限接口 ===${NC}"
echo ""

if [ -n "$USER_TOKEN" ]; then
  test_api "普通用户获取自己的菜单" "GET" "/menu-permissions/my-menus" "$USER_TOKEN" "200"
  test_api "普通用户获取自己的权限" "GET" "/menu-permissions/my-permissions" "$USER_TOKEN" "200"
fi

if [ -n "$ADMIN_TOKEN" ]; then
  test_api "管理员获取所有菜单" "GET" "/menu-permissions/all-menus" "$ADMIN_TOKEN" "200"
  test_api "管理员获取菜单树" "GET" "/menu-permissions/menu-tree" "$ADMIN_TOKEN" "200"
fi

echo ""

# 测试用户管理权限
echo -e "${BLUE}=== 步骤 4: 测试用户管理权限 ===${NC}"
echo ""

if [ -n "$USER_TOKEN" ]; then
  test_api "普通用户访问自己的信息" "GET" "/users/me" "$USER_TOKEN" "200"
  test_api "普通用户获取用户列表（应该失败）" "GET" "/users" "$USER_TOKEN" "403"
fi

if [ -n "$ADMIN_TOKEN" ]; then
  test_api "管理员获取用户列表" "GET" "/users" "$ADMIN_TOKEN" "200"
  if [ -n "$USER_ID" ]; then
    test_api "管理员访问其他用户信息" "GET" "/users/$USER_ID" "$ADMIN_TOKEN" "200"
  fi
fi

echo ""

# 测试角色和权限管理
echo -e "${BLUE}=== 步骤 5: 测试角色和权限管理 ===${NC}"
echo ""

if [ -n "$USER_TOKEN" ]; then
  test_api "普通用户查看角色列表" "GET" "/roles" "$USER_TOKEN" "200"
  test_api "普通用户查看权限列表" "GET" "/permissions" "$USER_TOKEN" "200"
fi

if [ -n "$ADMIN_TOKEN" ]; then
  test_api "管理员查看角色列表" "GET" "/roles" "$ADMIN_TOKEN" "200"
  test_api "管理员查看权限列表" "GET" "/permissions" "$ADMIN_TOKEN" "200"
fi

echo ""

# 测试设备管理权限
echo -e "${BLUE}=== 步骤 6: 测试设备管理权限 ===${NC}"
echo ""

if [ -n "$USER_TOKEN" ]; then
  test_api "普通用户查看设备列表" "GET" "/devices" "$USER_TOKEN" "200"
  test_api "普通用户查看设备统计" "GET" "/devices/stats" "$USER_TOKEN" "200"
fi

if [ -n "$ADMIN_TOKEN" ]; then
  test_api "管理员查看设备列表" "GET" "/devices" "$ADMIN_TOKEN" "200"
  test_api "管理员查看设备统计" "GET" "/devices/stats" "$ADMIN_TOKEN" "200"
fi

echo ""

# 测试配额管理权限
echo -e "${BLUE}=== 步骤 7: 测试配额管理权限 ===${NC}"
echo ""

if [ -n "$USER_TOKEN" ] && [ -n "$USER_ID" ]; then
  test_api "普通用户查看自己的配额" "GET" "/quotas/user/$USER_ID" "$USER_TOKEN" "200"
  test_api "普通用户查看配额告警（应该失败）" "GET" "/quotas/alerts" "$USER_TOKEN" "403"
fi

if [ -n "$ADMIN_TOKEN" ]; then
  test_api "管理员查看配额告警" "GET" "/quotas/alerts" "$ADMIN_TOKEN" "200"
fi

echo ""

# 测试系统管理权限
echo -e "${BLUE}=== 步骤 8: 测试系统管理权限 ===${NC}"
echo ""

if [ -n "$USER_TOKEN" ]; then
  test_api "普通用户访问缓存统计（应该失败）" "GET" "/cache/stats" "$USER_TOKEN" "403"
  test_api "普通用户访问队列状态（应该失败）" "GET" "/queues/status" "$USER_TOKEN" "403"
fi

if [ -n "$ADMIN_TOKEN" ]; then
  test_api "管理员访问缓存统计" "GET" "/cache/stats" "$ADMIN_TOKEN" "200"
  test_api "管理员访问队列状态" "GET" "/queues/status" "$ADMIN_TOKEN" "200"
fi

if [ -n "$SUPER_ADMIN_TOKEN" ]; then
  test_api "超级管理员访问缓存统计" "GET" "/cache/stats" "$SUPER_ADMIN_TOKEN" "200"
  test_api "超级管理员访问队列状态" "GET" "/queues/status" "$SUPER_ADMIN_TOKEN" "200"
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

# 前端测试提示
echo -e "${BLUE}=== 前端手动测试清单 ===${NC}"
echo ""
echo "1. 登录测试:"
echo "   □ 使用不同角色登录 (super_admin, admin, user)"
echo "   □ 验证登录后跳转到仪表盘"
echo "   □ 验证 token 存储在 localStorage"
echo ""
echo "2. 仪表盘测试:"
echo "   □ 普通用户只看到设备统计"
echo "   □ 管理员看到完整统计（用户、收入、订单）"
echo "   □ 角色标签显示正确"
echo ""
echo "3. 路由保护测试:"
echo "   □ 普通用户访问 /users 重定向或显示 403"
echo "   □ 普通用户访问 /system/cache 显示 403"
echo "   □ 管理员可以访问 /users、/roles、/permissions"
echo "   □ 超级管理员可以访问 /system/* 路由"
echo ""
echo "4. 设备列表测试:"
echo "   □ 普通用户看不到删除按钮"
echo "   □ 管理员看到删除按钮"
echo "   □ 批量删除按钮权限正确"
echo ""
echo "5. 用户列表测试:"
echo "   □ 创建用户按钮（需要 user.create 权限）"
echo "   □ 充值/扣减按钮（需要 billing.manage 权限）"
echo "   □ 封禁/解封按钮（需要 user.update 权限）"
echo "   □ 删除按钮（需要 user.delete 权限）"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ 所有 API 测试通过！${NC}"
  echo ""
  echo "建议继续进行前端手动测试"
  exit 0
else
  echo -e "${RED}✗ 部分测试失败${NC}"
  echo ""
  echo "请检查："
  echo "1. 服务是否正常运行"
  echo "2. 数据库是否已初始化角色和权限"
  echo "3. 测试用户是否已创建"
  exit 1
fi
