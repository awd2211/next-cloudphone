# 事件溯源 (Event Sourcing) 实现文档

## 📚 概述

**事件溯源 (Event Sourcing)** 是一种架构模式，通过存储所有状态变更事件的完整历史，而不是仅存储当前状态。这使得系统能够：
- 重建任意时间点的状态（时间旅行）
- 完整的审计追踪
- 事件重放能力
- 支持 CQRS 架构

## 🏗 架构设计

### 核心组件

```
┌─────────────────┐       ┌──────────────────┐
│   Command       │──────▶│  Command Handler │
│   (修改请求)     │       │  (执行业务逻辑)   │
└─────────────────┘       └──────────┬───────┘
                                     │
                                     ▼
                          ┌──────────────────┐
                          │  Domain Event    │
                          │  (状态变更事件)   │
                          └──────────┬───────┘
                                     │
                                     ▼
                          ┌──────────────────┐
                          │  Event Store     │
                          │  (事件存储)       │
                          └──────────┬───────┘
                                     │
                      ┌──────────────┴──────────────┐
                      │                             │
                      ▼                             ▼
           ┌──────────────────┐         ┌──────────────────┐
           │  Event Handler   │         │  Read Model      │
           │  (副作用处理)     │         │  (查询优化)       │
           └──────────────────┘         └──────────────────┘
```

### 数据流

1. **写入路径** (Command → Event)
   - 用户执行命令 (CreateUser, UpdateUser, 等)
   - CommandHandler 执行业务逻辑
   - 发布领域事件 (UserCreatedEvent, 等)
   - EventStore 持久化事件
   - EventHandler 执行副作用 (发送通知、更新统计等)

2. **读取路径** (Query → Read Model)
   - 用户执行查询 (GetUser, GetUsers, 等)
   - QueryHandler 从优化的读模型查询
   - 返回数据给用户

3. **事件重放路径** (Event → State)
   - 从 EventStore 读取事件序列
   - 按顺序应用事件
   - 重建聚合根状态

## 📁 项目结构

```
src/
├── entities/
│   └── user-event.entity.ts        # 事件实体（数据库表）
│
├── users/
│   ├── events/
│   │   ├── user.events.ts          # 领域事件定义 (8个事件)
│   │   ├── event-store.service.ts  # 事件存储服务
│   │   ├── event-replay.service.ts # 事件重放服务
│   │   ├── events.controller.ts    # 事件管理API
│   │   └── handlers/               # 事件处理器
│   │       ├── user-created.handler.ts
│   │       ├── user-updated.handler.ts
│   │       ├── password-changed.handler.ts
│   │       ├── user-deleted.handler.ts
│   │       ├── account-locked.handler.ts
│   │       └── index.ts
│   │
│   └── commands/handlers/          # 命令处理器（已集成事件发布）
│       ├── create-user.handler.ts
│       ├── update-user.handler.ts
│       ├── change-password.handler.ts
│       └── delete-user.handler.ts
```

## 🎯 领域事件

### 1. UserCreatedEvent
**触发时机**: 创建新用户时

```typescript
new UserCreatedEvent(
  userId,           // 聚合根ID
  version,          // 事件版本号
  username,         // 用户名
  email,            // 邮箱
  fullName,         // 全名
  phone,            // 电话
  tenantId,         // 租户ID
  roleIds,          // 角色ID列表
)
```

