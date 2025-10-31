import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

/**
 * OTP 验证码类型
 */
export enum OtpType {
  REGISTRATION = 'registration', // 用户注册
  LOGIN = 'login', // 登录验证
  PASSWORD_RESET = 'password_reset', // 密码重置
  PHONE_VERIFY = 'phone_verify', // 手机号验证
  PAYMENT = 'payment', // 支付确认
  DEVICE_OPERATION = 'device_op', // 设备操作
}

/**
 * OTP 配置
 */
interface OtpConfig {
  length: number; // 验证码长度
  expiryMinutes: number; // 过期时间（分钟）
  maxRetries: number; // 最大重试次数
  resendCooldown: number; // 重发冷却时间（秒）
  rateLimit: number; // 速率限制（每小时）
}

/**
 * 默认配置（根据类型）
 */
const DEFAULT_CONFIGS: Record<OtpType, OtpConfig> = {
  [OtpType.REGISTRATION]: {
    length: 6,
    expiryMinutes: 10,
    maxRetries: 3,
    resendCooldown: 60,
    rateLimit: 5,
  },
  [OtpType.LOGIN]: {
    length: 6,
    expiryMinutes: 5,
    maxRetries: 3,
    resendCooldown: 60,
    rateLimit: 10,
  },
  [OtpType.PASSWORD_RESET]: {
    length: 6,
    expiryMinutes: 15,
    maxRetries: 3,
    resendCooldown: 120,
    rateLimit: 3,
  },
  [OtpType.PHONE_VERIFY]: {
    length: 6,
    expiryMinutes: 10,
    maxRetries: 3,
    resendCooldown: 60,
    rateLimit: 5,
  },
  [OtpType.PAYMENT]: {
    length: 6,
    expiryMinutes: 5,
    maxRetries: 3,
    resendCooldown: 60,
    rateLimit: 10,
  },
  [OtpType.DEVICE_OPERATION]: {
    length: 6,
    expiryMinutes: 10,
    maxRetries: 3,
    resendCooldown: 60,
    rateLimit: 5,
  },
};

