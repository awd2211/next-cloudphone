import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationPreference,
  NotificationType,
  NotificationChannel,
} from '../entities/notification-preference.entity';
import { DEFAULT_NOTIFICATION_PREFERENCES } from './default-preferences';

/**
 * 通知偏好服务
 *
 * 负责管理用户的通知偏好设置
 */
@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(
    @InjectRepository(NotificationPreference)
    private readonly preferencesRepository: Repository<NotificationPreference>
  ) {}

  /**
   * 获取用户的所有通知偏好
   *
   * 如果用户没有设置过偏好，自动创建默认偏好
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
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

    return saved;
  }

  /**
   * 批量更新用户偏好
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
      const result = await this.updateUserPreference(userId, pref.notificationType, {
        enabled: pref.enabled,
        enabledChannels: pref.enabledChannels,
        customSettings: pref.customSettings,
      });
      results.push(result);
    }

    this.logger.log(`Batch updated ${preferences.length} preferences for user ${userId}`);

    return results;
  }

  /**
   * 重置用户偏好为默认设置
   */
  async resetToDefault(userId: string): Promise<NotificationPreference[]> {
    // 删除所有现有偏好
    await this.preferencesRepository.delete({ userId });

    // 创建默认偏好
    const preferences = await this.createDefaultPreferences(userId);

    this.logger.log(`Reset preferences to default for user ${userId}`);

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
   *
   * 考虑：启用状态、静默时间等
   */
  async shouldReceiveNotification(
    userId: string,
    notificationType: NotificationType,
    channel: NotificationChannel
  ): Promise<boolean> {
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
}
