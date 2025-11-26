#!/bin/bash
#
# 分布式追踪验证脚本
# 验证 OpenTelemetry + Jaeger 配置是否正确
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 服务端口映射
declare -A SERVICES=(
    ["api-gateway"]=30000
    ["user-service"]=30001
    ["device-service"]=30002
    ["app-service"]=30003
    ["billing-service"]=30005
    ["notification-service"]=30006
    ["proxy-service"]=30007
    ["sms-receive-service"]=30008
    ["livechat-service"]=30010
)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   分布式追踪验证 (OpenTelemetry + Jaeger)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. 检查 Jaeger 是否运行
echo -e "${YELLOW}[1/5] 检查 Jaeger 状态...${NC}"
JAEGER_ENDPOINT="${JAEGER_ENDPOINT:-http://localhost:4318}"
JAEGER_UI="${JAEGER_UI:-http://localhost:16686}"

if curl -s --connect-timeout 3 "$JAEGER_ENDPOINT/health" > /dev/null 2>&1 || curl -s --connect-timeout 3 "$JAEGER_ENDPOINT" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Jaeger Collector 运行中${NC} ($JAEGER_ENDPOINT)"
else
    echo -e "  ${RED}❌ Jaeger Collector 未运行${NC} ($JAEGER_ENDPOINT)"
    echo -e "  ${YELLOW}提示: 运行以下命令启动 Jaeger:${NC}"
    echo -e "  docker run -d --name jaeger -e COLLECTOR_OTLP_ENABLED=true -p 16686:16686 -p 4318:4318 jaegertracing/all-in-one:latest"
    echo ""
fi

if curl -s --connect-timeout 3 "$JAEGER_UI" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Jaeger UI 可访问${NC} ($JAEGER_UI)"
else
    echo -e "  ${YELLOW}⚠️ Jaeger UI 不可访问${NC} ($JAEGER_UI)"
fi
echo ""

# 2. 检查服务健康状态
echo -e "${YELLOW}[2/5] 检查服务健康状态...${NC}"
RUNNING_SERVICES=0
for service in "${!SERVICES[@]}"; do
    port=${SERVICES[$service]}
    if curl -s --connect-timeout 2 "http://localhost:$port/health" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ $service${NC} (Port $port) - 运行中"
        ((RUNNING_SERVICES++))
    else
        echo -e "  ${RED}❌ $service${NC} (Port $port) - 未运行"
    fi
done
echo -e "  ${BLUE}运行中的服务: $RUNNING_SERVICES/${#SERVICES[@]}${NC}"
echo ""

# 3. 检查 traceparent 响应头
echo -e "${YELLOW}[3/5] 检查 W3C Trace Context 支持...${NC}"

# 先获取 token
TOKEN=""
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:30000/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"superadmin","password":"U7LY6OLyc022@Cp#2024"}' 2>/dev/null || echo "")

if [ -n "$LOGIN_RESPONSE" ]; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "")
fi

if [ -n "$TOKEN" ]; then
    echo -e "  ${GREEN}✅ 获取认证 Token 成功${NC}"

    # 测试 traceparent 响应头
    HEADERS=$(curl -s -I -H "Authorization: Bearer $TOKEN" "http://localhost:30000/users/me" 2>/dev/null || echo "")

    if echo "$HEADERS" | grep -qi "x-trace-id"; then
        TRACE_ID=$(echo "$HEADERS" | grep -i "x-trace-id" | cut -d' ' -f2 | tr -d '\r')
        echo -e "  ${GREEN}✅ X-Trace-Id 响应头存在${NC}: $TRACE_ID"
    else
        echo -e "  ${RED}❌ X-Trace-Id 响应头缺失${NC}"
    fi

    if echo "$HEADERS" | grep -qi "x-span-id"; then
        SPAN_ID=$(echo "$HEADERS" | grep -i "x-span-id" | cut -d' ' -f2 | tr -d '\r')
        echo -e "  ${GREEN}✅ X-Span-Id 响应头存在${NC}: $SPAN_ID"
    else
        echo -e "  ${RED}❌ X-Span-Id 响应头缺失${NC}"
    fi

    if echo "$HEADERS" | grep -qi "traceparent"; then
        TRACEPARENT=$(echo "$HEADERS" | grep -i "traceparent" | cut -d' ' -f2 | tr -d '\r')
        echo -e "  ${GREEN}✅ traceparent 响应头存在${NC}: $TRACEPARENT"
    else
        echo -e "  ${YELLOW}⚠️ traceparent 响应头缺失${NC} (可能未传播)"
    fi
