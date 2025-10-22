# Event Sourcing 使用指南

本指南提供事件溯源系统的实际使用示例和最佳实践。

## 目录

- [快速开始](#快速开始)
- [API 使用示例](#api-使用示例)
- [编程接口使用](#编程接口使用)
- [常见场景](#常见场景)
- [最佳实践](#最佳实践)
- [故障排查](#故障排查)

---

## 快速开始

### 1. 数据库迁移

首先确保 `user_events` 表已创建：

```bash
# 应用迁移
cat migrations/20251022120000_add_user_events_table.sql | \
  docker exec -i cloudphone-postgres psql -U postgres -d cloudphone_user

# 验证表已创建
docker exec cloudphone-postgres psql -U postgres -d cloudphone_user \
  -c "\d user_events"
```

### 2. 验证服务运行

```bash
# 检查服务健康状态
curl http://localhost:30001/health

# 检查事件统计（需要管理员权限）
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:30001/events/stats
```

---

## API 使用示例

所有事件管理 API 都需要 `event.read` 权限，通常仅限管理员访问。

### 1. 获取用户事件历史

查看用户的完整事件历史记录（审计日志）。

```bash
# 请求
curl -X GET \
  http://localhost:30001/events/user/{userId}/history \
  -H "Authorization: Bearer <admin-token>"

# 响应示例
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "totalEvents": 5,
    "events": [
      {
        "version": 1,
        "eventType": "UserCreated",
        "occurredAt": "2024-01-01T10:00:00.000Z",
        "data": {
          "username": "john_doe",
          "email": "john@example.com",
          "fullName": "John Doe",
          "phone": "13800138000",
          "tenantId": "tenant-001"
        }
      },
      {
        "version": 2,
        "eventType": "UserUpdated",
        "occurredAt": "2024-01-02T11:30:00.000Z",
        "data": {
          "fullName": "John Doe Updated"
        }
      },
      {
        "version": 3,
        "eventType": "PasswordChanged",
        "occurredAt": "2024-01-03T09:15:00.000Z",
        "data": {
          "changedBy": "john_doe"
        }
      },
      {
        "version": 4,
        "eventType": "AccountLocked",
        "occurredAt": "2024-01-04T14:20:00.000Z",
        "data": {
          "loginAttempts": 3,
          "lockedUntil": "2024-01-04T14:25:00.000Z",
          "reason": "Too many failed login attempts"
        }
      },
      {
        "version": 5,
        "eventType": "AccountUnlocked",
        "occurredAt": "2024-01-04T14:30:00.000Z",
        "data": {
          "unlockedBy": "admin"
        }
      }
    ]
  },
  "message": "事件历史获取成功"
}
```

**使用场景**：
- 审计用户操作历史
- 调查安全事件
- 合规性审查
- 用户行为分析

---

### 2. 重放用户事件（重建当前状态）

通过重放所有事件来验证用户当前状态。

```bash
# 请求
curl -X GET \
  http://localhost:30001/events/user/{userId}/replay \
  -H "Authorization: Bearer <admin-token>"

# 响应示例
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "email": "john@example.com",
    "fullName": "John Doe Updated",
    "phone": "13800138000",
    "tenantId": "tenant-001",
    "loginAttempts": 0,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-04T14:30:00.000Z"
  },
  "message": "事件重放成功"
}
```

**使用场景**：
- 验证事件存储的完整性
- 调试状态不一致问题
- 数据恢复验证

---

### 3. 重放到特定版本

查看用户在特定版本时的状态。

```bash
# 请求 - 重放到版本 3
curl -X GET \
  "http://localhost:30001/events/user/{userId}/replay/version/3" \
  -H "Authorization: Bearer <admin-token>"

# 响应示例
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "email": "john@example.com",
    "fullName": "John Doe Updated",
    "phone": "13800138000",
    "tenantId": "tenant-001",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-03T09:15:00.000Z"
  },
  "message": "重放到版本 3 成功"
}
```

**使用场景**：
- 查看特定操作后的状态
- 调试版本冲突问题
- 状态变更分析

---

### 4. 时间旅行（Time Travel）

查看用户在特定时间点的状态。

```bash
# 请求 - 查看 2024-01-02 12:00 时的状态
curl -X GET \
  "http://localhost:30001/events/user/{userId}/replay/timestamp?timestamp=2024-01-02T12:00:00.000Z" \
  -H "Authorization: Bearer <admin-token>"

# 响应示例
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "email": "john@example.com",
    "fullName": "John Doe Updated",
    "phone": "13800138000",
    "tenantId": "tenant-001",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-02T11:30:00.000Z"
  },
  "message": "时间旅行到 2024-01-02T12:00:00.000Z 成功"
}
```

**使用场景**：
- 调查历史问题："用户在某时间点的权限是什么？"
- 回滚验证："如果回滚到昨天，状态是什么样？"
- 合规性审查："证明某个时间点用户确实有某权限"
- 数据取证

---

### 5. 获取事件统计

查看系统范围的事件统计信息。

```bash
# 请求
curl -X GET \
  http://localhost:30001/events/stats \
  -H "Authorization: Bearer <admin-token>"

# 响应示例
{
  "success": true,
  "data": {
    "totalEvents": 1543,
    "eventsByType": {
      "UserCreated": 245,
      "UserUpdated": 612,
      "PasswordChanged": 189,
      "UserDeleted": 12,
      "LoginInfoUpdated": 387,
      "AccountLocked": 98
    }
  },
  "message": "事件统计获取成功"
}
```

**使用场景**：
- 系统健康监控
- 用户行为分析
- 容量规划

---

### 6. 获取最近事件

查看最近发生的事件。

```bash
# 请求 - 获取最近 50 个 UserCreated 事件
curl -X GET \
  "http://localhost:30001/events/recent?eventType=UserCreated&limit=50" \
  -H "Authorization: Bearer <admin-token>"

# 响应示例
{
  "success": true,
  "data": [
    {
      "id": "event-uuid-1",
      "aggregateId": "user-uuid-1",
      "eventType": "UserCreated",
      "version": 1,
      "createdAt": "2024-01-05T10:00:00.000Z",
      "eventData": {
        "username": "new_user",
        "email": "new@example.com",
        "fullName": "New User"
      }
    }
    // ... 更多事件
  ],
  "total": 50,
  "message": "最近事件获取成功"
}
```

**使用场景**：
- 监控最近的用户活动
- 实时审计
- 异常检测

---

## 编程接口使用

### 在 Command Handlers 中发布事件

所有的命令处理器都应该在执行业务逻辑后发布领域事件：

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateUserCommand } from '../impl/create-user.command';
import { UsersService } from '../../users.service';
import { UserCreatedEvent } from '../../events/user.events';
import { EventStoreService } from '../../events/event-store.service';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    private readonly usersService: UsersService,
    private readonly eventStore: EventStoreService,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    // 1. 执行业务逻辑（写模型）
    const user = await this.usersService.create(command.createUserDto);

    // 2. 获取当前版本号
    const version = await this.eventStore.getCurrentVersion(user.id);

    // 3. 创建领域事件
    const event = new UserCreatedEvent(
      user.id,
      version + 1,  // 递增版本
      user.username,
      user.email,
      user.fullName,
      user.phone,
      user.tenantId,
      command.createUserDto.roleIds,
    );

    // 4. 保存事件到事件存储
    await this.eventStore.saveEvent(event, {
      userId: command.executedBy,  // 操作者
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
      correlationId: command.correlationId,
    });

    return user;
  }
}
```

### 在服务中直接使用 EventStoreService

```typescript
import { Injectable } from '@nestjs/common';
import { EventStoreService } from './events/event-store.service';
import { UserUpdatedEvent } from './events/user.events';

@Injectable()
export class UsersService {
  constructor(
    private readonly eventStore: EventStoreService,
  ) {}

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    // 1. 更新数据库（写模型）
    const user = await this.userRepository.save({
      ...updates,
      id: userId,
    });

    // 2. 发布事件
    const version = await this.eventStore.getCurrentVersion(userId);
    const event = new UserUpdatedEvent(userId, version + 1, updates);
    await this.eventStore.saveEvent(event);

    return user;
  }
}
```

### 使用 EventReplayService 进行状态重建

```typescript
import { Injectable } from '@nestjs/common';
import { EventReplayService } from './events/event-replay.service';

@Injectable()
export class UserRecoveryService {
  constructor(
    private readonly eventReplay: EventReplayService,
  ) {}

  /**
   * 从事件存储重建用户状态
   */
  async recoverUser(userId: string): Promise<User> {
    // 重放所有事件
    const userState = await this.eventReplay.replayUserEvents(userId);

    // 保存到数据库
    return this.userRepository.save(userState);
  }

  /**
   * 审计：获取用户在特定时间点的状态
   */
  async getUserStateAt(userId: string, timestamp: Date): Promise<Partial<User>> {
    return this.eventReplay.replayToTimestamp(userId, timestamp);
  }

  /**
   * 调试：查看特定版本的状态
   */
  async getUserStateAtVersion(userId: string, version: number): Promise<Partial<User>> {
    return this.eventReplay.replayToVersion(userId, version);
  }
}
```

---

## 常见场景

### 场景 1：审计 - "谁在何时修改了用户权限？"

```typescript
async function auditRoleChanges(userId: string) {
  const history = await eventReplay.getUserEventHistory(userId);

  const roleChanges = history.events
    .filter(e => e.eventType === 'RolesAssignedEvent')
    .map(e => ({
      timestamp: e.occurredAt,
      roleIds: e.data.roleIds,
      assignedBy: e.data.assignedBy,
    }));

  console.log('Role change history:', roleChanges);
}
```

### 场景 2：数据恢复 - "恢复被误删的用户"

```typescript
async function recoverDeletedUser(userId: string) {
  // 1. 重放到删除前的版本
  const history = await eventReplay.getUserEventHistory(userId);
  const deleteEvent = history.events.find(e => e.eventType === 'UserDeleted');

  if (!deleteEvent) {
    throw new Error('User was not deleted');
  }

  // 2. 重放到删除事件之前
  const stateBeforeDelete = await eventReplay.replayToVersion(
    userId,
    deleteEvent.version - 1
  );

  // 3. 恢复用户
  const recoveredUser = await usersService.create({
    ...stateBeforeDelete,
    // 保留原 ID 或生成新 ID
  });

  console.log('User recovered:', recoveredUser);
}
```

### 场景 3：调试 - "为什么这个用户被锁定了？"

```typescript
async function investigateAccountLock(userId: string) {
  const history = await eventReplay.getUserEventHistory(userId);

  // 找到锁定事件
  const lockEvents = history.events.filter(
    e => e.eventType === 'AccountLocked'
  );

  // 找到锁定前的登录尝试
  const loginEvents = history.events.filter(
    e => e.eventType === 'LoginInfoUpdated'
  );

  console.log('Lock events:', lockEvents);
  console.log('Login attempts before lock:', loginEvents);

  // 查看锁定时的状态
  if (lockEvents.length > 0) {
    const lastLock = lockEvents[lockEvents.length - 1];
    const stateAtLock = await eventReplay.replayToVersion(
      userId,
      lastLock.version
    );
    console.log('State when locked:', stateAtLock);
  }
}
```

### 场景 4：合规性 - "证明用户在 2024-01-01 有管理员权限"

```typescript
async function proveUserPermissionsAt(
  userId: string,
  timestamp: Date
): Promise<{ hadAdminRole: boolean; proof: any }> {
  // 时间旅行到指定时间点
  const userStateAtTime = await eventReplay.replayToTimestamp(
    userId,
    timestamp
  );

  // 获取该时间点之前的所有事件作为证据
  const history = await eventReplay.getUserEventHistory(userId);
  const eventsBeforeTimestamp = history.events.filter(
    e => new Date(e.occurredAt) <= timestamp
  );

  const roleAssignments = eventsBeforeTimestamp.filter(
    e => e.eventType === 'RolesAssignedEvent'
  );

  // 检查是否有管理员角色
  const lastRoleAssignment = roleAssignments[roleAssignments.length - 1];
  const hadAdminRole = lastRoleAssignment?.data.roleIds.includes('admin-role-id');

  return {
    hadAdminRole,
    proof: {
      userId,
      timestamp: timestamp.toISOString(),
      userState: userStateAtTime,
      roleAssignments,
      totalEventsAtTime: eventsBeforeTimestamp.length,
    }
  };
}
```

### 场景 5：性能优化 - 批量事件保存

```typescript
async function createUserWithCompleteProfile(userData: any) {
  const userId = generateUUID();

  // 准备多个事件
  const events = [
    new UserCreatedEvent(userId, 1, userData.username, userData.email, userData.fullName),
    new RolesAssignedEvent(userId, 2, userData.roleIds, 'system'),
  ];

  // 批量保存（一次数据库事务）
  await eventStore.saveEvents(events, {
    correlationId: userData.correlationId,
  });

  return userId;
}
```

---

## 最佳实践

### 1. 事件版本管理

```typescript
// ✅ 好的做法 - 获取当前版本后递增
const currentVersion = await eventStore.getCurrentVersion(userId);
const event = new UserUpdatedEvent(userId, currentVersion + 1, updates);
await eventStore.saveEvent(event);

// ❌ 不好的做法 - 硬编码版本号
const event = new UserUpdatedEvent(userId, 1, updates);  // 可能冲突！
```

### 2. 元数据记录

```typescript
// ✅ 好的做法 - 记录完整的元数据
await eventStore.saveEvent(event, {
  userId: currentUser.id,
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
  correlationId: requestId,
  causationId: parentEventId,
});

// ❌ 不好的做法 - 不记录元数据
await eventStore.saveEvent(event);  // 丢失审计信息
```

### 3. 错误处理

```typescript
// ✅ 好的做法 - 处理版本冲突
try {
  await eventStore.saveEvent(event);
} catch (error) {
  if (error instanceof ConflictException) {
    // 重试逻辑
    const currentVersion = await eventStore.getCurrentVersion(userId);
    const retryEvent = new UserUpdatedEvent(userId, currentVersion + 1, updates);
    await eventStore.saveEvent(retryEvent);
  } else {
    throw error;
  }
}
```

### 4. 事件粒度

```typescript
// ✅ 好的做法 - 细粒度事件
await eventStore.saveEvent(new EmailChangedEvent(userId, version, newEmail));
await eventStore.saveEvent(new PhoneChangedEvent(userId, version + 1, newPhone));

// ❌ 不好的做法 - 粗粒度事件（丢失语义）
await eventStore.saveEvent(new UserUpdatedEvent(userId, version, {
  email: newEmail,
  phone: newPhone,
}));
```

### 5. 事件清理

```typescript
// 定期清理旧事件（根据业务需求）
async function cleanupOldEvents() {
  // 保留最近 2 年的事件
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  await eventStore.purgeOldEvents(twoYearsAgo);
}
```

---

## 故障排查

### 问题 1：版本冲突错误

**症状**：
```
ConflictException: Event version conflict for aggregate xxx, version 5
```

**原因**：并发修改，两个请求尝试保存相同版本号的事件。

**解决方案**：
```typescript
// 实现重试逻辑
async function saveEventWithRetry(event: UserDomainEvent, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await eventStore.saveEvent(event);
    } catch (error) {
      if (error instanceof ConflictException && i < maxRetries - 1) {
        // 重新获取版本号
        const currentVersion = await eventStore.getCurrentVersion(event.aggregateId);
        event = new UserUpdatedEvent(
          event.aggregateId,
          currentVersion + 1,
          event.getEventData()
        );
      } else {
        throw error;
      }
    }
  }
}
```

### 问题 2：事件重放结果与数据库不一致

**症状**：重放的状态与数据库中的状态不同。

**原因**：
- 某些操作没有发布事件
- 事件应用逻辑错误
- 直接修改了数据库

**解决方案**：
```typescript
// 比较重放结果和数据库状态
async function validateUserState(userId: string) {
  const dbUser = await userRepository.findOne(userId);
  const replayedUser = await eventReplay.replayUserEvents(userId);

  const differences = [];

  if (dbUser.email !== replayedUser.email) {
    differences.push({ field: 'email', db: dbUser.email, replay: replayedUser.email });
  }
  // ... 检查其他字段

  if (differences.length > 0) {
    console.error('State mismatch detected:', differences);
    // 可以选择用事件重放的结果修复数据库
  }
}
```

### 问题 3：事件存储增长过快

**症状**：`user_events` 表增长很快，影响性能。

**解决方案**：

1. **实施快照（Snapshots）**：
```typescript
// 每 100 个事件创建一个快照
async function createSnapshot(userId: string) {
  const currentState = await eventReplay.replayUserEvents(userId);
  const currentVersion = await eventStore.getCurrentVersion(userId);

  await snapshotRepository.save({
    aggregateId: userId,
    version: currentVersion,
    state: currentState,
    createdAt: new Date(),
  });
}

