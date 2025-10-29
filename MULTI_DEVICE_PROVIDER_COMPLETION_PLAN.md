# 多设备提供商 - 待完成功能清单

## ✅ 已完成的核心功能

### 基础架构 (100%)
- ✅ Provider 抽象层 (IDeviceProvider 接口，23个方法)
- ✅ DeviceProviderFactory (运行时动态选择)
- ✅ 4种 Provider 实现 (Redroid, Physical, Huawei, Aliyun)
- ✅ 数据库迁移 (Provider 字段、索引)
- ✅ DevicesService 重构 (使用 Provider 抽象)
- ✅ CreateDeviceDto 支持 providerType 和 providerSpecificConfig

### 物理设备支持 (90%)
- ✅ DevicePoolService (Redis 缓存设备池)
- ✅ DeviceDiscoveryService (网络扫描和注册)
- ✅ ShardedPoolService (1000+ 设备分片架构)
- ✅ 5种负载均衡策略
- ✅ 健康评分系统 (9项检查)
- ✅ PhysicalDevicesController (13个管理API)
- ✅ SCRCPY 集成 (高性能投屏)
- ✅ SCRCPY WebSocket Gateway

### 云手机支持 (80%)
- ✅ HuaweiProvider (Mock SDK)
- ✅ AliyunProvider (Mock SDK)
- ✅ WebRTC 连接信息生成
- ✅ 规格自动选择逻辑

---

## ❌ 待完成的关键功能

### 1. 物理设备业务流程 (优先级: P0)

#### 1.1 物理设备分配流程
**当前问题**: PhysicalProvider.create() 目前从设备池分配设备，但缺少完整的业务集成

**需要实现**:
```typescript
// DevicesService 中添加物理设备的特殊处理
async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
  if (providerType === DeviceProviderType.PHYSICAL) {
    // 1. 从设备池分配而不是创建新设备
    // 2. 检查设备健康状态
    // 3. 建立 SCRCPY 会话
    // 4. 初始化 ADB 连接
  }
}
```

**文件位置**:
- `backend/device-service/src/devices/devices.service.ts` (第 48-176 行)

**预计工时**: 2-3 小时

---

#### 1.2 物理设备释放流程
**当前问题**: 删除物理设备时，应该释放回设备池而不是销毁

**需要实现**:
```typescript
async remove(id: string): Promise<void> {
  if (device.providerType === DeviceProviderType.PHYSICAL) {
    // 1. 停止 SCRCPY 会话
    // 2. 释放回设备池 (status: AVAILABLE)
    // 3. 清理设备状态
    // 4. 更新健康评分
  }
}
```

**文件位置**:
- `backend/device-service/src/devices/devices.service.ts` (第 505-587 行)

**预计工时**: 1-2 小时

---

#### 1.3 物理设备健康检查定时任务
**当前问题**: 缺少定期检查物理设备健康状态的任务

**需要实现**:
```typescript
@Cron(CronExpression.EVERY_5_MINUTES)
async checkPhysicalDevicesHealth() {
  // 1. 获取所有 PHYSICAL 类型设备
  // 2. 调用 DevicePoolService.performHealthCheck()
  // 3. 更新数据库 health_score
  // 4. 低于阈值自动下线
}
```

**文件位置**:
- `backend/device-service/src/devices/devices.service.ts` (新增方法)

**预计工时**: 2 小时

---

#### 1.4 SCRCPY 会话自动管理
**当前问题**: SCRCPY 会话创建后没有自动清理机制

**需要实现**:
```typescript
// DevicesService 集成
async start(id: string): Promise<Device> {
  if (device.providerType === DeviceProviderType.PHYSICAL) {
    // 启动 SCRCPY 会话
    const session = await this.scrcpyService.startSession(
      device.id,
      `${device.adbHost}:${device.adbPort}`
    );
    // 更新 connectionInfo
    device.connectionInfo = {
      ...device.connectionInfo,
      scrcpy: {
        sessionId: session.sessionId,
        videoUrl: session.videoUrl,
        audioUrl: session.audioUrl,
        controlUrl: session.controlUrl,
      }
    };
  }
}

async stop(id: string): Promise<Device> {
  if (device.providerType === DeviceProviderType.PHYSICAL) {
    // 停止 SCRCPY 会话
    await this.scrcpyService.stopSession(device.id);
  }
}
```

