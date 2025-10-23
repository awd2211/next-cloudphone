# 微服务通讯架构详解

**文档版本**: 1.0
**更新时间**: 2025-10-23
**适用范围**: Cloud Phone Platform 所有微服务

---

## 目录

1. [通讯方式概览](#1-通讯方式概览)
2. [异步通讯 - RabbitMQ 事件驱动](#2-异步通讯---rabbitmq-事件驱动)
3. [同步通讯 - HTTP/REST](#3-同步通讯---httprest)
4. [服务发现 - Consul](#4-服务发现---consul)
5. [API网关路由](#5-api网关路由)
6. [实际通讯场景](#6-实际通讯场景)
7. [通讯可靠性保障](#7-通讯可靠性保障)

---

## 1. 通讯方式概览

云手机平台采用 **混合通讯架构**，结合了同步和异步两种模式：

### 1.1 通讯矩阵

| 通讯类型 | 技术栈 | 使用场景 | 特点 |
|---------|--------|---------|------|
| **异步事件** | RabbitMQ | 事件通知、状态变更、跨服务联动 | 解耦、可靠、异步 |
| **同步HTTP** | RESTful API | 数据查询、实时操作、配额检查 | 即时响应、强一致性 |
| **服务发现** | Consul | 动态服务定位 | 高可用、负载均衡 |
| **实时通讯** | WebSocket | 用户通知、设备监控 | 双向、低延迟 |
| **流媒体** | WebRTC | 设备屏幕投屏 | P2P、高性能 |

### 1.2 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端请求                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   API Gateway        │  ← Consul服务发现
              │   (30000)            │
              └──────────┬───────────┘
                         │ HTTP代理/路由
         ┌───────────────┼──────────────────┐
         │               │                  │
         ▼               ▼                  ▼
  ┌──────────┐   ┌──────────┐      ┌──────────┐
  │  User    │   │  Device  │      │  App     │
  │ Service  │   │ Service  │      │ Service  │
  │ (30001)  │   │ (30002)  │      │ (30003)  │
  └────┬─────┘   └────┬─────┘      └────┬─────┘
       │              │                  │
       └──────────────┼──────────────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │   RabbitMQ Exchange   │  ← 事件总线
          │  cloudphone.events    │
          └───────────┬───────────┘
                      │ 订阅事件
         ┌────────────┼──────────────┐
         │            │              │
         ▼            ▼              ▼
  ┌──────────┐ ┌──────────┐  ┌──────────┐
  │ Billing  │ │Notifica- │  │ User     │
  │ Service  │ │tion      │  │ Service  │
  └──────────┘ └──────────┘  └──────────┘
```

---

## 2. 异步通讯 - RabbitMQ 事件驱动

### 2.1 EventBus 核心服务

所有服务通过 `@cloudphone/shared` 的 `EventBusService` 发布事件。

**位置**: `backend/shared/src/events/event-bus.service.ts`

#### 核心方法

```typescript
class EventBusService {
  // 通用事件发布
  async publish(exchange: string, routingKey: string, message: any): Promise<void>

  // 快捷方法
  async publishDeviceEvent(eventType: string, payload: any): Promise<void>
  async publishUserEvent(eventType: string, payload: any): Promise<void>
  async publishAppEvent(eventType: string, payload: any): Promise<void>
  async publishBillingEvent(eventType: string, payload: any): Promise<void>
  async publishNotificationEvent(eventType: string, payload: any): Promise<void>
}
```

### 2.2 事件交换机配置

| 参数 | 值 |
|------|-----|
| **Exchange名称** | `cloudphone.events` |
| **Exchange类型** | Topic (主题模式) |
| **持久化** | ✅ 是 |
| **消息持久化** | ✅ 是 |

### 2.3 事件命名规范

**格式**: `{service}.{entity}.{action}`

#### 实际事件示例

```typescript
// 设备事件
'device.created'          // 设备创建成功
'device.creation_failed'  // 设备创建失败
'device.started'          // 设备启动
'device.stopped'          // 设备停止
'device.deleted'          // 设备删除
'device.error'            // 设备故障
'device.connection_lost'  // 设备连接丢失

// 用户事件
'user.registered'         // 用户注册
'user.login_failed'       // 登录失败
'user.password_changed'   // 密码修改
'user.two_factor_enabled' // 启用双因素认证

// 应用事件
'app.installed'           // 应用安装成功
'app.install_failed'      // 应用安装失败
'app.updated'             // 应用更新

// 计费事件
'billing.payment_success' // 支付成功
'billing.invoice_generated' // 发票生成
'billing.low_balance'     // 余额不足
```

### 2.4 事件发布示例

**Device Service 发布设备创建事件**:

```typescript
// backend/device-service/src/devices/devices.service.ts
import { EventBusService } from '@cloudphone/shared';

@Injectable()
export class DevicesService {
  constructor(private eventBus: EventBusService) {}

  async createDevice(createDto: CreateDeviceDto) {
    // 1. 创建设备逻辑
    const device = await this.deviceRepository.save(newDevice);

    // 2. 发布事件
    await this.eventBus.publishDeviceEvent('created', {
      deviceId: device.id,
      userId: device.userId,
      deviceName: device.name,
      deviceType: device.type,
      createdAt: device.createdAt.toISOString(),
    });

    return device;
  }
}
```

### 2.5 事件消费示例

**Notification Service 消费设备事件**:

```typescript
// backend/notification-service/src/rabbitmq/consumers/device-events.consumer.ts
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class DeviceEventsConsumer {

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.created',
    queue: 'notification-service.device.created',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cloudphone.notifications.dlx', // 死信队列
      },
    },
  })
  async handleDeviceCreated(event: DeviceCreatedEvent) {
    // 发送通知给用户
    await this.notificationsService.createAndSend({
      userId: event.payload.userId,
      type: NotificationType.DEVICE,
      title: '设备创建成功',
      message: `您的设备 ${event.payload.deviceName} 已成功创建`,
      data: event.payload,
    });
  }
}
```

### 2.6 事件消费者列表

#### Notification Service (8个消费者)

```typescript
✅ device-events.consumer.ts     // 监听: device.*
✅ user-events.consumer.ts       // 监听: user.*
✅ app-events.consumer.ts        // 监听: app.*
✅ billing-events.consumer.ts    // 监听: billing.*
✅ scheduler-events.consumer.ts  // 监听: scheduler.*
✅ media-events.consumer.ts      // 监听: media.*
✅ system-events.consumer.ts     // 监听: system.*
✅ dlx.consumer.ts               // 监听: 死信队列
```

#### Billing Service (2个消费者)

```typescript
✅ metering.consumer.ts          // 监听: device.started, device.stopped
✅ saga.consumer.ts               // 监听: 分布式事务事件
```

#### Device Service (1个消费者)

```typescript
✅ devices.consumer.ts            // 监听: user.quota_updated 等
```

#### App Service (1个消费者)

```typescript
✅ apps.consumer.ts               // 监听: device.created (自动安装应用)
```

---

## 3. 同步通讯 - HTTP/REST

### 3.1 HttpClient 核心服务

所有服务通过 `@cloudphone/shared` 的 `HttpClientService` 进行HTTP调用。

**位置**: `backend/shared/src/http/http-client.service.ts`

#### 核心特性

```typescript
class HttpClientService {
  // 支持 GET, POST, PUT, DELETE
  async get<T>(url: string, config?: AxiosRequestConfig, options?: HttpClientOptions): Promise<T>
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig, options?: HttpClientOptions): Promise<T>

  // 带熔断器的请求
  async requestWithCircuitBreaker<T>(serviceKey: string, requestFn: () => Promise<T>): Promise<T>

  // 熔断器管理
  getCircuitBreakerStats(serviceKey: string): any
  resetCircuitBreaker(serviceKey: string): void
}
```

#### 请求选项

```typescript
interface HttpClientOptions {
  timeout?: number;        // 超时时间 (默认 5000ms)
  retries?: number;        // 重试次数 (默认 3次)
  retryDelay?: number;     // 重试延迟 (默认 1000ms)
  circuitBreaker?: boolean; // 是否启用熔断器
}
```

#### 自动重试策略

- **GET请求**: 重试所有错误
- **POST/PUT/DELETE**: 只重试 5xx 错误
- **指数退避**: 延迟 = retryDelay × retryCount

#### 熔断器配置

```typescript
{
  timeout: 3000,                    // 单次请求超时
  errorThresholdPercentage: 50,    // 错误率阈值 50%
  resetTimeout: 30000,              // 重置时间 30秒
}
```

熔断器状态：
- **CLOSED**: 正常工作
- **OPEN**: 熔断（拒绝请求）
- **HALF-OPEN**: 半开（尝试恢复）

### 3.2 服务间 HTTP 调用实例

#### 示例 1: Device Service → User Service (配额检查)

**场景**: 创建设备前检查用户配额

```typescript
// backend/device-service/src/quota/quota-client.service.ts
@Injectable()
export class QuotaClientService {
  private readonly userServiceUrl = 'http://localhost:30001';

  constructor(private httpService: HttpService) {}

  async getUserQuota(userId: string): Promise<QuotaResponse> {
    const response = await firstValueFrom(
      this.httpService.get<QuotaResponse>(
        `${this.userServiceUrl}/api/quotas/user/${userId}`
      )
    );
    return response.data;
  }

  async checkDeviceCreationQuota(userId: string, deviceSpecs: any): Promise<QuotaCheckResult> {
    const quota = await this.getUserQuota(userId);

    // 检查设备数量配额
    if (quota.usage.currentDevices >= quota.limits.maxDevices) {
      return { allowed: false, reason: 'Device quota exceeded' };
    }

    // 检查CPU配额
    if (deviceSpecs.cpuCores > quota.limits.totalCpuCores - quota.usage.usedCpuCores) {
      return { allowed: false, reason: 'CPU quota exceeded' };
    }

    return { allowed: true };
  }

  // 上报设备用量
  async reportDeviceUsage(userId: string, usageReport: UsageReport): Promise<void> {
    await firstValueFrom(
      this.httpService.post(
        `${this.userServiceUrl}/api/quotas/user/${userId}/usage`,
        usageReport
      )
    );
  }
}
```

**调用流程**:

```
Device Service                      User Service
     │                                   │
     │  GET /api/quotas/user/{userId}    │
     ├──────────────────────────────────>│
     │                                   │ 查询数据库
     │  ← QuotaResponse (200 OK)         │
     │<──────────────────────────────────┤
     │                                   │
     │  检查配额是否充足                    │
     │                                   │
     │  POST /api/quotas/user/{id}/usage │
     ├──────────────────────────────────>│
     │                                   │ 更新用量
     │  ← Success (200 OK)                │
     │<──────────────────────────────────┤
```

#### 示例 2: Billing Service → User Service (余额查询)

```typescript
// billing-service 调用 user-service 获取用户信息
const userInfo = await this.httpClient.get(
  `${this.userServiceUrl}/api/users/${userId}`,
  {},
  { timeout: 5000, retries: 3 }
);
```

### 3.3 常见 HTTP 调用场景

| 调用方 | 被调用方 | API端点 | 用途 |
|--------|---------|---------|------|
| device-service | user-service | GET /api/quotas/user/:userId | 获取配额 |
| device-service | user-service | POST /api/quotas/user/:userId/usage | 上报用量 |
| billing-service | user-service | GET /api/users/:userId | 获取用户信息 |
| billing-service | device-service | GET /api/devices/user/:userId | 获取设备列表 |
| app-service | device-service | POST /api/devices/:id/install | 安装应用 |
| scheduler-service | device-service | GET /api/devices | 调度设备资源 |

---

## 4. 服务发现 - Consul

### 4.1 ConsulService 核心服务

**位置**: `backend/shared/src/consul/consul.service.ts`

#### 核心功能

```typescript
class ConsulService {
  // 服务注册
  async registerService(
    name: string,
    port: number,
    tags: string[] = [],
    healthPath: string = '/health'
  ): Promise<string>

  // 服务注销
  async deregisterService(serviceId: string): Promise<void>

  // 获取健康服务实例 (带负载均衡)
  async getService(serviceName: string): Promise<string>

  // 获取所有服务实例
  async getAllServiceInstances(serviceName: string): Promise<any[]>

  // KV存储
  async setKey(key: string, value: string): Promise<void>
  async getKey(key: string): Promise<string | null>
}
```

### 4.2 服务注册示例

**每个服务启动时自动注册到 Consul**:

```typescript
// backend/device-service/src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const consulService = app.get(ConsulService);

  // 注册服务
  await consulService.registerService(
    'device-service',      // 服务名
    30002,                 // 端口
    ['v1.0', 'microservice'], // 标签
    '/health'              // 健康检查端点
  );

  await app.listen(30002);
}
```

### 4.3 Consul 健康检查配置

```typescript
{
  http: 'http://127.0.0.1:30002/health',
  interval: '15s',                    // 每15秒检查一次
  timeout: '10s',                     // 超时时间
  deregistercriticalserviceafter: '3m', // 3分钟后注销故障服务
}
```

### 4.4 服务发现 + 负载均衡

**API Gateway 使用 Consul 动态发现后端服务**:

```typescript
// backend/api-gateway/src/proxy/proxy.service.ts
@Injectable()
export class ProxyService {
  private async getServiceUrl(serviceName: string): Promise<string> {
    if (this.useConsul) {
      try {
        // 从 Consul 获取服务地址 (自动负载均衡)
        const url = await this.consulService.getService('user-service');
        // 返回: http://10.0.1.15:30001 (随机选择健康实例)
        return url;
      } catch (error) {
        // Fallback 到静态配置
        return 'http://localhost:30001';
      }
    }

    // 静态配置
    return this.configService.get('USER_SERVICE_URL');
  }
}
```

**负载均衡算法**: 简单随机

```typescript
// consul.service.ts
const instance = result[Math.floor(Math.random() * result.length)];
const serviceUrl = `http://${instance.Service.Address}:${instance.Service.Port}`;
```

### 4.5 Consul 配置环境变量

```bash
CONSUL_HOST=localhost
CONSUL_PORT=8500
USE_CONSUL=true  # 启用Consul服务发现
```

---

## 5. API网关路由

### 5.1 ProxyService 路由配置

**位置**: `backend/api-gateway/src/proxy/proxy.service.ts`

#### 服务路由映射

```typescript
private services: Map<string, ServiceRoute> = new Map([
  ['users',        { url: 'http://localhost:30001', consulName: 'user-service' }],
  ['devices',      { url: 'http://localhost:30002', consulName: 'device-service' }],
  ['apps',         { url: 'http://localhost:30003', consulName: 'app-service' }],
  ['scheduler',    { url: 'http://localhost:30004', consulName: 'scheduler-service' }],
  ['billing',      { url: 'http://localhost:30005', consulName: 'billing-service' }],
  ['notifications',{ url: 'http://localhost:30006', consulName: 'notification-service' }],
  ['media',        { url: 'http://localhost:30007', consulName: 'media-service' }],
]);
```

### 5.2 请求路由流程

```
客户端请求
    │
    ▼
http://api.cloudphone.com/api/devices/list
    │
    ▼
API Gateway (30000)
    │
    ├─ 1. 解析路径: /api/devices/list
    ├─ 2. 识别服务: devices → device-service
    ├─ 3. Consul服务发现 (可选)
    │     └─ getService('device-service') → http://10.0.1.20:30002
    ├─ 4. 构造代理URL: http://10.0.1.20:30002/list
    ├─ 5. 转发请求 (保留headers、params、body)
    │     └─ axios.request(config)
    │
    ▼
Device Service (30002)
    │
    ├─ 处理业务逻辑
    ├─ 查询数据库
    │
    ▼
返回响应
    │
    ▼
API Gateway
    │
    ├─ 提取响应数据
    ├─ 错误处理
    │
    ▼
返回客户端
```

### 5.3 路由示例

```typescript
// backend/api-gateway/src/proxy/proxy.controller.ts
@Controller('api')
export class ProxyController {

  // 路由所有 /api/{service}/* 请求
  @All(':service/*')
  async proxyToService(
    @Param('service') service: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const path = req.url.replace(`/api/${service}`, '');

    const result = await this.proxyService.proxyRequest(
      service,              // 'devices'
      path,                 // '/list'
      req.method,           // 'GET'
      req.body,
      req.headers,
      req.query,
    );

    return res.json(result);
  }
}
```

---

## 6. 实际通讯场景

### 场景 1: 创建设备的完整通讯流程

```
用户操作: 点击"创建设备"按钮
    │
    ▼
1. 前端 POST http://api-gateway:30000/api/devices
    │
    ▼
2. API Gateway
    ├─ JWT验证
    ├─ 路由到 device-service
    │
    ▼
3. Device Service
    ├─ HTTP同步调用: User Service 检查配额
    │   └─ GET http://user-service:30001/api/quotas/user/{userId}
    │   └─ Response: { allowed: true, remainingDevices: 5 }
    │
    ├─ 创建Docker容器
    ├─ 保存设备到数据库
    │
    ├─ RabbitMQ异步发布: device.created 事件
    │   └─ Exchange: cloudphone.events
    │   └─ RoutingKey: device.created
    │   └─ Payload: { deviceId, userId, deviceName, ... }
    │
    ├─ HTTP同步调用: User Service 上报用量
    │   └─ POST http://user-service:30001/api/quotas/user/{userId}/usage
    │   └─ Body: { cpuCores: 4, memoryGB: 8, operation: 'increment' }
    │
    ▼
4. 事件消费者 (并发执行)
    │
    ├─ Notification Service (device.created 消费者)
    │   └─ 发送WebSocket通知给用户
    │   └─ 发送邮件: "设备创建成功"
    │
    ├─ Billing Service (device.created 消费者)
    │   └─ 开始计费计时
    │   └─ 创建计费记录
    │
    ├─ App Service (device.created 消费者)
    │   └─ 自动安装预装应用
    │   └─ HTTP调用: POST http://device-service:30002/api/devices/{id}/install
    │
    ▼
5. 返回响应给前端
    └─ { success: true, device: {...} }
```

### 场景 2: 支付成功的事件链

```
1. Billing Service 收到支付回调
    │
    ├─ 验证支付
    ├─ 更新订单状态
    │
    ├─ 发布事件: billing.payment_success
    │   └─ RabbitMQ: cloudphone.events/billing.payment_success
    │
    ▼
2. 事件消费者
    │
    ├─ User Service 监听 billing.payment_success
    │   └─ 增加用户余额
    │   └─ 更新配额有效期
    │   └─ 发布事件: user.balance_updated
    │
    ├─ Notification Service 监听 billing.payment_success
    │   └─ 发送通知: "支付成功，账户已充值"
    │   └─ 发送邮件收据
    │
    └─ Billing Service 监听 user.balance_updated
        └─ 生成发票
        └─ 发布事件: billing.invoice_generated
```

### 场景 3: 设备故障自动处理

```
1. Device Service 定时健康检查 (Cron每5分钟)
    │
    ├─ 检测到设备故障
    │
    ├─ 发布事件: device.error
    │   └─ RabbitMQ: cloudphone.events/device.error
    │   └─ Payload: { deviceId, errorType: 'CONTAINER_CRASHED', priority: 'HIGH' }
    │
    ▼
2. 事件消费者
    │
    ├─ Notification Service
    │   └─ 发送高优先级告警通知给用户
    │   └─ 发送告警邮件
    │
    ├─ Device Service (Failover模块)
    │   └─ 尝试自动恢复
    │   └─ 重启容器
    │   └─ 如果成功: 发布 device.recovered
    │   └─ 如果失败: 发布 device.failed
    │
    └─ Billing Service
        └─ 暂停计费
```

---

## 7. 通讯可靠性保障

### 7.1 HTTP 通讯可靠性

#### 重试机制

```typescript
// HttpClientService 自动重试
{
  retries: 3,              // 最多重试3次
  retryDelay: 1000,        // 初始延迟1秒
  // 指数退避: 1s → 2s → 3s
}
```

#### 熔断器保护

```typescript
// 防止级联故障
const breaker = new CircuitBreaker(requestFn, {
  timeout: 3000,
  errorThresholdPercentage: 50,  // 50%错误率触发熔断
  resetTimeout: 30000,            // 30秒后尝试恢复
});

// 状态转换:
// CLOSED → (50%错误) → OPEN → (30s后) → HALF-OPEN → (成功) → CLOSED
```

#### 超时控制

```typescript
// 不同操作有不同超时时间
{
  GET请求: 5000ms,
  POST请求: 10000ms,
  文件上传: 30000ms,
}
```

### 7.2 RabbitMQ 通讯可靠性

#### 消息持久化

```typescript
await this.amqp.publish(exchange, routingKey, message, {
  persistent: true,  // 消息持久化到磁盘
  timestamp: Date.now(),
});
```

#### 队列持久化

```typescript
{
  durable: true,  // 队列持久化
  autoDelete: false,
}
```

#### 死信队列 (DLX)

```typescript
{
  queueOptions: {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'cloudphone.notifications.dlx',  // 失败消息进入DLX
      'x-message-ttl': 86400000,  // 消息TTL 24小时
      'x-max-length': 10000,       // 队列最大长度
    },
  },
}
```

#### 手动确认 (ACK)

```typescript
@RabbitSubscribe({
  exchange: 'cloudphone.events',
  routingKey: 'device.created',
  queue: 'notification-service.device.created',
})
async handleDeviceCreated(event: DeviceCreatedEvent, msg: ConsumeMessage) {
  try {
    await this.processEvent(event);
    // 自动ACK (处理成功)
  } catch (error) {
    // 处理失败，消息重新入队或进入DLX
    throw error;
  }
}
```

### 7.3 服务发现可靠性

#### Consul 健康检查

```typescript
{
  interval: '15s',         // 每15秒检查一次
  timeout: '10s',
  deregistercriticalserviceafter: '3m',  // 连续3分钟不健康后注销
}
```

#### Fallback 机制

```typescript
// 如果Consul不可用，回退到静态配置
if (this.useConsul) {
  try {
    return await this.consulService.getService('user-service');
  } catch (error) {
    // Fallback
    return 'http://localhost:30001';
  }
}
```

### 7.4 错误处理策略

#### 配额检查失败

```typescript
// 如果配额服务不可用
const allowOnError = this.configService.get('QUOTA_ALLOW_ON_ERROR', false);

