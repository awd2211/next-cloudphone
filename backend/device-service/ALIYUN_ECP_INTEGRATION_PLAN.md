# 阿里云无影云手机（ECP）深度整合方案

## 📋 目录

1. [整合概述](#整合概述)
2. [架构设计](#架构设计)
3. [实现步骤](#实现步骤)
4. [API 映射](#api-映射)
5. [前端集成](#前端集成)
6. [配置管理](#配置管理)
7. [测试方案](#测试方案)

---

## 整合概述

### 目标

将阿里云无影云手机（ECP）作为新的设备提供商深度整合到现有云手机管理平台中，实现：

✅ **统一管理**：Docker Redroid 和阿里云 ECP 设备统一管理
✅ **无缝切换**：用户可选择不同提供商创建设备
✅ **统一体验**：相同的 API 接口和前端交互
✅ **成本优化**：根据场景选择最优提供商
✅ **扩展性强**：为未来接入更多云手机提供商奠定基础

### 核心优势

| 对比项 | Docker Redroid | 阿里云 ECP |
|--------|----------------|-----------|
| **部署方式** | 本地容器 | 云端实例 |
| **资源弹性** | 受限于本地硬件 | 无限扩展 |
| **地理分布** | 单一节点 | 全球多区域 |
| **网络质量** | 依赖本地网络 | 阿里云 BGP |
| **运维成本** | 需要自维护 | 托管服务 |
| **成本模式** | 固定硬件成本 | 按需付费 |

---

## 架构设计

### 核心组件

```
backend/device-service/
├── src/
│   ├── providers/
│   │   ├── aliyun/                           # 🆕 阿里云提供商
│   │   │   ├── aliyun-device.provider.ts     # 设备提供商实现
│   │   │   ├── aliyun-ecp.service.ts         # ECP SDK 封装
│   │   │   ├── aliyun-websdk.service.ts      # Web SDK 集成
│   │   │   ├── aliyun-config.interface.ts    # 配置接口
│   │   │   └── dto/                          # DTO 定义
│   │   │       ├── create-ecp-device.dto.ts
│   │   │       ├── ecp-instance.dto.ts
│   │   │       └── ecp-ticket.dto.ts
│   │   ├── docker/                           # 现有 Docker 提供商
│   │   └── device-provider.interface.ts      # 统一接口
│   ├── entities/
│   │   └── device.entity.ts                  # 扩展支持 aliyun 类型
│   └── devices/
│       └── devices.service.ts                # 支持多提供商
```

### 数据模型扩展

```typescript
// Device Entity 扩展
export enum DeviceProviderType {
  DOCKER = 'docker',      // 现有
  ALIYUN = 'aliyun',      // 🆕 阿里云 ECP
}

// 新增阿里云特定字段
export class Device {
  // ... 现有字段

  // 阿里云 ECP 特定字段
  @Column({ nullable: true, comment: '阿里云实例组 ID' })
  aliyunInstanceGroupId?: string;

  @Column({ nullable: true, comment: '阿里云实例 ID' })
  aliyunInstanceId?: string;

  @Column({ nullable: true, comment: '阿里云地域 ID' })
  aliyunRegionId?: string;

  @Column({ nullable: true, comment: '阿里云规格类型' })
  aliyunInstanceSpec?: string;

  @Column({ type: 'jsonb', nullable: true, comment: '阿里云连接信息' })
  aliyunConnectionInfo?: {
    adbHost?: string;
    adbPort?: number;
    webStreamUrl?: string;
    sessionTicket?: string;
  };

  @Column({ type: 'jsonb', nullable: true, comment: '阿里云元数据' })
  aliyunMetadata?: Record<string, any>;
}
```

---

## 实现步骤

### Phase 1: 后端基础设施（3-4 天）

#### 1.1 安装阿里云 SDK

```bash
cd backend/device-service
pnpm add @alicloud/eds-aic20230930 @alicloud/openapi-client
```

#### 1.2 创建 Aliyun ECP Service

```typescript
// src/providers/aliyun/aliyun-ecp.service.ts

import * as EdsAic from '@alicloud/eds-aic20230930';
import * as OpenApi from '@alicloud/openapi-client';

@Injectable()
export class AliyunEcpService {
  private client: EdsAic.default;

  constructor(
    private configService: ConfigService,
    private logger: Logger,
  ) {
    this.initializeClient();
  }

  private initializeClient() {
    const config = new OpenApi.Config({
      accessKeyId: this.configService.get('ALIYUN_ACCESS_KEY_ID'),
      accessKeySecret: this.configService.get('ALIYUN_ACCESS_KEY_SECRET'),
      endpoint: 'eds-aic.aliyuncs.com',
    });
    this.client = new EdsAic.default(config);
  }

  // 创建实例组
  async createInstanceGroup(params: CreateInstanceGroupDto): Promise<CreateInstanceGroupResponse> {
    const request = new EdsAic.CreateAndroidInstanceGroupRequest({
      bizRegionId: params.regionId,
      instanceGroupSpec: params.spec,
      imageId: params.imageId,
      instanceGroupName: params.name,
      chargeType: params.chargeType || 'PostPaid',
      amount: params.amount || 1,
      autoRenew: params.autoRenew || false,
      period: params.period,
      periodUnit: params.periodUnit,
    });

    const response = await this.client.createAndroidInstanceGroup(request);
    this.logger.log(`Created instance group: ${response.body.instanceGroupIds}`);
    return response.body;
  }

  // 启动实例
  async startInstance(instanceIds: string[]): Promise<void> {
    const request = new EdsAic.StartAndroidInstanceRequest({
      androidInstanceIds: instanceIds,
    });
    await this.client.startAndroidInstance(request);
    this.logger.log(`Started instances: ${instanceIds.join(', ')}`);
  }

  // 停止实例
  async stopInstance(instanceIds: string[], force?: boolean): Promise<void> {
    const request = new EdsAic.StopAndroidInstanceRequest({
      androidInstanceIds: instanceIds,
      forceStop: force,
    });
    await this.client.stopAndroidInstance(request);
    this.logger.log(`Stopped instances: ${instanceIds.join(', ')}`);
  }

  // 查询实例详情
  async describeInstances(instanceIds: string[]): Promise<DescribeInstancesResponse> {
    const request = new EdsAic.DescribeAndroidInstancesRequest({
      androidInstanceIds: instanceIds.join(','),
    });
    const response = await this.client.describeAndroidInstances(request);
    return response.body;
  }

  // 安装应用
  async installApp(params: InstallAppDto): Promise<string> {
    const request = new EdsAic.InstallAppRequest({
      appIdList: params.appIds,
      instanceGroupIdList: params.instanceGroupIds,
      instanceIdList: params.instanceIds,
    });
    const response = await this.client.installApp(request);
    return response.body.taskId; // 返回异步任务 ID
  }

  // 卸载应用
  async uninstallApp(params: UninstallAppDto): Promise<string> {
    const request = new EdsAic.UninstallAppRequest({
      appIdList: params.appIds,
      instanceGroupIdList: params.instanceGroupIds,
      instanceIdList: params.instanceIds,
    });
    const response = await this.client.uninstallApp(request);
    return response.body.taskId;
  }

  // 执行远程命令
  async runCommand(params: RunCommandDto): Promise<RunCommandResponse> {
    const request = new EdsAic.RunCommandRequest({
      instanceIds: params.instanceIds,
      commandContent: params.command,
      timeout: params.timeout || 60,
      contentEncoding: params.encoding || 'PlainText',
    });
    const response = await this.client.runCommand(request);
    return {
      invokeId: response.body.invokeId,
      instanceInvocations: response.body.runCommandInfos,
    };
  }

  // 查询命令执行结果
  async describeInvocations(invokeId: string): Promise<InvocationResult[]> {
    const request = new EdsAic.DescribeInvocationsRequest({
      invokeId,
    });
    const response = await this.client.describeInvocations(request);
    return response.body.invocations;
  }

  // 创建自定义镜像
  async createCustomImage(params: CreateImageDto): Promise<string> {
    const request = new EdsAic.CreateCustomImageRequest({
      sourceInstanceId: params.sourceInstanceId,
      imageName: params.name,
      description: params.description,
    });
    const response = await this.client.createCustomImage(request);
    return response.body.imageId;
  }

  // 删除实例
  async deleteInstances(instanceIds: string[], force?: boolean): Promise<void> {
    const request = new EdsAic.DeleteAndroidInstancesRequest({
      androidInstanceIds: instanceIds,
      forceDelete: force,
    });
    await this.client.deleteAndroidInstances(request);
    this.logger.log(`Deleted instances: ${instanceIds.join(', ')}`);
  }
}
```

#### 1.3 创建 Aliyun Device Provider

```typescript
// src/providers/aliyun/aliyun-device.provider.ts

import { IDeviceProvider } from '../device-provider.interface';

@Injectable()
export class AliyunDeviceProvider implements IDeviceProvider {
  constructor(
    private ecpService: AliyunEcpService,
    private webSdkService: AliyunWebSdkService,
    private logger: Logger,
  ) {}

  async create(config: DeviceCreateConfig): Promise<Device> {
    this.logger.log(`Creating Aliyun ECP device: ${config.name}`);

    // 1. 创建实例组（包含实例）
    const result = await this.ecpService.createInstanceGroup({
      regionId: config.aliyun.regionId || 'cn-hangzhou',
      spec: config.aliyun.spec || 'acp.basic.small',
      imageId: config.aliyun.imageId,
      name: config.name,
      chargeType: config.aliyun.chargeType || 'PostPaid',
      amount: 1,
    });

    const instanceGroupId = result.instanceGroupInfos[0].instanceGroupId;
    const instanceId = result.instanceGroupInfos[0].instanceIds[0];

    // 2. 等待实例启动
    await this.waitForInstanceRunning(instanceId);

    // 3. 获取实例详情
    const instanceDetails = await this.ecpService.describeInstances([instanceId]);
    const instance = instanceDetails.instanceModel[0];

    // 4. 构建设备对象
    const device: Partial<Device> = {
      name: config.name,
      userId: config.userId,
      providerType: DeviceProviderType.ALIYUN,
      providerDeviceId: instanceId,
      status: DeviceStatus.RUNNING,
      aliyunInstanceGroupId: instanceGroupId,
      aliyunInstanceId: instanceId,
      aliyunRegionId: config.aliyun.regionId,
      aliyunInstanceSpec: config.aliyun.spec,
      aliyunConnectionInfo: {
        adbHost: instance.networkInterfaceIp,
        adbPort: instance.adbPort || 5555,
      },
      aliyunMetadata: {
        orderId: result.orderId,
        createdAt: new Date().toISOString(),
      },
    };

    return device as Device;
  }

  async start(device: Device): Promise<void> {
    await this.ecpService.startInstance([device.aliyunInstanceId]);
    await this.waitForInstanceRunning(device.aliyunInstanceId);
  }

  async stop(device: Device, force?: boolean): Promise<void> {
    await this.ecpService.stopInstance([device.aliyunInstanceId], force);
  }

  async delete(device: Device, force?: boolean): Promise<void> {
    await this.ecpService.deleteInstances([device.aliyunInstanceId], force);
  }

  async getStatus(device: Device): Promise<DeviceProviderStatus> {
    const instances = await this.ecpService.describeInstances([device.aliyunInstanceId]);
    const instance = instances.instanceModel[0];

    return {
      status: this.mapAliyunStatus(instance.status),
      message: instance.errorMessage,
      networkInfo: {
        ip: instance.networkInterfaceIp,
        adbPort: instance.adbPort,
      },
    };
  }

  async getMetrics(device: Device): Promise<DeviceMetrics> {
    // 阿里云提供的监控指标
    const instances = await this.ecpService.describeInstances([device.aliyunInstanceId]);
    const instance = instances.instanceModel[0];

    return {
      cpuUsage: instance.cpuPercent || 0,
      memoryUsage: instance.memPercent || 0,
      diskUsage: 0, // 阿里云可能没有提供
      networkRx: 0,
      networkTx: 0,
    };
  }

  async installApp(device: Device, appPath: string, packageName: string): Promise<void> {
    // 阿里云需要先通过 CreateApp 创建应用
    // 然后通过 InstallApp 安装
    // 这里需要实现应用上传和安装逻辑
    throw new Error('Not implemented yet - requires CreateApp + InstallApp');
  }

  async uninstallApp(device: Device, packageName: string): Promise<void> {
    // 类似 installApp，需要先查询 appId
    throw new Error('Not implemented yet');
  }

  async executeCommand(device: Device, command: string): Promise<string> {
    const result = await this.ecpService.runCommand({
      instanceIds: [device.aliyunInstanceId],
      command,
      timeout: 60,
    });

    // 等待命令执行完成
    await this.waitForCommandCompletion(result.invokeId);

    // 获取执行结果
    const invocations = await this.ecpService.describeInvocations(result.invokeId);
    return invocations[0]?.output || '';
  }

  // 获取 Web SDK 连接票据
  async getWebSdkTicket(device: Device, userId: string): Promise<string> {
    return this.webSdkService.getConnectionTicket({
      instanceId: device.aliyunInstanceId,
      userId,
      regionId: device.aliyunRegionId,
    });
  }

  // 辅助方法
  private async waitForInstanceRunning(instanceId: string, timeout = 120000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const instances = await this.ecpService.describeInstances([instanceId]);
      const status = instances.instanceModel[0]?.status;

      if (status === 'Running') {
        return;
      }

      if (status === 'Stopped' || status === 'Failed') {
        throw new Error(`Instance failed to start: ${status}`);
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // 等待 5 秒
    }

    throw new Error('Timeout waiting for instance to start');
  }

  private async waitForCommandCompletion(invokeId: string, timeout = 60000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const invocations = await this.ecpService.describeInvocations(invokeId);
      const status = invocations[0]?.invocationStatus;

      if (status === 'Finished' || status === 'Failed') {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Timeout waiting for command completion');
  }

  private mapAliyunStatus(aliyunStatus: string): DeviceStatus {
    const statusMap: Record<string, DeviceStatus> = {
      'Running': DeviceStatus.RUNNING,
      'Stopped': DeviceStatus.STOPPED,
      'Starting': DeviceStatus.STARTING,
      'Stopping': DeviceStatus.STOPPING,
      'Failed': DeviceStatus.ERROR,
      'Deleted': DeviceStatus.DELETED,
    };
    return statusMap[aliyunStatus] || DeviceStatus.UNKNOWN;
  }
}
```

#### 1.4 注册到 DeviceProviderFactory

```typescript
// src/providers/device-provider.factory.ts

@Injectable()
export class DeviceProviderFactory {
  constructor(
    @Inject(forwardRef(() => DockerService)) private dockerService: DockerService,
    @Inject(forwardRef(() => AdbService)) private adbService: AdbService,
    @Inject(forwardRef(() => AliyunEcpService)) private aliyunEcpService: AliyunEcpService,
    @Inject(forwardRef(() => AliyunWebSdkService)) private aliyunWebSdkService: AliyunWebSdkService,
    private logger: Logger,
  ) {}

  getProvider(providerType: DeviceProviderType): IDeviceProvider {
    switch (providerType) {
      case DeviceProviderType.DOCKER:
        return new DockerDeviceProvider(this.dockerService, this.adbService, this.logger);

      case DeviceProviderType.ALIYUN:
        return new AliyunDeviceProvider(
          this.aliyunEcpService,
          this.aliyunWebSdkService,
          this.logger,
        );

      default:
        throw new Error(`Unsupported provider type: ${providerType}`);
    }
  }
}
```

### Phase 2: Web SDK 集成（2-3 天）

#### 2.1 创建 Web SDK 服务

```typescript
// src/providers/aliyun/aliyun-websdk.service.ts

@Injectable()
export class AliyunWebSdkService {
  constructor(
    private configService: ConfigService,
    private httpClientService: HttpClientService,
    private logger: Logger,
  ) {}

  /**
   * 获取连接票据（Ticket）
   * Web SDK 需要票据来建立连接
   */
  async getConnectionTicket(params: {
    instanceId: string;
    userId: string;
    regionId: string;
  }): Promise<string> {
    // 方案 1: 使用阿里云 OpenAPI 获取票据
    // 需要调用 CreateConnectionTicket API

    // 方案 2: 如果有便携账号系统，使用 LoginToken
    // 这需要先在阿里云控制台配置便携账号

    // 这里假设使用 Ticket 方式
    const ticket = await this.createTicket(params);
    return ticket;
  }

  private async createTicket(params: {
    instanceId: string;
    userId: string;
    regionId: string;
  }): Promise<string> {
    // 调用阿里云 API 创建票据
    // 注意：这个 API 可能需要在阿里云文档中查找具体实现
    this.logger.log(`Creating connection ticket for instance ${params.instanceId}`);

    // TODO: 实现票据创建逻辑
    // 可能需要：
    // 1. 调用 GetConnectionTicket API
    // 2. 或使用便携账号的 LoginToken

    return 'placeholder-ticket';
  }

  /**
   * 生成 Web SDK 配置
   */
  generateWebSdkConfig(params: {
    instanceId: string;
    ticket: string;
    regionId: string;
  }): AliyunWebSdkConfig {
    return {
      openType: 'inline', // 内嵌模式
      connectType: 'app', // 云手机类型
      resourceType: 'local',
      regionId: params.regionId,
      userInfo: {
        ticket: params.ticket,
      },
      appInfo: {
        osType: 'Android',
        appId: params.instanceId, // PersistentAppInstanceId
        loginRegionId: params.regionId,
      },
    };
  }
}

// 配置接口
export interface AliyunWebSdkConfig {
  openType: 'inline' | 'newTab' | 'urlScheme';
  connectType: 'app';
  resourceType: 'local';
  regionId: string;
  userInfo: {
    ticket?: string;
    authCode?: string;
    loginToken?: string;
  };
  appInfo: {
    osType: 'Android';
    appId: string;
    loginRegionId: string;
  };
}
```

#### 2.2 添加 API 端点

```typescript
// src/devices/devices.controller.ts

@Controller('devices')
export class DevicesController {
  // ... 现有方法

  /**
   * 获取阿里云设备的 Web SDK 连接配置
   */
  @Get(':id/aliyun/websdk-config')
  @UseGuards(JwtAuthGuard)
  async getAliyunWebSdkConfig(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<AliyunWebSdkConfig> {
    const device = await this.devicesService.findOne(id);

    if (device.providerType !== DeviceProviderType.ALIYUN) {
      throw new BadRequestException('Device is not an Aliyun ECP instance');
    }

    const userId = req.user['sub'];
    const provider = this.providerFactory.getProvider(DeviceProviderType.ALIYUN) as AliyunDeviceProvider;

    // 获取票据
    const ticket = await provider.getWebSdkTicket(device, userId);

    // 生成配置
    const config = this.aliyunWebSdkService.generateWebSdkConfig({
      instanceId: device.aliyunInstanceId,
      ticket,
      regionId: device.aliyunRegionId,
    });

    return config;
  }
}
```

### Phase 3: 前端集成（3-4 天）

#### 3.1 安装阿里云 Web SDK

```bash
cd frontend/admin

# 方案 1: 使用 CDN（推荐）
# 在 public/index.html 添加：
<script src="https://g.alicdn.com/aliyun-ecp/websdk/latest/aliyun-ecp-websdk.js"></script>

# 方案 2: 下载到本地
# 下载 Web SDK 到 public/libs/
```

#### 3.2 创建阿里云播放器组件

```typescript
// frontend/admin/src/components/AliyunCloudPhonePlayer.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Spin, message } from 'antd';
import { getAliyunWebSdkConfig } from '@/services/device';

interface AliyunCloudPhonePlayerProps {
  deviceId: string;
  width?: number;
  height?: number;
}

declare global {
  interface Window {
    wuyingSdk: any;
  }
}

export const AliyunCloudPhonePlayer: React.FC<AliyunCloudPhonePlayerProps> = ({
  deviceId,
  width = 375,
  height = 667,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initPlayer = async () => {
      try {
        setLoading(true);

        // 1. 检查 SDK 是否加载
        if (!window.wuyingSdk) {
          throw new Error('Aliyun Web SDK not loaded');
        }

        // 2. 获取连接配置
        const config = await getAliyunWebSdkConfig(deviceId);

        if (!mounted) return;

        // 3. 创建会话
        const session = window.wuyingSdk.createSession('appstream', config);
        sessionRef.current = session;

        // 4. 设置事件监听
        session.addHandle('onConnected', (data: any) => {
          console.log('Connected to Aliyun ECP:', data);
          setLoading(false);
          message.success('Connected to cloud phone');
        });

        session.addHandle('onDisConnected', (data: any) => {
          console.log('Disconnected from Aliyun ECP:', data);
          message.warning('Disconnected from cloud phone');
        });

        session.addHandle('onError', (error: any) => {
          console.error('Aliyun ECP error:', error);
          setError(error.message || 'Connection error');
          setLoading(false);
        });

        // 5. 启动连接
        await session.start();

      } catch (err: any) {
        console.error('Failed to initialize Aliyun player:', err);
        setError(err.message || 'Initialization failed');
        setLoading(false);
      }
    };

    initPlayer();

    // 清理函数
    return () => {
      mounted = false;
      if (sessionRef.current) {
        sessionRef.current.stop();
        sessionRef.current = null;
      }
    };
  }, [deviceId]);

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        position: 'relative',
        background: '#000',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}>
          <Spin size="large" tip="Connecting to cloud phone..." />
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#fff',
          textAlign: 'center',
        }}>
          <p>❌ {error}</p>
        </div>
      )}

      {/* SDK 会自动注入视频流到这个容器 */}
    </div>
  );
};
```

#### 3.3 集成到设备详情页

```typescript
// frontend/admin/src/pages/Device/DeviceDetail.tsx

import { AliyunCloudPhonePlayer } from '@/components/AliyunCloudPhonePlayer';
import { ScrcpyPlayer } from '@/components/ScrcpyPlayer'; // 现有 Docker 播放器

export const DeviceDetail: React.FC = () => {
  const { id } = useParams();
  const { data: device, loading } = useDevice(id);

  if (loading) return <Spin />;

  return (
    <div>
      <h1>{device.name}</h1>

      {/* 根据设备类型显示不同播放器 */}
      {device.providerType === 'aliyun' ? (
        <AliyunCloudPhonePlayer deviceId={device.id} />
      ) : (
        <ScrcpyPlayer deviceId={device.id} />
      )}

      {/* 其他设备信息 */}
    </div>
  );
};
```

### Phase 4: 配置管理（1-2 天）

#### 4.1 环境变量配置

```bash
# backend/device-service/.env

# 阿里云 Access Key（从阿里云控制台获取）
ALIYUN_ACCESS_KEY_ID=LTAI5tXXXXXXXXXXXXXX
ALIYUN_ACCESS_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx

# 阿里云区域配置
ALIYUN_DEFAULT_REGION=cn-hangzhou
ALIYUN_AVAILABLE_REGIONS=cn-hangzhou,cn-shanghai,cn-beijing,cn-shenzhen

# 阿里云 ECP 配置
ALIYUN_DEFAULT_INSTANCE_SPEC=acp.basic.small
ALIYUN_DEFAULT_IMAGE_ID=img-xxxxxxxxxxxx
ALIYUN_CHARGE_TYPE=PostPaid  # PostPaid | PrePaid

# 阿里云 Web SDK
ALIYUN_WEBSDK_URL=https://g.alicdn.com/aliyun-ecp/websdk/latest/aliyun-ecp-websdk.js
```

#### 4.2 数据库迁移

```sql
-- database/migrations/add_aliyun_fields_to_devices.sql

ALTER TABLE devices
  ADD COLUMN aliyun_instance_group_id VARCHAR(255),
  ADD COLUMN aliyun_instance_id VARCHAR(255),
  ADD COLUMN aliyun_region_id VARCHAR(50),
  ADD COLUMN aliyun_instance_spec VARCHAR(50),
  ADD COLUMN aliyun_connection_info JSONB,
  ADD COLUMN aliyun_metadata JSONB;

-- 添加索引
CREATE INDEX idx_devices_aliyun_instance_id ON devices(aliyun_instance_id);
CREATE INDEX idx_devices_aliyun_region_id ON devices(aliyun_region_id);
```

#### 4.3 配置管理界面

在管理后台添加阿里云配置页面：

```
路径: /settings/providers/aliyun

表单字段:
- Access Key ID
- Access Key Secret
- 默认区域
- 默认实例规格
- 默认镜像 ID
- 计费类型（按量付费/包年包月）
```

---

## API 映射

### 设备生命周期管理

| 操作 | 现有平台 | 阿里云 ECP API | 备注 |
|------|---------|---------------|------|
| 创建设备 | POST /devices | CreateAndroidInstanceGroup | 创建实例组和实例 |
| 启动设备 | POST /devices/:id/start | StartAndroidInstance | 启动云手机实例 |
| 停止设备 | POST /devices/:id/stop | StopAndroidInstance | 停止云手机实例 |
| 重启设备 | POST /devices/:id/reboot | RebootAndroidInstance | 重启云手机实例 |
| 删除设备 | DELETE /devices/:id | DeleteAndroidInstances | 删除云手机实例 |
| 查询设备 | GET /devices/:id | DescribeAndroidInstances | 查询实例详情 |
| 重置设备 | POST /devices/:id/reset | ResetAndroidInstance | 重置到初始状态 |

### 应用管理

| 操作 | 现有平台 | 阿里云 ECP API | 备注 |
|------|---------|---------------|------|
| 安装应用 | POST /devices/:id/apps | CreateApp + InstallApp | 两步：创建应用 + 安装 |
| 卸载应用 | DELETE /devices/:id/apps/:pkg | UninstallApp | 从实例卸载应用 |
| 查询应用 | GET /devices/:id/apps | DescribeApps | 查询已安装应用 |
| 打开应用 | POST /devices/:id/apps/:pkg/open | OpenApp | 启动应用 |
| 关闭应用 | POST /devices/:id/apps/:pkg/close | CloseApp | 关闭应用 |

### 远程控制

| 操作 | 现有平台 | 阿里云 ECP API | 备注 |
|------|---------|---------------|------|
| 执行命令 | POST /devices/:id/execute | RunCommand | 执行 ADB 命令 |
| 查询结果 | GET /devices/:id/invocations/:id | DescribeInvocations | 查询命令执行结果 |
| 上传文件 | POST /devices/:id/files/upload | UploadFile | 通过 OSS 上传 |
| 下载文件 | GET /devices/:id/files/download | DownloadFile | 通过 OSS 下载 |
| 截图 | POST /devices/:id/screenshot | CreateScreenshot | 获取屏幕截图 |

### 镜像管理

| 操作 | 现有平台 | 阿里云 ECP API | 备注 |
|------|---------|---------------|------|
| 创建镜像 | POST /images | CreateCustomImage | 从实例创建镜像 |
| 查询镜像 | GET /images | DescribeImages | 查询自定义镜像 |
| 删除镜像 | DELETE /images/:id | DeleteImages | 删除自定义镜像 |
| 分发镜像 | POST /images/:id/distribute | DistributeImage | 跨区域复制镜像 |

---

## 前端集成

### Web SDK 功能集成

#### 基础连接

```typescript
// 1. 初始化 SDK
const wuyingSdk = window.wuyingSdk;

// 2. 创建会话
const session = wuyingSdk.createSession('appstream', {
  openType: 'inline',
  connectType: 'app',
  resourceType: 'local',
  userInfo: {
    ticket: '<从后端获取的票据>',
  },
  appInfo: {
    osType: 'Android',
    appId: '<实例 ID>',
    loginRegionId: '<区域 ID>',
  },
});

// 3. 监听事件
session.addHandle('onConnected', (data) => {
  console.log('Connected:', data);
});

// 4. 启动连接
await session.start();
```

#### 高级功能

```typescript
// 控制输入
session.setInputEnabled(true); // 启用/禁用输入

// UI 配置
session.setUiParams({
  showToolbar: true,      // 显示工具栏
  showRotateBtn: true,    // 显示旋转按钮
  showFullScreenBtn: true, // 显示全屏按钮
});

// 自定义数据通道
session.dataChannel.send('custom-message', { data: 'value' });
session.dataChannel.on('custom-response', (data) => {
  console.log('Received:', data);
});

// 断开连接
session.stop();
```

---

## 配置管理

### 提供商配置表

在数据库中添加提供商配置表：

```sql
CREATE TABLE device_provider_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(255) NOT NULL,
  provider_type VARCHAR(50) NOT NULL,
  provider_name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 阿里云配置示例
INSERT INTO device_provider_configs (tenant_id, provider_type, provider_name, config) VALUES
('default', 'aliyun', 'Aliyun ECP (Hangzhou)', '{
  "accessKeyId": "LTAI5tXXXXXXXXXXXXXX",
  "accessKeySecret": "xxxxxxxxxxxxxxxxxx",
  "regionId": "cn-hangzhou",
  "defaultSpec": "acp.basic.small",
  "defaultImageId": "img-xxxxxxxxxxxx",
  "chargeType": "PostPaid",
  "quotas": {
    "maxInstances": 100,
    "maxCpuCores": 200,
    "maxMemoryGB": 400
  }
}');
```

### 多租户配置

每个租户可以配置自己的阿里云账号：

```typescript
// 获取租户的阿里云配置
async getTenantAliyunConfig(tenantId: string): Promise<AliyunConfig> {
  const config = await this.configRepository.findOne({
    where: {
      tenantId,
      providerType: 'aliyun',
      isEnabled: true,
    },
  });

  return config.config;
}
```

---

## 测试方案

### 单元测试

```typescript
// aliyun-device.provider.spec.ts

describe('AliyunDeviceProvider', () => {
  let provider: AliyunDeviceProvider;
  let ecpService: AliyunEcpService;

  beforeEach(() => {
    // Mock services
    ecpService = {
      createInstanceGroup: jest.fn(),
      startInstance: jest.fn(),
      stopInstance: jest.fn(),
      // ...
    } as any;

    provider = new AliyunDeviceProvider(ecpService, null, null);
  });

  it('should create device successfully', async () => {
    const mockResult = {
      instanceGroupInfos: [{
        instanceGroupId: 'ig-xxx',
        instanceIds: ['ai-xxx'],
      }],
    };

    jest.spyOn(ecpService, 'createInstanceGroup').mockResolvedValue(mockResult);

    const device = await provider.create({
      name: 'Test Device',
      userId: 'user-123',
      aliyun: {
        regionId: 'cn-hangzhou',
        spec: 'acp.basic.small',
        imageId: 'img-xxx',
      },
    });

    expect(device.aliyunInstanceId).toBe('ai-xxx');
    expect(device.providerType).toBe(DeviceProviderType.ALIYUN);
  });
});
```

### 集成测试

```bash
#!/bin/bash
# test-aliyun-integration.sh

TOKEN="your-jwt-token"
API_BASE="http://localhost:30000"

echo "=== Testing Aliyun ECP Integration ==="

# 1. 创建阿里云设备
echo "1. Creating Aliyun device..."
DEVICE_RESPONSE=$(curl -s "$API_BASE/devices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Aliyun Device",
    "providerType": "aliyun",
    "aliyun": {
      "regionId": "cn-hangzhou",
      "spec": "acp.basic.small",
      "imageId": "img-xxxxxxxxxxxx"
    }
  }')

DEVICE_ID=$(echo $DEVICE_RESPONSE | jq -r '.id')
echo "Created device: $DEVICE_ID"

# 2. 获取设备状态
echo "2. Getting device status..."
curl -s "$API_BASE/devices/$DEVICE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. 获取 Web SDK 配置
echo "3. Getting Web SDK config..."
curl -s "$API_BASE/devices/$DEVICE_ID/aliyun/websdk-config" \
  -H "Authorization: Bearer $TOKEN" | jq

# 4. 执行命令
echo "4. Executing command..."
curl -s "$API_BASE/devices/$DEVICE_ID/execute" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"command": "getprop ro.build.version.release"}' | jq

echo "=== Test Complete ==="
```

---

## 进度跟踪

### 开发里程碑

| Phase | 任务 | 预计时间 | 状态 |
|-------|------|---------|------|
| Phase 1 | 后端基础设施 | 3-4 天 | ⏳ 待开始 |
| ├─ | 安装阿里云 SDK | 0.5 天 | ⏳ |
| ├─ | 实现 AliyunEcpService | 1 天 | ⏳ |
| ├─ | 实现 AliyunDeviceProvider | 1.5 天 | ⏳ |
| └─ | 注册到 Factory | 0.5 天 | ⏳ |
| Phase 2 | Web SDK 集成 | 2-3 天 | ⏳ 待开始 |
| ├─ | 实现 Web SDK 服务 | 1 天 | ⏳ |
| ├─ | 添加 API 端点 | 0.5 天 | ⏳ |
| └─ | 票据认证逻辑 | 1 天 | ⏳ |
| Phase 3 | 前端集成 | 3-4 天 | ⏳ 待开始 |
| ├─ | 安装 Web SDK | 0.5 天 | ⏳ |
| ├─ | 实现播放器组件 | 2 天 | ⏳ |
| └─ | 集成到设备页面 | 1 天 | ⏳ |
| Phase 4 | 配置管理 | 1-2 天 | ⏳ 待开始 |
| ├─ | 环境变量配置 | 0.5 天 | ⏳ |
| ├─ | 数据库迁移 | 0.5 天 | ⏳ |
| └─ | 配置管理界面 | 1 天 | ⏳ |
| **总计** | | **9-13 天** | ⏳ |

---

## 注意事项

### 成本控制

1. **按量付费模式**：建议开发测试环境使用按量付费，避免长期闲置
2. **实例规格选择**：根据实际需求选择合适规格，避免过度配置
3. **及时释放资源**：不使用的实例及时删除
4. **设置配额限制**：在平台层面限制每个租户的实例数量

### 安全考虑

1. **AccessKey 管理**：
   - 使用 RAM 子账号而非主账号
   - 最小权限原则
   - 定期轮换密钥
   - 加密存储在数据库中

2. **网络隔离**：
   - 使用 VPC 网络隔离不同租户的实例
   - 配置安全组规则
   - ADB 端口仅在需要时开放

3. **数据安全**：
   - 敏感数据传输使用 HTTPS
   - Web SDK 票据设置短期有效期
   - 实例删除时确保数据清除

### 性能优化

1. **连接池管理**：复用阿里云 SDK 客户端
2. **缓存策略**：缓存实例状态、镜像列表等
3. **批量操作**：尽可能使用批量 API
4. **异步处理**：创建/删除实例使用异步任务

---

## 参考资源

### 官方文档

- [阿里云无影云手机产品文档](https://help.aliyun.com/zh/ecp/)
- [API 概览](https://help.aliyun.com/zh/ecp/api-eds-aic-2023-09-30-overview)
- [Web SDK 集成文档](https://help.aliyun.com/zh/ecp/web-sdk-of-cloudphone)
- [管理 SDK 文档](https://help.aliyun.com/zh/ecp/cloud-phone-management-sdk)
- [OpenAPI 开发者门户](https://next.api.aliyun.com/)

### 代码示例

- [TypeScript SDK (GitHub)](https://github.com/aliyun/alibabacloud-typescript-sdk)
- [Web SDK Demo](需要从阿里云下载)

---

## 下一步行动

1. ✅ **Review 本文档**：确认整合方案符合需求
2. ⏳ **获取阿里云账号**：申请 AccessKey 和测试资源
3. ⏳ **开始 Phase 1**：实现后端基础设施
4. ⏳ **并行开发前端**：可以与后端同步进行
5. ⏳ **集成测试**：Phase 完成后进行端到端测试
6. ⏳ **生产部署**：测试通过后部署到生产环境

---

**Created**: 2025-11-24
**Version**: 1.0.0
**Author**: Claude Code AI
