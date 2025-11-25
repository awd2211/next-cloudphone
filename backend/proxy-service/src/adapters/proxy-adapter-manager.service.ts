import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IProxyProvider, ProviderConfig } from '../common/interfaces';
import { ProxyProvider } from '../entities/proxy-provider.entity';
import { IPRoyalAdapter } from './iproyal/iproyal.adapter';
import { BrightDataAdapter } from './brightdata/brightdata.adapter';
import { OxylabsAdapter } from './oxylabs/oxylabs.adapter';
import { IPIDEAAdapter } from './ipidea/ipidea.adapter';
import { KookeeyAdapter } from './kookeey/kookeey.adapter';

/**
 * 代理适配器管理器服务
 *
 * 功能：
 * - 从数据库动态加载供应商配置
 * - 创建和管理适配器实例
 * - 支持运行时添加/删除/更新供应商
 * - 配置加密/解密处理
 */
@Injectable()
export class ProxyAdapterManagerService implements OnModuleInit {
  private readonly logger = new Logger(ProxyAdapterManagerService.name);

  // 适配器实例缓存 (providerId -> adapter)
  private adapters: Map<string, IProxyProvider> = new Map();

  // 加密密钥
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(ProxyProvider)
    private readonly providerRepository: Repository<ProxyProvider>,
    private readonly configService: ConfigService,
  ) {
    // 初始化加密密钥
    const key = this.configService.get<string>(
      'ENCRYPTION_KEY',
      'default-key-change-in-production',
    );
    this.encryptionKey = crypto.scryptSync(key, 'salt', 32);
  }

  /**
   * 模块初始化时加载所有启用的供应商
   */
  async onModuleInit() {
    this.logger.log('Initializing ProxyAdapterManagerService...');
    await this.loadAllProviders();
  }

  /**
   * 从数据库加载所有启用的供应商配置并初始化适配器
   */
  async loadAllProviders(): Promise<void> {
    try {
      const providers = await this.providerRepository.find({
        where: { enabled: true },
        order: { priority: 'DESC' },
      });

      this.logger.log(`Found ${providers.length} enabled provider(s) in database`);

      // 清空现有适配器
      this.adapters.clear();

      // 初始化每个供应商的适配器
      for (const provider of providers) {
        try {
          await this.initializeAdapter(provider);
        } catch (error) {
          this.logger.error(
            `Failed to initialize adapter for ${provider.name}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Initialized ${this.adapters.size} adapter(s): ${Array.from(this.adapters.values()).map(a => a.getName()).join(', ')}`,
      );
    } catch (error) {
      this.logger.error(`Failed to load providers from database: ${error.message}`);
    }
  }

  /**
   * 初始化单个供应商的适配器
   */
  private async initializeAdapter(provider: ProxyProvider): Promise<void> {
    const decryptedConfig = this.decryptConfig(provider.config);

    // 构建适配器配置
    const adapterConfig: ProviderConfig = {
      name: provider.type,
      apiUrl: decryptedConfig.apiUrl,
      apiKey: decryptedConfig.apiKey,
      username: decryptedConfig.username,
      password: decryptedConfig.password,
      timeout: 30000,
      maxRetries: 3,
      costPerGB: provider.costPerGB,
      enabled: provider.enabled,
      priority: provider.priority,
      extra: {
        // IPIDEA 特有配置
        gateway: decryptedConfig.gateway,
        port: decryptedConfig.port ? parseInt(decryptedConfig.port, 10) : undefined,
        // 其他通用配置
        zone: decryptedConfig.zone,
        proxyType: decryptedConfig.proxyType,
        ...decryptedConfig,
      },
    };

    // 根据类型创建适配器
    let adapter: IProxyProvider;

    switch (provider.type) {
      case 'brightdata':
        adapter = new BrightDataAdapter();
        break;
      case 'oxylabs':
        adapter = new OxylabsAdapter();
        break;
      case 'iproyal':
        adapter = new IPRoyalAdapter();
        break;
      case 'ipidea':
        adapter = new IPIDEAAdapter();
        break;
      case 'kookeey':
        adapter = new KookeeyAdapter();
        break;
      default:
        this.logger.warn(`Unknown provider type: ${provider.type}, skipping...`);
        return;
    }

    // 初始化适配器
    await adapter.initialize(adapterConfig);
    this.adapters.set(provider.id, adapter);

    this.logger.log(`Adapter initialized: ${provider.name} (${provider.type})`);
  }

  /**
   * 获取所有活跃的适配器
   */
  getActiveAdapters(): IProxyProvider[] {
    return Array.from(this.adapters.values());
  }

  /**
   * 根据供应商ID获取适配器
   */
  getAdapterById(providerId: string): IProxyProvider | undefined {
    return this.adapters.get(providerId);
  }

  /**
   * 根据供应商类型获取适配器
   */
  getAdapterByType(providerType: string): IProxyProvider | undefined {
    for (const adapter of this.adapters.values()) {
      if (adapter.getName() === providerType) {
        return adapter;
      }
    }
    return undefined;
  }

  /**
   * 重新加载单个供应商的适配器
   * 用于供应商配置更新后
   */
  async reloadAdapter(providerId: string): Promise<void> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!provider) {
      // 供应商已删除，移除适配器
      this.adapters.delete(providerId);
      this.logger.log(`Adapter removed for deleted provider: ${providerId}`);
      return;
    }

    if (!provider.enabled) {
      // 供应商已禁用，移除适配器
      this.adapters.delete(providerId);
      this.logger.log(`Adapter removed for disabled provider: ${provider.name}`);
      return;
    }

    // 重新初始化适配器
    try {
      await this.initializeAdapter(provider);
      this.logger.log(`Adapter reloaded: ${provider.name}`);
    } catch (error) {
      this.logger.error(`Failed to reload adapter for ${provider.name}: ${error.message}`);
    }
  }

  /**
   * 添加新的供应商适配器
   */
  async addAdapter(providerId: string): Promise<void> {
    await this.reloadAdapter(providerId);
  }

  /**
   * 移除供应商适配器
   */
  removeAdapter(providerId: string): void {
    if (this.adapters.has(providerId)) {
      const adapter = this.adapters.get(providerId);
      this.logger.log(`Removing adapter: ${adapter?.getName()}`);
      this.adapters.delete(providerId);
    }
  }

  /**
   * 解密配置
   */
  private decryptConfig(config: any): Record<string, any> {
    if (!config) return {};

    // 检查是否是加密格式
    if (config.encrypted && config.data) {
      try {
        const [ivHex, encryptedData] = config.data.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
      } catch (error) {
        this.logger.error(`Failed to decrypt config: ${error.message}`);
        return {};
      }
    }

    // 未加密的配置直接返回
    return config;
  }

  /**
   * 获取适配器数量
   */
  getAdapterCount(): number {
    return this.adapters.size;
  }

  /**
   * 获取所有适配器名称
   */
  getAdapterNames(): string[] {
    return Array.from(this.adapters.values()).map(a => a.getName());
  }
}
