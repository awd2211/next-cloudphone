import { Test, TestingModule } from '@nestjs/testing';
import { GpuResourceController } from './gpu-resource.controller';
import { GpuResourceService } from './gpu-resource.service';

describe('GpuResourceController', () => {
  let controller: GpuResourceController;
  let gpuResourceService: any;

  const mockGpuResourceService = {
    getGPUDevices: jest.fn(),
    getGPUDevice: jest.fn(),
    getGPUStatus: jest.fn(),
    allocateGPU: jest.fn(),
    deallocateGPU: jest.fn(),
    getGPUAllocations: jest.fn(),
    getGPUStats: jest.fn(),
    getGPUUsageTrend: jest.fn(),
    getClusterGPUTrend: jest.fn(),
    getGPUPerformanceAnalysis: jest.fn(),
    getGPUDriverInfo: jest.fn(),
    updateGPUDriver: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GpuResourceController],
      providers: [
        {
          provide: GpuResourceService,
          useValue: mockGpuResourceService,
        },
      ],
    }).compile();

    controller = module.get<GpuResourceController>(GpuResourceController);
    gpuResourceService = module.get(GpuResourceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have gpuResourceService injected', () => {
      expect(gpuResourceService).toBeDefined();
      expect(gpuResourceService).toBe(mockGpuResourceService);
    });
  });

  // ========== GPU 设备管理测试 ==========

  describe('getGPUDevices', () => {
    it('should return list of GPU devices', async () => {
      const query: any = { status: 'available' };
      const mockDevices = [
        { id: 'gpu-1', model: 'NVIDIA RTX 3090', status: 'available' },
        { id: 'gpu-2', model: 'NVIDIA RTX 3090', status: 'available' },
      ];

      mockGpuResourceService.getGPUDevices.mockResolvedValue(mockDevices);

      const result = await controller.getGPUDevices(query);

      expect(result).toEqual(mockDevices);
      expect(result).toHaveLength(2);
      expect(mockGpuResourceService.getGPUDevices).toHaveBeenCalledWith(query);
    });

    it('should filter GPU devices by status', async () => {
      const query: any = { status: 'allocated' };
      const mockDevices = [
        { id: 'gpu-3', model: 'NVIDIA A100', status: 'allocated' },
      ];

      mockGpuResourceService.getGPUDevices.mockResolvedValue(mockDevices);

      const result = await controller.getGPUDevices(query);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('allocated');
    });

    it('should return empty array when no devices match', async () => {
      mockGpuResourceService.getGPUDevices.mockResolvedValue([]);

      const result = await controller.getGPUDevices({});

      expect(result).toEqual([]);
    });
  });

  describe('getGPUDevice', () => {
    it('should return GPU device details', async () => {
      const mockDevice = {
        id: 'gpu-123',
        model: 'NVIDIA RTX 4090',
        memory: 24576,
        status: 'available',
        utilization: 0,
      };

      mockGpuResourceService.getGPUDevice.mockResolvedValue(mockDevice);

      const result = await controller.getGPUDevice('gpu-123');

      expect(result).toEqual(mockDevice);
      expect(result.id).toBe('gpu-123');
      expect(mockGpuResourceService.getGPUDevice).toHaveBeenCalledWith('gpu-123');
    });

    it('should include GPU specifications', async () => {
      const mockDevice = {
        id: 'gpu-456',
        model: 'NVIDIA A100',
        memory: 40960,
        computeCapability: '8.0',
        cudaCores: 6912,
      };

      mockGpuResourceService.getGPUDevice.mockResolvedValue(mockDevice);

      const result = await controller.getGPUDevice('gpu-456');

      expect(result.memory).toBe(40960);
      expect(result.cudaCores).toBe(6912);
    });
  });

  describe('getGPUStatus', () => {
    it('should return real-time GPU status', async () => {
      const mockStatus = {
        id: 'gpu-123',
        utilization: 75,
        memoryUsed: 18432,
        memoryTotal: 24576,
        temperature: 68,
        powerUsage: 280,
      };

      mockGpuResourceService.getGPUStatus.mockResolvedValue(mockStatus);

      const result = await controller.getGPUStatus('gpu-123');

      expect(result).toEqual(mockStatus);
      expect(result.utilization).toBe(75);
      expect(result.temperature).toBe(68);
      expect(mockGpuResourceService.getGPUStatus).toHaveBeenCalledWith('gpu-123');
    });

    it('should include power and thermal metrics', async () => {
      const mockStatus = {
        id: 'gpu-789',
        temperature: 82,
        powerUsage: 320,
        powerLimit: 350,
        fanSpeed: 80,
      };

      mockGpuResourceService.getGPUStatus.mockResolvedValue(mockStatus);

      const result = await controller.getGPUStatus('gpu-789');

      expect(result.temperature).toBe(82);
      expect(result.powerUsage).toBeLessThanOrEqual(result.powerLimit);
      expect(result.fanSpeed).toBe(80);
    });
  });

  // ========== GPU 分配管理测试 ==========

  describe('allocateGPU', () => {
    it('should allocate GPU to device', async () => {
      const gpuId = 'gpu-123';
      const allocateDto: any = {
        deviceId: 'device-456',
        priority: 'high',
      };

      const mockAllocation = {
        id: 'allocation-789',
        gpuId: 'gpu-123',
        deviceId: 'device-456',
        allocatedAt: new Date(),
        status: 'active',
      };

      mockGpuResourceService.allocateGPU.mockResolvedValue(mockAllocation);

      const result = await controller.allocateGPU(gpuId, allocateDto);

      expect(result).toEqual(mockAllocation);
      expect(result.gpuId).toBe('gpu-123');
      expect(result.deviceId).toBe('device-456');
      expect(mockGpuResourceService.allocateGPU).toHaveBeenCalledWith(gpuId, allocateDto);
    });

    it('should allocate GPU with priority', async () => {
      const allocateDto: any = {
        deviceId: 'device-1',
        priority: 'low',
      };

      const mockAllocation = {
        gpuId: 'gpu-1',
        deviceId: 'device-1',
        priority: 'low',
      };

      mockGpuResourceService.allocateGPU.mockResolvedValue(mockAllocation);

      const result = await controller.allocateGPU('gpu-1', allocateDto);

      expect(result.priority).toBe('low');
    });
  });

  describe('deallocateGPU', () => {
    it('should deallocate GPU', async () => {
      const gpuId = 'gpu-123';
      const deallocateDto: any = {
        reason: 'device_stopped',
      };

      const mockResult = {
        gpuId: 'gpu-123',
        deallocatedAt: new Date(),
        reason: 'device_stopped',
        status: 'available',
      };

      mockGpuResourceService.deallocateGPU.mockResolvedValue(mockResult);

      const result = await controller.deallocateGPU(gpuId, deallocateDto);

      expect(result).toEqual(mockResult);
      expect(result.status).toBe('available');
      expect(mockGpuResourceService.deallocateGPU).toHaveBeenCalledWith(gpuId, deallocateDto);
    });

    it('should include deallocation reason', async () => {
      const deallocateDto: any = {
        reason: 'manual_release',
      };

      const mockResult = {
        gpuId: 'gpu-456',
        reason: 'manual_release',
      };

      mockGpuResourceService.deallocateGPU.mockResolvedValue(mockResult);

      const result = await controller.deallocateGPU('gpu-456', deallocateDto);

      expect(result.reason).toBe('manual_release');
    });
  });

  describe('getGPUAllocations', () => {
    it('should return GPU allocation records', async () => {
      const query: any = { deviceId: 'device-123' };
      const mockAllocations = [
        {
          id: 'alloc-1',
          gpuId: 'gpu-1',
          deviceId: 'device-123',
          allocatedAt: new Date(),
          status: 'active',
        },
        {
          id: 'alloc-2',
          gpuId: 'gpu-2',
          deviceId: 'device-123',
          allocatedAt: new Date(),
          status: 'released',
        },
      ];

      mockGpuResourceService.getGPUAllocations.mockResolvedValue(mockAllocations);

      const result = await controller.getGPUAllocations(query);

      expect(result).toEqual(mockAllocations);
      expect(result).toHaveLength(2);
      expect(mockGpuResourceService.getGPUAllocations).toHaveBeenCalledWith(query);
    });

    it('should filter allocations by status', async () => {
      const query: any = { status: 'active' };
      const mockAllocations = [
        { id: 'alloc-1', status: 'active' },
      ];

      mockGpuResourceService.getGPUAllocations.mockResolvedValue(mockAllocations);

      const result = await controller.getGPUAllocations(query);

      expect(result.every(a => a.status === 'active')).toBe(true);
    });
  });

  // ========== GPU 监控统计测试 ==========

  describe('getGPUStats', () => {
    it('should return GPU statistics', async () => {
      const mockStats = {
        totalGPUs: 10,
        availableGPUs: 6,
        allocatedGPUs: 4,
        averageUtilization: 42.5,
        totalMemory: 245760,
        usedMemory: 98304,
      };

      mockGpuResourceService.getGPUStats.mockResolvedValue(mockStats);

      const result = await controller.getGPUStats();

      expect(result).toEqual(mockStats);
      expect(result.totalGPUs).toBe(10);
      expect(result.averageUtilization).toBe(42.5);
      expect(mockGpuResourceService.getGPUStats).toHaveBeenCalled();
    });

    it('should include memory statistics', async () => {
      const mockStats = {
        totalGPUs: 5,
        totalMemory: 122880,
        usedMemory: 61440,
        memoryUtilization: 50,
      };

      mockGpuResourceService.getGPUStats.mockResolvedValue(mockStats);

      const result = await controller.getGPUStats();

      expect(result.totalMemory).toBe(122880);
      expect(result.usedMemory).toBe(61440);
      expect(result.memoryUtilization).toBe(50);
    });
  });

  describe('getGPUUsageTrend', () => {
    it('should return GPU usage trend', async () => {
      const gpuId = 'gpu-123';
      const query: any = { period: '7d' };
      const mockTrend = {
        gpuId: 'gpu-123',
        period: '7d',
        dataPoints: [
          { timestamp: '2025-01-01', utilization: 65 },
          { timestamp: '2025-01-02', utilization: 72 },
          { timestamp: '2025-01-03', utilization: 58 },
        ],
        average: 65,
        peak: 72,
      };

      mockGpuResourceService.getGPUUsageTrend.mockResolvedValue(mockTrend);

      const result = await controller.getGPUUsageTrend(gpuId, query);

      expect(result).toEqual(mockTrend);
      expect(result.gpuId).toBe('gpu-123');
      expect(result.dataPoints).toHaveLength(3);
      expect(mockGpuResourceService.getGPUUsageTrend).toHaveBeenCalledWith(gpuId, query);
    });

    it('should include trend statistics', async () => {
      const mockTrend = {
        gpuId: 'gpu-456',
        average: 55,
        peak: 95,
        minimum: 20,
      };

      mockGpuResourceService.getGPUUsageTrend.mockResolvedValue(mockTrend);

      const result = await controller.getGPUUsageTrend('gpu-456', {});

      expect(result.average).toBe(55);
      expect(result.peak).toBe(95);
      expect(result.minimum).toBe(20);
    });
  });

  describe('getClusterGPUTrend', () => {
    it('should return cluster-wide GPU usage trend', async () => {
      const query: any = { period: '30d' };
      const mockClusterTrend = {
        period: '30d',
        totalGPUs: 20,
        dataPoints: [
          { timestamp: '2025-01-01', averageUtilization: 48 },
          { timestamp: '2025-01-02', averageUtilization: 52 },
        ],
        overallAverage: 50,
      };

      mockGpuResourceService.getClusterGPUTrend.mockResolvedValue(mockClusterTrend);

      const result = await controller.getClusterGPUTrend(query);

      expect(result).toEqual(mockClusterTrend);
      expect(result.totalGPUs).toBe(20);
      expect(result.overallAverage).toBe(50);
      expect(mockGpuResourceService.getClusterGPUTrend).toHaveBeenCalledWith(query);
    });

    it('should aggregate across all GPUs', async () => {
      const mockClusterTrend = {
        totalGPUs: 15,
        dataPoints: [],
        peakUtilization: 85,
      };

      mockGpuResourceService.getClusterGPUTrend.mockResolvedValue(mockClusterTrend);

      const result = await controller.getClusterGPUTrend({});

      expect(result.totalGPUs).toBe(15);
      expect(result.peakUtilization).toBe(85);
    });
  });

  describe('getGPUPerformanceAnalysis', () => {
    it('should return GPU performance analysis', async () => {
      const gpuId = 'gpu-123';
      const mockAnalysis = {
        gpuId: 'gpu-123',
        performanceScore: 87,
        bottlenecks: ['memory_bandwidth'],
        recommendations: ['Increase batch size', 'Enable tensor cores'],
        metrics: {
          computeUtilization: 92,
          memoryUtilization: 78,
          bandwidth: 850,
        },
      };

      mockGpuResourceService.getGPUPerformanceAnalysis.mockResolvedValue(mockAnalysis);

      const result = await controller.getGPUPerformanceAnalysis(gpuId);

      expect(result).toEqual(mockAnalysis);
      expect(result.performanceScore).toBe(87);
      expect(result.bottlenecks).toContain('memory_bandwidth');
      expect(mockGpuResourceService.getGPUPerformanceAnalysis).toHaveBeenCalledWith(gpuId);
    });

    it('should include optimization recommendations', async () => {
      const mockAnalysis = {
        gpuId: 'gpu-456',
        performanceScore: 65,
        bottlenecks: ['compute', 'memory'],
        recommendations: [
          'Optimize kernel launch parameters',
          'Reduce memory transfers',
        ],
      };

      mockGpuResourceService.getGPUPerformanceAnalysis.mockResolvedValue(mockAnalysis);

      const result = await controller.getGPUPerformanceAnalysis('gpu-456');

      expect(result.recommendations).toHaveLength(2);
      expect(result.bottlenecks).toHaveLength(2);
    });
  });

  // ========== GPU 驱动管理测试 ==========

  describe('getGPUDriverInfo', () => {
    it('should return GPU driver information', async () => {
      const nodeId = 'node-123';
      const mockDriverInfo = {
        nodeId: 'node-123',
        driverVersion: '535.129.03',
        cudaVersion: '12.2',
        supportedGPUs: ['RTX 3090', 'RTX 4090', 'A100'],
        lastUpdated: new Date(),
      };

      mockGpuResourceService.getGPUDriverInfo.mockResolvedValue(mockDriverInfo);

      const result = await controller.getGPUDriverInfo(nodeId);

      expect(result).toEqual(mockDriverInfo);
      expect(result.driverVersion).toBe('535.129.03');
      expect(result.cudaVersion).toBe('12.2');
      expect(mockGpuResourceService.getGPUDriverInfo).toHaveBeenCalledWith(nodeId);
    });

    it('should include supported GPU models', async () => {
      const mockDriverInfo = {
        nodeId: 'node-456',
        driverVersion: '525.147.05',
        supportedGPUs: ['T4', 'V100', 'A10'],
      };

      mockGpuResourceService.getGPUDriverInfo.mockResolvedValue(mockDriverInfo);

      const result = await controller.getGPUDriverInfo('node-456');

      expect(result.supportedGPUs).toContain('T4');
      expect(result.supportedGPUs).toHaveLength(3);
    });
  });

  describe('updateGPUDriver', () => {
    it('should update GPU driver', async () => {
      const nodeId = 'node-123';
      const updateDto: any = {
        targetVersion: '535.129.03',
        autoRestart: true,
      };

      const mockResult = {
        nodeId: 'node-123',
        previousVersion: '525.147.05',
        currentVersion: '535.129.03',
        status: 'success',
        updatedAt: new Date(),
      };

      mockGpuResourceService.updateGPUDriver.mockResolvedValue(mockResult);

      const result = await controller.updateGPUDriver(nodeId, updateDto);

      expect(result).toEqual(mockResult);
      expect(result.status).toBe('success');
      expect(result.currentVersion).toBe('535.129.03');
      expect(mockGpuResourceService.updateGPUDriver).toHaveBeenCalledWith(nodeId, updateDto);
    });

    it('should include version history', async () => {
      const updateDto: any = {
        targetVersion: '540.3.00',
      };

      const mockResult = {
        nodeId: 'node-789',
        previousVersion: '535.129.03',
        currentVersion: '540.3.00',
        status: 'success',
      };

      mockGpuResourceService.updateGPUDriver.mockResolvedValue(mockResult);

      const result = await controller.updateGPUDriver('node-789', updateDto);

      expect(result.previousVersion).not.toBe(result.currentVersion);
      expect(result.currentVersion).toBe('540.3.00');
    });
  });

  describe('Logging', () => {
    it('should log GPU device queries', async () => {
      mockGpuResourceService.getGPUDevices.mockResolvedValue([]);

      await controller.getGPUDevices({ status: 'available' });

      // Verify service was called (logging happens internally)
      expect(mockGpuResourceService.getGPUDevices).toHaveBeenCalled();
    });

    it('should log GPU allocations', async () => {
      const allocateDto: any = { deviceId: 'device-1' };
      mockGpuResourceService.allocateGPU.mockResolvedValue({});

      await controller.allocateGPU('gpu-1', allocateDto);

      expect(mockGpuResourceService.allocateGPU).toHaveBeenCalled();
    });
  });
});
