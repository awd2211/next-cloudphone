# 测试覆盖率提升行动计划

**创建日期**: 2025-10-30
**目标**: 从 30.4% 提升至 60%+
**预计总时长**: 20-30 小时

---

## 📊 现状分析

### 当前覆盖率
- **文件覆盖率**: 30.4% (41/135 测试文件)
- **测试数量覆盖率**: 93.2% (247/265 测试)
- **评级**: B (良好)

### 目标
- **文件覆盖率**: 60%+ (81/135 测试文件)
- **测试数量覆盖率**: 98%+ (260/265 测试)
- **评级**: A (优秀)

### 缺口分析
- **需新增测试文件**: ~40 个
- **需新增测试用例**: ~150-200 个
- **涉及服务**: Device, Billing, Notification

---

## 🎯 Phase 8.4 - 立即任务 (1-2 小时)

### Task 8.4.1: 完成 PreferencesService ✓

**文件**: `backend/notification-service/src/notifications/__tests__/preferences.service.spec.ts`

**测试用例** (8-10 个):
1. ✅ `create()` - 创建用户通知偏好
2. ✅ `findByUserId()` - 获取用户偏好
3. ✅ `update()` - 更新偏好设置
4. ✅ `remove()` - 删除偏好
5. ✅ `getDefaultPreferences()` - 验证默认值
6. ✅ `isChannelEnabled()` - 检查通道是否启用
7. ✅ `updateChannel()` - 启用/禁用特定通道
8. ✅ 边界条件测试 (无效 userId)
9. ✅ 错误处理 (数据库错误)
10. ✅ 并发更新测试

**预期结果**:
- Phase 8 完成度: 77.2% → 100%
- 总体测试覆盖率: 93.2% → 95.5%

**命令**:
```bash
cd backend/notification-service
# 创建测试文件
npx jest src/notifications/__tests__/preferences.service.spec.ts
```

---

## 🔧 Phase 9 - Device Service 扩展功能 (8-12 小时)

### 优先级分类

#### P0 - 关键功能 (4-6 小时, 35-45 tests)

##### 9.1: SnapshotsService ⭐⭐⭐⭐⭐
**文件**: `backend/device-service/src/snapshots/__tests__/snapshots.service.spec.ts`
**预计**: 12-15 tests, 1.5 小时

**测试用例**:
1. `createSnapshot()` - 创建设备快照
2. `restoreSnapshot()` - 恢复快照
3. `listSnapshots()` - 列出快照
4. `deleteSnapshot()` - 删除快照
5. `getSnapshotInfo()` - 获取快照信息
6. 快照元数据验证
7. 增量快照支持
8. 快照压缩
9. 并发快照处理
10. 存储空间检查
11. 快照过期清理
12. 错误恢复（损坏快照）
13. 快照完整性验证
14. 快照大小限制
15. 快照命名冲突

**依赖**: Docker API, 文件系统操作

---

##### 9.2: LifecycleService ⭐⭐⭐⭐⭐
**文件**: `backend/device-service/src/lifecycle/__tests__/lifecycle.service.spec.ts`
**预计**: 10-12 tests, 1.5 小时

**测试用例**:
1. `cleanupIdleDevices()` - 清理空闲设备
2. `cleanupErrorDevices()` - 清理错误设备
3. `cleanupStoppedDevices()` - 清理停止设备
4. `handleDeviceExpiration()` - 处理设备过期
5. `sendExpirationWarnings()` - 发送过期警告
6. Cron 调度验证
7. 批量清理操作
8. 清理策略配置
9. 清理前钩子
10. 清理后事件发布
11. 清理失败重试
12. 清理日志记录

**依赖**: DevicesService, EventBus, Cron

---

##### 9.3: MetricsService ⭐⭐⭐⭐
**文件**: `backend/device-service/src/metrics/__tests__/metrics.service.spec.ts`
**预计**: 8-10 tests, 1 小时

