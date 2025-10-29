# 多设备源云手机平台统一对接方案 (最终版)

**文档版本**: v2.0
**更新时间**: 2025-10-28
**项目**: Cloud Phone Platform - 多设备源统一管理
**状态**: 待确认

---

## 📋 执行摘要

### 核心目标

实现统一设备提供商抽象层,支持四种设备源:
1. **物理设备 (1000+ 台)** - 🔴 **最高优先级**
2. **华为云手机 CPH** - 🟡 第二优先级
3. **阿里云 ECP** - 🟡 第二优先级
4. **Redroid (现有)** - 🟢 保持兼容

### 需求确认

| 需求项 | 确认结果 |
|--------|---------|
| **优先级** | 物理设备第一,云手机第二 |
| **测试账号** | 华为 + 阿里云都有 ✅ |
| **物理设备规模** | **1000+ 台** (大规模部署) |
| **云手机支持** | 华为 + 阿里云同时支持 |
| **上线时间** | ❓ **待确认** |

### 关键调整

**原方案问题**: 物理设备方案按 10-100 台规模设计,不适用于 1000+ 台

**调整内容**:
- ✅ Phase 2 拆分为 **2A (基础)** + **2B (大规模优化)**
- ✅ 增加设备池分片管理
- ✅ 增加分布式设备发现
- ✅ 增加设备健康评分和自动剔除
- ✅ 增加负载均衡和智能调度

---

## 🎯 技术方案总览

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│              前端 (Admin + User Portal)                  │
│   - 设备列表 (按提供商/地域/型号分组)                      │
│   - 设备池管理 (1000+ 台可视化)                           │
│   - 创建设备 (智能调度)                                    │
└──────────────────┬──────────────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────────────┐
│              Device Service                              │
│         (统一设备编排和生命周期管理)                       │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │   DeviceProviderFactory (提供商工厂)            │    │
│  └──────┬──────────┬──────────┬──────────┬────────┘    │
│         │          │          │          │              │
│  ┌──────▼───┐  ┌──▼──────┐  ┌▼─────┐  ┌▼──────────┐  │
│  │ Physical │  │ Redroid │  │Huawei│  │  Aliyun   │  │
│  │ Provider │  │Provider │  │ CPH  │  │   ECP     │  │
│  └──────┬───┘  └─────────┘  └──────┘  └───────────┘  │
└─────────┼──────────────────────────────────────────────┘
          │
┌─────────▼────────────────────────────────────────────────┐
│        Physical Device Manager (物理设备管理层)           │
│                                                           │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │ Device Pool  │  │   Device    │  │    Device      │ │
│  │  Sharding    │  │  Discovery  │  │    Health      │ │
│  │  (分片管理)   │  │  (发现)      │  │   Monitor      │ │
│  │              │  │             │  │  (健康监控)     │ │
│  │ Shard 1:     │  │ - Network   │  │                │ │
│  │   Device     │  │   Scan      │  │ - 30s心跳      │ │
│  │   1-500      │  │ - ADB List  │  │ - 健康评分     │ │
│  │              │  │ - mDNS      │  │ - 自动剔除     │ │
│  │ Shard 2:     │  │   Discover  │  │ - 故障恢复     │ │
│  │   Device     │  │             │  │                │ │
│  │   501-1000   │  │             │  │                │ │
│  └──────────────┘  └─────────────┘  └────────────────┘ │
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │   Device Scheduler (智能调度器)                   │  │
│  │   - 负载均衡 (按设备健康度、使用率)                 │  │
│  │   - 亲和性调度 (用户指定型号/Android版本)           │  │
│  │   - 地域就近 (如果跨地域部署)                       │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
          │
┌─────────▼────────────────────────────────────────────────┐
│            1000+ Physical Devices                        │
│                                                           │
│  ┌────────┐  ┌────────┐  ┌────────┐       ┌────────┐  │
│  │Device 1│  │Device 2│  │Device 3│  ...  │Device  │  │
│  │Xiaomi  │  │Samsung │  │Huawei  │       │1000+   │  │
│  │Android │  │Android │  │Android │       │        │  │
│  │  12    │  │  13    │  │  11    │       │        │  │
│  └────────┘  └────────┘  └────────┘       └────────┘  │
│  Network ADB: <IP>:5555                                  │
└──────────────────────────────────────────────────────────┘
          │
┌─────────▼────────────────────────────────────────────────┐
│              Media Service                                │
│        (WebRTC 视频流 + SCRCPY 高性能投屏)                │
│                                                           │
│  ┌────────────────────────────────────────────────┐    │
│  │   CaptureFactory (采集器工厂)                   │    │
│  └──┬──────────┬──────────┬──────────┬────────────┘    │
│     │          │          │          │                  │
│  ┌──▼───┐  ┌──▼────┐  ┌──▼─────┐  ┌▼────────┐        │
│  │SCRCPY│  │  ADB  │  │ Huawei │  │ Aliyun  │        │
│  │高性能│  │Screen │  │ Stream │  │ WebRTC  │        │
│  │35-70ms│  │Record │  │ Capture│  │ Bridge  │        │
│  └──────┘  └───────┘  └────────┘  └─────────┘        │
│     │          │          │          │                  │
│  ┌──▼──────────▼──────────▼──────────▼────────┐       │
│  │   Unified Encoder Pipeline                  │       │
│  │   - H.264 硬件加速                           │       │
│  │   - Worker Pool 并发编码                     │       │
│  └─────────────────────────────────────────────┘       │
└───────────────────────────────────────────────────────────┘
```

---

## 🚀 实施路线图 (调整版)

### 总时间: 11 周 (原 9 周)

| 阶段 | 时间 | 优先级 | 交付内容 |
|------|------|--------|---------|
| **Phase 1: 基础架构** | Week 1-2 | 🔴 必须 | 提供商抽象层,Redroid封装 |
| **Phase 2A: 物理设备基础** | Week 3-4 | 🔴 最高 | 设备池,ADB连接,SCRCPY投屏 |
| **Phase 2B: 物理设备大规模** | Week 5-6 | 🔴 最高 | 分片管理,智能调度,1000+台支持 |
| **Phase 3: 华为云手机** | Week 7-8 | 🟡 第二 | 华为 CPH API 对接 |
| **Phase 4: 阿里云手机** | Week 9-10 | 🟡 第二 | 阿里云 ECP API 对接 |
| **Phase 5: 监控优化** | Week 11 | 🟢 收尾 | 监控告警,性能优化 |

---

## 📅 Phase 1: 基础架构 (Week 1-2)

### 目标

引入设备提供商抽象层,封装现有 Redroid,为多设备源打基础。

### 任务清单

#### 1.1 核心接口定义 (3 天) ✅ **已完成**

**已创建文件**:
- ✅ `src/providers/provider.types.ts` - 类型定义
- ✅ `src/providers/device-provider.interface.ts` - 提供商接口

**包含内容**:
- `IDeviceProvider` 接口 (23个方法)
- `DeviceProviderType` 枚举 (4种设备源)
- `ConnectionInfo` 统一连接信息
- `DeviceCapabilities` 能力描述
- 控制事件定义 (触摸、滑动、按键等)

---

#### 1.2 数据库扩展 (2 天)

**修改文件**:
- `src/entities/device.entity.ts`

**新增字段**:
```typescript
@Column({
  type: 'enum',
  enum: DeviceProviderType,
  default: DeviceProviderType.REDROID,
})
providerType: DeviceProviderType;

@Column({ type: 'jsonb', nullable: true })
providerConfig: Record<string, any>; // 提供商特定配置

@Column({ type: 'jsonb', nullable: true })
connectionInfo: ConnectionInfo; // 缓存的连接信息

// 物理设备特定字段
@Column({ type: 'varchar', nullable: true })
deviceGroup?: string; // 设备分组 (按型号/地域)

@Column({ type: 'varchar', nullable: true })
deviceTags?: string; // 设备标签 (逗号分隔)

@Column({ type: 'int', default: 100 })
healthScore: number; // 健康评分 (0-100)

