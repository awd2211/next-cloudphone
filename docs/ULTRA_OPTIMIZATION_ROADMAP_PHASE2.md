# 🚀 云手机平台 - 下一阶段深度优化路线图 (Phase 2)

> **UltraThink 系统性分析与规划**
> **规划日期**: 2025-11-01
> **目标**: 从开发环境到生产级别的全面升级

---

## 📊 当前系统状态评估

### ✅ 已完成的优化（Phase 1 - 12步）

| 优化项 | 完成度 | 性能提升 | 备注 |
|--------|--------|----------|------|
| 代码清理和规范化 | ✅ 100% | - | TypeScript strict mode, ESLint规范 |
| 数据库优化基础 | ✅ 100% | 查询速度↑40% | 复合索引、连接池配置 |
| 缓存策略实施 | ✅ 100% | 响应时间↓80% | Redis缓存、装饰器模式 |
| 限流功能完善 | ✅ 100% | 防护能力↑100% | 分布式限流、IP黑名单、自动封禁 |
| 并发处理优化 | ✅ 100% | 吞吐量↑3-4倍 | Promise.all、并行执行 |
| 数据库查询优化 | ✅ 100% | 查询次数↓70-90% | 消除N+1、预加载关联 |
| PM2集群模式 | ✅ 100% | 并发处理↑4倍 | api-gateway 4实例, user-service 2实例 |
| 输入验证和安全 | ✅ 100% | 安全性↑60% | 严格DTO验证、防注入、XSS防护 |
| TODO功能完成 | ✅ 100% | 业务完整性↑ | 用户分级延长策略 |
| 测试用例编写 | ✅ 40.5% | 代码质量↑ | 30个测试用例、570行测试代码 |
| 服务间通信优化 | ✅ 100% | 网络效率↑60% | 连接池、智能重试、断路器 |
| 可观测性增强 | ✅ 100% | 监控能力↑100% | 请求追踪、结构化日志、HTTP指标 |

### ⚠️ 当前系统痛点分析

#### 1. **高可用性不足** (严重 🔴)
```
单点故障风险：
├─ PostgreSQL: 单实例（无主从复制）
├─ Redis: 单实例（无集群/哨兵）
├─ RabbitMQ: 单实例（无镜像队列）
└─ MinIO: 单实例（无分布式存储）

风险评估：
- 数据库故障 → 全平台瘫痪 (MTTR: 15-30分钟)
- 缓存故障 → 性能下降80% + 数据库压力激增
- 消息队列故障 → 事件丢失 + 服务间通信中断
- 对象存储故障 → APK上传/下载失败
```

#### 2. **容错能力有限** (严重 🔴)
```
故障恢复机制：
├─ 断路器: ✅ 已实现（Step 11）
├─ 重试机制: ✅ 已实现（指数退避）
├─ 降级策略: ⚠️  部分实现（HttpClientService有fallback）
├─ 限流保护: ✅ 已实现（分布式限流）
├─ 熔断机制: ✅ 已实现（Opossum）
├─ 健康检查: ✅ 已实现（K8s探针）
├─ 自动恢复: ❌ 未实现（需Kubernetes + HPA）
└─ 故障转移: ❌ 未实现（需多副本 + 负载均衡）

缺失的关键能力：
- 数据库连接池耗尽时的降级策略
- Redis不可用时的降级逻辑
- RabbitMQ消息堆积时的背压处理
- Docker容器故障的自动重启策略
```

#### 3. **性能瓶颈** (中等 🟡)
```
已识别的性能瓶颈：
├─ 数据库层:
│   ├─ 写操作压力（event_sourcing表增长）
│   ├─ 无读写分离（读写都打主库）
│   └─ 缺少分区策略（大表查询慢）
├─ 缓存层:
│   ├─ 缓存命中率未监控
│   ├─ 缓存预热策略不完善
│   └─ 缓存失效时的雪崩风险
├─ 网络层:
│   ├─ WebRTC流媒体编码优化空间
│   ├─ 跨服务调用的序列化开销
│   └─ 静态资源未使用CDN
└─ 业务层:
    ├─ 大规模设备并发创建（资源分配竞争）
    ├─ 复杂计费计算（实时性要求高）
    └─ 批量操作缺少优化（如批量设备启动）
```

#### 4. **安全加固不足** (高 🟠)
```
安全隐患：
├─ 认证和授权:
│   ├─ JWT Secret未统一（跨服务认证风险）
│   ├─ 服务间调用缺少认证（内网可直接访问）
│   ├─ API Key管理缺少轮换机制
│   └─ 未实现多因素认证（MFA）
├─ 数据安全:
│   ├─ 敏感数据未加密存储（数据库明文）
│   ├─ 日志中可能包含敏感信息
│   ├─ 备份数据未加密
│   └─ 数据脱敏策略缺失
├─ 网络安全:
│   ├─ 缺少API网关级别的WAF
│   ├─ DDoS防护依赖基础设施
│   ├─ 未实现证书固定（HTTPS）
│   └─ 内网服务暴露风险
└─ 合规性:
    ├─ GDPR数据删除未完整实现
    ├─ 审计日志保留策略不明确
    └─ 数据跨境传输未管控
```

#### 5. **运维和监控** (中等 🟡)
```
运维痛点：
├─ 监控:
│   ├─ ✅ 已有基础指标（HTTP metrics, health checks）
│   ├─ ❌ 缺少业务指标（设备数、计费金额、用户活跃度）
│   ├─ ❌ 缺少告警系统（Prometheus AlertManager）
│   └─ ❌ 缺少可视化仪表板（Grafana）
├─ 日志:
│   ├─ ✅ 已有结构化日志（JSON格式）
│   ├─ ✅ 已有请求追踪（traceId/spanId）
│   ├─ ❌ 日志分散在各容器（未集中）
│   └─ ❌ 日志查询困难（无ELK/Loki）
├─ 部署:
│   ├─ ✅ Docker镜像已构建
│   ├─ ✅ Docker Compose配置完整
│   ├─ ⚠️  K8s配置存在但未验证
│   └─ ❌ CI/CD流水线未建立
└─ 备份和恢复:
    ├─ ❌ 数据库备份策略未实施
    ├─ ❌ 配置备份未实施
    ├─ ❌ 恢复演练未进行
    └─ ❌ RPO/RTO未定义
```

