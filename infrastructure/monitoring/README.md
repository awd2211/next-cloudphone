# 监控系统完整部署指南

## 📊 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                   监控观测体系                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Jaeger     │  │  Prometheus  │  │   Grafana    │  │
│  │  分布式追踪   │  │   指标收集    │  │  可视化大盘   │  │
│  │              │  │              │  │              │  │
│  │  16686       │  │  9090        │  │  3000        │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │          │
│         └─────────────────┴─────────────────┘          │
│                           │                            │
└───────────────────────────┼────────────────────────────┘
                            │
                    ┌───────┴────────┐
                    │                │
              ┌─────┴─────┐   ┌──────┴──────┐
              │   Envoy   │   │  微服务集群  │
              │  Gateway  │   │             │
              └───────────┘   └─────────────┘
```

---

## 🚀 快速启动

### 一键启动所有监控服务

```bash
cd infrastructure/monitoring
./start-monitoring.sh
```

**预期输出**：
```
============================================
  监控系统启动脚本
  Jaeger + Prometheus + Grafana
============================================

[SUCCESS] Docker 已安装
[SUCCESS] 网络已存在
[SUCCESS] 监控系统启动成功
[SUCCESS] Jaeger 已就绪
[SUCCESS] Prometheus 已就绪
[SUCCESS] Grafana 已就绪

============================================
[SUCCESS] 监控系统已成功启动！
============================================

🔍 Jaeger: http://localhost:16686
📊 Prometheus: http://localhost:9090
📈 Grafana: http://localhost:3000 (admin/admin123)
```

---

## 🔍 Jaeger 分布式追踪

### 访问地址
**http://localhost:16686**

### 核心功能

1. **请求追踪**
   - 查看完整的调用链路
   - 分析每个步骤的耗时
   - 定位性能瓶颈

2. **服务依赖图**
   - 可视化服务依赖关系
   - 识别关键路径
   - 发现循环依赖

3. **性能分析**
   - P50/P95/P99 延迟
   - 慢请求分析
   - 错误率统计

### 使用示例

#### 1. 查看某个请求的完整调用链

```
1. 访问 Jaeger UI
2. 选择服务: api-gateway
3. 选择操作: GET /api/users
4. 点击 "Find Traces"

预期看到：
┌─────────────────────────────────────────┐
│ Trace: abc-123-def (总耗时: 135ms)       │
├─────────────────────────────────────────┤
│ ├─ api-gateway (5ms)                    │
│ │   └─ user-service (10ms)              │
│ │       ├─ PostgreSQL (8ms)             │
│ │       └─ Redis (1ms)                  │
│ └─ device-service (120ms)               │
│     ├─ PostgreSQL (20ms)                │
│     ├─ Docker API (80ms) ⚠️ 慢          │
│     └─ RabbitMQ (5ms)                   │
└─────────────────────────────────────────┘
```

#### 2. 分析慢请求

```
1. 设置最小延迟: 1000ms
2. 点击 "Find Traces"
3. 查看所有超过 1 秒的请求
4. 点击进入查看详细的 Span
5. 定位瓶颈服务
```

---

## 📊 Prometheus 指标收集

### 访问地址
**http://localhost:9090**

### 核心功能

1. **指标查询**
   - PromQL 查询语言
   - 实时指标查看
   - 历史数据分析

2. **告警规则**
   - 配置告警条件
   - 测试告警规则
   - 查看告警历史

3. **目标监控**
   - 查看所有抓取目标
   - 目标健康状态
   - 抓取成功率

### 常用查询（PromQL）

#### 1. Envoy 请求统计

```promql
# 总请求数
sum(rate(envoy_cluster_upstream_rq_total[5m])) by (envoy_cluster_name)

# 请求成功率
sum(rate(envoy_cluster_upstream_rq_xx{envoy_response_code_class="2"}[5m])) by (envoy_cluster_name) 
/ 
sum(rate(envoy_cluster_upstream_rq_total[5m])) by (envoy_cluster_name) * 100

# 5xx 错误率
sum(rate(envoy_cluster_upstream_rq_xx{envoy_response_code_class="5"}[5m])) by (envoy_cluster_name)
/ 
sum(rate(envoy_cluster_upstream_rq_total[5m])) by (envoy_cluster_name) * 100

