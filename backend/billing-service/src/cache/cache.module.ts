import { Module, Global } from '@nestjs/common';
import { UnifiedCacheModule } from '@cloudphone/shared';

/**
 * 缓存模块 (使用 UnifiedCacheService)
 *
 * 此模块是 UnifiedCacheModule 的简单包装，
 * 提供向后兼容的导出以便渐进式迁移。
 *
 * @example
 * // 新代码应直接使用 UnifiedCacheService
 * import { UnifiedCacheService } from '@cloudphone/shared';
 *
 * constructor(private cache: UnifiedCacheService) {}
 */
@Global()
@Module({
  imports: [
    UnifiedCacheModule.forRoot({
      keyPrefix: 'billing:',
      defaultTTL: 300,
      enableL1Cache: true,
      l1MaxSize: 500,
      l1TTL: 60,
      hotDataPrefixes: ['balance:', 'plan:'],
    }),
  ],
  exports: [UnifiedCacheModule],
})
export class CacheModule {}
