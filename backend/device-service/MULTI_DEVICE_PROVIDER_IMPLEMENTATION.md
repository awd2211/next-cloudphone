# 多设备源提供商实施进度

**开始时间**: 2025-10-28
**当前状态**: Phase 1.1 进行中
**完成度**: 5%

---

## 📋 方案概述

实现统一设备提供商抽象层,支持四种设备源:
1. **Redroid** (Docker 容器) - 已有,需封装
2. **华为云手机 CPH** - 新增
3. **阿里云 ECP** - 新增
4. **物理设备 (网络 ADB + SCRCPY)** - 新增,**高优先级**

---

## ✅ 已完成

### Phase 1.1: 核心接口定义 (进行中)

**已创建文件**:
- ✅ [src/providers/provider.types.ts](/home/eric/next-cloudphone/backend/device-service/src/providers/provider.types.ts) - 类型定义完成

**包含内容**:
- `DeviceProviderType` 枚举 (4种设备源)
- `ConnectionInfo` 统一连接信息
- `DeviceCapabilities` 能力描述
- `CaptureFormat` 采集格式
- `DeviceCreateConfig`, `ProviderDevice` 等接口
- 触摸、滑动、按键等控制事件定义

---

## 🚧 下一步 (立即执行)

### 1. 完成 Phase 1.1 (剩余 1天)

**需要创建**:
- [ ] `src/providers/device-provider.interface.ts` - IDeviceProvider 接口
- [ ] `src/providers/device-provider.factory.ts` - 提供商工厂
- [ ] `src/providers/index.ts` - 导出文件

**IDeviceProvider 接口定义**:
```typescript
export interface IDeviceProvider {
  readonly providerType: DeviceProviderType;

  // 生命周期
  create(config: DeviceCreateConfig): Promise<ProviderDevice>;
  start(deviceId: string): Promise<void>;
  stop(deviceId: string): Promise<void>;
  destroy(deviceId: string): Promise<void>;

  // 状态查询
  getStatus(deviceId: string): Promise<DeviceProviderStatus>;
  getConnectionInfo(deviceId: string): Promise<ConnectionInfo>;

  // 能力
  getCapabilities(): DeviceCapabilities;

  // 可选: 设备控制
  sendTouchEvent?(deviceId: string, event: TouchEvent): Promise<void>;
  installApp?(deviceId: string, options: AppInstallOptions): Promise<void>;
  pushFile?(deviceId: string, options: FileTransferOptions): Promise<void>;
}
```

---

### 2. Phase 1.2: 数据库扩展 (2天)

**修改文件**:
- [ ] `src/entities/device.entity.ts` - 添加provider字段

**新增字段**:
```typescript
@Column({
  type: 'enum',
  enum: DeviceProviderType,
  default: DeviceProviderType.REDROID,
})
providerType: DeviceProviderType;

@Column({ type: 'jsonb', nullable: true })
providerConfig: Record<string, any>;

@Column({ type: 'jsonb', nullable: true })
connectionInfo: ConnectionInfo;
```

**Atlas 迁移脚本**:
```bash
cd backend/device-service
atlas migrate diff add_provider_fields \
  --dir "file://migrations" \
  --to "ent://src/entities" \
  --dev-url "docker://postgres/15/dev?search_path=public"
```

---

### 3. Phase 1.3: Redroid Provider (4天)

**新建文件**:
- [ ] `src/providers/redroid/redroid.provider.ts`
- [ ] `src/providers/redroid/redroid.module.ts`

**重构逻辑**:
将现有的 `DockerService` + `AdbService` 调用封装到 `RedroidProvider` 中,实现 `IDeviceProvider` 接口。

---

### 4. Phase 1.4: 更新 DevicesService (3天)

**修改文件**:
- [ ] `src/devices/devices.service.ts`
- [ ] `src/devices/devices.controller.ts`
- [ ] `src/devices/dto/create-device.dto.ts`

**核心改动**:
```typescript
// devices.service.ts
async create(dto: CreateDeviceDto): Promise<Device> {
  // 1. 获取提供商
  const provider = this.providerFactory.getProvider(dto.providerType);

  // 2. 创建设备
  const instance = await provider.create({...});

  // 3. 获取连接信息
  const connectionInfo = await provider.getConnectionInfo(instance.deviceId);

  // 4. 保存到数据库
  const device = this.devicesRepo.create({
    ...dto,
    providerType: dto.providerType,
    providerConfig: instance.providerConfig,
    connectionInfo: connectionInfo,
  });

  return await this.devicesRepo.save(device);
}

// 新增: 供 Media Service 使用
async getStreamInfo(deviceId: string) {
  const device = await this.findOne(deviceId);
  const provider = this.providerFactory.getProvider(device.providerType);

  return {
    deviceId: device.id,
    providerType: device.providerType,
    connectionInfo: await provider.getConnectionInfo(device.id),
    capabilities: provider.getCapabilities(),
  };
}
```

