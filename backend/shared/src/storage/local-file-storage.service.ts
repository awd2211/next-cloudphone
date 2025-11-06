import { Injectable, Logger } from '@nestjs/common';
import { IStorageService, FileMetadata } from './storage.interface';
import { Readable } from 'stream';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

/**
 * LocalFileStorage - 本地文件系统存储实现
 *
 * 用途：本地开发环境使用，文件存储到本地磁盘
 * 优势：快速、简单、无需额外服务
 * 限制：不支持集群共享（每个 Pod 有独立的文件系统）
 *
 * 存储路径：默认 /tmp/cloudphone-storage/
 * 可通过环境变量 LOCAL_STORAGE_PATH 自定义
 */
@Injectable()
export class LocalFileStorage implements IStorageService {
  private readonly logger = new Logger(LocalFileStorage.name);
  private readonly basePath: string;

  constructor() {
    // 从环境变量读取存储路径，默认使用 /tmp
    this.basePath =
      process.env.LOCAL_STORAGE_PATH || '/tmp/cloudphone-storage';

    // 确保基础目录存在
    this.ensureDirectoryExists(this.basePath);

    this.logger.log(`✅ LocalFileStorage initialized: ${this.basePath}`);
  }

  /**
   * 确保目录存在（递归创建）
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      this.logger.debug(`Created directory: ${dirPath}`);
    }
  }

  /**
   * 获取完整的文件系统路径
   */
  private getFullPath(relativePath: string): string {
    return path.join(this.basePath, relativePath);
  }

  /**
   * 保存 Multer 文件
   */
  async save(file: Express.Multer.File, relativePath: string): Promise<string> {
    const fullPath = this.getFullPath(relativePath);
    const directory = path.dirname(fullPath);

    // 确保目标目录存在
    await this.ensureDirectoryExists(directory);

    // 写入文件
    await fs.writeFile(fullPath, file.buffer);

    this.logger.debug(`Saved file: ${relativePath} (${file.size} bytes)`);

    // 返回 file:// 协议的 URL
    return `file://${fullPath}`;
  }

  /**
   * 保存 Buffer 数据
   */
  async saveBuffer(
    buffer: Buffer,
    relativePath: string,
    contentType?: string,
  ): Promise<string> {
    const fullPath = this.getFullPath(relativePath);
    const directory = path.dirname(fullPath);

    await this.ensureDirectoryExists(directory);
    await fs.writeFile(fullPath, buffer);

    this.logger.debug(
      `Saved buffer: ${relativePath} (${buffer.length} bytes, ${contentType || 'unknown type'})`,
    );

    return `file://${fullPath}`;
  }

  /**
   * 保存 Stream 数据
   */
  async saveStream(
    stream: Readable,
    relativePath: string,
    contentType?: string,
  ): Promise<string> {
    const fullPath = this.getFullPath(relativePath);
    const directory = path.dirname(fullPath);

    await this.ensureDirectoryExists(directory);

    // 创建写入流
    const writeStream = fsSync.createWriteStream(fullPath);

    // 等待流写入完成
    await new Promise<void>((resolve, reject) => {
      stream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      stream.on('error', reject);
    });

    this.logger.debug(`Saved stream: ${relativePath} (${contentType || 'unknown type'})`);

    return `file://${fullPath}`;
  }

  /**
   * 读取文件内容
   */
  async get(relativePath: string): Promise<Buffer> {
    const fullPath = this.getFullPath(relativePath);

    try {
      const buffer = await fs.readFile(fullPath);
      this.logger.debug(`Read file: ${relativePath} (${buffer.length} bytes)`);
      return buffer;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${relativePath}`);
      }
      throw error;
    }
  }

  /**
   * 获取文件流
   */
  async getStream(relativePath: string): Promise<Readable> {
    const fullPath = this.getFullPath(relativePath);

    // 检查文件是否存在
    try {
      await fs.access(fullPath);
    } catch {
      throw new Error(`File not found: ${relativePath}`);
    }

    return fsSync.createReadStream(fullPath);
  }

  /**
   * 删除文件
   */
  async delete(relativePath: string): Promise<void> {
    const fullPath = this.getFullPath(relativePath);

    try {
      await fs.unlink(fullPath);
      this.logger.debug(`Deleted file: ${relativePath}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // 文件不存在，静默忽略
        this.logger.debug(`File already deleted: ${relativePath}`);
        return;
      }
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(relativePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(relativePath);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件元数据
   */
  async getMetadata(relativePath: string): Promise<FileMetadata> {
    const fullPath = this.getFullPath(relativePath);

    try {
      const stats = await fs.stat(fullPath);

      return {
        path: relativePath,
        size: stats.size,
        lastModified: stats.mtime,
        contentType: this.guessContentType(relativePath),
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${relativePath}`);
      }
      throw error;
    }
  }

  /**
   * 列出目录下的文件
   */
  async list(prefix: string): Promise<string[]> {
    const fullPath = this.getFullPath(prefix);

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });

      const files: string[] = [];

      for (const entry of entries) {
        const relativePath = path.join(prefix, entry.name);

        if (entry.isDirectory()) {
          // 递归列出子目录
          const subFiles = await this.list(relativePath);
          files.push(...subFiles);
        } else {
          files.push(relativePath);
        }
      }

      return files;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // 目录不存在，返回空数组
        return [];
      }
      throw error;
    }
  }

  /**
   * 生成预签名 URL（本地文件系统不支持，直接返回 file:// URL）
   */
  async getPresignedUrl(
    relativePath: string,
    expiresIn?: number,
  ): Promise<string> {
    const fullPath = this.getFullPath(relativePath);

    // 检查文件是否存在
    if (!(await this.exists(relativePath))) {
      throw new Error(`File not found: ${relativePath}`);
    }

    // 本地文件系统不需要预签名，直接返回 file:// URL
    return `file://${fullPath}`;
  }

  /**
   * 根据文件扩展名猜测 MIME 类型
   */
  private guessContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();

    const mimeTypes: Record<string, string> = {
      '.apk': 'application/vnd.android.package-archive',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}
