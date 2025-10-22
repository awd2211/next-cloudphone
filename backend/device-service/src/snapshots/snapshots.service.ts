import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceSnapshot, SnapshotStatus } from '../entities/device-snapshot.entity';
import { Device, DeviceStatus } from '../entities/device.entity';
import { CreateSnapshotDto } from './dto/create-snapshot.dto';
import { RestoreSnapshotDto } from './dto/restore-snapshot.dto';
import { DockerService } from '../docker/docker.service';
import { DevicesService } from '../devices/devices.service';
import { PortManagerService } from '../port-manager/port-manager.service';
import Dockerode = require('dockerode');
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class SnapshotsService {
  private readonly logger = new Logger(SnapshotsService.name);
  private readonly snapshotDir = process.env.SNAPSHOT_DIR || '/data/snapshots';

  constructor(
    @InjectRepository(DeviceSnapshot)
    private snapshotRepository: Repository<DeviceSnapshot>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private dockerService: DockerService,
    private devicesService: DevicesService,
    private portManagerService: PortManagerService,
  ) {
    // 确保快照目录存在
    if (!fs.existsSync(this.snapshotDir)) {
      fs.mkdirSync(this.snapshotDir, { recursive: true });
    }
  }

  /**
   * 创建设备快照
   */
  async createSnapshot(
    deviceId: string,
    createSnapshotDto: CreateSnapshotDto,
    userId: string,
  ): Promise<DeviceSnapshot> {
    this.logger.log(`Creating snapshot for device ${deviceId}`);

    // 1. 验证设备存在
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    // 2. 检查设备是否运行中
    if (device.status !== 'running') {
      throw new BadRequestException('Device must be running to create snapshot');
    }

    // 3. 创建快照记录
    const snapshot = this.snapshotRepository.create({
      name: createSnapshotDto.name,
      description: createSnapshotDto.description,
      deviceId: device.id,
      status: SnapshotStatus.CREATING,
      tags: createSnapshotDto.tags || [],
      metadata: {
        deviceName: device.name,
        cpuCores: device.cpuCores,
        memoryMB: device.memoryMB,
        resolution: device.resolution,
        androidVersion: device.androidVersion,
        ...createSnapshotDto.metadata,
      },
      version: 1,
      createdBy: userId,
    });

    const savedSnapshot = await this.snapshotRepository.save(snapshot);

    // 4. 异步创建 Docker 快照
    this.createDockerSnapshot(savedSnapshot.id, device.containerId).catch((error) => {
      this.logger.error(
        `Failed to create Docker snapshot for ${savedSnapshot.id}: ${error.message}`,
      );
      this.updateSnapshotStatus(savedSnapshot.id, SnapshotStatus.FAILED);
    });

    return savedSnapshot;
  }

  /**
   * 创建 Docker 快照（异步）
   */
  private async createDockerSnapshot(
    snapshotId: string,
    containerId: string,
  ): Promise<void> {
    try {
      const snapshot = await this.snapshotRepository.findOne({
        where: { id: snapshotId },
      });

      if (!snapshot) {
        throw new Error('Snapshot not found');
      }

      // 生成镜像名称
      const imageName = `cloudphone-snapshot:${snapshotId}`;

      this.logger.log(`Committing container ${containerId} to ${imageName}`);

      // 使用 Docker SDK 创建快照
      const container = await this.dockerService['docker'].getContainer(containerId);

      // Commit 容器为镜像
      const image = await container.commit({
        repo: 'cloudphone-snapshot',
        tag: snapshotId,
        comment: `Snapshot: ${snapshot.name}`,
        author: snapshot.createdBy,
        pause: false, // 不暂停容器
      });

      this.logger.log(`Docker image created: ${image.Id}`);

      // 获取镜像信息
      const imageInfo = await this.dockerService['docker']
        .getImage(image.Id)
        .inspect();

      // 更新快照信息
      snapshot.imageId = image.Id;
      snapshot.imageName = imageName;
      snapshot.imageSize = imageInfo.Size;
      snapshot.status = SnapshotStatus.READY;

      await this.snapshotRepository.save(snapshot);

      this.logger.log(`Snapshot ${snapshotId} created successfully`);
    } catch (error) {
      this.logger.error(`Failed to create Docker snapshot: ${error.message}`);
      throw error;
    }
  }

  /**
   * 从快照恢复设备
   */
  async restoreSnapshot(
    snapshotId: string,
    restoreDto: RestoreSnapshotDto,
    userId: string,
  ): Promise<Device> {
    this.logger.log(`Restoring from snapshot ${snapshotId}`);

    // 1. 验证快照存在且可用
    const snapshot = await this.snapshotRepository.findOne({
      where: { id: snapshotId },
      relations: ['device'],
    });

    if (!snapshot) {
      throw new NotFoundException(`Snapshot ${snapshotId} not found`);
    }

    if (snapshot.status !== SnapshotStatus.READY) {
      throw new BadRequestException('Snapshot is not ready for restoration');
    }

    // 2. 验证镜像存在
    try {
      await this.dockerService['docker'].getImage(snapshot.imageId).inspect();
    } catch (error) {
      throw new BadRequestException('Snapshot image not found in Docker');
    }

    // 3. 更新快照状态
    snapshot.status = SnapshotStatus.RESTORING;
    await this.snapshotRepository.save(snapshot);

    try {
      let device: Device;

      if (restoreDto.replaceOriginal && snapshot.device) {
        // 替换原设备：停止并删除原容器，使用快照创建新容器
        this.logger.log(`Replacing original device ${snapshot.device.id}`);

        // 停止原设备
        await this.devicesService.stop(snapshot.device.id);

        // 删除原容器
        await this.dockerService.removeContainer(snapshot.device.containerId);

        // 使用快照镜像创建新容器
        const container = await this.createContainerFromSnapshot(
          snapshot,
          snapshot.device.name,
          snapshot.device.adbPort,
        );

        // 更新设备信息
        snapshot.device.containerId = container.id;
        snapshot.device.status = DeviceStatus.RUNNING;
        device = await this.deviceRepository.save(snapshot.device);
      } else {
        // 创建新设备
        const deviceName =
          restoreDto.deviceName || `${snapshot.name}-restored-${Date.now()}`;

        // 分配新端口
        const adbPort = await this.allocatePort();

        // 使用快照镜像创建容器
        const container = await this.createContainerFromSnapshot(
          snapshot,
          deviceName,
          adbPort,
        );

        // 创建设备记录
        device = this.deviceRepository.create({
          name: deviceName,
          containerId: container.id,
          status: DeviceStatus.RUNNING,
          adbPort: adbPort,
          cpuCores: snapshot.metadata.cpuCores,
          memoryMB: snapshot.metadata.memoryMB,
          resolution: snapshot.metadata.resolution,
          androidVersion: snapshot.metadata.androidVersion,
        });

        device = await this.deviceRepository.save(device);
      }

      // 更新快照统计
      snapshot.status = SnapshotStatus.READY;
      snapshot.lastRestoredAt = new Date();
      snapshot.restoreCount += 1;
      await this.snapshotRepository.save(snapshot);

      this.logger.log(`Device restored from snapshot ${snapshotId}`);

      return device;
    } catch (error) {
      this.logger.error(`Failed to restore snapshot: ${error.message}`);
      snapshot.status = SnapshotStatus.READY;
      await this.snapshotRepository.save(snapshot);
      throw error;
    }
  }

  /**
   * 从快照镜像创建容器
   */
  private async createContainerFromSnapshot(
    snapshot: DeviceSnapshot,
    deviceName: string,
    adbPort: number,
  ): Promise<Dockerode.Container> {
    const docker: Dockerode = this.dockerService['docker'];

    const containerConfig: Dockerode.ContainerCreateOptions = {
      name: deviceName,
      Image: snapshot.imageId,
      Hostname: deviceName,
      Env: [
        `WIDTH=${snapshot.metadata.resolution?.split('x')[0] || 1080}`,
        `HEIGHT=${snapshot.metadata.resolution?.split('x')[1] || 1920}`,
        `DPI=${snapshot.metadata.dpi || 320}`,
      ],
      HostConfig: {
        Privileged: true,
        Memory: (snapshot.metadata.memoryMB || 4096) * 1024 * 1024,
        MemorySwap: (snapshot.metadata.memoryMB || 4096) * 1024 * 1024,
        NanoCpus: (snapshot.metadata.cpuCores || 2) * 1e9,
        PortBindings: {
          '5555/tcp': [{ HostPort: String(adbPort) }],
        },
        RestartPolicy: {
          Name: 'unless-stopped',
          MaximumRetryCount: 3,
        },
      },
      Labels: {
        'com.cloudphone.managed': 'true',
        'com.cloudphone.type': 'redroid',
        'com.cloudphone.snapshot': snapshot.id,
      },
    };

    const container = await docker.createContainer(containerConfig);
    await container.start();

    this.logger.log(`Container created from snapshot: ${container.id}`);

    return container;
  }

  /**
   * 压缩快照
   */
  async compressSnapshot(snapshotId: string): Promise<DeviceSnapshot> {
    this.logger.log(`Compressing snapshot ${snapshotId}`);

    const snapshot = await this.snapshotRepository.findOne({
      where: { id: snapshotId },
    });

    if (!snapshot) {
      throw new NotFoundException(`Snapshot ${snapshotId} not found`);
    }

    if (snapshot.status !== SnapshotStatus.READY) {
      throw new BadRequestException('Can only compress ready snapshots');
    }

    if (snapshot.isCompressed) {
      this.logger.warn(`Snapshot ${snapshotId} is already compressed`);
      return snapshot;
    }

    try {
      // 导出并压缩镜像
      const compressedPath = path.join(
        this.snapshotDir,
        `${snapshot.id}.tar.gz`,
      );

      this.logger.log(`Saving image to ${compressedPath}`);

      // 使用 docker save 导出镜像并压缩
      const command = `docker save ${snapshot.imageId} | gzip > ${compressedPath}`;
      await execAsync(command);

      // 获取压缩文件大小
      const stats = fs.statSync(compressedPath);

      snapshot.isCompressed = true;
      snapshot.compressedPath = compressedPath;
      snapshot.compressedSize = stats.size;

      await this.snapshotRepository.save(snapshot);

      this.logger.log(
        `Snapshot compressed: ${snapshot.imageSize} -> ${stats.size} (${((stats.size / snapshot.imageSize) * 100).toFixed(2)}%)`,
      );

      return snapshot;
    } catch (error) {
      this.logger.error(`Failed to compress snapshot: ${error.message}`);
      throw error;
    }
  }

  /**
   * 删除快照
   */
  async deleteSnapshot(snapshotId: string, userId: string): Promise<void> {
    const snapshot = await this.snapshotRepository.findOne({
      where: { id: snapshotId },
    });

    if (!snapshot) {
      throw new NotFoundException(`Snapshot ${snapshotId} not found`);
    }

    // 权限检查
    if (snapshot.createdBy !== userId) {
      throw new BadRequestException('You can only delete your own snapshots');
    }

    try {
      // 删除 Docker 镜像
      const image = this.dockerService['docker'].getImage(snapshot.imageId);
      await image.remove({ force: true });
      this.logger.log(`Docker image deleted: ${snapshot.imageId}`);
    } catch (error) {
      this.logger.warn(`Failed to delete Docker image: ${error.message}`);
    }

    // 删除压缩文件
    if (snapshot.isCompressed && snapshot.compressedPath) {
      try {
        if (fs.existsSync(snapshot.compressedPath)) {
          fs.unlinkSync(snapshot.compressedPath);
          this.logger.log(`Compressed file deleted: ${snapshot.compressedPath}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to delete compressed file: ${error.message}`);
      }
    }

    // 删除快照记录
    await this.snapshotRepository.remove(snapshot);

    this.logger.log(`Snapshot ${snapshotId} deleted`);
  }

  /**
   * 获取设备的所有快照
   */
  async findByDevice(deviceId: string): Promise<DeviceSnapshot[]> {
    return await this.snapshotRepository.find({
      where: { deviceId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取用户的所有快照
   */
  async findByUser(userId: string): Promise<DeviceSnapshot[]> {
    return await this.snapshotRepository.find({
      where: { createdBy: userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取单个快照
   */
  async findOne(snapshotId: string, userId?: string): Promise<DeviceSnapshot> {
    const snapshot = await this.snapshotRepository.findOne({
      where: { id: snapshotId },
      relations: ['device'],
    });

    if (!snapshot) {
      throw new NotFoundException(`Snapshot ${snapshotId} not found`);
    }

    // 权限检查
    if (userId && snapshot.createdBy !== userId) {
      throw new NotFoundException(`Snapshot ${snapshotId} not found`);
    }

    return snapshot;
  }

  /**
   * 更新快照状态
   */
  private async updateSnapshotStatus(
    snapshotId: string,
    status: SnapshotStatus,
  ): Promise<void> {
    await this.snapshotRepository.update({ id: snapshotId }, { status });
  }

  /**
   * 分配可用端口
   */
  private async allocatePort(): Promise<number> {
    const ports = await this.portManagerService.allocatePorts();
    return ports.adbPort;
  }

  /**
   * 获取快照统计信息
   */
  async getStatistics(userId?: string): Promise<any> {
    const queryBuilder = this.snapshotRepository.createQueryBuilder('snapshot');

    if (userId) {
      queryBuilder.where('snapshot.createdBy = :userId', { userId });
    }

    const total = await queryBuilder.getCount();

    const byStatus = await queryBuilder
      .select('snapshot.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('snapshot.status')
      .getRawMany();

    const totalSize = await queryBuilder
      .select('SUM(snapshot.imageSize)', 'totalSize')
      .getRawOne();

    const compressedSize = await queryBuilder
      .select('SUM(snapshot.compressedSize)', 'compressedSize')
      .where('snapshot.isCompressed = true')
      .getRawOne();

    return {
      total,
      byStatus,
      totalSize: parseInt(totalSize?.totalSize || '0'),
      compressedSize: parseInt(compressedSize?.compressedSize || '0'),
    };
  }
}
