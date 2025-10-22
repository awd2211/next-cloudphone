# 通知服务后续功能实现方案

**当前进度**: 阶段3完成 ✅
**下一步**: 阶段5-7 实现计划

---

## 📊 已完成功能总结

### ✅ 阶段1: RabbitMQ完整集成
- RabbitMQ模块和配置
- 7个消费者（用户、设备、应用、账单、调度器、媒体、系统）
- 统一的事件Schema和TypeScript类型
- 完整的文档

### ✅ 阶段2: 高级队列特性
- 死信队列（DLX）+ 失败重试机制
- 消息优先级队列（P0-P3）
- 自动重试（最多3次）
- 永久失败告警

### ✅ 阶段3: 模板系统
- 完整的CRUD API（11个端点）
- Handlebars渲染引擎 + 4个自定义辅助函数
- **15个初始模板已导入数据库**
- 500+行详细文档

---

## 🎯 待实现功能方案

### 阶段5: 批量通知API

#### 5.1 批量发送接口

**新增DTO**:
```typescript
// src/notifications/dto/bulk-send.dto.ts
export class BulkSendNotificationDto {
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];  // 目标用户ID列表

  @IsString()
  templateCode: string;  // 模板代码

  @IsObject()
  data: Record<string, any>;  // 渲染数据

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @IsOptional()
  channels?: NotificationChannel[];  // 可选：指定渠道

  @IsEnum(MessagePriority)
  @IsOptional()
  priority?: MessagePriority;  // 可选：优先级
}
```

**新增API端点**:
```typescript
POST /notifications/bulk
{
  "userIds": ["user-1", "user-2", "user-3"],
  "templateCode": "billing.low_balance",
  "data": {
    "balance": 10.00,
    "daysRemaining": 2
  },
  "channels": ["email", "sms"],
  "priority": "high"
}

// 返回
{
  "batchId": "batch-uuid",
  "totalUsers": 3,
  "status": "processing",
  "createdAt": "2025-01-22T10:00:00Z"
}
```

#### 5.2 批量任务队列处理

**实现方式**:
1. 使用RabbitMQ任务队列异步处理
2. 将大批量拆分为小批次（每批100个用户）
3. 并发处理，限制并发数

**队列配置**:
```typescript
// src/notifications/queues/bulk-notification.queue.ts
@RabbitSubscribe({
  exchange: 'cloudphone.notifications',
  routingKey: 'bulk.send',
  queue: 'notification-service.bulk.send',
  queueOptions: {
    durable: true,
    arguments: {
      'x-max-priority': 10,
    },
  },
})
async handleBulkSend(msg: BulkNotificationMessage) {
  const { batchId, userIds, templateCode, data, channels } = msg;

  // 分批处理
  const chunks = this.chunkArray(userIds, 100);

  for (const chunk of chunks) {
    await Promise.allSettled(
      chunk.map(userId =>
        this.sendToUser(userId, templateCode, data, channels)
      )
    );

    // 更新进度
    await this.updateBatchProgress(batchId, chunk.length);
  }
}
```

#### 5.3 进度追踪功能

**Redis存储进度**:
```typescript
// 存储批次信息
const batchInfo = {
  batchId: 'batch-uuid',
  totalUsers: 1000,
  processedUsers: 0,
  successCount: 0,
  failureCount: 0,
  status: 'processing' | 'completed' | 'failed',
  createdAt: Date,
  completedAt: Date | null,
};

// Redis Key: batch:${batchId}
await redis.set(`batch:${batchId}`, JSON.stringify(batchInfo), 'EX', 3600);
```

**查询进度API**:
```typescript
GET /notifications/bulk/:batchId

// 返回
{
  "batchId": "batch-uuid",
  "totalUsers": 1000,
  "processedUsers": 750,
  "successCount": 720,
  "failureCount": 30,
  "status": "processing",
  "progress": 75.0,
  "estimatedTimeRemaining": "2 minutes",
  "createdAt": "2025-01-22T10:00:00Z"
}
```

---

### 阶段6: WebSocket实时推送

#### 6.1 完善NotificationGateway

**当前代码** (`src/websocket/notification.gateway.ts`):
```typescript
@WebSocketGateway({ cors: true })
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, userId: string) {
    // 加入用户专属房间
    client.join(`user:${userId}`);
  }
}
```

**需要完善**:

