# Issue #2 修复设计方案 - Device 创建资源泄漏

## 📋 问题概述

**Issue编号**: #2
**问题标题**: Device 创建资源泄漏
**设计日期**: 2025-10-30
**修复状态**: 🔄 设计完成，待实现
**预计时间**: 6-8 小时

---

## 🔍 问题分析

### 问题现象

在设备创建流程中，Docker 容器、端口、数据库记录可能不同步，导致以下资源泄漏问题：
1. **孤儿容器**: Docker 容器创建成功但数据库记录失败 → 容器永久运行，占用 CPU/内存/存储
2. **孤儿端口**: 端口已分配但容器创建失败 → 端口被占用但无法使用
3. **无效记录**: 数据库记录成功但容器创建失败 → 用户无法使用设备
4. **配额不一致**: 配额已扣减但设备创建失败 → 用户配额浪费

### 根本原因

原代码（`devices.service.ts` 第 62-215 行）存在以下问题：

```typescript
// 修复前的代码（有问题）
async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
  // 步骤 1: 分配端口
  let ports = await this.portManager.allocatePorts();  // ⚠️ 端口已分配

  try {
    // 步骤 2: 调用 Provider 创建设备（Docker/云厂商）
    const providerDevice = await provider.create(providerConfig);  // ⚠️ 外部调用

    // 步骤 3: 创建数据库记录
    const savedDevice = await this.devicesRepository.save(device);  // ⚠️ 数据库写入

    // 步骤 4: 上报用量到配额系统
    await this.quotaClient.reportDeviceUsage(...);  // ⚠️ 外部调用

    // 步骤 5: 异步启动设备
    this.startDeviceAsync(savedDevice, provider).catch(...);

    return savedDevice;
  } catch (error) {
    // ❌ 只释放端口，不清理 Docker 容器和数据库记录
    if (ports) {
      this.portManager.releasePorts(ports);
    }
    throw error;
  }
}
```

**关键问题**:

1. **事务隔离不足**:
   - 端口分配（步骤 1）、Docker 容器创建（步骤 2）、数据库保存（步骤 3）不在同一事务中
   - 任何一步失败都无法保证其他步骤的一致性

2. **外部资源操作风险**:
   - Docker 容器创建可能失败（资源不足、镜像拉取失败、配置错误）
   - Docker 容器创建成功但后续数据库操作失败 → 孤儿容器
   - 端口分配成功但容器创建失败 → 孤儿端口

3. **补偿逻辑不完善**:
   - catch 块只释放端口，不清理 Docker 容器
   - 如果服务在步骤 3 和 4 之间崩溃，Docker 容器和数据库记录都存在但配额未扣减
   - 异步启动设备的错误处理不完善

4. **缺乏崩溃恢复机制**:
   - 服务重启后无法知道哪些创建操作处于中间状态
   - 无法自动重试或清理未完成的创建

### 影响范围

- **资源浪费**: 孤儿容器永久占用 CPU/内存/存储
- **端口耗尽**: 孤儿端口导致无法创建新设备
- **用户体验**: 无效记录导致用户无法使用设备
- **配额混乱**: 配额扣减和实际资源使用不一致
- **运维成本**: 需要人工清理孤儿容器和无效记录

---

## ✅ 解决方案设计

### 设计思路

使用 **Saga 分布式事务编排模式** 来管理设备创建流程，将创建拆分为多个步骤，每个步骤都有明确的补偿逻辑（Compensation）。

### Saga 模式核心特性

1. **步骤追踪**: 每个步骤执行后持久化状态到 `saga_state` 表
2. **自动重试**: 步骤失败后自动重试（最多 3 次，指数退避）
3. **补偿机制**: 步骤失败后反向执行补偿逻辑（Compensate）
4. **超时检测**: 10 分钟超时保护（考虑镜像拉取时间）
5. **崩溃恢复**: 服务重启后可从 `saga_state` 表恢复未完成的 Saga

### Saga 步骤设计

设备创建流程被拆分为 5 个步骤：