if (allowOnError) {
  // 降级：允许操作
  return { allowed: true };
} else {
  // 严格模式：拒绝操作
  return { allowed: false, reason: 'Quota service unavailable' };
}
```

#### 事件发布失败

```typescript
try {
  await this.eventBus.publishDeviceEvent('created', payload);
} catch (error) {
  this.logger.error('Failed to publish event', error);
  // 不阻塞主流程，仅记录日志
  // 可以考虑使用补偿机制
}
```

---

## 8. 性能优化

### 8.1 连接池

```typescript
// HttpService 使用 axios 默认连接池
{
  maxSockets: 100,
  keepAlive: true,
}
```

### 8.2 缓存策略

```typescript
// User Service 使用 Redis 缓存配额数据
@Cacheable('user-quota', ttl: 60)  // 缓存60秒
async getUserQuota(userId: string): Promise<QuotaResponse> {
  // ...
}
```

### 8.3 批量操作

```typescript
// 批量上报设备用量 (减少HTTP调用次数)
async reportBatchUsage(reports: UsageReport[]): Promise<void> {
  await this.httpService.post(
    `${this.userServiceUrl}/api/quotas/batch-usage`,
    { reports }
  );
}
```

---

## 9. 监控与追踪

### 9.1 日志关联

每个请求携带 `X-Request-ID` 头，用于关联跨服务日志：

```typescript
// api-gateway 生成 requestId
const requestId = uuid();
headers['X-Request-ID'] = requestId;

