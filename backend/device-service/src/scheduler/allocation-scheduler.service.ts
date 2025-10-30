import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AllocationService } from "./allocation.service";
import { NotificationClientService } from "./notification-client.service";
import { DeviceAllocation, AllocationStatus } from "../entities/device-allocation.entity";
import { Device } from "../entities/device.entity";

@Injectable()
export class AllocationSchedulerService {
  private readonly logger = new Logger(AllocationSchedulerService.name);

  constructor(
    private readonly allocationService: AllocationService,
    private readonly notificationClient: NotificationClientService,
    @InjectRepository(DeviceAllocation)
    private allocationRepository: Repository<DeviceAllocation>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  /**
   * 每5分钟检查并释放过期的分配
   * 同时发送过期通知给用户
   */
  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: "release-expired-allocations",
  })
  async handleReleaseExpiredAllocations(): Promise<void> {
    this.logger.debug("Running cron: release expired allocations");

    try {
      // 1. 获取即将过期的分配（提前通知）
      await this.notifyExpiringSoon();

      // 2. 释放过期的分配并发送通知
      const now = new Date();
      const expiredAllocations = await this.allocationRepository
        .createQueryBuilder("allocation")
        .leftJoinAndSelect("allocation.device", "device")
        .where("allocation.status = :status", {
          status: AllocationStatus.ALLOCATED,
        })
        .andWhere("allocation.expiresAt < :now", { now })
        .getMany();

      if (expiredAllocations.length === 0) {
        this.logger.debug("No expired allocations found");
        return;
      }

      this.logger.log(`Found ${expiredAllocations.length} expired allocations, processing...`);

      let successCount = 0;
      let notificationCount = 0;

      for (const allocation of expiredAllocations) {
        try {
          // 释放分配（会触发 AllocationService 的逻辑）
          await this.allocationService.releaseExpiredAllocations();
          successCount++;

          // 发送过期通知（Phase 2: Notification Service 集成）
          const device = await this.deviceRepository.findOne({
            where: { id: allocation.deviceId },
          });

          if (device) {
            const durationSeconds = Math.floor(
              (now.getTime() - allocation.allocatedAt.getTime()) / 1000
            );

            try {
              await this.notificationClient.notifyAllocationExpired({
                userId: allocation.userId,
                deviceId: device.id,
                deviceName: device.name || `Device-${device.id.substring(0, 8)}`,
                allocationId: allocation.id,
                allocatedAt: allocation.allocatedAt.toISOString(),
                expiredAt: now.toISOString(),
                durationSeconds,
              });
              notificationCount++;
            } catch (notificationError) {
              this.logger.warn(
                `Failed to send expiry notification for allocation ${allocation.id}: ${notificationError.message}`
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to process expired allocation ${allocation.id}: ${error.message}`,
            error.stack
          );
        }
      }

      this.logger.log(
        `✅ Released ${successCount} expired allocations, sent ${notificationCount} notifications`
      );
    } catch (error) {
      this.logger.error(
        `Failed to release expired allocations: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 提前通知即将过期的分配（剩余10分钟时提醒）
   */
  private async notifyExpiringSoon(): Promise<void> {
    try {
      const now = new Date();
      const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);

      // 查找10分钟内即将过期的分配
      const expiringSoon = await this.allocationRepository
        .createQueryBuilder("allocation")
        .where("allocation.status = :status", {
          status: AllocationStatus.ALLOCATED,
        })
        .andWhere("allocation.expiresAt > :now", { now })
        .andWhere("allocation.expiresAt <= :tenMinutesLater", { tenMinutesLater })
        .getMany();

      if (expiringSoon.length === 0) {
        return;
      }

      this.logger.debug(`Found ${expiringSoon.length} allocations expiring soon`);

      for (const allocation of expiringSoon) {
        try {
          const device = await this.deviceRepository.findOne({
            where: { id: allocation.deviceId },
          });

          if (device) {
            const remainingMinutes = Math.ceil(
              (allocation.expiresAt.getTime() - now.getTime()) / (60 * 1000)
            );

            await this.notificationClient.notifyAllocationExpiringSoon({
              userId: allocation.userId,
              deviceId: device.id,
              deviceName: device.name || `Device-${device.id.substring(0, 8)}`,
              allocationId: allocation.id,
              allocatedAt: allocation.allocatedAt.toISOString(),
              expiredAt: allocation.expiresAt.toISOString(),
              durationSeconds: 0, // Not relevant for expiring soon
              remainingMinutes,
            });
          }
        } catch (error) {
          this.logger.warn(
            `Failed to send expiring soon notification for allocation ${allocation.id}: ${error.message}`
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify expiring soon: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * 每小时统计分配信息
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: "log-allocation-stats",
  })
  async handleLogAllocationStats(): Promise<void> {
    try {
      const stats = await this.allocationService.getAllocationStats();

      this.logger.log(
        `📊 Allocation Stats: Total=${stats.totalAllocations}, Active=${stats.activeAllocations}, ` +
          `Released=${stats.releasedAllocations}, Expired=${stats.expiredAllocations}, Strategy=${stats.strategy}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to log allocation stats: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 每天凌晨2点清理30天前的已释放/过期记录（可选）
   */
  @Cron("0 2 * * *", {
    name: "cleanup-old-allocations",
  })
  async handleCleanupOldAllocations(): Promise<void> {
    this.logger.log("Running cron: cleanup old allocations");

    try {
      const count =
        await this.allocationService.cleanupOldAllocations(30);

      if (count > 0) {
        this.logger.log(
          `🗑️  Cleaned up ${count} old allocation records (>30 days)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old allocations: ${error.message}`,
        error.stack,
      );
    }
  }
}
