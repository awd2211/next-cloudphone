import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Docker from 'dockerode';

@Injectable()
export class DockerService {
  private docker: Docker;

  constructor(private configService: ConfigService) {
    this.docker = new Docker({
      socketPath: this.configService.get('DOCKER_HOST') || '/var/run/docker.sock',
    });
  }

  async createContainer(config: {
    name: string;
    cpuCores: number;
    memoryMB: number;
    resolution: string;
    dpi: number;
  }): Promise<Docker.Container> {
    const imageTag = this.configService.get('REDROID_IMAGE') || 'redroid/redroid:latest';
    const basePort = parseInt(this.configService.get('REDROID_BASE_PORT') || '5555');

    // 确保镜像存在
    await this.pullImageIfNeeded(imageTag);

    const container = await this.docker.createContainer({
      name: config.name,
      Image: imageTag,
      Env: [
        `WIDTH=${config.resolution.split('x')[0]}`,
        `HEIGHT=${config.resolution.split('x')[1]}`,
        `DPI=${config.dpi}`,
      ],
      HostConfig: {
        Privileged: true,
        Memory: config.memoryMB * 1024 * 1024,
        NanoCpus: config.cpuCores * 1e9,
        PortBindings: {
          '5555/tcp': [{ HostPort: '' }], // 动态分配端口
        },
      },
    });

    await container.start();

    return container;
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
