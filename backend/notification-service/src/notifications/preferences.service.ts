import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationPreference,
  NotificationType,
  NotificationChannel,
} from '../entities/notification-preference.entity';
import { DEFAULT_NOTIFICATION_PREFERENCES } from './default-preferences';
import { UnifiedCacheService } from '@cloudphone/shared';
import { CacheKeys, CacheTTL } from '../cache/cache-keys';

/**
 * 通知偏好服务
 *
 * 负责管理用户的通知偏好设置
 * ✅ 使用缓存优化高频查询（偏好很少变动，适合长时间缓存）
 */
@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(
    @InjectRepository(NotificationPreference)
    private readonly preferencesRepository: Repository<NotificationPreference>,
    private readonly cacheService: UnifiedCacheService
  ) {}

  /**
   * 获取用户的所有通知偏好
   * ✅ 使用缓存优化高频查询（5分钟TTL）
   *
   * 如果用户没有设置过偏好，自动创建默认偏好
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.cacheService.wrap(
      CacheKeys.userPreferences(userId),
      async () => {
        let preferences = await this.preferencesRepository.find({
          where: { userId },
          order: { notificationType: 'ASC' },
        });

        // 如果用户没有任何偏好设置，创建默认偏好
        if (preferences.length === 0) {
          this.logger.log(`Creating default preferences for user ${userId}`);
          preferences = await this.createDefaultPreferences(userId);
        }

        return preferences;
      },
      CacheTTL.USER_PREFERENCES // 5 minutes
    );
  }

  /**
   * 获取用户对特定通知类型的偏好
   */
  async getUserPreference(
    userId: string,
    notificationType: NotificationType
  ): Promise<NotificationPreference> {
    let preference = await this.preferencesRepository.findOne({
      where: { userId, notificationType },
    });

    // 如果不存在，使用默认配置创建
    if (!preference) {
      this.logger.log(`Creating default preference for user ${userId}, type ${notificationType}`);
      preference = await this.createSinglePreference(userId, notificationType);
    }

    return preference;
  }

  /**
   * 更新用户的通知偏好
   * ✅ 更新后自动清除相关缓存
   */
  async updateUserPreference(
    userId: string,
    notificationType: NotificationType,
    updates: {
      enabled?: boolean;
      enabledChannels?: NotificationChannel[];
      customSettings?: Record<string, any>;
    }
  ): Promise<NotificationPreference> {
    let preference = await this.preferencesRepository.findOne({
      where: { userId, notificationType },
    });

    if (!preference) {
      // 创建新偏好
      preference = this.preferencesRepository.create({
        userId,
        notificationType,
        ...updates,
      });
    } else {
      // 更新现有偏好
      if (updates.enabled !== undefined) {
        preference.enabled = updates.enabled;
      }
      if (updates.enabledChannels !== undefined) {
        preference.enabledChannels = updates.enabledChannels;
      }
      if (updates.customSettings !== undefined) {
        preference.customSettings = updates.customSettings;
      }
    }

    const saved = await this.preferencesRepository.save(preference);
    this.logger.log(`Updated preference for user ${userId}, type ${notificationType}`);

    // ✅ 清除用户偏好相关缓存
    await this.invalidateUserPreferenceCache(userId);

    return saved;
  }

  /**
   * 批量更新用户偏好
   * ✅ 批量更新后清除缓存（避免多次清除，只在最后清除一次）
   */
  async batchUpdatePreferences(
    userId: string,
    preferences: Array<{
      notificationType: NotificationType;
      enabled?: boolean;
      enabledChannels?: NotificationChannel[];
      customSettings?: Record<string, any>;
    }>
  ): Promise<NotificationPreference[]> {
    const results: NotificationPreference[] = [];

    for (const pref of preferences) {
      // 直接保存，跳过 updateUserPreference() 中的缓存清除
      let preference = await this.preferencesRepository.findOne({
        where: { userId, notificationType: pref.notificationType },
      });

      if (!preference) {
        preference = this.preferencesRepository.create({
          userId,
          notificationType: pref.notificationType,
          enabled: pref.enabled,
          enabledChannels: pref.enabledChannels,
          customSettings: pref.customSettings,
        });
      } else {
        if (pref.enabled !== undefined) {
          preference.enabled = pref.enabled;
        }
        if (pref.enabledChannels !== undefined) {
          preference.enabledChannels = pref.enabledChannels;
        }
        if (pref.customSettings !== undefined) {
          preference.customSettings = pref.customSettings;
        }
      }

      const saved = await this.preferencesRepository.save(preference);
      results.push(saved);
    }

    this.logger.log(`Batch updated ${preferences.length} preferences for user ${userId}`);

    // ✅ 只在最后清除一次缓存
    await this.invalidateUserPreferenceCache(userId);

    return results;
  }

  /**
   * 重置用户偏好为默认设置
   * ✅ 重置后清除缓存
   */
  async resetToDefault(userId: string): Promise<NotificationPreference[]> {
    // 删除所有现有偏好
    await this.preferencesRepository.delete({ userId });

    // 创建默认偏好
    const preferences = await this.createDefaultPreferences(userId);

    this.logger.log(`Reset preferences to default for user ${userId}`);

    // ✅ 清除用户偏好相关缓存
    await this.invalidateUserPreferenceCache(userId);

    return preferences;
  }

  /**
   * 创建用户的默认偏好设置
   */
  private async createDefaultPreferences(userId: string): Promise<NotificationPreference[]> {
    const preferences: NotificationPreference[] = [];

    for (const [type, config] of Object.entries(DEFAULT_NOTIFICATION_PREFERENCES)) {
      const preference = this.preferencesRepository.create({
        userId,
        notificationType: type as NotificationType,
        enabled: config.enabled,
        enabledChannels: config.channels,
      });
      preferences.push(preference);
    }

    return await this.preferencesRepository.save(preferences);
  }

  /**
   * 创建单个默认偏好
   */
  private async createSinglePreference(
    userId: string,
    notificationType: NotificationType
  ): Promise<NotificationPreference> {
    const config = DEFAULT_NOTIFICATION_PREFERENCES[notificationType];

    if (!config) {
      throw new NotFoundException(
        `No default configuration for notification type: ${notificationType}`
      );
    }

    const preference = this.preferencesRepository.create({
      userId,
      notificationType,
      enabled: config.enabled,
      enabledChannels: config.channels,
    });

    return await this.preferencesRepository.save(preference);
  }

  /**
   * 检查用户是否应该接收某类型的通知
   * ✅ 使用缓存优化高频查询（3分钟TTL）
   *
   * 考虑：启用状态、静默时间等
   */
  async shouldReceiveNotification(
    userId: string,
    notificationType: NotificationType,
    channel: NotificationChannel
  ): Promise<boolean> {
    const cacheKey = CacheKeys.channelPreference(userId, `${notificationType}:${channel}`);

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        const preference = await this.getUserPreference(userId, notificationType);

        // 1. 检查是否启用
        if (!preference.enabled) {
          return false;
        }

        // 2. 检查渠道是否启用
        if (!preference.enabledChannels.includes(channel)) {
          return false;
        }

        // 3. 检查静默时间（如果配置了）
        if (preference.customSettings?.quietHours?.enabled) {
          if (this.isInQuietHours(preference.customSettings.quietHours)) {
            // 关键通知即使在静默时间也要发送
            const criticalTypes = [
              NotificationType.DEVICE_ERROR,
              NotificationType.BILLING_LOW_BALANCE,
              NotificationType.BILLING_SUBSCRIPTION_EXPIRED,
              NotificationType.SYSTEM_SECURITY_ALERT,
            ];

            if (!criticalTypes.includes(notificationType)) {
              return false;
            }
          }
        }

        return true;
      },
      CacheTTL.CHANNEL_PREFERENCE // 3 minutes
    );
  }

  /**
   * 检查当前是否在静默时间段
   */
  private isInQuietHours(quietHours: { start: string; end: string; timezone?: string }): boolean {
    try {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const { start, end } = quietHours;

      // 处理跨日情况 (例如 22:00 - 08:00)
      if (start > end) {
        return currentTime >= start || currentTime <= end;
      } else {
        return currentTime >= start && currentTime <= end;
      }
    } catch (error) {
      this.logger.error('Failed to check quiet hours:', error);
      return false;
    }
  }

  /**
   * 获取用户启用某个渠道的所有通知类型
   */
  async getEnabledNotificationTypes(
    userId: string,
    channel: NotificationChannel
  ): Promise<NotificationType[]> {
    const preferences = await this.getUserPreferences(userId);

    return preferences
      .filter((p) => p.enabled && p.enabledChannels.includes(channel))
      .map((p) => p.notificationType);
  }

  /**
   * 统计用户的通知偏好设置
   */
  async getUserPreferenceStats(userId: string): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    byChannel: Record<NotificationChannel, number>;
  }> {
    const preferences = await this.getUserPreferences(userId);

    const stats = {
      total: preferences.length,
      enabled: preferences.filter((p) => p.enabled).length,
      disabled: preferences.filter((p) => !p.enabled).length,
      byChannel: {
        [NotificationChannel.WEBSOCKET]: 0,
        [NotificationChannel.EMAIL]: 0,
        [NotificationChannel.SMS]: 0,
        [NotificationChannel.PUSH]: 0, // 预留推送渠道
      },
    };

    preferences.forEach((p) => {
      if (p.enabled) {
        p.enabledChannels.forEach((channel) => {
          stats.byChannel[channel]++;
        });
      }
    });

    return stats;
  }

  /**
   * 清除用户偏好相关的所有缓存
   * ✅ 私有方法，在更新/删除偏好时调用
   * @private
   */
  private async invalidateUserPreferenceCache(userId: string): Promise<void> {
    try {
      // 清除用户偏好列表缓存
      await this.cacheService.del(CacheKeys.userPreferences(userId));

      // 清除所有频道偏好缓存（模式匹配）
      await this.cacheService.delPattern(`${CacheKeys.channelPreference(userId, '*')}`);

      this.logger.debug(`Invalidated preference cache for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate preference cache for user ${userId}:`, error.message);
    }
  }
}
