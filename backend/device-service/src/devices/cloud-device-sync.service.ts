import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Device, DeviceStatus, DeviceProviderType } from '../entities/device.entity';
import { AliyunEcpClient } from '../providers/aliyun/aliyun-ecp.client';
import { HuaweiCphClient } from '../providers/huawei/huawei-cph.client';
import { AliyunPhoneStatus } from '../providers/aliyun/aliyun.types';
import { HuaweiPhoneStatus } from '../providers/huawei/huawei.types';

/**
 * 云设备状态同步服务
 *
 * 负责：
 * 1. 定期从云厂商同步设备状态
 * 2. 更新本地数据库中的设备状态
 * 3. 检测状态不一致并修正
 *
 * 同步策略：
 * - 每 5 分钟同步一次
 * - 只同步运行中和已停止的设备
 * - 批量查询以提高效率
 */
@Injectable()
export class CloudDeviceSyncService {
  private readonly logger = new Logger(CloudDeviceSyncService.name);

  constructor(
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>,
    private aliyunClient: AliyunEcpClient,
    private huaweiClient: HuaweiCphClient
  ) {}

  /**
   * 云设备状态同步定时任务 - 每 5 分钟执行一次
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncCloudDevicesStatus() {
    try {
      this.logger.log('Starting cloud devices status synchronization');

      // 并发同步阿里云和华为云设备
      await Promise.allSettled([this.syncAliyunDevices(), this.syncHuaweiDevices()]);

      this.logger.log('Cloud devices status synchronization completed');
    } catch (error) {
      this.logger.error('Failed to sync cloud devices status', error.stack);
    }
  }

  /**
   * 同步阿里云设备状态
   */
  private async syncAliyunDevices(): Promise<void> {
    // 查找所有阿里云设备（运行中或已停止）
    const devices = await this.devicesRepository.find({
      where: {
        providerType: DeviceProviderType.ALIYUN_ECP,
        status: In([DeviceStatus.RUNNING, DeviceStatus.STOPPED]),
      },
    });

    if (devices.length === 0) {
      this.logger.debug('No Aliyun devices to sync');
      return;
    }

    this.logger.log(`Syncing ${devices.length} Aliyun devices`);

    // 逐个同步设备状态
    let syncedCount = 0;
    let errorCount = 0;

    for (const device of devices) {
      try {
        await this.syncAliyunDeviceStatus(device);
        syncedCount++;
      } catch (error) {
        errorCount++;
        this.logger.warn(`Failed to sync Aliyun device ${device.id}: ${error.message}`);
      }
    }

    this.logger.log(`Aliyun sync completed: ${syncedCount} synced, ${errorCount} errors`);
  }

  /**
   * 同步单个阿里云设备状态
   */
  private async syncAliyunDeviceStatus(device: Device): Promise<void> {
    if (!device.externalId) {
      return;
    }

    // 从阿里云获取设备详情
    const result = await this.aliyunClient.describeInstance(device.externalId);

    if (!result.success || !result.data) {
      this.logger.warn(`Failed to get Aliyun device ${device.externalId}: ${result.errorMessage}`);
      return;
    }

    const instance = result.data;
    const cloudStatus = this.mapAliyunStatus(instance.status);

    // 如果状态不一致，更新本地状态
    if (cloudStatus && device.status !== cloudStatus) {
      this.logger.log(`Updating device ${device.id} status: ${device.status} -> ${cloudStatus}`);

      device.status = cloudStatus;
      device.updatedAt = new Date();

      await this.devicesRepository.save(device);
    }
  }