**文件位置**:
- `backend/device-service/src/devices/devices.service.ts` (第 736-881 行)

**预计工时**: 2-3 小时

---

### 2. 云手机 Token 刷新机制 (优先级: P1)

#### 2.1 阿里云 WebRTC Token 刷新
**当前问题**: 阿里云 Token 30秒过期，需要自动刷新

**需要实现**:
```typescript
// 新服务: TokenRefreshService
@Injectable()
export class TokenRefreshService {
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();

  async scheduleTokenRefresh(deviceId: string, providerType: DeviceProviderType) {
    if (providerType === DeviceProviderType.ALIYUN_ECP) {
      // 每 20 秒刷新一次（Token 30秒有效期）
      const interval = setInterval(async () => {
        await this.refreshAliyunToken(deviceId);
      }, 20000);

      this.refreshIntervals.set(deviceId, interval);
    }
  }

  async refreshAliyunToken(deviceId: string) {
    const device = await this.devicesRepository.findOne({ where: { id: deviceId } });
    const provider = this.providerFactory.getProvider(DeviceProviderType.ALIYUN_ECP);
    const newConnectionInfo = await provider.getConnectionInfo(device.externalId);

    // 更新数据库
    await this.devicesRepository.update(deviceId, {
      connectionInfo: newConnectionInfo
    });

    // 通知前端更新 Token
    await this.eventBus.publishDeviceEvent('token_refreshed', {
      deviceId,
      connectionInfo: newConnectionInfo
    });
  }

  stopTokenRefresh(deviceId: string) {
    const interval = this.refreshIntervals.get(deviceId);
    if (interval) {
      clearInterval(interval);
      this.refreshIntervals.delete(deviceId);
    }
  }
}
```

**文件位置**:
- `backend/device-service/src/devices/token-refresh.service.ts` (新文件)

**预计工时**: 3-4 小时

---

#### 2.2 华为云 Token 刷新
**当前问题**: 华为云 Token 也有有效期，需要刷新机制

**实现方式**: 类似阿里云，但刷新周期可能不同

**预计工时**: 1-2 小时

---

### 3. 设备状态同步 (优先级: P1)

#### 3.1 定期状态同步
**当前问题**: 本地数据库状态可能与 Provider 侧状态不一致

**需要实现**:
```typescript
@Cron(CronExpression.EVERY_MINUTE)
async syncDeviceStates() {
  const devices = await this.devicesRepository.find({
    where: {
      providerType: In([
        DeviceProviderType.HUAWEI_CPH,
        DeviceProviderType.ALIYUN_ECP,
        DeviceProviderType.PHYSICAL
      ]),
      status: Not(DeviceStatus.DELETED)
    }
  });

  for (const device of devices) {
    try {
      const provider = this.providerFactory.getProvider(device.providerType);
      const realStatus = await provider.getStatus(device.externalId);
      const mappedStatus = this.mapProviderStatusToDeviceStatus(realStatus);

      if (mappedStatus !== device.status) {
        this.logger.warn(
          `Device ${device.id} status mismatch: DB=${device.status}, Provider=${mappedStatus}`
        );
        await this.updateDeviceStatus(device.id, mappedStatus);
      }
    } catch (error) {
      this.logger.error(`Failed to sync status for device ${device.id}`, error);
    }
  }
}
```

**文件位置**:
- `backend/device-service/src/devices/devices.service.ts` (新增方法)

**预计工时**: 2-3 小时

---

### 4. 错误处理和重试 (优先级: P2)

#### 4.1 Provider 操作重试装饰器应用
**当前问题**: DevicesService 的 Provider 调用没有使用 @Retry 装饰器

