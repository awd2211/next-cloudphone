import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class TwoFactorService {
  /**
   * 生成2FA密钥和二维码
   */
  async generateSecret(username: string, appName: string = '云手机平台') {
    const secret = speakeasy.generateSecret({
      name: `${appName} (${username})`,
      length: 32,
    });

    // 生成QR码的data URL
    const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url as string);

    return {
      secret: secret.base32,
      qrCode: qrCodeDataURL,
      otpauthUrl: secret.otpauth_url,
    };
  }

  /**
   * 验证TOTP代码
   */
  verifyToken(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // 允许前后2个时间窗口，提高容错性
    });
  }

  /**
   * 生成备用恢复码（可选功能）
   */
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }
}
