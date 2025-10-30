import { Injectable, Logger } from "@nestjs/common";
import {
  AliyunEcpConfig,
  AliyunPhoneInstance,
  AliyunPhoneStatus,
  AliyunOperationResult,
  CreateAliyunPhoneRequest,
  AliyunConnectionInfo,
  ListAliyunPhonesRequest,
  AliyunRebootOptions,
} from "./aliyun.types";
import { Retry, NetworkError, TimeoutError } from "../../common/retry.decorator";
import { RateLimit } from "../../common/rate-limit.decorator";

/**
 * 阿里云 ECP (Elastic Cloud Phone) SDK 客户端
 *
 * Phase 4: 阿里云云手机集成
 *
 * TODO: 当前为 Mock 实现，需要替换为真实的阿里云 ECP SDK
 *
 * 真实 SDK 集成步骤：
 * 1. 安装阿里云 SDK: npm install @alicloud/ecp20200814 @alicloud/openapi-client
 * 2. 替换 Mock 实现为真实 API 调用
 * 3. 处理阿里云 API 签名和认证
 * 4. 实现错误重试和限流
 *
 * 参考文档：
 * - https://www.alibabacloud.com/help/en/elastic-cloud-phone
 * - https://github.com/aliyun/alibabacloud-typescript-sdk/tree/master/ecp-20200814
 */
@Injectable()
export class AliyunEcpClient {
  private readonly logger = new Logger(AliyunEcpClient.name);
  private config: AliyunEcpConfig;

  // Mock 存储 (真实环境会调用阿里云 API)
  private instances: Map<string, AliyunPhoneInstance> = new Map();

  constructor() {
    // 从环境变量加载配置
    this.config = {
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || "",
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || "",
      regionId: process.env.ALIYUN_REGION || "cn-hangzhou",
      defaultZoneId: process.env.ALIYUN_DEFAULT_ZONE_ID,
      defaultImageId: process.env.ALIYUN_DEFAULT_IMAGE_ID,
      defaultSecurityGroupId: process.env.ALIYUN_DEFAULT_SECURITY_GROUP_ID,
      defaultVSwitchId: process.env.ALIYUN_DEFAULT_VSWITCH_ID,
      timeout: 30000,
    };

    this.logger.log(
      `AliyunEcpClient initialized for region: ${this.config.regionId}`,
    );
  }

  /**
   * 创建云手机实例
   *
   * TODO: 替换为真实 SDK 调用
   * const client = new Ecp20200814(config);
   * const result = await client.createInstance(request);
   */
  async createPhone(
    request: CreateAliyunPhoneRequest,
  ): Promise<AliyunOperationResult<AliyunPhoneInstance>> {
    this.logger.log(
      `Creating Aliyun phone: ${request.instanceName} (${request.instanceType})`,
    );

    try {
      // TODO: Replace with real SDK
      // const Ecp20200814 = require('@alicloud/ecp20200814').default;
      // const client = new Ecp20200814({
      //   accessKeyId: this.config.accessKeyId,
      //   accessKeySecret: this.config.accessKeySecret,
      //   endpoint: `ecp.${this.config.regionId}.aliyuncs.com`
      // });
      // const response = await client.runInstances({
      //   instanceName: request.instanceName,
      //   instanceType: request.instanceType,
      //   imageId: request.imageId,
      //   regionId: request.regionId,
      //   zoneId: request.zoneId,
      //   chargeType: request.chargeType,
      //   amount: request.amount || 1,
      //   ...
      // });
      // return { success: true, data: response.body.instances[0], requestId: response.requestId };

      // Mock 实现
      const instanceId = `ecp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const instance: AliyunPhoneInstance = {
        instanceId,
        instanceName: request.instanceName,
        instanceType: request.instanceType,
        status: AliyunPhoneStatus.CREATING,
        regionId: request.regionId,
        zoneId: request.zoneId,
        imageId: request.imageId,
        chargeType: request.chargeType,
        creationTime: new Date().toISOString(),
        privateIp: `172.16.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        publicIp: request.securityGroupId
          ? `47.98.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
          : undefined,
        systemVersion: "Android 11",
        phoneModel: "Aliyun ECP",
      };

      this.instances.set(instanceId, instance);

      // 模拟异步创建过程
      setTimeout(() => {
        const inst = this.instances.get(instanceId);
        if (inst && inst.status === AliyunPhoneStatus.CREATING) {
          inst.status = AliyunPhoneStatus.RUNNING;
          this.logger.log(`Instance ${instanceId} is now RUNNING`);
        }
      }, 5000);

      return {
        success: true,
        data: instance,
        requestId: `mock-request-${Date.now()}`,
      };
    } catch (error) {
      this.logger.error(`Failed to create phone: ${error.message}`);
      return {
        success: false,
        errorCode: "CreateInstanceFailed",
        errorMessage: error.message,
      };
    }
  }

  /**
   * 查询云手机实例详情
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: "aliyun-api",
    capacity: 20,
    refillRate: 10, // 10 requests/second
  })
  async describeInstance(
    instanceId: string,
  ): Promise<AliyunOperationResult<AliyunPhoneInstance>> {
    try {
      // TODO: Replace with real SDK
      // const response = await client.describeInstances({ instanceIds: [instanceId] });
      // return { success: true, data: response.body.instances[0], requestId: response.requestId };

      // Mock 实现
      const instance = this.instances.get(instanceId);
      if (!instance) {
        return {
          success: false,
          errorCode: "InvalidInstanceId.NotFound",
          errorMessage: `Instance ${instanceId} not found`,
        };
      }

      return {
        success: true,
        data: instance,
        requestId: `mock-request-${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: "DescribeInstanceFailed",
        errorMessage: error.message,
      };
    }
  }