**需要实现**:
```typescript
import { Retry } from '../common/retry.decorator';

@Retry({
  maxAttempts: 3,
  baseDelayMs: 1000,
  retryableErrors: [InternalServerErrorException]
})
async start(id: string): Promise<Device> {
  // ... 现有代码
  await provider.start(device.externalId);
}

@Retry({
  maxAttempts: 3,
  baseDelayMs: 1000,
  retryableErrors: [InternalServerErrorException]
})
async stop(id: string): Promise<Device> {
  // ... 现有代码
  await provider.stop(device.externalId);
}
```

**文件位置**:
- `backend/device-service/src/devices/devices.service.ts`

**预计工时**: 1 小时

---

#### 4.2 云服务 API 限流处理
**当前问题**: 云厂商 API 有调用频率限制，需要处理 429 错误

**需要实现**:
```typescript
// 在 HuaweiCphClient 和 AliyunEcpClient 中添加
private async handleRateLimit(error: any) {
  if (error.statusCode === 429 || error.code === 'Throttling') {
    const retryAfter = error.headers?.['retry-after'] || 5;
    this.logger.warn(`Rate limited, retry after ${retryAfter}s`);
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    // 重试请求
  }
  throw error;
}
```

**文件位置**:
- `backend/device-service/src/providers/huawei/huawei-cph.client.ts`
- `backend/device-service/src/providers/aliyun/aliyun-ecp.client.ts`

**预计工时**: 2 小时

---

### 5. 真实 SDK 集成 (优先级: P2)

#### 5.1 华为云 CPH SDK
**当前状态**: Mock 实现

**需要做的**:
1. 获取华为云账号和 CPH 服务权限
2. 阅读华为 CPH SDK 文档
3. 替换 Mock 实现为真实 SDK 调用
4. 测试完整流程（创建/启动/停止/删除）

**预计工时**: 8-12 小时

---

#### 5.2 阿里云 ECP SDK
**当前状态**: Mock 实现

**需要做的**:
1. 安装 npm 包: `npm install @alicloud/ecp20200814 @alicloud/openapi-client`
2. 替换 Mock 实现
3. 实现 WebRTC Token 获取
4. 测试完整流程

**预计工时**: 8-12 小时

---

### 6. 配额和计费优化 (优先级: P3)

#### 6.1 不同 Provider 的配额策略
**当前问题**: 所有设备类型使用相同的配额限制

**需要实现**:
```typescript
// QuotaGuard 中添加 Provider 类型判断
if (providerType === DeviceProviderType.PHYSICAL) {
  // 物理设备可能有不同的配额限制
  maxDevices = quota.maxPhysicalDevices;
} else if (providerType === DeviceProviderType.HUAWEI_CPH) {
  // 云手机可能按规格有不同配额
  maxDevices = quota.maxCloudPhones;
}
```

**预计工时**: 2-3 小时

---

#### 6.2 云手机的按时计费
**当前问题**: 云手机是按小时计费的，需要精确计算使用时长

**需要实现**:
```typescript
// BillingService 集成
async calculateCloudPhoneCost(device: Device) {
  if (device.providerType === DeviceProviderType.HUAWEI_CPH) {
    const spec = device.providerConfig.specId;
    const hourlyRate = this.getHuaweiSpecHourlyRate(spec);
    const runningHours = this.calculateRunningHours(device);
    return hourlyRate * runningHours;
  }
}
```

**预计工时**: 4-6 小时

---

### 7. 前端集成 (优先级: P3)

#### 7.1 设备创建界面
**需要添加**:
- Provider 类型选择下拉框
- 根据 Provider 动态显示配置项
- 华为云配置：imageId, serverId, region
- 阿里云配置：regionId, zoneId, imageId, chargeType
- 物理设备配置：设备分组选择

**文件位置**:
- `frontend/admin/src/pages/Devices/CreateDeviceModal.tsx`

**预计工时**: 4-6 小时

---

#### 7.2 设备连接界面
**需要实现**:
- 根据 Provider 类型显示不同连接方式
- Redroid: ADB + WebRTC
- Physical: SCRCPY WebSocket
- Huawei/Aliyun: WebRTC + Token 自动刷新