1. **在线状态管理**:
```typescript
private onlineUsers: Map<string, Set<string>> = new Map();
// userId -> Set<socketId>

handleConnection(client: Socket) {
  const userId = this.extractUserId(client);
  if (!this.onlineUsers.has(userId)) {
    this.onlineUsers.set(userId, new Set());
  }
  this.onlineUsers.get(userId).add(client.id);

  // 广播用户上线
  this.server.emit('user:online', { userId });
}

handleDisconnect(client: Socket) {
  const userId = this.extractUserId(client);
  this.onlineUsers.get(userId)?.delete(client.id);

  if (this.onlineUsers.get(userId)?.size === 0) {
    this.onlineUsers.delete(userId);
    this.server.emit('user:offline', { userId });
  }
}
```

2. **实时推送通知**:
```typescript
async sendToUser(userId: string, notification: Notification) {
  // 检查用户是否在线
  if (this.onlineUsers.has(userId)) {
    // 发送到用户的所有连接
    this.server.to(`user:${userId}`).emit('notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      createdAt: notification.createdAt,
    });

    // 标记为已推送
    await this.notificationsService.markAsPushed(notification.id);
  }
}
```

3. **消息确认机制**:
```typescript
@SubscribeMessage('notification:read')
async handleNotificationRead(
  client: Socket,
  payload: { notificationId: string }
) {
  const userId = this.extractUserId(client);
  await this.notificationsService.markAsRead(
    payload.notificationId,
    userId
  );

  // 确认ACK
  client.emit('notification:read:ack', {
    notificationId: payload.notificationId,
    timestamp: new Date(),
  });
}
```

#### 6.2 集成到通知发送流程

**修改NotificationsService**:
```typescript
async send(dto: CreateNotificationDto) {
  // 1. 保存到数据库
  const notification = await this.create(dto);

  // 2. 发送到各渠道
  const promises = [];

  if (dto.channels.includes('email')) {
    promises.push(this.emailService.send(...));
  }

  if (dto.channels.includes('sms')) {
    promises.push(this.smsService.send(...));
  }

  if (dto.channels.includes('websocket')) {
    // 实时推送
    promises.push(
      this.notificationGateway.sendToUser(dto.userId, notification)
    );
  }

  await Promise.allSettled(promises);
  return notification;
}
```

---

### 阶段7-10: 业务场景集成

#### 7.1 整合模板渲染到RabbitMQ消费者

**修改user-events.consumer.ts**:
```typescript
import { TemplatesService } from '../templates/templates.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UserEventsConsumer {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'user.registered',
    queue: 'notification-service.user.registered',
  })
  async handleUserRegistered(msg: UserRegisteredEvent) {
    this.logger.log(`用户注册事件: ${msg.userId}`);

    try {
      // 1. 渲染模板
      const rendered = await this.templatesService.render(
        'user.registered',
        {
          username: msg.username,
          email: msg.email,
          registeredAt: msg.registeredAt,
          loginUrl: 'https://cloudphone.example.com/login',
        },
        'zh-CN'
      );

      // 2. 发送通知
      await this.notificationsService.send({
        userId: msg.userId,
        type: NotificationType.SYSTEM,
        title: rendered.title,
        body: rendered.body,
        channels: [
          NotificationChannel.EMAIL,
          NotificationChannel.SMS,
          NotificationChannel.WEBSOCKET,
        ],
        metadata: {
          eventType: 'user.registered',
          eventData: msg,
        },
      });

      // 3. 发送邮件
      if (rendered.emailHtml) {
        await this.emailService.send({
          to: msg.email,
          subject: rendered.title,
          html: rendered.emailHtml,
        });
      }

      // 4. 发送短信
      if (rendered.smsText && msg.phone) {
        await this.smsService.send({
          phone: msg.phone,
          text: rendered.smsText,
        });
      }

      this.logger.log(`✅ 用户注册通知已发送: ${msg.userId}`);
    } catch (error) {
      this.logger.error(
        `❌ 用户注册通知发送失败: ${msg.userId}`,
        error
      );
      throw error; // 触发DLX重试
    }
  }

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'user.login_failed',
    queue: 'notification-service.user.login_failed',
  })
  async handleLoginFailed(msg: UserLoginFailedEvent) {
    // 渲染 user.login_failed 模板
    const rendered = await this.templatesService.render(
      'user.login_failed',
      {
        username: msg.username,
        ipAddress: msg.ipAddress,
        location: msg.location,
        attemptTime: msg.attemptTime,
      }
    );

    // 发送安全警告
    await this.notificationsService.send({
      userId: msg.userId,
      type: NotificationType.ALERT,
      title: rendered.title,
      body: rendered.body,
      channels: [
        NotificationChannel.EMAIL,
        NotificationChannel.SMS,
        NotificationChannel.PUSH,
      ],
      priority: MessagePriority.URGENT, // P0优先级
    });
  }
}
```

#### 7.2 为所有消费者添加模板集成

