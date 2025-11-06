import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageService, FileMetadata } from './storage.interface';
import { Readable } from 'stream';
import * as Minio from 'minio';

/**
 * MinIOStorage - MinIO 对象存储实现
 *
 * 用途：K8s 集群环境使用，文件存储到 MinIO（S3 兼容的对象存储）
 * 优势：支持集群共享、高可用、支持大文件、支持预签名 URL
 * 要求：需要部署 MinIO 服务（已在 docker-compose.dev.yml 中配置）
 *
 * 环境变量配置：
 * - MINIO_ENDPOINT: MinIO 服务地址（默认 localhost）
 * - MINIO_PORT: MinIO 端口（默认 9000）
 * - MINIO_ACCESS_KEY: 访问密钥（默认 minioadmin）
 * - MINIO_SECRET_KEY: 密钥（默认 minioadmin）
 * - MINIO_BUCKET: 存储桶名称（默认 cloudphone）
 * - MINIO_USE_SSL: 是否使用 SSL（默认 false）
 */
@Injectable()
export class MinIOStorage implements IStorageService {
  private readonly logger = new Logger(MinIOStorage.name);
  private readonly client: Minio.Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    // 从环境变量读取 MinIO 配置
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<number>('MINIO_PORT', 9000);
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin');
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';

    this.bucketName = this.configService.get<string>('MINIO_BUCKET', 'cloudphone');

    // 创建 MinIO 客户端
    this.client = new Minio.Client({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    // 构建公开访问 URL 前缀
    const protocol = useSSL ? 'https' : 'http';
    this.publicUrl = `${protocol}://${endpoint}:${port}/${this.bucketName}`;

    // 初始化存储桶
    this.initializeBucket();

    this.logger.log(`✅ MinIOStorage initialized: ${this.publicUrl}`);
  }

  /**
   * 初始化存储桶（如果不存在则创建）
   */
  private async initializeBucket(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucketName);

      if (!exists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Created MinIO bucket: ${this.bucketName}`);

        // 设置存储桶策略为公开读取（允许直接访问文件）
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };

        await this.client.setBucketPolicy(
          this.bucketName,
          JSON.stringify(policy),
        );
        this.logger.log(`Set public read policy for bucket: ${this.bucketName}`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize MinIO bucket', error);
      throw error;
    }
  }

  /**
   * 保存 Multer 文件
   */
  async save(file: Express.Multer.File, path: string): Promise<string> {
    const metadata = {
      'Content-Type': file.mimetype,
      'Original-Name': Buffer.from(file.originalname).toString('base64'),
    };

    await this.client.putObject(this.bucketName, path, file.buffer, file.size, metadata);

    this.logger.debug(`Saved file to MinIO: ${path} (${file.size} bytes)`);

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
    const metadata = {
      'Content-Type': contentType || 'application/octet-stream',
    };

    await this.client.putObject(
      this.bucketName,
      path,
      buffer,
      buffer.length,
      metadata,
    );

    this.logger.debug(
      `Saved buffer to MinIO: ${path} (${buffer.length} bytes, ${contentType || 'unknown type'})`,
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
    const metadata = {
      'Content-Type': contentType || 'application/octet-stream',
    };

    // For streams, size is optional (will be auto-detected)
    await this.client.putObject(this.bucketName, path, stream, undefined, metadata);

    this.logger.debug(`Saved stream to MinIO: ${path} (${contentType || 'unknown type'})`);

    return `${this.publicUrl}/${path}`;
  }

  /**
   * 读取文件内容
   */
  async get(path: string): Promise<Buffer> {
    try {
      const stream = await this.client.getObject(this.bucketName, path);

      // 将流转换为 Buffer
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      this.logger.debug(`Read file from MinIO: ${path} (${buffer.length} bytes)`);

      return buffer;
    } catch (error: any) {
      if (error.code === 'NoSuchKey') {
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
      return await this.client.getObject(this.bucketName, path);
    } catch (error: any) {
      if (error.code === 'NoSuchKey') {
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
      await this.client.removeObject(this.bucketName, path);
      this.logger.debug(`Deleted file from MinIO: ${path}`);
    } catch (error: any) {
      if (error.code === 'NoSuchKey') {
        // 文件不存在，静默忽略
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
      await this.client.statObject(this.bucketName, path);
      return true;
    } catch (error: any) {
      if (error.code === 'NotFound' || error.code === 'NoSuchKey') {
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
      const stat = await this.client.statObject(this.bucketName, path);

      return {
        path,
        size: stat.size,
        contentType: stat.metaData?.['content-type'],
        lastModified: stat.lastModified,
        etag: stat.etag,
      };
    } catch (error: any) {
      if (error.code === 'NotFound' || error.code === 'NoSuchKey') {
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

    const stream = this.client.listObjectsV2(this.bucketName, prefix, true);

    for await (const obj of stream) {
      if (obj.name) {
        files.push(obj.name);
      }
    }

    return files;
  }

  /**
   * 生成预签名下载 URL
   */
  async getPresignedUrl(path: string, expiresIn = 3600): Promise<string> {
    try {
      // 检查文件是否存在
      if (!(await this.exists(path))) {
        throw new Error(`File not found: ${path}`);
      }

      // 生成预签名 URL（有效期默认 1 小时）
      const url = await this.client.presignedGetObject(
        this.bucketName,
        path,
        expiresIn,
      );

      return url;
    } catch (error: any) {
      if (error.code === 'NotFound' || error.code === 'NoSuchKey') {
        throw new Error(`File not found: ${path}`);
      }
      throw error;
    }
  }
}