**文件位置**:
- `frontend/user/src/components/DeviceConnector.tsx`

**预计工时**: 6-8 小时

---

#### 7.3 物理设备管理界面
**需要实现**:
- 设备池状态概览
- 网络扫描界面
- 设备注册/下线
- 健康状态可视化
- 分片管理

**文件位置**:
- `frontend/admin/src/pages/PhysicalDevices/` (新增)

**预计工时**: 8-12 小时

---

### 8. 测试和文档 (优先级: P3)

#### 8.1 单元测试
- [ ] Provider 接口测试
- [ ] DevicesService 测试
- [ ] DevicePoolService 测试
- [ ] ShardedPoolService 测试

**预计工时**: 12-16 小时

---

#### 8.2 集成测试
- [ ] 端到端设备创建流程
- [ ] 多 Provider 并发测试
- [ ] 物理设备池压力测试 (1000+ 设备)
- [ ] SCRCPY 性能测试

**预计工时**: 16-24 小时

---

#### 8.3 文档
- [ ] API 使用文档
- [ ] 物理设备接入指南
- [ ] 华为云配置指南
- [ ] 阿里云配置指南
- [ ] 故障排查手册
- [ ] 性能优化指南

**预计工时**: 8-12 小时

---

## 📊 优先级和预估工时总结

| 优先级 | 功能模块 | 预估工时 |
|--------|---------|---------|
| **P0** | 物理设备业务流程 | 8-10 小时 |
| **P1** | Token 刷新机制 | 5-6 小时 |
| **P1** | 设备状态同步 | 2-3 小时 |
| **P2** | 错误处理和重试 | 3 小时 |
| **P2** | 真实 SDK 集成 | 16-24 小时 |
| **P3** | 配额和计费优化 | 6-9 小时 |
| **P3** | 前端集成 | 18-26 小时 |
| **P3** | 测试和文档 | 36-52 小时 |
| **总计** | | **94-133 小时** |

---

## 🎯 建议实施顺序

### 阶段 1: 核心业务完善 (2-3 天)
1. ✅ 物理设备分配/释放流程
2. ✅ SCRCPY 会话管理
3. ✅ 物理设备健康检查定时任务

### 阶段 2: 云手机优化 (1-2 天)
4. ✅ Token 刷新机制
5. ✅ 设备状态同步
6. ✅ 错误处理和重试

### 阶段 3: SDK 集成 (3-5 天)
7. ✅ 华为云 CPH SDK 替换
8. ✅ 阿里云 ECP SDK 替换
9. ✅ 真实环境测试

### 阶段 4: 前端和测试 (5-7 天)
10. ✅ 前端界面集成
11. ✅ 单元测试和集成测试
12. ✅ 文档编写

---

## 💡 快速启动建议

如果要快速验证系统可用性，建议先完成：

1. **物理设备分配流程** (P0) - 2-3 小时
2. **SCRCPY 会话管理** (P0) - 2-3 小时
3. **简单的前端 Provider 选择** (P3) - 2 小时

**最小可用版本预估**: 6-8 小时

---

## 📝 当前可以做的测试

即使业务逻辑未完全实现，现在也可以：

1. ✅ 通过 API 创建 Redroid 设备（已有功能）
2. ✅ 访问物理设备管理 API：
   ```bash
   # 扫描网络
   POST /admin/physical-devices/scan
   {
     "networkCidr": "192.168.1.0/24",
     "portStart": 5555,
     "portEnd": 5565
   }

   # 查看设备池统计
   GET /admin/physical-devices/stats/summary
   ```
3. ✅ 测试数据库 Provider 字段读写
4. ✅ 验证 Provider Factory 工作正常

---

## ✅ 下一步行动

**立即可以开始的工作**（按优先级）：

1. **物理设备分配流程** - 让物理设备真正可用
2. **SCRCPY 会话管理** - 完成投屏功能
3. **Token 刷新服务** - 云手机稳定性必需

你希望我先实现哪一个？
