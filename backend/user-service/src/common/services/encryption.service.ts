import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';

/**
 * 加密服务
 *
 * 功能：
 * - AES 加密/解密敏感数据
 * - 单向哈希（用于不可逆数据）
 * - 数据脱敏（显示部分内容）
 */
@Injectable()
export class EncryptionService {
  private readonly encryptionKey: string;

  constructor(private configService: ConfigService) {
    // 从环境变量获取加密密钥
    this.encryptionKey =
      this.configService.get<string>('ENCRYPTION_KEY') ||
      'default-encryption-key-please-change-in-production';

    // 生产环境必须设置加密密钥
    if (
      process.env.NODE_ENV === 'production' &&
      this.encryptionKey === 'default-encryption-key-please-change-in-production'
    ) {
      throw new Error('⚠️ ENCRYPTION_KEY must be set in production environment!');
    }
  }

  /**
   * AES 加密
   *
   * @param plainText 明文
   * @returns 密文（Base64编码）
   */
  encrypt(plainText: string): string {
    if (!plainText) return plainText;

    try {
      const encrypted = CryptoJS.AES.encrypt(plainText, this.encryptionKey);
      return encrypted.toString();
    } catch (error) {
      throw new Error(`加密失败: ${error.message}`);
    }
  }

  /**
   * AES 解密
   *
   * @param cipherText 密文（Base64编码）
   * @returns 明文
   */
  decrypt(cipherText: string): string {
    if (!cipherText) return cipherText;

    try {
      const decrypted = CryptoJS.AES.decrypt(cipherText, this.encryptionKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error(`解密失败: ${error.message}`);
    }
  }

  /**
   * 加密手机号
   *
   * @param phone 手机号
   * @returns 加密后的手机号
   */
  encryptPhone(phone: string): string {
    return this.encrypt(phone);
  }

  /**
   * 解密手机号
   *
   * @param encryptedPhone 加密的手机号
   * @returns 明文手机号
   */
  decryptPhone(encryptedPhone: string): string {
    return this.decrypt(encryptedPhone);
  }

  /**
   * 加密身份证号
   *
   * @param idCard 身份证号
   * @returns 加密后的身份证号
   */
  encryptIdCard(idCard: string): string {
    return this.encrypt(idCard);
  }

  /**
   * 解密身份证号
   *
   * @param encryptedIdCard 加密的身份证号
   * @returns 明文身份证号
   */
  decryptIdCard(encryptedIdCard: string): string {
    return this.decrypt(encryptedIdCard);
  }

  /**
   * 加密银行卡号
   *
   * @param bankCard 银行卡号
   * @returns 加密后的银行卡号
   */
  encryptBankCard(bankCard: string): string {
    return this.encrypt(bankCard);
  }

  /**
   * 解密银行卡号
   *
   * @param encryptedBankCard 加密的银行卡号
   * @returns 明文银行卡号
   */
  decryptBankCard(encryptedBankCard: string): string {
    return this.decrypt(encryptedBankCard);
  }

  /**
   * 单向哈希（SHA256）
   *
   * 用于不需要解密的敏感数据
   * @param data 数据
   * @returns SHA256 哈希值
   */
  hash(data: string): string {
    if (!data) return data;

    return CryptoJS.SHA256(data).toString();
  }

  /**
   * 数据脱敏 - 手机号
   *
   * 显示前3位和后4位，中间用 * 代替
   * 例如：138****8000
   *
   * @param phone 手机号
   * @returns 脱敏后的手机号
   */
  maskPhone(phone: string): string {
    if (!phone || phone.length < 7) return '***';

    const start = phone.substring(0, 3);
    const end = phone.substring(phone.length - 4);
    return `${start}****${end}`;
  }

  /**
   * 数据脱敏 - 身份证号
   *
   * 显示前6位和后4位，中间用 * 代替
   * 例如：110101********1234
   *
   * @param idCard 身份证号
   * @returns 脱敏后的身份证号
   */
  maskIdCard(idCard: string): string {
    if (!idCard || idCard.length < 10) return '******';

    const start = idCard.substring(0, 6);
    const end = idCard.substring(idCard.length - 4);
    return `${start}********${end}`;
  }

  /**
   * 数据脱敏 - 银行卡号
   *
   * 显示前4位和后4位，中间用 * 代替
   * 例如：6222 **** **** 1234
   *
   * @param bankCard 银行卡号
   * @returns 脱敏后的银行卡号
   */
  maskBankCard(bankCard: string): string {
    if (!bankCard || bankCard.length < 8) return '****';

    const start = bankCard.substring(0, 4);
    const end = bankCard.substring(bankCard.length - 4);
    const middle = '*'.repeat(bankCard.length - 8);
    return `${start} ${middle} ${end}`;
  }

  /**
   * 数据脱敏 - 邮箱
   *
   * 保留用户名首字母和@后的域名，其余用 * 代替
   * 例如：j****@example.com
   *
   * @param email 邮箱
   * @returns 脱敏后的邮箱
   */
  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***@***.com';

    const [username, domain] = email.split('@');
    if (username.length <= 1) {
      return `*@${domain}`;
    }

    const maskedUsername = username[0] + '*'.repeat(username.length - 1);
    return `${maskedUsername}@${domain}`;
  }

  /**
   * 数据脱敏 - 姓名
   *
   * 保留姓，名字用 * 代替
   * 例如：张**
   *
   * @param name 姓名
   * @returns 脱敏后的姓名
   */
  maskName(name: string): string {
    if (!name || name.length === 0) return '**';

    if (name.length === 1) {
      return '*';
    }

    if (name.length === 2) {
      return `${name[0]}*`;
    }

    return name[0] + '*'.repeat(name.length - 1);
  }

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
        result[field] = this.encrypt(result[field] as string) as any;
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
        result[field] = this.decrypt(result[field] as string) as any;
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
    fieldMasks: Record<keyof T, 'phone' | 'email' | 'idCard' | 'bankCard' | 'name'>
  ): T {
    const result: any = { ...obj };

    for (const [field, maskType] of Object.entries(fieldMasks)) {
      if (result[field] && typeof result[field] === 'string') {
        switch (maskType) {
          case 'phone':
            result[field] = this.maskPhone(result[field] as string);
            break;
          case 'email':
            result[field] = this.maskEmail(result[field] as string);
            break;
          case 'idCard':
            result[field] = this.maskIdCard(result[field] as string);
            break;
          case 'bankCard':
            result[field] = this.maskBankCard(result[field] as string);
            break;
          case 'name':
            result[field] = this.maskName(result[field] as string);
            break;
        }
      }
    }

    return result;
  }
}
