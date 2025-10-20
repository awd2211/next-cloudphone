# 云手机平台架构设计

## 1. 系统架构概览

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                     用户层                           │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ 管理后台      │  │ 用户端应用    │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
                        ↓ HTTPS
┌─────────────────────────────────────────────────────┐
│                  接入层                              │
│        Nginx/Kong + 负载均衡 + CDN                  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│                  API网关层                           │
│     [认证] [限流] [路由] [熔断] [监控]              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│                  业务服务层                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │用户服务   │ │设备服务   │ │应用服务   │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │流媒体服务 │ │调度服务   │ │计费服务   │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│                  数据层                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │PostgreSQL│ │  Redis   │ │ RabbitMQ │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐                                       │
│  │  MinIO   │                                       │
│  └──────────┘                                       │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│                 云手机底层                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Redroid  │ │Anbox Cloud│ │自定义方案 │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└─────────────────────────────────────────────────────┘
```

## 2. 核心模块设计

### 2.1 API 网关

**职责:**
- 统一入口，路由转发
- 认证授权 (JWT)
- 请求限流与熔断
- 日志记录与监控
- 跨域处理

**技术栈:** NestJS + Passport + JWT

**核心功能:**
```typescript
- POST /api/auth/login      # 用户登录
- POST /api/auth/register   # 用户注册
- GET  /api/auth/me         # 获取当前用户信息
- GET  /api/health          # 健康检查
```

### 2.2 设备服务

**职责:**
- 云手机实例管理 (CRUD)
- 设备状态监控
- 设备资源统计
- 设备分配与回收

**数据模型:**
```typescript
Device {
  id: string
  name: string
  status: 'online' | 'offline' | 'busy' | 'error'
  androidVersion: string
  specs: {
    cpu: string
    memory: string
    storage: string
  }
  tenantId: string  // 租户ID
  userId: string    // 当前使用用户
  createdAt: Date
  updatedAt: Date
}
```

### 2.3 流媒体服务

**职责:**
- WebRTC 信令服务
- 音视频流转发
- 录屏功能
- 传输质量控制

**技术栈:** Go + Pion WebRTC

**信令流程:**
```
客户端 --> Offer --> 信令服务器
信令服务器 --> Answer --> 客户端
ICE Candidate 交换
建立 P2P 连接
```

### 2.4 调度服务

**职责:**
- 设备资源调度
- 负载均衡算法
- 任务队列管理
- 定时任务

**调度算法:**
- **最少连接数**: 优先分配连接数最少的设备
- **加权轮询**: 根据设备性能分配权重
- **亲和性调度**: 同一用户优先分配到同一设备

### 2.5 计费服务

**职责:**
- 使用时长统计
- 费用计算
- 账单生成
- 支付对接

**计费模型:**
```
按时长: price = duration * unitPrice
按资源: price = (cpu * cpuPrice + memory * memPrice) * duration
套餐制: 固定月费/年费
```

## 3. 数据库设计

### 3.1 核心表结构

**users (用户表)**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  tenant_id UUID,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**devices (设备表)**
```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  android_version VARCHAR(20),
  cpu VARCHAR(50),
  memory VARCHAR(20),
  storage VARCHAR(20),
  tenant_id UUID,
  current_user_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (current_user_id) REFERENCES users(id)
);
```

**applications (应用表)**
```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  package_name VARCHAR(200) UNIQUE NOT NULL,
  version VARCHAR(20),
  icon_url TEXT,
  apk_url TEXT NOT NULL,
  size BIGINT,
  downloads INT DEFAULT 0,
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

### 3.2 多租户隔离

**策略选择:**

1. **共享表 + tenant_id** (推荐用于 SaaS)
   - 优点: 资源利用率高，易于维护
   - 缺点: 需要严格的数据隔离逻辑

2. **独立 Schema**
   - 优点: 隔离性好，支持定制
   - 缺点: 维护成本高

3. **独立数据库** (用于大客户私有化)
   - 优点: 完全隔离，性能独立
   - 缺点: 成本高

## 4. 高可用设计

### 4.1 服务高可用

