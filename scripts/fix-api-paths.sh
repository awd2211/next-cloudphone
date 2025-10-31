#!/bin/bash

# 批量修复前端服务文件中的 API 路径，添加 api/v1 前缀
# 使用方法: ./fix-api-paths.sh

set -e

SERVICES_DIR="/home/eric/next-cloudphone/frontend/admin/src/services"
BACKUP_DIR="/home/eric/next-cloudphone/frontend/admin/src/services/.backup_$(date +%Y%m%d_%H%M%S)"

echo "🔧 开始修复前端 API 路径"
echo "================================"
echo ""

# 创建备份目录
mkdir -p "$BACKUP_DIR"
echo "📁 备份目录: $BACKUP_DIR"
echo ""

# 需要跳过的文件（已经修复过的）
SKIP_FILES=("payment-admin.ts")

# 遍历所有 TypeScript 服务文件
for file in "$SERVICES_DIR"/*.ts; do
  filename=$(basename "$file")

  # 检查是否需要跳过
  skip=false
  for skip_file in "${SKIP_FILES[@]}"; do
    if [ "$filename" = "$skip_file" ]; then
      skip=true
      break
    fi
  done

  if [ "$skip" = true ]; then
    echo "⏭️  跳过: $filename (已修复)"
    continue
  fi

  # 备份原文件
  cp "$file" "$BACKUP_DIR/"

  # 检查文件中是否有需要修复的 API 调用
  if grep -q "request\.\(get\|post\|put\|delete\|patch\).*'/" "$file" 2>/dev/null; then
    echo "🔨 处理: $filename"

    # 修复路径：在所有不以 api/v1 开头的路径前添加 /api/v1
    # 使用 sed 进行替换
    sed -i "s|request\.\(get\|post\|put\|delete\|patch\)\([^'\"]*\)'\(/[^']*\)'|request.\1\2'/api/v1\3'|g" "$file"
    sed -i 's|request\.\(get\|post\|put\|delete\|patch\)\([^"]*\)"\(/[^"]*\)"|request.\1\2"/api/v1\3"|g' "$file"

    # 修复反引号模板字符串中的路径
    sed -i "s|request\.\(get\|post\|put\|delete\|patch\)\([^'\"]*\)\`\(/[^\`]*\)\`|request.\1\2\`/api/v1\3\`|g" "$file"

    # 修复可能的双重前缀问题（/api/v1/api/v1 -> /api/v1）
    sed -i 's|/api/v1/api/v1|/api/v1|g' "$file"

    echo "   ✅ 修复完成"
  else
    echo "⏭️  跳过: $filename (无需修复)"
  fi
done

echo ""
echo "================================"
echo "✨ 修复完成！"
echo ""
echo "📌 备份文件保存在: $BACKUP_DIR"
echo "📌 如需恢复，请执行:"
echo "   cp $BACKUP_DIR/* $SERVICES_DIR/"
echo ""

# 统计修复情况
echo "📊 统计信息:"
total_files=$(ls -1 "$SERVICES_DIR"/*.ts | wc -l)
backed_files=$(ls -1 "$BACKUP_DIR"/*.ts 2>/dev/null | wc -l || echo 0)
echo "   - 总文件数: $total_files"
echo "   - 已备份: $backed_files"
echo ""

# 检查是否还有未修复的
echo "🔍 验证修复结果..."
remaining=$(grep -r "request\.\(get\|post\|put\|delete\|patch\).*'/" "$SERVICES_DIR"/*.ts 2>/dev/null | grep -v "api/v1" | grep -v ".backup" | wc -l || echo 0)

if [ "$remaining" -eq 0 ]; then
  echo "   ✅ 所有 API 路径已正确添加 api/v1 前缀"
else
  echo "   ⚠️  还有 $remaining 个 API 调用可能需要手动检查"
  echo ""
  echo "未修复的 API 调用："
  grep -n "request\.\(get\|post\|put\|delete\|patch\).*'/" "$SERVICES_DIR"/*.ts 2>/dev/null | grep -v "api/v1" | grep -v ".backup" | head -10
fi

echo ""
echo "🎉 完成！请检查修复结果并测试应用。"
