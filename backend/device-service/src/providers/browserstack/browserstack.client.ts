/**
 * BrowserStack App Live / App Automate API 客户端
 *
 * API 文档:
 * - App Live: https://www.browserstack.com/app-live/rest-api
 * - App Automate: https://www.browserstack.com/docs/app-automate/api-reference
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

import {
  BrowserStackCredentials,
  BrowserStackDevice,
  BrowserStackApp,
  BrowserStackSession,
  UploadAppRequest,
  StartSessionRequest,
  BrowserStackApiResponse,
} from './browserstack.types';

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
export class BrowserStackClient {
  private readonly logger = new Logger(BrowserStackClient.name);
  private credentials: BrowserStackCredentials | null = null;
  private readonly appLiveHost = 'api.browserstack.com';
  private readonly appAutomateHost = 'api-cloud.browserstack.com';

  constructor(private readonly configService: ConfigService) {}

  /**
   * 初始化凭证
   */
  async initialize(credentials?: BrowserStackCredentials): Promise<void> {
    if (credentials) {
      this.credentials = credentials;
    } else {
      this.credentials = {
        username: this.configService.get<string>('BROWSERSTACK_USERNAME', ''),
        accessKey: this.configService.get<string>('BROWSERSTACK_ACCESS_KEY', ''),
      };
    }

    if (!this.credentials.username || !this.credentials.accessKey) {
      this.logger.warn('BrowserStack credentials not configured');
    } else {
      this.logger.log('BrowserStack client initialized');
    }
  }

  /**
   * 检查凭证是否有效
   */
  isInitialized(): boolean {
    return !!(this.credentials?.username && this.credentials?.accessKey);
  }

  /**
   * 获取 Basic Auth 头
   */
  private getAuthHeader(): string {
    const auth = Buffer.from(
      `${this.credentials!.username}:${this.credentials!.accessKey}`
    ).toString('base64');
    return `Basic ${auth}`;
  }

  // ========================================
  // 设备管理
  // ========================================

  /**
   * 获取可用设备列表
   */
  async getDevices(): Promise<ApiResult<BrowserStackDevice[]>> {
    return this.callApi('GET', this.appLiveHost, '/app-live/devices.json');
  }

  // ========================================
  // 应用管理
  // ========================================

  /**
   * 上传应用 (通过 URL)
   */
  async uploadApp(request: UploadAppRequest): Promise<ApiResult<BrowserStackApp>> {
    return this.callApi('POST', this.appLiveHost, '/app-live/upload', request);
  }

  /**
   * 获取已上传的应用列表
   */
  async getRecentApps(): Promise<ApiResult<BrowserStackApp[]>> {
    return this.callApi('GET', this.appLiveHost, '/app-live/recent_apps');
  }

  /**
   * 删除应用
   */
  async deleteApp(appId: string): Promise<ApiResult<void>> {
    return this.callApi('DELETE', this.appLiveHost, `/app-live/app/delete/${appId}`);
  }

  /**
   * 通过 Custom ID 获取应用
   */
  async getAppByCustomId(customId: string): Promise<ApiResult<BrowserStackApp[]>> {
    return this.callApi('GET', this.appLiveHost, `/app-live/recent_apps/${customId}`);
  }

  // ========================================
  // App Automate - 应用管理
  // ========================================

  /**
   * 上传应用到 App Automate
   */
  async uploadAppAutomate(request: UploadAppRequest): Promise<ApiResult<BrowserStackApp>> {
    return this.callApi('POST', this.appAutomateHost, '/app-automate/upload', request);
  }

  /**
   * 获取 App Automate 应用列表
   */
  async getAppAutomateApps(): Promise<ApiResult<BrowserStackApp[]>> {
    return this.callApi('GET', this.appAutomateHost, '/app-automate/recent_apps');
  }

  // ========================================
  // App Automate - 会话管理
  // ========================================

  /**
   * 获取项目列表
   */
  async getProjects(): Promise<ApiResult<any[]>> {
    return this.callApi('GET', this.appAutomateHost, '/app-automate/projects.json');
  }

  /**
   * 获取会话详情
   */
  async getSession(sessionId: string): Promise<ApiResult<BrowserStackSession>> {
    return this.callApi('GET', this.appAutomateHost, `/app-automate/sessions/${sessionId}.json`);
  }

  /**
   * 更新会话状态
   */
  async updateSessionStatus(
    sessionId: string,
    status: 'passed' | 'failed',
    reason?: string
  ): Promise<ApiResult<void>> {
    return this.callApi('PUT', this.appAutomateHost, `/app-automate/sessions/${sessionId}.json`, {
      status,
      reason,
    });
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string): Promise<ApiResult<void>> {
    return this.callApi('DELETE', this.appAutomateHost, `/app-automate/sessions/${sessionId}.json`);
  }

  // ========================================
  // App Automate - 构建管理
  // ========================================

  /**
   * 获取构建列表
   */
  async getBuilds(): Promise<ApiResult<any[]>> {
    return this.callApi('GET', this.appAutomateHost, '/app-automate/builds.json');
  }

  /**
   * 删除构建
   */
  async deleteBuild(buildId: string): Promise<ApiResult<void>> {
    return this.callApi('DELETE', this.appAutomateHost, `/app-automate/builds/${buildId}.json`);
  }

  // ========================================
  // 账户信息
  // ========================================

  /**
   * 获取计划和使用情况
   */
  async getPlan(): Promise<ApiResult<any>> {
    return this.callApi('GET', this.appAutomateHost, '/app-automate/plan.json');
  }

  // ========================================
  // 私有方法
  // ========================================

  /**
   * 调用 API
   */
  private async callApi<T>(
    method: string,
    host: string,
    path: string,
    body?: any
  ): Promise<ApiResult<T>> {
    if (!this.credentials?.username || !this.credentials?.accessKey) {
      return {
        success: false,
        errorCode: 'NotInitialized',
        errorMessage: 'BrowserStack client not initialized',
      };
    }

    try {
      const response = await this.request({
        host,
        method,
        path,
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getAuthHeader(),
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
          errorCode: 'ApiError',
          errorMessage: result.error,
        };
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`BrowserStack API call failed: ${error.message}`);
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
    host: string;
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: string;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: options.host,
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
