import { Injectable, Logger } from '@nestjs/common';
import { IStorageService, FileMetadata } from './storage.interface';
import { Readable } from 'stream';
// @ts-ignore - qiniu 无类型声明
import * as qiniu from 'qiniu';
import { createHash } from 'crypto';

/**
 * 七牛云存储配置
 */
export interface QiniuStorageConfig {
  /**
   * Bucket 名称
   */
  bucket: string;

  /**
   * AccessKey
   */
  accessKey: string;

  /**
   * SecretKey
   */
  secretKey: string;

  /**
   * 外链域名 (必须)
   * 例如: cdn.example.com
   */
  domain: string;

  /**
   * 是否使用 HTTPS
   */
  secure?: boolean;

  /**
   * 存储区域
   * z0: 华东, z1: 华北, z2: 华南, na0: 北美, as0: 东南亚
   */
  zone?: 'z0' | 'z1' | 'z2' | 'na0' | 'as0';
}

/**
 * QiniuStorage - 七牛云存储实现
 *
 * 用途：七牛云对象存储，适合国内 CDN 分发
 * 优势：CDN 加速、图片处理、音视频处理
 *
 * 环境变量配置：
 * - QINIU_BUCKET: Bucket 名称
 * - QINIU_ACCESS_KEY: AccessKey
 * - QINIU_SECRET_KEY: SecretKey
 * - QINIU_DOMAIN: 外链域名
 */
@Injectable()
export class QiniuStorage implements IStorageService {
  private readonly logger = new Logger(QiniuStorage.name);
  private readonly mac: qiniu.auth.digest.Mac;
  private readonly config: qiniu.conf.Config;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly storageConfig: QiniuStorageConfig;

  constructor(config: QiniuStorageConfig) {
    this.storageConfig = config;
    this.bucket = config.bucket;

    // 创建认证对象
    this.mac = new qiniu.auth.digest.Mac(config.accessKey, config.secretKey);

    // 创建配置对象
    this.config = new qiniu.conf.Config();

    // 设置存储区域
    switch (config.zone) {
      case 'z0':
        this.config.zone = qiniu.zone.Zone_z0;
        break;
      case 'z1':
        this.config.zone = qiniu.zone.Zone_z1;
        break;
      case 'z2':
        this.config.zone = qiniu.zone.Zone_z2;
        break;
      case 'na0':
        this.config.zone = qiniu.zone.Zone_na0;
        break;
      case 'as0':
        this.config.zone = qiniu.zone.Zone_as0;
        break;
      default:
        this.config.zone = qiniu.zone.Zone_z0; // 默认华东
    }

    // 构建公开访问 URL
    const protocol = config.secure !== false ? 'https' : 'http';
    this.publicUrl = `${protocol}://${config.domain}`;

    this.logger.log(`✅ QiniuStorage initialized: ${this.publicUrl}`);
  }

  /**
   * 获取上传 Token
   */
  private getUploadToken(key?: string): string {
    const options: qiniu.rs.PutPolicyOptions = {
      scope: key ? `${this.bucket}:${key}` : this.bucket,
      expires: 3600, // 1 小时
    };

    const putPolicy = new qiniu.rs.PutPolicy(options);
    return putPolicy.uploadToken(this.mac);
  }

