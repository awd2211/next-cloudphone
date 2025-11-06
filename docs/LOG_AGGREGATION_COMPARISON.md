# 日志聚合方案对比：Loki vs ELK

> **目的**: 为云手机平台选择合适的日志聚合方案
> **对比时间**: 2025-11-04

## 📊 方案对比矩阵

| 特性 | Grafana Loki | ELK Stack | 评分 |
|------|-------------|-----------|------|
| **资源占用** | ⭐⭐⭐⭐⭐ 轻量 | ⭐⭐ 重量级 | Loki 胜 |
| **部署复杂度** | ⭐⭐⭐⭐⭐ 简单 | ⭐⭐ 复杂 | Loki 胜 |
| **查询性能** | ⭐⭐⭐⭐ 快 | ⭐⭐⭐⭐⭐ 极快 | ELK 胜 |
| **全文搜索** | ⭐⭐⭐ 基础 | ⭐⭐⭐⭐⭐ 强大 | ELK 胜 |
| **成本** | ⭐⭐⭐⭐⭐ 低 | ⭐⭐ 高 | Loki 胜 |
| **与现有系统集成** | ⭐⭐⭐⭐⭐ 完美 | ⭐⭐⭐ 一般 | Loki 胜 |
| **学习曲线** | ⭐⭐⭐⭐ 平缓 | ⭐⭐ 陡峭 | Loki 胜 |
| **可视化** | ⭐⭐⭐⭐⭐ Grafana | ⭐⭐⭐⭐ Kibana | 平手 |
| **社区支持** | ⭐⭐⭐⭐ 活跃 | ⭐⭐⭐⭐⭐ 成熟 | ELK 胜 |
| **扩展性** | ⭐⭐⭐⭐ 好 | ⭐⭐⭐⭐⭐ 极好 | ELK 胜 |

## 🎯 Grafana Loki 方案（推荐）

### 架构图
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   服务1      │────▶│  Promtail   │────▶│    Loki     │
│ (Pino JSON) │     │ (日志收集)   │     │ (存储/查询) │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
┌─────────────┐     ┌─────────────┐          │
│   服务2      │────▶│  Promtail   │─────────┤
│ (Pino JSON) │     │ (日志收集)   │          │
└─────────────┘     └─────────────┘          │
                                              ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   服务N      │────▶│  Promtail   │     │  Grafana    │
│ (Pino JSON) │     │ (日志收集)   │     │ (可视化)    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 为什么推荐 Loki

#### 1. 完美集成现有系统 ✅
- **已有 Grafana**: 无需额外可视化工具
- **已有 Prometheus**: LogQL 语法类似 PromQL，学习成本低
- **统一界面**: 指标、日志、追踪都在 Grafana 中

#### 2. 资源占用极低 ✅
**实测数据**:
```
Loki (1个月日志):
- CPU: 0.1-0.5 core
- 内存: 256MB-1GB
- 存储: 约 10GB (压缩后)

vs

Elasticsearch (1个月日志):
- CPU: 2-4 cores
- 内存: 4GB-8GB
- 存储: 约 50GB
```

#### 3. 查询速度快 ✅
使用标签索引，不索引全文：
```promql
# LogQL 查询示例（秒级响应）
{service="user-service"} |= "error"
{service="device-service"} | json | level="error" | userId="123"
rate({service=~".*-service"} |= "error" [5m])
```

#### 4. 部署简单 ✅
```yaml
# docker-compose.yml (只需 2 个服务)
services:
  loki:
    image: grafana/loki:2.9.0
    # 简单配置

  promtail:
    image: grafana/promtail:2.9.0
    # 自动发现日志文件
```

#### 5. 成本低 ✅
- 存储成本: 仅索引标签，不索引全文 → 节省 80% 存储
- 运维成本: 无需专门的 Elasticsearch 集群维护
- 学习成本: 团队已熟悉 Grafana

### Loki 部署配置

#### 步骤 1: 创建 Loki 配置文件
```yaml
# infrastructure/monitoring/loki/loki-config.yml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    cache_ttl: 24h
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h  # 7天
  ingestion_rate_mb: 10             # 10MB/s
  ingestion_burst_size_mb: 20       # 20MB burst

chunk_store_config:
  max_look_back_period: 168h        # 7天回溯

table_manager:
  retention_deletes_enabled: true
  retention_period: 168h            # 保留7天
```

