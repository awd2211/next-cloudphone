/**
 * 缓存键生成器
 * 统一管理所有缓存键的命名规则
 */
export class CacheKeys {
  private static readonly PREFIX = 'notification-service';

  /**
   * 通知模板缓存键
   * @param templateId 模板 ID
   */
  static template(templateId: string): string {
    return `${this.PREFIX}:template:${templateId}`;
  }

  /**
   * 模板列表缓存键
   * @param type 模板类型（可选）
   * @param channel 通知渠道（可选）
   * @param page 页码
   * @param limit 每页数量
   */
  static templateList(type?: string, channel?: string, page: number = 1, limit: number = 10): string {
    const typePart = type || 'all';
    const channelPart = channel || 'all';
    return `${this.PREFIX}:template:list:${typePart}:${channelPart}:${page}:${limit}`;
  }

  /**
   * 用户未读通知数量缓存键
   * @param userId 用户 ID
   */
  static unreadCount(userId: string): string {
    return `${this.PREFIX}:unread:${userId}`;
  }

  /**
   * 用户通知列表缓存键
   * @param userId 用户 ID
   * @param isRead 是否已读（可选）
   * @param page 页码
   * @param limit 每页数量
   */
  static notificationList(userId: string, isRead?: boolean, page: number = 1, limit: number = 10): string {
    const readPart = isRead === undefined ? 'all' : isRead ? 'read' : 'unread';
    return `${this.PREFIX}:notification:list:${userId}:${readPart}:${page}:${limit}`;
  }

  /**
   * 用户通知偏好设置缓存键
   * @param userId 用户 ID
   */
  static userPreferences(userId: string): string {
    return `${this.PREFIX}:preferences:${userId}`;
  }

  /**
   * 通知类型偏好设置缓存键
   * @param userId 用户 ID
   * @param notificationType 通知类型
   */
  static typePreference(userId: string, notificationType: string): string {
    return `${this.PREFIX}:preferences:${userId}:${notificationType}`;
  }

  /**
   * 通知渠道偏好设置缓存键
   * @param userId 用户 ID
   * @param key 组合键（如 "notificationType:channel"）
   */
  static channelPreference(userId: string, key: string): string {
    return `${this.PREFIX}:preferences:${userId}:channel:${key}`;
  }

  /**
   * 全局统计信息缓存键
   * @param statType 统计类型（如 "all", "daily", "monthly"）
   */
  static globalStats(statType: string): string {
    return `${this.PREFIX}:stats:global:${statType}`;
  }

  /**
   * 获取用户相关的所有通知列表缓存键模式
   * @param userId 用户 ID
   */
  static userNotificationListPattern(userId: string): string {
    return `${this.PREFIX}:notification:list:${userId}:*`;
  }

  /**
   * 获取用户相关的所有通知缓存键模式（别名）
   * @param userId 用户 ID
   */
  static userNotificationPattern(userId: string): string {
    return this.userNotificationListPattern(userId);
  }

  /**
   * 获取所有模板列表缓存键模式
   */
  static allTemplateListsPattern(): string {
    return `${this.PREFIX}:template:list:*`;
  }

  /**
   * 获取所有模板缓存键模式
   */
  static templatePattern(): string {
    return `${this.PREFIX}:template:*`;
  }

  /**
   * 获取用户相关的所有缓存键模式
   * @param userId 用户 ID
   */
  static userPattern(userId: string): string {
    return `${this.PREFIX}:*:${userId}*`;
  }
}

/**
 * 缓存 TTL 配置（秒）
 */
export const CacheTTL = {
  TEMPLATE: 600, // 模板详情: 10 分钟
  TEMPLATE_LIST: 300, // 模板列表: 5 分钟
  UNREAD_COUNT: 30, // 未读数量: 30 秒
  NOTIFICATION_LIST: 60, // 通知列表: 1 分钟
  USER_PREFERENCES: 300, // 用户偏好: 5 分钟
  TYPE_PREFERENCE: 300, // 类型偏好: 5 分钟
  CHANNEL_PREFERENCE: 180, // 渠道偏好: 3 分钟
  GLOBAL_STATS: 600, // 全局统计: 10 分钟
} as const;
