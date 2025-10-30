# Phase 8: P2 服务测试计划

**日期**: 2025-10-30
**阶段**: Phase 8 - P2 Services Testing
**优先级**: Medium (P2)

---

## 执行摘要

Phase 8 聚焦于 **P2 (Medium 优先级)** 服务的测试覆盖。初步评估显示:
- ✅ **QuotasService**: 已有 16 个测试 (需验证)
- ⚠️ **NotificationService**: 只有 1 个测试 (EmailService)
- ❓ **MediaService** (Go): 未知测试状态

**策略**: 优先完成 NotificationService 测试,然后评估 QuotasService,最后处理 MediaService (Go 服务可能需要不同的测试框架)。

---

## P2 服务概览

### 1. NotificationService ⚠️ **需要工作**
**位置**: `backend/notification-service`
**语言**: TypeScript + NestJS
**当前测试**: 1/? (EmailService only)

**功能**:
- 多渠道通知 (WebSocket, Email, SMS)
- 通知模板系统 (Handlebars)
- 通知偏好管理
- RabbitMQ 事件消费者 (device, user, billing, app events)
- Dead Letter Exchange (DLX) 处理

**核心服务**:
- `NotificationsService` - 主服务
- `EmailService` - Email 发送
- `TemplatesService` - 模板管理
- `PreferencesService` - 用户偏好
- `NotificationGateway` - WebSocket 网关

**现有测试**:
- ✅ `email.service.spec.ts` (1 test)

**需要测试**:
- 📝 `notifications.service.spec.ts` - 主服务 (15-20 tests)
- 📝 `templates.service.spec.ts` - 模板系统 (10-15 tests)
- 📝 `preferences.service.spec.ts` - 偏好管理 (8-10 tests)
- 📝 `notification.gateway.spec.ts` - WebSocket (5-8 tests)

**预估测试数**: 40-55 tests
**预估时间**: 5-6 小时

---

### 2. QuotasService ✅ **已有测试**
**位置**: `backend/user-service/src/quotas`
**语言**: TypeScript + NestJS
**当前测试**: 16/16 通过 (100%)

**功能**:
- 配额创建和管理
- 配额检查 (设备数、CPU、内存、存储)
- 配额扣除和恢复
- 配额过期检测
- 单设备资源限制

**现有测试**:
- ✅ `quotas.service.spec.ts` (16 tests)
- ✅ `quotas.controller.spec.ts` (? tests)

**评估**: 需运行测试并查看覆盖率,可能已完成

**预估时间**: 1-2 小时 (验证和补充)

---

### 3. MediaService ❓ **Go 服务**
**位置**: `backend/media-service`
**语言**: Go (Gin framework)
**当前测试**: 未知

**功能**:
- WebRTC 流媒体 (屏幕共享)
- 屏幕录制
- 多编码器支持 (H.264, VP8, VP9)
- STUN/TURN 服务器集成
- 性能优化 (硬件加速)

**核心模块**:
- `internal/webrtc/` - WebRTC 处理
- `internal/recording/` - 屏幕录制
- `internal/encoders/` - 编码器管理
- `internal/api/` - HTTP API

**测试框架**: 需要 Go 测试框架 (testing, testify)

**预估**: 需要评估 Go 测试现状,可能超出 Phase 8 范围

**预估时间**: 待评估 (可能作为独立 Phase)

---

## Phase 8 执行计划

### 优先级排序

1. **QuotasService** (1-2 小时) - 最高优先级
   - ✅ 已有 16 个测试
   - 📝 验证测试通过率
   - 📝 检查测试覆盖率
   - 📝 补充缺失测试 (如有)

2. **NotificationService** (5-6 小时) - 高优先级
   - ⚠️ 只有 1 个测试
   - 📝 分析 4 个核心服务
   - 📝 编写 40-55 个测试
   - 📝 验证 100% 通过

3. **MediaService** (待评估) - 低优先级
   - ❓ Go 服务测试待评估
   - 📝 可能作为 Phase 9 或独立任务

---

## Phase 8.1: QuotasService 验证

### 步骤 1: 运行现有测试
```bash
cd backend/user-service
npx jest src/quotas/*.spec.ts --verbose
```

### 步骤 2: 检查测试覆盖率
```bash
npx jest src/quotas/*.spec.ts --coverage
```

### 步骤 3: 评估结果
- 如果通过率 = 100%,覆盖率 > 80%,标记为 ✅ 完成
- 如果通过率 < 100%,修复失败测试
- 如果覆盖率 < 80%,补充缺失测试

---

## Phase 8.2: NotificationService 测试

### 目标
创建 40-55 个测试覆盖 NotificationService 的所有核心功能

### 子任务

#### 1. NotificationsService (15-20 tests)
**文件**: `backend/notification-service/src/notifications/__tests__/notifications.service.spec.ts`

**测试覆盖**:
- ✅ 创建通知 (多渠道)
- ✅ 批量通知
- ✅ 通知查询 (分页、过滤)
- ✅ 通知标记已读
- ✅ 通知删除
- ✅ WebSocket 推送
- ✅ Email 发送
- ✅ SMS 发送 (mock)
- ✅ 通知偏好检查
- ✅ 模板渲染集成
- ✅ 错误处理

