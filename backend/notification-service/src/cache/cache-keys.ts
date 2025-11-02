/**
 * 缓存键生成器 (Notification Service)
 * 统一管理所有缓存键的命名规则
 */
export class CacheKeys {
  private static readonly PREFIX = 'notification-service';

  // ========== 通知模板相关 ==========

  /**
   * 通知模板详情缓存键
   * @param templateId 模板 ID
   */
  static template(templateId: string): string {
    return `${this.PREFIX}:template:${templateId}`;
  }

  /**
   * 通知模板列表缓存键
   * @param type 模板类型（可选）
   */
  static templateList(type?: string): string {
    const typePart = type || 'all';
    return `${this.PREFIX}:template:list:${typePart}`;
  }

  /**
   * 清除所有模板缓存
   */
  static templatePattern(): string {
    return `${this.PREFIX}:template:*`;
  }

  // ========== 用户通知相关 ==========

  /**
   * 用户未读通知计数缓存键
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
  static notificationList(
    userId: string,
    isRead?: boolean,
    page: number = 1,
    limit: number = 10
  ): string {
    const readPart = isRead === undefined ? 'all' : isRead ? 'read' : 'unread';
    return `${this.PREFIX}:notifications:${userId}:${readPart}:${page}:${limit}`;
  }

  /**
   * 通知详情缓存键
   * @param notificationId 通知 ID
   */
  static notification(notificationId: string): string {
    return `${this.PREFIX}:notification:${notificationId}`;
  }

  /**
   * 清除用户通知相关的所有缓存
   * @param userId 用户 ID
   */
  static userNotificationPattern(userId: string): string {
    return `${this.PREFIX}:*:${userId}:*`;
  }

  // ========== 用户偏好设置相关 ==========

  /**
   * 用户通知偏好设置缓存键
   * @param userId 用户 ID
   */
  static userPreferences(userId: string): string {
    return `${this.PREFIX}:preferences:${userId}`;
  }

  /**
   * 用户频道偏好设置缓存键
   * @param userId 用户 ID
   * @param channel 通知频道 (email, sms, websocket)
   */
  static channelPreference(userId: string, channel: string): string {
    return `${this.PREFIX}:preferences:${userId}:${channel}`;
  }

  // ========== 统计相关 ==========

  /**
   * 用户通知统计缓存键
   * @param userId 用户 ID
   */
  static userStats(userId: string): string {
    return `${this.PREFIX}:stats:${userId}`;
  }

  /**
   * 全局通知统计缓存键
   * @param type 统计类型 (sent, delivered, failed)
   */
  static globalStats(type: string): string {
    return `${this.PREFIX}:stats:global:${type}`;
  }

  // ========== WebSocket 连接相关 ==========

  /**
   * 用户 WebSocket 连接状态缓存键
   * @param userId 用户 ID
   */
  static wsConnection(userId: string): string {
    return `${this.PREFIX}:ws:connection:${userId}`;
  }

  /**
   * WebSocket 在线用户列表缓存键
   */
  static wsOnlineUsers(): string {
    return `${this.PREFIX}:ws:online`;
  }
}

/**
 * 缓存 TTL 配置（秒）
 */
export const CacheTTL = {
  // 模板相关 - 长时间缓存（模板很少变动）
  TEMPLATE: 3600, // 模板详情: 1小时
  TEMPLATE_LIST: 1800, // 模板列表: 30分钟

  // 通知相关 - 短时间缓存（频繁变动）
  UNREAD_COUNT: 60, // 未读计数: 1分钟
  NOTIFICATION_LIST: 120, // 通知列表: 2分钟
  NOTIFICATION: 300, // 通知详情: 5分钟

  // 用户偏好 - 中等时间缓存（偶尔变动）
  USER_PREFERENCES: 300, // 用户偏好: 5分钟
  CHANNEL_PREFERENCE: 180, // 频道偏好: 3分钟

  // 统计数据 - 中等时间缓存
  USER_STATS: 180, // 用户统计: 3分钟
  GLOBAL_STATS: 600, // 全局统计: 10分钟

  // WebSocket 连接 - 短时间缓存
  WS_CONNECTION: 300, // 连接状态: 5分钟
  WS_ONLINE_USERS: 60, // 在线用户: 1分钟
} as const;