@Column({ type: 'timestamp', nullable: true })
lastHeartbeatAt?: Date; // 最后心跳时间
```

**Atlas 迁移脚本**:
```bash
cd backend/device-service

# 生成迁移
atlas migrate diff add_provider_fields \
  --dir "file://migrations" \
  --to "ent://src/entities" \
  --dev-url "docker://postgres/15/dev?search_path=public"

# 应用迁移
pnpm migrate:apply
```

**SQL 预览**:
```sql
-- 添加提供商字段
ALTER TABLE devices
  ADD COLUMN provider_type VARCHAR(20) DEFAULT 'redroid',
  ADD COLUMN provider_config JSONB,
  ADD COLUMN connection_info JSONB,
  ADD COLUMN device_group VARCHAR(50),
  ADD COLUMN device_tags VARCHAR(200),
  ADD COLUMN health_score INT DEFAULT 100,
  ADD COLUMN last_heartbeat_at TIMESTAMP;

-- 创建索引
CREATE INDEX idx_devices_provider_type ON devices(provider_type);
CREATE INDEX idx_devices_health_score ON devices(health_score);
CREATE INDEX idx_devices_device_group ON devices(device_group);
CREATE INDEX idx_devices_last_heartbeat ON devices(last_heartbeat_at);

-- 为现有数据设置默认值
UPDATE devices SET provider_type = 'redroid' WHERE provider_type IS NULL;
```

---

#### 1.3 提供商工厂 (2 天)

**新建文件**:
- `src/providers/device-provider.factory.ts`
- `src/providers/providers.module.ts`

**工厂实现**:
```typescript
@Injectable()
export class DeviceProviderFactory implements IDeviceProviderFactory {
  private providers = new Map<DeviceProviderType, IDeviceProvider>();

  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    // 后续在这里注册各个 Provider
  }

  getProvider(type: DeviceProviderType): IDeviceProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Provider ${type} not found or not enabled`);
    }
    return provider;
  }

  registerProvider(provider: IDeviceProvider): void {
    this.logger.log(`Registering provider: ${provider.providerType}`);
    this.providers.set(provider.providerType, provider);
  }

  getAllProviders(): IDeviceProvider[] {
    return Array.from(this.providers.values());
  }

  isProviderAvailable(type: DeviceProviderType): boolean {
    return this.providers.has(type);
  }
}
```

---

#### 1.4 封装 Redroid 为 Provider (4 天)

**新建文件**:
- `src/providers/redroid/redroid.provider.ts`
- `src/providers/redroid/redroid.module.ts`

**实现要点**:
```typescript
@Injectable()
export class RedroidProvider implements IDeviceProvider {
  readonly providerType = DeviceProviderType.REDROID;

  constructor(
    private readonly dockerService: DockerService,
    private readonly adbService: AdbService,
    private readonly portManager: PortManagerService,
    private readonly logger: Logger,
  ) {}

  async create(config: DeviceCreateConfig): Promise<ProviderDevice> {
    // 1. 分配 ADB 端口
    const adbPort = await this.portManager.allocatePort();

    // 2. 创建 Redroid 容器 (复用现有 DockerService 逻辑)
    const container = await this.dockerService.createContainer({
      name: `redroid-${config.name}`,
      cpuCores: config.cpuCores,
      memoryMB: config.memoryMB,
      resolution: `${config.resolution.width}x${config.resolution.height}`,
      adbPort: adbPort,
      // ... 其他配置
    });

    // 3. 等待 ADB 就绪
    await this.adbService.waitForDevice(`localhost:${adbPort}`, 30000);

    return {
      deviceId: container.id,
      providerConfig: {
        containerId: container.id,
        containerName: container.name,
        adbPort: adbPort,
      },
    };
  }

  async getConnectionInfo(deviceId: string): Promise<ConnectionInfo> {
    // 从 providerConfig 读取 adbPort
    const device = await this.getDeviceFromDb(deviceId);
    const config = device.providerConfig as any;

    return {
      providerType: DeviceProviderType.REDROID,
      adb: {
        host: 'localhost',
        port: config.adbPort,
        serial: `localhost:${config.adbPort}`,
      },
    };
  }

  getCapabilities(): DeviceCapabilities {
    return {
      supportsAdb: true,
      supportsScreenCapture: true,
      supportsAudioCapture: true,
      supportedCaptureFormats: [
        CaptureFormat.SCREENCAP,
        CaptureFormat.SCREENRECORD,
      ],
      maxResolution: { width: 1920, height: 1080 },
      supportsTouchControl: true,
      supportsKeyboardInput: true,
      supportsFileTransfer: true,
      supportsAppInstall: true,
      supportsSensorSimulation: true,
      supportsCamera: false,
      supportsMicrophone: false,
      supportsBatterySimulation: false,
    };
  }

  // 其他方法: start, stop, destroy 等
  // ...
}
```

---

#### 1.5 更新 DevicesService (3 天)

**修改文件**:
- `src/devices/devices.service.ts`
- `src/devices/devices.controller.ts`
- `src/devices/dto/create-device.dto.ts`

**核心改动**:
```typescript
@Injectable()
export class DevicesService {
  constructor(
    private readonly providerFactory: DeviceProviderFactory,
    @InjectRepository(Device) private readonly devicesRepo: Repository<Device>,
    private readonly eventBus: EventBusService,
    private readonly logger: Logger,
  ) {}

  async create(dto: CreateDeviceDto): Promise<Device> {
    // 1. 获取提供商 (默认 Redroid)
    const providerType = dto.providerType || DeviceProviderType.REDROID;
    const provider = this.providerFactory.getProvider(providerType);

    this.logger.log(`Creating device with provider: ${providerType}`);

    // 2. 创建设备实例
    const instance = await provider.create({
      name: dto.name,
      userId: dto.userId,
      cpuCores: dto.cpuCores,
      memoryMB: dto.memoryMB,
      resolution: dto.resolution,
      androidVersion: dto.androidVersion,
      deviceType: dto.type,
    });

    // 3. 获取连接信息
    const connectionInfo = await provider.getConnectionInfo(instance.deviceId);

    // 4. 保存设备记录
    const device = this.devicesRepo.create({
      ...dto,
      providerType: providerType,
      providerConfig: instance.providerConfig,
      connectionInfo: connectionInfo,
      healthScore: 100, // 新设备满分
      status: DeviceStatus.CREATING,
    });

    await this.devicesRepo.save(device);

    // 5. 启动设备
    try {
      await provider.start(instance.deviceId);
      device.status = DeviceStatus.RUNNING;
      await this.devicesRepo.save(device);
    } catch (error) {
      device.status = DeviceStatus.ERROR;
      await this.devicesRepo.save(device);
      throw error;
    }

    // 6. 发布事件
    await this.eventBus.publishDeviceEvent('created', {
      deviceId: device.id,
      providerType: providerType,
    });

    return device;
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
}
```

**DTO 更新**:
```typescript
export class CreateDeviceDto {
  // ... 现有字段

  @IsOptional()
  @IsEnum(DeviceProviderType)
  providerType?: DeviceProviderType; // 新增: 提供商类型
}
```

---

#### 1.6 集成测试 (2 天)

**测试内容**:
- ✅ Redroid 设备创建功能 (100% 兼容测试)
- ✅ 提供商工厂注册和获取
- ✅ 数据库迁移验证
- ✅ API 端点测试 (`POST /devices` 支持 providerType)
- ✅ 连接信息获取 (`GET /devices/:id/stream-info`)

**验收标准**:
- 现有 Redroid 功能 100% 正常
- 单元测试覆盖率 >70%
- 所有 API 测试通过

---

## 📱 Phase 2A: 物理设备基础 (Week 3-4)

### 目标

支持物理设备连接 (10-100 台规模),实现 SCRCPY 高性能投屏。

### 任务清单

#### 2A.1 物理设备管理服务 (4 天)

**新建文件**:
- `src/providers/physical/physical-device.manager.ts`
- `src/providers/physical/physical.provider.ts`
- `src/providers/physical/physical.module.ts`

