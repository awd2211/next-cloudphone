import { Injectable, Logger } from '@nestjs/common';
import { IStorageService, FileMetadata } from './storage.interface';
import { Readable } from 'stream';
// @ts-ignore - cos-nodejs-sdk-v5 无类型声明
import COS from 'cos-nodejs-sdk-v5';

/**
 * 腾讯云 COS 存储配置
 */
export interface TencentCOSStorageConfig {
  /**
   * 区域
   * 例如: ap-beijing, ap-shanghai, ap-guangzhou
   */
  region: string;

  /**
   * Bucket 名称 (格式: bucket-appid)
   * 例如: mybucket-1250000000
   */
  bucket: string;

  /**
   * SecretId
   */
  secretId: string;

  /**
   * SecretKey
   */
  secretKey: string;

  /**
   * 自定义域名 (可选)
   */
  customDomain?: string;

  /**
   * 是否使用 HTTPS
   */
  secure?: boolean;
}

/**
 * TencentCOSStorage - 腾讯云 COS 存储实现
 *
 * 用途：腾讯云对象存储，适合国内部署
 * 优势：与腾讯云生态集成良好，CDN 加速
 *
 * 环境变量配置：
 * - COS_REGION: 区域
 * - COS_BUCKET: Bucket 名称
 * - COS_SECRET_ID: SecretId
 * - COS_SECRET_KEY: SecretKey
 */
@Injectable()
export class TencentCOSStorage implements IStorageService {
  private readonly logger = new Logger(TencentCOSStorage.name);
  private readonly client: COS;
  private readonly bucket: string;
  private readonly region: string;
  private readonly publicUrl: string;

  constructor(config: TencentCOSStorageConfig) {
    this.bucket = config.bucket;
    this.region = config.region;

    // 创建 COS 客户端
    this.client = new COS({
      SecretId: config.secretId,
      SecretKey: config.secretKey,
    });

    // 构建公开访问 URL
    if (config.customDomain) {
      this.publicUrl = `https://${config.customDomain}`;
    } else {
      const protocol = config.secure !== false ? 'https' : 'http';
      // COS URL 格式: https://<bucket>.cos.<region>.myqcloud.com
      this.publicUrl = `${protocol}://${config.bucket}.cos.${config.region}.myqcloud.com`;
    }

    this.logger.log(`✅ TencentCOSStorage initialized: ${this.publicUrl}`);
  }

  /**
   * 保存 Multer 文件
   */
  async save(file: Express.Multer.File, path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.client.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: path,
          Body: file.buffer,
          ContentType: file.mimetype,
          Headers: {
            'x-cos-meta-original-name': Buffer.from(file.originalname).toString(
              'base64',
            ),
          },
        },
        (err) => {
          if (err) {
            reject(err);
            return;
          }

          this.logger.debug(
            `Saved file to Tencent COS: ${path} (${file.size} bytes)`,
          );
          resolve(`${this.publicUrl}/${path}`);
        },
      );
    });
  }

  /**
   * 保存 Buffer 数据
   */
  async saveBuffer(
    buffer: Buffer,
    path: string,
    contentType?: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.client.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: path,
          Body: buffer,
          ContentType: contentType || 'application/octet-stream',
        },
        (err) => {
          if (err) {
            reject(err);
            return;
          }

          this.logger.debug(
            `Saved buffer to Tencent COS: ${path} (${buffer.length} bytes)`,
          );
          resolve(`${this.publicUrl}/${path}`);
        },
      );
    });
  }

  /**
   * 保存 Stream 数据
   */
  async saveStream(
    stream: Readable,
    path: string,
    contentType?: string,
  ): Promise<string> {
    // 将流转换为 Buffer
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
    return new Promise((resolve, reject) => {
      this.client.getObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: path,
        },
        (err: any, data: any) => {
          if (err) {
            if (err.code === 'NoSuchKey' || err.statusCode === 404) {
              reject(new Error(`File not found: ${path}`));
              return;
            }
            reject(err);
            return;
          }

          const buffer = Buffer.isBuffer(data?.Body)
            ? data.Body
            : Buffer.from(data?.Body || '');

          this.logger.debug(
            `Read file from Tencent COS: ${path} (${buffer.length} bytes)`,
          );
          resolve(buffer);
        },
      );
    });
  }

  /**
   * 获取文件流
   */
  async getStream(path: string): Promise<Readable> {
    // COS SDK 不直接支持流式读取，先获取 Buffer 再转换
    const buffer = await this.get(path);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
  }

  /**
   * 删除文件
   */
  async delete(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.deleteObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: path,
        },
        (err) => {
          if (err) {
            if (err.code === 'NoSuchKey' || err.statusCode === 404) {
              this.logger.debug(`File already deleted: ${path}`);
              resolve();
              return;
            }
            reject(err);
            return;
          }

          this.logger.debug(`Deleted file from Tencent COS: ${path}`);
          resolve();
        },
      );
    });
  }

  /**
   * 检查文件是否存在
   */
  async exists(path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.client.headObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: path,
        },
        (err) => {
          if (err) {
            if (err.code === 'NoSuchKey' || err.statusCode === 404) {
              resolve(false);
              return;
            }
            reject(err);
            return;
          }
          resolve(true);
        },
      );
    });
  }

  /**
   * 获取文件元数据
   */
  async getMetadata(path: string): Promise<FileMetadata> {
    return new Promise((resolve, reject) => {
      this.client.headObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: path,
        },
        (err: any, data: any) => {
          if (err) {
            if (err.code === 'NoSuchKey' || err.statusCode === 404) {
              reject(new Error(`File not found: ${path}`));
              return;
            }
            reject(err);
            return;
          }

          resolve({
            path,
            size: parseInt(data?.headers?.['content-length'] || '0', 10),
            contentType: data?.headers?.['content-type'],
            lastModified: new Date(data?.headers?.['last-modified'] || ''),
            etag: data?.headers?.['etag'],
          });
        },
      );
    });
  }

  /**
   * 列出目录下的文件
   */
  async list(prefix: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const files: string[] = [];

      const listPage = (marker?: string) => {
        this.client.getBucket(
          {
            Bucket: this.bucket,
            Region: this.region,
            Prefix: prefix,
            Marker: marker,
            MaxKeys: 1000,
          },
          (err: any, data: any) => {
            if (err) {
              reject(err);
              return;
            }

            if (data?.Contents) {
              for (const obj of data.Contents) {
                if (obj.Key) {
                  files.push(obj.Key);
                }
              }
            }

            if (data?.IsTruncated === 'true' && data?.NextMarker) {
              listPage(data.NextMarker);
            } else {
              resolve(files);
            }
          },
        );
      };

      listPage();
    });
  }

  /**
   * 生成预签名下载 URL
   */
  async getPresignedUrl(path: string, expiresIn = 3600): Promise<string> {
    // 检查文件是否存在
    if (!(await this.exists(path))) {
      throw new Error(`File not found: ${path}`);
    }

    return new Promise((resolve, reject) => {
      this.client.getObjectUrl(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: path,
          Sign: true,
          Expires: expiresIn,
        },
        (err: any, data: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(data?.Url || '');
        },
      );
    });
  }
}