```
┌─────────────────────────────────────────────────────────────┐
│                   Device Creation Saga Flow                  │
└─────────────────────────────────────────────────────────────┘

步骤 1: ALLOCATE_PORTS
  ├─ Execute: 分配 ADB 端口和 WebRTC 端口
  └─ Compensate: 释放端口

步骤 2: CREATE_PROVIDER_DEVICE
  ├─ Execute: 调用 Provider 创建设备（Docker 容器/云实例）
  └─ Compensate: 调用 Provider 删除设备

步骤 3: CREATE_DATABASE_RECORD
  ├─ Execute: 创建 Device 数据库记录，状态 = CREATING（数据库事务）
  └─ Compensate: 删除 Device 数据库记录（数据库事务）

步骤 4: REPORT_QUOTA_USAGE
  ├─ Execute: 上报配额使用到 user-service
  └─ Compensate: 回滚配额使用

步骤 5: START_DEVICE
  ├─ Execute: 启动设备并初始化（ADB 连接、Android 启动）
  └─ Compensate: 停止设备

每个步骤失败 → 自动重试（最多 3 次）→ 仍失败 → 触发补偿逻辑
```

### 关键技术点

1. **数据库事务隔离**: 每个步骤的数据库操作都在独立的 QueryRunner 事务中
2. **状态持久化**: Saga 状态存储在 `saga_state` 表，支持崩溃恢复
3. **异步执行**: Saga 执行不阻塞 API 响应（立即返回 `sagaId`）
4. **指数退避重试**: 重试间隔为 1s、2s、4s（`2^attempt * 1000ms`）
5. **补偿顺序**: 反向执行已完成的步骤（从失败步骤向前回滚）
6. **多 Provider 支持**: 适用于 Redroid、物理设备、华为云、阿里云等多种 Provider

---

## 🛠️ 实现方案

### 文件修改列表

1. **backend/device-service/src/app.module.ts** (+1 行)
   - 导入 `SagaModule` ✅ 已完成

2. **backend/device-service/src/devices/devices.service.ts** (+400 行, -150 行)
   - 导入 Saga 相关类型 ✅ 已完成
   - 注入 `SagaOrchestratorService` 和 `DataSource` ✅ 已完成
   - 完全重写 `create()` 方法 ⏳ 待实现

### Saga 实现伪代码

