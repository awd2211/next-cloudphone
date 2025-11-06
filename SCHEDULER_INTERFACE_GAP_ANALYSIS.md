# Scheduler 调度器接口缺口分析

**分析时间**: 2025-11-03 20:15
**分析对象**: device-service 中的 scheduler 模块

---

## 📊 现状概述

前端期望有完整的调度器管理接口，包括节点管理、调度策略、任务管理和集群统计。后端在 device-service 中已经实现了部分 scheduler 功能，但接口设计与前端期望存在差异。

---

## ✅ 已实现的接口

### 1. 节点管理 (Nodes)

| 前端期望 | 后端实现 | 状态 |
|---------|---------|------|
| GET /scheduler/nodes | GET /scheduler/nodes | ✅ 匹配 |
| GET /scheduler/nodes/:id | GET /scheduler/nodes/{id} | ✅ 匹配 |
| POST /scheduler/nodes | ❓ 需要验证 | ⚠️ 待确认 |
| PUT /scheduler/nodes/:id | ❓ 需要验证 | ⚠️ 待确认 |
| DELETE /scheduler/nodes/:id | ❓ 需要验证 | ⚠️ 待确认 |
| POST /scheduler/nodes/:id/maintenance | POST /scheduler/nodes/{id}/maintenance | ✅ 匹配 |
| POST /scheduler/nodes/:id/drain | POST /scheduler/nodes/{id}/drain | ✅ 匹配 |

### 2. 设备调度 (Scheduling)

| 前端期望 | 后端实现 | 状态 |
|---------|---------|------|
| POST /scheduler/schedule | POST /scheduler/schedule | ✅ 匹配 |
| POST /scheduler/reschedule/:deviceId | ❌ 不存在 | ❌ 缺失 |

### 3. 集群统计 (Stats)

| 前端期望 | 后端实现 | 状态 |
|---------|---------|------|
| GET /scheduler/stats | GET /scheduler/stats | ✅ 匹配 |
| GET /scheduler/nodes/:nodeId/usage-trend | ❌ 不存在 | ❌ 缺失 |
| GET /scheduler/cluster/usage-trend | ❌ 不存在 | ❌ 缺失 |

---

## ❌ 缺失的接口组

### 1. 调度策略管理 (Strategies)

**前端期望的接口** (7个):

```typescript
// 策略列表
GET /scheduler/strategies
→ 返回: SchedulingStrategy[]

// 获取当前激活策略
GET /scheduler/strategies/active
→ 返回: SchedulingStrategy

// 激活策略
POST /scheduler/strategies/:id/activate
→ 请求: { id: string }

// 创建策略
POST /scheduler/strategies
→ 请求: CreateStrategyDto

// 更新策略
PUT /scheduler/strategies/:id
→ 请求: UpdateStrategyDto

// 删除策略
DELETE /scheduler/strategies/:id

// 策略类型
enum StrategyType {
  'round-robin',
  'least-loaded',
  'random',
  'priority',
  'custom'
}
```

**后端实际情况**:
- ✅ 后端有 `AllocationStrategy` 概念
- ✅ 后端有 `GET /scheduler/allocations/strategy`
- ✅ 后端有 `GET /scheduler/strategy`
- ❌ 没有策略的 CRUD 管理接口
- ❌ 没有策略激活/切换接口

**差距**:
后端实现了调度策略的**应用**，但没有实现策略的**管理**功能。前端需要完整的策略 CRUD。

---

### 2. 调度任务管理 (Tasks)

**前端期望的接口** (1个):

```typescript
// 获取调度任务列表
GET /scheduler/tasks
→ 查询参数: { status?, userId?, limit?, offset? }
→ 返回: PaginatedResponse<SchedulingTask>

interface SchedulingTask {
  id: string;
  deviceId: string;
  userId: string;
  requestedAt: string;
  scheduledAt?: string;
  completedAt?: string;
  status: 'pending' | 'scheduled' | 'running' | 'completed' | 'failed';
  nodeId?: string;
  requirements: {
    cpuCores: number;
    memoryMB: number;
    storageMB: number;
    region?: string;
    zone?: string;
  };
  error?: string;
}
```

**后端实际情况**:
- ✅ 后端有 `scheduler/queue` 接口
- ✅ 后端有任务队列概念
- ❌ 接口路径不匹配（/scheduler/queue vs /scheduler/tasks）
- ❌ 数据结构可能不匹配

**差距**:
后端使用 "queue" 概念，前端使用 "tasks" 概念，需要统一命名或提供适配接口。

---

### 3. 重新调度 (Reschedule)

**前端期望的接口** (1个):

```typescript
// 重新调度设备
POST /scheduler/reschedule/:deviceId
→ 无请求体
→ 返回: SchedulingResult
```

