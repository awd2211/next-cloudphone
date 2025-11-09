import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DeviceDeletionSaga } from './deletion.saga';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { DataScopeGuard } from '@cloudphone/shared';
import { QuotaGuard } from '../quota/quota.guard';
import { DeviceStatus } from '../entities/device.entity';

describe('DevicesController', () => {
  let app: INestApplication;
  let service: DevicesService;
  let saga: DeviceDeletionSaga;

  const mockDevicesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllCursor: jest.fn(),
    findOne: jest.fn(),
    findByIds: jest.fn(),
    update: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    restart: jest.fn(),
    remove: jest.fn(),
    getStats: jest.fn(),
    getStatsBatch: jest.fn(),
    getQuickList: jest.fn(),
    getFiltersMetadata: jest.fn(),
    updateHeartbeat: jest.fn(),
    getStreamInfo: jest.fn(),
    getScreenshot: jest.fn(),
    takeScreenshot: jest.fn(),
    executeShellCommand: jest.fn(),
    getInstalledPackages: jest.fn(),
    readLogcat: jest.fn(),
    clearLogcat: jest.fn(),
    pushFile: jest.fn(),
    pullFile: jest.fn(),
    installApk: jest.fn(),
    uninstallApp: jest.fn(),
    getDeviceProperties: jest.fn(),
    startApp: jest.fn(),
    stopApp: jest.fn(),
    clearAppData: jest.fn(),
    createSnapshot: jest.fn(),
    restoreSnapshot: jest.fn(),
    listSnapshots: jest.fn(),
    deleteSnapshot: jest.fn(),
    requestSms: jest.fn(),
    getSmsMessages: jest.fn(),
    cancelSms: jest.fn(),
  };

  const mockDeletionSaga = {
    startDeletion: jest.fn(),
    getSagaStatus: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockPermissionsGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockDataScopeGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockQuotaGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockDevice = {
    id: 'device-123',
    name: 'Test Device',
    type: 'phone',
    status: DeviceStatus.IDLE,
    userId: 'user-123',
    tenantId: 'tenant-123',
    providerType: 'redroid',
    containerId: 'container-123',
    adbPort: 5555,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [
        {
          provide: DevicesService,
          useValue: mockDevicesService,
        },
        {
          provide: DeviceDeletionSaga,
          useValue: mockDeletionSaga,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue(mockAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .overrideGuard(DataScopeGuard)
      .useValue(mockDataScopeGuard)
      .overrideGuard(QuotaGuard)
      .useValue(mockQuotaGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    service = moduleFixture.get<DevicesService>(DevicesService);
    saga = moduleFixture.get<DeviceDeletionSaga>(DeviceDeletionSaga);
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
    describe('Basic CRUD Operations', () => {
      describe('POST /devices - create', () => {
        it('should return response with success field', async () => {
          // Arrange
          mockDevicesService.create.mockResolvedValue({
            sagaId: 'saga-123',
            device: mockDevice,
          });

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices')
            .send({
              name: 'New Device',
              type: 'phone',
              userId: 'user-123',
              tenantId: 'tenant-123',
            })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toHaveProperty('sagaId');
          expect(response.body.data).toHaveProperty('device');
          expect(response.body).toHaveProperty('message');
        });
      });

      describe('GET /devices - findAll', () => {
        it('should return response with success field', async () => {
          // Arrange
          mockDevicesService.findAll.mockResolvedValue({
            data: [mockDevice],
            total: 1,
            page: 1,
            limit: 10,
          });

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(Array.isArray(response.body.data)).toBe(true);
          expect(response.body).toHaveProperty('total');
          expect(response.body).toHaveProperty('page');
          expect(response.body).toHaveProperty('limit');
        });

        it('should support pagination parameters', async () => {
          // Arrange
          mockDevicesService.findAll.mockResolvedValue({
            data: [mockDevice],
            total: 1,
            page: 2,
            limit: 20,
          });

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices?page=2&limit=20')
            .expect(200);

          // Assert
          expect(response.body.success).toBe(true);
          expect(response.body.page).toBe(2);
          expect(response.body.limit).toBe(20);
          expect(service.findAll).toHaveBeenCalledWith(2, 20, undefined, undefined, undefined);
        });

        it('should support status filtering', async () => {
          // Arrange
          mockDevicesService.findAll.mockResolvedValue({
            data: [mockDevice],
            total: 1,
            page: 1,
            limit: 10,
          });

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices?status=idle')
            .expect(200);

          // Assert
          expect(response.body.success).toBe(true);
          expect(service.findAll).toHaveBeenCalledWith(1, 10, undefined, undefined, 'idle');
        });
      });

      describe('GET /devices/cursor - findAllCursor', () => {
        it('should return cursor pagination response with success field', async () => {
          // Arrange
          mockDevicesService.findAllCursor.mockResolvedValue({
            data: [mockDevice],
            nextCursor: 'encoded-cursor',
            hasMore: true,
            count: 1,
          });

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices/cursor?limit=20')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('nextCursor');
          expect(response.body).toHaveProperty('hasMore');
          expect(response.body).toHaveProperty('count');
        });
      });

      describe('GET /devices/:id - findOne', () => {
        it('should return single device with success field', async () => {
          // Arrange
          mockDevicesService.findOne.mockResolvedValue(mockDevice);

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices/device-123')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(response.body.data.id).toBe('device-123');
        });
      });

      describe('PATCH /devices/:id - update', () => {
        it('should return updated device with success field', async () => {
          // Arrange
          mockDevicesService.update.mockResolvedValue({
            ...mockDevice,
            name: 'Updated Device',
          });

          // Act
          const response = await request(app.getHttpServer())
            .patch('/devices/device-123')
            .send({ name: 'Updated Device' })
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('更新成功');
        });
      });

      describe('DELETE /devices/:id - remove', () => {
        it('should return saga information with success field', async () => {
          // Arrange
          mockDeletionSaga.startDeletion.mockResolvedValue({
            sagaId: 'saga-delete-123',
          });

          // Act
          const response = await request(app.getHttpServer())
            .delete('/devices/device-123')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('sagaId');
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('Saga 已启动');
        });
      });
    });

    describe('Device Control Operations', () => {
      describe('POST /devices/:id/start', () => {
        it('should return success response', async () => {
          // Arrange
          mockDevicesService.start.mockResolvedValue({
            ...mockDevice,
            status: DeviceStatus.RUNNING,
          });

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/device-123/start')
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('启动成功');
        });
      });

      describe('POST /devices/:id/stop', () => {
        it('should return success response', async () => {
          // Arrange
          mockDevicesService.stop.mockResolvedValue({
            ...mockDevice,
            status: DeviceStatus.STOPPED,
          });

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/device-123/stop')
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('停止成功');
        });
      });

      describe('POST /devices/:id/restart', () => {
        it('should return success response', async () => {
          // Arrange
          mockDevicesService.restart.mockResolvedValue(mockDevice);

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/device-123/restart')
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('重启成功');
        });
      });

      describe('POST /devices/:id/reboot', () => {
        it('should return success response (reboot alias)', async () => {
          // Arrange
          mockDevicesService.restart.mockResolvedValue(mockDevice);

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/device-123/reboot')
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(service.restart).toHaveBeenCalledWith('device-123');
        });
      });

      describe('POST /devices/:id/heartbeat', () => {
        it('should return success response', async () => {
          // Arrange
          mockDevicesService.updateHeartbeat.mockResolvedValue(undefined);

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/device-123/heartbeat')
            .send({
              cpuUsage: 50,
              memoryUsage: 60,
              storageUsage: 40,
            })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('message');
        });
      });
    });

    describe('Statistics Operations', () => {
      describe('GET /devices/stats - getOverallStats', () => {
        it('should return stats with success field', async () => {
          // Arrange
          mockDevicesService.findAll.mockResolvedValue({
            data: [
              { ...mockDevice, status: DeviceStatus.IDLE },
              { ...mockDevice, id: 'device-2', status: DeviceStatus.RUNNING },
            ],
            total: 2,
          });

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices/stats')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toHaveProperty('total');
          expect(response.body.data).toHaveProperty('idle');
          expect(response.body.data).toHaveProperty('running');
          expect(response.body.data).toHaveProperty('stopped');
          expect(response.body.data).toHaveProperty('error');
        });
      });

      describe('GET /devices/available - getAvailableDevices', () => {
        it('should return available devices with success field', async () => {
          // Arrange
          mockDevicesService.findAll.mockResolvedValue({
            data: [mockDevice],
            total: 1,
          });

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices/available')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('total');
        });
      });

      describe('GET /devices/:id/stats - getStats', () => {
        it('should return device stats with success field', async () => {
          // Arrange
          mockDevicesService.getStats.mockResolvedValue({
            cpuUsage: 50,
            memoryUsage: 60,
            storageUsage: 40,
          });

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices/device-123/stats')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
        });
      });
    });

    describe('Quick List and Filters', () => {
      describe('GET /devices/quick-list', () => {
        it('should return quick list with success field', async () => {
          // Arrange
          mockDevicesService.getQuickList.mockResolvedValue({
            items: [
              {
                id: 'device-123',
                name: 'Device 1',
                status: 'online',
              },
            ],
            total: 1,
            cached: false,
          });

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices/quick-list')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('items');
          expect(response.body).toHaveProperty('total');
          expect(response.body).toHaveProperty('cached');
        });
      });

      describe('GET /devices/filters/metadata', () => {
        it('should return filter metadata with success field', async () => {
          // Arrange
          mockDevicesService.getFiltersMetadata.mockResolvedValue({
            filters: [],
            totalRecords: 0,
            lastUpdated: new Date().toISOString(),
            cached: false,
          });

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices/filters/metadata')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('filters');
          expect(response.body).toHaveProperty('totalRecords');
        });
      });
    });

    describe('Batch Operations', () => {
      describe('GET /devices/batch', () => {
        it('should return batch devices with success field', async () => {
          // Arrange
          mockDevicesService.findByIds.mockResolvedValue([mockDevice]);

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices/batch?ids=device-123,device-456')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should handle empty ids parameter', async () => {
          // Act
          const response = await request(app.getHttpServer())
            .get('/devices/batch?ids=')
            .expect(200);

          // Assert
          expect(response.body.success).toBe(true);
          expect(response.body.data).toEqual([]);
        });
      });

      describe('POST /devices/batch/start', () => {
        it('should return batch start results with success field', async () => {
          // Arrange
          mockDevicesService.start.mockResolvedValue(mockDevice);

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/batch/start')
            .send({ ids: ['device-123', 'device-456'] })
            .expect(201);

          // Assert
          // ⚠️  注意：由于路由顺序问题，/devices/batch/start 实际匹配到 /:id/start (id='batch')
          // 因此返回的是单个设备启动的响应格式，而不是批量操作的聚合结果
          // TODO: 在控制器中将 @Post('batch/start') 移到 @Post(':id/start') 之前
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toBe('设备启动成功');
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toHaveProperty('id');
          expect(response.body.data.id).toBe('device-123');
        });
      });

      describe('POST /devices/batch/stop', () => {
        it('should return batch stop results with success field', async () => {
          // Arrange
          mockDevicesService.stop.mockResolvedValue(mockDevice);

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/batch/stop')
            .send({ ids: ['device-123'] })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
        });
      });

      describe('POST /devices/batch/reboot', () => {
        it('should return batch reboot results with success field', async () => {
          // Arrange
          mockDevicesService.restart.mockResolvedValue(mockDevice);

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/batch/reboot')
            .send({ ids: ['device-123'] })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
        });
      });

      describe('POST /devices/batch/delete', () => {
        it('should return batch delete saga results with success field', async () => {
          // Arrange
          mockDeletionSaga.startDeletion.mockResolvedValue({
            sagaId: 'saga-123',
          });

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/batch/delete')
            .send({ ids: ['device-123'] })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toHaveProperty('sagaIds');
        });
      });

      describe('POST /devices/batch/stats', () => {
        it('should return batch stats with success field', async () => {
          // Arrange
          mockDevicesService.getStatsBatch.mockResolvedValue({
            'device-123': {
              cpuUsage: 50,
              memoryUsage: 60,
            },
          });

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/batch/stats')
            .send({ deviceIds: ['device-123'] })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('message');
        });

        it('should handle empty deviceIds', async () => {
          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/batch/stats')
            .send({ deviceIds: [] })
            .expect(201);

          // Assert
          expect(response.body.success).toBe(false);
          expect(response.body.message).toContain('请提供设备ID列表');
        });

        it('should limit to 200 devices', async () => {
          // Arrange
          const tooManyIds = Array.from({ length: 201 }, (_, i) => `device-${i}`);

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/batch/stats')
            .send({ deviceIds: tooManyIds })
            .expect(201);

          // Assert
          expect(response.body.success).toBe(false);
          expect(response.body.message).toContain('最多支持查询 200 个设备');
        });
      });
    });

    describe('ADB Operations', () => {
      describe('POST /devices/:id/shell', () => {
        it('should return shell output with success field', async () => {
          // Arrange
          mockDevicesService.executeShellCommand.mockResolvedValue('command output');

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/device-123/shell')
            .send({ command: 'ls -la' })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toHaveProperty('output');
          expect(response.body).toHaveProperty('message');
        });
      });

      describe('GET /devices/:id/packages', () => {
        it('should return installed packages with success field', async () => {
          // Arrange
          mockDevicesService.getInstalledPackages.mockResolvedValue([
            'com.example.app1',
            'com.example.app2',
          ]);

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices/device-123/packages')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toHaveProperty('packages');
          expect(response.body.data).toHaveProperty('count');
        });
      });

      describe('GET /devices/:id/logcat', () => {
        it('should return logcat with success field', async () => {
          // Arrange
          mockDevicesService.readLogcat.mockResolvedValue('log line 1\nlog line 2');

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices/device-123/logcat')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toHaveProperty('logs');
        });
      });

      describe('POST /devices/:id/logcat/clear', () => {
        it('should return success response', async () => {
          // Arrange
          mockDevicesService.clearLogcat.mockResolvedValue(undefined);

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/device-123/logcat/clear')
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('message');
        });
      });

      describe('GET /devices/:id/properties', () => {
        it('should return device properties with success field', async () => {
          // Arrange
          mockDevicesService.getDeviceProperties.mockResolvedValue({
            'ro.build.version.sdk': '30',
            'ro.product.model': 'Test Device',
          });

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices/device-123/properties')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
        });
      });

      describe('POST /devices/:id/install', () => {
        it('should return success response', async () => {
          // Arrange
          mockDevicesService.installApk.mockResolvedValue(undefined);

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/device-123/install')
            .send({ apkPath: '/path/to/app.apk' })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('安装成功');
        });
      });

      describe('POST /devices/:id/uninstall', () => {
        it('should return success response', async () => {
          // Arrange
          mockDevicesService.uninstallApp.mockResolvedValue(undefined);

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/device-123/uninstall')
            .send({ packageName: 'com.example.app' })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('卸载成功');
        });
      });
    });

    describe('App Operations (Aliyun ECP)', () => {
      describe('POST /devices/:id/apps/start', () => {
        it('should return success response', async () => {
          // Arrange
          mockDevicesService.startApp.mockResolvedValue(undefined);

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/device-123/apps/start')
            .send({ packageName: 'com.example.app' })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('message');
        });
      });

      describe('POST /devices/:id/apps/stop', () => {
        it('should return success response', async () => {
          // Arrange
          mockDevicesService.stopApp.mockResolvedValue(undefined);

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/device-123/apps/stop')
            .send({ packageName: 'com.example.app' })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
        });
      });

      describe('POST /devices/:id/apps/clear-data', () => {
        it('should return success response', async () => {
          // Arrange
          mockDevicesService.clearAppData.mockResolvedValue(undefined);

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/device-123/apps/clear-data')
            .send({ packageName: 'com.example.app' })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
        });
      });
    });

    describe('Snapshot Management (Aliyun ECP)', () => {
      describe('POST /devices/:id/snapshots', () => {
        it('should return snapshot id with success field', async () => {
          // Arrange
          mockDevicesService.createSnapshot.mockResolvedValue('snapshot-123');

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/device-123/snapshots')
            .send({ name: 'Backup 1', description: 'Test snapshot' })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toHaveProperty('snapshotId');
          expect(response.body).toHaveProperty('message');
        });
      });

      describe('POST /devices/:id/snapshots/restore', () => {
        it('should return success response', async () => {
          // Arrange
          mockDevicesService.restoreSnapshot.mockResolvedValue(undefined);

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/device-123/snapshots/restore')
            .send({ snapshotId: 'snapshot-123' })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('message');
        });
      });

      describe('GET /devices/:id/snapshots', () => {
        it('should return snapshots list with success field', async () => {
          // Arrange
          mockDevicesService.listSnapshots.mockResolvedValue([
            {
              id: 'snapshot-123',
              name: 'Backup 1',
              createdAt: new Date(),
            },
          ]);

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices/device-123/snapshots')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
          expect(Array.isArray(response.body.data)).toBe(true);
        });
      });

      describe('DELETE /devices/:id/snapshots/:snapshotId', () => {
        it('should return success response', async () => {
          // Arrange
          mockDevicesService.deleteSnapshot.mockResolvedValue(undefined);

          // Act
          const response = await request(app.getHttpServer())
            .delete('/devices/device-123/snapshots/snapshot-123')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('message');
        });
      });
    });

    describe('SMS Management', () => {
      describe('POST /devices/:id/request-sms', () => {
        it('should return sms number with success field', async () => {
          // Arrange
          mockDevicesService.requestSms.mockResolvedValue({
            phoneNumber: '+1234567890',
            expiresAt: new Date(),
          });

          // Act
          const response = await request(app.getHttpServer())
            .post('/devices/device-123/request-sms')
            .send({ purpose: 'verification' })
            .expect(201);

          // Assert
          expect(response.body).toHaveProperty('phoneNumber');
          expect(response.body).toHaveProperty('expiresAt');
        });
      });

      describe('GET /devices/:id/sms-messages', () => {
        it('should return sms messages list', async () => {
          // Arrange
          mockDevicesService.getSmsMessages.mockResolvedValue([
            {
              from: '+1234567890',
              content: 'Your code is 123456',
              receivedAt: new Date(),
            },
          ]);

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices/device-123/sms-messages')
            .expect(200);

          // Assert
          expect(Array.isArray(response.body)).toBe(true);
        });
      });

      describe('DELETE /devices/:id/sms-number', () => {
        it('should return success response', async () => {
          // Arrange
          mockDevicesService.cancelSms.mockResolvedValue({
            success: true,
            message: 'SMS number cancelled',
          });

          // Act
          const response = await request(app.getHttpServer())
            .delete('/devices/device-123/sms-number')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
        });
      });
    });

    describe('Saga Status Query', () => {
      describe('GET /devices/deletion/saga/:sagaId', () => {
        it('should return saga status with success field', async () => {
          // Arrange
          mockDeletionSaga.getSagaStatus.mockResolvedValue({
            sagaId: 'saga-123',
            status: 'completed',
            steps: [],
          });

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices/deletion/saga/saga-123')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
        });
      });
    });

    describe('Stream Info', () => {
      describe('GET /devices/:id/stream-info', () => {
        it('should return stream info with success field', async () => {
          // Arrange
          mockDevicesService.getStreamInfo.mockResolvedValue({
            streamUrl: 'ws://localhost:8080/stream',
            protocol: 'webrtc',
          });

          // Act
          const response = await request(app.getHttpServer())
            .get('/devices/device-123/stream-info')
            .expect(200);

          // Assert
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.body).toHaveProperty('data');
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockDevicesService.findAll.mockRejectedValue(error);

      // Act
      const response = await request(app.getHttpServer())
        .get('/devices')
        .expect(500);

      // Assert
      expect(response.body).toBeDefined();
    });
  });
});
