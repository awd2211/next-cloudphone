#!/bin/bash

# Kibana 可视化导入脚本
# 用法: ./import-visualizations.sh

set -e

KIBANA_URL="http://localhost:5601"
VIZ_DIR="/home/eric/next-cloudphone/infrastructure/logging/kibana-visualizations"

echo "🎨 开始导入 Kibana 可视化..."
echo "Kibana URL: $KIBANA_URL"
echo "可视化目录: $VIZ_DIR"
echo ""

# 检查 Kibana 是否可访问
if ! curl -s -f "$KIBANA_URL/api/status" > /dev/null 2>&1; then
    echo "❌ 错误: 无法连接到 Kibana ($KIBANA_URL)"
    echo "   请确保 Kibana 正在运行"
    exit 1
fi

echo "✅ Kibana 连接成功"
echo ""

# 导入每个可视化
count=0
failed=0

for viz_file in "$VIZ_DIR"/*.json; do
    filename=$(basename "$viz_file")

    # 跳过非可视化文件（只导入以数字开头的文件）
    if [[ ! "$filename" =~ ^[0-9]{2}- ]]; then
        continue
    fi
    viz_name=$(jq -r '.attributes.title' "$viz_file" 2>/dev/null || echo "Unknown")

    echo "📊 导入: $viz_name ($filename)"

    # 使用 Kibana Saved Objects API 导入
    response=$(curl -s -X POST "$KIBANA_URL/api/saved_objects/visualization" \
        -H 'kbn-xsrf: true' \
        -H 'Content-Type: application/json' \
        -d @"$viz_file")

    # 检查是否成功
    if echo "$response" | jq -e '.id' > /dev/null 2>&1; then
        viz_id=$(echo "$response" | jq -r '.id')
        echo "   ✅ 成功 (ID: $viz_id)"
        ((count++))
    else
        error_msg=$(echo "$response" | jq -r '.message // .error // "Unknown error"' 2>/dev/null || echo "Unknown error")
        echo "   ❌ 失败: $error_msg"
        ((failed++))
    fi
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📈 导入完成"
echo "   成功: $count 个可视化"
echo "   失败: $failed 个可视化"
echo ""

if [ $count -gt 0 ]; then
    echo "✨ 可视化已导入到 Kibana"
    echo "   访问地址: $KIBANA_URL/app/visualize"
    echo ""
    echo "💡 提示: 您可以创建仪表板并添加这些可视化"
    echo "   仪表板地址: $KIBANA_URL/app/dashboards"
fi