**事件数据**:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "fullName": "John Doe",
  "phone": "13800138000",
  "tenantId": "tenant-1",
  "roleIds": ["role-user"]
}
```

### 2. UserUpdatedEvent
**触发时机**: 更新用户信息时

```typescript
new UserUpdatedEvent(
  userId,
  version,
  {
    email: "new@example.com",
    fullName: "New Name",
    status: "ACTIVE"
  }
)
```

### 3. PasswordChangedEvent
**触发时机**: 修改密码时

```typescript
new PasswordChangedEvent(
  userId,
  version,
  changedBy,        // 执行修改的用户ID
)
```

**注意**: 不存储密码内容，只记录修改操作

### 4. UserDeletedEvent
**触发时机**: 删除用户时（软删除）

```typescript
new UserDeletedEvent(
  userId,
  version,
  deletedBy,        // 执行删除的用户ID
)
```

### 5. LoginInfoUpdatedEvent
**触发时机**: 用户登录时

```typescript
new LoginInfoUpdatedEvent(
  userId,
  version,
  ipAddress,        // 登录IP
  loginAt,          // 登录时间
)
```

### 6. AccountLockedEvent
**触发时机**: 账户被锁定时

```typescript
new AccountLockedEvent(
  userId,
  version,
  reason,           // 锁定原因
  loginAttempts,    // 失败次数
  lockedUntil,      // 锁定到何时
)
```

### 7. AccountUnlockedEvent
**触发时机**: 账户解锁时

### 8. RolesAssignedEvent
**触发时机**: 分配角色时

## 💾 事件存储

### UserEvent 实体

```typescript
@Entity('user_events')
export class UserEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;                    // 事件唯一ID

  @Column({ type: 'uuid' })
  aggregateId: string;           // 聚合根ID（用户ID）

  @Column({ length: 100 })
  eventType: string;             // 事件类型

  @Column({ type: 'jsonb' })
  eventData: any;                // 事件数据（JSON）

  @Column({ type: 'int' })
  version: number;               // 版本号（乐观锁）

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    userId?: string;             // 操作者ID
    ipAddress?: string;          // IP地址
    userAgent?: string;          // 浏览器信息
    correlationId?: string;      // 关联ID
  };

  @Column({ nullable: true })
  tenantId?: string;             // 租户ID

  @CreateDateColumn()
  createdAt: Date;               // 事件时间（不可变）
}
```

### 索引策略

```typescript
@Index('IDX_USER_EVENT_AGGREGATE', ['aggregateId', 'version'])
@Index('IDX_USER_EVENT_TYPE', ['eventType', 'createdAt'])
@Index('IDX_USER_EVENT_CREATED', ['createdAt'])
```

- **复合索引**: `(aggregateId, version)` - 快速查找用户的所有事件
- **复合索引**: `(eventType, createdAt)` - 按类型查询事件
- **单列索引**: `createdAt` - 时间范围查询

## 🔧 核心服务

### EventStoreService

**职责**: 事件的持久化和查询

```typescript
class EventStoreService {
  // 保存单个事件
  async saveEvent(event: UserDomainEvent): Promise<UserEvent>

  // 批量保存事件
  async saveEvents(events: UserDomainEvent[]): Promise<UserEvent[]>

  // 获取聚合的所有事件
  async getEventsForAggregate(aggregateId: string): Promise<UserEvent[]>

  // 获取从某版本之后的事件
  async getEventsFromVersion(aggregateId: string, fromVersion: number)

  // 获取当前版本号
  async getCurrentVersion(aggregateId: string): Promise<number>

  // 时间范围查询
  async getEventsByTimeRange(startDate: Date, endDate: Date)

  // 按类型查询
  async getEventsByType(eventType: string, limit: number)

  // 统计事件数量
  async countEvents(aggregateId?: string, eventType?: string)

  // 清理旧事件（慎用）
  async purgeOldEvents(beforeDate: Date)
}
```

### EventReplayService

**职责**: 事件重放和状态重建

```typescript
class EventReplayService {
  // 重放所有事件，重建当前状态
  async replayUserEvents(userId: string): Promise<Partial<User>>

  // 重放到特定版本
  async replayToVersion(userId: string, targetVersion: number)

  // 时间旅行：重放到特定时间点
  async replayToTimestamp(userId: string, targetDate: Date)

  // 获取完整事件历史
  async getUserEventHistory(userId: string)

  // 重建所有用户读模型（慎用！）
  async rebuildAllUsersReadModel()
}
```

## 🌐 HTTP API

### 获取用户事件历史

```http
GET /events/user/:userId/history

Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "totalEvents": 5,
    "events": [
      {
        "version": 1,
        "eventType": "UserCreated",
        "occurredAt": "2024-01-01T10:00:00.000Z",
        "data": { "username": "john_doe", "email": "john@example.com" }
      },
      {
        "version": 2,
        "eventType": "UserUpdated",
        "occurredAt": "2024-01-02T15:30:00.000Z",
        "data": { "fullName": "John Updated" }
      }
    ]
  }
}
```

### 重放用户事件

```http
GET /events/user/:userId/replay

Authorization: Bearer <token>
```

**用途**: 从事件重建用户当前状态

### 重放到特定版本

```http
GET /events/user/:userId/replay/version/5

Authorization: Bearer <token>
```

**用途**: 查看用户在版本5时的状态

### 时间旅行

```http
GET /events/user/:userId/replay/timestamp?timestamp=2024-01-01T00:00:00.000Z

Authorization: Bearer <token>
```

**用途**: 查看用户在特定时间点的状态

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "username": "john_doe",
    "email": "old@example.com",
    "fullName": "John Doe",
    "createdAt": "2023-12-01T00:00:00.000Z"
  },
  "message": "时间旅行到 2024-01-01T00:00:00.000Z 成功"
}
```

### 事件统计

