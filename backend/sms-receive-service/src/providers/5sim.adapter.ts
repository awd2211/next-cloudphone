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
 * 5sim API响应接口
 */
interface FiveSimOrder {
  id: number;
  phone: string;
  operator: string;
  product: string;
  price: number;
  status: string; // PENDING, RECEIVED, TIMEOUT, CANCELED
  sms?: {
    code: string;
    text: string;
    date: string;
  }[];
  created_at: string;
  expires: string;
}

interface FiveSimProfile {
  email: string;
  balance: number;
  rating: number;
}

/**
 * 5sim SMS平台适配器
 *
 * API文档: https://5sim.net/docs
 *
 * 特点:
 * - JSON API（更易解析）
 * - 支持多运营商选择
 * - 价格透明（按国家/运营商）
 * - 支持虚拟号码和租用
 *
 * 认证: Bearer Token in Authorization header
 * Base URL: https://5sim.net/v1
 */
@Injectable()
export class FiveSimAdapter implements ISmsProvider {
  readonly providerName = '5sim';
  private readonly logger = new Logger(FiveSimAdapter.name);
  private readonly baseUrl = 'https://5sim.net/v1';
  private readonly apiKey: string;

  // 服务代码映射: 我们的代码 -> 5sim代码
  private readonly serviceMapping: Record<string, string> = {
    telegram: 'telegram',
    whatsapp: 'whatsapp',
    google: 'google',
    facebook: 'facebook',
    instagram: 'instagram',
    twitter: 'twitter',
    microsoft: 'microsoft',
    amazon: 'amazon',
    tiktok: 'tiktok',
    uber: 'uber',
    wechat: 'wechat',
  };

  // 国家代码映射: 2位ISO代码 -> 5sim国家名称
  private readonly countryMapping: Record<string, string> = {
    RU: 'russia',
    UA: 'ukraine',
    CN: 'china',
    IN: 'india',
    US: 'usa',
    GB: 'united kingdom',
    UK: 'united kingdom',
    DE: 'germany',
    FR: 'france',
    PH: 'philippines',
    ID: 'indonesia',
    VN: 'vietnam',
    MY: 'malaysia',
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('FIVESIM_API_TOKEN') || '';
    if (!this.apiKey) {
      this.logger.warn('5sim API token not configured');
    }
  }

