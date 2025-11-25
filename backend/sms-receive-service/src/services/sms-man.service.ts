import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ProviderConfig } from '../entities';
import { SmsManAdapter, SmsManCountry, SmsManService as SmsManServiceInfo, SmsManPriceInfo } from '../providers/sms-man.adapter';
import * as crypto from 'crypto';

/**
 * SMS-Man 服务层
 *
 * 功能：
 * - 封装 SMS-Man Adapter 的功能
 * - 提供余额、国家、服务列表查询
 * - 提供号码获取、状态查询等操作
 */
@Injectable()
export class SmsManService {
  private readonly logger = new Logger(SmsManService.name);
  private readonly encryptionKey: string;
  private adapter: SmsManAdapter | null = null;
  private lastInitTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存
  private currentApiKey: string | null = null;

  constructor(
    @InjectRepository(ProviderConfig)
    private readonly providerConfigRepo: Repository<ProviderConfig>,
    private readonly httpService: HttpService,
  ) {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  /**
   * 获取并初始化 SMS-Man Adapter
   */
  private async getAdapter(): Promise<SmsManAdapter> {
    // 从数据库获取 sms-man 配置
    const config = await this.providerConfigRepo.findOne({
      where: { provider: 'sms-man', enabled: true },
    });

    if (!config) {
      throw new NotFoundException('SMS-Man provider configuration not found or disabled');
    }

    // 解密 API 密钥
    const apiKey = this.decryptApiKey(config.apiKey);

    // 如果有缓存且 API 密钥未变化，直接返回
    const now = Date.now();
    if (
      this.adapter &&
      this.currentApiKey === apiKey &&
      now - this.lastInitTime < this.CACHE_TTL
    ) {
      return this.adapter;
    }

    // 创建一个简单的 mock ConfigService 来传递 API key
    const mockConfigService = {
      get: (key: string) => (key === 'SMS_MAN_API_KEY' ? apiKey : undefined),
    } as any;

    // 创建 adapter
    this.adapter = new SmsManAdapter(this.httpService, mockConfigService);

    this.currentApiKey = apiKey;
    this.lastInitTime = now;
    this.logger.log('SMS-Man Adapter initialized successfully');

    return this.adapter;
  }

  /**
   * 解密 API 密钥
   */
  private decryptApiKey(encrypted: string): string {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

      const parts = encrypted.split(':');
      if (parts.length !== 2) {
        // 如果不是加密格式，直接返回（兼容未加密的旧配置）
        return encrypted;
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encryptedData = parts[1];

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error(`Failed to decrypt API key: ${error.message}`);
      throw new BadRequestException('Failed to decrypt API key');
    }
  }

  /**
   * 获取余额
   */
  async getBalance() {
    const adapter = await this.getAdapter();
    const balance = await adapter.getBalance();
    this.logger.log(`SMS-Man balance: ${balance.balance} ${balance.currency}`);
    return balance;
  }

  /**
   * 获取号码
   */
  async getNumber(service: string, country: string | number = 0) {
    const adapter = await this.getAdapter();
    this.logger.log(`Getting SMS-Man number: service=${service}, country=${country}`);
    const result = await adapter.getNumber(service, country);
    this.logger.log(`Got SMS-Man number: ${result.phoneNumber} (ID: ${result.activationId})`);
    return result;
  }

  /**
   * 获取号码状态
   */
  async getStatus(activationId: string) {
    const adapter = await this.getAdapter();
    const status = await adapter.getStatus(activationId);
    this.logger.log(`SMS-Man status for ${activationId}: ${status.status}`);
    return status;
  }

  /**
   * 设置状态
   */
  async setStatus(activationId: string, status: number) {
    const adapter = await this.getAdapter();
    await adapter.setStatus(activationId, status);
    this.logger.log(`SMS-Man set status for ${activationId}: ${status}`);
  }

  /**
   * 取消号码
   */
  async cancel(activationId: string) {
    const adapter = await this.getAdapter();
    await adapter.cancel(activationId);
    this.logger.log(`SMS-Man cancelled activation: ${activationId}`);
  }

  /**
   * 完成激活
   */
  async finish(activationId: string) {
    const adapter = await this.getAdapter();
    await adapter.finish(activationId);
    this.logger.log(`SMS-Man finished activation: ${activationId}`);
  }

  /**
   * 获取价格
   */
  async getPrices(service?: string, country?: number): Promise<SmsManPriceInfo> {
    const adapter = await this.getAdapter();
    const prices = await adapter.getPrices(service, country);
    this.logger.log(`Retrieved SMS-Man prices`);
    return prices;
  }

  /**
   * 获取国家列表
   */
  async getCountries(): Promise<SmsManCountry[]> {
    const adapter = await this.getAdapter();
    const countries = await adapter.getCountries();
    this.logger.log(`Retrieved ${countries.length} countries from SMS-Man`);
    return countries;
  }

  /**
   * 获取服务列表
   */
  async getServices(): Promise<SmsManServiceInfo[]> {
    const adapter = await this.getAdapter();
    const services = await adapter.getServices();
    this.logger.log(`Retrieved ${services.length} services from SMS-Man`);
    return services;
  }

  /**
   * 获取可用号码数量
   */
  async getNumbersStatus(country?: number): Promise<Record<string, number>> {
    const adapter = await this.getAdapter();
    const status = await adapter.getNumbersStatus(country);
    this.logger.log(`Retrieved SMS-Man numbers status`);
    return status;
  }

  /**
   * 等待短信
   */
  async waitForSms(activationId: string, maxWaitSeconds: number = 120, pollIntervalMs: number = 5000) {
    const adapter = await this.getAdapter();
    this.logger.log(`Waiting for SMS on activation: ${activationId}`);
    return await adapter.waitForSms(activationId, maxWaitSeconds, pollIntervalMs);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    const adapter = await this.getAdapter();
    return await adapter.healthCheck();
  }

  /**
   * 获取服务代码映射
   */
  async getServiceMapping(): Promise<Record<string, string>> {
    const adapter = await this.getAdapter();
    return adapter.getServiceMapping();
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.adapter = null;
    this.lastInitTime = 0;
    this.currentApiKey = null;
    this.logger.log('SMS-Man Adapter cache cleared');
  }
}