```http
GET /events/stats

Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "totalEvents": 1250,
    "eventsByType": {
      "UserCreated": 150,
      "UserUpdated": 450,
      "PasswordChanged": 200,
      "UserDeleted": 10,
      "LoginInfoUpdated": 400,
      "AccountLocked": 40
    }
  }
}
```

### 最近事件

```http
GET /events/recent?eventType=UserCreated&limit=20

Authorization: Bearer <token>
```

## 🔄 事件处理流程

### 1. 创建用户流程

```
User Request
    │
    ▼
CreateUserCommand
    │
    ▼
CreateUserHandler
    ├──▶ usersService.create() ──▶ 写入数据库 (Write Model)
    │
    └──▶ eventStore.saveEvent(UserCreatedEvent)
              │
              ├──▶ 保存到 user_events 表
              │
              └──▶ publish(UserCreatedEvent)
                       │
                       ├──▶ UserCreatedEventHandler
                       │      ├── 发送欢迎邮件
                       │      ├── 更新 Prometheus 指标
                       │      └── 发布到 RabbitMQ
                       │
                       └──▶ 其他 EventHandler...
```

### 2. 事件重放流程

```
Replay Request
    │
    ▼
EventReplayService.replayUserEvents(userId)
    │
    ├──▶ eventStore.getEventsForAggregate(userId)
    │         │
    │         └──▶ SELECT * FROM user_events
    │               WHERE aggregate_id = 'userId'
    │               ORDER BY version ASC
    │
    ├──▶ 初始化空状态: userState = { id: userId }
    │
    └──▶ 遍历事件列表:
          │
          ├──▶ Event 1 (UserCreated)
          │      userState = apply(userState, event)
          │      // userState = { id, username, email, ... }
          │
          ├──▶ Event 2 (UserUpdated)
          │      userState = apply(userState, event)
          │      // userState = { ..., fullName: "Updated" }
          │
          └──▶ Event N (LoginInfoUpdated)
                 userState = apply(userState, event)
                 // userState = { ..., lastLoginAt, lastLoginIp }
```

## ✅ 优势

### 1. 完整的审计追踪
- **所有变更都有记录**: 谁、何时、做了什么
- **不可篡改**: 事件一旦写入不可修改
- **合规性**: 满足审计要求

```typescript
// 示例：查看用户的完整操作历史
const history = await eventReplay.getUserEventHistory('user-123');

/*
Result:
[
  { version: 1, eventType: 'UserCreated', occurredAt: '2024-01-01T10:00:00Z' },
  { version: 2, eventType: 'PasswordChanged', occurredAt: '2024-01-15T14:30:00Z' },
  { version: 3, eventType: 'UserUpdated', occurredAt: '2024-02-01T09:00:00Z' },
  ...
]
*/
```

### 2. 时间旅行
- **查看历史状态**: 任意时间点的用户状态
- **调试能力**: 追踪问题发生时的状态
- **数据恢复**: 意外删除可以恢复

```typescript
// 查看用户在1月1日的状态
const pastState = await eventReplay.replayToTimestamp(
  'user-123',
  new Date('2024-01-01')
);
```

### 3. 事件驱动架构
- **解耦**: 不同服务监听事件独立处理
- **异步处理**: 副作用异步执行，不阻塞主流程
- **可扩展**: 新增功能只需添加新的 EventHandler

### 4. 读写分离 (CQRS)
- **写优化**: 事件追加写入，性能高
- **读优化**: 查询从优化的读模型读取
- **独立扩展**: 读写可以独立扩展

### 5. 业务洞察
- **行为分析**: 分析用户操作模式
- **数据统计**: 实时业务指标
- **预测能力**: 基于历史事件预测

```typescript
// 统计最近7天的用户创建趋势
const startDate = new Date();
startDate.setDate(startDate.getDate() - 7);

const events = await eventStore.getEventsByTimeRange(
  startDate,
  new Date(),
  'UserCreated'
);

console.log(`最近7天创建了 ${events.length} 个用户`);
```

## ⚠️ 注意事项

### 1. 事件版本管理

**问题**: 事件结构可能随时间变化

**解决方案**: 事件版本化

```typescript
// 旧版本事件
interface UserCreatedEventV1 {
  username: string;
  email: string;
}

// 新版本事件
interface UserCreatedEventV2 {
  username: string;
  email: string;
  phone: string;        // 新增字段
}

// 在重放时处理版本兼容
applyUserCreatedEvent(state, event) {
  if (event.version === 1) {
    // 处理旧版本
    return { ...state, username: event.data.username, email: event.data.email };
  } else {
    // 处理新版本
    return { ...state, ...event.data };
  }
}
```

### 2. 存储空间增长

**问题**: 事件表会持续增长