// 从快照开始重放
async function replayFromSnapshot(userId: string) {
  const snapshot = await snapshotRepository.findLatest(userId);
  const eventsAfterSnapshot = await eventStore.getEventsFromVersion(
    userId,
    snapshot.version
  );

  let state = snapshot.state;
  for (const event of eventsAfterSnapshot) {
    state = applyEvent(state, event);
  }

  return state;
}
```

2. **定期归档旧事件**：
```sql
-- 移动旧事件到归档表
INSERT INTO user_events_archive
SELECT * FROM user_events
WHERE "createdAt" < NOW() - INTERVAL '2 years';

DELETE FROM user_events
WHERE "createdAt" < NOW() - INTERVAL '2 years';
```

---

## 总结

事件溯源系统提供了：

- ✅ **完整的审计追踪**：所有状态变更都有记录
- ✅ **时间旅行能力**：可以查看任意时间点的状态
- ✅ **数据恢复**：可以从事件重建状态
- ✅ **调试便利**：完整的操作历史
- ✅ **合规性支持**：满足审计要求

需要注意的：

- ⚠️ **存储开销**：事件会持续增长，需要归档策略
- ⚠️ **版本冲突**：并发时需要处理乐观锁
- ⚠️ **事件进化**：事件结构变更需要兼容性处理
- ⚠️ **性能考虑**：重放大量事件可能较慢，使用快照优化

---

## 相关文档

- [EVENT_SOURCING.md](./EVENT_SOURCING.md) - 技术架构文档
- [NestJS CQRS](https://docs.nestjs.com/recipes/cqrs) - NestJS CQRS 文档
- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html) - Martin Fowler 的事件溯源文章
