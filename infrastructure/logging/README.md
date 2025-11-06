# 日志聚合系统 (ELK Stack)

## 概述

本目录包含云手机平台的 **ELK Stack 日志聚合系统**，用于集中收集、处理、存储和可视化所有 8 个微服务的日志数据。

## 系统组件

### 核心组件

| 组件 | 版本 | 端口 | 职责 |
|-----|------|------|-----|
| **Elasticsearch** | 8.11.0 | 9200, 9300 | 日志存储和全文搜索引擎 |
| **Logstash** | 8.11.0 | 5044, 9600 | 日志处理管道（解析、转换、增强） |
| **Kibana** | 8.11.0 | 5601 | 日志可视化和查询 Web UI |
| **Filebeat** | 8.11.0 | - | 轻量级日志收集器 |

### 监控的微服务

所有 8 个微服务的日志都会被收集：

1. **api-gateway** (Port 30000)
2. **user-service** (Port 30001)
3. **device-service** (Port 30002)
4. **app-service** (Port 30003)
5. **billing-service** (Port 30005)
6. **notification-service** (Port 30006)
7. **sms-receive-service** (Port 30007)
8. **proxy-service** (Port 30008)

## 目录结构

```
infrastructure/logging/
├── docker-compose.elk.yml      # ELK Stack 编排配置
├── start-elk.sh                # 一键启动脚本
├── README.md                   # 本文件
├── ELK_DEPLOYMENT_GUIDE.md     # 完整部署指南
│
├── elasticsearch/
│   └── elasticsearch.yml       # ES 配置（单节点、2GB 堆内存）
│
├── logstash/
│   ├── logstash.yml           # Logstash 主配置
│   ├── pipelines.yml          # 管道定义
│   └── pipeline/
│       ├── main.conf          # 日志处理管道（JSON 解析、字段提取）
│       └── template.json      # ES 索引模板（字段映射）
│
├── kibana/
│   └── kibana.yml             # Kibana 配置（中文界面）
│
└── filebeat/
    └── filebeat.yml           # Filebeat 配置（收集 8 个服务日志）
```

## 快速开始

### 前提条件

- Docker 20.10+
- Docker Compose v2
- 至少 4GB 可用内存
- 至少 10GB 可用磁盘空间

### 启动 ELK Stack

```bash
cd /home/eric/next-cloudphone/infrastructure/logging
./start-elk.sh
```

启动脚本会自动：
- ✅ 检查系统要求
- ✅ 配置 `vm.max_map_count=262144`（Elasticsearch 必需）
- ✅ 创建日志目录
- ✅ 按正确顺序启动所有服务
- ✅ 等待服务就绪并验证健康状态

### 访问 Kibana

1. 打开浏览器访问: **http://localhost:5601**
2. 导航到 **Management** → **Stack Management** → **Index Patterns**
3. 创建索引模式: `cloudphone-logs-*`
4. 选择时间字段: `@timestamp`
5. 转到 **Analytics** → **Discover** 开始查询日志

## 数据流向

```mermaid
graph LR
    A[微服务<br/>Pino Logger] -->|写入| B[logs/*.log<br/>JSON 格式]
    B -->|监控| C[Filebeat]
    C -->|发送| D[Logstash:5044]
    D -->|解析处理| E[Logstash Pipeline]
    E -->|索引| F[Elasticsearch]
    F -->|查询| G[Kibana UI]
```

### 详细流程

1. **微服务日志生成**:
   - 所有服务使用 `@cloudphone/shared` 的 `createLoggerConfig()`
   - Pino 输出结构化 JSON 日志
   - 日志写入 `backend/*/logs/` 目录

2. **Filebeat 收集**:
   - 监控所有 8 个服务的日志目录
   - 实时读取新增日志行
   - 标记 `service` 字段（标识日志来源）
   - 批量发送到 Logstash

3. **Logstash 处理**:
   - 解析 JSON 格式
   - 提取公共字段：service, log_level, request_id, user_id, tenant_id
   - 提取 HTTP 字段：method, url, status, duration
   - 提取错误字段：error_type, message, stack
   - GeoIP 地理位置解析
   - 添加标签和元数据

4. **Elasticsearch 存储**:
   - 按日期和服务创建索引：`cloudphone-logs-{service}-{YYYY.MM.dd}`
   - 使用 request_id 作为文档 ID（避免重复）
   - 全文索引，支持快速搜索

5. **Kibana 查询**:
   - 时间范围过滤
   - 字段过滤（service, log_level, user_id, etc.）
   - 全文搜索
   - 聚合统计
   - 可视化图表

## 日志字段说明

### 核心字段

- `@timestamp`: 日志时间戳
- `service`: 服务名称（api-gateway, user-service, ...）
- `environment`: 环境（development, production）
- `log_level`: 日志级别（trace, debug, info, warn, error, fatal）
- `log_message`: 日志消息内容
- `request_id`: 请求追踪 ID（用于追踪完整请求链路）

### HTTP 字段

- `http_method`: GET, POST, PUT, DELETE, ...
- `http_url`: 请求 URL
- `http_status`: 响应状态码（200, 404, 500, ...）
- `http_duration`: 请求耗时（毫秒）

### 错误字段

- `error_type`: 错误类型（UnauthorizedException, ValidationError, ...）
- `error_message`: 错误消息
- `error_stack`: 错误堆栈

