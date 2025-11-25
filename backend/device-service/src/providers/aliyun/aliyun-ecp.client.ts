/**
 * 阿里云无影云手机 ECP SDK 客户端 - 2023-09-30 版本
 *
 * 使用官方 TypeScript SDK: @alicloud/eds-aic20230930
 *
 * 新版API特点：
 * - 实例组模式：创建实例组 → 自动创建实例
 * - 完整的ADB支持
 * - 监控指标获取
 * - 密钥对管理
 * - 截图功能
 *
 * 参考文档：
 * - https://help.aliyun.com/zh/ecp/api-eds-aic-2023-09-30-overview
 * - https://next.api.aliyun.com/api-tools/sdk/eds-aic?version=2023-09-30
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Retry, NetworkError, TimeoutError } from '../../common/retry.decorator';
import { RateLimit } from '../../common/rate-limit.decorator';

// 阿里云SDK导入 - 需要安装 @alicloud/eds-aic20230930
// eslint-disable-next-line @typescript-eslint/no-require-imports
import EdsAic20230930, * as $EdsAic20230930 from '@alicloud/eds-aic20230930';
import * as $OpenApi from '@alicloud/openapi-client';
import * as $Util from '@alicloud/tea-util';

/**
 * 提取响应体，处理可能为undefined的情况
 */
function extractBody<T>(response: { body?: T }): T {
  if (!response.body) {
    throw new Error('Response body is undefined');
  }
  return response.body;
}

/**
 * 阿里云ECP配置
 */
export interface AliyunEcpConfig {
  accessKeyId: string;
  accessKeySecret: string;
  regionId: string;
  endpoint?: string;
  timeout?: number;
  // 默认配置
  defaultOfficeSiteId?: string;
  defaultVSwitchId?: string;
  defaultKeyPairId?: string;
  defaultImageId?: string;
}

/**
 * 操作结果
 */
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  requestId?: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * 实例组信息
 */
export interface InstanceGroupInfo {
  instanceGroupId: string;
  instanceGroupName: string;
  instanceGroupSpec: string;
  imageId: string;
  officeSiteId: string;
  chargeType: string;
  status: string;
  amount: number;
  gpuDriverType?: string;
  regionId: string;
  gmtCreate: string;
  gmtExpired?: string;
}

/**
 * 实例信息
 */
export interface InstanceInfo {
  instanceId: string;
  instanceGroupId: string;
  instanceName: string;
  status: string;
  androidVersion: string;
  resolution: string;
  regionId: string;
  networkInterfaceIp?: string;
  publicIp?: string;
  adbServletAddress?: string;
  keyPairId?: string;
  gmtCreate: string;
}

/**
 * ADB连接信息
 */
export interface AdbConnectionInfo {
  instanceId: string;
  adbServletAddress: string;
  adbIntranetAddress?: string;
  adbConnect: boolean;
  adbEnabled: boolean;
}

/**
 * 连接凭证
 */
export interface ConnectionTicket {
  instanceId: string;
  ticket: string;
  taskId: string;
  taskStatus: string;
  appInstanceGroupId?: string;
}

@Injectable()
export class AliyunEcpClient implements OnModuleInit {
  private readonly logger = new Logger(AliyunEcpClient.name);
  private config: AliyunEcpConfig;
  private client: EdsAic20230930;
  private runtime: $Util.RuntimeOptions;

  constructor() {
    // 从环境变量加载配置
    this.config = {
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
      regionId: process.env.ALIYUN_REGION || 'cn-hangzhou',
      endpoint: process.env.ALIYUN_ECP_ENDPOINT,
      timeout: parseInt(process.env.ALIYUN_TIMEOUT || '30000', 10),
      defaultOfficeSiteId: process.env.ALIYUN_DEFAULT_OFFICE_SITE_ID,
      defaultVSwitchId: process.env.ALIYUN_DEFAULT_VSWITCH_ID,
      defaultKeyPairId: process.env.ALIYUN_DEFAULT_KEY_PAIR_ID,
      defaultImageId: process.env.ALIYUN_DEFAULT_IMAGE_ID,
    };

    // 创建运行时选项
    this.runtime = new $Util.RuntimeOptions({
      connectTimeout: this.config.timeout,
      readTimeout: this.config.timeout,
    });
  }

  async onModuleInit() {
    await this.initializeClient();
  }

