#!/bin/bash

# 全面检查所有微服务的依赖注入问题

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  全面检查所有微服务依赖注入问题${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

SERVICES=(
  "api-gateway"
  "user-service"
  "device-service"
  "app-service"
  "billing-service"
)

TOTAL_ISSUES=0

for SERVICE in "${SERVICES[@]}"; do
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}📦 检查服务: $SERVICE${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  SERVICE_PATH="backend/$SERVICE/src"
  SERVICE_ISSUES=0

  if [ ! -d "$SERVICE_PATH" ]; then
    echo -e "${YELLOW}⚠️  服务目录不存在: $SERVICE_PATH${NC}"
    echo ""
    continue
  fi

  # 1. 检查 ConfigModule 配置
  echo -e "${CYAN}[1] 检查 ConfigModule 配置${NC}"
  APP_MODULE="$SERVICE_PATH/app.module.ts"
  if [ -f "$APP_MODULE" ]; then
    if grep -q "isGlobal: true" "$APP_MODULE"; then
      echo -e "${GREEN}✅ ConfigModule 已配置为全局模块${NC}"
    else
      echo -e "${RED}❌ ConfigModule 未配置为全局模块${NC}"
      SERVICE_ISSUES=$((SERVICE_ISSUES + 1))
    fi
  fi
  echo ""

  # 2. 检查构造函数可选参数
  echo -e "${CYAN}[2] 检查构造函数可选参数${NC}"
  OPTIONAL_CONSTRUCTORS=$(grep -rn "constructor.*?:" "$SERVICE_PATH" --include="*.ts" | grep -v node_modules | grep -v ".spec.ts" || true)
  if [ -n "$OPTIONAL_CONSTRUCTORS" ]; then
    echo -e "${YELLOW}⚠️  发现可选参数构造函数：${NC}"
    echo "$OPTIONAL_CONSTRUCTORS" | head -5
    ISSUE_COUNT=$(echo "$OPTIONAL_CONSTRUCTORS" | wc -l)
    echo -e "${YELLOW}   共 $ISSUE_COUNT 个${NC}"
    SERVICE_ISSUES=$((SERVICE_ISSUES + ISSUE_COUNT))
  else
    echo -e "${GREEN}✅ 未发现可选参数问题${NC}"
  fi
  echo ""

  # 3. 检查 @Injectable() 装饰器
  echo -e "${CYAN}[3] 检查 Service 的 @Injectable() 装饰器${NC}"
  MISSING_INJECTABLE=0
  SERVICE_FILES=$(find "$SERVICE_PATH" -name "*.service.ts" ! -name "*.spec.ts" 2>/dev/null || true)
  if [ -n "$SERVICE_FILES" ]; then
    for file in $SERVICE_FILES; do
      if ! grep -q "@Injectable()" "$file"; then
        echo -e "${RED}❌ $file 缺少 @Injectable()${NC}"
        MISSING_INJECTABLE=$((MISSING_INJECTABLE + 1))
      fi
    done
  fi

  if [ $MISSING_INJECTABLE -eq 0 ]; then
    echo -e "${GREEN}✅ 所有 Service 都有 @Injectable() 装饰器${NC}"
  else
    SERVICE_ISSUES=$((SERVICE_ISSUES + MISSING_INJECTABLE))
  fi
  echo ""

  # 4. 检查 Partial 类型构造函数
  echo -e "${CYAN}[4] 检查 Partial 类型构造函数${NC}"
  PARTIAL_CONSTRUCTORS=$(grep -rn "constructor.*Partial" "$SERVICE_PATH" --include="*.ts" | grep -v node_modules || true)
  if [ -n "$PARTIAL_CONSTRUCTORS" ]; then
    echo -e "${YELLOW}⚠️  发现 Partial 类型构造函数：${NC}"
    echo "$PARTIAL_CONSTRUCTORS"
    SERVICE_ISSUES=$((SERVICE_ISSUES + 1))
  else
    echo -e "${GREEN}✅ 未发现 Partial 类型问题${NC}"
  fi
  echo ""

  # 5. 统计 Service 数量
  SERVICE_COUNT=$(find "$SERVICE_PATH" -name "*.service.ts" ! -name "*.spec.ts" 2>/dev/null | wc -l)
  MODULE_COUNT=$(find "$SERVICE_PATH" -name "*.module.ts" ! -name "*.spec.ts" 2>/dev/null | wc -l)

  echo -e "${CYAN}[统计]${NC}"
  echo -e "  Service 文件: $SERVICE_COUNT"
  echo -e "  Module 文件: $MODULE_COUNT"

  if [ $SERVICE_ISSUES -eq 0 ]; then
    echo -e "  状态: ${GREEN}✅ 无问题${NC}"
  else
    echo -e "  状态: ${YELLOW}⚠️  发现 $SERVICE_ISSUES 个问题${NC}"
    TOTAL_ISSUES=$((TOTAL_ISSUES + SERVICE_ISSUES))
  fi

  echo ""
done

# 总结
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  总结${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

if [ $TOTAL_ISSUES -eq 0 ]; then
  echo -e "${GREEN}✅ 所有服务检查通过，未发现依赖注入问题！${NC}"
  echo ""
  echo "建议："
  echo "  1. 定期运行此脚本检查"
  echo "  2. 在 CI/CD 中集成此检查"
  echo "  3. 查看最佳实践: docs/NESTJS_DI_BEST_PRACTICES.md"
else
  echo -e "${YELLOW}⚠️  共发现 $TOTAL_ISSUES 个潜在问题${NC}"
  echo ""
  echo "后续步骤："
  echo "  1. 查看上述问题详情"
  echo "  2. 参考最佳实践文档修复"
  echo "  3. 重新运行此脚本验证"
  echo ""
  echo "文档: docs/NESTJS_DI_BEST_PRACTICES.md"
fi

echo ""
echo -e "${CYAN}================================================${NC}"

exit 0
