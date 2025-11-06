# ELK Stack 日志聚合系统部署指南

## 概述

本指南介绍如何部署 ELK Stack（Elasticsearch + Logstash + Kibana + Filebeat）来聚合云手机平台所有 8 个微服务的日志。

## 系统架构

```
微服务日志 (Pino JSON) → Filebeat → Logstash → Elasticsearch → Kibana
    ↓                       ↓           ↓           ↓            ↓
api-gateway              收集        处理       存储         可视化
user-service            (日志)      (解析)     (索引)       (查询)
device-service
app-service
billing-service
notification-service
sms-receive-service
proxy-service
```

## 系统要求

### 硬件要求

- **内存**: 最低 4GB 可用内存（推荐 8GB+）
- **磁盘**: 最低 10GB 可用空间（推荐 50GB+）
- **CPU**: 2 核心以上

### 软件要求

- Docker 20.10+
- Docker Compose v2
- Linux 内核 4.0+

## 快速开始

### 1. 启动 ELK Stack

```bash
cd /home/eric/next-cloudphone/infrastructure/logging
./start-elk.sh
```

脚本会自动完成：
- ✅ 检查系统要求
- ✅ 配置系统参数（vm.max_map_count）
- ✅ 创建日志目录
- ✅ 按顺序启动 Elasticsearch → Logstash → Kibana → Filebeat
- ✅ 验证各服务健康状态

### 2. 访问 Kibana

1. 打开浏览器访问: http://localhost:5601
2. 首次访问需要创建索引模式

### 3. 创建索引模式

在 Kibana 中：
1. 导航到 **Management** → **Stack Management** → **Index Patterns**
2. 点击 **Create index pattern**
3. 输入索引模式: `cloudphone-logs-*`
4. 选择时间字段: `@timestamp`
5. 点击 **Create index pattern**

### 4. 开始查询日志

导航到 **Analytics** → **Discover** 即可查看所有微服务的日志。

## 服务端口

| 服务 | 端口 | 说明 |
|-----|------|-----|
| Elasticsearch | 9200 | HTTP API |
| Elasticsearch | 9300 | 节点通信 |
| Logstash | 5044 | Beats 输入 |
| Logstash | 9600 | API/监控 |
| Kibana | 5601 | Web UI |

## 日志字段说明

### 公共字段

| 字段 | 类型 | 说明 |
|-----|------|-----|
| `@timestamp` | date | 日志时间戳 |
| `service` | keyword | 服务名称 (api-gateway, user-service, ...) |
| `environment` | keyword | 环境 (development, production) |
| `log_level` | keyword | 日志级别 (trace, debug, info, warn, error, fatal) |
| `log_level_num` | integer | 日志级别数字 (10-60) |
| `log_message` | text | 日志消息内容 |
| `request_id` | keyword | 请求追踪 ID |
| `user_id` | keyword | 用户 ID |
| `tenant_id` | keyword | 租户 ID |

### HTTP 请求字段

| 字段 | 类型 | 说明 |
|-----|------|-----|
| `http_method` | keyword | HTTP 方法 (GET, POST, ...) |
| `http_url` | text | 请求 URL |
| `http_status` | integer | 响应状态码 |
| `http_duration` | float | 请求耗时 (毫秒) |

### 错误字段

| 字段 | 类型 | 说明 |
|-----|------|-----|
| `error_type` | keyword | 错误类型 |
| `error_message` | text | 错误消息 |
| `error_stack` | text | 错误堆栈 |

### 地理位置字段

| 字段 | 类型 | 说明 |
|-----|------|-----|
| `geo.location` | geo_point | 地理坐标 |
| `geo.country_name` | keyword | 国家 |
| `geo.city_name` | keyword | 城市 |

## 常用查询示例

### 1. 按服务查询

```
service:"user-service"
```

### 2. 按日志级别查询

```
log_level:"error"
```

### 3. 查找特定用户的日志

```
user_id:"12345"
```

### 4. 查找慢请求（响应时间 > 1000ms）

```
http_duration > 1000
```

### 5. 查找特定错误

```
error_type:"UnauthorizedException"
```

### 6. 查找特定时间范围的日志

使用 Kibana 的时间选择器，或使用 KQL：

```
@timestamp >= "2025-11-04T00:00:00" AND @timestamp <= "2025-11-04T23:59:59"
```

### 7. 组合查询

```
service:"device-service" AND log_level:"error" AND http_status:500
```

