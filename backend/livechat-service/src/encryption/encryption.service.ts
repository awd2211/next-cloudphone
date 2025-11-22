import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';

export interface EncryptedData {
  encrypted: string;
  iv: string;
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly enabled: boolean;
  private readonly key: string;
  private readonly algorithm: string;

  constructor(private configService: ConfigService) {
    this.enabled = configService.get('ENCRYPTION_ENABLED', true);
    this.key = configService.get('ENCRYPTION_KEY', 'your-32-character-encryption-key!');
    this.algorithm = configService.get('ENCRYPTION_ALGORITHM', 'aes-256-gcm');

    if (this.enabled && this.key.length < 32) {
      this.logger.warn('Encryption key should be at least 32 characters for AES-256');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  encrypt(plaintext: string): EncryptedData {
    if (!this.enabled) {
      return { encrypted: plaintext, iv: '' };
    }

    try {
      // 使用 AES 加密
      const iv = CryptoJS.lib.WordArray.random(16).toString();
      const encrypted = CryptoJS.AES.encrypt(plaintext, this.key, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }).toString();

      return { encrypted, iv };
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`);
      throw error;
    }
  }

  decrypt(encryptedData: string, iv?: string): string {
    if (!this.enabled || !encryptedData) {
      return encryptedData;
    }

    try {
      // 尝试解密
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.key, {
        iv: iv ? CryptoJS.enc.Hex.parse(iv) : undefined,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`);
      throw error;
    }
  }

  // 用于敏感数据的哈希（如密码存储）
  hash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  // 生成随机 token
  generateToken(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString();
  }
}
