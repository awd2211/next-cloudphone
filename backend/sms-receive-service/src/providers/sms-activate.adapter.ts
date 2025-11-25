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

// ============================================
// 类型定义
// ============================================

/**
 * SMS-Activate 国家信息
 */
export interface SmsActivateCountry {
  id: number;
  rus: string;
  eng: string;
  chn: string;
  visible: boolean;
  retry: boolean;
  rent: boolean;
  multiService: boolean;
}

/**
 * SMS-Activate 运营商可用号码数量
 */
export interface SmsActivateNumbersStatus {
  [serviceCode: string]: number;
}

/**
 * SMS-Activate 价格信息
 */
export interface SmsActivatePriceInfo {
  [countryId: string]: {
    [serviceCode: string]: {
      cost: number;
      count: number;
    };
  };
}

/**
 * SMS-Activate 租赁号码信息
 */
export interface SmsActivateRentNumber {
  id: number;
  phone: string;
  endDate: string;
}

/**
 * SMS-Activate 租赁状态
 */
export interface SmsActivateRentStatus {
  status: string;
  quantity: number;
  values: SmsActivateRentSms[];
}

/**
 * SMS-Activate 租赁短信
 */
export interface SmsActivateRentSms {
  phoneFrom: string;
  text: string;
  date: string;
}

/**
 * SMS-Activate 租赁列表项
 */
export interface SmsActivateRentItem {
  id: number;
  phone: string;
  status: string;
  endDate: string;
}

/**
 * SMS-Activate 租赁服务和国家
 */
export interface SmsActivateRentServicesAndCountries {
  countries: {
    [countryId: string]: {
      name: string;
      count: number;
    };
  };
  operators: {
    [countryId: string]: string[];
  };
  services: {
    [serviceCode: string]: string;
  };
}

/**
 * SMS-Activate 热门国家
 */
export interface SmsActivateTopCountry {
  country: number;
  count: number;
  price: number;
  retail_price: number;
}

/**
 * SMS-Activate 当前激活项
 */
export interface SmsActivateCurrentActivation {
  activationId: string;
  phoneNumber: string;
  activationCost: string;
  activationStatus: string;
  smsCode: string | null;
  smsText: string | null;
  activationTime: string;
  canGetAnotherSms: boolean;
  countryCode: string;
  serviceCode: string;
}

/**
 * SMS-Activate 当前激活列表响应
 */
export interface SmsActivateCurrentActivationsResponse {
  status: string;
  activeActivations: SmsActivateCurrentActivation[];
}

/**
 * 余额和返现信息
 */
export interface SmsActivateBalanceAndCashBack {
  balance: number;
  cashBack: number;
  currency: string;
}

/**
 * 多服务号码请求结果
 */
export interface SmsActivateMultiServiceResult {
  id: number;
  phone: string;
  activation: {
    [serviceCode: string]: {
      id: number;
      service: string;
    };
  };
}

@Injectable()
export class SmsActivateAdapter implements ISmsProvider {
  readonly providerName = 'sms-activate';
  private readonly logger = new Logger(SmsActivateAdapter.name);
  private readonly baseUrl = 'https://api.sms-activate.io/stubs/handler_api.php';
  private readonly apiKey: string;

  // 常用服务代码映射
  private readonly serviceMapping: Record<string, string> = {
    telegram: 'tg',
    whatsapp: 'wa',
    google: 'go',
    facebook: 'fb',
    instagram: 'ig',
    twitter: 'tw',
    microsoft: 'ms',
    amazon: 'am',
    tiktok: 'lf', // lf = TikTok/Douyin
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
    signal: 'sg',
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('SMS_ACTIVATE_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('SMS-Activate API key not configured');
    }
  }

