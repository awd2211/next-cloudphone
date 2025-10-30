# 项目改进计划

**创建时间**: 2025-10-30
**状态**: 📋 规划中
**基于**: TypeScript 严格模式完成后的项目评估

---

## 📊 当前项目状态

### ✅ 已完成的工作

1. **TypeScript 严格模式** - 100% 完成
   - ✅ shared 模块 (9 errors)
   - ✅ notification-service (15 errors)
   - ✅ device-service (72 errors)
   - ✅ 构建验证通过

2. **P2 功能增强** - 100% 完成
   - ✅ mDNS 设备自动发现
   - ✅ SMS 通知集成
   - ✅ 通知服务枚举统一
   - ✅ Media Service 编码器优化

3. **测试改进**
   - ✅ AuthService 测试修复 (35/36 通过)
   - ✅ EventBusService Mock 集成

4. **文档完善**
   - ✅ 5 份详细技术报告
   - ✅ 8 种修复模式总结
   - ✅ 最佳实践文档

---

## 🎯 发现的 TODO 项 (28 个)

### 分类统计

| 类别 | 数量 | 优先级 |
|------|------|--------|
| **云服务 Provider Mock** | 15 | P2 - 中 |
| **Frontend API 集成** | 5 | P1 - 高 |
| **Backend 服务间调用** | 3 | P1 - 高 |
| **功能增强** | 3 | P2 - 中 |
| **测试改进** | 2 | P3 - 低 |

---

## 📋 详细改进项列表

### Priority 1: 高优先级 (影响功能完整性)

#### 1. Frontend Device API 集成 (5 items)

**文件**:
- `frontend/admin/src/pages/Device/List.tsx`
- `frontend/admin/src/components/DeviceList/DeviceCard.tsx`
- `frontend/admin/src/hooks/usePhysicalDevices.ts`

**问题**:
```typescript
// TODO: Backend uses Socket.IO, not native WebSocket
// TODO: 调用启动设备 API
// TODO: 调用停止设备 API
// TODO: 调用删除设备 API
// TODO: 实现删除 API
```

**影响**: 设备管理功能不完整，用户无法通过界面操作设备

**建议修复**:
1. 集成 Socket.IO client 替代原生 WebSocket
2. 实现设备启动/停止/删除 API 调用
3. 添加错误处理和加载状态
4. 补充用户反馈（成功/失败提示）

**预计时间**: 2-3 小时

**影响范围**: Frontend Admin - Device Management

---

#### 2. Notification Service 服务间调用 (2 items)

**文件**:
- `backend/notification-service/src/notifications/notifications.service.ts`
- `backend/notification-service/src/notifications/error-notification.service.ts`

**问题**:
```typescript
// TODO: 统一两个枚举
// TODO: 从user-service获取具有admin角色的用户
// TODO: 调用user-service API获取管理员列表
```

**影响**:
- 枚举不统一可能导致类型不匹配
- 错误通知无法发送给管理员

**建议修复**:
1. 统一 NotificationType 和 NotificationChannel 枚举
2. 创建 UserServiceClient 调用 user-service API
3. 实现 getAdminUsers() 方法获取管理员列表

**预计时间**: 1-2 小时

**影响范围**: Notification Service - Error Notifications

---

#### 3. Scheduler Service 计费数据死信队列 (1 item)

**文件**: `backend/device-service/src/scheduler/allocation.service.ts`

**问题**:
```typescript
// TODO: 考虑将失败的计费数据写入死信队列供人工处理
```

**影响**: 计费数据丢失风险，影响收入准确性

**建议修复**:
1. 创建 billing-dlx 死信队列
2. 失败的计费数据写入 DLX
3. 创建管理界面查看和重试失败的计费记录
4. 添加计费数据一致性检查

**预计时间**: 2-3 小时

**影响范围**: Billing Data Reliability

---

### Priority 2: 中优先级 (完善功能)

#### 4. 云服务 Provider Mock 替换 (15 items)

