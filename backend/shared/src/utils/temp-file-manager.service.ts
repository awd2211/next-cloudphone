import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface TempFileOptions {
  prefix?: string;
  suffix?: string;
  dir?: string;
  maxAge?: number; // 文件最大保留时间（毫秒）
}

export interface TempFileInfo {
  path: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

/**
 * 临时文件管理服务
 * 
 * 功能：
 * - 自动管理临时文件生命周期
 * - 定时清理过期文件
 * - 统一的文件路径管理
 * - 防止文件泄漏
 */
@Injectable()
export class TempFileManagerService {
  private readonly logger = new Logger(TempFileManagerService.name);
  private readonly tempFiles = new Map<string, TempFileInfo>();
  private readonly defaultTempDir = '/tmp/cloudphone';
  private readonly defaultMaxAge = 24 * 60 * 60 * 1000; // 24小时

  constructor() {
    this.ensureTempDirExists();
  }

  /**
   * 确保临时目录存在
   */
  private async ensureTempDirExists(): Promise<void> {
    try {
      await fs.mkdir(this.defaultTempDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create temp directory: ${error.message}`);
    }
  }

  /**
   * 创建临时文件
   */
  async create(options: TempFileOptions = {}): Promise<TempFileInfo> {
    const dir = options.dir || this.defaultTempDir;
    const prefix = options.prefix || 'temp';
    const suffix = options.suffix || '';
    const randomName = crypto.randomBytes(16).toString('hex');
    const fileName = `${prefix}_${randomName}${suffix}`;
    const filePath = path.join(dir, fileName);

    const fileInfo: TempFileInfo = {
      path: filePath,
      createdAt: new Date(),
      metadata: {},
    };

    this.tempFiles.set(filePath, fileInfo);
    this.logger.debug(`Created temp file: ${filePath}`);

    return fileInfo;
  }

  /**
   * 从已有文件创建临时文件记录
   */
  async register(filePath: string, metadata?: Record<string, any>): Promise<TempFileInfo> {
    const fileInfo: TempFileInfo = {
      path: filePath,
      createdAt: new Date(),
      metadata,
    };

    this.tempFiles.set(filePath, fileInfo);
    this.logger.debug(`Registered temp file: ${filePath}`);

    return fileInfo;
  }

  /**
   * 清理单个临时文件
   */
  async cleanup(fileInfo: TempFileInfo | string): Promise<void> {
    const filePath = typeof fileInfo === 'string' ? fileInfo : fileInfo.path;

    try {
      await fs.unlink(filePath);
      this.tempFiles.delete(filePath);
      this.logger.debug(`Cleaned up temp file: ${filePath}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.warn(`Failed to cleanup temp file ${filePath}: ${error.message}`);
      }
      // 即使删除失败也从跟踪中移除
      this.tempFiles.delete(filePath);
    }
  }

  /**
   * 批量清理临时文件
   */
  async cleanupBatch(files: (TempFileInfo | string)[]): Promise<void> {
    await Promise.all(files.map(file => this.cleanup(file)));
  }

  /**
   * 使用临时文件（自动清理）
   */
  async withTempFile<T>(
    callback: (filePath: string) => Promise<T>,
    options?: TempFileOptions,
  ): Promise<T> {
    const fileInfo = await this.create(options);
    try {
      return await callback(fileInfo.path);
    } finally {
      await this.cleanup(fileInfo);
    }
  }

  /**
   * 清理过期的临时文件
   * 
   * 注意：需要在使用此服务的模块中配置定时任务来调用此方法
   * 建议每小时执行一次
   */
  async cleanupExpiredFiles(): Promise<void> {
    this.logger.log('Starting cleanup of expired temp files...');
    
    const now = Date.now();
    let cleanedCount = 0;

    for (const [filePath, fileInfo] of this.tempFiles.entries()) {
      const age = now - fileInfo.createdAt.getTime();
      const maxAge = fileInfo.metadata?.maxAge || this.defaultMaxAge;

      if (age > maxAge) {
        await this.cleanup(fileInfo);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired temp files`);
    }

    // 清理临时目录中未被跟踪的文件
    await this.cleanupUntrackedFiles();
  }

  /**
   * 清理未被跟踪的临时文件
   */
  private async cleanupUntrackedFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.defaultTempDir);
      const now = Date.now();
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.defaultTempDir, file);
        
        // 跳过已跟踪的文件
        if (this.tempFiles.has(filePath)) {
          continue;
        }

        // 检查文件年龄
        const stats = await fs.stat(filePath);
        const age = now - stats.mtimeMs;

        if (age > this.defaultMaxAge) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} untracked temp files`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup untracked files: ${error.message}`);
    }
  }

  /**
   * 获取临时文件统计信息
   */
  getStats(): {
    totalFiles: number;
    trackedFiles: number;
    tempDir: string;
  } {
    return {
      totalFiles: this.tempFiles.size,
      trackedFiles: this.tempFiles.size,
      tempDir: this.defaultTempDir,
    };
  }
}

