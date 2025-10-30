import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { of } from 'rxjs';
import { AppsService } from '../apps.service';
import { Application, AppStatus, AppCategory } from '../../entities/application.entity';
import { DeviceApplication, InstallStatus } from '../../entities/device-application.entity';
import { AppAuditRecord, AuditAction, AuditStatus } from '../../entities/app-audit-record.entity';
import { MinioService } from '../../minio/minio.service';
import { ApkParserService } from '../../apk/apk-parser.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { EventBusService } from '@cloudphone/shared';
import { SagaOrchestratorService } from '@cloudphone/shared';
import { CreateAppDto } from '../dto/create-app.dto';
import { UpdateAppDto } from '../dto/update-app.dto';

describe('AppsService', () => {
  let service: AppsService;
  let mockAppsRepository: any;
  let mockDeviceAppsRepository: any;
  let mockAuditRecordsRepository: any;
  let mockMinioService: any;
  let mockApkParserService: any;
  let mockHttpService: any;
  let mockConfigService: any;
  let mockEventBus: any;
  let mockSagaOrchestrator: any;
  let mockDataSource: any;
  let mockQueryRunner: any;

  beforeEach(async () => {
    // Mock QueryRunner
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        create: jest.fn((entity, data) => ({ id: 'app-123', ...data })),
        save: jest.fn((entity, data) => Promise.resolve({ id: 'app-123', ...data })),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      },
    };

    // Mock Repositories
    mockAppsRepository = {
      create: jest.fn((data) => ({ id: 'app-123', ...data })),
      save: jest.fn((data) => Promise.resolve(data)),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      increment: jest.fn().mockResolvedValue(undefined),
    };

    mockDeviceAppsRepository = {
      create: jest.fn((data) => ({ id: 'device-app-123', ...data })),
      save: jest.fn((data) => Promise.resolve(data)),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };

    mockAuditRecordsRepository = {
      create: jest.fn((data) => ({ id: 'audit-123', ...data })),
      save: jest.fn((data) => Promise.resolve(data)),
      find: jest.fn(),
      findAndCount: jest.fn(),
    };

    // Mock MinIO Service
    mockMinioService = {
      uploadFile: jest.fn().mockResolvedValue({ etag: 'test-etag' }),
      getFileStream: jest.fn(),
      getFileUrl: jest.fn().mockResolvedValue('https://minio.example.com/apps/test.apk?token=xyz'),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      getBucketName: jest.fn(() => 'cloudphone-apps'),
    };

    // Mock APK Parser Service
    mockApkParserService = {
      parseApk: jest.fn().mockResolvedValue({
        appName: 'Test App',
        packageName: 'com.test.app',
        versionName: '1.0.0',
        versionCode: 1,
        minSdkVersion: 21,
        targetSdkVersion: 30,
        permissions: ['INTERNET', 'CAMERA'],
      }),
    };

    // Mock HTTP Service (Axios)
    mockHttpService = {
      post: jest.fn(() => of({ data: { success: true } })),
    };

    // Mock Config Service
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'DEVICE_SERVICE_URL') return 'http://localhost:30002';
        return null;
      }),
    };

    // Mock Event Bus Service
    mockEventBus = {
      publishAppEvent: jest.fn().mockResolvedValue(undefined),
    };

    // Mock Saga Orchestrator Service
    mockSagaOrchestrator = {
      executeSaga: jest.fn().mockResolvedValue('saga-123'),
      getSagaStatus: jest.fn(),
      compensateSaga: jest.fn(),
    };

    // Mock DataSource
    mockDataSource = {
      createQueryRunner: jest.fn(() => mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppsService,
        {
          provide: getRepositoryToken(Application),
          useValue: mockAppsRepository,
        },
        {
          provide: getRepositoryToken(DeviceApplication),
          useValue: mockDeviceAppsRepository,
        },
        {
          provide: getRepositoryToken(AppAuditRecord),
          useValue: mockAuditRecordsRepository,
        },
        {
          provide: MinioService,
          useValue: mockMinioService,
        },
        {
          provide: ApkParserService,
          useValue: mockApkParserService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
        {
          provide: SagaOrchestratorService,
          useValue: mockSagaOrchestrator,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AppsService>(AppsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadApp', () => {
    const mockFile = {
      buffer: Buffer.from('fake apk content'),
      originalname: 'test.apk',
      mimetype: 'application/vnd.android.package-archive',
      size: 1024000,
      path: '/tmp/upload_test.apk',
    } as Express.Multer.File;

    const createAppDto: CreateAppDto = {
      name: 'Test App',
      description: 'Test description',
      category: AppCategory.SOCIAL,
      tenantId: 'tenant-123',
      uploaderId: 'user-123',
      tags: ['social', 'chat'],
    };

    it('should successfully upload an APK using Saga orchestration', async () => {
      const sagaId = 'saga-123';
      mockSagaOrchestrator.executeSaga.mockResolvedValue(sagaId);

      const mockApp = {
        id: 'app-123',
        packageName: 'com.test.app',
        versionCode: 1,
        status: AppStatus.UPLOADING,
      };

      // First call: duplicate check returns null (no existing app)
      // Second call: after saga, returns the created app
      mockAppsRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockApp);

      const result = await service.uploadApp(mockFile, createAppDto);

      expect(result.sagaId).toBe(sagaId);
      expect(result.application).toEqual(mockApp);
      expect(mockApkParserService.parseApk).toHaveBeenCalledWith(mockFile.path);
      expect(mockSagaOrchestrator.executeSaga).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'APP_UPLOAD',
          timeoutMs: 600000,
          maxRetries: 3,
          steps: expect.arrayContaining([
            expect.objectContaining({ name: 'CREATE_APP_RECORD' }),
            expect.objectContaining({ name: 'UPLOAD_TO_MINIO' }),
            expect.objectContaining({ name: 'UPDATE_APP_STATUS' }),
            expect.objectContaining({ name: 'UPDATE_LATEST_VERSION' }),
          ]),
        }),
        expect.objectContaining({
          packageName: 'com.test.app',
          versionName: '1.0.0',
          versionCode: 1,
        }),
      );
    });

    it('should throw error if APK parsing fails', async () => {
      mockApkParserService.parseApk.mockRejectedValue(new Error('Invalid APK'));

      await expect(service.uploadApp(mockFile, createAppDto)).rejects.toThrow('Invalid APK');
      expect(mockSagaOrchestrator.executeSaga).not.toHaveBeenCalled();
    });

    it('should throw error if app version already exists', async () => {
      const existingApp = {
        id: 'existing-app-123',
        packageName: 'com.test.app',
        versionCode: 1,
        status: AppStatus.AVAILABLE,
      };
      mockAppsRepository.findOne.mockResolvedValue(existingApp);

      await expect(service.uploadApp(mockFile, createAppDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadApp(mockFile, createAppDto)).rejects.toThrow(
        '应用 com.test.app 版本 1.0.0 (1) 已存在',
      );
      expect(mockSagaOrchestrator.executeSaga).not.toHaveBeenCalled();
    });

    it('should throw error if app record creation fails', async () => {
      mockSagaOrchestrator.executeSaga.mockResolvedValue('saga-123');
      mockAppsRepository.findOne.mockResolvedValue(null);

      await expect(service.uploadApp(mockFile, createAppDto)).rejects.toThrow(
        'App record creation failed',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated list of available apps', async () => {
      const mockApps = [
        {
          id: 'app-1',
          name: 'App 1',
          packageName: 'com.test.app1',
          status: AppStatus.AVAILABLE,
        },
        {
          id: 'app-2',
          name: 'App 2',
          packageName: 'com.test.app2',
          status: AppStatus.AVAILABLE,
        },
      ];
      mockAppsRepository.findAndCount.mockResolvedValue([mockApps, 2]);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({
        data: mockApps,
        total: 2,
        page: 1,
        limit: 10,
      });
      expect(mockAppsRepository.findAndCount).toHaveBeenCalledWith({
        where: { status: AppStatus.AVAILABLE },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter apps by tenantId and category', async () => {
      const mockApps = [
        {
          id: 'app-1',
          name: 'App 1',
          tenantId: 'tenant-123',
          category: AppCategory.SOCIAL,
        },
      ];
      mockAppsRepository.findAndCount.mockResolvedValue([mockApps, 1]);

      const result = await service.findAll(1, 10, 'tenant-123', AppCategory.SOCIAL);

      expect(result.data).toEqual(mockApps);
      expect(mockAppsRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          status: AppStatus.AVAILABLE,
          tenantId: 'tenant-123',
          category: AppCategory.SOCIAL,
        },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('should handle pagination correctly', async () => {
      mockAppsRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(3, 20);

      expect(result.page).toBe(3);
      expect(result.limit).toBe(20);
      expect(mockAppsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (3 - 1) * 20
          take: 20,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return app with refreshed download URL', async () => {
      const mockApp = {
        id: 'app-123',
        name: 'Test App',
        packageName: 'com.test.app',
        objectKey: 'apps/com.test.app/1.0.0_123456.apk',
        downloadUrl: 'old-url',
      };
      mockAppsRepository.findOne.mockResolvedValue(mockApp);

      const result = await service.findOne('app-123');

      expect(result.id).toBe('app-123');
      expect(result.downloadUrl).toBe('https://minio.example.com/apps/test.apk?token=xyz');
      expect(mockMinioService.getFileUrl).toHaveBeenCalledWith(mockApp.objectKey);
    });

    it('should throw NotFoundException if app does not exist', async () => {
      mockAppsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent')).rejects.toThrow('应用 #non-existent 不存在');
    });
  });

  describe('update', () => {
    it('should update app metadata', async () => {
      const mockApp = {
        id: 'app-123',
        name: 'Old Name',
        description: 'Old description',
        packageName: 'com.test.app',
      };
      mockAppsRepository.findOne.mockResolvedValue(mockApp);
      mockAppsRepository.save.mockResolvedValue({ ...mockApp, name: 'New Name' });

      const updateDto: UpdateAppDto = {
        name: 'New Name',
        description: 'New description',
      };

      const result = await service.update('app-123', updateDto);

      expect(result.name).toBe('New Name');
      expect(mockAppsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Name',
          description: 'New description',
        }),
      );
    });
  });

  describe('remove', () => {
    it('should soft delete app and remove file from MinIO', async () => {
      const mockApp = {
        id: 'app-123',
        name: 'Test App',
        objectKey: 'apps/com.test.app/1.0.0_123456.apk',
        status: AppStatus.AVAILABLE,
      };
      mockAppsRepository.findOne.mockResolvedValue(mockApp);
      mockAppsRepository.save.mockResolvedValue({ ...mockApp, status: AppStatus.DELETED });

      await service.remove('app-123');

      expect(mockMinioService.deleteFile).toHaveBeenCalledWith(mockApp.objectKey);
      expect(mockAppsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AppStatus.DELETED,
        }),
      );
    });
  });

  describe('installToDevice', () => {
    it('should create installation record and publish event', async () => {
      const mockApp = {
        id: 'app-123',
        name: 'Test App',
        packageName: 'com.test.app',
        downloadUrl: 'https://minio.example.com/test.apk',
      };
      mockAppsRepository.findOne.mockResolvedValue(mockApp);
      mockDeviceAppsRepository.findOne.mockResolvedValue(null); // Not installed yet

      const mockDeviceApp = {
        id: 'device-app-123',
        deviceId: 'device-123',
        applicationId: 'app-123',
        status: InstallStatus.PENDING,
      };
      mockDeviceAppsRepository.save.mockResolvedValue(mockDeviceApp);

      const result = await service.installToDevice('app-123', 'device-123');

      expect(result).toEqual(mockDeviceApp);
      expect(mockDeviceAppsRepository.create).toHaveBeenCalledWith({
        deviceId: 'device-123',
        applicationId: 'app-123',
        status: InstallStatus.PENDING,
      });
      expect(mockEventBus.publishAppEvent).toHaveBeenCalledWith(
        'install.requested',
        expect.objectContaining({
          installationId: 'device-app-123',
          deviceId: 'device-123',
          appId: 'app-123',
          downloadUrl: mockApp.downloadUrl,
        }),
      );
    });

    it('should throw error if app is already installed', async () => {
      const mockApp = {
        id: 'app-123',
        name: 'Test App',
      };
      mockAppsRepository.findOne.mockResolvedValue(mockApp);

      const existingInstallation = {
        id: 'device-app-123',
        deviceId: 'device-123',
        applicationId: 'app-123',
        status: InstallStatus.INSTALLED,
      };
      mockDeviceAppsRepository.findOne.mockResolvedValue(existingInstallation);

      await expect(service.installToDevice('app-123', 'device-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.installToDevice('app-123', 'device-123')).rejects.toThrow(
        '应用已安装在该设备上',
      );
      expect(mockEventBus.publishAppEvent).not.toHaveBeenCalled();
    });
  });

  describe('uninstallFromDevice', () => {
    it('should update status and publish uninstall event', async () => {
      const mockApp = {
        id: 'app-123',
        name: 'Test App',
        packageName: 'com.test.app',
      };
      mockAppsRepository.findOne.mockResolvedValue(mockApp);

      const mockDeviceApp = {
        id: 'device-app-123',
        deviceId: 'device-123',
        applicationId: 'app-123',
        status: InstallStatus.INSTALLED,
      };
      mockDeviceAppsRepository.findOne.mockResolvedValue(mockDeviceApp);
      mockDeviceAppsRepository.save.mockResolvedValue({
        ...mockDeviceApp,
        status: InstallStatus.UNINSTALLING,
      });

      await service.uninstallFromDevice('app-123', 'device-123');

      expect(mockDeviceAppsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: InstallStatus.UNINSTALLING,
        }),
      );
      expect(mockEventBus.publishAppEvent).toHaveBeenCalledWith(
        'uninstall.requested',
        expect.objectContaining({
          deviceId: 'device-123',
          appId: 'app-123',
          packageName: 'com.test.app',
        }),
      );
    });

    it('should throw error if app is not installed', async () => {
      const mockApp = {
        id: 'app-123',
        name: 'Test App',
      };
      mockAppsRepository.findOne.mockResolvedValue(mockApp);
      mockDeviceAppsRepository.findOne.mockResolvedValue(null);

      await expect(service.uninstallFromDevice('app-123', 'device-123')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.uninstallFromDevice('app-123', 'device-123')).rejects.toThrow(
        '应用未安装在该设备上',
      );
      expect(mockEventBus.publishAppEvent).not.toHaveBeenCalled();
    });
  });

  describe('getDeviceApps', () => {
    it('should return all installed apps for a device', async () => {
      const mockDeviceApps = [
        {
          id: 'device-app-1',
          deviceId: 'device-123',
          applicationId: 'app-1',
          status: InstallStatus.INSTALLED,
        },
        {
          id: 'device-app-2',
          deviceId: 'device-123',
          applicationId: 'app-2',
          status: InstallStatus.INSTALLED,
        },
      ];
      mockDeviceAppsRepository.find.mockResolvedValue(mockDeviceApps);

      const result = await service.getDeviceApps('device-123');

      expect(result).toEqual(mockDeviceApps);
      expect(mockDeviceAppsRepository.find).toHaveBeenCalledWith({
        where: { deviceId: 'device-123', status: InstallStatus.INSTALLED },
      });
    });
  });

  describe('getAppDevices', () => {
    it('should return all devices that have the app installed', async () => {
      const mockDeviceApps = [
        {
          id: 'device-app-1',
          deviceId: 'device-1',
          applicationId: 'app-123',
          status: InstallStatus.INSTALLED,
        },
        {
          id: 'device-app-2',
          deviceId: 'device-2',
          applicationId: 'app-123',
          status: InstallStatus.INSTALLED,
        },
      ];
      mockDeviceAppsRepository.find.mockResolvedValue(mockDeviceApps);

      const result = await service.getAppDevices('app-123');

      expect(result).toEqual(mockDeviceApps);
      expect(mockDeviceAppsRepository.find).toHaveBeenCalledWith({
        where: { applicationId: 'app-123', status: InstallStatus.INSTALLED },
      });
    });
  });

  describe('getAppVersions', () => {
    it('should return all versions of an app', async () => {
      const mockVersions = [
        {
          id: 'app-3',
          packageName: 'com.test.app',
          versionName: '3.0.0',
          versionCode: 3,
          status: AppStatus.AVAILABLE,
        },
        {
          id: 'app-2',
          packageName: 'com.test.app',
          versionName: '2.0.0',
          versionCode: 2,
          status: AppStatus.AVAILABLE,
        },
        {
          id: 'app-1',
          packageName: 'com.test.app',
          versionName: '1.0.0',
          versionCode: 1,
          status: AppStatus.AVAILABLE,
        },
      ];
      mockAppsRepository.find.mockResolvedValue(mockVersions);

      const result = await service.getAppVersions('com.test.app');

      expect(result).toEqual(mockVersions);
      expect(mockAppsRepository.find).toHaveBeenCalledWith({
        where: { packageName: 'com.test.app', status: AppStatus.AVAILABLE },
        order: { versionCode: 'DESC' },
      });
    });
  });

  describe('getLatestVersion', () => {
    it('should return the latest version of an app', async () => {
      const mockLatestApp = {
        id: 'app-3',
        packageName: 'com.test.app',
        versionName: '3.0.0',
        versionCode: 3,
        isLatest: true,
        status: AppStatus.AVAILABLE,
      };
      mockAppsRepository.findOne.mockResolvedValue(mockLatestApp);

      const result = await service.getLatestVersion('com.test.app');

      expect(result).toEqual(mockLatestApp);
      expect(mockAppsRepository.findOne).toHaveBeenCalledWith({
        where: { packageName: 'com.test.app', isLatest: true, status: AppStatus.AVAILABLE },
      });
    });
  });

  describe('submitForReview', () => {
    it('should submit app for review', async () => {
      const mockApp = {
        id: 'app-123',
        name: 'Test App',
        status: AppStatus.UPLOADING,
      };
      mockAppsRepository.findOne.mockResolvedValue(mockApp);
      mockAppsRepository.save.mockResolvedValue({ ...mockApp, status: AppStatus.PENDING_REVIEW });

      const result = await service.submitForReview('app-123', { comment: 'Please review' });

      expect(result.status).toBe(AppStatus.PENDING_REVIEW);
      expect(mockAuditRecordsRepository.create).toHaveBeenCalledWith({
        applicationId: 'app-123',
        action: AuditAction.SUBMIT,
        status: AuditStatus.PENDING,
        comment: 'Please review',
      });
    });

    it('should throw error if app status is not UPLOADING or REJECTED', async () => {
      const mockApp = {
        id: 'app-123',
        name: 'Test App',
        status: AppStatus.APPROVED,
      };
      mockAppsRepository.findOne.mockResolvedValue(mockApp);

      await expect(service.submitForReview('app-123', { comment: 'Review' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('approveApp', () => {
    it('should approve app and publish event', async () => {
      const mockApp = {
        id: 'app-123',
        name: 'Test App',
        packageName: 'com.test.app',
        versionName: '1.0.0',
        status: AppStatus.PENDING_REVIEW,
      };
      mockAppsRepository.findOne.mockResolvedValue(mockApp);
      mockAppsRepository.save.mockResolvedValue({ ...mockApp, status: AppStatus.APPROVED });

      const result = await service.approveApp('app-123', {
        reviewerId: 'reviewer-123',
        comment: 'Approved',
      });

      expect(result.status).toBe(AppStatus.APPROVED);
      expect(mockAuditRecordsRepository.create).toHaveBeenCalledWith({
        applicationId: 'app-123',
        action: AuditAction.APPROVE,
        status: AuditStatus.APPROVED,
        reviewerId: 'reviewer-123',
        comment: 'Approved',
      });
      expect(mockEventBus.publishAppEvent).toHaveBeenCalledWith(
        '审核.批准',
        expect.objectContaining({
          appId: 'app-123',
          packageName: 'com.test.app',
          versionName: '1.0.0',
          reviewerId: 'reviewer-123',
        }),
      );
    });

    it('should throw error if app status is not PENDING_REVIEW', async () => {
      const mockApp = {
        id: 'app-123',
        status: AppStatus.APPROVED,
      };
      mockAppsRepository.findOne.mockResolvedValue(mockApp);

      await expect(
        service.approveApp('app-123', { reviewerId: 'reviewer-123', comment: 'Approve' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectApp', () => {
    it('should reject app and publish event', async () => {
      const mockApp = {
        id: 'app-123',
        name: 'Test App',
        packageName: 'com.test.app',
        versionName: '1.0.0',
        status: AppStatus.PENDING_REVIEW,
      };
      mockAppsRepository.findOne.mockResolvedValue(mockApp);
      mockAppsRepository.save.mockResolvedValue({ ...mockApp, status: AppStatus.REJECTED });

      const result = await service.rejectApp('app-123', {
        reviewerId: 'reviewer-123',
        comment: 'Security issues',
      });

      expect(result.status).toBe(AppStatus.REJECTED);
      expect(mockAuditRecordsRepository.create).toHaveBeenCalledWith({
        applicationId: 'app-123',
        action: AuditAction.REJECT,
        status: AuditStatus.REJECTED,
        reviewerId: 'reviewer-123',
        comment: 'Security issues',
      });
      expect(mockEventBus.publishAppEvent).toHaveBeenCalledWith(
        '审核.拒绝',
        expect.objectContaining({
          appId: 'app-123',
          reason: 'Security issues',
        }),
      );
    });
  });

  describe('requestChanges', () => {
    it('should request changes to app', async () => {
      const mockApp = {
        id: 'app-123',
        name: 'Test App',
        status: AppStatus.PENDING_REVIEW,
      };
      mockAppsRepository.findOne.mockResolvedValue(mockApp);

      const result = await service.requestChanges('app-123', {
        reviewerId: 'reviewer-123',
        comment: 'Please update icon',
      });

      expect(result.status).toBe(AppStatus.PENDING_REVIEW); // Status unchanged
      expect(mockAuditRecordsRepository.create).toHaveBeenCalledWith({
        applicationId: 'app-123',
        action: AuditAction.REQUEST_CHANGES,
        status: AuditStatus.CHANGES_REQUESTED,
        reviewerId: 'reviewer-123',
        comment: 'Please update icon',
      });
    });
  });

  describe('getAuditRecords', () => {
    it('should return audit records for an app', async () => {
      const mockRecords = [
        {
          id: 'audit-1',
          applicationId: 'app-123',
          action: AuditAction.SUBMIT,
          status: AuditStatus.PENDING,
          createdAt: new Date(),
        },
        {
          id: 'audit-2',
          applicationId: 'app-123',
          action: AuditAction.APPROVE,
          status: AuditStatus.APPROVED,
          createdAt: new Date(),
        },
      ];
      mockAuditRecordsRepository.find.mockResolvedValue(mockRecords);

      const result = await service.getAuditRecords('app-123');

      expect(result).toEqual(mockRecords);
      expect(mockAuditRecordsRepository.find).toHaveBeenCalledWith({
        where: { applicationId: 'app-123' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getPendingReviewApps', () => {
    it('should return paginated list of pending review apps', async () => {
      const mockApps = [
        {
          id: 'app-1',
          name: 'App 1',
          status: AppStatus.PENDING_REVIEW,
        },
      ];
      mockAppsRepository.findAndCount.mockResolvedValue([mockApps, 1]);

      const result = await service.getPendingReviewApps(1, 10);

      expect(result.data).toEqual(mockApps);
      expect(mockAppsRepository.findAndCount).toHaveBeenCalledWith({
        where: { status: AppStatus.PENDING_REVIEW },
        skip: 0,
        take: 10,
        order: { createdAt: 'ASC' },
      });
    });
  });
});
