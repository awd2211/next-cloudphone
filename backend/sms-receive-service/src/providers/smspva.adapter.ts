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
 * SMSPVA API 响应接口
 */
export interface SmspvaUserInfo {
  response: string;
  user_id: number;
  username: string;
  balance: string;
  karma: string;
  group: string;
}

export interface SmspvaCountInfo {
  response: string;
  service_id: number;
  service_name: string;
  total: number;
  price: string;
}

export interface SmspvaNumberResult {
  response: string;
  id: number;
  country_code: string;
  number: string;
}

export interface SmspvaSmsResult {
  response: string;
  sms: string;
  number: string;
  from: string;
  text: string;
}

export interface SmspvaService {
  id: number;
  name: string;
  price: number;
}

export interface SmspvaCountry {
  id: number;
  name: string;
  code: string;
}

/**
 * SMSPVA SMS平台适配器
 *
 * API文档: https://beta.smspva.com/docs
 *
 * 特点:
 * - JSON API 响应
 * - 价格便宜 ($0.20起)
 * - 支持多国家
 * - Karma 系统（信用评分）
 *
 * 认证: API Key 作为请求参数
 * Base URL: https://beta.smspva.com/api/
 */
@Injectable()
export class SmspvaAdapter implements ISmsProvider {
  readonly providerName = 'smspva';
  private readonly logger = new Logger(SmspvaAdapter.name);
  private readonly baseUrl = 'https://beta.smspva.com/api/';
  private readonly apiKey: string;

  // 服务ID映射: 我们的代码 -> SMSPVA服务ID
  // 注: 实际ID需要从API获取，这里是常见服务的映射
  private readonly serviceMapping: Record<string, number> = {
    telegram: 1,
    whatsapp: 2,
    google: 3,
    facebook: 4,
    instagram: 5,
    twitter: 6,
    viber: 7,
    wechat: 8,
    microsoft: 9,
    amazon: 10,
    tiktok: 11,
    uber: 12,
    discord: 13,
    snapchat: 14,
    yahoo: 15,
    steam: 16,
    linkedin: 17,
    paypal: 18,
    netflix: 19,
    apple: 20,
  };

