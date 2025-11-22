# 云手机平台部署指南

本文档详细说明如何将云手机平台部署到生产环境。

## 部署方式选择

云手机平台支持多种部署方式：

| 部署方式 | 适用场景 | 难度 | 可扩展性 |
|---------|---------|------|----------|
| Docker Compose | 开发/测试环境 | ⭐ | ⭐⭐ |
| Kubernetes | 生产环境 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Helm Chart | 生产环境（推荐） | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 方式一：Docker Compose 部署

### 适用场景
- 开发环境
- 测试环境
- 小规模生产环境（< 100 用户）

### 部署步骤

**1. 克隆代码**
```bash
git clone https://github.com/your-org/next-cloudphone.git
cd next-cloudphone
```

**2. 配置环境变量**
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

**3. 启动所有服务**
```bash
docker-compose up -d
```

**4. 初始化数据库**
```bash
./scripts/setup-database.sh
```

**5. 验证部署**
```bash
./scripts/check-health.sh
```

**访问地址:**
- API 网关: http://localhost:3000/api/health
- 管理后台: http://localhost:3001
- RabbitMQ: http://localhost:15672 (admin/admin)
- MinIO: http://localhost:9001 (minioadmin/minioadmin)

---

## 方式二：Kubernetes 部署

### 前置要求

- Kubernetes 集群 (v1.24+)
- kubectl 已配置
- 至少 3 个 Worker 节点
- 每个节点至少 8GB 内存、4 核 CPU

### 部署步骤

**1. 创建命名空间**
```bash
kubectl create namespace cloudphone
kubectl config set-context --current --namespace=cloudphone
```

**2. 创建 Secrets**
```bash
# 复制 secrets 模板
cp infrastructure/k8s/secrets/cloudphone-secrets.yaml.example \
   infrastructure/k8s/secrets/cloudphone-secrets.yaml

# 编辑 secrets（填写实际值）
nano infrastructure/k8s/secrets/cloudphone-secrets.yaml

# 应用 secrets
kubectl apply -f infrastructure/k8s/secrets/cloudphone-secrets.yaml
```

**3. 部署基础设施**
```bash
# PostgreSQL
kubectl apply -f infrastructure/k8s/deployments/postgres.yaml
kubectl apply -f infrastructure/k8s/services/postgres-service.yaml

# Redis
kubectl apply -f infrastructure/k8s/deployments/redis.yaml
kubectl apply -f infrastructure/k8s/services/redis-service.yaml

# 等待 Pod 就绪
kubectl wait --for=condition=ready pod -l app=postgres --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis --timeout=300s
```

**4. 初始化数据库**
```bash
# 复制 SQL 脚本到 PostgreSQL Pod
POD_NAME=$(kubectl get pod -l app=postgres -o jsonpath="{.items[0].metadata.name}")
kubectl cp scripts/init-database.sql $POD_NAME:/tmp/init-database.sql

# 执行初始化脚本
kubectl exec -it $POD_NAME -- psql -U postgres -f /tmp/init-database.sql
```

**5. 部署应用服务**
```bash
# ConfigMap
kubectl apply -f infrastructure/k8s/configmaps/

# Deployments
kubectl apply -f infrastructure/k8s/deployments/api-gateway.yaml
kubectl apply -f infrastructure/k8s/deployments/media-service.yaml

# Services
kubectl apply -f infrastructure/k8s/services/api-gateway-service.yaml

# Ingress
kubectl apply -f infrastructure/k8s/ingress/cloudphone-ingress.yaml

# HPA (可选)
kubectl apply -f infrastructure/k8s/autoscaling/api-gateway-hpa.yaml
```

**6. 验证部署**
```bash
# 查看所有 Pods
kubectl get pods

# 查看服务状态
kubectl get svc

# 查看 Ingress
kubectl get ingress

# 查看日志
kubectl logs -l app=api-gateway --tail=100
```

**7. 获取访问地址**
```bash
# 获取 Ingress IP
kubectl get ingress cloudphone-ingress

# 如果使用 LoadBalancer
kubectl get svc api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

---

## 方式三：Helm 部署（推荐）

### 前置要求

- Helm 3.0+
- Kubernetes 集群已配置

### 部署步骤

**1. 添加依赖仓库**
```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

**2. 自定义 values**
```bash
# 复制 values 文件
cp infrastructure/helm/cloudphone/values.yaml my-values.yaml

# 编辑配置
nano my-values.yaml
```

**关键配置项:**
```yaml
# 域名配置
ingress:
  enabled: true
  hosts:
    - host: api.cloudphone.example.com  # 修改为你的域名

# 数据库配置
postgresql:
  auth:
    password: your_secure_password  # 修改密码

# 资源配置
apiGateway:
  replicaCount: 3
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
```

**3. 安装 Helm Chart**
```bash
helm install cloudphone ./infrastructure/helm/cloudphone \
  -f my-values.yaml \
  --namespace cloudphone \
  --create-namespace
```

**4. 查看部署状态**
```bash
# 查看 Release
helm list -n cloudphone

# 查看 Pods
kubectl get pods -n cloudphone

# 查看服务
helm status cloudphone -n cloudphone
```

**5. 升级部署**
```bash
# 修改 my-values.yaml 后执行
helm upgrade cloudphone ./infrastructure/helm/cloudphone \
  -f my-values.yaml \
  -n cloudphone
```

**6. 回滚（如果需要）**
```bash
# 查看历史
helm history cloudphone -n cloudphone

# 回滚到上一个版本
helm rollback cloudphone -n cloudphone
```