---

### 5. Phase 1.5: 集成测试 (2天)

**测试内容**:
- [ ] Redroid 设备创建功能
- [ ] 向后兼容性测试
- [ ] API 测试
- [ ] 数据库迁移测试

---

## 📅 完整时间线 (9周)

| 阶段 | 时间 | 状态 |
|------|------|------|
| **Phase 1: 基础架构** | Week 1-2 | 🚧 进行中 (5%) |
| Phase 1.1: 接口定义 | 3天 | 🚧 20% |
| Phase 1.2: 数据库扩展 | 2天 | ⏳ 待开始 |
| Phase 1.3: Redroid Provider | 4天 | ⏳ 待开始 |
| Phase 1.4: 更新 DevicesService | 3天 | ⏳ 待开始 |
| Phase 1.5: 集成测试 | 2天 | ⏳ 待开始 |
| **Phase 2: 物理设备** | Week 3-4 | ⏳ 待开始 |
| **Phase 3: 华为云手机** | Week 5-6 | ⏳ 待开始 |
| **Phase 4: 阿里云手机** | Week 7-8 | ⏳ 待开始 |
| **Phase 5: 监控优化** | Week 9 | ⏳ 待开始 |

---

## 🔑 关键决策记录

### 1. 设备源优先级
- **Phase 2 (物理设备)** 优先级最高 - 用户强调
- Phase 3/4 (华为/阿里云) 可并行开发

### 2. 物理设备连接方式
- ✅ 网络 ADB (用户确认)
- ✅ SCRCPY 高性能投屏 (35-70ms 延迟)
- 设备池管理模式

### 3. 云手机投屏方案
- 华为 CPH: API 投屏地址 + ADB screenrecord
- 阿里云 ECP: WebRTC Token (Passthrough 优先)

### 4. 架构模式
- ✅ 统一抽象层 (不是独立实现)
- ✅ 渐进式实施 (不是大爆炸)
- ✅ 向后兼容 (Redroid 功能不受影响)

---

## 📚 技术调研总结

### 华为云手机 CPH

**API 能力**:
- ✅ REST API: `POST /v1/{project_id}/cloud-phone/phones/*`
- ✅ 认证: IAM Token (`X-Auth-Token`)
- ✅ 投屏: `batch-connection` 返回 `access_ip` + `access_port`
- ✅ ADB: 公网/内网 ADB 支持
- ✅ 应用管理: InstallApk (通过 OBS)
- ⚠️ 限制: APK ≤ 2GB, 异步创建

### 阿里云 ECP

**API 能力**:
- ✅ REST API: `RunInstances`, `DescribeInstances`
- ✅ 认证: AK/SK 签名
- ✅ WebRTC: 原生支持,Token 30秒有效
- ✅ ADB: 密钥对认证,公网/私网
- ✅ 端口: TCP 80, UDP 50000-50007
- ⚠️ 限制: Token 刷新,单次连接

### 物理设备 (网络 ADB)

**SCRCPY 性能**:
- 延迟: 35-70ms (比 screencap 低 80%)
- FPS: 30-60
- 码率: 8 Mbps (可调)
- 质量: 1080p+
- 要求: Android 5.0+, USB 调试

**设备管理**:
- WiFi ADB: `adb connect <ip>:5555`
- 设备池模式 (available/allocated/offline)
- 30秒心跳监控
- 自动重连

---

## 🎯 成功指标

### Phase 1 完成标志
- [x] ✅ 类型定义创建完成
- [ ] IDeviceProvider 接口定义
- [ ] 数据库迁移成功
- [ ] Redroid Provider 实现
- [ ] 现有功能 100% 兼容
- [ ] 单元测试覆盖率 >70%

### Phase 2 完成标志
- [ ] 物理设备成功连接
- [ ] SCRCPY 投屏延迟 <70ms
- [ ] 设备池管理界面
- [ ] 设备健康监控

### 最终目标
- [ ] 支持 4 种设备源
- [ ] 统一 API 管理
- [ ] Media Service 适配完成
- [ ] 前端支持完整
- [ ] 性能达标

---

## 📖 相关文档

- [COMPLETE_OPTIMIZATION_SUMMARY.md](/home/eric/next-cloudphone/backend/media-service/COMPLETE_OPTIMIZATION_SUMMARY.md) - Media Service 优化总结
- [provider.types.ts](/home/eric/next-cloudphone/backend/device-service/src/providers/provider.types.ts) - 类型定义

---

## 🚀 继续实施命令

```bash
# 继续创建接口文件
# 下一步: 创建 device-provider.interface.ts
```

**当前进度**: Phase 1.1 - 20% 完成
**下一个里程碑**: Phase 1.1 完成 (接口定义)
