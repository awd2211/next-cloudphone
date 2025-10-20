# 微服务健康检测文档

## 概览

所有微服务都已配置健康检测端点 `/health`，用于监控服务状态和实现容器健康检查。

---

## 健康检测端点列表

### 后端微服务

| 服务名称 | 端口 | 健康检测端点 | 响应格式 |
|---------|------|------------|---------|
| API Gateway | 30000 | `http://localhost:30000/health` | JSON |
| User Service | 30001 | `http://localhost:30001/health` | JSON |
| Device Service | 30002 | `http://localhost:30002/health` | JSON |
| App Service | 30003 | `http://localhost:30003/health` | JSON |
| Scheduler Service | 30004 | `http://localhost:30004/health` | JSON |
| Billing Service | 30005 | `http://localhost:30005/health` | JSON |

### 响应示例

#### Node.js 微服务响应格式

```json
{
  "status": "ok",
  "timestamp": "2025-10-20T14:30:00.000Z",
  "service": "api-gateway"
}
```

#### Python 微服务响应格式 (Scheduler Service)

```json
{
  "status": "ok",
  "service": "scheduler-service",
  "timestamp": "2025-10-20T14:30:00.000000",
  "environment": "development"
}
```

---

## Docker Compose 健康检查配置

所有微服务在 `docker-compose.dev.yml` 中均配置了健康检查：

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:PORT/health"]
  interval: 30s          # 每 30 秒检查一次
  timeout: 10s           # 超时时间 10 秒
  retries: 3             # 失败 3 次后标记为 unhealthy
  start_period: 60s      # 启动后 60 秒内的失败不计入 retries
```

### 健康检查参数说明

- **interval**: 健康检查的间隔时间
- **timeout**: 单次检查的超时时间
- **retries**: 连续失败多少次后标记为不健康
- **start_period**: 容器启动后的宽限期，此期间内的失败不影响健康状态

---

## 测试健康检测端点

### 1. 测试单个服务

```bash
# API Gateway
curl http://localhost:30000/health

# User Service
curl http://localhost:30001/health

# Device Service
curl http://localhost:30002/health

# App Service
curl http://localhost:30003/health

# Scheduler Service
curl http://localhost:30004/health

# Billing Service
curl http://localhost:30005/health
```

### 2. 批量测试所有服务

```bash
#!/bin/bash
# 测试所有微服务健康状态

services=(
  "api-gateway:30000"
  "user-service:30001"
  "device-service:30002"
  "app-service:30003"
  "scheduler-service:30004"
  "billing-service:30005"
)

echo "=== 微服务健康检测 ==="
for service in "${services[@]}"; do
  name="${service%%:*}"
  port="${service##*:}"

  echo -n "$name (port $port): "

  if response=$(curl -s -f http://localhost:$port/health 2>/dev/null); then
    status=$(echo $response | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$status" = "ok" ]; then
      echo "✓ Healthy"
    else
      echo "✗ Unhealthy - status: $status"
    fi
  else
    echo "✗ Unreachable"
  fi
done
```

### 3. 查看 Docker 容器健康状态

```bash
# 查看所有容器的健康状态
docker compose -f docker-compose.dev.yml ps

# 查看特定容器的健康状态
docker inspect --format='{{.State.Health.Status}}' cloudphone-api-gateway

# 查看健康检查日志
docker inspect --format='{{json .State.Health}}' cloudphone-api-gateway | jq
```

---

## 监控集成

### Prometheus 监控配置示例

```yaml
scrape_configs:
  - job_name: 'cloudphone-services'
    scrape_interval: 30s
    static_configs:
      - targets:
          - 'api-gateway:30000'
          - 'user-service:30001'
          - 'device-service:30002'
          - 'app-service:30003'
          - 'scheduler-service:30004'
          - 'billing-service:30005'
```

### Kubernetes Liveness/Readiness Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 30000
  initialDelaySeconds: 60
  periodSeconds: 30
  timeoutSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: 30000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

---

## 故障排查

### 健康检查失败常见原因

1. **服务未完全启动**
   - 检查日志: `docker logs cloudphone-SERVICE_NAME`
   - 等待 start_period 时间后再检查

2. **数据库连接失败**
   - 确认 PostgreSQL 容器健康: `docker ps | grep postgres`
   - 检查数据库配置和连接字符串

3. **端口冲突**
   - 检查端口占用: `netstat -tlnp | grep PORT`
   - 确保端口映射正确

4. **依赖服务未就绪**
   - 检查 depends_on 配置
   - 确保基础设施服务(postgres, redis)健康

### 健康检查调试命令

```bash
# 进入容器内部测试
docker exec -it cloudphone-api-gateway sh
curl http://localhost:30000/health

# 查看健康检查日志
docker inspect cloudphone-api-gateway | jq '.[0].State.Health'

# 重启不健康的服务
docker compose -f docker-compose.dev.yml restart SERVICE_NAME
```

---

## 最佳实践

1. **监控告警**: 配置监控系统在服务不健康时发送告警
2. **自动恢复**: 使用 Docker restart policy 自动重启失败的容器
3. **日志记录**: 健康检查失败时记录详细日志便于排查
4. **依赖检查**: 健康检查应包含关键依赖(数据库、缓存)的连接状态
5. **合理超时**: 根据服务启动时间调整 start_period 和 timeout

---

## 扩展功能（建议实现）

### 1. 详细健康检查

为健康检测端点添加更多诊断信息：

```typescript
@Get('health')
async healthCheck() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: await this.checkDatabase(),
    redis: await this.checkRedis(),
  };
}
```

### 2. 就绪检查端点

添加 `/ready` 端点用于检查服务是否准备好接收流量：

```typescript
@Get('ready')
async readinessCheck() {
  // 检查所有依赖是否就绪
  const dbReady = await this.checkDatabase();
  const redisReady = await this.checkRedis();

  if (dbReady && redisReady) {
    return { status: 'ready' };
  }
  throw new ServiceUnavailableException('Service not ready');
}
```

### 3. 活性检查端点

添加 `/live` 端点用于检查服务进程是否存活：

```typescript
@Get('live')
liveCheck() {
  // 简单返回 ok，表示进程存活
  return { status: 'alive' };
}
```

---

## 更新日志

- **2025-10-20**: 为所有微服务添加健康检测端点和 Docker 健康检查配置
  - ✅ API Gateway
  - ✅ User Service
  - ✅ Device Service
  - ✅ App Service
  - ✅ Scheduler Service
  - ✅ Billing Service
