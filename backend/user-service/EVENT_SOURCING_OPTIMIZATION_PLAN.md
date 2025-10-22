# Event Sourcing 优化方案

> **当前版本**: 1.0.0
> **目标版本**: 1.1.0

---

## 🔍 当前系统分析

### 已实现功能 ✅

- 完整的事件存储和查询
- 事件重放和时间旅行
- 乐观锁机制
- 8 个领域事件和处理器
- 管理 API 接口
- 单元测试覆盖

### 识别的优化点

---

## 🚀 优化方案

### 1. 【关键】事件快照机制（Snapshot）

**问题**:
- 当用户有数千个事件时，重放会变得很慢
- 每次重建状态都要处理所有历史事件

**解决方案**: 实现快照机制

**设计**:
```typescript
// 每 100 个事件创建一个快照
interface UserSnapshot {
  id: string;
  aggregateId: string;
  version: number;        // 快照对应的版本
  state: Partial<User>;   // 完整的用户状态
  createdAt: Date;
}

// 从快照开始重放
async replayFromSnapshot(userId: string) {
  const snapshot = await getLatestSnapshot(userId);
  const eventsAfterSnapshot = await getEventsFromVersion(userId, snapshot.version);

  let state = snapshot.state;
  for (const event of eventsAfterSnapshot) {
    state = applyEvent(state, event);
  }
  return state;
}
```

**收益**:
- 重放速度提升 90%+
- 降低数据库负载
- 支持更长的事件历史

**优先级**: 🔴 **高** - 对性能影响巨大

---

### 2. 【重要】Prometheus 监控指标

**问题**:
- 无法监控事件处理性能
- 版本冲突率未知
- 事件存储增长速度未追踪

**解决方案**: 集成详细的 Prometheus 指标

**指标设计**:
```typescript
// 计数器
event_store_events_total{event_type}           // 事件总数
event_store_conflicts_total                    // 版本冲突总数
event_replay_requests_total{success}           // 重放请求数

// 直方图
event_store_save_duration_seconds              // 保存延迟
event_replay_duration_seconds                  // 重放延迟
event_handler_duration_seconds{handler}        // 处理器延迟

// 仪表盘
event_store_events_by_aggregate{aggregate_id}  // 每个聚合的事件数
event_store_size_bytes                         // 事件存储大小
```

**收益**:
- 实时监控系统健康
- 性能问题早期发现
- 容量规划数据

**优先级**: 🟡 **中** - 生产环境必需

---

### 3. 【重要】事件发布失败重试机制

**问题**:
- 事件保存成功但发布到 EventBus 失败
- 可能导致读写模型不一致

**解决方案**: 实现 Outbox Pattern

**设计**:
```typescript
// 1. 在同一事务中保存事件和 outbox 记录
await queryRunner.startTransaction();
try {
  await saveEvent(event);
  await outboxRepository.save({
    eventId: event.id,
    status: 'pending',
    retries: 0,
  });
  await queryRunner.commitTransaction();
} catch {
  await queryRunner.rollbackTransaction();
}

// 2. 后台任务定期处理 outbox
setInterval(async () => {
  const pendingEvents = await outboxRepository.find({ status: 'pending' });
  for (const record of pendingEvents) {
    try {
      await eventBus.publish(event);
      record.status = 'published';
    } catch {
      record.retries++;
      if (record.retries > 3) {
        record.status = 'failed';
        // 发送告警
      }
    }
    await outboxRepository.save(record);
  }
}, 5000);
```

**收益**:
- 保证最终一致性
- 减少事件丢失风险
- 提高系统可靠性

**优先级**: 🟡 **中** - 提高可靠性

---

### 4. 【优化】查询性能优化

**问题**:
- 频繁查询相同的事件历史
- 事件统计查询可能较慢

**解决方案**: 多层缓存策略

