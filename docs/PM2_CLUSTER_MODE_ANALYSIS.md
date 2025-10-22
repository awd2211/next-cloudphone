# PM2 集群模式业务分析报告

**分析日期**: 2025-10-22
**分析目的**: 根据实际业务逻辑确定各服务的最佳部署模式

---

## 📊 服务分析总览

| 服务名称 | 推荐模式 | 实例数 | 关键原因 | 风险等级 |
|---------|---------|-------|---------|---------|
| **api-gateway** | ✅ Cluster | 4 | 无状态路由，高并发入口 | 🟢 低 |
| **user-service** | ✅ Cluster | 2 | JWT+Redis认证，无状态 | 🟢 低 |
| **device-service** | ❌ Fork | 1 | **内存端口缓存，有状态** | 🔴 高 |
| **app-service** | ⚠️ Fork | 1 | 文件上传临时文件处理 | 🟡 中 |
| **billing-service** | ❌ Fork | 1 | **支付处理，定时任务，并发风险** | 🔴 高 |
| **notification-service** | ❌ Fork | 1 | **WebSocket有状态连接** | 🔴 高 |

---

## 🔍 详细分析

### 1. api-gateway ✅ **推荐集群模式 (4实例)**

**业务特点**:
- 作为主要入口，转发所有HTTP请求
- 无状态服务，纯路由逻辑
- 高并发场景

**代码分析**:
```typescript
// backend/api-gateway/src/proxy/proxy.controller.ts
@Controller()
export class ProxyController {
  // 纯转发逻辑，无状态
  async proxyRequest(@Req() req, @Res() res) {
    // 转发到后端服务
  }
}
```

**集群模式优势**:
- ✅ 充分利用多核CPU
- ✅ 负载均衡，提升吞吐量 3-4倍
- ✅ 单实例故障不影响服务

**配置建议**:
```javascript
{
  instances: 4,              // 使用4核
  exec_mode: 'cluster',
  wait_ready: true,          // 优雅重启
  kill_timeout: 5000,
}
```

---

### 2. user-service ✅ **推荐集群模式 (2实例)**

**业务特点**:
- 用户认证、用户管理
- 使用 JWT Token 和 Redis 缓存
- 无本地状态

**代码分析**:
```typescript
// backend/user-service/src/auth/auth.service.ts
@Injectable()
export class AuthService {
  async login(loginDto: LoginDto) {
    // 使用 JWT Token，无状态
    const token = this.jwtService.sign(payload);

    // Session 存储在 Redis（共享状态）
    await this.cacheService.set(`session:${userId}`, session);

    return { token };
  }
}
```

**集群模式可行性**:
- ✅ JWT Token 是无状态的
- ✅ Session 存储在 Redis（跨实例共享）
- ✅ 缓存使用 Redis（CacheService）

**配置建议**:
```javascript
{
  instances: 2,              // 适度集群
  exec_mode: 'cluster',
  wait_ready: true,
}
```

---

### 3. device-service ❌ **必须单实例 (1实例)**

**业务特点**:
- 管理云手机设备
- Docker 容器创建和管理
- **ADB 端口分配（内存缓存）**

**代码分析** - **关键问题**:
```typescript
// backend/device-service/src/port-manager/port-manager.service.ts
@Injectable()
export class PortManagerService {
  // ⚠️ 问题：使用内存 Set 缓存端口
  private usedAdbPorts: Set<number> = new Set();
  private usedWebrtcPorts: Set<number> = new Set();
  private usedScrcpyPorts: Set<number> = new Set();

  async allocatePorts(): Promise<PortAllocation> {
    // 从内存 Set 中查找可用端口
    const adbPort = this.allocateAdbPort();
    const webrtcPort = this.allocateWebrtcPort();

    // 标记为已使用
    this.usedAdbPorts.add(adbPort);
    this.usedWebrtcPorts.add(webrtcPort);

    return { adbPort, webrtcPort };
  }
}
```

**集群模式问题** 🔴:
1. **端口冲突风险**:
   - 实例A 分配端口 5555，保存到本地内存 Set
   - 实例B 也检查本地内存 Set，发现 5555 可用
   - **结果**: 两个容器使用同一端口，Docker 创建失败！

