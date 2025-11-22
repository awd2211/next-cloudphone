import { Injectable, Logger } from '@nestjs/common';
import { IStorageService, FileMetadata } from './storage.interface';
import { Readable } from 'stream';

/**
 * 阿里云 OSS 存储配置
 */
export interface AliyunOSSStorageConfig {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  accessKeySecret: string;
  customDomain?: string;
  secure?: boolean;
  timeout?: number;
}

/**
 * AliyunOSSStorage - 阿里云 OSS 存储实现
 */
@Injectable()
export class AliyunOSSStorage implements IStorageService {
  private readonly logger = new Logger(AliyunOSSStorage.name);
  private client: any;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(config: AliyunOSSStorageConfig) {
    this.bucketName = config.bucket;

    // 动态导入 ali-oss
    this.initClient(config);

    // 构建公开访问 URL
    if (config.customDomain) {
      this.publicUrl = `https://${config.customDomain}`;
    } else {
      const protocol = config.secure !== false ? 'https' : 'http';
      this.publicUrl = `${protocol}://${config.bucket}.${config.endpoint}`;
    }

    this.logger.log(`✅ AliyunOSSStorage initialized: ${this.publicUrl}`);
  }

  private async initClient(config: AliyunOSSStorageConfig): Promise<void> {
    try {
      const OSS = require('ali-oss');
      this.client = new OSS({
        endpoint: config.endpoint,
        bucket: config.bucket,
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        secure: config.secure ?? true,
        timeout: config.timeout ?? 60000,
      });
    } catch (error) {
      this.logger.warn('ali-oss package not installed, OSS storage will not work');
    }
  }

  async save(file: Express.Multer.File, path: string): Promise<string> {
    await this.client.put(path, Buffer.from(file.buffer), {
      headers: { 'Content-Type': file.mimetype },
    });
    this.logger.debug(`Saved file to Aliyun OSS: ${path} (${file.size} bytes)`);
    return `${this.publicUrl}/${path}`;
  }

  async saveBuffer(buffer: Buffer, path: string, contentType?: string): Promise<string> {
    await this.client.put(path, buffer, {
      headers: { 'Content-Type': contentType || 'application/octet-stream' },
    });
    this.logger.debug(`Saved buffer to Aliyun OSS: ${path} (${buffer.length} bytes)`);
    return `${this.publicUrl}/${path}`;
  }

  async saveStream(stream: Readable, path: string, contentType?: string): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return this.saveBuffer(Buffer.concat(chunks), path, contentType);
  }

  async get(path: string): Promise<Buffer> {
    try {
      const result = await this.client.get(path);
      const buffer = Buffer.isBuffer(result.content) ? result.content : Buffer.from(result.content);
      this.logger.debug(`Read file from Aliyun OSS: ${path} (${buffer.length} bytes)`);
      return buffer;
    } catch (error: any) {
      if (error.code === 'NoSuchKey' || error.status === 404) {
        throw new Error(`File not found: ${path}`);
      }
      throw error;
    }
  }

  async getStream(path: string): Promise<Readable> {
    try {
      const result = await this.client.getStream(path);
      return result.stream;
    } catch (error: any) {
      if (error.code === 'NoSuchKey' || error.status === 404) {
        throw new Error(`File not found: ${path}`);
      }
      throw error;
    }
  }

  async delete(path: string): Promise<void> {
    try {
      await this.client.delete(path);
      this.logger.debug(`Deleted file from Aliyun OSS: ${path}`);
    } catch (error: any) {
      if (error.code !== 'NoSuchKey' && error.status !== 404) {
        throw error;
      }
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.client.head(path);
      return true;
    } catch (error: any) {
      if (error.code === 'NoSuchKey' || error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async getMetadata(path: string): Promise<FileMetadata> {
    try {
      const result = await this.client.head(path);
      return {
        path,
        size: parseInt(result.res.headers['content-length'] || '0', 10),
        contentType: result.res.headers['content-type'] as string,
        lastModified: new Date(result.res.headers['last-modified'] as string),
        etag: result.res.headers['etag'] as string,
      };
    } catch (error: any) {
      if (error.code === 'NoSuchKey' || error.status === 404) {
        throw new Error(`File not found: ${path}`);
      }
      throw error;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const files: string[] = [];
    let marker: string | undefined;

    do {
      const result = await this.client.list({ prefix, marker, 'max-keys': 1000 }, {});
      if (result.objects) {
        for (const obj of result.objects) {
          files.push(obj.name);
        }
      }
      marker = result.nextMarker;
    } while (marker);

    return files;
  }

  async getPresignedUrl(path: string, expiresIn = 3600): Promise<string> {
    if (!(await this.exists(path))) {
      throw new Error(`File not found: ${path}`);
    }
    return this.client.signatureUrl(path, { expires: expiresIn, method: 'GET' });
  }
}
