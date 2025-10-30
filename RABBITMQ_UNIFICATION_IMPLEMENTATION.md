# RabbitMQ 统一实现 - 具体实施步骤

**状态**: 待确认
**风险等级**: 🟡 中等 (核心架构变更)
**预计时间**: 2 小时
**可回滚**: ✅ 是 (通过 git)

---

## 📋 已完成的准备工作

1. ✅ 分析了所有服务的 RabbitMQ 实现
2. ✅ 创建了迁移计划 ([RABBITMQ_UNIFICATION_PLAN.md](RABBITMQ_UNIFICATION_PLAN.md))
3. ✅ 实现了新的 EventBusService V2 (使用 AmqpConnection)
4. ✅ 实现了新的 EventBusModule V2 (集成 RabbitMQModule)

**新文件**:
- `backend/shared/src/events/event-bus.service.v2.ts`
- `backend/shared/src/events/event-bus.module.v2.ts`

---

## 🎯 迁移目标

将所有服务从混合使用(原生 amqplib + @golevelup)统一到 `@golevelup/nestjs-rabbitmq`。

**收益**:
- ✅ 代码一致性 (所有服务使用相同实现)
- ✅ 功能完整性 (所有服务都可以使用 @RabbitSubscribe)
- ✅ 维护性 (统一的配置和错误处理)
- ✅ 自动重连 (由 @golevelup 提供)

---

## 📝 具体实施步骤

### Step 1: 备份和替换 shared 模块文件

```bash
# 1.1 备份旧文件
cd /home/eric/next-cloudphone/backend/shared/src/events
cp event-bus.service.ts event-bus.service.v1.backup
cp event-bus.module.ts event-bus.module.v1.backup

# 1.2 替换为新版本
mv event-bus.service.v2.ts event-bus.service.ts
mv event-bus.module.v2.ts event-bus.module.ts

# 1.3 重新构建 shared 模块
cd /home/eric/next-cloudphone/backend/shared
pnpm build
```

**预期结果**: shared 模块编译成功,无 TypeScript 错误

---

### Step 2: 更新 device-service

**文件**: `backend/device-service/src/app.module.ts`

```typescript
// 修改前
import { EventBusModule } from '@cloudphone/shared';

@Module({
  imports: [
    // ...
    EventBusModule,  // ❌ 旧方式
    // ...
  ],
})

// 修改后
import { EventBusModule } from '@cloudphone/shared';

@Module({
  imports: [
    // ...
    EventBusModule.forRoot(),  // ✅ 新方式
    // ...
  ],
})
```

**文件**: `backend/device-service/src/devices/devices.module.ts`

```typescript
// 启用消费者
import { DevicesConsumer } from './devices.consumer';

@Module({
  // ...
  providers: [
    DevicesService,
    DevicesConsumer,  // ✅ 启用
  ],
})
export class DevicesModule {}
```

**测试步骤**:
```bash
pnpm --filter device-service build
pm2 restart device-service
sleep 5

# 测试 EventOutbox 发布
bash scripts/test-event-outbox-flow.sh

# 检查消费者
curl -s -u admin:admin123 http://localhost:15672/api/queues/cloudphone | \
  jq '.[] | select(.name | startswith("device-service"))'
```

**预期结果**:
- device-service 启动成功
- EventOutbox 发布正常
- device-service 的 6 个消费者连接 (app-install, app-uninstall, etc.)

---

### Step 3: 更新 user-service

**文件**: `backend/user-service/src/app.module.ts`

```typescript
// 修改
import { EventBusModule } from '@cloudphone/shared';

@Module({
  imports: [
    // ...
    EventBusModule.forRoot(),  // ✅ 修改这里
    // ...
  ],
})
```

**测试步骤**:
```bash
pnpm --filter user-service build
pm2 restart user-service
sleep 3

# 检查服务状态
curl -s http://localhost:30001/health | jq '.'
```

**预期结果**:
- user-service 启动成功
- 健康检查返回 "ok"
- EventOutbox (如果有) 发布正常

---

### Step 4: 更新 app-service

**文件**: `backend/app-service/src/app.module.ts`

```typescript
// 修改
import { EventBusModule } from '@cloudphone/shared';

@Module({
  imports: [
    // ...
    EventBusModule.forRoot(),  // ✅ 修改这里
    // ...
  ],
})
```

**测试步骤**:
```bash
pnpm --filter app-service build
pm2 restart app-service
sleep 3

# 检查服务状态
curl -s http://localhost:30003/health | jq '.'
```

**预期结果**:
- app-service 启动成功
- 健康检查返回 "ok"

---

### Step 5: 验证 notification-service 和 billing-service

这两个服务已经在使用 @golevelup,但需要确认它们与新的 shared 模块兼容。

```bash
# 重启服务
pm2 restart notification-service
pm2 restart billing-service

# 等待启动
sleep 5

# 检查消费者
curl -s -u admin:admin123 http://localhost:15672/api/queues/cloudphone | \
  jq '[.[] | {name, consumers}] | group_by(.name | split(".")[0]) | map({service: .[0].name | split(".")[0], total_consumers: map(.consumers) | add})'
```

**预期结果**:
- notification-service: 12 消费者
- billing-service: 5 消费者

---

### Step 6: 端到端测试

