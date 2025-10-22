# Envoy Proxy 集成文档

## 📖 概述

Envoy Proxy 作为云手机平台的边缘代理（Edge Proxy），提供：

- 🛡️ **熔断保护**：自动隔离故障服务
- 🔄 **智能重试**：5xx 错误自动重试
- ⏱️ **超时控制**：防止请求阻塞
- 🚦 **限流保护**：全局和服务级限流
- 💊 **健康检查**：主动探测服务状态
- 📊 **异常检测**：自动摘除不健康节点
- 🔀 **负载均衡**：轮询分发请求
- 📈 **可观测性**：完整的访问日志和指标

---

## 🏗️ 架构

```
外部请求
    ↓
┌─────────────────────────────────────┐
│   Envoy Proxy (Port 10000)          │
│                                     │
│  ✅ 熔断器                          │
│  ✅ 限流                            │
│  ✅ 重试                            │
│  ✅ 超时                            │
│  ✅ 负载均衡                        │
│  ✅ 健康检查                        │
└──────────┬──────────────────────────┘
           ↓
    ┌──────┴──────┐
    ↓             ↓
NestJS          微服务集群
API Gateway     (user, device, billing...)
(认证/授权)     (业务逻辑)
```

**职责分离**：
- **Envoy**：基础设施层（流量管理、熔断、限流）
- **NestJS Gateway**：业务层（认证、授权、业务路由）
- **微服务**：领域逻辑

---

## 🚀 快速启动

### 1. 启动 Envoy

```bash
cd infrastructure/envoy

# 启动 Envoy
docker-compose -f docker-compose.envoy.yml up -d

# 查看日志
docker-compose -f docker-compose.envoy.yml logs -f envoy

# 查看状态
docker-compose -f docker-compose.envoy.yml ps
```

### 2. 验证部署

```bash
# 检查 Envoy 健康状态
curl http://localhost:9901/ready

# 查看配置
curl http://localhost:9901/config_dump

# 查看集群状态
curl http://localhost:9901/clusters

# 查看统计信息
curl http://localhost:9901/stats
```

### 3. 测试请求

```bash
# 通过 Envoy 访问用户服务
curl http://localhost:10000/api/users

# 通过 Envoy 访问设备服务
curl http://localhost:10000/api/devices

# 通过 Envoy 访问计费服务
curl http://localhost:10000/api/billing/plans
```

---

## 🎯 核心功能配置

### 1. 熔断器（Circuit Breaker）

每个服务都配置了熔断器：

```yaml
circuit_breakers:
  thresholds:
  - priority: DEFAULT
    max_connections: 512        # 最大连接数
    max_pending_requests: 512   # 最大等待请求数
    max_requests: 512           # 最大活动请求数
    max_retries: 3              # 最大重试次数
```

**效果**：
- 连接数超限 → 新请求立即失败
- 防止资源耗尽
- 快速失败

### 2. 异常检测（Outlier Detection）

自动摘除不健康节点：

```yaml
outlier_detection:
  consecutive_5xx: 5              # 连续5次5xx错误
  interval: 30s                   # 检测间隔
  base_ejection_time: 30s         # 摘除时间
  max_ejection_percent: 50        # 最多摘除50%节点
  enforcing_consecutive_5xx: 100  # 100%执行
```

**效果**：
- 连续 5 次 5xx 错误 → 自动摘除 30 秒
- 30 秒后自动尝试恢复
- 保护整体可用性

### 3. 健康检查（Health Check）

主动探测服务健康状态：

```yaml
health_checks:
- timeout: 2s
  interval: 10s                  # 每10秒检查一次
  unhealthy_threshold: 3         # 3次失败标记为不健康
  healthy_threshold: 2           # 2次成功标记为健康
  http_health_check:
    path: "/health"
```

**效果**：
- 主动探测 `/health` 端点
- 不健康的节点不会收到流量
- 自动恢复健康节点

### 4. 重试策略（Retry Policy）

智能重试失败请求：

```yaml
retry_policy:
  retry_on: "5xx,reset,connect-failure,refused-stream"
  num_retries: 3               # 最多重试3次
  per_try_timeout: 3s          # 每次尝试3秒超时
  retry_host_predicate:
  - name: envoy.retry_host_predicates.previous_hosts
  host_selection_retry_max_attempts: 5
```

**重试条件**：
- `5xx`：服务器错误
- `reset`：连接重置
- `connect-failure`：连接失败
- `refused-stream`：流被拒绝

**效果**：
- 自动重试临时故障
- 不会重试同一个失败的节点
- 提高成功率

### 5. 限流（Rate Limiting）

全局和服务级限流：

```yaml
# 全局限流
token_bucket:
  max_tokens: 1000         # 令牌桶容量
  tokens_per_fill: 1000    # 每次填充令牌数
  fill_interval: 1s        # 填充间隔

# 服务级限流（如 user-service）
token_bucket:
  max_tokens: 200
  tokens_per_fill: 200
  fill_interval: 1s
```

