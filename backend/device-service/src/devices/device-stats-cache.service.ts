import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Device, DeviceStatus } from '../entities/device.entity';

/**
 * 设备统计缓存服务
 *
 * 使用 Redis 缓存设备统计数据，避免频繁查询数据库
 */
@Injectable()
export class DeviceStatsCacheService {
  private readonly logger = new Logger(DeviceStatsCacheService.name);
  private readonly redis: Redis;

  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private configService: ConfigService
  ) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: parseInt(this.configService.get('REDIS_PORT') || '6379'),
      password: this.configService.get('REDIS_PASSWORD'),
      db: 0, // 使用 DB 0
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected for device stats cache');
    });
  }

  /**
   * 获取在线设备数（带缓存）
   */
  async getOnlineDevicesCount(): Promise<number> {
    const cacheKey = 'stats:devices:online';

    // 从 Redis 获取
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return parseInt(cached);
    }

    // 查询数据库
    const count = await this.deviceRepository.count({
      where: { status: DeviceStatus.RUNNING },
    });

    // 缓存 30 秒（设备状态变化频繁）
    await this.redis.setex(cacheKey, 30, count.toString());

    return count;
  }

  /**
   * 获取设备总数（带缓存）
   */
  async getTotalDevicesCount(): Promise<number> {
    const cacheKey = 'stats:devices:total';

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return parseInt(cached);
    }

    const count = await this.deviceRepository.count();

    // 缓存 5 分钟
    await this.redis.setex(cacheKey, 300, count.toString());

    return count;
  }

  /**
   * 获取用户设备数（带缓存）
   */
  async getUserDevicesCount(userId: string): Promise<number> {
    const cacheKey = `stats:devices:user:${userId}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return parseInt(cached);
    }

    const count = await this.deviceRepository.count({
      where: { userId },
    });

    // 缓存 1 分钟
    await this.redis.setex(cacheKey, 60, count.toString());

    return count;
  }

  /**
   * 清除设备统计缓存
   */
  async clearStats(): Promise<void> {
    const keys = await this.redis.keys('stats:devices:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.log(`Cleared ${keys.length} device stats cache keys`);
    }
  }

  /**
   * 设备状态变化时清除相关缓存
   */
  async invalidateOnStatusChange(deviceId: string, userId: string): Promise<void> {
    await Promise.all([
      this.redis.del('stats:devices:online'),
      this.redis.del(`stats:devices:user:${userId}`),
    ]);
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