**设备池管理**:
```typescript
export interface PhysicalDevice {
  serial: string; // ADB 序列号 (如 192.168.1.100:5555)
  model: string;
  manufacturer: string;
  androidVersion: string;
  connectionType: 'wifi' | 'usb';
  status: 'available' | 'allocated' | 'offline';
  healthScore: number;
  lastHeartbeatAt: Date;

  // 扩展属性
  deviceGroup?: string; // 设备分组
  tags?: string[];      // 标签
  location?: string;    // 地理位置
}

@Injectable()
export class PhysicalDeviceManager {
  private devices = new Map<string, PhysicalDevice>();

  constructor(
    private readonly adbService: AdbService,
    private readonly logger: Logger,
  ) {}

  // 自动发现 ADB 设备
  async discoverDevices(): Promise<PhysicalDevice[]> {
    const adbDevices = await this.adbService.listDevices();

    const discovered: PhysicalDevice[] = [];

    for (const adbDevice of adbDevices) {
      if (!this.devices.has(adbDevice.serial)) {
        // 查询设备属性
        const props = await this.adbService.getDeviceProperties(adbDevice.serial);

        const device: PhysicalDevice = {
          serial: adbDevice.serial,
          model: props['ro.product.model'],
          manufacturer: props['ro.product.manufacturer'],
          androidVersion: props['ro.build.version.release'],
          connectionType: adbDevice.serial.includes(':') ? 'wifi' : 'usb',
          status: 'available',
          healthScore: 100,
          lastHeartbeatAt: new Date(),
        };

        this.devices.set(device.serial, device);
        discovered.push(device);

        this.logger.log(`Discovered device: ${device.model} (${device.serial})`);
      }
    }

    return discovered;
  }

  // WiFi ADB 连接
  async connectWifi(ip: string, port: number = 5555): Promise<string> {
    const serial = `${ip}:${port}`;

    try {
      await this.adbService.connect(serial);
      await this.discoverDevices(); // 重新扫描
      return serial;
    } catch (error) {
      throw new Error(`Failed to connect to ${serial}: ${error.message}`);
    }
  }

  // 健康检查 (30秒定时任务)
  @Cron('*/30 * * * * *')
  async healthCheck() {
    for (const [serial, device] of this.devices.entries()) {
      try {
        const state = await this.adbService.getDeviceState(serial);

        if (state === 'device') {
          device.status = device.status === 'offline' ? 'available' : device.status;
          device.healthScore = Math.min(100, device.healthScore + 5); // 恢复健康度
          device.lastHeartbeatAt = new Date();
        } else {
          device.status = 'offline';
          device.healthScore = Math.max(0, device.healthScore - 10);
        }
      } catch (error) {
        device.status = 'offline';
        device.healthScore = Math.max(0, device.healthScore - 10);
        this.logger.warn(`Device ${serial} health check failed`);
      }
    }
  }

  // 分配设备 (按健康度和可用性)
  async allocateDevice(criteria?: {
    model?: string;
    androidVersion?: string;
    deviceGroup?: string;
  }): Promise<PhysicalDevice | null> {
    const available = Array.from(this.devices.values())
      .filter(d => d.status === 'available')
      .filter(d => d.healthScore > 50) // 健康度 > 50
      .filter(d => !criteria || (
        (!criteria.model || d.model === criteria.model) &&
        (!criteria.androidVersion || d.androidVersion === criteria.androidVersion) &&
        (!criteria.deviceGroup || d.deviceGroup === criteria.deviceGroup)
      ))
      .sort((a, b) => b.healthScore - a.healthScore); // 按健康度排序

    if (available.length === 0) {
      return null;
    }

    const device = available[0];
    device.status = 'allocated';

    return device;
  }

  // 释放设备
  async releaseDevice(serial: string): Promise<void> {
    const device = this.devices.get(serial);
    if (device) {
      device.status = 'available';
    }
  }

  // 获取设备池统计
  getPoolStats() {
    const all = Array.from(this.devices.values());

    return {
      total: all.length,
      available: all.filter(d => d.status === 'available').length,
      allocated: all.filter(d => d.status === 'allocated').length,
      offline: all.filter(d => d.status === 'offline').length,
      avgHealthScore: all.reduce((sum, d) => sum + d.healthScore, 0) / all.length,
    };
  }
}
```

---

#### 2A.2 Physical Provider 实现 (3 天)

**核心代码**:
```typescript
@Injectable()
export class PhysicalProvider implements IDeviceProvider {
  readonly providerType = DeviceProviderType.PHYSICAL;

  constructor(
    private readonly deviceManager: PhysicalDeviceManager,
    private readonly adbService: AdbService,
    private readonly scrcpyService: ScrcpyService, // 新服务
    private readonly logger: Logger,
  ) {}

  async create(config: DeviceCreateConfig): Promise<ProviderDevice> {
    // 物理设备不需要"创建",而是从设备池"分配"
    const device = await this.deviceManager.allocateDevice({
      model: config.providerSpecificConfig?.model,
      androidVersion: config.androidVersion,
      deviceGroup: config.providerSpecificConfig?.deviceGroup,
    });

    if (!device) {
      throw new ProviderError(
        'No available physical device',
        DeviceProviderType.PHYSICAL,
        'NO_DEVICE_AVAILABLE',
      );
    }

    return {
      deviceId: device.serial,
      providerConfig: {
        serial: device.serial,
        model: device.model,
        manufacturer: device.manufacturer,
        androidVersion: device.androidVersion,
        connectionType: device.connectionType,
      },
    };
  }

  async getConnectionInfo(deviceId: string): Promise<ConnectionInfo> {
    const device = await this.deviceManager.getDevice(deviceId);

    // 启动 SCRCPY Server (高性能投屏)
    const scrcpyPort = await this.scrcpyService.startServer(deviceId);

    return {
      providerType: DeviceProviderType.PHYSICAL,
      adb: {
        host: device.connectionType === 'wifi' ? device.serial.split(':')[0] : 'localhost',
        port: device.connectionType === 'wifi' ? parseInt(device.serial.split(':')[1]) : 5037,
        serial: device.serial,
      },
      scrcpy: {
        host: 'localhost',
        port: scrcpyPort,
        maxBitrate: 8000000, // 8 Mbps
        codec: 'h264',
      },
    };
  }

  getCapabilities(): DeviceCapabilities {
    return {
      supportsAdb: true,
      supportsScreenCapture: true,
      supportsAudioCapture: true,
      supportedCaptureFormats: [
        CaptureFormat.SCRCPY,          // 优先
        CaptureFormat.SCREENRECORD,
        CaptureFormat.SCREENCAP,
      ],
      maxResolution: { width: 1920, height: 1080 },
      supportsTouchControl: true,
      supportsKeyboardInput: true,
      supportsFileTransfer: true,
      supportsAppInstall: true,
      supportsSensorSimulation: false, // 物理设备无法模拟传感器
      supportsCamera: true,            // 真实硬件
      supportsMicrophone: true,
      supportsBatterySimulation: false,
    };
  }

  async start(deviceId: string): Promise<void> {
    // 物理设备已运行,这里可以执行初始化
    // 例如: 清理临时文件
    await this.adbService.executeCommand(deviceId, 'shell', ['rm', '-rf', '/sdcard/tmp/*']);
  }

  async stop(deviceId: string): Promise<void> {
    // 停止 SCRCPY Server
    await this.scrcpyService.stopServer(deviceId);

    // 释放设备回池
    await this.deviceManager.releaseDevice(deviceId);
  }

  async destroy(deviceId: string): Promise<void> {
    // 物理设备不能销毁,只能断开
    await this.deviceManager.disconnect(deviceId);
  }
}
```

---

#### 2A.3 SCRCPY 服务集成 (4 天)

**新建文件**:
- `src/providers/physical/scrcpy.service.ts`

