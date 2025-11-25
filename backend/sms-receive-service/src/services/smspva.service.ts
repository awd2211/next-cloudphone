import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ProviderConfig } from '../entities';
import { SmspvaAdapter, SmspvaUserInfo, SmspvaCountInfo, SmspvaSmsResult } from '../providers/smspva.adapter';
import * as crypto from 'crypto';

/**
 * SMSPVA 服务层
 *
 * 功能：
 * - 封装 SMSPVA Adapter 的功能
 * - 提供用户信息、余额查询
 * - 提供号码获取、短信查询等操作
 */
@Injectable()
export class SmspvaService {
  private readonly logger = new Logger(SmspvaService.name);
  private readonly encryptionKey: string;
  private adapter: SmspvaAdapter | null = null;
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
   * 获取并初始化 SMSPVA Adapter
   */
  private async getAdapter(): Promise<SmspvaAdapter> {
    // 从数据库获取 smspva 配置
    const config = await this.providerConfigRepo.findOne({
      where: { provider: 'smspva', enabled: true },
    });

    if (!config) {
      throw new NotFoundException('SMSPVA provider configuration not found or disabled');
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
      get: (key: string) => (key === 'SMSPVA_API_KEY' ? apiKey : undefined),
    } as any;

    // 创建 adapter
    this.adapter = new SmspvaAdapter(this.httpService, mockConfigService);

    this.currentApiKey = apiKey;
    this.lastInitTime = now;
    this.logger.log('SMSPVA Adapter initialized successfully');

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
   * 获取用户信息
   */
  async getUserInfo(): Promise<SmspvaUserInfo> {
    const adapter = await this.getAdapter();
    const userInfo = await adapter.getUserInfo();
    this.logger.log(`SMSPVA user info: ${userInfo.username}, balance: ${userInfo.balance}`);
    return userInfo;
  }

  /**
   * 获取余额
   */
  async getBalance() {
    const adapter = await this.getAdapter();
    const balance = await adapter.getBalance();
    this.logger.log(`SMSPVA balance: ${balance.balance} ${balance.currency}`);
    return balance;
  }

  /**
   * 获取可用号码数量
   */
  async getCount(serviceId: number, countryId: number): Promise<SmspvaCountInfo> {
    const adapter = await this.getAdapter();
    const countInfo = await adapter.getCount(serviceId, countryId);
    this.logger.log(`SMSPVA count for service ${serviceId}, country ${countryId}: ${countInfo.total}`);
    return countInfo;
  }

  /**
   * 获取号码
   */
  async getNumber(serviceId: number, countryId: number = 1) {
    const adapter = await this.getAdapter();
    this.logger.log(`Getting SMSPVA number: serviceId=${serviceId}, countryId=${countryId}`);
    const result = await adapter.getNumber(serviceId.toString(), countryId);
    this.logger.log(`Got SMSPVA number: ${result.phoneNumber} (ID: ${result.activationId})`);
    return result;
  }

  /**
   * 获取短信
   */
  async getSms(numberId: string, notClose: boolean = false): Promise<SmspvaSmsResult> {
    const adapter = await this.getAdapter();
    const sms = await adapter.getSms(numberId, notClose);
    this.logger.log(`SMSPVA SMS for ${numberId}: ${sms.response}`);
    return sms;
  }

  /**
   * 获取号码状态
   */
  async getStatus(activationId: string) {
    const adapter = await this.getAdapter();
    const status = await adapter.getStatus(activationId);
    this.logger.log(`SMSPVA status for ${activationId}: ${status.status}`);
    return status;
  }

  /**
   * 设置状态
   */
  async setStatus(activationId: string, status: number) {
    const adapter = await this.getAdapter();
    await adapter.setStatus(activationId, status);
    this.logger.log(`SMSPVA set status for ${activationId}: ${status}`);
  }

  /**
   * 拒绝/取消号码
   */
  async denyNumber(numberId: string) {
    const adapter = await this.getAdapter();
    await adapter.denyNumber(numberId);
    this.logger.log(`SMSPVA denied number: ${numberId}`);
  }

  /**
   * 关闭订单（完成）
   */
  async closeNumber(numberId: string) {
    const adapter = await this.getAdapter();
    await adapter.closeNumber(numberId);
    this.logger.log(`SMSPVA closed number: ${numberId}`);
  }

  /**
   * 标记号码为禁用
   */
  async banNumber(numberId: string) {
    const adapter = await this.getAdapter();
    await adapter.banNumber(numberId);
    this.logger.log(`SMSPVA banned number: ${numberId}`);
  }

  /**
   * 请求下一条短信
   */
  async searchNextSms(numberId: string): Promise<SmspvaSmsResult> {
    const adapter = await this.getAdapter();
    const result = await adapter.searchNextSms(numberId);
    this.logger.log(`SMSPVA search next SMS for ${numberId}`);
    return result;
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
  async getServiceMapping(): Promise<Record<string, number>> {
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
    this.logger.log('SMSPVA Adapter cache cleared');
  }
}
