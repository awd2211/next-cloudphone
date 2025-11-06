/**
 * 设备服务业务指标服务
 * 统一管理设备相关的 Prometheus 指标记录
 */

import { Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { ClusterSafeCron, DistributedLockService } from '@cloudphone/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceMetrics } from '@cloudphone/shared';
import { Device, DeviceStatus } from '../entities/device.entity';

@Injectable()
export class DeviceMetricsService {
  private readonly logger = new Logger(DeviceMetricsService.name);

  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private readonly lockService: DistributedLockService, // ✅ K8s cluster safety
  ) {}

  /**
   * 记录设备创建尝试
   */
  recordDeviceCreationAttempt(userId: string, provider: string): void {
    DeviceMetrics.creationAttempts.inc({ userId, provider });
    this.logger.debug(`Device creation attempt recorded: userId=${userId}, provider=${provider}`);
  }

  /**
   * 记录设备创建失败
   */
  recordDeviceCreationFailure(userId: string, provider: string, reason: string): void {
    DeviceMetrics.creationFailures.inc({ userId, provider, reason });
    this.logger.debug(
      `Device creation failure recorded: userId=${userId}, provider=${provider}, reason=${reason}`,
    );
  }

  /**
   * 记录设备启动尝试
   */
  recordDeviceStartAttempt(deviceId: string): void {
    DeviceMetrics.startAttempts.inc({ deviceId });
    this.logger.debug(`Device start attempt recorded: deviceId=${deviceId}`);
  }

  /**
   * 记录设备启动失败
   */
  recordDeviceStartFailure(deviceId: string, reason: string): void {
    DeviceMetrics.startFailures.inc({ deviceId, reason });
    this.logger.debug(`Device start failure recorded: deviceId=${deviceId}, reason=${reason}`);
  }

  /**
   * 记录设备操作耗时
   */
  recordDeviceOperationDuration(operation: string, status: 'success' | 'failure', durationSeconds: number): void {
    DeviceMetrics.operationDuration.observe({ operation, status }, durationSeconds);
    this.logger.debug(
      `Device operation duration recorded: operation=${operation}, status=${status}, duration=${durationSeconds}s`,
    );
  }

  /**
   * 测量设备操作耗时（辅助方法）
   */
  async measureOperation<T>(
    operation: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();
    let status: 'success' | 'failure' = 'success';

    try {
      const result = await fn();
      return result;
    } catch (error) {
      status = 'failure';
      throw error;
    } finally {
      const durationSeconds = (Date.now() - startTime) / 1000;
      this.recordDeviceOperationDuration(operation, status, durationSeconds);
    }
  }

  /**
   * 每分钟更新设备状态指标
   * 这是一个定时任务，定期从数据库读取设备状态并更新 Gauge 指标
   */
  @ClusterSafeCron(CronExpression.EVERY_MINUTE)
  async updateDeviceStatusMetrics(): Promise<void> {
    try {
      // 统计各状态设备数量
      const statusCounts = await this.deviceRepository
        .createQueryBuilder('device')
        .select('device.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('device.status')
        .getRawMany();

      // 初始化所有状态为 0
      let activeCount = 0;
      let runningCount = 0;
      let stoppedCount = 0;
      let errorCount = 0;

      // 遍历查询结果，更新计数
      for (const statusCount of statusCounts) {
        const count = parseInt(statusCount.count, 10);

        switch (statusCount.status) {
          case DeviceStatus.RUNNING:
            runningCount = count;
            activeCount += count; // Running 也算 Active
            break;
          case DeviceStatus.CREATING:
          case DeviceStatus.ALLOCATED:
            activeCount += count; // Creating/Allocated 也算 Active
            break;
          case DeviceStatus.STOPPED:
            stoppedCount = count;
            break;
          case DeviceStatus.ERROR:
            errorCount = count;
            break;
          default:
            break;
        }
      }

      // 更新 Gauge 指标
      DeviceMetrics.devicesActive.set(activeCount);
      DeviceMetrics.devicesRunning.set(runningCount);
      DeviceMetrics.devicesStopped.set(stoppedCount);
      DeviceMetrics.devicesError.set(errorCount);

      this.logger.debug(
        `Device status metrics updated: active=${activeCount}, running=${runningCount}, stopped=${stoppedCount}, error=${errorCount}`,
      );
    } catch (error) {
      this.logger.error('Failed to update device status metrics', error.stack);
    }
  }
}