### 8. 按请求追踪链路

```
request_id:"abc-123-def-456"
```

## Kibana 可视化建议

### 推荐创建的可视化面板

1. **日志级别分布饼图**
   - 字段: `log_level`
   - 类型: Pie Chart

2. **各服务日志量柱状图**
   - 字段: `service`
   - 类型: Bar Chart

3. **错误日志趋势**
   - 过滤: `log_level:"error"`
   - 类型: Line Chart

4. **响应时间分布直方图**
   - 字段: `http_duration`
   - 类型: Histogram

5. **HTTP 状态码分布**
   - 字段: `http_status`
   - 类型: Pie Chart

6. **地理位置分布地图**
   - 字段: `geo.location`
   - 类型: Maps

## 日常运维

### 查看服务状态

```bash
cd /home/eric/next-cloudphone/infrastructure/logging
docker compose -f docker-compose.elk.yml ps
```

### 查看日志

```bash
# 查看所有服务日志
docker compose -f docker-compose.elk.yml logs -f

# 查看特定服务日志
docker compose -f docker-compose.elk.yml logs -f elasticsearch
docker compose -f docker-compose.elk.yml logs -f logstash
docker compose -f docker-compose.elk.yml logs -f kibana
docker compose -f docker-compose.elk.yml logs -f filebeat
```

### 重启服务

```bash
# 重启所有服务
docker compose -f docker-compose.elk.yml restart

# 重启特定服务
docker compose -f docker-compose.elk.yml restart logstash
```

### 停止服务

```bash
# 停止但保留数据
docker compose -f docker-compose.elk.yml stop

# 停止并删除容器（保留数据卷）
docker compose -f docker-compose.elk.yml down

# 停止并删除所有数据
docker compose -f docker-compose.elk.yml down -v
```

### 检查 Elasticsearch 健康状态

```bash
curl http://localhost:9200/_cluster/health?pretty
```

### 检查索引列表

```bash
curl http://localhost:9200/_cat/indices?v
```

### 检查索引大小

```bash
curl http://localhost:9200/_cat/indices/cloudphone-logs-*?v&h=index,docs.count,store.size
```

## 故障排查

### 问题 1: Elasticsearch 无法启动

**症状**: 容器持续重启

**可能原因**:
1. `vm.max_map_count` 设置不正确
2. 内存不足

**解决方法**:

```bash
# 检查当前设置
sysctl vm.max_map_count

# 设置正确的值
sudo sysctl -w vm.max_map_count=262144

# 永久保存
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf

# 检查内存
free -h

# 查看容器日志
docker compose -f docker-compose.elk.yml logs elasticsearch
```

### 问题 2: Logstash 无法连接 Elasticsearch

**症状**: Logstash 日志显示连接错误

**解决方法**:

```bash
# 检查 Elasticsearch 是否运行
curl http://localhost:9200

# 检查 Logstash 配置
docker compose -f docker-compose.elk.yml exec logstash \
  cat /usr/share/logstash/pipeline/main.conf

# 重启 Logstash
docker compose -f docker-compose.elk.yml restart logstash
```

### 问题 3: Filebeat 无法读取日志文件

**症状**: Kibana 中没有日志数据

**可能原因**:
1. 日志目录不存在
2. 文件权限问题
3. 微服务未运行

**解决方法**:

```bash
# 检查日志目录
ls -la ../../backend/*/logs/

# 检查 Filebeat 日志
docker compose -f docker-compose.elk.yml logs filebeat

# 检查微服务是否运行
pm2 list

# 手动创建测试日志
echo '{"level":"info","time":"'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'","msg":"Test log","service":"api-gateway"}' \
  >> ../../backend/api-gateway/logs/application.log
```

### 问题 4: Kibana 无法创建索引模式

**症状**: 提示找不到匹配的索引

**可能原因**: 还没有日志数据写入 Elasticsearch

**解决方法**:

```bash
# 检查是否有索引
curl http://localhost:9200/_cat/indices?v | grep cloudphone-logs

# 如果没有，检查整个链路:
# 1. 微服务是否运行并生成日志
pm2 list
ls -la ../../backend/api-gateway/logs/

# 2. Filebeat 是否正常收集
docker compose -f docker-compose.elk.yml logs filebeat | tail -50

# 3. Logstash 是否正常处理
docker compose -f docker-compose.elk.yml logs logstash | tail -50

# 4. 手动发送测试日志
curl -X POST "http://localhost:9200/cloudphone-logs-test-$(date +%Y.%m.%d)/_doc" \
  -H 'Content-Type: application/json' -d'
{
  "@timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'",
  "service": "test",
  "log_level": "info",
  "log_message": "Test message"
}'
```

