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
 * OnlineSim API 响应接口
 */
export interface OnlineSimBalance {
  response: number | string;
  balance: string;
  zbalance: number;
}

export interface OnlineSimNumResult {
  response: number | string;
  tzid: number;
}

export interface OnlineSimState {
  country: number;
  sum: number;
  service: string;
  number: string;
  response: string;
  tzid: number;
  time: number;
  form: string;
  msg?: OnlineSimMessage[];
}

export interface OnlineSimMessage {
  service: string;
  text: string;
  code: string;
  created_at: string;
}

export interface OnlineSimService {
  id: number;
  name: string;
  slug: string;
}

export interface OnlineSimCountry {
  id: number;
  name: string;
  code: string;
}

export interface OnlineSimNumbersStats {
  service: string;
  count: number;
  popular: boolean;
}

/**
 * OnlineSim SMS平台适配器
 *
 * API文档: https://onlinesim.io/docs/api/en
 *
 * 特点:
 * - REST API
 * - 支持免费号码
 * - 操作ID系统（tzid）
 * - 详细的状态追踪
 *
 * 认证: API Key 作为请求参数
 * Base URL: https://onlinesim.io/api/
 */
@Injectable()
export class OnlineSimAdapter implements ISmsProvider {
  readonly providerName = 'onlinesim';
  private readonly logger = new Logger(OnlineSimAdapter.name);
  private readonly baseUrl = 'https://onlinesim.io/api/';
  private readonly apiKey: string;

  // 服务名称映射: 我们的代码 -> OnlineSim服务名
  private readonly serviceMapping: Record<string, string> = {
    telegram: 'telegram',
    whatsapp: 'whatsapp',
    google: 'google',
    facebook: 'facebook',
    instagram: 'instagram',
    twitter: 'twitter',
    viber: 'viber',
    wechat: 'wechat',
    microsoft: 'microsoft',
    amazon: 'amazon',
    tiktok: 'tiktok',
    uber: 'uber',
    discord: 'discord',
    snapchat: 'snapchat',
    yahoo: 'yahoo',
    steam: 'steam',
    linkedin: 'linkedin',
    paypal: 'paypal',
    netflix: 'netflix',
    apple: 'apple',
    vkontakte: 'VKcom',
    mailru: 'MailRu',
    yandex: 'Yandex',
  };

