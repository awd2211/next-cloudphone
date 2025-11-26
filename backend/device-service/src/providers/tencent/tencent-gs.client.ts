/**
 * 腾讯云云游戏 GS API 客户端
 *
 * 使用腾讯云 SDK 调用云游戏 API
 * API 文档: https://cloud.tencent.com/document/product/1162/40727
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as https from 'https';

import {
  TencentCredentials,
  TencentAndroidInstance,
  TencentApiResponse,
  CreateAndroidInstanceRequest,
  CreateSessionRequest,
  CreateSessionResponse,
  ConnectAndroidInstanceResponse,
  AndroidInstanceImage,
  CreateAndroidInstanceWebShellResponse,
  TENCENT_REGIONS,
} from './tencent.types';

/**
 * API 调用结果
 */
export interface ApiResult<T> {
  success: boolean;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class TencentGsClient {
  private readonly logger = new Logger(TencentGsClient.name);
  private credentials: TencentCredentials | null = null;
  private readonly apiVersion = '2019-11-18';
  private readonly service = 'gs';
  private readonly host = 'gs.tencentcloudapi.com';

  constructor(private readonly configService: ConfigService) {}

  /**
   * 初始化凭证
   */
  async initialize(credentials?: TencentCredentials): Promise<void> {
    if (credentials) {
      this.credentials = credentials;
    } else {
      this.credentials = {
        secretId: this.configService.get<string>('TENCENT_SECRET_ID', ''),
        secretKey: this.configService.get<string>('TENCENT_SECRET_KEY', ''),
        region: this.configService.get<string>('TENCENT_REGION', TENCENT_REGIONS.GUANGZHOU),
      };
    }

    if (!this.credentials.secretId || !this.credentials.secretKey) {
      this.logger.warn('Tencent credentials not configured');
    } else {
      this.logger.log('Tencent GS client initialized');
    }
  }

  /**
   * 检查凭证是否有效
   */
  isInitialized(): boolean {
    return !!(this.credentials?.secretId && this.credentials?.secretKey);
  }

  // ========================================
  // 实例管理
  // ========================================

  /**
   * 创建安卓实例
   */
  async createAndroidInstance(
    request: CreateAndroidInstanceRequest
  ): Promise<ApiResult<{ AndroidInstanceIds: string[] }>> {
    return this.callApi('CreateAndroidInstance', request);
  }

  /**
   * 查询安卓实例列表
   */
  async describeAndroidInstances(params?: {
    AndroidInstanceIds?: string[];
    Offset?: number;
    Limit?: number;
    Filters?: Array<{ Name: string; Values: string[] }>;
  }): Promise<ApiResult<{ AndroidInstanceSet: TencentAndroidInstance[]; TotalCount: number }>> {
    return this.callApi('DescribeAndroidInstances', params || {});
  }

  /**
   * 启动安卓实例
   */
  async startAndroidInstances(instanceIds: string[]): Promise<ApiResult<void>> {
    return this.callApi('StartAndroidInstances', { AndroidInstanceIds: instanceIds });
  }

  /**
   * 停止安卓实例
   */
  async stopAndroidInstances(instanceIds: string[]): Promise<ApiResult<void>> {
    return this.callApi('StopAndroidInstances', { AndroidInstanceIds: instanceIds });
  }

  /**
   * 重启安卓实例
   */
  async rebootAndroidInstances(instanceIds: string[]): Promise<ApiResult<void>> {
    return this.callApi('RebootAndroidInstances', { AndroidInstanceIds: instanceIds });
  }

  /**
   * 销毁安卓实例
   */
  async destroyAndroidInstances(instanceIds: string[]): Promise<ApiResult<void>> {
    return this.callApi('DestroyAndroidInstances', { AndroidInstanceIds: instanceIds });
  }

  // ========================================
  // 连接管理
  // ========================================

  /**
   * 创建会话
   */
  async createSession(request: CreateSessionRequest): Promise<ApiResult<CreateSessionResponse>> {
    return this.callApi('CreateSession', request);
  }

  /**
   * 连接安卓实例
   */
  async connectAndroidInstance(
    instanceId: string,
    userId?: string
  ): Promise<ApiResult<ConnectAndroidInstanceResponse>> {
    return this.callApi('ConnectAndroidInstance', {
      AndroidInstanceId: instanceId,
      UserId: userId,
    });
  }

  /**
   * 断开安卓实例连接
   */
  async disconnectAndroidInstance(instanceId: string): Promise<ApiResult<void>> {
    return this.callApi('DisconnectAndroidInstance', { AndroidInstanceId: instanceId });
  }

  /**
   * 创建 WebShell 连接
   */
  async createAndroidInstanceWebShell(
    instanceId: string
  ): Promise<ApiResult<CreateAndroidInstanceWebShellResponse>> {
    return this.callApi('CreateAndroidInstanceWebShell', { AndroidInstanceId: instanceId });
  }

  // ========================================
  // 应用管理
  // ========================================

  /**
   * 安装应用
   */
  async installAndroidInstancesApp(
    instanceIds: string[],
    applicationId: string
  ): Promise<ApiResult<{ TaskId: string }>> {
    return this.callApi('InstallAndroidInstancesApp', {
      AndroidInstanceIds: instanceIds,
      ApplicationId: applicationId,
    });
  }

  /**
   * 卸载应用
   */
  async uninstallAndroidInstancesApp(
    instanceIds: string[],
    packageName: string
  ): Promise<ApiResult<void>> {
    return this.callApi('UninstallAndroidInstancesApp', {
      AndroidInstanceIds: instanceIds,
      PackageName: packageName,
    });
  }

  // ========================================
  // 镜像管理
  // ========================================

  /**
   * 查询镜像列表
   */
  async describeAndroidInstanceImages(params?: {
    Offset?: number;
    Limit?: number;
  }): Promise<ApiResult<{ AndroidInstanceImageSet: AndroidInstanceImage[]; TotalCount: number }>> {
    return this.callApi('DescribeAndroidInstanceImages', params || {});
  }

  // ========================================
  // 截图与文件操作
  // ========================================

  /**
   * 截图
   */
  async captureAndroidInstanceScreen(
    instanceId: string
  ): Promise<ApiResult<{ ImageUrl: string; TaskId: string }>> {
    return this.callApi('CaptureAndroidInstanceScreen', { AndroidInstanceId: instanceId });
  }

  /**
   * 上传文件到实例
   */
  async uploadFileToAndroidInstance(
    instanceId: string,
    fileUrl: string,
    destinationPath: string
  ): Promise<ApiResult<{ TaskId: string }>> {
    return this.callApi('UploadFileToAndroidInstance', {
      AndroidInstanceId: instanceId,
      FileUrl: fileUrl,
      DestinationPath: destinationPath,
    });
  }

  // ========================================
  // 私有方法
  // ========================================

  /**
   * 调用腾讯云 API
   */
  private async callApi<T>(action: string, params: Record<string, any>): Promise<ApiResult<T>> {
    if (!this.credentials?.secretId || !this.credentials?.secretKey) {
      return {
        success: false,
        errorCode: 'CredentialsNotConfigured',
        errorMessage: 'Tencent credentials not configured',
      };
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const date = new Date(timestamp * 1000).toISOString().split('T')[0];
      const region = this.credentials.region || TENCENT_REGIONS.GUANGZHOU;

      const payload = JSON.stringify(params);

      // 构建签名
      const authorization = this.sign(action, payload, timestamp, date, region);

      const response = await this.request({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-TC-Action': action,
          'X-TC-Version': this.apiVersion,
          'X-TC-Timestamp': timestamp.toString(),
          'X-TC-Region': region,
          Authorization: authorization,
        },
        body: payload,
      });

      const result = JSON.parse(response) as TencentApiResponse<T>;

      if (result.Response.Error) {
        this.logger.error(
          `Tencent API error: ${result.Response.Error.Code} - ${result.Response.Error.Message}`
        );
        return {
          success: false,
          errorCode: result.Response.Error.Code,
          errorMessage: result.Response.Error.Message,
        };
      }

      // 移除 RequestId 和 Error，返回纯数据
      const { RequestId, Error, ...data } = result.Response;
      return {
        success: true,
        data: data as T,
      };
    } catch (error) {
      this.logger.error(`Tencent API call failed: ${error.message}`);
      return {
        success: false,
        errorCode: 'ApiCallFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 签名计算 (TC3-HMAC-SHA256)
   */
  private sign(
    action: string,
    payload: string,
    timestamp: number,
    date: string,
    region: string
  ): string {
    const algorithm = 'TC3-HMAC-SHA256';
    const httpRequestMethod = 'POST';
    const canonicalUri = '/';
    const canonicalQueryString = '';
    const contentType = 'application/json';

    const canonicalHeaders =
      `content-type:${contentType}\n` + `host:${this.host}\n` + `x-tc-action:${action.toLowerCase()}\n`;

    const signedHeaders = 'content-type;host;x-tc-action';
    const hashedRequestPayload = this.sha256(payload);

    const canonicalRequest = [
      httpRequestMethod,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      hashedRequestPayload,
    ].join('\n');

    const credentialScope = `${date}/${this.service}/tc3_request`;
    const hashedCanonicalRequest = this.sha256(canonicalRequest);

    const stringToSign = [algorithm, timestamp, credentialScope, hashedCanonicalRequest].join('\n');

    const secretDate = this.hmacSha256(`TC3${this.credentials!.secretKey}`, date);
    const secretService = this.hmacSha256(secretDate, this.service);
    const secretSigning = this.hmacSha256(secretService, 'tc3_request');
    const signature = this.hmacSha256Hex(secretSigning, stringToSign);

    return `${algorithm} Credential=${this.credentials!.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }

  /**
   * SHA256 哈希
   */
  private sha256(message: string): string {
    return crypto.createHash('sha256').update(message).digest('hex');
  }

  /**
   * HMAC-SHA256 (返回 Buffer)
   */
  private hmacSha256(key: string | Buffer, message: string): Buffer {
    return crypto.createHmac('sha256', key).update(message).digest();
  }

  /**
   * HMAC-SHA256 (返回 hex string)
   */
  private hmacSha256Hex(key: Buffer, message: string): string {
    return crypto.createHmac('sha256', key).update(message).digest('hex');
  }

  /**
   * 发送 HTTP 请求
   */
  private request(options: {
    method: string;
    headers: Record<string, string>;
    body: string;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: this.host,
          port: 443,
          path: '/',
          method: options.method,
          headers: options.headers,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data));
        }
      );

      req.on('error', reject);
      req.write(options.body);
      req.end();
    });
  }
}
