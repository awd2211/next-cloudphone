#!/bin/bash

# ========================================
# 测试云厂商 SDK 集成
# ========================================
#
# 此脚本用于测试华为云和阿里云 SDK 的配置和连通性
#
# 使用方法:
#   ./scripts/test-cloud-providers.sh
#
# 前置条件:
#   1. 配置好 .env 文件中的云厂商凭证
#   2. device-service 正在运行
#

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置
DEVICE_SERVICE_URL="${DEVICE_SERVICE_URL:-http://localhost:30002}"

echo "=========================================="
echo "  云厂商 SDK 集成测试"
echo "=========================================="
echo ""

# 检查服务是否运行
echo -e "${YELLOW}1. 检查 device-service 健康状态...${NC}"
if curl -s -f "${DEVICE_SERVICE_URL}/health" > /dev/null; then
  echo -e "${GREEN}✓ device-service 运行正常${NC}"
else
  echo -e "${RED}✗ device-service 未运行，请先启动服务${NC}"
  echo "  启动命令: pm2 start ecosystem.config.js"
  exit 1
fi
echo ""

# 检查详细健康状态
echo -e "${YELLOW}2. 检查云厂商客户端配置...${NC}"
HEALTH_RESPONSE=$(curl -s "${DEVICE_SERVICE_URL}/health/detailed")

# 检查华为云配置
echo -e "${YELLOW}   华为云 (Huawei CPH):${NC}"
if echo "$HEALTH_RESPONSE" | grep -q '"huaweiClient"'; then
  HUAWEI_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.info.huaweiClient.status // "unknown"')
  HUAWEI_CONFIGURED=$(echo "$HEALTH_RESPONSE" | jq -r '.info.huaweiClient.configured // false')
  HUAWEI_REGION=$(echo "$HEALTH_RESPONSE" | jq -r '.info.huaweiClient.region // "N/A"')

  if [ "$HUAWEI_STATUS" = "up" ]; then
    echo -e "   ${GREEN}✓ 状态: $HUAWEI_STATUS${NC}"
    if [ "$HUAWEI_CONFIGURED" = "true" ]; then
      echo -e "   ${GREEN}✓ 已配置${NC}"
      echo -e "   ${GREEN}✓ 区域: $HUAWEI_REGION${NC}"
    else
      echo -e "   ${YELLOW}⚠ 未配置凭证 (检查 .env 文件)${NC}"
    fi
  else
    echo -e "   ${RED}✗ 状态: $HUAWEI_STATUS${NC}"
  fi
else
  echo -e "   ${YELLOW}⚠ 未找到华为云客户端信息${NC}"
fi
echo ""

# 检查阿里云配置
echo -e "${YELLOW}   阿里云 (Aliyun ECP):${NC}"
if echo "$HEALTH_RESPONSE" | grep -q '"aliyunClient"'; then
  ALIYUN_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.info.aliyunClient.status // "unknown"')
  ALIYUN_CONFIGURED=$(echo "$HEALTH_RESPONSE" | jq -r '.info.aliyunClient.configured // false')
  ALIYUN_REGION=$(echo "$HEALTH_RESPONSE" | jq -r '.info.aliyunClient.region // "N/A"')

  if [ "$ALIYUN_STATUS" = "up" ]; then
    echo -e "   ${GREEN}✓ 状态: $ALIYUN_STATUS${NC}"
    if [ "$ALIYUN_CONFIGURED" = "true" ]; then
      echo -e "   ${GREEN}✓ 已配置${NC}"
      echo -e "   ${GREEN}✓ 区域: $ALIYUN_REGION${NC}"
    else
      echo -e "   ${YELLOW}⚠ 未配置凭证 (检查 .env 文件)${NC}"
    fi
  else
    echo -e "   ${RED}✗ 状态: $ALIYUN_STATUS${NC}"
  fi
else
  echo -e "   ${YELLOW}⚠ 未找到阿里云客户端信息${NC}"
fi
echo ""

# 检查环境变量配置
echo -e "${YELLOW}3. 检查环境变量配置...${NC}"