**SCRCPY Server 管理**:
```typescript
@Injectable()
export class ScrcpyService {
  private servers = new Map<string, ScrcpyServerInstance>();

  async startServer(deviceSerial: string): Promise<number> {
    // 1. 分配端口
    const port = await this.allocatePort();

    // 2. 推送 scrcpy-server.jar 到设备
    await this.adbService.push(
      deviceSerial,
      '/path/to/scrcpy-server.jar',
      '/data/local/tmp/scrcpy-server.jar'
    );

    // 3. 启动 server
    const proc = this.adbService.shell(deviceSerial, [
      'CLASSPATH=/data/local/tmp/scrcpy-server.jar',
      'app_process',
      '/',
      'com.genymobile.scrcpy.Server',
      '1.24',           // scrcpy 版本
      'log_level=info',
      'max_size=0',
      'bit_rate=8000000',
      'max_fps=60',
      'tunnel_forward=true',
    ]);

    // 4. 端口转发
    await this.adbService.forward(deviceSerial, port, 'localabstract:scrcpy');

    this.servers.set(deviceSerial, { port, proc });

    return port;
  }

  async stopServer(deviceSerial: string): Promise<void> {
    const server = this.servers.get(deviceSerial);
    if (server) {
      server.proc.kill();
      await this.adbService.removeForward(deviceSerial, server.port);
      this.servers.delete(deviceSerial);
    }
  }
}
```

**Media Service SCRCPY Capture** (Go):
```go
// backend/media-service/internal/capture/scrcpy_capture.go
type ScrcpyCapture struct {
    deviceSerial  string
    scrcpyHost    string
    scrcpyPort    int
    conn          net.Conn
    frameChannel  chan *Frame
    logger        *logrus.Logger
    running       atomic.Bool
}

func (c *ScrcpyCapture) Start(ctx context.Context, options CaptureOptions) error {
    // 连接到 SCRCPY server
    conn, err := net.Dial("tcp", fmt.Sprintf("%s:%d", c.scrcpyHost, c.scrcpyPort))
    if err != nil {
        return err
    }
    c.conn = conn

    // 读取设备名称 (64 bytes)
    deviceName := make([]byte, 64)
    io.ReadFull(conn, deviceName)

    // 读取视频流
    go c.readVideoStream(ctx)

    return nil
}

func (c *ScrcpyCapture) readVideoStream(ctx context.Context) {
    for c.running.Load() {
        // SCRCPY 协议: [4 bytes size][H.264 data]
        sizeBytes := make([]byte, 4)
        io.ReadFull(c.conn, sizeBytes)
        frameSize := binary.BigEndian.Uint32(sizeBytes)

        frameData := make([]byte, frameSize)
        io.ReadFull(c.conn, frameData)

        frame := &Frame{
            Data:      frameData,
            Format:    FrameFormatH264,
            Timestamp: time.Now(),
        }

        select {
        case c.frameChannel <- frame:
        default:
            // 丢帧
        }
    }
}
```

---

#### 2A.4 设备池管理 API (2 天)

**新建文件**:
- `src/physical-devices/physical-devices.controller.ts`
- `src/physical-devices/physical-devices.module.ts`

**API 端点**:
```typescript
@Controller('physical-devices')
export class PhysicalDevicesController {
  constructor(private readonly deviceManager: PhysicalDeviceManager) {}

  // 扫描设备
  @Get('scan')
  async scanDevices() {
    const devices = await this.deviceManager.discoverDevices();
    return {
      total: devices.length,
      devices: devices,
    };
  }

  // 设备池状态
  @Get('pool')
  async getDevicePool() {
    const stats = this.deviceManager.getPoolStats();
    const devices = Array.from(this.deviceManager.devices.values());

    return {
      stats: stats,
      devices: devices,
    };
  }

  // WiFi ADB 连接
  @Post('connect-wifi')
  async connectWifi(@Body() dto: ConnectWifiDto) {
    const serial = await this.deviceManager.connectWifi(dto.ip, dto.port);
    return { serial };
  }

  // 断开设备
  @Delete(':serial')
  async disconnect(@Param('serial') serial: string) {
    await this.deviceManager.disconnect(serial);
    return { message: 'Device disconnected' };
  }
}
```

---

#### 2A.5 前端支持 (2 天)

**设备池管理页面**:
- 显示 1000+ 台设备列表 (虚拟滚动)
- 设备状态实时更新 (WebSocket)
- 健康度显示 (进度条 + 颜色)
- WiFi ADB 连接界面

**创建设备页面**:
- 选择 "物理设备"
- 显示可用设备列表
- 按型号/Android 版本筛选

---

## 🏢 Phase 2B: 物理设备大规模优化 (Week 5-6)

### 目标

支持 1000+ 台物理设备,分片管理,智能调度。

### 核心挑战

| 挑战 | 解决方案 |
|------|---------|
| 单服务器管理 1000+ 设备压力大 | 设备池分片 (500台/分片) |
| 设备发现扫描慢 | 并发扫描 + mDNS 发现 |
| 心跳检查性能瓶颈 | 分批检查 + 增量更新 |
| 设备分配效率低 | 智能调度算法 + 预分配 |
| 跨地域设备管理 | 地域感知调度 |

---

### 任务清单

#### 2B.1 设备池分片管理 (3 天)

**架构设计**:
```typescript
export class ShardedDevicePool {
  private shards: DevicePoolShard[] = [];

  constructor(
    private readonly shardSize: number = 500, // 每个分片 500 台设备
  ) {
    this.initShards();
  }

  private initShards() {
    const shardCount = Math.ceil(1000 / this.shardSize);
    for (let i = 0; i < shardCount; i++) {
      this.shards.push(new DevicePoolShard(i, this.shardSize));
    }
  }

  async allocateDevice(criteria?: AllocationCriteria): Promise<PhysicalDevice | null> {
    // 策略 1: 负载均衡 (选择空闲设备最多的分片)
    const sortedShards = this.shards
      .sort((a, b) => b.getAvailableCount() - a.getAvailableCount());

    // 策略 2: 并发查询所有分片
    const results = await Promise.all(
      sortedShards.map(shard => shard.allocateDevice(criteria))
    );

    return results.find(device => device !== null) || null;
  }

  async healthCheck() {
    // 并发检查所有分片
    await Promise.all(this.shards.map(shard => shard.healthCheck()));
  }

  getShardStats() {
    return this.shards.map(shard => ({
      shardId: shard.id,
      total: shard.devices.size,
      available: shard.getAvailableCount(),
      allocated: shard.getAllocatedCount(),
      offline: shard.getOfflineCount(),
      avgHealthScore: shard.getAvgHealthScore(),
    }));
  }
}

class DevicePoolShard {
  devices = new Map<string, PhysicalDevice>();

  constructor(
    public readonly id: number,
    public readonly maxSize: number,
  ) {}

  async allocateDevice(criteria?: AllocationCriteria): Promise<PhysicalDevice | null> {
    // 本地分片内分配逻辑
    // ...
  }

  getAvailableCount(): number {
    return Array.from(this.devices.values())
      .filter(d => d.status === 'available').length;
  }

  // 分批健康检查 (每批 50 台,避免阻塞)
  async healthCheck() {
    const deviceArray = Array.from(this.devices.values());
    const batchSize = 50;

    for (let i = 0; i < deviceArray.length; i += batchSize) {
      const batch = deviceArray.slice(i, i + batchSize);
      await Promise.all(batch.map(device => this.checkDeviceHealth(device)));
    }
  }
}
```

---

#### 2B.2 智能设备调度器 (3 天)

**调度策略**:
```typescript
export class DeviceScheduler {
  // 策略 1: 健康度优先
  async scheduleByHealth(criteria: AllocationCriteria): Promise<PhysicalDevice | null> {
    return this.pool.allocateDevice({
      ...criteria,
      sortBy: 'healthScore',
      order: 'desc',
    });
  }

  // 策略 2: 负载均衡
  async scheduleByLoadBalance(criteria: AllocationCriteria): Promise<PhysicalDevice | null> {
    // 选择使用率最低的设备
    return this.pool.allocateDevice({
      ...criteria,
      sortBy: 'usageRate',
      order: 'asc',
    });
  }

  // 策略 3: 地域就近
  async scheduleByLocation(userId: string, criteria: AllocationCriteria): Promise<PhysicalDevice | null> {
    const userLocation = await this.getUserLocation(userId);

    return this.pool.allocateDevice({
      ...criteria,
      preferredLocation: userLocation,
    });
  }

  // 策略 4: 亲和性调度 (用户指定型号)
  async scheduleByAffinity(criteria: AllocationCriteria): Promise<PhysicalDevice | null> {
    // 如果用户指定了型号/Android版本,优先满足
    if (criteria.model || criteria.androidVersion) {
      return this.pool.allocateDevice(criteria);
    }

    // 否则使用默认策略
    return this.scheduleByHealth(criteria);
  }

  // 综合调度策略
  async schedule(userId: string, criteria: AllocationCriteria): Promise<PhysicalDevice | null> {
    // 1. 亲和性优先
    let device = await this.scheduleByAffinity(criteria);
    if (device) return device;

    // 2. 地域就近
    device = await this.scheduleByLocation(userId, criteria);
    if (device) return device;

    // 3. 健康度兜底
    return await this.scheduleByHealth(criteria);
  }
}
```

