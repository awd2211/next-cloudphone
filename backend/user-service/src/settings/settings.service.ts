import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting, SettingCategory } from './entities/setting.entity';
import { EncryptionService } from '../common/services/encryption.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
    private readonly encryptionService: EncryptionService
  ) {}

  /**
   * 获取所有设置（按类别分组）
   */
  async getAll(): Promise<Record<string, Record<string, any>>> {
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

    return result;
  }

  /**
   * 获取指定类别的设置
   */
  async getByCategory(category: SettingCategory): Promise<Record<string, any>> {
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
    this.logger.log(`Setting updated: ${category}.${key}`);
    return saved;
  }

  /**
   * 批量更新类别设置
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
   */
  async delete(category: SettingCategory, key: string): Promise<void> {
    await this.settingRepository.delete({ category, key });
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
      { category: SettingCategory.BASIC, key: 'contactEmail', value: 'support@cloudphone.com' },

      // 邮件设置
      { category: SettingCategory.EMAIL, key: 'smtpHost', value: 'smtp.example.com' },
      { category: SettingCategory.EMAIL, key: 'smtpPort', value: '587' },
      { category: SettingCategory.EMAIL, key: 'smtpFrom', value: 'noreply@cloudphone.com' },

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
}
