# 分布式追踪 (Distributed Tracing)

Cloud Phone Platform 使用 **OpenTelemetry** + **Jaeger** 实现完整的分布式追踪，支持跨服务链路追踪和性能分析。

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           分布式追踪架构                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    Frontend (Admin/User Portal)                                             │
│         │                                                                   │
│         │ traceparent: 00-{traceId}-{spanId}-01                            │
│         ▼                                                                   │
│    ┌─────────────────┐                                                      │
│    │  API Gateway    │ ◄── RequestTracingMiddleware                        │
│    │  (Port 30000)   │     创建/继承 trace context                          │
│    └────────┬────────┘                                                      │
│             │                                                               │
│             │ W3C Trace Context (HTTP Headers)                              │
│             ▼                                                               │
│    ┌────────────────────────────────────────────────────────┐              │
│    │                   Backend Services                      │              │
│    │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │              │
│    │  │  user    │  │  device  │  │  billing │  ...        │              │
│    │  │ service  │  │ service  │  │ service  │             │              │
│    │  └────┬─────┘  └────┬─────┘  └────┬─────┘             │              │
│    │       │             │             │                    │              │
│    │       └─────────────┼─────────────┘                    │              │
│    │                     │                                  │              │
│    │                     ▼                                  │              │
│    │           ┌─────────────────┐                          │              │
│    │           │    RabbitMQ     │                          │              │
│    │           │  (cloudphone.   │                          │              │
│    │           │    events)      │                          │              │
│    │           │                 │                          │              │
│    │           │ _trace: {...}   │ ◄── 消息携带 trace context│              │
│    │           └─────────────────┘                          │              │
│    └────────────────────────────────────────────────────────┘              │
│                                                                             │
│                     ┌─────────────────┐                                     │
│                     │     Jaeger      │                                     │
│                     │   Collector     │                                     │
│                     │  (Port 4318)    │ ◄── OTLP HTTP Exporter              │
│                     └────────┬────────┘                                     │
│                              │                                              │
│                              ▼                                              │
│                     ┌─────────────────┐                                     │
│                     │   Jaeger UI     │                                     │
│                     │  (Port 16686)   │                                     │
│                     └─────────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. RequestTracingMiddleware

位于 `@cloudphone/shared`，为所有 HTTP 请求创建追踪 span。

**功能：**
- 从上游提取 W3C Trace Context (traceparent/tracestate headers)
- 创建 SERVER span 记录请求处理
- 将 traceId、spanId 注入到请求对象和响应头
- 根据 HTTP 状态码设置 span 状态

**使用：**
```typescript
// 在 app.module.ts 中启用
import { RequestTracingMiddleware } from '@cloudphone/shared';

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestTracingMiddleware).forRoutes('*');
  }
}
```

### 2. HttpClientService (HTTP 传播)

服务间 HTTP 调用自动传播 trace context。

**功能：**
- 创建 CLIENT span 记录外部调用
- 使用 `propagation.inject()` 注入 W3C headers
- 包含熔断器和重试机制

**使用：**
```typescript
import { HttpClientService } from '@cloudphone/shared';

// HTTP 调用会自动传播 trace context
const result = await this.httpClient.get('http://user-service/users/123');
```

### 3. EventBusService (RabbitMQ 传播)

事件发布自动携带 trace context。

**功能：**
- 创建 PRODUCER span 记录消息发布
- 将 trace context 注入到消息的 `_trace` 字段
- 支持 W3C Trace Context 格式

**使用：**
```typescript
import { EventBusService } from '@cloudphone/shared';

// 事件发布会自动携带 trace context
await this.eventBus.publishDeviceEvent('created', {
  deviceId: 'xxx',
  userId: 'xxx',
});
```

### 4. RabbitMQ 消费者追踪工具

提供从消息中提取 trace context 的工具函数。

**工具函数：**
- `extractTraceContext(message)` - 提取 context
- `createConsumerSpan(message, name, key)` - 创建消费者 span
- `withTracing(routingKey, handler)` - 装饰器风格包装器
- `runInTraceContext(message, fn)` - 在 context 中执行
- `getTraceIdFromMessage(message)` - 获取 traceId

**使用示例：**
```typescript
import { withTracing, createConsumerSpan, runInTraceContext } from '@cloudphone/shared';

// 方式 1: 使用 withTracing 装饰器
@RabbitSubscribe({
  exchange: 'cloudphone.events',
  routingKey: 'device.created',
  queue: 'billing-service.device-created',
})
handleDeviceCreated = withTracing('device.created', async (message) => {
  // 自动在正确的 trace context 中执行
  await this.billingService.startMetering(message.deviceId);
});

// 方式 2: 手动管理 span
@RabbitSubscribe({...})
async handleUserCreated(message: UserCreatedEvent) {
  const span = createConsumerSpan(message, 'process user.created', 'user.created');
  try {
    await this.processUser(message);
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}

// 方式 3: 使用 runInTraceContext
@RabbitSubscribe({...})
async handleEvent(message: any) {
  return runInTraceContext(message, async () => {
    // 所有在此执行的代码都继承正确的 trace context
    await this.serviceA.doSomething();
    await this.serviceB.doSomethingElse();
  });
}
```

## 配置

### 环境变量

在各服务的 `.env` 文件中配置：

```bash
# ===== 分布式追踪配置 (OpenTelemetry + Jaeger) =====
# 是否启用追踪 (true/false)
TRACING_ENABLED=true

# Jaeger OTLP HTTP 端点
JAEGER_ENDPOINT=http://localhost:4318/v1/traces

# 采样策略: always_on, always_off, ratio, parent_based
TRACING_SAMPLING_STRATEGY=parent_based

# 采样率 (0.0-1.0), 仅当策略为 ratio 或 parent_based 时有效
TRACING_SAMPLING_RATIO=1.0
```