  // 国家ID映射
  private readonly countryMapping: Record<string, number> = {
    RU: 1, // 俄罗斯
    UA: 2, // 乌克兰
    US: 3, // 美国
    GB: 4, // 英国
    UK: 4,
    CN: 5, // 中国
    IN: 6, // 印度
    ID: 7, // 印尼
    PH: 8, // 菲律宾
    MY: 9, // 马来西亚
    VN: 10, // 越南
    DE: 11, // 德国
    FR: 12, // 法国
    BR: 13, // 巴西
    KR: 14, // 韩国
    JP: 15, // 日本
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('SMSPVA_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('SMSPVA API key not configured');
    }
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    action: string,
    params: Record<string, any> = {},
  ): Promise<T> {
    const queryParams: Record<string, any> = {
      action,
      apikey: this.apiKey,
    };

    // 合并参数
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
      if (data && data.response && data.response !== '1') {
        const errorCode = data.response;
        const errorMessages: Record<string, string> = {
          '2': 'Invalid API key',
          '3': 'No numbers available',
          '4': 'Insufficient balance',
          '5': 'Invalid parameters',
          '6': 'Number not found',
          '7': 'Operation failed',
        };

        throw new ProviderError(
          errorMessages[errorCode] || `API error: ${errorCode}`,
          this.providerName,
          errorCode,
          ['3', '4'].includes(errorCode),
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      this.logger.error(`SMSPVA API error [${action}]: ${error.message}`, error.stack);
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
  private mapService(service: string): number {
    const mapped = this.serviceMapping[service.toLowerCase()];
    if (mapped !== undefined) {
      return mapped;
    }
    // 尝试解析为数字
    const parsed = parseInt(service, 10);
    return isNaN(parsed) ? 1 : parsed;
  }

  /**
   * 转换国家代码
   */
  private mapCountry(country: number | string): number {
    if (typeof country === 'number') {
      return country;
    }
    return this.countryMapping[country.toUpperCase()] ?? 1;
  }

  /**
   * 获取用户信息（包含余额）
   */
  async getUserInfo(): Promise<SmspvaUserInfo> {
    return await this.request<SmspvaUserInfo>('getuserinfo');
  }

  /**
   * 获取余额
   */
  async getBalance(): Promise<ProviderBalance> {
    const userInfo = await this.getUserInfo();
    return {
      balance: parseFloat(userInfo.balance),
      currency: 'USD',
    };
  }

  /**
   * 获取可用号码数量
   */
  async getCount(serviceId: number, countryId: number): Promise<SmspvaCountInfo> {
    return await this.request<SmspvaCountInfo>('getcount', {
      serviceid: serviceId,
      countryid: countryId,
    });
  }

  /**
   * 获取虚拟号码
   */
  async getNumber(
    service: string,
    country: string | number = 1,
  ): Promise<GetNumberResult> {
    const serviceId = this.mapService(service);
    const countryId = this.mapCountry(country);

    const data = await this.request<SmspvaNumberResult>('getnumber', {
      serviceid: serviceId,
      countryid: countryId,
    });

    if (data.response !== '1' || !data.number) {
      throw new ProviderError(
        'Failed to get number',
        this.providerName,
        'GET_NUMBER_FAILED',
        true,
      );
    }

    // 获取价格信息
    let cost = 0.20;
    try {
      const countInfo = await this.getCount(serviceId, countryId);
      cost = parseFloat(countInfo.price);
    } catch {
      // 使用默认价格
    }

    return {
      activationId: data.id.toString(),
      phoneNumber: data.country_code + data.number,
      country: countryId.toString(),
      cost,
      raw: data,
    };
  }

  /**
   * 获取短信
   * @param numberId 订单ID
   * @param notClose 是否保持订单打开以接收更多短信
   */
  async getSms(numberId: string, notClose: boolean = false): Promise<SmspvaSmsResult> {
    return await this.request<SmspvaSmsResult>('getsms', {
      numberid: numberId,
      notclose: notClose ? 1 : undefined,
    });
  }

  /**
   * 检查短信状态
   */
  async getStatus(activationId: string): Promise<SmsStatus> {
    try {
      const data = await this.getSms(activationId, true);

      if (data.response === '1' && data.sms) {
        return {
          status: 'received',
          code: data.sms,
          message: data.text,
        };
      }

      if (data.response === '2') {
        return {
          status: 'waiting',
          code: null,
          message: 'Waiting for SMS',
        };
      }

      if (data.response === '3') {
        return {
          status: 'expired',
          code: null,
          message: 'Number expired',
        };
      }

      return {
        status: 'unknown',
        code: null,
        message: `Unknown response: ${data.response}`,
      };
    } catch (error) {
      if (error instanceof ProviderError && error.code === '6') {
        return {
          status: 'cancelled',
          code: null,
          message: 'Number not found or cancelled',
        };
      }
      throw error;
    }
  }

  /**
   * 拒绝/取消号码
   */
  async denyNumber(numberId: string): Promise<void> {
    await this.request('setnumberdenial', { numberid: numberId });
    this.logger.log(`Number denied: ${numberId}`);
  }

  /**
   * 取消激活
   */
  async cancel(activationId: string): Promise<void> {
    await this.denyNumber(activationId);
  }

  /**
   * 设置号码状态
   */
  async setStatus(activationId: string, status: number): Promise<void> {
    if (status === 8) {
      await this.denyNumber(activationId);
    } else if (status === 6) {
      await this.closeNumber(activationId);
    }
  }

  /**
   * 关闭订单（完成）
   */
  async closeNumber(numberId: string): Promise<void> {
    await this.request('setnumberclose', { numberid: numberId });
    this.logger.log(`Number closed: ${numberId}`);
  }

  /**
   * 标记号码为禁用
   */
  async banNumber(numberId: string): Promise<void> {
    await this.request('setnumberban', { numberid: numberId });
    this.logger.log(`Number banned: ${numberId}`);
  }

  /**
   * 请求下一条短信
   */
  async searchNextSms(numberId: string): Promise<SmspvaSmsResult> {
    return await this.request<SmspvaSmsResult>('setsearchsms', {
      numberid: numberId,
    });
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getUserInfo();
      return true;
    } catch (error) {
      this.logger.error(`SMSPVA health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取服务代码映射
   */
  getServiceMapping(): Record<string, number> {
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
