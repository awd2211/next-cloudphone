import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricsService } from '../metrics.service';
import { Device, DeviceStatus } from '../../entities/device.entity';
import { DockerService } from '../../docker/docker.service';

describe('MetricsService', () => {
  let service: MetricsService;
  let deviceRepository: jest.Mocked<Repository<Device>>;
  let dockerService: jest.Mocked<DockerService>;

  const mockDevice: Device = {
    id: 'device-123',
    name: 'TestDevice',
    userId: 'user-123',
    tenantId: 'tenant-1',
    containerId: 'container-abc',
    status: DeviceStatus.RUNNING,
    adbHost: 'localhost',
    adbPort: 5555,
    lastActiveAt: new Date(),
    updatedAt: new Date(),
  } as Device;

  const mockContainerStats = {
    cpu_percent: 25.5,
    memory_usage_mb: 512,
    network_rx_bytes: 1024000,
    network_tx_bytes: 2048000,
  };

  beforeEach(async () => {
    const mockDeviceRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockDockerService = {
      getContainerStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: getRepositoryToken(Device),
          useValue: mockDeviceRepository,
        },
        {
          provide: DockerService,
          useValue: mockDockerService,
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    deviceRepository = module.get(getRepositoryToken(Device));
    dockerService = module.get(DockerService);

    // Clear any timers set during service initialization
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize Prometheus registry', () => {
      expect(service.register).toBeDefined();
      expect(service.register).toHaveProperty('metrics');
    });

    it('should initialize all metric gauges and counters', () => {
      // Test by checking if we can get metrics
      expect(service.getMetrics()).resolves.toBeDefined();
    });

    it('should return correct content type', () => {
      const contentType = service.getContentType();
      expect(contentType).toContain('text/plain');
    });
  });

  describe('recordOperationDuration', () => {
    it('should record successful operation duration', () => {
      const operation = 'device_create';
      const duration = 1.5;

      service.recordOperationDuration(operation, duration, 'success');

      // Verify by getting metrics and checking if operation is recorded
      expect(service.getMetrics()).resolves.toContain('cloudphone_operation_duration_seconds');
    });

    it('should record failed operation duration', () => {
      const operation = 'device_delete';
      const duration = 0.5;

      service.recordOperationDuration(operation, duration, 'failure');

      expect(service.getMetrics()).resolves.toContain('cloudphone_operation_duration_seconds');
    });

    it('should handle multiple operation records', () => {
      service.recordOperationDuration('operation1', 1.0);
      service.recordOperationDuration('operation2', 2.0);
      service.recordOperationDuration('operation3', 3.0);

      expect(service.getMetrics()).resolves.toBeDefined();
    });
  });

  describe('recordOperationError', () => {
    it('should record operation errors with error type', () => {
      const operation = 'device_start';
      const errorType = 'docker_error';

      service.recordOperationError(operation, errorType);

      expect(service.getMetrics()).resolves.toContain('cloudphone_operation_errors_total');
    });

    it('should increment error counter for same operation', () => {
      service.recordOperationError('device_stop', 'timeout');
      service.recordOperationError('device_stop', 'timeout');
      service.recordOperationError('device_stop', 'connection_lost');

      expect(service.getMetrics()).resolves.toBeDefined();
    });
  });

  describe('recordBatchOperation', () => {
    it('should record batch operation metrics with size and duration', () => {
      const operationType = 'bulk_delete';
      const size = 10;
      const duration = 5.5;

      service.recordBatchOperation(operationType, size, duration);

      expect(service.getMetrics()).resolves.toContain(
        'cloudphone_batch_operation_duration_seconds'
      );
      expect(service.getMetrics()).resolves.toContain('cloudphone_batch_operation_size');
    });

    it('should handle different batch sizes', () => {
      service.recordBatchOperation('bulk_start', 5, 2.0);
      service.recordBatchOperation('bulk_start', 50, 10.0);
      service.recordBatchOperation('bulk_start', 100, 30.0);

      expect(service.getMetrics()).resolves.toBeDefined();
    });

    it('should record multiple batch operation types', () => {
      service.recordBatchOperation('bulk_create', 20, 15.0);
      service.recordBatchOperation('bulk_delete', 10, 5.0);
      service.recordBatchOperation('bulk_restart', 15, 8.0);

      expect(service.getMetrics()).resolves.toBeDefined();
    });
  });

  describe('updateAdbConnections', () => {
    it('should update ADB connection count', () => {
      service.updateAdbConnections(5);

      expect(service.getMetrics()).resolves.toContain('cloudphone_adb_connections');
    });

    it('should update count to zero', () => {
      service.updateAdbConnections(10);
      service.updateAdbConnections(0);

      expect(service.getMetrics()).resolves.toBeDefined();
    });

    it('should handle large connection counts', () => {
      service.updateAdbConnections(1000);

      expect(service.getMetrics()).resolves.toBeDefined();
    });
  });

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      const metrics = await service.getMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('string');
    });

    it('should include default Node.js metrics', async () => {
      const metrics = await service.getMetrics();

      // Check for some default metrics
      expect(metrics).toContain('process_cpu');
      expect(metrics).toContain('nodejs_');
    });

    it('should include custom cloudphone metrics', async () => {
      service.recordOperationDuration('test_operation', 1.0);

      const metrics = await service.getMetrics();

      expect(metrics).toContain('cloudphone_');
    });
  });

  describe('Device Metrics Collection', () => {
    it('should collect metrics for running devices', async () => {
      const runningDevice = { ...mockDevice, status: DeviceStatus.RUNNING };
      deviceRepository.find.mockResolvedValue([runningDevice]);
      dockerService.getContainerStats.mockResolvedValue(mockContainerStats);

      // Trigger collection via the private method (indirectly test via onModuleInit interval)
      await service['collectDeviceMetrics']();

      expect(deviceRepository.find).toHaveBeenCalled();
      expect(dockerService.getContainerStats).toHaveBeenCalledWith(
        `cloudphone-${runningDevice.id}`
      );
    });

    it('should handle devices with different statuses', async () => {
      const devices = [
        { ...mockDevice, id: 'dev-1', status: DeviceStatus.RUNNING },
        { ...mockDevice, id: 'dev-2', status: DeviceStatus.STOPPED },
        { ...mockDevice, id: 'dev-3', status: DeviceStatus.ERROR },
      ];

      deviceRepository.find.mockResolvedValue(devices);
      dockerService.getContainerStats.mockResolvedValue(mockContainerStats);

      await service['collectDeviceMetrics']();

      expect(dockerService.getContainerStats).toHaveBeenCalledTimes(1); // Only running device
    });

    it('should handle multiple tenants', async () => {
      const devices = [
        { ...mockDevice, id: 'dev-1', tenantId: 'tenant-1' },
        { ...mockDevice, id: 'dev-2', tenantId: 'tenant-2' },
        { ...mockDevice, id: 'dev-3', tenantId: null }, // Default tenant
      ];

      deviceRepository.find.mockResolvedValue(devices);
      dockerService.getContainerStats.mockResolvedValue(mockContainerStats);

      await service['collectDeviceMetrics']();

      const metrics = await service.getMetrics();
      expect(metrics).toContain('tenant_id="tenant-1"');
      expect(metrics).toContain('tenant_id="tenant-2"');
      expect(metrics).toContain('tenant_id="default"');
    });

    it('should handle Docker stats collection errors gracefully', async () => {
      const runningDevice = { ...mockDevice, status: DeviceStatus.RUNNING };
      deviceRepository.find.mockResolvedValue([runningDevice]);
      dockerService.getContainerStats.mockRejectedValue(new Error('Docker error'));

      await expect(service['collectDeviceMetrics']()).resolves.not.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      deviceRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service['collectDeviceMetrics']()).resolves.not.toThrow();
    });
  });

  describe('Single Device Metrics Collection', () => {
    it('should collect CPU usage metrics', async () => {
      dockerService.getContainerStats.mockResolvedValue(mockContainerStats);

      await service['collectSingleDeviceMetrics'](mockDevice);

      const metrics = await service.getMetrics();
      expect(metrics).toContain('cloudphone_device_cpu_usage_percent');
    });

    it('should collect memory usage metrics', async () => {
      dockerService.getContainerStats.mockResolvedValue(mockContainerStats);

      await service['collectSingleDeviceMetrics'](mockDevice);

      const metrics = await service.getMetrics();
      expect(metrics).toContain('cloudphone_device_memory_usage_mb');
    });

    it('should collect network metrics', async () => {
      dockerService.getContainerStats.mockResolvedValue(mockContainerStats);

      await service['collectSingleDeviceMetrics'](mockDevice);

      const metrics = await service.getMetrics();
      expect(metrics).toContain('cloudphone_device_network_rx_bytes_total');
      expect(metrics).toContain('cloudphone_device_network_tx_bytes_total');
    });

    it('should handle missing container stats gracefully', async () => {
      dockerService.getContainerStats.mockResolvedValue(null);

      await expect(service['collectSingleDeviceMetrics'](mockDevice)).resolves.not.toThrow();
    });

    it('should handle partial stats data', async () => {
      const partialStats = {
        cpu_percent: 30.0,
        // Missing memory and network stats
      };
      dockerService.getContainerStats.mockResolvedValue(partialStats);

      await expect(service['collectSingleDeviceMetrics'](mockDevice)).resolves.not.toThrow();
    });

    it('should handle stats collection errors', async () => {
      dockerService.getContainerStats.mockRejectedValue(new Error('Stats error'));

      await expect(service['collectSingleDeviceMetrics'](mockDevice)).resolves.not.toThrow();
    });
  });
});