**后端实际情况**:
- ❌ 没有 `/scheduler/reschedule` 端点
- ⚠️ 可能通过其他方式实现（释放+重新分配）

**差距**:
前端期望有便捷的重新调度操作，后端可能需要多步操作。

---

### 4. 节点使用趋势 (Usage Trends)

**前端期望的接口** (2个):

```typescript
// 单节点使用趋势
GET /scheduler/nodes/:nodeId/usage-trend
→ 查询参数: { startDate?, endDate? }
→ 返回: UsageTrendData

// 集群使用趋势
GET /scheduler/cluster/usage-trend
→ 查询参数: { startDate?, endDate? }
→ 返回: ClusterTrendData
```

**后端实际情况**:
- ❌ 没有趋势分析接口
- ⚠️ 可能有实时统计，但没有历史趋势

**差距**:
缺少时序数据和趋势分析功能。

---

## 🔍 后端额外提供的接口

后端实现了一些前端未使用的高级功能：

### 1. 分配管理 (Allocations)
```
GET  /scheduler/allocations
POST /scheduler/allocations/batch
GET  /scheduler/allocations/stats
POST /scheduler/allocations/batch/extend
...
```

### 2. 预约管理 (Reservations)
```
GET    /scheduler/reservations
POST   /scheduler/reservations
DELETE /scheduler/reservations/{id}/cancel
GET    /scheduler/reservations/stats/summary
...
```

### 3. 节点标签和污点 (Labels & Taints)
```
GET    /scheduler/nodes/{id}/labels
PUT    /scheduler/nodes/{id}/labels/{key}
DELETE /scheduler/nodes/{id}/labels/{key}
GET    /scheduler/nodes/{id}/taints
PUT    /scheduler/nodes/{id}/taints/{key}
DELETE /scheduler/nodes/{id}/taints/{key}
```

### 4. 资源监控 (Resource Monitoring)
```
GET  /scheduler/resources/cluster-stats
GET  /scheduler/resources/local-node-info
POST /scheduler/resources/update/{nodeId}
```

这些是 Kubernetes 风格的高级调度功能，前端暂未使用。

---

## 📋 接口对齐方案

### 方案 1: 扩展后端接口（推荐）

**优点**:
- 保持前端代码不变
- 符合前端开发者的预期
- 提供完整的管理功能

**需要实现**:

1. **调度策略 CRUD** (7个接口):
   - GET /scheduler/strategies
   - GET /scheduler/strategies/active
   - POST /scheduler/strategies
   - PUT /scheduler/strategies/:id
   - DELETE /scheduler/strategies/:id
   - POST /scheduler/strategies/:id/activate

2. **任务别名接口** (1个):
   - GET /scheduler/tasks → 代理到 /scheduler/queue

3. **重新调度** (1个):
   - POST /scheduler/reschedule/:deviceId

4. **趋势分析** (2个):
   - GET /scheduler/nodes/:nodeId/usage-trend
   - GET /scheduler/cluster/usage-trend

**工作量**: 约 4-6 小时

---

### 方案 2: 修改前端代码

**优点**:
- 利用后端已有的强大功能
- 减少后端开发工作量

**需要修改**:
- 前端 services/scheduler.ts
- 相关的 hooks 和组件

**缺点**:
- 前端改动较大
- 需要理解后端的高级功能

**工作量**: 约 2-3 小时

---

### 方案 3: 适配层（中间方案）

在 api-gateway 或 device-service 中添加适配层，将前端期望的路径映射到后端实际接口。

**优点**:
- 前后端都不需要大改
- 保持向后兼容

**缺点**:
- 增加一层抽象
- 维护成本

**工作量**: 约 2-3 小时

---

## 🎯 推荐方案

**推荐方案 1**: 扩展后端接口

理由：
1. **完整性**: 提供前端期望的完整功能
2. **一致性**: 保持前端代码和预期一致
3. **可维护性**: 接口语义清晰，易于理解
4. **扩展性**: 为未来功能扩展打好基础

---

## 📝 实现优先级

### P0 (必须实现)
- ✅ GET /scheduler/nodes (已有)
- ✅ GET /scheduler/stats (已有)
- ✅ POST /scheduler/schedule (已有)

### P1 (高优先级)
- ❌ GET /scheduler/strategies
- ❌ GET /scheduler/strategies/active
- ❌ POST /scheduler/strategies/:id/activate
- ❌ GET /scheduler/tasks
- ❌ POST /scheduler/reschedule/:deviceId

