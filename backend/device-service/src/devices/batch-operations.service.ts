import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Device, DeviceStatus } from '../entities/device.entity';
import { DevicesService } from './devices.service';
import {
  BatchCreateDeviceDto,
  BatchOperationDto,
  BatchOperationType,
  BatchOperationResult
} from './dto/batch-operation.dto';
import { CreateDeviceDto } from './dto/create-device.dto';
import pLimit from 'p-limit';

@Injectable()
export class BatchOperationsService {
  private readonly logger = new Logger(BatchOperationsService.name);

  constructor(
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>,
    private devicesService: DevicesService,
  ) {}

  /**
   * 批量创建设备
   */
  async batchCreate(dto: BatchCreateDeviceDto): Promise<BatchOperationResult> {
    const startTime = Date.now();
    this.logger.log(`Batch creating ${dto.count} devices with prefix "${dto.namePrefix}"`);

    const results: Record<string, { success: boolean; message?: string; data?: any }> = {};
    let successCount = 0;
    let failedCount = 0;

    // 限制并发数（避免系统过载）
    const limit = pLimit(10);

    const promises = [];

    for (let i = 0; i < dto.count; i++) {
      const deviceName = `${dto.namePrefix}-${i + 1}`;

      const createDto: CreateDeviceDto = {
        name: deviceName,
        description: `Batch created device #${i + 1}`,
        userId: dto.userId,
        tenantId: dto.tenantId,
        cpuCores: dto.cpuCores,
        memoryMB: dto.memoryMB,
        storageMB: dto.storageMB,
        resolution: dto.resolution,
        dpi: dto.dpi,
        androidVersion: dto.androidVersion,
        metadata: {
          groupName: dto.groupName,
          batchCreated: true,
          batchIndex: i + 1,
        },
      };

      promises.push(
        limit(async () => {
          try {
            const device = await this.devicesService.create(createDto);
            results[deviceName] = {
              success: true,
              data: { id: device.id, name: device.name },
            };
            successCount++;
            this.logger.debug(`Device ${deviceName} created successfully`);
          } catch (error) {
            results[deviceName] = {
              success: false,
              message: error.message,
            };
            failedCount++;
            this.logger.error(`Failed to create device ${deviceName}`, error.stack);
          }
        })
      );
    }

    await Promise.all(promises);

    const duration = Date.now() - startTime;
    this.logger.log(
      `Batch creation completed: ${successCount} success, ${failedCount} failed, ${duration}ms`
    );

    return {
      total: dto.count,
      success: successCount,
      failed: failedCount,
      results,
      duration,
    };
  }

  /**
   * 批量操作设备
   */
  async batchOperate(dto: BatchOperationDto): Promise<BatchOperationResult> {
    const startTime = Date.now();

    // 获取目标设备列表
    const devices = await this.getTargetDevices(dto);

    if (devices.length === 0) {
      throw new BadRequestException('No devices found matching the criteria');
    }

    this.logger.log(
      `Batch ${dto.operation} on ${devices.length} devices (max concurrency: ${dto.maxConcurrency || 10})`
    );

    const results: Record<string, { success: boolean; message?: string; data?: any }> = {};
    let successCount = 0;
    let failedCount = 0;

    // 并发控制
    const limit = pLimit(dto.maxConcurrency || 10);

    const promises = devices.map((device) =>
      limit(async () => {
        try {
          const result = await this.executeOperation(device, dto);
          results[device.id] = {
            success: true,
            data: result,
          };
          successCount++;
        } catch (error) {
          results[device.id] = {
            success: false,
            message: error.message,
          };
          failedCount++;
          this.logger.error(
            `Failed to ${dto.operation} device ${device.id}`,
            error.stack
          );
        }
      })
    );

    await Promise.all(promises);

    const duration = Date.now() - startTime;
    this.logger.log(
      `Batch operation completed: ${successCount} success, ${failedCount} failed, ${duration}ms`
    );

    return {
      total: devices.length,
      success: successCount,
      failed: failedCount,
      results,
      duration,
    };
  }

  /**
   * 获取目标设备列表
   */
  private async getTargetDevices(dto: BatchOperationDto): Promise<Device[]> {
    const where: any = {};

    // 按设备ID列表
    if (dto.deviceIds && dto.deviceIds.length > 0) {
      where.id = In(dto.deviceIds);
    }

    // 按分组
    if (dto.groupName) {
      where.metadata = {
        groupName: dto.groupName,
      };
    }

    // 按用户
    if (dto.userId) {
      where.userId = dto.userId;
    }

    // 如果没有指定任何条件，抛出错误
    if (Object.keys(where).length === 0 && !dto.deviceIds) {
      throw new BadRequestException(
        'Must specify deviceIds, groupName, or userId'
      );
    }

    return await this.devicesRepository.find({ where });
  }