  /**
   * 映射阿里云状态到设备状态
   */
  private mapAliyunStatus(aliyunStatus: AliyunPhoneStatus): DeviceStatus | null {
    switch (aliyunStatus) {
      case AliyunPhoneStatus.RUNNING:
        return DeviceStatus.RUNNING;
      case AliyunPhoneStatus.STOPPED:
        return DeviceStatus.STOPPED;
      case AliyunPhoneStatus.CREATING:
      case AliyunPhoneStatus.STARTING:
        return DeviceStatus.CREATING;
      case AliyunPhoneStatus.STOPPING:
        return DeviceStatus.STOPPED; // Device service doesn't have STOPPING status
      case AliyunPhoneStatus.EXCEPTION:
        return DeviceStatus.ERROR;
      case AliyunPhoneStatus.RELEASED:
      case AliyunPhoneStatus.DELETING:
        return DeviceStatus.DELETED;
      default:
        return null;
    }
  }

  /**
   * 同步华为云设备状态
   */
  private async syncHuaweiDevices(): Promise<void> {
    // 查找所有华为云设备（运行中或已停止）
    const devices = await this.devicesRepository.find({
      where: {
        providerType: DeviceProviderType.HUAWEI_CPH,
        status: In([DeviceStatus.RUNNING, DeviceStatus.STOPPED]),
      },
    });

    if (devices.length === 0) {
      this.logger.debug('No Huawei devices to sync');
      return;
    }

    this.logger.log(`Syncing ${devices.length} Huawei devices`);

    // 逐个同步设备状态
    let syncedCount = 0;
    let errorCount = 0;

    for (const device of devices) {
      try {
        await this.syncHuaweiDeviceStatus(device);
        syncedCount++;
      } catch (error) {
        errorCount++;
        this.logger.warn(`Failed to sync Huawei device ${device.id}: ${error.message}`);
      }
    }

    this.logger.log(`Huawei sync completed: ${syncedCount} synced, ${errorCount} errors`);
  }

  /**
   * 同步单个华为云设备状态
   */
  private async syncHuaweiDeviceStatus(device: Device): Promise<void> {
    if (!device.externalId) {
      return;
    }

    // 从华为云获取设备详情
    const result = await this.huaweiClient.getPhone(device.externalId);

    if (!result.success || !result.data) {
      this.logger.warn(`Failed to get Huawei device ${device.externalId}: ${result.errorMessage}`);
      return;
    }

    const phone = result.data;
    const cloudStatus = this.mapHuaweiStatus(phone.status);

    // 如果状态不一致，更新本地状态
    if (cloudStatus && device.status !== cloudStatus) {
      this.logger.log(`Updating device ${device.id} status: ${device.status} -> ${cloudStatus}`);

      device.status = cloudStatus;
      device.updatedAt = new Date();

      await this.devicesRepository.save(device);
    }
  }

  /**
   * 映射华为云状态到设备状态
   */
  private mapHuaweiStatus(huaweiStatus: HuaweiPhoneStatus): DeviceStatus | null {
    switch (huaweiStatus) {
      case HuaweiPhoneStatus.RUNNING:
        return DeviceStatus.RUNNING;
      case HuaweiPhoneStatus.STOPPED:
        return DeviceStatus.STOPPED;
      case HuaweiPhoneStatus.CREATING:
        return DeviceStatus.CREATING;
      case HuaweiPhoneStatus.STOPPING:
        return DeviceStatus.STOPPED; // Device service doesn't have STOPPING status
      case HuaweiPhoneStatus.REBOOTING:
        return DeviceStatus.CREATING; // Treat rebooting as creating
      case HuaweiPhoneStatus.ERROR:
        return DeviceStatus.ERROR;
      case HuaweiPhoneStatus.DELETED:
        return DeviceStatus.DELETED;
      default:
        return null;
    }
  }

  /**
   * 手动同步单个设备状态（由 API 触发）
   */
  async syncDeviceStatus(deviceId: string): Promise<void> {
    const device = await this.devicesRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    switch (device.providerType) {
      case DeviceProviderType.ALIYUN_ECP:
        await this.syncAliyunDeviceStatus(device);
        break;
      case DeviceProviderType.HUAWEI_CPH:
        await this.syncHuaweiDeviceStatus(device);
        break;
      default:
        throw new Error(`Status sync not supported for provider type: ${device.providerType}`);
    }
  }
}
