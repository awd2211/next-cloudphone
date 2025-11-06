# 日志系统统一状态报告

> **检查时间**: 2025-11-04
> **检查范围**: 所有后端微服务日志配置

## ✅ 已统一的部分

### 1. 日志配置代码层面 - 完全统一 ✅

所有主要微服务都使用了 `@cloudphone/shared` 提供的统一日志配置：

| 服务 | 状态 | 配置函数 |
|------|------|---------|
| api-gateway | ✅ 已统一 | `createLoggerConfig('api-gateway')` |
| user-service | ✅ 已统一 | `createLoggerConfig('user-service')` |
| device-service | ✅ 已统一 | `createLoggerConfig('device-service')` |
| app-service | ✅ 已统一 | `createLoggerConfig('app-service')` |
| billing-service | ✅ 已统一 | `createLoggerConfig('billing-service')` |
| notification-service | ✅ 已统一 | `createLoggerConfig('notification-service')` |

### 2. 统一的日志特性

**日志库**: Pino (高性能 Node.js 日志库)

**统一配置** (`backend/shared/src/config/logger.config.ts`):

#### 格式统一
- **开发环境**: pino-pretty 彩色格式，便于阅读
- **生产环境**: JSON 格式，便于机器解析

#### 敏感数据脱敏
自动脱敏以下字段：
```typescript
const SENSITIVE_FIELDS = [
  'password', 'token', 'accessToken', 'refreshToken',
  'secret', 'apiKey', 'authorization', 'cookie',
  'passwordHash', 'creditCard', 'ssn', 'privateKey'
];
```

**脱敏示例**:
```json
{
  "password": "sec***",      // 原值: secret123
  "apiKey": "abc***",        // 原值: abc1234567890
  "creditCard": "412***"     // 原值: 4123456789012345
}
```

#### 统一日志字段
每条日志自动包含：
```typescript
{
  "service": "user-service",           // 服务名称
  "environment": "development",        // 环境
  "version": "1.0.0",                 // 版本号
  "requestId": "uuid-v4",             // 请求追踪ID
  "userId": "user-id",                // 用户ID（如有）
  "userRole": "admin",                // 用户角色（如有）
  "tenantId": "tenant-id",            // 租户ID（多租户）
  "time": "2025-11-04T16:30:00.000Z", // ISO 时间戳
  "level": "info",                    // 日志级别
  "msg": "HTTP request",              // 消息
  "request": { ... },                 // 请求详情
  "response": { ... },                // 响应详情
  "duration": 123                     // 响应时间(ms)
}
```

#### 自动请求日志
```typescript
// 自动记录 HTTP 请求
autoLogging: {
  ignore: (req) => {
    // 忽略健康检查、metrics 等端点
    const ignoredPaths = ['/health', '/metrics', '/favicon.ico'];
    return ignoredPaths.some(path => req.url?.startsWith(path));
  }
}
```

#### 智能日志级别
```typescript
// 根据 HTTP 状态码自动设置级别
if (res.statusCode >= 500 || err) return 'error';
if (res.statusCode >= 400) return 'warn';
if (res.statusCode >= 300) return 'info';
return 'info';
```

### 3. 日志轮转 - PM2 管理 ✅

**PM2 Logrotate 配置**:
- 自动按日期轮转日志文件
- 保留历史日志
- 压缩旧日志（可选）

**日志文件路径**:
```
backend/
├── api-gateway/logs/
│   ├── api-gateway-error.log
│   ├── api-gateway-out.log
│   └── api-gateway-error__2025-11-04_00-00-00.log
├── user-service/logs/
│   ├── user-service-error.log
│   └── user-service-out.log
├── device-service/logs/
├── billing-service/logs/
└── ...
```

## ⚠️ 未统一的部分

### 1. 日志聚合 - 未部署 ❌

**当前状态**:
- ❌ 没有集中式日志收集系统
- ❌ 日志分散在各服务的本地目录
- ❌ 无法跨服务查询和分析日志

**建议的日志聚合方案**:

#### 方案 1: Grafana Loki (推荐)
**优点**:
- 轻量级，资源占用小
- 与现有 Grafana 完美集成
- 使用 LogQL 查询语言（类似 PromQL）
- 支持标签索引，成本低

**架构**:
```
各微服务 → Promtail → Loki → Grafana
```

**部署配置**:
```yaml
# docker-compose.logging.yml
services:
  loki:
    image: grafana/loki:2.9.0
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml
      - loki-data:/loki

  promtail:
    image: grafana/promtail:2.9.0
    volumes:
      - /var/log:/var/log
      - ../backend/api-gateway/logs:/logs/api-gateway:ro
      - ../backend/user-service/logs:/logs/user-service:ro
      - ../backend/device-service/logs:/logs/device-service:ro
      # ... 其他服务
    command: -config.file=/etc/promtail/config.yml
```

#### 方案 2: ELK Stack (功能强大)
**优点**:
- 功能最全面
- 强大的搜索和分析能力
- 丰富的可视化功能

**缺点**:
- 资源占用大（特别是 Elasticsearch）
- 配置复杂
- 成本较高

#### 方案 3: Fluentd/Fluent Bit (灵活)
**优点**:
- 轻量级数据收集器
- 支持多种输出目标
- 插件生态丰富

### 2. 日志采样 - 未启用 ❌

**当前代码**:
```typescript
// 已有采样函数，但未使用
export function shouldSampleLog(sampleRate: number = 0.1): boolean {
  if (process.env.NODE_ENV === 'production' && process.env.LOG_SAMPLING === 'true') {
    return Math.random() < sampleRate;
  }
  return true;
}
```

