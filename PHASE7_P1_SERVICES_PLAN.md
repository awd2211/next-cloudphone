# Phase 7: P1 服务测试计划

**日期**: 2025-10-30
**Phase**: Phase 7 - P1 Services Testing
**前置**: Phase 6 已 100% 完成 (98/98 P0 测试通过)
**预估时间**: 3-5 小时
**目标**: P1 服务测试覆盖

---

## 执行摘要

Phase 6 已达成 100% P0 测试覆盖（超额完成）。Phase 7 将继续测试 P1 (HIGH 优先级) 服务，重点关注业务功能服务：AppsService 和 BillingService。

---

## P1 服务列表

### 1. ✅ BillingService - 已完成

**服务**: `backend/billing-service`
**功能**: 计费管理（余额、订单、套餐）
**当前状态**: ✅ **61/61 测试通过 (100%)**

**已测试模块**:
- ✅ pricing-engine.service.spec.ts - 定价引擎
- ✅ balance.service.spec.ts - 余额管理
- ✅ purchase-plan-v2.saga.spec.ts - 套餐购买 Saga

**评估**: BillingService 已有完整测试覆盖，无需额外工作。

---

### 2. ⚠️ AppsService - 需要测试

**服务**: `backend/app-service`
**功能**: 应用管理（APK 上传、安装、卸载）
**当前状态**: ⚠️ **0 测试**

**测试文件**: `/backend/app-service/src/apps/__tests__/apps.service.spec.ts`

**需要测试的功能**:
1. **APK 上传** (MinIO 集成)
   - 文件上传到 MinIO
   - 元数据提取（包名、版本号）
   - 数据库记录创建
   - 事件发布

2. **APK 下载**
   - 从 MinIO 获取文件
   - 生成临时下载链接
   - 权限验证

3. **应用列表查询**
   - 分页查询
   - 多租户过滤
   - 应用状态筛选

4. **应用安装** (ADB 集成)
   - ADB 连接验证
   - APK 推送到设备
   - 安装命令执行
   - 安装状态更新

5. **应用卸载**
   - ADB 卸载命令
   - 状态更新
   - 事件发布

6. **应用版本管理**
   - 版本检查
   - 版本更新
   - 版本回滚

**预估测试数**: 15-20 个

**优先级**: 🔴 **HIGH** - 应用管理是核心功能

---

## Phase 7 执行计划

### 阶段 1: AppsService 测试 (3-4 小时)

#### 步骤 1: 分析 AppsService 实现
- 阅读 apps.service.ts
- 理解依赖关系（MinIO, ADB, EventBus）
- 识别关键业务逻辑

#### 步骤 2: 设置测试框架
- 创建/更新 apps.service.spec.ts
- Mock 依赖（MinIO client, ADB service, EventBus）
- 设置 beforeEach/afterEach

#### 步骤 3: 编写核心测试
- APK 上传测试 (3-4 tests)
- 应用查询测试 (2-3 tests)
- 应用安装测试 (3-4 tests)
- 应用卸载测试 (2-3 tests)

#### 步骤 4: 编写边界测试
- 错误处理（文件不存在、ADB 失败）
- 权限验证
- 多租户隔离

#### 步骤 5: 验证和文档
- 运行所有测试
- 确保 100% 通过
- 编写测试报告

### 阶段 2: 文档和总结 (30 分钟)

- 创建 AppsService 测试报告
- 更新 Phase 7 完成报告
- 总结测试模式和最佳实践

---

## 成功标准

### Phase 7 完成标准

| 标准 | 目标 | 当前 | 状态 |
|------|------|------|------|
| P1 服务测试覆盖 | 100% | BillingService 100%, AppsService 0% | ⚠️ 进行中 |
| AppsService 测试数 | 15-20 个 | 0 | 📝 待完成 |
| 测试通过率 | 100% | - | 📝 待验证 |

### 质量标准

- ✅ 所有核心业务逻辑有测试
- ✅ Mock 所有外部依赖（MinIO, ADB）
- ✅ 验证事件发布
- ✅ 测试错误处理
- ✅ 验证多租户隔离

---

## 技术挑战预估

### 1. MinIO Mock
**挑战**: MinIO 客户端集成
**解决方案**: Mock putObject, getObject, presignedGetObject

### 2. ADB Service Mock
**挑战**: ADB 命令执行
**解决方案**: Mock AdbService.installApp, AdbService.uninstallApp