else
    echo -e "  ${YELLOW}⚠️ 无法获取 Token，跳过响应头检查${NC}"
fi
echo ""

# 4. 验证 trace context 传播
echo -e "${YELLOW}[4/5] 验证 Trace Context 传播...${NC}"

if [ -n "$TOKEN" ]; then
    # 生成一个测试 trace ID
    TEST_TRACE_ID="$(openssl rand -hex 16)"
    TEST_SPAN_ID="$(openssl rand -hex 8)"
    TRACEPARENT="00-${TEST_TRACE_ID}-${TEST_SPAN_ID}-01"

    echo -e "  ${BLUE}发送带 traceparent 的请求:${NC} $TRACEPARENT"

    RESPONSE_HEADERS=$(curl -s -I \
        -H "Authorization: Bearer $TOKEN" \
        -H "traceparent: $TRACEPARENT" \
        "http://localhost:30000/health" 2>/dev/null || echo "")

    RESPONSE_TRACE_ID=$(echo "$RESPONSE_HEADERS" | grep -i "x-trace-id" | cut -d' ' -f2 | tr -d '\r')

    if [ "$RESPONSE_TRACE_ID" = "$TEST_TRACE_ID" ]; then
        echo -e "  ${GREEN}✅ Trace ID 正确传播${NC}"
    else
        echo -e "  ${YELLOW}⚠️ Trace ID 可能未继承${NC} (响应: $RESPONSE_TRACE_ID)"
    fi
else
    echo -e "  ${YELLOW}⚠️ 跳过传播测试 (无 Token)${NC}"
fi
echo ""

# 5. 检查 shared 模块导出
echo -e "${YELLOW}[5/5] 检查 @cloudphone/shared 追踪导出...${NC}"

SHARED_INDEX="/home/eric/next-cloudphone/backend/shared/src/index.ts"

if [ -f "$SHARED_INDEX" ]; then
    EXPORTS=(
        "initTracing"
        "shutdownTracing"
        "getTracingSDK"
        "extractTraceContext"
        "createConsumerSpan"
        "withTracing"
        "runInTraceContext"
        "getTraceIdFromMessage"
        "getCurrentTraceContext"
        "createChildSpan"
        "endSpan"
        "RequestTracingMiddleware"
    )

    MISSING=0
    for export in "${EXPORTS[@]}"; do
        if grep -q "$export" "$SHARED_INDEX"; then
            echo -e "  ${GREEN}✅ $export${NC}"
        else
            echo -e "  ${RED}❌ $export (缺失)${NC}"
            ((MISSING++))
        fi
    done

    if [ $MISSING -eq 0 ]; then
        echo -e "  ${GREEN}所有追踪工具已导出${NC}"
    else
        echo -e "  ${YELLOW}$MISSING 个导出缺失${NC}"
    fi
else
    echo -e "  ${RED}❌ shared/src/index.ts 文件不存在${NC}"
fi
echo ""

# 总结
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}                 总结                   ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "  ${YELLOW}Jaeger UI:${NC} $JAEGER_UI"
echo -e "  ${YELLOW}运行服务:${NC} $RUNNING_SERVICES/${#SERVICES[@]}"
echo ""
echo -e "  ${BLUE}下一步:${NC}"
echo -e "  1. 确保 Jaeger 正在运行"
echo -e "  2. 发送一些 API 请求"
echo -e "  3. 在 Jaeger UI 中查看 traces"
echo ""
echo -e "  ${BLUE}文档:${NC} docs/DISTRIBUTED_TRACING.md"
echo ""