  /**
   * 保存 Multer 文件
   */
  async save(file: Express.Multer.File, path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const formUploader = new qiniu.form_up.FormUploader(this.config);
      const putExtra = new qiniu.form_up.PutExtra();

      // 设置 MIME 类型
      putExtra.mimeType = file.mimetype;

      // 设置自定义变量
      putExtra.params = {
        'x:original-name': Buffer.from(file.originalname).toString('base64'),
      };

      const uploadToken = this.getUploadToken(path);

      formUploader.put(
        uploadToken,
        path,
        file.buffer,
        putExtra,
        (err, body, info) => {
          if (err) {
            reject(err);
            return;
          }

          if (info.statusCode === 200) {
            this.logger.debug(
              `Saved file to Qiniu: ${path} (${file.size} bytes)`,
            );
            resolve(`${this.publicUrl}/${path}`);
          } else {
            reject(new Error(`Upload failed: ${info.statusCode} - ${body}`));
          }
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
      const formUploader = new qiniu.form_up.FormUploader(this.config);
      const putExtra = new qiniu.form_up.PutExtra();

      if (contentType) {
        putExtra.mimeType = contentType;
      }

      const uploadToken = this.getUploadToken(path);

      formUploader.put(uploadToken, path, buffer, putExtra, (err, body, info) => {
        if (err) {
          reject(err);
          return;
        }

        if (info.statusCode === 200) {
          this.logger.debug(
            `Saved buffer to Qiniu: ${path} (${buffer.length} bytes)`,
          );
          resolve(`${this.publicUrl}/${path}`);
        } else {
          reject(new Error(`Upload failed: ${info.statusCode} - ${body}`));
        }
      });
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
    const downloadUrl = await this.getPresignedUrl(path, 3600);

    const response = await fetch(downloadUrl);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`File not found: ${path}`);
      }
      throw new Error(`Download failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    this.logger.debug(`Read file from Qiniu: ${path} (${buffer.length} bytes)`);

    return buffer;
  }

  /**
   * 获取文件流
   */
  async getStream(path: string): Promise<Readable> {
    const downloadUrl = await this.getPresignedUrl(path, 3600);

    const response = await fetch(downloadUrl);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`File not found: ${path}`);
      }
      throw new Error(`Download failed: ${response.status}`);
    }

    // 将 Web ReadableStream 转换为 Node.js Readable
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    return new Readable({
      async read() {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      },
    });
  }

  /**
   * 删除文件
   */
  async delete(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);

      bucketManager.delete(this.bucket, path, (err, respBody, respInfo) => {
        if (err) {
          reject(err);
          return;
        }

        if (respInfo.statusCode === 200 || respInfo.statusCode === 612) {
          // 612 = 文件不存在
          this.logger.debug(`Deleted file from Qiniu: ${path}`);
          resolve();
        } else {
          reject(
            new Error(`Delete failed: ${respInfo.statusCode} - ${respBody}`),
          );
        }
      });
    });
  }

  /**
   * 检查文件是否存在
   */
  async exists(path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);

      bucketManager.stat(this.bucket, path, (err, respBody, respInfo) => {
        if (err) {
          reject(err);
          return;
        }

        if (respInfo.statusCode === 200) {
          resolve(true);
        } else if (respInfo.statusCode === 612) {
          resolve(false);
        } else {
          reject(new Error(`Stat failed: ${respInfo.statusCode}`));
        }
      });
    });
  }

  /**
   * 获取文件元数据
   */
  async getMetadata(path: string): Promise<FileMetadata> {
    return new Promise((resolve, reject) => {
      const bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);

      bucketManager.stat(this.bucket, path, (err, respBody, respInfo) => {
        if (err) {
          reject(err);
          return;
        }

        if (respInfo.statusCode === 200) {
          resolve({
            path,
            size: respBody.fsize,
            contentType: respBody.mimeType,
            lastModified: new Date(respBody.putTime / 10000), // 七牛时间戳是纳秒
            etag: respBody.hash,
          });
        } else if (respInfo.statusCode === 612) {
          reject(new Error(`File not found: ${path}`));
        } else {
          reject(new Error(`Stat failed: ${respInfo.statusCode}`));
        }
      });
    });
  }

  /**
   * 列出目录下的文件
   */
  async list(prefix: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);
      const files: string[] = [];

      const listPage = (marker?: string) => {
        bucketManager.listPrefix(
          this.bucket,
          {
            prefix,
            marker,
            limit: 1000,
          },
          (err, respBody, respInfo) => {
            if (err) {
              reject(err);
              return;
            }

            if (respInfo.statusCode !== 200) {
              reject(new Error(`List failed: ${respInfo.statusCode}`));
              return;
            }

            if (respBody.items) {
              for (const item of respBody.items) {
                files.push(item.key);
              }
            }

            if (respBody.marker) {
              listPage(respBody.marker);
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
    // 构建私有空间的下载 URL
    const deadline = Math.floor(Date.now() / 1000) + expiresIn;
    const baseUrl = `${this.publicUrl}/${encodeURI(path)}`;
    const urlWithDeadline = `${baseUrl}?e=${deadline}`;

    // 计算签名
    const signature = createHash('sha1')
      .update(`${urlWithDeadline}`)
      .digest('base64');

    // 对签名进行 URL 安全的 Base64 编码
    const encodedSign = qiniu.util.urlsafeBase64Encode(
      qiniu.util.hmacSha1(urlWithDeadline, this.storageConfig.secretKey),
    );

    // 拼接最终 URL
    return `${urlWithDeadline}&token=${this.storageConfig.accessKey}:${encodedSign}`;
  }
}
