# SMS Receive Service

SMS验证码接收服务 - 为云手机平台提供虚拟号码和验证码接收功能

## 📋 功能特性

### 核心功能
- ✅ **单个号码请求** - 为单个设备请求虚拟号码
- ✅ **批量号码请求** - 一次性为最多100个设备批量请求
- ✅ **批量轮询** - 每10秒批量检查最多500个活跃号码(50个一批)
- ✅ **自动取消退款** - 超时未收到验证码自动取消并退款
- ✅ **号码池支持** - 预分配号码池,提高请求速度
- ✅ **健康检查** - 定时检查数据库/Redis/RabbitMQ健康状态
- ✅ **Prometheus Metrics** - 完整的性能指标监控

### 平台支持
- ✅ **SMS-Activate** - 主平台（180+国家，5000+应用）
- ✅ **5sim** - 备用平台（已支持）
- ✅ **智能路由** - 自动选择最佳平台(成本优化/可靠性优先/负载均衡/轮询)

### 监控能力
- ✅ REST API 完整文档 (Swagger UI)
- ✅ Prometheus metrics 端点
- ✅ 详细健康检查 (数据库/Redis/RabbitMQ)
- ✅ Kubernetes 就绪性探针 (liveness/readiness)

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要参数：

```env
# SMS-Activate API Key (从 https://sms-activate.io 获取)
SMS_ACTIVATE_API_KEY=your_api_key_here

# Database
DB_DATABASE=cloudphone_sms

# 其他配置使用默认值即可
```

### 3. 初始化数据库

```bash
# 方式1: 使用SQL脚本
psql -U postgres -f database/init-database.sql

# 方式2: 使用Docker Compose
docker compose -f ../../docker-compose.dev.yml exec -T postgres \
  psql -U postgres < database/init-database.sql
```

### 4. 启动服务

```bash
# 开发模式（热重载）
pnpm dev

# 生产模式
pnpm build
pnpm start:prod
```

服务将在 `http://localhost:30008` 启动

**Swagger API 文档**: `http://localhost:30008/api/docs`

## 📡 API 使用示例

### 请求虚拟号码

```bash
curl -X POST http://localhost:30008/numbers \
  -H "Content-Type: application/json" \
  -d '{
    "service": "telegram",
    "country": "RU",
    "deviceId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

响应：
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "phoneNumber": "+79123456789",
  "provider": "sms-activate",
  "serviceCode": "tg",
  "serviceName": "telegram",
  "countryCode": "RU",
  "cost": 0.10,
  "status": "active",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "activatedAt": "2025-11-02T12:00:00Z",
  "expiresAt": "2025-11-02T12:20:00Z",
  "fromPool": false,
  "selectedByAlgorithm": "smart-routing"
}
```

### 检查号码状态

```bash
curl http://localhost:30008/numbers/123e4567-e89b-12d3-a456-426614174000
```

### 取消号码

```bash
curl -X DELETE http://localhost:30008/numbers/123e4567-e89b-12d3-a456-426614174000
```

响应：
```json
{
  "refunded": true,
  "amount": 0.10,
  "message": "Number cancelled and refunded $0.10"
}
```

### 批量请求号码

```bash
curl -X POST http://localhost:30008/numbers/batch \
  -H "Content-Type: application/json" \
  -d '{
    "service": "telegram",
    "country": "RU",
    "deviceIds": [
      "device-uuid-1",
      "device-uuid-2",
      "device-uuid-3"
    ]
  }'
```

响应：
```json
{
  "total": 3,
  "successful": 2,
  "failed": 1,
  "numbers": [
    {
      "deviceId": "device-uuid-1",
      "numberId": "num-id-1",
      "phoneNumber": "+79123456789",
      "provider": "sms-activate",
      "error": null
    },
    {
      "deviceId": "device-uuid-2",
      "numberId": "num-id-2",
      "phoneNumber": "+79123456790",
      "provider": "5sim",
      "error": null
    },
    {
      "deviceId": "device-uuid-3",
      "numberId": null,
      "phoneNumber": null,
      "provider": null,
      "error": "No numbers available"
    }
  ]
}
```

### 获取号码的短信消息

```bash
curl http://localhost:30008/numbers/123e4567-e89b-12d3-a456-426614174000/messages
```

### 手动触发轮询 (管理员功能)

```bash
curl -X POST http://localhost:30008/numbers/poll/trigger
```

## 🔧 开发指南

### 项目结构