**文件**:
- `backend/device-service/src/providers/huawei/huawei-cph.client.ts` (8 TODOs)
- `backend/device-service/src/providers/aliyun/aliyun-ecp.client.ts` (7 TODOs)

**问题**:
- 华为云 CPH 客户端完全是 Mock 实现
- 阿里云 ECP 客户端完全是 Mock 实现

**影响**: 无法实际使用云厂商的云手机服务

**建议修复** (分阶段):

**Phase 1: 华为云集成** (如果需要)
1. 引入华为云 SDK: `@huaweicloud/huaweicloud-sdk-cph`
2. 实现真实的 API 调用:
   - createInstance
   - deleteInstance
   - startInstance
   - stopInstance
   - restartInstance
   - getInstanceStatus
   - listInstances
   - getWebRTCTicket

**Phase 2: 阿里云集成** (如果需要)
1. 引入阿里云 SDK: `@alicloud/ecp-sdk`
2. 实现真实的 API 调用:
   - createInstance
   - deleteInstance
   - startInstance
   - stopInstance
   - restartInstance
   - rebootInstance
   - getInstanceStatus
   - listInstances

**预计时间**:
- 每个云厂商 1-2 天（包括 SDK 学习和测试）
- 总计: 2-4 天

**决策点**:
- ⚠️ 需要确认是否实际使用这些云服务
- ⚠️ 需要云服务账号和凭证
- ⚠️ 如果不使用，建议删除这些 Mock 代码

**影响范围**: Multi-cloud Device Provider Support

---

### Priority 3: 低优先级 (测试改进)

#### 5. AuthService 测试改进 (1 item)

**文件**: `backend/user-service/src/auth/auth.service.spec.ts`

**问题**:
```typescript
// TODO: bcrypt.compare mock问题 - 详见 AUTH_SERVICE_TEST_BCRYPT_ISSUE.md
```

**影响**: 1 个测试失败（测试数据问题）

**建议修复**:
1. 更新 mock permission code 为实际值
2. 修复 JWT payload 权限验证测试
3. 达到 100% 测试通过率

**预计时间**: 15-30 分钟

**影响范围**: Test Coverage

---

## 🗓️ 建议的实施计划

### Phase 1: 关键功能完善 (1-2 天)

**目标**: 修复影响用户体验的核心功能

1. **Day 1 上午**: Frontend Device API 集成
   - ✅ Socket.IO 集成
   - ✅ 启动/停止设备 API
   - ✅ 删除设备 API

2. **Day 1 下午**: Notification Service 改进
   - ✅ 统一枚举
   - ✅ UserServiceClient 实现
   - ✅ Admin 用户获取

3. **Day 2**: 计费死信队列
   - ✅ DLX 队列设置
   - ✅ 失败数据写入逻辑
   - ✅ 管理界面（可选）

---

### Phase 2: 云服务集成评估 (决策阶段)

**决策问题**:
1. 是否需要华为云 CPH 支持？
2. 是否需要阿里云 ECP 支持？
3. 目前是否只使用 Redroid？

**决策结果**:

**选项 A**: 需要多云支持
- 按计划集成华为云和阿里云 SDK
- 预计 2-4 天开发时间
- 需要云服务账号和测试环境

**选项 B**: 仅使用 Redroid
- 删除华为云和阿里云 Mock 代码
- 简化代码库，减少维护负担
- 预计 1 小时清理时间

**选项 C**: 保持现状
- 保留 Mock 实现作为接口示例
- 等待实际需求再集成
- 无额外工作

**建议**: 选项 B 或 C，除非有明确的多云需求

---

### Phase 3: 测试完善 (选择性)

**目标**: 达到 100% 测试覆盖

1. 修复 AuthService 测试数据问题
2. 添加 createMockEventBus 到 shared/testing
3. 补充集成测试

**预计时间**: 2-3 小时

---

## 📊 优先级矩阵