// 所有服务记录日志时包含 requestId
this.logger.log(`[${requestId}] Processing request`);
```

### 9.2 Prometheus 指标

```typescript
// 记录服务间调用指标
http_client_requests_total{service="user-service", method="GET", status="200"} 1523
http_client_request_duration_seconds{service="user-service"} 0.125

rabbitmq_published_total{exchange="cloudphone.events", routing_key="device.created"} 342
rabbitmq_consumed_total{queue="notification-service.device.created"} 342
```

### 9.3 分布式追踪 (Jaeger)

User Service 集成 Jaeger 追踪：

```typescript
import { JaegerTracer } from 'jaeger-client';

// 跨服务追踪
span.setTag('service', 'user-service');
span.setTag('operation', 'checkQuota');
span.log({ event: 'quota_checked', result: 'allowed' });
```

---

## 10. 配置清单

### 10.1 环境变量

**通用配置** (所有服务):

```bash
# 服务发现
CONSUL_HOST=localhost
CONSUL_PORT=8500
USE_CONSUL=true

# RabbitMQ
RABBITMQ_URL=amqp://admin:admin123@localhost:5672/cloudphone

# Redis (缓存)
REDIS_HOST=localhost
REDIS_PORT=6379

# 认证 (必须所有服务一致)
JWT_SECRET=your-super-secret-key-must-be-same-across-all-services
```

**服务特定配置**:

```bash
# Device Service
USER_SERVICE_URL=http://localhost:30001
QUOTA_ALLOW_ON_ERROR=false  # 配额检查失败时是否允许操作

