import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AllocationQueue, QueueStatus, UserPriority } from '../entities/allocation-queue.entity';
import {
  JoinQueueDto,
  CancelQueueDto,
  QueryQueueDto,
  QueueEntryResponse,
  QueueListResponse,
  QueueStatistics,
  QueuePositionResponse,
  ProcessQueueBatchDto,
  ProcessQueueBatchResult,
} from './dto/queue.dto';
import { AllocationService } from './allocation.service';
import { EventBusService, DistributedLockService } from '@cloudphone/shared';
import { NotificationClientService, NotificationType } from './notification-client.service';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  // 平均设备使用时长（分钟），用于预估等待时间
  private readonly AVERAGE_DEVICE_USAGE_MINUTES = 30;

  constructor(
    @InjectRepository(AllocationQueue)
    private readonly queueRepository: Repository<AllocationQueue>,
    private readonly allocationService: AllocationService,
    private readonly eventBus: EventBusService,
    private readonly notificationClient: NotificationClientService,
    private readonly lockService: DistributedLockService, // ✅ K8s cluster safety
  ) {}

  /**
   * 加入队列
   */
  async joinQueue(
    userId: string,
    tenantId: string | undefined,
    userTier: string,
    dto: JoinQueueDto
  ): Promise<QueueEntryResponse> {
    this.logger.log(`User ${userId} (${userTier}) joining queue`);

    // 1. 检查用户是否已经在队列中
    const existingEntry = await this.queueRepository.findOne({
      where: {
        userId,
        status: In([QueueStatus.WAITING, QueueStatus.PROCESSING]),
      },
    });

    if (existingEntry) {
      throw new ConflictException(`User already has an active queue entry: ${existingEntry.id}`);
    }

    // 2. 确定优先级
    const priority = this.getUserPriority(userTier);

    // 3. 创建队列条目
    const queueEntry = this.queueRepository.create({
      userId,
      tenantId,
      status: QueueStatus.WAITING,
      priority,
      userTier,
      deviceType: dto.deviceType,
      minCpu: dto.minCpu,
      minMemory: dto.minMemory,
      durationMinutes: dto.durationMinutes,
      maxWaitMinutes: dto.maxWaitMinutes ?? 30,
      queuePosition: 0, // Will be calculated
      estimatedWaitMinutes: 0, // Will be calculated
      retryCount: 0,
      metadata: {
        joinedAt: new Date().toISOString(),
        source: 'user_request',
      },
    });

    await this.queueRepository.save(queueEntry);

    // 4. 计算排队位置和预估等待时间
    await this.updateQueuePosition(queueEntry.id);

    // 5. 发布事件
    await this.eventBus.publish('cloudphone.events', 'scheduler.queue.joined', {
      queueId: queueEntry.id,
      userId: queueEntry.userId,
      priority: queueEntry.priority,
      userTier: queueEntry.userTier,
      timestamp: new Date().toISOString(),
    });

    // 6. 发送通知
    const updatedEntry = await this.queueRepository.findOne({
      where: { id: queueEntry.id },
    });

    if (!updatedEntry) {
      throw new NotFoundException(`Queue entry not found: ${queueEntry.id}`);
    }

    await this.notificationClient.sendBatchNotifications([
      {
        userId: queueEntry.userId,
        type: NotificationType.QUEUE_JOINED,
        title: '🔄 已加入设备分配队列',
        message: `您当前排在第 ${updatedEntry.queuePosition} 位，预计等待 ${updatedEntry.estimatedWaitMinutes} 分钟`,
        channels: ['websocket'],
        data: {
          queueId: queueEntry.id,
          position: updatedEntry.queuePosition,
          estimatedWaitMinutes: updatedEntry.estimatedWaitMinutes,
        },
      },
    ]);

    this.logger.log(`User ${userId} joined queue at position ${updatedEntry.queuePosition}`);

    return this.mapToResponse(updatedEntry);
  }

  /**
   * 取消队列条目
   */
  async cancelQueue(queueId: string, dto: CancelQueueDto): Promise<QueueEntryResponse> {
    this.logger.log(`Cancelling queue entry ${queueId}`);

    // 1. 查找队列条目
    const queueEntry = await this.queueRepository.findOne({
      where: { id: queueId },
    });

    if (!queueEntry) {
      throw new NotFoundException(`Queue entry ${queueId} not found`);
    }

    // 2. 检查状态
    if (![QueueStatus.WAITING, QueueStatus.PROCESSING].includes(queueEntry.status)) {
      throw new BadRequestException(`Cannot cancel queue entry in status: ${queueEntry.status}`);
    }

    // 3. 更新为已取消
    queueEntry.status = QueueStatus.CANCELLED;
    queueEntry.cancelledAt = new Date();
    queueEntry.cancelReason = dto.reason || 'User cancelled';

    await this.queueRepository.save(queueEntry);

    // 4. 重新计算其他条目的位置
    await this.recalculateAllPositions();

    // 5. 发布事件
    await this.eventBus.publish('cloudphone.events', 'scheduler.queue.cancelled', {
      queueId: queueEntry.id,
      userId: queueEntry.userId,
      cancelReason: queueEntry.cancelReason,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Queue entry ${queueId} cancelled`);

    return this.mapToResponse(queueEntry);
  }

  /**
   * 获取单个队列条目
   */
  async getQueueEntry(queueId: string): Promise<QueueEntryResponse> {
    const queueEntry = await this.queueRepository.findOne({
      where: { id: queueId },
    });

    if (!queueEntry) {
      throw new NotFoundException(`Queue entry ${queueId} not found`);
    }

    return this.mapToResponse(queueEntry);
  }

  /**
   * 查询队列列表
   */
  async getQueueList(query: QueryQueueDto): Promise<QueueListResponse> {
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

    if (query.deviceType) {
      whereConditions.deviceType = query.deviceType;
    }

    // 查询数据
    const [entries, total] = await this.queueRepository.findAndCount({
      where: whereConditions,
      order: {
        priority: 'DESC',
        createdAt: 'ASC',
      },
      skip,
      take: pageSize,
    });

    return {
      entries: entries.map((e) => this.mapToResponse(e)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取用户的队列位置信息
   */
  async getQueuePosition(queueId: string): Promise<QueuePositionResponse> {
    const queueEntry = await this.queueRepository.findOne({
      where: { id: queueId },
    });

    if (!queueEntry) {
      throw new NotFoundException(`Queue entry ${queueId} not found`);
    }

    if (queueEntry.status !== QueueStatus.WAITING) {
      throw new BadRequestException(`Queue entry is not in waiting status: ${queueEntry.status}`);
    }

    // 计算前面等待的人数
    const aheadCount = await this.queueRepository.count({
      where: {
        status: QueueStatus.WAITING,
      },
      order: {
        priority: 'DESC',
        createdAt: 'ASC',
      },
    });

    // 计算已等待时间
    const waitedMinutes = Math.round((Date.now() - queueEntry.createdAt.getTime()) / 60000);

    // 计算剩余最大等待时间
    const remainingMaxWaitMinutes = Math.max(0, queueEntry.maxWaitMinutes - waitedMinutes);

    return {
      queueId: queueEntry.id,
      position: queueEntry.queuePosition || 0,
      aheadCount: Math.max(0, aheadCount - 1),
      estimatedWaitMinutes: queueEntry.estimatedWaitMinutes || 0,
      waitedMinutes,
      remainingMaxWaitMinutes,
    };
  }

  /**
   * 处理队列中的下一个条目
   */
  async processNextQueueEntry(): Promise<boolean> {
    this.logger.debug('Processing next queue entry...');

    // 1. 按优先级和时间顺序获取下一个等待的条目
    const queueEntry = await this.queueRepository.findOne({
      where: { status: QueueStatus.WAITING },
      order: {
        priority: 'DESC', // 优先级高的先处理
        createdAt: 'ASC', // 同优先级按先来后到
      },
    });

    if (!queueEntry) {
      this.logger.debug('No queue entries to process');
      return false;
    }

    this.logger.log(`Processing queue entry ${queueEntry.id} for user ${queueEntry.userId}`);

    // 2. 更新状态为处理中
    queueEntry.status = QueueStatus.PROCESSING;
    queueEntry.processedAt = new Date();
    await this.queueRepository.save(queueEntry);

    try {
      // 3. 尝试分配设备
      const allocationResult = await this.allocationService.allocateDevice({
        userId: queueEntry.userId,
        tenantId: queueEntry.tenantId,
        durationMinutes: queueEntry.durationMinutes,
        devicePreferences: {
          deviceType: queueEntry.deviceType,
          minCpu: queueEntry.minCpu,
          minMemory: queueEntry.minMemory,
        },
      });

      // 4. 分配成功，更新为已满足
      queueEntry.status = QueueStatus.FULFILLED;
      queueEntry.fulfilledAt = new Date();
      queueEntry.allocatedDeviceId = allocationResult.deviceId;
      queueEntry.allocationId = allocationResult.allocationId;

      await this.queueRepository.save(queueEntry);

      // 5. 发布成功事件
      await this.eventBus.publish('cloudphone.events', 'scheduler.queue.fulfilled', {
        queueId: queueEntry.id,
        userId: queueEntry.userId,
        deviceId: allocationResult.deviceId,
        allocationId: allocationResult.allocationId,
        waitedMinutes: Math.round(
          (queueEntry.fulfilledAt.getTime() - queueEntry.createdAt.getTime()) / 60000
        ),
        timestamp: new Date().toISOString(),
      });

      // 6. 发送成功通知
      await this.notificationClient.sendBatchNotifications([
        {
          userId: queueEntry.userId,
          type: NotificationType.QUEUE_FULFILLED,
          title: '✅ 设备已分配',
          message: `排队成功！设备 ${allocationResult.deviceName} 已为您准备好`,
          channels: ['websocket', 'email'],
          data: {
            queueId: queueEntry.id,
            deviceId: allocationResult.deviceId,
            deviceName: allocationResult.deviceName,
          },
        },
      ]);

      // 7. 重新计算其他条目的位置
      await this.recalculateAllPositions();

      this.logger.log(
        `Queue entry ${queueEntry.id} fulfilled with device ${allocationResult.deviceId}`
      );

      return true;
    } catch (error) {
      // 8. 分配失败，增加重试次数
      queueEntry.retryCount += 1;
      queueEntry.lastRetryAt = new Date();

      // 检查是否超过最大重试次数（3次）
      if (queueEntry.retryCount >= 3) {
        // 标记为过期
        queueEntry.status = QueueStatus.EXPIRED;
        queueEntry.expiredAt = new Date();
        queueEntry.expiryReason = `Failed after ${queueEntry.retryCount} attempts: ${error.message}`;

        await this.queueRepository.save(queueEntry);

        // 发送失败通知
        await this.notificationClient.sendBatchNotifications([
          {
            userId: queueEntry.userId,
            type: NotificationType.QUEUE_EXPIRED,
            title: '❌ 设备分配失败',
            message: `很抱歉，多次尝试后仍无法为您分配设备。请稍后重试。`,
            channels: ['websocket', 'email'],
            data: {
              queueId: queueEntry.id,
              reason: queueEntry.expiryReason,
            },
          },
        ]);

        this.logger.warn(
          `Queue entry ${queueEntry.id} expired after ${queueEntry.retryCount} attempts`
        );
      } else {
        // 重新放回等待队列
        queueEntry.status = QueueStatus.WAITING;
        await this.queueRepository.save(queueEntry);

        this.logger.warn(
          `Queue entry ${queueEntry.id} failed (attempt ${queueEntry.retryCount}), will retry: ${error.message}`
        );
      }

      return false;
    }
  }

  /**
   * 批量处理队列条目
   */
  async processQueueBatch(dto: ProcessQueueBatchDto): Promise<ProcessQueueBatchResult> {
    const startTime = Date.now();
    const maxCount = dto.maxCount || 10;
    const continueOnError = dto.continueOnError ?? true;

    this.logger.log(`Processing up to ${maxCount} queue entries...`);

    const successes: Array<{
      queueId: string;
      userId: string;
      deviceId: string;
      allocationId: string;
    }> = [];

    const failures: Array<{
      queueId: string;
      userId: string;
      reason: string;
    }> = [];

    let processedCount = 0;

    for (let i = 0; i < maxCount; i++) {
      try {
        const success = await this.processNextQueueEntry();

        if (!success) {
          // 没有更多条目或处理失败
          if (failures.length === 0) {
            // 如果没有失败记录，说明队列为空
            break;
          }
        } else {
          // 记录成功（从数据库获取详情）
          const queueEntry = await this.queueRepository.findOne({
            where: { status: QueueStatus.FULFILLED },
            order: { fulfilledAt: 'DESC' },
          });

          if (queueEntry) {
            successes.push({
              queueId: queueEntry.id,
              userId: queueEntry.userId,
              deviceId: queueEntry.allocatedDeviceId,
              allocationId: queueEntry.allocationId,
            });
          }
        }

        processedCount++;
      } catch (error) {
        failures.push({
          queueId: 'unknown',
          userId: 'unknown',
          reason: error.message,
        });

        if (!continueOnError) {
          break;
        }
      }
    }

    const executionTimeMs = Date.now() - startTime;

    this.logger.log(
      `Batch processing complete: ${successes.length} succeeded, ${failures.length} failed in ${executionTimeMs}ms`
    );

    return {
      totalProcessed: processedCount,
      successCount: successes.length,
      failedCount: failures.length,
      successes,
      failures,
      executionTimeMs,
    };
  }

  /**
   * Cron: 每分钟自动处理队列
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async autoProcessQueue(): Promise<void> {
    this.logger.debug('Auto-processing queue...');

    try {
      // 检查是否有等待的条目
      const waitingCount = await this.queueRepository.count({
        where: { status: QueueStatus.WAITING },
      });

      if (waitingCount === 0) {
        this.logger.debug('No waiting queue entries');
        return;
      }

      // 检查是否有可用设备
      const availableDevices = await this.allocationService.getAvailableDevices();

      if (availableDevices.length === 0) {
        this.logger.debug('No available devices for queue processing');
        return;
      }

      // 处理队列，最多处理可用设备数量
      const maxProcess = Math.min(availableDevices.length, 10);

      await this.processQueueBatch({
        maxCount: maxProcess,
        continueOnError: true,
      });
    } catch (error) {
      this.logger.error(`Error in autoProcessQueue: ${error.message}`, error.stack);
    }
  }

  /**
   * Cron: 每5分钟标记过期的队列条目
   */
  @Cron('*/5 * * * *')
  async markExpiredQueueEntries(): Promise<void> {
    this.logger.debug('Checking for expired queue entries...');

    try {
      // 查找等待中且已超过最大等待时间的条目
      const now = new Date();

      const expiredEntries = await this.queueRepository
        .createQueryBuilder('queue')
        .where('queue.status = :status', { status: QueueStatus.WAITING })
        .andWhere('EXTRACT(EPOCH FROM (NOW() - queue.created_at)) / 60 > queue.max_wait_minutes')
        .getMany();

      if (expiredEntries.length > 0) {
        this.logger.log(`Found ${expiredEntries.length} expired queue entries`);

        // ✅ 批量更新所有过期条目（优化：避免逐条保存的长事务）
        for (const entry of expiredEntries) {
          entry.status = QueueStatus.EXPIRED;
          entry.expiredAt = now;
          entry.expiryReason = 'Maximum wait time exceeded';
        }

        // 批量保存，减少数据库往返
        await this.queueRepository.save(expiredEntries);

        // 重新计算剩余条目的位置
        await this.recalculateAllPositions();

        this.logger.log(`Marked ${expiredEntries.length} queue entries as expired`);

        // ✅ 异步发送通知（不阻塞数据库事务）
        // 使用 setImmediate 确保通知在事务提交后发送
        setImmediate(async () => {
          try {
            const notifications = expiredEntries.map((entry) => ({
              userId: entry.userId,
              type: NotificationType.QUEUE_EXPIRED,
              title: '⏰ 队列等待超时',
              message: '很抱歉，等待时间已超过限制，请重新加入队列',
              channels: ['websocket'] as const,
              data: {
                queueId: entry.id,
              },
            }));

            // 批量发送通知
            await this.notificationClient.sendBatchNotifications(notifications);
            this.logger.debug(`Sent ${notifications.length} expiration notifications`);
          } catch (notifyError) {
            // 通知失败不影响主流程
            this.logger.warn(`Failed to send expiration notifications: ${notifyError.message}`);
          }
        });
      }
    } catch (error) {
      this.logger.error(`Error in markExpiredQueueEntries: ${error.message}`, error.stack);
    }
  }

  /**
   * Cron: 每分钟更新队列位置和预估时间
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async updateAllQueuePositions(): Promise<void> {
    this.logger.debug('Updating queue positions...');

    try {
      await this.recalculateAllPositions();
    } catch (error) {
      this.logger.error(`Error in updateAllQueuePositions: ${error.message}`, error.stack);
    }
  }

  /**
   * 获取队列统计信息
   */
  async getQueueStatistics(): Promise<QueueStatistics> {
    const [
      waitingCount,
      processingCount,
      fulfilledCount,
      expiredCount,
      cancelledCount,
      totalCount,
    ] = await Promise.all([
      this.queueRepository.count({ where: { status: QueueStatus.WAITING } }),
      this.queueRepository.count({ where: { status: QueueStatus.PROCESSING } }),
      this.queueRepository.count({ where: { status: QueueStatus.FULFILLED } }),
      this.queueRepository.count({ where: { status: QueueStatus.EXPIRED } }),
      this.queueRepository.count({ where: { status: QueueStatus.CANCELLED } }),
      this.queueRepository.count(),
    ]);

    // 计算成功率
    const attemptedCount = totalCount - cancelledCount;
    const successRate = attemptedCount > 0 ? fulfilledCount / attemptedCount : 0;

    // 计算平均等待时间
    const fulfilledEntries = await this.queueRepository.find({
      where: { status: QueueStatus.FULFILLED },
      select: ['createdAt', 'fulfilledAt'],
    });

    let averageWaitMinutes = 0;
    if (fulfilledEntries.length > 0) {
      const totalWaitMs = fulfilledEntries.reduce((sum, entry) => {
        return sum + (entry.fulfilledAt.getTime() - entry.createdAt.getTime());
      }, 0);
      averageWaitMinutes = totalWaitMs / fulfilledEntries.length / 60000;
    }

    // 按优先级分组统计
    const byPriority: Record<string, { waiting: number; fulfilled: number }> = {};

    const tiers = ['standard', 'vip', 'premium', 'enterprise'];
    for (const tier of tiers) {
      const waiting = await this.queueRepository.count({
        where: { userTier: tier, status: QueueStatus.WAITING },
      });
      const fulfilled = await this.queueRepository.count({
        where: { userTier: tier, status: QueueStatus.FULFILLED },
      });
      byPriority[tier] = { waiting, fulfilled };
    }

    return {
      waitingCount,
      processingCount,
      fulfilledCount,
      expiredCount,
      cancelledCount,
      totalCount,
      successRate: Math.round(successRate * 100) / 100,
      averageWaitMinutes: Math.round(averageWaitMinutes * 100) / 100,
      byPriority,
    };
  }

  /**
   * 重新计算所有等待中条目的位置和预估时间
   */
  private async recalculateAllPositions(): Promise<void> {
    const waitingEntries = await this.queueRepository.find({
      where: { status: QueueStatus.WAITING },
      order: {
        priority: 'DESC',
        createdAt: 'ASC',
      },
    });

    for (let i = 0; i < waitingEntries.length; i++) {
      const entry = waitingEntries[i];
      const position = i + 1;
      const estimatedWaitMinutes = position * this.AVERAGE_DEVICE_USAGE_MINUTES;

      entry.queuePosition = position;
      entry.estimatedWaitMinutes = estimatedWaitMinutes;

      await this.queueRepository.save(entry);
    }
  }

  /**
   * 更新单个队列条目的位置
   */
  private async updateQueuePosition(queueId: string): Promise<void> {
    const queueEntry = await this.queueRepository.findOne({
      where: { id: queueId },
    });

    if (!queueEntry || queueEntry.status !== QueueStatus.WAITING) {
      return;
    }

    // 计算位置：统计优先级更高或同优先级但创建时间更早的条目数
    const position = await this.queueRepository
      .createQueryBuilder('queue')
      .where('queue.status = :status', { status: QueueStatus.WAITING })
      .andWhere(
        '(queue.priority > :priority OR (queue.priority = :priority AND queue.created_at < :createdAt))',
        {
          priority: queueEntry.priority,
          createdAt: queueEntry.createdAt,
        }
      )
      .getCount();

    queueEntry.queuePosition = position + 1;
    queueEntry.estimatedWaitMinutes = queueEntry.queuePosition * this.AVERAGE_DEVICE_USAGE_MINUTES;

    await this.queueRepository.save(queueEntry);
  }

  /**
   * 根据用户等级获取优先级
   */
  private getUserPriority(userTier: string): number {
    const tierMap: Record<string, number> = {
      standard: UserPriority.STANDARD,
      vip: UserPriority.VIP,
      premium: UserPriority.PREMIUM,
      enterprise: UserPriority.ENTERPRISE,
    };

    return tierMap[userTier.toLowerCase()] ?? UserPriority.STANDARD;
  }

  /**
   * 映射实体到响应 DTO
   */
  private mapToResponse(entry: AllocationQueue): QueueEntryResponse {
    return {
      id: entry.id,
      userId: entry.userId,
      status: entry.status,
      priority: entry.priority,
      userTier: entry.userTier,
      queuePosition: entry.queuePosition || 0,
      estimatedWaitMinutes: entry.estimatedWaitMinutes || 0,
      maxWaitMinutes: entry.maxWaitMinutes,
      durationMinutes: entry.durationMinutes,
      deviceType: entry.deviceType,
      allocatedDeviceId: entry.allocatedDeviceId,
      allocationId: entry.allocationId,
      retryCount: entry.retryCount,
      createdAt: entry.createdAt.toISOString(),
      processedAt: entry.processedAt?.toISOString(),
      fulfilledAt: entry.fulfilledAt?.toISOString(),
      cancelledAt: entry.cancelledAt?.toISOString(),
      cancelReason: entry.cancelReason,
      expiredAt: entry.expiredAt?.toISOString(),
      expiryReason: entry.expiryReason,
    };
  }
}