---

#### 2B.3 分布式设备发现 (2 天)

**并发扫描 + mDNS**:
```typescript
export class DistributedDeviceDiscovery {
  // 网络扫描 (支持多网段并发)
  async scanNetworks(networks: string[]): Promise<PhysicalDevice[]> {
    const results = await Promise.all(
      networks.map(network => this.scanNetwork(network))
    );

    return results.flat();
  }

  private async scanNetwork(networkCidr: string): Promise<PhysicalDevice[]> {
    // 并发 ping 检查
    const ips = this.generateIpRange(networkCidr);
    const batchSize = 50;

    const devices: PhysicalDevice[] = [];

    for (let i = 0; i < ips.length; i += batchSize) {
      const batch = ips.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(ip => this.tryConnect(ip, 5555))
      );

      devices.push(...results.filter(d => d !== null));
    }

    return devices;
  }

  // mDNS 服务发现 (如果设备支持)
  async discoverViaMdns(): Promise<PhysicalDevice[]> {
    const mdns = require('mdns');
    const browser = mdns.createBrowser(mdns.tcp('adb'));

    return new Promise((resolve) => {
      const devices: PhysicalDevice[] = [];

      browser.on('serviceUp', (service) => {
        devices.push({
          serial: `${service.addresses[0]}:${service.port}`,
          // ... 其他属性通过 ADB 查询
        });
      });

      browser.start();

      setTimeout(() => {
        browser.stop();
        resolve(devices);
      }, 10000); // 10秒扫描
    });
  }
}
```

---

#### 2B.4 设备健康评分系统 (2 天)

**评分算法**:
```typescript
export class DeviceHealthScorer {
  calculateScore(device: PhysicalDevice): number {
    let score = 100;

    // 1. 心跳延迟 (-0-20分)
    const heartbeatDelay = Date.now() - device.lastHeartbeatAt.getTime();
    if (heartbeatDelay > 60000) score -= 20; // 超过 1 分钟
    else if (heartbeatDelay > 30000) score -= 10;

    // 2. 连接稳定性 (-0-20分)
    const disconnectRate = device.disconnectCount / device.totalConnections;
    score -= disconnectRate * 20;

    // 3. ADB 响应时间 (-0-15分)
    if (device.avgAdbResponseTime > 1000) score -= 15; // 超过 1 秒
    else if (device.avgAdbResponseTime > 500) score -= 10;

    // 4. 设备温度 (-0-15分,物理设备特有)
    if (device.temperature > 45) score -= 15; // 超过 45°C
    else if (device.temperature > 40) score -= 10;

    // 5. 电池电量 (-0-10分,物理设备特有)
    if (device.batteryLevel < 20) score -= 10;
    else if (device.batteryLevel < 50) score -= 5;

    // 6. 存储空间 (-0-10分)
    if (device.freeStorageMB < 1000) score -= 10; // 少于 1GB
    else if (device.freeStorageMB < 5000) score -= 5;

    // 7. 历史故障率 (-0-10分)
    if (device.errorRate > 0.1) score -= 10; // 超过 10%
    else if (device.errorRate > 0.05) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  // 自动剔除不健康设备
  @Cron('0 */5 * * * *') // 每 5 分钟
  async autoRemoveUnhealthyDevices() {
    const devices = await this.pool.getAllDevices();

    for (const device of devices) {
      const score = this.calculateScore(device);

      if (score < 30) {
        // 健康度 < 30,自动剔除
        await this.pool.removeDevice(device.serial);
        this.logger.warn(`Device ${device.serial} removed due to low health score: ${score}`);

        // 发送告警
        await this.alertService.sendAlert({
          level: 'warning',
          message: `Physical device ${device.serial} (${device.model}) removed from pool due to health issues`,
        });
      }
    }
  }
}
```

---

#### 2B.5 监控和告警 (2 天)

**Prometheus 指标**:
```typescript
// 设备池指标
this.devicePoolTotal.set({ shard: shardId }, total);
this.devicePoolAvailable.set({ shard: shardId }, available);
this.devicePoolAllocated.set({ shard: shardId }, allocated);
this.devicePoolOffline.set({ shard: shardId }, offline);
this.devicePoolAvgHealth.set({ shard: shardId }, avgHealth);

// 调度指标
this.deviceAllocationDuration.observe({ strategy: 'health' }, duration);
this.deviceAllocationFailures.inc({ reason: 'no_device' });

// 设备健康指标
this.deviceHealthScore.set({ serial: device.serial }, device.healthScore);
this.deviceHeartbeatDelay.set({ serial: device.serial }, delay);
```

**告警规则**:
```yaml
groups:
  - name: physical_devices
    rules:
      # 可用设备不足
      - alert: PhysicalDevicePoolLow
        expr: sum(device_pool_available) / sum(device_pool_total) < 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "物理设备池可用设备不足 20%"

      # 离线设备过多
      - alert: PhysicalDeviceOfflineHigh
        expr: sum(device_pool_offline) / sum(device_pool_total) > 0.1
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "超过 10% 物理设备离线"

      # 设备分配失败率高
      - alert: DeviceAllocationFailureHigh
        expr: rate(device_allocation_failures_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "设备分配失败率超过 10%"
```

---

#### 2B.6 性能测试 (2 天)

**测试场景**:
1. 1000 台设备并发健康检查 (目标: <30秒)
2. 高并发设备分配 (100 QPS,成功率 >95%)
3. 设备池分片负载均衡
4. 设备故障自动剔除和恢复

---

## ☁️ Phase 3: 华为云手机 CPH (Week 7-8)

### 目标

对接华为云手机 CPH API,支持云端 Android 实例。

### 任务清单

#### 3.1 华为 CPH SDK 客户端 (4 天)

**新建文件**:
- `src/providers/huawei/huawei-cph.client.ts`
- `src/providers/huawei/huawei.provider.ts`
- `src/providers/huawei/huawei.module.ts`