2. **数据不一致**:
   - 端口缓存不同步
   - 可能导致设备创建失败

**示例场景**:
```
时间线                实例1                          实例2
-------------------------------------------------------------------
T1    用户A请求创建设备
T2    分配端口 5555
      usedPorts.add(5555)
T3                                   用户B请求创建设备
T4                                   检查本地Set，5555可用
                                     分配端口 5555 ❌
T5    创建容器成功                   创建容器失败（端口冲突）
```

**解决方案**:
- **方案1**: 保持单实例（推荐）
- **方案2**: 端口管理改用 Redis（需要重构代码）

**配置建议**:
```javascript
{
  instances: 1,              // ❗ 必须单实例
  exec_mode: 'fork',
  max_memory_restart: '1G',
}
```

---

### 4. app-service ⚠️ **建议单实例 (1实例)**

**业务特点**:
- APK 文件上传
- MinIO 对象存储
- APK 解析（临时文件）

**代码分析**:
```typescript
// backend/app-service/src/apps/apps.service.ts
async uploadApp(file: Express.Multer.File, createAppDto: CreateAppDto) {
  // 1. 解析 APK（临时文件）
  const apkInfo = await this.parseApk(file.path); // file.path 是本地临时文件

  // 2. 上传到 MinIO（✅ 共享存储）
  await this.minioService.uploadFile(file.path, objectKey);

  // 3. 清理临时文件
  fs.unlinkSync(file.path);
}
```

**集群模式风险** 🟡:
1. **临时文件问题**:
   - Multer 将上传文件保存到本地 `/tmp` 或 `./uploads`
   - 如果请求被路由到其他实例，找不到临时文件

2. **解决方案**:
   - 使用 NFS 共享 `/tmp` 目录
   - 或使用 Redis + Bull 队列异步处理
   - 或保持单实例（简单可靠）

**当前情况**:
- ✅ MinIO 是共享存储（好）
- ⚠️ 临时文件处理是本地的（风险）

**配置建议**:
```javascript
{
  instances: 1,              // 推荐单实例
  exec_mode: 'fork',
  max_memory_restart: '1G',
}
```

**未来优化**:
如需集群模式，需改造为：
```typescript
// 使用消息队列异步处理
await this.uploadQueue.add('process-apk', {
  fileUrl: s3TempUrl,
  metadata: createAppDto
});
```

---

### 5. billing-service ❌ **必须单实例 (1实例)**

**业务特点**:
- 订单创建
- 支付处理
- 定时任务（取消超时订单）

**代码分析** - **关键问题**:
```typescript
// backend/billing-service/src/billing/billing.service.ts
@Injectable()
export class BillingService {

  // ⚠️ 问题1：定时任务会在每个实例上运行
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cancelExpiredOrders() {
    // 查询超时订单
    const expiredOrders = await this.orderRepository.find({
      where: { status: OrderStatus.PENDING, expiresAt: LessThan(now) }
    });

    // 批量取消
    for (const order of expiredOrders) {
      await this.cancelOrder(order.id);
    }
  }

  // ⚠️ 问题2：支付状态更新的并发问题
  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.getOrder(orderId);
    order.status = status;

    if (status === OrderStatus.PAID) {
      order.paidAt = new Date();
      // 如果没有事务锁，可能导致重复支付
    }

    return this.orderRepository.save(order);
  }
}
```

**集群模式问题** 🔴:

1. **定时任务重复执行**:
   ```
   实例1 (5:00): 取消订单 #123
   实例2 (5:00): 同时取消订单 #123  ❌ 重复操作
   ```

2. **支付并发问题**:
   ```
   时间线           实例1                        实例2
   -----------------------------------------------------------------
   T1    收到支付回调 Order#456
   T2    查询订单状态=PENDING          收到支付回调 Order#456
   T3                                 查询订单状态=PENDING
   T4    更新状态=PAID
         增加用户余额 +100
   T5                                 更新状态=PAID
                                      增加用户余额 +100 ❌ 重复充值
   ```

