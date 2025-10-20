# Prometheus + Grafana 监控系统架构

## 概述

为云手机平台的 7 个微服务实现完整的 Prometheus + Grafana 监控系统，提供实时指标收集、可视化和告警。

## 架构设计

### 监控组件

```
┌─────────────────────────────────────────────────────────────┐
│                     Grafana (可视化)                         │
│                   http://localhost:3000                      │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ 查询指标
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Prometheus (指标存储)                        │
│                   http://localhost:9090                      │
│  - 时序数据库                                                │
│  - 告警规则引擎                                              │
│  - 服务发现                                                  │
└─────────────────────────────────────────────────────────────┘
          ▲         ▲         ▲         ▲         ▲
          │         │         │         │         │
    /metrics  /metrics  /metrics  /metrics  /metrics
          │         │         │         │         │
┌─────────┴─────────┴─────────┴─────────┴─────────┴───────────┐
│                      微服务指标端点                           │
├──────────────────────────────────────────────────────────────┤
│  Node.js (5个)    │  Python (1个)  │  Go (1个)              │
│  - API Gateway    │  - Scheduler   │  - Media Service       │
│  - User Service   │                │                         │
│  - Device Service │                │                         │
│  - App Service    │                │                         │
│  - Billing Service│                │                         │
├──────────────────────────────────────────────────────────────┤
│  prom-client      │  prometheus-   │  promhttp              │
│                   │  client        │                         │
└──────────────────────────────────────────────────────────────┘
```

## 监控指标分类

### 1. 系统级指标 (RED Method)

#### Rate (请求速率)
- `http_requests_total`: HTTP 请求总数（按方法、路径、状态码）
- `http_requests_per_second`: 每秒请求数

#### Errors (错误率)
- `http_errors_total`: HTTP 错误总数（4xx, 5xx）
- `error_rate`: 错误率百分比

#### Duration (响应时间)
- `http_request_duration_seconds`: HTTP 请求延迟（直方图）
- `http_request_duration_summary`: 延迟摘要（p50, p95, p99）

### 2. 业务指标

#### User Service
- `active_users_total`: 当前活跃用户数
- `user_registrations_total`: 用户注册总数
- `user_logins_total`: 用户登录总数
- `user_login_failures_total`: 登录失败次数

#### Device Service
- `devices_total`: 设备总数（按状态）
- `device_allocations_total`: 设备分配总数
- `device_operations_total`: 设备操作总数（启动、停止、重启）

#### Scheduler Service
- `active_sessions_total`: 活跃会话数
- `session_allocations_total`: 会话分配总数
- `session_duration_seconds`: 会话持续时间
- `available_devices`: 可用设备数

#### Media Service
- `webrtc_sessions_total`: WebRTC 会话总数
- `webrtc_connections_active`: 活跃 WebRTC 连接数
- `ice_candidates_total`: ICE 候选总数
- `websocket_connections_active`: WebSocket 连接数

#### Billing Service
- `transactions_total`: 交易总数
- `revenue_total`: 总收入
- `payment_failures_total`: 支付失败次数

### 3. 应用指标

#### Node.js 运行时
- `nodejs_heap_size_total_bytes`: 堆内存总大小
- `nodejs_heap_size_used_bytes`: 已用堆内存
- `nodejs_eventloop_lag_seconds`: 事件循环延迟
- `nodejs_active_handles`: 活跃句柄数

#### Python 运行时
- `python_gc_collections_total`: GC 收集次数
- `python_info`: Python 版本信息

#### Go 运行时
- `go_goroutines`: Goroutine 数量
- `go_memstats_alloc_bytes`: 已分配内存

### 4. 数据库指标

#### PostgreSQL
- `pg_connections_active`: 活跃连接数
- `pg_connections_idle`: 空闲连接数
- `pg_query_duration_seconds`: 查询延迟

#### Redis
- `redis_connected_clients`: 连接的客户端数
- `redis_memory_used_bytes`: 使用的内存
- `redis_commands_total`: 命令总数

## 技术实现

### Node.js (prom-client)

```typescript
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

// 创建 registry
const register = new Registry();

// HTTP 请求计数器
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

// HTTP 请求延迟
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['method', 'path'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 5],
  registers: [register],
});

// 业务指标
const activeUsers = new Gauge({
  name: 'active_users_total',
  help: 'Number of active users',
  registers: [register],
});
```

### Python (prometheus-client)

```python
from prometheus_client import Counter, Histogram, Gauge, Info

# HTTP 请求计数器
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'path', 'status']
)

# HTTP 请求延迟
http_request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'path'],
    buckets=[0.001, 0.01, 0.1, 0.5, 1, 5]
)

# 业务指标
active_sessions = Gauge(
    'active_sessions_total',
    'Number of active sessions'
)
```