**设计**:
```typescript
// L1: 内存缓存（最近访问的聚合）
private recentAggregates = new LRU<string, UserEvent[]>({
  max: 100,
  ttl: 60000, // 1 分钟
});

// L2: Redis 缓存（常用查询）
async getEventsForAggregate(aggregateId: string) {
  // 检查 L1
  if (this.recentAggregates.has(aggregateId)) {
    return this.recentAggregates.get(aggregateId);
  }

  // 检查 L2 (Redis)
  const cached = await this.redis.get(`events:${aggregateId}`);
  if (cached) {
    const events = JSON.parse(cached);
    this.recentAggregates.set(aggregateId, events);
    return events;
  }

  // L3: 数据库
  const events = await this.repository.find({ aggregateId });

  // 写入缓存
  await this.redis.setex(`events:${aggregateId}`, 300, JSON.stringify(events));
  this.recentAggregates.set(aggregateId, events);

  return events;
}
```

**收益**:
- 查询速度提升 10-100x
- 降低数据库负载
- 提升用户体验

**优先级**: 🟡 **中** - 性能优化

---

### 5. 【增强】事件版本化和演进

**问题**:
- 事件 schema 变更时兼容性问题
- 无法区分事件的不同版本

**解决方案**: 事件版本化机制

**设计**:
```typescript
interface UserEvent {
  id: string;
  eventType: string;
  eventVersion: number;    // 新增: 事件版本
  eventData: any;
  schemaVersion: number;   // 新增: Schema 版本
  // ...
}

// 事件升级器
class EventUpgrader {
  upgrade(event: UserEvent): UserEvent {
    if (event.eventType === 'UserCreated' && event.schemaVersion < 2) {
      // 升级 v1 到 v2
      return {
        ...event,
        eventData: {
          ...event.eventData,
          phoneVerified: false, // v2 新增字段
        },
        schemaVersion: 2,
      };
    }
    return event;
  }
}

// 重放时自动升级
async replayUserEvents(userId: string) {
  const events = await this.getEventsForAggregate(userId);
  const upgradedEvents = events.map(e => this.upgrader.upgrade(e));
  // ... 应用事件
}
```

**收益**:
- 支持事件 schema 演进
- 向后兼容性
- 平滑升级路径

**优先级**: 🟢 **低** - 长期维护需要

---

### 6. 【增强】读模型投影（Projection）

**问题**:
- 复杂查询需要重放大量事件
- 统计查询性能不佳

**解决方案**: 创建专门的读模型

**设计**:
```typescript
// 读模型表
CREATE TABLE user_read_model (
  user_id UUID PRIMARY KEY,
  username VARCHAR(255),
  email VARCHAR(255),
  full_name VARCHAR(255),
  total_logins INTEGER,
  failed_login_attempts INTEGER,
  account_locked BOOLEAN,
  last_updated_version INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

// 投影处理器
@EventsHandler(UserCreatedEvent)
class UserReadModelProjection {
  async handle(event: UserCreatedEvent) {
    await this.readModelRepo.save({
      userId: event.aggregateId,
      username: event.username,
      email: event.email,
      totalLogins: 0,
      lastUpdatedVersion: event.version,
    });
  }
}

@EventsHandler(LoginInfoUpdatedEvent)
class LoginProjection {
  async handle(event: LoginInfoUpdatedEvent) {
    await this.readModelRepo.increment(
      { userId: event.aggregateId },
      'totalLogins',
      1
    );
  }
}
```

**收益**:
- 查询性能大幅提升
- 支持复杂的聚合查询
- CQRS 架构更完整

**优先级**: 🟢 **低** - 可选优化

---

### 7. 【增强】事件归档和清理策略

**问题**:
- 事件表无限增长
- 历史数据查询变慢

**解决方案**: 自动归档机制

**设计**:
```typescript
// 归档表
CREATE TABLE user_events_archive (
  LIKE user_events INCLUDING ALL
) PARTITION BY RANGE (created_at);

// 自动归档任务
@Cron('0 0 * * *')  // 每天凌晨
async archiveOldEvents() {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  // 1. 确保有快照
  const aggregates = await this.getAggregatesWithOldEvents(twoYearsAgo);
  for (const aggregateId of aggregates) {
    await this.snapshotService.createSnapshot(aggregateId);
  }

  // 2. 移动到归档表
  await this.db.query(`
    INSERT INTO user_events_archive
    SELECT * FROM user_events
    WHERE created_at < $1
  `, [twoYearsAgo]);

  // 3. 删除旧事件
  await this.db.query(`
    DELETE FROM user_events
    WHERE created_at < $1
  `, [twoYearsAgo]);

  this.logger.log(`Archived events older than ${twoYearsAgo}`);
}
```

