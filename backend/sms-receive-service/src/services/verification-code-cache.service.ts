import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { VerificationCodeResult } from './verification-code-extractor.service';
import { MetricsService } from '../health/metrics.service';

/**
 * 缓存的验证码信息
 */
export interface CachedVerificationCode extends VerificationCodeResult {
  phoneNumber: string;
  serviceCode: string;
  receivedAt: Date;
  deviceId?: string;
  consumed: boolean; // 是否已被使用
  consumedAt?: Date;
}

/**
 * 验证码缓存服务
 *
 * 功能：
 * 1. 验证码缓存 - 将提取的验证码缓存到Redis
 * 2. 快速查询 - 按手机号或设备ID快速查询
 * 3. 防重复使用 - 标记已使用的验证码
 * 4. 自动过期 - TTL机制自动清理过期验证码
 * 5. 统计追踪 - 缓存命中率统计
 */
@Injectable()
export class VerificationCodeCacheService {
  private readonly logger = new Logger(VerificationCodeCacheService.name);

  // 缓存TTL（秒）
  private readonly CACHE_TTL = 600; // 10分钟

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * 缓存验证码
   */
  async cacheCode(
    phoneNumber: string,
    serviceCode: string,
    codeResult: VerificationCodeResult,
    deviceId?: string,
  ): Promise<void> {
    const cacheKey = this.getCacheKey(phoneNumber, serviceCode);

    const cachedData: CachedVerificationCode = {
      ...codeResult,
      phoneNumber,
      serviceCode,
      receivedAt: new Date(),
      deviceId,
      consumed: false,
    };

    await this.cacheManager.set(cacheKey, cachedData, this.CACHE_TTL * 1000);

    // 如果有设备ID，也按设备ID缓存
    if (deviceId) {
      const deviceKey = this.getDeviceCacheKey(deviceId);
      await this.cacheManager.set(deviceKey, cachedData, this.CACHE_TTL * 1000);
    }

    this.logger.log(
      `Cached verification code for ${phoneNumber} (service=${serviceCode}, code=${codeResult.code})`,
    );
  }

  /**
   * 获取验证码（按手机号）
   */
  async getCodeByPhone(
    phoneNumber: string,
    serviceCode: string,
  ): Promise<CachedVerificationCode | null> {
    const cacheKey = this.getCacheKey(phoneNumber, serviceCode);
    const cached = await this.cacheManager.get<CachedVerificationCode>(cacheKey);

    if (cached) {
      this.metricsService.recordVerificationCodeCacheHit();
      this.logger.debug(`Cache hit for ${phoneNumber}/${serviceCode}`);
      return cached;
    }

    this.metricsService.recordVerificationCodeCacheMiss();
    this.logger.debug(`Cache miss for ${phoneNumber}/${serviceCode}`);
    return null;
  }

  /**
   * 获取验证码（按设备ID）
   */
  async getCodeByDevice(deviceId: string): Promise<CachedVerificationCode | null> {
    const deviceKey = this.getDeviceCacheKey(deviceId);
    const cached = await this.cacheManager.get<CachedVerificationCode>(deviceKey);

    if (cached) {
      this.metricsService.recordVerificationCodeCacheHit();
      this.logger.debug(`Cache hit for device ${deviceId}`);
      return cached;
    }

    this.metricsService.recordVerificationCodeCacheMiss();
    this.logger.debug(`Cache miss for device ${deviceId}`);
    return null;
  }

  /**
   * 标记验证码已使用
   */
  async markCodeConsumed(phoneNumber: string, serviceCode: string): Promise<boolean> {
    const cacheKey = this.getCacheKey(phoneNumber, serviceCode);
    const cached = await this.cacheManager.get<CachedVerificationCode>(cacheKey);

    if (!cached) {
      this.logger.warn(`Attempted to consume non-existent code for ${phoneNumber}/${serviceCode}`);
      return false;
    }

    if (cached.consumed) {
      this.logger.warn(
        `Attempted to reuse already consumed code for ${phoneNumber}/${serviceCode}`,
      );
      return false;
    }

    cached.consumed = true;
    cached.consumedAt = new Date();

    // 更新缓存（保留到过期）
    await this.cacheManager.set(cacheKey, cached, this.CACHE_TTL * 1000);

    // 同时更新设备缓存
    if (cached.deviceId) {
      const deviceKey = this.getDeviceCacheKey(cached.deviceId);
      await this.cacheManager.set(deviceKey, cached, this.CACHE_TTL * 1000);
    }

    this.logger.log(`Marked code consumed for ${phoneNumber}/${serviceCode}`);
    return true;
  }

  /**
   * 删除验证码缓存
   */
  async deleteCode(phoneNumber: string, serviceCode: string): Promise<void> {
    const cacheKey = this.getCacheKey(phoneNumber, serviceCode);
    const cached = await this.cacheManager.get<CachedVerificationCode>(cacheKey);

    await this.cacheManager.del(cacheKey);

    // 同时删除设备缓存
    if (cached?.deviceId) {
      const deviceKey = this.getDeviceCacheKey(cached.deviceId);
      await this.cacheManager.del(deviceKey);
    }

    this.logger.log(`Deleted code cache for ${phoneNumber}/${serviceCode}`);
  }

  /**
   * 批量查询验证码
   */
  async getMultipleCodes(
    requests: Array<{ phoneNumber: string; serviceCode: string }>,
  ): Promise<Map<string, CachedVerificationCode | null>> {
    const results = new Map<string, CachedVerificationCode | null>();

    for (const req of requests) {
      const key = `${req.phoneNumber}:${req.serviceCode}`;
      const code = await this.getCodeByPhone(req.phoneNumber, req.serviceCode);
      results.set(key, code);
    }

    return results;
  }

  /**
   * 检查验证码是否有效（未使用且未过期）
   */
  async isCodeValid(phoneNumber: string, serviceCode: string, code: string): Promise<boolean> {
    const cached = await this.getCodeByPhone(phoneNumber, serviceCode);

    if (!cached) {
      return false;
    }

    if (cached.consumed) {
      return false;
    }

    if (cached.code !== code) {
      return false;
    }

    return true;
  }

  /**
   * 获取缓存统计
   */
  async getCacheStatistics(): Promise<{
    estimated_size: number;
    hit_rate: string;
  }> {
    // 注意：cache-manager 不直接提供统计信息
    // 这里返回从Prometheus获取的统计
    return {
      estimated_size: 0, // 需要从Redis直接查询
      hit_rate: 'See Prometheus metrics',
    };
  }

  /**
   * 生成缓存键（按手机号）
   */
  private getCacheKey(phoneNumber: string, serviceCode: string): string {
    return `verification_code:${serviceCode}:${phoneNumber}`;
  }

  /**
   * 生成缓存键（按设备ID）
   */
  private getDeviceCacheKey(deviceId: string): string {
    return `verification_code:device:${deviceId}`;
  }

  /**
   * 刷新缓存TTL
   */
  async refreshTTL(phoneNumber: string, serviceCode: string): Promise<boolean> {
    const cached = await this.getCodeByPhone(phoneNumber, serviceCode);

    if (!cached) {
      return false;
    }

    const cacheKey = this.getCacheKey(phoneNumber, serviceCode);
    await this.cacheManager.set(cacheKey, cached, this.CACHE_TTL * 1000);

    if (cached.deviceId) {
      const deviceKey = this.getDeviceCacheKey(cached.deviceId);
      await this.cacheManager.set(deviceKey, cached, this.CACHE_TTL * 1000);
    }

    this.logger.debug(`Refreshed TTL for ${phoneNumber}/${serviceCode}`);
    return true;
  }
}