```typescript
/**
 * 创建设备 (使用 Saga 模式防止资源泄漏)
 */
async create(createDeviceDto: CreateDeviceDto): Promise<{ sagaId: string; device: Device }> {
  // 1. 确定 Provider 类型
  const providerType = createDeviceDto.providerType || DeviceProviderType.REDROID;
  const provider = this.providerFactory.getProvider(providerType);

  // 2. 定义创建 Saga
  const createSaga: SagaDefinition = {
    type: SagaType.DEVICE_CREATION,
    timeoutMs: 600000, // 10 分钟超时
    maxRetries: 3,
    steps: [
      // 步骤 1: 分配端口（仅 Redroid）
      {
        name: 'ALLOCATE_PORTS',
        execute: async (state: any) => {
          if (providerType !== DeviceProviderType.REDROID) {
            return { portsAllocated: false };
          }

          const ports = await this.portManager.allocatePorts();
          this.logger.log(`Allocated ports: ADB=${ports.adbPort}, WebRTC=${ports.webrtcPort}`);

          return {
            portsAllocated: true,
            adbPort: ports.adbPort,
            webrtcPort: ports.webrtcPort,
          };
        },
        compensate: async (state: any) => {
          if (state.portsAllocated) {
            await this.portManager.releasePorts({
              adbPort: state.adbPort,
              webrtcPort: state.webrtcPort,
            });
            this.logger.log(`Ports released`);
          }
        },
      } as SagaStep,

      // 步骤 2: 创建 Provider 设备（Docker/云厂商）
      {
        name: 'CREATE_PROVIDER_DEVICE',
        execute: async (state: any) => {
          const providerConfig: DeviceCreateConfig = {
            name: `cloudphone-${createDeviceDto.name}`,
            userId: createDeviceDto.userId,
            cpuCores: createDeviceDto.cpuCores || 2,
            memoryMB: createDeviceDto.memoryMB || 4096,
            storageMB: createDeviceDto.storageMB || 10240,
            resolution: createDeviceDto.resolution || "1920x1080",
            dpi: createDeviceDto.dpi || 240,
            androidVersion: createDeviceDto.androidVersion || "11",
            deviceType: createDeviceDto.type === "tablet" ? "tablet" : "phone",
            adbPort: state.adbPort,
            enableGpu: this.configService.get("REDROID_ENABLE_GPU", "false") === "true",
            enableAudio: this.configService.get("REDROID_ENABLE_AUDIO", "false") === "true",
            providerSpecificConfig: createDeviceDto.providerSpecificConfig,
          };

          const providerDevice = await provider.create(providerConfig);
          this.logger.log(`Provider device created: ${providerDevice.id}`);

          return {
            externalId: providerDevice.id,
            containerName: providerDevice.name,
            connectionInfo: providerDevice.connectionInfo,
            providerConfig: providerDevice.providerConfig,
            providerStatus: providerDevice.status,
          };
        },
        compensate: async (state: any) => {
          if (state.externalId) {
            try {
              await provider.destroy(state.externalId);
              this.logger.log(`Provider device deleted: ${state.externalId}`);
            } catch (error) {
              this.logger.error(`Failed to delete provider device: ${error.message}`);
            }
          }
        },
      } as SagaStep,

      // 步骤 3: 创建数据库记录
      {
        name: 'CREATE_DATABASE_RECORD',
        execute: async (state: any) => {
          this.logger.log(`Creating database record for provider device ${state.externalId}`);

          const queryRunner = this.dataSource.createQueryRunner();
          await queryRunner.connect();
          await queryRunner.startTransaction();

          try {
            const device = queryRunner.manager.create(Device, {
              ...createDeviceDto,
              providerType,
              externalId: state.externalId,
              connectionInfo: state.connectionInfo,
              providerConfig: state.providerConfig,
              status: DeviceStatus.CREATING, // 🔑 关键: 初始状态为 CREATING
              containerId: providerType === DeviceProviderType.REDROID ? state.externalId : null,
              containerName: providerType === DeviceProviderType.REDROID ? state.containerName : null,
              adbPort: state.connectionInfo?.adb?.port || null,
              adbHost: state.connectionInfo?.adb?.host || null,
              metadata: {
                ...createDeviceDto.metadata,
                webrtcPort: state.webrtcPort,
                createdBy: "system",
              },
            });

            const savedDevice = await queryRunner.manager.save(Device, device);
            await queryRunner.commitTransaction();

            this.logger.log(`Database record created: ${savedDevice.id}`);
            return { deviceId: savedDevice.id };
          } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
          } finally {
            await queryRunner.release();
          }
        },
        compensate: async (state: any) => {
          if (state.deviceId) {
            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            try {
              await queryRunner.manager.delete(Device, { id: state.deviceId });
              await queryRunner.commitTransaction();
              this.logger.log(`Database record deleted: ${state.deviceId}`);
            } catch (error) {
              this.logger.error(`Failed to delete database record: ${error.message}`);
              await queryRunner.rollbackTransaction();
            } finally {
              await queryRunner.release();
            }
          }
        },
      } as SagaStep,

      // 步骤 4: 上报配额使用
      {
        name: 'REPORT_QUOTA_USAGE',
        execute: async (state: any) => {
          if (!this.quotaClient || !createDeviceDto.userId) {
            return { quotaReported: false };
          }

          this.logger.log(`Reporting quota usage for device ${state.deviceId}`);

          await this.quotaClient.reportDeviceUsage(createDeviceDto.userId, {
            deviceId: state.deviceId,
            cpuCores: createDeviceDto.cpuCores || 2,
            memoryGB: (createDeviceDto.memoryMB || 4096) / 1024,
            storageGB: (createDeviceDto.storageMB || 10240) / 1024,
            operation: "increment",
          });

          this.logger.log(`Quota usage reported`);
          return { quotaReported: true };
        },
        compensate: async (state: any) => {
          if (state.quotaReported && this.quotaClient && createDeviceDto.userId) {
            try {
              await this.quotaClient.reportDeviceUsage(createDeviceDto.userId, {
                deviceId: state.deviceId,
                cpuCores: createDeviceDto.cpuCores || 2,
                memoryGB: (createDeviceDto.memoryMB || 4096) / 1024,
                storageGB: (createDeviceDto.storageMB || 10240) / 1024,
                operation: "decrement",
              });
              this.logger.log(`Quota usage rolled back`);
            } catch (error) {
              this.logger.error(`Failed to rollback quota usage: ${error.message}`);
            }
          }
        },
      } as SagaStep,

      // 步骤 5: 启动设备
      {
        name: 'START_DEVICE',
        execute: async (state: any) => {
          this.logger.log(`Starting device ${state.deviceId}`);

          // 调用 Provider 启动设备
          await provider.start(state.externalId);

          // 等待 ADB 连接（仅 Redroid 和物理设备）
          if (state.connectionInfo?.adb) {
            await this.adbService.connectToDevice(
              state.deviceId,
              state.connectionInfo.adb.host,
              state.connectionInfo.adb.port,
            );

            // 等待 Android 启动
            await this.waitForAndroidBoot(state.deviceId, 60);

            // 初始化设备
            await this.initializeDevice(state.deviceId);
          }

          // 更新状态为运行中
          const queryRunner = this.dataSource.createQueryRunner();
          await queryRunner.connect();
          await queryRunner.startTransaction();

          try {
            await queryRunner.manager.update(Device,
              { id: state.deviceId },
              {
                status: DeviceStatus.RUNNING,
                lastActiveAt: new Date(),
              }
            );
            await queryRunner.commitTransaction();
          } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
          } finally {
            await queryRunner.release();
          }

          this.logger.log(`Device ${state.deviceId} started successfully`);
          return { deviceStarted: true };
        },
        compensate: async (state: any) => {
          this.logger.log(`Stopping device ${state.deviceId}`);

          try {
            // 调用 Provider 停止设备
            await provider.stop(state.externalId);
            this.logger.log(`Device ${state.deviceId} stopped`);
          } catch (error) {
            this.logger.error(`Failed to stop device: ${error.message}`);
          }
        },
      } as SagaStep,
    ],
  };

  // 3. 执行 Saga
  const sagaId = await this.sagaOrchestrator.executeSaga(createSaga, {
    userId: createDeviceDto.userId,
    deviceName: createDeviceDto.name,
    providerType,
  });

  this.logger.log(`Device creation saga initiated: ${sagaId}`);

  // 4. 等待数据库记录创建（步骤 3 必须同步完成）
  await new Promise(resolve => setTimeout(resolve, 500)); // 等待 500ms

  const device = await this.devicesRepository.findOne({
    where: { name: createDeviceDto.name, userId: createDeviceDto.userId },
    order: { createdAt: 'DESC' },
  });

  if (!device) {
    throw new InternalServerErrorException('Device record creation failed');
  }

  // 5. 发布设备创建事件
  if (this.eventBus) {
    await this.eventBus.publishDeviceEvent("created", {
      deviceId: device.id,
      userId: device.userId,
      deviceName: device.name,
      status: device.status,
      tenantId: device.tenantId,
      providerType,
    });
  }

  return {
    sagaId,
    device,
  };
}
```

