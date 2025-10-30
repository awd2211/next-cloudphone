# 错误通知系统集成指南

**文档版本**: v1.0
**更新日期**: 2025-10-30
**适用范围**: 所有微服务

---

## 概述

本指南提供将错误通知系统集成到各个微服务的详细步骤和示例代码。

**已完成集成**:
- ✅ user-service (账号锁定、数据库连接失败、Redis连接失败)
- ✅ device-service (设备启动/停止失败、Docker连接失败)
- ✅ billing-service (支付创建失败、支付网关不可用)
- ✅ app-service (APK上传失败、MinIO连接失败)

---

## 集成步骤（通用）

### 步骤 1: 导入 EventBusModule

**文件**: `src/app.module.ts`

```typescript
import { EventBusModule } from '@cloudphone/shared';

@Module({
  imports: [
    // ... 其他模块
    EventBusModule.forRoot(),  // ✅ 添加事件总线
    // ... 其他模块
  ],
})
export class AppModule {}
```

### 步骤 2: 在服务中注入 EventBusService

**文件**: `src/your-feature/your.service.ts`

```typescript
import { EventBusService } from '@cloudphone/shared';

@Injectable()
export class YourService {
  private readonly logger = new Logger(YourService.name);

  constructor(
    // ... 其他依赖
    private eventBus: EventBusService,  // ✅ 注入事件总线
  ) {}
}
```

### 步骤 3: 在关键错误场景发布错误事件

```typescript
try {
  // 业务逻辑
} catch (error) {
  this.logger.error(`操作失败: ${error.message}`);

  // 发布系统错误事件
  try {
    await this.eventBus.publishSystemError(
      'high',  // 严重程度: critical | high | medium | low
      'YOUR_ERROR_CODE',  // 错误代码
      `错误描述: ${error.message}`,  // 技术消息
      'your-service',  // 服务名称
      {
        userMessage: '用户友好的错误消息',  // 可选
        requestId: requestId,  // 可选，从 req.id 获取
        userId: userId,  // 可选，如果有关联用户
        stackTrace: error.stack,  // 可选
        metadata: {  // 可选，额外元数据
          // 任意键值对
        },
      }
    );
  } catch (eventError) {
    this.logger.error('Failed to publish error event', eventError);
  }

  throw error;  // 重新抛出原始错误
}
```

### 步骤 4: 在 notification-service 配置错误代码

**文件**: `backend/notification-service/src/notifications/error-notification.service.ts`

在 `errorConfigs` Map 中添加新的错误代码配置：

```typescript
['YOUR_ERROR_CODE', {
  errorCode: 'YOUR_ERROR_CODE',
  severity: ErrorSeverity.HIGH,  // 根据实际情况选择
  threshold: 3,  // 触发阈值（次数）
  windowMinutes: 10,  // 时间窗口（分钟）
  notifyChannels: [NotificationChannel.WEBSOCKET],  // 通知渠道
  aggregateKey: 'errorCode',  // 聚合键
}],
```

---

## 服务特定集成

### User Service ✅ (已完成)

**集成场景**:
1. 账号锁定（5次登录失败）
2. 数据库连接失败

**文件**: `backend/user-service/src/auth/auth.service.ts`

**场景 1: 账号锁定**

```typescript
// 在 login() 方法中
if (user.loginAttempts >= 5) {
  user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  await queryRunner.manager.save(User, user);
  await queryRunner.commitTransaction();

  this.logger.warn(`Account locked: ${username}`);

  // ✅ 发布账号锁定事件
  try {
    await this.eventBus.publishSystemError(
      'medium',
      'ACCOUNT_LOCKED',
      `Account locked due to multiple failed login attempts: ${username}`,
      'user-service',
      {
        userMessage: '登录失败次数过多，账号已被锁定30分钟',
        userId: user.id,
        metadata: {
          username,
          loginAttempts: user.loginAttempts,
          lockedUntil: user.lockedUntil.toISOString(),
        },
      }
    );
  } catch (eventError) {
    this.logger.error('Failed to publish account locked event', eventError);
  }

  throw new UnauthorizedException('登录失败次数过多，账号已被锁定30分钟');
}
```

