/**
 * AliyunProviderV2 - 阿里云无影云手机 ECP Provider (2023-09-30 API)
 *
 * 使用新版官方SDK，支持实例组模式
 *
 * 新版API核心变化：
 * 1. 实例组模式：创建实例组会自动创建实例
 * 2. 完整的ADB支持：可以开启/关闭ADB连接
 * 3. 密钥对管理：支持创建和绑定密钥对
 * 4. 监控指标：可获取CPU/内存等实时监控数据
 * 5. 截图功能：支持异步截图
 *
 * 参考文档：
 * - https://help.aliyun.com/zh/ecp/api-eds-aic-2023-09-30-overview
 */

import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotImplementedException,
} from '@nestjs/common';
import { IDeviceProvider } from '../device-provider.interface';
import {
  DeviceProviderType,
  DeviceProviderStatus,
  DeviceCreateConfig,
  ProviderDevice,
  ConnectionInfo,
  DeviceProperties,
  DeviceMetrics,
  DeviceCapabilities,
  TouchEvent,
  SwipeEvent,
  KeyEvent,
  TextInput,
  FileTransferOptions,
  AppInstallOptions,
  CaptureFormat,
  DeviceSnapshot,
} from '../provider.types';
import { AliyunEcpV2Client, InstanceInfo } from './aliyun-ecp-v2.client';

/**
 * 阿里云实例状态映射
 */
const ALIYUN_STATUS_MAP: Record<string, DeviceProviderStatus> = {
  CREATING: DeviceProviderStatus.CREATING,
  STARTING: DeviceProviderStatus.CREATING,
  RUNNING: DeviceProviderStatus.RUNNING,
  STOPPING: DeviceProviderStatus.STOPPED,
  STOPPED: DeviceProviderStatus.STOPPED,
  DELETING: DeviceProviderStatus.DESTROYING,
  ERROR: DeviceProviderStatus.ERROR,
};

/**
 * 阿里云实例组规格（2023-09-30版本）
 */
export const ALIYUN_INSTANCE_SPECS = {
  /** 基础型 - 2核4G */
  BASIC_SMALL: 'acp.basic.small',
  /** 标准型 - 4核8G */
  BASIC_MEDIUM: 'acp.basic.medium',
  /** 高性能型 - 8核16G */
  BASIC_LARGE: 'acp.basic.large',
  /** 旗舰型 - 16核32G */
  BASIC_XLARGE: 'acp.basic.xlarge',
} as const;

@Injectable()
export class AliyunProviderV2 implements IDeviceProvider {
  readonly providerType = DeviceProviderType.ALIYUN_ECP;
  private readonly logger = new Logger(AliyunProviderV2.name);

  // 存储实例ID到实例组ID的映射
  private instanceGroupMap = new Map<string, string>();

  constructor(private readonly ecpClient: AliyunEcpV2Client) {}

