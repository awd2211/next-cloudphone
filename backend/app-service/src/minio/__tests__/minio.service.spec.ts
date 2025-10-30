import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { MinioService } from '../minio.service';
import * as Minio from 'minio';
import * as fs from 'fs';

// Mock the fs and minio modules
jest.mock('fs');
jest.mock('minio');

describe('MinioService', () => {
  let service: MinioService;
  let mockMinioClient: jest.Mocked<Minio.Client>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Create mock MinIO client
    mockMinioClient = {
      bucketExists: jest.fn(),
      makeBucket: jest.fn(),
      putObject: jest.fn(),
      removeObject: jest.fn(),
      presignedGetObject: jest.fn(),
      statObject: jest.fn(),
      listObjects: jest.fn(),
      getObject: jest.fn(),
    } as any;

    // Mock ConfigService
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, string> = {
          MINIO_ENDPOINT: 'localhost',
          MINIO_PORT: '9000',
          MINIO_USE_SSL: 'false',
          MINIO_ACCESS_KEY: 'minioadmin',
          MINIO_SECRET_KEY: 'minioadmin',
          MINIO_BUCKET: 'cloudphone-apps',
        };
        return config[key] || defaultValue;
      }),
    } as any;

    // Mock Minio.Client constructor
    (Minio.Client as jest.Mock).mockImplementation(() => mockMinioClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinioService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    mockMinioClient.bucketExists.mockResolvedValue(true);

    service = module.get<MinioService>(MinioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should create bucket if it does not exist', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      mockMinioClient.makeBucket.mockResolvedValue(undefined);

      // Reinitialize service to trigger bucket creation
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MinioService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const newService = module.get<MinioService>(MinioService);

      // Wait for ensureBucketExists to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('cloudphone-apps');
    });

    it('should return bucket name', () => {
      const bucketName = service.getBucketName();
      expect(bucketName).toBe('cloudphone-apps');
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const filePath = '/tmp/test.apk';
      const objectName = 'apps/test.apk';
      const mockStats = { size: 1024 };

      (fs.createReadStream as jest.Mock).mockReturnValue('mockStream' as any);
      (fs.statSync as jest.Mock).mockReturnValue(mockStats);
      mockMinioClient.putObject.mockResolvedValue({ etag: 'test-etag' } as any);

      const result = await service.uploadFile(filePath, objectName);

      expect(result).toEqual({
        etag: 'test-etag',
        objectKey: objectName,
      });
      expect(fs.createReadStream).toHaveBeenCalledWith(filePath);
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'cloudphone-apps',
        objectName,
        'mockStream',
        1024,
        expect.objectContaining({
          'Content-Type': 'application/vnd.android.package-archive',
        }),
      );
    });

    it('should upload file with custom metadata', async () => {
      const filePath = '/tmp/test.apk';
      const objectName = 'apps/test.apk';
      const metadata = { 'x-app-version': '1.0.0' };

      (fs.createReadStream as jest.Mock).mockReturnValue('mockStream' as any);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 1024 });
      mockMinioClient.putObject.mockResolvedValue({ etag: 'test-etag' } as any);

      await service.uploadFile(filePath, objectName, metadata);

      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'cloudphone-apps',
        objectName,
        'mockStream',
        1024,
        expect.objectContaining({
          'Content-Type': 'application/vnd.android.package-archive',
          'x-app-version': '1.0.0',
        }),
      );
    });

    it('should throw InternalServerErrorException on upload failure', async () => {
      const filePath = '/tmp/test.apk';
      const objectName = 'apps/test.apk';

      (fs.createReadStream as jest.Mock).mockReturnValue('mockStream' as any);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 1024 });
      mockMinioClient.putObject.mockRejectedValue(new Error('Upload failed'));

      await expect(service.uploadFile(filePath, objectName)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.uploadFile(filePath, objectName)).rejects.toThrow(
        '文件上传失败',
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const objectName = 'apps/test.apk';
      mockMinioClient.removeObject.mockResolvedValue(undefined);

      await service.deleteFile(objectName);

      expect(mockMinioClient.removeObject).toHaveBeenCalledWith(
        'cloudphone-apps',
        objectName,
      );
    });

    it('should throw InternalServerErrorException on delete failure', async () => {
      const objectName = 'apps/test.apk';
      mockMinioClient.removeObject.mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteFile(objectName)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.deleteFile(objectName)).rejects.toThrow(
        '文件删除失败',
      );
    });
  });

  describe('getFileUrl', () => {
    it('should generate presigned URL with default expiry', async () => {
      const objectName = 'apps/test.apk';
      const expectedUrl = 'https://minio.example.com/cloudphone-apps/apps/test.apk?token=xyz';

      mockMinioClient.presignedGetObject.mockResolvedValue(expectedUrl);

      const result = await service.getFileUrl(objectName);

      expect(result).toBe(expectedUrl);
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'cloudphone-apps',
        objectName,
        7 * 24 * 60 * 60, // 7 days
      );
    });

    it('should generate presigned URL with custom expiry', async () => {
      const objectName = 'apps/test.apk';
      const expirySeconds = 3600; // 1 hour
      const expectedUrl = 'https://minio.example.com/cloudphone-apps/apps/test.apk?token=xyz';

      mockMinioClient.presignedGetObject.mockResolvedValue(expectedUrl);

      const result = await service.getFileUrl(objectName, expirySeconds);

      expect(result).toBe(expectedUrl);
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'cloudphone-apps',
        objectName,
        expirySeconds,
      );
    });

    it('should throw InternalServerErrorException on URL generation failure', async () => {
      const objectName = 'apps/test.apk';
      mockMinioClient.presignedGetObject.mockRejectedValue(new Error('URL generation failed'));

      await expect(service.getFileUrl(objectName)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.getFileUrl(objectName)).rejects.toThrow(
        '获取文件 URL 失败',
      );
    });
  });

  describe('getFileInfo', () => {
    it('should return file information', async () => {
      const objectName = 'apps/test.apk';
      const fileInfo = {
        size: 1024,
        etag: 'test-etag',
        lastModified: new Date(),
        metaData: {},
      };

      mockMinioClient.statObject.mockResolvedValue(fileInfo as any);

      const result = await service.getFileInfo(objectName);

      expect(result).toEqual(fileInfo);
      expect(mockMinioClient.statObject).toHaveBeenCalledWith(
        'cloudphone-apps',
        objectName,
      );
    });

    it('should throw InternalServerErrorException on stat failure', async () => {
      const objectName = 'apps/test.apk';
      mockMinioClient.statObject.mockRejectedValue(new Error('Stat failed'));

      await expect(service.getFileInfo(objectName)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.getFileInfo(objectName)).rejects.toThrow(
        '获取文件信息失败',
      );
    });
  });

  describe('listFiles', () => {
    it('should list all files without prefix', async () => {
      const mockFiles = [
        { name: 'apps/test1.apk', size: 1024 },
        { name: 'apps/test2.apk', size: 2048 },
      ];

      const mockStream: any = {
        on: jest.fn((event: string, handler: (...args: any[]) => void): any => {
          if (event === 'data') {
            mockFiles.forEach((file) => handler(file));
          } else if (event === 'end') {
            setTimeout(() => handler(), 0);
          }
          return mockStream;
        }),
      };

      mockMinioClient.listObjects.mockReturnValue(mockStream as any);

      const result = await service.listFiles();

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockFiles);
      expect(mockMinioClient.listObjects).toHaveBeenCalledWith(
        'cloudphone-apps',
        undefined,
        true,
      );
    });

    it('should list files with prefix', async () => {
      const prefix = 'apps/v1/';
      const mockFiles = [{ name: 'apps/v1/test.apk', size: 1024 }];

      const mockStream: any = {
        on: jest.fn((event: string, handler: (...args: any[]) => void): any => {
          if (event === 'data') {
            mockFiles.forEach((file) => handler(file));
          } else if (event === 'end') {
            setTimeout(() => handler(), 0);
          }
          return mockStream;
        }),
      };

      mockMinioClient.listObjects.mockReturnValue(mockStream as any);

      const result = await service.listFiles(prefix);

      expect(result).toHaveLength(1);
      expect(mockMinioClient.listObjects).toHaveBeenCalledWith(
        'cloudphone-apps',
        prefix,
        true,
      );
    });

    it('should handle list files error', async () => {
      const mockStream: any = {
        on: jest.fn((event: string, handler: (...args: any[]) => void): any => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('List failed')), 0);
          }
          return mockStream;
        }),
      };

      mockMinioClient.listObjects.mockReturnValue(mockStream as any);

      await expect(service.listFiles()).rejects.toThrow('List failed');
    });
  });

  describe('getFileStream', () => {
    it('should return file stream', async () => {
      const objectName = 'apps/test.apk';
      const mockStream = { pipe: jest.fn() } as any;

      mockMinioClient.getObject.mockResolvedValue(mockStream);

      const result = await service.getFileStream(objectName);

      expect(result).toBe(mockStream);
      expect(mockMinioClient.getObject).toHaveBeenCalledWith(
        'cloudphone-apps',
        objectName,
      );
    });

    it('should throw InternalServerErrorException on stream failure', async () => {
      const objectName = 'apps/test.apk';
      mockMinioClient.getObject.mockRejectedValue(new Error('Stream failed'));

      await expect(service.getFileStream(objectName)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.getFileStream(objectName)).rejects.toThrow(
        '获取文件流失败',
      );
    });
  });
});
