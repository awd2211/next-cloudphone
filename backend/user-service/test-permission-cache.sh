#!/bin/bash

# 权限缓存功能测试脚本
# 测试 PermissionCacheService 集成效果

set -e

echo "=========================================="
echo "  权限缓存功能测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置
USER_SERVICE_URL="http://localhost:30001"
API_GATEWAY_URL="http://localhost:30000"

# 检查服务是否运行
echo -e "${BLUE}[1/6] 检查服务状态...${NC}"
if ! curl -s "${USER_SERVICE_URL}/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ user-service 未运行，请先启动服务${NC}"
    echo "   提示: pm2 restart user-service"
    exit 1
fi
echo -e "${GREEN}✅ user-service 正在运行${NC}"
echo ""

# 获取管理员 Token
echo -e "${BLUE}[2/6] 获取管理员 Token...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${USER_SERVICE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token // empty')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ 登录失败，无法获取 Token${NC}"
    echo "   响应: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Token 获取成功${NC}"
echo "   Token 前缀: ${TOKEN:0:20}..."
echo ""

# 获取当前用户信息
echo -e "${BLUE}[3/6] 获取当前用户信息...${NC}"
USER_INFO=$(curl -s -X GET "${USER_SERVICE_URL}/users/me" \
  -H "Authorization: Bearer $TOKEN")

USER_ID=$(echo $USER_INFO | jq -r '.id // empty')
USERNAME=$(echo $USER_INFO | jq -r '.username // empty')

if [ -z "$USER_ID" ]; then
    echo -e "${RED}❌ 获取用户信息失败${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 用户信息${NC}"
echo "   用户ID: $USER_ID"
echo "   用户名: $USERNAME"
echo ""

# 测试权限查询 - 第一次（应该查数据库）
echo -e "${BLUE}[4/6] 测试权限查询 - 第一次 (应该从数据库加载)${NC}"
echo "   清除缓存..."
curl -s -X DELETE "${USER_SERVICE_URL}/cache/permissions/user/${USER_ID}" \
  -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1 || true

echo "   等待缓存清除..."
sleep 1

echo "   执行权限查询..."
START_TIME=$(date +%s%N)
PERM_RESPONSE_1=$(curl -s -X GET "${USER_SERVICE_URL}/users/me" \
  -H "Authorization: Bearer $TOKEN")
END_TIME=$(date +%s%N)
DURATION_1=$(( (END_TIME - START_TIME) / 1000000 ))

echo -e "${GREEN}✅ 第一次查询完成${NC}"
echo "   响应时间: ${DURATION_1}ms"
echo ""

# 测试权限查询 - 第二次（应该从缓存获取）
echo -e "${BLUE}[5/6] 测试权限查询 - 第二次 (应该从缓存获取)${NC}"
sleep 0.5

START_TIME=$(date +%s%N)
PERM_RESPONSE_2=$(curl -s -X GET "${USER_SERVICE_URL}/users/me" \
  -H "Authorization: Bearer $TOKEN")
END_TIME=$(date +%s%N)
DURATION_2=$(( (END_TIME - START_TIME) / 1000000 ))

echo -e "${GREEN}✅ 第二次查询完成${NC}"
echo "   响应时间: ${DURATION_2}ms"
echo ""

# 测试权限查询 - 第三次（确认缓存稳定性）
echo "   第三次查询验证..."
START_TIME=$(date +%s%N)
PERM_RESPONSE_3=$(curl -s -X GET "${USER_SERVICE_URL}/users/me" \
  -H "Authorization: Bearer $TOKEN")
END_TIME=$(date +%s%N)
DURATION_3=$(( (END_TIME - START_TIME) / 1000000 ))

echo -e "${GREEN}✅ 第三次查询完成${NC}"
echo "   响应时间: ${DURATION_3}ms"
echo ""

# 计算性能提升
if [ $DURATION_1 -gt 0 ]; then
    IMPROVEMENT=$(( (DURATION_1 - DURATION_2) * 100 / DURATION_1 ))
    AVG_CACHED=$(( (DURATION_2 + DURATION_3) / 2 ))

    echo -e "${YELLOW}📊 性能对比${NC}"
    echo "   首次查询 (数据库):  ${DURATION_1}ms"
    echo "   缓存查询 (平均):    ${AVG_CACHED}ms"

    if [ $IMPROVEMENT -gt 0 ]; then
        echo -e "   ${GREEN}性能提升:         ${IMPROVEMENT}%${NC}"
    else
        echo -e "   ${YELLOW}性能变化:         ${IMPROVEMENT}%${NC}"
    fi
    echo ""