**IAM 认证**:
```typescript
@Injectable()
export class HuaweiCphClient {
  private readonly apiEndpoint: string;
  private readonly iamEndpoint: string;
  private readonly projectId: string;
  private readonly username: string;
  private readonly password: string;

  private tokenCache: { token: string; expiresAt: Date } | null = null;

  constructor(private readonly configService: ConfigService) {
    this.apiEndpoint = configService.get('HUAWEI_API_ENDPOINT');
    this.iamEndpoint = configService.get('HUAWEI_IAM_ENDPOINT');
    this.projectId = configService.get('HUAWEI_PROJECT_ID');
    this.username = configService.get('HUAWEI_USERNAME');
    this.password = configService.get('HUAWEI_PASSWORD');
  }

  // 获取 IAM Token
  private async getToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > new Date()) {
      return this.tokenCache.token;
    }

    const response = await this.httpClient.post(`${this.iamEndpoint}/v3/auth/tokens`, {
      auth: {
        identity: {
          methods: ['password'],
          password: {
            user: {
              name: this.username,
              password: this.password,
              domain: { name: this.username },
            },
          },
        },
        scope: {
          project: { id: this.projectId },
        },
      },
    });

    const token = response.headers['x-subject-token'];
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时

    this.tokenCache = { token, expiresAt };

    return token;
  }

  // 创建云手机实例
  async createInstance(options: HuaweiInstanceOptions): Promise<HuaweiInstance> {
    const token = await this.getToken();

    const response = await this.httpClient.post(
      `${this.apiEndpoint}/v1/${this.projectId}/cloud-phone/phones`,
      {
        server_id: options.serverId,       // 云手机服务器 ID
        phone_name: options.name,
        phone_model_name: options.modelName, // 规格型号
        image_id: options.imageId,         // 镜像 ID
        // ... 其他参数
      },
      {
        headers: {
          'X-Auth-Token': token,
        },
      }
    );

    return response.data;
  }

  // 获取投屏地址
  async getConnectionInfo(phoneId: string): Promise<HuaweiConnectionInfo> {
    const token = await this.getToken();

    const response = await this.httpClient.post(
      `${this.apiEndpoint}/v1/${this.projectId}/cloud-phone/phones/batch-connection`,
      {
        phone_ids: [phoneId],
      },
      {
        headers: {
          'X-Auth-Token': token,
        },
      }
    );

    const phone = response.data.phones[0];

    return {
      instanceId: phone.phone_id,
      accessIp: phone.access_info.access_ip,
      accessPort: phone.access_info.access_port,
      sessionId: phone.access_info.session_id,
      ticket: phone.access_info.ticket,
    };
  }

  // 执行 ADB 命令 (同步)
  async executeAdbCommand(phoneId: string, command: string): Promise<string> {
    const token = await this.getToken();

    const response = await this.httpClient.post(
      `${this.apiEndpoint}/v1/${this.projectId}/cloud-phone/phones/commands`,
      {
        phone_ids: [phoneId],
        command: 'adb_shell',
        content: command,
      },
      {
        headers: {
          'X-Auth-Token': token,
        },
      }
    );

    return response.data.jobs[0].result;
  }

  // 安装 APK
  async installApk(phoneId: string, apkUrl: string): Promise<string> {
    const token = await this.getToken();

    const response = await this.httpClient.post(
      `${this.apiEndpoint}/v1/${this.projectId}/cloud-phone/phones/commands`,
      {
        phone_ids: [phoneId],
        command: 'install',
        content: apkUrl, // OBS 存储路径
      },
      {
        headers: {
          'X-Auth-Token': token,
        },
      }
    );

    return response.data.jobs[0].job_id;
  }

  // 销毁实例
  async destroyInstance(phoneId: string): Promise<void> {
    const token = await this.getToken();

    await this.httpClient.post(
      `${this.apiEndpoint}/v1/${this.projectId}/cloud-phone/phones/batch-delete`,
      {
        phone_ids: [phoneId],
      },
      {
        headers: {
          'X-Auth-Token': token,
        },
      }
    );
  }
}
```

---

#### 3.2 华为 Provider 实现 (3 天)

```typescript
@Injectable()
export class HuaweiProvider implements IDeviceProvider {
  readonly providerType = DeviceProviderType.HUAWEI_CPH;

  constructor(
    private readonly client: HuaweiCphClient,
    private readonly logger: Logger,
  ) {}

  async create(config: DeviceCreateConfig): Promise<ProviderDevice> {
    // 1. 创建云手机实例 (异步)
    const instance = await this.client.createInstance({
      name: config.name,
      serverId: config.providerSpecificConfig?.serverId,
      modelName: this.selectModelName(config.cpuCores, config.memoryMB),
      imageId: this.selectImageId(config.androidVersion),
    });

    // 2. 等待实例就绪 (轮询状态)
    await this.waitForInstanceReady(instance.phone_id);

    // 3. 获取连接信息
    const connectionInfo = await this.client.getConnectionInfo(instance.phone_id);

    return {
      deviceId: instance.phone_id,
      providerConfig: {
        phoneId: instance.phone_id,
        serverId: instance.server_id,
        modelName: instance.phone_model_name,
      },
      connectionInfo: {
        providerType: DeviceProviderType.HUAWEI_CPH,
        huaweiCph: connectionInfo,
      },
    };
  }

  private async waitForInstanceReady(phoneId: string, timeout: number = 300000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const status = await this.client.getInstanceStatus(phoneId);

      if (status === 'Running') {
        return;
      } else if (status === 'Error') {
        throw new Error(`Instance ${phoneId} creation failed`);
      }

      await this.sleep(5000); // 5秒轮询
    }

    throw new Error(`Instance ${phoneId} creation timeout`);
  }

  async getConnectionInfo(deviceId: string): Promise<ConnectionInfo> {
    const connectionInfo = await this.client.getConnectionInfo(deviceId);

    return {
      providerType: DeviceProviderType.HUAWEI_CPH,
      huaweiCph: connectionInfo,
    };
  }

  getCapabilities(): DeviceCapabilities {
    return {
      supportsAdb: true,
      supportsScreenCapture: true,
      supportsAudioCapture: true,
      supportedCaptureFormats: [
        CaptureFormat.SCREENRECORD, // 通过 ADB
      ],
      maxResolution: { width: 1920, height: 1080 },
      supportsTouchControl: true,
      supportsKeyboardInput: true,
      supportsFileTransfer: true,
      supportsAppInstall: true,
      supportsSensorSimulation: true,
      supportsCamera: false,
      supportsMicrophone: false,
      supportsBatterySimulation: false,
    };
  }

  // 其他方法实现...
}
```

---

#### 3.3 Media Service 适配 (3 天)

**Huawei Stream Capture** (Go):
```go
// backend/media-service/internal/capture/huawei_stream_capture.go

type HuaweiStreamCapture struct {
    instanceId   string
    accessIp     string
    accessPort   int
    sessionId    string
    ticket       string
    frameChannel chan *Frame
    adbSerial    string  // 如果支持 ADB
    logger       *logrus.Logger
}

func (c *HuaweiStreamCapture) Start(ctx context.Context, options CaptureOptions) error {
    // 方案 1: 如果华为提供投屏 API,通过 HTTP/WebSocket 拉流
    if c.hasStreamApi() {
        return c.startStreamApi(ctx)
    }

    // 方案 2: 通过 ADB screenrecord (降级)
    if c.adbSerial != "" {
        return c.startAdbScreenrecord(ctx)
    }

    return fmt.Errorf("no available capture method")
}

func (c *HuaweiStreamCapture) startAdbScreenrecord(ctx context.Context) error {
    // 复用现有 ADB screenrecord 逻辑
    cmd := exec.CommandContext(ctx, "adb", "-s", c.adbSerial,
        "shell", "screenrecord", "--output-format=h264", "-")

    stdout, _ := cmd.StdoutPipe()
    cmd.Start()

    go c.readH264Stream(stdout)

    return nil
}
```

---

#### 3.4 前端和测试 (2 天)

**前端**:
- 创建设备页面添加 "华为云手机" 选项
- 配置服务器 ID、规格选择
- 显示实例创建进度

**测试**:
- 华为测试账号验证
- 实例创建 → 投屏 → 销毁完整流程
- 成本监控 (按小时计费)

---

## ☁️ Phase 4: 阿里云手机 ECP (Week 9-10)

### 目标

对接阿里云 ECP API,支持 WebRTC 投屏。

### 任务清单

#### 4.1 阿里云 ECP SDK 客户端 (4 天)

