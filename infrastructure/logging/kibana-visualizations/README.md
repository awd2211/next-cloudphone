# Kibana 可视化配置

本目录包含云手机平台的 Kibana 可视化和仪表板配置。

## 📊 可视化列表

| 文件 | 可视化名称 | 类型 | 描述 |
|------|-----------|------|------|
| `01-logs-timeline.json` | 日志量时间序列 | 柱状图 | 显示各服务日志量随时间的变化趋势 |
| `02-service-distribution.json` | 服务日志分布 | 饼图 | 各微服务的日志量占比分布 |
| `03-log-level-distribution.json` | 日志级别分布 | 柱状图 | 不同日志级别（INFO/WARN/ERROR/DEBUG）的统计 |
| `04-error-logs-timeline.json` | 错误日志趋势 | 折线图 | ERROR 级别日志随时间的变化趋势 |
| `05-top-error-messages.json` | Top 错误消息 | 表格 | 按服务和错误类型统计 Top 错误 |
| `06-http-status-distribution.json` | HTTP 状态码分布 | 环形图 | HTTP 响应状态码的分布（2xx/4xx/5xx） |

## 🎨 仪表板

**Cloud Phone - 日志分析仪表板** (`dashboard-cloudphone-logs.json`)

综合仪表板，包含所有 6 个可视化面板：
- 实时日志流量监控
- 服务日志分布分析
- 日志级别统计
- 错误趋势跟踪
- HTTP 状态码分析
- Top 错误消息列表

**布局**:
```
┌────────────────────────────────────────────────┐
│          日志量时间序列 (全宽)                  │
├─────────────────────────┬──────────────────────┤
│   服务日志分布 (饼图)    │  日志级别分布 (柱状) │
├─────────────────────────┴──────┬───────────────┤
│      错误日志趋势 (折线图)      │  HTTP 状态码  │
├─────────────────────────────────┴───────────────┤
│         Top 错误消息表格 (全宽)                 │
└────────────────────────────────────────────────┘
```

**时间范围**: 最近 24 小时（可调整）
**刷新间隔**: 60 秒自动刷新

## 🚀 快速开始

### 方法 1: 使用导入脚本 (推荐)

```bash
cd /home/eric/next-cloudphone/infrastructure/logging/kibana-visualizations
./import-visualizations.sh
```

脚本会自动：
1. 检查 Kibana 连接
2. 导入所有 6 个可视化
3. 显示导入结果

### 方法 2: 手动导入

#### 1. 导入可视化

访问 Kibana: http://localhost:5601

**通过 UI 导入**:
1. 进入 **Stack Management** → **Saved Objects**
2. 点击 **Import**
3. 选择可视化 JSON 文件
4. 点击 **Import**

**通过 API 导入**:
```bash
# 示例: 导入日志时间序列可视化
curl -X POST http://localhost:5601/api/saved_objects/visualization \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -d @01-logs-timeline.json
```

#### 2. 导入仪表板

```bash
curl -X POST http://localhost:5601/api/saved_objects/dashboard \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -d @dashboard-cloudphone-logs.json
```

#### 3. 访问仪表板

打开浏览器访问:
```
http://localhost:5601/app/dashboards
```

在列表中找到 **"Cloud Phone - 日志分析仪表板"** 并打开。

## 🔧 自定义配置

### 修改时间范围

编辑仪表板 JSON:
```json
{
  "attributes": {
    "timeFrom": "now-24h",  // 开始时间
    "timeTo": "now"         // 结束时间
  }
}
```

可选值:
- `now-15m`: 最近 15 分钟
- `now-1h`: 最近 1 小时
- `now-24h`: 最近 24 小时
- `now-7d`: 最近 7 天
- `now-30d`: 最近 30 天

### 修改刷新间隔

```json
{
  "refreshInterval": {
    "pause": false,
    "value": 60000  // 毫秒 (60000 = 60秒)
  }
}
```

### 修改面板大小和位置

编辑 `panelsJSON` 中的 `gridData`:
```json
{
  "gridData": {
    "x": 0,    // X 坐标
    "y": 0,    // Y 坐标
    "w": 24,   // 宽度 (网格单位)
    "h": 15    // 高度 (网格单位)
  }
}
```

网格系统: 48 列宽

## 📈 可视化说明

### 1. 日志量时间序列

**用途**: 监控各服务的日志产生速率
**指标**:
- X 轴: 时间
- Y 轴: 日志数量
- 分组: 按服务名称

**查询条件**: 所有日志
**聚合方式**:
- 时间直方图 (date_histogram)
- 按服务分组 (terms aggregation)

### 2. 服务日志分布

**用途**: 了解各服务的日志占比
**指标**: 各服务日志数量百分比

**适用场景**:
- 识别日志最多的服务
- 发现异常日志量增长
- 容量规划参考

### 3. 日志级别分布

**用途**: 监控日志健康度
**指标**: INFO/WARN/ERROR/DEBUG 级别统计

**正常比例** (参考值):
- INFO: 70-85%
- WARN: 10-20%
- ERROR: <5%
- DEBUG: 0% (生产环境应关闭)

**告警阈值**:
- ERROR > 10%: 需要立即关注
- WARN > 30%: 需要调查

### 4. 错误日志趋势

**用途**: 追踪错误日志的时间模式
**过滤条件**: `log_level: ERROR`

