import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * 加密服务
 *
 * 用于加密/解密支付配置中的敏感信息（API 密钥、私钥等）
 * 使用 AES-256-GCM 加密算法
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16;  // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    // 从环境变量获取加密密钥，如果不存在则生成一个
    const keyString = this.configService.get<string>('PAYMENT_CONFIG_ENCRYPTION_KEY');

    if (keyString) {
      // 使用 SHA-256 将任意长度的密钥转换为 32 字节
      this.encryptionKey = crypto
        .createHash('sha256')
        .update(keyString)
        .digest();
    } else {
      // 开发环境使用默认密钥（生产环境必须配置）
      this.logger.warn(
        '⚠️ PAYMENT_CONFIG_ENCRYPTION_KEY 未配置，使用默认密钥（仅限开发环境）'
      );
      this.encryptionKey = crypto
        .createHash('sha256')
        .update('default-dev-encryption-key-do-not-use-in-production')
        .digest();
    }
  }

  /**
   * 加密敏感数据
   *
   * @param plaintext 明文
   * @returns 加密后的字符串 (格式: iv:tag:ciphertext，base64 编码)
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return '';

    try {
      // 生成随机 IV
      const iv = crypto.randomBytes(this.ivLength);

      // 创建加密器
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      // 加密
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // 获取认证标签
      const tag = cipher.getAuthTag();

      // 组合结果: iv:tag:ciphertext
      const result = [
        iv.toString('base64'),
        tag.toString('base64'),
        encrypted,
      ].join(':');

      return result;
    } catch (error) {
      this.logger.error('加密失败', error);
      throw new Error('加密失败');
    }
  }

  /**
   * 解密敏感数据
   *
   * @param encryptedText 加密文本 (格式: iv:tag:ciphertext)
   * @returns 解密后的明文
   */
  decrypt(encryptedText: string): string {
    if (!encryptedText) return '';

    try {
      // 解析加密数据
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('加密数据格式错误');
      }

      const [ivBase64, tagBase64, ciphertext] = parts;
      const iv = Buffer.from(ivBase64, 'base64');
      const tag = Buffer.from(tagBase64, 'base64');

      // 创建解密器
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);

      // 解密
      let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('解密失败', error);
      throw new Error('解密失败');
    }
  }

  /**
   * 掩码敏感信息（用于日志和显示）
   *
   * @param text 原始文本
   * @param visibleChars 可见字符数（前后各显示几个字符）
   * @returns 掩码后的文本，如 "sk_test_****1234"
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

  /**
   * 验证加密密钥是否已配置（生产环境检查）
   */
  isKeyConfigured(): boolean {
    return !!this.configService.get<string>('PAYMENT_CONFIG_ENCRYPTION_KEY');
  }
}