# 检查 .env 文件
if [ -f .env ]; then
  echo -e "   ${GREEN}✓ .env 文件存在${NC}"

  # 检查华为云配置
  if grep -q "^HUAWEI_ACCESS_KEY_ID=" .env && [ -n "$(grep "^HUAWEI_ACCESS_KEY_ID=" .env | cut -d'=' -f2)" ]; then
    echo -e "   ${GREEN}✓ HUAWEI_ACCESS_KEY_ID 已配置${NC}"
  else
    echo -e "   ${YELLOW}⚠ HUAWEI_ACCESS_KEY_ID 未配置${NC}"
  fi

  if grep -q "^HUAWEI_SECRET_ACCESS_KEY=" .env && [ -n "$(grep "^HUAWEI_SECRET_ACCESS_KEY=" .env | cut -d'=' -f2)" ]; then
    echo -e "   ${GREEN}✓ HUAWEI_SECRET_ACCESS_KEY 已配置${NC}"
  else
    echo -e "   ${YELLOW}⚠ HUAWEI_SECRET_ACCESS_KEY 未配置${NC}"
  fi

  # 检查阿里云配置
  if grep -q "^ALIYUN_ACCESS_KEY_ID=" .env && [ -n "$(grep "^ALIYUN_ACCESS_KEY_ID=" .env | cut -d'=' -f2)" ]; then
    echo -e "   ${GREEN}✓ ALIYUN_ACCESS_KEY_ID 已配置${NC}"
  else
    echo -e "   ${YELLOW}⚠ ALIYUN_ACCESS_KEY_ID 未配置${NC}"
  fi

  if grep -q "^ALIYUN_ACCESS_KEY_SECRET=" .env && [ -n "$(grep "^ALIYUN_ACCESS_KEY_SECRET=" .env | cut -d'=' -f2)" ]; then
    echo -e "   ${GREEN}✓ ALIYUN_ACCESS_KEY_SECRET 已配置${NC}"
  else
    echo -e "   ${YELLOW}⚠ ALIYUN_ACCESS_KEY_SECRET 未配置${NC}"
  fi
else
  echo -e "   ${RED}✗ .env 文件不存在${NC}"
  echo -e "   ${YELLOW}提示: 复制 .env.example 为 .env 并填入真实凭证${NC}"
  echo -e "   ${YELLOW}命令: cp .env.example .env${NC}"
fi
echo ""

# 检查 SDK 依赖
echo -e "${YELLOW}4. 检查 SDK 依赖包...${NC}"

if [ -d "node_modules/@huaweicloud/huaweicloud-sdk-core" ]; then
  HUAWEI_SDK_VERSION=$(cat node_modules/@huaweicloud/huaweicloud-sdk-core/package.json | jq -r '.version')
  echo -e "   ${GREEN}✓ @huaweicloud/huaweicloud-sdk-core@${HUAWEI_SDK_VERSION}${NC}"
else
  echo -e "   ${RED}✗ @huaweicloud/huaweicloud-sdk-core 未安装${NC}"
fi

if [ -d "node_modules/@alicloud/pop-core" ]; then
  ALIYUN_SDK_VERSION=$(cat node_modules/@alicloud/pop-core/package.json | jq -r '.version')
  echo -e "   ${GREEN}✓ @alicloud/pop-core@${ALIYUN_SDK_VERSION}${NC}"
else
  echo -e "   ${RED}✗ @alicloud/pop-core 未安装${NC}"
fi
echo ""

# 总结
echo "=========================================="
echo -e "${GREEN}✓ 云厂商 SDK 集成检查完成${NC}"
echo "=========================================="
echo ""
echo "下一步:"
echo "  1. 配置云厂商凭证 (编辑 .env 文件)"
echo "  2. 重启 device-service (pm2 restart device-service)"
echo "  3. 通过 REST API 创建云手机实例"
echo ""
echo "创建华为云手机示例:"
echo '  curl -X POST http://localhost:30002/devices \'
echo '    -H "Content-Type: application/json" \'
echo '    -H "Authorization: Bearer <JWT>" \'
echo '    -d '\''{'
echo '      "userId": "user-123",'
echo '      "name": "My Huawei Phone",'
echo '      "providerType": "HUAWEI_CPH",'
echo '      "androidVersion": "11"'
echo '    }'\'''
echo ""
echo "创建阿里云手机示例:"
echo '  curl -X POST http://localhost:30002/devices \'
echo '    -H "Content-Type: application/json" \'
echo '    -H "Authorization: Bearer <JWT>" \'
echo '    -d '\''{'
echo '      "userId": "user-456",'
echo '      "name": "My Aliyun Phone",'
echo '      "providerType": "ALIYUN_ECP",'
echo '      "androidVersion": "11"'
echo '    }'\'''
echo ""
echo "详细文档:"
echo "  backend/device-service/CLOUD_PROVIDER_SDK_INTEGRATION.md"
echo ""
