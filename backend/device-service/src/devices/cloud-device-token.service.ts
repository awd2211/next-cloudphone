import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Device, DeviceStatus, DeviceProviderType } from "../entities/device.entity";
import { DeviceProviderFactory } from "../providers/device-provider.factory";
import { AliyunEcpClient } from "../providers/aliyun/aliyun-ecp.client";
import { HuaweiCphClient } from "../providers/huawei/huawei-cph.client";

/**
 * 云设备 Token 自动刷新服务
 *
 * 负责：
 * 1. 阿里云 WebRTC Token 自动刷新（30秒有效期）
 * 2. 华为云 Token 自动刷新
 * 3. 更新设备的 connectionInfo
 *
 * 策略：
 * - 阿里云：每 20 秒检查一次，提前 10 秒刷新
 * - 华为云：每 5 分钟检查一次
 */
@Injectable()
export class CloudDeviceTokenService {
  private readonly logger = new Logger(CloudDeviceTokenService.name);

  constructor(
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>,
    private providerFactory: DeviceProviderFactory,
    private aliyunClient: AliyunEcpClient,
    private huaweiClient: HuaweiCphClient,
  ) {}

  /**
   * 阿里云 Token 刷新定时任务 - 每 10 秒执行一次
   *
   * 阿里云 WebRTC Token 有效期仅 30 秒，需要频繁刷新
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async refreshAliyunTokens() {
    try {
      // 查找所有运行中的阿里云设备
      const aliyunDevices = await this.devicesRepository.find({
        where: {
          providerType: DeviceProviderType.ALIYUN_ECP,
          status: DeviceStatus.RUNNING,
        },
      });

      if (aliyunDevices.length === 0) {
        return;
      }

      this.logger.debug(
        `Refreshing tokens for ${aliyunDevices.length} Aliyun devices`,
      );

      // 并发刷新所有设备的 Token
      await Promise.allSettled(
        aliyunDevices.map(device => this.refreshAliyunDeviceToken(device)),
      );
    } catch (error) {
      this.logger.error("Failed to refresh Aliyun tokens", error.stack);
    }
  }

  /**
   * 刷新单个阿里云设备的 Token
   */
  private async refreshAliyunDeviceToken(device: Device): Promise<void> {
    if (!device.externalId) {
      this.logger.warn(
        `Device ${device.id} has no externalId, skipping token refresh`,
      );
      return;
    }

    try {
      // 获取新的连接信息（包含新 Token）
      const result = await this.aliyunClient.getConnectionInfo(
        device.externalId,
      );

      if (!result.success || !result.data) {
        throw new Error(result.errorMessage || "Failed to get connection info");
      }

      const connectionInfo = result.data;

      // 更新设备的 connectionInfo
      device.connectionInfo = {
        ...device.connectionInfo,
        webrtc: {
          streamUrl: connectionInfo.streamUrl,
          token: connectionInfo.token,
          expireTime: connectionInfo.expireTime,
          stunServers: connectionInfo.stunServers,
          turnServers: connectionInfo.turnServers,
        },
      };

      await this.devicesRepository.save(device);

      this.logger.debug(
        `Refreshed token for Aliyun device ${device.id} (${device.name}), expires at ${connectionInfo.expireTime}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to refresh token for Aliyun device ${device.id}`,
        error.stack,
      );
    }
  }

  /**
   * 华为云 Token 刷新定时任务 - 每 5 分钟执行一次
   *
   * 华为云 Token 有效期通常较长，但仍需定期刷新
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshHuaweiTokens() {
    try {
      // 查找所有运行中的华为云设备
      const huaweiDevices = await this.devicesRepository.find({
        where: {
          providerType: DeviceProviderType.HUAWEI_CPH,
          status: DeviceStatus.RUNNING,
        },
      });

      if (huaweiDevices.length === 0) {
        return;
      }

      this.logger.debug(
        `Refreshing tokens for ${huaweiDevices.length} Huawei devices`,
      );

      // 并发刷新所有设备的 Token
      await Promise.allSettled(
        huaweiDevices.map(device => this.refreshHuaweiDeviceToken(device)),
      );
    } catch (error) {
      this.logger.error("Failed to refresh Huawei tokens", error.stack);
    }
  }

  /**
   * 刷新单个华为云设备的 Token
   */
  private async refreshHuaweiDeviceToken(device: Device): Promise<void> {
    if (!device.externalId) {
      this.logger.warn(
        `Device ${device.id} has no externalId, skipping token refresh`,
      );
      return;
    }

    try {
      // 获取新的连接信息（包含新 Token）
      const result = await this.huaweiClient.getConnectionInfo(
        device.externalId,
      );

      if (!result.success || !result.data) {
        throw new Error(result.errorMessage || "Failed to get connection info");
      }

      const connectionInfo = result.data;

      // 更新设备的 connectionInfo
      const updates: any = {
        ...device.connectionInfo,
      };

      // ADB 连接信息
      if (connectionInfo.adb) {
        updates.adb = {
          host: connectionInfo.adb.host,
          port: connectionInfo.adb.port,
          token: connectionInfo.adb.token,
        };
      }

      // WebRTC 连接信息
      if (connectionInfo.webrtc) {
        updates.webrtc = {
          sessionId: connectionInfo.webrtc.sessionId,
          ticket: connectionInfo.webrtc.ticket,
          signaling: connectionInfo.webrtc.signaling,
        };
      }

      device.connectionInfo = updates;

      await this.devicesRepository.save(device);

      this.logger.debug(
        `Refreshed token for Huawei device ${device.id} (${device.name})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to refresh token for Huawei device ${device.id}`,
        error.stack,
      );
    }
  }

  /**
   * 手动刷新设备 Token（由 API 触发）
   */
  async refreshDeviceToken(deviceId: string): Promise<void> {
    const device = await this.devicesRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    if (device.status !== DeviceStatus.RUNNING) {
      throw new Error(`Device ${deviceId} is not running`);
    }

    switch (device.providerType) {
      case DeviceProviderType.ALIYUN_ECP:
        await this.refreshAliyunDeviceToken(device);
        break;
      case DeviceProviderType.HUAWEI_CPH:
        await this.refreshHuaweiDeviceToken(device);
        break;
      default:
        throw new Error(
          `Token refresh not supported for provider type: ${device.providerType}`,
        );
    }
  }
}
