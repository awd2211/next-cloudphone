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

@Injectable()
export class SmsActivateAdapter implements ISmsProvider {
  readonly providerName = 'sms-activate';
  private readonly logger = new Logger(SmsActivateAdapter.name);
  private readonly baseUrl = 'https://api.sms-activate.io/stubs/handler_api.php';
  private readonly apiKey: string;

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
   * 获取虚拟号码
   * @param service 服务代码 (go=Google, tg=Telegram等)
   * @param country 国家代码 (0=俄罗斯, 1=乌克兰, 12=美国等)
   */
  async getNumber(service: string, country: string | number = 0): Promise<GetNumberResult> {
    // 确保country是数字
    const countryCode = typeof country === 'string' ? 0 : country;
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl, {
          params: {
            api_key: this.apiKey,
            action: 'getNumber',
            service,
            country: countryCode,
          },
        }),
      );

      const data = response.data;

      // 响应格式: ACCESS_NUMBER:123456789:79123456789
      if (typeof data === 'string') {
        const parts = data.split(':');

        if (parts[0] !== 'ACCESS_NUMBER') {
          throw new Error(`Failed to get number: ${data}`);
        }

        // 获取价格
        const cost = await this.getServicePrice(service, countryCode);

        return {
          activationId: parts[1],
          phoneNumber: `+${parts[2]}`,
          cost,
          raw: data,
        };
      }

      throw new Error(`Unexpected response format: ${JSON.stringify(data)}`);
    } catch (error) {
      this.logger.error(`Failed to get number from SMS-Activate`, error.stack);
      throw error;
    }
  }

  /**
   * 检查短信状态
   */
  async getStatus(activationId: string): Promise<SmsStatus> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl, {
          params: {
            api_key: this.apiKey,
            action: 'getStatus',
            id: activationId,
          },
        }),
      );

      const data = response.data;

      // STATUS_WAIT_CODE - 等待验证码
      if (data === 'STATUS_WAIT_CODE') {
        return { status: 'waiting', code: null };
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

      return { status: 'unknown', code: null };
    } catch (error) {
      this.logger.error(`Failed to get status for activation ${activationId}`, error.stack);
      throw error;
    }
  }

  /**
   * 设置激活状态
   * @param activationId 激活ID
   * @param status 1=告知已发送短信, 3=请求新短信, 6=完成, 8=取消
   */
  async setStatus(activationId: string, status: number): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.get(this.baseUrl, {
          params: {
            api_key: this.apiKey,
            action: 'setStatus',
            status,
            id: activationId,
          },
        }),
      );

      this.logger.log(`Set status ${status} for activation ${activationId}`);
    } catch (error) {
      this.logger.error(`Failed to set status for activation ${activationId}`, error.stack);
      throw error;
    }
  }

  /**
   * 完成激活
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
   * 获取余额
   */
  async getBalance(): Promise<ProviderBalance> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl, {
          params: {
            api_key: this.apiKey,
            action: 'getBalance',
          },
        }),
      );

      const data = response.data;

      // 响应格式: ACCESS_BALANCE:123.45
      if (typeof data === 'string' && data.startsWith('ACCESS_BALANCE:')) {
        return {
          balance: parseFloat(data.split(':')[1]),
          currency: 'RUB', // SMS-Activate使用卢布
        };
      }

      throw new ProviderError(
        `Unexpected balance response: ${data}`,
        this.providerName,
        'BALANCE_FORMAT_ERROR',
        true,
      );
    } catch (error) {
      this.logger.error('Failed to get balance', error.stack);
      if (error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError(
        error.message || 'Failed to get balance',
        this.providerName,
        'BALANCE_CHECK_FAILED',
        true,
      );
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
      this.logger.error(`SMS-Activate health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取服务价格
   */
  async getServicePrice(service: string, country: number): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl, {
          params: {
            api_key: this.apiKey,
            action: 'getPrices',
            service,
            country,
          },
        }),
      );

      const data = response.data;

      // 响应格式: {country: {service: {cost: "1.50", count: 100}}}
      if (data && data[country] && data[country][service]) {
        return parseFloat(data[country][service].cost);
      }

      // 如果无法获取价格，返回默认值
      this.logger.warn(`Could not get price for ${service}/${country}, using default`);
      return 0.10; // 默认 $0.10
    } catch (error) {
      this.logger.error(`Failed to get price for ${service}/${country}`, error.stack);
      return 0.10; // 失败时返回默认值
    }
  }

  /**
   * 租赁号码（24小时）
   */
  async rentNumber(service: string, country: string | number = 0, hours: number = 24): Promise<GetNumberResult> {
    // SMS-Activate只支持固定租期，忽略hours参数
    const countryCode = typeof country === 'string' ? 0 : country;
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl, {
          params: {
            api_key: this.apiKey,
            action: 'getRentNumber',
            service,
            country: countryCode,
            rent_time: hours || 24, // 使用指定时长或默认24小时
          },
        }),
      );

      const data = response.data;

      if (typeof data === 'string') {
        const parts = data.split(':');

        if (parts[0] !== 'ACCESS_NUMBER') {
          throw new Error(`Failed to rent number: ${data}`);
        }

        return {
          activationId: parts[1],
          phoneNumber: `+${parts[2]}`,
          cost: await this.getRentPrice(service, countryCode),
          raw: data,
        };
      }

      throw new Error(`Unexpected response format: ${JSON.stringify(data)}`);
    } catch (error) {
      this.logger.error(`Failed to rent number from SMS-Activate`, error.stack);
      throw error;
    }
  }

  /**
   * 获取租赁价格
   */
  private async getRentPrice(service: string, country: number): Promise<number> {
    // 租赁价格通常是单次购买的2-3倍
    const singlePrice = await this.getServicePrice(service, country);
    return singlePrice * 2.5;
  }
}