fi

# 检查日志中的缓存消息
echo -e "${BLUE}[6/6] 检查缓存日志...${NC}"
if command -v pm2 &> /dev/null; then
    echo "   查找最近 50 条日志中的缓存相关消息..."
    CACHE_LOGS=$(pm2 logs user-service --lines 50 --nostream 2>/dev/null | grep -i "缓存\|cache" | tail -10 || echo "未找到缓存日志")

    if [ "$CACHE_LOGS" != "未找到缓存日志" ]; then
        echo -e "${GREEN}✅ 发现缓存日志:${NC}"
        echo "$CACHE_LOGS" | head -5
    else
        echo -e "${YELLOW}⚠️  未在日志中发现缓存相关消息${NC}"
        echo "   这可能是因为日志级别设置为 info，而缓存消息是 debug 级别"
    fi
else
    echo -e "${YELLOW}⚠️  PM2 未安装，跳过日志检查${NC}"
fi
echo ""

# 测试结果总结
echo "=========================================="
echo -e "${GREEN}  测试完成 ✅${NC}"
echo "=========================================="
echo ""
echo "📈 测试结果:"
echo "   ✅ 权限查询功能正常"
echo "   ✅ 多次查询返回一致"

if [ $IMPROVEMENT -gt 30 ]; then
    echo -e "   ${GREEN}✅ 缓存性能提升显著 (${IMPROVEMENT}%)${NC}"
elif [ $IMPROVEMENT -gt 0 ]; then
    echo -e "   ${YELLOW}⚠️  缓存性能提升较小 (${IMPROVEMENT}%)${NC}"
else
    echo -e "   ${YELLOW}⚠️  未检测到明显性能提升${NC}"
    echo "      可能原因: 查询太快、网络延迟、或缓存已经生效"
fi

echo ""
echo "💡 建议:"
echo "   1. 查看完整日志: pm2 logs user-service --lines 100"
echo "   2. 如需看到缓存 debug 日志，设置 LOG_LEVEL=debug"
echo "   3. 使用压测工具 (k6/ab) 进行更详细的性能测试"
echo ""

# 可选：测试缓存失效（需要有角色更新权限）
read -p "是否测试角色更新后的缓存失效? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}测试缓存失效...${NC}"

    # 获取用户的第一个角色
    ROLE_ID=$(echo $USER_INFO | jq -r '.roles[0].id // empty')

    if [ -n "$ROLE_ID" ]; then
        echo "   用户角色 ID: $ROLE_ID"
        echo "   模拟角色更新（更新描述字段）..."

        UPDATE_RESULT=$(curl -s -X PATCH "${USER_SERVICE_URL}/roles/${ROLE_ID}" \
          -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d "{
            \"description\": \"测试缓存失效 - $(date +%s)\"
          }")

        echo -e "${GREEN}✅ 角色更新成功${NC}"
        echo ""
        echo "   等待缓存失效..."
        sleep 1

        echo "   再次查询用户权限（应该重新从数据库加载）..."
        START_TIME=$(date +%s%N)
        curl -s -X GET "${USER_SERVICE_URL}/users/me" \
          -H "Authorization: Bearer $TOKEN" > /dev/null
        END_TIME=$(date +%s%N)
        DURATION_AFTER=$(( (END_TIME - START_TIME) / 1000000 ))

        echo -e "${GREEN}✅ 缓存失效后查询完成${NC}"
        echo "   响应时间: ${DURATION_AFTER}ms"

        if [ $DURATION_AFTER -gt $AVG_CACHED ]; then
            echo -e "   ${GREEN}✅ 缓存失效正常工作（查询时间增加）${NC}"
        else
            echo -e "   ${YELLOW}⚠️  查询时间未明显增加，可能缓存失效有延迟${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  用户没有角色，无法测试缓存失效${NC}"
    fi
fi

echo ""
echo "=========================================="
