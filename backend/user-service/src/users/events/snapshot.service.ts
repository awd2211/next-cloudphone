import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UserSnapshot } from '../../entities/user-snapshot.entity';
import { EventStoreService } from './event-store.service';
import { EventReplayService } from './event-replay.service';

/**
 * 快照服务
 *
 * 负责管理用户状态快照，优化事件重放性能：
 * - 创建和保存快照
 * - 获取最新快照
 * - 自动快照策略（每 N 个事件）
 * - 清理过期快照
 */
@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);

  /**
   * 快照阈值：每多少个事件创建一个快照
   * 可以通过环境变量配置: SNAPSHOT_THRESHOLD
   */
  private readonly snapshotThreshold: number = parseInt(
    process.env.SNAPSHOT_THRESHOLD || '100',
    10
  );

  /**
   * 保留多少个快照
   * 保留最近的 N 个快照，删除更旧的
   */
  private readonly retainSnapshots: number = parseInt(process.env.RETAIN_SNAPSHOTS || '5', 10);

  constructor(
    @InjectRepository(UserSnapshot)
    private readonly snapshotRepository: Repository<UserSnapshot>,
    private readonly eventStore: EventStoreService,
    private readonly eventReplay: EventReplayService
  ) {}

  /**
   * 获取聚合的最新快照
   * @param aggregateId 聚合 ID（用户 ID）
   * @returns 最新的快照，如果不存在则返回 null
   */
  async getLatestSnapshot(aggregateId: string): Promise<UserSnapshot | null> {
    const snapshot = await this.snapshotRepository.findOne({
      where: { aggregateId },
      order: { version: 'DESC' },
    });

    if (snapshot) {
      this.logger.debug(`Found snapshot for ${aggregateId} at version ${snapshot.version}`);
    }

    return snapshot;
  }

  /**
   * 创建快照
   * @param aggregateId 聚合 ID（用户 ID）
   * @param reason 创建原因（'scheduled' | 'manual' | 'threshold'）
   * @returns 创建的快照
   */
  async createSnapshot(
    aggregateId: string,
    reason: 'scheduled' | 'manual' | 'threshold' = 'manual'
  ): Promise<UserSnapshot> {
    this.logger.log(`Creating snapshot for aggregate: ${aggregateId}, reason: ${reason}`);

    try {
      // 1. 重放所有事件获取当前状态
      const currentState = await this.eventReplay.replayUserEvents(aggregateId);

      // 2. 获取当前版本号
      const currentVersion = await this.eventStore.getCurrentVersion(aggregateId);

      // 3. 获取事件数量
      const eventCount = await this.eventStore.countEvents(aggregateId);

      // 4. 创建快照
      const snapshot = this.snapshotRepository.create({
        aggregateId,
        version: currentVersion,
        state: currentState,
        tenantId: currentState.tenantId,
        metadata: {
          reason,
          eventCount,
          snapshotSize: JSON.stringify(currentState).length,
          createdBy: 'system',
        },
      });

      const savedSnapshot = await this.snapshotRepository.save(snapshot);

      this.logger.log(
        `Snapshot created for ${aggregateId} at version ${currentVersion} (${eventCount} events)`
      );

      // 5. 清理旧快照（保留最近的 N 个）
      await this.cleanupOldSnapshots(aggregateId);

      return savedSnapshot;
    } catch (error) {
      this.logger.error(`Failed to create snapshot for ${aggregateId}`, error.stack);
      throw error;
    }
  }

  /**
   * 检查是否应该创建快照
   * @param aggregateId 聚合 ID
   * @returns 是否应该创建快照
   */
  async shouldCreateSnapshot(aggregateId: string): Promise<boolean> {
    // 1. 获取最新快照
    const latestSnapshot = await this.getLatestSnapshot(aggregateId);

    // 2. 获取当前版本
    const currentVersion = await this.eventStore.getCurrentVersion(aggregateId);

    // 3. 如果没有快照
    if (!latestSnapshot) {
      // 只有超过阈值才创建第一个快照
      return currentVersion >= this.snapshotThreshold;
    }

    // 4. 检查是否超过阈值
    const eventsSinceSnapshot = currentVersion - latestSnapshot.version;
    const shouldCreate = eventsSinceSnapshot >= this.snapshotThreshold;

    if (shouldCreate) {
      this.logger.debug(
        `Snapshot threshold reached for ${aggregateId}: ${eventsSinceSnapshot} events since last snapshot`
      );
    }

    return shouldCreate;
  }

  /**
   * 自动创建快照（如果需要）
   * @param aggregateId 聚合 ID
   * @returns 创建的快照，或 null（如果不需要创建）
   */
  async autoSnapshot(aggregateId: string): Promise<UserSnapshot | null> {
    if (await this.shouldCreateSnapshot(aggregateId)) {
      return this.createSnapshot(aggregateId, 'threshold');
    }
    return null;
  }

  /**
   * 清理旧快照
   * 保留最近的 N 个快照，删除更旧的
   * @param aggregateId 聚合 ID
   */
  async cleanupOldSnapshots(aggregateId: string): Promise<void> {
    const snapshots = await this.snapshotRepository.find({
      where: { aggregateId },
      order: { version: 'DESC' },
    });

    if (snapshots.length > this.retainSnapshots) {
      const toDelete = snapshots.slice(this.retainSnapshots);
      await this.snapshotRepository.remove(toDelete);

      this.logger.log(`Cleaned up ${toDelete.length} old snapshots for ${aggregateId}`);
    }
  }

  /**
   * 清理过期快照
   * 删除创建时间超过指定天数的快照
   * @param daysOld 多少天前的快照被认为是过期的
   */
  async cleanupExpiredSnapshots(daysOld: number = 90): Promise<number> {
    this.logger.log(`Cleaning up snapshots older than ${daysOld} days...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.snapshotRepository.delete({
      createdAt: LessThan(cutoffDate),
    });

    const deletedCount = result.affected || 0;

    this.logger.log(`Cleaned up ${deletedCount} expired snapshots`);

    return deletedCount;
  }

  /**
   * 获取快照统计信息
   */
  async getSnapshotStats(): Promise<{
    totalSnapshots: number;
    snapshotsByAggregate: Record<string, number>;
    averageSnapshotSize: number;
    oldestSnapshot: Date | null;
    newestSnapshot: Date | null;
  }> {
    const snapshots = await this.snapshotRepository.find();

    const snapshotsByAggregate: Record<string, number> = {};
    let totalSize = 0;

    for (const snapshot of snapshots) {
      snapshotsByAggregate[snapshot.aggregateId] =
        (snapshotsByAggregate[snapshot.aggregateId] || 0) + 1;

      if (snapshot.metadata?.snapshotSize) {
        totalSize += snapshot.metadata.snapshotSize;
      }
    }

    const oldest = snapshots.reduce(
      (min, s) => (s.createdAt < min ? s.createdAt : min),
      snapshots[0]?.createdAt
    );

    const newest = snapshots.reduce(
      (max, s) => (s.createdAt > max ? s.createdAt : max),
      snapshots[0]?.createdAt
    );

    return {
      totalSnapshots: snapshots.length,
      snapshotsByAggregate,
      averageSnapshotSize: snapshots.length > 0 ? totalSize / snapshots.length : 0,
      oldestSnapshot: oldest || null,
      newestSnapshot: newest || null,
    };
  }

  /**
   * 删除聚合的所有快照
   * @param aggregateId 聚合 ID
   */
  async deleteAllSnapshots(aggregateId: string): Promise<void> {
    await this.snapshotRepository.delete({ aggregateId });
    this.logger.log(`Deleted all snapshots for ${aggregateId}`);
  }
}
