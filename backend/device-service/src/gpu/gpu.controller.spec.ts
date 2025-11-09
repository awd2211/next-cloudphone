import { Test, TestingModule } from '@nestjs/testing';
import { GpuController } from './gpu.controller';
import { GpuManagerService } from './gpu-manager.service';

describe('GpuController', () => {
  let controller: GpuController;
  let gpuManager: any;

  const mockGpuManagerService = {
    detectGpu: jest.fn(),
    getDiagnostics: jest.fn(),
    getRecommendedConfig: jest.fn(),
    getGpuStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GpuController],
      providers: [
        {
          provide: GpuManagerService,
          useValue: mockGpuManagerService,
        },
      ],
    }).compile();

    controller = module.get<GpuController>(GpuController);
    gpuManager = module.get(GpuManagerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getGpuInfo', () => {
    it('should return GPU information', async () => {
      const mockGpuInfo = {
        available: true,
        gpuType: 'NVIDIA',
        driver: 'nvidia',
        devices: [
          {
            id: '0',
            name: 'NVIDIA GeForce RTX 3080',
            memory: 10240,
          },
        ],
      };

      gpuManager.detectGpu.mockResolvedValue(mockGpuInfo);

      const result = await controller.getGpuInfo();

      expect(result).toEqual(mockGpuInfo);
      expect(result.available).toBe(true);
      expect(result.devices).toHaveLength(1);
      expect(gpuManager.detectGpu).toHaveBeenCalled();
    });

    it('should handle GPU not available', async () => {
      const mockGpuInfo = {
        available: false,
        gpuType: null,
        driver: null,
        devices: [],
      };

      gpuManager.detectGpu.mockResolvedValue(mockGpuInfo);

      const result = await controller.getGpuInfo();

      expect(result.available).toBe(false);
      expect(result.devices).toHaveLength(0);
    });

    it('should detect multiple GPUs', async () => {
      const mockGpuInfo = {
        available: true,
        gpuType: 'NVIDIA',
        devices: [
          { id: '0', name: 'GPU 1', memory: 8192 },
          { id: '1', name: 'GPU 2', memory: 8192 },
        ],
      };

      gpuManager.detectGpu.mockResolvedValue(mockGpuInfo);

      const result = await controller.getGpuInfo();

      expect(result.devices).toHaveLength(2);
    });
  });

  describe('getDiagnostics', () => {
    it('should return GPU diagnostics with warnings', async () => {
      const mockDiagnostics = {
        status: 'warning',
        warnings: [
          'GPU driver version outdated',
          'Insufficient GPU memory',
        ],
        recommendations: [
          'Update GPU driver to latest version',
          'Consider upgrading GPU memory',
        ],
        gpuInfo: {
          available: true,
          devices: [{ id: '0', memory: 4096 }],
        },
      };

      gpuManager.getDiagnostics.mockResolvedValue(mockDiagnostics);

      const result = await controller.getDiagnostics();

      expect(result).toEqual(mockDiagnostics);
      expect(result.status).toBe('warning');
      expect(result.warnings).toHaveLength(2);
      expect(result.recommendations).toHaveLength(2);
      expect(gpuManager.getDiagnostics).toHaveBeenCalled();
    });

    it('should return healthy diagnostics', async () => {
      const mockDiagnostics = {
        status: 'healthy',
        warnings: [],
        recommendations: [],
        gpuInfo: {
          available: true,
          devices: [{ id: '0', memory: 10240 }],
        },
      };

      gpuManager.getDiagnostics.mockResolvedValue(mockDiagnostics);

      const result = await controller.getDiagnostics();

      expect(result.status).toBe('healthy');
      expect(result.warnings).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
    });

    it('should handle critical diagnostics', async () => {
      const mockDiagnostics = {
        status: 'critical',
        warnings: ['GPU not detected', 'No compatible driver'],
        recommendations: ['Install GPU driver', 'Verify GPU hardware'],
        gpuInfo: {
          available: false,
          devices: [],
        },
      };

      gpuManager.getDiagnostics.mockResolvedValue(mockDiagnostics);

      const result = await controller.getDiagnostics();

      expect(result.status).toBe('critical');
      expect(result.gpuInfo.available).toBe(false);
    });
  });

  describe('getRecommendedConfig', () => {
    it('should return recommended configs for all levels', () => {
      const mockHighConfig = {
        gpuEnabled: true,
        gpuCount: 1,
        gpuMemory: 4096,
        renderNode: '/dev/dri/renderD128',
      };

      const mockBalancedConfig = {
        gpuEnabled: true,
        gpuCount: 1,
        gpuMemory: 2048,
        renderNode: '/dev/dri/renderD128',
      };

      const mockLowConfig = {
        gpuEnabled: false,
        gpuCount: 0,
        gpuMemory: 0,
        renderNode: null,
      };

      gpuManager.getRecommendedConfig
        .mockReturnValueOnce(mockHighConfig)
        .mockReturnValueOnce(mockBalancedConfig)
        .mockReturnValueOnce(mockLowConfig);

      const result = controller.getRecommendedConfig();

      expect(result.high).toEqual(mockHighConfig);
      expect(result.balanced).toEqual(mockBalancedConfig);
      expect(result.low).toEqual(mockLowConfig);
      expect(gpuManager.getRecommendedConfig).toHaveBeenCalledTimes(3);
      expect(gpuManager.getRecommendedConfig).toHaveBeenNthCalledWith(1, 'high');
      expect(gpuManager.getRecommendedConfig).toHaveBeenNthCalledWith(2, 'balanced');
      expect(gpuManager.getRecommendedConfig).toHaveBeenNthCalledWith(3, 'low');
    });

    it('should handle configs without GPU support', () => {
      const mockNoGpuConfig = {
        gpuEnabled: false,
        gpuCount: 0,
        gpuMemory: 0,
        renderNode: null,
      };

      gpuManager.getRecommendedConfig.mockReturnValue(mockNoGpuConfig);

      const result = controller.getRecommendedConfig();

      expect(result.high.gpuEnabled).toBe(false);
      expect(result.balanced.gpuEnabled).toBe(false);
      expect(result.low.gpuEnabled).toBe(false);
    });
  });

  describe('getGpuStats', () => {
    it('should return GPU usage statistics', async () => {
      const mockStats = {
        totalDevices: 2,
        activeDevices: 1,
        utilizationPercent: 65,
        memoryUsed: 6144,
        memoryTotal: 10240,
        temperature: 72,
        powerUsage: 180,
      };

      gpuManager.getGpuStats.mockResolvedValue(mockStats);

      const result = await controller.getGpuStats();

      expect(result).toEqual(mockStats);
      expect(result.totalDevices).toBe(2);
      expect(result.activeDevices).toBe(1);
      expect(result.utilizationPercent).toBe(65);
      expect(gpuManager.getGpuStats).toHaveBeenCalled();
    });

    it('should handle idle GPU stats', async () => {
      const mockStats = {
        totalDevices: 1,
        activeDevices: 0,
        utilizationPercent: 0,
        memoryUsed: 0,
        memoryTotal: 8192,
        temperature: 45,
        powerUsage: 20,
      };

      gpuManager.getGpuStats.mockResolvedValue(mockStats);

      const result = await controller.getGpuStats();

      expect(result.activeDevices).toBe(0);
      expect(result.utilizationPercent).toBe(0);
      expect(result.memoryUsed).toBe(0);
    });

    it('should handle high utilization stats', async () => {
      const mockStats = {
        totalDevices: 1,
        activeDevices: 1,
        utilizationPercent: 95,
        memoryUsed: 9728,
        memoryTotal: 10240,
        temperature: 85,
        powerUsage: 280,
      };

      gpuManager.getGpuStats.mockResolvedValue(mockStats);

      const result = await controller.getGpuStats();

      expect(result.utilizationPercent).toBe(95);
      expect(result.memoryUsed / result.memoryTotal).toBeGreaterThan(0.9);
    });

    it('should handle stats with no GPU', async () => {
      const mockStats = {
        totalDevices: 0,
        activeDevices: 0,
        utilizationPercent: 0,
        memoryUsed: 0,
        memoryTotal: 0,
        temperature: null,
        powerUsage: null,
      };

      gpuManager.getGpuStats.mockResolvedValue(mockStats);

      const result = await controller.getGpuStats();

      expect(result.totalDevices).toBe(0);
      expect(result.temperature).toBeNull();
      expect(result.powerUsage).toBeNull();
    });
  });
});
