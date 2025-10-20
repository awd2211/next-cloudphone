import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Device, DeviceStatus } from '../entities/device.entity';
import { DockerService } from '../docker/docker.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>,
    private dockerService: DockerService,
    private configService: ConfigService,
  ) {}

  async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
    // 创建设备记录
    const device = this.devicesRepository.create({
      ...createDeviceDto,
      status: DeviceStatus.CREATING,
    });

    const savedDevice = await this.devicesRepository.save(device);

    // 异步创建 Docker 容器
    this.createDockerContainer(savedDevice).catch((error) => {
      console.error(`Failed to create container for device ${savedDevice.id}:`, error);
      this.updateDeviceStatus(savedDevice.id, DeviceStatus.ERROR);
    });

    return savedDevice;
  }

  private async createDockerContainer(device: Device): Promise<void> {
    try {
      const containerConfig = {
        name: `cloudphone-${device.id}`,
        cpuCores: device.cpuCores,
        memoryMB: device.memoryMB,
        resolution: device.resolution,
        dpi: device.dpi,
      };

      const container = await this.dockerService.createContainer(containerConfig);

      device.containerId = container.id;
      device.containerName = containerConfig.name;
      device.status = DeviceStatus.RUNNING;

      // 获取 ADB 端口
      const adbPort = await this.dockerService.getAdbPort(container.id);
      device.adbPort = adbPort;
      device.adbHost = 'localhost';

      await this.devicesRepository.save(device);
    } catch (error) {
      throw error;
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    userId?: string,
    tenantId?: string,
    status?: DeviceStatus,
  ): Promise<{ data: Device[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;

    const [data, total] = await this.devicesRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Device> {
    const device = await this.devicesRepository.findOne({ where: { id } });

    if (!device) {
      throw new NotFoundException(`设备 #${id} 不存在`);
    }

    return device;
  }

  async update(id: string, updateDeviceDto: UpdateDeviceDto): Promise<Device> {
    const device = await this.findOne(id);

    Object.assign(device, updateDeviceDto);
    return await this.devicesRepository.save(device);
  }

  async remove(id: string): Promise<void> {
    const device = await this.findOne(id);

    // 如果有容器，先删除容器
    if (device.containerId) {
      await this.dockerService.removeContainer(device.containerId);
    }

    device.status = DeviceStatus.DELETED;
    await this.devicesRepository.save(device);
  }

  async start(id: string): Promise<Device> {
    const device = await this.findOne(id);

    if (!device.containerId) {
      throw new BadRequestException('设备没有关联的容器');
    }

    await this.dockerService.startContainer(device.containerId);

    device.status = DeviceStatus.RUNNING;
    device.lastActiveAt = new Date();

    return await this.devicesRepository.save(device);
  }

  async stop(id: string): Promise<Device> {
    const device = await this.findOne(id);

    if (!device.containerId) {
      throw new BadRequestException('设备没有关联的容器');
    }

    await this.dockerService.stopContainer(device.containerId);

    device.status = DeviceStatus.STOPPED;

    return await this.devicesRepository.save(device);
  }

  async restart(id: string): Promise<Device> {
    const device = await this.findOne(id);

    if (!device.containerId) {
      throw new BadRequestException('设备没有关联的容器');
    }

    await this.dockerService.restartContainer(device.containerId);

    device.status = DeviceStatus.RUNNING;
    device.lastActiveAt = new Date();

    return await this.devicesRepository.save(device);
  }

  async updateHeartbeat(id: string, stats?: any): Promise<void> {
    const update: any = {
      lastHeartbeatAt: new Date(),
      lastActiveAt: new Date(),
    };

    if (stats) {
      if (stats.cpuUsage !== undefined) update.cpuUsage = stats.cpuUsage;
      if (stats.memoryUsage !== undefined) update.memoryUsage = stats.memoryUsage;
      if (stats.storageUsage !== undefined) update.storageUsage = stats.storageUsage;
    }

    await this.devicesRepository.update(id, update);
  }

  async updateDeviceStatus(id: string, status: DeviceStatus): Promise<void> {
    await this.devicesRepository.update(id, { status });
  }

  async getStats(id: string): Promise<any> {
    const device = await this.findOne(id);

    if (!device.containerId) {
      throw new BadRequestException('设备没有关联的容器');
    }

    return await this.dockerService.getContainerStats(device.containerId);
  }
}