**测试用例**:
1. `collectDeviceMetrics()` - 收集设备指标
2. `collectSystemMetrics()` - 收集系统指标
3. `registerMetric()` - 注册新指标
4. `updateCounter()` - 更新计数器
5. `recordHistogram()` - 记录直方图
6. Prometheus 导出格式
7. 指标聚合
8. 指标过期清理
9. 自定义标签
10. 指标查询接口

**依赖**: Prometheus, Docker stats

---

##### 9.4: StateRecoveryService ⭐⭐⭐⭐
**文件**: `backend/device-service/src/state-recovery/__tests__/state-recovery.service.spec.ts`
**预计**: 8-10 tests, 1 小时

**测试用例**:
1. `checkStateConsistency()` - 检查状态一致性
2. `recoverInconsistentState()` - 恢复不一致状态
3. `rollbackState()` - 回滚状态
4. `saveStateCheckpoint()` - 保存状态检查点
5. `restoreFromCheckpoint()` - 从检查点恢复
6. 状态冲突解决
7. 状态历史记录
8. 批量状态修复
9. 状态验证规则
10. 恢复失败处理

**依赖**: DevicesService, Database

---

#### P1 - 重要功能 (3-4 小时, 25-30 tests)

##### 9.5: FailoverService ⭐⭐⭐
**文件**: `backend/device-service/src/failover/__tests__/failover.service.spec.ts`
**预计**: 8-10 tests, 1 小时

**测试用例**:
1. `detectFailure()` - 检测故障
2. `triggerFailover()` - 触发故障转移
3. `selectFailoverNode()` - 选择转移节点
4. `migrateDevice()` - 迁移设备
5. `updateFailoverStatus()` - 更新转移状态
6. 健康检查集成
7. 故障阈值配置
8. 多节点故障处理
9. 故障恢复通知
10. 故障转移日志

**依赖**: NodeManager, DevicesService

---

##### 9.6: AutoscalingService ⭐⭐⭐
**文件**: `backend/device-service/src/lifecycle/__tests__/autoscaling.service.spec.ts`
**预计**: 8-10 tests, 1 小时

**测试用例**:
1. `evaluateScalingNeeds()` - 评估扩缩容需求
2. `scaleUp()` - 扩容
3. `scaleDown()` - 缩容
4. `getResourceUtilization()` - 获取资源利用率
5. 扩缩容策略配置
6. 扩缩容限制
7. 冷却期处理
8. 基于负载的扩缩容
9. 基于时间的扩缩容
10. 扩缩容事件通知

**依赖**: MetricsService, SchedulerService

---

##### 9.7: BackupExpirationService ⭐⭐
**文件**: `backend/device-service/src/lifecycle/__tests__/backup-expiration.service.spec.ts`
**预计**: 6-8 tests, 1 小时

**测试用例**:
1. `cleanupOldBackups()` - 清理过期备份
2. `getExpiredBackups()` - 获取过期备份列表
3. `setRetentionPolicy()` - 设置保留策略
4. 保留策略验证
5. 备份优先级保留
6. 存储空间管理
7. 清理日志记录
8. 清理失败处理

**依赖**: SnapshotsService

---

#### P2 - 辅助功能 (2-3 小时, 15-20 tests)

##### 9.8: ScrcpyService ⭐⭐
**文件**: `backend/device-service/src/scrcpy/__tests__/scrcpy.service.spec.ts`
**预计**: 6-8 tests, 1 小时

**测试用例**:
1. `startScrcpySession()` - 启动 scrcpy 会话
2. `stopScrcpySession()` - 停止会话
3. `getSessionInfo()` - 获取会话信息
4. 端口转发配置
5. 视频编码参数
6. 会话超时处理
7. 并发会话管理
8. 会话清理

**依赖**: AdbService

---

