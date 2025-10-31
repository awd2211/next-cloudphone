import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, LessThan, MoreThan, In } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  DeviceReservation,
  ReservationStatus,
} from "../entities/device-reservation.entity";
import {
  CreateReservationDto,
  UpdateReservationDto,
  CancelReservationDto,
  QueryReservationsDto,
  ReservationResponse,
  ReservationListResponse,
  ReservationConflictCheck,
  ReservationStatistics,
} from "./dto/reservation.dto";
import { AllocationService } from "./allocation.service";
import { EventBusService } from "@cloudphone/shared";
import { NotificationClientService, NotificationType } from "./notification-client.service";

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    @InjectRepository(DeviceReservation)
    private readonly reservationRepository: Repository<DeviceReservation>,
    private readonly allocationService: AllocationService,
    private readonly eventBus: EventBusService,
    private readonly notificationClient: NotificationClientService,
  ) {}

  /**
   * 创建设备预约
   */
  async createReservation(
    userId: string,
    tenantId: string | undefined,
    dto: CreateReservationDto,
  ): Promise<ReservationResponse> {
    this.logger.log(
      `Creating reservation for user ${userId} at ${dto.reservedStartTime}`,
    );

    // 1. 验证预约时间必须在未来
    const now = new Date();
    const startTime = new Date(dto.reservedStartTime);
    if (startTime <= now) {
      throw new BadRequestException(
        "Reservation start time must be in the future",
      );
    }

    // 2. 计算结束时间
    const endTime = new Date(
      startTime.getTime() + dto.durationMinutes * 60000,
    );

    // 3. 检查时间冲突
    const conflictCheck = await this.checkConflict(userId, startTime, endTime);
    if (conflictCheck.hasConflict) {
      throw new ConflictException(
        `Time slot conflicts with existing reservations: ${conflictCheck.conflictingReservations?.map((r) => r.id).join(", ")}`,
      );
    }

    // 4. 创建预约记录
    const reservation = this.reservationRepository.create({
      userId,
      tenantId,
      status: ReservationStatus.PENDING,
      reservedStartTime: startTime,
      reservedEndTime: endTime,
      durationMinutes: dto.durationMinutes,
      deviceType: dto.deviceType,
      minCpu: dto.minCpu,
      minMemory: dto.minMemory,
      remindBeforeMinutes: dto.remindBeforeMinutes ?? 15,
      reminderSent: false,
      metadata: {
        createdBy: userId,
        requestedAt: now.toISOString(),
      },
    });

    await this.reservationRepository.save(reservation);

    // 5. 发布事件
    await this.eventBus.publish(
      "cloudphone.events",
      "scheduler.reservation.created",
      {
        reservationId: reservation.id,
        userId: reservation.userId,
        reservedStartTime: reservation.reservedStartTime.toISOString(),
        reservedEndTime: reservation.reservedEndTime.toISOString(),
        durationMinutes: reservation.durationMinutes,
        deviceType: reservation.deviceType,
        timestamp: new Date().toISOString(),
      },
    );

    // 6. 发送通知
    await this.notificationClient.sendBatchNotifications([
      {
        userId: reservation.userId,
        type: NotificationType.RESERVATION_CREATED,
        title: "📅 设备预约成功",
        message: `您的设备预约已创建，预约时间：${startTime.toLocaleString("zh-CN")}，时长 ${dto.durationMinutes} 分钟`,
        channels: ["websocket", "email"],
        data: {
          reservationId: reservation.id,
          reservedStartTime: startTime.toISOString(),
        },
      },
    ]);

    this.logger.log(`Reservation created: ${reservation.id}`);
    return this.mapToResponse(reservation);
  }

  /**
   * 取消预约
   */
  async cancelReservation(
    reservationId: string,
    dto: CancelReservationDto,
  ): Promise<ReservationResponse> {
    this.logger.log(`Cancelling reservation ${reservationId}`);

    // 1. 查找预约
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }

    // 2. 检查状态是否允许取消
    if (
      ![ReservationStatus.PENDING, ReservationStatus.CONFIRMED].includes(
        reservation.status,
      )
    ) {
      throw new BadRequestException(
        `Cannot cancel reservation in status: ${reservation.status}`,
      );
    }

    // 3. 更新为已取消
    reservation.status = ReservationStatus.CANCELLED;
    reservation.cancelledAt = new Date();
    reservation.cancelReason = dto.reason || "User cancelled";

    await this.reservationRepository.save(reservation);

    // 4. 发布事件
    await this.eventBus.publish(
      "cloudphone.events",
      "scheduler.reservation.cancelled",
      {
        reservationId: reservation.id,
        userId: reservation.userId,
        cancelReason: reservation.cancelReason,
        timestamp: new Date().toISOString(),
      },
    );

    // 5. 发送通知
    await this.notificationClient.sendBatchNotifications([
      {
        userId: reservation.userId,
        type: NotificationType.RESERVATION_CANCELLED,
        title: "❌ 设备预约已取消",
        message: `您的设备预约已取消。原因：${reservation.cancelReason}`,
        channels: ["websocket"],
        data: {
          reservationId: reservation.id,
        },
      },
    ]);

    this.logger.log(`Reservation cancelled: ${reservationId}`);
    return this.mapToResponse(reservation);
  }

  /**
   * 更新预约
   */
  async updateReservation(
    reservationId: string,
    dto: UpdateReservationDto,
  ): Promise<ReservationResponse> {
    this.logger.log(`Updating reservation ${reservationId}`);

    // 1. 查找预约
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }

    // 2. 检查状态是否允许更新
    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        `Cannot update reservation in status: ${reservation.status}`,
      );
    }

    // 3. 更新字段
    if (dto.reservedStartTime) {
      const newStartTime = new Date(dto.reservedStartTime);
      if (newStartTime <= new Date()) {
        throw new BadRequestException(
          "Reservation start time must be in the future",
        );
      }

      // 检查新时间是否冲突
      const durationMinutes = dto.durationMinutes || reservation.durationMinutes;
      const newEndTime = new Date(
        newStartTime.getTime() + durationMinutes * 60000,
      );

      const conflictCheck = await this.checkConflict(
        reservation.userId,
        newStartTime,
        newEndTime,
        reservationId, // 排除当前预约
      );

      if (conflictCheck.hasConflict) {
        throw new ConflictException(
          `New time slot conflicts with existing reservations`,
        );
      }

      reservation.reservedStartTime = newStartTime;
      reservation.reservedEndTime = newEndTime;
    }

    if (dto.durationMinutes) {
      reservation.durationMinutes = dto.durationMinutes;
      reservation.reservedEndTime = new Date(
        reservation.reservedStartTime.getTime() + dto.durationMinutes * 60000,
      );
    }

    if (dto.remindBeforeMinutes !== undefined) {
      reservation.remindBeforeMinutes = dto.remindBeforeMinutes;
    }

    await this.reservationRepository.save(reservation);

    // 4. 发布事件
    await this.eventBus.publish(
      "cloudphone.events",
      "scheduler.reservation.updated",
      {
        reservationId: reservation.id,
        userId: reservation.userId,
        updatedFields: Object.keys(dto),
        timestamp: new Date().toISOString(),
      },
    );

    this.logger.log(`Reservation updated: ${reservationId}`);
    return this.mapToResponse(reservation);
  }

  /**
   * 获取单个预约
   */
  async getReservation(reservationId: string): Promise<ReservationResponse> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }

    return this.mapToResponse(reservation);
  }

  /**
   * 查询用户的预约列表
   */
  async getUserReservations(
    query: QueryReservationsDto,
  ): Promise<ReservationListResponse> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const whereConditions: any = {};

    if (query.userId) {
      whereConditions.userId = query.userId;
    }

    if (query.status) {
      whereConditions.status = query.status;
    }

    if (query.startTimeFrom || query.startTimeTo) {
      whereConditions.reservedStartTime = {};
      if (query.startTimeFrom) {
        whereConditions.reservedStartTime = MoreThan(query.startTimeFrom);
      }
      if (query.startTimeTo) {
        whereConditions.reservedStartTime = LessThan(query.startTimeTo);
      }
      if (query.startTimeFrom && query.startTimeTo) {
        whereConditions.reservedStartTime = Between(
          query.startTimeFrom,
          query.startTimeTo,
        );
      }
    }

    // 查询数据
    const [reservations, total] =
      await this.reservationRepository.findAndCount({
        where: whereConditions,
        order: { reservedStartTime: "DESC" },
        skip,
        take: pageSize,
      });

    return {
      reservations: reservations.map((r) => this.mapToResponse(r)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 检查时间冲突
   */
  async checkConflict(
    userId: string,
    startTime: Date,
    endTime: Date,
    excludeReservationId?: string,
  ): Promise<ReservationConflictCheck> {
    this.logger.debug(
      `Checking conflicts for user ${userId} between ${startTime.toISOString()} and ${endTime.toISOString()}`,
    );

    // 查找冲突的预约
    // 冲突条件：同一用户，状态为 PENDING/CONFIRMED/EXECUTING，且时间段重叠
    const queryBuilder = this.reservationRepository
      .createQueryBuilder("reservation")
      .where("reservation.userId = :userId", { userId })
      .andWhere("reservation.status IN (:...statuses)", {
        statuses: [
          ReservationStatus.PENDING,
          ReservationStatus.CONFIRMED,
          ReservationStatus.EXECUTING,
        ],
      })
      .andWhere(
        "(reservation.reservedStartTime < :endTime AND reservation.reservedEndTime > :startTime)",
        { startTime, endTime },
      );

    // 排除指定的预约（用于更新场景）
    if (excludeReservationId) {
      queryBuilder.andWhere("reservation.id != :excludeId", {
        excludeId: excludeReservationId,
      });
    }

    const conflictingReservations = await queryBuilder.getMany();

    const hasConflict = conflictingReservations.length > 0;

    return {
      hasConflict,
      conflictingReservations: hasConflict
        ? conflictingReservations.map((r) => this.mapToResponse(r))
        : undefined,
      message: hasConflict
        ? `Found ${conflictingReservations.length} conflicting reservation(s)`
        : "Time slot is available",
    };
  }

  /**
   * 执行单个预约（在预约时间到达时调用）
   */
  async executeReservation(reservationId: string): Promise<void> {
    this.logger.log(`Executing reservation ${reservationId}`);

    // 1. 查找预约
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      this.logger.warn(`Reservation ${reservationId} not found`);
      return;
    }

    // 2. 检查状态
    if (
      ![ReservationStatus.PENDING, ReservationStatus.CONFIRMED].includes(
        reservation.status,
      )
    ) {
      this.logger.warn(
        `Cannot execute reservation ${reservationId} in status: ${reservation.status}`,
      );
      return;
    }

    // 3. 更新状态为执行中
    reservation.status = ReservationStatus.EXECUTING;
    await this.reservationRepository.save(reservation);

    try {
      // 4. 调用分配服务分配设备
      const allocationResult = await this.allocationService.allocateDevice({
        userId: reservation.userId,
        tenantId: reservation.tenantId,
        durationMinutes: reservation.durationMinutes,
        devicePreferences: {
          deviceType: reservation.deviceType,
          minCpu: reservation.minCpu,
          minMemory: reservation.minMemory,
        },
      });

      // 5. 更新预约为已完成
      reservation.status = ReservationStatus.COMPLETED;
      reservation.allocatedDeviceId = allocationResult.deviceId;
      reservation.allocationId = allocationResult.allocationId;
      reservation.executedAt = new Date();

      await this.reservationRepository.save(reservation);

      // 6. 发布成功事件
      await this.eventBus.publish(
        "cloudphone.events",
        "scheduler.reservation.executed",
        {
          reservationId: reservation.id,
          userId: reservation.userId,
          deviceId: allocationResult.deviceId,
          allocationId: allocationResult.allocationId,
          timestamp: new Date().toISOString(),
        },
      );

      // 7. 发送成功通知
      await this.notificationClient.sendBatchNotifications([
        {
          userId: reservation.userId,
          type: NotificationType.RESERVATION_EXECUTED,
          title: "✅ 预约设备已分配",
          message: `您预约的设备 ${allocationResult.deviceName} 已成功分配，可以开始使用了！`,
          channels: ["websocket", "email"],
          data: {
            reservationId: reservation.id,
            deviceId: allocationResult.deviceId,
            deviceName: allocationResult.deviceName,
          },
        },
      ]);

      this.logger.log(
        `Reservation ${reservationId} executed successfully, device allocated: ${allocationResult.deviceId}`,
      );
    } catch (error) {
      // 8. 分配失败，更新预约为失败状态
      reservation.status = ReservationStatus.FAILED;
      reservation.failedAt = new Date();
      reservation.failureReason =
        error.message || "Failed to allocate device";

      await this.reservationRepository.save(reservation);

      // 9. 发布失败事件
      await this.eventBus.publish(
        "cloudphone.events",
        "scheduler.reservation.failed",
        {
          reservationId: reservation.id,
          userId: reservation.userId,
          failureReason: reservation.failureReason,
          timestamp: new Date().toISOString(),
        },
      );

      // 10. 发送失败通知
      await this.notificationClient.sendBatchNotifications([
        {
          userId: reservation.userId,
          type: NotificationType.RESERVATION_FAILED,
          title: "❌ 预约设备分配失败",
          message: `很抱歉，您预约的设备分配失败。原因：${reservation.failureReason}`,
          channels: ["websocket", "email"],
          data: {
            reservationId: reservation.id,
            failureReason: reservation.failureReason,
          },
        },
      ]);

      this.logger.error(
        `Failed to execute reservation ${reservationId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Cron: 每分钟检查并执行到期的预约
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async executePendingReservations(): Promise<void> {
    const now = new Date();
    this.logger.debug(`Checking for reservations to execute at ${now.toISOString()}`);

    try {
      // 查找需要执行的预约
      // 条件：状态为 PENDING/CONFIRMED，且预约开始时间已到（允许提前1分钟）
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      const reservations = await this.reservationRepository.find({
        where: {
          status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
          reservedStartTime: Between(oneMinuteAgo, now),
        },
        order: { reservedStartTime: "ASC" },
      });

      if (reservations.length > 0) {
        this.logger.log(
          `Found ${reservations.length} reservation(s) to execute`,
        );

        for (const reservation of reservations) {
          try {
            await this.executeReservation(reservation.id);
          } catch (error) {
            this.logger.error(
              `Error executing reservation ${reservation.id}: ${error.message}`,
              error.stack,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in executePendingReservations cron job: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Cron: 每5分钟检查并标记过期的预约
   */
  @Cron("*/5 * * * *")
  async markExpiredReservations(): Promise<void> {
    const now = new Date();
    this.logger.debug(`Checking for expired reservations at ${now.toISOString()}`);

    try {
      // 查找已过期的预约
      // 条件：状态为 PENDING/CONFIRMED，且预约开始时间已过去超过5分钟
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
      const expiredReservations = await this.reservationRepository.find({
        where: {
          status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
          reservedStartTime: LessThan(fiveMinutesAgo),
        },
      });

      if (expiredReservations.length > 0) {
        this.logger.log(
          `Found ${expiredReservations.length} expired reservation(s)`,
        );

        for (const reservation of expiredReservations) {
          reservation.status = ReservationStatus.EXPIRED;
          reservation.failureReason = "Reservation time has passed";
          await this.reservationRepository.save(reservation);

          // 发送过期通知
          await this.notificationClient.sendBatchNotifications([
            {
              userId: reservation.userId,
              type: NotificationType.RESERVATION_EXPIRED,
              title: "⏰ 设备预约已过期",
              message: "您的设备预约时间已过，预约已自动过期",
              channels: ["websocket"],
              data: {
                reservationId: reservation.id,
              },
            },
          ]);
        }

        this.logger.log(
          `Marked ${expiredReservations.length} reservations as expired`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error in markExpiredReservations cron job: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Cron: 每分钟检查并发送提醒
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendReminders(): Promise<void> {
    const now = new Date();
    this.logger.debug(`Checking for reminders to send at ${now.toISOString()}`);

    try {
      // 查找需要发送提醒的预约
      // 条件：状态为 PENDING/CONFIRMED，reminder_sent = false，且距离开始时间在提醒时间范围内
      const reservations = await this.reservationRepository
        .createQueryBuilder("reservation")
        .where("reservation.status IN (:...statuses)", {
          statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
        })
        .andWhere("reservation.reminderSent = false")
        .andWhere("reservation.remindBeforeMinutes > 0")
        .getMany();

      const reservationsToRemind = reservations.filter((r) => {
        const reminderTime = new Date(
          r.reservedStartTime.getTime() - r.remindBeforeMinutes * 60000,
        );
        return reminderTime <= now && r.reservedStartTime > now;
      });

      if (reservationsToRemind.length > 0) {
        this.logger.log(
          `Sending reminders for ${reservationsToRemind.length} reservation(s)`,
        );

        for (const reservation of reservationsToRemind) {
          try {
            const minutesUntilStart = Math.round(
              (reservation.reservedStartTime.getTime() - now.getTime()) / 60000,
            );

            // 发送提醒通知
            await this.notificationClient.sendBatchNotifications([
              {
                userId: reservation.userId,
                type: NotificationType.RESERVATION_REMINDER,
                title: "⏰ 设备预约提醒",
                message: `您预约的设备将在 ${minutesUntilStart} 分钟后开始使用，请做好准备`,
                channels: ["websocket", "email"],
                data: {
                  reservationId: reservation.id,
                  reservedStartTime: reservation.reservedStartTime.toISOString(),
                  minutesUntilStart,
                },
              },
            ]);

            // 标记提醒已发送
            reservation.reminderSent = true;
            await this.reservationRepository.save(reservation);

            this.logger.log(`Reminder sent for reservation ${reservation.id}`);
          } catch (error) {
            this.logger.error(
              `Error sending reminder for reservation ${reservation.id}: ${error.message}`,
              error.stack,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in sendReminders cron job: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 获取预约统计信息
   */
  async getReservationStatistics(
    userId?: string,
  ): Promise<ReservationStatistics> {
    const whereConditions: any = {};
    if (userId) {
      whereConditions.userId = userId;
    }

    const [
      totalReservations,
      pendingCount,
      completedCount,
      cancelledCount,
      failedCount,
    ] = await Promise.all([
      this.reservationRepository.count({ where: whereConditions }),
      this.reservationRepository.count({
        where: { ...whereConditions, status: ReservationStatus.PENDING },
      }),
      this.reservationRepository.count({
        where: { ...whereConditions, status: ReservationStatus.COMPLETED },
      }),
      this.reservationRepository.count({
        where: { ...whereConditions, status: ReservationStatus.CANCELLED },
      }),
      this.reservationRepository.count({
        where: { ...whereConditions, status: ReservationStatus.FAILED },
      }),
    ]);

    // 计算成功率
    const successfulCount = completedCount;
    const attemptedCount = totalReservations - cancelledCount; // 不包含用户主动取消的
    const successRate =
      attemptedCount > 0 ? successfulCount / attemptedCount : 0;

    // 计算平均提前预约时间
    const reservations = await this.reservationRepository.find({
      where: whereConditions,
      select: ["createdAt", "reservedStartTime"],
    });

    let averageAdvanceBookingHours = 0;
    if (reservations.length > 0) {
      const totalAdvanceHours = reservations.reduce((sum, r) => {
        const advanceMs =
          r.reservedStartTime.getTime() - r.createdAt.getTime();
        return sum + advanceMs / (1000 * 60 * 60);
      }, 0);
      averageAdvanceBookingHours = totalAdvanceHours / reservations.length;
    }

    return {
      totalReservations,
      pendingCount,
      completedCount,
      cancelledCount,
      failedCount,
      successRate: Math.round(successRate * 100) / 100,
      averageAdvanceBookingHours:
        Math.round(averageAdvanceBookingHours * 100) / 100,
    };
  }

  /**
   * 映射实体到响应 DTO
   */
  private mapToResponse(reservation: DeviceReservation): ReservationResponse {
    return {
      id: reservation.id,
      userId: reservation.userId,
      status: reservation.status,
      reservedStartTime: reservation.reservedStartTime.toISOString(),
      reservedEndTime: reservation.reservedEndTime.toISOString(),
      durationMinutes: reservation.durationMinutes,
      deviceType: reservation.deviceType,
      allocatedDeviceId: reservation.allocatedDeviceId,
      allocationId: reservation.allocationId,
      remindBeforeMinutes: reservation.remindBeforeMinutes,
      reminderSent: reservation.reminderSent,
      createdAt: reservation.createdAt.toISOString(),
      executedAt: reservation.executedAt?.toISOString(),
      cancelledAt: reservation.cancelledAt?.toISOString(),
      cancelReason: reservation.cancelReason,
      failureReason: reservation.failureReason,
    };
  }
}