**解决方案**:
- **快照机制**: 定期保存快照，只需从快照后重放
- **归档策略**: 旧事件归档到冷存储
- **数据压缩**: 使用 JSONB 列压缩

```typescript
// 快照示例（未实现）
@Entity('user_snapshots')
export class UserSnapshot {
  userId: string;
  state: any;           // 完整状态
  version: number;      // 快照版本号
  createdAt: Date;
}

// 重放优化：从最近快照开始
async replayWithSnapshot(userId: string) {
  const snapshot = await getLatestSnapshot(userId);
  const events = await eventStore.getEventsFromVersion(
    userId,
    snapshot.version
  );

  let state = snapshot.state;
  for (const event of events) {
    state = apply(state, event);
  }
  return state;
}
```

### 3. 最终一致性

**问题**: 事件处理是异步的，读模型可能短暂不一致

**解决方案**:
- 设置合理的超时时间
- 提供"处理中"状态提示
- 重要操作使用同步确认

### 4. 并发冲突

**问题**: 多个请求同时修改同一用户

**解决方案**: 版本号（乐观锁）

```typescript
// EventStore 检查版本冲突
const existingEvent = await this.eventRepository.findOne({
  where: { aggregateId, version },
});

if (existingEvent) {
  throw new ConflictException('Event version conflict');
}
```

## 📊 性能优化

### 1. 索引优化

已创建的索引：
- `(aggregateId, version)` - 查找用户事件
- `(eventType, createdAt)` - 按类型统计
- `createdAt` - 时间范围查询

### 2. 查询优化

```typescript
// ❌ 不好：逐个查询
for (const userId of userIds) {
  const events = await eventStore.getEventsForAggregate(userId);
}

// ✅ 好：批量查询
const events = await eventRepository.find({
  where: {
    aggregateId: In(userIds)
  },
  order: { aggregateId: 'ASC', version: 'ASC' }
});
```

### 3. 缓存策略

```typescript
// 缓存最近访问的事件
const cacheKey = `events:${userId}`;
const cached = await cacheService.get(cacheKey);

if (cached) {
  return cached;
}

const events = await eventStore.getEventsForAggregate(userId);
await cacheService.set(cacheKey, events, { ttl: 300 });
```

### 4. 分区表（大规模场景）

```sql
-- 按月分区
CREATE TABLE user_events_2024_01 PARTITION OF user_events
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE user_events_2024_02 PARTITION OF user_events
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

## 🧪 测试示例

### 单元测试

```typescript
describe('EventStoreService', () => {
  it('should save event with correct version', async () => {
    const event = new UserCreatedEvent(
      'user-123',
      1,
      'john',
      'john@example.com',
      'John Doe'
    );

    const saved = await eventStore.saveEvent(event);

    expect(saved.aggregateId).toBe('user-123');
    expect(saved.version).toBe(1);
    expect(saved.eventType).toBe('UserCreated');
  });

  it('should throw conflict when version exists', async () => {
    const event1 = new UserCreatedEvent('user-123', 1, ...);
    await eventStore.saveEvent(event1);

    const event2 = new UserUpdatedEvent('user-123', 1, ...);

    await expect(
      eventStore.saveEvent(event2)
    ).rejects.toThrow(ConflictException);
  });
});
```

### 集成测试

```typescript
describe('Event Replay', () => {
  it('should replay events correctly', async () => {
    // 创建用户
    await commandBus.execute(new CreateUserCommand({
      username: 'john',
      email: 'john@example.com'
    }));

    // 更新用户
    await commandBus.execute(new UpdateUserCommand('user-123', {
      fullName: 'John Updated'
    }));

    // 重放事件
    const state = await eventReplay.replayUserEvents('user-123');

    expect(state.username).toBe('john');
    expect(state.fullName).toBe('John Updated');
  });
});
```

## 📚 参考资源

- [Martin Fowler - Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Microsoft - Event Sourcing Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- [Greg Young - Event Sourcing](https://www.youtube.com/watch?v=8JKjvY4etTY)
- [CQRS Journey](https://learn.microsoft.com/en-us/previous-versions/msp-n-p/jj554200(v=pandp.10))

## ✅ 实施清单

- ✅ 创建 UserEvent 实体
- ✅ 实现 8 个领域事件
- ✅ 实现 EventStoreService
- ✅ 实现 5 个事件处理器
- ✅ 集成到命令处理器
- ✅ 实现 EventReplayService
- ✅ 创建事件管理 API
- ✅ 添加索引优化
- ✅ 构建验证通过
- ✅ 文档完整

---

**状态**: ✅ 生产就绪
**实施日期**: 2025-10-22
**维护者**: CloudPhone Team
**版本**: 1.0.0