**分析要点**:
- 突然激增: 可能有新 bug 或系统问题
- 周期性波动: 可能与业务周期相关
- 持续高位: 系统健康问题

### 5. Top 错误消息

**用途**: 快速定位最常见的错误
**维度**: 错误类型 + 服务名称

**排序**: 按出现次数降序

**使用场景**:
- 优先修复高频错误
- 识别系统性问题
- 跟踪修复效果

### 6. HTTP 状态码分布

**用途**: 监控 API 请求健康度
**维度**: HTTP 状态码 (2xx/3xx/4xx/5xx)

**健康指标**:
- 2xx (成功): >90%
- 4xx (客户端错误): <5%
- 5xx (服务端错误): <1%

**告警阈值**:
- 5xx > 3%: 严重问题
- 4xx > 10%: 客户端问题或 API 设计问题

## 🎯 使用场景

### 场景 1: 日常运维监控

**目标**: 实时监控系统健康状态

**关注指标**:
1. 错误日志趋势 - 是否有突增
2. HTTP 状态码分布 - 5xx 是否正常
3. 服务日志分布 - 是否有异常服务

**操作流程**:
1. 打开仪表板
2. 设置时间范围为"最近 1 小时"
3. 启用自动刷新 (30 秒)
4. 观察错误日志趋势图

### 场景 2: 故障排查

**目标**: 快速定位故障根因

**步骤**:
1. 在错误日志趋势中找到异常时间点
2. 点击时间点查看详细日志
3. 在 Top 错误消息中找到高频错误
4. 点击错误类型查看具体错误堆栈
5. 通过服务字段定位问题服务

### 场景 3: 性能分析

**目标**: 分析系统性能瓶颈

**关注指标**:
1. 日志量时间序列 - 识别高峰期
2. HTTP 状态码分布 - 计算成功率
3. 服务日志分布 - 找到最活跃服务

**分析方法**:
1. 对比不同时间段的日志量
2. 分析错误率与请求量的关系
3. 识别需要优化的服务

### 场景 4: 容量规划

**目标**: 评估日志存储需求

**步骤**:
1. 查看最近 7 天的日志量
2. 计算平均日志速率
3. 根据保留策略估算存储需求

**公式**:
```
总存储需求 = 平均日志量/天 × 保留天数 × 1.5 (预留空间)
```

## 🔍 高级查询示例

### 过滤特定服务

在仪表板顶部添加过滤器:
```
service: "device-service"
```

### 查询特定错误类型

```
error_type: "DatabaseConnectionError"
```

### 组合查询

```
log_level: ERROR AND service: "user-service" AND http_status: 500
```

### 排除某些日志

```
NOT log_message: "health check"
```

### 时间范围查询

```
@timestamp >= "2025-11-01T00:00:00" AND @timestamp < "2025-11-02T00:00:00"
```

## 📊 性能优化建议

### 1. 索引优化

- 使用索引生命周期管理 (ILM)
- 定期清理旧索引
- 考虑使用 rollover 策略

### 2. 查询优化

- 避免使用通配符开头的查询 (`*error`)
- 使用特定字段而非全文搜索
- 限制聚合的 bucket 数量

### 3. 可视化优化

- 合理设置时间范围
- 减少并发面板数量
- 使用采样数据 (大数据集)

## 🐛 故障排查

### 可视化显示"No results found"

**原因**:
1. 数据视图 (Data View) 未配置或不匹配
2. 时间范围内无数据
3. 过滤器过于严格

**解决方案**:
```bash
# 检查索引是否有数据
curl -s 'http://localhost:9200/cloudphone-logs-*/_count'

# 检查数据视图
curl -s http://localhost:5601/api/data_views | jq
```

### 可视化加载缓慢

**原因**:
1. 时间范围过大
2. 数据量过大
3. 聚合计算复杂

**解决方案**:
- 缩小时间范围
- 增加 Elasticsearch 资源
- 优化查询语句

### 导入失败

**原因**:
1. 数据视图 ID 不匹配
2. Kibana 版本不兼容
3. JSON 格式错误

**解决方案**:
```bash
# 验证 JSON 格式
jq . 01-logs-timeline.json

# 检查数据视图 ID
curl -s http://localhost:5601/api/data_views | jq '.data_view[].id'
```

## 📚 参考资料

- [Kibana 可视化指南](https://www.elastic.co/guide/en/kibana/current/dashboard.html)
- [Elasticsearch 聚合文档](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html)
- [Kibana Saved Objects API](https://www.elastic.co/guide/en/kibana/current/saved-objects-api.html)

## 🤝 贡献

欢迎提交新的可视化配置和改进建议！

### 添加新可视化

1. 在 Kibana UI 中创建可视化
2. 导出为 JSON 格式
3. 添加到本目录
4. 更新 README.md
5. 更新仪表板配置（如需要）

### 命名规范

文件名格式: `{序号}-{描述}.json`

示例:
- `01-logs-timeline.json`
- `02-service-distribution.json`

可视化名称格式: `Cloud Phone - {中文描述}`

示例:
- `Cloud Phone - 日志量时间序列`
- `Cloud Phone - 服务日志分布`

## 📝 更新日志

### 2025-11-05

- ✨ 创建 6 个核心可视化
- 📊 创建日志分析综合仪表板
- 📖 添加完整文档和使用指南
- 🚀 提供自动化导入脚本

## 📞 联系方式

如有问题或建议，请联系云手机平台运维团队。
