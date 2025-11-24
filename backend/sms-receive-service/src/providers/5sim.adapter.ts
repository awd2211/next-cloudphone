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

interface FiveSimPayment {
  id: number;
  type: string;
  provider: string;
  amount: number;
  balance: number;
  created_at: string;
}

interface FiveSimSmsMessage {
  id: number;
  created_at: string;
  date: string;
  sender: string;
  text: string;
  code: string;
}

interface FiveSimCountry {
  name: string;
  iso: string;
  prefix: string;
}

interface FiveSimOperator {
  name: string;
  prices: Record<string, number>;
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
   * 租用号码（使用 hosting 服务）
   * @param service 服务代码
   * @param country 国家代码
   * @param hours 租用小时数（默认24小时）
   */
  async rentNumber(
    service: string,
    country: number | string,
    hours: number = 24,
  ): Promise<GetNumberResult> {
    try {
      // 转换服务代码
      const product = this.serviceMapping[service.toLowerCase()] || service;

      // 转换国家代码
      let countryName: string;
      if (typeof country === 'number') {
        countryName = 'russia';
      } else {
        countryName = this.countryMapping[country.toUpperCase()] || country.toLowerCase();
      }

      const operator = 'any';

      this.logger.log(`Renting number from 5sim: ${countryName}/${operator}/${product} for ${hours}h`);

      // 购买租用号码
      const url = `${this.baseUrl}/user/buy/hosting/${countryName}/${operator}/${product}`;
      const response = await firstValueFrom(
        this.httpService.get<FiveSimOrder>(url, {
          headers: this.getHeaders(),
          params: { hours },
          timeout: 10000,
        }),
      );

      const order = response.data;

      this.logger.log(`5sim hosting order created: ID=${order.id}, Phone=${order.phone}, Hours=${hours}`);

      return {
        activationId: order.id.toString(),
        phoneNumber: order.phone,
        country: countryName,
        cost: order.price,
        raw: order,
      };
    } catch (error) {
      this.logger.error(`Failed to rent number from 5sim: ${error.message}`, error.stack);

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
        } else if (status === 404) {
          throw new ProviderError(
            'No numbers available for hosting',
            this.providerName,
            'NO_NUMBERS',
            true,
          );
        } else if (status === 402) {
          throw new ProviderError(
            'Insufficient balance for hosting',
            this.providerName,
            'LOW_BALANCE',
            false,
          );
        }
      }