# API Gateway
USER_SERVICE_URL=http://localhost:30001
DEVICE_SERVICE_URL=http://localhost:30002
APP_SERVICE_URL=http://localhost:30003
BILLING_SERVICE_URL=http://localhost:30005
NOTIFICATION_SERVICE_URL=http://localhost:30006
```

### 10.2 端口分配

| 服务 | 端口 | 协议 |
|------|------|------|
| api-gateway | 30000 | HTTP |
| user-service | 30001 | HTTP |
| device-service | 30002 | HTTP |
| app-service | 30003 | HTTP |
| scheduler-service | 30004 | HTTP |
| billing-service | 30005 | HTTP |
| notification-service | 30006 | HTTP + WebSocket |
| media-service | 30007 | HTTP + WebRTC |
| PostgreSQL | 5432 | TCP |
| Redis | 6379 | TCP |
| RabbitMQ | 5672 | AMQP |
| RabbitMQ Management | 15672 | HTTP |
| Consul | 8500 | HTTP |
| Consul DNS | 8600 | DNS |

---

## 附录

### A. 通讯决策树

```
需要立即响应?
    ├─ Yes → 使用 HTTP 同步调用
    │   └─ 需要高可用?
    │       ├─ Yes → 启用 Consul + 熔断器
    │       └─ No → 直接 HTTP 调用
    │
    └─ No → 使用 RabbitMQ 异步事件
        └─ 需要保证消息不丢失?
            ├─ Yes → 启用持久化 + DLX
            └─ No → 普通队列
```

### B. 最佳实践

1. **事件 vs HTTP**:
   - 事件: 状态变更通知、解耦、最终一致性
   - HTTP: 数据查询、需要立即响应、强一致性

2. **幂等性设计**:
   - 所有HTTP接口支持幂等操作
   - 事件消费者支持重复消费

3. **超时设置**:
   - 查询操作: 5s
   - 写操作: 10s
   - 文件操作: 30s

4. **重试策略**:
   - GET: 重试所有错误
   - POST/PUT/DELETE: 只重试5xx

5. **错误处理**:
   - 记录详细日志
   - 返回友好错误信息
   - 不暴露内部实现细节

---

**文档维护**: 开发团队
**更新频率**: 架构变更时同步更新
**反馈渠道**: GitHub Issues

