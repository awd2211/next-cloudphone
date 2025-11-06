#!/bin/bash

# Kibana 可视化导入脚本 v2
# 使用 Saved Objects Import API (支持批量导入)

set -e

KIBANA_URL="http://localhost:5601"
VIZ_DIR="/home/eric/next-cloudphone/infrastructure/logging/kibana-visualizations"
TEMP_FILE="/tmp/kibana-visualizations.ndjson"

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

# 创建 ndjson 文件（Kibana Import API 要求的格式）
echo "📦 准备导入文件..."
> "$TEMP_FILE"

count=0
for viz_file in "$VIZ_DIR"/*.json; do
    filename=$(basename "$viz_file")

    # 只处理以数字开头的可视化文件
    if [[ ! "$filename" =~ ^[0-9]{2}- ]]; then
        continue
    fi

    viz_name=$(jq -r '.attributes.title' "$viz_file" 2>/dev/null || echo "Unknown")
    echo "   添加: $viz_name"

    # 为每个可视化生成唯一 ID（基于文件名）
    viz_id=$(echo "$filename" | sed 's/^[0-9]*-/cloudphone-/' | sed 's/.json$//')

    # 构造完整的 Saved Object（包含 id, type, attributes, references）
    jq --arg id "$viz_id" \
       '. + {id: $id}' \
       "$viz_file" >> "$TEMP_FILE"

    # ndjson 格式：每行一个 JSON 对象
    echo "" >> "$TEMP_FILE"

    ((count++))
done

if [ $count -eq 0 ]; then
    echo "❌ 没有找到可视化文件"
    rm -f "$TEMP_FILE"
    exit 1
fi

echo ""
echo "📤 上传到 Kibana..."

# 使用 Saved Objects Import API
response=$(curl -s -X POST "$KIBANA_URL/api/saved_objects/_import" \
    -H 'kbn-xsrf: true' \
    --form file=@"$TEMP_FILE")

# 解析响应
success_count=$(echo "$response" | jq -r '.successCount // 0' 2>/dev/null)
errors=$(echo "$response" | jq -r '.errors // [] | length' 2>/dev/null)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📈 导入完成"
echo "   成功: $success_count 个可视化"
echo "   失败: $errors 个可视化"

# 如果有错误，显示详情
if [ "$errors" != "0" ]; then
    echo ""
    echo "❌ 错误详情:"
    echo "$response" | jq -r '.errors[] | "   - \(.title // .id): \(.error.message)"' 2>/dev/null || echo "   未知错误"
fi

echo ""

if [ "$success_count" -gt 0 ]; then
    echo "✨ 可视化已导入到 Kibana"
    echo "   访问地址: $KIBANA_URL/app/visualize"
    echo ""
    echo "💡 提示: 现在可以创建仪表板并添加这些可视化"
    echo "   仪表板地址: $KIBANA_URL/app/dashboards"
fi

# 清理临时文件
rm -f "$TEMP_FILE"
