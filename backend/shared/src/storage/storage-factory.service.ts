import { Injectable, Logger } from '@nestjs/common';
import { IStorageService } from './storage.interface';
import { LocalFileStorage } from './local-file-storage.service';
import { MinIOStorage } from './minio-storage.service';
import {
  S3CompatibleStorage,
  S3CompatibleStorageConfig,
} from './s3-compatible-storage.service';
import {
  AliyunOSSStorage,
  AliyunOSSStorageConfig,
} from './aliyun-oss-storage.service';
import {
  TencentCOSStorage,
  TencentCOSStorageConfig,
} from './tencent-cos-storage.service';
import { QiniuStorage, QiniuStorageConfig } from './qiniu-storage.service';

/**
 * 存储类型枚举
 */
export type StorageType =
  | 'local'
  | 'minio'
  | 'r2'
  | 's3'
  | 'oss'
  | 'cos'
  | 'qiniu';

/**
 * 统一存储配置接口
 */
export interface StorageConfig {
  type: StorageType;

  // 本地存储配置
  localPath?: string;
  localUrlPrefix?: string;

  // MinIO 配置
  minioEndpoint?: string;
  minioBucket?: string;
  minioAccessKey?: string;
  minioSecretKey?: string;
  minioUseSSL?: boolean;

  // Cloudflare R2 配置
  r2AccountId?: string;
  r2Bucket?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;
  r2CustomDomain?: string;
  r2PublicAccess?: boolean;

  // Amazon S3 配置
  s3Region?: string;
  s3Bucket?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;

  // 阿里云 OSS 配置
  ossEndpoint?: string;
  ossBucket?: string;
  ossAccessKeyId?: string;
  ossAccessKeySecret?: string;

  // 腾讯云 COS 配置
  cosRegion?: string;
  cosBucket?: string;
  cosSecretId?: string;
  cosSecretKey?: string;

  // 七牛云配置
  qiniuBucket?: string;
  qiniuAccessKey?: string;
  qiniuSecretKey?: string;
  qiniuDomain?: string;

  // 通用配置
  maxUploadSize?: number; // MB
}

/**
 * StorageFactory - 存储服务工厂
 *
 * 用途：根据配置动态创建存储服务实例
 *
 * 支持的存储类型：
 * - local: 本地文件存储
 * - minio: MinIO (自托管 S3 兼容)
 * - r2: Cloudflare R2 (S3 兼容)
 * - s3: Amazon S3
 * - oss: 阿里云 OSS
 * - cos: 腾讯云 COS
 * - qiniu: 七牛云
 */
@Injectable()
export class StorageFactory {
  private readonly logger = new Logger(StorageFactory.name);

  /**
   * 根据配置创建存储服务实例
   */
  create(config: StorageConfig): IStorageService {
    this.logger.log(`Creating storage service: ${config.type}`);

    switch (config.type) {
      case 'local':
        return this.createLocalStorage(config);

      case 'minio':
        return this.createMinIOStorage(config);

      case 'r2':
        return this.createR2Storage(config);

      case 's3':
        return this.createS3Storage(config);

      case 'oss':
        return this.createOSSStorage(config);

      case 'cos':
        return this.createCOSStorage(config);

      case 'qiniu':
        return this.createQiniuStorage(config);

      default:
        throw new Error(`Unsupported storage type: ${config.type}`);
    }
  }

  /**
   * 创建本地存储
   */
  private createLocalStorage(config: StorageConfig): IStorageService {
    // 设置环境变量供 LocalFileStorage 使用
    if (config.localPath) {
      process.env.LOCAL_STORAGE_PATH = config.localPath;
    }

    return new LocalFileStorage();
  }

  /**
   * 创建 MinIO 存储
   */
  private createMinIOStorage(config: StorageConfig): IStorageService {
    // 设置环境变量供 MinIOStorage 使用
    if (config.minioEndpoint) {
      process.env.MINIO_ENDPOINT = config.minioEndpoint;
    }
    if (config.minioBucket) {
      process.env.MINIO_BUCKET = config.minioBucket;
    }
    if (config.minioAccessKey) {
      process.env.MINIO_ACCESS_KEY = config.minioAccessKey;
    }
    if (config.minioSecretKey) {
      process.env.MINIO_SECRET_KEY = config.minioSecretKey;
    }
    if (config.minioUseSSL !== undefined) {
      process.env.MINIO_USE_SSL = config.minioUseSSL.toString();
    }

    // MinIOStorage 使用 ConfigService，需要单独处理
    // 这里我们使用 S3CompatibleStorage 作为替代
    const s3Config: S3CompatibleStorageConfig = {
      type: 's3',
      endpoint: `http${config.minioUseSSL ? 's' : ''}://${config.minioEndpoint}`,
      accessKeyId: config.minioAccessKey || 'minioadmin',
      secretAccessKey: config.minioSecretKey || 'minioadmin',
      bucket: config.minioBucket || 'cloudphone',
      region: 'us-east-1',
    };

    return new S3CompatibleStorage(s3Config);
  }

  /**
   * 创建 Cloudflare R2 存储
   */
  private createR2Storage(config: StorageConfig): IStorageService {
    if (!config.r2AccountId || !config.r2Bucket || !config.r2AccessKeyId || !config.r2SecretAccessKey) {
      throw new Error('Missing required R2 configuration');
    }

    const r2Config: S3CompatibleStorageConfig = {
      type: 'r2',
      accountId: config.r2AccountId,
      bucket: config.r2Bucket,
      accessKeyId: config.r2AccessKeyId,
      secretAccessKey: config.r2SecretAccessKey,
      customDomain: config.r2CustomDomain,
      publicAccess: config.r2PublicAccess,
    };

    return new S3CompatibleStorage(r2Config);
  }