### Go (promhttp)

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    // HTTP 请求计数器
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total HTTP requests",
        },
        []string{"method", "path", "status"},
    )

    // HTTP 请求延迟
    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request latency",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "path"},
    )

    // 业务指标
    webrtcSessions = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "webrtc_sessions_total",
            Help: "Number of WebRTC sessions",
        },
    )
)

func init() {
    prometheus.MustRegister(httpRequestsTotal)
    prometheus.MustRegister(httpRequestDuration)
    prometheus.MustRegister(webrtcSessions)
}
```

## Prometheus 配置

### prometheus.yml

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'cloudphone-platform'
    environment: 'development'

# 告警规则文件
rule_files:
  - /etc/prometheus/rules/*.yml

# 抓取配置
scrape_configs:
  # Node.js 微服务
  - job_name: 'nodejs-services'
    static_configs:
      - targets:
          - 'api-gateway:30000'
          - 'user-service:30001'
          - 'device-service:30002'
          - 'app-service:30003'
          - 'billing-service:30005'
        labels:
          platform: 'nodejs'

  # Python 微服务
  - job_name: 'python-services'
    static_configs:
      - targets:
          - 'scheduler-service:30004'
        labels:
          platform: 'python'

  # Go 微服务
  - job_name: 'go-services'
    static_configs:
      - targets:
          - 'media-service:30006'
        labels:
          platform: 'go'

  # PostgreSQL
  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

## Grafana 仪表板

### 1. 微服务总览仪表板

**面板**:
- 总请求数（QPS）
- 错误率
- 平均响应时间
- P95/P99 延迟
- 各服务健康状态
- 活跃连接数

### 2. 服务详情仪表板

**每个服务独立的仪表板**:
- HTTP 请求趋势
- 错误趋势
- 延迟分布
- 业务指标（特定于服务）
- 运行时指标（内存、CPU、GC）

### 3. 业务指标仪表板

- 活跃用户数趋势
- 设备分配/释放趋势
- WebRTC 会话趋势
- 收入趋势
- 交易成功率

### 4. 基础设施仪表板

- 数据库连接池
- Redis 性能
- Docker 容器资源使用
- 网络流量

## 告警规则

### 服务级告警

```yaml
groups:
  - name: service_alerts
    interval: 30s
    rules:
      # 高错误率
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) 
          / 
          sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "{{ $labels.service }} has error rate > 5%"

      # 高延迟
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, 
            rate(http_request_duration_seconds_bucket[5m])
          ) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "P95 latency > 1s for {{ $labels.service }}"

      # 服务下线
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.job }} has been down for 1 minute"
```

### 业务级告警

```yaml
groups:
  - name: business_alerts
    interval: 30s
    rules:
      # 可用设备不足
      - alert: LowAvailableDevices
        expr: available_devices < 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low available devices"
          description: "Only {{ $value }} devices available"

      # WebRTC 连接失败率高
      - alert: HighWebRTCFailureRate
        expr: |
          rate(webrtc_sessions_total{status="failed"}[5m]) 
          / 
          rate(webrtc_sessions_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High WebRTC failure rate"
```

## 部署清单

### Docker Compose

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./infrastructure/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./infrastructure/prometheus/rules:/etc/prometheus/rules
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - ./infrastructure/grafana/provisioning:/etc/grafana/provisioning
      - ./infrastructure/grafana/dashboards:/var/lib/grafana/dashboards
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  prometheus-data:
  grafana-data:
```

## 实施步骤

1. **Phase 1**: 为所有服务添加 /metrics 端点
2. **Phase 2**: 配置 Prometheus 抓取配置
3. **Phase 3**: 创建基础 Grafana 仪表板
4. **Phase 4**: 添加告警规则
5. **Phase 5**: 优化和定制仪表板

## 最佳实践

1. **指标命名**: 遵循 Prometheus 命名规范（snake_case）
2. **标签使用**: 合理使用标签，避免高基数
3. **采样率**: 根据流量调整 scrape_interval
4. **数据保留**: 配置合适的数据保留期
5. **告警疲劳**: 避免过多误报告警

## 预期效果

- **可见性**: 实时了解所有服务状态
- **问题发现**: 快速定位性能瓶颈
- **容量规划**: 基于历史数据预测资源需求
- **SLO 跟踪**: 监控服务级别目标

## 参考资源

- [Prometheus 官方文档](https://prometheus.io/docs/)
- [Grafana 官方文档](https://grafana.com/docs/)
- [RED Method](https://www.weave.works/blog/the-red-method-key-metrics-for-microservices-architecture/)
- [Google SRE Book](https://sre.google/books/)