  /**
   * 执行单个设备操作
   */
  private async executeOperation(
    device: Device,
    dto: BatchOperationDto
  ): Promise<any> {
    switch (dto.operation) {
      case BatchOperationType.START:
        return await this.devicesService.start(device.id);

      case BatchOperationType.STOP:
        return await this.devicesService.stop(device.id);

      case BatchOperationType.RESTART:
        return await this.devicesService.restart(device.id);

      case BatchOperationType.DELETE:
        return await this.devicesService.remove(device.id);

      case BatchOperationType.EXECUTE_COMMAND:
        if (!dto.command) {
          throw new BadRequestException('Command is required for EXECUTE_COMMAND operation');
        }
        return await this.devicesService.executeShellCommand(device.id, dto.command);

      case BatchOperationType.INSTALL_APP:
        if (!dto.apkPath) {
          throw new BadRequestException('apkPath is required for INSTALL_APP operation');
        }
        return await this.devicesService.installApk(device.id, dto.apkPath);

      case BatchOperationType.UNINSTALL_APP:
        if (!dto.packageName) {
          throw new BadRequestException('packageName is required for UNINSTALL_APP operation');
        }
        return await this.devicesService.uninstallApp(device.id, dto.packageName);

      default:
        throw new BadRequestException(`Unknown operation: ${dto.operation}`);
    }
  }

  /**
   * 获取分组统计
   */
  async getGroupStatistics(): Promise<Record<string, any>> {
    const devices = await this.devicesRepository.find();

    const stats: Record<string, any> = {};

    devices.forEach((device) => {
      const groupName = device.metadata?.groupName || 'ungrouped';

      if (!stats[groupName]) {
        stats[groupName] = {
          total: 0,
          running: 0,
          stopped: 0,
          error: 0,
          devices: [],
        };
      }

      stats[groupName].total++;
      stats[groupName].devices.push({
        id: device.id,
        name: device.name,
        status: device.status,
      });

      if (device.status === DeviceStatus.RUNNING) {
        stats[groupName].running++;
      } else if (device.status === DeviceStatus.STOPPED) {
        stats[groupName].stopped++;
      } else if (device.status === DeviceStatus.ERROR) {
        stats[groupName].error++;
      }
    });

    return stats;
  }

  /**
   * 按分组获取设备列表
   */
  async getDevicesByGroup(groupName: string): Promise<Device[]> {
    return await this.devicesRepository.find({
      where: {
        metadata: {
          groupName,
        },
      },
    });
  }

  /**
   * 更新设备分组
   */
  async updateDeviceGroup(deviceIds: string[], groupName: string): Promise<void> {
    this.logger.log(`Updating ${deviceIds.length} devices to group "${groupName}"`);

    await Promise.all(
      deviceIds.map(async (deviceId) => {
        const device = await this.devicesRepository.findOne({
          where: { id: deviceId },
        });

        if (device) {
          device.metadata = {
            ...device.metadata,
            groupName,
          };
          await this.devicesRepository.save(device);
        }
      })
    );
  }

  /**
   * 批量获取设备状态
   */
  async batchGetStatus(deviceIds: string[]): Promise<Record<string, DeviceStatus>> {
    const devices = await this.devicesRepository.find({
      where: { id: In(deviceIds) },
      select: ['id', 'status'],
    });

    const statusMap: Record<string, DeviceStatus> = {};
    devices.forEach((device) => {
      statusMap[device.id] = device.status;
    });

    return statusMap;
  }

  /**
   * 批量执行命令并收集结果
   */
  async batchExecuteAndCollect(
    deviceIds: string[],
    command: string,
    maxConcurrency: number = 10
  ): Promise<Record<string, string>> {
    const limit = pLimit(maxConcurrency);
    const results: Record<string, string> = {};

    const promises = deviceIds.map((deviceId) =>
      limit(async () => {
        try {
          const output = await this.devicesService.executeShellCommand(deviceId, command);
          results[deviceId] = output;
        } catch (error) {
          results[deviceId] = `ERROR: ${error.message}`;
        }
      })
    );

    await Promise.all(promises);

    return results;
  }
}