##### 9.9: GPU Manager Service ⭐⭐
**文件**: `backend/device-service/src/gpu/__tests__/gpu-manager.service.spec.ts`
**预计**: 5-7 tests, 45 分钟

**测试用例**:
1. `allocateGPU()` - 分配 GPU 资源
2. `releaseGPU()` - 释放 GPU 资源
3. `getAvailableGPUs()` - 获取可用 GPU 列表
4. GPU 利用率监控
5. GPU 资源池管理
6. 多 GPU 支持
7. GPU 故障检测

**依赖**: Docker GPU runtime

---

##### 9.10: 其他辅助服务
**预计**: 5-8 tests, 1 小时

- `CacheService` (2-3 tests)
- `RateLimiterService` (2-3 tests)
- `RetryService` (2-3 tests)
- `BatchOperationsService` (3-4 tests)
- `DeviceStatsCacheService` (2-3 tests)

---

### Device Service Phase 9 总结

| 优先级 | 服务数 | 测试数 | 时长 | 状态 |
|--------|--------|--------|------|------|
| P0 | 4 | 35-45 | 4-6h | 待开始 |
| P1 | 3 | 25-30 | 3-4h | 待开始 |
| P2 | 5 | 15-20 | 2-3h | 待开始 |
| **总计** | **12** | **75-95** | **9-13h** | ⏳ |

**完成后效果**:
- Device Service 文件覆盖率: 11.6% → 40%+
- 总体文件覆盖率: 30.4% → 45%+

---

## 💰 Phase 10 - Billing Service 扩展 (4-6 小时)

### 优先级分类

#### P0 - 核心业务 (2-3 小时, 25-30 tests)

##### 10.1: PaymentsService ⭐⭐⭐⭐⭐
**文件**: `backend/billing-service/src/payments/__tests__/payments.service.spec.ts`
**预计**: 12-15 tests, 1.5 小时

**测试用例**:
1. `createPayment()` - 创建支付
2. `processPayment()` - 处理支付
3. `refundPayment()` - 退款
4. `getPaymentStatus()` - 获取支付状态
5. 支付网关集成
6. 支付回调处理
7. 支付重试机制
8. 支付超时处理
9. 支付安全验证
10. 多货币支付
11. 支付方式管理
12. 支付记录查询
13. 支付失败通知
14. 支付对账
15. 支付幂等性

---

##### 10.2: InvoicesService ⭐⭐⭐⭐
**文件**: `backend/billing-service/src/invoices/__tests__/invoices.service.spec.ts`
**预计**: 10-12 tests, 1.5 小时

**测试用例**:
1. `generateInvoice()` - 生成发票
2. `getInvoice()` - 获取发票
3. `listInvoices()` - 列出发票
4. `sendInvoice()` - 发送发票
5. 发票模板渲染
6. 发票编号生成
7. 发票明细汇总
8. 税费计算
9. 发票状态管理
10. 发票作废
11. 发票导出 (PDF)
12. 发票归档

---

#### P1 - 重要功能 (2-3 小时, 20-25 tests)

##### 10.3: BillingService ⭐⭐⭐⭐
**文件**: `backend/billing-service/src/billing/__tests__/billing.service.spec.ts`
**预计**: 10-12 tests, 1.5 小时

**测试用例**:
1. `calculateBill()` - 计算账单
2. `getBillingHistory()` - 获取账单历史
3. `getBillingPreview()` - 预览账单
4. 计费周期管理
5. 计费规则应用
6. 使用量聚合
7. 折扣应用
8. 优惠券验证
9. 账单明细生成
10. 账单通知
11. 账单争议处理
12. 账单导出

---

##### 10.4: MeteringService ⭐⭐⭐
**文件**: `backend/billing-service/src/metering/__tests__/metering.service.spec.ts`
**预计**: 8-10 tests, 1 小时