### 用户/租户字段

- `user_id`: 用户 ID
- `tenant_id`: 租户 ID

### 地理位置字段

- `geo.location`: 地理坐标（geo_point 类型）
- `geo.country_name`: 国家
- `geo.city_name`: 城市

完整字段列表见 `logstash/pipeline/template.json`

## 常用操作

### 查看服务状态

```bash
docker compose -f docker-compose.elk.yml ps
```

### 查看日志

```bash
# 所有服务日志
docker compose -f docker-compose.elk.yml logs -f

# 特定服务
docker compose -f docker-compose.elk.yml logs -f logstash
```

### 重启服务

```bash
docker compose -f docker-compose.elk.yml restart
```

### 停止服务

```bash
# 停止但保留数据
docker compose -f docker-compose.elk.yml stop

# 停止并删除容器（保留数据）
docker compose -f docker-compose.elk.yml down

# 停止并删除所有数据
docker compose -f docker-compose.elk.yml down -v
```

### 检查 Elasticsearch 健康

```bash
curl http://localhost:9200/_cluster/health?pretty
```

### 查看索引列表

```bash
curl http://localhost:9200/_cat/indices?v
```

## 常用查询示例

在 Kibana Discover 中使用 KQL（Kibana Query Language）：

```bash
# 查询特定服务的日志
service:"user-service"

# 查询错误日志
log_level:"error"

# 查询特定用户的日志
user_id:"12345"

# 查询慢请求（> 1秒）
http_duration > 1000

# 查询 500 错误
http_status:500

# 组合查询
service:"device-service" AND log_level:"error" AND http_status:500

# 追踪完整请求链路
request_id:"abc-123-def-456"
```

## 监控指标

### Elasticsearch 指标

```bash
# 集群健康
curl http://localhost:9200/_cluster/health?pretty

# 索引统计
curl http://localhost:9200/_stats?pretty

# 节点统计
curl http://localhost:9200/_nodes/stats?pretty
```

### Logstash 指标

```bash
# 管道统计
curl http://localhost:9600/_node/stats/pipelines?pretty

# 节点信息
curl http://localhost:9600/_node/stats?pretty
```

## 性能优化建议

### 当前配置（开发环境）

- Elasticsearch: 2GB 堆内存，单节点
- Logstash: 2 workers, 批量 125 条
- Filebeat: 批量 1024 条
- 索引: 单分片，无副本

### 生产环境优化

1. **增加内存**:
   ```yaml
   # docker-compose.elk.yml
   ES_JAVA_OPTS=-Xms4g -Xmx4g  # 增加到 4GB
   ```

2. **增加 Logstash workers**:
   ```yaml
   # logstash/pipelines.yml
   pipeline.workers: 4  # 增加到 4
   ```

3. **启用 ILM（索引生命周期管理）**:
   - 自动滚动大索引
   - 自动删除旧数据（如 7 天后）

4. **多节点集群**:
   - 3 个 Elasticsearch 节点
   - 负载均衡
   - 高可用

## 故障排查

### Elasticsearch 无法启动

```bash
# 检查 vm.max_map_count
sysctl vm.max_map_count

# 设置正确的值
sudo sysctl -w vm.max_map_count=262144

# 检查日志
docker compose -f docker-compose.elk.yml logs elasticsearch
```

### 没有日志数据

```bash
# 1. 检查微服务是否运行
pm2 list

# 2. 检查日志文件是否存在
ls -la ../../backend/*/logs/

# 3. 检查 Filebeat 是否正常收集
docker compose -f docker-compose.elk.yml logs filebeat

# 4. 检查 Logstash 是否正常处理
docker compose -f docker-compose.elk.yml logs logstash

# 5. 检查索引是否创建
curl http://localhost:9200/_cat/indices?v | grep cloudphone-logs
```

### 查询性能慢

1. 缩小时间范围
2. 使用字段过滤（service, log_level）
3. 避免使用通配符开头的查询
4. 增加 Elasticsearch 内存

详细故障排查见 `ELK_DEPLOYMENT_GUIDE.md`

## 安全说明

⚠️ **当前配置为开发环境，已禁用所有安全功能**：

- ❌ X-Pack Security 已禁用
- ❌ 无用户认证
- ❌ 无 TLS/SSL 加密
- ❌ 所有端口暴露到 localhost

生产环境部署时必须启用安全功能！

## 相关文档

- **[ELK_DEPLOYMENT_GUIDE.md](./ELK_DEPLOYMENT_GUIDE.md)** - 完整部署指南（推荐阅读）
- **[LOGGING_SYSTEM_STATUS.md](../../docs/LOGGING_SYSTEM_STATUS.md)** - 日志系统现状分析
- **[LOG_AGGREGATION_COMPARISON.md](../../docs/LOG_AGGREGATION_COMPARISON.md)** - Loki vs ELK 对比

## 官方文档

- [Elasticsearch 文档](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Logstash 文档](https://www.elastic.co/guide/en/logstash/current/index.html)
- [Kibana 文档](https://www.elastic.co/guide/en/kibana/current/index.html)
- [Filebeat 文档](https://www.elastic.co/guide/en/beats/filebeat/current/index.html)

## 维护者

- 初始配置: 2025-11-04
- 环境: 开发环境
- 项目: 云手机平台 (next-cloudphone)

## License

与主项目相同