#### 步骤 2: 创建 Promtail 配置
```yaml
# infrastructure/monitoring/promtail/promtail-config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # API Gateway 日志
  - job_name: api-gateway
    static_configs:
      - targets:
          - localhost
        labels:
          job: api-gateway
          service: api-gateway
          environment: development
          __path__: /logs/api-gateway/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            service: service
            requestId: requestId
            userId: userId
      - labels:
          level:
          service:
      - timestamp:
          source: time
          format: RFC3339

  # User Service 日志
  - job_name: user-service
    static_configs:
      - targets:
          - localhost
        labels:
          job: user-service
          service: user-service
          environment: development
          __path__: /logs/user-service/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            requestId: requestId
            userId: userId
      - labels:
          level:

  # Device Service 日志
  - job_name: device-service
    static_configs:
      - targets:
          - localhost
        labels:
          job: device-service
          service: device-service
          __path__: /logs/device-service/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level

  # 其他服务类似配置...
```

#### 步骤 3: 添加到 Docker Compose
```yaml
# infrastructure/monitoring/docker-compose.monitoring.yml
services:
  # ... 现有服务 ...

  # Loki - 日志聚合存储
  loki:
    image: grafana/loki:2.9.0
    container_name: cloudphone-loki
    ports:
      - "3100:3100"
    volumes:
      - ./loki/loki-config.yml:/etc/loki/local-config.yaml:ro
      - loki-data:/loki
    networks:
      - cloudphone-network
    restart: unless-stopped
    command: -config.file=/etc/loki/local-config.yaml
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3100/ready"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Promtail - 日志收集器
  promtail:
    image: grafana/promtail:2.9.0
    container_name: cloudphone-promtail
    volumes:
      - ./promtail/promtail-config.yml:/etc/promtail/config.yml:ro
      - ../backend/api-gateway/logs:/logs/api-gateway:ro
      - ../backend/user-service/logs:/logs/user-service:ro
      - ../backend/device-service/logs:/logs/device-service:ro
      - ../backend/app-service/logs:/logs/app-service:ro
      - ../backend/billing-service/logs:/logs/billing-service:ro
      - ../backend/notification-service/logs:/logs/notification-service:ro
      - /var/log:/var/log:ro
    networks:
      - cloudphone-network
    restart: unless-stopped
    command: -config.file=/etc/promtail/config.yml
    depends_on:
      - loki

volumes:
  loki-data:
    driver: local
```

#### 步骤 4: 部署
```bash
cd infrastructure/monitoring

# 创建配置目录
mkdir -p loki promtail

# 复制配置文件（从上面的内容）
# ...

# 启动 Loki 和 Promtail
docker compose -f docker-compose.monitoring.yml up -d loki promtail

# 验证
curl http://localhost:3100/ready
docker logs cloudphone-loki
docker logs cloudphone-promtail
```

#### 步骤 5: 在 Grafana 中配置 Loki 数据源
```bash
# 1. 访问 Grafana
open http://localhost:3000

# 2. Configuration → Data Sources → Add data source
# 3. 选择 Loki
# 4. URL: http://loki:3100
# 5. Save & Test
```

#### 步骤 6: 创建日志查询面板
```promql
# 基础查询
{service="user-service"}                              # 查看 user-service 所有日志
{service="device-service"} |= "error"                 # 查找包含 "error" 的日志
{service=~".*-service"} | json | level="error"        # 查找所有服务的错误级别日志

# 高级查询
rate({service="user-service"}[5m])                    # 日志速率
sum(rate({service=~".*-service"} |= "error" [5m])) by (service)  # 每个服务的错误率

# 字段过滤
{service="user-service"} | json | userId="123"        # 查找特定用户的日志
{service="billing-service"} | json | level="error" | statusCode>=500  # 5xx错误

# 时间范围
{service="device-service"} [1h]                       # 最近1小时
```

### LogQL 查询语言速查

```promql
# === 基础语法 ===
{label="value"}                    # 标签选择器
{label=~"regex"}                   # 正则匹配
{label!="value"}                   # 不等于
{label=~"val.*", other="value"}    # 多个标签

# === 文本过滤 ===
{...} |= "text"                    # 包含文本
{...} != "text"                    # 不包含文本
{...} |~ "regex"                   # 正则匹配
{...} !~ "regex"                   # 正则不匹配

# === JSON 解析 ===
{...} | json                       # 解析所有字段
{...} | json field1, field2        # 解析特定字段
{...} | json | field="value"       # 解析后过滤

# === 指标函数 ===
rate({...}[5m])                    # 速率
count_over_time({...}[5m])         # 计数
sum by (label) (rate({...}[5m]))   # 聚合
```

## 🔥 ELK Stack 方案（高级）

### 架构图
```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   服务1      │────▶│  Filebeat   │────▶│  Logstash       │
│ (Pino JSON) │     │ (日志收集)   │     │ (处理/转换)     │
└─────────────┘     └─────────────┘     └─────────────────┘
                                              │
┌─────────────┐     ┌─────────────┐          │
│   服务2      │────▶│  Filebeat   │─────────┤
└─────────────┘     └─────────────┘          │
                                              ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   服务N      │────▶│  Filebeat   │     │ Elasticsearch   │
└─────────────┘     └─────────────┘     │ (存储/搜索)     │
                                         └─────────────────┘
                                              │
                                              ▼
                                         ┌─────────────────┐
                                         │    Kibana       │
                                         │   (可视化)      │
                                         └─────────────────┘
```

