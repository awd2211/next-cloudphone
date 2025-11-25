import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UnifiedCacheService, UnifiedCacheConfig } from './unified-cache.service';

/**
 * 统一缓存模块
 *
 * 提供两种使用方式:
 *
 * 1. 全局默认配置 (推荐)
 * ```typescript
 * @Module({
 *   imports: [UnifiedCacheModule.forRoot()],
 * })
 * export class AppModule {}
 * ```
 *
 * 2. 自定义配置
 * ```typescript
 * @Module({
 *   imports: [
 *     UnifiedCacheModule.forRoot({
 *       keyPrefix: 'user-service:',
 *       defaultTTL: 600,
 *       enableL1Cache: true,
 *       hotDataPrefixes: ['user:', 'role:'],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * 3. 异步配置 (从配置服务读取)
 * ```typescript
 * @Module({
 *   imports: [
 *     UnifiedCacheModule.forRootAsync({
 *       useFactory: (configService: ConfigService) => ({
 *         keyPrefix: configService.get('CACHE_PREFIX'),
 *         defaultTTL: configService.get('CACHE_TTL', 300),
 *       }),
 *       inject: [ConfigService],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class UnifiedCacheModule {
  /**
   * 同步配置注册
   */
  static forRoot(config?: UnifiedCacheConfig): DynamicModule {
    return {
      module: UnifiedCacheModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'UNIFIED_CACHE_CONFIG',
          useValue: config || {},
        },
        {
          provide: UnifiedCacheService,
          useFactory: (configService, customConfig) => {
            return new UnifiedCacheService(configService, customConfig);
          },
          inject: [ConfigService, 'UNIFIED_CACHE_CONFIG'],
        },
      ],
      exports: [UnifiedCacheService],
    };
  }

  /**
   * 异步配置注册
   */
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<UnifiedCacheConfig> | UnifiedCacheConfig;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    return {
      module: UnifiedCacheModule,
      imports: [...(options.imports || []), ConfigModule],
      providers: [
        {
          provide: 'UNIFIED_CACHE_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: UnifiedCacheService,
          useFactory: (configService, customConfig) => {
            return new UnifiedCacheService(configService, customConfig);
          },
          inject: [ConfigService, 'UNIFIED_CACHE_CONFIG'],
        },
      ],
      exports: [UnifiedCacheService],
    };
  }
}