  // 国家代码映射 (E.164 格式，不带+)
  private readonly countryMapping: Record<string, number> = {
    RU: 7, // 俄罗斯
    UA: 380, // 乌克兰
    US: 1, // 美国
    GB: 44, // 英国
    UK: 44,
    CN: 86, // 中国
    IN: 91, // 印度
    ID: 62, // 印尼
    PH: 63, // 菲律宾
    MY: 60, // 马来西亚
    VN: 84, // 越南
    DE: 49, // 德国
    FR: 33, // 法国
    BR: 55, // 巴西
    KR: 82, // 韩国
    JP: 81, // 日本
    SE: 46, // 瑞典
    NL: 31, // 荷兰
    ES: 34, // 西班牙
    IT: 39, // 意大利
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('ONLINESIM_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('OnlineSim API key not configured');
    }
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, any> = {},
  ): Promise<T> {
    const queryParams: Record<string, any> = {
      apikey: this.apiKey,
      lang: 'en',
    };

    // 合并参数
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        queryParams[key] = value;
      }
    }

    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: queryParams,
          timeout: 15000,
        }),
      );

      const data = response.data;

      // 检查错误响应
      if (data && typeof data.response === 'string' && data.response !== '1') {
        const errorMessages: Record<string, string> = {
          'ERROR_WRONG_KEY': 'Invalid API key',
          'ERROR_NO_KEY': 'API key not provided',
          'ERROR_NO_SERVICE': 'Service not available',
          'ERROR_NO_NUMBER': 'No numbers available',
          'ERROR_PARAMS': 'Invalid parameters',
          'ERROR_WRONG_TZID': 'Invalid operation ID',
          'ERROR_NO_OPERATIONS': 'No active operations',
          'ERROR_NO_BALANCE': 'Insufficient balance',
          'ERROR_ACCOUNT_BLOCKED': 'Account blocked',
          'TZ_INPOOL': 'Number in pool, waiting',
          'TZ_NUM_WAIT': 'Waiting for number',
          'TZ_NUM_ANSWER': 'SMS received',
          'TZ_OVER_EMPTY': 'Time expired, no SMS',
          'TZ_OVER_OK': 'Operation completed',
        };

        // 某些响应是状态而非错误
        const statusResponses = ['TZ_INPOOL', 'TZ_NUM_WAIT', 'TZ_NUM_ANSWER', 'TZ_OVER_EMPTY', 'TZ_OVER_OK'];
        if (!statusResponses.includes(data.response)) {
          throw new ProviderError(
            errorMessages[data.response] || `API error: ${data.response}`,
            this.providerName,
            data.response,
            ['ERROR_NO_NUMBER', 'ERROR_NO_BALANCE'].includes(data.response),
          );
        }
      }

      return data as T;
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      this.logger.error(`OnlineSim API error [${endpoint}]: ${error.message}`, error.stack);
      throw new ProviderError(
        error.message || `Failed to execute ${endpoint}`,
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
    return this.countryMapping[country.toUpperCase()] ?? 7; // 默认俄罗斯
  }

  /**
   * 获取余额
   */
  async getBalance(): Promise<ProviderBalance> {
    const data = await this.request<OnlineSimBalance>('getBalance.php');
    return {
      balance: parseFloat(data.balance),
      currency: 'RUB',
    };
  }

  /**
   * 获取详细余额信息
   */
  async getDetailedBalance(): Promise<OnlineSimBalance> {
    return await this.request<OnlineSimBalance>('getBalance.php', { income: true });
  }

  /**
   * 获取虚拟号码
   */
  async getNumber(
    service: string,
    country: string | number = 7,
  ): Promise<GetNumberResult> {
    const mappedService = this.mapService(service);
    const countryCode = this.mapCountry(country);

    const data = await this.request<OnlineSimNumResult>('getNum.php', {
      service: mappedService,
      country: countryCode,
      number: true, // 返回号码
    });

    if (data.response !== 1 || !data.tzid) {
      throw new ProviderError(
        'Failed to get number',
        this.providerName,
        'GET_NUMBER_FAILED',
        true,
      );
    }

    // 获取号码详情
    const states = await this.getState(data.tzid);
    const state = Array.isArray(states) ? states[0] : states;

    return {
      activationId: data.tzid.toString(),
      phoneNumber: state?.number || '',
      country: countryCode.toString(),
      cost: state?.sum || 0,
      raw: { tzid: data.tzid, state },
    };
  }

  /**
   * 获取操作状态
   */
  async getState(tzid?: number): Promise<OnlineSimState[]> {
    const params: Record<string, any> = {
      message_to_code: 1, // 只返回验证码
    };
    if (tzid) {
      params.tzid = tzid;
    }

    const data = await this.request<OnlineSimState[]>('getState.php', params);
    return Array.isArray(data) ? data : [data];
  }

  /**
   * 检查短信状态
   */
  async getStatus(activationId: string): Promise<SmsStatus> {
    try {
      const states = await this.getState(parseInt(activationId, 10));
      const state = states[0];

      if (!state) {
        return {
          status: 'unknown',
          code: null,
          message: 'Operation not found',
        };
      }

      // 根据 response 字段判断状态
      switch (state.response) {
        case 'TZ_NUM_WAIT':
        case 'TZ_INPOOL':
          return {
            status: 'waiting',
            code: null,
            message: 'Waiting for SMS',
          };

        case 'TZ_NUM_ANSWER':
          // 提取验证码
          let code: string | null = null;
          if (state.msg && state.msg.length > 0) {
            code = state.msg[0].code || null;
          }
          return {
            status: code ? 'received' : 'waiting',
            code,
            message: state.msg?.[0]?.text,
          };

        case 'TZ_OVER_EMPTY':
          return {
            status: 'expired',
            code: null,
            message: 'Time expired without SMS',
          };

        case 'TZ_OVER_OK':
          return {
            status: 'received',
            code: state.msg?.[0]?.code || null,
            message: 'Operation completed',
          };

        default:
          return {
            status: 'unknown',
            code: null,
            message: `Status: ${state.response}`,
          };
      }
    } catch (error) {
      if (error instanceof ProviderError && error.code === 'ERROR_NO_OPERATIONS') {
        return {
          status: 'cancelled',
          code: null,
          message: 'Operation not found',
        };
      }
      throw error;
    }
  }

  /**
   * 设置操作为成功完成
   */
  async setOperationOk(tzid: number): Promise<void> {
    await this.request('setOperationOk.php', { tzid });
    this.logger.log(`Operation completed: ${tzid}`);
  }

  /**
   * 请求下一条短信
   */
  async setOperationRevise(tzid: number): Promise<void> {
    await this.request('setOperationRevise.php', { tzid });
    this.logger.log(`Requested next SMS for operation: ${tzid}`);
  }

  /**
   * 设置号码状态
   */
  async setStatus(activationId: string, status: number): Promise<void> {
    const tzid = parseInt(activationId, 10);
    if (status === 6) {
      await this.setOperationOk(tzid);
    } else if (status === 3) {
      await this.setOperationRevise(tzid);
    }
    // OnlineSim 没有显式取消，超时自动取消
  }

  /**
   * 取消激活
   * 注：OnlineSim 不支持显式取消，操作会在超时后自动取消
   */
  async cancel(activationId: string): Promise<void> {
    this.logger.warn(`OnlineSim does not support explicit cancellation. Operation ${activationId} will timeout automatically.`);
  }

  /**
   * 完成激活
   */
  async finish(activationId: string): Promise<void> {
    await this.setOperationOk(parseInt(activationId, 10));
  }

  /**
   * 获取可用号码统计
   */
  async getNumbersStats(country?: number): Promise<OnlineSimNumbersStats[]> {
    const data = await this.request<{ services: OnlineSimNumbersStats[] }>(
      'getNumbersStats.php',
      { country },
    );
    return data.services || [];
  }

  /**
   * 获取国家列表
   */
  async getCountries(): Promise<OnlineSimCountry[]> {
    try {
      // OnlineSim 可能没有专门的国家列表 API，返回预设列表
      return Object.entries(this.countryMapping).map(([code, id]) => ({
        id,
        name: code,
        code,
      }));
    } catch (error) {
      this.logger.error(`Failed to get countries: ${error.message}`);
      return [];
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getBalance();
      return true;
    } catch (error) {
      this.logger.error(`OnlineSim health check failed: ${error.message}`);
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
