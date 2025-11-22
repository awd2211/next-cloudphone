import { Injectable, Logger } from '@nestjs/common';
import { IStorageService, FileMetadata } from './storage.interface';
import { Readable } from 'stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * S3 兼容存储配置
 */
export interface S3CompatibleStorageConfig {
  /**
   * 存储类型标识
   */
  type: 's3' | 'r2';

  /**
   * S3 端点 URL
   * - AWS S3: 留空使用默认
   * - Cloudflare R2: https://<account_id>.r2.cloudflarestorage.com
   */
  endpoint?: string;

  /**
   * AWS 区域 (S3 专用)
   */
  region?: string;

  /**
   * Cloudflare Account ID (R2 专用)
   */
  accountId?: string;

  /**
   * Access Key ID
   */
  accessKeyId: string;

  /**
   * Secret Access Key
   */
  secretAccessKey: string;

  /**
   * Bucket 名称
   */
  bucket: string;

  /**
   * 自定义域名 (可选，用于公开访问)
   */
  customDomain?: string;

  /**
   * 是否公开访问
   */
  publicAccess?: boolean;
}

/**
 * S3CompatibleStorage - S3 兼容存储实现
 *
 * 支持：
 * - Amazon S3
 * - Cloudflare R2
 * - 其他 S3 兼容存储
 *
 * 优势：
 * - 使用 AWS SDK v3，支持所有 S3 兼容服务
 * - Cloudflare R2 零出口费用
 * - 全球 CDN 加速
 */
@Injectable()
export class S3CompatibleStorage implements IStorageService {
  private readonly logger = new Logger(S3CompatibleStorage.name);
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly config: S3CompatibleStorageConfig;

  constructor(config: S3CompatibleStorageConfig) {
    this.config = config;
    this.bucketName = config.bucket;

    // 构建端点 URL
    let endpoint: string | undefined;
    if (config.type === 'r2' && config.accountId) {
      endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;
    } else if (config.endpoint) {
      endpoint = config.endpoint;
    }

    // 创建 S3 客户端
    this.client = new S3Client({
      endpoint,
      region: config.region || 'auto', // R2 使用 'auto'
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // R2 需要这个设置来兼容 S3 签名
      forcePathStyle: config.type === 'r2',
    });

    // 构建公开访问 URL
    if (config.customDomain) {
      this.publicUrl = `https://${config.customDomain}`;
    } else if (config.type === 'r2' && config.accountId) {
      // R2.dev 公开访问 URL
      this.publicUrl = `https://${config.bucket}.${config.accountId}.r2.dev`;
    } else if (config.type === 's3' && config.region) {
      this.publicUrl = `https://${config.bucket}.s3.${config.region}.amazonaws.com`;
    } else {
      this.publicUrl = `https://${config.bucket}.s3.amazonaws.com`;
    }

    this.logger.log(
      `✅ S3CompatibleStorage initialized: ${config.type.toUpperCase()} - ${this.publicUrl}`,
    );
  }

  /**
   * 保存 Multer 文件
   */
  async save(file: Express.Multer.File, path: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: path,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        'original-name': Buffer.from(file.originalname).toString('base64'),
      },
    });

    await this.client.send(command);

    this.logger.debug(
      `Saved file to ${this.config.type.toUpperCase()}: ${path} (${file.size} bytes)`,
    );

    return `${this.publicUrl}/${path}`;
  }

  /**
   * 保存 Buffer 数据
   */
  async saveBuffer(
    buffer: Buffer,
    path: string,
    contentType?: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: path,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
    });

    await this.client.send(command);

    this.logger.debug(
      `Saved buffer to ${this.config.type.toUpperCase()}: ${path} (${buffer.length} bytes)`,
    );

    return `${this.publicUrl}/${path}`;
  }

  /**
   * 保存 Stream 数据
   */
  async saveStream(
    stream: Readable,
    path: string,
    contentType?: string,
  ): Promise<string> {
    // 将流转换为 Buffer (S3 SDK 需要知道内容长度)
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    return this.saveBuffer(buffer, path, contentType);
  }

  /**
   * 读取文件内容
   */
  async get(path: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      const response: GetObjectCommandOutput = await this.client.send(command);

      if (!response.Body) {
        throw new Error(`Empty response for: ${path}`);
      }

      // 将流转换为 Buffer
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const buffer = Buffer.concat(chunks);
      this.logger.debug(
        `Read file from ${this.config.type.toUpperCase()}: ${path} (${buffer.length} bytes)`,
      );

      return buffer;
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
        throw new Error(`File not found: ${path}`);
      }
      throw error;
    }
  }

  /**
   * 获取文件流
   */
  async getStream(path: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error(`Empty response for: ${path}`);
      }

      return response.Body as Readable;
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
        throw new Error(`File not found: ${path}`);
      }
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async delete(path: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      await this.client.send(command);
      this.logger.debug(
        `Deleted file from ${this.config.type.toUpperCase()}: ${path}`,
      );
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
        this.logger.debug(`File already deleted: ${path}`);
        return;
      }
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(path: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (
        error.name === 'NotFound' ||
        error.name === 'NoSuchKey' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 获取文件元数据
   */
  async getMetadata(path: string): Promise<FileMetadata> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      const response = await this.client.send(command);

      return {
        path,
        size: response.ContentLength || 0,
        contentType: response.ContentType,
        lastModified: response.LastModified || new Date(),
        etag: response.ETag,
      };
    } catch (error: any) {
      if (
        error.name === 'NotFound' ||
        error.name === 'NoSuchKey' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        throw new Error(`File not found: ${path}`);
      }
      throw error;
    }
  }

  /**
   * 列出目录下的文件
   */
  async list(prefix: string): Promise<string[]> {
    const files: string[] = [];
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const response = await this.client.send(command);

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key) {
            files.push(obj.Key);
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return files;
  }

  /**
   * 生成预签名下载 URL
   */
  async getPresignedUrl(path: string, expiresIn = 3600): Promise<string> {
    // 如果是公开访问，直接返回公开 URL
    if (this.config.publicAccess) {
      return `${this.publicUrl}/${path}`;
    }

    // 检查文件是否存在
    if (!(await this.exists(path))) {
      throw new Error(`File not found: ${path}`);
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: path,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });
    return url;
  }
}
