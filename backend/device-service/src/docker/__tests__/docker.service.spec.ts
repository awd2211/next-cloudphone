import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DockerService, RedroidConfig } from '../docker.service';
import { GpuManagerService } from '../../gpu/gpu-manager.service';
import Dockerode = require('dockerode');

// Mock Dockerode
jest.mock('dockerode');

describe('DockerService', () => {
  let service: DockerService;
  let configService: ConfigService;
  let gpuManager: GpuManagerService;

  // Mock Docker client
  const mockDockerClient = {
    pull: jest.fn(),
    createContainer: jest.fn(),
    getContainer: jest.fn(),
    listContainers: jest.fn(),
    modem: {
      followProgress: jest.fn(),
    },
  };

  // Mock container
  const mockContainer = {
    id: 'container-123',
    start: jest.fn(),
    stop: jest.fn(),
    restart: jest.fn(),
    remove: jest.fn(),
    inspect: jest.fn(),
    stats: jest.fn(),
  };

  // Mock GPU manager
  const mockGpuManager = {
    getRecommendedConfig: jest.fn(),
    validateConfig: jest.fn(),
    getDockerDeviceConfig: jest.fn(),
    getGpuEnvironment: jest.fn(),
  };

  // Mock Config service
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Set up default mock implementations
    mockConfigService.get.mockReturnValue('/var/run/docker.sock');
    (Dockerode as any).mockImplementation(() => mockDockerClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DockerService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: GpuManagerService,
          useValue: mockGpuManager,
        },
      ],
    }).compile();

    service = module.get<DockerService>(DockerService);
    configService = module.get<ConfigService>(ConfigService);
    gpuManager = module.get<GpuManagerService>(GpuManagerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize Docker client with socket path', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('DOCKER_HOST');
      expect(Dockerode).toHaveBeenCalledWith({
        socketPath: '/var/run/docker.sock',
      });
    });

    it('should use custom docker host from config', () => {
      // Arrange
      mockConfigService.get.mockReturnValue('tcp://docker:2375');

      // Act
      const newService = new DockerService(
        mockConfigService as any,
        mockGpuManager as any,
      );

      // Assert
      expect(Dockerode).toHaveBeenCalledWith({
        socketPath: 'tcp://docker:2375',
      });
    });
  });

  describe('createContainer', () => {
    const config: RedroidConfig = {
      name: 'test-device',
      cpuCores: 2,
      memoryMB: 4096,
      resolution: '1080x1920',
      dpi: 320,
      adbPort: 5555,
      webrtcPort: 8080,
      androidVersion: '11',
      enableGpu: false,
      enableAudio: true,
    };

    it('should successfully create a container with basic config', async () => {
      // Arrange
      mockDockerClient.pull.mockImplementation((tag, callback) => {
        callback(null, {});
        return Promise.resolve();
      });
      mockDockerClient.modem.followProgress.mockImplementation(
        (stream, onFinish) => {
          onFinish(null, []);
        },
      );
      mockDockerClient.createContainer.mockResolvedValue(mockContainer);

      // Act
      const result = await service.createContainer(config);

      // Assert
      expect(result).toBe(mockContainer);
      expect(mockDockerClient.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-device',
          HostConfig: expect.objectContaining({
            Memory: 4096 * 1024 * 1024,
            NanoCpus: 2 * 1e9,
            PortBindings: {
              '5555/tcp': [{ HostPort: '5555' }],
              '8080/tcp': [{ HostPort: '8080' }],
            },
            Privileged: true,
          }),
          Env: expect.arrayContaining([
            'WIDTH=1080',
            'HEIGHT=1920',
            'DPI=320',
            'REDROID_AUDIO=1',
          ]),
        }),
      );
    });

    it('should create container with GPU support when enabled', async () => {
      // Arrange
      const gpuConfig: RedroidConfig = {
        ...config,
        enableGpu: true,
      };

      const mockGpuConf = {
        enabled: true,
        vendor: 'nvidia' as const,
        device: '/dev/nvidia0',
      };

      mockGpuManager.getRecommendedConfig.mockReturnValue(mockGpuConf);
      mockGpuManager.validateConfig.mockResolvedValue({
        valid: true,
        errors: [],
      });
      mockGpuManager.getDockerDeviceConfig.mockReturnValue([
        { PathOnHost: '/dev/nvidia0', PathInContainer: '/dev/nvidia0' },
      ]);
      mockGpuManager.getGpuEnvironment.mockReturnValue([
        'NVIDIA_VISIBLE_DEVICES=all',
      ]);

      mockDockerClient.pull.mockImplementation((tag, callback) => {
        callback(null, {});
        return Promise.resolve();
      });
      mockDockerClient.modem.followProgress.mockImplementation(
        (stream, onFinish) => onFinish(null, []),
      );
      mockDockerClient.createContainer.mockResolvedValue(mockContainer);

      // Act
      const result = await service.createContainer(gpuConfig);

      // Assert
      expect(result).toBe(mockContainer);
      expect(mockGpuManager.getRecommendedConfig).toHaveBeenCalledWith(
        'balanced',
      );
      expect(mockGpuManager.validateConfig).toHaveBeenCalledWith(mockGpuConf);
      expect(mockDockerClient.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Env: expect.arrayContaining(['NVIDIA_VISIBLE_DEVICES=all']),
          HostConfig: expect.objectContaining({
            Devices: expect.arrayContaining([
              expect.objectContaining({
                PathOnHost: '/dev/nvidia0',
              }),
            ]),
          }),
        }),
      );
    });

    it('should fallback to software rendering when GPU validation fails', async () => {
      // Arrange
      const gpuConfig: RedroidConfig = {
        ...config,
        enableGpu: true,
      };

      const mockGpuConf = {
        enabled: true,
        vendor: 'nvidia' as const,
        device: '/dev/nvidia0',
      };

      mockGpuManager.getRecommendedConfig.mockReturnValue(mockGpuConf);
      mockGpuManager.validateConfig.mockResolvedValue({
        valid: false,
        errors: ['GPU device not found'],
      });

      mockDockerClient.pull.mockImplementation((tag, callback) => {
        callback(null, {});
        return Promise.resolve();
      });
      mockDockerClient.modem.followProgress.mockImplementation(
        (stream, onFinish) => onFinish(null, []),
      );
      mockDockerClient.createContainer.mockResolvedValue(mockContainer);

      // Act
      const result = await service.createContainer(gpuConfig);

      // Assert
      expect(result).toBe(mockContainer);
      expect(mockDockerClient.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Env: expect.not.arrayContaining(['NVIDIA_VISIBLE_DEVICES=all']),
        }),
      );
    });

    it('should pull image if not available', async () => {
      // Arrange
      mockDockerClient.pull.mockImplementation((tag, callback) => {
        callback(null, {});
        return Promise.resolve();
      });
      mockDockerClient.modem.followProgress.mockImplementation(
        (stream, onFinish) => {
          onFinish(null, [{ status: 'Downloaded' }]);
        },
      );
      mockDockerClient.createContainer.mockResolvedValue(mockContainer);

      // Act
      await service.createContainer(config);

      // Assert
      expect(mockDockerClient.pull).toHaveBeenCalled();
      expect(mockDockerClient.modem.followProgress).toHaveBeenCalled();
    });
  });

  describe('startContainer', () => {
    it('should successfully start a container', async () => {
      // Arrange
      const containerId = 'container-123';
      mockDockerClient.getContainer.mockReturnValue(mockContainer);
      mockContainer.start.mockResolvedValue(undefined);

      // Act
      await service.startContainer(containerId);

      // Assert
      expect(mockDockerClient.getContainer).toHaveBeenCalledWith(containerId);
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it('should handle start failure', async () => {
      // Arrange
      const containerId = 'container-123';
      mockDockerClient.getContainer.mockReturnValue(mockContainer);
      mockContainer.start.mockRejectedValue(new Error('Container start failed'));

      // Act & Assert
      await expect(service.startContainer(containerId)).rejects.toThrow(
        'Container start failed',
      );
    });
  });

  describe('stopContainer', () => {
    it('should successfully stop a container', async () => {
      // Arrange
      const containerId = 'container-123';
      mockDockerClient.getContainer.mockReturnValue(mockContainer);
      mockContainer.stop.mockResolvedValue(undefined);

      // Act
      await service.stopContainer(containerId);

      // Assert
      expect(mockDockerClient.getContainer).toHaveBeenCalledWith(containerId);
      expect(mockContainer.stop).toHaveBeenCalled();
    });

    it('should throw DockerError when stop fails', async () => {
      // Arrange
      const containerId = 'container-123';
      mockDockerClient.getContainer.mockReturnValue(mockContainer);
      mockContainer.stop.mockRejectedValue(new Error('Container already stopped'));

      // Act & Assert - Should throw DockerError
      await expect(service.stopContainer(containerId)).rejects.toThrow(
        'Failed to stop container',
      );
    });
  });

  describe('restartContainer', () => {
    it('should successfully restart a container', async () => {
      // Arrange
      const containerId = 'container-123';
      mockDockerClient.getContainer.mockReturnValue(mockContainer);
      mockContainer.restart.mockResolvedValue(undefined);

      // Act
      await service.restartContainer(containerId);

      // Assert
      expect(mockDockerClient.getContainer).toHaveBeenCalledWith(containerId);
      expect(mockContainer.restart).toHaveBeenCalled();
    });

    it('should throw DockerError when restart fails', async () => {
      // Arrange
      const containerId = 'container-123';
      mockDockerClient.getContainer.mockReturnValue(mockContainer);
      mockContainer.restart.mockRejectedValue(new Error('Restart failed'));

      // Act & Assert
      await expect(service.restartContainer(containerId)).rejects.toThrow(
        'Failed to restart container',
      );
    });
  });

  describe('removeContainer', () => {
    it('should successfully remove a container', async () => {
      // Arrange
      const containerId = 'container-123';
      mockDockerClient.getContainer.mockReturnValue(mockContainer);
      mockContainer.stop.mockResolvedValue(undefined);
      mockContainer.remove.mockResolvedValue(undefined);

      // Act
      await service.removeContainer(containerId);

      // Assert
      expect(mockDockerClient.getContainer).toHaveBeenCalledWith(containerId);
      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
    });

    it('should remove container even if stop fails', async () => {
      // Arrange
      const containerId = 'container-already-stopped';
      mockDockerClient.getContainer.mockReturnValue(mockContainer);
      mockContainer.stop.mockRejectedValue(new Error('Container already stopped'));
      mockContainer.remove.mockResolvedValue(undefined);

      // Act
      await service.removeContainer(containerId);

      // Assert - Stop failure should be caught, remove should still be called
      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
    });

    it('should throw error when remove fails', async () => {
      // Arrange
      const containerId = 'container-123';
      mockDockerClient.getContainer.mockReturnValue(mockContainer);
      mockContainer.stop.mockResolvedValue(undefined);
      mockContainer.remove.mockRejectedValue(new Error('Remove failed'));

      // Act & Assert
      await expect(service.removeContainer(containerId)).rejects.toThrow(
        'Remove failed',
      );
    });
  });

  describe('getContainerStats', () => {
    it('should successfully get container statistics', async () => {
      // Arrange
      const containerId = 'container-123';
      const mockStats = {
        cpu_stats: {
          cpu_usage: { total_usage: 50000000 },
          system_cpu_usage: 100000000,
          online_cpus: 2,
        },
        precpu_stats: {
          cpu_usage: { total_usage: 40000000 },
          system_cpu_usage: 90000000,
        },
        memory_stats: {
          usage: 1024 * 1024 * 512, // 512MB
          limit: 1024 * 1024 * 4096, // 4GB
        },
        networks: {
          eth0: {
            rx_bytes: 1000,
            tx_bytes: 2000,
          },
        },
      };

      mockDockerClient.getContainer.mockReturnValue(mockContainer);
      mockContainer.stats.mockResolvedValue(mockStats);

      // Act
      const result = await service.getContainerStats(containerId);

      // Assert
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('cpu_percent');
      expect(result).toHaveProperty('memory_usage_mb');
      expect(result).toHaveProperty('memory_limit_mb');
      expect(result).toHaveProperty('memory_percent');
      expect(result).toHaveProperty('network_rx_bytes');
      expect(result).toHaveProperty('network_tx_bytes');
      expect(result.memory_usage_mb).toBe(512);
      expect(result.memory_limit_mb).toBe(4096);
      expect(mockContainer.stats).toHaveBeenCalledWith({ stream: false });
    });

    it('should return null on stats retrieval failure', async () => {
      // Arrange
      const containerId = 'container-123';
      mockDockerClient.getContainer.mockReturnValue(mockContainer);
      mockContainer.stats.mockRejectedValue(new Error('Stats failed'));

      // Act
      const result = await service.getContainerStats(containerId);

      // Assert - Should return null instead of throwing
      expect(result).toBeNull();
    });
  });

  describe('listContainers', () => {
    it('should list all running containers', async () => {
      // Arrange
      const mockContainers = [
        { Id: 'container-1', Names: ['/device-1'], State: 'running' },
        { Id: 'container-2', Names: ['/device-2'], State: 'running' },
      ];
      mockDockerClient.listContainers.mockResolvedValue(mockContainers);

      // Act
      const result = await service.listContainers();

      // Assert
      expect(result).toEqual(mockContainers);
      expect(mockDockerClient.listContainers).toHaveBeenCalledWith({
        all: false,
      });
    });

    it('should list all containers including stopped', async () => {
      // Arrange
      const mockContainers = [
        { Id: 'container-1', Names: ['/device-1'], State: 'running' },
        { Id: 'container-2', Names: ['/device-2'], State: 'exited' },
      ];
      mockDockerClient.listContainers.mockResolvedValue(mockContainers);

      // Act
      const result = await service.listContainers(true);

      // Assert
      expect(result).toEqual(mockContainers);
      expect(mockDockerClient.listContainers).toHaveBeenCalledWith({
        all: true,
      });
    });
  });

  describe('getContainerInfo', () => {
    it('should get detailed container information', async () => {
      // Arrange
      const containerId = 'container-123';
      const mockInfo = {
        Id: 'container-123',
        Name: '/device-1',
        State: { Running: true, Status: 'Up 2 hours' },
        NetworkSettings: {
          Ports: {
            '5555/tcp': [{ HostPort: '5555' }],
          },
        },
      };

      mockDockerClient.getContainer.mockReturnValue(mockContainer);
      mockContainer.inspect.mockResolvedValue(mockInfo);

      // Act
      const result = await service.getContainerInfo(containerId);

      // Assert
      expect(result).toEqual(mockInfo);
      expect(mockContainer.inspect).toHaveBeenCalled();
    });

    it('should handle container not found', async () => {
      // Arrange
      const containerId = 'container-non-existent';
      const error: any = new Error('No such container');
      error.statusCode = 404;

      mockDockerClient.getContainer.mockReturnValue(mockContainer);
      mockContainer.inspect.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getContainerInfo(containerId)).rejects.toThrow(
        'No such container',
      );
    });
  });

  describe('getAdbPort', () => {
    it('should extract ADB port from container info', async () => {
      // Arrange
      const containerId = 'container-123';
      const mockInfo = {
        NetworkSettings: {
          Ports: {
            '5555/tcp': [{ HostPort: '5555' }],
            '8080/tcp': [{ HostPort: '8080' }],
          },
        },
      };

      mockDockerClient.getContainer.mockReturnValue(mockContainer);
      mockContainer.inspect.mockResolvedValue(mockInfo);

      // Act
      const result = await service.getAdbPort(containerId);

      // Assert
      expect(result).toBe(5555);
    });

    it('should return null when ADB port not found', async () => {
      // Arrange
      const containerId = 'container-123';
      const mockInfo = {
        NetworkSettings: {
          Ports: {
            '8080/tcp': [{ HostPort: '8080' }],
          },
        },
      };

      mockDockerClient.getContainer.mockReturnValue(mockContainer);
      mockContainer.inspect.mockResolvedValue(mockInfo);

      // Act
      const result = await service.getAdbPort(containerId);

      // Assert - Should return null instead of throwing
      expect(result).toBeNull();
    });
  });
});
