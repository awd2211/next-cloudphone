import { Module, Global } from '@nestjs/common';
import { UnifiedCacheModule } from '@cloudphone/shared';

/**
 * App Service 缓存模块
 *
 * 使用 @Global() 装饰器，使缓存服务在整个应用中可用
 * 无需在每个模块中导入
 *
 * 已迁移至 @cloudphone/shared 的 UnifiedCacheService
 * 提供两层缓存（L1 内存 + L2 Redis）架构
 */
@Global()
@Module({
  imports: [
    UnifiedCacheModule.forRoot({
      keyPrefix: 'app:',
      defaultTTL: 300,
      enableL1Cache: true,
      l1MaxSize: 500,
      l1TTL: 60,
      hotDataPrefixes: ['app:', 'version:'],
    }),
  ],
  exports: [UnifiedCacheModule],
})
export class CacheModule {}
