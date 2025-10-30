import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { Device, DeviceStatus } from "../entities/device.entity";
import { DockerService } from "../docker/docker.service";
import { AdbService } from "../adb/adb.service";
import { PortManagerService } from "../port-manager/port-manager.service";
import { EventBusService } from "@cloudphone/shared";
import { MetricsService } from "../metrics/metrics.service";

export interface CleanupResult {
  totalScanned: number;
  totalCleaned: number;
  details: {
    idleDevices: number;
    errorDevices: number;
    expiredDevices: number;
    orphanedContainers: number;
  };
  errors: string[];
}

/**
 * 设备生命周期自动化服务
 *
 * 负责：
 * 1. 自动清理长时间未使用的设备
 * 2. 清理错误状态的设备
 * 3. 清理过期的设备
 * 4. 清理孤立的 Docker 容器
 */
@Injectable()
export class LifecycleService {
  private readonly logger = new Logger(LifecycleService.name);

  // 配置阈值
  private readonly IDLE_CLEANUP_HOURS: number;
  private readonly ERROR_CLEANUP_HOURS: number;
  private readonly STOPPED_CLEANUP_DAYS: number;

  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private dockerService: DockerService,
    private adbService: AdbService,
    private portManager: PortManagerService,
    private configService: ConfigService,
    private eventBus: EventBusService,
    private metricsService: MetricsService,
  ) {
    // 从环境变量读取配置
    this.IDLE_CLEANUP_HOURS = +this.configService.get(
      "DEVICE_IDLE_CLEANUP_HOURS",
      24,
    );
    this.ERROR_CLEANUP_HOURS = +this.configService.get(
      "DEVICE_ERROR_CLEANUP_HOURS",
      2,
    );
    this.STOPPED_CLEANUP_DAYS = +this.configService.get(
      "DEVICE_STOPPED_CLEANUP_DAYS",
      7,
    );
  }

  /**
   * 定时任务：自动清理（每小时执行一次）
   */
  @Cron(CronExpression.EVERY_HOUR)
  async performAutoCleanup(): Promise<CleanupResult> {
    this.logger.log("开始自动清理任务...");

    const result: CleanupResult = {
      totalScanned: 0,
      totalCleaned: 0,
      details: {
        idleDevices: 0,
        errorDevices: 0,
        expiredDevices: 0,
        orphanedContainers: 0,
      },
      errors: [],
    };

    try {
      // 1. 清理空闲设备
      const idleResult = await this.cleanupIdleDevices();
      result.details.idleDevices = idleResult.cleaned;
      result.errors.push(...idleResult.errors);

      // 2. 清理错误状态设备
      const errorResult = await this.cleanupErrorDevices();
      result.details.errorDevices = errorResult.cleaned;
      result.errors.push(...errorResult.errors);

      // 3. 清理长期停止的设备
      const stoppedResult = await this.cleanupStoppedDevices();
      result.details.expiredDevices = stoppedResult.cleaned;
      result.errors.push(...stoppedResult.errors);

      // 4. 清理孤立的容器
      const orphanedResult = await this.cleanupOrphanedContainers();
      result.details.orphanedContainers = orphanedResult.cleaned;
      result.errors.push(...orphanedResult.errors);

      result.totalCleaned =
        result.details.idleDevices +
        result.details.errorDevices +
        result.details.expiredDevices +
        result.details.orphanedContainers;

      this.logger.log(
        `自动清理完成 - 清理: ${result.totalCleaned} 项, 错误: ${result.errors.length} 项`,
      );

      // 记录清理指标
      this.metricsService.recordOperationDuration(
        "auto_cleanup",
        Date.now() / 1000,
      );
    } catch (error) {
      this.logger.error("自动清理任务失败", error.stack);
      result.errors.push(`全局错误: ${error.message}`);
    }

    return result;
  }

  /**
   * 清理长时间空闲的设备
   */
  async cleanupIdleDevices(): Promise<{ cleaned: number; errors: string[] }> {
    this.logger.log("检查空闲设备...");

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - this.IDLE_CLEANUP_HOURS);

    const idleDevices = await this.deviceRepository.find({
      where: {
        status: DeviceStatus.RUNNING,
        lastActiveAt: LessThan(cutoffTime),
      },
    });

    this.logger.log(
      `发现 ${idleDevices.length} 个空闲超过 ${this.IDLE_CLEANUP_HOURS} 小时的设备`,
    );

    let cleaned = 0;
    const errors: string[] = [];

    for (const device of idleDevices) {
      try {
        this.logger.log(`清理空闲设备: ${device.id} (${device.name})`);

        // 停止设备
        await this.stopDevice(device);

        // 可选：是否删除设备（根据配置决定）
        const autoDelete = this.configService.get<boolean>(
          "AUTO_DELETE_IDLE_DEVICES",
          false,
        );

        if (autoDelete) {
          await this.deleteDevice(device);
          this.logger.log(`已删除空闲设备: ${device.id}`);
        } else {
          this.logger.log(`已停止空闲设备: ${device.id}`);
        }

        // 发布设备清理事件
        await this.eventBus.publish("cloudphone.events", "device.cleaned", {
          eventId: `cleanup-idle-${device.id}-${Date.now()}`,
          eventType: "device.cleaned",
          timestamp: new Date().toISOString(),
          priority: "low",
          payload: {
            deviceId: device.id,
            userId: device.userId,
            reason: "idle_timeout",
            idleHours: this.IDLE_CLEANUP_HOURS,
            deleted: autoDelete,
          },
        });

        cleaned++;
      } catch (error) {
        this.logger.error(`清理空闲设备失败: ${device.id}`, error.stack);
        errors.push(`设备 ${device.id}: ${error.message}`);
        this.metricsService.recordOperationError(
          "cleanup_idle",
          "device_cleanup_failed",
        );
      }
    }

    return { cleaned, errors };
  }

  /**
   * 清理错误状态的设备
   */
  async cleanupErrorDevices(): Promise<{ cleaned: number; errors: string[] }> {
    this.logger.log("检查错误状态设备...");

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - this.ERROR_CLEANUP_HOURS);

    const errorDevices = await this.deviceRepository.find({
      where: {
        status: DeviceStatus.ERROR,
        updatedAt: LessThan(cutoffTime),
      },
    });

    this.logger.log(
      `发现 ${errorDevices.length} 个错误状态超过 ${this.ERROR_CLEANUP_HOURS} 小时的设备`,
    );

    let cleaned = 0;
    const errors: string[] = [];

    for (const device of errorDevices) {
      try {
        this.logger.log(`清理错误设备: ${device.id} (${device.name})`);

        // 尝试重启恢复
        const recovered = await this.attemptRecovery(device);

        if (!recovered) {
          // 恢复失败，删除设备
          await this.deleteDevice(device);
          this.logger.log(`已删除无法恢复的错误设备: ${device.id}`);

          // 发布设备清理事件
          await this.eventBus.publish("cloudphone.events", "device.cleaned", {
            eventId: `cleanup-error-${device.id}-${Date.now()}`,
            eventType: "device.cleaned",
            timestamp: new Date().toISOString(),
            priority: "medium",
            payload: {
              deviceId: device.id,
              userId: device.userId,
              reason: "unrecoverable_error",
              deleted: true,
            },
          });

          cleaned++;
        } else {
          this.logger.log(`错误设备已恢复: ${device.id}`);
        }
      } catch (error) {
        this.logger.error(`清理错误设备失败: ${device.id}`, error.stack);
        errors.push(`设备 ${device.id}: ${error.message}`);
        this.metricsService.recordOperationError(
          "cleanup_error",
          "device_cleanup_failed",
        );
      }
    }

    return { cleaned, errors };
  }

  /**
   * 清理长期停止的设备
   */
  async cleanupStoppedDevices(): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    this.logger.log("检查长期停止的设备...");

    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - this.STOPPED_CLEANUP_DAYS);

    const stoppedDevices = await this.deviceRepository.find({
      where: {
        status: DeviceStatus.STOPPED,
        updatedAt: LessThan(cutoffTime),
      },
    });

    this.logger.log(
      `发现 ${stoppedDevices.length} 个停止超过 ${this.STOPPED_CLEANUP_DAYS} 天的设备`,
    );

    let cleaned = 0;
    const errors: string[] = [];

    for (const device of stoppedDevices) {
      try {
        this.logger.log(`清理长期停止的设备: ${device.id} (${device.name})`);

        await this.deleteDevice(device);

        // 发布设备清理事件
        await this.eventBus.publish("cloudphone.events", "device.cleaned", {
          eventId: `cleanup-stopped-${device.id}-${Date.now()}`,
          eventType: "device.cleaned",
          timestamp: new Date().toISOString(),
          priority: "low",
          payload: {
            deviceId: device.id,
            userId: device.userId,
            reason: "long_term_stopped",
            stoppedDays: this.STOPPED_CLEANUP_DAYS,
            deleted: true,
          },
        });

        cleaned++;
      } catch (error) {
        this.logger.error(`清理停止设备失败: ${device.id}`, error.stack);
        errors.push(`设备 ${device.id}: ${error.message}`);
        this.metricsService.recordOperationError(
          "cleanup_stopped",
          "device_cleanup_failed",
        );
      }
    }

    return { cleaned, errors };
  }

  /**
   * 清理孤立的 Docker 容器
   */
  async cleanupOrphanedContainers(): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    this.logger.log("检查孤立的容器...");

    let cleaned = 0;
    const errors: string[] = [];

    try {
      // 获取所有 cloudphone 容器
      const allContainers = await this.dockerService.listContainers(true);
      const containers = allContainers.filter((c) =>
        c.Names.some((name) => name.includes("cloudphone-")),
      );

      this.logger.log(`发现 ${containers.length} 个 cloudphone 容器`);

      for (const container of containers) {
        const containerName = container.Names[0]?.replace(/^\//, "");
        const deviceId = containerName?.replace("cloudphone-", "");

        if (!deviceId) continue;

        // 检查设备是否存在于数据库
        const device = await this.deviceRepository.findOne({
          where: { id: deviceId },
        });

        if (!device) {
          // 孤立容器，删除它
          this.logger.warn(`发现孤立容器: ${containerName}`);

          try {
            await this.dockerService.removeContainer(container.Id);
            this.logger.log(`已删除孤立容器: ${containerName}`);
            cleaned++;
          } catch (error) {
            this.logger.error(`删除孤立容器失败: ${containerName}`, error);
            errors.push(`容器 ${containerName}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      this.logger.error("清理孤立容器失败", error.stack);
      errors.push(`全局错误: ${error.message}`);
    }

    return { cleaned, errors };
  }

  /**
   * 尝试恢复设备
   */
  private async attemptRecovery(device: Device): Promise<boolean> {
    try {
      this.logger.log(`尝试恢复设备: ${device.id}`);

      if (!device.containerId) {
        return false;
      }

      // 重启容器
      await this.dockerService.restartContainer(device.containerId);

      // 等待容器启动
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // 检查容器状态
      const info = await this.dockerService.getContainerInfo(
        device.containerId,
      );

      if (info.State.Running) {
        // 尝试 ADB 连接
        if (device.adbHost && device.adbPort) {
          try {
            await this.adbService.connectToDevice(
              device.id,
              device.adbHost,
              device.adbPort,
            );

            // 恢复成功，更新状态
            device.status = DeviceStatus.RUNNING;
            device.lastActiveAt = new Date();
            await this.deviceRepository.save(device);

            this.logger.log(`设备恢复成功: ${device.id}`);
            return true;
          } catch (adbError) {
            this.logger.warn(`ADB 连接失败: ${adbError.message}`);
            return false;
          }
        }
      }

      return false;
    } catch (error) {
      this.logger.error(`设备恢复失败: ${device.id}`, error.stack);
      return false;
    }
  }

  /**
   * 停止设备
   */
  private async stopDevice(device: Device): Promise<void> {
    // 断开 ADB
    try {
      await this.adbService.disconnectFromDevice(device.id);
    } catch (error) {
      this.logger.warn(`断开 ADB 失败: ${error.message}`);
    }

    // 停止容器
    if (device.containerId) {
      try {
        await this.dockerService.stopContainer(device.containerId);
      } catch (error) {
        this.logger.warn(`停止容器失败: ${error.message}`);
      }
    }

    // 更新状态
    device.status = DeviceStatus.STOPPED;
    await this.deviceRepository.save(device);
  }

  /**
   * 删除设备
   */
  private async deleteDevice(device: Device): Promise<void> {
    // 断开 ADB
    try {
      await this.adbService.disconnectFromDevice(device.id);
    } catch (error) {
      // 忽略错误
    }

    // 删除容器
    if (device.containerId) {
      try {
        await this.dockerService.removeContainer(device.containerId);
      } catch (error) {
        this.logger.warn(`删除容器失败: ${error.message}`);
      }
    }

    // 释放端口
    if (device.adbPort || device.metadata?.webrtcPort) {
      this.portManager.releasePorts({
        adbPort: device.adbPort || undefined,
        webrtcPort: device.metadata?.webrtcPort,
      });
    }

    // 标记为已删除
    device.status = DeviceStatus.DELETED;
    await this.deviceRepository.save(device);

    // 发布删除事件
    await this.eventBus.publishDeviceEvent("deleted", {
      deviceId: device.id,
      userId: device.userId,
      deviceName: device.name,
      tenantId: device.tenantId,
    });
  }

  /**
   * 手动触发清理（用于 API 调用）
   */
  async triggerManualCleanup(): Promise<CleanupResult> {
    this.logger.log("手动触发清理任务");
    return await this.performAutoCleanup();
  }

  /**
   * 获取清理统计
   */
  async getCleanupStatistics(): Promise<{
    idleCandidates: number;
    errorCandidates: number;
    stoppedCandidates: number;
    lastCleanupAt?: Date;
  }> {
    const cutoffIdle = new Date();
    cutoffIdle.setHours(cutoffIdle.getHours() - this.IDLE_CLEANUP_HOURS);

    const cutoffError = new Date();
    cutoffError.setHours(cutoffError.getHours() - this.ERROR_CLEANUP_HOURS);

    const cutoffStopped = new Date();
    cutoffStopped.setDate(cutoffStopped.getDate() - this.STOPPED_CLEANUP_DAYS);

    const [idleCandidates, errorCandidates, stoppedCandidates] =
      await Promise.all([
        this.deviceRepository.count({
          where: {
            status: DeviceStatus.RUNNING,
            lastActiveAt: LessThan(cutoffIdle),
          },
        }),
        this.deviceRepository.count({
          where: {
            status: DeviceStatus.ERROR,
            updatedAt: LessThan(cutoffError),
          },
        }),
        this.deviceRepository.count({
          where: {
            status: DeviceStatus.STOPPED,
            updatedAt: LessThan(cutoffStopped),
          },
        }),
      ]);

    return {
      idleCandidates,
      errorCandidates,
      stoppedCandidates,
    };
  }
}
