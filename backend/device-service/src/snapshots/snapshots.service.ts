import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceSnapshot, SnapshotStatus } from '../entities/device-snapshot.entity';
import { Device, DeviceStatus } from '../entities/device.entity';
import { CreateSnapshotDto } from './dto/create-snapshot.dto';
import { RestoreSnapshotDto } from './dto/restore-snapshot.dto';
import { DockerService } from '../docker/docker.service';
import { DevicesService } from '../devices/devices.service';
import { PortManagerService } from '../port-manager/port-manager.service';
import { DeviceProviderFactory } from '../providers/device-provider.factory';
import { DeviceProviderType } from '../providers/provider.types';
import { BusinessErrors, BusinessException, BusinessErrorCode } from '@cloudphone/shared';
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
    private providerFactory: DeviceProviderFactory
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
    userId: string
  ): Promise<DeviceSnapshot> {
    this.logger.log(`Creating snapshot for device ${deviceId}`);

    // 1. 验证设备存在
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw BusinessErrors.deviceNotFound(deviceId);
    }

    // 2. 检查设备是否运行中
    if (device.status !== 'running') {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        '设备必须处于运行状态才能创建快照',
        HttpStatus.BAD_REQUEST
      );
    }

    // 3. 根据 providerType 路由到不同的快照创建逻辑
    const providerType = device.providerType || DeviceProviderType.REDROID;

    // 3.1 云设备（阿里云 ECP、华为云 CPH）：调用 Provider API
    if (
      providerType === DeviceProviderType.ALIYUN_ECP ||
      providerType === DeviceProviderType.HUAWEI_CPH
    ) {
      return await this.createCloudSnapshot(device, createSnapshotDto, userId);
    }

    // 3.2 本地设备（Redroid、物理设备）：使用 Docker 快照
    return await this.createLocalSnapshot(device, createSnapshotDto, userId);
  }

  /**
   * 创建云设备快照（阿里云 ECP、华为云 CPH）
   */
  private async createCloudSnapshot(
    device: Device,
    createSnapshotDto: CreateSnapshotDto,
    userId: string
  ): Promise<DeviceSnapshot> {
    const providerType = device.providerType || DeviceProviderType.REDROID;

    try {
      // 获取对应的 provider
      const provider = this.providerFactory.getProvider(providerType);

      // 检查 provider 是否支持快照
      if (!provider.createSnapshot) {
        throw new BusinessException(
          BusinessErrorCode.OPERATION_NOT_SUPPORTED,
          `Provider ${providerType} does not support snapshot creation`,
          HttpStatus.BAD_REQUEST
        );
      }

      // 调用 provider 创建快照
      const snapshotId = await provider.createSnapshot(
        device.externalId || device.containerId!,
        createSnapshotDto.name,
        createSnapshotDto.description
      );

      // 创建快照记录
      const snapshot = this.snapshotRepository.create({
        name: createSnapshotDto.name,
        description: createSnapshotDto.description,
        deviceId: device.id,
        status: SnapshotStatus.CREATING, // 云快照可能需要时间
        tags: createSnapshotDto.tags || [],
        metadata: {
          deviceName: device.name,
          providerType: providerType,
          providerSnapshotId: snapshotId, // 云 provider 返回的快照 ID
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

      this.logger.log(
        `Cloud snapshot created: ${savedSnapshot.id} (provider: ${providerType}, providerSnapshotId: ${snapshotId})`
      );

      // 异步检查快照状态
      this.checkCloudSnapshotStatus(savedSnapshot.id, snapshotId, providerType).catch((error) => {
        this.logger.error(`Failed to check cloud snapshot status: ${error.message}`);
      });

      return savedSnapshot;
    } catch (error) {
      this.logger.error(`Failed to create cloud snapshot: ${error.message}`);
      throw new BusinessException(
        BusinessErrorCode.SNAPSHOT_CREATION_FAILED,
        `创建云设备快照失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 创建本地设备快照（Redroid Docker）
   */
  private async createLocalSnapshot(
    device: Device,
    createSnapshotDto: CreateSnapshotDto,
    userId: string
  ): Promise<DeviceSnapshot> {
    // 创建快照记录
    const snapshot = this.snapshotRepository.create({
      name: createSnapshotDto.name,
      description: createSnapshotDto.description,
      deviceId: device.id,
      status: SnapshotStatus.CREATING,
      tags: createSnapshotDto.tags || [],
      metadata: {
        deviceName: device.name,
        providerType: device.providerType || DeviceProviderType.REDROID,
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

    // 异步创建 Docker 快照
    if (device.containerId) {
      this.createDockerSnapshot(savedSnapshot.id, device.containerId).catch((error) => {
        this.logger.error(
          `Failed to create Docker snapshot for ${savedSnapshot.id}: ${error.message}`
        );
        this.updateSnapshotStatus(savedSnapshot.id, SnapshotStatus.FAILED);
      });
    }

    return savedSnapshot;
  }

  /**
   * 异步检查云快照状态
   */
  private async checkCloudSnapshotStatus(
    snapshotId: string,
    providerSnapshotId: string,
    providerType: DeviceProviderType
  ): Promise<void> {
    try {
      const provider = this.providerFactory.getProvider(providerType);

      if (!provider.listSnapshots) {
        this.logger.warn(`Provider ${providerType} does not support listSnapshots`);
        return;
      }

      // 等待一段时间后检查
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // 获取快照列表，查找对应的快照
      const snapshot = await this.snapshotRepository.findOne({
        where: { id: snapshotId },
      });

      if (!snapshot) {
        this.logger.warn(`Snapshot ${snapshotId} not found`);
        return;
      }

      const deviceId = snapshot.deviceId;
      const device = await this.deviceRepository.findOne({
        where: { id: deviceId },
      });

      if (!device) {
        this.logger.warn(`Device ${deviceId} not found`);
        return;
      }

      const cloudSnapshots = await provider.listSnapshots(
        device.externalId || device.containerId!
      );

      const cloudSnapshot = cloudSnapshots.find((s) => s.id === providerSnapshotId);

      if (cloudSnapshot) {
        if (cloudSnapshot.status === 'available') {
          snapshot.status = SnapshotStatus.READY;
          if (cloudSnapshot.size !== undefined) {
            snapshot.imageSize = cloudSnapshot.size;
          }
          await this.snapshotRepository.save(snapshot);
          this.logger.log(`Cloud snapshot ${snapshotId} is ready`);
        } else if (cloudSnapshot.status === 'error') {
          snapshot.status = SnapshotStatus.FAILED;
          await this.snapshotRepository.save(snapshot);
          this.logger.error(`Cloud snapshot ${snapshotId} failed`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to check cloud snapshot status: ${error.message}`);
    }
  }

  /**
   * 创建 Docker 快照（异步）
   */
  private async createDockerSnapshot(snapshotId: string, containerId: string): Promise<void> {
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
      const imageInfo = await this.dockerService['docker'].getImage(image.Id).inspect();

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
    userId: string
  ): Promise<Device> {
    this.logger.log(`Restoring from snapshot ${snapshotId}`);

    // 1. 验证快照存在且可用（优化：只查询需要的字段，避免加载完整 device 关系）
    const snapshot = await this.snapshotRepository
      .createQueryBuilder('snapshot')
      .leftJoinAndSelect('snapshot.device', 'device')
      .where('snapshot.id = :id', { id: snapshotId })
      .select([
        'snapshot.id',
        'snapshot.name',
        'snapshot.deviceId',
        'snapshot.status',
        'snapshot.imageId',
        'snapshot.imageName',
        'snapshot.metadata',
        'device.id',
        'device.name',
        'device.containerId',
        'device.status',
      ])
      .getOne();

    if (!snapshot) {
      throw BusinessErrors.snapshotNotFound(snapshotId);
    }

    if (snapshot.status !== SnapshotStatus.READY) {
      throw BusinessErrors.snapshotNotReady(snapshotId);
    }

    // 2. 验证镜像存在
    try {
      await this.dockerService['docker'].getImage(snapshot.imageId).inspect();
    } catch (error) {
      throw new BusinessException(
        BusinessErrorCode.SNAPSHOT_RESTORE_FAILED,
        '快照镜像在 Docker 中不存在',
        HttpStatus.BAD_REQUEST
      );
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

        // ✅ 验证 containerId 和 adbPort 必须存在
        if (!snapshot.device.containerId || !snapshot.device.adbPort) {
          throw new BusinessException(
            BusinessErrorCode.DEVICE_NOT_AVAILABLE,
            `Device ${snapshot.device.id} missing containerId or adbPort`
          );
        }

        // 删除原容器
        await this.dockerService.removeContainer(snapshot.device.containerId);

        // 使用快照镜像创建新容器
        const container = await this.createContainerFromSnapshot(
          snapshot,
          snapshot.device.name,
          snapshot.device.adbPort
        );

        // 更新设备信息
        snapshot.device.containerId = container.id;
        snapshot.device.status = DeviceStatus.RUNNING;
        device = await this.deviceRepository.save(snapshot.device);
      } else {
        // 创建新设备
        const deviceName = restoreDto.deviceName || `${snapshot.name}-restored-${Date.now()}`;

        // 分配新端口
        const adbPort = await this.allocatePort();

        // 使用快照镜像创建容器
        const container = await this.createContainerFromSnapshot(snapshot, deviceName, adbPort);

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
    adbPort: number
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
      throw BusinessErrors.snapshotNotFound(snapshotId);
    }

    if (snapshot.status !== SnapshotStatus.READY) {
      throw BusinessErrors.snapshotNotReady(snapshotId);
    }

    if (snapshot.isCompressed) {
      this.logger.warn(`Snapshot ${snapshotId} is already compressed`);
      return snapshot;
    }

    try {
      // 导出并压缩镜像
      const compressedPath = path.join(this.snapshotDir, `${snapshot.id}.tar.gz`);

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
        `Snapshot compressed: ${snapshot.imageSize} -> ${stats.size} (${((stats.size / snapshot.imageSize) * 100).toFixed(2)}%)`
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
      relations: ['device'],
    });

    if (!snapshot) {
      throw BusinessErrors.snapshotNotFound(snapshotId);
    }

    // 权限检查
    if (snapshot.createdBy !== userId) {
      throw new BusinessException(
        BusinessErrorCode.INSUFFICIENT_PERMISSIONS,
        '您只能删除自己的快照',
        HttpStatus.FORBIDDEN
      );
    }

    // 根据 providerType 路由到不同的删除逻辑
    const providerType =
      (snapshot.metadata?.providerType as DeviceProviderType) || DeviceProviderType.REDROID;

    if (
      providerType === DeviceProviderType.ALIYUN_ECP ||
      providerType === DeviceProviderType.HUAWEI_CPH
    ) {
      // 云设备快照：调用 Provider API
      await this.deleteCloudSnapshot(snapshot);
    } else {
      // 本地设备快照：删除 Docker 镜像和文件
      await this.deleteLocalSnapshot(snapshot);
    }

    // 删除数据库记录
    await this.snapshotRepository.remove(snapshot);

    this.logger.log(`Snapshot ${snapshotId} deleted`);
  }

  /**
   * 删除云设备快照
   */
  private async deleteCloudSnapshot(snapshot: DeviceSnapshot): Promise<void> {
    const providerType =
      (snapshot.metadata?.providerType as DeviceProviderType) || DeviceProviderType.REDROID;
    const providerSnapshotId = snapshot.metadata?.providerSnapshotId;

    if (!providerSnapshotId) {
      this.logger.warn(`No providerSnapshotId found for snapshot ${snapshot.id}`);
      return;
    }

    try {
      const provider = this.providerFactory.getProvider(providerType);

      if (!provider.deleteSnapshot) {
        this.logger.warn(`Provider ${providerType} does not support deleteSnapshot`);
        return;
      }

      // 获取设备信息
      const device = snapshot.device || (await this.deviceRepository.findOne({
        where: { id: snapshot.deviceId },
      }));

      if (!device) {
        this.logger.warn(`Device ${snapshot.deviceId} not found, skipping provider deletion`);
        return;
      }

      // 调用 provider 删除快照
      await provider.deleteSnapshot(
        device.externalId || device.containerId!,
        providerSnapshotId
      );

      this.logger.log(
        `Cloud snapshot deleted from provider: ${providerSnapshotId} (provider: ${providerType})`
      );
    } catch (error) {
      this.logger.error(`Failed to delete cloud snapshot from provider: ${error.message}`);
      // 不抛出错误，继续删除数据库记录
    }
  }

  /**
   * 删除本地设备快照（Docker 镜像和文件）
   */
  private async deleteLocalSnapshot(snapshot: DeviceSnapshot): Promise<void> {
    // 删除 Docker 镜像
    if (snapshot.imageId) {
      try {
        const image = this.dockerService['docker'].getImage(snapshot.imageId);
        await image.remove({ force: true });
        this.logger.log(`Docker image deleted: ${snapshot.imageId}`);
      } catch (error) {
        this.logger.warn(`Failed to delete Docker image: ${error.message}`);
      }
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
  }

  /**
   * 获取设备的所有快照
   * 对于云设备，会合并数据库记录和云端快照列表
   */
  async findByDevice(deviceId: string): Promise<DeviceSnapshot[]> {
    // 1. 查询设备信息
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw BusinessErrors.deviceNotFound(deviceId);
    }

    // 2. 查询数据库中的快照记录
    const dbSnapshots = await this.snapshotRepository.find({
      where: { deviceId },
      order: { createdAt: 'DESC' },
    });

    // 3. 判断是否为云设备
    const providerType = device.providerType || DeviceProviderType.REDROID;

    if (
      providerType !== DeviceProviderType.ALIYUN_ECP &&
      providerType !== DeviceProviderType.HUAWEI_CPH
    ) {
      // 非云设备，直接返回数据库记录
      return dbSnapshots;
    }

    // 4. 云设备：获取云端快照列表并合并
    try {
      const provider = this.providerFactory.getProvider(providerType);

      if (!provider.listSnapshots) {
        this.logger.warn(`Provider ${providerType} does not support listSnapshots`);
        return dbSnapshots;
      }

      const cloudSnapshots = await provider.listSnapshots(
        device.externalId || device.containerId!
      );

      // 5. 合并数据库快照和云端快照
      // - 数据库快照优先显示（因为包含更多元数据）
      // - 云端快照如果在数据库中不存在，则添加到列表
      const dbSnapshotIds = new Set(
        dbSnapshots
          .filter((s) => s.metadata?.providerSnapshotId)
          .map((s) => s.metadata!.providerSnapshotId)
      );

      const newCloudSnapshots: DeviceSnapshot[] = [];

      for (const cloudSnapshot of cloudSnapshots) {
        if (!dbSnapshotIds.has(cloudSnapshot.id)) {
          // 云端快照在数据库中不存在，创建虚拟快照对象
          const virtualSnapshot = this.snapshotRepository.create({
            id: cloudSnapshot.id, // 使用云端快照 ID
            name: cloudSnapshot.name,
            description: cloudSnapshot.description,
            deviceId: device.id,
            status: this.mapCloudSnapshotStatus(cloudSnapshot.status),
            imageSize: cloudSnapshot.size,
            createdAt: new Date(cloudSnapshot.createdAt),
            metadata: {
              providerType: providerType,
              providerSnapshotId: cloudSnapshot.id,
              deviceName: device.name,
              isCloudOnly: true, // 标记为仅云端快照
            },
            tags: [],
            version: 1,
            createdBy: 'system', // 云端快照没有 createdBy 信息
          });

          newCloudSnapshots.push(virtualSnapshot);
        }
      }

      // 合并并按创建时间排序
      const allSnapshots = [...dbSnapshots, ...newCloudSnapshots].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      return allSnapshots;
    } catch (error) {
      this.logger.error(`Failed to list cloud snapshots: ${error.message}`);
      // 出错时返回数据库记录
      return dbSnapshots;
    }
  }

  /**
   * 映射云快照状态到数据库快照状态
   */
  private mapCloudSnapshotStatus(cloudStatus: string): SnapshotStatus {
    switch (cloudStatus) {
      case 'available':
        return SnapshotStatus.READY;
      case 'creating':
        return SnapshotStatus.CREATING;
      case 'error':
        return SnapshotStatus.FAILED;
      default:
        return SnapshotStatus.CREATING;
    }
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
      throw BusinessErrors.snapshotNotFound(snapshotId);
    }

    // 权限检查
    if (userId && snapshot.createdBy !== userId) {
      throw BusinessErrors.snapshotNotFound(snapshotId);
    }

    return snapshot;
  }

  /**
   * 更新快照状态
   */
  private async updateSnapshotStatus(snapshotId: string, status: SnapshotStatus): Promise<void> {
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

    const totalSize = await queryBuilder.select('SUM(snapshot.imageSize)', 'totalSize').getRawOne();

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
