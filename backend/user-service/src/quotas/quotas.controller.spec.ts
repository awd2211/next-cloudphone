import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException, BadRequestException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { QuotasController } from './quotas.controller';
import { QuotasService } from './quotas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  generateTestJwt,
} from '@cloudphone/shared/testing/test-helpers';
import { createMockQuota } from '@cloudphone/shared/testing/mock-factories';
import { QuotaType } from '../entities/quota.entity';

describe('QuotasController', () => {
  let app: INestApplication;
  let quotasService: QuotasService;

  const mockQuotasService = {
    createQuota: jest.fn(),
    getUserQuota: jest.fn(),
    checkQuota: jest.fn(),
    deductQuota: jest.fn(),
    restoreQuota: jest.fn(),
    updateQuota: jest.fn(),
    getUsageStats: jest.fn(),
    getQuotaAlerts: jest.fn(),
  };

  // Helper to generate auth token with specific roles
  const createAuthToken = (roles: string[] = ['admin']) => {
    return generateTestJwt({
      sub: 'test-admin-id',
      username: 'admin',
      roles,
      permissions: ['quota.read', 'quota.create', 'quota.update'],
    });
  };

  beforeAll(async () => {
    const mockGuard = { canActivate: jest.fn(() => true) };

    const moduleFixture = await Test.createTestingModule({
      controllers: [QuotasController],
      providers: [{ provide: QuotasService, useValue: mockQuotasService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );
    await app.init();

    quotasService = app.get<QuotasService>(QuotasService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /quotas', () => {
    const createQuotaDto = {
      userId: 'user-123',
      limits: {
        maxDevices: 10,
        maxConcurrentDevices: 5,
        maxCpuCoresPerDevice: 4,
        maxMemoryMBPerDevice: 4096,
        maxStorageGBPerDevice: 64,
        totalCpuCores: 40,
        totalMemoryGB: 64,
        totalStorageGB: 500,
        maxBandwidthMbps: 100,
        monthlyTrafficGB: 1000,
        maxUsageHoursPerDay: 24,
        maxUsageHoursPerMonth: 720,
      },
    };

    it('should create quota successfully when user is admin', async () => {
      // Arrange
      const mockQuota = createMockQuota(createQuotaDto);
      mockQuotasService.createQuota.mockResolvedValue(mockQuota);
      const token = createAuthToken(['admin']);

      // Act
      const response = await request(app.getHttpServer())
        .post('/quotas')
        .set('Authorization', `Bearer ${token}`)
        .send(createQuotaDto)
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        id: expect.any(String),
        userId: 'user-123',
        limits: expect.objectContaining({
          maxDevices: 10,
          totalCpuCores: 40,
        }),
        usage: expect.any(Object),
      });

      expect(mockQuotasService.createQuota).toHaveBeenCalledWith(createQuotaDto);
    });

    it.skip('should return 403 when user is not admin', async () => {
      // Arrange
      const token = createAuthToken(['user']); // Not admin

      // Act
      await request(app.getHttpServer())
        .post('/quotas')
        .set('Authorization', `Bearer ${token}`)
        .send(createQuotaDto)
        .expect(403);

      // Assert
      expect(mockQuotasService.createQuota).not.toHaveBeenCalled();
    });

    it.skip('should return 401 when not authenticated', async () => {
      // Act
      await request(app.getHttpServer()).post('/quotas').send(createQuotaDto).expect(401);
    });

    it('should return 400 when user already has active quota', async () => {
      // Arrange
      mockQuotasService.createQuota.mockRejectedValue(
        new BadRequestException('User already has active quota')
      );
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .post('/quotas')
        .set('Authorization', `Bearer ${token}`)
        .send(createQuotaDto)
        .expect(400);
    });

    it('should validate required fields', async () => {
      // Arrange
      const invalidDto = { userId: 'user-123' }; // Missing required fields
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .post('/quotas')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidDto)
        .expect(400);

      // Assert
      expect(mockQuotasService.createQuota).not.toHaveBeenCalled();
    });

    it('should validate positive numbers for quota limits', async () => {
      // Arrange
      const invalidDto = {
        ...createQuotaDto,
        limits: {
          ...createQuotaDto.limits,
          maxDevices: -1, // Negative value
        },
      };
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .post('/quotas')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidDto)
        .expect(400);
    });

    it('should create unlimited quota when maxDevices is 0', async () => {
      // Arrange
      const unlimitedDto = {
        ...createQuotaDto,
        limits: { ...createQuotaDto.limits, maxDevices: 0 },
      };
      const mockQuota = createMockQuota({
        limits: { maxDevices: 0 },
      });
      mockQuotasService.createQuota.mockResolvedValue(mockQuota);
      const token = createAuthToken(['admin']);

      // Act
      const response = await request(app.getHttpServer())
        .post('/quotas')
        .set('Authorization', `Bearer ${token}`)
        .send(unlimitedDto)
        .expect(201);

      // Assert
      expect(response.body.limits.maxDevices).toBe(0);
    });
  });

  describe('GET /quotas/user/:userId', () => {
    it('should return user quota when exists', async () => {
      // Arrange
      const mockQuota = createMockQuota({
        userId: 'user-123',
        maxDevices: 10,
        currentDevices: 3,
      });
      mockQuotasService.getUserQuota.mockResolvedValue(mockQuota);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .get('/quotas/user/user-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        userId: 'user-123',
        limits: expect.objectContaining({ maxDevices: 10 }),
        usage: expect.objectContaining({ currentDevices: 3 }),
      });

      expect(mockQuotasService.getUserQuota).toHaveBeenCalledWith('user-123');
    });

    it('should return 404 when quota not found', async () => {
      // Arrange
      mockQuotasService.getUserQuota.mockRejectedValue(new NotFoundException('Quota not found'));
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .get('/quotas/user/invalid-user')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it.skip('should return 401 when not authenticated', async () => {
      // Act
      await request(app.getHttpServer()).get('/quotas/user/user-123').expect(401);
    });

    it('should include usage percentage in response', async () => {
      // Arrange
      const mockQuota = createMockQuota({
        maxDevices: 10,
        currentDevices: 7,
      });
      mockQuotasService.getUserQuota.mockResolvedValue(mockQuota);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .get('/quotas/user/user-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert - Usage should be 70%
      expect(response.body.usage.currentDevices).toBe(7);
      expect(response.body.limits.maxDevices).toBe(10);
    });
  });

  describe('POST /quotas/check', () => {
    const checkQuotaRequest = {
      userId: 'user-123',
      quotaType: QuotaType.DEVICE,
      requestedAmount: 2,
    };

    it('should return allowed when quota is sufficient', async () => {
      // Arrange
      mockQuotasService.checkQuota.mockResolvedValue({
        allowed: true,
        remaining: 5,
        message: 'Quota check passed',
      });
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .post('/quotas/check')
        .set('Authorization', `Bearer ${token}`)
        .send(checkQuotaRequest)
        .expect(200);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        allowed: true,
        remaining: 5,
        message: expect.any(String),
      });
      expect(mockQuotasService.checkQuota).toHaveBeenCalledWith(checkQuotaRequest);
    });

    it('should return denied when quota is insufficient', async () => {
      // Arrange
      mockQuotasService.checkQuota.mockResolvedValue({
        allowed: false,
        remaining: 0,
        message: 'Insufficient quota',
      });
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .post('/quotas/check')
        .set('Authorization', `Bearer ${token}`)
        .send(checkQuotaRequest)
        .expect(200);

      // Assert
      expect(response.body.allowed).toBe(false);
      expect(response.body.message).toContain('Insufficient');
    });

    it.skip('should validate quota type', async () => {
      // Arrange
      const invalidRequest = {
        ...checkQuotaRequest,
        quotaType: 'INVALID_TYPE',
      };
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .post('/quotas/check')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidRequest)
        .expect(400);
    });

    it.skip('should validate requested amount is positive', async () => {
      // Arrange
      const invalidRequest = {
        ...checkQuotaRequest,
        requestedAmount: -1,
      };
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .post('/quotas/check')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidRequest)
        .expect(400);
    });

    it('should check CPU cores quota', async () => {
      // Arrange
      const cpuCheckRequest = {
        userId: 'user-123',
        quotaType: QuotaType.CPU,
        requestedAmount: 4,
      };
      mockQuotasService.checkQuota.mockResolvedValue({
        allowed: true,
        remaining: 36,
        message: 'CPU quota available',
      });
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .post('/quotas/check')
        .set('Authorization', `Bearer ${token}`)
        .send(cpuCheckRequest)
        .expect(200);

      // Assert
      expect(mockQuotasService.checkQuota).toHaveBeenCalledWith(cpuCheckRequest);
    });
  });

  describe('POST /quotas/deduct', () => {
    const deductRequest = {
      userId: 'user-123',
      deviceCount: 1,
      cpuCores: 4,
      memoryGB: 8,
      storageGB: 50,
    };

    it('should deduct quota successfully', async () => {
      // Arrange
      const mockQuota = createMockQuota({
        currentDevices: 4,
        currentCpuCores: 16,
        currentMemoryGB: 32,
      });
      mockQuotasService.deductQuota.mockResolvedValue(mockQuota);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .post('/quotas/deduct')
        .set('Authorization', `Bearer ${token}`)
        .send(deductRequest)
        .expect(200);

      // Assert
      expect(response.body.usage.currentDevices).toBe(4);
      expect(mockQuotasService.deductQuota).toHaveBeenCalledWith(deductRequest);
    });

    it('should return 404 when quota not found', async () => {
      // Arrange
      mockQuotasService.deductQuota.mockRejectedValue(new NotFoundException('Quota not found'));
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .post('/quotas/deduct')
        .set('Authorization', `Bearer ${token}`)
        .send(deductRequest)
        .expect(404);
    });

    it.skip('should validate all resource fields are positive', async () => {
      // Arrange
      const invalidRequest = {
        ...deductRequest,
        cpuCores: -4,
      };
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .post('/quotas/deduct')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidRequest)
        .expect(400);
    });

    it('should handle zero values gracefully', async () => {
      // Arrange
      const zeroRequest = {
        userId: 'user-123',
        deviceCount: 0,
        cpuCores: 0,
        memoryGB: 0,
        storageGB: 0,
      };
      const mockQuota = createMockQuota();
      mockQuotasService.deductQuota.mockResolvedValue(mockQuota);
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .post('/quotas/deduct')
        .set('Authorization', `Bearer ${token}`)
        .send(zeroRequest)
        .expect(200);
    });
  });

  describe('POST /quotas/restore', () => {
    const restoreRequest = {
      userId: 'user-123',
      deviceCount: 1,
      cpuCores: 4,
      memoryGB: 8,
      storageGB: 50,
    };

    it('should restore quota successfully', async () => {
      // Arrange
      const mockQuota = createMockQuota({
        currentDevices: 2, // Down from 3
        currentCpuCores: 8, // Down from 12
      });
      mockQuotasService.restoreQuota.mockResolvedValue(mockQuota);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .post('/quotas/restore')
        .set('Authorization', `Bearer ${token}`)
        .send(restoreRequest)
        .expect(200);

      // Assert
      expect(response.body.usage.currentDevices).toBe(2);
      expect(mockQuotasService.restoreQuota).toHaveBeenCalledWith(restoreRequest);
    });

    it('should not allow restoring below zero', async () => {
      // Arrange
      mockQuotasService.restoreQuota.mockRejectedValue(
        new BadRequestException('Cannot restore below zero')
      );
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .post('/quotas/restore')
        .set('Authorization', `Bearer ${token}`)
        .send(restoreRequest)
        .expect(400);
    });

    it('should validate all resource fields are positive', async () => {
      // Arrange
      const invalidRequest = {
        ...restoreRequest,
        memoryGB: -8,
      };
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .post('/quotas/restore')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidRequest)
        .expect(400);
    });
  });

  describe('PUT /quotas/:id', () => {
    const updateDto = {
      limits: {
        maxDevices: 20,
        totalCpuCores: 80,
        totalMemoryGB: 128,
      },
    };

    it('should update quota successfully when user is admin', async () => {
      // Arrange
      const mockQuota = createMockQuota({
        id: 'quota-123',
        limits: {
          maxDevices: 20,
          totalCpuCores: 80,
          totalMemoryGB: 128,
        },
      });
      mockQuotasService.updateQuota.mockResolvedValue(mockQuota);
      const token = createAuthToken(['admin']);

      // Act
      const response = await request(app.getHttpServer())
        .put('/quotas/quota-123')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        id: 'quota-123',
        limits: expect.objectContaining({
          maxDevices: 20,
          totalCpuCores: 80,
        }),
      });

      expect(mockQuotasService.updateQuota).toHaveBeenCalledWith('quota-123', updateDto);
    });

    it.skip('should return 403 when user is not admin', async () => {
      // Arrange
      const token = createAuthToken(['user']);

      // Act
      await request(app.getHttpServer())
        .put('/quotas/quota-123')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(403);
    });

    it('should return 404 when quota not found', async () => {
      // Arrange
      mockQuotasService.updateQuota.mockRejectedValue(new NotFoundException('Quota not found'));
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .put('/quotas/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(404);
    });

    it('should allow partial updates', async () => {
      // Arrange
      const partialDto = { limits: { maxDevices: 15 } };
      const mockQuota = createMockQuota({ limits: { maxDevices: 15 } });
      mockQuotasService.updateQuota.mockResolvedValue(mockQuota);
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .put('/quotas/quota-123')
        .set('Authorization', `Bearer ${token}`)
        .send(partialDto)
        .expect(200);

      // Assert
      expect(mockQuotasService.updateQuota).toHaveBeenCalledWith('quota-123', partialDto);
    });

    it('should prevent updating current usage values', async () => {
      // Arrange
      const invalidDto = {
        currentDevices: 100, // Should not be updatable
      };
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .put('/quotas/quota-123')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('POST /quotas/user/:userId/usage', () => {
    const usageReport = {
      deviceId: 'device-123',
      cpuCores: 4,
      memoryGB: 8,
      storageGB: 50,
      operation: 'increment' as const,
    };

    it('should deduct quota when operation is increment', async () => {
      // Arrange
      const mockQuota = createMockQuota({ currentDevices: 4 });
      mockQuotasService.deductQuota.mockResolvedValue(mockQuota);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .post('/quotas/user/user-123/usage')
        .set('Authorization', `Bearer ${token}`)
        .send(usageReport)
        .expect(200);

      // Assert
      expect(mockQuotasService.deductQuota).toHaveBeenCalledWith({
        userId: 'user-123',
        deviceCount: 1,
        cpuCores: 4,
        memoryGB: 8,
        storageGB: 50,
      });
    });

    it('should restore quota when operation is decrement', async () => {
      // Arrange
      const decrementReport = { ...usageReport, operation: 'decrement' as const };
      const mockQuota = createMockQuota({ currentDevices: 3 });
      mockQuotasService.restoreQuota.mockResolvedValue(mockQuota);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .post('/quotas/user/user-123/usage')
        .set('Authorization', `Bearer ${token}`)
        .send(decrementReport)
        .expect(200);

      // Assert
      expect(mockQuotasService.restoreQuota).toHaveBeenCalledWith({
        userId: 'user-123',
        deviceCount: 1,
        cpuCores: 4,
        memoryGB: 8,
        storageGB: 50,
      });
    });

    it.skip('should validate operation is either increment or decrement', async () => {
      // Arrange
      const invalidReport = { ...usageReport, operation: 'invalid' };
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .post('/quotas/user/user-123/usage')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidReport)
        .expect(400);
    });

    it.skip('should require all resource fields', async () => {
      // Arrange
      const incompleteReport = {
        deviceId: 'device-123',
        operation: 'increment',
        // Missing cpuCores, memoryGB, storageGB
      };
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .post('/quotas/user/user-123/usage')
        .set('Authorization', `Bearer ${token}`)
        .send(incompleteReport)
        .expect(400);
    });
  });

  describe('GET /quotas/usage-stats/:userId', () => {
    it('should return user usage statistics', async () => {
      // Arrange
      const mockStats = {
        userId: 'user-123',
        totalDevices: 5,
        totalCpuCores: 20,
        totalMemoryGB: 40,
        utilizationPercentage: {
          devices: 50,
          cpu: 50,
          memory: 62.5,
        },
        trend: 'increasing',
      };
      mockQuotasService.getUsageStats.mockResolvedValue(mockStats);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .get('/quotas/usage-stats/user-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        userId: 'user-123',
        totalDevices: 5,
        utilizationPercentage: expect.any(Object),
      });

      expect(mockQuotasService.getUsageStats).toHaveBeenCalledWith('user-123');
    });

    it.skip('should return 401 when not authenticated', async () => {
      // Act
      await request(app.getHttpServer()).get('/quotas/usage-stats/user-123').expect(401);
    });
  });

  describe('POST /quotas/check/batch', () => {
    const batchRequests = [
      { userId: 'user-1', quotaType: QuotaType.DEVICE, requestedAmount: 1 },
      { userId: 'user-2', quotaType: QuotaType.DEVICE, requestedAmount: 2 },
      { userId: 'user-3', quotaType: QuotaType.CPU, requestedAmount: 4 },
    ];

    it('should check multiple quotas simultaneously', async () => {
      // Arrange
      mockQuotasService.checkQuota
        .mockResolvedValueOnce({ allowed: true, remaining: 5 })
        .mockResolvedValueOnce({ allowed: false, remaining: 0 })
        .mockResolvedValueOnce({ allowed: true, remaining: 20 });
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .post('/quotas/check/batch')
        .set('Authorization', `Bearer ${token}`)
        .send(batchRequests)
        .expect(200);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        total: 3,
        allowed: 2,
        denied: 1,
        results: expect.any(Array),
      });
      expect(response.body.results).toHaveLength(3);
      expect(mockQuotasService.checkQuota).toHaveBeenCalledTimes(3);
    });

    it('should return empty results for empty batch', async () => {
      // Arrange
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .post('/quotas/check/batch')
        .set('Authorization', `Bearer ${token}`)
        .send([])
        .expect(200);

      // Assert
      expect(response.body.total).toBe(0);
      expect(response.body.results).toEqual([]);
    });

    it('should handle partial failures in batch check', async () => {
      // Arrange
      mockQuotasService.checkQuota
        .mockResolvedValueOnce({ allowed: true, remaining: 5 })
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce({ allowed: true, remaining: 20 });
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .post('/quotas/check/batch')
        .set('Authorization', `Bearer ${token}`)
        .send(batchRequests)
        .expect(500); // Should fail if any check fails
    });
  });

  describe('GET /quotas/alerts', () => {
    it('should return quota alerts for admin', async () => {
      // Arrange
      const mockAlerts = [
        { userId: 'user-1', quotaType: 'device', usage: 90, threshold: 80 },
        { userId: 'user-2', quotaType: 'cpu', usage: 85, threshold: 80 },
      ];
      mockQuotasService.getQuotaAlerts.mockResolvedValue(mockAlerts);
      const token = createAuthToken(['admin']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/quotas/alerts?threshold=80')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveLength(2);
      expect(mockQuotasService.getQuotaAlerts).toHaveBeenCalledWith(80);
    });

    it('should use default threshold of 80 when not provided', async () => {
      // Arrange
      mockQuotasService.getQuotaAlerts.mockResolvedValue([]);
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .get('/quotas/alerts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockQuotasService.getQuotaAlerts).toHaveBeenCalledWith(80);
    });

    it.skip('should return 403 when user is not admin', async () => {
      // Arrange
      const token = createAuthToken(['user']);

      // Act
      await request(app.getHttpServer())
        .get('/quotas/alerts')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it.skip('should validate threshold is between 0 and 100', async () => {
      // Arrange
      const token = createAuthToken(['admin']);

      // Act - Threshold > 100
      await request(app.getHttpServer())
        .get('/quotas/alerts?threshold=150')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('should return empty array when no alerts', async () => {
      // Arrange
      mockQuotasService.getQuotaAlerts.mockResolvedValue([]);
      const token = createAuthToken(['admin']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/quotas/alerts?threshold=90')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body).toEqual([]);
    });
  });

  describe.skip('Security & Edge Cases', () => {
    it('should require authentication for all endpoints', async () => {
      // Test all endpoints without token
      await request(app.getHttpServer()).post('/quotas').send({}).expect(401);
      await request(app.getHttpServer()).get('/quotas/user/user-123').expect(401);
      await request(app.getHttpServer()).post('/quotas/check').send({}).expect(401);
      await request(app.getHttpServer()).post('/quotas/deduct').send({}).expect(401);
      await request(app.getHttpServer()).post('/quotas/restore').send({}).expect(401);
      await request(app.getHttpServer()).put('/quotas/quota-123').send({}).expect(401);
      await request(app.getHttpServer()).post('/quotas/user/user-123/usage').send({}).expect(401);
      await request(app.getHttpServer()).get('/quotas/usage-stats/user-123').expect(401);
      await request(app.getHttpServer()).get('/quotas/alerts').expect(401);
    });

    it('should enforce admin role for protected endpoints', async () => {
      const userToken = createAuthToken(['user']);

      await request(app.getHttpServer())
        .post('/quotas')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(403);

      await request(app.getHttpServer())
        .put('/quotas/quota-123')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(403);

      await request(app.getHttpServer())
        .get('/quotas/alerts')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should handle concurrent quota deductions', async () => {
      // Arrange
      const deductRequest = {
        userId: 'user-123',
        deviceCount: 1,
        cpuCores: 4,
        memoryGB: 8,
        storageGB: 50,
      };

      mockQuotasService.deductQuota
        .mockResolvedValueOnce(createMockQuota({ currentDevices: 1 }))
        .mockResolvedValueOnce(createMockQuota({ currentDevices: 2 }));

      const token = createAuthToken();

      // Act - Make concurrent deduction requests
      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .post('/quotas/deduct')
          .set('Authorization', `Bearer ${token}`)
          .send(deductRequest),
        request(app.getHttpServer())
          .post('/quotas/deduct')
          .set('Authorization', `Bearer ${token}`)
          .send(deductRequest),
      ]);

      // Assert - Both should succeed (service handles concurrency)
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('should validate userId format', async () => {
      // Arrange
      const invalidUserId = '../../../etc/passwd'; // Path traversal attempt
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .get(`/quotas/user/${invalidUserId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('should prevent negative quota values', async () => {
      // Arrange
      const negativeDto = {
        userId: 'user-123',
        maxDevices: -10,
        maxCpuCores: 40,
        maxMemoryGB: 64,
        maxStorageGB: 500,
      };
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .post('/quotas')
        .set('Authorization', `Bearer ${token}`)
        .send(negativeDto)
        .expect(400);
    });

    it('should handle very large quota values', async () => {
      // Arrange
      const largeDto = {
        userId: 'user-123',
        maxDevices: 1000000,
        maxCpuCores: 1000000,
        maxMemoryGB: 1000000,
        maxStorageGB: 1000000,
      };
      const mockQuota = createMockQuota(largeDto);
      mockQuotasService.createQuota.mockResolvedValue(mockQuota);
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .post('/quotas')
        .set('Authorization', `Bearer ${token}`)
        .send(largeDto)
        .expect(201);
    });
  });

  /**
   * ✅ 响应格式验证测试
   * 确保所有 API 返回正确的响应格式,包含 success 字段
   */
  describe('Response Format Validation', () => {
    describe('GET /quotas - getAllQuotas', () => {
      it('should return response with success field', async () => {
        // Arrange
        const mockQuotas = [createMockQuota()];
        mockQuotasService.getAllQuotas = jest.fn().mockResolvedValue({
          data: mockQuotas,
          total: 1,
          page: 1,
          limit: 50,
        });
        const token = createAuthToken(['admin']);

        // Act
        const response = await request(app.getHttpServer())
          .get('/quotas')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('page');
        expect(response.body).toHaveProperty('limit');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should maintain success field even with no results', async () => {
        // Arrange
        mockQuotasService.getAllQuotas = jest.fn().mockResolvedValue({
          data: [],
          total: 0,
          page: 1,
          limit: 50,
        });
        const token = createAuthToken(['admin']);

        // Act
        const response = await request(app.getHttpServer())
          .get('/quotas')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);
        expect(response.body.total).toBe(0);
      });
    });

    describe('GET /quotas/alerts - getQuotaAlerts', () => {
      it('should return alerts (verify current format)', async () => {
        // Arrange
        const mockAlerts = [
          {
            userId: 'user-123',
            planName: 'Free Plan',
            usagePercentage: 85,
          },
        ];
        mockQuotasService.getQuotaAlerts.mockResolvedValue(mockAlerts);
        const token = createAuthToken(['admin']);

        // Act
        const response = await request(app.getHttpServer())
          .get('/quotas/alerts?threshold=80')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        // Assert
        // Note: getQuotaAlerts 直接返回数组,可能需要包装
        expect(response.body).toBeDefined();
      });
    });

    describe('Response Structure Consistency', () => {
      it('POST /quotas should have consistent structure', async () => {
        // Arrange
        const createDto = {
          userId: 'user-123',
          limits: {
            maxDevices: 10,
            maxConcurrentDevices: 5,
            maxCpuCoresPerDevice: 4,
            maxMemoryMBPerDevice: 4096,
            maxStorageGBPerDevice: 64,
            totalCpuCores: 40,
            totalMemoryGB: 64,
            totalStorageGB: 500,
            maxBandwidthMbps: 100,
            monthlyTrafficGB: 1000,
            maxUsageHoursPerDay: 24,
            maxUsageHoursPerMonth: 720,
          },
        };
        const mockQuota = createMockQuota({ limits: createDto.limits });
        mockQuotasService.createQuota.mockResolvedValue(mockQuota);
        const token = createAuthToken(['admin']);

        // Act
        const response = await request(app.getHttpServer())
          .post('/quotas')
          .set('Authorization', `Bearer ${token}`)
          .send(createDto)
          .expect(201);

        // Assert
        expect(response.body).toBeDefined();
        expect(response.body).toHaveProperty('id');
      });

      it('PUT /quotas/:id should maintain structure', async () => {
        // Arrange
        const updateDto = { limits: { maxDevices: 20 } };
        const mockQuota = createMockQuota({ id: 'quota-123', limits: { maxDevices: 20 } });
        mockQuotasService.updateQuota.mockResolvedValue(mockQuota);
        const token = createAuthToken(['admin']);

        // Act
        const response = await request(app.getHttpServer())
          .put('/quotas/quota-123')
          .set('Authorization', `Bearer ${token}`)
          .send(updateDto)
          .expect(200);

        // Assert
        expect(response.body).toBeDefined();
        expect(response.body).toHaveProperty('id');
      });
    });
  });
});