```
sms-receive-service/
├── src/
│   ├── entities/          # TypeORM实体
│   │   ├── virtual-number.entity.ts   # 虚拟号码
│   │   ├── sms-message.entity.ts      # 短信消息
│   │   ├── provider-config.entity.ts  # 平台配置
│   │   └── number-pool.entity.ts      # 号码池
│   ├── providers/         # 平台适配器
│   │   ├── provider.interface.ts      # 统一接口
│   │   ├── sms-activate.adapter.ts    # SMS-Activate ✅
│   │   └── 5sim.adapter.ts            # 5sim ✅
│   ├── services/          # 业务逻辑
│   │   ├── number-management.service.ts  # 号码管理
│   │   ├── message-polling.service.ts    # 批量轮询
│   │   └── platform-selector.service.ts  # 智能路由
│   ├── controllers/       # API控制器
│   │   └── numbers.controller.ts      # REST API
│   ├── health/            # 健康检查与监控
│   │   ├── health-check.service.ts    # 定时健康检查
│   │   ├── metrics.service.ts         # Prometheus指标
│   │   ├── health.controller.ts       # 监控端点
│   │   └── health.module.ts
│   ├── dto/              # 数据传输对象
│   │   ├── request-number.dto.ts      # 请求DTO
│   │   └── number-response.dto.ts     # 响应DTO
│   ├── app.module.ts     # 应用模块
│   └── main.ts           # 入口文件
├── database/             # 数据库脚本
│   └── init-database.sql
├── test/                 # 测试文件
├── .env.example          # 环境变量模板
└── README.md
```

### 运行测试

```bash
# 单元测试
pnpm test

# 测试覆盖率
pnpm test:cov

# 监听模式
pnpm test:watch
```

### 代码规范

```bash
# Lint
pnpm lint

# Format
pnpm format
```

## 🌐 支持的服务

| 服务 | 代码 | SMS-Activate | 5sim | SMSPool |
|------|------|-------------|------|---------|
| Google | `google` | ✅ | ✅ | ✅ |
| Telegram | `telegram` | ✅ | ✅ | ✅ |
| WhatsApp | `whatsapp` | ✅ | ✅ | ✅ |
| Facebook | `facebook` | ✅ | ✅ | ✅ |
| Instagram | `instagram` | ✅ | ✅ | ✅ |
| Twitter | `twitter` | ✅ | ✅ | ✅ |
| TikTok | `tiktok` | ✅ | ✅ | ✅ |
| Discord | `discord` | ✅ | ✅ | ❌ |

完整列表：5000+ 应用支持

## 🌍 支持的国家

| 国家 | 代码 | 平均价格 |
|------|------|----------|
| 俄罗斯 | `RU` | $0.01-0.15 |
| 美国 | `US` | $0.50-2.00 |
| 英国 | `GB` | $0.30-1.50 |
| 中国 | `CN` | $0.15-0.80 |
| 印度 | `IN` | $0.05-0.20 |

完整列表：180+ 国家支持

## 📊 监控和指标

### 健康检查端点

#### 基础健康检查
```bash
curl http://localhost:30008/health
```

响应：
```json
{
  "status": "ok",
  "timestamp": "2025-11-02T12:00:00Z"
}
```

#### 详细健康检查
```bash
curl http://localhost:30008/health/detailed
```

响应：
```json
{
  "overall": "healthy",
  "database": {
    "healthy": true,
    "lastCheck": "2025-11-02T12:00:00Z",
    "error": null
  },
  "redis": {
    "healthy": true,
    "lastCheck": "2025-11-02T12:00:00Z",
    "error": null
  },
  "rabbitmq": {
    "healthy": true,
    "lastCheck": "2025-11-02T12:00:00Z",
    "error": null
  },
  "timestamp": "2025-11-02T12:00:00Z"
}
```

#### Kubernetes 探针
```bash
# Liveness probe - 进程是否存活
curl http://localhost:30008/health/live

# Readiness probe - 是否就绪接收流量
curl http://localhost:30008/health/ready
```

### Prometheus Metrics

```bash
curl http://localhost:30008/metrics
```

**关键指标**：

#### Counters (累积计数器)
- `sms_number_requests_total{provider,service,status}` - 号码请求总数
- `sms_messages_received_total{provider,service}` - 短信接收总数
- `sms_number_cancellations_total{provider,reason}` - 号码取消总数
- `sms_errors_total{type,provider}` - 错误总数

#### Gauges (实时状态)
- `sms_active_numbers{provider,status}` - 活跃号码数
- `sms_waiting_numbers` - 等待短信的号码数
- `sms_provider_health{provider}` - 提供商健康状态(1=healthy, 0=unhealthy)