# P99 延迟
histogram_quantile(0.99, 
  sum(rate(envoy_cluster_upstream_rq_time_bucket[5m])) by (envoy_cluster_name, le)
)
```

#### 2. 系统资源监控

```promql
# CPU 使用率
100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 内存使用率
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# 磁盘使用率
(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100
```

#### 3. 熔断器状态

```promql
# 熔断器打开次数
increase(envoy_cluster_circuit_breakers_default_rq_open[5m])

# 连接池溢出
increase(envoy_cluster_circuit_breakers_default_cx_pool_open[5m])
```

### 告警规则管理

**查看告警规则**：
```
访问: http://localhost:9090/alerts
```

**测试告警规则**：
```bash
# 触发 CPU 告警（模拟高负载）
stress-ng --cpu 4 --timeout 300s
```

---

## 📈 Grafana 可视化仪表盘

### 访问地址
**http://localhost:3000**

**默认账号**: `admin` / `admin123`

### 已配置的数据源

1. **Prometheus** (默认)
   - 地址: http://prometheus:9090
   - 用途: 指标可视化

2. **Jaeger**
   - 地址: http://jaeger:16686
   - 用途: 追踪可视化

### 推荐仪表盘

#### 1. Envoy Gateway 监控

导入官方仪表盘：
```
Dashboard ID: 11021
名称: Envoy Global
数据源: Prometheus
```

**关键指标**：
- 总请求量 (QPS)
- 响应时间 (P50/P95/P99)
- 错误率
- 熔断器状态
- 连接池使用率

#### 2. 系统资源监控

导入仪表盘：
```
Dashboard ID: 1860
名称: Node Exporter Full
数据源: Prometheus
```

**关键指标**：
- CPU 使用率
- 内存使用率
- 磁盘 I/O
- 网络流量

#### 3. 微服务监控

导入仪表盘：
```
Dashboard ID: 12230
名称: NestJS Application
数据源: Prometheus
```

### 创建自定义仪表盘

**示例：创建服务概览仪表盘**

1. 访问 Grafana
2. 点击 "+" → "Dashboard"
3. 添加 Panel
4. 选择 Prometheus 数据源
5. 输入 PromQL 查询：
   ```promql
   sum(rate(envoy_cluster_upstream_rq_total[5m])) by (envoy_cluster_name)
   ```
6. 选择可视化类型（Graph / Gauge / Table）
7. 保存仪表盘

---

## 🔔 AlertManager 告警管理

### 访问地址
**http://localhost:9093**

### 配置告警通知

#### 1. 邮件通知

编辑 `prometheus/alertmanager.yml`:
```yaml
global:
  smtp_from: 'cloudphone-alerts@example.com'
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-app-password'
  smtp_require_tls: true

receivers:
- name: 'email'
  email_configs:
  - to: 'ops-team@example.com'
```

#### 2. Slack 通知

```yaml
receivers:
- name: 'slack'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
    channel: '#cloudphone-alerts'
    title: '🚨 {{ .GroupLabels.alertname }}'
    text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

#### 3. 钉钉通知

```yaml
receivers:
- name: 'dingtalk'
  webhook_configs:
  - url: 'https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN'
    send_resolved: true
```

### 告警测试

```bash
# 1. 停止一个服务（触发告警）
docker stop cloudphone-user-service

# 2. 等待 1-2 分钟（告警触发）

# 3. 查看 AlertManager
访问: http://localhost:9093

# 4. 查看 Prometheus 告警
访问: http://localhost:9090/alerts

# 5. 恢复服务
docker start cloudphone-user-service
```

---

## 🎯 完整监控流程

### 场景 1：性能问题排查

```
1. 用户反馈：创建设备很慢

2. Grafana 查看：
   - 访问服务概览仪表盘
   - 查看 device-service P99 延迟
   - 发现延迟从 100ms 上升到 5s

3. Jaeger 追踪：
   - 搜索 device-service 慢请求
   - 查看调用链路
   - 发现 Docker API 调用耗时 4.5s

4. Prometheus 查询：
   - 查询 Docker API 调用延迟趋势
   - 确认问题持续时间
   - 查看是否有其他影响

5. 定位问题：
   - Docker 守护进程负载过高
   - 需要优化容器创建策略

6. 解决方案：
   - 实现容器池预热
   - 减少即时创建
```

### 场景 2：故障告警处理

```
1. 收到告警：User Service 5xx 错误率 > 5%

2. Grafana 确认：
   - 查看错误率趋势图
   - 确认影响范围

3. Prometheus 分析：
   - 查询错误详情
   promql: rate(http_requests_total{status=~"5.."}[5m])
   
4. Jaeger 追踪：
   - 查看失败请求的调用链
   - 定位错误来源（数据库连接池耗尽）

5. 应急处理：
   - 重启服务
   - 扩容数据库连接池

6. 根因分析：
   - 查看历史指标
   - 发现连接泄漏
   - 修复代码
```

---

## 📊 关键指标说明

### Envoy 指标

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| `envoy_cluster_upstream_rq_total` | 总请求数 | - |
| `envoy_cluster_upstream_rq_xx` | 按状态码分类的请求 | 5xx > 5% |
| `envoy_cluster_upstream_rq_time` | 请求延迟 | P99 > 1s |
| `envoy_cluster_circuit_breakers_*_rq_open` | 熔断器打开 | > 0 |
| `envoy_cluster_outlier_detection_ejections_active` | 被摘除的节点 | > 0 |

### 系统指标

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| CPU 使用率 | 处理器负载 | > 80% |
| 内存使用率 | 内存占用 | > 85% |
| 磁盘使用率 | 存储空间 | > 80% |
| 网络流量 | 入站/出站流量 | 异常波动 |

---

## 🔧 高级配置

### 1. 集成到 CI/CD

```yaml
# .gitlab-ci.yml
monitor:
  stage: monitor
  script:
    - curl -X POST http://prometheus:9090/-/reload
    - docker-compose -f docker-compose.monitoring.yml restart
  only:
    - main
```

### 2. 自定义指标暴露

**NestJS 应用**:
```typescript
import { register, Counter, Histogram } from 'prom-client';

// 请求计数器
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

// 响应时间
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration',
  labelNames: ['method', 'path'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
});

// 暴露 /metrics 端点
@Get('/metrics')
async getMetrics() {
  return register.metrics();
}
```

### 3. 长期数据存储

**配置 Prometheus 远程存储**:
```yaml
# prometheus.yml
remote_write:
  - url: "http://thanos:19291/api/v1/receive"
```

---

## 📚 最佳实践

### 1. 指标命名规范

```
# 好的命名
http_requests_total
http_request_duration_seconds
database_connections_active

# 不好的命名
requests
duration
connections
```

### 2. 标签使用

```promql
# 推荐：使用标签区分
http_requests_total{service="user-service", method="GET", status="200"}

# 不推荐：创建新指标
user_service_http_get_200_requests_total
```

### 3. 告警规则设计

```yaml
# 好的告警规则
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
  for: 5m  # 持续 5 分钟才告警
  annotations:
    summary: "服务 {{ $labels.service }} 错误率过高"
    description: "错误率: {{ $value | humanizePercentage }}"

# 避免：过于敏感的告警
- alert: AnyError
  expr: increase(http_requests_total{status=~"5.."}[1m]) > 0
  # 会产生大量无用告警
```

---

## 🎓 学习资源

- **Jaeger 文档**: https://www.jaegertracing.io/docs/
- **Prometheus 文档**: https://prometheus.io/docs/
- **Grafana 文档**: https://grafana.com/docs/
- **PromQL 教程**: https://prometheus.io/docs/prometheus/latest/querying/basics/

---

## 🔍 故障排查

### Jaeger 无法看到追踪数据

```bash
# 1. 检查 Jaeger 是否运行
docker ps | grep jaeger

# 2. 检查 Envoy 追踪配置
curl http://localhost:9901/config_dump | jq '.configs[].bootstrap.tracing'

# 3. 检查采样率
# envoy.yaml 中的 random_sampling.value 应该 > 0

# 4. 手动发送测试请求
curl -H "X-B3-Sampled: 1" http://localhost:10000/api/users
```

### Prometheus 无法抓取指标

```bash
# 1. 检查目标状态
访问: http://localhost:9090/targets

# 2. 检查网络连通性
docker exec cloudphone-prometheus ping envoy

# 3. 检查指标端点
curl http://localhost:9901/stats/prometheus
```

### Grafana 无法连接数据源

```bash
# 1. 检查数据源配置
访问: Grafana → Configuration → Data Sources

# 2. 测试连接
点击 "Test" 按钮

# 3. 检查网络
docker exec cloudphone-grafana ping prometheus
```

---

**配置完成！立即启动**：
```bash
cd infrastructure/monitoring
./start-monitoring.sh
```


