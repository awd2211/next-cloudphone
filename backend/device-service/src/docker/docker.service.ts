import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Dockerode = require('dockerode');
import { GpuManagerService, GpuConfig } from '../gpu/gpu-manager.service';
import { Retry, DockerError } from '../common/retry.decorator';

export interface RedroidConfig {
  name: string;
  cpuCores: number;
  memoryMB: number;
  storageMB?: number;
  resolution: string;
  dpi: number;
  adbPort: number;
  webrtcPort?: number;
  androidVersion?: string;
  enableGpu?: boolean;
  enableAudio?: boolean;
  gpuConfig?: GpuConfig;
}

@Injectable()
export class DockerService {
  private readonly logger = new Logger(DockerService.name);
  private docker: Dockerode;

  constructor(
    private configService: ConfigService,
    private gpuManager: GpuManagerService,
  ) {
    const dockerHost =
      this.configService.get('DOCKER_HOST') || '/var/run/docker.sock';

    this.docker = new Dockerode({
      socketPath: dockerHost,
    });

    this.logger.log(`Docker client initialized: ${dockerHost}`);
  }

  /**
   * 创建 Redroid 容器（增强版）
   */
  async createContainer(config: RedroidConfig): Promise<Dockerode.Container> {
    const imageTag = this.getRedroidImage(config.androidVersion);

    // 确保镜像存在
    await this.pullImageIfNeeded(imageTag);

    // 解析分辨率
    const [width, height] = config.resolution.split('x').map(Number);

    // GPU 配置（需要先初始化，因为下面的 env 需要用到）
    let gpuConfig: GpuConfig;
    let gpuEnv: string[] = [];
    let gpuDevices: any[] = [];

    // 构建环境变量
    const env = [
      `WIDTH=${width}`,
      `HEIGHT=${height}`,
      `DPI=${config.dpi}`,
      `fps=60`, // 帧率
    ];

    // 音频配置
    if (config.enableAudio) {
      env.push('REDROID_AUDIO=1');
    }

    // 构建端口映射
    const portBindings: any = {
      '5555/tcp': [{ HostPort: String(config.adbPort) }],
    };

    if (config.webrtcPort) {
      portBindings['8080/tcp'] = [{ HostPort: String(config.webrtcPort) }];
    }

    if (config.enableGpu) {
      if (config.gpuConfig) {
        // 使用自定义 GPU 配置
        gpuConfig = config.gpuConfig;
      } else {
        // 使用推荐配置
        gpuConfig = this.gpuManager.getRecommendedConfig('balanced');
      }

      // 验证配置
      const validation = await this.gpuManager.validateConfig(gpuConfig);
      if (!validation.valid) {
        this.logger.warn(`GPU validation failed: ${validation.errors.join(', ')}`);
        this.logger.warn('Falling back to software rendering');
        gpuConfig.enabled = false;
      }

      if (gpuConfig.enabled) {
        gpuDevices = this.gpuManager.getDockerDeviceConfig(gpuConfig);
        gpuEnv = this.gpuManager.getGpuEnvironment(gpuConfig);
        // 添加 GPU 环境变量到 env
        if (gpuEnv && gpuEnv.length > 0) {
          env.push(...gpuEnv);
        }
        this.logger.log(`GPU enabled: ${gpuConfig.driver}, devices: ${gpuDevices.length}`);
      }
    }

    // 容器配置
    const containerConfig: Dockerode.ContainerCreateOptions = {
      name: config.name,
      Image: imageTag,
      Env: env,
      Hostname: config.name,

      HostConfig: {
        // 权限配置
        Privileged: true,

        // 资源限制
        Memory: config.memoryMB * 1024 * 1024,
        MemorySwap: config.memoryMB * 1024 * 1024, // 禁用 swap
        NanoCpus: config.cpuCores * 1e9,
        CpuShares: 1024,
        PidsLimit: 1000,

        // 端口映射
        PortBindings: portBindings,
        PublishAllPorts: false,

        // 存储配置
        StorageOpt: config.storageMB
          ? { size: `${config.storageMB}M` }
          : undefined,

        // 设备挂载
        Devices: gpuDevices.length > 0 ? gpuDevices : undefined,

        // 安全配置
        SecurityOpt: [
          'no-new-privileges:true',
          'apparmor=docker-default',
        ],
        CapDrop: ['ALL'],
        CapAdd: [
          'CHOWN',
          'DAC_OVERRIDE',
          'FOWNER',
          'SETGID',
          'SETUID',
          'NET_BIND_SERVICE',
          'SYS_ADMIN', // Redroid 需要
        ],

        // 重启策略
        RestartPolicy: {
          Name: 'unless-stopped',
          MaximumRetryCount: 3,
        },

        // 网络模式
        NetworkMode: 'bridge',
      },

      // 健康检查配置
      Healthcheck: {
        Test: ['CMD-SHELL', 'getprop sys.boot_completed | grep -q 1'],
        Interval: 10 * 1e9, // 10 秒
        Timeout: 5 * 1e9, // 5 秒
        Retries: 3,
        StartPeriod: 60 * 1e9, // 60 秒
      },

      // 标签
      Labels: {
        'com.cloudphone.managed': 'true',
        'com.cloudphone.type': 'redroid',
        'com.cloudphone.version': config.androidVersion || '11',
      },
    };

    this.logger.log(`Creating Redroid container: ${config.name}`);
    this.logger.debug(`Container config: ${JSON.stringify(containerConfig, null, 2)}`);

    const container = await this.docker.createContainer(containerConfig);

    // 启动容器
    await container.start();
    this.logger.log(`Container started: ${config.name}`);

    return container;
  }

