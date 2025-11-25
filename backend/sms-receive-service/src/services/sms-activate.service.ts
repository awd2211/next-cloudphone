import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SmsActivateAdapter,
  SmsActivateCountry,
  SmsActivateNumbersStatus,
  SmsActivatePriceInfo,
  SmsActivateRentStatus,
  SmsActivateRentItem,
  SmsActivateRentServicesAndCountries,
  SmsActivateCurrentActivation,
  SmsActivateBalanceAndCashBack,
  SmsActivateMultiServiceResult,
  SmsActivateTopCountry,
} from '../providers/sms-activate.adapter';
import { ProviderConfig } from '../entities/provider-config.entity';
import { GetNumberResult, SmsStatus, ProviderBalance } from '../providers/provider.interface';

/**
 * SMS-Activate 高级功能服务
 *
 * 提供 SMS-Activate 特有的高级功能封装：
 * - 国家和运营商查询
 * - 价格查询
 * - 当前激活管理
 * - 租赁号码管理
 * - 多服务号码
 */
@Injectable()
export class SmsActivateService implements OnModuleInit {
  private readonly logger = new Logger(SmsActivateService.name);
  private adapter: SmsActivateAdapter | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(ProviderConfig)
    private readonly providerConfigRepo: Repository<ProviderConfig>,
  ) {}

  async onModuleInit() {
    await this.initializeAdapter();
  }

  /**
   * 初始化适配器
   */
  private async initializeAdapter(): Promise<void> {
    try {
      // 尝试从数据库获取配置
      const config = await this.providerConfigRepo.findOne({
        where: { provider: 'sms-activate', enabled: true },
      });

      if (config?.apiKey) {
        // 使用数据库配置创建适配器
        this.adapter = new SmsActivateAdapter(
          this.httpService,
          {
            get: (key: string) => {
              if (key === 'SMS_ACTIVATE_API_KEY') return config.apiKey;
              return this.configService.get(key);
            },
          } as ConfigService,
        );
        this.logger.log('SMS-Activate adapter initialized from database config');
      } else {
        // 使用环境变量配置
        this.adapter = new SmsActivateAdapter(this.httpService, this.configService);
        this.logger.log('SMS-Activate adapter initialized from environment config');
      }
    } catch (error) {
      this.logger.error('Failed to initialize SMS-Activate adapter', error.stack);
      // 回退到环境变量配置
      this.adapter = new SmsActivateAdapter(this.httpService, this.configService);
    }
  }

  /**
   * 获取适配器实例
   */
  private getAdapter(): SmsActivateAdapter {
    if (!this.adapter) {
      throw new Error('SMS-Activate adapter not initialized');
    }
    return this.adapter;
  }

  /**
   * 清除缓存（重新初始化适配器）
   */
  clearCache(): void {
    this.adapter = null;
    this.initializeAdapter();
  }

  // ============================================
  // 账户相关
  // ============================================

  /**
   * 获取余额
   */
  async getBalance(): Promise<ProviderBalance> {
    return this.getAdapter().getBalance();
  }

  /**
   * 获取余额和返现
   */
  async getBalanceAndCashBack(): Promise<SmsActivateBalanceAndCashBack> {
    return this.getAdapter().getBalanceAndCashBack();
  }

  // ============================================
  // 国家和运营商
  // ============================================

  /**
   * 获取所有国家列表
   */
  async getCountries(): Promise<SmsActivateCountry[]> {
    const data = await this.getAdapter().getCountries();
    return Object.values(data);
  }

  /**
   * 获取可用号码数量
   */
  async getNumbersStatus(country?: number, operator?: string): Promise<SmsActivateNumbersStatus> {
    return this.getAdapter().getNumbersStatus(country, operator);
  }

  /**
   * 获取热门国家（按服务）
   */
  async getTopCountriesByService(
    service: string,
    freePrice?: boolean,
  ): Promise<SmsActivateTopCountry[]> {
    const data = await this.getAdapter().getTopCountriesByService(service, freePrice);
    return Object.values(data);
  }

  // ============================================
  // 号码获取
  // ============================================

  /**
   * 获取虚拟号码
   */
  async getNumber(
    service: string,
    country: number = 0,
    options?: {
      operator?: string;
      forward?: boolean;
      phoneException?: string;
    },
  ): Promise<GetNumberResult> {
    return this.getAdapter().getNumber(service, country, options);
  }

  /**
   * 获取多服务号码
   */
  async getMultiServiceNumber(
    services: string[],
    country: number = 0,
    options?: {
      operator?: string;
      forward?: string[];
      phoneException?: string;
    },
  ): Promise<SmsActivateMultiServiceResult> {
    return this.getAdapter().getMultiServiceNumber(services, country, options);
  }

  /**
   * 获取额外服务
   */
  async getAdditionalService(service: string, parentActivationId: string): Promise<GetNumberResult> {
    return this.getAdapter().getAdditionalService(service, parentActivationId);
  }

  // ============================================
  // 激活状态管理
  // ============================================

  /**
   * 获取激活状态
   */
  async getStatus(activationId: string): Promise<SmsStatus> {
    return this.getAdapter().getStatus(activationId);
  }

  /**
   * 获取完整短信
   */
  async getFullSms(activationId: string): Promise<{ code: string | null; fullSms: string | null }> {
    return this.getAdapter().getFullSms(activationId);
  }

  /**
   * 设置激活状态
   */
  async setStatus(activationId: string, status: number): Promise<void> {
    return this.getAdapter().setStatus(activationId, status);
  }

  /**
   * 完成激活
   */
  async finish(activationId: string): Promise<void> {
    return this.getAdapter().finish(activationId);
  }

  /**
   * 取消激活
   */
  async cancel(activationId: string): Promise<void> {
    return this.getAdapter().cancel(activationId);
  }

  /**
   * 请求重发短信
   */
  async requestResend(activationId: string): Promise<void> {
    return this.getAdapter().requestResend(activationId);
  }

  /**
   * 获取当前激活列表
   */
  async getCurrentActivations(): Promise<SmsActivateCurrentActivation[]> {
    return this.getAdapter().getCurrentActivations();
  }

  // ============================================
  // 定价
  // ============================================

  /**
   * 获取价格
   */
  async getPrices(service?: string, country?: number): Promise<SmsActivatePriceInfo> {
    return this.getAdapter().getPrices(service, country);
  }

  /**
   * 获取服务和成本
   */
  async getServicesAndCost(country?: number): Promise<SmsActivatePriceInfo> {
    return this.getAdapter().getServicesAndCost(country);
  }

  // ============================================
  // 租赁管理
  // ============================================

  /**
   * 获取租赁支持的服务和国家
   */
  async getRentServicesAndCountries(
    time?: number,
    operator?: string,
    country?: number,
  ): Promise<SmsActivateRentServicesAndCountries> {
    return this.getAdapter().getRentServicesAndCountries(time, operator, country);
  }

  /**
   * 租赁号码
   */
  async rentNumber(
    service: string,
    country: number = 0,
    hours: number = 4,
    options?: {
      operator?: string;
      webhookUrl?: string;
    },
  ): Promise<GetNumberResult> {
    return this.getAdapter().rentNumber(service, country, hours, options);
  }

  /**
   * 获取租赁状态
   */
  async getRentStatus(rentId: string): Promise<SmsActivateRentStatus> {
    return this.getAdapter().getRentStatus(rentId);
  }

  /**
   * 设置租赁状态
   */
  async setRentStatus(rentId: string, status: 1 | 2): Promise<string> {
    return this.getAdapter().setRentStatus(rentId, status);
  }

  /**
   * 完成租赁
   */
  async finishRent(rentId: string): Promise<void> {
    return this.getAdapter().finishRent(rentId);
  }

  /**
   * 取消租赁
   */
  async cancelRent(rentId: string): Promise<void> {
    return this.getAdapter().cancelRent(rentId);
  }

  /**
   * 获取租赁列表
   */
  async getRentList(): Promise<SmsActivateRentItem[]> {
    return this.getAdapter().getRentList();
  }

  // ============================================
  // 其他
  // ============================================

  /**
   * 获取 QIWI 充值信息
   */
  async getQiwiRequisites(): Promise<{ wallet: string; comment: string }> {
    return this.getAdapter().getQiwiRequisites();
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    return this.getAdapter().healthCheck();
  }

  /**
   * 获取服务代码映射
   */
  getServiceMapping(): Record<string, string> {
    return this.getAdapter().getServiceMapping();
  }

  /**
   * 等待短信
   */
  async waitForSms(
    activationId: string,
    maxWaitSeconds?: number,
    pollIntervalMs?: number,
  ): Promise<SmsStatus> {
    return this.getAdapter().waitForSms(activationId, maxWaitSeconds, pollIntervalMs);
  }
}