### 采样策略说明

| 策略 | 描述 | 适用场景 |
|------|------|----------|
| `always_on` | 采样所有请求 | 开发/调试环境 |
| `always_off` | 不采样任何请求 | 完全禁用追踪 |
| `ratio` | 按比例采样 | 生产环境（控制成本） |
| `parent_based` | 继承父 span 决策，根 span 按 ratio 采样 | **推荐**（生产环境） |

**生产环境建议：**
```bash
TRACING_SAMPLING_STRATEGY=parent_based
TRACING_SAMPLING_RATIO=0.1  # 采样 10% 的请求
```

### 初始化追踪

在服务的 `main.ts` 中初始化：

```typescript
import { initTracing } from '@cloudphone/shared';

async function bootstrap() {
  // 在创建 NestJS 应用之前初始化追踪
  initTracing({
    serviceName: 'user-service',
    serviceVersion: '1.0.0',
    enabled: process.env.TRACING_ENABLED === 'true',
    jaegerEndpoint: process.env.JAEGER_ENDPOINT,
    samplingStrategy: process.env.TRACING_SAMPLING_STRATEGY as SamplingStrategy,
    samplingRatio: parseFloat(process.env.TRACING_SAMPLING_RATIO || '1.0'),
  });

  const app = await NestFactory.create(AppModule);
  // ...
}
```

## 启动 Jaeger

### 使用 Docker

```bash
# All-in-one 模式（开发环境）
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# 访问 Jaeger UI: http://localhost:16686
```

### 使用 Docker Compose

在 `infrastructure/monitoring/docker-compose.jaeger.yml` 中已配置：

```bash
cd infrastructure/monitoring
docker compose -f docker-compose.jaeger.yml up -d
```

## 验证追踪

### 1. 检查服务日志

启动服务后应看到：
```
✅ OpenTelemetry initialized for service: user-service
📊 Jaeger endpoint: http://localhost:4318/v1/traces
🎯 Sampling strategy: parent_based (ratio: 1.0)
```

### 2. 发送测试请求

```bash
# 获取 token
TOKEN=$(curl -s -X POST http://localhost:30000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.access_token')

# 发送请求（会生成 trace）
curl -H "Authorization: Bearer $TOKEN" http://localhost:30000/users/me
```

### 3. 查看 Jaeger UI

1. 打开 http://localhost:16686
2. 选择服务（如 `api-gateway`）
3. 点击 "Find Traces"
4. 查看跨服务链路

### 4. 验证脚本

```bash
./scripts/verify-tracing.sh
```

## Trace Context 格式

### W3C Trace Context

HTTP Headers：
```
traceparent: 00-{trace-id}-{parent-id}-{trace-flags}
tracestate: vendor1=value1,vendor2=value2
```

示例：
```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

- `00`: 版本
- `4bf92f3577b34da6a3ce929d0e0e4736`: 32 字符 trace ID
- `00f067aa0ba902b7`: 16 字符 parent span ID
- `01`: trace flags (01 = sampled)

### RabbitMQ 消息格式

事件消息中的 `_trace` 字段：
```json
{
  "type": "device.created",
  "payload": {
    "deviceId": "xxx",
    "userId": "xxx"
  },
  "_trace": {
    "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    "tracestate": ""
  }
}
```

## 常见问题

### Q: Traces 没有出现在 Jaeger 中？

1. 检查 `TRACING_ENABLED=true`
2. 确认 Jaeger 正在运行：`curl http://localhost:4318/health`
3. 检查采样率不是 0
4. 查看服务日志中的 OpenTelemetry 初始化信息

### Q: 跨服务追踪断开？

1. 确保所有服务都启用了 `RequestTracingMiddleware`
2. 检查服务间调用是否使用 `HttpClientService`
3. RabbitMQ 消费者是否正确提取 `_trace` 字段

### Q: 采样率如何选择？

- **开发环境**: `TRACING_SAMPLING_RATIO=1.0` (100% 采样)
- **生产环境**: `TRACING_SAMPLING_RATIO=0.1` (10% 采样)
- **高流量服务**: `TRACING_SAMPLING_RATIO=0.01` (1% 采样)

### Q: 如何添加自定义 span？

```typescript
import { createChildSpan, endSpan } from '@cloudphone/shared';

async function processOrder(orderId: string) {
  const span = createChildSpan('process-order', {
    'order.id': orderId,
  });

  try {
    // 业务逻辑
    await doSomething();
    endSpan(span); // 成功
  } catch (error) {
    endSpan(span, error); // 失败
    throw error;
  }
}
```

## 服务追踪状态

| 服务 | 端口 | RequestTracingMiddleware | HTTP 传播 | RabbitMQ 传播 |
|------|------|--------------------------|-----------|---------------|
| api-gateway | 30000 | ✅ | ✅ | N/A |
| user-service | 30001 | ✅ | ✅ | ✅ |
| device-service | 30002 | ✅ | ✅ | ✅ |
| app-service | 30003 | ✅ | ✅ | ✅ |
| billing-service | 30005 | ✅ | ✅ | ✅ |
| notification-service | 30006 | ✅ | ✅ | ✅ |
| proxy-service | 30007 | ✅ | ✅ | ✅ |
| sms-receive-service | 30008 | ✅ | ✅ | ✅ |
| livechat-service | 30010 | ✅ | ✅ | ✅ |

## 相关文档

- [OpenTelemetry 官方文档](https://opentelemetry.io/docs/)
- [Jaeger 官方文档](https://www.jaegertracing.io/docs/)
- [W3C Trace Context 规范](https://www.w3.org/TR/trace-context/)