---

## 📊 预期效果

### 修改统计

| 指标 | 预期值 |
|------|--------|
| 修改文件数 | 2 个 |
| 新增代码行数 | +401 行 |
| 删除代码行数 | -150 行 |
| 净增加行数 | +251 行 |
| 修复方法数 | 1 个 (`create`) |
| Saga 步骤数 | 5 个 |
| 编译错误 | 0 个 |

### 性能影响

| 指标 | 修复前 | 修复后 | 变化 |
|------|--------|--------|------|
| API 响应时间 | 30-60s (同步等待) | <1s (异步 Saga) | ⬇️ 95% |
| 数据库写入次数 | 1-2 次 | 6-12 次 (每步骤 1-2 次) | ⬆️ 400% |
| 资源泄漏风险 | 高（无补偿机制） | 零（自动补偿） | ⬇️ 100% |
| Docker 镜像拉取超时 | 2 分钟 | 10 分钟 | ⬆️ 400% |

---

## 🧪 测试场景

### 场景 1: 正常创建流程

```bash
# 1. 创建设备
curl -X POST http://localhost:30002/api/devices \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-device",
    "userId": "user-123",
    "cpuCores": 2,
    "memoryMB": 4096,
    "providerType": "redroid"
  }'

# 预期响应:
{
  "success": true,
  "data": {
    "sagaId": "device_creation-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "device": {
      "id": "...",
      "status": "CREATING",  # 初始状态
      ...
    }
  }
}

# 2. 查询 Saga 状态
SELECT saga_id, saga_type, current_step, step_index, status FROM saga_state
WHERE saga_id = 'device_creation-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

# 预期结果（完成后）:
status = 'COMPLETED'
current_step = 'START_DEVICE'
step_index = 4

# 3. 验证最终状态
SELECT id, status, container_id, adb_port FROM devices WHERE id = '...';

# 预期结果:
devices.status = 'RUNNING'
devices.container_id = '<container-id>'
devices.adb_port = 5555
```

