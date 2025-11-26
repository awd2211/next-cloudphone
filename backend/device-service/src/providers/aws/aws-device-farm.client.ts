/**
 * AWS Device Farm API 客户端
 *
 * 使用 AWS SDK v3 风格的签名
 * API 文档: https://docs.aws.amazon.com/devicefarm/latest/APIReference/Welcome.html
 *
 * 注意: Device Farm 仅在 us-west-2 区域可用
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as https from 'https';

import {
  AwsCredentials,
  AwsDevice,
  AwsRemoteAccessSession,
  AwsProject,
  AwsUpload,
  CreateRemoteAccessSessionRequest,
  AwsApiResponse,
} from './aws.types';

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
export class AwsDeviceFarmClient {
  private readonly logger = new Logger(AwsDeviceFarmClient.name);
  private credentials: AwsCredentials | null = null;
  private readonly service = 'devicefarm';
  private readonly region = 'us-west-2'; // Device Farm 仅在此区域可用
  private readonly host = 'devicefarm.us-west-2.amazonaws.com';
  private readonly apiVersion = '20150623';

  constructor(private readonly configService: ConfigService) {}

  /**
   * 初始化凭证
   */
  async initialize(credentials?: AwsCredentials): Promise<void> {
    if (credentials) {
      this.credentials = credentials;
    } else {
      this.credentials = {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
        region: this.region, // 强制 us-west-2
      };
    }

    if (!this.credentials.accessKeyId || !this.credentials.secretAccessKey) {
      this.logger.warn('AWS credentials not configured');
    } else {
      this.logger.log('AWS Device Farm client initialized');
    }
  }

  /**
   * 检查凭证是否有效
   */
  isInitialized(): boolean {
    return !!(this.credentials?.accessKeyId && this.credentials?.secretAccessKey);
  }

  // ========================================
  // 项目管理
  // ========================================

  /**
   * 列出项目
   */
  async listProjects(nextToken?: string): Promise<ApiResult<{ projects: AwsProject[]; nextToken?: string }>> {
    return this.callApi('ListProjects', nextToken ? { nextToken } : {});
  }

  /**
   * 创建项目
   */
  async createProject(name: string, defaultJobTimeoutMinutes?: number): Promise<ApiResult<AwsProject>> {
    const result = await this.callApi<{ project: AwsProject }>('CreateProject', {
      name,
      defaultJobTimeoutMinutes: defaultJobTimeoutMinutes || 150,
    });
    if (!result.success) {
      return { success: false, errorCode: result.errorCode, errorMessage: result.errorMessage };
    }
    return { success: true, data: result.data?.project };
  }

  /**
   * 获取项目
   */
  async getProject(arn: string): Promise<ApiResult<AwsProject>> {
    const result = await this.callApi<{ project: AwsProject }>('GetProject', { arn });
    if (!result.success) {
      return { success: false, errorCode: result.errorCode, errorMessage: result.errorMessage };
    }
    return { success: true, data: result.data?.project };
  }

  // ========================================
  // 设备管理
  // ========================================

  /**
   * 列出设备
   */
  async listDevices(params?: {
    arn?: string;
    nextToken?: string;
    filters?: Array<{ attribute: string; operator: string; values: string[] }>;
  }): Promise<ApiResult<{ devices: AwsDevice[]; nextToken?: string }>> {
    return this.callApi('ListDevices', params || {});
  }

  /**
   * 获取设备
   */
  async getDevice(arn: string): Promise<ApiResult<AwsDevice>> {
    const result = await this.callApi<{ device: AwsDevice }>('GetDevice', { arn });
    if (!result.success) {
      return { success: false, errorCode: result.errorCode, errorMessage: result.errorMessage };
    }
    return { success: true, data: result.data?.device };
  }

  // ========================================
  // 远程访问会话管理
  // ========================================

  /**
   * 创建远程访问会话
   */
  async createRemoteAccessSession(
    request: CreateRemoteAccessSessionRequest
  ): Promise<ApiResult<AwsRemoteAccessSession>> {
    const result = await this.callApi<{ remoteAccessSession: AwsRemoteAccessSession }>(
      'CreateRemoteAccessSession',
      request
    );
    if (!result.success) {
      return { success: false, errorCode: result.errorCode, errorMessage: result.errorMessage };
    }
    return { success: true, data: result.data?.remoteAccessSession };
  }

  /**
   * 获取远程访问会话
   */
  async getRemoteAccessSession(arn: string): Promise<ApiResult<AwsRemoteAccessSession>> {
    const result = await this.callApi<{ remoteAccessSession: AwsRemoteAccessSession }>(
      'GetRemoteAccessSession',
      { arn }
    );
    if (!result.success) {
      return { success: false, errorCode: result.errorCode, errorMessage: result.errorMessage };
    }
    return { success: true, data: result.data?.remoteAccessSession };
  }

  /**
   * 列出远程访问会话
   */
  async listRemoteAccessSessions(
    arn: string,
    nextToken?: string
  ): Promise<ApiResult<{ remoteAccessSessions: AwsRemoteAccessSession[]; nextToken?: string }>> {
    return this.callApi('ListRemoteAccessSessions', { arn, nextToken });
  }

  /**
   * 停止远程访问会话
   */
  async stopRemoteAccessSession(arn: string): Promise<ApiResult<AwsRemoteAccessSession>> {
    const result = await this.callApi<{ remoteAccessSession: AwsRemoteAccessSession }>(
      'StopRemoteAccessSession',
      { arn }
    );
    if (!result.success) {
      return { success: false, errorCode: result.errorCode, errorMessage: result.errorMessage };
    }
    return { success: true, data: result.data?.remoteAccessSession };
  }

  /**
   * 删除远程访问会话
   */
  async deleteRemoteAccessSession(arn: string): Promise<ApiResult<void>> {
    return this.callApi('DeleteRemoteAccessSession', { arn });
  }

  // ========================================
  // 上传管理
  // ========================================

  /**
   * 创建上传
   */
  async createUpload(
    projectArn: string,
    name: string,
    type: string
  ): Promise<ApiResult<AwsUpload>> {
    const result = await this.callApi<{ upload: AwsUpload }>('CreateUpload', {
      projectArn,
      name,
      type,
    });
    if (!result.success) {
      return { success: false, errorCode: result.errorCode, errorMessage: result.errorMessage };
    }
    return { success: true, data: result.data?.upload };
  }

  /**
   * 获取上传
   */
  async getUpload(arn: string): Promise<ApiResult<AwsUpload>> {
    const result = await this.callApi<{ upload: AwsUpload }>('GetUpload', { arn });
    if (!result.success) {
      return { success: false, errorCode: result.errorCode, errorMessage: result.errorMessage };
    }
    return { success: true, data: result.data?.upload };
  }

  /**
   * 安装应用到会话
   */
  async installToRemoteAccessSession(
    remoteAccessSessionArn: string,
    appArn: string
  ): Promise<ApiResult<{ appUpload: AwsUpload }>> {
    return this.callApi('InstallToRemoteAccessSession', {
      remoteAccessSessionArn,
      appArn,
    });
  }

  // ========================================
  // 私有方法
  // ========================================

  /**
   * 调用 AWS API
   */
  private async callApi<T>(action: string, params: Record<string, any>): Promise<ApiResult<T>> {
    if (!this.credentials?.accessKeyId || !this.credentials?.secretAccessKey) {
      return {
        success: false,
        errorCode: 'CredentialsNotConfigured',
        errorMessage: 'AWS credentials not configured',
      };
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = timestamp.substring(0, 8);

      const payload = JSON.stringify(params);
      const target = `DeviceFarm_${this.apiVersion}.${action}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Date': timestamp,
        'X-Amz-Target': target,
        Host: this.host,
      };

      // 构建签名
      const authorization = this.sign(
        'POST',
        '/',
        payload,
        headers,
        timestamp,
        dateStamp
      );
      headers['Authorization'] = authorization;

      const response = await this.request({
        method: 'POST',
        headers,
        body: payload,
      });

      const result = JSON.parse(response);

      if (result.__type || result.message) {
        const errorType = result.__type?.split('#').pop() || 'UnknownError';
        this.logger.error(`AWS API error: ${errorType} - ${result.message}`);
        return {
          success: false,
          errorCode: errorType,
          errorMessage: result.message,
        };
      }

      return {
        success: true,
        data: result as T,
      };
    } catch (error) {
      this.logger.error(`AWS API call failed: ${error.message}`);
      return {
        success: false,
        errorCode: 'ApiCallFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * AWS Signature Version 4 签名
   */
  private sign(
    method: string,
    uri: string,
    payload: string,
    headers: Record<string, string>,
    timestamp: string,
    dateStamp: string
  ): string {
    const algorithm = 'AWS4-HMAC-SHA256';

    // Canonical request
    const sortedHeaders = Object.keys(headers)
      .sort()
      .map((k) => `${k.toLowerCase()}:${headers[k].trim()}`)
      .join('\n');
    const signedHeaders = Object.keys(headers)
      .sort()
      .map((k) => k.toLowerCase())
      .join(';');
    const payloadHash = this.sha256(payload);

    const canonicalRequest = [
      method,
      uri,
      '', // query string
      sortedHeaders,
      '',
      signedHeaders,
      payloadHash,
    ].join('\n');

    // String to sign
    const credentialScope = `${dateStamp}/${this.region}/${this.service}/aws4_request`;
    const stringToSign = [
      algorithm,
      timestamp,
      credentialScope,
      this.sha256(canonicalRequest),
    ].join('\n');

    // Signing key
    const kDate = this.hmacSha256(`AWS4${this.credentials!.secretAccessKey}`, dateStamp);
    const kRegion = this.hmacSha256(kDate, this.region);
    const kService = this.hmacSha256(kRegion, this.service);
    const kSigning = this.hmacSha256(kService, 'aws4_request');

    // Signature
    const signature = this.hmacSha256Hex(kSigning, stringToSign);

    return `${algorithm} Credential=${this.credentials!.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
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