  /**
   * 创建云手机实例
   *
   * 新版API使用实例组模式：
   * 1. 创建实例组
   * 2. 实例组自动创建实例
   * 3. 返回实例信息
   */
  async create(config: DeviceCreateConfig): Promise<ProviderDevice> {
    this.logger.log(`Creating Aliyun ECP phone (V2) for user ${config.userId}: ${config.name}`);

    try {
      // 根据配置选择规格
      const instanceGroupSpec = this.selectSpecByConfig(config);

      // 从 providerSpecificConfig 获取阿里云特定配置
      const bizRegionId =
        config.providerSpecificConfig?.regionId ||
        process.env.ALIYUN_REGION ||
        'cn-hangzhou';
      const imageId =
        config.providerSpecificConfig?.imageId ||
        process.env.ALIYUN_DEFAULT_IMAGE_ID;
      const chargeType = config.providerSpecificConfig?.chargeType || 'PostPaid';

      if (!imageId) {
        throw new InternalServerErrorException('ALIYUN_DEFAULT_IMAGE_ID is required');
      }

      // 创建实例组（会自动创建实例）
      const result = await this.ecpClient.createInstanceGroup({
        bizRegionId,
        instanceGroupSpec,
        imageId,
        instanceGroupName: config.name || `aliyun-${config.userId}-${Date.now()}`,
        numberOfInstances: 1,
        chargeType: chargeType as 'PostPaid' | 'PrePaid',
        officeSiteId: config.providerSpecificConfig?.officeSiteId,
        vSwitchId: config.providerSpecificConfig?.vSwitchId,
        keyPairId: config.providerSpecificConfig?.keyPairId,
      });

      if (!result.success || !result.data) {
        throw new InternalServerErrorException(
          `Failed to create instance group: ${result.errorMessage}`
        );
      }

      const { instanceGroupIds, instanceIds } = result.data;

      if (!instanceIds || instanceIds.length === 0) {
        throw new InternalServerErrorException('No instance created in instance group');
      }

      const instanceId = instanceIds[0];
      const instanceGroupId = instanceGroupIds[0];

      // 保存映射关系
      this.instanceGroupMap.set(instanceId, instanceGroupId);

      // 解析分辨率
      const resolution =
        typeof config.resolution === 'string'
          ? config.resolution
          : `${config.resolution.width}x${config.resolution.height}`;

      // 返回标准化的 ProviderDevice
      return {
        id: instanceId,
        name: config.name || `aliyun-${instanceId}`,
        status: DeviceProviderStatus.CREATING,
        connectionInfo: {
          providerType: DeviceProviderType.ALIYUN_ECP,
          aliyunEcp: {
            instanceId,
            webrtcToken: 'will-be-fetched-on-connect',
            webrtcUrl: '',
            tokenExpiresAt: new Date(Date.now() + 30000),
          },
        },
        properties: {
          manufacturer: 'Aliyun',
          model: `ECP-${instanceGroupSpec}`,
          androidVersion: '11',
          resolution,
          dpi: config.dpi || 480,
        },
        createdAt: new Date(),
        providerConfig: {
          instanceGroupId,
          bizRegionId,
          instanceGroupSpec,
          chargeType,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create Aliyun phone: ${error.message}`);
      throw error;
    }
  }

  /**
   * 启动云手机
   */
  async start(deviceId: string): Promise<void> {
    this.logger.log(`Starting Aliyun phone (V2): ${deviceId}`);

    const result = await this.ecpClient.startInstance([deviceId]);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to start: ${result.errorMessage}`);
    }
  }

  /**
   * 停止云手机
   */
  async stop(deviceId: string): Promise<void> {
    this.logger.log(`Stopping Aliyun phone (V2): ${deviceId}`);

    const result = await this.ecpClient.stopInstance([deviceId]);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to stop: ${result.errorMessage}`);
    }
  }

  /**
   * 销毁云手机
   *
   * 新版API需要删除实例组（会自动删除其中的实例）
   */
  async destroy(deviceId: string): Promise<void> {
    this.logger.log(`Destroying Aliyun phone (V2): ${deviceId}`);

    // 获取实例组ID
    let instanceGroupId = this.instanceGroupMap.get(deviceId);

    if (!instanceGroupId) {
      // 如果没有缓存，尝试从实例信息中获取
      const instanceResult = await this.ecpClient.describeInstances({
        instanceIds: [deviceId],
      });
      if (instanceResult.success && instanceResult.data && instanceResult.data.instances && instanceResult.data.instances.length > 0) {
        instanceGroupId = instanceResult.data.instances[0].instanceGroupId;
      }
    }

    if (!instanceGroupId) {
      throw new InternalServerErrorException(`Cannot find instance group for instance ${deviceId}`);
    }

    const result = await this.ecpClient.deleteInstanceGroup(instanceGroupId);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to destroy: ${result.errorMessage}`);
    }

