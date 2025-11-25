import { Injectable, Logger, NotFoundException, ConflictException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ProxyProvider } from '../../entities/proxy-provider.entity';
import {
  CreateProxyProviderDto,
  UpdateProxyProviderDto,
  ProxyProviderResponseDto,
} from '../dto/provider-config.dto';
import * as crypto from 'crypto';

/**
 * 代理供应商配置管理 Service
 *
 * 职责：
 * - 提供商配置的 CRUD 操作
 * - ✅ 缓存优化 (600 秒 TTL - 配置数据变化极少)
 * - 配置信息加密/解密
 * - 缓存失效管理
 */
@Injectable()
export class ProxyProviderConfigService {
  private readonly logger = new Logger(ProxyProviderConfigService.name);
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(ProxyProvider)
    private readonly providerRepo: Repository<ProxyProvider>,
    @Optional() @Inject(CACHE_MANAGER) private cacheManager?: Cache,
  ) {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    if (this.encryptionKey === 'default-key-change-in-production') {
      this.logger.warn('Using default encryption key! Please set ENCRYPTION_KEY in production!');
    }
  }

  /**
   * 获取所有代理供应商配置
   * ✅ 添加缓存优化 (10 分钟 TTL - 配置数据变化少)
   */
  async getAllProviders(): Promise<ProxyProviderResponseDto[]> {
    const cacheKey = 'proxy.providers.list';

    // 尝试从缓存获取
    if (this.cacheManager) {
      try {
        const cached = await this.cacheManager.get<ProxyProviderResponseDto[]>(cacheKey);
        if (cached) {
          this.logger.debug('代理提供商列表缓存命中');
          return cached;
        }
      } catch (error) {
        this.logger.warn(`获取提供商缓存失败: ${error.message}`);
      }
    }

    // 查询数据库
    const providers = await this.providerRepo.find({
      order: { priority: 'DESC', createdAt: 'DESC' },
    });

    const result = providers.map((provider) => this.toResponseDto(provider));

    // 写入缓存 (10 分钟 TTL - 配置数据变化少)
    if (this.cacheManager) {
      try {
        await this.cacheManager.set(cacheKey, result, 600000); // 600 seconds = 10 minutes
        this.logger.debug('代理提供商列表已缓存 - TTL: 10 分钟');
      } catch (error) {
        this.logger.warn(`写入提供商缓存失败: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * 根据ID获取供应商配置
   */
  async getProviderById(id: string): Promise<ProxyProviderResponseDto> {
    const provider = await this.providerRepo.findOne({ where: { id } });

    if (!provider) {
      throw new NotFoundException(`Proxy provider with ID ${id} not found`);
    }

    return this.toResponseDto(provider);
  }

  /**
   * 获取供应商的解密配置（用于编辑）
   * 注意：此方法返回敏感信息，前端应妥善处理
   */
  async getProviderConfig(id: string): Promise<Record<string, any>> {
    const provider = await this.providerRepo.findOne({ where: { id } });

    if (!provider) {
      throw new NotFoundException(`Proxy provider with ID ${id} not found`);
    }

    if (!provider.config || Object.keys(provider.config).length === 0) {
      return {};
    }

    // 解密并返回配置
    return this.decryptConfig(provider.config);
  }

  /**
   * 创建新的代理供应商配置
   * ✅ 添加缓存失效
   */
  async createProvider(createDto: CreateProxyProviderDto): Promise<ProxyProviderResponseDto> {
    // 检查供应商名称是否已存在
    const existing = await this.providerRepo.findOne({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException(`Provider with name ${createDto.name} already exists`);
    }

    // 加密配置信息
    const encryptedConfig = this.encryptConfig(createDto.config);

    // 创建新配置
    const newProvider = this.providerRepo.create({
      ...createDto,
      config: encryptedConfig,
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      successRate: 0,
      avgLatencyMs: 0,
    });

    const saved = await this.providerRepo.save(newProvider);

    // ✅ 清除提供商列表缓存
    await this.clearProvidersCache();

    this.logger.log(`Created new proxy provider: ${saved.name} (ID: ${saved.id})`);

    return this.toResponseDto(saved);
  }

  /**
   * 更新供应商配置
   * ✅ 添加缓存失效
   */
  async updateProvider(
    id: string,
    updateDto: UpdateProxyProviderDto,
  ): Promise<ProxyProviderResponseDto> {
    const provider = await this.providerRepo.findOne({ where: { id } });

    if (!provider) {
      throw new NotFoundException(`Proxy provider with ID ${id} not found`);
    }

    // 如果更新配置，需要重新加密
    if (updateDto.config) {
      updateDto.config = this.encryptConfig(updateDto.config);
    }

    // 更新配置
    Object.assign(provider, updateDto);
    const updated = await this.providerRepo.save(provider);

    // ✅ 清除提供商列表缓存
    await this.clearProvidersCache();

    this.logger.log(`Updated proxy provider: ${updated.name} (ID: ${updated.id})`);

    return this.toResponseDto(updated);
  }

  /**
   * 删除供应商配置
   * ✅ 添加缓存失效
   */
  async deleteProvider(id: string): Promise<void> {
    const provider = await this.providerRepo.findOne({ where: { id } });

    if (!provider) {
      throw new NotFoundException(`Proxy provider with ID ${id} not found`);
    }

    await this.providerRepo.remove(provider);

    // ✅ 清除提供商列表缓存
    await this.clearProvidersCache();

    this.logger.log(`Deleted proxy provider: ${provider.name} (ID: ${id})`);
  }

  /**
   * 启用/禁用供应商
   * ✅ 添加缓存失效
   */
  async toggleProvider(id: string): Promise<ProxyProviderResponseDto> {
    const provider = await this.providerRepo.findOne({ where: { id } });

    if (!provider) {
      throw new NotFoundException(`Proxy provider with ID ${id} not found`);
    }

    provider.enabled = !provider.enabled;
    const updated = await this.providerRepo.save(provider);

    // ✅ 清除提供商列表缓存
    await this.clearProvidersCache();

    this.logger.log(
      `Toggled proxy provider ${updated.name}: ${updated.enabled ? 'enabled' : 'disabled'}`,
    );

    return this.toResponseDto(updated);
  }

  /**
   * 重置供应商统计数据
   * ✅ 添加缓存失效
   */
  async resetStats(id: string): Promise<ProxyProviderResponseDto> {
    const provider = await this.providerRepo.findOne({ where: { id } });

    if (!provider) {
      throw new NotFoundException(`Proxy provider with ID ${id} not found`);
    }

    provider.totalRequests = 0;
    provider.successRequests = 0;
    provider.failedRequests = 0;
    provider.successRate = 0;
    provider.avgLatencyMs = 0;

    const updated = await this.providerRepo.save(provider);

    // ✅ 清除提供商列表缓存（统计数据也在列表中显示）
    await this.clearProvidersCache();

    this.logger.log(`Reset statistics for proxy provider: ${provider.name}`);

    return this.toResponseDto(updated);
  }

  /**
   * 解密配置信息（供外部使用）
   */
  decryptConfig(encryptedConfig: Record<string, any>): Record<string, any> {
    if (!encryptedConfig.encrypted || !encryptedConfig.data) {
      return encryptedConfig;
    }

    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

    const parts = encryptedConfig.data.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * ✅ 清除提供商列表缓存
   */
  private async clearProvidersCache(): Promise<void> {
    if (!this.cacheManager) return;

    try {
      const cacheKey = 'proxy.providers.list';
      await this.cacheManager.del(cacheKey);
      this.logger.debug('代理提供商列表缓存已清除');
    } catch (error) {
      this.logger.error(`清除提供商缓存失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 转换为响应DTO
   */
  private toResponseDto(provider: ProxyProvider): ProxyProviderResponseDto {
    return {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      enabled: provider.enabled,
      priority: provider.priority,
      costPerGB: Number(provider.costPerGB),
      totalRequests: provider.totalRequests,
      successRequests: provider.successRequests,
      failedRequests: provider.failedRequests,
      successRate: Number(provider.successRate),
      avgLatencyMs: provider.avgLatencyMs,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      hasConfig: !!provider.config && Object.keys(provider.config).length > 0,
    };
  }

  /**
   * 加密配置信息
   */
  private encryptConfig(config: Record<string, any>): Record<string, any> {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const jsonString = JSON.stringify(config);
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted: true,
      data: `${iv.toString('hex')}:${encrypted}`,
    };
  }
}
