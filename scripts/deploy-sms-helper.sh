#!/bin/bash

# ========================================
# CloudPhone SMS Helper 批量部署脚本
# ========================================
# 功能：
# 1. 批量安装 APK 到所有云手机设备
# 2. 自动授予悬浮窗权限
# 3. 启动应用引导用户开启辅助功能
# ========================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
APK_PATH="${1:-/home/eric/next-cloudphone/android/cloudphone-sms-helper/app/build/outputs/apk/debug/app-debug.apk}"
PACKAGE_NAME="com.cloudphone.smshelper"
DEVICE_SERVICE_URL="${DEVICE_SERVICE_URL:-http://localhost:30002}"
TOKEN="${JWT_TOKEN:-}"

# Banner
echo -e "${BLUE}"
echo "========================================="
echo "  CloudPhone SMS Helper 批量部署工具"
echo "========================================="
echo -e "${NC}"

# 检查 APK 是否存在
if [ ! -f "$APK_PATH" ]; then
    echo -e "${RED}✗ APK 文件不存在: $APK_PATH${NC}"
    echo ""
    echo "请先构建 APK:"
    echo "  cd /home/eric/next-cloudphone/android/cloudphone-sms-helper"
    echo "  ./gradlew assembleDebug"
    exit 1
fi

echo -e "${GREEN}✓ 找到 APK: $APK_PATH${NC}"
APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
echo -e "  大小: ${APK_SIZE}"
echo ""

# 检查 JWT Token
if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}⚠ 未提供 JWT Token，将使用 ADB 直接部署${NC}"
    echo -e "  如需通过 API 部署，请设置环境变量: ${BLUE}export JWT_TOKEN=your_token${NC}"
    echo ""
    USE_API=false
else
    echo -e "${GREEN}✓ 使用 API 部署模式${NC}"
    USE_API=true
fi

# 获取设备列表
echo -e "${BLUE}📱 获取设备列表...${NC}"

if [ "$USE_API" = true ]; then
    # 通过 API 获取设备列表
    DEVICES=$(curl -s -H "Authorization: Bearer $TOKEN" "$DEVICE_SERVICE_URL/devices" | jq -r '.data[].id // .[] | select(type=="object") | .id // .')

    if [ -z "$DEVICES" ]; then
        echo -e "${RED}✗ 无法获取设备列表${NC}"
        echo "  请检查 Device Service 是否运行: $DEVICE_SERVICE_URL"
        exit 1
    fi
else
    # 通过 ADB 获取设备列表
    DEVICES=$(adb devices | grep -v "List" | grep "device$" | cut -f1)

    if [ -z "$DEVICES" ]; then
        echo -e "${RED}✗ 未找到连接的设备${NC}"
        echo "  请确保设备已通过 ADB 连接"
        exit 1
    fi
fi

DEVICE_COUNT=$(echo "$DEVICES" | wc -l)
echo -e "${GREEN}✓ 找到 $DEVICE_COUNT 个设备${NC}"
echo ""

# 部署统计
SUCCESS_COUNT=0
FAILED_COUNT=0
FAILED_DEVICES=""

# 开始部署
echo -e "${BLUE}🚀 开始批量部署...${NC}"
echo ""

for device_id in $DEVICES; do
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "📱 设备: ${YELLOW}$device_id${NC}"
    echo ""

    if [ "$USE_API" = true ]; then
        # 通过 API 部署
        echo "  → 通过 API 安装 APK..."

        UPLOAD_RESPONSE=$(curl -s -X POST "$DEVICE_SERVICE_URL/devices/$device_id/install-app" \
            -H "Authorization: Bearer $TOKEN" \
            -F "apk=@$APK_PATH" 2>&1)

        if echo "$UPLOAD_RESPONSE" | grep -q "success\|installed"; then
            echo -e "  ${GREEN}✓ 安装成功${NC}"
            ((SUCCESS_COUNT++))
        else
            echo -e "  ${RED}✗ 安装失败${NC}"
            echo "    错误: $UPLOAD_RESPONSE"
            ((FAILED_COUNT++))
            FAILED_DEVICES="$FAILED_DEVICES\n  - $device_id"
            continue
        fi
    else
        # 通过 ADB 部署
        echo "  → 通过 ADB 安装 APK..."

        if adb -s "$device_id" install -r "$APK_PATH" 2>&1 | grep -q "Success"; then
            echo -e "  ${GREEN}✓ 安装成功${NC}"
        else
            echo -e "  ${RED}✗ 安装失败${NC}"
            ((FAILED_COUNT++))
            FAILED_DEVICES="$FAILED_DEVICES\n  - $device_id"
            continue
        fi

        # 授予悬浮窗权限
        echo "  → 授予悬浮窗权限..."
        adb -s "$device_id" shell appops set $PACKAGE_NAME SYSTEM_ALERT_WINDOW allow 2>&1 > /dev/null
        echo -e "  ${GREEN}✓ 权限已授予${NC}"

        # 启动应用
        echo "  → 启动应用..."
        adb -s "$device_id" shell am start -n $PACKAGE_NAME/.MainActivity 2>&1 > /dev/null
        echo -e "  ${GREEN}✓ 应用已启动${NC}"

        ((SUCCESS_COUNT++))
    fi

    echo ""
done

# 部署总结
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}📊 部署完成${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "总设备数: ${BLUE}$DEVICE_COUNT${NC}"
echo -e "成功: ${GREEN}$SUCCESS_COUNT${NC}"
echo -e "失败: ${RED}$FAILED_COUNT${NC}"
echo ""

if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${RED}失败的设备:${NC}"
    echo -e "$FAILED_DEVICES"
    echo ""
fi

# 使用说明
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ 后续操作${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. 应用已自动启动，建议用户："
echo "   • 点击\"开启辅助功能\"按钮"
echo "   • 在系统设置中启用辅助功能服务"
echo ""
echo "2. 测试验证码接收："
echo "   • 在应用中点击\"测试验证码接收\"按钮"
echo "   • 或发送测试广播："
echo "     adb shell am broadcast -a com.cloudphone.SMS_RECEIVED --es code \"123456\" --es phone \"+79123456789\" --es service \"test\""
echo ""
echo "3. 验证功能："
echo "   • 验证码会自动复制到剪贴板"
echo "   • 如果授权悬浮窗，会显示悬浮窗"
echo "   • 如果启用辅助功能，会自动填充"
echo ""

echo -e "${GREEN}✅ 部署流程结束${NC}"
echo ""