**7. 卸载**
```bash
helm uninstall cloudphone -n cloudphone
```

---

## 监控部署

### 部署 Prometheus

**使用 Helm:**
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
```

**应用自定义配置:**
```bash
kubectl create configmap prometheus-config \
  --from-file=infrastructure/monitoring/prometheus/prometheus.yml \
  -n monitoring

kubectl create configmap prometheus-rules \
  --from-file=infrastructure/monitoring/prometheus/rules/alerts.yml \
  -n monitoring
```

### 访问 Grafana

```bash
# 获取 Grafana 密码
kubectl get secret -n monitoring prometheus-grafana \
  -o jsonpath="{.data.admin-password}" | base64 --decode

# 端口转发
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# 访问 http://localhost:3000
# 用户名: admin
# 密码: <上面获取的密码>
```

### 导入 Dashboard

1. 登录 Grafana
2. 点击 "+" → "Import"
3. 上传 `infrastructure/monitoring/grafana/dashboards/overview.json`

---

## CI/CD 设置

### GitHub Actions

项目已包含 CI/CD 工作流配置：
- `.github/workflows/ci.yml` - 持续集成
- `.github/workflows/cd.yml` - 持续部署

**配置 Secrets:**

在 GitHub 仓库设置中添加以下 Secrets:

| Secret Name | 说明 |
|-------------|------|
| `KUBE_CONFIG` | Kubernetes 配置文件（base64 编码） |
| `REGISTRY_USERNAME` | 镜像仓库用户名 |
| `REGISTRY_PASSWORD` | 镜像仓库密码 |

**获取 KUBE_CONFIG:**
```bash
cat ~/.kube/config | base64
```

---

## 域名和 SSL 配置

### 使用 cert-manager (Let's Encrypt)

**1. 安装 cert-manager:**
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

**2. 创建 ClusterIssuer:**
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com  # 修改为你的邮箱
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

```bash
kubectl apply -f cluster-issuer.yaml
```

**3. Ingress 自动配置 SSL:**

Ingress 已配置 cert-manager 注解，会自动申请证书。

---

## 性能优化建议

### 数据库优化

**PostgreSQL:**
```sql
-- 调整连接池
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '16MB';

-- 重启生效
SELECT pg_reload_conf();
```

### Redis 优化

```bash
# 编辑 Redis ConfigMap
kubectl edit configmap redis-config -n cloudphone

# 添加优化参数
maxmemory 512mb
maxmemory-policy allkeys-lru
save ""
```

### Nginx 优化

已在 `infrastructure/nginx/nginx.conf` 中配置：
- Gzip 压缩
- 静态文件缓存
- 连接池
- 限流

---

## 安全加固

### 1. 网络策略

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-gateway-policy
spec:
  podSelector:
    matchLabels:
      app: api-gateway
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx-ingress
    ports:
    - protocol: TCP
      port: 3000
```

### 2. Pod Security Policy

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  runAsUser:
    rule: MustRunAsNonRoot
  fsGroup:
    rule: RunAsAny
  seLinux:
    rule: RunAsAny
```

### 3. 定期备份

**数据库备份脚本:**
```bash
#!/bin/bash
kubectl exec -it postgres-0 -- pg_dump -U postgres cloudphone | \
  gzip > backup-$(date +%Y%m%d).sql.gz

# 上传到对象存储
aws s3 cp backup-$(date +%Y%m%d).sql.gz s3://your-bucket/backups/
```

**设置 CronJob:**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
spec:
  schedule: "0 2 * * *"  # 每天凌晨 2 点
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:14-alpine
            command: ["/bin/sh", "-c", "pg_dump ..."]
```

---

## 故障排查

### 常见问题

**1. Pod 无法启动**
```bash
# 查看 Pod 状态
kubectl describe pod <pod-name>

# 查看日志
kubectl logs <pod-name>

# 查看事件
kubectl get events --sort-by='.lastTimestamp'
```

**2. 数据库连接失败**
```bash
# 测试数据库连接
kubectl run -it --rm debug --image=postgres:14-alpine --restart=Never -- \
  psql -h postgres-service -U postgres -d cloudphone
```

**3. Ingress 无法访问**
```bash
# 检查 Ingress
kubectl describe ingress cloudphone-ingress

# 检查 Ingress Controller
kubectl logs -n ingress-nginx deploy/ingress-nginx-controller
```

---

## 扩容指南

### 水平扩容

**手动扩容:**
```bash
kubectl scale deployment api-gateway --replicas=5
```

**HPA 自动扩容:**

已配置在 `infrastructure/k8s/autoscaling/api-gateway-hpa.yaml`

### 垂直扩容

**修改资源限制:**
```bash
kubectl set resources deployment api-gateway \
  --limits=cpu=1000m,memory=1Gi \
  --requests=cpu=500m,memory=512Mi
```

---

## 监控指标

重点关注以下指标：

| 指标类别 | 关键指标 | 告警阈值 |
|---------|---------|----------|
| 服务可用性 | up | < 1 |
| QPS | http_requests_total | > 1000/s |
| 错误率 | 5xx errors | > 5% |
| 响应时间 | P95 latency | > 2s |
| CPU 使用 | cpu_usage | > 80% |
| 内存使用 | memory_usage | > 90% |
| 数据库连接 | db_connections | > 80% max |

---

## 联系支持

- 文档: https://docs.cloudphone.run
- 问题反馈: https://github.com/your-org/next-cloudphone/issues
- 技术支持: support@cloudphone.run

---

**版本**: 1.0
**最后更新**: 2025-01-20