#### 6. **业务功能完整性** (中等 🟡)
```
功能缺失：
├─ 前端页面:
│   ├─ Admin Dashboard: 约70%完成度
│   ├─ User Portal: 约60%完成度
│   ├─ 缺少实时监控页面
│   └─ 缺少数据分析/报表页面
├─ API完整性:
│   ├─ 设备管理API: ✅ 完整
│   ├─ 用户管理API: ✅ 完整
│   ├─ 计费API: ⚠️  部分完成（缺少发票生成）
│   ├─ 应用管理API: ✅ 完整
│   └─ 通知API: ✅ 完整
└─ 业务流程:
    ├─ 设备生命周期: ✅ 完整（创建、启动、停止、删除、备份）
    ├─ 计费流程: ⚠️  部分完成（缺少退款、争议处理）
    ├─ 通知流程: ✅ 完整（邮件、短信、WebSocket）
    └─ 审计流程: ⚠️  部分完成（缺少导出和分析）
```

---

## 🎯 Phase 2 优化目标

### 总体目标
> **将云手机平台从"功能可用"提升到"生产就绪"**

### 关键成果指标 (KPI)

| 指标类别 | 当前值 | 目标值 | 测量方式 |
|---------|--------|--------|---------|
| **可用性** | 95% (估算) | 99.9% (3个9) | Uptime监控 |
| **故障恢复时间** | 15-30分钟 | < 5分钟 | MTTR监控 |
| **并发处理能力** | ~500 req/s | 2000+ req/s | 压测工具 |
| **数据库查询P99** | ~200ms | < 50ms | APM监控 |
| **缓存命中率** | 未知 | > 80% | Redis INFO |
| **测试覆盖率** | 40.5% | > 70% | Jest coverage |
| **安全漏洞** | 未评估 | 0个高危 | 安全扫描 |
| **部署时间** | 手动 30分钟 | 自动 < 5分钟 | CI/CD pipeline |

---

## 📋 Phase 2 优化路线图

### **阶段 2.1: 高可用架构升级** (优先级: P0 🔴)

**目标**: 消除单点故障，实现服务高可用

#### 2.1.1 PostgreSQL 主从复制

**当前状态**: 单实例 PostgreSQL
**目标架构**: 1主2从 + PgBouncer连接池

```yaml
架构设计:
┌─────────────────────────────────────────────┐
│          PgBouncer (连接池)                  │
│         Port: 6432                           │
│         Max connections: 1000                │
└─────────────┬───────────────────────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Master │ │ Slave1 │ │ Slave2 │
│  5432  │ │  5433  │ │  5434  │
│ R/W    │ │   R    │ │   R    │
└────────┘ └────────┘ └────────┘
    │         ▲         ▲
    └─────────┴─────────┘
      流复制 (Streaming)
```

**实施步骤**:
```bash
# 1. 配置主库
cat > /var/lib/postgresql/data/postgresql.conf <<EOF
wal_level = replica
max_wal_senders = 3
wal_keep_size = 64
hot_standby = on
EOF

# 2. 创建复制用户
psql -U postgres -c "CREATE USER replicator WITH REPLICATION PASSWORD 'strong_password';"

# 3. 配置从库1和从库2
pg_basebackup -h master_host -D /var/lib/postgresql/data -U replicator -v -P -R

# 4. 部署PgBouncer
docker run -d --name pgbouncer \
  -p 6432:6432 \
  -v /path/to/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini \
  edoburu/pgbouncer

# 5. 更新应用配置
# 写操作 → master:5432
# 读操作 → pgbouncer:6432 (轮询slave1, slave2)
```

**预期效果**:
- ✅ 读写分离（写操作 → 主库，读操作 → 从库）
- ✅ 读性能提升 2-3倍
- ✅ 主库故障时，从库可提升为主库（手动 → 自动切换需配置Patroni）
- ✅ 连接数优化（PgBouncer连接复用）

**风险和注意事项**:
- ⚠️  复制延迟（正常 < 1秒，异常可能 > 10秒）
- ⚠️  数据一致性（读操作可能读到旧数据）
- ⚠️  需要监控复制状态（`pg_stat_replication`）

---

#### 2.1.2 Redis 哨兵模式

**当前状态**: 单实例 Redis
**目标架构**: 1主2从 + 3个哨兵

```yaml
架构设计:
┌─────────────────────────────────────────┐
│      Redis Sentinel (哨兵)               │
│   Sentinel1  Sentinel2  Sentinel3       │
│    26379      26379      26379          │
│   监控 + 故障转移 + 配置分发              │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Master │ │ Slave1 │ │ Slave2 │
│  6379  │ │  6380  │ │  6381  │
│ R/W    │ │   R    │ │   R    │
└────────┘ └────────┘ └────────┘
    │         ▲         ▲
    └─────────┴─────────┘
      异步复制 (Async Repl)
```