需要修改的消费者：
1. ✅ `user-events.consumer.ts` (6个事件)
2. ✅ `device-events.consumer.ts` (7个事件)
3. ✅ `billing-events.consumer.ts` (3个事件)
4. ✅ `app-events.consumer.ts` (3个事件)
5. ✅ `system-events.consumer.ts` (1个事件)

**每个消费者的改造模式**:
```typescript
// 1. 注入TemplatesService
constructor(
  private readonly templatesService: TemplatesService,
  private readonly notificationsService: NotificationsService,
  private readonly emailService: EmailService,
) {}

// 2. 在每个事件处理器中
async handleEvent(msg: EventData) {
  // 渲染模板
  const rendered = await this.templatesService.render(
    'template.code',
    msg,
    'zh-CN'
  );

  // 发送通知（多渠道）
  await this.sendMultiChannel(msg.userId, rendered);
}

// 3. 统一的多渠道发送方法
private async sendMultiChannel(
  userId: string,
  rendered: RenderedTemplate,
  options: {
    channels: NotificationChannel[];
    priority?: MessagePriority;
  }
) {
  // 站内信
  const notification = await this.notificationsService.send({
    userId,
    type: NotificationType.SYSTEM,
    title: rendered.title,
    body: rendered.body,
    channels: options.channels,
  });

  // 邮件
  if (rendered.emailHtml && options.channels.includes('email')) {
    await this.emailService.send({
      to: user.email,
      subject: rendered.title,
      html: rendered.emailHtml,
    });
  }

  // 短信
  if (rendered.smsText && options.channels.includes('sms')) {
    await this.smsService.send({
      phone: user.phone,
      text: rendered.smsText,
    });
  }

  // WebSocket实时推送
  if (options.channels.includes('websocket')) {
    await this.notificationGateway.sendToUser(userId, notification);
  }

  return notification;
}
```

---

## 🎯 实现优先级建议

### 方案A: 先实现业务场景集成（推荐）⭐
**优点**:
- 立即让整个系统运转起来
- 用户注册/设备创建时自动发送通知
- 快速看到效果

**步骤**:
1. 修改7个消费者文件，集成模板渲染（30分钟）
2. 测试各个业务场景（15分钟）
3. 编写集成文档（10分钟）

### 方案B: 先实现批量通知API
**优点**:
- 增加管理员批量操作能力
- 适合运营推广场景

**步骤**:
1. 创建批量DTO和API（15分钟）
2. 实现队列处理逻辑（20分钟）
3. 添加进度追踪（15分钟）

### 方案C: 先完善WebSocket实时推送
**优点**:
- 提升用户体验
- 实时通知更友好

**步骤**:
1. 完善Gateway逻辑（20分钟）
2. 添加在线状态管理（15分钟）
3. 集成到发送流程（10分钟）

---

## 📊 工作量估算

| 功能 | 新增文件 | 修改文件 | 代码行数 | 预计时间 |
|------|---------|---------|---------|---------|
| 批量通知API | 3个 | 2个 | ~400行 | 1小时 |
| WebSocket增强 | 1个 | 3个 | ~300行 | 45分钟 |
| 业务场景集成 | 0个 | 7个 | ~500行 | 45分钟 |
| **总计** | **4个** | **12个** | **~1200行** | **2.5小时** |

---

## 💡 我的建议

**建议采用方案A - 先实现业务场景集成**

原因：
1. ✅ **见效最快** - 立即串联整个系统
2. ✅ **测试模板** - 验证15个模板是否正常工作
3. ✅ **用户价值** - 用户注册/支付等场景立即有通知
4. ✅ **基础完善** - 为后续功能打好基础

**实现顺序**:
```
Day 1: 业务场景集成（45分钟）
  ├─ 修改user-events.consumer.ts
  ├─ 修改device-events.consumer.ts
  ├─ 修改billing-events.consumer.ts
  └─ 测试端到端流程

Day 2: WebSocket实时推送（45分钟）
  ├─ 完善NotificationGateway
  ├─ 添加在线状态管理
  └─ 集成到发送流程

Day 3: 批量通知API（1小时）
  ├─ 实现批量发送接口
  ├─ 添加队列处理
  └─ 实现进度追踪
```

---

## ❓ 下一步选择

请您决定：

**A. 采用推荐方案** - 我立即开始实现业务场景集成
**B. 自定义顺序** - 告诉我您希望先实现哪个功能
**C. 查看更多细节** - 我详细说明某个功能的实现方案
**D. 暂停思考** - 您想自己研究一下代码再决定

---

**文档版本**: v1.0
**创建时间**: 2025-01-22
**作者**: Claude Code Assistant
