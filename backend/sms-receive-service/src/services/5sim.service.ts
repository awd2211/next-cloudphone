import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ProviderConfig } from '../entities';
import { FiveSimAdapter, FiveSimOrder, FiveSimPayment, FiveSimSmsMessage, FiveSimCountry, FiveSimOperator, FiveSimPriceInfo, FiveSimNotification } from '../providers/5sim.adapter';
import * as crypto from 'crypto';

/**
 * 5sim 服务层
 *
 * 功能：
 * - 封装 5sim Adapter 的高级功能
 * - 提供订单、支付、短信收件箱等查询功能
 * - 提供号码租用、标记、重用等操作功能
 */
@Injectable()
export class FiveSimService {
  private readonly logger = new Logger(FiveSimService.name);
  private readonly encryptionKey: string;
  private adapter: FiveSimAdapter | null = null;
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
   * 获取并初始化 5sim Adapter
   */
  private async getAdapter(): Promise<FiveSimAdapter> {
    // 从数据库获取 5sim 配置
    const config = await this.providerConfigRepo.findOne({
      where: { provider: '5sim', enabled: true },
    });

    if (!config) {
      throw new NotFoundException('5sim provider configuration not found or disabled');
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
      get: (key: string) => (key === 'FIVESIM_API_TOKEN' ? apiKey : undefined),
    } as any;

    // 创建 adapter（FiveSimAdapter 构造函数需要 httpService 和 configService）
    this.adapter = new FiveSimAdapter(this.httpService, mockConfigService);

    this.currentApiKey = apiKey;
    this.lastInitTime = now;
    this.logger.log('5sim Adapter initialized successfully');

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
   * 获取订单列表
   */
  async getOrders(params?: {
    category?: 'activation' | 'hosting';
    limit?: number;
    offset?: number;
    order?: 'id' | 'date';
    reverse?: boolean;
  }): Promise<FiveSimOrder[]> {
    const adapter = await this.getAdapter();
    const orders = await adapter.getOrders(params);
    this.logger.log(`Retrieved ${orders.length} orders from 5sim`);
    return orders;
  }

  /**
   * 获取支付历史
   */
  async getPayments(): Promise<FiveSimPayment[]> {
    const adapter = await this.getAdapter();
    const payments = await adapter.getPayments();
    this.logger.log(`Retrieved ${payments.length} payment records from 5sim`);
    return payments;
  }

  /**
   * 获取短信收件箱（租用号码的所有短信）
   */
  async getSmsInbox(orderId: string): Promise<FiveSimSmsMessage[]> {
    const adapter = await this.getAdapter();
    const messages = await adapter.getSmsInbox(orderId);
    this.logger.log(`Retrieved ${messages.length} SMS messages for order ${orderId}`);
    return messages;
  }

  /**
   * 获取价格上限设置
   */
  async getMaxPrices() {
    const adapter = await this.getAdapter();
    const maxPrices = await adapter.getMaxPrices();
    this.logger.log(`Retrieved price limits for ${Object.keys(maxPrices).length} countries`);
    return maxPrices;
  }

  /**
   * 租用号码（长期）
   */
  async rentNumber(service: string, country: string, hours: number = 24) {
    const adapter = await this.getAdapter();

    this.logger.log(`Renting number: service=${service}, country=${country}, hours=${hours}`);

    const result = await adapter.rentNumber(service, country, hours);

    this.logger.log(
      `Successfully rented number: ${result.phoneNumber} (activation ID: ${result.activationId})`,
    );

    return result;
  }

  /**
   * 获取支持的国家列表
   */
  async getCountries(): Promise<FiveSimCountry[]> {
    const adapter = await this.getAdapter();
    const countries = await adapter.getCountries();
    this.logger.log(`Retrieved ${countries.length} countries from 5sim`);
    return countries;
  }

  /**
   * 获取特定国家的运营商列表
   */
  async getOperators(country: string): Promise<FiveSimOperator[]> {
    const adapter = await this.getAdapter();
    const operatorsMap = await adapter.getOperators(country);

    // 将 Record<string, FiveSimOperator> 转换为 FiveSimOperator[]
    const operators = Object.keys(operatorsMap).map(name => ({
      name,
      prices: operatorsMap[name].prices || {},
    }));

    this.logger.log(`Retrieved ${operators.length} operators for country: ${country}`);
    return operators;
  }

  /**
   * 获取特定国家可用的产品/服务列表
   * @param country 国家代码或名称
   */
  async getProducts(country: string): Promise<any> {
    const adapter = await this.getAdapter();
    const products = await adapter.getAvailableServices(country);
    this.logger.log(`Retrieved products for country: ${country}`);
    return products;
  }

  /**
   * 标记号码为不可用
   */
  async banNumber(orderId: string): Promise<any> {
    const adapter = await this.getAdapter();
    const result = await adapter.banNumber(orderId);
    this.logger.log(`Banned number with order ID: ${orderId}`);
    return result;
  }

  /**
   * 重用之前使用过的号码
   */
  async reuseNumber(product: string, phoneNumber: string): Promise<any> {
    const adapter = await this.getAdapter();
    const result = await adapter.reuseNumber(product, phoneNumber);
    this.logger.log(`Reused number: ${phoneNumber} for product: ${product}`);
    return result;
  }

  /**
   * 清除 adapter 缓存（用于配置更新后）
   */
  clearCache() {
    this.adapter = null;
    this.lastInitTime = 0;
    this.logger.log('5sim Adapter cache cleared');
  }

  /**
   * 获取特定国家和产品的价格
   * @param country 国家代码（可选）
   * @param product 产品代码（可选）
   */
  async getPrices(country?: string, product?: string): Promise<FiveSimPriceInfo> {
    const adapter = await this.getAdapter();
    const prices = await adapter.getPrices(country, product);
    this.logger.log(`Retrieved prices for country=${country || 'all'}, product=${product || 'all'}`);
    return prices;
  }

  /**
   * 获取5sim系统通知
   * @param language 语言代码 (en, ru, cn 等)
   */
  async getNotifications(language: string = 'en'): Promise<FiveSimNotification[]> {
    const adapter = await this.getAdapter();
    const notifications = await adapter.getNotifications(language);
    this.logger.log(`Retrieved ${notifications.length} notifications for language: ${language}`);
    return notifications;
  }

  /**
   * 设置价格上限
   * @param country 国家代码
   * @param product 产品代码
   * @param price 价格上限
   */
  async setMaxPrice(country: string, product: string, price: number): Promise<void> {
    const adapter = await this.getAdapter();
    await adapter.setMaxPrice(country, product, price);
    this.logger.log(`Set max price for ${country}/${product}: ${price}`);
  }

  /**
   * 删除价格上限
   * @param country 国家代码
   * @param product 产品代码
   */
  async deleteMaxPrice(country: string, product: string): Promise<void> {
    const adapter = await this.getAdapter();
    await adapter.deleteMaxPrice(country, product);
    this.logger.log(`Deleted max price for ${country}/${product}`);
  }
}
