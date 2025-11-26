/**
 * Genymotion Cloud (SaaS) API 客户端
 *
 * 使用 gmsaas CLI 风格的 REST API
 * 文档: https://docs.genymotion.com/paas/
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

import {
  GenymotionCredentials,
  GenymotionInstance,
  GenymotionRecipe,
  CreateInstanceRequest,
  GenymotionApiResponse,
  GENYMOTION_REGIONS,
} from './genymotion.types';

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
export class GenymotionClient {
  private readonly logger = new Logger(GenymotionClient.name);
  private credentials: GenymotionCredentials | null = null;
  private apiToken: string | null = null;
  private readonly baseHost = 'cloud.geny.io';
  private readonly apiVersion = 'v1';

  constructor(private readonly configService: ConfigService) {}

  /**
   * 初始化凭证
   */
  async initialize(credentials?: GenymotionCredentials): Promise<void> {
    if (credentials) {
      this.credentials = credentials;
    } else {
      this.credentials = {
        email: this.configService.get<string>('GENYMOTION_EMAIL', ''),
        password: this.configService.get<string>('GENYMOTION_PASSWORD', ''),
        apiToken: this.configService.get<string>('GENYMOTION_API_TOKEN', ''),
      };
    }

    // 如果有 API Token，直接使用
    if (this.credentials.apiToken) {
      this.apiToken = this.credentials.apiToken;
      this.logger.log('Genymotion client initialized with API token');
      return;
    }

    // 否则使用邮箱密码登录
    if (!this.credentials.email || !this.credentials.password) {
      this.logger.warn('Genymotion credentials not configured');
      return;
    }

    // 登录获取 token
    const loginResult = await this.login();
    if (loginResult.success && loginResult.data) {
      this.apiToken = loginResult.data;
      this.logger.log('Genymotion client initialized via login');
    } else {
      this.logger.error(`Genymotion login failed: ${loginResult.errorMessage}`);
    }
  }

  /**
   * 检查凭证是否有效
   */
  isInitialized(): boolean {
    return !!this.apiToken;
  }

  /**
   * 登录
   */
  private async login(): Promise<ApiResult<string>> {
    try {
      const response = await this.request({
        method: 'POST',
        path: '/auth/login',
        body: JSON.stringify({
          email: this.credentials!.email,
          password: this.credentials!.password,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = JSON.parse(response);
      if (result.token) {
        return { success: true, data: result.token };
      }
      return {
        success: false,
        errorCode: 'LoginFailed',
        errorMessage: result.message || 'Login failed',
      };
    } catch (error) {
      return {
        success: false,
        errorCode: 'LoginError',
        errorMessage: error.message,
      };
    }
  }

  // ========================================
  // 实例管理
  // ========================================

  /**
   * 创建实例
   */
  async createInstance(request: CreateInstanceRequest): Promise<ApiResult<GenymotionInstance>> {
    return this.callApi('POST', '/instances', request);
  }

  /**
   * 获取实例列表
   */
  async listInstances(): Promise<ApiResult<GenymotionInstance[]>> {
    return this.callApi('GET', '/instances');
  }

  /**
   * 获取单个实例
   */
  async getInstance(uuid: string): Promise<ApiResult<GenymotionInstance>> {
    return this.callApi('GET', `/instances/${uuid}`);
  }

  /**
   * 启动实例
   */
  async startInstance(uuid: string): Promise<ApiResult<void>> {
    return this.callApi('POST', `/instances/${uuid}/start`);
  }

  /**
   * 停止实例
   */
  async stopInstance(uuid: string): Promise<ApiResult<void>> {
    return this.callApi('POST', `/instances/${uuid}/stop`);
  }

  /**
   * 删除实例
   */
  async deleteInstance(uuid: string): Promise<ApiResult<void>> {
    return this.callApi('DELETE', `/instances/${uuid}`);
  }

  // ========================================
  // ADB 连接
  // ========================================

  /**
   * 启用 ADB
   */
  async enableAdb(uuid: string): Promise<ApiResult<{ adb_serial: string; adb_port: number }>> {
    return this.callApi('POST', `/instances/${uuid}/adb`);
  }

  /**
   * 禁用 ADB
   */
  async disableAdb(uuid: string): Promise<ApiResult<void>> {
    return this.callApi('DELETE', `/instances/${uuid}/adb`);
  }

  /**
   * 获取 ADB 连接信息
   */
  async getAdbInfo(uuid: string): Promise<ApiResult<{ adb_serial: string; adb_port: number }>> {
    return this.callApi('GET', `/instances/${uuid}/adb`);
  }

  // ========================================
  // 配方管理
  // ========================================

  /**
   * 获取可用配方列表
   */
  async listRecipes(): Promise<ApiResult<GenymotionRecipe[]>> {
    return this.callApi('GET', '/recipes');
  }

  /**
   * 获取单个配方
   */
  async getRecipe(uuid: string): Promise<ApiResult<GenymotionRecipe>> {
    return this.callApi('GET', `/recipes/${uuid}`);
  }

  // ========================================
  // 应用管理
  // ========================================

  /**
   * 安装 APK
   */
  async installApk(uuid: string, apkUrl: string): Promise<ApiResult<void>> {
    return this.callApi('POST', `/instances/${uuid}/apps`, { url: apkUrl });
  }

  /**
   * 卸载应用
   */
  async uninstallApp(uuid: string, packageName: string): Promise<ApiResult<void>> {
    return this.callApi('DELETE', `/instances/${uuid}/apps/${packageName}`);
  }

  // ========================================
  // 文件操作
  // ========================================

  /**
   * 推送文件
   */
  async pushFile(
    uuid: string,
    fileUrl: string,
    remotePath: string
  ): Promise<ApiResult<void>> {
    return this.callApi('POST', `/instances/${uuid}/files`, {
      url: fileUrl,
      path: remotePath,
    });
  }

  // ========================================
  // 私有方法
  // ========================================

  /**
   * 调用 API
   */
  private async callApi<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<ApiResult<T>> {
    if (!this.apiToken) {
      return {
        success: false,
        errorCode: 'NotInitialized',
        errorMessage: 'Genymotion client not initialized',
      };
    }

    try {
      const response = await this.request({
        method,
        path: `/api/${this.apiVersion}${path}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response) {
        return { success: true };
      }

      const result = JSON.parse(response);

      if (result.error) {
        return {
          success: false,
          errorCode: result.error.code || 'ApiError',
          errorMessage: result.error.message || 'Unknown error',
        };
      }

      return {
        success: true,
        data: result.data || result,
      };
    } catch (error) {
      this.logger.error(`Genymotion API call failed: ${error.message}`);
      return {
        success: false,
        errorCode: 'ApiCallFailed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * 发送 HTTP 请求
   */
  private request(options: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: string;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: this.baseHost,
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
