/**
 * LiveChat 缓存键生成器
 * 统一管理 livechat-service 的所有缓存键
 */
export class LiveChatCacheKeys {
  private static readonly PREFIX = 'livechat';

  /**
   * 客服状态缓存键
   */
  static agentStatusKey(agentId: string): string {
    return `${this.PREFIX}:agent:status:${agentId}`;
  }

  /**
   * 会话缓存键
   */
  static conversationKey(conversationId: string): string {
    return `${this.PREFIX}:conversation:${conversationId}`;
  }

  /**
   * 排队位置缓存键
   */
  static queuePositionKey(tenantId: string): string {
    return `${this.PREFIX}:queue:position:${tenantId}`;
  }

  /**
   * 用户打字状态缓存键
   */
  static userTypingKey(conversationId: string, userId: string): string {
    return `${this.PREFIX}:typing:${conversationId}:${userId}`;
  }

  /**
   * 在线用户集合缓存键
   */
  static onlineUsersKey(tenantId: string): string {
    return `${this.PREFIX}:online:users:${tenantId}`;
  }

  /**
   * 在线客服集合缓存键
   */
  static onlineAgentsKey(tenantId: string): string {
    return `${this.PREFIX}:online:agents:${tenantId}`;
  }
}

/**
 * LiveChat 缓存 TTL 配置（秒）
 */
export const LiveChatCacheTTL = {
  AGENT_STATUS: 3600, // 1 小时
  TYPING_STATUS: 10, // 10 秒
  CONVERSATION: 1800, // 30 分钟
  QUEUE_POSITION: 60, // 1 分钟
} as const;
