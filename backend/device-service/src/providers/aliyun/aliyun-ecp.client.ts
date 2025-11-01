import { Injectable, Logger } from '@nestjs/common';
import {
  AliyunEcpConfig,
  AliyunPhoneInstance,
  AliyunPhoneStatus,
  AliyunOperationResult,
  CreateAliyunPhoneRequest,
  AliyunConnectionInfo,
  ListAliyunPhonesRequest,
  AliyunRebootOptions,
  AliyunAppInfo,
  AliyunBatchTaskInfo,
  AliyunSnapshotInfo,
  AliyunCommandResult,
} from './aliyun.types';
import { Retry, NetworkError, TimeoutError } from '../../common/retry.decorator';
import { RateLimit } from '../../common/rate-limit.decorator';

// 导入阿里云SDK
const RPCClient = require('@alicloud/pop-core').RPCClient;

/**
 * 阿里云 ECP (Elastic Cloud Phone) SDK 客户端 - 真实实现
 *
 * Phase 4: 阿里云云手机集成
 *
 * 使用 @alicloud/pop-core RPC Client 调用阿里云OpenAPI
 *
 * 参考文档：
 * - https://www.alibabacloud.com/help/en/elastic-cloud-phone
 * - https://github.com/aliyun/openapi-core-nodejs-sdk
 *
 * 实现方式:
 * - 使用 @alicloud/pop-core 的 RPCClient
 * - 自动处理 AK/SK 签名
 * - 支持重试和限流
 */
@Injectable()
export class AliyunEcpClient {
  private readonly logger = new Logger(AliyunEcpClient.name);
  private config: AliyunEcpConfig;
  private client: any;

  constructor() {
    // 从环境变量加载配置
    this.config = {
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
      regionId: process.env.ALIYUN_REGION || 'cn-hangzhou',
      defaultZoneId: process.env.ALIYUN_DEFAULT_ZONE_ID,
      defaultImageId: process.env.ALIYUN_DEFAULT_IMAGE_ID,
      defaultSecurityGroupId: process.env.ALIYUN_DEFAULT_SECURITY_GROUP_ID,
      defaultVSwitchId: process.env.ALIYUN_DEFAULT_VSWITCH_ID,
      timeout: 30000,
    };

    this.logger.log(`AliyunEcpClient initialized for region: ${this.config.regionId}`);

    // 验证必要配置
    if (!this.config.accessKeyId || !this.config.accessKeySecret) {
      this.logger.warn('Aliyun credentials not configured. SDK will not work properly.');
      return;
    }

    // 初始化阿里云RPC Client
    try {
      this.client = new RPCClient({
        accessKeyId: this.config.accessKeyId,
        accessKeySecret: this.config.accessKeySecret,
        endpoint: `https://ecp.${this.config.regionId}.aliyuncs.com`,
        apiVersion: '2020-08-14', // ECP API版本
      });

      this.logger.log('Aliyun RPC Client initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Aliyun client: ${error.message}`);
    }
  }

  /**
   * 创建云手机实例
   *
   * API: RunInstances
   */
  async createPhone(
    request: CreateAliyunPhoneRequest
  ): Promise<AliyunOperationResult<AliyunPhoneInstance>> {
    this.logger.log(`Creating Aliyun phone: ${request.instanceName} (${request.instanceType})`);

    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized. Check credentials.',
        };
      }

      const params = {
        RegionId: request.regionId,
        ZoneId: request.zoneId,
        ImageId: request.imageId,
        InstanceType: request.instanceType,
        InstanceName: request.instanceName,
        Amount: request.amount || 1,
        ChargeType: request.chargeType,
        Period: request.period,
        AutoRenew: request.autoRenew || false,
        SecurityGroupId: request.securityGroupId,
        VSwitchId: request.vSwitchId,
        Description: request.description,
      };

