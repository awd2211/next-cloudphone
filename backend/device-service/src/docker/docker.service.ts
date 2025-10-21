import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Docker from 'dockerode';
import { GpuManagerService, GpuConfig } from '../gpu/gpu-manager.service';

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
  private docker: Docker;

  constructor(
    private configService: ConfigService,
    private gpuManager: GpuManagerService,
  ) {
    const dockerHost =
      this.configService.get('DOCKER_HOST') || '/var/run/docker.sock';

    this.docker = new Docker({
      socketPath: dockerHost,
    });

    this.logger.log(`Docker client initialized: ${dockerHost}`);
  }

  /**
   * 创建 Redroid 容器（增强版）
   */
  async createContainer(config: RedroidConfig): Promise<Docker.Container> {
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
    const containerConfig: Docker.ContainerCreateOptions = {
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

  async pullImageIfNeeded(imageTag: string): Promise<void> {
    try {
      await this.docker.getImage(imageTag).inspect();
    } catch (error) {
      console.log(`Pulling image ${imageTag}...`);
      await new Promise((resolve, reject) => {
        this.docker.pull(imageTag, (err: any, stream: any) => {
          if (err) return reject(err);
          this.docker.modem.followProgress(stream, (err: any, output: any) => {
            if (err) return reject(err);
            resolve(output);
          });
        });
      });
    }
  }

  async startContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.start();
  }

  async stopContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.stop();
  }

  async restartContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.restart();
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

  async getContainerStats(containerId: string): Promise<any> {
    const container = this.docker.getContainer(containerId);
    const stats = await container.stats({ stream: false });
    return stats;
  }

  async getAdbPort(containerId: string): Promise<number> {
    const container = this.docker.getContainer(containerId);
    const info = await container.inspect();

    const portBindings = info.NetworkSettings.Ports;
    const adbPort = portBindings['5555/tcp']?.[0]?.HostPort;

    return adbPort ? parseInt(adbPort) : null;
  }

  async listContainers(all: boolean = false): Promise<Docker.ContainerInfo[]> {
    return await this.docker.listContainers({ all });
  }

  async getContainerInfo(containerId: string): Promise<any> {
    const container = this.docker.getContainer(containerId);
    return await container.inspect();
  }
}
