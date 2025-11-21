#!/bin/bash

# 查找使用旧 hooks 的组件
# 此脚本帮助识别需要迁移的组件文件

echo "🔍 查找使用旧 hooks 的组件..."
echo ""
echo "========================================"
echo ""

# 已被替代的 hooks 列表
OLD_HOOKS=(
  "useBillList"
  "useBillDetail"
  "useInvoiceList"
  "useAccountBalance"
  "useLogin"
  "useForgotPassword"
  "useResetPassword"
  "useDeviceSnapshots"
  "useAppMarket"
  "useInstalledApps"
  "useHelpCenter"
  "useExportCenter"
  "useDeviceDetail"
  "useDeviceList"
  "useMessageList"
  "useMessageSettings"
  "useActivityCenter"
  "useActivityDetail"
  "useMyCoupons"
  "useReferralCenter"
)

# 统计变量
TOTAL_FILES=0
TOTAL_IMPORTS=0

# 遍历每个旧 hook
for hook in "${OLD_HOOKS[@]}"; do
  echo "📦 查找使用 $hook 的文件:"

  # 在 src 目录下搜索 import 语句
  FILES=$(grep -r "from.*['\"]@/hooks/$hook['\"]" src/ 2>/dev/null | cut -d: -f1 | sort -u)

  if [ -n "$FILES" ]; then
    COUNT=$(echo "$FILES" | wc -l)
    TOTAL_FILES=$((TOTAL_FILES + COUNT))
    TOTAL_IMPORTS=$((TOTAL_IMPORTS + 1))

    echo "  ✗ 发现 $COUNT 个文件使用此 hook:"
    echo "$FILES" | while read -r file; do
      echo "    - $file"
    done
    echo ""
  else
    echo "  ✓ 未发现使用此 hook 的文件"
    echo ""
  fi
done

echo "========================================"
echo ""
echo "📊 统计结果:"
echo "  - 需要更新的旧 hooks 数量: $TOTAL_IMPORTS"
echo "  - 需要更新的组件文件数量: $TOTAL_FILES"
echo ""

if [ $TOTAL_FILES -eq 0 ]; then
  echo "✅ 太棒了！没有发现使用旧 hooks 的组件！"
else
  echo "⚠️  请参考 COMPONENT_MIGRATION_GUIDE.md 更新这些组件"
fi

echo ""
echo "========================================"
echo ""
echo "🔍 查找可能需要删除的旧 hook 文件..."
echo ""

# 查找旧的 hook 文件
OLD_HOOK_FILES=$(find src/hooks -maxdepth 1 -name "*.tsx" -o -name "use*.ts" | grep -v "queries" | grep -v "utils")

if [ -n "$OLD_HOOK_FILES" ]; then
  echo "📁 发现以下旧 hook 文件（在确认没有被使用后可以删除）:"
  echo ""
  echo "$OLD_HOOK_FILES" | while read -r file; do
    BASENAME=$(basename "$file")

    # 检查是否被引用
    REFS=$(grep -r "from.*['\"]@/hooks/$BASENAME['\"]" src/ 2>/dev/null | wc -l)

    if [ "$REFS" -eq 0 ]; then
      echo "  ✓ $file (未被引用，可以安全删除)"
    else
      echo "  ⚠️  $file (仍有 $REFS 处引用)"
    fi
  done
else
  echo "✅ 没有发现旧的 hook 文件"
fi

echo ""
echo "========================================"
echo ""
echo "💡 提示:"
echo "  1. 使用 'grep -r \"from.*@/hooks/旧hook名\" src/' 查找具体引用"
echo "  2. 参考 HOOKS_QUICK_REFERENCE.md 找到对应的新 hook"
echo "  3. 参考 COMPONENT_MIGRATION_GUIDE.md 了解迁移方法"
echo ""