      // 调用阿里云API
      const response = await this.client.request('RunInstances', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      // 解析响应
      if (!response.InstanceIdSet || response.InstanceIdSet.length === 0) {
        return {
          success: false,
          errorCode: 'NO_INSTANCE_CREATED',
          errorMessage: 'No instance ID returned from Aliyun API',
          requestId: response.RequestId,
        };
      }

      const instanceId = response.InstanceIdSet[0];

      // 等待实例创建完成
      const instance = await this.waitForInstanceReady(instanceId, request.regionId);

      return {
        success: true,
        data: instance,
        requestId: response.RequestId,
      };
    } catch (error) {
      this.logger.error(`Failed to create phone: ${error.message}`);
      return {
        success: false,
        errorCode: error.code || 'CreateInstanceFailed',
        errorMessage: error.message || 'Failed to create Aliyun phone instance',
      };
    }
  }

  /**
   * 查询云手机实例详情
   *
   * API: DescribeInstances
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'aliyun-api',
    capacity: 20,
    refillRate: 10, // 10 requests/second
  })
  async describeInstance(instanceId: string): Promise<AliyunOperationResult<AliyunPhoneInstance>> {
    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized',
        };
      }

      const params = {
        RegionId: this.config.regionId,
        InstanceIds: JSON.stringify([instanceId]),
      };

      const response = await this.client.request('DescribeInstances', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      if (!response.Instances || response.Instances.length === 0) {
        return {
          success: false,
          errorCode: 'InvalidInstanceId.NotFound',
          errorMessage: `Instance ${instanceId} not found`,
          requestId: response.RequestId,
        };
      }

      const instance = this.mapInstanceToPhoneInstance(response.Instances[0]);

      return {
        success: true,
        data: instance,
        requestId: response.RequestId,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: error.code || 'DescribeInstanceFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 启动云手机实例
   *
   * API: StartInstance
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'aliyun-api',
    capacity: 20,
    refillRate: 10,
  })
  async startInstance(instanceId: string): Promise<AliyunOperationResult<void>> {
    this.logger.log(`Starting instance: ${instanceId}`);

    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized',
        };
      }

      const params = {
        RegionId: this.config.regionId,
        InstanceId: instanceId,
      };

      const response = await this.client.request('StartInstance', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      return { success: true, requestId: response.RequestId };
    } catch (error) {
      return {
        success: false,
        errorCode: error.code || 'StartInstanceFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 停止云手机实例
   *
   * API: StopInstance
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'aliyun-api',
    capacity: 20,
    refillRate: 10,
  })
  async stopInstance(instanceId: string): Promise<AliyunOperationResult<void>> {
    this.logger.log(`Stopping instance: ${instanceId}`);

    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized',
        };
      }

      const params = {
        RegionId: this.config.regionId,
        InstanceId: instanceId,
      };

      const response = await this.client.request('StopInstance', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      return { success: true, requestId: response.RequestId };
    } catch (error) {
      return {
        success: false,
        errorCode: error.code || 'StopInstanceFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 重启云手机实例
   *
   * API: RebootInstance
   */
  async rebootInstance(
    instanceId: string,
    options?: AliyunRebootOptions
  ): Promise<AliyunOperationResult<void>> {
    this.logger.log(`Rebooting instance: ${instanceId}`);

    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized',
        };
      }

      const params = {
        RegionId: this.config.regionId,
        InstanceId: instanceId,
        ForceReboot: options?.forceReboot || false,
      };

      const response = await this.client.request('RebootInstance', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      return { success: true, requestId: response.RequestId };
    } catch (error) {
      return {
        success: false,
        errorCode: error.code || 'RebootInstanceFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 删除云手机实例
   *
   * API: DeleteInstance
   */
  async deleteInstance(instanceId: string): Promise<AliyunOperationResult<void>> {
    this.logger.log(`Deleting instance: ${instanceId}`);

    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized',
        };
      }

      const params = {
        RegionId: this.config.regionId,
        InstanceId: instanceId,
      };

      const response = await this.client.request('DeleteInstance', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      return { success: true, requestId: response.RequestId };
    } catch (error) {
      return {
        success: false,
        errorCode: error.code || 'DeleteInstanceFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 获取 WebRTC 连接信息
   *
   * API: DescribeInstanceStreams
   *
   * 注意：阿里云 ECP 的 WebRTC Token 有效期为 30 秒，需要客户端及时使用
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 500, // 更短的延迟，因为 Token 有效期短
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'aliyun-api',
    capacity: 20,
    refillRate: 10,
  })
  async getConnectionInfo(
    instanceId: string
  ): Promise<AliyunOperationResult<AliyunConnectionInfo>> {
    this.logger.log(`Getting connection info for instance: ${instanceId}`);

    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized',
        };
      }

      const params = {
        RegionId: this.config.regionId,
        InstanceId: instanceId,
      };

      const response = await this.client.request('DescribeInstanceStreams', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      if (!response.StreamUrl || !response.Token) {
        return {
          success: false,
          errorCode: 'NO_STREAM_INFO',
          errorMessage: 'No stream information available',
          requestId: response.RequestId,
        };
      }

      const connectionInfo: AliyunConnectionInfo = {
        instanceId,
        streamUrl: response.StreamUrl,
        token: response.Token,
        expireTime: response.ExpireTime,
        stunServers: response.StunServers || [
          `stun:stun.${this.config.regionId}.aliyuncs.com:3478`,
          'stun:stun.l.google.com:19302',
        ],
        turnServers: response.TurnServers || [],
        signalingUrl: response.SignalingUrl,
        adbPublicKey: response.AdbPublicKey,
        adbEndpoint: response.AdbEndpoint,
      };

      return {
        success: true,
        data: connectionInfo,
        requestId: response.RequestId,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: error.code || 'GetConnectionInfoFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 列出云手机实例
   *
   * API: DescribeInstances
   */
  async listInstances(
    request: ListAliyunPhonesRequest
  ): Promise<AliyunOperationResult<AliyunPhoneInstance[]>> {
    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized',
        };
      }

      const params: any = {
        RegionId: request.regionId,
        PageNumber: request.pageNumber || 1,
        PageSize: request.pageSize || 10,
      };

      if (request.instanceIds && request.instanceIds.length > 0) {
        params.InstanceIds = JSON.stringify(request.instanceIds);
      }

      if (request.status) {
        params.Status = request.status;
      }

      if (request.instanceName) {
        params.InstanceName = request.instanceName;
      }

      const response = await this.client.request('DescribeInstances', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      const instances = (response.Instances || []).map((inst: any) =>
        this.mapInstanceToPhoneInstance(inst)
      );

      return {
        success: true,
        data: instances,
        requestId: response.RequestId,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: error.code || 'ListInstancesFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 获取配置
   */
  getConfig(): AliyunEcpConfig {
    return { ...this.config };
  }

  // ============================================================
  // 应用管理 - Phase 4 新增功能
  // ============================================================

  /**
   * 创建应用
   *
   * API: CreateApp
   *
   * 将 APK 文件注册到阿里云 ECP 平台
   *
   * @param appName 应用名称
   * @param ossAppUrl APK 文件的 OSS 地址
   * @param description 应用描述
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'aliyun-api',
    capacity: 20,
    refillRate: 10,
  })
  async createApp(
    appName: string,
    ossAppUrl: string,
    description?: string
  ): Promise<AliyunOperationResult<AliyunAppInfo>> {
    this.logger.log(`Creating app: ${appName} from ${ossAppUrl}`);

    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized',
        };
      }

      const params: any = {
        RegionId: this.config.regionId,
        AppName: appName,
        OssAppUrl: ossAppUrl,
      };

      if (description) {
        params.Description = description;
      }

      const response = await this.client.request('CreateApp', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      return {
        success: true,
        data: {
          appId: response.AppId,
          appName: response.AppName,
          appPackage: response.AppPackage,
          appVersion: response.AppVersion,
          gmtCreate: response.GmtCreate,
          status: response.Status,
        },
        requestId: response.RequestId,
      };
    } catch (error) {
      this.logger.error(`Failed to create app: ${error.message}`);
      return {
        success: false,
        errorCode: error.code || 'CreateAppFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 安装应用
   *
   * API: InstallApp
   *
   * 在云手机实例上安装已注册的应用
   *
   * @param instanceIds 实例 ID 列表
   * @param appId 应用 ID
   * @param installType 安装类型 (install / reinstall)
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 2000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'aliyun-api',
    capacity: 20,
    refillRate: 10,
  })
  async installApp(
    instanceIds: string[],
    appId: string,
    installType: 'install' | 'reinstall' = 'install'
  ): Promise<AliyunOperationResult<AliyunBatchTaskInfo>> {
    this.logger.log(`Installing app ${appId} on ${instanceIds.length} instances`);

    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized',
        };
      }

      const params = {
        RegionId: this.config.regionId,
        InstanceId: instanceIds, // API 接受数组
        AppId: appId,
        InstallType: installType,
      };

      const response = await this.client.request('InstallApp', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      return {
        success: true,
        data: {
          taskId: response.TaskId,
          taskStatus: response.TaskStatus || 'Processing',
          successCount: response.SuccessCount || 0,
          failedCount: response.FailedCount || 0,
          totalCount: instanceIds.length,
        },
        requestId: response.RequestId,
      };
    } catch (error) {
      this.logger.error(`Failed to install app: ${error.message}`);
      return {
        success: false,
        errorCode: error.code || 'InstallAppFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 卸载应用
   *
   * API: UninstallApp
   *
   * @param instanceIds 实例 ID 列表
   * @param appPackage 应用包名
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'aliyun-api',
    capacity: 20,
    refillRate: 10,
  })
  async uninstallApp(
    instanceIds: string[],
    appPackage: string
  ): Promise<AliyunOperationResult<AliyunBatchTaskInfo>> {
    this.logger.log(`Uninstalling app ${appPackage} from ${instanceIds.length} instances`);

    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized',
        };
      }

      const params = {
        RegionId: this.config.regionId,
        InstanceId: instanceIds,
        AppPackage: appPackage,
      };

      const response = await this.client.request('UninstallApp', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      return {
        success: true,
        data: {
          taskId: response.TaskId,
          taskStatus: response.TaskStatus || 'Processing',
          successCount: response.SuccessCount || 0,
          failedCount: response.FailedCount || 0,
          totalCount: instanceIds.length,
        },
        requestId: response.RequestId,
      };
    } catch (error) {
      this.logger.error(`Failed to uninstall app: ${error.message}`);
      return {
        success: false,
        errorCode: error.code || 'UninstallAppFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 操作应用 (启动/停止/重启/清除数据)
   *
   * API: OperateApp
   *
   * @param instanceId 实例 ID
   * @param appPackage 应用包名
   * @param operateType 操作类型
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'aliyun-api',
    capacity: 20,
    refillRate: 10,
  })
  async operateApp(
    instanceId: string,
    appPackage: string,
    operateType: 'START' | 'STOP' | 'RESTART' | 'CLEAR_DATA'
  ): Promise<AliyunOperationResult<void>> {
    this.logger.log(`Operating app ${appPackage} on instance ${instanceId}: ${operateType}`);

    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized',
        };
      }

      const params = {
        RegionId: this.config.regionId,
        InstanceId: instanceId,
        AppPackage: appPackage,
        OperateType: operateType,
      };

      const response = await this.client.request('OperateApp', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      return {
        success: true,
        requestId: response.RequestId,
      };
    } catch (error) {
      this.logger.error(`Failed to operate app: ${error.message}`);
      return {
        success: false,
        errorCode: error.code || 'OperateAppFailed',
        errorMessage: error.message,
      };
    }
  }

  // ============================================================
  // 文件操作 - Phase 4 新增功能
  // ============================================================

  /**
   * 发送文件到云手机
   *
   * API: SendFile
   *
   * @param instanceIds 实例 ID 列表
   * @param ossFileUrl OSS 文件地址
   * @param targetPath 云手机目标路径
   * @param fileName 文件名 (可选)
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 2000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'aliyun-api',
    capacity: 10,
    refillRate: 5,
  })
  async sendFile(
    instanceIds: string[],
    ossFileUrl: string,
    targetPath: string,
    fileName?: string
  ): Promise<AliyunOperationResult<AliyunBatchTaskInfo>> {
    this.logger.log(`Sending file ${ossFileUrl} to ${instanceIds.length} instances`);

    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized',
        };
      }

      const params: any = {
        RegionId: this.config.regionId,
        InstanceId: instanceIds,
        OssFileUrl: ossFileUrl,
        TargetPath: targetPath,
      };

      if (fileName) {
        params.FileName = fileName;
      }

      const response = await this.client.request('SendFile', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      return {
        success: true,
        data: {
          taskId: response.TaskId,
          taskStatus: response.TaskStatus || 'Processing',
          successCount: response.SuccessCount || 0,
          failedCount: response.FailedCount || 0,
          totalCount: instanceIds.length,
        },
        requestId: response.RequestId,
      };
    } catch (error) {
      this.logger.error(`Failed to send file: ${error.message}`);
      return {
        success: false,
        errorCode: error.code || 'SendFileFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 从云手机拉取文件
   *
   * API: FetchFile
   *
   * @param instanceId 实例 ID
   * @param sourcePath 云手机源路径
   * @param ossPath OSS 目标路径
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 2000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'aliyun-api',
    capacity: 10,
    refillRate: 5,
  })
  async fetchFile(
    instanceId: string,
    sourcePath: string,
    ossPath: string
  ): Promise<AliyunOperationResult<{ taskId: string }>> {
    this.logger.log(`Fetching file from ${instanceId}:${sourcePath} to ${ossPath}`);

    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized',
        };
      }

      const params = {
        RegionId: this.config.regionId,
        InstanceId: instanceId,
        SourcePath: sourcePath,
        OssPath: ossPath,
      };

      const response = await this.client.request('FetchFile', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      return {
        success: true,
        data: {
          taskId: response.TaskId,
        },
        requestId: response.RequestId,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch file: ${error.message}`);
      return {
        success: false,
        errorCode: error.code || 'FetchFileFailed',
        errorMessage: error.message,
      };
    }
  }

  // ============================================================
  // 备份与恢复 - Phase 4 新增功能
  // ============================================================

  /**
   * 创建快照
   *
   * API: CreateSnapshot
   *
   * @param instanceId 实例 ID
   * @param snapshotName 快照名称
   * @param description 快照描述
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 2000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'aliyun-api',
    capacity: 10,
    refillRate: 5,
  })
  async createSnapshot(
    instanceId: string,
    snapshotName: string,
    description?: string
  ): Promise<AliyunOperationResult<AliyunSnapshotInfo>> {
    this.logger.log(`Creating snapshot for instance ${instanceId}: ${snapshotName}`);

    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized',
        };
      }

      const params: any = {
        RegionId: this.config.regionId,
        InstanceId: instanceId,
        SnapshotName: snapshotName,
      };

      if (description) {
        params.Description = description;
      }

      const response = await this.client.request('CreateSnapshot', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      return {
        success: true,
        data: {
          snapshotId: response.SnapshotId,
          snapshotName: response.SnapshotName,
          instanceId,
          gmtCreate: response.GmtCreate,
          status: response.Status || 'CREATING',
        },
        requestId: response.RequestId,
      };
    } catch (error) {
      this.logger.error(`Failed to create snapshot: ${error.message}`);
      return {
        success: false,
        errorCode: error.code || 'CreateSnapshotFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 恢复快照
   *
   * API: RestoreSnapshot
   *
   * @param instanceId 实例 ID
   * @param snapshotId 快照 ID
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 2000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'aliyun-api',
    capacity: 10,
    refillRate: 5,
  })
  async restoreSnapshot(
    instanceId: string,
    snapshotId: string
  ): Promise<AliyunOperationResult<void>> {
    this.logger.log(`Restoring snapshot ${snapshotId} to instance ${instanceId}`);

    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized',
        };
      }

      const params = {
        RegionId: this.config.regionId,
        InstanceId: instanceId,
        SnapshotId: snapshotId,
      };

      const response = await this.client.request('RestoreSnapshot', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      return {
        success: true,
        requestId: response.RequestId,
      };
    } catch (error) {
      this.logger.error(`Failed to restore snapshot: ${error.message}`);
      return {
        success: false,
        errorCode: error.code || 'RestoreSnapshotFailed',
        errorMessage: error.message,
      };
    }
  }

  // ============================================================
  // 远程命令执行 - Phase 4 新增功能
  // ============================================================

  /**
   * 运行命令
   *
   * API: RunCommand
   *
   * 在云手机实例上执行 Shell 命令
   *
   * @param instanceIds 实例 ID 列表
   * @param commandContent 命令内容
   * @param timeout 超时时间 (秒)
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'aliyun-api',
    capacity: 20,
    refillRate: 10,
  })
  async runCommand(
    instanceIds: string[],
    commandContent: string,
    timeout: number = 60
  ): Promise<AliyunOperationResult<{ invokeId: string }>> {
    this.logger.log(`Running command on ${instanceIds.length} instances: ${commandContent}`);

    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized',
        };
      }

      const params = {
        RegionId: this.config.regionId,
        InstanceId: instanceIds,
        CommandContent: Buffer.from(commandContent).toString('base64'), // Base64 编码
        Type: 'RunShellScript',
        Timeout: timeout,
      };

      const response = await this.client.request('RunCommand', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      return {
        success: true,
        data: {
          invokeId: response.InvokeId,
        },
        requestId: response.RequestId,
      };
    } catch (error) {
      this.logger.error(`Failed to run command: ${error.message}`);
      return {
        success: false,
        errorCode: error.code || 'RunCommandFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 查询命令执行结果
   *
   * API: DescribeInvocationResults
   *
   * @param invokeId 调用 ID
   */
  async getCommandResult(
    invokeId: string
  ): Promise<AliyunOperationResult<AliyunCommandResult[]>> {
    try {
      if (!this.client) {
        return {
          success: false,
          errorCode: 'CLIENT_NOT_INITIALIZED',
          errorMessage: 'Aliyun client not initialized',
        };
      }

      const params = {
        RegionId: this.config.regionId,
        InvokeId: invokeId,
      };

      const response = await this.client.request('DescribeInvocationResults', params, {
        method: 'POST',
        timeout: this.config.timeout,
      });

      const results: AliyunCommandResult[] = (response.InvocationResults || []).map(
        (result: any) => ({
          invokeId,
          instanceId: result.InstanceId,
          exitCode: result.ExitCode,
          output: result.Output ? Buffer.from(result.Output, 'base64').toString('utf-8') : '',
          errorOutput: result.ErrorOutput
            ? Buffer.from(result.ErrorOutput, 'base64').toString('utf-8')
            : '',
          invokeStatus: result.InvokeRecordStatus,
        })
      );

      return {
        success: true,
        data: results,
        requestId: response.RequestId,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: error.code || 'GetCommandResultFailed',
        errorMessage: error.message,
      };
    }
  }

  // ============================================================
  // 私有辅助方法
  // ============================================================

  /**
   * 映射阿里云实例到PhoneInstance
   */
  private mapInstanceToPhoneInstance(inst: any): AliyunPhoneInstance {
    return {
      instanceId: inst.InstanceId,
      instanceName: inst.InstanceName,
      instanceType: inst.InstanceType,
      status: inst.Status as AliyunPhoneStatus,
      regionId: inst.RegionId,
      zoneId: inst.ZoneId,
      imageId: inst.ImageId,
      publicIp: inst.PublicIpAddress,
      privateIp: inst.PrivateIpAddress,
      creationTime: inst.CreationTime,
      expiredTime: inst.ExpiredTime,
      chargeType: inst.ChargeType,
      systemVersion: inst.SystemVersion || 'Android 11',
      phoneModel: inst.PhoneModel || 'Aliyun ECP',
      statusDescription: inst.StatusDescription,
    };
  }

  /**
   * 等待实例创建完成
   */
  private async waitForInstanceReady(
    instanceId: string,
    regionId: string,
    maxAttempts: number = 60
  ): Promise<AliyunPhoneInstance> {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.describeInstance(instanceId);

      if (result.success && result.data) {
        if (result.data.status === AliyunPhoneStatus.RUNNING) {
          return result.data;
        }
        if (result.data.status === AliyunPhoneStatus.EXCEPTION) {
          throw new Error(`Instance creation failed: ${instanceId}`);
        }
      }

      // 等待5秒后重试
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    throw new Error(`Timeout waiting for instance ${instanceId} to be ready`);
  }
}