  /**
   * 获取 Redroid 镜像标签
   */
  private getRedroidImage(androidVersion?: string): string {
    const version = androidVersion || '11';
    const customImage = this.configService.get('REDROID_IMAGE');

    if (customImage) {
      return customImage;
    }

    // 根据 Android 版本选择镜像
    const imageMap: Record<string, string> = {
      '11': 'redroid/redroid:11.0.0-latest',
      '12': 'redroid/redroid:12.0.0-latest',
      '13': 'redroid/redroid:13.0.0-latest',
    };

    return imageMap[version] || imageMap['11'];
  }

  @Retry({ maxAttempts: 3, baseDelayMs: 2000, retryableErrors: [DockerError] })
  async pullImageIfNeeded(imageTag: string): Promise<void> {
    try {
      await this.docker.getImage(imageTag).inspect();
    } catch (error) {
      this.logger.log(`Pulling image ${imageTag}...`);
      await new Promise((resolve, reject) => {
        this.docker.pull(imageTag, (err: any, stream: any) => {
          if (err) return reject(new DockerError(`Failed to pull image: ${err.message}`));
          this.docker.modem.followProgress(stream, (err: any, output: any) => {
            if (err) return reject(new DockerError(`Failed to download image: ${err.message}`));
            resolve(output);
          });
        });
      });
    }
  }

  @Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [DockerError] })
  async startContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.start();
    } catch (error) {
      throw new DockerError(`Failed to start container: ${error.message}`);
    }
  }

  @Retry({ maxAttempts: 2, baseDelayMs: 1000, retryableErrors: [DockerError] })
  async stopContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop();
    } catch (error) {
      throw new DockerError(`Failed to stop container: ${error.message}`);
    }
  }

  @Retry({ maxAttempts: 2, baseDelayMs: 1000, retryableErrors: [DockerError] })
  async restartContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.restart();
    } catch (error) {
      throw new DockerError(`Failed to restart container: ${error.message}`);
    }
  }

  async removeContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    try {
      await container.stop();
    } catch (error) {
      // 容器可能已经停止
    }
    await container.remove();
  }

  /**
   * 获取容器资源使用统计（适配 Prometheus）
   */
  @Retry({ maxAttempts: 2, baseDelayMs: 500, retryableErrors: [DockerError] })
  async getContainerStats(containerId: string): Promise<{
    cpu_percent?: number;
    memory_usage_mb?: number;
    memory_limit_mb?: number;
    memory_percent?: number;
    network_rx_bytes?: number;
    network_tx_bytes?: number;
    block_read_bytes?: number;
    block_write_bytes?: number;
  } | null> {
    try {
      const container = this.docker.getContainer(containerId);
      const stats = await container.stats({ stream: false });

      // 计算 CPU 使用率
      let cpuPercent: number | undefined;
      if (stats.cpu_stats && stats.precpu_stats) {
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
        const cpuCount = stats.cpu_stats.online_cpus || 1;

        if (systemDelta > 0 && cpuDelta > 0) {
          cpuPercent = (cpuDelta / systemDelta) * cpuCount * 100.0;
        }
      }

      // 计算内存使用量
      let memoryUsageMB: number | undefined;
      let memoryLimitMB: number | undefined;
      let memoryPercent: number | undefined;
      if (stats.memory_stats) {
        const usage = stats.memory_stats.usage || 0;
        const limit = stats.memory_stats.limit || 0;

        memoryUsageMB = usage / (1024 * 1024); // 转换为 MB
        memoryLimitMB = limit / (1024 * 1024);

        if (limit > 0) {
          memoryPercent = (usage / limit) * 100.0;
        }
      }

      // 网络流量统计
      let networkRxBytes: number | undefined;
      let networkTxBytes: number | undefined;
      if (stats.networks) {
        networkRxBytes = 0;
        networkTxBytes = 0;

        for (const iface of Object.values(stats.networks)) {
          networkRxBytes += (iface as any).rx_bytes || 0;
          networkTxBytes += (iface as any).tx_bytes || 0;
        }
      }

      // 磁盘 I/O 统计
      let blockReadBytes: number | undefined;
      let blockWriteBytes: number | undefined;
      if (stats.blkio_stats && stats.blkio_stats.io_service_bytes_recursive) {
        blockReadBytes = 0;
        blockWriteBytes = 0;

        for (const entry of stats.blkio_stats.io_service_bytes_recursive) {
          if (entry.op === 'Read') {
            blockReadBytes += entry.value;
          } else if (entry.op === 'Write') {
            blockWriteBytes += entry.value;
          }
        }
      }

      return {
        cpu_percent: cpuPercent,
        memory_usage_mb: memoryUsageMB,
        memory_limit_mb: memoryLimitMB,
        memory_percent: memoryPercent,
        network_rx_bytes: networkRxBytes,
        network_tx_bytes: networkTxBytes,
        block_read_bytes: blockReadBytes,
        block_write_bytes: blockWriteBytes,
      };
    } catch (error) {
      this.logger.debug(`Failed to get stats for container ${containerId}: ${error.message}`);
      return null;
    }
  }

  async getAdbPort(containerId: string): Promise<number> {
    const container = this.docker.getContainer(containerId);
    const info = await container.inspect();

    const portBindings = info.NetworkSettings.Ports;
    const adbPort = portBindings['5555/tcp']?.[0]?.HostPort;

    return adbPort ? parseInt(adbPort) : null;
  }

  async listContainers(all: boolean = false): Promise<Dockerode.ContainerInfo[]> {
    return await this.docker.listContainers({ all });
  }

  async getContainerInfo(containerId: string): Promise<any> {
    const container = this.docker.getContainer(containerId);
    return await container.inspect();
  }
}
