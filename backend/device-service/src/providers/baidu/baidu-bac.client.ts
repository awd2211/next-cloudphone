/**
 * 百度智能云云手机 BAC API 客户端
 *
 * API 文档: https://cloud.baidu.com/doc/ARMCM/s/2kei7tyr3
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as https from 'https';

import {
  BaiduCredentials,
  BaiduCloudPhoneInstance,
  BaiduApiResponse,
  CreateInstanceRequest,
  ServerTokenResponse,
  DataCenterInfo,
  BAIDU_REGIONS,
} from './baidu.types';

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
export class BaiduBacClient {
  private readonly logger = new Logger(BaiduBacClient.name);
  private credentials: BaiduCredentials | null = null;
  private readonly apiVersion = 'v1';
  private readonly host = 'bac.bj.baidubce.com';

  constructor(private readonly configService: ConfigService) {}

  /**
   * 初始化凭证
   */
  async initialize(credentials?: BaiduCredentials): Promise<void> {
    if (credentials) {
      this.credentials = credentials;
    } else {
      this.credentials = {
        accessKey: this.configService.get<string>('BAIDU_ACCESS_KEY', ''),
        secretKey: this.configService.get<string>('BAIDU_SECRET_KEY', ''),
        region: this.configService.get<string>('BAIDU_REGION', BAIDU_REGIONS.BEIJING),
      };
    }

    if (!this.credentials.accessKey || !this.credentials.secretKey) {
      this.logger.warn('Baidu credentials not configured');
    } else {
      this.logger.log('Baidu BAC client initialized');
    }
  }

  /**
   * 检查凭证是否有效
   */
  isInitialized(): boolean {
    return !!(this.credentials?.accessKey && this.credentials?.secretKey);
  }

  // ========================================
  // 实例管理
  // ========================================

  /**
   * 创建云手机实例
   */
  async createInstance(
    request: CreateInstanceRequest
  ): Promise<ApiResult<{ instanceIds: string[] }>> {
    return this.callApi('POST', '/instance', request);
  }

  /**
   * 查询实例列表
   */
  async listInstances(params?: {
    instanceIds?: string[];
    marker?: string;
    maxKeys?: number;
  }): Promise<ApiResult<{ instances: BaiduCloudPhoneInstance[]; nextMarker?: string }>> {
    const query: Record<string, string> = {};
    if (params?.marker) query.marker = params.marker;
    if (params?.maxKeys) query.maxKeys = params.maxKeys.toString();

    if (params?.instanceIds?.length) {
      return this.callApi('POST', '/instance/list', { instanceIds: params.instanceIds });
    }

    return this.callApi('GET', '/instance', undefined, query);
  }

  /**
   * 查询单个实例
   */
  async getInstance(instanceId: string): Promise<ApiResult<BaiduCloudPhoneInstance>> {
    return this.callApi('GET', `/instance/${instanceId}`);
  }

  /**
   * 启动实例
   */
  async startInstances(instanceIds: string[]): Promise<ApiResult<void>> {
    return this.callApi('PUT', '/instance/start', { instanceIds });
  }

  /**
   * 停止实例
   */
  async stopInstances(instanceIds: string[]): Promise<ApiResult<void>> {
    return this.callApi('PUT', '/instance/stop', { instanceIds });
  }

  /**
   * 重启实例
   */
  async rebootInstances(instanceIds: string[]): Promise<ApiResult<void>> {
    return this.callApi('PUT', '/instance/reboot', { instanceIds });
  }

  /**
   * 释放实例
   */
  async releaseInstances(instanceIds: string[]): Promise<ApiResult<void>> {
    return this.callApi('POST', '/instance/release', { instanceIds });
  }

  // ========================================
  // 连接管理
  // ========================================

  /**
   * 获取 Server Token (用于 SDK 连接)
   */
  async getServerToken(instanceId: string, userId?: string): Promise<ApiResult<ServerTokenResponse>> {
    return this.callApi('POST', '/instance/serverToken', {
      instanceId,
      userId: userId || 'system',
    });
  }

  /**
   * 断开连接
   */
  async disconnect(instanceId: string): Promise<ApiResult<void>> {
    return this.callApi('POST', '/instance/disconnect', { instanceId });
  }

  // ========================================
  // 应用管理
  // ========================================

  /**
   * 安装应用 (需要先上传 APK 到 BOS)
   */
  async installApp(
    instanceIds: string[],
    apkBosPath: string
  ): Promise<ApiResult<{ taskId: string }>> {
    return this.callApi('POST', '/app/install', {
      instanceIds,
      apkBosPath,
    });
  }

  /**
   * 卸载应用
   */
  async uninstallApp(instanceIds: string[], packageName: string): Promise<ApiResult<void>> {
    return this.callApi('POST', '/app/uninstall', {
      instanceIds,
      packageName,
    });
  }

  /**
   * 启动应用
   */
  async startApp(instanceId: string, packageName: string): Promise<ApiResult<void>> {
    return this.callApi('POST', '/app/start', {
      instanceId,
      packageName,
    });
  }

  /**
   * 停止应用
   */
  async stopApp(instanceId: string, packageName: string): Promise<ApiResult<void>> {
    return this.callApi('POST', '/app/stop', {
      instanceId,
      packageName,
    });
  }

  // ========================================
  // 文件操作
  // ========================================

  /**
   * 上传文件到实例
   */
  async uploadFile(
    instanceId: string,
    bosPath: string,
    remotePath: string
  ): Promise<ApiResult<{ taskId: string }>> {
    return this.callApi('POST', '/file/upload', {
      instanceId,
      bosPath,
      remotePath,
    });
  }

  /**
   * 从实例下载文件
   */
  async downloadFile(
    instanceId: string,
    remotePath: string,
    bosPath: string
  ): Promise<ApiResult<{ taskId: string }>> {
    return this.callApi('POST', '/file/download', {
      instanceId,
      remotePath,
      bosPath,
    });
  }

  // ========================================
  // 截图
  // ========================================

  /**
   * 截图
   */
  async screenshot(instanceId: string): Promise<ApiResult<{ imageUrl: string }>> {
    return this.callApi('POST', '/instance/screenshot', { instanceId });
  }

  // ========================================
  // 机房信息
  // ========================================

  /**
   * 获取机房信息
   */
  async getDataCenterInfo(): Promise<ApiResult<DataCenterInfo[]>> {
    return this.callApi('GET', '/datacenter');
  }

  // ========================================
  // 私有方法
  // ========================================

  /**
   * 调用百度云 API
   */
  private async callApi<T>(
    method: string,
    path: string,
    body?: any,
    query?: Record<string, string>
  ): Promise<ApiResult<T>> {
    if (!this.credentials?.accessKey || !this.credentials?.secretKey) {
      return {
        success: false,
        errorCode: 'CredentialsNotConfigured',
        errorMessage: 'Baidu credentials not configured',
      };
    }

    try {
      const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
      const fullPath = `/${this.apiVersion}${path}`;

      // 构建查询字符串
      let queryString = '';
      if (query && Object.keys(query).length > 0) {
        queryString = '?' + Object.entries(query)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&');
      }

      const payload = body ? JSON.stringify(body) : '';

      // 构建签名
      const authorization = this.sign(method, fullPath, queryString, timestamp, payload);

      const response = await this.request({
        method,
        path: fullPath + queryString,
        headers: {
          'Content-Type': 'application/json',
          'x-bce-date': timestamp,
          Authorization: authorization,
          Host: this.host,
        },
        body: payload,
      });

      const result = JSON.parse(response) as BaiduApiResponse<T>;

      if (result.error) {
        this.logger.error(`Baidu API error: ${result.error.code} - ${result.error.message}`);
        return {
          success: false,
          errorCode: result.error.code,
          errorMessage: result.error.message,
        };
      }

      return {
        success: true,
        data: result.result,
      };
    } catch (error) {
      this.logger.error(`Baidu API call failed: ${error.message}`);
      return {
        success: false,
        errorCode: 'ApiCallFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 签名计算 (BCE 签名)
   */
  private sign(
    method: string,
    path: string,
    queryString: string,
    timestamp: string,
    payload: string
  ): string {
    const expirationPeriodInSeconds = 1800;

    // Auth string prefix
    const authStringPrefix = `bce-auth-v1/${this.credentials!.accessKey}/${timestamp}/${expirationPeriodInSeconds}`;

    // Signing key
    const signingKey = this.hmacSha256Hex(this.credentials!.secretKey, authStringPrefix);

    // Canonical request
    const canonicalUri = path;
    const canonicalQueryString = queryString.replace('?', '');
    const canonicalHeaders = `host:${this.host}\nx-bce-date:${encodeURIComponent(timestamp)}`;
    const signedHeaders = 'host;x-bce-date';

    const canonicalRequest = [
      method.toUpperCase(),
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
    ].join('\n');

    // Signature
    const signature = this.hmacSha256Hex(signingKey, canonicalRequest);

    return `${authStringPrefix}/${signedHeaders}/${signature}`;
  }

  /**
   * HMAC-SHA256 (返回 hex string)
   */
  private hmacSha256Hex(key: string, message: string): string {
    return crypto.createHmac('sha256', key).update(message).digest('hex');
  }

  /**
   * 发送 HTTP 请求
   */
  private request(options: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body: string;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: this.host,
          port: 443,
          path: options.path,
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
      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }
}
