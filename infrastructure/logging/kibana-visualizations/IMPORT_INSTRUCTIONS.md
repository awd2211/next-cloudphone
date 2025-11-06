# Kibana 可视化导入说明

由于 Kibana API 的复杂性，建议使用以下两种简单方法导入可视化。

## 方法 1: 通过 Kibana UI 导入（推荐）

### 步骤：

1. **访问 Kibana**: http://localhost:5601

2. **进入 Stack Management**:
   - 点击左侧菜单 ☰
   - 滚动到底部，点击 **Stack Management**

3. **打开 Saved Objects**:
   - 在左侧菜单中找到 **Kibana** 部分
   - 点击 **Saved Objects**

4. **导入可视化**:
   - 点击右上角的 **Import** 按钮
   - 选择本目录中的可视化 JSON 文件（一次可以选择多个）:
     ```
     01-logs-timeline.json
     02-service-distribution.json
     03-log-level-distribution.json
     04-error-logs-timeline.json
     05-top-error-messages.json
     06-http-status-distribution.json
     ```
   - 点击 **Import**

5. **处理冲突**（如果出现）:
   - 选择 **Automatically overwrite conflicts**
   - 点击 **Confirm all changes**

6. **验证导入**:
   - 导入成功后，点击 **Done**
   - 进入 **Visualize Library** 查看导入的可视化
   - 地址: http://localhost:5601/app/visualize

## 方法 2: 使用 Kibana Dev Tools（高级）

### 步骤：

1. **打开 Dev Tools**: http://localhost:5601/app/dev_tools#/console

2. **执行以下命令创建可视化**:

### 可视化 1: 日志量时间序列

```json
POST kbn:/api/saved_objects/visualization/cloudphone-logs-timeline
{
  "attributes": {
    "title": "Cloud Phone - 日志量时间序列",
    "description": "显示各服务日志量随时间的变化趋势",
    "visState": "{\"title\":\"Cloud Phone - 日志量时间序列\",\"type\":\"histogram\"}",
    "uiStateJSON": "{}",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"634e176f-a6de-469c-926d-d1d80a34c397\"}"
    }
  }
}
```

**注**: 由于 Kibana 版本差异，建议使用方法 1（UI 导入）。

## 方法 3: 手动创建可视化（学习用途）

如果您想学习如何在 Kibana 中创建可视化，可以按照以下步骤手动创建：

### 创建"服务日志分布"饼图

1. 访问 http://localhost:5601/app/visualize
2. 点击 **Create visualization**
3. 选择 **Pie** 图表类型
4. 选择数据视图: `cloudphone-logs-*`
5. 配置聚合:
   - **Slice**: Aggregation = Terms, Field = `service`, Size = 10
   - **Metrics**: Aggregation = Count
6. 点击 **Update** 查看效果
7. 保存可视化: 名称 = `Cloud Phone - 服务日志分布`

### 创建"日志量时间序列"柱状图

1. 创建新可视化，选择 **Vertical Bar** 类型
2. 选择数据视图: `cloudphone-logs-*`
3. 配置聚合:
   - **X-axis**: Aggregation = Date Histogram, Field = `@timestamp`
   - **Split series**: Aggregation = Terms, Field = `service`, Size = 10
   - **Y-axis**: Aggregation = Count
4. 设置时间范围为"Last 24 hours"
5. 保存可视化

### 创建"错误日志趋势"折线图

1. 创建新可视化，选择 **Line** 类型
2. 添加过滤器: `log_level: ERROR`
3. 配置聚合:
   - **X-axis**: Date Histogram, Field = `@timestamp`
   - **Split series**: Terms, Field = `service`
   - **Y-axis**: Count
4. 保存可视化

## 创建仪表板

导入可视化后，创建仪表板来组合所有面板：

### 步骤：

1. **访问 Dashboards**: http://localhost:5601/app/dashboards

2. **创建新仪表板**:
   - 点击 **Create dashboard**

3. **添加可视化**:
   - 点击 **Add from library**
   - 搜索 "Cloud Phone"
   - 选择所有 6 个可视化
   - 点击 **Add**

