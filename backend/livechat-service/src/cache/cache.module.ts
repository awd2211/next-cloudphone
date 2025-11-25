import { Global, Module } from '@nestjs/common';
import { UnifiedCacheModule } from '@cloudphone/shared';

/**
 * LiveChat Service 缓存模块
 *
 * 已迁移至 @cloudphone/shared 的 UnifiedCacheService
 * 提供两层缓存（L1 内存 + L2 Redis）架构
 *
 * 缓存键生成器迁移至 cache-keys.ts 的 LiveChatCacheKeys
 */
@Global()
@Module({
  imports: [
    UnifiedCacheModule.forRoot({
      keyPrefix: 'livechat:',
      defaultTTL: 300,
      enableL1Cache: true,
      l1MaxSize: 500,
      l1TTL: 60,
      hotDataPrefixes: ['agent:', 'conversation:'],
    }),
  ],
  exports: [UnifiedCacheModule],
})
export class CacheModule {}
