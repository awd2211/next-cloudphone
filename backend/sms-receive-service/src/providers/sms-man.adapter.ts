import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  ISmsProvider,
  GetNumberResult,
  SmsStatus,
  ProviderBalance,
  ProviderError,
} from './provider.interface';

/**
 * SMS-Man API 响应接口
 */
export interface SmsManCountry {
  id: number;
  name: string;
  name_en: string;
}

export interface SmsManService {
  id: number;
  name: string;
  name_en: string;
}

export interface SmsManPriceInfo {
  [countryId: string]: {
    [serviceId: string]: {
      cost: number;
      count: number;
    };
  };
}

/**
 * SMS-Man SMS平台适配器
 *
 * API文档: https://sms-man.com/api/compatible
 *
 * 特点:
 * - 兼容 SMS-Activate 协议
 * - 价格有竞争力
 * - 支持多国家/多服务
 *
 * 认证: API Key 作为请求参数
 * Base URL: https://api.sms-man.com/stubs/handler_api.php
 */
@Injectable()
export class SmsManAdapter implements ISmsProvider {
  readonly providerName = 'sms-man';
  private readonly logger = new Logger(SmsManAdapter.name);
  private readonly baseUrl = 'https://api.sms-man.com/stubs/handler_api.php';
  private readonly apiKey: string;

  // 服务代码映射: 我们的代码 -> SMS-Man代码
  private readonly serviceMapping: Record<string, string> = {
    telegram: 'tg',
    whatsapp: 'wa',
    google: 'go',
    facebook: 'fb',
    instagram: 'ig',
    twitter: 'tw',
    microsoft: 'ms',
    amazon: 'am',
    tiktok: 'lf',
    uber: 'ub',
    wechat: 'wb',
    discord: 'ds',
    snapchat: 'fu',
    yahoo: 'mb',
    steam: 'mt',
    linkedin: 'ew',
    paypal: 'ts',
    netflix: 'nf',
    apple: 'wx',
    viber: 'vi',
    line: 'me',
    kakaotalk: 'kt',
  };

  // 国家代码映射
  private readonly countryMapping: Record<string, number> = {
    RU: 0, // 俄罗斯
    UA: 1, // 乌克兰
    US: 12, // 美国
    GB: 16, // 英国
    UK: 16,
    CN: 3, // 中国
    IN: 22, // 印度
    ID: 6, // 印尼
    PH: 4, // 菲律宾
    MY: 7, // 马来西亚
    VN: 10, // 越南
    DE: 43, // 德国
    FR: 78, // 法国
    BR: 73, // 巴西
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('SMS_MAN_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('SMS-Man API key not configured');
    }
  }