  /**
   * 初始化SDK客户端
   */
  private async initializeClient(): Promise<void> {
    if (!this.config.accessKeyId || !this.config.accessKeySecret) {
      this.logger.warn('Aliyun credentials not configured. SDK will not work properly.');
      return;
    }

    try {
      const openApiConfig = new $OpenApi.Config({
        accessKeyId: this.config.accessKeyId,
        accessKeySecret: this.config.accessKeySecret,
        regionId: this.config.regionId,
        endpoint: this.config.endpoint || `eds-aic.${this.config.regionId}.aliyuncs.com`,
      });

      this.client = new EdsAic20230930(openApiConfig);
      this.logger.log(`AliyunEcpClient initialized for region: ${this.config.regionId}`);
    } catch (error) {
      this.logger.error(`Failed to initialize Aliyun client: ${error.message}`);
    }
  }

  /**
   * 检查客户端是否可用
   */
  private ensureClient(): void {
    if (!this.client) {
      throw new Error('Aliyun client not initialized. Check credentials.');
    }
  }

  // ============================================================
  // 地域和规格查询
  // ============================================================

  /**
   * 查询可用地域
   *
   * API: DescribeRegions
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  async describeRegions(): Promise<OperationResult<Array<{ regionId: string; regionName: string }>>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.DescribeRegionsRequest({});
      const response = await this.client.describeRegionsWithOptions(request, this.runtime);
      const body = extractBody(response);

      const regions = body.regions?.region?.map((r: { regionId?: string; localName?: string }) => ({
        regionId: r.regionId || '',
        regionName: r.localName || '',
      })) || [];

      return {
        success: true,
        data: regions,
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'DescribeRegions');
    }
  }

  /**
   * 查询可用规格
   *
   * API: DescribeSpec
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  async describeSpec(bizRegionId: string): Promise<OperationResult<Array<{
    specId: string;
    specType: string;
    core: number;
    memory: number;
  }>>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.DescribeSpecRequest({
        bizRegionId,
      });
      const response = await this.client.describeSpecWithOptions(request, this.runtime);
      const body = extractBody(response);

      const specs = body.specInfoModel?.map((s: { specId?: string; specType?: string; core?: number; memory?: number }) => ({
        specId: s.specId || '',
        specType: s.specType || '',
        core: s.core || 0,
        memory: s.memory || 0,
      })) || [];

      return {
        success: true,
        data: specs,
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'DescribeSpec');
    }
  }

  // ============================================================
  // 实例组管理
  // ============================================================

  /**
   * 创建云手机实例组
   *
   * API: CreateAndroidInstanceGroup
   *
   * 这是新版API的核心方法，创建实例组会自动创建实例
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 2000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 10, refillRate: 5 })
  async createInstanceGroup(params: {
    bizRegionId: string;
    instanceGroupSpec: string;
    imageId: string;
    instanceGroupName?: string;
    numberOfInstances?: number;
    chargeType?: 'PostPaid' | 'PrePaid';
    period?: number;
    periodUnit?: 'Month' | 'Year';
    autoPay?: boolean;
    officeSiteId?: string;
    vSwitchId?: string;
    keyPairId?: string;
    policyGroupId?: string;
  }): Promise<OperationResult<{
    instanceGroupIds: string[];
    instanceIds: string[];
    orderId?: string;
  }>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.CreateAndroidInstanceGroupRequest({
        bizRegionId: params.bizRegionId,
        instanceGroupSpec: params.instanceGroupSpec,
        imageId: params.imageId,
        instanceGroupName: params.instanceGroupName,
        numberOfInstances: params.numberOfInstances || 1,
        chargeType: params.chargeType || 'PostPaid',
        period: params.period,
        periodUnit: params.periodUnit,
        autoPay: params.autoPay ?? true,
        officeSiteId: params.officeSiteId || this.config.defaultOfficeSiteId,
        vSwitchId: params.vSwitchId || this.config.defaultVSwitchId,
        keyPairId: params.keyPairId || this.config.defaultKeyPairId,
        policyGroupId: params.policyGroupId,
      });

      const response = await this.client.createAndroidInstanceGroupWithOptions(request, this.runtime);
      const body = extractBody(response);

      // 解析返回的实例组和实例ID
      const instanceGroupIds = body.instanceGroupIds || [];
      const instanceIds: string[] = [];

      // 从InstanceGroupInfos中提取实例ID
      body.instanceGroupInfos?.forEach((info: { instanceIds?: string[] }) => {
        if (info.instanceIds) {
          instanceIds.push(...info.instanceIds);
        }
      });

      return {
        success: true,
        data: {
          instanceGroupIds,
          instanceIds,
          orderId: body.orderId,
        },
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'CreateAndroidInstanceGroup');
    }
  }

  /**
   * 查询实例组列表
   *
   * API: DescribeAndroidInstanceGroups
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 20, refillRate: 10 })
  async describeInstanceGroups(params: {
    bizRegionId?: string;
    instanceGroupIds?: string[];
    instanceGroupName?: string;
    status?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Promise<OperationResult<{
    instanceGroups: InstanceGroupInfo[];
    totalCount: number;
  }>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.DescribeAndroidInstanceGroupsRequest({
        bizRegionId: params.bizRegionId,
        instanceGroupIds: params.instanceGroupIds,
        instanceGroupName: params.instanceGroupName,
        status: params.status,
        maxResults: params.pageSize || 20,
        nextToken: params.pageNumber ? String(params.pageNumber) : undefined,
      });

      const response = await this.client.describeAndroidInstanceGroupsWithOptions(request, this.runtime);
      const body = extractBody(response);

      const instanceGroups: InstanceGroupInfo[] = body.instanceGroupModel?.map((g: {
        instanceGroupId?: string;
        instanceGroupName?: string;
        instanceGroupSpec?: string;
        imageId?: string;
        officeSiteId?: string;
        chargeType?: string;
        saleStatus?: string;
        numberOfInstances?: number | string;
        gpuDriverType?: string;
        bizRegionId?: string;
        gmtCreate?: string;
        gmtExpired?: string;
      }) => ({
        instanceGroupId: g.instanceGroupId || '',
        instanceGroupName: g.instanceGroupName || '',
        instanceGroupSpec: g.instanceGroupSpec || '',
        imageId: g.imageId || '',
        officeSiteId: g.officeSiteId || '',
        chargeType: g.chargeType || '',
        status: g.saleStatus || '',
        amount: typeof g.numberOfInstances === 'number' ? g.numberOfInstances : parseInt(String(g.numberOfInstances || '0'), 10),
        gpuDriverType: g.gpuDriverType,
        regionId: g.bizRegionId || '',
        gmtCreate: g.gmtCreate || '',
        gmtExpired: g.gmtExpired,
      })) || [];

      return {
        success: true,
        data: {
          instanceGroups,
          totalCount: body.totalCount || instanceGroups.length,
        },
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'DescribeAndroidInstanceGroups');
    }
  }

  /**
   * 删除实例组
   *
   * API: DeleteAndroidInstanceGroup
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 10, refillRate: 5 })
  async deleteInstanceGroup(instanceGroupId: string): Promise<OperationResult<void>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.DeleteAndroidInstanceGroupRequest({
        instanceGroupIds: [instanceGroupId],
      });

      const response = await this.client.deleteAndroidInstanceGroupWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'DeleteAndroidInstanceGroup');
    }
  }

  // ============================================================
  // 实例管理
  // ============================================================

  /**
   * 查询实例列表
   *
   * API: DescribeAndroidInstances
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 20, refillRate: 10 })
  async describeInstances(params: {
    instanceIds?: string[];
    instanceGroupId?: string;
    instanceName?: string;
    status?: string;
    keyPairId?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Promise<OperationResult<{
    instances: InstanceInfo[];
    totalCount: number;
  }>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.DescribeAndroidInstancesRequest({
        androidInstanceIds: params.instanceIds,
        instanceGroupId: params.instanceGroupId,
        androidInstanceName: params.instanceName,
        status: params.status,
        keyPairId: params.keyPairId,
        maxResults: params.pageSize || 20,
        nextToken: params.pageNumber ? String(params.pageNumber) : undefined,
      });

      const response = await this.client.describeAndroidInstancesWithOptions(request, this.runtime);
      const body = extractBody(response);

      const instances: InstanceInfo[] = body.instanceModel?.map((i: {
        androidInstanceId?: string;
        instanceGroupId?: string;
        androidInstanceName?: string;
        androidInstanceStatus?: string;
        androidVersion?: string;
        resolution?: string;
        bizRegionId?: string;
        networkInterfaceIp?: string;
        publicIp?: string;
        adbServletAddress?: string;
        keyPairId?: string;
        gmtCreate?: string;
      }) => ({
        instanceId: i.androidInstanceId || '',
        instanceGroupId: i.instanceGroupId || '',
        instanceName: i.androidInstanceName || '',
        status: i.androidInstanceStatus || '',
        androidVersion: i.androidVersion || '',
        resolution: i.resolution || '',
        regionId: i.bizRegionId || '',
        networkInterfaceIp: i.networkInterfaceIp,
        publicIp: i.publicIp,
        adbServletAddress: i.adbServletAddress,
        keyPairId: i.keyPairId,
        gmtCreate: i.gmtCreate || '',
      })) || [];

      return {
        success: true,
        data: {
          instances,
          totalCount: body.totalCount || instances.length,
        },
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'DescribeAndroidInstances');
    }
  }

  /**
   * 启动实例
   *
   * API: StartAndroidInstance
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 20, refillRate: 10 })
  async startInstance(instanceIds: string[]): Promise<OperationResult<void>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.StartAndroidInstanceRequest({
        androidInstanceIds: instanceIds,
      });

      const response = await this.client.startAndroidInstanceWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'StartAndroidInstance');
    }
  }

  /**
   * 停止实例
   *
   * API: StopAndroidInstance
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 20, refillRate: 10 })
  async stopInstance(instanceIds: string[]): Promise<OperationResult<void>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.StopAndroidInstanceRequest({
        androidInstanceIds: instanceIds,
      });

      const response = await this.client.stopAndroidInstanceWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'StopAndroidInstance');
    }
  }

  /**
   * 重启实例
   *
   * API: RebootAndroidInstancesInGroup
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 20, refillRate: 10 })
  async rebootInstance(instanceIds: string[], forceReboot: boolean = false): Promise<OperationResult<void>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.RebootAndroidInstancesInGroupRequest({
        androidInstanceIds: instanceIds,
        forceStop: forceReboot,
      });

      const response = await this.client.rebootAndroidInstancesInGroupWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'RebootAndroidInstancesInGroup');
    }
  }

  /**
   * 重置实例（恢复出厂设置）
   *
   * API: ResetAndroidInstancesInGroup
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 2000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 10, refillRate: 5 })
  async resetInstance(instanceIds: string[]): Promise<OperationResult<void>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.ResetAndroidInstancesInGroupRequest({
        androidInstanceIds: instanceIds,
      });

      const response = await this.client.resetAndroidInstancesInGroupWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'ResetAndroidInstancesInGroup');
    }
  }

  // ============================================================
  // ADB连接管理 (新功能)
  // ============================================================

  /**
   * 开启ADB连接
   *
   * API: StartInstanceAdb
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 20, refillRate: 10 })
  async startInstanceAdb(instanceIds: string[]): Promise<OperationResult<void>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.StartInstanceAdbRequest({
        instanceIds: instanceIds.join(','),
      });

      const response = await this.client.startInstanceAdbWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'StartInstanceAdb');
    }
  }

  /**
   * 关闭ADB连接
   *
   * API: StopInstanceAdb
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 20, refillRate: 10 })
  async stopInstanceAdb(instanceIds: string[]): Promise<OperationResult<void>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.StopInstanceAdbRequest({
        instanceIds: instanceIds.join(','),
      });

      const response = await this.client.stopInstanceAdbWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'StopInstanceAdb');
    }
  }

  /**
   * 查询ADB连接属性
   *
   * API: ListInstanceAdbAttributes
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 20, refillRate: 10 })
  async listInstanceAdbAttributes(instanceIds: string[]): Promise<OperationResult<AdbConnectionInfo[]>> {
    this.ensureClient();

    // 注意：此API可能名称不同，需要根据实际SDK确认
    // 这里使用一个通用的实现方式
    try {
      // 通过查询实例详情获取ADB信息
      const result = await this.describeInstances({ instanceIds });

      if (!result.success || !result.data) {
        return {
          success: false,
          errorCode: 'DESCRIBE_FAILED',
          errorMessage: 'Failed to get instance details',
        };
      }

      const adbInfos: AdbConnectionInfo[] = result.data.instances.map((i) => ({
        instanceId: i.instanceId,
        adbServletAddress: i.adbServletAddress || '',
        adbConnect: !!i.adbServletAddress,
        adbEnabled: !!i.adbServletAddress,
      }));

      return {
        success: true,
        data: adbInfos,
        requestId: result.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'ListInstanceAdbAttributes');
    }
  }

  // ============================================================
  // 连接凭证
  // ============================================================

  /**
   * 批量获取连接凭证
   *
   * API: BatchGetAcpConnectionTicket
   *
   * 用于Web SDK连接
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 500, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 30, refillRate: 15 })
  async batchGetConnectionTicket(params: {
    instanceIds: string[];
    endUserId?: string;
    instanceGroupId?: string;
  }): Promise<OperationResult<ConnectionTicket[]>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.BatchGetAcpConnectionTicketRequest({
        instanceId: params.instanceIds,
        endUserId: params.endUserId,
        instanceGroupId: params.instanceGroupId,
      });

      const response = await this.client.batchGetAcpConnectionTicketWithOptions(request, this.runtime);
      const body = extractBody(response);

      const tickets: ConnectionTicket[] = body.instanceConnectionModels?.map((t: {
        androidInstanceId?: string;
        connectionTicket?: string;
        taskId?: string;
        taskStatus?: string;
        appInstanceGroupId?: string;
      }) => ({
        instanceId: t.androidInstanceId || '',
        ticket: t.connectionTicket || '',
        taskId: t.taskId || '',
        taskStatus: t.taskStatus || '',
        appInstanceGroupId: t.appInstanceGroupId,
      })) || [];

      return {
        success: true,
        data: tickets,
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'BatchGetAcpConnectionTicket');
    }
  }

  // ============================================================
  // 远程命令执行
  // ============================================================

  /**
   * 执行命令
   *
   * API: RunCommand
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 20, refillRate: 10 })
  async runCommand(params: {
    instanceIds: string[];
    commandContent: string;
    timeout?: number;
    contentEncoding?: 'PlainText' | 'Base64';
  }): Promise<OperationResult<{ invokeId: string }>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.RunCommandRequest({
        instanceIds: params.instanceIds,
        commandContent: params.commandContent,
        timeout: params.timeout || 60,
        contentEncoding: params.contentEncoding || 'PlainText',
      });

      const response = await this.client.runCommandWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        data: {
          invokeId: body.invokeId || '',
        },
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'RunCommand');
    }
  }

  /**
   * 查询命令执行结果
   *
   * API: DescribeInvocations
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 20, refillRate: 10 })
  async describeInvocations(invokeId: string): Promise<OperationResult<Array<{
    instanceId: string;
    exitCode: number;
    output: string;
    errorOutput: string;
    status: string;
  }>>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.DescribeInvocationsRequest({
        invokeId,
      });

      const response = await this.client.describeInvocationsWithOptions(request, this.runtime);
      const body = extractBody(response);

      const results = body.data?.map((r: {
        instanceId?: string;
        exitCode?: number;
        output?: string;
        errorInfo?: string;
        invocationStatus?: string;
      }) => ({
        instanceId: r.instanceId || '',
        exitCode: r.exitCode || 0,
        output: r.output || '',
        errorOutput: r.errorInfo || '',
        status: r.invocationStatus || '',
      })) || [];

      return {
        success: true,
        data: results,
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'DescribeInvocations');
    }
  }

  // ============================================================
  // 文件操作
  // ============================================================

  /**
   * 发送文件到云手机
   *
   * API: SendFile
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 2000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 10, refillRate: 5 })
  async sendFile(params: {
    instanceIds: string[];
    sourceFilePath: string;
    androidPath: string;
  }): Promise<OperationResult<{ taskId: string }>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.SendFileRequest({
        androidInstanceIdList: params.instanceIds,
        sourceFilePath: params.sourceFilePath,
        androidPath: params.androidPath,
      });

      const response = await this.client.sendFileWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        data: {
          taskId: body.taskId || '',
        },
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'SendFile');
    }
  }

  /**
   * 从云手机拉取文件
   *
   * API: FetchFile
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 2000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 10, refillRate: 5 })
  async fetchFile(params: {
    instanceId: string;
    androidPath: string;
    uploadType: 'OSS';
    uploadEndpoint: string;
    uploadUrl: string;
  }): Promise<OperationResult<{ taskId: string }>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.FetchFileRequest({
        androidInstanceId: params.instanceId,
        sourcePath: params.androidPath,
        uploadType: params.uploadType,
        uploadEndpoint: params.uploadEndpoint,
        uploadUrl: params.uploadUrl,
      });

      const response = await this.client.fetchFileWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        data: {
          taskId: body.taskId || '',
        },
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'FetchFile');
    }
  }

  // ============================================================
  // 应用管理
  // ============================================================

  /**
   * 安装应用
   *
   * API: InstallApp
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 2000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 10, refillRate: 5 })
  async installApp(params: {
    instanceGroupIdList: string[];
    appIdList: string[];
  }): Promise<OperationResult<{ taskId: string }>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.InstallAppRequest({
        instanceGroupIdList: params.instanceGroupIdList,
        appIdList: params.appIdList,
      });

      const response = await this.client.installAppWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        data: {
          taskId: body.taskId || '',
        },
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'InstallApp');
    }
  }

  /**
   * 卸载应用
   *
   * API: UninstallApp
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 2000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 10, refillRate: 5 })
  async uninstallApp(params: {
    instanceGroupIdList: string[];
    appIdList: string[];
  }): Promise<OperationResult<{ taskId: string }>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.UninstallAppRequest({
        instanceGroupIdList: params.instanceGroupIdList,
        appIdList: params.appIdList,
      });

      const response = await this.client.uninstallAppWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        data: {
          taskId: body.taskId || '',
        },
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'UninstallApp');
    }
  }

  // ============================================================
  // 截图功能 (新功能)
  // ============================================================

  /**
   * 创建截图
   *
   * API: CreateScreenshot
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 20, refillRate: 10 })
  async createScreenshot(instanceIds: string[]): Promise<OperationResult<{ taskId: string }>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.CreateScreenshotRequest({
        androidInstanceIdList: instanceIds,
      });

      const response = await this.client.createScreenshotWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        data: {
          taskId: body.taskId || '',
        },
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'CreateScreenshot');
    }
  }

  // ============================================================
  // 镜像管理
  // ============================================================

  /**
   * 查询镜像列表
   *
   * API: DescribeImageList
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 20, refillRate: 10 })
  async describeImageList(params: {
    imageId?: string;
    imageName?: string;
    imageType?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Promise<OperationResult<Array<{
    imageId: string;
    imageName: string;
    imageType: string;
    androidVersion: string;
    status: string;
    gmtCreate: string;
  }>>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.DescribeImageListRequest({
        imageId: params.imageId,
        imageName: params.imageName,
        imageType: params.imageType,
        maxResults: params.pageSize || 20,
        nextToken: params.pageNumber ? String(params.pageNumber) : undefined,
      });

      const response = await this.client.describeImageListWithOptions(request, this.runtime);
      const body = extractBody(response);

      const images = body.data?.map((i: {
        imageId?: string;
        imageName?: string;
        imageType?: string;
        aliVersion?: string;
        status?: string;
        gmtCreate?: string;
      }) => ({
        imageId: i.imageId || '',
        imageName: i.imageName || '',
        imageType: i.imageType || '',
        androidVersion: i.aliVersion || '',
        status: i.status || '',
        gmtCreate: i.gmtCreate || '',
      })) || [];

      return {
        success: true,
        data: images,
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'DescribeImageList');
    }
  }

  /**
   * 创建自定义镜像
   *
   * API: CreateCustomImage
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 2000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 5, refillRate: 2 })
  async createCustomImage(params: {
    instanceId: string;
    imageName: string;
    description?: string;
  }): Promise<OperationResult<{ imageId: string }>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.CreateCustomImageRequest({
        instanceId: params.instanceId,
        imageName: params.imageName,
        description: params.description,
      });

      const response = await this.client.createCustomImageWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        data: {
          imageId: body.imageId || '',
        },
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'CreateCustomImage');
    }
  }

  // ============================================================
  // 密钥对管理 (新功能)
  // ============================================================

  /**
   * 创建密钥对
   *
   * API: CreateKeyPair
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 10, refillRate: 5 })
  async createKeyPair(keyPairName: string): Promise<OperationResult<{
    keyPairId: string;
    keyPairName: string;
    privateKeyBody: string;
  }>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.CreateKeyPairRequest({
        keyPairName,
      });

      const response = await this.client.createKeyPairWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        data: {
          keyPairId: body.keyPairId || '',
          keyPairName: body.keyPairName || '',
          privateKeyBody: body.privateKeyBody || '',
        },
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'CreateKeyPair');
    }
  }

  /**
   * 查询密钥对
   *
   * API: DescribeKeyPairs
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 20, refillRate: 10 })
  async describeKeyPairs(params?: {
    keyPairIds?: string[];
    keyPairName?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Promise<OperationResult<Array<{
    keyPairId: string;
    keyPairName: string;
    gmtCreate: string;
  }>>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.DescribeKeyPairsRequest({
        keyPairIds: params?.keyPairIds,
        keyPairName: params?.keyPairName,
        maxResults: params?.pageSize || 20,
        nextToken: params?.pageNumber ? String(params.pageNumber) : undefined,
      });

      const response = await this.client.describeKeyPairsWithOptions(request, this.runtime);
      const body = extractBody(response);

      const keyPairs = body.data?.map((k: {
        keyPairId?: string;
        keyPairName?: string;
        gmtCreated?: string;
      }) => ({
        keyPairId: k.keyPairId || '',
        keyPairName: k.keyPairName || '',
        gmtCreate: k.gmtCreated || '',
      })) || [];

      return {
        success: true,
        data: keyPairs,
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'DescribeKeyPairs');
    }
  }

  /**
   * 绑定密钥对到实例
   *
   * API: AttachKeyPair
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 10, refillRate: 5 })
  async attachKeyPair(params: {
    keyPairId: string;
    instanceIds: string[];
  }): Promise<OperationResult<void>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.AttachKeyPairRequest({
        keyPairId: params.keyPairId,
        instanceIds: params.instanceIds,
      });

      const response = await this.client.attachKeyPairWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'AttachKeyPair');
    }
  }

  // ============================================================
  // 监控指标 (新功能)
  // ============================================================

  /**
   * 获取最新监控数据
   *
   * API: DescribeMetricLast
   *
   * 支持的指标名称:
   * - cpu_utilization: CPU 使用率
   * - memory_utilization: 内存使用率
   * - disk_utilization: 磁盘使用率
   * - network_in: 网络入流量
   * - network_out: 网络出流量
   *
   * @param instanceIds 实例 ID 列表
   * @param metricNames 指标名称列表
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 30, refillRate: 15 })
  async describeMetricLast(params: {
    instanceIds: string[];
    metricNames: string[];
  }): Promise<OperationResult<Array<{
    instanceId: string;
    metrics: Array<{
      metricName: string;
      average: number;
      maximum: number;
      minimum: number;
      timestamp: number;
    }>;
  }>>> {
    this.ensureClient();

    try {
      this.logger.log(`Getting metrics [${params.metricNames.join(', ')}] for ${params.instanceIds.length} instances`);

      const request = new $EdsAic20230930.DescribeMetricLastRequest({
        androidInstanceIds: params.instanceIds,
        metricNames: params.metricNames,
      });

      const response = await this.client.describeMetricLastWithOptions(request, this.runtime);
      const body = extractBody(response);

      // 解析响应数据
      const result = (body.metricTotalModel || []).map((model: {
        androidInstanceId?: string;
        metricModelList?: Array<{
          metricName?: string;
          dataPoints?: Array<{
            average?: number;
            maximum?: number;
            minimum?: number;
            timestamp?: number;
          }>;
        }>;
      }) => ({
        instanceId: model.androidInstanceId || '',
        metrics: (model.metricModelList || []).map((m) => {
          // 取最新的数据点
          const latestPoint = m.dataPoints?.[m.dataPoints.length - 1];
          return {
            metricName: m.metricName || '',
            average: latestPoint?.average || 0,
            maximum: latestPoint?.maximum || 0,
            minimum: latestPoint?.minimum || 0,
            timestamp: latestPoint?.timestamp || Date.now(),
          };
        }),
      }));

      return {
        success: true,
        data: result,
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'DescribeMetricLast');
    }
  }

  /**
   * 获取设备的完整指标数据
   *
   * 便捷方法，获取常用的所有指标
   */
  async getDeviceMetrics(instanceId: string): Promise<OperationResult<{
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIn: number;
    networkOut: number;
    timestamp: number;
  }>> {
    const result = await this.describeMetricLast({
      instanceIds: [instanceId],
      metricNames: ['cpu_utilization', 'memory_utilization', 'disk_utilization', 'network_in', 'network_out'],
    });

    if (!result.success || !result.data || result.data.length === 0) {
      return {
        success: false,
        errorCode: result.errorCode || 'METRICS_NOT_FOUND',
        errorMessage: result.errorMessage || 'Failed to get metrics',
      };
    }

    const instanceMetrics = result.data[0];
    const metricsMap = new Map(instanceMetrics.metrics.map((m) => [m.metricName, m]));

    return {
      success: true,
      data: {
        cpuUsage: metricsMap.get('cpu_utilization')?.average || 0,
        memoryUsage: metricsMap.get('memory_utilization')?.average || 0,
        diskUsage: metricsMap.get('disk_utilization')?.average || 0,
        networkIn: metricsMap.get('network_in')?.average || 0,
        networkOut: metricsMap.get('network_out')?.average || 0,
        timestamp: metricsMap.get('cpu_utilization')?.timestamp || Date.now(),
      },
      requestId: result.requestId,
    };
  }

