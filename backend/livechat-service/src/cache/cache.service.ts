import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async reset(): Promise<void> {
    await this.cacheManager.reset();
  }

  // LiveChat 特定的缓存键
  agentStatusKey(agentId: string): string {
    return `livechat:agent:status:${agentId}`;
  }

  conversationKey(conversationId: string): string {
    return `livechat:conversation:${conversationId}`;
  }

  queuePositionKey(tenantId: string): string {
    return `livechat:queue:position:${tenantId}`;
  }

  userTypingKey(conversationId: string, userId: string): string {
    return `livechat:typing:${conversationId}:${userId}`;
  }

  onlineUsersKey(tenantId: string): string {
    return `livechat:online:users:${tenantId}`;
  }

  onlineAgentsKey(tenantId: string): string {
    return `livechat:online:agents:${tenantId}`;
  }
}