### 3. 文件上传模拟
**挑战**: 模拟 Express 文件上传
**解决方案**: 创建 mock file buffer

### 4. 异步操作
**挑战**: APK 安装是异步的
**解决方案**: 使用 Promise mock, async/await

---

## 依赖服务

### AppsService 依赖

1. **MinIO Client** - 对象存储
   - putObject(): 上传文件
   - getObject(): 下载文件
   - presignedGetObject(): 生成下载链接

2. **ADB Service** - Android 设备管理
   - installApp(): 安装应用
   - uninstallApp(): 卸载应用
   - executeShellCommand(): 执行 shell 命令

3. **EventBus Service** - 事件发布
   - publishAppEvent(): 发布应用事件

4. **Repository** - 数据库访问
   - save(), find(), findOne(), update(), delete()

---

## 测试模式参考

### Saga 模式测试 (参考 DevicesService)
```typescript
it('should successfully install app using Saga', async () => {
  const sagaId = 'saga-123';
  mockSagaOrchestrator.executeSaga.mockResolvedValue(sagaId);

  const result = await service.installApp(dto);

  expect(result.sagaId).toBe(sagaId);
  expect(mockSagaOrchestrator.executeSaga).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'APP_INSTALLATION',
      steps: expect.arrayContaining([...]),
    }),
    expect.any(Object),
  );
});
```

### Event Outbox 模式测试 (参考 DevicesService)
```typescript
it('should publish event via outbox', async () => {
  await service.uploadApp(file);

  expect(mockEventOutboxService.writeEvent).toHaveBeenCalledWith(
    expect.any(Object), // QueryRunner
    'app',
    'app-123',
    'app.uploaded',
    expect.objectContaining({...}),
  );
});
```

### 文件上传测试
```typescript
it('should upload APK to MinIO', async () => {
  const mockFile = {
    buffer: Buffer.from('fake apk content'),
    originalname: 'test.apk',
    mimetype: 'application/vnd.android.package-archive',
  };

  mockMinioClient.putObject.mockResolvedValue({etag: 'abc123'});

  const result = await service.uploadApk(mockFile);

  expect(mockMinioClient.putObject).toHaveBeenCalledWith(
    'apps',
    expect.stringContaining('.apk'),
    mockFile.buffer,
    expect.any(Object),
  );
});
```

---

## 风险评估

### 高风险
- ❌ **无测试覆盖**: AppsService 完全无测试
- ⚠️ **生产风险**: 应用安装/卸载是关键功能，无测试验证

### 中风险
- ⚠️ **集成复杂**: MinIO + ADB 双重依赖
- ⚠️ **异步操作**: 安装过程可能较长

### 低风险
- ✅ BillingService 已有完整测试
- ✅ 可参考 DevicesService 的测试模式

---

## 时间估算

| 任务 | 预估时间 | 优先级 |
|------|---------|--------|
| 分析 AppsService 实现 | 30 分钟 | P0 |
| 设置测试框架 | 30 分钟 | P0 |
| 编写 APK 上传测试 | 45 分钟 | P0 |
| 编写应用查询测试 | 30 分钟 | P1 |
| 编写应用安装测试 | 1 小时 | P0 |
| 编写应用卸载测试 | 30 分钟 | P0 |
| 边界和错误测试 | 45 分钟 | P1 |
| 文档和总结 | 30 分钟 | P1 |
| **总计** | **4-5 小时** | |

---

## 输出文档

Phase 7 预计产出:

1. **apps.service.spec.ts** - 15-20 个测试
2. **APPSSERVICE_TESTS_REPORT.md** - 测试报告
3. **PHASE7_COMPLETION_REPORT.md** - Phase 7 完成报告

---

## 下一步行动

### 立即开始 (Phase 7.1)
1. ✅ 创建 Phase 7 计划文档 (本文档)
2. 📝 分析 AppsService 实现
3. 📝 创建测试框架
4. 📝 编写核心测试

### Phase 7 完成后
- Phase 8: P2 服务测试 (NotificationsService, QuotasService)
- 集成测试
- 性能测试
- 端到端测试

---

**Phase 7 开始时间**: 2025-10-30
**预计完成时间**: 2025-10-30 (当天)
**前置条件**: ✅ Phase 6 完成 (100% P0 覆盖)
**目标**: AppsService 15-20 个测试，100% 通过率