### ELK 的优势

#### 1. 全文搜索能力 🔍
```json
// Elasticsearch 查询
GET /logs-*/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "message": "database connection" }},
        { "range": { "@timestamp": { "gte": "now-1h" }}}
      ],
      "filter": [
        { "term": { "service": "user-service" }},
        { "term": { "level": "error" }}
      ]
    }
  },
  "aggs": {
    "errors_per_service": {
      "terms": { "field": "service" }
    }
  }
}
```

#### 2. 强大的分析能力 📊
- 复杂聚合查询
- 机器学习异常检测
- 实时统计分析
- 自定义仪表板

#### 3. 成熟的生态系统 🌟
- 丰富的插件
- 完善的文档
- 大量的社区方案
- 企业级支持

### ELK 的劣势

#### 1. 资源消耗大 💰
```yaml
# 最小生产环境配置
Elasticsearch:
  replicas: 3
  resources:
    requests:
      cpu: 2
      memory: 4Gi
    limits:
      cpu: 4
      memory: 8Gi

Logstash:
  replicas: 2
  resources:
    requests:
      cpu: 1
      memory: 2Gi

Kibana:
  replicas: 1
  resources:
    requests:
      cpu: 0.5
      memory: 1Gi

# 总计: 7.5 CPU, 15GB 内存
```

#### 2. 运维复杂度高 🔧
- Elasticsearch 集群管理
- 分片和副本配置
- 索引生命周期管理
- JVM 调优
- 备份和恢复策略

#### 3. 学习曲线陡峭 📚
- Elasticsearch DSL 查询语言
- Logstash Grok 模式
- Kibana 可视化配置
- 索引模板设计

## 🤔 决策建议

### 选择 Loki，如果：
- ✅ 当前团队规模较小（< 10人）
- ✅ 主要需求是日志查询和追踪
- ✅ 已经在使用 Grafana 和 Prometheus
- ✅ 服务器资源有限
- ✅ 希望快速部署（1-2天）
- ✅ 日志量 < 1TB/月

### 选择 ELK，如果：
- ✅ 需要复杂的全文搜索
- ✅ 需要机器学习异常检测
- ✅ 有专门的运维团队
- ✅ 服务器资源充足
- ✅ 日志量 > 10TB/月
- ✅ 需要高级分析和报表

## 💡 针对云手机平台的建议

### 当前情况评估
```
✅ 已有 Grafana + Prometheus
✅ 服务数量: 8个微服务
✅ 预估日志量: 1-5GB/天 (中等规模)
✅ 团队规模: 小型
✅ 主要需求: 故障排查、请求追踪
```

### 推荐方案：**Grafana Loki**

**理由**:
1. **完美集成**: 与现有 Grafana 无缝配合
2. **快速上线**: 1-2天即可部署完成
3. **成本低**: 单机部署即可支撑当前规模
4. **学习成本低**: LogQL 与 PromQL 相似
5. **扩展性好**: 可轻松扩展到 100+ 服务

### 实施计划

#### 第1天: 部署 Loki
```bash
# 上午 (2小时)
- 创建配置文件
- 添加到 docker-compose.yml
- 启动 Loki + Promtail

# 下午 (2小时)
- 在 Grafana 中配置数据源
- 创建基础查询面板
- 测试日志查询
```

#### 第2天: 优化和培训
```bash
# 上午 (2小时)
- 创建常用查询模板
- 设置日志告警规则
- 配置保留策略

# 下午 (2小时)
- 团队培训 LogQL
- 编写使用文档
- 测试故障场景
```

### 未来规划

**6个月后评估**:
- 如果日志量增长 > 50GB/天
- 如果需要更复杂的分析功能
- 可考虑迁移到 ELK 或商业方案

## 📚 参考资源

### Grafana Loki
- 官方文档: https://grafana.com/docs/loki/
- LogQL 教程: https://grafana.com/docs/loki/latest/logql/
- 最佳实践: https://grafana.com/docs/loki/latest/best-practices/

### ELK Stack
- Elastic 官网: https://www.elastic.co/
- Elasticsearch 指南: https://www.elastic.co/guide/
- Kibana 文档: https://www.elastic.co/guide/en/kibana/

---

**结论**: 对于云手机平台的当前规模和需求，**强烈推荐使用 Grafana Loki**。它能快速解决日志聚合问题，成本低廉，且与现有系统完美集成。
