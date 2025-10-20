import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as svgCaptcha from 'svg-captcha';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly redis: Redis;
  private readonly CAPTCHA_PREFIX = 'captcha:';
  private readonly CAPTCHA_EXPIRE = 300; // 5 minutes in seconds

  constructor(private configService: ConfigService) {
    // 初始化 Redis 连接
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 0),
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });
  }

  /**
   * 生成验证码
   */
  async generateCaptcha(): Promise<{ id: string; svg: string }> {
    // 生成验证码
    const captcha = svgCaptcha.create({
      size: 4, // 验证码长度
      ignoreChars: '0oO1ilI', // 排除容易混淆的字符
      noise: 2, // 干扰线数量
      color: true, // 使用彩色字符
      background: '#f0f0f0', // 背景颜色
      width: 120,
      height: 40,
    });

    // 生成唯一 ID
    const captchaId = uuidv4();

    // 存储验证码到 Redis（不区分大小写）
    const key = `${this.CAPTCHA_PREFIX}${captchaId}`;
    await this.redis.setex(key, this.CAPTCHA_EXPIRE, captcha.text.toLowerCase());

    this.logger.log(`Generated captcha: ${captchaId}`);

    return {
      id: captchaId,
      svg: captcha.data,
    };
  }

  /**
   * 验证验证码
   */
  async verifyCaptcha(captchaId: string, userInput: string): Promise<boolean> {
    if (!captchaId || !userInput) {
      return false;
    }

    const key = `${this.CAPTCHA_PREFIX}${captchaId}`;

    try {
      // 从 Redis 获取验证码
      const storedCaptcha = await this.redis.get(key);

      if (!storedCaptcha) {
        this.logger.warn(`Captcha not found or expired: ${captchaId}`);
        return false;
      }

      // 验证码匹配（不区分大小写）
      const isValid = storedCaptcha === userInput.toLowerCase();

      if (isValid) {
        // 验证成功后删除验证码（一次性使用）
        await this.redis.del(key);
        this.logger.log(`Captcha verified successfully: ${captchaId}`);
      } else {
        this.logger.warn(`Invalid captcha input: ${captchaId}`);
      }

      return isValid;
    } catch (error) {
      this.logger.error(`Error verifying captcha: ${error.message}`);
      return false;
    }
  }

  /**
   * 删除验证码
   */
  async deleteCaptcha(captchaId: string): Promise<void> {
    const key = `${this.CAPTCHA_PREFIX}${captchaId}`;
    await this.redis.del(key);
  }

  /**
   * 清理所有过期验证码（定时任务可调用）
   */
  async cleanupExpiredCaptchas(): Promise<void> {
    // Redis 的 SETEX 会自动过期，这里仅作为手动清理接口
    const keys = await this.redis.keys(`${this.CAPTCHA_PREFIX}*`);
    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl <= 0) {
        await this.redis.del(key);
      }
    }
    this.logger.log('Cleaned up expired captchas');
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