#### 2. TemplatesService (10-15 tests)
**文件**: `backend/notification-service/src/templates/__tests__/templates.service.spec.ts`

**测试覆盖**:
- ✅ 创建模板
- ✅ 更新模板
- ✅ 删除模板
- ✅ 查询模板
- ✅ 渲染模板 (Handlebars)
- ✅ 模板变量验证
- ✅ 多语言模板
- ✅ 模板缓存
- ✅ 错误处理

#### 3. PreferencesService (8-10 tests)
**文件**: `backend/notification-service/src/notifications/__tests__/preferences.service.spec.ts`

**测试覆盖**:
- ✅ 获取用户偏好
- ✅ 更新偏好
- ✅ 重置为默认值
- ✅ 渠道启用/禁用
- ✅ 通知类型过滤
- ✅ 免打扰时段
- ✅ 错误处理

#### 4. NotificationGateway (5-8 tests)
**文件**: `backend/notification-service/src/gateway/__tests__/notification.gateway.spec.ts`

**测试覆盖**:
- ✅ WebSocket 连接
- ✅ 身份验证
- ✅ 房间加入 (user-specific)
- ✅ 实时通知推送
- ✅ 连接断开处理
- ✅ 错误处理

---

## 测试架构

### Mock 依赖 (NotificationService)

#### Repositories (3 个)
- `Notification` - 通知记录
- `NotificationTemplate` - 模板
- `NotificationPreference` - 用户偏好

#### Services (5 个)
- `EmailService` - Email 发送 (Nodemailer)
- `SmsService` - SMS 发送 (placeholder)
- `EventBusService` - 事件发布
- `ConfigService` - 配置管理
- `CacheManager` - 缓存 (Redis)

#### Gateway (1 个)
- `NotificationGateway` - WebSocket 服务器

#### External (2 个)
- `Handlebars` - 模板引擎
- `ioredis` - Redis 客户端

---

## 技术挑战

### 挑战 1: WebSocket 测试
**问题**: WebSocket Gateway 需要特殊的测试设置

**解决方案**:
- 使用 `@nestjs/testing` 的 WebSocket 测试工具
- Mock Socket.IO client
- 验证事件发送而非实际连接

### 挑战 2: Handlebars 模板渲染
**问题**: 模板引擎集成测试

**解决方案**:
- Mock Handlebars.compile()
- 提供示例模板和数据
- 验证渲染输出格式

### 挑战 3: Email 发送
**问题**: Nodemailer 异步操作

**解决方案**:
- Mock EmailService.sendEmail()
- 验证调用参数 (to, subject, html)
- 不实际发送邮件

### 挑战 4: RabbitMQ 事件消费
**问题**: 测试事件消费者

**解决方案**:
- 直接调用消费者处理函数
- Mock @RabbitSubscribe 装饰器
- 验证通知创建逻辑

---

## 成功标准

### Phase 8 完成标准

1. ✅ **QuotasService**: 测试通过率 100%,覆盖率 > 80%
2. ✅ **NotificationService**: 40-55 个测试全部通过 (100%)
3. ✅ **文档**: 完成 Phase 8 测试报告
4. ❓ **MediaService**: 评估完成并决定下一步

### 测试质量标准

- ✅ 所有测试必须通过 (100%)
- ✅ 无跳过测试 (.skip)
- ✅ 覆盖所有核心业务方法
- ✅ 覆盖所有错误路径
- ✅ Mock 所有外部依赖
- ✅ 测试执行时间 < 10 秒

---

## 时间估算

| 任务 | 预估时间 | 优先级 |
|------|----------|--------|
| QuotasService 验证 | 1-2 小时 | P1 |
| NotificationService 测试 | 5-6 小时 | P1 |
| MediaService 评估 | 1 小时 | P2 |
| 文档和报告 | 1 小时 | P1 |
| **总计** | **8-10 小时** | - |

---

## 参考模式

### Saga 模式测试 (from AppsService)
```typescript
expect(mockSagaOrchestrator.executeSaga).toHaveBeenCalledWith(
  expect.objectContaining({
    type: 'SAGA_TYPE',
    steps: expect.arrayContaining([
      expect.objectContaining({ name: 'STEP_1' }),
    ]),
  }),
);
```

### 事件发布测试 (from DevicesService)
```typescript
expect(mockEventBus.publishEvent).toHaveBeenCalledWith(
  'event.name',
  expect.objectContaining({ key: 'value' }),
);
```

### WebSocket 测试 (new)
```typescript
const mockClient = {
  id: 'client-123',
  emit: jest.fn(),
  join: jest.fn(),
};

await gateway.handleConnection(mockClient);
expect(mockClient.join).toHaveBeenCalledWith('user-123');
```

---

## 下一步

1. ✅ **创建 Phase 8 计划** (本文档)
2. 📝 **验证 QuotasService** - 运行测试并检查覆盖率
3. 📝 **分析 NotificationService** - 阅读 4 个核心服务代码
4. 📝 **创建测试框架** - 设置 mock 和测试文件
5. 📝 **编写测试** - 40-55 个测试
6. 📝 **评估 MediaService** - Go 服务测试策略
7. 📝 **创建完成报告** - Phase 8 总结

---

**计划创建时间**: 2025-10-30
**预估完成时间**: 8-10 小时
**Phase 8 状态**: 📝 **进行中**