**场景 2: 数据库连接失败**

```typescript
} catch (error) {
  if (queryRunner.isTransactionActive) {
    await queryRunner.rollbackTransaction();
  }

  // ✅ 检查数据库连接错误
  if (error.code === 'ECONNREFUSED' || error.code === '57P03' || error.message?.includes('Connection')) {
    this.logger.error(`Database connection error: ${error.message}`);

    try {
      await this.eventBus.publishSystemError(
        'critical',
        'DATABASE_CONNECTION_FAILED',
        `Database connection failed during login: ${error.message}`,
        'user-service',
        {
          userMessage: '数据库连接失败，服务暂时不可用',
          stackTrace: error.stack,
          metadata: {
            errorCode: error.code,
            username,
          },
        }
      );
    } catch (eventError) {
      this.logger.error('Failed to publish database error event', eventError);
    }
  }

  throw error;
}
```

---

### Device Service (待集成)

**集成场景**:
1. 设备启动失败
2. 设备停止失败
3. ADB 连接失败
4. Docker 容器创建失败

**文件**: `backend/device-service/src/devices/devices.service.ts`

**场景 1: 设备启动失败**

```typescript
async startDevice(id: string, requestId?: string): Promise<Device> {
  const device = await this.deviceRepository.findOne({ where: { id } });

  if (!device) {
    throw BusinessErrors.deviceNotFound(id);
  }

  try {
    // 尝试启动设备
    await this.deviceProvider.startDevice(device);

    device.status = DeviceStatus.RUNNING;
    await this.deviceRepository.save(device);

    return device;
  } catch (error) {
    this.logger.error(`Failed to start device ${id}: ${error.message}`);

    // ✅ 发布设备启动失败事件
    try {
      await this.eventBus.publishSystemError(
        'high',
        'DEVICE_START_FAILED',
        `Failed to start device ${id}: ${error.message}`,
        'device-service',
        {
          userMessage: '设备启动失败，请稍后重试',
          requestId,
          userId: device.userId,
          stackTrace: error.stack,
          metadata: {
            deviceId: id,
            providerType: device.providerType,
            errorDetails: error.message,
          },
        }
      );
    } catch (eventError) {
      this.logger.error('Failed to publish device start failed event', eventError);
    }

    throw new BusinessException(
      BusinessErrorCode.DEVICE_START_FAILED,
      `Failed to start device: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      requestId,
      {
        userMessage: '设备启动失败，请稍后重试',
        recoverySuggestions: [
          {
            action: '重新启动',
            description: '尝试重新启动设备',
            actionUrl: `/devices/${id}/start`,
          },
          {
            action: '检查日志',
            description: '查看设备日志了解具体原因',
            actionUrl: `/devices/${id}/logs`,
          },
        ],
        retryable: true,
      }
    );
  }
}
```

**场景 2: Docker 连接失败**

```typescript
private async checkDockerConnection(): Promise<void> {
  try {
    await this.docker.ping();
  } catch (error) {
    this.logger.error(`Docker connection failed: ${error.message}`);

    // ✅ 发布 Docker 连接失败事件（严重错误）
    try {
      await this.eventBus.publishSystemError(
        'critical',
        'DOCKER_CONNECTION_FAILED',
        `Docker daemon connection failed: ${error.message}`,
        'device-service',
        {
          userMessage: 'Docker服务连接失败，无法管理设备',
          stackTrace: error.stack,
          metadata: {
            dockerHost: process.env.DOCKER_HOST || 'unix:///var/run/docker.sock',
            errorCode: error.code,
          },
        }
      );
    } catch (eventError) {
      this.logger.error('Failed to publish Docker error event', eventError);
    }

    throw error;
  }
}
```

---

### Billing Service (待集成)

**集成场景**:
1. 支付失败
2. 余额不足（高频）
3. 第三方支付网关连接失败

**文件**: `backend/billing-service/src/payments/payments.service.ts`

**场景 1: 支付失败**

```typescript
async processPayment(orderId: string, paymentDto: PaymentDto, requestId?: string): Promise<Payment> {
  const order = await this.orderRepository.findOne({ where: { id: orderId } });

  if (!order) {
    throw new NotFoundException('订单不存在');
  }

  try {
    // 调用支付网关
    const result = await this.paymentGateway.charge({
      amount: order.amount,
      currency: 'CNY',
      orderId: order.id,
      paymentMethod: paymentDto.paymentMethod,
    });

    // 创建支付记录
    const payment = this.paymentRepository.create({
      orderId: order.id,
      userId: order.userId,
      amount: order.amount,
      status: PaymentStatus.SUCCESS,
      transactionId: result.transactionId,
    });

    await this.paymentRepository.save(payment);

    return payment;
  } catch (error) {
    this.logger.error(`Payment failed for order ${orderId}: ${error.message}`);

    // ✅ 发布支付失败事件
    try {
      await this.eventBus.publishSystemError(
        'high',
        'PAYMENT_FAILED',
        `Payment failed for order ${orderId}: ${error.message}`,
        'billing-service',
        {
          userMessage: '支付失败，请稍后重试或联系客服',
          requestId,
          userId: order.userId,
          metadata: {
            orderId,
            amount: order.amount,
            paymentMethod: paymentDto.paymentMethod,
            gatewayError: error.message,
            errorCode: error.code,
          },
        }
      );
    } catch (eventError) {
      this.logger.error('Failed to publish payment failed event', eventError);
    }

    // 创建失败的支付记录
    const payment = this.paymentRepository.create({
      orderId: order.id,
      userId: order.userId,
      amount: order.amount,
      status: PaymentStatus.FAILED,
      errorMessage: error.message,
    });

    await this.paymentRepository.save(payment);

    throw new BusinessException(
      BusinessErrorCode.PAYMENT_FAILED,
      `Payment failed: ${error.message}`,
      HttpStatus.BAD_REQUEST,
      requestId,
      {
        userMessage: '支付失败，请稍后重试或联系客服',
        recoverySuggestions: [
          {
            action: '重试支付',
            description: '检查支付信息后重新尝试',
            actionUrl: `/orders/${orderId}/pay`,
          },
          {
            action: '更换支付方式',
            description: '尝试使用其他支付方式',
            actionUrl: `/orders/${orderId}/payment-methods`,
          },
          {
            action: '联系客服',
            description: '如果问题持续，请联系客服',
            actionUrl: '/support',
          },
        ],
        retryable: true,
      }
    );
  }
}
```

**场景 2: 支付网关连接失败**

```typescript
private async checkPaymentGatewayConnection(): Promise<void> {
  try {
    await this.paymentGateway.ping();
  } catch (error) {
    this.logger.error(`Payment gateway connection failed: ${error.message}`);

    // ✅ 发布支付网关连接失败事件（严重错误）
    try {
      await this.eventBus.publishSystemError(
        'critical',
        'PAYMENT_GATEWAY_UNAVAILABLE',
        `Payment gateway connection failed: ${error.message}`,
        'billing-service',
        {
          userMessage: '支付服务暂时不可用，请稍后重试',
          stackTrace: error.stack,
          metadata: {
            gateway: this.paymentGateway.name,
            endpoint: this.paymentGateway.endpoint,
            errorCode: error.code,
          },
        }
      );
    } catch (eventError) {
      this.logger.error('Failed to publish gateway error event', eventError);
    }

    throw error;
  }
}
```

---

### App Service (待集成)

**集成场景**:
1. APK 上传失败
2. APK 解析失败
3. 应用安装失败
4. MinIO 连接失败

**文件**: `backend/app-service/src/apps/apps.service.ts`

**场景 1: APK 上传失败**

```typescript
async uploadApp(file: Express.Multer.File, requestId?: string): Promise<Application> {
  try {
    // 上传到 MinIO
    const fileName = `${Date.now()}_${file.originalname}`;
    const uploadResult = await this.minioService.uploadFile(
      'apps',
      fileName,
      file.buffer,
      file.mimetype
    );

    // 解析 APK 信息
    const apkInfo = await this.parseApk(file.buffer);

    // 创建应用记录
    const app = this.appRepository.create({
      name: apkInfo.name,
      packageName: apkInfo.packageName,
      versionName: apkInfo.versionName,
      versionCode: apkInfo.versionCode,
      size: file.size,
      fileUrl: uploadResult.url,
      iconUrl: apkInfo.iconUrl,
    });

    await this.appRepository.save(app);

    return app;
  } catch (error) {
    this.logger.error(`App upload failed: ${error.message}`);

    // ✅ 发布 APK 上传失败事件
    try {
      await this.eventBus.publishSystemError(
        'medium',
        'APP_UPLOAD_FAILED',
        `APK upload failed: ${error.message}`,
        'app-service',
        {
          userMessage: 'APK上传失败，请稍后重试',
          requestId,
          metadata: {
            fileName: file.originalname,
            fileSize: file.size,
            errorDetails: error.message,
          },
        }
      );
    } catch (eventError) {
      this.logger.error('Failed to publish app upload failed event', eventError);
    }

    throw new BusinessException(
      BusinessErrorCode.APP_UPLOAD_FAILED,
      `APK upload failed: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      requestId,
      {
        userMessage: 'APK上传失败，请稍后重试',
        recoverySuggestions: [
          {
            action: '检查文件',
            description: '确认APK文件是否有效且未损坏',
          },
          {
            action: '检查文件大小',
            description: '确认文件大小不超过100MB',
          },
          {
            action: '重新上传',
            description: '尝试重新上传APK文件',
            actionUrl: '/apps/upload',
          },
        ],
        retryable: true,
      }
    );
  }
}
```

**场景 2: MinIO 连接失败**

```typescript
private async checkMinioConnection(): Promise<void> {
  try {
    await this.minioClient.bucketExists('apps');
  } catch (error) {
    this.logger.error(`MinIO connection failed: ${error.message}`);

    // ✅ 发布 MinIO 连接失败事件（严重错误）
    try {
      await this.eventBus.publishSystemError(
        'critical',
        'MINIO_CONNECTION_FAILED',
        `MinIO connection failed: ${error.message}`,
        'app-service',
        {
          userMessage: '文件存储服务连接失败，无法上传应用',
          stackTrace: error.stack,
          metadata: {
            endpoint: process.env.MINIO_ENDPOINT,
            bucket: 'apps',
            errorCode: error.code,
          },
        }
      );
    } catch (eventError) {
      this.logger.error('Failed to publish MinIO error event', eventError);
    }

    throw error;
  }
}
```

---

## 错误严重程度选择指南

### CRITICAL (严重)

**特征**:
- 系统级故障
- 影响所有用户
- 需要立即处理
- 可能导致服务不可用

**阈值**: 1次
**通知渠道**: WebSocket + Email

**示例**:
- ✅ `DATABASE_CONNECTION_FAILED` - 数据库连接失败
- ✅ `REDIS_CONNECTION_FAILED` - Redis 连接失败
- ✅ `RABBITMQ_CONNECTION_FAILED` - RabbitMQ 连接失败
- ✅ `DOCKER_CONNECTION_FAILED` - Docker 连接失败
- ✅ `PAYMENT_GATEWAY_UNAVAILABLE` - 支付网关不可用
- ✅ `MINIO_CONNECTION_FAILED` - MinIO 连接失败

### HIGH (高)

**特征**:
- 影响核心功能
- 影响部分用户
- 需要尽快处理
- 可能影响业务流程

**阈值**: 3-5次
**通知渠道**: WebSocket

**示例**:
- ✅ `DEVICE_START_FAILED` - 设备启动失败
- ✅ `DEVICE_STOP_FAILED` - 设备停止失败
- ✅ `PAYMENT_FAILED` - 支付失败
- ✅ `APP_INSTALL_FAILED` - 应用安装失败

### MEDIUM (中)

**特征**:
- 影响部分功能
- 用户可以通过其他方式解决
- 需要关注但不紧急

**阈值**: 10次
**通知渠道**: WebSocket

**示例**:
- ✅ `ACCOUNT_LOCKED` - 账号锁定
- ✅ `QUOTA_EXCEEDED` - 配额超限
- ✅ `INSUFFICIENT_BALANCE` - 余额不足
- ✅ `APP_UPLOAD_FAILED` - 应用上传失败

### LOW (低)

**特征**:
- 一般错误
- 不影响核心功能
- 用户可以自行解决

**阈值**: 50次
**通知渠道**: WebSocket

**示例**:
- ✅ `VALIDATION_ERROR` - 验证错误
- ✅ `INVALID_INPUT` - 无效输入
- ✅ `RATE_LIMIT_EXCEEDED` - 频率限制超出

---

## 错误代码命名规范

### 格式

```
<RESOURCE>_<ACTION>_<RESULT>
```

### 示例

- ✅ `DEVICE_START_FAILED` - 设备启动失败
- ✅ `PAYMENT_PROCESS_FAILED` - 支付处理失败
- ✅ `DATABASE_CONNECTION_FAILED` - 数据库连接失败
- ✅ `USER_ACCOUNT_LOCKED` - 用户账号锁定
- ✅ `APP_UPLOAD_FAILED` - 应用上传失败

### 不推荐

- ❌ `ERROR_001` - 数字代码（不可读）
- ❌ `FAIL` - 太模糊
- ❌ `DeviceStartError` - 驼峰命名（应使用下划线）

---

## 测试建议

### 1. 单元测试

```typescript
describe('YourService', () => {
  let service: YourService;
  let eventBus: EventBusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        {
          provide: EventBusService,
          useValue: {
            publishSystemError: jest.fn(),
          },
        },
        // ... 其他依赖
      ],
    }).compile();

    service = module.get<YourService>(YourService);
    eventBus = module.get<EventBusService>(EventBusService);
  });

  it('should publish error event when operation fails', async () => {
    // Arrange
    const errorToThrow = new Error('Operation failed');

    // Act & Assert
    await expect(service.yourMethod()).rejects.toThrow(errorToThrow);
    expect(eventBus.publishSystemError).toHaveBeenCalledWith(
      'high',
      'YOUR_ERROR_CODE',
      expect.stringContaining('Operation failed'),
      'your-service',
      expect.any(Object)
    );
  });
});
```

### 2. 集成测试

```bash
# 1. 启动所有服务
pm2 start ecosystem.config.js

# 2. 配置管理员ID
echo "ADMIN_USER_IDS=your_admin_user_id" >> backend/notification-service/.env

# 3. 重启 notification-service
pm2 restart notification-service

# 4. 触发错误（例如：设备启动失败）
curl -X POST http://localhost:30002/devices/test_device/start \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. 检查是否收到通知
# 登录管理后台 → 查看右上角铃铛图标
```

---

## 常见问题

### Q1: EventBusService 注入失败

**错误**:
```
Nest can't resolve dependencies of the YourService (?). Please make sure that the argument EventBusService at index [X] is available in the YourModule context.
```

**解决方案**:
确保在 `app.module.ts` 中导入了 `EventBusModule.forRoot()`

### Q2: 发布错误事件失败

**错误**:
```
Failed to publish error event: AmqpConnection not available
```

**解决方案**:
1. 检查 RabbitMQ 是否运行：`docker ps | grep rabbitmq`
2. 检查环境变量：`RABBITMQ_URL=amqp://admin:admin123@localhost:5672/cloudphone`
3. 重启服务：`pm2 restart your-service`

### Q3: 未收到通知

**原因**:
1. 错误代码未配置在 `errorConfigs` 中
2. 未达到触发阈值
3. 管理员ID未配置
4. notification-service 未运行

**解决方案**:
1. 检查 `errorConfigs` 是否包含该错误代码
2. 查看日志：`pm2 logs notification-service`
3. 配置管理员ID：`ADMIN_USER_IDS=your_user_id`
4. 确保 notification-service 运行：`pm2 list | grep notification`

---

## 最佳实践

### 1. 异常处理模式

```typescript
// ✅ 好的做法
try {
  await this.criticalOperation();
} catch (error) {
  this.logger.error(`Operation failed: ${error.message}`);

  // 发布错误事件（不影响主流程）
  try {
    await this.eventBus.publishSystemError(...);
  } catch (eventError) {
    this.logger.error('Failed to publish error event', eventError);
  }

  // 重新抛出原始错误
  throw error;
}

// ❌ 不好的做法：吞掉错误
try {
  await this.criticalOperation();
} catch (error) {
  await this.eventBus.publishSystemError(...);
  // ❌ 忘记重新抛出错误
}
```

### 2. 避免过度告警

```typescript
// ✅ 好的做法：只对真正严重的错误发送通知
if (error.code === 'ECONNREFUSED') {
  await this.eventBus.publishSystemError('critical', ...);
}

// ❌ 不好的做法：所有错误都发送通知
catch (error) {
  await this.eventBus.publishSystemError('critical', ...);
  // 这会导致通知风暴
}
```

### 3. 提供有用的元数据

```typescript
// ✅ 好的做法：提供详细的上下文
await this.eventBus.publishSystemError(
  'high',
  'DEVICE_START_FAILED',
  `Failed to start device ${deviceId}`,
  'device-service',
  {
    userMessage: '设备启动失败',
    requestId: req.id,
    userId: device.userId,
    metadata: {
      deviceId,
      providerType: device.providerType,
      containerStatus: 'timeout',
      lastKnownState: 'starting',
    },
  }
);

// ❌ 不好的做法：缺少上下文
await this.eventBus.publishSystemError(
  'high',
  'DEVICE_START_FAILED',
  'Failed',
  'device-service'
);
```

---

## 基础设施错误捕获

### Redis 连接失败 (REDIS_CONNECTION_FAILED)

**场景**: Redis 缓存服务连接失败或断开

**集成位置**: `CacheService` 构造函数中的 Redis 连接错误监听

**代码示例** (user-service/cache.service.ts):

```typescript
import { Optional } from '@nestjs/common';
import { EventBusService } from '@cloudphone/shared';

constructor(
  private readonly configService: ConfigService,
  @Optional() private readonly eventBus: EventBusService,
) {
  // 初始化 Redis
  this.redis = new Redis({
    host: this.config.redis.host,
    port: this.config.redis.port,
    password: this.config.redis.password,
    db: this.config.redis.db,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  // ✅ Redis 错误事件监听
  this.redis.on('error', (err) => {
    this.logger.error(`Redis error: ${err.message}`);

    // 发布严重错误事件
    if (this.eventBus) {
      this.eventBus.publishSystemError(
        'high',
        'REDIS_CONNECTION_FAILED',
        `Redis connection error: ${err.message}`,
        'user-service',
        {
          userMessage: 'Redis 缓存服务连接失败',
          stackTrace: err.stack,
          metadata: {
            host: this.config.redis.host,
            port: this.config.redis.port,
            db: this.config.redis.db,
            errorMessage: err.message,
          },
        }
      ).catch(eventError => {
        this.logger.error('Failed to publish Redis error event', eventError);
      });
    }
  });

  this.redis.on('connect', () => {
    this.logger.log('Redis connected successfully');
  });
}
```

**错误配置** (notification-service):

```typescript
['REDIS_CONNECTION_FAILED', {
  errorCode: 'REDIS_CONNECTION_FAILED',
  severity: ErrorSeverity.HIGH,
  threshold: 5,
  windowMinutes: 15,
  notifyChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
  aggregateKey: 'errorCode',
}]
```

### RabbitMQ 连接失败 (RABBITMQ_CONNECTION_FAILED)

**场景**: RabbitMQ 消息队列连接失败或断开

**集成位置**: EventBusService 或 RabbitMQ 模块中

**错误配置** (notification-service):

```typescript
['RABBITMQ_CONNECTION_FAILED', {
  errorCode: 'RABBITMQ_CONNECTION_FAILED',
  severity: ErrorSeverity.CRITICAL,
  threshold: 3,
  windowMinutes: 10,
  notifyChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
  aggregateKey: 'errorCode',
}]
```

**注意**: RabbitMQ 连接失败是严重级别 (CRITICAL)，因为它会影响整个事件驱动架构的运行。

---

## 测试错误通知

### 使用测试脚本

项目提供了综合测试脚本:

```bash
./scripts/test-error-notifications.sh
```

**功能**:
- 检查所有服务状态
- 测试各种错误场景
- 查看错误通知统计
- 交互式菜单操作

**测试场景**:
1. 账号锁定错误 (自动)
2. 数据库连接失败 (手动)
3. 设备启动失败 (需要 Token)
4. 支付创建失败 (手动)
5. APK 上传失败 (需要 Token)
6. Redis 连接失败 (手动)

### 手动测试

**测试账号锁定**:
```bash
for i in {1..5}; do
  curl -X POST http://localhost:30000/api/users/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong","captcha":"test","captchaId":"test"}'
done
```

**测试 Redis 连接失败**:
```bash
# 1. 停止 Redis
docker compose -f docker-compose.dev.yml stop redis

# 2. 重启 user-service (触发 Redis 连接错误)
pm2 restart user-service

# 3. 查看日志
pm2 logs user-service --lines 50
pm2 logs notification-service --lines 50

# 4. 恢复 Redis
docker compose -f docker-compose.dev.yml start redis
```

**查看错误通知**:
```bash
# 查看 notification-service 日志
pm2 logs notification-service

# 查看错误聚合情况
pm2 logs notification-service | grep -i "threshold\|aggregat"

# 查看特定错误类型
pm2 logs notification-service | grep "REDIS_CONNECTION_FAILED"
```

---

## 总结

**集成清单**:
- ✅ 导入 EventBusModule
- ✅ 注入 EventBusService
- ✅ 在关键错误场景发布事件
- ✅ 在 notification-service 配置错误代码
- ✅ 测试验证
- ✅ 基础设施错误监控 (Redis, RabbitMQ)

**已覆盖的错误场景**:
- 🔐 认证错误: 账号锁定、数据库连接失败
- 📱 设备错误: 启动/停止失败、Docker连接失败
- 💰 支付错误: 支付创建失败、网关不可用
- 📦 应用错误: APK上传失败、MinIO连接失败
- 🔧 基础设施: Redis连接失败、RabbitMQ连接失败

**预期效果**:
- 管理员实时收到严重错误通知
- 错误聚合避免通知风暴
- 详细的错误上下文便于快速定位问题
- 系统稳定性和可观测性大幅提升
- 完整的错误覆盖从应用层到基础设施层

---

**文档更新日期**: 2025-10-30
**版本**: v1.1
**作者**: Claude Code
**测试脚本**: `scripts/test-error-notifications.sh`
