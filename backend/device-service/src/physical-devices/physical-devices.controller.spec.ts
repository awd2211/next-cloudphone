import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PhysicalDevicesController } from './physical-devices.controller';
import { DeviceDiscoveryService } from '../providers/physical/device-discovery.service';
import { DevicePoolService } from '../providers/physical/device-pool.service';
import { DevicePoolStatus } from '../providers/physical/physical.types';

describe('PhysicalDevicesController', () => {
  let app: INestApplication;
  let discoveryService: DeviceDiscoveryService;
  let poolService: DevicePoolService;

  const mockDiscoveryService = {
    scanNetwork: jest.fn(),
    registerDevice: jest.fn(),
  };

  const mockPoolService = {
    addDevice: jest.fn(),
    getAllDevices: jest.fn(),
    getAvailableDevices: jest.fn(),
    getDevice: jest.fn(),
    removeDevice: jest.fn(),
    checkDeviceHealth: jest.fn(),
    updateDeviceStatus: jest.fn(),
  };

  const mockPhysicalDeviceInfo = {
    id: 'phy-device-123',
    name: 'Physical Device 1',
    ipAddress: '192.168.1.100',
    adbPort: 5555,
    deviceGroup: 'production',
    model: 'Samsung Galaxy S21',
    serialNumber: 'ABC123456',
    androidVersion: '11',
    tags: ['test', 'android11'],
  };

  const mockPooledDevice = {
    ...mockPhysicalDeviceInfo,
    poolStatus: DevicePoolStatus.AVAILABLE,
    healthScore: 95,
    lastHealthCheck: new Date(),
    allocatedTo: null,
    allocatedAt: null,
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PhysicalDevicesController],
      providers: [
        {
          provide: DeviceDiscoveryService,
          useValue: mockDiscoveryService,
        },
        {
          provide: DevicePoolService,
          useValue: mockPoolService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    discoveryService = moduleFixture.get<DeviceDiscoveryService>(DeviceDiscoveryService);
    poolService = moduleFixture.get<DevicePoolService>(DevicePoolService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  /**
   * ✅ 响应格式验证测试
   *
   * ⚠️  注意：此控制器的响应格式与其他控制器不同
   * - 大部分端点直接返回数据,没有 { success: true, ... } 包装
   * - 这与 devices.controller 等其他控制器不一致
   * - 建议后续统一为标准格式
   */
  describe('Response Format Validation', () => {
    describe('POST /admin/physical-devices/scan - scanNetwork', () => {
      it('should return discovered devices array', async () => {
        // Arrange
        mockDiscoveryService.scanNetwork.mockResolvedValue([mockPhysicalDeviceInfo]);

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/physical-devices/scan')
          .send({
            networkCidr: '192.168.1.0/24',
            portStart: 5555,
            portEnd: 5565,
          })
          .expect(200);

        // Assert
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('ipAddress');
        expect(response.body[0]).toHaveProperty('adbPort');
      });

      it('should return empty array when no devices found', async () => {
        // Arrange
        mockDiscoveryService.scanNetwork.mockResolvedValue([]);

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/physical-devices/scan')
          .send({
            networkCidr: '192.168.1.0/24',
          })
          .expect(200);

        // Assert
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toHaveLength(0);
      });

      it('should apply default port range when not specified', async () => {
        // Arrange
        mockDiscoveryService.scanNetwork.mockResolvedValue([]);

        // Act
        await request(app.getHttpServer())
          .post('/admin/physical-devices/scan')
          .send({
            networkCidr: '192.168.1.0/24',
          })
          .expect(200);

        // Assert
        expect(discoveryService.scanNetwork).toHaveBeenCalledWith({
          networkCidr: '192.168.1.0/24',
          portRange: {
            start: 5555,
            end: 5565,
          },
          concurrency: 50,
          timeoutMs: 2000,
        });
      });
    });

    describe('POST /admin/physical-devices - registerDevice', () => {
      it('should return registered pooled device', async () => {
        // Arrange
        mockDiscoveryService.registerDevice.mockResolvedValue(mockPhysicalDeviceInfo);
        mockPoolService.addDevice.mockResolvedValue(mockPooledDevice);

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/physical-devices')
          .send({
            ipAddress: '192.168.1.100',
            adbPort: 5555,
            name: 'Test Device',
            deviceGroup: 'production',
            tags: ['test'],
          })
          .expect(201);

        // Assert
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('poolStatus');
        expect(response.body).toHaveProperty('healthScore');
        expect(response.body.ipAddress).toBe('192.168.1.100');
      });

      it('should apply custom name and tags when provided', async () => {
        // Arrange
        const deviceInfo = { ...mockPhysicalDeviceInfo };
        mockDiscoveryService.registerDevice.mockResolvedValue(deviceInfo);
        mockPoolService.addDevice.mockResolvedValue(mockPooledDevice);

        // Act
        await request(app.getHttpServer())
          .post('/admin/physical-devices')
          .send({
            ipAddress: '192.168.1.100',
            adbPort: 5555,
            name: 'Custom Name',
            tags: ['tag1', 'tag2'],
          })
          .expect(201);

        // Assert
        expect(poolService.addDevice).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Custom Name',
            tags: ['tag1', 'tag2'],
          })
        );
      });
    });

    describe('GET /admin/physical-devices - getDevices', () => {
      it('should return paginated devices list', async () => {
        // Arrange
        mockPoolService.getAllDevices.mockResolvedValue([mockPooledDevice]);

        // Act
        const response = await request(app.getHttpServer())
          .get('/admin/physical-devices')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('page');
        expect(response.body).toHaveProperty('limit');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.total).toBe(1);
        expect(response.body.page).toBe(1);
        expect(response.body.limit).toBe(20);
      });

      it('should support pagination parameters', async () => {
        // Arrange
        const devices = Array.from({ length: 50 }, (_, i) => ({
          ...mockPooledDevice,
          id: `device-${i}`,
        }));
        mockPoolService.getAllDevices.mockResolvedValue(devices);

        // Act
        const response = await request(app.getHttpServer())
          .get('/admin/physical-devices?page=2&limit=10')
          .expect(200);

        // Assert
        expect(Number(response.body.page)).toBe(2);
        expect(Number(response.body.limit)).toBe(10);
        expect(response.body.total).toBe(50);
        expect(response.body.data).toHaveLength(10);
      });

      it('should filter by status', async () => {
        // Arrange
        const devices = [
          { ...mockPooledDevice, id: 'dev1', poolStatus: DevicePoolStatus.AVAILABLE },
          { ...mockPooledDevice, id: 'dev2', poolStatus: DevicePoolStatus.ALLOCATED },
          { ...mockPooledDevice, id: 'dev3', poolStatus: DevicePoolStatus.AVAILABLE },
        ];
        mockPoolService.getAllDevices.mockResolvedValue(devices);

        // Act
        const response = await request(app.getHttpServer())
          .get('/admin/physical-devices?status=available')
          .expect(200);

        // Assert
        expect(response.body.data).toHaveLength(2);
        expect(response.body.total).toBe(2);
      });

      it('should filter by device group', async () => {
        // Arrange
        const devices = [
          { ...mockPooledDevice, id: 'dev1', deviceGroup: 'production' },
          { ...mockPooledDevice, id: 'dev2', deviceGroup: 'testing' },
          { ...mockPooledDevice, id: 'dev3', deviceGroup: 'production' },
        ];
        mockPoolService.getAllDevices.mockResolvedValue(devices);

        // Act
        const response = await request(app.getHttpServer())
          .get('/admin/physical-devices?deviceGroup=production')
          .expect(200);

        // Assert
        expect(response.body.data).toHaveLength(2);
        expect(response.body.total).toBe(2);
      });
    });

    describe('GET /admin/physical-devices/available - getAvailableDevices', () => {
      it('should return available devices array', async () => {
        // Arrange
        mockPoolService.getAvailableDevices.mockResolvedValue([mockPooledDevice]);

        // Act
        const response = await request(app.getHttpServer())
          .get('/admin/physical-devices/available')
          .expect(200);

        // Assert
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].poolStatus).toBe(DevicePoolStatus.AVAILABLE);
      });
    });

    describe('GET /admin/physical-devices/:deviceId - getDevice', () => {
      it('should return single device', async () => {
        // Arrange
        mockPoolService.getDevice.mockResolvedValue(mockPooledDevice);

        // Act
        const response = await request(app.getHttpServer())
          .get('/admin/physical-devices/phy-device-123')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('poolStatus');
        expect(response.body.id).toBe('phy-device-123');
      });

      it('should return 500 when device not found', async () => {
        // Arrange
        mockPoolService.getDevice.mockResolvedValue(null);

        // Act
        const response = await request(app.getHttpServer())
          .get('/admin/physical-devices/nonexistent')
          .expect(500);

        // Assert
        expect(response.body).toBeDefined();
      });
    });

    describe('PATCH /admin/physical-devices/:deviceId - updateDevice', () => {
      it('should return updated device', async () => {
        // Arrange
        mockPoolService.getDevice.mockResolvedValue(mockPooledDevice);
        mockPoolService.removeDevice.mockResolvedValue(undefined);
        mockPoolService.addDevice.mockResolvedValue({
          ...mockPooledDevice,
          name: 'Updated Name',
        });

        // Act
        const response = await request(app.getHttpServer())
          .patch('/admin/physical-devices/phy-device-123')
          .send({ name: 'Updated Name' })
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe('Updated Name');
      });

      it('should update multiple fields', async () => {
        // Arrange
        mockPoolService.getDevice.mockResolvedValue(mockPooledDevice);
        mockPoolService.removeDevice.mockResolvedValue(undefined);
        mockPoolService.addDevice.mockResolvedValue({
          ...mockPooledDevice,
          name: 'New Name',
          deviceGroup: 'staging',
          tags: ['new-tag'],
        });

        // Act
        const response = await request(app.getHttpServer())
          .patch('/admin/physical-devices/phy-device-123')
          .send({
            name: 'New Name',
            deviceGroup: 'staging',
            tags: ['new-tag'],
          })
          .expect(200);

        // Assert
        expect(response.body.name).toBe('New Name');
        expect(response.body.deviceGroup).toBe('staging');
      });
    });

    describe('POST /admin/physical-devices/:deviceId/health-check - healthCheck', () => {
      it('should return health check result', async () => {
        // Arrange
        const healthResult = {
          deviceId: 'phy-device-123',
          healthy: true,
          healthScore: 95,
          checks: {
            connectivity: true,
            bootComplete: true,
            storage: { available: 50, total: 100 },
            battery: { level: 80, charging: true },
            temperature: 35,
          },
          timestamp: new Date(),
        };
        mockPoolService.checkDeviceHealth.mockResolvedValue(healthResult);

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/physical-devices/phy-device-123/health-check')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('deviceId');
        expect(response.body).toHaveProperty('healthy');
        expect(response.body).toHaveProperty('healthScore');
        expect(response.body).toHaveProperty('checks');
      });
    });

    describe('POST /admin/physical-devices/health-check/batch - batchHealthCheck', () => {
      it('should return batch health check results', async () => {
        // Arrange
        mockPoolService.getAllDevices.mockResolvedValue([
          mockPooledDevice,
          { ...mockPooledDevice, id: 'device-2' },
        ]);
        mockPoolService.checkDeviceHealth.mockResolvedValue({
          deviceId: 'phy-device-123',
          healthy: true,
          healthScore: 95,
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/physical-devices/health-check/batch')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('healthy');
        expect(response.body).toHaveProperty('unhealthy');
        expect(response.body).toHaveProperty('results');
        expect(Array.isArray(response.body.results)).toBe(true);
        expect(response.body.total).toBe(2);
      });

      it('should handle health check errors gracefully', async () => {
        // Arrange
        mockPoolService.getAllDevices.mockResolvedValue([mockPooledDevice]);
        mockPoolService.checkDeviceHealth.mockRejectedValue(new Error('Connection failed'));

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/physical-devices/health-check/batch')
          .expect(200);

        // Assert
        expect(response.body.unhealthy).toBe(1);
        expect(response.body.results[0]).toHaveProperty('error');
        expect(response.body.results[0].healthy).toBe(false);
      });
    });

    describe('DELETE /admin/physical-devices/:deviceId - removeDevice', () => {
      it('should remove device successfully', async () => {
        // Arrange
        mockPoolService.removeDevice.mockResolvedValue(undefined);

        // Act
        await request(app.getHttpServer())
          .delete('/admin/physical-devices/phy-device-123')
          .expect(200);

        // Assert
        expect(poolService.removeDevice).toHaveBeenCalledWith('phy-device-123');
      });
    });

    describe('POST /admin/physical-devices/:deviceId/maintenance - setMaintenance', () => {
      it('should set device to maintenance mode', async () => {
        // Arrange
        mockPoolService.updateDeviceStatus.mockResolvedValue(undefined);

        // Act
        await request(app.getHttpServer())
          .post('/admin/physical-devices/phy-device-123/maintenance')
          .expect(200);

        // Assert
        expect(poolService.updateDeviceStatus).toHaveBeenCalledWith(
          'phy-device-123',
          DevicePoolStatus.MAINTENANCE
        );
      });
    });

    describe('POST /admin/physical-devices/:deviceId/restore - restoreDevice', () => {
      it('should restore device to available status', async () => {
        // Arrange
        mockPoolService.updateDeviceStatus.mockResolvedValue(undefined);

        // Act
        await request(app.getHttpServer())
          .post('/admin/physical-devices/phy-device-123/restore')
          .expect(200);

        // Assert
        expect(poolService.updateDeviceStatus).toHaveBeenCalledWith(
          'phy-device-123',
          DevicePoolStatus.AVAILABLE
        );
      });
    });

    describe('GET /admin/physical-devices/stats/summary - getStats', () => {
      it('should return device pool statistics', async () => {
        // Arrange
        const devices = [
          { ...mockPooledDevice, id: 'dev1', poolStatus: DevicePoolStatus.AVAILABLE, healthScore: 90, deviceGroup: 'production' },
          { ...mockPooledDevice, id: 'dev2', poolStatus: DevicePoolStatus.ALLOCATED, healthScore: 85, deviceGroup: 'production' },
          { ...mockPooledDevice, id: 'dev3', poolStatus: DevicePoolStatus.OFFLINE, healthScore: 50, deviceGroup: 'testing' },
          { ...mockPooledDevice, id: 'dev4', poolStatus: DevicePoolStatus.MAINTENANCE, healthScore: 95, deviceGroup: 'production' },
        ];
        mockPoolService.getAllDevices.mockResolvedValue(devices);

        // Act
        const response = await request(app.getHttpServer())
          .get('/admin/physical-devices/stats/summary')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('available');
        expect(response.body).toHaveProperty('allocated');
        expect(response.body).toHaveProperty('offline');
        expect(response.body).toHaveProperty('maintenance');
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('averageHealthScore');
        expect(response.body).toHaveProperty('deviceGroups');

        expect(response.body.total).toBe(4);
        expect(response.body.available).toBe(1);
        expect(response.body.allocated).toBe(1);
        expect(response.body.offline).toBe(1);
        expect(response.body.maintenance).toBe(1);
        expect(response.body.averageHealthScore).toBe(80); // (90+85+50+95)/4 = 80
        expect(response.body.deviceGroups).toEqual({
          production: 3,
          testing: 1,
        });
      });

      it('should handle empty device pool', async () => {
        // Arrange
        mockPoolService.getAllDevices.mockResolvedValue([]);

        // Act
        const response = await request(app.getHttpServer())
          .get('/admin/physical-devices/stats/summary')
          .expect(200);

        // Assert
        expect(response.body.total).toBe(0);
        expect(response.body.averageHealthScore).toBe(0);
      });
    });
  });

  describe('Business Logic Tests', () => {
    it('should call discovery service with correct scan parameters', async () => {
      // Arrange
      mockDiscoveryService.scanNetwork.mockResolvedValue([]);

      // Act
      await request(app.getHttpServer())
        .post('/admin/physical-devices/scan')
        .send({
          networkCidr: '10.0.0.0/24',
          portStart: 5000,
          portEnd: 6000,
          concurrency: 100,
          timeoutMs: 5000,
        })
        .expect(200);

      // Assert
      expect(discoveryService.scanNetwork).toHaveBeenCalledWith({
        networkCidr: '10.0.0.0/24',
        portRange: {
          start: 5000,
          end: 6000,
        },
        concurrency: 100,
        timeoutMs: 5000,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Arrange
      const error = new Error('Service unavailable');
      mockPoolService.getAllDevices.mockRejectedValue(error);

      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/physical-devices')
        .expect(500);

      // Assert
      expect(response.body).toBeDefined();
    });
  });
});
