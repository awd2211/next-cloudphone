import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuid } from 'uuid';

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private minioClient: Minio.Client;
  private bucket: string;
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  constructor(private configService: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: configService.get('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(configService.get('MINIO_PORT', '9000')),
      useSSL: configService.get('MINIO_USE_SSL') === 'true',
      accessKey: configService.get('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: configService.get('MINIO_SECRET_KEY', 'minioadmin'),
    });

    this.bucket = configService.get('MINIO_BUCKET', 'livechat-media');

    // 确保 bucket 存在
    this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucket);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucket);
        this.logger.log(`Created bucket: ${this.bucket}`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure bucket: ${error.message}`);
    }
  }

  async uploadFile(
    file: Buffer,
    originalName: string,
    mimeType: string,
    conversationId: string,
  ): Promise<UploadedFile> {
    // 验证文件
    if (file.length > this.maxFileSize) {
      throw new BadRequestException(`File too large. Maximum size is ${this.maxFileSize / 1024 / 1024}MB`);
    }

    if (!this.allowedTypes.includes(mimeType)) {
      throw new BadRequestException(`File type ${mimeType} is not allowed`);
    }

    const id = uuid();
    const ext = originalName.split('.').pop() || '';
    const objectName = `${conversationId}/${id}.${ext}`;

    try {
      await this.minioClient.putObject(this.bucket, objectName, file, file.length, {
        'Content-Type': mimeType,
        'x-amz-meta-original-name': originalName,
        'x-amz-meta-conversation-id': conversationId,
      });

      const url = await this.getPresignedUrl(objectName);

      this.logger.log(`Uploaded file: ${objectName} (${file.length} bytes)`);

      return {
        id,
        name: originalName,
        url,
        size: file.length,
        mimeType,
      };

    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  }

  async getPresignedUrl(objectName: string, expiry = 3600): Promise<string> {
    return this.minioClient.presignedGetObject(this.bucket, objectName, expiry);
  }

  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucket, objectName);
      this.logger.log(`Deleted file: ${objectName}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
    }
  }

  async deleteConversationFiles(conversationId: string): Promise<void> {
    try {
      const objectsStream = this.minioClient.listObjects(this.bucket, `${conversationId}/`, true);
      const objects: string[] = [];

      for await (const obj of objectsStream) {
        objects.push(obj.name);
      }

      if (objects.length > 0) {
        await this.minioClient.removeObjects(this.bucket, objects);
        this.logger.log(`Deleted ${objects.length} files for conversation ${conversationId}`);
      }

    } catch (error) {
      this.logger.error(`Failed to delete conversation files: ${error.message}`);
    }
  }

  getFileType(mimeType: string): 'image' | 'video' | 'audio' | 'file' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'file';
  }
}