    // 清理缓存
    this.instanceGroupMap.delete(deviceId);
  }

  /**
   * 获取云手机状态
   */
  async getStatus(deviceId: string): Promise<DeviceProviderStatus> {
    const result = await this.ecpClient.describeInstances({
      instanceIds: [deviceId],
    });

    if (!result.success || !result.data?.instances.length) {
      throw new InternalServerErrorException(`Failed to get status: ${result.errorMessage}`);
    }

    return ALIYUN_STATUS_MAP[result.data.instances[0].status] || DeviceProviderStatus.ERROR;
  }

  /**
   * 获取连接信息
   *
   * 使用 BatchGetAcpConnectionTicket 获取连接凭证
   */
  async getConnectionInfo(deviceId: string): Promise<ConnectionInfo> {
    const result = await this.ecpClient.batchGetConnectionTicket({
      instanceIds: [deviceId],
    });

    if (!result.success || !result.data?.length) {
      throw new InternalServerErrorException(
        `Failed to get connection info: ${result.errorMessage}`
      );
    }

    const ticket = result.data[0];

    return {
      providerType: DeviceProviderType.ALIYUN_ECP,
      aliyunEcp: {
        instanceId: ticket.instanceId,
        webrtcToken: ticket.ticket,
        webrtcUrl: '', // Web SDK会处理
        tokenExpiresAt: new Date(Date.now() + 30000), // 30秒有效期
      },
    };
  }

  /**
   * 获取设备属性
   */
  async getProperties(deviceId: string): Promise<DeviceProperties> {
    const result = await this.ecpClient.describeInstances({
      instanceIds: [deviceId],
    });

    if (!result.success || !result.data?.instances.length) {
      throw new InternalServerErrorException(`Failed to get properties: ${result.errorMessage}`);
    }

    const instance = result.data.instances[0];

    return {
      manufacturer: 'Aliyun',
      model: `ECP-${instance.instanceGroupId}`,
      androidVersion: instance.androidVersion || '11',
      serialNumber: instance.instanceId,
      custom: {
        regionId: instance.regionId || '',
        instanceGroupId: instance.instanceGroupId || '',
        networkInterfaceIp: instance.networkInterfaceIp || '',
        publicIp: instance.publicIp || '',
        adbServletAddress: instance.adbServletAddress || '',
        keyPairId: instance.keyPairId || '',
      },
    };
  }

  /**
   * 获取设备指标
   */
  async getMetrics(deviceId: string): Promise<DeviceMetrics> {
    // 新版API支持监控指标，但需要额外实现
    // 这里返回基础结构
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      memoryUsed: 0,
      storageUsed: 0,
      storageUsage: 0,
      networkRx: 0,
      networkTx: 0,
      batteryLevel: 100,
      timestamp: new Date(),
    };
  }

  /**
   * 获取设备能力
   */
  getCapabilities(): DeviceCapabilities {
    return {
      supportsAdb: true, // ✅ 完整的ADB支持
      supportsScreenCapture: true,
      supportsAudioCapture: true,
      supportedCaptureFormats: [CaptureFormat.WEBRTC],
      maxResolution: { width: 1920, height: 1080 },
      supportsTouchControl: true,
      supportsKeyboardInput: true,
      supportsFileTransfer: true,
      supportsAppInstall: true,
      supportsSnapshot: false, // 新版API使用备份/恢复替代快照
      supportsAppOperation: true,
      supportsScreenshot: true, // ✅ 新版支持截图
      supportsRecording: false,
      supportsLocationMocking: true,
      supportsRotation: true,
      supportsCamera: false,
      supportsMicrophone: true,
    };
  }

  /**
   * 开启ADB连接 (新功能)
   */
  async enableAdb(deviceId: string): Promise<void> {
    this.logger.log(`Enabling ADB for instance: ${deviceId}`);

    const result = await this.ecpClient.startInstanceAdb([deviceId]);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to enable ADB: ${result.errorMessage}`);
    }
  }

  /**
   * 关闭ADB连接 (新功能)
   */
  async disableAdb(deviceId: string): Promise<void> {
    this.logger.log(`Disabling ADB for instance: ${deviceId}`);

    const result = await this.ecpClient.stopInstanceAdb([deviceId]);
    if (!result.success) {
      throw new InternalServerErrorException(`Failed to disable ADB: ${result.errorMessage}`);
    }
  }

  /**
   * 获取ADB连接信息 (新功能)
   */
  async getAdbInfo(deviceId: string): Promise<{
    adbServletAddress: string;
    adbEnabled: boolean;
  }> {
    const result = await this.ecpClient.listInstanceAdbAttributes([deviceId]);
    if (!result.success || !result.data?.length) {
      throw new InternalServerErrorException(`Failed to get ADB info: ${result.errorMessage}`);
    }

    const info = result.data[0];
    return {
      adbServletAddress: info.adbServletAddress,
      adbEnabled: info.adbEnabled,
    };
  }

  /**
   * 执行Shell命令
   */
  async executeShell(deviceId: string, command: string): Promise<string> {
    this.logger.log(`Executing shell command on ${deviceId}`);

    const result = await this.ecpClient.runCommand({
      instanceIds: [deviceId],
      commandContent: command,
      timeout: 60,
    });

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(`Failed to run command: ${result.errorMessage}`);
    }

    // 等待命令执行完成
    await this.sleep(3000);

    // 获取执行结果
    const invocationResult = await this.ecpClient.describeInvocations(result.data.invokeId);

    if (!invocationResult.success || !invocationResult.data?.length) {
      throw new InternalServerErrorException('Failed to get command result');
    }

    const cmdResult = invocationResult.data[0];
    if (cmdResult.status === 'Failed') {
      throw new InternalServerErrorException(`Command failed: ${cmdResult.errorOutput}`);
    }

    return cmdResult.output;
  }

  /**
   * 创建截图 (新功能)
   */
  async takeScreenshot(deviceId: string): Promise<Buffer> {
    this.logger.log(`Creating screenshot for ${deviceId}`);

    const result = await this.ecpClient.createScreenshot([deviceId]);

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(`Failed to create screenshot: ${result.errorMessage}`);
    }

    // 截图是异步的，需要通过任务查询获取结果
    // 这里返回空Buffer，实际使用需要轮询任务状态获取截图URL
    this.logger.log(`Screenshot task created: ${result.data.taskId}`);

    throw new NotImplementedException(
      `Screenshot is async. Task ID: ${result.data.taskId}. ` +
        'Poll DescribeTasks API to get the screenshot URL.'
    );
  }

  /**
   * 推送文件
   */
  async pushFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    this.logger.log(`Pushing file to ${deviceId}: ${options.localPath}`);

    const result = await this.ecpClient.sendFile({
      instanceIds: [deviceId],
      sourceFilePath: options.localPath,
      androidPath: options.remotePath,
    });

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to push file: ${result.errorMessage}`);
    }
  }

  /**
   * 拉取文件
   */
  async pullFile(deviceId: string, options: FileTransferOptions): Promise<void> {
    this.logger.log(`Pulling file from ${deviceId}: ${options.remotePath}`);

    // 解析OSS配置
    const ossMatch = options.localPath.match(/oss:\/\/([^/]+)\/(.+)/);
    if (!ossMatch) {
      throw new InternalServerErrorException('localPath must be OSS URL: oss://bucket/path');
    }

    const result = await this.ecpClient.fetchFile({
      instanceId: deviceId,
      androidPath: options.remotePath,
      uploadType: 'OSS',
      uploadEndpoint: `${ossMatch[1]}.oss-${process.env.ALIYUN_REGION || 'cn-hangzhou'}.aliyuncs.com`,
      uploadUrl: options.localPath,
    });

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to pull file: ${result.errorMessage}`);
    }
  }

  /**
   * 安装应用
   */
  async installApp(deviceId: string, options: AppInstallOptions): Promise<string> {
    this.logger.log(`Installing app on ${deviceId}`);

    // 获取实例组ID
    let instanceGroupId: string | undefined = this.instanceGroupMap.get(deviceId);
    if (!instanceGroupId) {
      const instanceResult = await this.ecpClient.describeInstances({
        instanceIds: [deviceId],
      });
      if (instanceResult.success && instanceResult.data && instanceResult.data.instances && instanceResult.data.instances.length > 0) {
        instanceGroupId = instanceResult.data.instances[0].instanceGroupId;
      }
    }

    if (!instanceGroupId) {
      throw new InternalServerErrorException('Cannot find instance group');
    }

    // 新版API需要先创建App，然后安装
    // 这里假设appId已经存在
    const appId = options.packageName; // 使用packageName作为appId

    if (!appId) {
      throw new InternalServerErrorException('packageName is required for app installation');
    }

    const result = await this.ecpClient.installApp({
      instanceGroupIdList: [instanceGroupId],
      appIdList: [appId],
    });

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(`Failed to install app: ${result.errorMessage}`);
    }

    return result.data.taskId;
  }

  /**
   * 卸载应用
   */
  async uninstallApp(deviceId: string, packageName: string): Promise<void> {
    this.logger.log(`Uninstalling app from ${deviceId}: ${packageName}`);

    // 获取实例组ID
    let instanceGroupId: string | undefined = this.instanceGroupMap.get(deviceId);
    if (!instanceGroupId) {
      const instanceResult = await this.ecpClient.describeInstances({
        instanceIds: [deviceId],
      });
      if (instanceResult.success && instanceResult.data && instanceResult.data.instances && instanceResult.data.instances.length > 0) {
        instanceGroupId = instanceResult.data.instances[0].instanceGroupId;
      }
    }

    if (!instanceGroupId) {
      throw new InternalServerErrorException('Cannot find instance group');
    }

    const result = await this.ecpClient.uninstallApp({
      instanceGroupIdList: [instanceGroupId],
      appIdList: [packageName],
    });

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to uninstall app: ${result.errorMessage}`);
    }
  }

  /**
   * 创建备份 (新版API使用BackupFile)
   */
  async createBackup(
    deviceId: string,
    name: string,
    ossPath: string
  ): Promise<string> {
    this.logger.log(`Creating backup for ${deviceId}: ${name}`);

    const result = await this.ecpClient.backupFile({
      instanceIds: [deviceId],
      androidPath: '/sdcard/',
      backupFilePath: ossPath,
      uploadType: 'OSS',
      uploadEndpoint: `oss-${process.env.ALIYUN_REGION || 'cn-hangzhou'}.aliyuncs.com`,
    });

    if (!result.success || !result.data) {
      throw new InternalServerErrorException(`Failed to create backup: ${result.errorMessage}`);
    }

    return result.data.taskId;
  }

  /**
   * 恢复备份 (新版API使用RecoveryFile)
   */
  async restoreBackup(deviceId: string, ossPath: string): Promise<void> {
    this.logger.log(`Restoring backup for ${deviceId}`);

    const result = await this.ecpClient.recoveryFile({
      instanceIds: [deviceId],
      sourceFilePath: ossPath,
      androidPath: '/sdcard/',
    });

    if (!result.success) {
      throw new InternalServerErrorException(`Failed to restore backup: ${result.errorMessage}`);
    }
  }

  // ============================================================
  // 以下方法需要通过WebRTC数据通道实现
  // ============================================================

  async sendTouchEvent(deviceId: string, event: TouchEvent): Promise<void> {
    throw new NotImplementedException(
      'Touch events should be sent via Aliyun Web SDK data channel.'
    );
  }

  async sendSwipeEvent(deviceId: string, event: SwipeEvent): Promise<void> {
    throw new NotImplementedException(
      'Swipe events should be sent via Aliyun Web SDK data channel.'
    );
  }

  async sendKeyEvent(deviceId: string, event: KeyEvent): Promise<void> {
    throw new NotImplementedException(
      'Key events should be sent via Aliyun Web SDK data channel.'
    );
  }

  async inputText(deviceId: string, input: TextInput): Promise<void> {
    throw new NotImplementedException(
      'Text input should be sent via Aliyun Web SDK data channel.'
    );
  }

  // ============================================================
  // 私有方法
  // ============================================================

  /**
   * 根据配置选择规格
   */
  private selectSpecByConfig(config: DeviceCreateConfig): string {
    const { cpuCores, memoryMB } = config;

    if (cpuCores >= 16 && memoryMB >= 32768) {
      return ALIYUN_INSTANCE_SPECS.BASIC_XLARGE;
    }
    if (cpuCores >= 8 && memoryMB >= 16384) {
      return ALIYUN_INSTANCE_SPECS.BASIC_LARGE;
    }
    if (cpuCores >= 4 && memoryMB >= 8192) {
      return ALIYUN_INSTANCE_SPECS.BASIC_MEDIUM;
    }
    return ALIYUN_INSTANCE_SPECS.BASIC_SMALL;
  }

  /**
   * 睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
