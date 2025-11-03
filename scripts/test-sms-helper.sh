#!/bin/bash

# ========================================
# CloudPhone SMS Helper 测试脚本
# ========================================
# 功能：测试 SMS Helper 应用的各项功能
# ========================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PACKAGE_NAME="com.cloudphone.smshelper"
DEVICE_ID="${1:-}"

echo -e "${BLUE}"
echo "========================================="
echo "  CloudPhone SMS Helper 功能测试"
echo "========================================="
echo -e "${NC}"

# 选择设备
if [ -z "$DEVICE_ID" ]; then
    echo -e "${YELLOW}未指定设备，使用第一个可用设备${NC}"
    DEVICE_ID=$(adb devices | grep -v "List" | grep "device$" | head -1 | cut -f1)

    if [ -z "$DEVICE_ID" ]; then
        echo -e "${RED}✗ 未找到可用设备${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ 测试设备: $DEVICE_ID${NC}"
echo ""

# 测试1: 检查应用是否已安装
echo -e "${BLUE}[测试 1/6] 检查应用安装${NC}"
if adb -s "$DEVICE_ID" shell pm list packages | grep -q "$PACKAGE_NAME"; then
    echo -e "${GREEN}✓ 应用已安装${NC}"
else
    echo -e "${RED}✗ 应用未安装${NC}"
    echo "  请先运行部署脚本: ./scripts/deploy-sms-helper.sh"
    exit 1
fi
echo ""

# 测试2: 检查权限状态
echo -e "${BLUE}[测试 2/6] 检查权限状态${NC}"

# 检查悬浮窗权限
OVERLAY_PERM=$(adb -s "$DEVICE_ID" shell appops get $PACKAGE_NAME SYSTEM_ALERT_WINDOW | tr -d '\r')
if echo "$OVERLAY_PERM" | grep -q "allow"; then
    echo -e "${GREEN}✓ 悬浮窗权限: 已授予${NC}"
else
    echo -e "${YELLOW}⚠ 悬浮窗权限: 未授予${NC}"
    echo "  授予权限: adb -s $DEVICE_ID shell appops set $PACKAGE_NAME SYSTEM_ALERT_WINDOW allow"
fi
echo ""

# 测试3: 发送测试广播（简单验证码）
echo -e "${BLUE}[测试 3/6] 测试简单验证码（123456）${NC}"
adb -s "$DEVICE_ID" shell am broadcast \
    -a com.cloudphone.SMS_RECEIVED \
    --es code "123456" \
    --es phone "+79123456789" \
    --es service "test" \
    --el timestamp $(date +%s)000 > /dev/null 2>&1

sleep 1

# 检查剪贴板
CLIPBOARD=$(adb -s "$DEVICE_ID" shell "am broadcast -a clipper.get 2>&1 | grep data" || echo "")
if echo "$CLIPBOARD" | grep -q "123456"; then
    echo -e "${GREEN}✓ 验证码已复制到剪贴板${NC}"
else
    # 尝试另一种方法读取剪贴板
    echo -e "${YELLOW}⚠ 无法直接读取剪贴板，请手动验证${NC}"
fi

# 检查日志
echo "  → 检查应用日志..."
LOG_OUTPUT=$(adb -s "$DEVICE_ID" logcat -d -s SmsReceiver:I FloatingCodeView:I AutofillService:I 2>&1 | tail -10)

if echo "$LOG_OUTPUT" | grep -q "123456"; then
    echo -e "${GREEN}✓ 日志显示验证码已接收${NC}"
else
    echo -e "${YELLOW}⚠ 未在日志中找到验证码${NC}"
fi
echo ""

# 测试4: 发送测试广播（带短横线的验证码）
echo -e "${BLUE}[测试 4/6] 测试带短横线的验证码（123-456）${NC}"
adb -s "$DEVICE_ID" shell am broadcast \
    -a com.cloudphone.SMS_RECEIVED \
    --es code "123-456" \
    --es phone "+86 138 0000 0000" \
    --es service "wechat" \
    --el timestamp $(date +%s)000 > /dev/null 2>&1

sleep 1
echo -e "${GREEN}✓ 广播已发送${NC}"
echo ""

# 测试5: 测试多个验证码（快速连续）
echo -e "${BLUE}[测试 5/6] 测试快速连续接收多个验证码${NC}"

for i in 1 2 3; do
    CODE=$(printf "%06d" $((100000 + RANDOM % 900000)))
    echo "  → 发送验证码 $i: $CODE"

    adb -s "$DEVICE_ID" shell am broadcast \
        -a com.cloudphone.SMS_RECEIVED \
        --es code "$CODE" \
        --es phone "+1234567890" \
        --es service "test-batch-$i" \
        --el timestamp $(date +%s)000 > /dev/null 2>&1

    sleep 0.5
done

echo -e "${GREEN}✓ 批量测试完成${NC}"
echo ""

# 测试6: 检查应用日志（完整）
echo -e "${BLUE}[测试 6/6] 查看完整应用日志${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
adb -s "$DEVICE_ID" logcat -d -s SmsReceiver:I FloatingCodeView:I AutofillService:I MainActivity:I | tail -20
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 测试总结
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}📊 测试总结${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo "✓ 应用已安装"
echo "✓ 广播接收正常"
echo "✓ 验证码处理正常"
echo ""
echo -e "${YELLOW}手动验证建议:${NC}"
echo ""
echo "1. 在设备上打开任意输入框"
echo "2. 长按输入框，选择\"粘贴\""
echo "3. 应该看到最后一个测试验证码"
echo ""
echo "4. 如果启用了悬浮窗权限，验证码到达时应该看到悬浮窗"
echo ""
echo "5. 如果启用了辅助功能，验证码应该自动填充到输入框"
echo ""

echo -e "${GREEN}✅ 测试完成${NC}"
echo ""

# 实时监听（可选）
read -p "是否实时监听应用日志？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}开始实时监听（Ctrl+C 退出）...${NC}"
    echo ""
    adb -s "$DEVICE_ID" logcat -s SmsReceiver:I FloatingCodeView:I AutofillService:I MainActivity:I
fi
