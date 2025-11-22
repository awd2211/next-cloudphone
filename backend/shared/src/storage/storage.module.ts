import { Module, Global, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IStorageService } from './storage.interface';
import { LocalFileStorage } from './local-file-storage.service';
import { MinIOStorage } from './minio-storage.service';
import { StorageFactory, StorageType, StorageConfig } from './storage-factory.service';
import { ClusterDetector } from '../cluster/cluster-detector';

/**
 * StorageModule - 多云存储模块
 *
 * 支持的存储类型：
 * - local: 本地文件存储
 * - minio: MinIO (自托管 S3 兼容)
 * - r2: Cloudflare R2 (S3 兼容)
 * - s3: Amazon S3
 * - oss: 阿里云 OSS
 * - cos: 腾讯云 COS
 * - qiniu: 七牛云
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
 * 环境变量控制：
 * - STORAGE_TYPE: 存储类型 (local|minio|r2|s3|oss|cos|qiniu)
 */
@Global()
@Module({})
export class StorageModule {
  /**
   * 动态模块配置
   */
  static forRoot(options?: StorageModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // 提供存储工厂
      StorageFactory,

      // 提供基础实现
      LocalFileStorage,
      MinIOStorage,

      // 工厂模式：根据环境选择实现
      {
        provide: 'STORAGE_SERVICE',
        useFactory: (
          configService: ConfigService,
          storageFactory: StorageFactory,
          localStorage: LocalFileStorage,
          minioStorage: MinIOStorage,
        ): IStorageService => {
          // 优先级 1：显式配置的存储类型
          const storageType = configService.get<string>('STORAGE_TYPE') as StorageType;

          if (storageType && storageType !== 'local' && storageType !== 'minio') {
            // 使用新的存储工厂创建云存储实例
            const config = buildStorageConfigFromEnv(configService, storageType);
            console.log(`✅ Storage: ${storageType.toUpperCase()} (explicitly configured)`);
            return storageFactory.create(config);
          }

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
        inject: [ConfigService, StorageFactory, LocalFileStorage, MinIOStorage],
      },
    ];

    return {
      module: StorageModule,
      global: true,
      imports: [ConfigModule],
      providers,
      exports: ['STORAGE_SERVICE', StorageFactory],
    };
  }
}

/**
 * 从环境变量构建存储配置
 */
function buildStorageConfigFromEnv(
  configService: ConfigService,
  type: StorageType,
): StorageConfig {
  const config: StorageConfig = { type };

  switch (type) {
    case 'r2':
      config.r2AccountId = configService.get<string>('R2_ACCOUNT_ID');
      config.r2Bucket = configService.get<string>('R2_BUCKET');
      config.r2AccessKeyId = configService.get<string>('R2_ACCESS_KEY_ID');
      config.r2SecretAccessKey = configService.get<string>('R2_SECRET_ACCESS_KEY');
      config.r2CustomDomain = configService.get<string>('R2_CUSTOM_DOMAIN');
      config.r2PublicAccess = configService.get<string>('R2_PUBLIC_ACCESS') === 'true';
      break;

    case 's3':
      config.s3Region = configService.get<string>('S3_REGION');
      config.s3Bucket = configService.get<string>('S3_BUCKET');
      config.s3AccessKeyId = configService.get<string>('S3_ACCESS_KEY_ID');
      config.s3SecretAccessKey = configService.get<string>('S3_SECRET_ACCESS_KEY');
      break;

    case 'oss':
      config.ossEndpoint = configService.get<string>('OSS_ENDPOINT');
      config.ossBucket = configService.get<string>('OSS_BUCKET');
      config.ossAccessKeyId = configService.get<string>('OSS_ACCESS_KEY_ID');
      config.ossAccessKeySecret = configService.get<string>('OSS_ACCESS_KEY_SECRET');
      break;

    case 'cos':
      config.cosRegion = configService.get<string>('COS_REGION');
      config.cosBucket = configService.get<string>('COS_BUCKET');
      config.cosSecretId = configService.get<string>('COS_SECRET_ID');
      config.cosSecretKey = configService.get<string>('COS_SECRET_KEY');
      break;

    case 'qiniu':
      config.qiniuBucket = configService.get<string>('QINIU_BUCKET');
      config.qiniuAccessKey = configService.get<string>('QINIU_ACCESS_KEY');
      config.qiniuSecretKey = configService.get<string>('QINIU_SECRET_KEY');
      config.qiniuDomain = configService.get<string>('QINIU_DOMAIN');
      break;
  }

  return config;
}

/**
 * StorageModule 配置选项
 */
export interface StorageModuleOptions {
  /**
   * 强制使用指定的存储类型（覆盖自动检测）
   */
  storageType?: StorageType;

  /**
   * 本地存储的基础路径
   */
  localStoragePath?: string;

  /**
   * MinIO 配置
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
