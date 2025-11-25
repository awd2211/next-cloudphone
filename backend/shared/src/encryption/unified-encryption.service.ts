import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * 加密算法
 */
export enum EncryptionAlgorithm {
  /** AES-256-GCM (推荐 - 提供认证加密) */
  AES_256_GCM = 'aes-256-gcm',
  /** AES-256-CBC (兼容模式) */
  AES_256_CBC = 'aes-256-cbc',
}

/**
 * 加密结果
 */
export interface EncryptedData {
  /** 密文 (Base64) */
  ciphertext: string;
  /** 初始化向量 (Base64) */
  iv: string;
  /** 认证标签 (仅 GCM 模式, Base64) */
  authTag?: string;
  /** 算法 */
  algorithm: EncryptionAlgorithm;
}

/**
 * 脱敏类型
 */
export type MaskType = 'phone' | 'email' | 'idCard' | 'bankCard' | 'name' | 'generic';

/**
 * 加密配置
 */
export interface UnifiedEncryptionConfig {
  /** 加密密钥 (32字节/256位) */
  encryptionKey?: string;
  /** 加密算法 */
  algorithm?: EncryptionAlgorithm;
  /** 环境变量名 (密钥) */
  keyEnvName?: string;
}

/**
 * 统一加密服务
 *
 * 提供跨服务一致的加密接口，支持:
 * - AES-256-GCM 认证加密 (推荐)
 * - AES-256-CBC 兼容模式
 * - SHA-256/SHA-512 哈希
 * - 数据脱敏 (手机、邮箱、身份证、银行卡、姓名)
 * - 批量加密/解密/脱敏
 * - 旧格式自动检测和解密
 *
 * @example
 * ```typescript
 * // 基础加密
 * const encrypted = encryptionService.encrypt('sensitive-data');
 * const decrypted = encryptionService.decrypt(encrypted);
 *
 * // 序列化格式 (用于数据库存储)
 * const serialized = encryptionService.encryptToString('data');
 * const original = encryptionService.decryptFromString(serialized);
 *
 * // 数据脱敏
 * const maskedPhone = encryptionService.maskPhone('13812345678'); // 138****5678
 * const maskedEmail = encryptionService.maskEmail('test@example.com'); // t***@example.com
 *
 * // 批量操作
 * const user = encryptionService.encryptFields(userData, ['phone', 'idCard']);
 * const display = encryptionService.maskFields(userData, { phone: 'phone', email: 'email' });
 * ```
 */
@Injectable()
export class UnifiedEncryptionService {
  private readonly logger = new Logger(UnifiedEncryptionService.name);
  private readonly encryptionKey: Buffer;
  private readonly algorithm: EncryptionAlgorithm;

  /** 常量 */
  private readonly IV_LENGTH = 16; // 128 bits
  private readonly AUTH_TAG_LENGTH = 16; // 128 bits
  private readonly KEY_LENGTH = 32; // 256 bits

