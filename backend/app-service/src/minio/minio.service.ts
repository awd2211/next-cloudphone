import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as fs from 'fs';

@Injectable()
export class MinioService {
  private minioClient: Minio.Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get('MINIO_ENDPOINT') || 'localhost',
      port: parseInt(this.configService.get('MINIO_PORT') || '9000'),
      useSSL: this.configService.get('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get('MINIO_ACCESS_KEY') || 'minioadmin',
      secretKey: this.configService.get('MINIO_SECRET_KEY') || 'minioadmin',
    });

    this.bucketName = this.configService.get('MINIO_BUCKET') || 'cloudphone-apps';
    this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        console.log(`✅ Created MinIO bucket: ${this.bucketName}`);
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
    }
  }

  async uploadFile(
    filePath: string,
    objectName: string,
    metadata?: Record<string, string>,
  ): Promise<{ etag: string; objectKey: string }> {
    try {
      const fileStream = fs.createReadStream(filePath);
      const stats = fs.statSync(filePath);

      const metaData = {
        'Content-Type': 'application/vnd.android.package-archive',
        ...metadata,
      };

      const result = await this.minioClient.putObject(
        this.bucketName,
        objectName,
        fileStream,
        stats.size,
        metaData,
      );

      return {
        etag: result.etag,
        objectKey: objectName,
      };
    } catch (error) {
      throw new InternalServerErrorException(`文件上传失败: ${error.message}`);
    }
  }

  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, objectName);
    } catch (error) {
      throw new InternalServerErrorException(`文件删除失败: ${error.message}`);
    }
  }

  async getFileUrl(objectName: string, expirySeconds: number = 7 * 24 * 60 * 60): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(
        this.bucketName,
        objectName,
        expirySeconds,
      );
    } catch (error) {
      throw new InternalServerErrorException(`获取文件 URL 失败: ${error.message}`);
    }
  }

  async getFileInfo(objectName: string): Promise<Minio.BucketItemStat> {
    try {
      return await this.minioClient.statObject(this.bucketName, objectName);
    } catch (error) {
      throw new InternalServerErrorException(`获取文件信息失败: ${error.message}`);
    }
  }

  async listFiles(prefix?: string): Promise<Minio.BucketItem[]> {
    return new Promise((resolve, reject) => {
      const files: Minio.BucketItem[] = [];
      const stream = this.minioClient.listObjects(this.bucketName, prefix, true);

      stream.on('data', (obj) => files.push(obj));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(files));
    });
  }

  async getFileStream(objectName: string): Promise<NodeJS.ReadableStream> {
    try {
      return await this.minioClient.getObject(this.bucketName, objectName);
    } catch (error) {
      throw new InternalServerErrorException(`获取文件流失败: ${error.message}`);
    }
  }

  getBucketName(): string {
    return this.bucketName;
  }
}