/**
 * OTP 验证码管理服务
 *
 * 功能:
 * 1. 生成验证码
 * 2. 发送验证码短信
 * 3. 验证验证码
 * 4. 速率限制
 * 5. 重试次数限制
 * 6. 重发冷却
 *
 * 使用示例:
 * ```typescript
 * // 发送注册验证码
 * await otpService.sendOtp('+1234567890', OtpType.REGISTRATION);
 *
 * // 验证
 * const isValid = await otpService.verifyOtp('+1234567890', '123456', OtpType.REGISTRATION);
 * ```
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly smsService: SmsService,
    private readonly configService: ConfigService
  ) {}

  /**
   * 发送验证码
   */
  async sendOtp(
    phoneNumber: string,
    type: OtpType,
    customMessage?: string
  ): Promise<{ success: boolean; error?: string }> {
    const config = DEFAULT_CONFIGS[type];

    // 1. 检查速率限制
    const rateLimitKey = this.getRateLimitKey(phoneNumber, type);
    const requestCount = await this.redis.incr(rateLimitKey);

    if (requestCount === 1) {
      await this.redis.expire(rateLimitKey, 3600); // 1 小时
    }

    if (requestCount > config.rateLimit) {
      this.logger.warn(`Rate limit exceeded for ${phoneNumber}, type: ${type}`);
      return {
        success: false,
        error: `Too many requests. Maximum ${config.rateLimit} OTP requests per hour.`,
      };
    }

    // 2. 检查重发冷却
    const cooldownKey = this.getCooldownKey(phoneNumber, type);
    const cooldownRemaining = await this.redis.ttl(cooldownKey);

    if (cooldownRemaining > 0) {
      this.logger.warn(
        `Resend cooldown active for ${phoneNumber}, ${cooldownRemaining}s remaining`
      );
      return {
        success: false,
        error: `Please wait ${cooldownRemaining} seconds before requesting a new code.`,
      };
    }

    // 3. 生成验证码
    const code = this.generateOtp(config.length);

    // 4. 存储验证码
    const otpKey = this.getOtpKey(phoneNumber, type);
    const retryKey = this.getRetryKey(phoneNumber, type);

    await this.redis.setex(otpKey, config.expiryMinutes * 60, code);
    await this.redis.setex(retryKey, config.expiryMinutes * 60, config.maxRetries.toString());

    // 5. 设置重发冷却
    await this.redis.setex(cooldownKey, config.resendCooldown, '1');

    // 6. 发送短信
    const message = customMessage || this.buildOtpMessage(code, config.expiryMinutes, type);

    const result = await this.smsService.send({
      to: phoneNumber,
      message,
      isOtp: true,
      validityPeriod: config.expiryMinutes * 60,
    });

    if (!result.success) {
      // 发送失败，删除验证码
      await this.redis.del(otpKey, retryKey, cooldownKey);
      this.logger.error(`Failed to send OTP to ${phoneNumber}: ${result.error}`);
      return {
        success: false,
        error: result.error || 'Failed to send verification code',
      };
    }

    this.logger.log(`OTP sent successfully to ${phoneNumber}, type: ${type}`);
    return { success: true };
  }

  /**
   * 验证验证码
   */
  async verifyOtp(
    phoneNumber: string,
    code: string,
    type: OtpType
  ): Promise<{ valid: boolean; error?: string }> {
    const config = DEFAULT_CONFIGS[type];
    const otpKey = this.getOtpKey(phoneNumber, type);
    const retryKey = this.getRetryKey(phoneNumber, type);

    // 1. 检查重试次数
    const retriesLeft = parseInt((await this.redis.get(retryKey)) || '0');

    if (retriesLeft <= 0) {
      this.logger.warn(`Maximum verification attempts exceeded for ${phoneNumber}`);
      return {
        valid: false,
        error: 'Maximum verification attempts exceeded. Please request a new code.',
      };
    }

    // 2. 获取存储的验证码
    const storedCode = await this.redis.get(otpKey);

    if (!storedCode) {
      this.logger.warn(`OTP expired or not found for ${phoneNumber}`);
      return {
        valid: false,
        error: 'Verification code has expired or does not exist.',
      };
    }

    // 3. 验证验证码
    if (storedCode !== code) {
      // 验证失败，减少重试次数
      await this.redis.decr(retryKey);
      const newRetriesLeft = retriesLeft - 1;

      this.logger.warn(`Invalid OTP for ${phoneNumber}, ${newRetriesLeft} retries left`);

      return {
        valid: false,
        error: `Invalid verification code. ${newRetriesLeft} attempts remaining.`,
      };
    }

    // 4. 验证成功，清除验证码和重试计数
    await this.redis.del(otpKey, retryKey);

    this.logger.log(`OTP verified successfully for ${phoneNumber}, type: ${type}`);
    return { valid: true };
  }

  /**
   * 检查验证码是否存在
   */
  async hasActiveOtp(phoneNumber: string, type: OtpType): Promise<boolean> {
    const otpKey = this.getOtpKey(phoneNumber, type);
    const exists = await this.redis.exists(otpKey);
    return exists === 1;
  }

  /**
   * 获取剩余重试次数
   */
  async getRemainingRetries(phoneNumber: string, type: OtpType): Promise<number> {
    const retryKey = this.getRetryKey(phoneNumber, type);
    const retries = await this.redis.get(retryKey);
    return parseInt(retries || '0');
  }

  /**
   * 获取验证码有效期剩余时间（秒）
   */
  async getRemainingTtl(phoneNumber: string, type: OtpType): Promise<number> {
    const otpKey = this.getOtpKey(phoneNumber, type);
    return await this.redis.ttl(otpKey);
  }

  /**
   * 清除验证码（用于测试或特殊情况）
   */
  async clearOtp(phoneNumber: string, type: OtpType): Promise<void> {
    const otpKey = this.getOtpKey(phoneNumber, type);
    const retryKey = this.getRetryKey(phoneNumber, type);
    const cooldownKey = this.getCooldownKey(phoneNumber, type);

    await this.redis.del(otpKey, retryKey, cooldownKey);
    this.logger.log(`OTP cleared for ${phoneNumber}, type: ${type}`);
  }

  /**
   * 生成随机验证码
   */
  private generateOtp(length: number): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  /**
   * 构建验证码短信内容
   */
  private buildOtpMessage(code: string, expiryMinutes: number, type: OtpType): string {
    const typeMessages = {
      [OtpType.REGISTRATION]: 'Welcome to CloudPhone!',
      [OtpType.LOGIN]: 'CloudPhone Login Verification',
      [OtpType.PASSWORD_RESET]: 'CloudPhone Password Reset',
      [OtpType.PHONE_VERIFY]: 'CloudPhone Phone Verification',
      [OtpType.PAYMENT]: 'CloudPhone Payment Confirmation',
      [OtpType.DEVICE_OPERATION]: 'CloudPhone Device Operation',
    };

    const header = typeMessages[type] || 'CloudPhone Verification';

    return `${header}\n\nYour verification code is: ${code}\n\nThis code will expire in ${expiryMinutes} minutes.\n\nDo not share this code with anyone.`;
  }

  /**
   * Redis 键生成
   */
  private getOtpKey(phoneNumber: string, type: OtpType): string {
    return `otp:${type}:${phoneNumber}`;
  }

  private getRetryKey(phoneNumber: string, type: OtpType): string {
    return `otp:retry:${type}:${phoneNumber}`;
  }

  private getCooldownKey(phoneNumber: string, type: OtpType): string {
    return `otp:cooldown:${type}:${phoneNumber}`;
  }

  private getRateLimitKey(phoneNumber: string, type: OtpType): string {
    return `otp:ratelimit:${type}:${phoneNumber}`;
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    totalActive: number;
    byType: Record<OtpType, number>;
  }> {
    const stats = {
      totalActive: 0,
      byType: {} as Record<OtpType, number>,
    };

    for (const type of Object.values(OtpType)) {
      const pattern = `otp:${type}:*`;
      const keys = await this.redis.keys(pattern);
      stats.byType[type as OtpType] = keys.length;
      stats.totalActive += keys.length;
    }

    return stats;
  }
}
