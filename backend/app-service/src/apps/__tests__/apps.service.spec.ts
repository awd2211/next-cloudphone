import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AppsService } from '../apps.service';
import { Application, AppStatus, AppCategory } from '../../entities/application.entity';
import { DeviceApplication, InstallStatus } from '../../entities/device-application.entity';
import { AppAuditRecord } from '../../entities/app-audit-record.entity';
import { MinioService } from '../../minio/minio.service';
import { ApkParserService } from '../../apk/apk-parser.service';
import { EventBusService } from '@cloudphone/shared';
import * as fs from 'fs';

// Mock fs
jest.mock('fs');

describe('AppsService', () => {
  let service: AppsService;
  let appsRepository: jest.Mocked<Repository<Application>>;
  let deviceAppsRepository: jest.Mocked<Repository<DeviceApplication>>;
  let auditRecordsRepository: jest.Mocked<Repository<AppAuditRecord>>;
  let minioService: jest.Mocked<MinioService>;
  let apkParserService: jest.Mocked<ApkParserService>;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;
  let eventBus: jest.Mocked<EventBusService>;

  const mockApp: Partial<Application> = {
    id: 'app-123',
    name: 'Test App',
    packageName: 'com.test.app',
    versionName: '1.0.0',
    versionCode: 1,
    size: 1024000,
    bucketName: 'apps',
    objectKey: 'apps/com.test.app/1.0.0_123.apk',
    downloadUrl: 'http://minio/apps/test.apk',
    status: AppStatus.AVAILABLE,
    isLatest: true,
    category: AppCategory.PRODUCTIVITY,
    tenantId: 'tenant-1',
  };

  const mockApkInfo = {
    packageName: 'com.test.app',
    appName: 'Test App',
    versionName: '1.0.0',
    versionCode: 1,
    minSdkVersion: 21,
    targetSdkVersion: 30,
    permissions: ['INTERNET', 'CAMERA'],
  };

  const mockFile = {
    path: '/tmp/upload.apk',
    size: 1024000,
    originalname: 'test.apk',
    mimetype: 'application/vnd.android.package-archive',
  } as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppsService,
        {
          provide: getRepositoryToken(Application),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DeviceApplication),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AppAuditRecord),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: MinioService,
          useValue: {
            uploadFile: jest.fn(),
            getFileUrl: jest.fn(),
            deleteFile: jest.fn(),
            getFileStream: jest.fn(),
            getBucketName: jest.fn(() => 'apps'),
          },
        },
        {
          provide: ApkParserService,
          useValue: {
            parseApk: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: {
            publishAppEvent: jest.fn(),
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AppsService>(AppsService);
    appsRepository = module.get(getRepositoryToken(Application));
    deviceAppsRepository = module.get(getRepositoryToken(DeviceApplication));
    auditRecordsRepository = module.get(getRepositoryToken(AppAuditRecord));
    minioService = module.get(MinioService);
    apkParserService = module.get(ApkParserService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
    eventBus = module.get(EventBusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadApp', () => {
    it('should successfully upload a new app', async () => {
      apkParserService.parseApk.mockResolvedValue(mockApkInfo);
      appsRepository.findOne.mockResolvedValue(null);
      minioService.uploadFile.mockResolvedValue({
        etag: 'test-etag',
        versionId: 'v1',
      } as any);
      minioService.getFileUrl.mockResolvedValue('http://minio/apps/test.apk');
      appsRepository.create.mockReturnValue(mockApp as Application);
      appsRepository.save.mockResolvedValue(mockApp as Application);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.uploadApp(mockFile, {
        name: 'Test App',
        category: AppCategory.PRODUCTIVITY,
        description: 'Test description',
      });

      expect(result).toEqual(mockApp);
      expect(apkParserService.parseApk).toHaveBeenCalledWith('/tmp/upload.apk');
      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(appsRepository.save).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/upload.apk');
    });

    it('should throw BadRequestException if app version already exists', async () => {
      apkParserService.parseApk.mockResolvedValue(mockApkInfo);
      appsRepository.findOne.mockResolvedValue(mockApp as Application);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

      await expect(
        service.uploadApp(mockFile, { name: 'Test App' }),
      ).rejects.toThrow(BadRequestException);

      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should clean up temp file even if upload fails', async () => {
      apkParserService.parseApk.mockRejectedValue(new Error('Parse failed'));
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

      await expect(
        service.uploadApp(mockFile, { name: 'Test App' }),
      ).rejects.toThrow('Parse failed');

      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/upload.apk');
    });
  });

  describe('findAll', () => {
    it('should return paginated apps', async () => {
      const apps = [mockApp, { ...mockApp, id: 'app-456' }];
      appsRepository.findAndCount.mockResolvedValue([apps as Application[], 2]);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({
        data: apps,
        total: 2,
        page: 1,
        limit: 10,
      });
      expect(appsRepository.findAndCount).toHaveBeenCalledWith({
        where: { status: AppStatus.AVAILABLE },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter by tenantId when provided', async () => {
      appsRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, 'tenant-123');

      expect(appsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: AppStatus.AVAILABLE, tenantId: 'tenant-123' },
        }),
      );
    });

    it('should filter by category when provided', async () => {
      appsRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, undefined, 'games');

      expect(appsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: AppStatus.AVAILABLE, category: 'games' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return an app by id', async () => {
      appsRepository.findOne.mockResolvedValue(mockApp as Application);
      minioService.getFileUrl.mockResolvedValue('http://minio/apps/test.apk');

      const result = await service.findOne('app-123');

      expect(result).toEqual(mockApp);
      expect(appsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'app-123' },
      });
      expect(minioService.getFileUrl).toHaveBeenCalledWith(mockApp.objectKey);
    });

    it('should throw NotFoundException if app not found', async () => {
      appsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an app', async () => {
      const updatedApp = { ...mockApp, name: 'Updated App' };
      appsRepository.findOne.mockResolvedValue(mockApp as Application);
      minioService.getFileUrl.mockResolvedValue('http://minio/apps/test.apk');
      appsRepository.save.mockResolvedValue(updatedApp as Application);

      const result = await service.update('app-123', { name: 'Updated App' });

      expect(result.name).toBe('Updated App');
      expect(appsRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if app not found', async () => {
      appsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete an app', async () => {
      appsRepository.findOne.mockResolvedValue(mockApp as Application);
      minioService.getFileUrl.mockResolvedValue('http://minio/apps/test.apk');
      minioService.deleteFile.mockResolvedValue(undefined);
      appsRepository.save.mockResolvedValue({
        ...mockApp,
        status: AppStatus.DELETED,
      } as Application);

      await service.remove('app-123');

      expect(minioService.deleteFile).toHaveBeenCalledWith(mockApp.objectKey);
      expect(appsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AppStatus.DELETED,
        }),
      );
    });

    it('should throw NotFoundException if app not found', async () => {
      appsRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('installToDevice', () => {
    const mockDeviceApp: Partial<DeviceApplication> = {
      id: 'device-app-123',
      deviceId: 'device-123',
      applicationId: 'app-123',
      status: InstallStatus.PENDING,
    };

    it('should create installation request and publish event', async () => {
      appsRepository.findOne.mockResolvedValue(mockApp as Application);
      minioService.getFileUrl.mockResolvedValue('http://minio/apps/test.apk');
      deviceAppsRepository.findOne.mockResolvedValue(null);
      deviceAppsRepository.create.mockReturnValue(
        mockDeviceApp as DeviceApplication,
      );
      deviceAppsRepository.save.mockResolvedValue(
        mockDeviceApp as DeviceApplication,
      );
      eventBus.publishAppEvent.mockResolvedValue(undefined);

      const result = await service.installToDevice('app-123', 'device-123');

      expect(result).toEqual(mockDeviceApp);
      expect(deviceAppsRepository.create).toHaveBeenCalledWith({
        deviceId: 'device-123',
        applicationId: 'app-123',
        status: InstallStatus.PENDING,
      });
      expect(eventBus.publishAppEvent).toHaveBeenCalledWith(
        'install.requested',
        expect.objectContaining({
          installationId: 'device-app-123',
          deviceId: 'device-123',
          appId: 'app-123',
        }),
      );
    });

    it('should throw BadRequestException if app already installed', async () => {
      appsRepository.findOne.mockResolvedValue(mockApp as Application);
      minioService.getFileUrl.mockResolvedValue('http://minio/apps/test.apk');
      deviceAppsRepository.findOne.mockResolvedValue({
        ...mockDeviceApp,
        status: InstallStatus.INSTALLED,
      } as DeviceApplication);

      await expect(
        service.installToDevice('app-123', 'device-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if app not found', async () => {
      appsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.installToDevice('nonexistent', 'device-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
