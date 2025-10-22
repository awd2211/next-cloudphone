#!/bin/bash

# NestJS 依赖注入问题扫描脚本
# 用于检测常见的依赖注入问题

set -e

echo "🔍 NestJS 依赖注入问题扫描"
echo "===================================="
echo ""

# 颜色定义
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 计数器
ISSUES_FOUND=0

# 扫描目录
SCAN_DIRS="backend/user-service/src backend/device-service/src backend/app-service/src backend/billing-service/src backend/api-gateway/src"

echo "📂 扫描目录："
echo "$SCAN_DIRS"
echo ""

# ==========================================
# 1. 检查构造函数中的可选参数
# ==========================================
echo -e "${BLUE}[1] 检查构造函数中的可选参数...${NC}"
echo "----------------------------------------"

OPTIONAL_PARAMS=$(grep -rn "constructor.*?:" $SCAN_DIRS 2>/dev/null | grep -v node_modules || true)

if [ -n "$OPTIONAL_PARAMS" ]; then
  echo -e "${YELLOW}⚠️  发现构造函数可选参数（可能导致依赖注入问题）：${NC}"
  echo "$OPTIONAL_PARAMS" | while IFS= read -r line; do
    echo "  $line"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  done
  echo ""
  echo -e "${YELLOW}💡 建议：使用 @Optional() 装饰器或 ConfigService${NC}"
else
  echo -e "${GREEN}✅ 未发现构造函数可选参数问题${NC}"
fi
echo ""

# ==========================================
# 2. 检查缺少 @Injectable() 的服务
# ==========================================
echo -e "${BLUE}[2] 检查缺少 @Injectable() 的 Service 类...${NC}"
echo "----------------------------------------"

# 查找 .service.ts 文件
SERVICE_FILES=$(find $SCAN_DIRS -name "*.service.ts" 2>/dev/null || true)

if [ -n "$SERVICE_FILES" ]; then
  for file in $SERVICE_FILES; do
    # 检查文件中是否有 @Injectable()
    if ! grep -q "@Injectable()" "$file"; then
      echo -e "${RED}❌ $file 缺少 @Injectable() 装饰器${NC}"
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
  done
fi

if [ $ISSUES_FOUND -eq 0 ]; then
  echo -e "${GREEN}✅ 所有 Service 都有 @Injectable() 装饰器${NC}"
fi
echo ""

# ==========================================
# 3. 检查 Module 中缺少的 imports
# ==========================================
echo -e "${BLUE}[3] 检查可能缺少的模块导入...${NC}"
echo "----------------------------------------"

# 查找使用 ConfigService 但可能未导入 ConfigModule 的文件
CONFIG_USAGE=$(grep -rn "ConfigService" $SCAN_DIRS --include="*.service.ts" 2>/dev/null || true)

if [ -n "$CONFIG_USAGE" ]; then
  echo -e "${YELLOW}ℹ️  以下文件使用了 ConfigService，请确保对应的 Module 导入了 ConfigModule：${NC}"
  echo "$CONFIG_USAGE" | cut -d: -f1 | sort | uniq | while IFS= read -r file; do
    MODULE_FILE=$(echo "$file" | sed 's/\.service\.ts$/.module.ts/')
    if [ -f "$MODULE_FILE" ]; then
      if ! grep -q "ConfigModule" "$MODULE_FILE"; then
        echo -e "  ${YELLOW}⚠️  $MODULE_FILE 可能缺少 ConfigModule 导入${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
      fi
    fi
  done
else
  echo -e "${GREEN}✅ 未发现 ConfigService 使用问题${NC}"
fi
echo ""

# ==========================================
# 4. 检查接口类型的依赖注入
# ==========================================
echo -e "${BLUE}[4] 检查接口类型的依赖注入...${NC}"
echo "----------------------------------------"

# 查找构造函数参数中使用接口的情况
INTERFACE_DI=$(grep -rn "constructor(" $SCAN_DIRS --include="*.ts" -A 3 2>/dev/null | \
  grep -E ":\s*I[A-Z][a-zA-Z]*" | \
  grep -v "@Inject" || true)

if [ -n "$INTERFACE_DI" ]; then
  echo -e "${YELLOW}⚠️  发现可能使用接口类型的依赖注入（需要 @Inject() Token）：${NC}"
  echo "$INTERFACE_DI" | while IFS= read -r line; do
    echo "  $line"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  done
  echo ""
  echo -e "${YELLOW}💡 建议：使用 @Inject(TOKEN) 或改用抽象类${NC}"
else
  echo -e "${GREEN}✅ 未发现接口类型依赖注入问题${NC}"
fi
echo ""

# ==========================================
# 5. 检查循环依赖
# ==========================================
echo -e "${BLUE}[5] 检查潜在的循环依赖...${NC}"
echo "----------------------------------------"

# 这个检查比较复杂，这里只做简单提示
echo -e "${YELLOW}ℹ️  请在启动日志中注意以下警告：${NC}"
echo "  - Circular dependency between..."
echo "  - 如发现循环依赖，使用 forwardRef() 解决"
echo ""

# ==========================================
# 总结
# ==========================================
echo ""
echo "===================================="
echo "📊 扫描结果总结"
echo "===================================="

if [ $ISSUES_FOUND -eq 0 ]; then
  echo -e "${GREEN}✅ 未发现明显的依赖注入问题${NC}"
  echo ""
  echo "建议："
  echo "  1. 运行服务并检查启动日志"
  echo "  2. 运行单元测试验证依赖注入"
  echo "  3. 查看完整文档: docs/NESTJS_DI_BEST_PRACTICES.md"
else
  echo -e "${YELLOW}⚠️  发现 $ISSUES_FOUND 个潜在问题${NC}"
  echo ""
  echo "后续步骤："
  echo "  1. 查看上述问题列表"
  echo "  2. 参考最佳实践文档修复"
  echo "  3. 重新运行此脚本验证"
  echo ""
  echo "文档: docs/NESTJS_DI_BEST_PRACTICES.md"
fi

echo ""
echo "===================================="

exit 0