### 问题 5: 磁盘空间不足

**症状**: Elasticsearch 只读或崩溃

**解决方法**:

```bash
# 检查磁盘使用
df -h

# 删除旧索引（保留最近 7 天）
curl -X DELETE "http://localhost:9200/cloudphone-logs-*-2025.10.*"

# 或配置 ILM (Index Lifecycle Management) 自动删除旧数据
```

### 问题 6: 查询性能慢

**可能原因**:
1. 索引数据量过大
2. 查询范围太广
3. 没有使用过滤条件

**优化建议**:

1. 缩小时间范围
2. 使用 `service` 字段过滤特定服务
3. 使用 `log_level` 过滤特定级别
4. 为常用字段添加索引

## 索引管理

### 索引生命周期策略

建议配置 ILM 策略自动管理索引：

```bash
# 创建 ILM 策略（通过 Kibana Dev Tools）
PUT _ilm/policy/cloudphone-logs-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "1d"
          }
        }
      },
      "delete": {
        "min_age": "7d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

### 手动删除旧索引

```bash
# 删除 30 天前的索引
curl -X DELETE "http://localhost:9200/cloudphone-logs-*-2025.10.*"

# 批量删除（使用脚本）
for date in $(seq 1 30); do
  index_date=$(date -d "$date days ago" +%Y.%m.%d)
  curl -X DELETE "http://localhost:9200/cloudphone-logs-*-$index_date" 2>/dev/null
done
```

## 性能优化

### Elasticsearch 优化

1. **增加堆内存**（修改 `docker-compose.elk.yml`）:
   ```yaml
   environment:
     - "ES_JAVA_OPTS=-Xms4g -Xmx4g"  # 从 2g 增加到 4g
   ```

2. **调整刷新间隔**:
   ```bash
   curl -X PUT "http://localhost:9200/cloudphone-logs-*/_settings" \
     -H 'Content-Type: application/json' -d'
   {
     "index": {
       "refresh_interval": "30s"
     }
   }'
   ```

### Logstash 优化

1. **增加 worker 数量**（修改 `logstash/pipelines.yml`）:
   ```yaml
   pipeline.workers: 4  # 从 2 增加到 4
   ```

2. **增加批处理大小**:
   ```yaml
   pipeline.batch.size: 250  # 从 125 增加到 250
   ```

### Filebeat 优化

1. **增加批处理大小**（修改 `filebeat/filebeat.yml`）:
   ```yaml
   output.logstash:
     bulk_max_size: 2048  # 从 1024 增加到 2048
   ```

## 监控指标

### Elasticsearch 指标

```bash
# 集群健康
curl http://localhost:9200/_cluster/health?pretty

# 节点统计
curl http://localhost:9200/_nodes/stats?pretty

# 索引统计
curl http://localhost:9200/_stats?pretty
```

### Logstash 指标

```bash
# 节点信息
curl http://localhost:9600/_node/stats?pretty

# 管道统计
curl http://localhost:9600/_node/stats/pipelines?pretty
```

## 安全建议（生产环境）

⚠️ **当前配置为开发环境，已禁用安全功能**

生产环境部署时应启用：

1. **Elasticsearch 安全**:
   - 启用 X-Pack Security
   - 配置 TLS/SSL
   - 设置用户认证

2. **网络安全**:
   - 使用防火墙限制端口访问
   - 仅允许内部网络访问
   - 为 Kibana 配置反向代理

3. **数据安全**:
   - 定期备份 Elasticsearch 数据
   - 配置索引加密
   - 审计日志访问

## 相关文档

- [Elasticsearch 官方文档](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Logstash 官方文档](https://www.elastic.co/guide/en/logstash/current/index.html)
- [Kibana 官方文档](https://www.elastic.co/guide/en/kibana/current/index.html)
- [Filebeat 官方文档](https://www.elastic.co/guide/en/beats/filebeat/current/index.html)

## 支持

如遇到问题，请检查：
1. Docker 容器日志: `docker compose -f docker-compose.elk.yml logs`
2. 系统资源使用: `docker stats`
3. Elasticsearch 健康状态: `curl http://localhost:9200/_cluster/health?pretty`