### P2 (中优先级)
- ❌ POST /scheduler/strategies (创建策略)
- ❌ PUT /scheduler/strategies/:id (更新策略)
- ❌ DELETE /scheduler/strategies/:id (删除策略)
- ❌ POST /scheduler/nodes (创建节点)
- ❌ PUT /scheduler/nodes/:id (更新节点)
- ❌ DELETE /scheduler/nodes/:id (删除节点)

### P3 (低优先级)
- ❌ GET /scheduler/nodes/:nodeId/usage-trend
- ❌ GET /scheduler/cluster/usage-trend

---

## 🔧 技术实现建议

### 1. 调度策略管理

```typescript
// backend/device-service/src/scheduler/strategy/

// strategy.entity.ts
@Entity('scheduling_strategies')
export class SchedulingStrategy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: StrategyType })
  type: StrategyType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  config: Record<string, any>;

  @Column({ default: false })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// strategy.service.ts
@Injectable()
export class StrategyService {
  async getAll(): Promise<SchedulingStrategy[]> { /* ... */ }
  async getActive(): Promise<SchedulingStrategy> { /* ... */ }
  async create(dto: CreateStrategyDto): Promise<SchedulingStrategy> { /* ... */ }
  async update(id: string, dto: UpdateStrategyDto): Promise<SchedulingStrategy> { /* ... */ }
  async delete(id: string): Promise<void> { /* ... */ }
  async activate(id: string): Promise<void> { /* ... */ }
}

// strategy.controller.ts
@Controller('scheduler/strategies')
export class StrategyController {
  @Get()
  getStrategies() { /* ... */ }

  @Get('active')
  getActiveStrategy() { /* ... */ }

  @Post()
  createStrategy(@Body() dto: CreateStrategyDto) { /* ... */ }

  @Put(':id')
  updateStrategy(@Param('id') id: string, @Body() dto: UpdateStrategyDto) { /* ... */ }

  @Delete(':id')
  deleteStrategy(@Param('id') id: string) { /* ... */ }

  @Post(':id/activate')
  activateStrategy(@Param('id') id: string) { /* ... */ }
}
```

### 2. 任务别名接口

```typescript
// scheduler.controller.ts 中添加
@Get('tasks')
async getTasks(@Query() query: QueryTasksDto) {
  // 代理到 queue 接口，进行数据格式转换
  const queueItems = await this.queueService.getAll(query);
  return {
    success: true,
    data: queueItems.map(this.convertQueueToTask),
    total: queueItems.length,
  };
}

private convertQueueToTask(queueItem: QueueItem): SchedulingTask {
  return {
    id: queueItem.id,
    deviceId: queueItem.deviceId,
    userId: queueItem.userId,
    requestedAt: queueItem.createdAt,
    scheduledAt: queueItem.scheduledAt,
    completedAt: queueItem.completedAt,
    status: this.mapQueueStatus(queueItem.status),
    nodeId: queueItem.assignedNodeId,
    requirements: queueItem.requirements,
    error: queueItem.error,
  };
}
```

### 3. 重新调度接口

```typescript
@Post('reschedule/:deviceId')
async rescheduleDevice(@Param('deviceId') deviceId: string) {
  // 1. 释放当前分配
  await this.allocationService.releaseByDeviceId(deviceId);

  // 2. 重新加入调度队列
  const task = await this.queueService.join({
    deviceId,
    priority: 'high', // 重新调度优先级高
  });

  // 3. 立即处理
  await this.queueService.processNext();

  return {
    success: true,
    message: 'Device rescheduled successfully',
    data: task,
  };
}
```

---

## 📊 数据库迁移

需要新增的表：

```sql
-- 调度策略表
CREATE TABLE scheduling_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 确保只有一个激活策略
CREATE UNIQUE INDEX idx_unique_active_strategy
ON scheduling_strategies (is_active)
WHERE is_active = TRUE;

-- 索引
CREATE INDEX idx_strategy_type ON scheduling_strategies(type);
CREATE INDEX idx_strategy_active ON scheduling_strategies(is_active);
```

---

## 🎉 总结

### 当前状态
- ✅ **节点管理**: 70% 完成（缺少 CRUD）
- ❌ **调度策略**: 0% 完成（完全缺失）
- ⚠️ **任务管理**: 80% 完成（接口不匹配）
- ✅ **设备调度**: 50% 完成（缺少重新调度）
- ⚠️ **集群统计**: 50% 完成（缺少趋势）

### 总体完成度
**50%** - 基础调度功能已实现，管理功能缺失

### 建议行动
1. **立即实施**: P1 接口实现（调度策略、任务别名、重新调度）
2. **短期规划**: P2 接口实现（完整的 CRUD）
3. **中期规划**: P3 接口实现（趋势分析）

---

**分析人**: Claude Code
**文档版本**: 1.0
**下一步**: 开始实现 P1 接口