  /**
   * 通用请求方法
   */
  private async request<T = string>(
    action: string,
    params: Record<string, any> = {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _expectJson: boolean = false,
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
          'NO_CONNECTION',
          'ACCOUNT_INACTIVE',
          'INVALID_PHONE',
          'WRONG_SECURITY',
          'CANT_CANCEL',
          'WRONG_OPERATOR',
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
      this.logger.error(`SMS-Activate API error [${action}]: ${error.message}`, error.stack);
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

  // ============================================
  // 账户相关 API
  // ============================================

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
   * 获取余额和返现
   */
  async getBalanceAndCashBack(): Promise<SmsActivateBalanceAndCashBack> {
    const data = await this.request<string>('getBalanceAndCashBack');

    // 响应格式: ACCESS_BALANCE_CASHBACK:123.45:10.00
    if (typeof data === 'string' && data.startsWith('ACCESS_BALANCE_CASHBACK:')) {
      const parts = data.split(':');
      return {
        balance: parseFloat(parts[1]),
        cashBack: parseFloat(parts[2] || '0'),
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

  // ============================================
  // 国家和运营商 API
  // ============================================

  /**
   * 获取所有国家列表
   */
  async getCountries(): Promise<Record<string, SmsActivateCountry>> {
    const data = await this.request<Record<string, SmsActivateCountry>>('getCountries', {}, true);
    this.logger.log(`Retrieved ${Object.keys(data).length} countries from SMS-Activate`);
    return data;
  }

  /**
   * 获取指定国家/运营商的可用号码数量
   * @param country 国家ID（0=俄罗斯，1=乌克兰，12=美国等）
   * @param operator 运营商代码（可选）
   */
  async getNumbersStatus(
    country?: number,
    operator?: string,
  ): Promise<SmsActivateNumbersStatus> {
    const data = await this.request<SmsActivateNumbersStatus>(
      'getNumbersStatus',
      { country, operator },
      true,
    );
    return data;
  }

  /**
   * 获取按服务排序的热门国家
   * @param service 服务代码
   * @param freePrice 是否使用自由价格（默认 false）
   */
  async getTopCountriesByService(
    service: string,
    freePrice: boolean = false,
  ): Promise<Record<string, SmsActivateTopCountry>> {
    const mappedService = this.mapService(service);
    const data = await this.request<Record<string, SmsActivateTopCountry>>(
      'getTopCountriesByService',
      {
        service: mappedService,
        freePrice: freePrice ? 'true' : undefined,
      },
      true,
    );
    return data;
  }

  // ============================================
  // 号码获取 API
  // ============================================

  /**
   * 获取虚拟号码
   * @param service 服务代码 (go=Google, tg=Telegram等)
   * @param country 国家代码 (0=俄罗斯, 1=乌克兰, 12=美国等)
   * @param operator 运营商代码（可选）
   * @param forward 是否启用转发（可选）
   * @param phoneException 排除的号码前缀（可选）
   */
  async getNumber(
    service: string,
    country: string | number = 0,
    options?: {
      operator?: string;
      forward?: boolean;
      phoneException?: string;
      ref?: string;
    },
  ): Promise<GetNumberResult> {
    const countryCode = typeof country === 'string' ? parseInt(country, 10) || 0 : country;
    const mappedService = this.mapService(service);

    const data = await this.request<string>('getNumber', {
      service: mappedService,
      country: countryCode,
      operator: options?.operator,
      forward: options?.forward ? '1' : undefined,
      phoneException: options?.phoneException,
      ref: options?.ref,
    });

    // 响应格式: ACCESS_NUMBER:123456789:79123456789
    if (typeof data === 'string') {
      const parts = data.split(':');

      if (parts[0] !== 'ACCESS_NUMBER') {
        throw new ProviderError(`Failed to get number: ${data}`, this.providerName, 'GET_NUMBER_FAILED', false);
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

    throw new ProviderError(`Unexpected response format: ${JSON.stringify(data)}`, this.providerName, 'PARSE_ERROR', false);
  }

  /**
   * 获取多服务号码（一个号码用于多个服务）
   * @param services 服务代码数组
   * @param country 国家代码
   * @param options 可选参数
   */
  async getMultiServiceNumber(
    services: string[],
    country: number = 0,
    options?: {
      operator?: string;
      forward?: string[];
      phoneException?: string;
      ref?: string;
    },
  ): Promise<SmsActivateMultiServiceResult> {
    const mappedServices = services.map((s) => this.mapService(s));
    const multiService = mappedServices.join(',');
    const multiForward = options?.forward?.join(',');

    const data = await this.request<SmsActivateMultiServiceResult>(
      'getMultiServiceNumber',
      {
        multiService,
        multiForward,
        country,
        operator: options?.operator,
        phoneException: options?.phoneException,
        ref: options?.ref,
      },
      true,
    );

    return data;
  }

  /**
   * 获取额外服务（用于转发号码）
   * @param service 服务代码
   * @param parentActivationId 父激活ID
   */
  async getAdditionalService(
    service: string,
    parentActivationId: string,
  ): Promise<GetNumberResult> {
    const mappedService = this.mapService(service);

    const data = await this.request<string>('getAdditionalService', {
      service: mappedService,
      id: parentActivationId,
    });

    // 响应格式: ADDITIONAL_SERVICE:activation_id:phone_number
    if (typeof data === 'string' && data.startsWith('ADDITIONAL_SERVICE:')) {
      const parts = data.split(':');
      return {
        activationId: parts[1],
        phoneNumber: `+${parts[2]}`,
        cost: 0, // 额外服务通常免费
        raw: data,
      };
    }

    throw new ProviderError(`Unexpected response: ${data}`, this.providerName, 'PARSE_ERROR', false);
  }

  // ============================================
  // 激活状态管理 API
  // ============================================

  /**
   * 检查短信状态
   * @param activationId 激活ID
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

    // STATUS_WAIT_RESEND - 等待重发
    if (data === 'STATUS_WAIT_RESEND') {
      return { status: 'waiting', code: null, message: 'Waiting for resend' };
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
   * 获取完整短信内容
   * @param activationId 激活ID
   */
  async getFullSms(activationId: string): Promise<{ code: string | null; fullSms: string | null }> {
    const data = await this.request<string>('getFullSms', { id: activationId });

    // FULL_SMS:activation_id:full_text
    if (typeof data === 'string' && data.startsWith('FULL_SMS:')) {
      const parts = data.split(':');
      // 短信内容可能包含冒号，所以需要合并后面的部分
      const fullSms = parts.slice(2).join(':');
      // 尝试从短信中提取验证码（通常是4-8位数字）
      const codeMatch = fullSms.match(/\b(\d{4,8})\b/);
      return {
        code: codeMatch ? codeMatch[1] : null,
        fullSms,
      };
    }

    // STATUS_WAIT_CODE - 还在等待
    if (data === 'STATUS_WAIT_CODE') {
      return { code: null, fullSms: null };
    }

    return { code: null, fullSms: data };
  }

  /**
   * 设置激活状态
   * @param activationId 激活ID
   * @param status 状态码：
   *   - 1: 通知已准备（短信已发送给号码）
   *   - 3: 请求另一个代码（重发）
   *   - 6: 完成激活（成功）
   *   - 8: 取消激活（退款）
   */
  async setStatus(activationId: string, status: number): Promise<void> {
    const data = await this.request<string>('setStatus', {
      id: activationId,
      status,
    });

    this.logger.log(`Set status ${status} for activation ${activationId}: ${data}`);
  }

  /**
   * 设置激活状态（带转发号码）
   * @param activationId 激活ID
   * @param status 状态码
   * @param forward 转发号码
   */
  async setStatusWithForward(
    activationId: string,
    status: number,
    forward: string,
  ): Promise<string> {
    const data = await this.request<string>('setStatus', {
      id: activationId,
      status,
      forward,
    });

    this.logger.log(`Set status ${status} for activation ${activationId} with forward: ${data}`);
    return data;
  }

  /**
   * 完成激活（成功）
   */
  async finish(activationId: string): Promise<void> {
    await this.setStatus(activationId, 6);
  }

  /**
   * 取消激活（退款）
   */
  async cancel(activationId: string): Promise<void> {
    await this.setStatus(activationId, 8);
  }

  /**
   * 请求重发短信
   */
  async requestResend(activationId: string): Promise<void> {
    await this.setStatus(activationId, 3);
  }

  /**
   * 通知已准备接收短信
   */
  async notifyReady(activationId: string): Promise<void> {
    await this.setStatus(activationId, 1);
  }

  // ============================================
  // 当前激活管理 API
  // ============================================

  /**
   * 获取当前激活列表
   */
  async getCurrentActivations(): Promise<SmsActivateCurrentActivation[]> {
    try {
      const data = await this.request<SmsActivateCurrentActivationsResponse>(
        'getActiveActivations',
        {},
        true,
      );

      if (data.status === 'success' && data.activeActivations) {
        this.logger.log(`Retrieved ${data.activeActivations.length} active activations`);
        return data.activeActivations;
      }

      return [];
    } catch (error) {
      // 如果没有激活项，API可能返回错误
      if (error instanceof ProviderError && error.code === 'NO_ACTIVATION') {
        return [];
      }
      throw error;
    }
  }

  // ============================================
  // 定价 API
  // ============================================

  /**
   * 获取服务价格
   * @param service 服务代码
   * @param country 国家代码
   */
  async getServicePrice(service: string, country: number): Promise<number> {
    try {
      const data = await this.request<SmsActivatePriceInfo>(
        'getPrices',
        { service, country },
        true,
      );

      // 响应格式: {country: {service: {cost: "1.50", count: 100}}}
      if (data && data[country] && data[country][service]) {
        return parseFloat(String(data[country][service].cost));
      }

      this.logger.warn(`Could not get price for ${service}/${country}, using default`);
      return 0.10;
    } catch (error) {
      this.logger.error(`Failed to get price for ${service}/${country}`, error.stack);
      return 0.10;
    }
  }

  /**
   * 获取所有价格
   * @param service 服务代码（可选）
   * @param country 国家代码（可选）
   */
  async getPrices(service?: string, country?: number): Promise<SmsActivatePriceInfo> {
    const mappedService = service ? this.mapService(service) : undefined;
    const data = await this.request<SmsActivatePriceInfo>(
      'getPrices',
      { service: mappedService, country },
      true,
    );
    return data;
  }

  /**
   * 获取服务和成本（带可用数量）
   * @param country 国家代码（可选）
   */
  async getServicesAndCost(country?: number): Promise<SmsActivatePriceInfo> {
    const data = await this.request<SmsActivatePriceInfo>(
      'getPricesVerification',
      { country },
      true,
    );
    return data;
  }

  // ============================================
  // 租赁号码 API
  // ============================================

  /**
   * 获取租赁支持的服务和国家
   * @param time 租赁时长（小时），如 4, 24, 48 等
   * @param operator 运营商代码（可选）
   * @param country 国家代码（可选）
   */
  async getRentServicesAndCountries(
    time?: number,
    operator?: string,
    country?: number,
  ): Promise<SmsActivateRentServicesAndCountries> {
    const data = await this.request<SmsActivateRentServicesAndCountries>(
      'getRentServicesAndCountries',
      { time, operator, country },
      true,
    );
    return data;
  }

  /**
   * 租赁号码
   * @param service 服务代码
   * @param country 国家代码
   * @param hours 租赁时长（小时）
   * @param options 可选参数
   */
  async rentNumber(
    service: string,
    country: string | number = 0,
    hours: number = 4,
    options?: {
      operator?: string;
      webhookUrl?: string;
    },
  ): Promise<GetNumberResult> {
    const countryCode = typeof country === 'string' ? parseInt(country, 10) || 0 : country;
    const mappedService = this.mapService(service);

    const data = await this.request<{ phone: SmsActivateRentNumber }>(
      'getRentNumber',
      {
        service: mappedService,
        country: countryCode,
        rent_time: hours,
        operator: options?.operator,
        url: options?.webhookUrl,
      },
      true,
    );

    if (data && data.phone) {
      return {
        activationId: String(data.phone.id),
        phoneNumber: `+${data.phone.phone}`,
        cost: await this.getRentPrice(mappedService, countryCode, hours),
        raw: data,
      };
    }

    throw new ProviderError(
      `Unexpected rent response: ${JSON.stringify(data)}`,
      this.providerName,
      'RENT_FAILED',
      false,
    );
  }

  /**
   * 获取租赁号码状态和短信
   * @param rentId 租赁ID
   */
  async getRentStatus(rentId: string): Promise<SmsActivateRentStatus> {
    const data = await this.request<SmsActivateRentStatus>(
      'getRentStatus',
      { id: rentId },
      true,
    );
    return data;
  }

  /**
   * 设置租赁状态
   * @param rentId 租赁ID
   * @param status 状态码：1=完成，2=取消
   */
  async setRentStatus(rentId: string, status: 1 | 2): Promise<string> {
    const data = await this.request<{ status: string }>(
      'setRentStatus',
      { id: rentId, status },
      true,
    );
    return data.status;
  }

  /**
   * 完成租赁
   */
  async finishRent(rentId: string): Promise<void> {
    await this.setRentStatus(rentId, 1);
  }

  /**
   * 取消租赁
   */
  async cancelRent(rentId: string): Promise<void> {
    await this.setRentStatus(rentId, 2);
  }

  /**
   * 获取租赁列表
   */
  async getRentList(): Promise<SmsActivateRentItem[]> {
    try {
      const data = await this.request<{ values: SmsActivateRentItem[] }>(
        'getRentList',
        {},
        true,
      );

      if (data && data.values) {
        this.logger.log(`Retrieved ${data.values.length} rent items`);
        return data.values;
      }

      return [];
    } catch (error) {
      if (error instanceof ProviderError && error.code === 'NO_NUMBERS') {
        return [];
      }
      throw error;
    }
  }

  /**
   * 获取租赁价格（估算）
   */
  private async getRentPrice(service: string, country: number, hours: number): Promise<number> {
    try {
      // 尝试获取租赁信息，用于未来扩展精确价格计算
      await this.getRentServicesAndCountries(hours, undefined, country);
      // 根据服务和国家查找价格
      // 如果找不到，使用默认价格
      const singlePrice = await this.getServicePrice(service, country);
      // 租赁价格通常是小时数 * 基础价格的一定比例
      return singlePrice * Math.ceil(hours / 4);
    } catch {
      return 0.50; // 默认租赁价格
    }
  }

  // ============================================
  // 其他 API
  // ============================================

  /**
   * 获取 QIWI 充值信息
   */
  async getQiwiRequisites(): Promise<{ wallet: string; comment: string }> {
    const data = await this.request<{ wallet: string; comment: string }>(
      'getQiwiRequisites',
      {},
      true,
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
      this.logger.error(`SMS-Activate health check failed: ${error.message}`);
      return false;
    }
  }

  // ============================================
  // 便捷方法
  // ============================================

  /**
   * 获取所有支持的服务代码映射
   */
  getServiceMapping(): Record<string, string> {
    return { ...this.serviceMapping };
  }

  /**
   * 等待短信（轮询）
   * @param activationId 激活ID
   * @param maxWaitSeconds 最大等待秒数
   * @param pollIntervalMs 轮询间隔毫秒
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

      // 等待后继续轮询
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return { status: 'expired', code: null, message: 'Wait timeout' };
  }

  /**
   * 等待租赁短信（轮询）
   * @param rentId 租赁ID
   * @param maxWaitSeconds 最大等待秒数
   * @param pollIntervalMs 轮询间隔毫秒
   */
  async waitForRentSms(
    rentId: string,
    maxWaitSeconds: number = 120,
    pollIntervalMs: number = 5000,
  ): Promise<SmsActivateRentSms[]> {
    const startTime = Date.now();
    const maxWaitMs = maxWaitSeconds * 1000;
    let lastCount = 0;

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getRentStatus(rentId);

      if (status.values && status.values.length > lastCount) {
        // 有新短信
        return status.values.slice(lastCount);
      }

      lastCount = status.values?.length || 0;

      // 等待后继续轮询
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return [];
  }
}