### 场景 2: Docker 创建失败（自动重试 + 补偿）

**模拟**: Docker 镜像不存在或拉取失败

**预期行为**:
1. Saga 步骤 2 (CREATE_PROVIDER_DEVICE) 失败
2. 自动重试 3 次（间隔 1s、2s、4s）
3. 仍失败 → 触发补偿逻辑
4. 反向执行补偿:
   - 补偿步骤 1: 释放端口

**验证**:
```sql
SELECT saga_id, status, error_message, retry_count FROM saga_state WHERE saga_id = '...';

-- 预期结果:
status = 'COMPENSATED'
error_message = 'Docker create failed: ...'
retry_count = 3

-- 验证端口已释放
SELECT * FROM port_allocations WHERE adb_port = 5555;
-- 预期结果: 无记录
```

### 场景 3: 数据库操作失败（自动补偿）

**模拟**: 数据库连接断开

**预期行为**:
- Saga 步骤 3 (CREATE_DATABASE_RECORD) 失败
- 触发补偿逻辑:
  - 补偿步骤 2: 删除 Docker 容器
  - 补偿步骤 1: 释放端口

**验证**:
```bash
# 检查 Docker 容器是否删除
docker ps -a | grep cloudphone-test-device
# 预期结果: 无容器

# 检查数据库记录
SELECT id FROM devices WHERE name = 'test-device';
# 预期结果: 无记录

# 检查 Saga 状态
SELECT status FROM saga_state WHERE saga_id = '...';
# 预期结果: COMPENSATED
```

---

## ✅ 验收标准

- [ ] 代码编译通过（0 个 TypeScript 错误）
- [ ] SagaModule 正确导入到 device-service ✅ 已完成
- [ ] create() 方法返回 `{ sagaId, device }` ⏳ 待实现
- [ ] Saga 包含 5 个步骤，每个步骤都有 execute 和 compensate 方法 ⏳ 待实现
- [ ] 每个数据库操作都在独立的 QueryRunner 事务中 ⏳ 待实现
- [ ] Saga 状态持久化到 saga_state 表 ⏳ 待实现
- [ ] 超时设置为 10 分钟 ⏳ 待实现
- [ ] 最大重试次数为 3 次 ⏳ 待实现
- [ ] 补偿逻辑正确（释放端口、删除容器、清理数据库记录） ⏳ 待实现
- [ ] 日志记录每个步骤的执行和补偿 ⏳ 待实现
- [ ] 支持多 Provider（Redroid、物理设备、云厂商） ⏳ 待实现

---

## 🔮 下一步行动

1. **实现 Saga 步骤** (4-5 小时)
   - 实现 5 个步骤的 execute 和 compensate 方法
   - 处理多 Provider 的差异化逻辑
   - 添加详细的日志记录

2. **测试验证** (1-2 小时)
   - 正常流程测试
   - 故障场景测试（Docker 失败、数据库失败、配额失败）
   - 崩溃恢复测试
   - 多 Provider 测试

3. **文档编写** (1 小时)
   - 创建 Issue #2 完成报告
   - 更新 Phase 5 总结报告

---

## 📚 相关文件

1. **源代码**:
   - `backend/device-service/src/app.module.ts` - SagaModule 导入 ✅
   - `backend/device-service/src/devices/devices.service.ts` - create() 重写 ⏳
   - `backend/shared/src/saga/saga-orchestrator.service.ts` - Saga 编排器
   - `backend/shared/src/saga/saga.module.ts` - Saga 模块定义

2. **实体**:
   - `backend/device-service/src/entities/device.entity.ts` - Device 实体

3. **数据库**:
   - `backend/billing-service/migrations/20251030000000_create_saga_state.sql` - saga_state 表迁移

4. **文档**:
   - 本文档: `事务修复_Issue2_设计方案.md`

---

**报告生成时间**: 2025-10-30
**工程师**: Claude Code (AI Assistant)
**状态**: 设计完成，待实现