  /**
   * 获取请求headers
   */
  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
    };
  }

  /**
   * 获取虚拟号码
   * @param service 服务代码
   * @param country 国家代码（2位ISO或国家名称）
   */
  async getNumber(service: string, country: number | string = 'russia'): Promise<GetNumberResult> {
    try {
      // 转换服务代码
      const product = this.serviceMapping[service.toLowerCase()] || service;

      // 转换国家代码
      let countryName: string;
      if (typeof country === 'number') {
        // 如果是数字，使用默认russia（5sim主要国家）
        countryName = 'russia';
      } else {
        countryName = this.countryMapping[country.toUpperCase()] || country.toLowerCase();
      }

      // 使用any运营商（让5sim自动选择最优）
      const operator = 'any';

      this.logger.log(`Purchasing number from 5sim: ${countryName}/${operator}/${product}`);

      // 购买号码
      const url = `${this.baseUrl}/user/buy/activation/${countryName}/${operator}/${product}`;
      const response = await firstValueFrom(
        this.httpService.get<FiveSimOrder>(url, {
          headers: this.getHeaders(),
          timeout: 10000,
        }),
      );

      const order = response.data;

      this.logger.log(`5sim order created: ID=${order.id}, Phone=${order.phone}`);

      return {
        activationId: order.id.toString(),
        phoneNumber: order.phone,
        country: countryName,
        cost: order.price,
        raw: order,
      };
    } catch (error) {
      this.logger.error(`Failed to get number from 5sim: ${error.message}`, error.stack);

      // 解析错误
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 400) {
          throw new ProviderError(
            `Invalid request: ${JSON.stringify(data)}`,
            this.providerName,
            'INVALID_REQUEST',
            false,
          );
        } else if (status === 401) {
          throw new ProviderError(
            'Invalid API token',
            this.providerName,
            'INVALID_TOKEN',
            false,
          );
        } else if (status === 404) {
          throw new ProviderError(
            'No numbers available for this service/country',
            this.providerName,
            'NO_NUMBERS',
            true, // 可重试
          );
        } else if (status === 402) {
          throw new ProviderError(
            'Insufficient balance',
            this.providerName,
            'LOW_BALANCE',
            false,
          );
        }
      }

      throw new ProviderError(
        error.message || 'Unknown error',
        this.providerName,
        'UNKNOWN',
        true,
      );
    }
  }

  /**
   * 检查短信状态
   * @param activationId 订单ID
   */
  async getStatus(activationId: string): Promise<SmsStatus> {
    try {
      const url = `${this.baseUrl}/user/check/${activationId}`;
      const response = await firstValueFrom(
        this.httpService.get<FiveSimOrder>(url, {
          headers: this.getHeaders(),
          timeout: 5000,
        }),
      );

      const order = response.data;

      // 状态映射
      switch (order.status) {
        case 'PENDING':
          return {
            status: 'waiting',
            code: null,
            message: 'Waiting for SMS',
          };

        case 'RECEIVED':
          // 提取验证码
          const code = order.sms?.[0]?.code || null;
          const message = order.sms?.[0]?.text || '';

          return {
            status: 'received',
            code,
            message,
            timestamp: order.sms?.[0]?.date ? new Date(order.sms[0].date) : undefined,
          };

        case 'TIMEOUT':
        case 'FINISHED':
          return {
            status: 'expired',
            code: null,
            message: 'Order expired',
          };

        case 'CANCELED':
          return {
            status: 'cancelled',
            code: null,
            message: 'Order cancelled',
          };

        default:
          return {
            status: 'unknown',
            code: null,
            message: `Unknown status: ${order.status}`,
          };
      }
    } catch (error) {
      this.logger.error(`Failed to get status from 5sim: ${error.message}`);
      throw new ProviderError(
        error.message || 'Failed to check status',
        this.providerName,
        'STATUS_CHECK_FAILED',
        true,
      );
    }
  }

  /**
   * 取消号码（退款）
   * @param activationId 订单ID
   */
  async cancel(activationId: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/user/cancel/${activationId}`;
      await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          timeout: 5000,
        }),
      );

      this.logger.log(`5sim order cancelled: ${activationId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel 5sim order: ${error.message}`);
      throw new ProviderError(
        error.message || 'Failed to cancel',
        this.providerName,
        'CANCEL_FAILED',
        true,
      );
    }
  }

  /**
   * 设置号码状态
   * @param activationId 订单ID
   * @param status 状态（1=完成接收短信, -1=取消）
   */
  async setStatus(activationId: string, status: number): Promise<void> {
    try {
      if (status === 1) {
        // 标记为完成
        const url = `${this.baseUrl}/user/finish/${activationId}`;
        await firstValueFrom(
          this.httpService.get(url, {
            headers: this.getHeaders(),
            timeout: 5000,
          }),
        );
        this.logger.log(`5sim order finished: ${activationId}`);
      } else if (status === -1) {
        // 取消
        await this.cancel(activationId);
      }
    } catch (error) {
      this.logger.error(`Failed to set status on 5sim: ${error.message}`);
      throw new ProviderError(
        error.message || 'Failed to set status',
        this.providerName,
        'SET_STATUS_FAILED',
        true,
      );
    }
  }

  /**
   * 获取账户余额
   */
  async getBalance(): Promise<ProviderBalance> {
    try {
      const url = `${this.baseUrl}/user/profile`;
      const response = await firstValueFrom(
        this.httpService.get<FiveSimProfile>(url, {
          headers: this.getHeaders(),
          timeout: 5000,
        }),
      );

      return {
        balance: response.data.balance,
        currency: 'RUB', // 5sim使用卢布
      };
    } catch (error) {
      this.logger.error(`Failed to get balance from 5sim: ${error.message}`);
      throw new ProviderError(
        error.message || 'Failed to get balance',
        this.providerName,
        'BALANCE_CHECK_FAILED',
        true,
      );
    }
  }

  /**
   * 租用号码（5sim不支持标准租用，但可以使用hosting服务）
   * 暂不实现，返回错误
   */
  async rentNumber(
    service: string,
    country: number | string,
    hours: number,
  ): Promise<GetNumberResult> {
    throw new ProviderError(
      '5sim does not support rental service in this adapter',
      this.providerName,
      'NOT_SUPPORTED',
      false,
    );
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      // 尝试获取余额
      await this.getBalance();
      return true;
    } catch (error) {
      this.logger.error(`5sim health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取可用的服务和价格（5sim特有功能）
   */
  async getAvailableServices(country: string = 'russia'): Promise<any> {
    try {
      const countryName = this.countryMapping[country.toUpperCase()] || country;
      const url = `${this.baseUrl}/guest/products/${countryName}/any`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { Accept: 'application/json' },
          timeout: 5000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get available services: ${error.message}`);
      return null;
    }
  }
}
