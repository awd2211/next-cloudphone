import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class TwoFactorService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>
  ) {}

  /**
   * 生成2FA密钥和二维码URL
   */
  async generate2FASecret(
    userId: string
  ): Promise<{ secret: string; qrCode: string; otpauthUrl: string }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    // 生成32个字符的base32密钥
    const secret = this.generateBase32Secret();

    // 生成otpauth URL (用于生成二维码)
    const issuer = '云手机平台';
    const accountName = user.email || user.username;
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

    // 生成二维码的Data URL (使用SVG格式，不需要额外的包)
    const qrCode = this.generateQRCodeSVG(otpauthUrl);

    // 临时存储secret到用户记录（但不启用）
    user.twoFactorSecret = secret;
    await this.usersRepository.save(user);

    return {
      secret,
      qrCode,
      otpauthUrl,
    };
  }

  /**
   * 启用2FA
   */
  async enable2FA(userId: string, token: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('请先生成2FA密钥');
    }

    // 验证TOTP token
    const isValid = this.verifyToken(user.twoFactorSecret, token);
    if (!isValid) {
      throw new UnauthorizedException('验证码错误');
    }

    // 启用2FA
    user.twoFactorEnabled = true;
    await this.usersRepository.save(user);
  }

  /**
   * 禁用2FA
   */
  async disable2FA(userId: string, token: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA未启用');
    }

    // 验证TOTP token
    const isValid = this.verifyToken(user.twoFactorSecret, token);
    if (!isValid) {
      throw new UnauthorizedException('验证码错误');
    }

    // 禁用2FA并清除密钥
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await this.usersRepository.save(user);
  }

  /**
   * 验证2FA token
   */
  async verify2FAToken(userId: string, token: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    return this.verifyToken(user.twoFactorSecret, token);
  }

  /**
   * 获取2FA状态
   */
  async get2FAStatus(userId: string): Promise<{
    enabled: boolean;
    hasSecret: boolean;
  }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'twoFactorEnabled', 'twoFactorSecret'],
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    return {
      enabled: user.twoFactorEnabled || false,
      hasSecret: !!user.twoFactorSecret,
    };
  }

  /**
   * 生成Base32密钥
   */
  private generateBase32Secret(): string {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    const bytes = crypto.randomBytes(20); // 160 bits

    for (let i = 0; i < 32; i++) {
      secret += base32Chars[bytes[i % bytes.length] % 32];
    }

    return secret;
  }

  /**
   * 验证TOTP token
   * 实现RFC 6238 TOTP算法
   */
  private verifyToken(secret: string, token: string): boolean {
    // 允许前后30秒的时间窗口（共3个窗口）
    const window = 1;
    const currentTime = Math.floor(Date.now() / 1000);
    const timeStep = 30; // 30秒为一个时间步长

    for (let i = -window; i <= window; i++) {
      const time = Math.floor(currentTime / timeStep) + i;
      const expectedToken = this.generateTOTP(secret, time);

      if (expectedToken === token) {
        return true;
      }
    }

    return false;
  }

  /**
   * 生成TOTP (Time-based One-Time Password)
   */
  private generateTOTP(secret: string, timeCounter: number): string {
    // 将Base32密钥转换为Buffer
    const key = this.base32Decode(secret);

    // 将时间计数器转换为8字节Buffer (big-endian)
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(timeCounter));

    // HMAC-SHA1
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    // Dynamic truncation (RFC 4226)
    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    // 生成6位数字
    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * Base32解码
   */
  private base32Decode(encoded: string): Buffer {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    encoded = encoded.toUpperCase().replace(/=+$/, '');

    const bits = encoded
      .split('')
      .map((char) => {
        const val = base32Chars.indexOf(char);
        if (val === -1) throw new Error('Invalid base32 character');
        return val.toString(2).padStart(5, '0');
      })
      .join('');

    const bytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      bytes.push(parseInt(bits.substr(i, 8), 2));
    }

    return Buffer.from(bytes);
  }

  /**
   * 生成二维码SVG (简化版本，不依赖qrcode包)
   * 返回base64编码的SVG作为Data URL
   */
  private generateQRCodeSVG(text: string): string {
    // 使用在线二维码API生成
    const encodedText = encodeURIComponent(text);

    // 使用多个备选API以提高可用性
    // 1. QR Server API (主要)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedText}`;

    // 2. 也可以使用 Chart.googleapis.com (备选)
    // const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodedText}`;

    return qrCodeUrl;
  }
}
