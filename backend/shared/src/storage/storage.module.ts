import { Module, Global, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IStorageService } from './storage.interface';
import { LocalFileStorage } from './local-file-storage.service';
import { MinIOStorage } from './minio-storage.service';
import { ClusterDetector } from '../cluster/cluster-detector';

/**
 * StorageModule - 自动切换存储实现的动态模块
 *
 * 用途：根据运行环境自动选择存储实现
 * - 本地开发：使用 LocalFileStorage（存储到 /tmp）
 * - K8s 集群：使用 MinIOStorage（存储到 MinIO 对象存储）
 *
 * 使用方法：
 * ```typescript
 * // app.module.ts
 * @Module({
 *   imports: [
 *     StorageModule.forRoot(),
 *   ],
 * })
 * export class AppModule {}
 *
 * // service.ts
 * constructor(
 *   @Inject('STORAGE_SERVICE')
 *   private readonly storageService: IStorageService,
 * ) {}
 * ```
 *
 * 环境变量控制（可选）：
 * - STORAGE_TYPE: 'local' | 'minio'（强制指定存储类型，覆盖自动检测）
 */
@Global()
@Module({})
export class StorageModule {
  /**
   * 动态模块配置
   *
   * @param options - 可选配置项
   * @returns 动态模块
   */
  static forRoot(options?: StorageModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // 提供 LocalFileStorage 实现
      LocalFileStorage,

      // 提供 MinIOStorage 实现
      MinIOStorage,

      // 工厂模式：根据环境选择实现
      {
        provide: 'STORAGE_SERVICE',
        useFactory: (
          configService: ConfigService,
          localStorage: LocalFileStorage,
          minioStorage: MinIOStorage,
        ): IStorageService => {
          // 优先级 1：显式配置
          const storageType = configService.get<string>('STORAGE_TYPE');
          if (storageType === 'minio') {
            console.log('✅ Storage: MinIO (explicitly configured)');
            return minioStorage;
          }
          if (storageType === 'local') {
            console.log('✅ Storage: LocalFileStorage (explicitly configured)');
            return localStorage;
          }

          // 优先级 2：自动检测环境
          if (ClusterDetector.isClusterMode()) {
            console.log(
              `✅ Storage: MinIO (auto-detected ${ClusterDetector.getEnvironmentName()})`,
            );
            return minioStorage;
          }

          // 默认：本地文件存储
          console.log('✅ Storage: LocalFileStorage (local development)');
          return localStorage;
        },
        inject: [ConfigService, LocalFileStorage, MinIOStorage],
      },
    ];

    return {
      module: StorageModule,
      global: true,
      imports: [ConfigModule],
      providers,
      exports: ['STORAGE_SERVICE'],
    };
  }
}

/**
 * StorageModule 配置选项（未来扩展）
 */
export interface StorageModuleOptions {
  /**
   * 强制使用指定的存储类型（覆盖自动检测）
   */
  storageType?: 'local' | 'minio';

  /**
   * 本地存储的基础路径（仅 LocalFileStorage 使用）
   */
  localStoragePath?: string;

  /**
   * MinIO 配置（仅 MinIOStorage 使用）
   */
  minioConfig?: {
    endpoint?: string;
    port?: number;
    accessKey?: string;
    secretKey?: string;
    bucket?: string;
    useSSL?: boolean;
  };
}