  /**
   * 通用请求方法
   */
  private async request<T = string>(
    action: string,
    params: Record<string, any> = {},
  ): Promise<T> {
    const queryParams: Record<string, any> = {
      api_key: this.apiKey,
      action,
    };

    // 过滤空值参数
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        queryParams[key] = value;
      }
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl, {
          params: queryParams,
          timeout: 15000,
        }),
      );

      const data = response.data;

      // 检查错误响应
      if (typeof data === 'string') {
        const errorCodes = [
          'BAD_KEY',
          'ERROR_SQL',
          'BAD_ACTION',
          'NO_NUMBERS',
          'NO_BALANCE',
          'WRONG_SERVICE',
          'BAD_STATUS',
          'NO_ACTIVATION',
          'BANNED',
        ];

        for (const errorCode of errorCodes) {
          if (data.startsWith(errorCode)) {
            throw new ProviderError(
              data,
              this.providerName,
              errorCode,
              ['NO_NUMBERS', 'NO_BALANCE'].includes(errorCode),
            );
          }
        }
      }

      return data as T;
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      this.logger.error(`SMS-Man API error [${action}]: ${error.message}`, error.stack);
      throw new ProviderError(
        error.message || `Failed to execute ${action}`,
        this.providerName,
        'REQUEST_FAILED',
        true,
      );
    }
  }

  /**
   * 转换服务代码
   */
  private mapService(service: string): string {
    return this.serviceMapping[service.toLowerCase()] || service;
  }

  /**
   * 转换国家代码
   */
  private mapCountry(country: number | string): number {
    if (typeof country === 'number') {
      return country;
    }
    return this.countryMapping[country.toUpperCase()] ?? 0;
  }

  /**
   * 获取余额
   */
  async getBalance(): Promise<ProviderBalance> {
    const data = await this.request<string>('getBalance');

    // 响应格式: ACCESS_BALANCE:123.45
    if (typeof data === 'string' && data.startsWith('ACCESS_BALANCE:')) {
      return {
        balance: parseFloat(data.split(':')[1]),
        currency: 'RUB',
      };
    }

    throw new ProviderError(
      `Unexpected balance response: ${data}`,
      this.providerName,
      'BALANCE_FORMAT_ERROR',
      true,
    );
  }

  /**
   * 获取虚拟号码
   */
  async getNumber(
    service: string,
    country: string | number = 0,
  ): Promise<GetNumberResult> {
    const countryCode = this.mapCountry(country);
    const mappedService = this.mapService(service);

    const data = await this.request<string>('getNumber', {
      service: mappedService,
      country: countryCode,
    });

    // 响应格式: ACCESS_NUMBER:123456789:79123456789
    if (typeof data === 'string') {
      const parts = data.split(':');

      if (parts[0] !== 'ACCESS_NUMBER') {
        throw new ProviderError(
          `Failed to get number: ${data}`,
          this.providerName,
          'GET_NUMBER_FAILED',
          false,
        );
      }

      // 获取价格
      const cost = await this.getServicePrice(mappedService, countryCode);

      return {
        activationId: parts[1],
        phoneNumber: `+${parts[2]}`,
        cost,
        raw: data,
      };
    }

    throw new ProviderError(
      `Unexpected response format: ${JSON.stringify(data)}`,
      this.providerName,
      'PARSE_ERROR',
      false,
    );
  }

  /**
   * 检查短信状态
   */
  async getStatus(activationId: string): Promise<SmsStatus> {
    const data = await this.request<string>('getStatus', { id: activationId });

    // STATUS_WAIT_CODE - 等待验证码
    if (data === 'STATUS_WAIT_CODE') {
      return { status: 'waiting', code: null };
    }

    // STATUS_WAIT_RETRY - 等待重发
    if (data === 'STATUS_WAIT_RETRY') {
      return { status: 'waiting', code: null, message: 'Waiting for retry' };
    }

    // STATUS_OK:123456 - 收到验证码
    if (typeof data === 'string' && data.startsWith('STATUS_OK:')) {
      const code = data.split(':')[1];
      return { status: 'received', code };
    }

    // STATUS_CANCEL - 已取消
    if (data === 'STATUS_CANCEL') {
      return { status: 'cancelled', code: null };
    }

    return { status: 'unknown', code: null, message: data };
  }

  /**
   * 设置激活状态
   * @param status 状态码：1=准备，3=重发，6=完成，8=取消
   */
  async setStatus(activationId: string, status: number): Promise<void> {
    const data = await this.request<string>('setStatus', {
      id: activationId,
      status,
    });

    this.logger.log(`Set status ${status} for activation ${activationId}: ${data}`);
  }

  /**
   * 取消激活
   */
  async cancel(activationId: string): Promise<void> {
    await this.setStatus(activationId, 8);
  }

  /**
   * 完成激活
   */
  async finish(activationId: string): Promise<void> {
    await this.setStatus(activationId, 6);
  }

  /**
   * 获取服务价格
   */
  async getServicePrice(service: string, country: number): Promise<number> {
    try {
      const data = await this.request<SmsManPriceInfo>(
        'getPrices',
        { service, country },
      );

      if (data && data[country] && data[country][service]) {
        return parseFloat(String(data[country][service].cost));
      }

      return 0.10;
    } catch (error) {
      this.logger.error(`Failed to get price for ${service}/${country}`, error.stack);
      return 0.10;
    }
  }

  /**
   * 获取所有价格
   */
  async getPrices(service?: string, country?: number): Promise<SmsManPriceInfo> {
    const mappedService = service ? this.mapService(service) : undefined;
    const data = await this.request<SmsManPriceInfo>(
      'getPrices',
      { service: mappedService, country },
    );
    return data;
  }

  /**
   * 获取国家列表
   */
  async getCountries(): Promise<SmsManCountry[]> {
    try {
      const data = await this.request<Record<string, SmsManCountry>>('getCountries');
      return Object.values(data);
    } catch (error) {
      this.logger.error(`Failed to get countries: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取服务列表
   */
  async getServices(): Promise<SmsManService[]> {
    try {
      const data = await this.request<Record<string, SmsManService>>('getServices');
      return Object.values(data);
    } catch (error) {
      this.logger.error(`Failed to get services: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取可用号码数量
   */
  async getNumbersStatus(country?: number): Promise<Record<string, number>> {
    const data = await this.request<Record<string, number>>(
      'getNumbersStatus',
      { country },
    );
    return data;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getBalance();
      return true;
    } catch (error) {
      this.logger.error(`SMS-Man health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取服务代码映射
   */
  getServiceMapping(): Record<string, string> {
    return { ...this.serviceMapping };
  }

  /**
   * 等待短信（轮询）
   */
  async waitForSms(
    activationId: string,
    maxWaitSeconds: number = 120,
    pollIntervalMs: number = 5000,
  ): Promise<SmsStatus> {
    const startTime = Date.now();
    const maxWaitMs = maxWaitSeconds * 1000;

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getStatus(activationId);

      if (status.status === 'received' && status.code) {
        return status;
      }

      if (status.status === 'cancelled' || status.status === 'expired') {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return { status: 'expired', code: null, message: 'Wait timeout' };
  }
}