#### Histograms (分布统计)
- `sms_polling_duration_seconds` - 轮询持续时间
- `sms_number_request_duration_seconds{provider}` - 号码请求持续时间

### 监控统计 API

#### 轮询统计
```bash
curl http://localhost:30008/numbers/stats/polling
```

响应：
```json
{
  "isPolling": true,
  "activeNumbers": 45,
  "receivedToday": 120,
  "expiredToday": 8
}
```

#### 平台统计
```bash
curl http://localhost:30008/numbers/stats/providers
```

响应：
```json
[
  {
    "providerName": "sms-activate",
    "totalRequests": 1000,
    "successCount": 950,
    "failureCount": 50,
    "averageResponseTime": 1.2,
    "averageCost": 0.12,
    "successRate": 95.0,
    "isHealthy": true,
    "consecutiveFailures": 0
  },
  {
    "providerName": "5sim",
    "totalRequests": 500,
    "successCount": 480,
    "failureCount": 20,
    "averageResponseTime": 0.8,
    "averageCost": 0.15,
    "successRate": 96.0,
    "isHealthy": true,
    "consecutiveFailures": 0
  }
]
```

## 🔌 系统集成

### RabbitMQ 事件

SMS Receive Service 通过 RabbitMQ 发布以下事件：

#### 1. `sms.message.received` - 短信接收成功
```json
{
  "messageId": "msg-uuid",
  "numberId": "num-uuid",
  "deviceId": "device-uuid",
  "userId": "user-uuid",
  "phoneNumber": "+79123456789",
  "verificationCode": "123456",
  "messageText": "Your verification code is 123456",
  "service": "telegram",
  "provider": "sms-activate",
  "receivedAt": "2025-11-02T12:00:00Z"
}
```

#### 2. `sms.number.expired` - 号码过期
```json
{
  "numberId": "num-uuid",
  "deviceId": "device-uuid",
  "userId": "user-uuid",
  "phoneNumber": "+79123456789",
  "service": "telegram",
  "provider": "sms-activate",
  "reason": "expired",
  "expiredAt": "2025-11-02T12:20:00Z"
}
```

### Device Service 集成

Device Service 应该监听 `sms.message.received` 事件，自动推送验证码到对应的云手机设备：

```typescript
@RabbitSubscribe({
  exchange: 'cloudphone.events',
  routingKey: 'sms.message.received',
  queue: 'device-service.sms-received',
})
async handleSmsReceived(event: SmsReceivedEvent) {
  const { deviceId, verificationCode } = event;
  // 将验证码推送到设备
  await this.deviceService.pushVerificationCode(deviceId, verificationCode);
}
```

## 🐛 故障排查

### 问题：无法获取号码

**可能原因**:
1. API Key 未配置或错误
2. 余额不足
3. 该服务/国家当前无号码

**解决方案**:
```bash
# 检查API Key
echo $SMS_ACTIVATE_API_KEY

# 检查余额（访问SMS-Activate官网）
# 或等待几分钟后重试
```

### 问题：验证码未收到

**可能原因**:
1. 平台短信网关延迟（正常）
2. 应用检测到虚拟号码
3. 号码已被封禁

**解决方案**:
- 等待5-10分钟
- 系统会自动取消并退款
- 重新请求新号码

### 问题：轮询占用过高

**解决方案**:
```bash
# 调整轮询参数（.env）
POLLING_INITIAL_DELAY_MS=2000  # 增加初始延迟
POLLING_MAX_DELAY_MS=120000    # 增加最大延迟
```

## 📝 配置参考

### 平台 API 密钥获取

**SMS-Activate**:
1. 访问 https://sms-activate.io
2. 注册账号并充值
3. 进入 Profile → API
4. 复制 API Key

**5sim** (即将支持):
1. 访问 https://5sim.net
2. 注册账号
3. 进入 Profile → API
4. 复制 Bearer Token

### 环境变量完整列表

见 `.env.example` 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

Private - CloudPhone Platform

## 🔗 相关文档

- [SMS-Activate API文档](https://sms-activate.io/api)
- [5sim API文档](https://5sim.net/support/working-with-api)
- [项目调研报告](../../docs/PROXY_SERVICE_RESEARCH_REPORT.md)
- [完整实施计划](../../docs/SMS_RECEIVE_FULL_IMPLEMENTATION_PLAN.md)
- [快速开始指南](../../docs/SMS_RECEIVE_QUICK_START.md)
