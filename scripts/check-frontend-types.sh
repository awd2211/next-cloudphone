#!/bin/bash

# 前端 TypeScript 类型检查脚本
# 用于验证 Admin 和 User 前端的类型安全状态

set -e

echo "════════════════════════════════════════════════════════"
echo "   CloudPhone Frontend TypeScript 类型检查"
echo "════════════════════════════════════════════════════════"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 总错误计数
total_admin=0
total_user=0

# 检查 Admin Frontend
echo -e "${BLUE}━━━ Admin Frontend ━━━${NC}"
echo ""
cd /home/eric/next-cloudphone/frontend/admin
echo "运行 TypeScript 编译检查..."
if output=$(pnpm exec tsc --noEmit 2>&1); then
  echo -e "${GREEN}✅ Admin Frontend: 零错误！完美类型安全！${NC}"
  total_admin=0
else
  error_count=$(echo "$output" | grep -c "error TS" || echo "0")
  total_admin=$error_count
  echo -e "${RED}❌ Admin Frontend: 发现 $error_count 个错误${NC}"
  echo ""
  echo "错误详情："
  echo "$output" | grep "error TS" | head -10
fi
echo ""

# 检查 User Frontend
echo -e "${BLUE}━━━ User Frontend ━━━${NC}"
echo ""
cd /home/eric/next-cloudphone/frontend/user
echo "运行 TypeScript 编译检查..."
if output=$(pnpm exec tsc --noEmit 2>&1); then
  echo -e "${GREEN}✅ User Frontend: 零错误！完美类型安全！${NC}"
  total_user=0
else
  error_count=$(echo "$output" | grep -c "error TS" || echo "0")
  total_user=$error_count
  echo -e "${RED}❌ User Frontend: 发现 $error_count 个错误${NC}"
  echo ""
  echo "错误详情："
  echo "$output" | grep "error TS" | head -10
fi
echo ""

# 总结
echo "════════════════════════════════════════════════════════"
echo "   总结"
echo "════════════════════════════════════════════════════════"
echo ""

total_errors=$((total_admin + total_user))

if [ $total_errors -eq 0 ]; then
  echo -e "${GREEN}🎉 恭喜！两个前端项目都达到完美类型安全！${NC}"
  echo ""
  echo "  Admin Frontend:  ✅ 0 错误"
  echo "  User Frontend:   ✅ 0 错误"
  echo ""
  echo -e "${GREEN}  总计: 0 TypeScript 错误${NC}"
  echo ""
  echo "质量标准: 🏆 完美"
else
  echo -e "${RED}⚠️  发现 TypeScript 错误，需要修复${NC}"
  echo ""
  echo "  Admin Frontend:  $([ $total_admin -eq 0 ] && echo '✅ 0' || echo "❌ $total_admin") 错误"
  echo "  User Frontend:   $([ $total_user -eq 0 ] && echo '✅ 0' || echo "❌ $total_user") 错误"
  echo ""
  echo -e "${RED}  总计: $total_errors TypeScript 错误${NC}"
  echo ""
  echo "请查看上面的错误详情并进行修复。"
fi

echo ""
echo "════════════════════════════════════════════════════════"

exit $total_errors