**效果**：
- 全局：1000 RPS
- User Service：200 RPS
- Device Service：200 RPS
- 防止服务过载

### 6. 超时控制（Timeout）

不同服务不同超时：

```yaml
# User Service: 10秒
timeout: 10s

# App Service: 30秒（应用安装时间长）
timeout: 30s

# Notification Service: 5秒
timeout: 5s
```

---

## 📊 监控与可观测性

### 1. 管理界面

访问：http://localhost:9901

**主要端点**：

| 端点 | 说明 |
|------|------|
| `/stats` | 所有统计指标 |
| `/clusters` | 集群状态 |
| `/config_dump` | 完整配置 |
| `/ready` | 就绪检查 |
| `/server_info` | 服务器信息 |
| `/runtime` | 运行时配置 |

### 2. 关键指标

```bash
# 查看所有统计
curl http://localhost:9901/stats

# 查看特定服务的指标
curl http://localhost:9901/stats | grep user-service

# 查看熔断器状态
curl http://localhost:9901/stats | grep circuit_breakers

# 查看健康检查状态
curl http://localhost:9901/stats | grep health_check
```

**重要指标**：

```
# 请求统计
cluster.user-service.upstream_rq_total           # 总请求数
cluster.user-service.upstream_rq_200             # 200响应数
cluster.user-service.upstream_rq_5xx             # 5xx错误数

# 熔断器
cluster.user-service.circuit_breakers.default.rq_open     # 熔断器打开次数
cluster.user-service.circuit_breakers.default.rq_pending_open  # 等待队列满次数

# 健康检查
cluster.user-service.health_check.healthy        # 健康节点数
cluster.user-service.health_check.unhealthy      # 不健康节点数

# 异常检测
cluster.user-service.outlier_detection.ejections_active   # 当前被摘除的节点

# 重试
cluster.user-service.upstream_rq_retry           # 重试次数
cluster.user-service.upstream_rq_retry_success   # 重试成功次数
```

### 3. 访问日志

JSON 格式的访问日志：

```json
{
  "timestamp": "2025-10-21T10:30:00.123Z",
  "method": "GET",
  "path": "/api/users",
  "protocol": "HTTP/1.1",
  "response_code": 200,
  "bytes_sent": 1234,
  "bytes_received": 567,
  "duration": 45,
  "upstream_host": "172.18.0.5:30001",
  "user_agent": "Mozilla/5.0...",
  "request_id": "abc-123-def"
}
```

**查看日志**：

```bash
# 实时日志
docker logs -f cloudphone-envoy

# 保存到文件
docker logs cloudphone-envoy > envoy-access.log

# 使用 jq 格式化
docker logs cloudphone-envoy | jq '.'
```

---

## 🔧 高级配置

### 1. 集成 Consul 服务发现

修改 `envoy.yaml`：

```yaml
# 替换静态配置为动态配置
clusters:
- name: user-service
  connect_timeout: 5s
  type: EDS  # ← 改为 EDS (Endpoint Discovery Service)
  eds_cluster_config:
    eds_config:
      api_config_source:
        api_type: GRPC
        grpc_services:
        - envoy_grpc:
            cluster_name: consul_server

# 添加 Consul 集群
- name: consul_server
  connect_timeout: 1s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  http2_protocol_options: {}
  load_assignment:
    cluster_name: consul_server
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: consul
              port_value: 8502  # Consul gRPC 端口
```

### 2. 集成 Jaeger 分布式追踪

添加追踪配置：

```yaml
tracing:
  http:
    name: envoy.tracers.zipkin
    typed_config:
      "@type": type.googleapis.com/envoy.config.trace.v3.ZipkinConfig
      collector_cluster: jaeger
      collector_endpoint: "/api/v2/spans"
      collector_endpoint_version: HTTP_JSON

# 添加 Jaeger 集群
clusters:
- name: jaeger
  connect_timeout: 1s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: jaeger
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: jaeger
              port_value: 9411
```

### 3. 集成 Prometheus 监控

暴露 Prometheus 指标：

```yaml
admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
  
  # 暴露 Prometheus 指标
  prometheus_stats: {}
```

**Prometheus 配置**：

```yaml
# prometheus.yml
scrape_configs:
- job_name: 'envoy'
  static_configs:
  - targets: ['localhost:9901']
  metrics_path: '/stats/prometheus'
```

### 4. TLS/HTTPS 配置

启用 HTTPS：

```yaml
listeners:
- name: https_listener
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 10443
  
  filter_chains:
  - filters: [ ... ]
    
    transport_socket:
      name: envoy.transport_sockets.tls
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
        common_tls_context:
          tls_certificates:
          - certificate_chain:
              filename: "/etc/envoy/certs/server.crt"
            private_key:
              filename: "/etc/envoy/certs/server.key"
```

---

