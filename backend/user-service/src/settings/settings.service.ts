import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting, SettingCategory } from './entities/setting.entity';
import { EncryptionService } from '../common/services/encryption.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
    private readonly encryptionService: EncryptionService,
    @Optional() private readonly cacheService: CacheService
  ) {}

  /**
   * 获取所有设置（按类别分组）
   * ✅ 添加缓存优化 (5分钟 TTL - 配置数据变化少)
   */
  async getAll(): Promise<Record<string, Record<string, any>>> {
    const cacheKey = 'settings:all';

    // 尝试从缓存获取
    if (this.cacheService) {
      try {
        const cached = await this.cacheService.get<Record<string, Record<string, any>>>(cacheKey);
        if (cached) {
          this.logger.debug('设置列表缓存命中');
          return cached;
        }
      } catch (error) {
        this.logger.warn(`获取设置缓存失败: ${error.message}`);
      }
    }

    // 查询数据库
    const settings = await this.settingRepository.find();

    const result: Record<string, Record<string, any>> = {};

    for (const setting of settings) {
      if (!result[setting.category]) {
        result[setting.category] = {};
      }

      // 解密加密的值
      let value = setting.value;
      if (setting.isEncrypted) {
        try {
          value = this.encryptionService.decrypt(value);
        } catch (error) {
          this.logger.error(`Failed to decrypt setting: ${setting.key}`, error);
        }
      }

      // 尝试解析 JSON
      try {
        result[setting.category][setting.key] = JSON.parse(value);
      } catch {
        result[setting.category][setting.key] = value;
      }
    }

    // 写入缓存 (5分钟 TTL - 配置数据变化少)
    if (this.cacheService) {
      try {
        await this.cacheService.set(cacheKey, result, { ttl: 300 });
        this.logger.debug('设置列表已缓存 - TTL: 5分钟');
      } catch (error) {
        this.logger.warn(`写入设置缓存失败: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * 获取指定类别的设置
   * ✅ 添加缓存优化 (5分钟 TTL)
   */
  async getByCategory(category: SettingCategory): Promise<Record<string, any>> {
    const cacheKey = `settings:category:${category}`;

    // 尝试从缓存获取
    if (this.cacheService) {
      try {
        const cached = await this.cacheService.get<Record<string, any>>(cacheKey);
        if (cached) {
          this.logger.debug(`设置类别缓存命中 - 类别: ${category}`);
          return cached;
        }
      } catch (error) {
        this.logger.warn(`获取设置类别缓存失败: ${error.message}`);
      }
    }

    // 查询数据库
    const settings = await this.settingRepository.find({ where: { category } });

    const result: Record<string, any> = {};

    for (const setting of settings) {
      let value = setting.value;
      if (setting.isEncrypted) {
        try {
          value = this.encryptionService.decrypt(value);
        } catch (error) {
          this.logger.error(`Failed to decrypt setting: ${setting.key}`, error);
        }
      }

      try {
        result[setting.key] = JSON.parse(value);
      } catch {
        result[setting.key] = value;
      }
    }

    // 写入缓存 (5分钟 TTL)
    if (this.cacheService) {
      try {
        await this.cacheService.set(cacheKey, result, { ttl: 300 });
        this.logger.debug(`设置类别已缓存 - 类别: ${category}, TTL: 5分钟`);
      } catch (error) {
        this.logger.warn(`写入设置类别缓存失败: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * 获取单个设置
   */
  async get(category: SettingCategory, key: string): Promise<any> {
    const setting = await this.settingRepository.findOne({ where: { category, key } });

    if (!setting) {
      return null;
    }

    let value = setting.value;
    if (setting.isEncrypted) {
      try {
        value = this.encryptionService.decrypt(value);
      } catch (error) {
        this.logger.error(`Failed to decrypt setting: ${setting.key}`, error);
        return null;
      }
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * 设置配置项
   * ✅ 添加缓存失效
   */
  async set(
    category: SettingCategory,
    key: string,
    value: any,
    options?: { isEncrypted?: boolean; description?: string; isPublic?: boolean }
  ): Promise<Setting> {
    let setting = await this.settingRepository.findOne({ where: { category, key } });

    let valueStr = typeof value === 'string' ? value : JSON.stringify(value);

    // 如果需要加密
    if (options?.isEncrypted) {
      valueStr = this.encryptionService.encrypt(valueStr);
    }

    if (setting) {
      setting.value = valueStr;
      if (options?.description !== undefined) setting.description = options.description;
      if (options?.isEncrypted !== undefined) setting.isEncrypted = options.isEncrypted;
      if (options?.isPublic !== undefined) setting.isPublic = options.isPublic;
    } else {
      setting = this.settingRepository.create({
        category,
        key,
        value: valueStr,
        description: options?.description,
        isEncrypted: options?.isEncrypted || false,
        isPublic: options?.isPublic || false,
      });
    }

    const saved = await this.settingRepository.save(setting);

    // ✅ 清除缓存
    await this.clearSettingsCache(category);

    this.logger.log(`Setting updated: ${category}.${key}`);
    return saved;
  }

  /**
   * 批量更新类别设置
   * ✅ set() 方法已经包含缓存失效，无需额外处理
   */
  async updateCategory(category: SettingCategory, data: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      // 某些敏感字段需要加密
      const sensitiveKeys = ['password', 'secret', 'apiKey', 'privateKey', 'accessKey'];
      const isEncrypted = sensitiveKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()));

      await this.set(category, key, value, { isEncrypted });
    }

    this.logger.log(`Category ${category} settings updated`);
  }

  /**
   * 删除设置
   * ✅ 添加缓存失效
   */
  async delete(category: SettingCategory, key: string): Promise<void> {
    await this.settingRepository.delete({ category, key });

    // ✅ 清除缓存
    await this.clearSettingsCache(category);

    this.logger.log(`Setting deleted: ${category}.${key}`);
  }

  /**
   * 初始化默认设置
   */
  async initializeDefaults(): Promise<void> {
    const existing = await this.settingRepository.count();
    if (existing > 0) {
      this.logger.log('Settings already initialized, skipping...');
      return;
    }

    const defaults = [
      // 基本设置
      { category: SettingCategory.BASIC, key: 'siteName', value: '云手机平台' },
      { category: SettingCategory.BASIC, key: 'siteUrl', value: 'http://localhost:5173' },
      { category: SettingCategory.BASIC, key: 'contactEmail', value: 'support@cloudphone.run' },

      // 邮件设置 - 支持多种邮件服务商
      // 可选值: smtp, mailgun, sendgrid, ses, postmark, resend, sparkpost
      { category: SettingCategory.EMAIL, key: 'emailProvider', value: 'smtp' },
      { category: SettingCategory.EMAIL, key: 'emailEnabled', value: 'false' },
      // SMTP 配置
      { category: SettingCategory.EMAIL, key: 'smtpHost', value: '' },
      { category: SettingCategory.EMAIL, key: 'smtpPort', value: '587' },
      { category: SettingCategory.EMAIL, key: 'smtpSecure', value: 'false' },
      { category: SettingCategory.EMAIL, key: 'smtpUser', value: '' },
      { category: SettingCategory.EMAIL, key: 'smtpFrom', value: 'CloudPhone <noreply@cloudphone.run>' },
      // Mailgun 配置
      { category: SettingCategory.EMAIL, key: 'mailgunApiKey', value: '' },
      { category: SettingCategory.EMAIL, key: 'mailgunDomain', value: '' },
      { category: SettingCategory.EMAIL, key: 'mailgunRegion', value: 'us' },
      // SendGrid 配置
      { category: SettingCategory.EMAIL, key: 'sendgridApiKey', value: '' },
      // Amazon SES 配置
      { category: SettingCategory.EMAIL, key: 'sesRegion', value: 'us-east-1' },
      { category: SettingCategory.EMAIL, key: 'sesAccessKeyId', value: '' },
      // Postmark 配置
      { category: SettingCategory.EMAIL, key: 'postmarkServerToken', value: '' },
      { category: SettingCategory.EMAIL, key: 'postmarkMessageStream', value: 'outbound' },
      // Resend 配置
      { category: SettingCategory.EMAIL, key: 'resendApiKey', value: '' },
      // SparkPost 配置
      { category: SettingCategory.EMAIL, key: 'sparkpostApiKey', value: '' },
      { category: SettingCategory.EMAIL, key: 'sparkpostRegion', value: 'us' },

      // 短信设置
      { category: SettingCategory.SMS, key: 'provider', value: 'aliyun' },
      { category: SettingCategory.SMS, key: 'signName', value: '云手机平台' },

      // 支付设置
      { category: SettingCategory.PAYMENT, key: 'enableAlipay', value: 'true' },
      { category: SettingCategory.PAYMENT, key: 'enableWechat', value: 'true' },

      // 存储设置
      { category: SettingCategory.STORAGE, key: 'provider', value: 'minio' },
      { category: SettingCategory.STORAGE, key: 'bucket', value: 'cloudphone' },
    ];

    for (const item of defaults) {
      await this.set(item.category as SettingCategory, item.key, item.value, {
        isPublic: true,
      });
    }

    this.logger.log('Default settings initialized');
  }

  /**
   * ✅ 清除设置缓存
   * @param category 可选的类别，如果提供则只清除该类别的缓存
   */
  private async clearSettingsCache(category?: SettingCategory): Promise<void> {
    if (!this.cacheService) return;

    try {
      // 清除全局设置缓存
      await this.cacheService.del('settings:all');
      this.logger.debug('设置全局缓存已清除');

      // 如果指定了类别，也清除该类别的缓存
      if (category) {
        const categoryKey = `settings:category:${category}`;
        await this.cacheService.del(categoryKey);
        this.logger.debug(`设置类别缓存已清除 - 类别: ${category}`);
      }
    } catch (error) {
      this.logger.error(`清除设置缓存失败: ${error.message}`, error.stack);
    }
  }
}