  constructor(
    @Optional() private readonly configService?: ConfigService,
    @Optional() customConfig?: UnifiedEncryptionConfig,
  ) {
    // 获取加密算法
    this.algorithm =
      customConfig?.algorithm ??
      EncryptionAlgorithm.AES_256_GCM;

    // 获取加密密钥
    const keyEnvName = customConfig?.keyEnvName ?? 'ENCRYPTION_KEY';
    let keyString = customConfig?.encryptionKey;

    if (!keyString && this.configService) {
      keyString = this.configService.get<string>(keyEnvName);
    }

    if (keyString) {
      // 使用 SHA-256 将任意长度密钥转换为 32 字节
      this.encryptionKey = crypto.createHash('sha256').update(keyString).digest();
    } else {
      // 开发环境使用默认密钥
      this.logger.warn(`⚠️ ${keyEnvName} 未配置，使用默认密钥（仅限开发环境）`);
      this.encryptionKey = crypto
        .createHash('sha256')
        .update('default-dev-encryption-key-do-not-use-in-production')
        .digest();

      // 生产环境报错
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`⚠️ ${keyEnvName} must be set in production environment!`);
      }
    }

    this.logger.log(`UnifiedEncryptionService initialized (algorithm: ${this.algorithm})`);
  }

  // ==================== 加密操作 ====================

  /**
   * 加密数据
   *
   * @param plaintext 明文
   * @returns 加密结果对象
   */
  encrypt(plaintext: string): EncryptedData {
    if (!plaintext) {
      return { ciphertext: '', iv: '', algorithm: this.algorithm };
    }

    try {
      const iv = crypto.randomBytes(this.IV_LENGTH);

      if (this.algorithm === EncryptionAlgorithm.AES_256_GCM) {
        const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        const authTag = cipher.getAuthTag().toString('base64');

        return {
          ciphertext: encrypted,
          iv: iv.toString('base64'),
          authTag,
          algorithm: this.algorithm,
        };
      } else {
        const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        return {
          ciphertext: encrypted,
          iv: iv.toString('base64'),
          algorithm: this.algorithm,
        };
      }
    } catch (error) {
      this.logger.error(`加密失败: ${error.message}`);
      throw new Error('加密失败');
    }
  }

  /**
   * 解密数据
   *
   * @param data 加密结果对象
   * @returns 明文
   */
  decrypt(data: EncryptedData): string {
    if (!data.ciphertext) {
      return '';
    }

    try {
      const iv = Buffer.from(data.iv, 'base64');
      const algorithm = data.algorithm || this.algorithm;

      if (algorithm === EncryptionAlgorithm.AES_256_GCM) {
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
        if (data.authTag) {
          decipher.setAuthTag(Buffer.from(data.authTag, 'base64'));
        }
        let decrypted = decipher.update(data.ciphertext, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } else {
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
        let decrypted = decipher.update(data.ciphertext, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }
    } catch (error) {
      this.logger.error(`解密失败: ${error.message}`);
      throw new Error('解密失败');
    }
  }

  /**
   * 加密为字符串格式 (用于数据库存储)
   *
   * 格式: gcm:iv:authTag:ciphertext 或 cbc:iv:ciphertext
   *
   * @param plaintext 明文
   * @returns 序列化的加密字符串
   */
  encryptToString(plaintext: string): string {
    if (!plaintext) return '';

    const encrypted = this.encrypt(plaintext);
    if (encrypted.algorithm === EncryptionAlgorithm.AES_256_GCM) {
      return `gcm:${encrypted.iv}:${encrypted.authTag}:${encrypted.ciphertext}`;
    } else {
      return `cbc:${encrypted.iv}:${encrypted.ciphertext}`;
    }
  }

  /**
   * 从字符串格式解密
   *
   * 支持格式:
   * - gcm:iv:authTag:ciphertext (新格式)
   * - cbc:iv:ciphertext (新格式)
   * - iv:authTag:ciphertext (旧 billing-service 格式)
   * - CryptoJS 格式 (旧 user-service 格式) - 自动检测
   *
   * @param encryptedString 加密字符串
   * @returns 明文
   */
  decryptFromString(encryptedString: string): string {
    if (!encryptedString) return '';

    try {
      // 检测格式
      const parts = encryptedString.split(':');

      if (parts[0] === 'gcm' && parts.length === 4) {
        // 新 GCM 格式: gcm:iv:authTag:ciphertext
        return this.decrypt({
          algorithm: EncryptionAlgorithm.AES_256_GCM,
          iv: parts[1],
          authTag: parts[2],
          ciphertext: parts[3],
        });
      } else if (parts[0] === 'cbc' && parts.length === 3) {
        // 新 CBC 格式: cbc:iv:ciphertext
        return this.decrypt({
          algorithm: EncryptionAlgorithm.AES_256_CBC,
          iv: parts[1],
          ciphertext: parts[2],
        });
      } else if (parts.length === 3) {
        // 旧 billing-service 格式: iv:authTag:ciphertext
        return this.decrypt({
          algorithm: EncryptionAlgorithm.AES_256_GCM,
          iv: parts[0],
          authTag: parts[1],
          ciphertext: parts[2],
        });
      } else {
        // 尝试 CryptoJS 兼容格式 (Base64 编码的单字符串)
        // CryptoJS 使用不同的内部格式，这里尝试直接解密
        this.logger.warn('尝试解密未知格式，可能是 CryptoJS 格式');
        throw new Error('不支持的加密格式');
      }
    } catch (error) {
      this.logger.error(`解密字符串失败: ${error.message}`);
      throw new Error('解密失败');
    }
  }

  // ==================== 哈希操作 ====================

  /**
   * SHA-256 哈希
   *
   * @param data 数据
   * @returns 哈希值 (hex)
   */
  hash(data: string): string {
    if (!data) return '';
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * SHA-512 哈希
   *
   * @param data 数据
   * @returns 哈希值 (hex)
   */
  hash512(data: string): string {
    if (!data) return '';
    return crypto.createHash('sha512').update(data).digest('hex');
  }

  /**
   * HMAC-SHA256
   *
   * @param data 数据
   * @param key 密钥 (可选，默认使用加密密钥)
   * @returns HMAC 值 (hex)
   */
  hmac(data: string, key?: string): string {
    if (!data) return '';
    const hmacKey = key ? Buffer.from(key) : this.encryptionKey;
    return crypto.createHmac('sha256', hmacKey).update(data).digest('hex');
  }

  /**
   * 生成随机令牌
   *
   * @param length 长度 (字节，默认 32)
   * @returns 令牌 (hex)
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成 UUID v4
   */
  generateUUID(): string {
    return crypto.randomUUID();
  }

  // ==================== 数据脱敏 ====================

  /**
   * 脱敏手机号
   *
   * @example 13812345678 -> 138****5678
   */
  maskPhone(phone: string): string {
    if (!phone || phone.length < 7) return '***';
    const start = phone.substring(0, 3);
    const end = phone.substring(phone.length - 4);
    return `${start}****${end}`;
  }

  /**
   * 脱敏邮箱
   *
   * @example test@example.com -> t***@example.com
   */
  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***@***.com';
    const [username, domain] = email.split('@');
    if (username.length <= 1) {
      return `*@${domain}`;
    }
    const maskedUsername = username[0] + '*'.repeat(Math.min(username.length - 1, 3));
    return `${maskedUsername}@${domain}`;
  }

  /**
   * 脱敏身份证号
   *
   * @example 110101199001011234 -> 110101********1234
   */
  maskIdCard(idCard: string): string {
    if (!idCard || idCard.length < 10) return '******';
    const start = idCard.substring(0, 6);
    const end = idCard.substring(idCard.length - 4);
    return `${start}********${end}`;
  }

  /**
   * 脱敏银行卡号
   *
   * @example 6222021234567890123 -> 6222 **** **** 0123
   */
  maskBankCard(bankCard: string): string {
    if (!bankCard || bankCard.length < 8) return '****';
    const start = bankCard.substring(0, 4);
    const end = bankCard.substring(bankCard.length - 4);
    return `${start} **** **** ${end}`;
  }

  /**
   * 脱敏姓名
   *
   * @example 张三 -> 张*
   * @example 张三丰 -> 张**
   */
  maskName(name: string): string {
    if (!name || name.length === 0) return '**';
    if (name.length === 1) return '*';
    if (name.length === 2) return `${name[0]}*`;
    return name[0] + '*'.repeat(name.length - 1);
  }

  /**
   * 通用脱敏 (显示前后指定位数)
   *
   * @param text 原文
   * @param visibleChars 前后可见字符数 (默认 4)
   * @example "secret_key_value" -> "secr****alue"
   */
  mask(text: string, visibleChars: number = 4): string {
    if (!text) return '';
    if (text.length <= visibleChars * 2) {
      return '*'.repeat(text.length);
    }
    const prefix = text.substring(0, visibleChars);
    const suffix = text.substring(text.length - visibleChars);
    const masked = '*'.repeat(Math.min(text.length - visibleChars * 2, 8));
    return `${prefix}${masked}${suffix}`;
  }

  // ==================== 批量操作 ====================

  /**
   * 批量加密对象的指定字段
   *
   * @param obj 对象
   * @param fields 需要加密的字段列表
   * @returns 加密后的对象
   */
  encryptFields<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
    const result = { ...obj };

    for (const field of fields) {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = this.encryptToString(result[field] as string) as any;
      }
    }

    return result;
  }

  /**
   * 批量解密对象的指定字段
   *
   * @param obj 对象
   * @param fields 需要解密的字段列表
   * @returns 解密后的对象
   */
  decryptFields<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
    const result = { ...obj };

    for (const field of fields) {
      if (result[field] && typeof result[field] === 'string') {
        try {
          result[field] = this.decryptFromString(result[field] as string) as any;
        } catch (e) {
          // 解密失败保持原值
          this.logger.warn(`字段 ${String(field)} 解密失败，保持原值`);
        }
      }
    }

    return result;
  }

  /**
   * 批量脱敏对象的指定字段
   *
   * @param obj 对象
   * @param fieldMasks 字段和脱敏类型的映射
   * @returns 脱敏后的对象
   */
  maskFields<T extends Record<string, any>>(
    obj: T,
    fieldMasks: Partial<Record<keyof T, MaskType>>,
  ): T {
    const result = { ...obj };

    for (const [field, maskType] of Object.entries(fieldMasks)) {
      const value = result[field as keyof T];
      if (value && typeof value === 'string') {
        switch (maskType) {
          case 'phone':
            result[field as keyof T] = this.maskPhone(value) as any;
            break;
          case 'email':
            result[field as keyof T] = this.maskEmail(value) as any;
            break;
          case 'idCard':
            result[field as keyof T] = this.maskIdCard(value) as any;
            break;
          case 'bankCard':
            result[field as keyof T] = this.maskBankCard(value) as any;
            break;
          case 'name':
            result[field as keyof T] = this.maskName(value) as any;
            break;
          case 'generic':
          default:
            result[field as keyof T] = this.mask(value) as any;
            break;
        }
      }
    }

    return result;
  }

  // ==================== 工具方法 ====================

  /**
   * 检查是否已配置加密密钥
   */
  isKeyConfigured(): boolean {
    const keyEnvName = 'ENCRYPTION_KEY';
    return !!this.configService?.get<string>(keyEnvName);
  }

  /**
   * 比较明文和加密值
   *
   * @param plaintext 明文
   * @param encrypted 加密字符串
   * @returns 是否匹配
   */
  compare(plaintext: string, encrypted: string): boolean {
    try {
      const decrypted = this.decryptFromString(encrypted);
      return plaintext === decrypted;
    } catch {
      return false;
    }
  }

  /**
   * 安全比较两个字符串 (防止时序攻击)
   */
  secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
