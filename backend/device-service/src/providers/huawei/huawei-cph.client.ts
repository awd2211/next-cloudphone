import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HuaweiCphConfig,
  HuaweiPhoneInstance,
  HuaweiPhoneStatus,
  CreateHuaweiPhoneRequest,
  HuaweiConnectionInfo,
  HuaweiOperationResult,
  HuaweiAdbCommandResponse,
  HuaweiBatchJobStatus,
} from './huawei.types';
import { Retry, NetworkError, TimeoutError } from '../../common/retry.decorator';
import { RateLimit } from '../../common/rate-limit.decorator';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import * as crypto from 'crypto';

/**
 * HuaweiCphClient
 *
 * 华为云手机 CPH SDK 客户端 - 真实实现
 *
 * 基于华为云 OpenAPI 3.0 规范实现
 * 文档: https://support.huaweicloud.com/api-cph/cph_02_0001.html
 *
 * 实现方式:
 * - 使用 @nestjs/axios (HttpService) 发送HTTP请求
 * - 实现华为云 AK/SK 签名认证
 * - 支持重试和限流
 */
@Injectable()
export class HuaweiCphClient {
  private readonly logger = new Logger(HuaweiCphClient.name);
  private config: HuaweiCphConfig;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService
  ) {
    this.config = {
      projectId: this.configService.get('HUAWEI_PROJECT_ID', ''),
      accessKeyId: this.configService.get('HUAWEI_ACCESS_KEY_ID', ''),
      secretAccessKey: this.configService.get('HUAWEI_SECRET_ACCESS_KEY', ''),
      region: this.configService.get('HUAWEI_REGION', 'cn-north-4'),
      endpoint: this.configService.get(
        'HUAWEI_ENDPOINT',
        'https://cph.cn-north-4.myhuaweicloud.com'
      ),
      defaultServerId: this.configService.get('HUAWEI_DEFAULT_SERVER_ID', ''),
      defaultImageId: this.configService.get('HUAWEI_DEFAULT_IMAGE_ID', ''),
    };

    this.logger.log(`HuaweiCphClient initialized for region: ${this.config.region}`);

    // 验证必要配置
    if (!this.config.accessKeyId || !this.config.secretAccessKey) {
      this.logger.warn('Huawei Cloud credentials not configured. SDK will not work properly.');
    }
  }

  /**
   * 创建云手机实例
   *
   * API: POST /v1/{project_id}/cloud-phone/phones
   */
  async createPhone(
    request: CreateHuaweiPhoneRequest
  ): Promise<HuaweiOperationResult<HuaweiPhoneInstance>> {
    try {
      this.logger.log(`Creating Huawei phone: ${request.phoneName}`);

      const body = {
        phone_name: request.phoneName,
        server_id: request.serverId,
        phone_model_name: request.specId,
        image_id: request.imageId,
        count: request.count || 1,
        keypair_name: request.property?.keypairName,
        extend_param: request.property,
      };

      const response = await this.makeRequest<{
        jobs: Array<{ phone_id: string; job_id: string }>;
      }>('POST', `/v1/${this.config.projectId}/cloud-phone/phones`, body);

      if (!response.success || !response.data) {
        return {
          success: false,
          errorCode: response.errorCode,
          errorMessage: response.errorMessage,
          requestId: response.requestId,
        };
      }

      // 华为云创建是异步的,返回job_id
      const phoneId = response.data.jobs?.[0]?.phone_id;
      if (!phoneId) {
        return {
          success: false,
          errorCode: 'PHONE_ID_MISSING',
          errorMessage: 'Phone ID not found in response',
        };
      }

      // 等待手机创建完成(轮询状态)
      const instance = await this.waitForPhoneReady(phoneId);

      return {
        success: true,
        data: instance,
        requestId: response.requestId,
      };
    } catch (error) {
      this.logger.error(`Failed to create Huawei phone: ${error.message}`);
      return {
        success: false,
        errorCode: 'CREATE_FAILED',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 获取云手机实例详情
   *
   * API: GET /v1/{project_id}/cloud-phone/phones/{phone_id}
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'huawei-api',
    capacity: 15,
    refillRate: 8, // 8 requests/second
  })
  async getPhone(instanceId: string): Promise<HuaweiOperationResult<HuaweiPhoneInstance>> {
    try {
      const response = await this.makeRequest<{ phone: any }>(
        'GET',
        `/v1/${this.config.projectId}/cloud-phone/phones/${instanceId}`
      );

      if (!response.success || !response.data) {
        return {
          success: false,
          errorCode: response.errorCode,
          errorMessage: response.errorMessage,
          requestId: response.requestId,
        };
      }

      const phone = response.data.phone;
      const instance: HuaweiPhoneInstance = {
        instanceId: phone.phone_id,
        instanceName: phone.phone_name,
        specId: phone.phone_model_name,
        status: this.mapStatus(phone.status),
        serverId: phone.server_id,
        createTime: phone.create_time,
        updateTime: phone.update_time,
        publicIp: phone.access_infos?.[0]?.intranet_ip,
        privateIp: phone.access_infos?.[0]?.internet_ip,
        property: phone.extend_param,
      };

      return {
        success: true,
        data: instance,
        requestId: response.requestId,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: 'GET_FAILED',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 启动云手机实例
   *
   * API: POST /v1/{project_id}/cloud-phone/phones/batch-start
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'huawei-api',
    capacity: 15,
    refillRate: 8,
  })
  async startPhone(instanceId: string): Promise<HuaweiOperationResult<void>> {
    try {
      this.logger.log(`Starting Huawei phone: ${instanceId}`);

      const response = await this.makeRequest(
        'POST',
        `/v1/${this.config.projectId}/cloud-phone/phones/batch-start`,
        {
          phones: [{ phone_id: instanceId }],
        }
      );

      return {
        success: response.success,
        errorCode: response.errorCode,
        errorMessage: response.errorMessage,
        requestId: response.requestId,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: 'START_FAILED',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 停止云手机实例
   *
   * API: POST /v1/{project_id}/cloud-phone/phones/batch-stop
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'huawei-api',
    capacity: 15,
    refillRate: 8,
  })
  async stopPhone(instanceId: string): Promise<HuaweiOperationResult<void>> {
    try {
      this.logger.log(`Stopping Huawei phone: ${instanceId}`);

      const response = await this.makeRequest(
        'POST',
        `/v1/${this.config.projectId}/cloud-phone/phones/batch-stop`,
        {
          phones: [{ phone_id: instanceId }],
        }
      );

      return {
        success: response.success,
        errorCode: response.errorCode,
        errorMessage: response.errorMessage,
        requestId: response.requestId,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: 'STOP_FAILED',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 重启云手机实例
   *
   * API: POST /v1/{project_id}/cloud-phone/phones/batch-restart
   */
  async rebootPhone(instanceId: string): Promise<HuaweiOperationResult<void>> {
    try {
      this.logger.log(`Rebooting Huawei phone: ${instanceId}`);

      const response = await this.makeRequest(
        'POST',
        `/v1/${this.config.projectId}/cloud-phone/phones/batch-restart`,
        {
          phones: [{ phone_id: instanceId }],
        }
      );

      return {
        success: response.success,
        errorCode: response.errorCode,
        errorMessage: response.errorMessage,
        requestId: response.requestId,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: 'REBOOT_FAILED',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 删除云手机实例
   *
   * API: POST /v1/{project_id}/cloud-phone/phones/batch-delete
   */
  async deletePhone(instanceId: string): Promise<HuaweiOperationResult<void>> {
    try {
      this.logger.log(`Deleting Huawei phone: ${instanceId}`);

      const response = await this.makeRequest(
        'POST',
        `/v1/${this.config.projectId}/cloud-phone/phones/batch-delete`,
        {
          phones: [{ phone_id: instanceId }],
        }
      );

      return {
        success: response.success,
        errorCode: response.errorCode,
        errorMessage: response.errorMessage,
        requestId: response.requestId,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: 'DELETE_FAILED',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 获取连接信息
   *
   * API: GET /v1/{project_id}/cloud-phone/phones/{phone_id}/connect-infos
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'huawei-api',
    capacity: 15,
    refillRate: 8,
  })
  async getConnectionInfo(
    instanceId: string
  ): Promise<HuaweiOperationResult<HuaweiConnectionInfo>> {
    try {
      const response = await this.makeRequest<{ connect_infos: any[] }>(
        'GET',
        `/v1/${this.config.projectId}/cloud-phone/phones/${instanceId}/connect-infos`
      );

      if (!response.success || !response.data) {
        return {
          success: false,
          errorCode: response.errorCode,
          errorMessage: response.errorMessage,
          requestId: response.requestId,
        };
      }

      const connectInfo = response.data.connect_infos?.[0];
      if (!connectInfo) {
        return {
          success: false,
          errorCode: 'NO_CONNECTION_INFO',
          errorMessage: 'No connection info available',
        };
      }

      const connectionInfo: HuaweiConnectionInfo = {
        instanceId,
        webrtc: {
          sessionId: connectInfo.access_id || instanceId,
          ticket: connectInfo.access_token || '',
          signaling:
            connectInfo.signaling_url || `wss://cph-webrtc.${this.config.region}.myhuaweicloud.com`,
          stunServers: connectInfo.stun_servers || [
            `stun:stun.${this.config.region}.myhuaweicloud.com:3478`,
          ],
          turnServers: connectInfo.turn_servers || [],
        },
      };

      return {
        success: true,
        data: connectionInfo,
        requestId: response.requestId,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: 'GET_CONNECTION_FAILED',
        errorMessage: error.message,
      };
    }
  }

  // ============================================================
  // 私有辅助方法
  // ============================================================

  /**
   * 发送HTTP请求到华为云API
   */
  private async makeRequest<T = any>(
    method: string,
    path: string,
    body?: any
  ): Promise<HuaweiOperationResult<T>> {
    try {
      const url = `${this.config.endpoint}${path}`;
      const headers = this.generateHeaders(method, path, body);

      this.logger.debug(`${method} ${url}`);

      const response$ = this.httpService.request({
        method,
        url,
        headers,
        data: body,
        timeout: 30000,
      });

      const response = await lastValueFrom(response$);

      return {
        success: true,
        data: response.data as T,
        requestId: response.headers['x-request-id'],
      };
    } catch (error) {
      this.logger.error(
        `Huawei API request failed: ${error.response?.data?.error_msg || error.message}`
      );

      return {
        success: false,
        errorCode: error.response?.data?.error_code || 'REQUEST_FAILED',
        errorMessage: error.response?.data?.error_msg || error.message,
      };
    }
  }

  /**
   * 生成华为云API请求头(包含签名)
   *
   * 华为云使用 AK/SK 签名认证
   * 文档: https://support.huaweicloud.com/devg-apisign/api-sign-algorithm.html
   */
  private generateHeaders(method: string, path: string, body?: any): Record<string, string> {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const contentType = 'application/json';

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'X-Sdk-Date': timestamp,
      Host: new URL(this.config.endpoint).host,
    };

    // 如果配置了 AK/SK,生成签名
    if (this.config.accessKeyId && this.config.secretAccessKey) {
      const signature = this.signRequest(method, path, headers, body);
      headers['Authorization'] = signature;
    }

    return headers;
  }

  /**
   * 华为云 AK/SK 签名算法
   *
   * 简化实现,生产环境应使用官方SDK的签名逻辑
   */
  private signRequest(
    method: string,
    path: string,
    headers: Record<string, string>,
    body?: any
  ): string {
    try {
      const algorithm = 'SDK-HMAC-SHA256';
      const timestamp = headers['X-Sdk-Date'];

      // 1. 规范化请求
      const canonicalHeaders = Object.keys(headers)
        .sort()
        .map((key) => `${key.toLowerCase()}:${headers[key]}`)
        .join('\n');

      const signedHeaders = Object.keys(headers)
        .sort()
        .map((key) => key.toLowerCase())
        .join(';');

      const bodyHash = body
        ? crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex')
        : crypto.createHash('sha256').update('').digest('hex');

      const canonicalRequest = [
        method.toUpperCase(),
        path,
        '', // query string
        canonicalHeaders,
        '',
        signedHeaders,
        bodyHash,
      ].join('\n');

      // 2. 计算签名
      const canonicalRequestHash = crypto
        .createHash('sha256')
        .update(canonicalRequest)
        .digest('hex');

      const stringToSign = [algorithm, timestamp, canonicalRequestHash].join('\n');

      const signature = crypto
        .createHmac('sha256', this.config.secretAccessKey)
        .update(stringToSign)
        .digest('hex');

      // 3. 返回 Authorization 头
      return `${algorithm} Access=${this.config.accessKeyId}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    } catch (error) {
      this.logger.error(`Failed to sign request: ${error.message}`);
      return '';
    }
  }

  /**
   * 映射华为云状态到标准状态
   */
  private mapStatus(status: string): HuaweiPhoneStatus {
    const statusMap: Record<string, HuaweiPhoneStatus> = {
      '0': HuaweiPhoneStatus.CREATING,
      '1': HuaweiPhoneStatus.RUNNING,
      '2': HuaweiPhoneStatus.STOPPING,
      '3': HuaweiPhoneStatus.STOPPED,
      '4': HuaweiPhoneStatus.REBOOTING,
      '5': HuaweiPhoneStatus.DELETING,
      '-1': HuaweiPhoneStatus.ERROR,
      '-2': HuaweiPhoneStatus.FROZEN,
    };

    return statusMap[status] || HuaweiPhoneStatus.ERROR;
  }

  /**
   * 等待云手机创建完成
   */
  private async waitForPhoneReady(
    phoneId: string,
    maxAttempts: number = 60
  ): Promise<HuaweiPhoneInstance> {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.getPhone(phoneId);

      if (result.success && result.data) {
        if (result.data.status === HuaweiPhoneStatus.RUNNING) {
          return result.data;
        }
        if (result.data.status === HuaweiPhoneStatus.ERROR) {
          throw new Error(`Phone creation failed: ${phoneId}`);
        }
      }

      // 等待5秒后重试
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    throw new Error(`Timeout waiting for phone ${phoneId} to be ready`);
  }

  // ============================================================
  // ADB 命令执行 - Phase 4 新增功能
  // ============================================================

  /**
   * 执行 ADB 命令 (同步)
   *
   * API: POST /v1/{project_id}/cloud-phone/phones/commands
   *
   * @param phoneId 云手机 ID
   * @param command ADB Shell 命令
   * @param timeout 超时时间 (秒)
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'huawei-api',
    capacity: 20,
    refillRate: 10,
  })
  async executeAdbCommand(
    phoneId: string,
    command: string,
    timeout: number = 60
  ): Promise<HuaweiOperationResult<HuaweiAdbCommandResponse>> {
    this.logger.log(`Executing ADB command on phone ${phoneId}: ${command}`);

    try {
      const body = {
        phone_id: phoneId,
        command,
        timeout,
      };

      const response = await this.makeRequest(
        'POST',
        `/v1/${this.config.projectId}/cloud-phone/phones/commands`,
        body
      );

      return {
        success: true,
        data: {
          output: response.data?.output || '',
          status: response.data?.status || 'SUCCESS',
        },
        requestId: response.requestId,
      };
    } catch (error) {
      this.logger.error(`Failed to execute ADB command: ${error.message}`);
      return {
        success: false,
        errorCode: error.code || 'ExecuteCommandFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 执行 ADB 命令 (异步，适用于长时间运行的命令)
   *
   * API: POST /v1/{project_id}/cloud-phone/phones/commands/async
   */
  async executeAdbCommandAsync(
    phoneId: string,
    command: string
  ): Promise<HuaweiOperationResult<{ commandId: string }>> {
    this.logger.log(`Executing async ADB command on phone ${phoneId}: ${command}`);

    try {
      const body = {
        phone_id: phoneId,
        command,
        async: true,
      };

      const response = await this.makeRequest(
        'POST',
        `/v1/${this.config.projectId}/cloud-phone/phones/commands`,
        body
      );

      return {
        success: true,
        data: {
          commandId: response.data?.command_id || '',
        },
        requestId: response.requestId,
      };
    } catch (error) {
      this.logger.error(`Failed to execute async ADB command: ${error.message}`);
      return {
        success: false,
        errorCode: error.code || 'ExecuteAsyncCommandFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 查询异步 ADB 命令执行结果
   *
   * API: GET /v1/{project_id}/cloud-phone/phones/commands/{command_id}
   */
  async getAdbCommandResult(
    commandId: string
  ): Promise<HuaweiOperationResult<HuaweiAdbCommandResponse>> {
    try {
      const response = await this.makeRequest(
        'GET',
        `/v1/${this.config.projectId}/cloud-phone/phones/commands/${commandId}`
      );

      return {
        success: true,
        data: {
          commandId,
          output: response.data?.output || '',
          status: response.data?.status || 'RUNNING',
          errorMessage: response.data?.error_message,
        },
        requestId: response.requestId,
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
  // 应用管理 - Phase 4 新增功能
  // ============================================================

  /**
   * 安装 APK 应用
   *
   * API: POST /v1/{project_id}/cloud-phone/phones/install
   *
   * 注意：
   * - APK 文件必须先上传到华为云 OBS
   * - 支持单个 APK 或多个 APK 同时安装
   * - 支持批量在多个云手机上安装
   *
   * @param phoneIds 云手机 ID 列表
   * @param bucketName OBS 桶名
   * @param objectPath OBS 对象路径
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 2000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'huawei-api',
    capacity: 20,
    refillRate: 10,
  })
  async installApk(
    phoneIds: string[],
    bucketName: string,
    objectPath: string
  ): Promise<HuaweiOperationResult<HuaweiBatchJobStatus>> {
    this.logger.log(`Installing APK on ${phoneIds.length} phones from ${bucketName}/${objectPath}`);

    try {
      const body = {
        phone_ids: phoneIds,
        bucket_name: bucketName,
        object_path: objectPath,
        command: 'install', // 安装命令
      };

      const response = await this.makeRequest(
        'POST',
        `/v1/${this.config.projectId}/cloud-phone/phones/install`,
        body
      );

      return {
        success: true,
        data: {
          jobId: response.data?.job_id || '',
          status: response.data?.status || 'RUNNING',
          successCount: response.data?.success_count || 0,
          failedCount: response.data?.failed_count || 0,
          totalCount: phoneIds.length,
        },
        requestId: response.requestId,
      };
    } catch (error) {
      this.logger.error(`Failed to install APK: ${error.message}`);
      return {
        success: false,
        errorCode: error.code || 'InstallApkFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 卸载应用
   *
   * API: POST /v1/{project_id}/cloud-phone/phones/uninstall
   *
   * @param phoneIds 云手机 ID 列表
   * @param packageName 应用包名
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'huawei-api',
    capacity: 20,
    refillRate: 10,
  })
  async uninstallApk(
    phoneIds: string[],
    packageName: string
  ): Promise<HuaweiOperationResult<HuaweiBatchJobStatus>> {
    this.logger.log(`Uninstalling app ${packageName} from ${phoneIds.length} phones`);

    try {
      const body = {
        phone_ids: phoneIds,
        package_name: packageName,
      };

      const response = await this.makeRequest(
        'POST',
        `/v1/${this.config.projectId}/cloud-phone/phones/uninstall`,
        body
      );

      return {
        success: true,
        data: {
          jobId: response.data?.job_id || '',
          status: response.data?.status || 'RUNNING',
          successCount: response.data?.success_count || 0,
          failedCount: response.data?.failed_count || 0,
          totalCount: phoneIds.length,
        },
        requestId: response.requestId,
      };
    } catch (error) {
      this.logger.error(`Failed to uninstall app: ${error.message}`);
      return {
        success: false,
        errorCode: error.code || 'UninstallApkFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 查询批量操作任务状态
   *
   * API: GET /v1/{project_id}/cloud-phone/jobs/{job_id}
   */
  async getBatchJobStatus(
    jobId: string
  ): Promise<HuaweiOperationResult<HuaweiBatchJobStatus>> {
    try {
      const response = await this.makeRequest(
        'GET',
        `/v1/${this.config.projectId}/cloud-phone/jobs/${jobId}`
      );

      return {
        success: true,
        data: {
          jobId,
          status: response.data?.status || 'RUNNING',
          successCount: response.data?.success_count || 0,
          failedCount: response.data?.failed_count || 0,
          totalCount: response.data?.total_count || 0,
          results: response.data?.results,
        },
        requestId: response.requestId,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: error.code || 'GetJobStatusFailed',
        errorMessage: error.message,
      };
    }
  }

  // ============================================================
  // 文件传输 - Phase 4 新增功能
  // ============================================================

  /**
   * 推送文件到云手机
   *
   * API: POST /v1/{project_id}/cloud-phone/phones/push-file
   *
   * 注意：
   * - 只支持 tar 格式压缩包
   * - 文件大小限制 6GB
   * - 解压后放置在云手机的 /data/local/tmp 目录或指定路径
   *
   * @param phoneIds 云手机 ID 列表
   * @param bucketName OBS 桶名
   * @param objectPath OBS 对象路径 (tar 文件)
   * @param targetPath 目标路径 (可选)
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 2000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'huawei-api',
    capacity: 10,
    refillRate: 5,
  })
  async pushFile(
    phoneIds: string[],
    bucketName: string,
    objectPath: string,
    targetPath?: string
  ): Promise<HuaweiOperationResult<HuaweiBatchJobStatus>> {
    this.logger.log(`Pushing file ${bucketName}/${objectPath} to ${phoneIds.length} phones`);

    try {
      const body: any = {
        phone_ids: phoneIds,
        bucket_name: bucketName,
        object_path: objectPath,
      };

      if (targetPath) {
        body.target_path = targetPath;
      }

      const response = await this.makeRequest(
        'POST',
        `/v1/${this.config.projectId}/cloud-phone/phones/push-file`,
        body
      );

      return {
        success: true,
        data: {
          jobId: response.data?.job_id || '',
          status: response.data?.status || 'RUNNING',
          successCount: response.data?.success_count || 0,
          failedCount: response.data?.failed_count || 0,
          totalCount: phoneIds.length,
        },
        requestId: response.requestId,
      };
    } catch (error) {
      this.logger.error(`Failed to push file: ${error.message}`);
      return {
        success: false,
        errorCode: error.code || 'PushFileFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 导出云手机数据到 OBS
   *
   * API: POST /v1/{project_id}/cloud-phone/phones/export-data
   *
   * @param phoneId 云手机 ID
   * @param sourcePath 云手机上的源路径
   * @param bucketName OBS 桶名
   * @param objectPath OBS 对象路径前缀
   */
  @Retry({
    maxAttempts: 3,
    baseDelayMs: 2000,
    retryableErrors: [NetworkError, TimeoutError],
  })
  @RateLimit({
    key: 'huawei-api',
    capacity: 10,
    refillRate: 5,
  })
  async exportData(
    phoneId: string,
    sourcePath: string,
    bucketName: string,
    objectPath: string
  ): Promise<HuaweiOperationResult<{ jobId: string }>> {
    this.logger.log(`Exporting data from ${phoneId}:${sourcePath} to ${bucketName}/${objectPath}`);

    try {
      const body = {
        phone_id: phoneId,
        source_path: sourcePath,
        bucket_name: bucketName,
        object_path: objectPath,
      };

      const response = await this.makeRequest(
        'POST',
        `/v1/${this.config.projectId}/cloud-phone/phones/export-data`,
        body
      );

      return {
        success: true,
        data: {
          jobId: response.data?.job_id || '',
        },
        requestId: response.requestId,
      };
    } catch (error) {
      this.logger.error(`Failed to export data: ${error.message}`);
      return {
        success: false,
        errorCode: error.code || 'ExportDataFailed',
        errorMessage: error.message,
      };
    }
  }
}
