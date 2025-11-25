import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UnifiedEncryptionService, UnifiedEncryptionConfig } from './unified-encryption.service';

/**
 * 统一加密模块
 *
 * 使用方式:
 *
 * 1. 全局默认配置 (从环境变量 ENCRYPTION_KEY 读取)
 * ```typescript
 * @Module({
 *   imports: [UnifiedEncryptionModule.forRoot()],
 * })
 * export class AppModule {}
 * ```
 *
 * 2. 自定义配置
 * ```typescript
 * @Module({
 *   imports: [
 *     UnifiedEncryptionModule.forRoot({
 *       encryptionKey: 'my-secret-key',
 *       algorithm: EncryptionAlgorithm.AES_256_GCM,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * 3. 异步配置
 * ```typescript
 * @Module({
 *   imports: [
 *     UnifiedEncryptionModule.forRootAsync({
 *       useFactory: (configService: ConfigService) => ({
 *         keyEnvName: 'PAYMENT_ENCRYPTION_KEY',
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
export class UnifiedEncryptionModule {
  /**
   * 同步配置注册
   */
  static forRoot(config?: UnifiedEncryptionConfig): DynamicModule {
    return {
      module: UnifiedEncryptionModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'UNIFIED_ENCRYPTION_CONFIG',
          useValue: config || {},
        },
        {
          provide: UnifiedEncryptionService,
          useFactory: (configService, customConfig) => {
            return new UnifiedEncryptionService(configService, customConfig);
          },
          inject: ['ConfigService', 'UNIFIED_ENCRYPTION_CONFIG'],
        },
      ],
      exports: [UnifiedEncryptionService],
    };
  }

  /**
   * 异步配置注册
   */
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<UnifiedEncryptionConfig> | UnifiedEncryptionConfig;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    return {
      module: UnifiedEncryptionModule,
      imports: [...(options.imports || []), ConfigModule],
      providers: [
        {
          provide: 'UNIFIED_ENCRYPTION_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: UnifiedEncryptionService,
          useFactory: (configService, customConfig) => {
            return new UnifiedEncryptionService(configService, customConfig);
          },
          inject: ['ConfigService', 'UNIFIED_ENCRYPTION_CONFIG'],
        },
      ],
      exports: [UnifiedEncryptionService],
    };
  }
}