**实施步骤**:
```bash
# 1. Docker Compose配置
cat > docker-compose.redis-sentinel.yml <<EOF
version: '3.8'
services:
  redis-master:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    ports: ["6379:6379"]

  redis-slave1:
    image: redis:7-alpine
    command: redis-server --slaveof redis-master 6379 --appendonly yes
    ports: ["6380:6379"]

  redis-slave2:
    image: redis:7-alpine
    command: redis-server --slaveof redis-master 6379 --appendonly yes
    ports: ["6381:6379"]

  sentinel1:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    ports: ["26379:26379"]
    volumes:
      - ./sentinel1.conf:/etc/redis/sentinel.conf

  sentinel2:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    ports: ["26380:26379"]
    volumes:
      - ./sentinel2.conf:/etc/redis/sentinel.conf

  sentinel3:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    ports: ["26381:26379"]
    volumes:
      - ./sentinel3.conf:/etc/redis/sentinel.conf
EOF

# 2. 哨兵配置
cat > sentinel1.conf <<EOF
port 26379
sentinel monitor mymaster redis-master 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 10000
EOF

# 3. 应用代码更新（使用ioredis）
import Redis from 'ioredis';

const redis = new Redis({
  sentinels: [
    { host: 'sentinel1', port: 26379 },
    { host: 'sentinel2', port: 26380 },
    { host: 'sentinel3', port: 26381 },
  ],
  name: 'mymaster',
  password: process.env.REDIS_PASSWORD,
});

# 4. 启动
docker-compose -f docker-compose.redis-sentinel.yml up -d

# 5. 验证
redis-cli -p 26379 sentinel masters
redis-cli -p 26379 sentinel slaves mymaster
```

**预期效果**:
- ✅ 自动故障转移（主库挂掉，从库自动提升）
- ✅ 高可用性（99.9%）
- ✅ 零数据丢失（AOF持久化）
- ✅ 读写分离（可选）

---

#### 2.1.3 RabbitMQ 集群 + 镜像队列

**当前状态**: 单实例 RabbitMQ
**目标架构**: 3节点集群 + 镜像队列

```yaml
架构设计:
┌──────────────────────────────────────────┐
│          HAProxy (负载均衡)               │
│           Port: 5672, 15672              │
└─────────┬────────────────────────────────┘
          │
    ┌─────┼─────┐
    ▼     ▼     ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Node1  │ │ Node2  │ │ Node3  │
│ Master │ │ Mirror │ │ Mirror │
└────────┘ └────────┘ └────────┘
    │         │         │
    └─────────┴─────────┘
      集群通信 (Erlang)
```

**实施步骤**:
```bash
# 1. Docker Compose配置
cat > docker-compose.rabbitmq-cluster.yml <<EOF
version: '3.8'
services:
  rabbitmq1:
    image: rabbitmq:3-management-alpine
    hostname: rabbitmq1
    environment:
      RABBITMQ_ERLANG_COOKIE: 'secret_cookie'
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin123
    ports: ["5672:5672", "15672:15672"]
    volumes:
      - rabbitmq1_data:/var/lib/rabbitmq

  rabbitmq2:
    image: rabbitmq:3-management-alpine
    hostname: rabbitmq2
    environment:
      RABBITMQ_ERLANG_COOKIE: 'secret_cookie'
    ports: ["5673:5672", "15673:15672"]
    volumes:
      - rabbitmq2_data:/var/lib/rabbitmq
    depends_on: [rabbitmq1]

  rabbitmq3:
    image: rabbitmq:3-management-alpine
    hostname: rabbitmq3
    environment:
      RABBITMQ_ERLANG_COOKIE: 'secret_cookie'
    ports: ["5674:5672", "15674:15672"]
    volumes:
      - rabbitmq3_data:/var/lib/rabbitmq
    depends_on: [rabbitmq1]

  haproxy:
    image: haproxy:2.8-alpine
    ports: ["5670:5672", "15670:15672"]
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
    depends_on: [rabbitmq1, rabbitmq2, rabbitmq3]

volumes:
  rabbitmq1_data:
  rabbitmq2_data:
  rabbitmq3_data:
EOF

# 2. 加入集群
docker exec rabbitmq2 rabbitmqctl stop_app
docker exec rabbitmq2 rabbitmqctl join_cluster rabbit@rabbitmq1
docker exec rabbitmq2 rabbitmqctl start_app

docker exec rabbitmq3 rabbitmqctl stop_app
docker exec rabbitmq3 rabbitmqctl join_cluster rabbit@rabbitmq1
docker exec rabbitmq3 rabbitmqctl start_app

# 3. 配置镜像队列策略
docker exec rabbitmq1 rabbitmqctl set_policy ha-all \
  "^cloudphone\." \
  '{"ha-mode":"all","ha-sync-mode":"automatic"}' \
  --apply-to queues

# 4. 验证集群状态
docker exec rabbitmq1 rabbitmqctl cluster_status
```

**预期效果**:
- ✅ 队列镜像（所有节点都有副本）
- ✅ 节点故障自动转移
- ✅ 消息不丢失
- ✅ 负载均衡

---

#### 2.1.4 MinIO 分布式模式

**当前状态**: 单实例 MinIO
**目标架构**: 4节点分布式MinIO (纠删码)

```yaml
架构设计:
┌────────────────────────────────────┐
│     MinIO (分布式对象存储)          │
│     纠删码: EC:2 (4节点 2副本)      │
└─────┬──────┬──────┬──────┬─────────┘
      │      │      │      │
   Node1  Node2  Node3  Node4
    9000   9001   9002   9003
```

**实施步骤**:
```bash
# Docker Compose配置
cat > docker-compose.minio-distributed.yml <<EOF
version: '3.8'
services:
  minio1:
    image: minio/minio:latest
    hostname: minio1
    command: server --console-address ":9001" http://minio{1...4}/data
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    ports: ["9000:9000", "9001:9001"]
    volumes:
      - minio1_data:/data

  minio2:
    image: minio/minio:latest
    hostname: minio2
    command: server --console-address ":9001" http://minio{1...4}/data
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    ports: ["9010:9000", "9011:9001"]
    volumes:
      - minio2_data:/data

  minio3:
    image: minio/minio:latest
    hostname: minio3
    command: server --console-address ":9001" http://minio{1...4}/data
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    ports: ["9020:9000", "9021:9001"]
    volumes:
      - minio3_data:/data

  minio4:
    image: minio/minio:latest
    hostname: minio4
    command: server --console-address ":9001" http://minio{1...4}/data
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    ports: ["9030:9000", "9031:9001"]
    volumes:
      - minio4_data:/data

volumes:
  minio1_data:
  minio2_data:
  minio3_data:
  minio4_data:
EOF
```