**收益**:
- 控制表大小
- 保持查询性能
- 降低存储成本

**优先级**: 🟡 **中** - 长期运行需要

---

### 8. 【工具】开发者工具

**问题**:
- 调试事件流程困难
- 缺少可视化工具

**解决方案**: 开发者工具套件

**功能**:
```typescript
// CLI 工具
npm run event-sourcing:replay <userId>
npm run event-sourcing:stats
npm run event-sourcing:verify <userId>

// Web UI (开发环境)
GET /dev/events/viewer?userId=xxx
  - 事件时间轴可视化
  - 事件详情查看
  - 状态重放模拟
  - 版本对比工具
```

**收益**:
- 提升开发效率
- 简化调试流程
- 更好的问题定位

**优先级**: 🟢 **低** - 开发体验优化

---

## 📋 优化实施计划

### Phase 1: 核心性能优化（1-2 周）

**目标**: 提升性能和可靠性

1. ✅ **事件快照机制** - 3 天
   - 创建 user_snapshots 表
   - 实现快照服务
   - 修改重放逻辑使用快照
   - 自动快照策略（每 100 个事件）

2. ✅ **Prometheus 监控** - 2 天
   - 添加核心指标
   - 创建 Grafana 仪表板
   - 设置告警规则

3. ✅ **查询缓存优化** - 2 天
   - 实现 LRU 内存缓存
   - Redis 缓存集成
   - 缓存失效策略

### Phase 2: 可靠性增强（1 周）

**目标**: 提高系统可靠性

4. **事件发布重试** - 3 天
   - 实现 Outbox Pattern
   - 后台重试任务
   - 失败告警

5. **事件归档策略** - 2 天
   - 创建归档表
   - 自动归档任务
   - 归档查询支持

### Phase 3: 高级特性（2-3 周）

**目标**: 完善架构

6. **事件版本化** - 4 天
   - Schema 版本字段
   - 事件升级器
   - 兼容性测试

7. **读模型投影** - 5 天
   - 设计读模型
   - 投影处理器
   - 查询优化

8. **开发者工具** - 3 天
   - CLI 工具
   - 事件查看器
   - 文档和示例

---

## 📊 预期收益

### 性能提升

| 操作 | 当前 | 优化后 | 提升 |
|-----|------|--------|------|
| 重放 1000 事件 | 500ms | 50ms | 10x |
| 查询事件历史 | 20ms | 2ms | 10x |
| 事件统计 | 100ms | 10ms | 10x |

### 可靠性提升

- 事件发布成功率: 99.9% → 99.99%
- 数据一致性: 保证最终一致性
- 告警覆盖: 0% → 80%

### 存储优化

- 活跃事件表大小: 控制在 < 1000 万行
- 归档策略: 2 年自动归档
- 存储成本: 降低 50%+

---

## 🎯 优先级建议

### 立即实施（本周）
1. 🔴 事件快照机制
2. 🟡 Prometheus 监控
3. 🟡 查询缓存优化

### 短期实施（本月）
4. 🟡 事件归档策略
5. 🟡 事件发布重试

### 长期规划（季度）
6. 🟢 事件版本化
7. 🟢 读模型投影
8. 🟢 开发者工具

---

## 💡 实施建议

### 渐进式优化
- 不要一次性实施所有优化
- 先实施高优先级项目
- 每个优化都要有性能测试验证

### 兼容性保证
- 保持 API 向后兼容
- 数据库变更使用迁移
- 事件 schema 变更要兼容旧版本

### 监控先行
- 优化前先建立性能基线
- 优化后持续监控指标
- 问题及时回滚

---

## 📚 参考资源

- [Event Store Snapshots](https://eventstore.com/blog/snapshots-in-event-sourcing/)
- [Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [CQRS Read Models](https://docs.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [Event Versioning](https://leanpub.com/esversioning/read)

---

**结论**:
当前实现已经是功能完整的 v1.0，这些优化将使系统更加**高性能**、**可靠**和**可维护**。建议按优先级逐步实施，重点先解决性能问题（快照机制）。