4. **调整布局**:
   - 拖拽调整每个面板的位置和大小
   - 建议布局:
     ```
     ┌────────────────────────────────────────┐
     │     日志量时间序列 (全宽)               │
     ├────────────────────┬───────────────────┤
     │ 服务日志分布       │ 日志级别分布      │
     ├────────────────────┴──┬────────────────┤
     │ 错误日志趋势          │ HTTP 状态码    │
     ├───────────────────────┴────────────────┤
     │        Top 错误消息表格                │
     └────────────────────────────────────────┘
     ```

5. **配置时间范围**:
   - 点击顶部的时间选择器
   - 选择 **Last 24 hours**

6. **启用自动刷新**:
   - 点击时间选择器旁边的刷新按钮
   - 选择 **1 minute** 或 **30 seconds**

7. **保存仪表板**:
   - 点击顶部的 **Save**
   - 名称: `Cloud Phone - 日志分析仪表板`
   - 描述: `云手机平台日志分析总览`
   - 勾选 **Store time with dashboard**
   - 点击 **Save**

## 验证导入

### 检查可视化

访问 http://localhost:5601/app/visualize

应该看到 6 个可视化:
- ✅ Cloud Phone - 日志量时间序列
- ✅ Cloud Phone - 服务日志分布
- ✅ Cloud Phone - 日志级别分布
- ✅ Cloud Phone - 错误日志趋势
- ✅ Cloud Phone - Top 错误消息
- ✅ Cloud Phone - HTTP 状态码分布

### 检查仪表板

访问 http://localhost:5601/app/dashboards

应该看到:
- ✅ Cloud Phone - 日志分析仪表板

## 故障排查

### 问题 1: "Index pattern not found"

**解决方案**:
```bash
# 确认数据视图存在
curl -s http://localhost:5601/api/data_views | jq '.data_view[] | {id, title}'

# 如果不存在，创建数据视图
curl -X POST http://localhost:5601/api/data_views/data_view \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -d '{
    "data_view": {
      "title": "cloudphone-logs-*",
      "timeFieldName": "@timestamp"
    }
  }'
```

### 问题 2: "Visualization shows no data"

**检查步骤**:
1. 确认 Elasticsearch 中有数据:
   ```bash
   curl -s 'http://localhost:9200/cloudphone-logs-*/_count'
   ```

2. 检查时间范围是否正确
3. 检查过滤器是否过于严格
4. 确认字段名称正确（如 `service` 而非 `service.keyword`）

### 问题 3: "Import failed"

**常见原因**:
- Kibana 版本不兼容
- JSON 格式错误
- 数据视图 ID 不匹配

**解决方案**:
使用方法 3 手动创建可视化

## 快速测试

导入后，快速验证可视化是否正常工作：

```bash
# 1. 检查 Elasticsearch 数据
curl -s 'http://localhost:9200/cloudphone-logs-*/_search?size=0' | jq '.hits.total'

# 2. 访问 Kibana
open http://localhost:5601/app/visualize

# 3. 打开任意一个可视化查看效果
```

## 提示

- 💡 首次导入后，等待 1-2 分钟让 Kibana 建立字段索引
- 💡 如果看不到数据，尝试调整时间范围到"Last 7 days"
- 💡 使用 Kibana 的 Inspect 功能查看底层 Elasticsearch 查询
- 💡 可以克隆现有可视化进行自定义修改

## 下一步

导入完成后，您可以：

1. ✨ 创建自定义仪表板组合可视化
2. 📊 添加更多过滤器和查询条件
3. 🔔 配置告警规则（需要 Elasticsearch Alerting 功能）
4. 📤 分享仪表板链接给团队成员
5. 📱 设置定时报告（需要 Reporting 功能）

## 相关文档

- [Kibana 可视化指南](https://www.elastic.co/guide/en/kibana/current/dashboard.html)
- [创建可视化](https://www.elastic.co/guide/en/kibana/current/create-a-dashboard-of-panels-with-web-server-data.html)
- [管理 Saved Objects](https://www.elastic.co/guide/en/kibana/current/managing-saved-objects.html)