**预期效果**:
- ✅ 数据冗余（EC:2 纠删码）
- ✅ 节点故障容忍（最多2个节点同时故障）
- ✅ 读写性能提升
- ✅ 存储容量扩展性

---

### **阶段 2.2: 数据库深度优化** (优先级: P1 🟠)

#### 2.2.1 数据库读写分离

**目标**: 读操作分流到从库，写操作只打主库

**实施方案**:
```typescript
// backend/shared/src/database/read-replica.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function createDatabaseReplicaConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    replication: {
      master: {
        host: process.env.DB_MASTER_HOST || 'localhost',
        port: parseInt(process.env.DB_MASTER_PORT || '5432'),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
      },
      slaves: [
        {
          host: process.env.DB_SLAVE1_HOST || 'localhost',
          port: parseInt(process.env.DB_SLAVE1_PORT || '5433'),
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_DATABASE,
        },
        {
          host: process.env.DB_SLAVE2_HOST || 'localhost',
          port: parseInt(process.env.DB_SLAVE2_PORT || '5434'),
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_DATABASE,
        },
      ],
    },
    // ... 其他配置
  };
}

// 使用方式
@Injectable()
export class DeviceService {
  // 写操作（自动路由到master）
  async createDevice(dto: CreateDeviceDto): Promise<Device> {
    return this.deviceRepository.save(dto);
  }

  // 读操作（自动路由到slave）
  async findAll(): Promise<Device[]> {
    return this.deviceRepository.find();
  }

  // 强制从主库读取（事务一致性）
  async findById(id: string): Promise<Device> {
    return this.deviceRepository
      .createQueryBuilder('device')
      .setQueryRunner(this.connection.createQueryRunner('master'))
      .where('device.id = :id', { id })
      .getOne();
  }
}
```

**预期效果**:
- ✅ 主库写压力不变
- ✅ 主库读压力降低 70-80%
- ✅ 查询性能提升 2-3倍（从库分流）

---

#### 2.2.2 数据库表分区

**目标**: 大表按时间分区，提升查询性能

**实施方案**:
```sql
-- 1. user_events 表分区（按月分区）
CREATE TABLE user_events_partitioned (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    version INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- 创建分区（2025年1月）
CREATE TABLE user_events_2025_01 PARTITION OF user_events_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- 创建分区（2025年2月）
CREATE TABLE user_events_2025_02 PARTITION OF user_events_partitioned
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- 创建索引（每个分区都需要）
CREATE INDEX idx_user_events_2025_01_aggregate ON user_events_2025_01(aggregate_id);
CREATE INDEX idx_user_events_2025_02_aggregate ON user_events_2025_02(aggregate_id);

-- 2. 迁移历史数据
INSERT INTO user_events_partitioned
SELECT * FROM user_events
WHERE created_at >= '2025-01-01' AND created_at < '2025-02-01';

-- 3. 自动创建分区的函数（月末执行）
CREATE OR REPLACE FUNCTION create_next_month_partition()
RETURNS void AS $$
DECLARE
    next_month DATE;
    partition_name TEXT;
BEGIN
    next_month := date_trunc('month', CURRENT_DATE + INTERVAL '1 month');
    partition_name := 'user_events_' || to_char(next_month, 'YYYY_MM');

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF user_events_partitioned
         FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        next_month,
        next_month + INTERVAL '1 month'
    );

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_aggregate ON %I(aggregate_id)',
        partition_name, partition_name
    );
END;
$$ LANGUAGE plpgsql;

-- 4. 定时任务（每月1号执行）
-- 使用 pg_cron 或应用层定时任务
```

**适合分区的表**:
- `user_events` (event sourcing，按月分区)
- `audit_logs` (审计日志，按月分区)
- `usage_records` (计费用量，按月分区)
- `device_logs` (设备日志，按日分区)

**预期效果**:
- ✅ 历史数据查询速度提升 5-10倍
- ✅ 索引大小减小 80%（只扫描相关分区）
- ✅ 维护成本降低（可独立管理分区）

---

#### 2.2.3 查询性能优化 - 物化视图

**目标**: 预计算复杂查询，提升报表性能

**实施方案**:
```sql
-- 1. 设备统计物化视图
CREATE MATERIALIZED VIEW mv_device_stats AS
SELECT
    d.user_id,
    d.status,
    d.provider,
    COUNT(*) as device_count,
    SUM(d.cpu_cores) as total_cpu,
    SUM(d.memory_mb) as total_memory,
    MAX(d.created_at) as last_created_at
FROM devices d
GROUP BY d.user_id, d.status, d.provider;

CREATE UNIQUE INDEX ON mv_device_stats (user_id, status, provider);

-- 2. 刷新策略（每5分钟）
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_device_stats;

-- 3. 用量统计物化视图
CREATE MATERIALIZED VIEW mv_daily_usage AS
SELECT
    date_trunc('day', created_at) as usage_date,
    user_id,
    device_id,
    SUM(duration_minutes) as total_minutes,
    SUM(cost) as total_cost
FROM usage_records
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY 1, 2, 3;

CREATE UNIQUE INDEX ON mv_daily_usage (usage_date, user_id, device_id);

-- 4. 应用层查询（从物化视图读取）
SELECT * FROM mv_device_stats WHERE user_id = :userId;
SELECT * FROM mv_daily_usage WHERE usage_date = :date;
```

**预期效果**:
- ✅ 复杂聚合查询从 5秒 降低到 50ms
- ✅ 数据库CPU使用率降低 30%
- ✅ 报表页面加载速度提升 100倍