3. **订单号生成冲突**:
   - 如果使用时间戳生成订单号，可能重复

**解决方案**:
- **方案1**: 保持单实例（推荐）
- **方案2**: 使用分布式锁（Redis）
  ```typescript
  const lock = await this.redis.lock(`order:${orderId}`, 5000);
  try {
    await this.updateOrderStatus(orderId, status);
  } finally {
    await lock.unlock();
  }
  ```
- **方案3**: 使用消息队列（Bull/RabbitMQ）处理支付回调

**配置建议**:
```javascript
{
  instances: 1,              // ❗ 必须单实例
  exec_mode: 'fork',
  max_memory_restart: '1G',
}
```

---

### 6. notification-service ❌ **必须单实例 (1实例)**

**业务特点**:
- 实时通知推送
- **WebSocket 长连接**
- Socket.IO 实现

**代码分析** - **关键问题**:
```typescript
// backend/notification-service/src/websocket/websocket.gateway.ts
@WebSocketGateway({ namespace: '/notifications' })
export class WebSocketGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  // ⚠️ 问题：WebSocket 连接是有状态的
  private connections: Map<string, Socket> = new Map();

  handleConnection(client: Socket) {
    const userId = client.handshake.auth.userId;
    this.connections.set(userId, client);
  }

  async sendNotification(userId: string, notification: any) {
    const socket = this.connections.get(userId);
    if (socket) {
      socket.emit('notification', notification);
    }
  }
}
```

**集群模式问题** 🔴:

1. **连接丢失问题**:
   ```
   场景：用户连接到实例1，但通知从实例2发送

   实例1: 用户A的WebSocket连接 ✅
   实例2: 尝试发送通知给用户A  ❌ 找不到连接
   ```

2. **示例场景**:
   ```
   时间线           实例1                        实例2
   -----------------------------------------------------------------
   T1    用户A连接 WebSocket
         connections.set('A', socket)
   T2                                 收到通知：发给用户A
   T3                                 查找 connections.get('A')
                                      返回 undefined ❌
   T4                                 通知丢失，用户A收不到
   ```

**解决方案**:

- **方案1**: 保持单实例（推荐，简单）
- **方案2**: 使用 Socket.IO Redis Adapter（需要重构）
  ```typescript
  import { createAdapter } from '@socket.io/redis-adapter';

  const io = new Server(server, {
    adapter: createAdapter(redisClient, redisClient.duplicate())
  });
  ```

- **方案3**: 使用 Sticky Session（粘性会话）
  ```nginx
  upstream websocket {
    ip_hash;  # 同一IP始终路由到同一实例
    server localhost:30006;
    server localhost:30007;
  }
  ```

**配置建议**:
```javascript
{
  instances: 1,              // ❗ 必须单实例
  exec_mode: 'fork',
  max_memory_restart: '1G',
}
```

