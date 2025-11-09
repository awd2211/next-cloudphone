import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SnapshotsController } from './snapshots.controller';
import { SnapshotsService } from './snapshots.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('SnapshotsController', () => {
  let app: INestApplication;
  let service: SnapshotsService;

  const mockSnapshotsService = {
    createSnapshot: jest.fn(),
    restoreSnapshot: jest.fn(),
    compressSnapshot: jest.fn(),
    deleteSnapshot: jest.fn(),
    findOne: jest.fn(),
    findByDevice: jest.fn(),
    findByUser: jest.fn(),
    getStatistics: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = { userId: 'user-123', sub: 'user-123' };
      return true;
    }),
  };

  const mockSnapshot = {
    id: 'snapshot-123',
    deviceId: 'device-123',
    userId: 'user-123',
    name: 'Test Snapshot',
    description: 'Test snapshot description',
    size: 1024 * 1024 * 100, // 100MB
    compressed: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SnapshotsController],
      providers: [
        {
          provide: SnapshotsService,
          useValue: mockSnapshotsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    service = moduleFixture.get<SnapshotsService>(SnapshotsService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  /**
   * ✅ 响应格式验证测试
   *
   * ⚠️  注意：此控制器的响应格式与 devices.controller 不同
   * - 直接返回服务层数据,没有 { success: true, ... } 包装
   * - deleteSnapshot 返回 { message: '...' }
   * - 建议统一为标准格式
   */
  describe('Response Format Validation', () => {
    describe('POST /snapshots/device/:deviceId - createSnapshot', () => {
      it('should return created snapshot', async () => {
        // Arrange
        mockSnapshotsService.createSnapshot.mockResolvedValue(mockSnapshot);

        // Act
        const response = await request(app.getHttpServer())
          .post('/snapshots/device/device-123')
          .send({
            name: 'Test Snapshot',
            description: 'Test description',
          })
          .expect(201);

        // Assert
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('deviceId');
        expect(response.body).toHaveProperty('userId');
        expect(response.body).toHaveProperty('name');
        expect(service.createSnapshot).toHaveBeenCalledWith(
          'device-123',
          expect.objectContaining({
            name: 'Test Snapshot',
            description: 'Test description',
          }),
          'user-123'
        );
      });

      it('should require user authentication', async () => {
        // Arrange
        const noAuthGuard = {
          canActivate: jest.fn((context) => {
            const req = context.switchToHttp().getRequest();
            req.user = null;
            return true;
          }),
        };

        const testModule = await Test.createTestingModule({
          controllers: [SnapshotsController],
          providers: [{ provide: SnapshotsService, useValue: mockSnapshotsService }],
        })
          .overrideGuard(JwtAuthGuard)
          .useValue(noAuthGuard)
          .compile();

        const testApp = testModule.createNestApplication();
        await testApp.init();

        // Act
        const response = await request(testApp.getHttpServer())
          .post('/snapshots/device/device-123')
          .send({ name: 'Test' })
          .expect(500);

        // Assert
        expect(response.body).toBeDefined();
        await testApp.close();
      });
    });

    describe('POST /snapshots/:id/restore - restoreSnapshot', () => {
      it('should return restore result', async () => {
        // Arrange
        mockSnapshotsService.restoreSnapshot.mockResolvedValue({
          success: true,
          message: 'Snapshot restored successfully',
          deviceId: 'device-123',
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/snapshots/snapshot-123/restore')
          .send({ force: true })
          .expect(201);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('message');
        expect(service.restoreSnapshot).toHaveBeenCalledWith(
          'snapshot-123',
          expect.objectContaining({ force: true }),
          'user-123'
        );
      });
    });

    describe('POST /snapshots/:id/compress - compressSnapshot', () => {
      it('should return compression result', async () => {
        // Arrange
        mockSnapshotsService.compressSnapshot.mockResolvedValue({
          ...mockSnapshot,
          compressed: true,
          size: 1024 * 1024 * 50, // Reduced to 50MB
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/snapshots/snapshot-123/compress')
          .expect(201);

        // Assert
        expect(response.body).toHaveProperty('id');
        expect(response.body.compressed).toBe(true);
        expect(service.compressSnapshot).toHaveBeenCalledWith('snapshot-123');
      });
    });

    describe('DELETE /snapshots/:id - deleteSnapshot', () => {
      it('should return deletion confirmation message', async () => {
        // Arrange
        mockSnapshotsService.deleteSnapshot.mockResolvedValue(undefined);

        // Act
        const response = await request(app.getHttpServer())
          .delete('/snapshots/snapshot-123')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toBe('Snapshot deleted successfully');
        expect(service.deleteSnapshot).toHaveBeenCalledWith('snapshot-123', 'user-123');
      });
    });

    describe('GET /snapshots/:id - findOne', () => {
      it('should return single snapshot', async () => {
        // Arrange
        mockSnapshotsService.findOne.mockResolvedValue(mockSnapshot);

        // Act
        const response = await request(app.getHttpServer())
          .get('/snapshots/snapshot-123')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('deviceId');
        expect(response.body.id).toBe('snapshot-123');
        expect(service.findOne).toHaveBeenCalledWith('snapshot-123', 'user-123');
      });
    });

    describe('GET /snapshots/device/:deviceId - findByDevice', () => {
      it('should return device snapshots array', async () => {
        // Arrange
        mockSnapshotsService.findByDevice.mockResolvedValue([
          mockSnapshot,
          { ...mockSnapshot, id: 'snapshot-456' },
        ]);

        // Act
        const response = await request(app.getHttpServer())
          .get('/snapshots/device/device-123')
          .expect(200);

        // Assert
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toHaveLength(2);
        expect(response.body[0]).toHaveProperty('id');
        expect(service.findByDevice).toHaveBeenCalledWith('device-123');
      });

      it('should return empty array when no snapshots found', async () => {
        // Arrange
        mockSnapshotsService.findByDevice.mockResolvedValue([]);

        // Act
        const response = await request(app.getHttpServer())
          .get('/snapshots/device/device-123')
          .expect(200);

        // Assert
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toHaveLength(0);
      });
    });

    describe('GET /snapshots - findByUser', () => {
      it('should return user snapshots array', async () => {
        // Arrange
        mockSnapshotsService.findByUser.mockResolvedValue([
          mockSnapshot,
          { ...mockSnapshot, id: 'snapshot-789', deviceId: 'device-456' },
        ]);

        // Act
        const response = await request(app.getHttpServer())
          .get('/snapshots')
          .expect(200);

        // Assert
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toHaveLength(2);
        expect(service.findByUser).toHaveBeenCalledWith('user-123');
      });
    });

    describe('GET /snapshots/stats/summary - getStatistics', () => {
      it('should return snapshot statistics', async () => {
        // Arrange
        mockSnapshotsService.getStatistics.mockResolvedValue({
          totalSnapshots: 10,
          totalSize: 1024 * 1024 * 1000, // 1GB
          compressed: 6,
          uncompressed: 4,
          averageSize: 1024 * 1024 * 100, // 100MB
          oldestSnapshot: new Date('2024-01-01'),
          newestSnapshot: new Date(),
        });

        // Act
        const response = await request(app.getHttpServer())
          .get('/snapshots/stats/summary')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('totalSnapshots');
        expect(response.body).toHaveProperty('totalSize');
        expect(response.body).toHaveProperty('compressed');
        expect(response.body).toHaveProperty('uncompressed');
        expect(response.body).toHaveProperty('averageSize');
        expect(response.body.totalSnapshots).toBe(10);
        expect(service.getStatistics).toHaveBeenCalledWith('user-123');
      });
    });
  });

  describe('Business Logic Tests', () => {
    it('should extract userId from JWT token', async () => {
      // Arrange
      mockSnapshotsService.findByUser.mockResolvedValue([]);

      // Act
      await request(app.getHttpServer())
        .get('/snapshots')
        .expect(200);

      // Assert
      expect(service.findByUser).toHaveBeenCalledWith('user-123');
    });

    it('should pass correct parameters to service layer', async () => {
      // Arrange
      mockSnapshotsService.createSnapshot.mockResolvedValue(mockSnapshot);

      // Act
      await request(app.getHttpServer())
        .post('/snapshots/device/test-device')
        .send({
          name: 'My Snapshot',
          description: 'Important backup',
        })
        .expect(201);

      // Assert
      expect(service.createSnapshot).toHaveBeenCalledWith(
        'test-device',
        {
          name: 'My Snapshot',
          description: 'Important backup',
        },
        'user-123'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Arrange
      const error = new Error('Snapshot service unavailable');
      mockSnapshotsService.findByUser.mockRejectedValue(error);

      // Act
      const response = await request(app.getHttpServer())
        .get('/snapshots')
        .expect(500);

      // Assert
      expect(response.body).toBeDefined();
    });
  });
});