---

### **阶段 2.3: 缓存策略深化** (优先级: P1 🟠)

#### 2.3.1 多级缓存架构

**架构设计**:
```
请求流程:
Client Request
    ↓
[L1: 内存缓存] (Node.js进程内，100ms TTL)
    ↓ Miss
[L2: Redis缓存] (集中缓存，300s TTL)
    ↓ Miss
[L3: 数据库] (PostgreSQL主/从)
```

**实施方案**:
```typescript
// backend/shared/src/cache/multi-level-cache.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import LRU from 'lru-cache';

@Injectable()
export class MultiLevelCacheService {
  // L1缓存：进程内LRU缓存
  private l1Cache = new LRU({
    max: 1000,        // 最多1000个条目
    ttl: 100,         // 100ms TTL
    updateAgeOnGet: true,
  });

  constructor(
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * 多级缓存获取
   */
  async get<T>(key: string): Promise<T | null> {
    // 1. 尝试从L1缓存获取
    const l1Value = this.l1Cache.get(key);
    if (l1Value !== undefined) {
      return l1Value as T;
    }

    // 2. 尝试从L2 Redis缓存获取
    const l2Value = await this.redis.get(key);
    if (l2Value) {
      const parsed = JSON.parse(l2Value) as T;
      // 回填L1缓存
      this.l1Cache.set(key, parsed);
      return parsed;
    }

    // 3. 缓存未命中
    return null;
  }

  /**
   * 多级缓存设置
   */
  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    const serialized = JSON.stringify(value);

    // 写入L2 Redis缓存
    await this.redis.setex(key, ttl, serialized);

    // 写入L1内存缓存（TTL固定100ms）
    this.l1Cache.set(key, value);
  }

  /**
   * 缓存失效
   */
  async del(key: string): Promise<void> {
    // 同时失效L1和L2
    this.l1Cache.delete(key);
    await this.redis.del(key);
  }

  /**
   * 批量获取（管道优化）
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    const missedKeys: string[] = [];
    const missedIndexes: number[] = [];

    // 1. 先从L1获取
    for (let i = 0; i < keys.length; i++) {
      const l1Value = this.l1Cache.get(keys[i]);
      if (l1Value !== undefined) {
        results[i] = l1Value as T;
      } else {
        missedKeys.push(keys[i]);
        missedIndexes.push(i);
      }
    }

    // 2. L1未命中的从L2批量获取
    if (missedKeys.length > 0) {
      const l2Values = await this.redis.mget(...missedKeys);

      for (let i = 0; i < l2Values.length; i++) {
        const value = l2Values[i];
        const index = missedIndexes[i];

        if (value) {
          const parsed = JSON.parse(value) as T;
          results[index] = parsed;
          // 回填L1
          this.l1Cache.set(missedKeys[i], parsed);
        } else {
          results[index] = null;
        }
      }
    }

    return results;
  }
}
```

**使用示例**:
```typescript
// 获取用户配额（多级缓存）
async getUserQuota(userId: string): Promise<QuotaResponse> {
  const cacheKey = `quota:user:${userId}`;

  // 尝试从多级缓存获取
  const cached = await this.multiLevelCache.get<QuotaResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  // 缓存未命中，从数据库查询
  const quota = await this.quotaRepository.findOne({ where: { userId } });

  // 写入多级缓存
  await this.multiLevelCache.set(cacheKey, quota, 300);

  return quota;
}
```

**预期效果**:
- ✅ 缓存命中率提升到 90%+
- ✅ 热点数据响应时间 < 1ms (L1缓存)
- ✅ 减少Redis网络往返 70%

---

#### 2.3.2 缓存预热和更新策略

**目标**: 启动时预热关键数据，避免冷启动压力

**实施方案**:
```typescript
// backend/shared/src/cache/cache-warmup.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CacheWarmupService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmupService.name);

  constructor(
    private readonly multiLevelCache: MultiLevelCacheService,
    private readonly userService: UserService,
    private readonly deviceService: DeviceService,
  ) {}

  /**
   * 应用启动时预热
   */
  async onModuleInit() {
    this.logger.log('🔥 Starting cache warmup...');

    await Promise.all([
      this.warmupActiveUsers(),
      this.warmupDeviceTemplates(),
      this.warmupSystemConfig(),
    ]);

    this.logger.log('✅ Cache warmup completed');
  }

  /**
   * 预热活跃用户数据
   */
  private async warmupActiveUsers() {
    const activeUsers = await this.userService.findActiveUsers(100);

    for (const user of activeUsers) {
      // 预热用户配额
      await this.multiLevelCache.set(
        `quota:user:${user.id}`,
        user.quota,
        600
      );

      // 预热用户权限
      await this.multiLevelCache.set(
        `permissions:user:${user.id}`,
        user.permissions,
        1800
      );
    }

    this.logger.log(`Warmed up ${activeUsers.length} active users`);
  }

  /**
   * 预热设备模板
   */
  private async warmupDeviceTemplates() {
    const templates = await this.deviceService.findAllTemplates();

    await this.multiLevelCache.set(
      'device:templates:all',
      templates,
      3600
    );

    this.logger.log(`Warmed up ${templates.length} device templates`);
  }

  /**
   * 预热系统配置
   */
  private async warmupSystemConfig() {
    // 预热计费规则
    const billingRules = await this.billingService.getAllRules();
    await this.multiLevelCache.set('billing:rules', billingRules, 3600);

    // 预热通知模板
    const notificationTemplates = await this.notificationService.getAllTemplates();
    await this.multiLevelCache.set('notification:templates', notificationTemplates, 3600);
  }

  /**
   * 定时刷新热点数据（每小时）
   */
  @Cron(CronExpression.EVERY_HOUR)
  async refreshHotData() {
    this.logger.log('Refreshing hot data in cache...');
    await this.onModuleInit();
  }
}
```