## 🎯 最佳实践

### 1. 熔断器参数调优

根据服务特性调整：

```yaml
# 高流量服务（如 User Service）
max_connections: 1024
max_requests: 1024

# 低流量服务（如 Scheduler）
max_connections: 128
max_requests: 128

# 慢服务（如 App Service）
max_connections: 256
max_retries: 2  # 减少重试
```

### 2. 异常检测策略

```yaml
# 严格策略（关键服务）
consecutive_5xx: 3
base_ejection_time: 60s
max_ejection_percent: 30

# 宽松策略（可容忍故障的服务）
consecutive_5xx: 5
base_ejection_time: 30s
max_ejection_percent: 50
```

### 3. 重试策略

```yaml
# 只重试安全操作（GET）
retry_on: "5xx,reset"
num_retries: 3

# 不重试写操作（POST/PUT）
# 不配置 retry_policy
```

### 4. 超时设置

```yaml
# 原则：每层超时递减
Client Timeout: 60s
  → Envoy Route Timeout: 30s
    → Envoy Cluster Timeout: 10s
      → Per Try Timeout: 3s
```

---

## 🔍 故障排查

### 1. Envoy 无法启动

```bash
# 检查配置语法
docker run --rm -v $(pwd)/envoy.yaml:/etc/envoy/envoy.yaml \
  envoyproxy/envoy:v1.28-latest \
  envoy --mode validate -c /etc/envoy/envoy.yaml

# 查看启动日志
docker logs cloudphone-envoy
```

### 2. 服务无法访问

```bash
# 检查集群状态
curl http://localhost:9901/clusters | grep user-service

# 查看路由配置
curl http://localhost:9901/config_dump | jq '.configs[1].dynamic_route_configs'

# 检查健康检查
curl http://localhost:9901/stats | grep health_check
```

### 3. 熔断器频繁打开

```bash
# 查看熔断统计
curl http://localhost:9901/stats | grep circuit_breakers

# 查看请求失败原因
curl http://localhost:9901/stats | grep upstream_rq

# 可能原因：
# 1. 服务真的不健康 → 修复服务
# 2. 连接数/请求数设置过低 → 增加阈值
# 3. 超时设置过短 → 增加超时
```

### 4. 请求延迟高

```bash
# 查看上游服务响应时间
curl http://localhost:9901/stats | grep upstream_rq_time

# 查看重试次数
curl http://localhost:9901/stats | grep retry

# 可能原因：
# 1. 上游服务慢 → 优化服务
# 2. 频繁重试 → 调整重试策略
# 3. 健康检查失败 → 检查服务健康
```

---

## 📈 性能调优

### 1. 连接池优化

```yaml
# 为高流量服务增加连接池
http2_protocol_options:
  max_concurrent_streams: 1000
  initial_stream_window_size: 65536
  initial_connection_window_size: 1048576
```

### 2. 缓冲区优化

```yaml
# 增加缓冲区大小
per_connection_buffer_limit_bytes: 1048576  # 1MB
```

### 3. 并发优化

```bash
# 增加 worker 线程数（默认等于 CPU 核心数）
docker run ... envoyproxy/envoy:v1.28-latest \
  envoy -c /etc/envoy/envoy.yaml --concurrency 8
```

---

## 🚀 生产环境部署

### 1. 高可用部署

```yaml
# docker-compose.envoy.yml
services:
  envoy-1:
    image: envoyproxy/envoy:v1.28-latest
    # ... 配置
  
  envoy-2:
    image: envoyproxy/envoy:v1.28-latest
    # ... 配置
  
  # 使用 Nginx 或 HAProxy 做负载均衡
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    # 反向代理到 envoy-1 和 envoy-2
```

### 2. 资源限制

```yaml
services:
  envoy:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### 3. 日志管理

```yaml
# 使用日志驱动
logging:
  driver: "json-file"
  options:
    max-size: "100m"
    max-file: "10"

# 或发送到 ELK
logging:
  driver: "syslog"
  options:
    syslog-address: "tcp://logstash:5000"
```

---

## 📚 参考资源

- **Envoy 官方文档**：https://www.envoyproxy.io/docs
- **配置参考**：https://www.envoyproxy.io/docs/envoy/latest/configuration
- **最佳实践**：https://www.envoyproxy.io/learn/
- **示例配置**：https://github.com/envoyproxy/envoy/tree/main/configs

---

## 🎯 下一步

1. **集成 Consul**：动态服务发现
2. **集成 Jaeger**：分布式追踪
3. **集成 Prometheus**：监控告警
4. **配置 TLS**：HTTPS 支持
5. **优化性能**：压测调优

---

**配置文件位置**：
- Envoy 配置：`infrastructure/envoy/envoy.yaml`
- Docker Compose：`infrastructure/envoy/docker-compose.envoy.yml`

**管理界面**：http://localhost:9901  
**服务入口**：http://localhost:10000

