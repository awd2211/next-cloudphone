import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Device, DeviceStatus } from '../src/entities/device.entity';
import { DevicesModule } from '../src/devices/devices.module';
import { DockerService } from '../src/docker/docker.service';
import { AdbService } from '../src/adb/adb.service';
import { EventBusService } from '@cloudphone/shared';
import { QuotaClientService } from '../src/quota/quota-client.service';
import { PortManagerService } from '../src/port-manager/port-manager.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';

describe('Device Creation Flow (E2E)', () => {
  let app: INestApplication;
  let deviceRepository: Repository<Device>;
  let dockerService: DockerService;
  let adbService: AdbService;
  let eventBusService: EventBusService;
  let quotaClient: QuotaClientService;
  let portManager: PortManagerService;

  // Mock implementations
  const mockDockerService = {
    createContainer: jest.fn(),
    startContainer: jest.fn(),
    stopContainer: jest.fn(),
    removeContainer: jest.fn(),
    getContainerStats: jest.fn(),
    listContainers: jest.fn(),
  };

  const mockAdbService = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    installApk: jest.fn(),
    uninstallApk: jest.fn(),
    getDeviceInfo: jest.fn(),
  };

  const mockEventBusService = {
    publish: jest.fn(),
    publishDeviceEvent: jest.fn(),
  };

  const mockQuotaClient = {
    checkQuota: jest.fn(),
    reportUsage: jest.fn(),
  };

  const mockPortManager = {
    allocatePorts: jest.fn(),
    releasePorts: jest.fn(),
    isPortAvailable: jest.fn(),
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    setex: jest.fn(),
    keys: jest.fn(),
    expire: jest.fn(),
    quit: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_DATABASE || 'cloudphone_device_test',
          entities: [Device],
          synchronize: true, // Only for testing
          dropSchema: true, // Clean database before each test run
        }),
        DevicesModule,
      ],
    })
      .overrideProvider(DockerService)
      .useValue(mockDockerService)
      .overrideProvider(AdbService)
      .useValue(mockAdbService)
      .overrideProvider(EventBusService)
      .useValue(mockEventBusService)
      .overrideProvider(QuotaClientService)
      .useValue(mockQuotaClient)
      .overrideProvider(PortManagerService)
      .useValue(mockPortManager)
      .overrideProvider('default_IORedisModuleConnectionToken')
      .useValue(mockRedis)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    deviceRepository = moduleFixture.get<Repository<Device>>(getRepositoryToken(Device));
    dockerService = moduleFixture.get<DockerService>(DockerService);
    adbService = moduleFixture.get<AdbService>(AdbService);
    eventBusService = moduleFixture.get<EventBusService>(EventBusService);
    quotaClient = moduleFixture.get<QuotaClientService>(QuotaClientService);
    portManager = moduleFixture.get<PortManagerService>(PortManagerService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear database before each test
    await deviceRepository.clear();

    // Reset all mocks
    jest.clearAllMocks();

    // Set up default mock implementations
    mockQuotaClient.checkQuota.mockResolvedValue({ allowed: true });
    mockQuotaClient.reportUsage.mockResolvedValue(undefined);
    mockPortManager.allocatePorts.mockResolvedValue({
      adbPort: 5555,
      webrtcPort: 8080,
    });
    mockPortManager.releasePorts.mockResolvedValue(undefined);
    mockDockerService.createContainer.mockResolvedValue({
      id: 'container-123',
      name: 'test-device',
    });
    mockDockerService.startContainer.mockResolvedValue(undefined);
    mockAdbService.connect.mockResolvedValue(undefined);
    mockEventBusService.publishDeviceEvent.mockResolvedValue(undefined);
  });

  describe('POST /devices - Create Device', () => {
    const createDeviceDto = {
      userId: 'user-123',
      name: 'Test Device',
      androidVersion: '11',
      manufacturer: 'Google',
      model: 'Pixel 5',
      cpuCores: 2,
      memoryMB: 4096,
      diskGB: 64,
    };

    it('should successfully create a device with full flow', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/devices')
        .send(createDeviceDto)
        .expect(201);

      // Assert - Response
      expect(response.body).toMatchObject({
        userId: 'user-123',
        name: 'Test Device',
        status: DeviceStatus.CREATING,
        adbPort: 5555,
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');

      // Assert - Database
      const deviceInDb = await deviceRepository.findOne({
        where: { id: response.body.id },
      });
      expect(deviceInDb).toBeDefined();
      expect(deviceInDb.name).toBe('Test Device');
      expect(deviceInDb.status).toBe(DeviceStatus.CREATING);

      // Assert - Port allocation
      expect(mockPortManager.allocatePorts).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          name: 'Test Device',
        })
      );

      // Assert - Quota reporting
      expect(mockQuotaClient.reportUsage).toHaveBeenCalledWith(
        'user-123',
        response.body.id,
        'create',
        expect.objectContaining({
          cpuCores: 2,
          memoryMB: 4096,
          diskGB: 64,
        })
      );

      // Assert - Event publishing
      expect(mockEventBusService.publishDeviceEvent).toHaveBeenCalledWith(
        'created',
        expect.objectContaining({
          deviceId: response.body.id,
          userId: 'user-123',
          name: 'Test Device',
          status: DeviceStatus.CREATING,
        })
      );
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/devices')
        .send({
          userId: 'user-123',
          // Missing name
          androidVersion: '11',
        })
        .expect(400);

      expect(response.body.message).toContain('name');
    });

    it('should handle quota exceeded scenario', async () => {
      // Arrange
      mockQuotaClient.checkQuota.mockResolvedValue({
        allowed: false,
        reason: 'Device limit exceeded',
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/devices')
        .send(createDeviceDto)
        .expect(403);

      // Assert
      expect(response.body.message).toContain('quota');

      // Verify no device was created
      const deviceCount = await deviceRepository.count();
      expect(deviceCount).toBe(0);

      // Verify no usage was reported
      expect(mockQuotaClient.reportUsage).not.toHaveBeenCalled();
    });

    it('should handle port allocation failure', async () => {
      // Arrange
      mockPortManager.allocatePorts.mockRejectedValue(new Error('No available ports'));

      // Act
      const response = await request(app.getHttpServer())
        .post('/devices')
        .send(createDeviceDto)
        .expect(500);

      // Assert
      expect(response.body.message).toContain('port');

      // Verify device cleanup
      const deviceCount = await deviceRepository.count();
      expect(deviceCount).toBe(0);
    });

    it('should rollback on event publishing failure', async () => {
      // Arrange
      mockEventBusService.publishDeviceEvent.mockRejectedValue(
        new Error('RabbitMQ connection failed')
      );

      // Act
      const response = await request(app.getHttpServer())
        .post('/devices')
        .send(createDeviceDto)
        .expect(500);

      // Assert - Check if ports were released
      expect(mockPortManager.releasePorts).toHaveBeenCalled();

      // Verify device was marked as error status or deleted
      const devices = await deviceRepository.find();
      if (devices.length > 0) {
        expect(devices[0].status).toBe(DeviceStatus.ERROR);
      }
    });
  });

  describe('POST /devices/:id/start - Start Device', () => {
    let device: Device;

    beforeEach(async () => {
      // Create a device in STOPPED status
      device = deviceRepository.create({
        userId: 'user-123',
        name: 'Test Device',
        status: DeviceStatus.STOPPED,
        androidVersion: '11',
        manufacturer: 'Google',
        model: 'Pixel 5',
        cpuCores: 2,
        memoryMB: 4096,
        diskGB: 64,
        adbPort: 5555,
        adbHost: 'localhost',
        containerId: 'container-123',
      });
      await deviceRepository.save(device);
    });

    it('should successfully start a device', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post(`/devices/${device.id}/start`)
        .expect(200);

      // Assert - Response
      expect(response.body.status).toBe(DeviceStatus.RUNNING);

      // Assert - Docker service
      expect(mockDockerService.startContainer).toHaveBeenCalledWith('container-123');

      // Assert - ADB connection
      expect(mockAdbService.connect).toHaveBeenCalledWith('localhost', 5555);

      // Assert - Event publishing
      expect(mockEventBusService.publishDeviceEvent).toHaveBeenCalledWith(
        'started',
        expect.objectContaining({
          deviceId: device.id,
          status: DeviceStatus.RUNNING,
        })
      );
    });

    it('should handle Docker start failure', async () => {
      // Arrange
      mockDockerService.startContainer.mockRejectedValue(new Error('Container not found'));

      // Act
      const response = await request(app.getHttpServer())
        .post(`/devices/${device.id}/start`)
        .expect(500);

      // Assert
      expect(response.body.message).toContain('start');

      // Verify device status updated to ERROR
      const updatedDevice = await deviceRepository.findOne({
        where: { id: device.id },
      });
      expect(updatedDevice.status).toBe(DeviceStatus.ERROR);
    });
  });

  describe('DELETE /devices/:id - Delete Device', () => {
    let device: Device;

    beforeEach(async () => {
      device = deviceRepository.create({
        userId: 'user-123',
        name: 'Test Device',
        status: DeviceStatus.STOPPED,
        androidVersion: '11',
        manufacturer: 'Google',
        model: 'Pixel 5',
        cpuCores: 2,
        memoryMB: 4096,
        diskGB: 64,
        adbPort: 5555,
        adbHost: 'localhost',
        containerId: 'container-123',
      });
      await deviceRepository.save(device);
    });

    it('should successfully delete a device with cleanup', async () => {
      // Act
      await request(app.getHttpServer()).delete(`/devices/${device.id}`).expect(200);

      // Assert - Device removed from database
      const deviceInDb = await deviceRepository.findOne({
        where: { id: device.id },
      });
      expect(deviceInDb).toBeNull();

      // Assert - Docker cleanup
      expect(mockDockerService.stopContainer).toHaveBeenCalledWith('container-123');
      expect(mockDockerService.removeContainer).toHaveBeenCalledWith('container-123');

      // Assert - Port cleanup
      expect(mockPortManager.releasePorts).toHaveBeenCalledWith(
        device.id,
        5555,
        expect.any(Number)
      );

      // Assert - Quota update
      expect(mockQuotaClient.reportUsage).toHaveBeenCalledWith(
        'user-123',
        device.id,
        'delete',
        expect.any(Object)
      );

      // Assert - Event publishing
      expect(mockEventBusService.publishDeviceEvent).toHaveBeenCalledWith(
        'deleted',
        expect.objectContaining({
          deviceId: device.id,
          userId: 'user-123',
        })
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      // Arrange
      mockDockerService.stopContainer.mockRejectedValue(new Error('Container already stopped'));

      // Act - Should still succeed even if container stop fails
      await request(app.getHttpServer()).delete(`/devices/${device.id}`).expect(200);

      // Assert - Device still removed
      const deviceInDb = await deviceRepository.findOne({
        where: { id: device.id },
      });
      expect(deviceInDb).toBeNull();
    });
  });

  describe('GET /devices - List Devices', () => {
    beforeEach(async () => {
      // Create multiple devices
      const devices = [
        {
          userId: 'user-123',
          name: 'Device 1',
          status: DeviceStatus.RUNNING,
          androidVersion: '11',
          manufacturer: 'Google',
          model: 'Pixel 5',
          cpuCores: 2,
          memoryMB: 4096,
          diskGB: 64,
          adbPort: 5555,
          adbHost: 'localhost',
        },
        {
          userId: 'user-123',
          name: 'Device 2',
          status: DeviceStatus.STOPPED,
          androidVersion: '12',
          manufacturer: 'Samsung',
          model: 'Galaxy S21',
          cpuCores: 4,
          memoryMB: 8192,
          diskGB: 128,
          adbPort: 5556,
          adbHost: 'localhost',
        },
        {
          userId: 'user-456',
          name: 'Device 3',
          status: DeviceStatus.RUNNING,
          androidVersion: '11',
          manufacturer: 'OnePlus',
          model: 'OnePlus 9',
          cpuCores: 2,
          memoryMB: 4096,
          diskGB: 64,
          adbPort: 5557,
          adbHost: 'localhost',
        },
      ];

      for (const deviceData of devices) {
        const device = deviceRepository.create(deviceData);
        await deviceRepository.save(device);
      }
    });

    it('should list all devices with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/devices?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.total).toBe(3);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
    });

    it('should filter devices by userId', async () => {
      const response = await request(app.getHttpServer())
        .get('/devices?userId=user-123')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((d) => d.userId === 'user-123')).toBe(true);
    });

    it('should filter devices by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/devices?status=${DeviceStatus.RUNNING}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((d) => d.status === DeviceStatus.RUNNING)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/devices?page=1&limit=2')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.total).toBe(3);
      expect(response.body.hasMore).toBe(true);
    });
  });
});