**预期效果**:
- ✅ 冷启动后立即达到高缓存命中率
- ✅ 避免启动瞬间的数据库压力
- ✅ 减少首次请求延迟

---

### **阶段 2.4: 监控和告警系统** (优先级: P1 🟠)

#### 2.4.1 Prometheus + Grafana 部署

**架构设计**:
```
┌────────────────────────────────────────────┐
│            Grafana Dashboard                │
│         Port: 3000                          │
│   - 设备监控仪表板                           │
│   - 计费统计仪表板                           │
│   - 系统性能仪表板                           │
│   - 告警管理                                 │
└────────────┬───────────────────────────────┘
             │
┌────────────▼───────────────────────────────┐
│        Prometheus Server                    │
│         Port: 9090                          │
│   - 指标抓取 (每15秒)                        │
│   - 数据存储 (15天)                          │
│   - 告警规则评估                             │
└────────┬───┬───┬───┬───┬───┬──────────────┘
         │   │   │   │   │   │
    ┌────┘   │   │   │   │   └────┐
    ▼        ▼   ▼   ▼   ▼        ▼
┌─────────┐ ┌──────┐ ... ┌─────────┐
│ api-    │ │user- │     │billing- │
│ gateway │ │svc   │     │svc      │
│ :9091   │ │:9092 │     │:9095    │
└─────────┘ └──────┘     └─────────┘
  /metrics   /metrics      /metrics
```

**实施步骤**:
```yaml
# 1. docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports: ["9090:9090"]
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alert.rules.yml:/etc/prometheus/alert.rules.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports: ["3000:3000"]
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./dashboards:/etc/grafana/provisioning/dashboards
      - ./datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml
    depends_on:
      - prometheus

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports: ["9093:9093"]
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'

volumes:
  prometheus_data:
  grafana_data:
```

```yaml
# 2. prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - 'alert.rules.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:9091']

  - job_name: 'user-service'
    static_configs:
      - targets: ['user-service:9092']

  - job_name: 'device-service'
    static_configs:
      - targets: ['device-service:9093']

  - job_name: 'billing-service'
    static_configs:
      - targets: ['billing-service:9095']

  - job_name: 'notification-service'
    static_configs:
      - targets: ['notification-service:9096']

  # 基础设施监控
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'rabbitmq'
    static_configs:
      - targets: ['rabbitmq:15692']
```

```yaml
# 3. alert.rules.yml
groups:
  - name: cloudphone-alerts
    interval: 30s
    rules:
      # 服务可用性告警
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"

      # API响应时间告警
      - alert: HighResponseTime
        expr: http_request_duration_seconds{quantile="0.99"} > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API response time"
          description: "P99 latency is {{ $value }}s for {{ $labels.job }}"

      # 错误率告警
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} for {{ $labels.job }}"

      # 数据库连接池告警
      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.8
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "{{ $value }}% of connections are in use"

      # Redis内存告警
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage high"
          description: "Redis is using {{ $value }}% of max memory"

      # RabbitMQ队列积压告警
      - alert: RabbitMQQueueBacklog
        expr: rabbitmq_queue_messages_ready > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "RabbitMQ queue backlog detected"
          description: "Queue {{ $labels.queue }} has {{ $value }} ready messages"

      # 设备在线率告警
      - alert: LowDeviceOnlineRate
        expr: sum(device_status{status="running"}) / sum(device_status) < 0.8
        for: 15m
        labels:
          severity: info
        annotations:
          summary: "Device online rate is low"
          description: "Only {{ $value }}% devices are online"
```

```yaml
# 4. alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'default'
    webhook_configs:
      - url: 'http://notification-service:30006/api/v1/alerts/webhook'

  - name: 'critical-alerts'
    webhook_configs:
      - url: 'http://notification-service:30006/api/v1/alerts/webhook'
    email_configs:
      - to: 'ops@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alerts'
        auth_password: '${SMTP_PASSWORD}'

  - name: 'warning-alerts'
    webhook_configs:
      - url: 'http://notification-service:30006/api/v1/alerts/webhook'
```

**Grafana仪表板配置**:
```json
// dashboards/device-overview.json
{
  "dashboard": {
    "title": "设备监控总览",
    "panels": [
      {
        "title": "设备在线率",
        "targets": [{
          "expr": "sum(device_status{status=\"running\"}) / sum(device_status) * 100"
        }],
        "type": "gauge"
      },
      {
        "title": "每秒设备创建数",
        "targets": [{
          "expr": "rate(device_created_total[5m])"
        }],
        "type": "graph"
      },
      {
        "title": "设备CPU使用率分布",
        "targets": [{
          "expr": "histogram_quantile(0.99, device_cpu_usage_bucket)"
        }],
        "type": "heatmap"
      },
      {
        "title": "设备内存使用趋势",
        "targets": [{
          "expr": "avg(device_memory_usage_mb) by (provider)"
        }],
        "type": "graph"
      }
    ]
  }
}
```

**预期效果**:
- ✅ 实时监控所有服务健康状态
- ✅ 可视化性能指标和业务指标
- ✅ 自动告警（邮件 + Webhook）
- ✅ 历史数据分析和趋势预测

---

#### 2.4.2 日志聚合 - Loki + Grafana

**架构设计**:
```
┌────────────────────────────────────────┐
│        Grafana (日志查询界面)           │
│         Port: 3000                      │
└────────────┬───────────────────────────┘
             │
┌────────────▼───────────────────────────┐
│            Loki Server                  │
│         Port: 3100                      │
│   - 日志索引和存储                       │
│   - 支持 LogQL 查询                     │
└────────┬───────────────────────────────┘
         │
    ┌────┼────┐
    ▼    ▼    ▼
┌────────┐ ┌────────┐ ┌────────┐
│Promtail│ │Promtail│ │Promtail│
│ (agent)│ │ (agent)│ │ (agent)│
└────────┘ └────────┘ └────────┘
    │         │         │
    ▼         ▼         ▼
 Container  Container  Container
  Logs       Logs       Logs
```