**测试用例**:
1. `recordUsage()` - 记录使用量
2. `getUsageReport()` - 获取使用报告
3. `aggregateUsage()` - 聚合使用量
4. 使用量验证
5. 使用量限制检查
6. 实时使用量查询
7. 使用量统计分析
8. 使用量导出
9. 使用量告警
10. 使用量数据清理

---

##### 10.5: BillingRulesService ⭐⭐⭐
**文件**: `backend/billing-service/src/billing-rules/__tests__/billing-rules.service.spec.ts`
**预计**: 6-8 tests, 1 小时

**测试用例**:
1. `createRule()` - 创建计费规则
2. `updateRule()` - 更新规则
3. `deleteRule()` - 删除规则
4. `evaluateRule()` - 评估规则
5. 规则优先级
6. 规则冲突检测
7. 规则生效期管理
8. 规则审计日志

---

#### P2 - 辅助功能 (1-2 小时, 10-15 tests)

##### 10.6: 其他服务
**预计**: 10-15 tests, 1-2 小时

- `ReportsService` (3-5 tests) - 报表生成
- `StatsService` (3-5 tests) - 统计分析
- `CurrencyService` (2-3 tests) - 货币转换
- `PaymentsAdminService` (3-5 tests) - 管理端支付

---

### Billing Service Phase 10 总结

| 优先级 | 服务数 | 测试数 | 时长 | 状态 |
|--------|--------|--------|------|------|
| P0 | 2 | 25-30 | 2-3h | 待开始 |
| P1 | 3 | 25-30 | 2-3h | 待开始 |
| P2 | 4 | 10-15 | 1-2h | 待开始 |
| **总计** | **9** | **60-75** | **5-8h** | ⏳ |

**完成后效果**:
- Billing Service 文件覆盖率: 12.5% → 50%+
- 总体文件覆盖率: 45% → 55%+

---

## 🎯 总体时间线

### 快速路径 (达到 60% 覆盖率)

| Phase | 任务 | 测试数 | 时长 | 累计覆盖率 |
|-------|------|--------|------|------------|
| 8.4 | PreferencesService | 8-10 | 1h | 31% |
| 9 (P0) | Device Service 关键功能 | 35-45 | 4-6h | 42% |
| 10 (P0) | Billing Service 核心 | 25-30 | 2-3h | 50% |
| 9 (P1) | Device Service 重要功能 | 25-30 | 3-4h | 58% |
| 10 (P1) | Billing Service 重要功能 | 20-25 | 2-3h | **65%** ✅ |
| **总计** | | **113-140** | **12-17h** | **65%** |

### 完整路径 (达到 75%+ 覆盖率)

继续完成 P2 辅助功能:
- Phase 9 (P2): Device Service 辅助功能 (2-3h)
- Phase 10 (P2): Billing Service 辅助功能 (1-2h)
- 其他服务补充测试 (2-3h)

**总时长**: 17-25 小时
**最终覆盖率**: 75%+

---

## 📋 执行建议

### 方案 A: 聚焦核心 (推荐)
**目标**: 达到 60% 覆盖率
**时长**: 12-17 小时
**策略**: 只完成 P0 和部分 P1 测试

**优点**:
- ✅ 时间可控
- ✅ 覆盖核心业务
- ✅ 快速达标

**适用于**:
- 时间紧迫的项目
- 需要快速上线
- 已有基本测试保障

---

### 方案 B: 全面覆盖
**目标**: 达到 75%+ 覆盖率
**时长**: 20-30 小时
**策略**: 完成所有 P0, P1, P2 测试

**优点**:
- ✅ 测试覆盖全面
- ✅ 长期维护性好
- ✅ 质量保障充分

**适用于**:
- 对质量要求高的项目
- 长期维护的产品
- 有充足时间的团队

---

### 方案 C: 分阶段执行 (最推荐) ⭐
**目标**: 分 3 个 Sprint 完成
**总时长**: 20-25 小时