  /**
   * 启动云手机实例
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: "aliyun-api",
    capacity: 20,
    refillRate: 10,
  })
  async startInstance(
    instanceId: string,
  ): Promise<AliyunOperationResult<void>> {
    this.logger.log(`Starting instance: ${instanceId}`);

    try {
      // TODO: Replace with real SDK
      // await client.startInstance({ instanceId });

      // Mock 实现
      const instance = this.instances.get(instanceId);
      if (!instance) {
        return {
          success: false,
          errorCode: "InvalidInstanceId.NotFound",
          errorMessage: "Instance not found",
        };
      }

      if (instance.status !== AliyunPhoneStatus.STOPPED) {
        return {
          success: false,
          errorCode: "InvalidInstanceStatus",
          errorMessage: `Cannot start instance in ${instance.status} status`,
        };
      }

      instance.status = AliyunPhoneStatus.STARTING;

      setTimeout(() => {
        const inst = this.instances.get(instanceId);
        if (inst) inst.status = AliyunPhoneStatus.RUNNING;
      }, 2000);

      return { success: true, requestId: `mock-request-${Date.now()}` };
    } catch (error) {
      return {
        success: false,
        errorCode: "StartInstanceFailed",
        errorMessage: error.message,
      };
    }
  }

  /**
   * 停止云手机实例
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: "aliyun-api",
    capacity: 20,
    refillRate: 10,
  })
  async stopInstance(instanceId: string): Promise<AliyunOperationResult<void>> {
    this.logger.log(`Stopping instance: ${instanceId}`);

    try {
      // TODO: Replace with real SDK
      // await client.stopInstance({ instanceId });

      const instance = this.instances.get(instanceId);
      if (!instance) {
        return {
          success: false,
          errorCode: "InvalidInstanceId.NotFound",
          errorMessage: "Instance not found",
        };
      }

      instance.status = AliyunPhoneStatus.STOPPING;

      setTimeout(() => {
        const inst = this.instances.get(instanceId);
        if (inst) inst.status = AliyunPhoneStatus.STOPPED;
      }, 2000);

      return { success: true, requestId: `mock-request-${Date.now()}` };
    } catch (error) {
      return {
        success: false,
        errorCode: "StopInstanceFailed",
        errorMessage: error.message,
      };
    }
  }

  /**
   * 重启云手机实例
   */
  async rebootInstance(
    instanceId: string,
    options?: AliyunRebootOptions,
  ): Promise<AliyunOperationResult<void>> {
    this.logger.log(`Rebooting instance: ${instanceId}`);

    try {
      // TODO: Replace with real SDK
      // await client.rebootInstance({ instanceId, forceReboot: options?.forceReboot });

      const instance = this.instances.get(instanceId);
      if (!instance) {
        return {
          success: false,
          errorCode: "InvalidInstanceId.NotFound",
          errorMessage: "Instance not found",
        };
      }

      instance.status = AliyunPhoneStatus.RESTARTING;

      setTimeout(() => {
        const inst = this.instances.get(instanceId);
        if (inst) inst.status = AliyunPhoneStatus.RUNNING;
      }, 3000);

      return { success: true, requestId: `mock-request-${Date.now()}` };
    } catch (error) {
      return {
        success: false,
        errorCode: "RebootInstanceFailed",
        errorMessage: error.message,
      };
    }
  }