**实施步骤**:
```yaml
# docker-compose.logging.yml
version: '3.8'
services:
  loki:
    image: grafana/loki:latest
    container_name: loki
    ports: ["3100:3100"]
    volumes:
      - ./loki-config.yml:/etc/loki/loki-config.yml
      - loki_data:/loki
    command: -config.file=/etc/loki/loki-config.yml

  promtail:
    image: grafana/promtail:latest
    container_name: promtail
    volumes:
      - /var/log:/var/log
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./promtail-config.yml:/etc/promtail/promtail-config.yml
    command: -config.file=/etc/promtail/promtail-config.yml
    depends_on:
      - loki

volumes:
  loki_data:
```

```yaml
# loki-config.yml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  chunk_idle_period: 5m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 168h

storage_config:
  boltdb:
    directory: /loki/index
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 720h

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h
```

```yaml
# promtail-config.yml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Docker容器日志
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'stream'
    pipeline_stages:
      # 解析JSON日志
      - json:
          expressions:
            level: level
            message: message
            traceId: traceId
            spanId: spanId
      - labels:
          level:
          traceId:
          spanId:
```

**Grafana中查询日志**:
```
# 查询特定traceId的所有日志
{job="docker",container="device-service"} |= "traceId: abc-123"

# 查询错误日志
{job="docker"} | json | level="error"

# 查询慢请求
{job="docker"} | json | durationMs > 1000

# 统计每个服务的错误率
sum(rate({job="docker"} | json | level="error"[5m])) by (container)
```

**预期效果**:
- ✅ 集中化日志管理
- ✅ 通过traceId关联分布式调用链
- ✅ 快速定位问题（按时间、服务、日志级别过滤）
- ✅ 日志保留30天

---

### **阶段 2.5: 安全加固** (优先级: P1 🟠)

#### 2.5.1 敏感数据加密

**目标**: 加密数据库中的敏感字段

**实施方案**:
```typescript
// backend/shared/src/encryption/field-encryption.service.ts
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class FieldEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    // 从环境变量获取加密密钥（必须32字节）
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  /**
   * 加密字段
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // 格式: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * 解密字段
   */
  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// 加密装饰器
export function Encrypted(target: any, propertyKey: string) {
  const metadataKey = `encrypted:${propertyKey}`;
  Reflect.defineMetadata(metadataKey, true, target.constructor);
}

// TypeORM Subscriber (自动加密/解密)
import { EventSubscriber, EntitySubscriberInterface, InsertEvent, LoadEvent } from 'typeorm';

@EventSubscriber()
export class EncryptionSubscriber implements EntitySubscriberInterface {
  constructor(private encryptionService: FieldEncryptionService) {}

  /**
   * 插入前加密
   */
  beforeInsert(event: InsertEvent<any>) {
    this.encryptFields(event.entity);
  }

  /**
   * 加载后解密
   */
  afterLoad(entity: any) {
    this.decryptFields(entity);
  }

  private encryptFields(entity: any) {
    const metadata = Reflect.getMetadataKeys(entity.constructor);
    for (const key of metadata) {
      if (key.startsWith('encrypted:')) {
        const propertyKey = key.replace('encrypted:', '');
        const value = entity[propertyKey];
        if (value && typeof value === 'string') {
          entity[propertyKey] = this.encryptionService.encrypt(value);
        }
      }
    }
  }

  private decryptFields(entity: any) {
    const metadata = Reflect.getMetadataKeys(entity.constructor);
    for (const key of metadata) {
      if (key.startsWith('encrypted:')) {
        const propertyKey = key.replace('encrypted:', '');
        const value = entity[propertyKey];
        if (value && typeof value === 'string') {
          try {
            entity[propertyKey] = this.encryptionService.decrypt(value);
          } catch (error) {
            // 如果解密失败，可能是未加密的旧数据
            console.error(`Failed to decrypt ${propertyKey}:`, error);
          }
        }
      }
    }
  }
}
```

**使用示例**:
```typescript
// backend/user-service/src/entities/user.entity.ts
import { Entity, Column } from 'typeorm';
import { Encrypted } from '@cloudphone/shared';

@Entity('users')
export class User {
  @Column()
  username: string;

  @Column()
  @Encrypted // 👈 加密装饰器
  email: string;

  @Column()
  @Encrypted // 👈 加密装饰器
  phone: string;

  @Column()
  passwordHash: string; // 密码已经是hash，不需要再加密
}
```

**需要加密的字段**:
- 用户邮箱、手机号
- API密钥
- 第三方服务凭证
- 敏感配置信息

**预期效果**:
- ✅ 数据库泄露时，敏感信息不可读
- ✅ 满足合规要求（GDPR, CCPA）
- ✅ 性能影响 < 5%（仅加密特定字段）

---

#### 2.5.2 服务间认证（Service-to-Service Auth）

**目标**: 内部服务调用需要验证身份

**实施方案**:
```typescript
// backend/shared/src/auth/service-auth.module.ts
import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ServiceAuthGuard } from './service-auth.guard';
import { ServiceTokenService } from './service-token.service';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.SERVICE_TOKEN_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [ServiceAuthGuard, ServiceTokenService],
  exports: [ServiceTokenService],
})
export class ServiceAuthModule {}

// backend/shared/src/auth/service-token.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface ServiceTokenPayload {
  serviceName: string;
  iat: number;
  exp: number;
}

@Injectable()
export class ServiceTokenService {
  constructor(private jwtService: JwtService) {}

  /**
   * 生成服务token
   */
  generateToken(serviceName: string): string {
    const payload: Omit<ServiceTokenPayload, 'iat' | 'exp'> = {
      serviceName,
    };
    return this.jwtService.sign(payload);
  }

  /**
   * 验证服务token
   */
  verifyToken(token: string): ServiceTokenPayload {
    return this.jwtService.verify<ServiceTokenPayload>(token);
  }
}

// backend/shared/src/auth/service-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ServiceTokenService } from './service-token.service';

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  constructor(private serviceTokenService: ServiceTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Service token missing');
    }

    try {
      const payload = this.serviceTokenService.verifyToken(token);
      request.serviceAuth = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid service token');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers['x-service-auth'];
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

    return parts[1];
  }
}
```

