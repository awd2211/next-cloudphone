import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HuaweiCphConfig,
  HuaweiPhoneInstance,
  CreateHuaweiPhoneRequest,
  HuaweiOperationResult,
} from './huawei.types';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { ProxyClientService, ProxyInfo } from '@cloudphone/shared';

/**
 * HuaweiCphProxyClient
 *
 * 华为云手机 CPH SDK 客户端 - 使用代理版本
 *
 * 与 HuaweiCphClient 的区别:
 * - 通过 ProxyClientService 获取代理
 * - 所有 API 请求通过代理发送
 * - 自动报告代理使用情况
 *
 * 使用场景:
 * - 避免华为云 API 限流
 * - 多地域访问优化
 * - IP 轮换提高可用性
 */
@Injectable()
export class HuaweiCphProxyClient {
  private readonly logger = new Logger(HuaweiCphProxyClient.name);
  private config: HuaweiCphConfig;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private proxyClient: ProxyClientService // 注入代理客户端
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

    this.logger.log(
      `HuaweiCphProxyClient initialized for region: ${this.config.region}, Proxy: ${this.proxyClient.isEnabled() ? 'Enabled' : 'Disabled'}`
    );

    if (!this.config.accessKeyId || !this.config.secretAccessKey) {
      this.logger.warn(
        'Huawei Cloud credentials not configured. SDK will not work properly.'
      );
    }
  }

  /**
   * 创建云手机实例（使用代理）
   *
   * API: POST /v1/{project_id}/cloud-phone/phones
   */
  async createPhone(
    request: CreateHuaweiPhoneRequest
  ): Promise<HuaweiOperationResult<HuaweiPhoneInstance>> {
    try {
      this.logger.log(`Creating Huawei phone with proxy: ${request.phoneName}`);

      const body = {
        phone_name: request.phoneName,
        server_id: request.serverId,
        phone_model_name: request.specId,
        image_id: request.imageId,
        count: request.count || 1,
        keypair_name: request.property?.keypairName,
        extend_param: request.property,
      };

      // 使用代理客户端的 withProxy 方法
      // 自动管理代理获取、使用、报告、释放
      const result = await this.proxyClient.withProxy(
        async (proxy: ProxyInfo) => {
          // 通过代理发送请求
          const response = await this.makeProxiedRequest(
            'POST',
            `/v1/${this.config.projectId}/cloud-phone/phones`,
            body,
            proxy
          );

          return response;
        },
        {
          // 代理筛选条件
          criteria: {
            country: 'CN', // 中国代理（华为云在中国）
            minQuality: 80, // 最低质量分数
            maxLatency: 500, // 最大延迟500ms
          },
          validate: true, // 验证代理可用性
        }
      );

      // 华为云创建是异步的,返回job_id
      const phoneId = result.data?.jobs?.[0]?.phone_id;
      if (!phoneId) {
        return {
          success: false,
          errorMessage: 'No phone ID returned from Huawei API',
          requestId: result.requestId,
        };
      }

      this.logger.log(`Huawei phone created (with proxy): ${phoneId}`);

      return {
        success: true,
        data: {
          id: phoneId,
          name: request.phoneName,
          status: 'CREATING',
        } as any,
        requestId: result.requestId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create Huawei phone with proxy: ${error.message}`,
        error.stack
      );
      return {
        success: false,
        errorMessage: error.message,
        errorCode: error.code || 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * 通过代理发送HTTP请求
   *
   * @param method - HTTP方法
   * @param path - API路径
   * @param body - 请求体
   * @param proxy - 代理信息
   */
  private async makeProxiedRequest(
    method: string,
    path: string,
    body: any,
    proxy: ProxyInfo
  ): Promise<any> {
    const url = `${this.config.endpoint}${path}`;

    // 配置代理
    const proxyConfig = {
      proxy: {
        host: proxy.host,
        port: proxy.port,
        auth:
          proxy.username && proxy.password
            ? {
                username: proxy.username,
                password: proxy.password,
              }
            : undefined,
      },
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CloudPhone-ProxyService/1.0',
      },
      // 添加华为云签名认证
      ...this.buildAuthHeaders(method, path),
    };

    this.logger.debug(
      `Making ${method} request to ${url} via proxy ${proxy.host}:${proxy.port}`
    );

    // 发送请求
    const observable =
      method === 'POST'
        ? this.httpService.post(url, body, proxyConfig)
        : this.httpService.get(url, proxyConfig);

    const response = await lastValueFrom(observable);

    this.logger.debug(
      `Request completed via proxy. Status: ${response.status}`
    );

    return response.data;
  }

  /**
   * 构建华为云认证头
   * (简化实现，生产环境需完整的AK/SK签名算法)
   */
  private buildAuthHeaders(method: string, path: string): any {
    // 这里应该实现华为云的 AK/SK 签名算法
    // 简化版本仅返回基础头
    return {
      'X-Project-Id': this.config.projectId,
      // 'Authorization': 'SDK signature here',
    };
  }

  /**
   * 获取云手机详情（使用代理）
   *
   * 演示不使用 withProxy 辅助方法的手动管理方式
   */
  async getPhoneDetail(phoneId: string): Promise<HuaweiOperationResult<any>> {
    let session = null;

    try {
      // 1. 获取代理
      session = await this.proxyClient.acquireProxy({
        criteria: {
          country: 'CN',
          minQuality: 70,
        },
      });

      this.logger.debug(
        `Acquired proxy for getPhoneDetail: ${session.proxy.host}:${session.proxy.port}`
      );

      // 2. 使用代理发送请求
      const response = await this.makeProxiedRequest(
        'GET',
        `/v1/${this.config.projectId}/cloud-phone/phones/${phoneId}`,
        null,
        session.proxy
      );

      // 3. 报告成功
      await this.proxyClient.reportSuccess(session.sessionId, 0.1); // ~0.1MB

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get phone detail with proxy: ${error.message}`
      );

      // 报告失败
      if (session) {
        await this.proxyClient.reportFailure(session.sessionId, error);
      }

      return {
        success: false,
        errorMessage: error.message,
      };
    } finally {
      // 4. 释放代理
      if (session) {
        await this.proxyClient.releaseProxy(session.sessionId);
      }
    }
  }
}
