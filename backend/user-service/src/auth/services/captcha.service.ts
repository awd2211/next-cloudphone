import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as svgCaptcha from 'svg-captcha';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly redis: Redis;
  private readonly CAPTCHA_EXPIRY = 300; // 5分钟过期

  constructor(private configService: ConfigService) {
    // 初始化 Redis 连接
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: parseInt(this.configService.get('REDIS_PORT') || '6379'),
      password: this.configService.get('REDIS_PASSWORD'),
      db: 0,
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully for captcha');
    });

    this.redis.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });
  }

  /**
   * 生成验证码
   */
  async generate(): Promise<{ id: string; svg: string }> {
    // 生成验证码
    const captcha = svgCaptcha.create({
      size: 4,
      noise: 2,
      color: true,
      background: '#f0f0f0',
      width: 120,
      height: 40,
    });

    // 生成唯一 ID
    const id = uuidv4();

    // 存储到 Redis
    const key = `captcha:${id}`;
    await this.redis.setex(key, this.CAPTCHA_EXPIRY, captcha.text.toLowerCase());

    this.logger.debug(`Captcha generated: ${id}`);

    return {
      id,
      svg: captcha.data,
    };
  }

  /**
   * 验证验证码
   */
  async verify(id: string, code: string): Promise<boolean> {
    const key = `captcha:${id}`;
    const storedCode = await this.redis.get(key);

    if (!storedCode) {
      this.logger.warn(`Captcha expired or not found: ${id}`);
      return false;
    }

    // 验证后删除
    await this.redis.del(key);

    const isValid = storedCode === code.toLowerCase();
    
    if (!isValid) {
      this.logger.warn(`Invalid captcha: ${id}`);
    }

    return isValid;
  }

  /**
   * 清理过期验证码
   */
  async cleanup(): Promise<void> {
    // Redis 的 TTL 会自动清理，这里可以做额外的清理逻辑
    this.logger.log('Captcha cleanup completed');
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}