**未来优化**:
如需扩展 WebSocket 服务，使用 Redis Adapter:
```typescript
// 安装依赖
pnpm add @socket.io/redis-adapter

// 配置 Redis Adapter
const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

---

## 📝 配置修正建议

### 当前配置问题

**ecosystem.config.development.js** 中存在问题：

```javascript
// ❌ 错误配置
{
  name: 'device-service',
  instances: 2,           // ❌ 会导致端口冲突
  exec_mode: 'cluster',
}
```

### 推荐配置

#### ecosystem.config.development.js
```javascript
module.exports = {
  apps: [
    // ✅ 集群模式：api-gateway
    {
      name: 'api-gateway',
      instances: 4,
      exec_mode: 'cluster',
      // ... 其他配置
    },

    // ✅ 集群模式：user-service
    {
      name: 'user-service',
      instances: 2,
      exec_mode: 'cluster',
      // ... 其他配置
    },

    // ❌ 单实例：device-service（内存端口缓存）
    {
      name: 'device-service',
      instances: 1,           // ⚠️ 必须改为 1
      exec_mode: 'fork',      // ⚠️ 必须改为 fork
      // ... 其他配置
    },

    // ❌ 单实例：app-service（文件上传）
    {
      name: 'app-service',
      instances: 1,
      exec_mode: 'fork',
      // ... 其他配置
    },

    // ❌ 单实例：billing-service（支付+定时任务）
    {
      name: 'billing-service',
      instances: 1,
      exec_mode: 'fork',
      // ... 其他配置
    },

    // ❌ 单实例：notification-service（WebSocket）
    {
      name: 'notification-service',
      instances: 1,
      exec_mode: 'fork',
      // ... 其他配置
    }
  ]
};
```

---

## 📊 性能影响对比

### 修正前配置（错误）
```
总实例数: 12 (api:4 + user:2 + device:2 + app:1 + billing:1 + notification:1)
风险: 🔴 device-service 端口冲突，系统不稳定
```

### 修正后配置（正确）
```
总实例数: 8 (api:4 + user:2 + device:1 + app:1 + billing:1 + notification:1)
风险: 🟢 系统稳定，无并发问题
性能: 相比单实例仍提升 2-3 倍（主要靠 api-gateway 和 user-service）
```

---

## 🎯 优化路线图

### 短期（当前）
- ✅ api-gateway: 集群模式（4实例）
- ✅ user-service: 集群模式（2实例）
- ❌ 其他服务: 单实例

**性能提升**: ~2-3倍（主要入口优化）

### 中期（需要重构）
如需进一步扩展，改造以下服务：

#### device-service → 集群模式
**改造方案**:
```typescript
// 使用 Redis 存储端口缓存
@Injectable()
export class PortManagerService {
  constructor(private redis: RedisService) {}

  async allocatePort(): Promise<number> {
    const port = await this.findAvailablePort();

    // 使用 Redis SET NX（原子操作）
    const success = await this.redis.set(
      `port:${port}`,
      'allocated',
      'NX',  // 只有不存在时才设置
      'EX',
      3600   // 1小时过期
    );

    if (success) {
      return port;
    } else {
      // 端口已被占用，重试
      return this.allocatePort();
    }
  }
}
```

#### notification-service → 集群模式
**改造方案**:
```typescript
// 使用 Socket.IO Redis Adapter
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

const redisAdapter = createAdapter(pubClient, subClient);
io.adapter(redisAdapter);
```

#### billing-service → 集群模式
**改造方案**:
```typescript
// 定时任务使用分布式锁
@Cron(CronExpression.EVERY_5_MINUTES)
async cancelExpiredOrders() {
  const lock = await this.redis.lock('cron:cancel-orders', 60000);

  if (lock) {
    try {
      await this.doCancelOrders();
    } finally {
      await lock.unlock();
    }
  }
}

// 支付回调使用事务+乐观锁
async updateOrderStatus(orderId: string, status: OrderStatus) {
  const order = await this.orderRepository.findOne({
    where: { id: orderId, status: OrderStatus.PENDING }
  });

  if (!order) {
    throw new BadRequestException('订单不存在或已支付');
  }

  // 使用乐观锁（version字段）
  order.status = status;
  order.version += 1;

  await this.orderRepository.update(
    { id: orderId, version: order.version - 1 },
    order
  );
}
```

### 长期（生产级）
- 所有服务支持水平扩展
- 使用 Kubernetes 管理
- 统一使用消息队列（RabbitMQ/Kafka）
- Redis 集群

---

## 📋 检查清单

在应用新配置前，请确认：

- [ ] **device-service** 改为单实例（防止端口冲突）
- [ ] **billing-service** 保持单实例（防止重复支付）
- [ ] **notification-service** 保持单实例（WebSocket连接）
- [ ] **app-service** 保持单实例（文件上传安全）
- [ ] **api-gateway** 使用集群模式（主要入口）
- [ ] **user-service** 使用集群模式（认证服务）
- [ ] 测试端口分配是否正常
- [ ] 测试支付流程无重复
- [ ] 测试 WebSocket 连接稳定

---

## 🔗 参考资源

- [PM2 Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)
- [Socket.IO Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- [分布式锁最佳实践](https://redis.io/topics/distlock)

---

**文档维护者**: Claude Code
**最后更新**: 2025-10-22