```
高影响 │ P1: Frontend Device API     │ P1: Billing DLX
      │ P1: Notification Service    │
────────┼──────────────────────────────┼─────────────────
      │ P2: 云服务集成决策           │ P3: Test 改进
低影响 │                              │
      └──────────────────────────────┴─────────────────
         快速实施 (< 1天)              长期实施 (> 1天)
```

---

## ✅ 快速修复清单 (< 1 天)

**可以立即开始的改进** (按优先级排序):

1. ✅ **Frontend Device API 集成** (2-3 小时)
   - 影响: 高 - 用户功能
   - 难度: 中
   - 价值: 高

2. ✅ **Notification Service 改进** (1-2 小时)
   - 影响: 高 - 管理员通知
   - 难度: 低
   - 价值: 高

3. ✅ **计费死信队列** (2-3 小时)
   - 影响: 高 - 数据可靠性
   - 难度: 中
   - 价值: 高

4. ✅ **AuthService 测试修复** (15-30 分钟)
   - 影响: 低 - 测试覆盖
   - 难度: 低
   - 价值: 中

**总计**: 6-9 小时可以完成所有 P1 和 P3 项

---

## 🚀 建议的执行顺序

### 立即开始 (今天)

1. **Notification Service 改进** (1-2 小时)
   - 最快见效
   - 影响关键功能
   - 代码改动小

2. **AuthService 测试修复** (15-30 分钟)
   - 快速胜利
   - 提升测试覆盖
   - 独立任务

### 短期计划 (1-2 天内)

3. **Frontend Device API 集成** (2-3 小时)
   - 完善用户体验
   - 前端功能完整性

4. **计费死信队列** (2-3 小时)
   - 数据可靠性保障
   - 财务准确性

### 中期规划 (评估后决定)

5. **云服务 Provider 决策**
   - 评估实际需求
   - 决定是保留、实现还是删除
   - 根据决策执行

---

## 📚 相关文档

### 已创建的文档
- ✅ DEVICE_SERVICE_STRICT_MODE_COMPLETE.md
- ✅ SESSION_FINAL_SUMMARY_2025-10-30.md
- ✅ TEST_FIXES_AUTH_SERVICE_COMPLETE.md

### 需要创建的文档
- 📝 FRONTEND_DEVICE_API_INTEGRATION.md
- 📝 NOTIFICATION_SERVICE_IMPROVEMENTS.md
- 📝 BILLING_DLX_SETUP.md
- 📝 CLOUD_PROVIDER_DECISION.md

---

## 💡 建议

### 技术债务管理

1. **定期 TODO 审查**: 每月检查代码中的 TODO 注释
2. **优先级评估**: 根据业务影响重新评估优先级
3. **清理策略**: 删除过时的 TODO 或转换为 Issue

### 代码质量

1. **持续集成**: 添加 TODO 扫描到 CI pipeline
2. **文档同步**: TODO 转换为 GitHub Issues 跟踪
3. **团队协作**: TODO 分配给具体开发人员

### 最佳实践

1. **TODO 格式**: 使用统一格式 `// TODO: [Priority] Description`
2. **截止日期**: 添加预期完成时间 `// TODO: By 2025-11-15`
3. **负责人**: 标注负责人 `// TODO: @username`

---

## 🎯 成功指标

### 短期目标 (1 周内)

- ✅ 完成所有 P1 改进项
- ✅ Frontend 设备管理功能完整
- ✅ 通知服务功能完善
- ✅ 计费数据零丢失

### 中期目标 (1 个月内)

- ✅ 云服务 Provider 决策完成
- ✅ 代码库清理完成
- ✅ TODO 数量减少 50%
- ✅ 测试覆盖率提升到 90%+

### 长期目标 (3 个月内)

- ✅ TODO 管理自动化
- ✅ 持续集成检查
- ✅ 文档体系完善
- ✅ 技术债务清零

---

**下一步行动**: 从 Notification Service 改进开始 ✅

**预计完成时间**: 1-2 小时

**执行命令**: 继续下一个任务

---

**创建时间**: 2025-10-30
**最后更新**: 2025-10-30
**状态**: ✅ 计划完成，等待执行