  // ============================================================
  // 备份管理
  // ============================================================

  /**
   * 创建备份
   *
   * API: BackupFile
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 2000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 5, refillRate: 2 })
  async backupFile(params: {
    instanceIds: string[];
    androidPath: string;
    backupFilePath: string;
    uploadType: 'OSS';
    uploadEndpoint: string;
  }): Promise<OperationResult<{ taskId: string }>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.BackupFileRequest({
        androidInstanceIdList: params.instanceIds,
        sourcePath: params.androidPath,
        backupFilePath: params.backupFilePath,
        uploadType: params.uploadType,
        uploadEndpoint: params.uploadEndpoint,
      });

      const response = await this.client.backupFileWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        data: {
          taskId: body.taskId || '',
        },
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'BackupFile');
    }
  }

  /**
   * 恢复备份
   *
   * API: RecoveryFile
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 2000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 5, refillRate: 2 })
  async recoveryFile(params: {
    instanceIds: string[];
    sourceFilePath: string;
    androidPath: string;
  }): Promise<OperationResult<{ taskId: string }>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.RecoveryFileRequest({
        androidInstanceIdList: params.instanceIds,
        sourceFilePath: params.sourceFilePath,
        androidPath: params.androidPath,
      });

      const response = await this.client.recoveryFileWithOptions(request, this.runtime);
      const body = extractBody(response);

      return {
        success: true,
        data: {
          taskId: body.taskId || '',
        },
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'RecoveryFile');
    }
  }

  // ============================================================
  // 任务查询
  // ============================================================

  /**
   * 查询任务
   *
   * API: DescribeTasks
   */
  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [NetworkError, TimeoutError] })
  @RateLimit({ key: 'aliyun-api', capacity: 20, refillRate: 10 })
  async describeTasks(params: {
    taskIds?: string[];
    taskType?: string;
    status?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Promise<OperationResult<Array<{
    taskId: string;
    taskType: string;
    status: string;
    progress: number;
    gmtCreate: string;
    gmtFinished?: string;
    result?: string;
    errorCode?: string;
    errorMsg?: string;
    instanceId?: string;
  }>>> {
    this.ensureClient();

    try {
      const request = new $EdsAic20230930.DescribeTasksRequest({
        taskIds: params.taskIds,
        taskType: params.taskType,
        taskStatus: params.status,
        maxResults: params.pageSize || 20,
        nextToken: params.pageNumber ? String(params.pageNumber) : undefined,
      });

      const response = await this.client.describeTasksWithOptions(request, this.runtime);
      const body = extractBody(response);

      const tasks = body.data?.map((t: {
        taskId?: string;
        taskType?: string;
        taskStatus?: string;
        progress?: number;
        gmtCreate?: string;
        gmtFinished?: string;
        result?: string;
        errorCode?: string;
        errorMsg?: string;
        instanceId?: string;
      }) => ({
        taskId: t.taskId || '',
        taskType: t.taskType || '',
        status: t.taskStatus || '',
        progress: t.progress || 0,
        gmtCreate: t.gmtCreate || '',
        gmtFinished: t.gmtFinished,
        result: t.result,
        errorCode: t.errorCode,
        errorMsg: t.errorMsg,
        instanceId: t.instanceId,
      })) || [];

      return {
        success: true,
        data: tasks,
        requestId: body.requestId,
      };
    } catch (error) {
      return this.handleError(error, 'DescribeTasks');
    }
  }

  /**
   * 等待截图任务完成并返回截图 URL
   *
   * @param taskId 任务 ID
   * @param maxAttempts 最大轮询次数 (默认 30)
   * @param intervalMs 轮询间隔毫秒 (默认 2000)
   * @returns 截图 URL
   */
  async waitForScreenshotResult(
    taskId: string,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<OperationResult<{ url: string; instanceId?: string }>> {
    this.logger.log(`Waiting for screenshot task ${taskId} to complete...`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await this.describeTasks({ taskIds: [taskId] });

      if (!result.success || !result.data || result.data.length === 0) {
        this.logger.warn(`Failed to query task ${taskId}, attempt ${attempt}/${maxAttempts}`);
        await this.sleep(intervalMs);
        continue;
      }

      const task = result.data[0];
      this.logger.debug(`Task ${taskId} status: ${task.status}, progress: ${task.progress}%`);

      // 任务完成状态
      if (task.status === 'Finished' || task.status === 'Success') {
        // 解析结果中的截图 URL
        if (task.result) {
          try {
            const resultData = JSON.parse(task.result);
            // 阿里云截图结果可能的格式：
            // { "url": "https://..." } 或 { "screenshotUrl": "https://..." } 或 { "OssUrl": "https://..." }
            const url = resultData.url || resultData.screenshotUrl || resultData.OssUrl || resultData.ossUrl;
            if (url) {
              this.logger.log(`Screenshot task ${taskId} completed, URL: ${url}`);
              return {
                success: true,
                data: { url, instanceId: task.instanceId },
              };
            }
          } catch (parseError) {
            // 如果 result 本身就是 URL
            if (task.result.startsWith('http')) {
              return {
                success: true,
                data: { url: task.result, instanceId: task.instanceId },
              };
            }
            this.logger.warn(`Failed to parse task result: ${task.result}`);
          }
        }

        return {
          success: false,
          errorCode: 'SCREENSHOT_URL_NOT_FOUND',
          errorMessage: `Task completed but screenshot URL not found in result: ${task.result}`,
        };
      }

      // 任务失败
      if (task.status === 'Failed' || task.status === 'Error') {
        return {
          success: false,
          errorCode: task.errorCode || 'SCREENSHOT_FAILED',
          errorMessage: task.errorMsg || `Screenshot task failed: ${task.result}`,
        };
      }

      // 继续等待
      await this.sleep(intervalMs);
    }

    return {
      success: false,
      errorCode: 'SCREENSHOT_TIMEOUT',
      errorMessage: `Screenshot task ${taskId} did not complete within ${maxAttempts * intervalMs / 1000} seconds`,
    };
  }

  /**
   * 睡眠辅助函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================
  // 私有方法
  // ============================================================

  /**
   * 统一错误处理
   */
  private handleError(error: any, operation: string): OperationResult<any> {
    this.logger.error(`${operation} failed: ${error.message}`, error.stack);

    return {
      success: false,
      errorCode: error.code || error.name || 'UnknownError',
      errorMessage: error.message || `Failed to execute ${operation}`,
    };
  }

  /**
   * 获取配置
   */
  getConfig(): AliyunEcpConfig {
    return { ...this.config };
  }
}
