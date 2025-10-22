import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, register } from 'prom-client';

/**
 * 事件溯源 Prometheus 指标
 *
 * 监控事件存储和重放的性能和健康状况
 */
@Injectable()
export class EventSourcingMetrics {
  // ========== 计数器（Counter） ==========

  /**
   * 事件总数（按类型）
   */
  private readonly eventsTotalCounter = new Counter({
    name: 'event_store_events_total',
    help: 'Total number of events stored',
    labelNames: ['event_type', 'tenant_id'],
    registers: [register],
  });

  /**
   * 版本冲突总数
   */
  private readonly conflictsTotalCounter = new Counter({
    name: 'event_store_conflicts_total',
    help: 'Total number of version conflicts',
    labelNames: ['aggregate_id'],
    registers: [register],
  });

  /**
   * 事件重放请求总数
   */
  private readonly replayRequestsCounter = new Counter({
    name: 'event_replay_requests_total',
    help: 'Total number of event replay requests',
    labelNames: ['success', 'use_snapshot'],
    registers: [register],
  });

  /**
   * 快照创建总数
   */
  private readonly snapshotsCreatedCounter = new Counter({
    name: 'event_snapshots_created_total',
    help: 'Total number of snapshots created',
    labelNames: ['reason'],
    registers: [register],
  });

  // ========== 直方图（Histogram） ==========

  /**
   * 事件保存延迟（秒）
   */
  private readonly eventSaveDuration = new Histogram({
    name: 'event_store_save_duration_seconds',
    help: 'Duration of event save operations in seconds',
    labelNames: ['event_type'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [register],
  });

  /**
   * 事件重放延迟（秒）
   */
  private readonly eventReplayDuration = new Histogram({
    name: 'event_replay_duration_seconds',
    help: 'Duration of event replay operations in seconds',
    labelNames: ['use_snapshot', 'event_count_bucket'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30],
    registers: [register],
  });

  /**
   * 事件处理器延迟（秒）
   */
  private readonly eventHandlerDuration = new Histogram({
    name: 'event_handler_duration_seconds',
    help: 'Duration of event handler execution in seconds',
    labelNames: ['handler_name', 'event_type'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [register],
  });

  /**
   * 快照创建延迟（秒）
   */
  private readonly snapshotCreationDuration = new Histogram({
    name: 'event_snapshot_creation_duration_seconds',
    help: 'Duration of snapshot creation in seconds',
    labelNames: ['reason'],
    buckets: [0.1, 0.5, 1, 5, 10, 30],
    registers: [register],
  });

  // ========== 仪表盘（Gauge） ==========

  /**
   * 每个聚合的事件数量
   */
  private readonly eventsPerAggregate = new Gauge({
    name: 'event_store_events_by_aggregate',
    help: 'Number of events per aggregate',
    labelNames: ['aggregate_id'],
    registers: [register],
  });

  /**
   * 当前快照总数
   */
  private readonly totalSnapshots = new Gauge({
    name: 'event_snapshots_total',
    help: 'Total number of snapshots',
    registers: [register],
  });

  /**
   * 事件存储大小（估算，基于事件数）
   */
  private readonly eventStoreSizeEstimate = new Gauge({
    name: 'event_store_size_estimate_bytes',
    help: 'Estimated size of event store in bytes',
    registers: [register],
  });

  // ========== 方法：记录指标 ==========

  /**
   * 记录事件保存
   */
  recordEventSaved(eventType: string, tenantId: string, durationMs: number) {
    this.eventsTotalCounter.inc({ event_type: eventType, tenant_id: tenantId || 'default' });
    this.eventSaveDuration.observe({ event_type: eventType }, durationMs / 1000);
  }

  /**
   * 记录版本冲突
   */
  recordVersionConflict(aggregateId: string) {
    this.conflictsTotalCounter.inc({ aggregate_id: aggregateId });
  }

  /**
   * 记录事件重放
   */
  recordEventReplay(
    success: boolean,
    useSnapshot: boolean,
    eventCount: number,
    durationMs: number,
  ) {
    this.replayRequestsCounter.inc({
      success: success.toString(),
      use_snapshot: useSnapshot.toString(),
    });

    // 将事件数量分桶
    const eventCountBucket = this.getEventCountBucket(eventCount);

    this.eventReplayDuration.observe(
      {
        use_snapshot: useSnapshot.toString(),
        event_count_bucket: eventCountBucket,
      },
      durationMs / 1000,
    );
  }

  /**
   * 记录事件处理器执行
   */
  recordEventHandler(handlerName: string, eventType: string, durationMs: number) {
    this.eventHandlerDuration.observe(
      {
        handler_name: handlerName,
        event_type: eventType,
      },
      durationMs / 1000,
    );
  }

  /**
   * 记录快照创建
   */
  recordSnapshotCreated(reason: string, durationMs: number) {
    this.snapshotsCreatedCounter.inc({ reason });
    this.snapshotCreationDuration.observe({ reason }, durationMs / 1000);
  }

  /**
   * 更新聚合事件数量
   */
  updateAggregateEventCount(aggregateId: string, count: number) {
    this.eventsPerAggregate.set({ aggregate_id: aggregateId }, count);
  }

  /**
   * 更新快照总数
   */
  updateTotalSnapshots(count: number) {
    this.totalSnapshots.set(count);
  }

  /**
   * 更新事件存储大小估算
   */
  updateEventStoreSizeEstimate(sizeBytes: number) {
    this.eventStoreSizeEstimate.set(sizeBytes);
  }

  // ========== 辅助方法 ==========

  /**
   * 将事件数量分桶（用于监控）
   */
  private getEventCountBucket(eventCount: number): string {
    if (eventCount <= 10) return '0-10';
    if (eventCount <= 50) return '11-50';
    if (eventCount <= 100) return '51-100';
    if (eventCount <= 500) return '101-500';
    if (eventCount <= 1000) return '501-1000';
    return '1000+';
  }

  /**
   * 获取所有指标（用于测试）
   */
  getMetrics() {
    return {
      eventsTotalCounter: this.eventsTotalCounter,
      conflictsTotalCounter: this.conflictsTotalCounter,
      replayRequestsCounter: this.replayRequestsCounter,
      snapshotsCreatedCounter: this.snapshotsCreatedCounter,
      eventSaveDuration: this.eventSaveDuration,
      eventReplayDuration: this.eventReplayDuration,
      eventHandlerDuration: this.eventHandlerDuration,
      snapshotCreationDuration: this.snapshotCreationDuration,
      eventsPerAggregate: this.eventsPerAggregate,
      totalSnapshots: this.totalSnapshots,
      eventStoreSizeEstimate: this.eventStoreSizeEstimate,
    };
  }
}
