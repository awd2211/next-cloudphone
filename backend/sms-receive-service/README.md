# SMS Receive Service

SMS验证码接收服务 - 为云手机平台提供虚拟号码和验证码接收功能

## 📋 功能特性

### 核心功能
- ✅ **单个号码请求** - 为单个设备请求虚拟号码
- ✅ **批量号码请求** - 一次性为最多100个设备批量请求
- ✅ **智能轮询** - 指数退避算法自动检查验证码（1s→60s）
- ✅ **自动取消退款** - 超时未收到验证码自动取消并退款

### 平台支持
- ✅ **SMS-Activate** - 主平台（180+国家，5000+应用）
- 🔲 **5sim** - 备用平台（即将支持）
- 🔲 **SMSPool** - 高风险平台支持（即将支持）

### 高级功能（计划中）
- 🔲 号码池预热
- 🔲 成本统计分析
- 🔲 余额监控告警
- 🔲 号码租赁支持

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

服务将在 `http://localhost:30007` 启动

## 📡 API 使用示例

### 请求虚拟号码

```bash
curl -X POST http://localhost:30007/numbers/request \
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
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "phoneNumber": "+79123456789",
    "provider": "sms-activate",
    "service": "telegram",
    "country": "RU",
    "cost": 0.10,
    "status": "active",
    "expiresAt": "2025-11-02T12:10:00Z"
  }
}
```

### 检查号码状态

```bash
curl http://localhost:30007/numbers/123e4567-e89b-12d3-a456-426614174000
```

### 取消号码

```bash
curl -X POST http://localhost:30007/numbers/123e4567-e89b-12d3-a456-426614174000/cancel
```

### 批量请求号码

```bash
curl -X POST http://localhost:30007/numbers/batch-request \
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

## 🔧 开发指南

### 项目结构

```
sms-receive-service/
├── src/
│   ├── entities/          # TypeORM实体
│   │   ├── virtual-number.entity.ts
│   │   ├── sms-message.entity.ts
│   │   ├── provider-config.entity.ts
│   │   └── number-pool.entity.ts
│   ├── providers/         # 平台适配器
│   │   ├── sms-activate.adapter.ts
│   │   ├── fivesim.adapter.ts (待实现)
│   │   └── smspool.adapter.ts (待实现)
│   ├── services/          # 业务逻辑
│   │   ├── number-management.service.ts
│   │   └── message-polling.service.ts
│   ├── controllers/       # API控制器
│   │   └── numbers.controller.ts
│   ├── dto/              # 数据传输对象
│   └── main.ts           # 入口文件
├── database/             # 数据库脚本
│   └── init-database.sql
├── test/                 # 测试文件
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

### 健康检查

```bash
curl http://localhost:30007/health
```

### Prometheus Metrics

```bash
curl http://localhost:30007/metrics
```

关键指标：
- `sms_number_requests_total` - 号码请求总数
- `sms_receive_duration_seconds` - 验证码接收时长
- `sms_active_numbers` - 当前活跃号码数
- `sms_provider_balance_usd` - 平台余额

## 🔌 系统集成

### RabbitMQ 事件

**发布的事件**:
- `sms.number.requested` - 号码请求成功
- `sms.code.received` - 验证码接收成功
- `sms.number.expired` - 号码过期
- `sms.number.cancelled` - 号码取消

**事件格式**:
```json
{
  "numberId": "uuid",
  "deviceId": "uuid",
  "phoneNumber": "+79123456789",
  "verificationCode": "123456",
  "service": "telegram"
}
```

### Device Service 集成

Device Service 可以监听 `sms.code.received` 事件，自动推送验证码到设备。

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