      throw new ProviderError(
        error.message || 'Unknown error',
        this.providerName,
        'RENT_FAILED',
        true,
      );
    }
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

  /**
   * 获取订单历史
   * @param category 订单类别 (activation/hosting)
   * @param limit 返回数量限制
   * @param offset 分页偏移
   * @param order 排序字段
   * @param reverse 是否倒序
   */
  async getOrders(params?: {
    category?: 'activation' | 'hosting';
    limit?: number;
    offset?: number;
    order?: 'id' | 'date';
    reverse?: boolean;
  }): Promise<FiveSimOrder[]> {
    try {
      const url = `${this.baseUrl}/user/orders`;
      const response = await firstValueFrom(
        this.httpService.get<{ Data: FiveSimOrder[] }>(url, {
          headers: this.getHeaders(),
          params: params || {},
          timeout: 10000,
        }),
      );

      this.logger.log(`Retrieved ${response.data.Data?.length || 0} orders from 5sim`);
      return response.data.Data || [];
    } catch (error) {
      this.logger.error(`Failed to get orders: ${error.message}`);
      throw new ProviderError(
        error.message || 'Failed to get orders',
        this.providerName,
        'GET_ORDERS_FAILED',
        true,
      );
    }
  }

  /**
   * 获取支付历史
   * @param limit 返回数量限制
   * @param offset 分页偏移
   */
  async getPayments(limit: number = 100, offset: number = 0): Promise<FiveSimPayment[]> {
    try {
      const url = `${this.baseUrl}/user/payments`;
      const response = await firstValueFrom(
        this.httpService.get<{ Data: FiveSimPayment[] }>(url, {
          headers: this.getHeaders(),
          params: { limit, offset },
          timeout: 10000,
        }),
      );

      this.logger.log(`Retrieved ${response.data.Data?.length || 0} payments from 5sim`);
      return response.data.Data || [];
    } catch (error) {
      this.logger.error(`Failed to get payments: ${error.message}`);
      throw new ProviderError(
        error.message || 'Failed to get payments',
        this.providerName,
        'GET_PAYMENTS_FAILED',
        true,
      );
    }
  }

  /**
   * 获取短信收件箱（仅适用于租用号码）
   * @param activationId 订单ID
   */
  async getSmsInbox(activationId: string): Promise<FiveSimSmsMessage[]> {
    try {
      const url = `${this.baseUrl}/user/sms/inbox/${activationId}`;
      const response = await firstValueFrom(
        this.httpService.get<{ Data: FiveSimSmsMessage[] }>(url, {
          headers: this.getHeaders(),
          timeout: 5000,
        }),
      );

      this.logger.log(`Retrieved ${response.data.Data?.length || 0} SMS messages for order ${activationId}`);
      return response.data.Data || [];
    } catch (error) {
      this.logger.error(`Failed to get SMS inbox: ${error.message}`);
      throw new ProviderError(
        error.message || 'Failed to get SMS inbox',
        this.providerName,
        'GET_INBOX_FAILED',
        true,
      );
    }
  }

  /**
   * 获取价格上限列表
   */
  async getMaxPrices(): Promise<any> {
    try {
      const url = `${this.baseUrl}/user/max-prices`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          timeout: 5000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get max prices: ${error.message}`);
      throw new ProviderError(
        error.message || 'Failed to get max prices',
        this.providerName,
        'GET_MAX_PRICES_FAILED',
        true,
      );
    }
  }

  /**
   * 获取支持的国家列表
   */
  async getCountries(): Promise<FiveSimCountry[]> {
    try {
      const url = `${this.baseUrl}/guest/countries`;
      const response = await firstValueFrom(
        this.httpService.get<Record<string, FiveSimCountry>>(url, {
          headers: { Accept: 'application/json' },
          timeout: 5000,
        }),
      );

      // 转换对象为数组
      const countries = Object.values(response.data);
      this.logger.log(`Retrieved ${countries.length} countries from 5sim`);
      return countries;
    } catch (error) {
      this.logger.error(`Failed to get countries: ${error.message}`);
      throw new ProviderError(
        error.message || 'Failed to get countries',
        this.providerName,
        'GET_COUNTRIES_FAILED',
        true,
      );
    }
  }

  /**
   * 获取指定国家的运营商列表
   * @param country 国家代码或名称
   */
  async getOperators(country: string): Promise<Record<string, FiveSimOperator>> {
    try {
      const countryName = this.countryMapping[country.toUpperCase()] || country.toLowerCase();
      const url = `${this.baseUrl}/guest/operators/${countryName}`;

      const response = await firstValueFrom(
        this.httpService.get<Record<string, FiveSimOperator>>(url, {
          headers: { Accept: 'application/json' },
          timeout: 5000,
        }),
      );

      this.logger.log(`Retrieved operators for ${countryName}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get operators: ${error.message}`);
      throw new ProviderError(
        error.message || 'Failed to get operators',
        this.providerName,
        'GET_OPERATORS_FAILED',
        true,
      );
    }
  }

  /**
   * 标记号码为不可用（禁用）
   * @param activationId 订单ID
   */
  async banNumber(activationId: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/user/ban/${activationId}`;
      await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          timeout: 5000,
        }),
      );

      this.logger.log(`Number banned: ${activationId}`);
    } catch (error) {
      this.logger.error(`Failed to ban number: ${error.message}`);
      throw new ProviderError(
        error.message || 'Failed to ban number',
        this.providerName,
        'BAN_NUMBER_FAILED',
        true,
      );
    }
  }

  /**
   * 重新使用指定号码
   * @param product 服务代码
   * @param phoneNumber 电话号码
   */
  async reuseNumber(product: string, phoneNumber: string): Promise<GetNumberResult> {
    try {
      const url = `${this.baseUrl}/user/reuse/${product}/${phoneNumber}`;
      const response = await firstValueFrom(
        this.httpService.get<FiveSimOrder>(url, {
          headers: this.getHeaders(),
          timeout: 10000,
        }),
      );

      const order = response.data;

      this.logger.log(`Number reused: ID=${order.id}, Phone=${order.phone}`);

      return {
        activationId: order.id.toString(),
        phoneNumber: order.phone,
        cost: order.price,
        raw: order,
      };
    } catch (error) {
      this.logger.error(`Failed to reuse number: ${error.message}`);
      throw new ProviderError(
        error.message || 'Failed to reuse number',
        this.providerName,
        'REUSE_NUMBER_FAILED',
        true,
      );
    }
  }
}