**AK/SK 签名认证**:
```typescript
@Injectable()
export class AliyunEcpClient {
  private readonly endpoint: string;
  private readonly accessKeyId: string;
  private readonly accessKeySecret: string;

  constructor(private readonly configService: ConfigService) {
    this.endpoint = configService.get('ALIYUN_ECP_ENDPOINT');
    this.accessKeyId = configService.get('ALIYUN_ACCESS_KEY_ID');
    this.accessKeySecret = configService.get('ALIYUN_ACCESS_KEY_SECRET');
  }

  // AK/SK 签名
  private sign(params: Record<string, any>): string {
    const sortedKeys = Object.keys(params).sort();
    const canonicalString = sortedKeys
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');

    const stringToSign = `GET&${encodeURIComponent('/')}&${encodeURIComponent(canonicalString)}`;

    return crypto
      .createHmac('sha1', this.accessKeySecret + '&')
      .update(stringToSign)
      .digest('base64');
  }

  // 创建实例
  async runInstances(options: AliyunInstanceOptions): Promise<AliyunInstance> {
    const params = {
      Action: 'RunInstances',
      InstanceType: options.instanceType,
      InstanceName: options.name,
      ImageId: options.imageId,
      Amount: 1,
      AccessKeyId: this.accessKeyId,
      Timestamp: new Date().toISOString(),
      SignatureMethod: 'HMAC-SHA1',
      SignatureVersion: '1.0',
      SignatureNonce: Math.random().toString(36),
      Format: 'JSON',
    };

    params['Signature'] = this.sign(params);

    const response = await this.httpClient.get(this.endpoint, { params });

    return response.data.Instances.Instance[0];
  }

  // 获取 WebRTC Token
  async getWebRtcToken(instanceId: string): Promise<string> {
    const params = {
      Action: 'GetWebRtcToken',
      InstanceId: instanceId,
      // ... 其他参数
    };

    params['Signature'] = this.sign(params);

    const response = await this.httpClient.get(this.endpoint, { params });

    return response.data.WebRtcToken;
  }

  // 销毁实例
  async deleteInstances(instanceId: string): Promise<void> {
    const params = {
      Action: 'DeleteInstances',
      InstanceId: [instanceId],
      // ...
    };

    params['Signature'] = this.sign(params);

    await this.httpClient.get(this.endpoint, { params });
  }
}
```

---

#### 4.2 阿里云 Provider 实现 (3 天)

```typescript
@Injectable()
export class AliyunProvider implements IDeviceProvider {
  readonly providerType = DeviceProviderType.ALIYUN_ECP;

  constructor(
    private readonly client: AliyunEcpClient,
    private readonly logger: Logger,
  ) {}

  async create(config: DeviceCreateConfig): Promise<ProviderDevice> {
    // 1. 创建实例
    const instance = await this.client.runInstances({
      name: config.name,
      instanceType: this.selectInstanceType(config.cpuCores, config.memoryMB),
      imageId: this.selectImageId(config.androidVersion),
    });

    // 2. 等待实例就绪
    await this.waitForInstanceReady(instance.InstanceId);

    // 3. 获取 WebRTC Token
    const webrtcToken = await this.client.getWebRtcToken(instance.InstanceId);

    return {
      deviceId: instance.InstanceId,
      providerConfig: {
        instanceId: instance.InstanceId,
        instanceType: instance.InstanceType,
      },
      connectionInfo: {
        providerType: DeviceProviderType.ALIYUN_ECP,
        aliyunEcp: {
          instanceId: instance.InstanceId,
          webrtcToken: webrtcToken,
          webrtcUrl: `wss://ecp.aliyuncs.com/webrtc/${instance.InstanceId}`,
          tokenExpiresAt: new Date(Date.now() + 30000), // 30秒
        },
      },
    };
  }

  async getConnectionInfo(deviceId: string): Promise<ConnectionInfo> {
    // Token 刷新逻辑
    const webrtcToken = await this.client.getWebRtcToken(deviceId);

    return {
      providerType: DeviceProviderType.ALIYUN_ECP,
      aliyunEcp: {
        instanceId: deviceId,
        webrtcToken: webrtcToken,
        webrtcUrl: `wss://ecp.aliyuncs.com/webrtc/${deviceId}`,
        tokenExpiresAt: new Date(Date.now() + 30000),
      },
    };
  }

  getCapabilities(): DeviceCapabilities {
    return {
      supportsAdb: true, // 通过密钥对
      supportsScreenCapture: true,
      supportsAudioCapture: true,
      supportedCaptureFormats: [
        CaptureFormat.WEBRTC, // 主推
        CaptureFormat.SCREENRECORD,
      ],
      maxResolution: { width: 1920, height: 1080 },
      supportsTouchControl: true,
      supportsKeyboardInput: true,
      supportsFileTransfer: true,
      supportsAppInstall: true,
      supportsSensorSimulation: true,
      supportsCamera: false,
      supportsMicrophone: false,
      supportsBatterySimulation: false,
    };
  }
}
```

---

#### 4.3 Media Service WebRTC Passthrough (4 天)

**Aliyun WebRTC Capture** (Go):
```go
// backend/media-service/internal/capture/aliyun_webrtc_capture.go

type AliyunWebRtcCapture struct {
    instanceId   string
    webrtcUrl    string
    webrtcToken  string
    tokenExpires time.Time
    peerConn     *webrtc.PeerConnection
    videoTrack   *webrtc.TrackRemote
    frameChannel chan *Frame
    logger       *logrus.Logger
}

func (c *AliyunWebRtcCapture) Start(ctx context.Context, options CaptureOptions) error {
    // 1. 创建 PeerConnection
    config := webrtc.Configuration{
        ICEServers: []webrtc.ICEServer{
            {URLs: []string{"stun:stun.l.google.com:19302"}},
        },
    }

    pc, err := webrtc.NewPeerConnection(config)
    if err != nil {
        return err
    }
    c.peerConn = pc

    // 2. 监听 Track (接收阿里云的视频流)
    pc.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
        if track.Kind() == webrtc.RTPCodecTypeVideo {
            c.videoTrack = track
            go c.readVideoTrack(track)
        }
    })

    // 3. 连接到阿里云 WebRTC 服务器
    err = c.connectToAliyun()
    if err != nil {
        return err
    }

    // 4. Token 刷新定时器
    go c.startTokenRefresh(ctx)

    return nil
}

func (c *AliyunWebRtcCapture) readVideoTrack(track *webrtc.TrackRemote) {
    for {
        // 读取 RTP 包
        rtp, _, err := track.ReadRTP()
        if err != nil {
            return
        }

        // 解析 H.264 NAL units
        frame := &Frame{
            Data:      rtp.Payload,
            Format:    FrameFormatH264,
            Timestamp: time.Now(),
        }

        select {
        case c.frameChannel <- frame:
        default:
            // 丢帧
        }
    }
}