```bash
# 1. EventOutbox 测试
bash scripts/test-event-outbox-flow.sh

# 2. EventOutbox 重试测试
bash scripts/test-eventoutbox-retry.sh

# 3. 检查所有服务健康状态
for port in 30001 30002 30003 30005 30006; do
  echo "=== Port $port ==="
  curl -s http://localhost:$port/health | jq '{service, status}'
done

# 4. 检查 RabbitMQ 总体状态
curl -s -u admin:admin123 http://localhost:15672/api/overview | \
  jq '{connections: .object_totals.connections, channels: .object_totals.channels, queues: .object_totals.queues, consumers: .object_totals.consumers}'
```

**预期结果**:
- 所有测试通过
- 所有服务健康
- RabbitMQ 统计正常

---

## ⚠️ 潜在风险和缓解措施

### 风险 1: EventOutbox 无法发布事件

**症状**: EventOutbox 轮询执行,但事件状态保持 `pending`

**排查**:
```bash
pm2 logs device-service | grep -i "eventoutbox\|publish\|rabbitmq"
```

**缓解**: AmqpConnection 的 API 与原生 amqplib 兼容,理论上不会有问题

**回滚方案**:
```bash
cd /home/eric/next-cloudphone/backend/shared/src/events
mv event-bus.service.v1.backup event-bus.service.ts
mv event-bus.module.v1.backup event-bus.module.ts
cd /home/eric/next-cloudphone/backend/shared
pnpm build
pm2 restart all
```

---

### 风险 2: 服务无法启动

**症状**: 服务启动时报错 "Cannot resolve dependency"

**排查**:
```bash
pm2 logs <service-name> --lines 50
```

**可能原因**:
- EventBusModule.forRoot() 未调用
- RabbitMQModule 配置错误

**缓解**: 已在新模块中正确配置

---

### 风险 3: 消费者无法注册

**症状**: @RabbitSubscribe 装饰器不生效

**排查**:
```bash
curl -s -u admin:admin123 http://localhost:15672/api/queues/cloudphone | jq '[.[] | {name, consumers}]'
```

**可能原因**:
- enableControllerDiscovery: true 未设置
- 消费者类未在 providers 中注册

**缓解**: 已在新模块中设置 enableControllerDiscovery

---

## 🔄 完整回滚方案

如果迁移后出现严重问题,可以完整回滚:

```bash
# 1. 回滚 shared 模块
cd /home/eric/next-cloudphone/backend/shared/src/events
mv event-bus.service.ts event-bus.service.v2.failed
mv event-bus.module.ts event-bus.module.v2.failed
mv event-bus.service.v1.backup event-bus.service.ts
mv event-bus.module.v1.backup event-bus.module.ts

# 2. 重新构建 shared
cd /home/eric/next-cloudphone/backend/shared
pnpm build

# 3. 回滚各服务的 app.module.ts 修改
# (通过 git checkout 或手动改回 EventBusModule 不带 .forRoot())

# 4. 重启所有服务
pm2 restart all

# 5. 验证
bash scripts/test-event-outbox-flow.sh
```

**预计回滚时间**: < 10 分钟

---

## ✅ 成功标准

迁移成功的标准:

1. ✅ 所有服务启动成功
2. ✅ EventOutbox 测试通过
3. ✅ EventOutbox 重试测试通过
4. ✅ 所有消费者连接正常 (notification: 12, billing: 5, device: 6)
5. ✅ 所有服务健康检查返回 "ok" 或 "degraded" (device-service 预期 degraded)
6. ✅ RabbitMQ 无异常日志

---

## 📊 迁移前后对比

| 指标 | 迁移前 | 迁移后 (预期) |
|-----|-------|-------------|
| RabbitMQ 实现 | 混合 (amqplib + @golevelup) | 统一 (@golevelup) |
| device-service 消费者 | 0 | 6 ✅ |
| user-service 消费者 | 0 | 0 (无需消费) |
| app-service 消费者 | 0 | 0 (无需消费) |
| notification-service 消费者 | 12 | 12 |
| billing-service 消费者 | 5 | 5 |
| **总消费者数** | 17 | **23** ✅ |
| 代码一致性 | ❌ 不一致 | ✅ 统一 |
| @RabbitSubscribe 支持 | 部分 | 全部 ✅ |

---

## 🚦 决策建议

**我的建议**: ✅ 继续实施

**理由**:
1. 准备工作充分 (计划、新代码、测试脚本都已就绪)
2. 风险可控 (完整的回滚方案)
3. 收益明显 (统一架构,启用 device-service 消费者)
4. 时机合适 (已完成 Phase 5 和 Phase 6,架构验证通过)

**替代方案**: 保持现状 (不推荐)
- 如果选择不迁移,需要维护两套 RabbitMQ 实现
- device-service 的消费者无法启用
- 长期维护成本更高

---

## 📝 需要确认的事项

在开始实施前,请确认:

- [ ] 是否同意进行此次架构统一?
- [ ] 是否现在开始实施? (还是需要等待其他工作完成?)
- [ ] 是否需要我继续,还是您希望自己按照文档执行?

---

**创建时间**: 2025-10-30 05:30:00
**最后更新**: 2025-10-30 05:30:00
**状态**: ⏸️ 等待确认