**Sprint 1** (Week 1): Phase 8.4 + Phase 9 (P0)
- 任务: PreferencesService + Device Service 关键功能
- 测试数: 43-55
- 时长: 5-7 小时
- 覆盖率: 30% → 42%

**Sprint 2** (Week 2): Phase 10 (P0+P1) + Phase 9 (P1)
- 任务: Billing Service 核心 + Device Service 重要功能
- 测试数: 70-85
- 时长: 7-10 小时
- 覆盖率: 42% → 60%

**Sprint 3** (Week 3): Phase 9+10 (P2) + 补充测试
- 任务: 辅助功能 + 其他服务
- 测试数: 30-40
- 时长: 5-8 小时
- 覆盖率: 60% → 75%+

**优点**:
- ✅ 分阶段交付
- ✅ 持续改进
- ✅ 风险可控
- ✅ 团队节奏稳定

---

## 📊 预期成果

### 完成 Phase 8.4 后
- 文件覆盖率: 30.4% → 31.1%
- 测试覆盖率: 93.2% → 95.5%
- 评级: B → B+

### 完成 Phase 9+10 (P0) 后
- 文件覆盖率: 31.1% → 50%
- 测试覆盖率: 95.5% → 97%
- 评级: B+ → A-

### 完成 Phase 9+10 (P0+P1) 后
- 文件覆盖率: 50% → 65%
- 测试覆盖率: 97% → 98%
- 评级: A- → A

### 完成全部任务后
- 文件覆盖率: 65% → 75%+
- 测试覆盖率: 98% → 99%+
- 评级: A → A+

---

## 🛠️ 实施工具和模板

### 测试模板生成脚本
```bash
# 创建测试模板
./scripts/generate-test-template.sh <service-name> <test-type>

# 示例
./scripts/generate-test-template.sh SnapshotsService unit
```

### 批量运行测试
```bash
# 运行 Device Service 所有测试
cd backend/device-service && npm test

# 运行 Billing Service 所有测试
cd backend/billing-service && npm test

# 运行所有新增测试
pnpm test -- --testPathPattern="__(tests|specs)__"
```

### 覆盖率报告
```bash
# 生成覆盖率报告
pnpm test -- --coverage

# 查看 HTML 报告
open coverage/lcov-report/index.html
```

---

## 📚 参考资料

### 已完成的测试示例
- `backend/user-service/src/auth/auth.service.spec.ts` (36 tests)
- `backend/device-service/src/devices/__tests__/devices.service.spec.ts` (22 tests)
- `backend/app-service/src/apps/__tests__/apps.service.spec.ts` (27 tests)
- `backend/notification-service/src/templates/__tests__/templates.service.spec.ts` (29 tests)

### 测试最佳实践
1. **AAA 模式**: Arrange, Act, Assert
2. **Mock 隔离**: 使用 Mock 隔离外部依赖
3. **边界测试**: 测试边界条件和极端情况
4. **错误路径**: 测试错误处理和异常情况
5. **集成测试**: 测试服务间集成点
6. **安全测试**: 包含安全相关测试用例

### 相关文档
- `TESTING_PROGRESS_TRACKER.md` - 测试进度追踪
- `TEST_COVERAGE_COMPREHENSIVE_REPORT.md` - 综合覆盖率报告
- `PHASE*.md` - 各阶段完成报告

---

## ✅ 下一步行动

### 立即开始
```bash
# 1. 创建 PreferencesService 测试
cd backend/notification-service
vim src/notifications/__tests__/preferences.service.spec.ts

# 2. 运行测试验证
npx jest src/notifications/__tests__/preferences.service.spec.ts

# 3. 更新进度追踪器
vim TESTING_PROGRESS_TRACKER.md
```

### 需要的决策
- [ ] 选择执行方案 (A/B/C)
- [ ] 确定时间表
- [ ] 分配资源
- [ ] 设置里程碑

---

**文档维护**: Claude Code
**最后更新**: 2025-10-30
**版本**: v1.0
