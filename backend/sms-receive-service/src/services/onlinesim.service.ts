import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ProviderConfig } from '../entities';
import { OnlineSimAdapter, OnlineSimBalance, OnlineSimState, OnlineSimCountry, OnlineSimNumbersStats } from '../providers/onlinesim.adapter';
import * as crypto from 'crypto';

/**
 * OnlineSim 服务层
 *
 * 功能：
 * - 封装 OnlineSim Adapter 的功能
 * - 提供余额、国家、服务列表查询
 * - 提供号码获取、状态查询等操作
 * - 使用 tzid (操作ID) 系统管理号码
 */
@Injectable()
export class OnlineSimService {
  private readonly logger = new Logger(OnlineSimService.name);
  private readonly encryptionKey: string;
  private adapter: OnlineSimAdapter | null = null;
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
   * 获取并初始化 OnlineSim Adapter
   */
  private async getAdapter(): Promise<OnlineSimAdapter> {
    // 从数据库获取 onlinesim 配置
    const config = await this.providerConfigRepo.findOne({
      where: { provider: 'onlinesim', enabled: true },
    });

    if (!config) {
      throw new NotFoundException('OnlineSim provider configuration not found or disabled');
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
      get: (key: string) => (key === 'ONLINESIM_API_KEY' ? apiKey : undefined),
    } as any;

    // 创建 adapter
    this.adapter = new OnlineSimAdapter(this.httpService, mockConfigService);

    this.currentApiKey = apiKey;
    this.lastInitTime = now;
    this.logger.log('OnlineSim Adapter initialized successfully');

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
    this.logger.log(`OnlineSim balance: ${balance.balance} ${balance.currency}`);
    return balance;
  }

  /**
   * 获取详细余额信息
   */
  async getDetailedBalance(): Promise<OnlineSimBalance> {
    const adapter = await this.getAdapter();
    const balance = await adapter.getDetailedBalance();
    this.logger.log(`OnlineSim detailed balance: ${balance.balance}, zbalance: ${balance.zbalance}`);
    return balance;
  }

  /**
   * 获取号码
   */
  async getNumber(service: string, country: string | number = 7) {
    const adapter = await this.getAdapter();
    this.logger.log(`Getting OnlineSim number: service=${service}, country=${country}`);
    const result = await adapter.getNumber(service, country);
    this.logger.log(`Got OnlineSim number: ${result.phoneNumber} (tzid: ${result.activationId})`);
    return result;
  }

  /**
   * 获取操作状态
   */
  async getState(tzid?: number): Promise<OnlineSimState[]> {
    const adapter = await this.getAdapter();
    const states = await adapter.getState(tzid);
    this.logger.log(`OnlineSim states retrieved: ${states.length} operations`);
    return states;
  }

  /**
   * 获取号码状态
   */
  async getStatus(activationId: string) {
    const adapter = await this.getAdapter();
    const status = await adapter.getStatus(activationId);
    this.logger.log(`OnlineSim status for tzid ${activationId}: ${status.status}`);
    return status;
  }

  /**
   * 设置操作为成功完成
   */
  async setOperationOk(tzid: number) {
    const adapter = await this.getAdapter();
    await adapter.setOperationOk(tzid);
    this.logger.log(`OnlineSim operation completed: ${tzid}`);
  }

  /**
   * 请求下一条短信
   */
  async setOperationRevise(tzid: number) {
    const adapter = await this.getAdapter();
    await adapter.setOperationRevise(tzid);
    this.logger.log(`OnlineSim requested next SMS for operation: ${tzid}`);
  }

  /**
   * 设置状态
   */
  async setStatus(activationId: string, status: number) {
    const adapter = await this.getAdapter();
    await adapter.setStatus(activationId, status);
    this.logger.log(`OnlineSim set status for ${activationId}: ${status}`);
  }

  /**
   * 取消操作
   * 注：OnlineSim 不支持显式取消，操作会在超时后自动取消
   */
  async cancel(activationId: string) {
    const adapter = await this.getAdapter();
    await adapter.cancel(activationId);
    this.logger.log(`OnlineSim cancel requested for: ${activationId} (will timeout automatically)`);
  }

  /**
   * 完成激活
   */
  async finish(activationId: string) {
    const adapter = await this.getAdapter();
    await adapter.finish(activationId);
    this.logger.log(`OnlineSim finished activation: ${activationId}`);
  }

  /**
   * 获取可用号码统计
   */
  async getNumbersStats(country?: number): Promise<OnlineSimNumbersStats[]> {
    const adapter = await this.getAdapter();
    const stats = await adapter.getNumbersStats(country);
    this.logger.log(`OnlineSim numbers stats: ${stats.length} services`);
    return stats;
  }

  /**
   * 获取国家列表
   */
  async getCountries(): Promise<OnlineSimCountry[]> {
    const adapter = await this.getAdapter();
    const countries = await adapter.getCountries();
    this.logger.log(`Retrieved ${countries.length} countries from OnlineSim`);
    return countries;
  }

  /**
   * 等待短信
   */
  async waitForSms(activationId: string, maxWaitSeconds: number = 120, pollIntervalMs: number = 5000) {
    const adapter = await this.getAdapter();
    this.logger.log(`Waiting for SMS on tzid: ${activationId}`);
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
    this.logger.log('OnlineSim Adapter cache cleared');
  }
}