**建议**:
在生产环境高流量场景下，启用日志采样可以：
- 减少存储成本
- 降低I/O压力
- 保持系统性能

### 3. 结构化日志查询 - 功能有限 ❌

**当前查询方式**:
```bash
# 只能使用 grep、tail 等工具
pm2 logs user-service --lines 100 | grep "error"
tail -f backend/user-service/logs/user-service-error.log
```

**缺点**:
- 无法跨服务查询
- 不支持复杂条件过滤
- 没有聚合和统计功能

## 📊 日志使用示例

### 查看特定服务日志
```bash
# PM2 方式（推荐）
pm2 logs user-service --lines 100

# 直接读取文件
tail -f backend/user-service/logs/user-service-out.log
```

### 查看错误日志
```bash
pm2 logs user-service --err --lines 50
```

### 清空日志
```bash
pm2 flush
```

### 查看所有服务日志
```bash
pm2 logs --lines 100
```

## 🎯 改进建议

### 短期优化（1-2天）

#### 1. 部署 Grafana Loki
```bash
cd infrastructure/monitoring

# 创建 Loki 配置
cat > loki-config.yml <<EOF
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  chunk_idle_period: 5m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/index
    cache_location: /loki/cache
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 168h

table_manager:
  retention_deletes_enabled: true
  retention_period: 168h
EOF

# 添加到 docker-compose.monitoring.yml
# ... (Loki 和 Promtail 配置)

docker compose -f docker-compose.monitoring.yml up -d loki promtail
```

#### 2. 在 Grafana 中配置 Loki 数据源
1. 访问 Grafana: http://localhost:3000
2. Configuration → Data Sources
3. Add data source → Loki
4. URL: http://loki:3100
5. Save & Test

#### 3. 创建日志查询面板
```promql
# LogQL 查询示例
{service="user-service"} |= "error"                    # 查询错误
{service="device-service"} | json | level="error"     # JSON 解析
rate({service=~".*-service"}[5m])                      # 日志速率
```

### 中期优化（1周）

#### 1. 启用日志采样
```typescript
// 在 main.ts 中
if (process.env.NODE_ENV === 'production') {
  process.env.LOG_SAMPLING = 'true';
  // 10% 采样率用于普通日志，错误日志始终记录
}
```

#### 2. 添加业务日志
```typescript
import { createAppLogger } from '@cloudphone/shared';

const logger = createAppLogger('user-service');

// 业务事件日志
logger.info({
  event: 'user.registered',
  userId: user.id,
  email: user.email,
  source: 'web'
}, 'New user registered');

// 性能日志
logger.info({
  event: 'query.slow',
  query: 'SELECT * FROM users',
  duration: 2500,
  threshold: 1000
}, 'Slow query detected');
```

#### 3. 设置日志告警
在 Loki 中配置告警规则：
```yaml
# Loki 告警规则
- alert: HighErrorRate
  expr: |
    sum(rate({service=~".*-service"} |= "error" [5m])) by (service)
    > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High error rate in {{ $labels.service }}"
```

### 长期优化（1个月）

#### 1. 日志合规性
- 实现日志加密存储
- 添加日志访问审计
- 设置日志保留策略（GDPR 合规）

#### 2. 高级分析
- 使用 Loki 的 metrics 功能生成指标
- 集成 Jaeger 追踪与日志关联
- 创建日志分析仪表板

#### 3. 自动化运维
- 基于日志的自动告警
- 日志驱动的自动扩缩容
- 异常模式检测

## ✅ 总结

### 当前状态
| 项目 | 状态 | 说明 |
|------|------|------|
| 日志配置统一 | ✅ 完成 | 所有服务使用 Pino + 统一配置 |
| 日志格式统一 | ✅ 完成 | JSON/Pretty 格式切换 |
| 敏感数据脱敏 | ✅ 完成 | 自动脱敏密码、token 等 |
| 请求追踪 | ✅ 完成 | Request ID 跨服务追踪 |
| 日志轮转 | ✅ 完成 | PM2 Logrotate 管理 |
| **日志聚合** | ❌ 未部署 | **需要部署 Loki/ELK** |
| **跨服务查询** | ❌ 缺失 | **需要日志聚合系统** |
| 日志采样 | ⚠️ 未启用 | 代码已有，需配置 |
| 日志告警 | ⚠️ 部分 | 只有应用层告警，无日志层 |

### 回答你的问题

**"日志现在全部统一了吗？"**

**代码层面**: ✅ **是的，已完全统一**
- 所有 6 个核心服务都使用 `@cloudphone/shared` 的 `createLoggerConfig`
- 统一的 Pino 日志库
- 统一的日志格式、字段、脱敏规则

**运维层面**: ⚠️ **部分统一**
- ✅ 日志轮转已统一（PM2 管理）
- ❌ 日志聚合未部署（日志仍分散在各服务目录）
- ❌ 无法跨服务查询和分析

### 下一步建议

**优先级 P0**: 部署 Grafana Loki（1-2 天）
- 解决日志分散问题
- 实现跨服务日志查询
- 与现有 Grafana 无缝集成

**优先级 P1**: 配置日志告警（1 周）
- 基于日志的错误率告警
- 慢查询告警
- 异常模式检测

**优先级 P2**: 启用日志采样（1 周）
- 降低生产环境日志量
- 保留所有错误日志
- 优化存储成本

---

**文档版本**: 1.0
**最后更新**: 2025-11-04