  /**
   * 删除云手机实例
   */
  async deleteInstance(
    instanceId: string,
  ): Promise<AliyunOperationResult<void>> {
    this.logger.log(`Deleting instance: ${instanceId}`);

    try {
      // TODO: Replace with real SDK
      // await client.deleteInstance({ instanceId });

      const instance = this.instances.get(instanceId);
      if (!instance) {
        return {
          success: false,
          errorCode: "InvalidInstanceId.NotFound",
          errorMessage: "Instance not found",
        };
      }

      instance.status = AliyunPhoneStatus.DELETING;

      setTimeout(() => {
        this.instances.delete(instanceId);
        this.logger.log(`Instance ${instanceId} deleted`);
      }, 2000);

      return { success: true, requestId: `mock-request-${Date.now()}` };
    } catch (error) {
      return {
        success: false,
        errorCode: "DeleteInstanceFailed",
        errorMessage: error.message,
      };
    }
  }

  /**
   * 获取 WebRTC 连接信息
   *
   * 注意：阿里云 ECP 的 WebRTC Token 有效期为 30 秒，需要客户端及时使用
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 500, // 更短的延迟，因为 Token 有效期短
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: "aliyun-api",
    capacity: 20,
    refillRate: 10,
  })
  async getConnectionInfo(
    instanceId: string,
  ): Promise<AliyunOperationResult<AliyunConnectionInfo>> {
    this.logger.log(`Getting connection info for instance: ${instanceId}`);

    try {
      // TODO: Replace with real SDK
      // const response = await client.describeInstanceStreams({ instanceId });
      // return {
      //   success: true,
      //   data: {
      //     instanceId,
      //     streamUrl: response.body.streamUrl,
      //     token: response.body.token,
      //     expireTime: response.body.expireTime,
      //     ...
      //   },
      //   requestId: response.requestId
      // };

      // Mock 实现
      const instance = this.instances.get(instanceId);
      if (!instance) {
        return {
          success: false,
          errorCode: "InvalidInstanceId.NotFound",
          errorMessage: "Instance not found",
        };
      }

      const now = Date.now();
      const expireTime = new Date(now + 30000).toISOString(); // 30秒后过期

      const connectionInfo: AliyunConnectionInfo = {
        instanceId,
        streamUrl: `wss://ecp-stream.${this.config.regionId}.aliyuncs.com/stream/${instanceId}`,
        token: `mock-token-${Date.now()}-${Math.random().toString(36).substr(2, 16)}`,
        expireTime,
        stunServers: [
          `stun:stun.${this.config.regionId}.aliyuncs.com:3478`,
          "stun:stun.l.google.com:19302",
        ],
        turnServers: [
          {
            urls: `turn:turn.${this.config.regionId}.aliyuncs.com:3478`,
            username: "aliyun",
            credential: "mock-credential",
          },
        ],
        signalingUrl: `wss://ecp-signaling.${this.config.regionId}.aliyuncs.com/signaling/${instanceId}`,
        adbPublicKey: instance.publicIp
          ? "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDMock..."
          : undefined,
        adbEndpoint: instance.publicIp
          ? `${instance.publicIp}:5555`
          : undefined,
      };

      return {
        success: true,
        data: connectionInfo,
        requestId: `mock-request-${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: "GetConnectionInfoFailed",
        errorMessage: error.message,
      };
    }
  }

  /**
   * 列出云手机实例
   */
  async listInstances(
    request: ListAliyunPhonesRequest,
  ): Promise<AliyunOperationResult<AliyunPhoneInstance[]>> {
    try {
      // TODO: Replace with real SDK
      // const response = await client.describeInstances(request);
      // return { success: true, data: response.body.instances, requestId: response.requestId };

      // Mock 实现
      let instances = Array.from(this.instances.values()).filter(
        (inst) => inst.regionId === request.regionId,
      );

      if (request.instanceIds && request.instanceIds.length > 0) {
        instances = instances.filter((inst) =>
          request.instanceIds!.includes(inst.instanceId),
        );
      }

      if (request.status) {
        instances = instances.filter((inst) => inst.status === request.status);
      }

      if (request.instanceName) {
        instances = instances.filter((inst) =>
          inst.instanceName
            .toLowerCase()
            .includes(request.instanceName!.toLowerCase()),
        );
      }

      return {
        success: true,
        data: instances,
        requestId: `mock-request-${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: "ListInstancesFailed",
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
}
