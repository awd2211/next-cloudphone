# SMS Receive Service - 部署文档

SMS 验证码接收服务的生产环境部署指南。

## 📋 目录

- [系统要求](#系统要求)
- [快速部署](#快速部署)
- [Docker 部署](#docker-部署)
- [Kubernetes 部署](#kubernetes-部署)
- [环境变量配置](#环境变量配置)
- [数据库设置](#数据库设置)
- [监控配置](#监控配置)
- [性能调优](#性能调优)
- [故障排查](#故障排查)
- [安全建议](#安全建议)

## 系统要求

### 硬件要求

**最小配置**:
- CPU: 2 核心
- 内存: 2GB RAM
- 存储: 10GB
- 网络: 10Mbps

**推荐配置**:
- CPU: 4 核心
- 内存: 4GB RAM
- 存储: 50GB SSD
- 网络: 100Mbps

### 软件要求

- **Node.js**: 20.x LTS
- **PostgreSQL**: 14+
- **Redis**: 7+
- **RabbitMQ**: 3.11+
- **Docker** (可选): 24.0+
- **Kubernetes** (可选): 1.27+

### 外部依赖

- **SMS-Activate API Key**: 从 https://sms-activate.io 获取
- **5sim API Key** (可选): 从 https://5sim.net 获取
- **Consul** (可选): 服务发现和配置管理

## 快速部署

### 1. 使用 PM2 (推荐用于单机部署)

```bash
# 1. 克隆代码
cd /opt
git clone <repository-url>
cd next-cloudphone/backend/sms-receive-service

# 2. 安装 pnpm
npm install -g pnpm@8

# 3. 安装依赖
pnpm install

# 4. 配置环境变量
cp .env.example .env
nano .env  # 编辑配置

# 5. 构建服务
pnpm build

# 6. 安装 PM2
npm install -g pm2

# 7. 启动服务
pm2 start dist/main.js --name sms-receive-service \
  --instances 2 \
  --env production

# 8. 保存 PM2 配置
pm2 save
pm2 startup

# 9. 查看日志
pm2 logs sms-receive-service
```

### 2. 使用 Docker Compose

```bash
# 1. 克隆代码
cd /opt
git clone <repository-url>
cd next-cloudphone

# 2. 配置环境变量
export SMS_ACTIVATE_API_KEY=your_api_key_here
export FIVESIM_API_KEY=your_5sim_api_key_here

# 3. 启动所有服务 (包括基础设施)
docker compose -f docker-compose.prod.yml up -d

# 4. 查看日志
docker compose logs -f sms-receive-service

# 5. 检查健康状态
curl http://localhost:30008/health/detailed
```

## Docker 部署

### 构建 Docker 镜像

#### 方式1: 使用项目 Dockerfile

```bash
cd /home/eric/next-cloudphone/backend/sms-receive-service

# 构建镜像
docker build -t cloudphone/sms-receive-service:latest .

# 运行容器
docker run -d \
  --name sms-receive-service \
  --network cloudphone-network \
  -p 30008:30008 \
  -e NODE_ENV=production \
  -e PORT=30008 \
  -e DB_HOST=postgres \
  -e DB_DATABASE=cloudphone_sms \
  -e REDIS_HOST=redis \
  -e RABBITMQ_URL=amqp://admin:admin123@rabbitmq:5672/cloudphone \
  -e SMS_ACTIVATE_API_KEY=your_key_here \
  cloudphone/sms-receive-service:latest
```

#### 方式2: 使用 infrastructure Dockerfile (多服务部署)

```bash
cd /home/eric/next-cloudphone

# 构建镜像 (从项目根目录)
docker build \
  -f infrastructure/docker/sms-receive-service.Dockerfile \
  -t cloudphone/sms-receive-service:latest \
  --target production \
  .

# 推送到私有镜像仓库
docker tag cloudphone/sms-receive-service:latest registry.company.com/cloudphone/sms-receive-service:1.0.0
docker push registry.company.com/cloudphone/sms-receive-service:1.0.0
```

### Docker Compose 生产配置

创建 `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  sms-receive-service:
    image: cloudphone/sms-receive-service:latest
    container_name: sms-receive-service
    restart: always
    environment:
      NODE_ENV: production
      PORT: 30008
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: postgres
      DB_PASSWORD: ${DB_PASSWORD}
      DB_DATABASE: cloudphone_sms
      REDIS_HOST: redis
      REDIS_PORT: 6379
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672/cloudphone
      SMS_ACTIVATE_API_KEY: ${SMS_ACTIVATE_API_KEY}
      SMS_ACTIVATE_BASE_URL: https://api.sms-activate.org/stubs/handler_api.php
      FIVESIM_API_KEY: ${FIVESIM_API_KEY}
      FIVESIM_BASE_URL: https://5sim.net/v1
      PLATFORM_SELECTION_STRATEGY: balanced
      NUMBER_POOL_ENABLED: true
      POLLING_BATCH_SIZE: 50
      MAX_ACTIVE_NUMBERS: 500
      LOG_LEVEL: info
    ports:
      - "30008:30008"
    depends_on:
      - postgres
      - redis
      - rabbitmq
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:30008/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    networks:
      - cloudphone-network
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"

networks:
  cloudphone-network:
    external: true
```

启动:

```bash
# 设置环境变量
export DB_PASSWORD=secure_password
export RABBITMQ_USER=admin
export RABBITMQ_PASSWORD=secure_password
export SMS_ACTIVATE_API_KEY=your_key_here
export FIVESIM_API_KEY=your_key_here

# 启动服务
docker compose -f docker-compose.prod.yml up -d

# 查看状态
docker compose ps
docker compose logs -f sms-receive-service
```

## Kubernetes 部署

### 1. 创建 Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cloudphone
```

```bash
kubectl apply -f namespace.yaml
```

### 2. 创建 Secret

```bash
# 创建 Secret 存储敏感信息
kubectl create secret generic sms-receive-service-secrets \
  --from-literal=db-password='secure_password' \
  --from-literal=sms-activate-api-key='your_api_key_here' \
  --from-literal=fivesim-api-key='your_5sim_api_key_here' \
  --namespace=cloudphone
```

### 3. 创建 ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sms-receive-service-config
  namespace: cloudphone
data:
  NODE_ENV: "production"
  PORT: "30008"
  DB_HOST: "postgres-service"
  DB_PORT: "5432"
  DB_USERNAME: "postgres"
  DB_DATABASE: "cloudphone_sms"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  RABBITMQ_URL: "amqp://admin:admin123@rabbitmq-service:5672/cloudphone"
  SMS_ACTIVATE_BASE_URL: "https://api.sms-activate.org/stubs/handler_api.php"
  FIVESIM_BASE_URL: "https://5sim.net/v1"
  PLATFORM_SELECTION_STRATEGY: "balanced"
  NUMBER_POOL_ENABLED: "true"
  POLLING_BATCH_SIZE: "50"
  MAX_ACTIVE_NUMBERS: "500"
  LOG_LEVEL: "info"
```

```bash
kubectl apply -f configmap.yaml
```

### 4. 创建 Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sms-receive-service
  namespace: cloudphone
  labels:
    app: sms-receive-service
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sms-receive-service
  template:
    metadata:
      labels:
        app: sms-receive-service
        version: v1
    spec:
      containers:
      - name: sms-receive-service
        image: registry.company.com/cloudphone/sms-receive-service:1.0.0
        imagePullPolicy: Always
        ports:
        - containerPort: 30008
          name: http
          protocol: TCP
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: sms-receive-service-secrets
              key: db-password
        - name: SMS_ACTIVATE_API_KEY
          valueFrom:
            secretKeyRef:
              name: sms-receive-service-secrets
              key: sms-activate-api-key
        - name: FIVESIM_API_KEY
          valueFrom:
            secretKeyRef:
              name: sms-receive-service-secrets
              key: fivesim-api-key
        envFrom:
        - configMapRef:
            name: sms-receive-service-config
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 30008
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 30008
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
      imagePullSecrets:
      - name: registry-credentials
```

```bash
kubectl apply -f deployment.yaml
```

### 5. 创建 Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: sms-receive-service
  namespace: cloudphone
  labels:
    app: sms-receive-service
spec:
  type: ClusterIP
  ports:
  - port: 30008
    targetPort: 30008
    protocol: TCP
    name: http
  selector:
    app: sms-receive-service
```

```bash
kubectl apply -f service.yaml
```

### 6. 创建 Ingress (可选)

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sms-receive-service-ingress
  namespace: cloudphone
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - sms-api.company.com
    secretName: sms-receive-service-tls
  rules:
  - host: sms-api.company.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: sms-receive-service
            port:
              number: 30008
```

```bash
kubectl apply -f ingress.yaml
```

### 7. 部署验证

```bash
# 查看 Pod 状态
kubectl get pods -n cloudphone -l app=sms-receive-service

# 查看日志
kubectl logs -n cloudphone -l app=sms-receive-service --tail=100 -f

# 查看服务
kubectl get svc -n cloudphone sms-receive-service

# 端口转发测试
kubectl port-forward -n cloudphone svc/sms-receive-service 30008:30008

# 测试健康检查
curl http://localhost:30008/health/detailed
```

### 8. 水平扩展

```bash
# 手动扩展
kubectl scale deployment sms-receive-service -n cloudphone --replicas=5

# 自动扩展 (HPA)
kubectl autoscale deployment sms-receive-service \
  --namespace=cloudphone \
  --cpu-percent=70 \
  --min=3 \
  --max=10
```

## 环境变量配置

### 必需配置

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 服务端口 | `30008` |
| `DB_HOST` | PostgreSQL 主机 | `localhost` |
| `DB_DATABASE` | 数据库名 | `cloudphone_sms` |
| `DB_USERNAME` | 数据库用户 | `postgres` |
| `DB_PASSWORD` | 数据库密码 | `secure_password` |
| `REDIS_HOST` | Redis 主机 | `localhost` |
| `RABBITMQ_URL` | RabbitMQ 连接 | `amqp://user:pass@host:5672/vhost` |
| `SMS_ACTIVATE_API_KEY` | SMS-Activate API Key | `your_key` |

### 可选配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `FIVESIM_API_KEY` | 5sim API Key | - |
| `PLATFORM_SELECTION_STRATEGY` | 平台选择策略 | `balanced` |
| `NUMBER_POOL_ENABLED` | 启用号码池 | `true` |
| `POOL_MIN_SIZE` | 号码池最小大小 | `5` |
| `POOL_MAX_SIZE` | 号码池最大大小 | `20` |
| `POLLING_BATCH_SIZE` | 轮询批次大小 | `50` |
| `MAX_ACTIVE_NUMBERS` | 最大活跃号码 | `500` |
| `LOG_LEVEL` | 日志级别 | `info` |

### 平台选择策略

- `cost-optimized`: 优先选择成本最低的平台
- `reliability-first`: 优先选择成功率最高的平台
- `balanced`: 平衡成本和可靠性 (推荐)
- `round-robin`: 轮询所有平台

## 数据库设置

### 1. 创建数据库

```sql
-- 创建数据库
CREATE DATABASE cloudphone_sms;

-- 连接到数据库
\c cloudphone_sms

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 2. 初始化表结构

服务启动时会自动创建表结构。如需手动创建,参考 `database/init-database.sql`。

### 3. 数据库备份

```bash
# 备份
pg_dump -U postgres -d cloudphone_sms -F c -f cloudphone_sms_backup.dump

# 恢复
pg_restore -U postgres -d cloudphone_sms -v cloudphone_sms_backup.dump
```

### 4. 数据库性能优化

```sql
-- 调整 PostgreSQL 配置 (postgresql.conf)
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
work_mem = 8MB
max_connections = 200

-- 创建索引
CREATE INDEX idx_virtual_numbers_status ON virtual_numbers(status);
CREATE INDEX idx_virtual_numbers_device_id ON virtual_numbers(device_id);
CREATE INDEX idx_virtual_numbers_activated_at ON virtual_numbers(activated_at);
CREATE INDEX idx_sms_messages_virtual_number_id ON sms_messages(virtual_number_id);
CREATE INDEX idx_sms_messages_received_at ON sms_messages(received_at);
```

## 监控配置

### 1. Prometheus 集成

在 `prometheus.yml` 中添加:

```yaml
scrape_configs:
  - job_name: 'sms-receive-service'
    scrape_interval: 15s
    static_configs:
      - targets: ['sms-receive-service:30008']
    metrics_path: '/metrics'
```

### 2. Grafana Dashboard

导入 Dashboard JSON (需创建):

**关键指标**:
- `sms_number_requests_total` - 号码请求总数
- `sms_messages_received_total` - 短信接收总数
- `sms_active_numbers` - 活跃号码数
- `sms_polling_duration_seconds` - 轮询耗时

### 3. 告警规则

创建 Prometheus 告警规则:

```yaml
groups:
- name: sms_receive_service
  interval: 30s
  rules:
  - alert: HighNumberRequestFailureRate
    expr: |
      (
        sum(rate(sms_number_requests_total{status="failed"}[5m]))
        /
        sum(rate(sms_number_requests_total[5m]))
      ) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "号码请求失败率过高"
      description: "过去5分钟失败率超过10%: {{ $value | humanizePercentage }}"

  - alert: NoActiveNumbers
    expr: sms_waiting_numbers == 0
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "没有等待短信的号码"
      description: "过去10分钟没有活跃号码"

  - alert: PollingTooSlow
    expr: sms_polling_duration_seconds > 10
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "轮询速度过慢"
      description: "轮询耗时超过10秒: {{ $value }}s"
```

### 4. 日志聚合

使用 ELK/Loki 收集日志:

```yaml
# Loki promtail 配置
scrape_configs:
  - job_name: sms-receive-service
    static_configs:
      - targets:
          - localhost
        labels:
          job: sms-receive-service
          __path__: /var/log/sms-receive-service/*.log
```

## 性能调优

### 1. Node.js 优化

```bash
# 设置 Node.js 内存限制 (PM2)
pm2 start dist/main.js \
  --name sms-receive-service \
  --instances 4 \
  --max-memory-restart 2G \
  --node-args="--max-old-space-size=2048"
```

### 2. 轮询优化

调整 `.env` 中的轮询参数:

```env
# 减少批次大小降低内存占用
POLLING_BATCH_SIZE=30

# 减少最大活跃号码数
MAX_ACTIVE_NUMBERS=300
```

### 3. 数据库连接池

在代码中配置 TypeORM 连接池:

```typescript
// 生产环境建议配置
{
  type: 'postgres',
  host: process.env.DB_HOST,
  poolSize: 20,          // 连接池大小
  connectTimeoutMS: 5000,
  extra: {
    max: 20,             // 最大连接数
    min: 5,              // 最小连接数
    idleTimeoutMillis: 30000,
  }
}
```

### 4. Redis 缓存

启用 Redis 缓存以减少数据库查询:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1  # 使用单独的 DB
```

## 故障排查

### 1. 服务无法启动

**问题**: 服务启动后立即退出

**排查步骤**:

```bash
# 查看日志
pm2 logs sms-receive-service --lines 100

# 常见原因:
# 1. 数据库连接失败
psql -U postgres -h localhost -d cloudphone_sms -c "SELECT 1"

# 2. Redis 连接失败
redis-cli -h localhost -p 6379 ping

# 3. RabbitMQ 连接失败
curl http://localhost:15672/api/overview -u admin:admin123

# 4. 端口被占用
lsof -i :30008
```

### 2. 无法获取虚拟号码

**问题**: 请求虚拟号码时返回错误

**排查步骤**:

```bash
# 1. 检查 API Key
echo $SMS_ACTIVATE_API_KEY

# 2. 测试 SMS-Activate API
curl "https://api.sms-activate.org/stubs/handler_api.php?api_key=YOUR_KEY&action=getBalance"

# 3. 查看服务日志
pm2 logs sms-receive-service | grep "provider\|error"

# 4. 检查平台健康状态
curl http://localhost:30008/numbers/stats/providers
```

### 3. 验证码未收到

**问题**: 号码已激活但未收到验证码

**排查步骤**:

```bash
# 1. 检查轮询状态
curl http://localhost:30008/numbers/stats/polling

# 2. 手动触发轮询
curl -X POST http://localhost:30008/numbers/poll/trigger

# 3. 查看号码状态
curl http://localhost:30008/numbers/{number_id}

# 4. 检查是否发送了 RabbitMQ 事件
# 登录 RabbitMQ 管理界面查看消息队列
```

### 4. 性能问题

**问题**: 响应缓慢或内存占用高

**排查步骤**:

```bash
# 1. 查看进程资源占用
pm2 monit

# 2. 查看 Prometheus 指标
curl http://localhost:30008/metrics | grep -E "sms_active_numbers|sms_polling_duration"

# 3. 检查数据库慢查询
# PostgreSQL 慢查询日志
tail -f /var/log/postgresql/postgresql-14-main.log | grep "duration:"

# 4. 分析 Node.js 内存
# 使用 Chrome DevTools 或 clinic.js
```

## 安全建议

### 1. API Key 管理

- ✅ **使用环境变量或 Secret 管理工具**存储 API Key
- ✅ **定期轮换** API Key
- ✅ **不要**在代码中硬编码 API Key
- ✅ **限制** API Key 的访问权限 (如 IP 白名单)

### 2. 数据库安全

```bash
# 1. 使用强密码
DB_PASSWORD=$(openssl rand -base64 32)

# 2. 限制数据库访问 (pg_hba.conf)
# 只允许特定 IP 访问
host    cloudphone_sms    postgres    10.0.0.0/8    md5

# 3. 启用 SSL 连接
DB_SSL_ENABLED=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

### 3. 网络安全

```bash
# 1. 使用防火墙限制端口访问
sudo ufw allow from 10.0.0.0/8 to any port 30008

# 2. 启用 HTTPS (使用 Nginx 反向代理)
# nginx.conf
server {
    listen 443 ssl http2;
    server_name sms-api.company.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://localhost:30008;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# 3. 配置 rate limiting
# nginx.conf
limit_req_zone $binary_remote_addr zone=sms_api:10m rate=10r/s;

location / {
    limit_req zone=sms_api burst=20 nodelay;
    proxy_pass http://localhost:30008;
}
```

### 4. 日志安全

```bash
# 1. 不记录敏感信息 (API Key, 手机号完整号码)
# 在代码中过滤敏感字段

# 2. 限制日志访问权限
chmod 640 /var/log/sms-receive-service/*.log
chown sms-service:adm /var/log/sms-receive-service/

# 3. 日志轮转
# /etc/logrotate.d/sms-receive-service
/var/log/sms-receive-service/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 sms-service adm
}
```

### 5. 容器安全

```dockerfile
# Dockerfile 安全最佳实践

# 1. 使用非 root 用户
RUN addgroup -g 1001 -S smsservice && \
    adduser -S smsservice -u 1001
USER smsservice

# 2. 只暴露必要端口
EXPOSE 30008

# 3. 健康检查
HEALTHCHECK --interval=30s --timeout=5s \
  CMD curl -f http://localhost:30008/health || exit 1

# 4. 使用多阶段构建减少攻击面
FROM node:20-slim AS production
COPY --from=builder /app/dist ./dist
```

## 附录

### A. 完整环境变量列表

见 `.env.example` 文件

### B. API 端点文档

见 `http://localhost:30008/api/docs` (Swagger UI)

### C. 故障代码

| 代码 | 说明 | 解决方案 |
|------|------|----------|
| `NO_NUMBERS_AVAILABLE` | 当前无可用号码 | 等待几分钟后重试 |
| `PROVIDER_API_ERROR` | 平台 API 错误 | 检查 API Key 和余额 |
| `DATABASE_ERROR` | 数据库错误 | 检查数据库连接 |
| `REDIS_ERROR` | Redis 错误 | 检查 Redis 连接 |

### D. 相关资源

- **项目文档**: [README.md](./README.md)
- **API 测试脚本**: [scripts/test-api.sh](./scripts/test-api.sh)
- **SMS-Activate API**: https://sms-activate.io/api
- **5sim API**: https://5sim.net/support/working-with-api

## 技术支持

如遇到问题,请:

1. 查阅本文档的故障排查部分
2. 查看服务日志: `pm2 logs sms-receive-service` 或 `kubectl logs ...`
3. 提交 Issue 到项目仓库

---

**版本**: 1.0.0
**更新日期**: 2025-11-02
**维护者**: CloudPhone Team
