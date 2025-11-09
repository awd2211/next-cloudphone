import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppsController } from './apps.controller';
import { AppsService } from './apps.service';
import { AppInstallationSaga } from './installation.saga';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

describe('AppsController', () => {
  let app: INestApplication;
  let service: AppsService;
  let saga: AppInstallationSaga;

  const mockAppsService = {
    uploadApp: jest.fn(),
    findAll: jest.fn(),
    findAllCursor: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getFiltersMetadata: jest.fn(),
    getQuickList: jest.fn(),
    getAppDevices: jest.fn(),
    getAppVersions: jest.fn(),
    getLatestVersion: jest.fn(),
    uninstallFromDevice: jest.fn(),
    getDeviceApps: jest.fn(),
    submitForReview: jest.fn(),
    approveApp: jest.fn(),
    rejectApp: jest.fn(),
    requestChanges: jest.fn(),
    getAuditRecords: jest.fn(),
    getPendingReviewApps: jest.fn(),
    getAllAuditRecords: jest.fn(),
  };

  const mockInstallationSaga = {
    startInstallation: jest.fn(),
    getSagaStatus: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = { userId: 'user-123', sub: 'user-123' };
      return true;
    }),
  };

  const mockPermissionsGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockApp = {
    id: 'app-123',
    packageName: 'com.example.app',
    name: 'Example App',
    version: '1.0.0',
    versionCode: 1,
    category: 'social',
    description: 'An example app',
    filePath: '/path/to/app.apk',
    fileSize: 10485760, // 10MB
    status: 'approved',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppsController],
      providers: [
        {
          provide: AppsService,
          useValue: mockAppsService,
        },
        {
          provide: AppInstallationSaga,
          useValue: mockInstallationSaga,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue(mockAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    service = moduleFixture.get<AppsService>(AppsService);
    saga = moduleFixture.get<AppInstallationSaga>(AppInstallationSaga);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  /**
   * ✅ 响应格式验证测试
   * 确保所有端点返回正确的格式,包含 success 字段
   */
  describe('Response Format Validation', () => {
    describe('GET /apps - findAll', () => {
      it('should return response with success field', async () => {
        // Arrange
        mockAppsService.findAll.mockResolvedValue({
          data: [mockApp],
          total: 1,
          page: 1,
          limit: 10,
        });

        // Act
        const response = await request(app.getHttpServer())
          .get('/apps')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /apps/cursor - findAllCursor', () => {
      it('should return cursor pagination response with success field', async () => {
        // Arrange
        mockAppsService.findAllCursor.mockResolvedValue({
          data: [mockApp],
          nextCursor: 'cursor-123',
          hasMore: true,
          count: 1,
        });

        // Act
        const response = await request(app.getHttpServer())
          .get('/apps/cursor')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('nextCursor');
        expect(response.body).toHaveProperty('hasMore');
      });
    });

    describe('GET /apps/filters/metadata - getFiltersMetadata', () => {
      it('should return filter metadata with success field', async () => {
        // Arrange
        mockAppsService.getFiltersMetadata.mockResolvedValue({
          filters: [],
          totalRecords: 0,
        });

        // Act
        const response = await request(app.getHttpServer())
          .get('/apps/filters/metadata')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('GET /apps/quick-list - getQuickList', () => {
      it('should return quick list with success field', async () => {
        // Arrange
        mockAppsService.getQuickList.mockResolvedValue({
          items: [{ id: 'app-123', name: 'App 1' }],
          total: 1,
        });

        // Act
        const response = await request(app.getHttpServer())
          .get('/apps/quick-list')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('GET /apps/:id - findOne', () => {
      it('should return single app with success field', async () => {
        // Arrange
        mockAppsService.findOne.mockResolvedValue(mockApp);

        // Act
        const response = await request(app.getHttpServer())
          .get('/apps/app-123')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data.id).toBe('app-123');
      });
    });

    describe('GET /apps/:id/devices - getAppDevices', () => {
      it('should return devices list with success field', async () => {
        // Arrange
        mockAppsService.getAppDevices.mockResolvedValue([
          { deviceId: 'device-1', installedAt: new Date() },
        ]);

        // Act
        const response = await request(app.getHttpServer())
          .get('/apps/app-123/devices')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
      });
    });

    describe('GET /apps/package/:packageName/versions - getAppVersions', () => {
      it('should return versions with success field', async () => {
        // Arrange
        mockAppsService.getAppVersions.mockResolvedValue([
          { ...mockApp, version: '1.0.0' },
          { ...mockApp, id: 'app-456', version: '1.1.0' },
        ]);

        // Act
        const response = await request(app.getHttpServer())
          .get('/apps/package/com.example.app/versions')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
        expect(response.body.total).toBe(2);
      });
    });

    describe('GET /apps/package/:packageName/latest - getLatestVersion', () => {
      it('should return latest version with success field', async () => {
        // Arrange
        mockAppsService.getLatestVersion.mockResolvedValue({
          ...mockApp,
          version: '2.0.0',
        });

        // Act
        const response = await request(app.getHttpServer())
          .get('/apps/package/com.example.app/latest')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data.version).toBe('2.0.0');
      });
    });

    describe('PATCH /apps/:id - update', () => {
      it('should return updated app with success field', async () => {
        // Arrange
        mockAppsService.update.mockResolvedValue({
          ...mockApp,
          name: 'Updated App',
        });

        // Act
        const response = await request(app.getHttpServer())
          .patch('/apps/app-123')
          .send({ name: 'Updated App' })
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('更新成功');
      });
    });

    describe('DELETE /apps/:id - remove', () => {
      it('should return success response', async () => {
        // Arrange
        mockAppsService.remove.mockResolvedValue(undefined);

        // Act
        const response = await request(app.getHttpServer())
          .delete('/apps/app-123')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('删除成功');
      });
    });

    describe('POST /apps/install - install', () => {
      it('should return saga results with success field', async () => {
        // Arrange
        mockInstallationSaga.startInstallation.mockResolvedValue({
          sagaId: 'saga-123',
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/apps/install')
          .send({
            applicationId: 'app-123',
            deviceIds: ['device-1', 'device-2'],
          })
          .expect(201);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('message');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0]).toHaveProperty('sagaId');
      });

      it('should handle installation failures gracefully', async () => {
        // Arrange
        mockInstallationSaga.startInstallation
          .mockResolvedValueOnce({ sagaId: 'saga-1' })
          .mockRejectedValueOnce(new Error('Device not found'));

        // Act
        const response = await request(app.getHttpServer())
          .post('/apps/install')
          .send({
            applicationId: 'app-123',
            deviceIds: ['device-1', 'device-2'],
          })
          .expect(201);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data[0].success).toBe(true);
        expect(response.body.data[1].success).toBe(false);
        expect(response.body.data[1]).toHaveProperty('error');
      });
    });

    describe('GET /apps/install/saga/:sagaId - getInstallationSagaStatus', () => {
      it('should return saga status with success field', async () => {
        // Arrange
        mockInstallationSaga.getSagaStatus.mockResolvedValue({
          sagaId: 'saga-123',
          status: 'completed',
          currentStep: 'done',
          stepIndex: 3,
          startedAt: new Date(),
          completedAt: new Date(),
          state: {},
        });

        // Act
        const response = await request(app.getHttpServer())
          .get('/apps/install/saga/saga-123')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('sagaId');
        expect(response.body.data).toHaveProperty('status');
        expect(response.body.data.status).toBe('completed');
      });
    });

    describe('POST /apps/uninstall - uninstall', () => {
      it('should return uninstall results with success field', async () => {
        // Arrange
        mockAppsService.uninstallFromDevice.mockResolvedValue(undefined);

        // Act
        const response = await request(app.getHttpServer())
          .post('/apps/uninstall')
          .send({
            applicationId: 'app-123',
            deviceIds: ['device-1'],
          })
          .expect(201);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('message');
        expect(response.body.data[0].success).toBe(true);
      });
    });

    describe('GET /apps/devices/:deviceId/apps - getDeviceApps', () => {
      it('should return device apps with success field', async () => {
        // Arrange
        mockAppsService.getDeviceApps.mockResolvedValue([mockApp]);

        // Act
        const response = await request(app.getHttpServer())
          .get('/apps/devices/device-123/apps')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
      });
    });

    describe('Audit Workflow', () => {
      describe('POST /apps/:id/submit-review - submitForReview', () => {
        it('should return submitted app with success field', async () => {
          // Arrange
          mockAppsService.submitForReview.mockResolvedValue({
            ...mockApp,
            status: 'pending_review',
          });

          // Act
          const response = await request(app.getHttpServer())
            .post('/apps/app-123/submit-review')
            .send({ note: 'Please review' })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('已提交审核');
        });
      });

      describe('POST /apps/:id/approve - approveApp', () => {
        it('should return approved app with success field', async () => {
          // Arrange
          mockAppsService.approveApp.mockResolvedValue({
            ...mockApp,
            status: 'approved',
          });

          // Act
          const response = await request(app.getHttpServer())
            .post('/apps/app-123/approve')
            .send({ comment: 'Looks good' })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('已批准');
        });
      });

      describe('POST /apps/:id/reject - rejectApp', () => {
        it('should return rejected app with success field', async () => {
          // Arrange
          mockAppsService.rejectApp.mockResolvedValue({
            ...mockApp,
            status: 'rejected',
          });

          // Act
          const response = await request(app.getHttpServer())
            .post('/apps/app-123/reject')
            .send({ reason: 'Security issue' })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('已拒绝');
        });
      });

      describe('POST /apps/:id/request-changes - requestChanges', () => {
        it('should return app with success field', async () => {
          // Arrange
          mockAppsService.requestChanges.mockResolvedValue({
            ...mockApp,
            status: 'changes_requested',
          });

          // Act
          const response = await request(app.getHttpServer())
            .post('/apps/app-123/request-changes')
            .send({ changes: 'Update description' })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('已要求开发者修改');
        });
      });

      describe('GET /apps/:id/audit-records - getAppAuditRecords', () => {
        it('should return audit records with success field', async () => {
          // Arrange
          mockAppsService.getAuditRecords.mockResolvedValue([
            {
              id: 'record-1',
              action: 'approve',
              reviewerId: 'admin-1',
              comment: 'Approved',
              createdAt: new Date(),
            },
          ]);

          // Act
          const response = await request(app.getHttpServer())
            .get('/apps/app-123/audit-records')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(Array.isArray(response.body.data)).toBe(true);
        });
      });

      describe('GET /apps/pending-review/list - getPendingReviewApps', () => {
        it('should return pending apps with success field', async () => {
          // Arrange
          mockAppsService.getPendingReviewApps.mockResolvedValue({
            data: [mockApp],
            total: 1,
            page: 1,
            limit: 10,
          });

          // Act
          const response = await request(app.getHttpServer())
            .get('/apps/pending-review/list')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('total');
        });
      });

      describe('GET /apps/audit-records/all - getAllAuditRecords', () => {
        it('should return all audit records with success field', async () => {
          // Arrange
          mockAppsService.getAllAuditRecords.mockResolvedValue({
            data: [],
            total: 0,
            page: 1,
            limit: 10,
          });

          // Act
          const response = await request(app.getHttpServer())
            .get('/apps/audit-records/all')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('total');
        });
      });
    });
  });

  describe('Business Logic Tests', () => {
    it('should extract userId from request for installation', async () => {
      // Arrange
      mockInstallationSaga.startInstallation.mockResolvedValue({ sagaId: 'saga-1' });

      // Act
      await request(app.getHttpServer())
        .post('/apps/install')
        .send({
          applicationId: 'app-123',
          deviceIds: ['device-1'],
        })
        .expect(201);

      // Assert
      expect(saga.startInstallation).toHaveBeenCalledWith(
        'app-123',
        'device-1',
        'user-123'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Arrange
      const error = new Error('Service unavailable');
      mockAppsService.findAll.mockRejectedValue(error);

      // Act
      const response = await request(app.getHttpServer())
        .get('/apps')
        .expect(500);

      // Assert
      expect(response.body).toBeDefined();
    });
  });
});
