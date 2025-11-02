import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * App Service 缓存模块
 *
 * 使用 @Global() 装饰器，使缓存服务在整个应用中可用
 * 无需在每个模块中导入
 *
 * 提供:
 * - CacheService: Redis 缓存服务
 * - 统一的缓存管理和失效策略
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