func (c *AliyunWebRtcCapture) startTokenRefresh(ctx context.Context) {
    ticker := time.NewTicker(25 * time.Second) // Token 30秒有效,提前 5秒刷新
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            // 重新获取 Token 并重连
            newToken, err := c.refreshToken()
            if err != nil {
                c.logger.WithError(err).Error("Failed to refresh WebRTC token")
                continue
            }

            c.webrtcToken = newToken
            c.tokenExpires = time.Now().Add(30 * time.Second)

            // 重建 PeerConnection
            c.reconnect()
        }
    }
}
```

---

#### 4.4 前端和测试 (1 天)

**前端**:
- 创建设备页面添加 "阿里云手机" 选项
- 显示实例创建进度
- WebRTC 投屏集成

**测试**:
- 阿里云测试账号验证
- WebRTC Token 刷新机制
- 断网重连测试

---

## 📊 Phase 5: 监控优化 (Week 11)

### 目标

完善监控告警,性能优化,上线准备。

### 任务清单

#### 5.1 统一监控大盘 (2 天)

**Grafana Dashboard**:
- 设备池总览 (按提供商分组)
- 物理设备健康度热力图 (1000+ 台可视化)
- 设备分配成功率/延迟
- 成本监控 (云手机按小时)
- 投屏性能 (FPS, 延迟)

---

#### 5.2 告警规则完善 (1 天)

**Prometheus Alerts**:
```yaml
groups:
  - name: multi_provider
    rules:
      # 物理设备池告警 (已有)

      # 华为云手机告警
      - alert: HuaweiInstanceCreationSlow
        expr: histogram_quantile(0.95, provider_operation_duration_seconds{provider_type="huawei_cph",operation="create"}) > 300
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "华为云手机实例创建过慢 (P95 > 5分钟)"

      # 阿里云手机告警
      - alert: AliyunWebRtcTokenRefreshFailure
        expr: rate(aliyun_webrtc_token_refresh_failures_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "阿里云 WebRTC Token 刷新失败率 > 10%"

      # 跨提供商告警
      - alert: DeviceProviderDown
        expr: up{job="device-service"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Device Service 不可用,影响所有提供商"
```

---

#### 5.3 性能优化 (2 天)

**优化项**:
1. 数据库查询优化 (索引,连接池)
2. Redis 缓存 ConnectionInfo (减少 API 调用)
3. 设备池查询优化 (分片并发)
4. 前端虚拟滚动 (1000+ 设备列表)

---

#### 5.4 文档完善 (1 天)

**交付文档**:
- 部署指南 (Docker Compose / Kubernetes)
- 运维手册 (故障排查,扩容指南)
- API 文档 (Swagger)
- 开发者指南 (如何添加新提供商)

---

## 📦 交付清单

### 代码交付

#### Device Service

```
backend/device-service/
├── src/
│   ├── providers/
│   │   ├── provider.types.ts                  ✅ 已完成
│   │   ├── device-provider.interface.ts       ✅ 已完成
│   │   ├── device-provider.factory.ts         ⏳ Phase 1
│   │   ├── providers.module.ts                ⏳ Phase 1
│   │   ├── redroid/
│   │   │   ├── redroid.provider.ts            ⏳ Phase 1
│   │   │   └── redroid.module.ts              ⏳ Phase 1
│   │   ├── physical/
│   │   │   ├── physical-device.manager.ts     ⏳ Phase 2A
│   │   │   ├── physical.provider.ts           ⏳ Phase 2A
│   │   │   ├── scrcpy.service.ts              ⏳ Phase 2A
│   │   │   ├── sharded-pool.ts                ⏳ Phase 2B
│   │   │   ├── device-scheduler.ts            ⏳ Phase 2B
│   │   │   ├── device-discovery.ts            ⏳ Phase 2B
│   │   │   ├── health-scorer.ts               ⏳ Phase 2B
│   │   │   └── physical.module.ts             ⏳ Phase 2A
│   │   ├── huawei/
│   │   │   ├── huawei-cph.client.ts           ⏳ Phase 3
│   │   │   ├── huawei.provider.ts             ⏳ Phase 3
│   │   │   └── huawei.module.ts               ⏳ Phase 3
│   │   └── aliyun/
│   │       ├── aliyun-ecp.client.ts           ⏳ Phase 4
│   │       ├── aliyun.provider.ts             ⏳ Phase 4
│   │       └── aliyun.module.ts               ⏳ Phase 4
│   ├── entities/
│   │   └── device.entity.ts                   ⏳ Phase 1 (修改)
│   ├── devices/
│   │   ├── devices.service.ts                 ⏳ Phase 1 (修改)
│   │   ├── devices.controller.ts              ⏳ Phase 1 (修改)
│   │   └── dto/create-device.dto.ts           ⏳ Phase 1 (修改)
│   └── physical-devices/
│       ├── physical-devices.controller.ts     ⏳ Phase 2A
│       └── physical-devices.module.ts         ⏳ Phase 2A
└── migrations/
    └── xxx_add_provider_fields.sql            ⏳ Phase 1
```

#### Media Service

```
backend/media-service/internal/capture/
├── scrcpy_capture.go                          ⏳ Phase 2A
├── huawei_stream_capture.go                   ⏳ Phase 3
└── aliyun_webrtc_capture.go                   ⏳ Phase 4
```

#### Frontend

```
frontend/admin/src/
├── pages/Device/
│   ├── CreateDevice.tsx                       ⏳ Phase 1 (修改)
│   ├── DeviceList.tsx                         ⏳ Phase 1 (修改)
│   └── PhysicalDevicePool.tsx                 ⏳ Phase 2A (新增)
└── components/
    └── ProviderBadge.tsx                      ⏳ Phase 1 (新增)
```

---

### 文档交付

- ✅ `MULTI_DEVICE_PROVIDER_FINAL_PLAN.md` (本文档)
- ⏳ `DEPLOYMENT_GUIDE.md` - 部署指南
- ⏳ `OPERATION_MANUAL.md` - 运维手册
- ⏳ `DEVELOPER_GUIDE.md` - 开发者指南
- ⏳ `API_REFERENCE.md` - API 文档

---

### 测试交付

- ⏳ 单元测试 (覆盖率 >70%)
- ⏳ 集成测试 (E2E)
- ⏳ 性能测试报告 (1000+ 台设备)
- ⏳ 故障恢复测试

---

## 💰 成本估算

### 开发成本

| 阶段 | 工作量 | 开发人员 | 时间 |
|------|--------|---------|------|
| Phase 1: 基础架构 | 14 天 | 2 人 | 2 周 |
| Phase 2A: 物理设备基础 | 15 天 | 2 人 | 2 周 |
| Phase 2B: 物理设备大规模 | 12 天 | 2 人 | 2 周 |
| Phase 3: 华为云手机 | 12 天 | 2 人 | 2 周 |
| Phase 4: 阿里云手机 | 12 天 | 2 人 | 2 周 |
| Phase 5: 监控优化 | 6 天 | 2 人 | 1 周 |
| **总计** | **71 天** | **2-3 人** | **11 周** |

### 运营成本 (月度,1100 台设备)

| 设备源 | 数量 | 单价 | 月成本 | 备注 |
|-------|------|------|--------|------|
| **物理设备** | 1000 台 | ¥150/月 | ¥150,000 | 一次性投入 ¥3,000,000 |
| **Redroid** | 50 台 | ¥200/月 | ¥10,000 | 自有服务器 |
| **华为 CPH** | 25 台 | ¥1.5/小时 × 720h | ¥27,000 | 按需使用 |
| **阿里云 ECP** | 25 台 | ¥1.2/小时 × 720h | ¥21,600 | 按需使用 |
| **总成本** | 1100 台 | - | **¥208,600** | 平均 ¥189.6/台/月 |

**成本优化建议**:
- 物理设备占主力 (成本最低)
- 云手机用于弹性扩展和跨地域
- Redroid 用于开发测试

---

## 🎯 关键成功因素

### 技术风险

| 风险 | 缓解措施 |
|------|---------|
| 1000+ 台设备性能瓶颈 | 分片管理,并发优化,压测验证 |
| 物理设备网络不稳定 | 健康监控,自动剔除,故障恢复 |
| 云手机 API 限流 | 请求限流,失败重试,降级策略 |
| WebRTC Token 过期 | 提前刷新,自动重连 |
| 设备分配不均 | 智能调度,负载均衡 |

### 上线准备

**Phase 1 上线** (Week 2):
- ✅ 基础架构就绪
- ✅ Redroid 100% 兼容
- ⚠️ 仅内部测试

**Phase 2A 上线** (Week 4):
- ✅ 物理设备 10-100 台支持
- ✅ SCRCPY 投屏
- ⚠️ Beta 测试

**Phase 2B 上线** (Week 6):
- ✅ 1000+ 台物理设备支持
- ✅ 分片管理,智能调度
- ✅ 正式上线

**Phase 3/4 上线** (Week 10):
- ✅ 华为 + 阿里云手机支持
- ✅ 多云容灾
- ✅ 全球服务

---

## ❓ 待确认问题

**请尽快确认以下信息**:

1. **⏰ 上线时间要求**:
   - 第一版 (物理设备基础版) 何时上线?
   - 完整版 (四种设备源) 何时上线?

2. **📍 物理设备网络拓扑**:
   - 1000+ 台设备在同一局域网吗?
   - 还是分布在多个机房/地域?
   - 网络带宽和延迟情况?

3. **🏷️ 设备分组需求**:
   - 是否需要按型号、Android 版本、地域分组?
   - 用户是否可以指定设备?

4. **🔧 现有基础设施**:
   - 物理设备是否已配置网络 ADB?
   - 是否有现成的设备管理系统?
   - 是否需要我们提供设备接入指南?

5. **☁️ 云手机使用场景**:
   - 华为和阿里云主要用于哪些场景?
   - 预期并发数?
   - 成本预算?

---

## 📞 下一步行动

**确认后立即开始**:

1. 根据你的反馈调整方案细节
2. 确定 Phase 1 实施时间表
3. 继续 Phase 1 代码实现:
   - 数据库迁移
   - Redroid Provider 封装
   - DevicesService 重构

**当前状态**: 等待需求确认

**已完成**:
- ✅ Phase 1.1 核心接口定义 (100%)
- ✅ 方案文档完成

**等待你的回复! 🚀**