**使用示例**:
```typescript
// device-service调用user-service
import { HttpClientService } from '@cloudphone/shared';
import { ServiceTokenService } from '@cloudphone/shared';

@Injectable()
export class QuotaClientService {
  constructor(
    private httpClient: HttpClientService,
    private serviceTokenService: ServiceTokenService,
  ) {}

  async checkQuota(userId: string): Promise<QuotaResponse> {
    const serviceToken = this.serviceTokenService.generateToken('device-service');

    return this.httpClient.get<QuotaResponse>(
      `http://user-service:30001/api/v1/quotas/user/${userId}`,
      {
        headers: {
          'X-Service-Auth': `Bearer ${serviceToken}`,
        },
      }
    );
  }
}

// user-service保护内部端点
@Controller('api/v1/quotas')
export class QuotaController {
  @Get('user/:userId')
  @UseGuards(ServiceAuthGuard) // 👈 只允许服务间调用
  async getUserQuota(@Param('userId') userId: string) {
    return this.quotaService.getQuota(userId);
  }
}
```

**预期效果**:
- ✅ 防止内网服务被外部直接访问
- ✅ 服务调用可追溯（知道谁调用了谁）
- ✅ 防止SSRF攻击

---

## 🗓️ 实施时间表

| 阶段 | 任务 | 工时 | 优先级 | 依赖 | 完成标准 |
|-----|------|------|--------|------|---------|
| **2.1** | PostgreSQL主从复制 | 8h | P0 | 无 | 主从延迟<1s, 读写分离正常 |
| **2.1** | Redis哨兵模式 | 6h | P0 | 无 | 故障转移<30s, 缓存正常 |
| **2.1** | RabbitMQ集群 | 8h | P0 | 无 | 队列镜像, 节点故障转移 |
| **2.1** | MinIO分布式 | 6h | P1 | 无 | 纠删码EC:2, 节点容错 |
| **2.2** | 数据库读写分离 | 4h | P1 | 2.1 PG主从 | 读操作路由到从库 |
| **2.2** | 表分区 | 6h | P1 | 无 | user_events按月分区 |
| **2.2** | 物化视图 | 4h | P1 | 无 | 报表查询<100ms |
| **2.3** | 多级缓存 | 6h | P1 | 2.1 Redis哨兵 | 命中率>90% |
| **2.3** | 缓存预热 | 4h | P1 | 2.3 多级缓存 | 启动后5分钟达到高命中率 |
| **2.4** | Prometheus部署 | 8h | P1 | 无 | 所有服务暴露metrics |
| **2.4** | Grafana仪表板 | 6h | P1 | 2.4 Prometheus | 5个核心仪表板 |
| **2.4** | 告警规则 | 4h | P1 | 2.4 Prometheus | 10条告警规则 |
| **2.4** | Loki日志 | 6h | P1 | 无 | 所有日志集中查询 |
| **2.5** | 字段加密 | 6h | P1 | 无 | 敏感字段自动加密 |
| **2.5** | 服务间认证 | 4h | P1 | 无 | 内部端点受保护 |

**总工时**: 约 76小时（10个工作日）

---

## 🎯 验收标准

### 高可用性
- [ ] PostgreSQL主库故障，从库可在1分钟内提升为主库
- [ ] Redis主库故障，哨兵在30秒内完成故障转移
- [ ] RabbitMQ单节点故障，队列消息不丢失
- [ ] MinIO 2个节点故障，文件仍可读写

### 性能
- [ ] 数据库查询P99延迟 < 50ms
- [ ] 缓存命中率 > 90%
- [ ] API响应P99延迟 < 200ms
- [ ] 并发处理能力 > 2000 req/s

### 监控
- [ ] 所有服务暴露Prometheus指标
- [ ] Grafana有5个核心仪表板
- [ ] 配置10条告警规则
- [ ] 日志可通过traceId追踪

### 安全
- [ ] 敏感字段已加密存储
- [ ] 服务间调用需要认证
- [ ] 无高危安全漏洞
- [ ] JWT Secret已统一

---

## 📈 ROI分析

| 优化项 | 成本 | 收益 | ROI |
|--------|------|------|-----|
| 高可用架构 | 28h + 服务器成本 | 可用性99%→99.9%, 故障损失减少90% | 高 |
| 数据库优化 | 14h | 查询速度提升5倍, 支撑10倍用户增长 | 极高 |
| 缓存深化 | 10h | 响应时间降低80%, 数据库压力减少70% | 极高 |
| 监控告警 | 24h + 存储成本 | 故障发现时间从30分钟→1分钟 | 高 |
| 安全加固 | 10h | 降低合规风险, 避免数据泄露损失 | 高 |

**总成本**: 76工时 + 基础设施成本
**总收益**: 系统可靠性、性能、安全性全面提升，支撑10倍业务增长

---

## 🚀 快速启动

```bash
# 1. 克隆最新代码
cd /home/eric/next-cloudphone
git pull

# 2. 部署高可用基础设施
cd infrastructure
docker-compose -f docker-compose.ha.yml up -d

# 3. 配置数据库主从
./scripts/setup-postgres-replication.sh

# 4. 部署监控系统
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# 5. 验证部署
./scripts/verify-ha-deployment.sh
```

---

**下一步行动**: 选择一个阶段开始实施（建议从2.1高可用架构开始）