- **服务多副本**: 每个微服务至少 3 个副本
- **健康检查**: Liveness & Readiness Probe
- **优雅关闭**: 处理完当前请求再退出
- **熔断降级**: Circuit Breaker 模式

### 4.2 数据高可用

- **PostgreSQL**: 主从复制 + 读写分离
- **Redis**: Sentinel 或 Cluster 模式
- **RabbitMQ**: 镜像队列
- **MinIO**: 分布式模式

### 4.3 灾备方案

- 定期数据库备份 (每日全量 + 增量)
- 跨可用区部署
- 异地容灾

## 5. 安全设计

### 5.1 认证授权

- JWT 令牌认证
- Token 刷新机制
- RBAC 权限控制
- API 签名验证

### 5.2 数据安全

- 敏感数据加密存储 (密码、密钥等)
- HTTPS 传输加密
- SQL 注入防护
- XSS 防护

### 5.3 网络安全

- 防火墙规则
- DDoS 防护
- 请求限流
- IP 白名单

## 6. 监控运维

### 6.1 监控指标

**服务监控:**
- QPS (每秒请求数)
- 响应时间 (P50, P95, P99)
- 错误率
- CPU/内存使用率

**业务监控:**
- 在线设备数
- 活跃用户数
- 设备利用率
- 收入统计

### 6.2 日志管理

**日志分类:**
- Access Log: 访问日志
- Error Log: 错误日志
- Audit Log: 审计日志
- Business Log: 业务日志

**日志聚合:**
```
应用 --> Filebeat --> Kafka --> Logstash --> Elasticsearch --> Kibana
```

### 6.3 告警规则

- 服务宕机告警
- 资源使用率告警 (CPU > 80%, Memory > 90%)
- 错误率告警 (> 5%)
- 响应时间告警 (P99 > 2s)

## 7. 性能优化

### 7.1 缓存策略

**多级缓存:**
```
浏览器缓存 --> CDN --> Nginx --> 应用缓存 --> Redis --> 数据库
```

**缓存场景:**
- 用户信息缓存 (TTL: 30min)
- 设备状态缓存 (TTL: 1min)
- 应用列表缓存 (TTL: 1h)

### 7.2 数据库优化

- 索引优化
- 慢查询分析
- 连接池配置
- 分库分表 (超大规模时)

### 7.3 接口优化

- 批量接口
- 分页查询
- GraphQL (按需查询)
- gRPC (内部通信)

## 8. 扩展性设计

### 8.1 水平扩展

- 无状态服务设计
- 负载均衡
- 数据分片

### 8.2 垂直扩展

- 服务拆分
- 数据库升配
- 缓存升配

### 8.3 弹性伸缩

```yaml
# Kubernetes HPA 示例
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 9. 部署架构

### 9.1 Kubernetes 部署

```
Ingress Controller (Nginx)
    ↓
Services (ClusterIP)
    ↓
Deployments (Pods)
    ↓
Persistent Volumes (数据持久化)
```

### 9.2 命名空间划分

- `cloudphone-prod`: 生产环境
- `cloudphone-staging`: 预发布环境
- `cloudphone-dev`: 开发环境

### 9.3 CI/CD 流程

```
代码提交 --> GitLab CI --> 构建镜像 --> 推送镜像仓库
    --> 部署到测试环境 --> 自动化测试
    --> 人工审批 --> 部署到生产环境
```

## 10. 技术选型理由

| 技术 | 选型理由 |
|------|----------|
| NestJS | TypeScript 全栈、模块化、依赖注入、装饰器支持 |
| Go | 高并发、低延迟、适合流媒体服务 |
| Python | 快速开发、丰富的调度库 (Celery) |
| PostgreSQL | 功能强大、支持 JSON、事务性强 |
| Redis | 高性能缓存、支持多种数据结构 |
| RabbitMQ | 消息可靠性高、支持多种消息模式 |
| Kubernetes | 容器编排标准、生态完善 |
| WebRTC | 点对点通信、低延迟 |

---

**版本**: 1.0
**最后更新**: 2025-01-20