  /**
   * 创建 Amazon S3 存储
   */
  private createS3Storage(config: StorageConfig): IStorageService {
    if (!config.s3Region || !config.s3Bucket || !config.s3AccessKeyId || !config.s3SecretAccessKey) {
      throw new Error('Missing required S3 configuration');
    }

    const s3Config: S3CompatibleStorageConfig = {
      type: 's3',
      region: config.s3Region,
      bucket: config.s3Bucket,
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretAccessKey,
    };

    return new S3CompatibleStorage(s3Config);
  }

  /**
   * 创建阿里云 OSS 存储
   */
  private createOSSStorage(config: StorageConfig): IStorageService {
    if (!config.ossEndpoint || !config.ossBucket || !config.ossAccessKeyId || !config.ossAccessKeySecret) {
      throw new Error('Missing required OSS configuration');
    }

    const ossConfig: AliyunOSSStorageConfig = {
      endpoint: config.ossEndpoint,
      bucket: config.ossBucket,
      accessKeyId: config.ossAccessKeyId,
      accessKeySecret: config.ossAccessKeySecret,
    };

    return new AliyunOSSStorage(ossConfig);
  }

  /**
   * 创建腾讯云 COS 存储
   */
  private createCOSStorage(config: StorageConfig): IStorageService {
    if (!config.cosRegion || !config.cosBucket || !config.cosSecretId || !config.cosSecretKey) {
      throw new Error('Missing required COS configuration');
    }

    const cosConfig: TencentCOSStorageConfig = {
      region: config.cosRegion,
      bucket: config.cosBucket,
      secretId: config.cosSecretId,
      secretKey: config.cosSecretKey,
    };

    return new TencentCOSStorage(cosConfig);
  }

  /**
   * 创建七牛云存储
   */
  private createQiniuStorage(config: StorageConfig): IStorageService {
    if (!config.qiniuBucket || !config.qiniuAccessKey || !config.qiniuSecretKey || !config.qiniuDomain) {
      throw new Error('Missing required Qiniu configuration');
    }

    const qiniuConfig: QiniuStorageConfig = {
      bucket: config.qiniuBucket,
      accessKey: config.qiniuAccessKey,
      secretKey: config.qiniuSecretKey,
      domain: config.qiniuDomain,
    };

    return new QiniuStorage(qiniuConfig);
  }

  /**
   * 验证存储配置是否有效
   */
  validateConfig(config: StorageConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (config.type) {
      case 'local':
        // 本地存储无必需配置
        break;

      case 'minio':
        if (!config.minioEndpoint) errors.push('MinIO Endpoint is required');
        if (!config.minioBucket) errors.push('MinIO Bucket is required');
        if (!config.minioAccessKey) errors.push('MinIO Access Key is required');
        if (!config.minioSecretKey) errors.push('MinIO Secret Key is required');
        break;

      case 'r2':
        if (!config.r2AccountId) errors.push('R2 Account ID is required');
        if (!config.r2Bucket) errors.push('R2 Bucket is required');
        if (!config.r2AccessKeyId) errors.push('R2 Access Key ID is required');
        if (!config.r2SecretAccessKey) errors.push('R2 Secret Access Key is required');
        break;

      case 's3':
        if (!config.s3Region) errors.push('S3 Region is required');
        if (!config.s3Bucket) errors.push('S3 Bucket is required');
        if (!config.s3AccessKeyId) errors.push('S3 Access Key ID is required');
        if (!config.s3SecretAccessKey) errors.push('S3 Secret Access Key is required');
        break;

      case 'oss':
        if (!config.ossEndpoint) errors.push('OSS Endpoint is required');
        if (!config.ossBucket) errors.push('OSS Bucket is required');
        if (!config.ossAccessKeyId) errors.push('OSS Access Key ID is required');
        if (!config.ossAccessKeySecret) errors.push('OSS Access Key Secret is required');
        break;

      case 'cos':
        if (!config.cosRegion) errors.push('COS Region is required');
        if (!config.cosBucket) errors.push('COS Bucket is required');
        if (!config.cosSecretId) errors.push('COS Secret ID is required');
        if (!config.cosSecretKey) errors.push('COS Secret Key is required');
        break;

      case 'qiniu':
        if (!config.qiniuBucket) errors.push('Qiniu Bucket is required');
        if (!config.qiniuAccessKey) errors.push('Qiniu Access Key is required');
        if (!config.qiniuSecretKey) errors.push('Qiniu Secret Key is required');
        if (!config.qiniuDomain) errors.push('Qiniu Domain is required');
        break;

      default:
        errors.push(`Unsupported storage type: ${config.type}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取支持的存储类型列表
   */
  getSupportedTypes(): { type: StorageType; name: string; description: string }[] {
    return [
      {
        type: 'local',
        name: '本地存储',
        description: '存储到服务器本地磁盘，适合开发环境',
      },
      {
        type: 'minio',
        name: 'MinIO',
        description: '自托管 S3 兼容对象存储，适合私有部署',
      },
      {
        type: 'r2',
        name: 'Cloudflare R2',
        description: '零出口费用的对象存储，全球 CDN 加速',
      },
      {
        type: 's3',
        name: 'Amazon S3',
        description: 'AWS 对象存储服务，全球可用',
      },
      {
        type: 'oss',
        name: '阿里云 OSS',
        description: '阿里云对象存储，国内访问速度快',
      },
      {
        type: 'cos',
        name: '腾讯云 COS',
        description: '腾讯云对象存储，与腾讯生态集成',
      },
      {
        type: 'qiniu',
        name: '七牛云',
        description: '七牛云存储，CDN 加速、图片处理',
      },
    ];
  }
}
