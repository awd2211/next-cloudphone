#!/bin/bash

#######################################################
# 多设备提供商支持验证脚本
# 用途：验证 Week 1-2 完成的核心功能
#######################################################

set -e

echo "========================================"
echo "  多设备提供商支持验证"
echo "========================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 计数器
PASSED=0
FAILED=0

# 测试函数
test_passed() {
    echo -e "${GREEN}✓ PASSED${NC}: $1"
    ((PASSED++))
}

test_failed() {
    echo -e "${RED}✗ FAILED${NC}: $1"
    ((FAILED++))
}

test_info() {
    echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

echo "1. 验证 Shared Module Provider 类型定义"
echo "----------------------------------------"

if [ -f "backend/shared/src/types/provider.types.ts" ]; then
    if grep -q "DeviceProviderType" backend/shared/src/types/provider.types.ts; then
        test_passed "provider.types.ts 包含 DeviceProviderType"
    else
        test_failed "provider.types.ts 缺少 DeviceProviderType"
    fi

    if grep -q "ProviderDisplayNamesCN" backend/shared/src/types/provider.types.ts; then
        test_passed "provider.types.ts 包含中文显示名称映射"
    else
        test_failed "provider.types.ts 缺少 ProviderDisplayNamesCN"
    fi
else
    test_failed "provider.types.ts 文件不存在"
fi

echo ""
echo "2. 验证 Shared Module 设备事件更新"
echo "----------------------------------------"

if [ -f "backend/shared/src/events/schemas/device.events.ts" ]; then
    if grep -q "providerType: DeviceProviderType" backend/shared/src/events/schemas/device.events.ts; then
        test_passed "device.events.ts 包含 providerType 字段"
    else
        test_failed "device.events.ts 缺少 providerType 字段"
    fi

    if grep -q "BaseDeviceEvent" backend/shared/src/events/schemas/device.events.ts; then
        test_passed "device.events.ts 包含 BaseDeviceEvent 接口"
    else
        test_failed "device.events.ts 缺少 BaseDeviceEvent 接口"
    fi
else
    test_failed "device.events.ts 文件不存在"
fi

echo ""
echo "3. 验证 Billing Service 数据库迁移"
echo "----------------------------------------"

MIGRATION_FILE="backend/billing-service/migrations/20251029_add_provider_fields_to_usage_records.sql"
if [ -f "$MIGRATION_FILE" ]; then
    test_passed "数据库迁移文件存在"

    if grep -q "provider_type" "$MIGRATION_FILE"; then
        test_passed "迁移包含 provider_type 字段"
    else
        test_failed "迁移缺少 provider_type 字段"
    fi

    if grep -q "device_config JSONB" "$MIGRATION_FILE"; then
        test_passed "迁移包含 device_config JSONB 字段"
    else
        test_failed "迁移缺少 device_config 字段"
    fi

    if grep -q "billing_rate" "$MIGRATION_FILE"; then
        test_passed "迁移包含 billing_rate 字段"
    else
        test_failed "迁移缺少 billing_rate 字段"
    fi
else
    test_failed "数据库迁移文件不存在"
fi

echo ""
echo "4. 验证 Billing Service 实体更新"
echo "----------------------------------------"

ENTITY_FILE="backend/billing-service/src/billing/entities/usage-record.entity.ts"
if [ -f "$ENTITY_FILE" ]; then
    if grep -q "providerType: DeviceProviderType" "$ENTITY_FILE"; then
        test_passed "UsageRecord 实体包含 providerType"
    else
        test_failed "UsageRecord 实体缺少 providerType"
    fi

    if grep -q "deviceConfig: DeviceConfigSnapshot" "$ENTITY_FILE"; then
        test_passed "UsageRecord 实体包含 deviceConfig"
    else
        test_failed "UsageRecord 实体缺少 deviceConfig"
    fi

    if grep -q "pricingTier: PricingTier" "$ENTITY_FILE"; then
        test_passed "UsageRecord 实体包含 pricingTier"
    else
        test_failed "UsageRecord 实体缺少 pricingTier"
    fi
else
    test_failed "UsageRecord 实体文件不存在"
fi

echo ""
echo "5. 验证 Billing Service 计费引擎"
echo "----------------------------------------"

PRICING_ENGINE="backend/billing-service/src/billing/pricing-engine.service.ts"
if [ -f "$PRICING_ENGINE" ]; then
    test_passed "PricingEngineService 文件存在"

    if grep -q "pricingMatrix.*DeviceProviderType" "$PRICING_ENGINE"; then
        test_passed "PricingEngine 包含定价矩阵"
    else
        test_failed "PricingEngine 缺少定价矩阵"
    fi

    if grep -q "calculateCost" "$PRICING_ENGINE"; then
        test_passed "PricingEngine 包含 calculateCost 方法"
    else
        test_failed "PricingEngine 缺少 calculateCost 方法"
    fi

    # 检查4种Provider
    for provider in "REDROID" "PHYSICAL" "HUAWEI_CPH" "ALIYUN_ECP"; do
        if grep -q "DeviceProviderType.$provider" "$PRICING_ENGINE"; then
            test_passed "PricingEngine 支持 $provider"
        else
            test_failed "PricingEngine 不支持 $provider"
        fi
    done
else
    test_failed "PricingEngineService 文件不存在"
fi

echo ""
echo "6. 验证 Billing Service 单元测试"
echo "----------------------------------------"

PRICING_TEST="backend/billing-service/src/billing/pricing-engine.service.spec.ts"
if [ -f "$PRICING_TEST" ]; then
    test_passed "PricingEngine 测试文件存在"

    TEST_COUNT=$(grep -c "it('.*'," "$PRICING_TEST" || echo "0")
    test_info "测试用例数量: $TEST_COUNT"

    if [ "$TEST_COUNT" -ge 15 ]; then
        test_passed "测试用例充足 ($TEST_COUNT >= 15)"
    else
        test_failed "测试用例不足 ($TEST_COUNT < 15)"
    fi
else
    test_failed "PricingEngine 测试文件不存在"
fi

echo ""
echo "7. 验证 Notification Service 事件类型"
echo "----------------------------------------"

NOTIF_EVENTS="backend/notification-service/src/types/events.ts"
if [ -f "$NOTIF_EVENTS" ]; then
    if grep -q "from '@cloudphone/shared'" "$NOTIF_EVENTS"; then
        test_passed "Notification Service 从 Shared 导入事件"
    else
        test_failed "Notification Service 未从 Shared 导入事件"
    fi

    if grep -q "ProviderDisplayNamesCN" "$NOTIF_EVENTS"; then
        test_passed "Notification Service 导入中文显示名称"
    else
        test_failed "Notification Service 未导入中文显示名称"
    fi
else
    test_failed "Notification Service 事件类型文件不存在"
fi

echo ""
echo "8. 验证 Notification Service 消费者更新"
echo "----------------------------------------"

NOTIF_CONSUMER="backend/notification-service/src/rabbitmq/consumers/device-events.consumer.ts"
if [ -f "$NOTIF_CONSUMER" ]; then
    test_passed "device-events.consumer.ts 文件存在"

    if grep -q "getProviderDisplayName" "$NOTIF_CONSUMER"; then
        test_passed "消费者包含 getProviderDisplayName 方法"
    else
        test_failed "消费者缺少 getProviderDisplayName 方法"
    fi

    if grep -q "providerDisplayName" "$NOTIF_CONSUMER"; then
        test_passed "消费者使用 providerDisplayName 变量"
    else
        test_failed "消费者未使用 providerDisplayName"
    fi

    # 检查是否使用 event.deviceName 而不是 event.payload.deviceName
    if grep -q "event\.deviceName" "$NOTIF_CONSUMER"; then
        test_passed "消费者使用正确的事件结构 (event.deviceName)"
    else
        test_failed "消费者使用错误的事件结构"
    fi
else
    test_failed "device-events.consumer.ts 文件不存在"
fi

echo ""
echo "9. 验证 Notification Service 模板 SQL"
echo "----------------------------------------"

TEMPLATE_SQL="backend/notification-service/update-device-templates-with-provider.sql"
if [ -f "$TEMPLATE_SQL" ]; then
    test_passed "通知模板更新 SQL 文件存在"

    if grep -q "providerDisplayName" "$TEMPLATE_SQL"; then
        test_passed "模板 SQL 包含 providerDisplayName 变量"
    else
        test_failed "模板 SQL 缺少 providerDisplayName 变量"
    fi

    # 检查更新的模板数量
    TEMPLATE_COUNT=$(grep -c "device\." "$TEMPLATE_SQL" || echo "0")
    test_info "更新的设备模板数量: $TEMPLATE_COUNT"
else
    test_failed "通知模板更新 SQL 文件不存在"
fi

echo ""
echo "10. 验证 TypeScript 编译"
echo "----------------------------------------"

test_info "编译 Shared Module..."
cd backend/shared
if pnpm build > /dev/null 2>&1; then
    test_passed "Shared Module 编译成功"
else
    test_failed "Shared Module 编译失败"
fi
cd ../..

test_info "编译 Billing Service..."
cd backend/billing-service
if pnpm build > /dev/null 2>&1; then
    test_passed "Billing Service 编译成功"
else
    test_failed "Billing Service 编译失败"
fi
cd ../..

test_info "编译 Notification Service..."
cd backend/notification-service
if pnpm build > /dev/null 2>&1; then
    test_passed "Notification Service 编译成功"
else
    test_failed "Notification Service 编译失败"
fi
cd ../..

echo ""
echo "11. 运行单元测试"
echo "----------------------------------------"

test_info "运行 Pricing Engine 测试..."
cd backend/billing-service
if pnpm test src/billing/pricing-engine.service.spec.ts > /dev/null 2>&1; then
    test_passed "Pricing Engine 测试通过"
else
    test_failed "Pricing Engine 测试失败"
fi
cd ../..

echo ""
echo "========================================"
echo "  验证结果汇总"
echo "========================================"
echo ""
echo -e "${GREEN}通过: $PASSED${NC}"
echo -e "${RED}失败: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 所有验证通过！多设备提供商支持已就绪。${NC}"
    exit 0
else
    echo -e "${RED}✗ 发现 $FAILED 个问题，请检查上述失败项。${NC}"
    exit 1
fi
